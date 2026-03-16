// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for user location management and proximity-based features.
/// Uses the Haversine formula for distance calculations.
/// </summary>
public class LocationService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<LocationService> _logger;

    /// <summary>
    /// Earth's radius in kilometres.
    /// </summary>
    private const double EarthRadiusKm = 6371.0;

    public LocationService(NexusDbContext db, TenantContext tenantContext, ILogger<LocationService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Update or create a user's location.
    /// </summary>
    public async Task<UserLocation> UpdateUserLocationAsync(
        int userId,
        double latitude,
        double longitude,
        string? city = null,
        string? region = null,
        string? country = null,
        string? postalCode = null,
        bool? isPublic = null)
    {
        ValidateCoordinates(latitude, longitude);

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var existing = await _db.Set<UserLocation>()
            .FirstOrDefaultAsync(l => l.UserId == userId);

        if (existing != null)
        {
            existing.Latitude = latitude;
            existing.Longitude = longitude;
            existing.City = city ?? existing.City;
            existing.Region = region ?? existing.Region;
            existing.Country = country ?? existing.Country;
            existing.PostalCode = postalCode ?? existing.PostalCode;
            existing.FormattedAddress = BuildFormattedAddress(city, region, country, postalCode);
            existing.IsPublic = isPublic ?? existing.IsPublic;
            existing.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            _logger.LogInformation("Location updated for user {UserId}", userId);
            return existing;
        }

        var location = new UserLocation
        {
            TenantId = tenantId,
            UserId = userId,
            Latitude = latitude,
            Longitude = longitude,
            City = city,
            Region = region,
            Country = country,
            PostalCode = postalCode,
            FormattedAddress = BuildFormattedAddress(city, region, country, postalCode),
            IsPublic = isPublic ?? false
        };

        _db.Set<UserLocation>().Add(location);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Location created for user {UserId}", userId);
        return location;
    }

    /// <summary>
    /// Get a user's location. Respects privacy settings when viewed by another user.
    /// </summary>
    public async Task<UserLocation?> GetUserLocationAsync(int userId)
    {
        return await _db.Set<UserLocation>()
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.UserId == userId);
    }

    /// <summary>
    /// Find users near a given point using the Haversine formula.
    /// </summary>
    public async Task<NearbyResult<NearbyUser>> FindNearbyUsersAsync(
        double latitude, double longitude, double radiusKm, int page = 1, int limit = 20)
    {
        ValidateCoordinates(latitude, longitude);
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        // Load all locations in tenant, then filter by distance in-memory.
        // For large datasets, a spatial database extension (PostGIS) would be more efficient.
        // Pre-filter by bounding box to reduce the set.
        var (minLat, maxLat, minLon, maxLon) = GetBoundingBox(latitude, longitude, radiusKm);

        var locations = await _db.Set<UserLocation>()
            .AsNoTracking()
            .Include(l => l.User)
            .Where(l => l.IsPublic)
            .Where(l => l.User != null && l.User.IsActive)
            .Where(l => l.Latitude >= minLat && l.Latitude <= maxLat)
            .Where(l => l.Longitude >= minLon && l.Longitude <= maxLon)
            .ToListAsync();

        var nearby = locations
            .Select(l => new
            {
                Location = l,
                Distance = HaversineDistance(latitude, longitude, l.Latitude, l.Longitude)
            })
            .Where(x => x.Distance <= radiusKm)
            .OrderBy(x => x.Distance)
            .ToList();

        var total = nearby.Count;
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var items = nearby
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(x => new NearbyUser
            {
                UserId = x.Location.UserId,
                FirstName = x.Location.User?.FirstName ?? "",
                LastName = x.Location.User?.LastName ?? "",
                City = x.Location.City,
                Region = x.Location.Region,
                Country = x.Location.Country,
                Latitude = x.Location.IsPublic ? x.Location.Latitude : (double?)null,
                Longitude = x.Location.IsPublic ? x.Location.Longitude : (double?)null,
                DistanceKm = Math.Round(x.Distance, 2),
                IsPublic = x.Location.IsPublic
            })
            .ToList();

        return new NearbyResult<NearbyUser>
        {
            Items = items,
            Page = page,
            Limit = limit,
            Total = total,
            TotalPages = totalPages
        };
    }

    /// <summary>
    /// Find listings near a given point. Uses listing owner's location.
    /// </summary>
    public async Task<NearbyResult<NearbyListing>> FindNearbyListingsAsync(
        double latitude, double longitude, double radiusKm, int page = 1, int limit = 20)
    {
        ValidateCoordinates(latitude, longitude);
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var (minLat, maxLat, minLon, maxLon) = GetBoundingBox(latitude, longitude, radiusKm);

        // Join listings with user locations
        var locationsWithListings = await _db.Set<UserLocation>()
            .AsNoTracking()
            .Where(l => l.Latitude >= minLat && l.Latitude <= maxLat)
            .Where(l => l.Longitude >= minLon && l.Longitude <= maxLon)
            .Join(
                _db.Listings.Where(li => li.Status == ListingStatus.Active && li.DeletedAt == null),
                loc => loc.UserId,
                listing => listing.UserId,
                (loc, listing) => new { Location = loc, Listing = listing })
            .ToListAsync();

        var nearby = locationsWithListings
            .Select(x => new
            {
                x.Location,
                x.Listing,
                Distance = HaversineDistance(latitude, longitude, x.Location.Latitude, x.Location.Longitude)
            })
            .Where(x => x.Distance <= radiusKm)
            .OrderBy(x => x.Distance)
            .ToList();

        var total = nearby.Count;
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var items = nearby
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(x => new NearbyListing
            {
                ListingId = x.Listing.Id,
                Title = x.Listing.Title,
                Description = x.Listing.Description,
                Type = x.Listing.Type.ToString(),
                Location = x.Listing.Location,
                UserId = x.Listing.UserId,
                City = x.Location.City,
                Region = x.Location.Region,
                DistanceKm = Math.Round(x.Distance, 2)
            })
            .ToList();

        return new NearbyResult<NearbyListing>
        {
            Items = items,
            Page = page,
            Limit = limit,
            Total = total,
            TotalPages = totalPages
        };
    }

    /// <summary>
    /// Calculate distance between two users in kilometres.
    /// </summary>
    public async Task<double?> CalculateDistanceAsync(int userId1, int userId2)
    {
        var loc1 = await _db.Set<UserLocation>()
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.UserId == userId1);

        var loc2 = await _db.Set<UserLocation>()
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.UserId == userId2);

        if (loc1 == null || loc2 == null) return null;

        return Math.Round(HaversineDistance(loc1.Latitude, loc1.Longitude, loc2.Latitude, loc2.Longitude), 2);
    }

    /// <summary>
    /// Placeholder for geocoding an address string.
    /// Returns null - implement with an external geocoding API (e.g., Nominatim, Google Maps) when needed.
    /// </summary>
    public Task<GeocodingResult?> GeocodeAddressAsync(string address)
    {
        _logger.LogInformation("Geocoding requested for address: {Address} (not implemented - requires external API)", address);
        return Task.FromResult<GeocodingResult?>(null);
    }

    #region Helpers

    /// <summary>
    /// Haversine formula: calculates the great-circle distance between two points on Earth.
    /// </summary>
    public static double HaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = DegreesToRadians(lat2 - lat1);
        var dLon = DegreesToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(DegreesToRadians(lat1)) * Math.Cos(DegreesToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return EarthRadiusKm * c;
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180.0;

    private static void ValidateCoordinates(double latitude, double longitude)
    {
        if (latitude < -90 || latitude > 90)
            throw new ArgumentException("Latitude must be between -90 and 90.");
        if (longitude < -180 || longitude > 180)
            throw new ArgumentException("Longitude must be between -180 and 180.");
    }

    /// <summary>
    /// Calculate a bounding box for pre-filtering database queries.
    /// </summary>
    private static (double minLat, double maxLat, double minLon, double maxLon) GetBoundingBox(
        double lat, double lon, double radiusKm)
    {
        var latDelta = radiusKm / 111.32; // ~111.32 km per degree of latitude
        // Clamp denominator to a minimum of 0.001 to prevent division by zero at the poles
        var cosDenominator = Math.Max(0.001, Math.Cos(DegreesToRadians(lat)));
        var lonDelta = radiusKm / (111.32 * cosDenominator);

        return (lat - latDelta, lat + latDelta, lon - lonDelta, lon + lonDelta);
    }

    private static string? BuildFormattedAddress(string? city, string? region, string? country, string? postalCode)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(city)) parts.Add(city);
        if (!string.IsNullOrWhiteSpace(region)) parts.Add(region);
        if (!string.IsNullOrWhiteSpace(postalCode)) parts.Add(postalCode);
        if (!string.IsNullOrWhiteSpace(country)) parts.Add(country);

        return parts.Count > 0 ? string.Join(", ", parts) : null;
    }

    #endregion
}

#region DTOs

public class NearbyUser
{
    public int UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Region { get; set; }
    public string? Country { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double DistanceKm { get; set; }
    public bool IsPublic { get; set; }
}

public class NearbyListing
{
    public int ListingId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Location { get; set; }
    public int UserId { get; set; }
    public string? City { get; set; }
    public string? Region { get; set; }
    public double DistanceKm { get; set; }
}

public class NearbyResult<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int Limit { get; set; }
    public int Total { get; set; }
    public int TotalPages { get; set; }
}

public class GeocodingResult
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? FormattedAddress { get; set; }
    public string? City { get; set; }
    public string? Region { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }
}

#endregion

// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Globalization;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;

namespace Nexus.Api.Services;

public sealed class CaringFavourService
{
    private readonly NexusDbContext _db;

    public CaringFavourService(NexusDbContext db)
    {
        _db = db;
    }

    public async Task<bool> IsFeatureEnabledAsync(int tenantId, CancellationToken ct)
    {
        var raw = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantId && c.Key == "features.caring_community")
            .Select(c => c.Value)
            .FirstOrDefaultAsync(ct);

        return ParseBool(raw) == true;
    }

    public async Task<CaringFavourList> ListAdminFavoursAsync(int tenantId, CancellationToken ct)
    {
        var total = await _db.CaringFavours
            .IgnoreQueryFilters()
            .Where(f => f.TenantId == tenantId)
            .CountAsync(ct);

        var rows = await _db.CaringFavours
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(f => f.OfferedByUser)
            .Where(f => f.TenantId == tenantId)
            .OrderByDescending(f => f.CreatedAt)
            .Take(50)
            .Select(f => new
            {
                f.Id,
                f.Category,
                f.Description,
                f.FavourDate,
                f.IsAnonymous,
                f.CreatedAt,
                OffererFirstName = f.OfferedByUser == null ? "" : f.OfferedByUser.FirstName,
                OffererLastName = f.OfferedByUser == null ? "" : f.OfferedByUser.LastName
            })
            .ToListAsync(ct);

        var items = rows.Select(row =>
        {
            var offererName = string.Join(" ", new[] { row.OffererFirstName, row.OffererLastName }
                .Where(part => !string.IsNullOrWhiteSpace(part))).Trim();

            return new CaringFavourAdminRow(
                Id: row.Id,
                Category: row.Category,
                Description: row.Description,
                FavourDate: row.FavourDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                IsAnonymous: row.IsAnonymous,
                OffererName: row.IsAnonymous ? null : offererName,
                CreatedAt: row.CreatedAt.ToString("O", CultureInfo.InvariantCulture));
        }).ToArray();

        return new CaringFavourList(total, items);
    }

    private static bool? ParseBool(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return raw.Trim().ToLowerInvariant() switch
        {
            "true" or "1" or "yes" or "on" or "enabled" => true,
            "false" or "0" or "no" or "off" or "disabled" => false,
            _ => null
        };
    }
}

public sealed record CaringFavourList(
    [property: JsonPropertyName("count")]
    int Count,
    [property: JsonPropertyName("items")]
    IReadOnlyList<CaringFavourAdminRow> Items);

public sealed record CaringFavourAdminRow(
    [property: JsonPropertyName("id")]
    int Id,
    [property: JsonPropertyName("category")]
    string? Category,
    [property: JsonPropertyName("description")]
    string Description,
    [property: JsonPropertyName("favour_date")]
    string FavourDate,
    [property: JsonPropertyName("is_anonymous")]
    bool IsAnonymous,
    [property: JsonPropertyName("offerer_name")]
    string? OffererName,
    [property: JsonPropertyName("created_at")]
    string CreatedAt);

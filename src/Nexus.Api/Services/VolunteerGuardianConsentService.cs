// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Central safeguarding gate shared by every workflow that can place a
/// volunteer on a shift. The current schema records tenant-wide consent; the
/// Laravel opportunity-specific/expiry model remains a documented parity gap.
/// </summary>
public sealed class VolunteerGuardianConsentService
{
    public const string RequiredCode = "GUARDIAN_CONSENT_REQUIRED";
    public const string RequiredMessage =
        "A parent or guardian needs to approve your participation before you can volunteer. Please send a consent request first.";

    private const string RequiredConfigKey = "volunteering.guardian_consent_required";

    private readonly NexusDbContext _db;
    private readonly ILogger<VolunteerGuardianConsentService> _logger;

    public VolunteerGuardianConsentService(
        NexusDbContext db,
        ILogger<VolunteerGuardianConsentService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<bool> IsBlockedAsync(
        int userId,
        int tenantId,
        int? opportunityId,
        CancellationToken cancellationToken = default)
    {
        var configured = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(config => config.TenantId == tenantId && config.Key == RequiredConfigKey)
            .Select(config => config.Value)
            .SingleOrDefaultAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(configured)
            || configured.Trim().Trim('"').ToLowerInvariant()
                is not ("1" or "true" or "yes" or "on" or "enabled"))
        {
            return false;
        }

        var profileJson = await _db.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(user => user.Id == userId && user.TenantId == tenantId)
            .Select(user => user.NotificationPreferences)
            .SingleOrDefaultAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(profileJson))
        {
            return false;
        }

        DateOnly dateOfBirth;
        try
        {
            using var profile = JsonDocument.Parse(profileJson);
            if (!profile.RootElement.TryGetProperty("date_of_birth", out var value)
                || value.ValueKind != JsonValueKind.String
                || !DateTime.TryParse(
                    value.GetString(),
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AllowWhiteSpaces,
                    out var parsed))
            {
                return false;
            }

            dateOfBirth = DateOnly.FromDateTime(parsed);
        }
        catch (JsonException exception)
        {
            _logger.LogWarning(
                exception,
                "Could not read date of birth while checking guardian consent for user {UserId}",
                userId);
            return false;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - dateOfBirth.Year;
        if (dateOfBirth > today.AddYears(-age))
        {
            age--;
        }

        if (age >= 18)
        {
            return false;
        }

        var hasGrantedConsent = await _db.VolunteerGuardianConsents
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AnyAsync(consent =>
                consent.TenantId == tenantId
                && consent.MinorUserId == userId
                && consent.Status == VolunteerGuardianConsentStatus.Granted
                && consent.RevokedAt == null
                && (consent.ExpiresAt == null || consent.ExpiresAt > DateTime.UtcNow)
                && (opportunityId == null
                    || consent.OpportunityId == null
                    || consent.OpportunityId == opportunityId),
                cancellationToken);
        return !hasGrantedConsent;
    }
}

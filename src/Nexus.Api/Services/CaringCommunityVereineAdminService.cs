// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Admin Verein membership actions backed by the .NET organisation model.
/// Mirrors Laravel's Caring Community Verein admin-assignment contract.
/// </summary>
public sealed class CaringCommunityVereineAdminService
{
    private readonly NexusDbContext _db;

    public CaringCommunityVereineAdminService(NexusDbContext db)
    {
        _db = db;
    }

    public async Task<bool> IsFeatureEnabledAsync(int tenantId, CancellationToken ct)
    {
        var raw = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .Where(config => config.TenantId == tenantId && config.Key == "features.caring_community")
            .Select(config => config.Value)
            .FirstOrDefaultAsync(ct);

        return IsTruthy(raw);
    }

    public async Task<VereinAdminAssignmentResult> AssignVereinAdminAsync(
        int tenantId,
        int organizationId,
        int userId,
        int actorId,
        CancellationToken ct)
    {
        var organisationExists = await _db.Organisations
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AnyAsync(organisation =>
                organisation.TenantId == tenantId
                && organisation.Id == organizationId
                && organisation.Type == "club",
                ct);
        if (!organisationExists)
        {
            return VereinAdminAssignmentResult.Fail("VALIDATION_ERROR");
        }

        var userExists = await _db.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AnyAsync(user => user.TenantId == tenantId && user.Id == userId, ct);
        if (!userExists)
        {
            return VereinAdminAssignmentResult.Fail("VALIDATION_ERROR");
        }

        var member = await _db.OrganisationMembers
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(row =>
                row.TenantId == tenantId
                && row.OrganisationId == organizationId
                && row.UserId == userId,
                ct);
        if (member is null)
        {
            _db.OrganisationMembers.Add(new OrganisationMember
            {
                TenantId = tenantId,
                OrganisationId = organizationId,
                UserId = userId,
                Role = "admin",
                JobTitle = "Verein admin",
                JoinedAt = DateTime.UtcNow
            });
        }
        else
        {
            member.Role = "admin";
            member.JobTitle ??= "Verein admin";
        }

        await _db.SaveChangesAsync(ct);

        return VereinAdminAssignmentResult.Success(new
        {
            user_id = userId,
            organization_id = organizationId,
            role = "verein_admin",
            scope_organization_id = organizationId,
            assigned_by = actorId
        });
    }

    private static bool IsTruthy(string? value)
    {
        return value?.Trim().ToLowerInvariant() is "1" or "true" or "yes" or "on" or "enabled";
    }
}

public sealed record VereinAdminAssignmentResult(
    bool Succeeded,
    object? Payload,
    string? ErrorCode)
{
    public static VereinAdminAssignmentResult Success(object payload)
    {
        return new VereinAdminAssignmentResult(true, payload, null);
    }

    public static VereinAdminAssignmentResult Fail(string code)
    {
        return new VereinAdminAssignmentResult(false, null, code);
    }
}

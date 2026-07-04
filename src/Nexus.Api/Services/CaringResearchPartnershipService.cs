// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Tenant-scoped Caring Community research partnership read model.
/// </summary>
public sealed class CaringResearchPartnershipService
{
    private readonly NexusDbContext _db;

    public CaringResearchPartnershipService(NexusDbContext db)
    {
        _db = db;
    }

    public async Task<bool> IsCaringCommunityEnabledAsync(int tenantId, CancellationToken ct)
    {
        var value = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .Where(config => config.TenantId == tenantId && config.Key == "features.caring_community")
            .Select(config => config.Value)
            .FirstOrDefaultAsync(ct);

        return IsTruthy(value);
    }

    public async Task<IReadOnlyList<object>> ListPartnersAsync(int tenantId, CancellationToken ct)
    {
        var rows = await _db.CaringResearchPartners
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(partner => partner.TenantId == tenantId)
            .OrderByDescending(partner => partner.CreatedAt)
            .ThenByDescending(partner => partner.Id)
            .ToListAsync(ct);

        return rows.Select(PartnerRow).Cast<object>().ToArray();
    }

    public async Task<IReadOnlyList<object>> ListDatasetExportsAsync(int tenantId, long? partnerId, CancellationToken ct)
    {
        var query =
            from export in _db.CaringResearchDatasetExports.IgnoreQueryFilters().AsNoTracking()
            where export.TenantId == tenantId
            join partner in _db.CaringResearchPartners.IgnoreQueryFilters().AsNoTracking()
                on new { export.TenantId, Id = export.PartnerId } equals new { partner.TenantId, partner.Id }
                into partners
            from partner in partners.DefaultIfEmpty()
            select new { export, partner };

        if (partnerId is not null)
        {
            query = query.Where(row => row.export.PartnerId == partnerId.Value);
        }

        var rows = await query
            .OrderByDescending(row => row.export.GeneratedAt)
            .ThenByDescending(row => row.export.Id)
            .ToListAsync(ct);

        return rows.Select(row => ExportRow(row.export, row.partner)).Cast<object>().ToArray();
    }

    private static object PartnerRow(CaringResearchPartner row)
    {
        return new
        {
            id = row.Id,
            tenant_id = row.TenantId,
            name = row.Name,
            institution = row.Institution,
            contact_email = row.ContactEmail,
            agreement_reference = row.AgreementReference,
            methodology_url = row.MethodologyUrl,
            status = row.Status,
            data_scope = DecodeJsonOrEmptyArray(row.DataScope),
            starts_at = row.StartsAt,
            ends_at = row.EndsAt,
            created_by = row.CreatedBy,
            created_at = row.CreatedAt,
            updated_at = row.UpdatedAt
        };
    }

    private static object ExportRow(CaringResearchDatasetExport row, CaringResearchPartner? partner)
    {
        return new
        {
            id = row.Id,
            tenant_id = row.TenantId,
            partner_id = row.PartnerId,
            requested_by = row.RequestedBy,
            dataset_key = row.DatasetKey,
            period_start = row.PeriodStart,
            period_end = row.PeriodEnd,
            status = row.Status,
            row_count = row.RowCount,
            anonymization_version = row.AnonymizationVersion,
            data_hash = row.DataHash,
            generated_at = row.GeneratedAt,
            metadata = DecodeJsonOrEmptyArray(row.Metadata),
            partner_name = partner?.Name,
            partner_institution = partner?.Institution
        };
    }

    private static object DecodeJsonOrEmptyArray(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return Array.Empty<object>();
        }

        try
        {
            using var document = JsonDocument.Parse(raw);
            return document.RootElement.Clone();
        }
        catch (JsonException)
        {
            return Array.Empty<object>();
        }
    }

    private static bool IsTruthy(string? value)
    {
        return value?.Trim().ToLowerInvariant() is "1" or "true" or "yes" or "on";
    }
}

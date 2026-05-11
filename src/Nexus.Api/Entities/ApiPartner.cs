// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

namespace Nexus.Api.Entities;

public enum ApiPartnerStatus
{
    Active = 0,
    Suspended = 1,
    Revoked = 2
}

/// <summary>
/// External third-party consumer of the public API. Distinct from
/// FederationPartner / FederationApiKey which represent peer timebanks.
/// API keys are stored as SHA-256 hashes; raw key is only returned at
/// registration or rotation.
/// </summary>
public class ApiPartner : ITenantEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int TenantId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string? Description { get; set; }

    public string ApiKeyHash { get; set; } = string.Empty;
    public string ApiKeyPrefix { get; set; } = string.Empty;

    public string Scopes { get; set; } = "read";
    public int RateLimitPerMinute { get; set; } = 60;

    public ApiPartnerStatus Status { get; set; } = ApiPartnerStatus.Active;

    public DateTime? LastUsedAt { get; set; }
    public int RequestsLast24h { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? CreatedBy { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedReason { get; set; }

    public Tenant? Tenant { get; set; }
}

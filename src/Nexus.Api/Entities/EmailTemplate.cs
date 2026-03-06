// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

namespace Nexus.Api.Entities;

/// <summary>
/// Customizable email templates per tenant.
/// </summary>
public class EmailTemplate : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }

    /// <summary>
    /// Template key, e.g. "welcome", "exchange_requested", "exchange_completed", "digest_weekly".
    /// </summary>
    public string Key { get; set; } = string.Empty;

    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// HTML body template with placeholders like {{user_name}}, {{listing_title}}.
    /// </summary>
    public string BodyHtml { get; set; } = string.Empty;

    /// <summary>
    /// Plain text fallback.
    /// </summary>
    public string? BodyText { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Tenant? Tenant { get; set; }
}

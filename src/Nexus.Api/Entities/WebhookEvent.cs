// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.ComponentModel.DataAnnotations;

namespace Nexus.Api.Entities;

/// <summary>
/// Audit log for incoming webhook events from external systems (e.g. PHP platform).
/// </summary>
public class WebhookEvent : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }

    /// <summary>Event type, e.g. "volunteer.applied", "shift.completed".</summary>
    [Required]
    [MaxLength(100)]
    public string EventType { get; set; } = string.Empty;

    /// <summary>Origin system identifier, e.g. "php-platform".</summary>
    [MaxLength(50)]
    public string Source { get; set; } = "php-platform";

    /// <summary>Raw JSON payload for audit/debugging.</summary>
    public string PayloadJson { get; set; } = "{}";

    /// <summary>Processing status: processed, failed, ignored.</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "processed";

    /// <summary>Error message if processing failed.</summary>
    public string? ErrorMessage { get; set; }

    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Tenant? Tenant { get; set; }
}

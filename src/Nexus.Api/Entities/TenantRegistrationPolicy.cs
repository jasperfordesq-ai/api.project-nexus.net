// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.ComponentModel.DataAnnotations;

namespace Nexus.Api.Entities;

/// <summary>
/// Tenant-scoped registration policy that determines how users register
/// and what verification is required. Each tenant has exactly one active policy.
/// </summary>
public class TenantRegistrationPolicy : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }

    /// <summary>
    /// The registration method this tenant uses.
    /// </summary>
    public RegistrationMode Mode { get; set; } = RegistrationMode.Standard;

    /// <summary>
    /// The identity verification provider (only relevant when Mode is VerifiedIdentity or GovernmentId).
    /// </summary>
    public VerificationProvider Provider { get; set; } = VerificationProvider.None;

    /// <summary>
    /// The level of verification required.
    /// </summary>
    public VerificationLevel VerificationLevel { get; set; } = VerificationLevel.None;

    /// <summary>
    /// What happens after successful verification.
    /// </summary>
    public PostVerificationAction PostVerificationAction { get; set; } = PostVerificationAction.ActivateAutomatically;

    /// <summary>
    /// Provider-specific configuration (API keys, webhook URLs, etc.) stored as encrypted JSON.
    /// Never exposed in public APIs.
    /// </summary>
    public string? ProviderConfigEncrypted { get; set; }

    /// <summary>
    /// Custom provider webhook URL (for Custom provider type).
    /// </summary>
    [MaxLength(500)]
    public string? CustomWebhookUrl { get; set; }

    /// <summary>
    /// Custom provider name for display purposes.
    /// </summary>
    [MaxLength(200)]
    public string? CustomProviderName { get; set; }

    /// <summary>
    /// Whether this policy is currently active.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Optional message shown to users explaining the registration process.
    /// </summary>
    [MaxLength(2000)]
    public string? RegistrationMessage { get; set; }

    /// <summary>
    /// Optional invite code required for InviteOnly mode.
    /// </summary>
    [MaxLength(100)]
    public string? InviteCode { get; set; }

    /// <summary>
    /// Maximum number of invite uses (null = unlimited).
    /// </summary>
    public int? MaxInviteUses { get; set; }

    /// <summary>
    /// Current count of invite uses.
    /// </summary>
    public int InviteUsesCount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public int? UpdatedByUserId { get; set; }

    // Navigation
    public Tenant? Tenant { get; set; }
}

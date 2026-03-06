// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.ComponentModel.DataAnnotations;

namespace Nexus.Api.Entities;

/// <summary>
/// Represents a volunteer's check-in/check-out record for a shift.
/// When checked out, hours are logged and optionally credited.
/// </summary>
public class VolunteerCheckIn : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }

    /// <summary>
    /// The shift this check-in belongs to.
    /// </summary>
    public int ShiftId { get; set; }

    /// <summary>
    /// The volunteer who checked in.
    /// </summary>
    public int UserId { get; set; }

    /// <summary>
    /// When the volunteer checked in.
    /// </summary>
    public DateTime CheckedInAt { get; set; }

    /// <summary>
    /// When the volunteer checked out (null if still checked in).
    /// </summary>
    public DateTime? CheckedOutAt { get; set; }

    /// <summary>
    /// Hours logged for this check-in (calculated or manually set at checkout).
    /// </summary>
    public decimal? HoursLogged { get; set; }

    /// <summary>
    /// Optional notes about the check-in.
    /// </summary>
    [MaxLength(2000)]
    public string? Notes { get; set; }

    /// <summary>
    /// The credit transaction created on checkout (if CreditReward is set).
    /// </summary>
    public int? TransactionId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Tenant? Tenant { get; set; }
    public VolunteerShift? Shift { get; set; }
    public User? User { get; set; }
    public Transaction? Transaction { get; set; }
}

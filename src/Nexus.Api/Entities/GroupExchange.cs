// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

namespace Nexus.Api.Entities;

public class GroupExchange : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int GroupId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal TotalHours { get; set; }
    public string Status { get; set; } = "draft";
    public int CreatedById { get; set; }
    public int? ApprovedById { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public Tenant? Tenant { get; set; }
    public Group? Group { get; set; }
    public User? CreatedBy { get; set; }
    public User? ApprovedBy { get; set; }
    public List<GroupExchangeParticipant> Participants { get; set; } = new();
}

public class GroupExchangeParticipant
{
    public int Id { get; set; }
    public int GroupExchangeId { get; set; }
    public int UserId { get; set; }
    public decimal Hours { get; set; }
    public string Role { get; set; } = "provider";
    public bool IsConfirmed { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public GroupExchange? GroupExchange { get; set; }
    public User? User { get; set; }
}

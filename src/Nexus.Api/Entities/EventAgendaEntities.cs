// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

namespace Nexus.Api.Entities;

public sealed class EventSession : ITenantEntity
{
    public long Id { get; set; } public int TenantId { get; set; } public int EventId { get; set; }
    public long Version { get; set; } = 1; public string Title { get; set; } = ""; public string? Description { get; set; }
    public string SessionType { get; set; } = "session"; public string Visibility { get; set; } = "public"; public int? Capacity { get; set; }
    public string Status { get; set; } = "scheduled"; public DateTime StartsAtUtc { get; set; } public DateTime EndsAtUtc { get; set; }
    public string Timezone { get; set; } = "UTC"; public string? TrackName { get; set; } public string? RoomName { get; set; }
    public string? RoomKey { get; set; } public int Position { get; set; } public string? CancellationReason { get; set; }
    public int CreatedBy { get; set; } public int UpdatedBy { get; set; } public int? CancelledBy { get; set; }
    public DateTime? CancelledAt { get; set; } public DateTime CreatedAt { get; set; } = DateTime.UtcNow; public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<EventSessionSpeaker> Speakers { get; set; } = new List<EventSessionSpeaker>();
    public ICollection<EventSessionResource> Resources { get; set; } = new List<EventSessionResource>();
}

public sealed class EventSessionSpeaker : ITenantEntity
{
    public long Id { get; set; } public int TenantId { get; set; } public int EventId { get; set; } public long SessionId { get; set; }
    public int? UserId { get; set; } public string? DisplayName { get; set; } public string? RoleLabel { get; set; } public int Position { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class EventSessionResource : ITenantEntity
{
    public long Id { get; set; } public int TenantId { get; set; } public int EventId { get; set; } public long SessionId { get; set; }
    public string ResourceType { get; set; } = "link"; public string Visibility { get; set; } = "public"; public string Title { get; set; } = "";
    public string UrlCiphertext { get; set; } = ""; public int Position { get; set; } public int CreatedBy { get; set; } public int UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class EventSessionHistory : ITenantEntity
{
    public long Id { get; set; } public int TenantId { get; set; } public int EventId { get; set; } public long? SessionId { get; set; }
    public int ActorUserId { get; set; } public long AgendaVersion { get; set; } public string Action { get; set; } = "";
    public string IdempotencyKey { get; set; } = ""; public string RequestHash { get; set; } = ""; public string ChangedFields { get; set; } = "[]";
    public string AffectedSessionIds { get; set; } = "[]"; public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class EventSessionRegistration : ITenantEntity
{
    public long Id { get; set; } public int TenantId { get; set; } public int EventId { get; set; } public long SessionId { get; set; }
    public int UserId { get; set; } public long EventRegistrationId { get; set; } public long EventRegistrationVersion { get; set; }
    public long Version { get; set; } = 1; public string Status { get; set; } = "registered"; public DateTime RegisteredAt { get; set; }
    public DateTime? WithdrawnAt { get; set; } public DateTime CreatedAt { get; set; } = DateTime.UtcNow; public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class EventSessionRegistrationHistory : ITenantEntity
{
    public long Id { get; set; } public int TenantId { get; set; } public int EventId { get; set; } public long SessionId { get; set; }
    public long RegistrationId { get; set; } public int UserId { get; set; } public long EventRegistrationId { get; set; }
    public long EventRegistrationVersion { get; set; } public int ActorUserId { get; set; } public long RegistrationVersion { get; set; }
    public string Action { get; set; } = ""; public string IdempotencyKey { get; set; } = ""; public string RequestHash { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

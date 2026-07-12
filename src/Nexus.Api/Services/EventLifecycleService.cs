// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

public sealed record EventLifecycleError(string Code, string Message, int Status, string? Field = null);
public sealed record EventLifecycleResult(object? Data, EventLifecycleError? Error = null)
{
    public bool Succeeded => Error is null;
}

public sealed class EventLifecycleService
{
    private static readonly HashSet<string> Publications = ["draft", "pending_review", "published", "archived"];
    private static readonly HashSet<string> Operations = ["scheduled", "postponed", "cancelled", "completed"];
    private readonly NexusDbContext _db;
    public EventLifecycleService(NexusDbContext db) => _db = db;

    public async Task<EventLifecycleResult> TransitionAsync(int tenantId, int eventId, int actorId, string action, string? reason, CancellationToken ct)
    {
        reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        if (reason?.Length > 4000) return Invalid("VALIDATION_INVALID_REASON", "Reason is too long", "reason");
        if (action == "reject" && reason is null) return Invalid("VALIDATION_REQUIRED_FIELD", "Reason is required", "reason");

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({tenantId}, {eventId})", ct);
        var evt = await _db.Events.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == eventId, ct);
        if (evt is null) return Missing();
        var actor = await _db.Users.IgnoreQueryFilters().AsNoTracking().SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == actorId && x.IsActive, ct);
        if (actor is null || !(actor.IsAdmin || actor.IsSuperAdmin || actor.IsTenantSuperAdmin || actor.IsGod || actor.Role is "admin" or "super_admin" or "god"))
            return new(null, new("FORBIDDEN", "Administrator access is required", 403));

        var current = Resolve(evt);
        if (current.Error is not null) return current;
        var fromPublication = evt.PublicationStatus;
        var fromOperational = evt.OperationalStatus;
        var toPublication = fromPublication;
        var toOperational = fromOperational;
        HashSet<string>? publicationGuard = null;
        HashSet<string>? operationalGuard = null;
        switch (action)
        {
            case "approve": toPublication = "published"; publicationGuard = ["draft", "pending_review", "published"]; break;
            case "reject": toPublication = "draft"; publicationGuard = ["pending_review", "draft"]; break;
            case "postpone": toOperational = "postponed"; operationalGuard = ["scheduled", "postponed"]; break;
            case "complete": toOperational = "completed"; operationalGuard = ["scheduled", "completed"]; break;
            case "archive":
                toPublication = "archived";
                if (fromOperational is "scheduled" or "postponed") toOperational = "cancelled";
                break;
            case "restore":
            case "reschedule":
                if (fromPublication == "archived") toPublication = "draft";
                if (fromOperational is "postponed" or "cancelled") toOperational = "scheduled";
                operationalGuard = ["scheduled", "postponed", "cancelled"];
                break;
            default: return new(null, new("EVENT_LIFECYCLE_CONFLICT", "Unknown lifecycle transition", 409));
        }
        if (publicationGuard is not null && !publicationGuard.Contains(fromPublication)) return Conflict();
        if (operationalGuard is not null && !operationalGuard.Contains(fromOperational)) return Conflict();
        if (toPublication == fromPublication && toOperational == fromOperational)
        {
            await tx.CommitAsync(ct);
            return new(Resource(evt, action, false, null, null, EmptyCascade()));
        }
        if (!CanPublicationTransition(fromPublication, toPublication) || !CanOperationalTransition(fromOperational, toOperational) || !Compatible(toPublication, toOperational)) return Conflict();

        var activeRsvps = await _db.EventRsvps.IgnoreQueryFilters().Where(x => x.TenantId == tenantId && x.EventId == eventId && new[] { "going", "interested", "maybe", "invited", "waitlisted" }.Contains(x.Status)).ToListAsync(ct);
        var terminal = toOperational == "cancelled" && fromOperational != "cancelled" || toPublication == "archived" && fromPublication != "archived";
        var requiresReason = terminal && (toOperational == "cancelled" || fromPublication == "published" || activeRsvps.Count > 0);
        if (requiresReason && reason is null) return new(null, new("EVENT_LIFECYCLE_CONFLICT", "A reason is required for this transition", 409, "reason"));

        var now = DateTime.UtcNow;
        var publicationChanged = fromPublication != toPublication;
        var operationalChanged = fromOperational != toOperational;
        var nextVersion = evt.LifecycleVersion + 1;
        var legacy = LegacyMirror(toPublication, toOperational);
        var fromLegacy = evt.Status;
        if (publicationChanged)
        {
            evt.PublicationStatusChangedAt = now; evt.PublicationStatusChangedBy = actorId;
            if (toPublication == "pending_review") { evt.ModerationSubmittedAt = now; evt.ModerationSubmittedBy = actorId; }
            if (fromPublication == "pending_review") { evt.ModeratedAt = now; evt.ModeratedBy = actorId; evt.ModerationReason = reason; }
        }
        if (operationalChanged)
        {
            evt.OperationalStatusChangedAt = now; evt.OperationalStatusChangedBy = actorId;
            if (toOperational == "cancelled") { evt.CancelledAt = now; evt.CancelledBy = actorId; evt.CancellationReason = reason; }
            else if (fromOperational == "cancelled") { evt.CancelledAt = null; evt.CancelledBy = null; evt.CancellationReason = null; }
        }
        evt.PublicationStatus = toPublication; evt.OperationalStatus = toOperational; evt.Status = legacy;
        evt.IsCancelled = legacy == "cancelled"; evt.LifecycleVersion = nextVersion; evt.LifecycleReason = reason; evt.UpdatedAt = now;

        var reminders = await _db.EventReminders.IgnoreQueryFilters().Where(x => x.TenantId == tenantId && x.EventId == eventId && x.Status == "pending" && !x.IsSent).ToListAsync(ct);
        var cascade = EmptyCascade();
        var recipients = new HashSet<int>();
        if (terminal)
        {
            foreach (var rsvp in activeRsvps) { rsvp.Status = "cancelled"; rsvp.RespondedAt = now; recipients.Add(rsvp.UserId); }
            foreach (var reminder in reminders) { reminder.Status = "cancelled"; reminder.ClosedReason = "event_unavailable"; reminder.UpdatedAt = now; }
            cascade["registrations_cancelled"] = activeRsvps.Count; cascade["reminders_cancelled"] = reminders.Count;
        }
        else if (toOperational is "postponed" or "completed" && operationalChanged)
        {
            foreach (var reminder in reminders) { reminder.Status = toOperational == "postponed" ? "superseded" : "cancelled"; reminder.ClosedReason = $"event_{toOperational}"; reminder.UpdatedAt = now; }
            cascade["reminders_cancelled"] = reminders.Count;
        }

        var metadata = JsonSerializer.Serialize(new { schema_version = 1, source = "event_lifecycle_service", axes_changed = new[] { publicationChanged ? "publication" : null, operationalChanged ? "operational" : null }.Where(x => x is not null), cascade });
        var history = new EventStatusHistory { TenantId = tenantId, EventId = eventId, ActorUserId = actorId, LifecycleVersion = nextVersion, FromPublicationStatus = fromPublication, ToPublicationStatus = toPublication, FromOperationalStatus = fromOperational, ToOperationalStatus = toOperational, FromLegacyStatus = fromLegacy, ToLegacyStatus = legacy, Reason = reason, Metadata = metadata, CreatedAt = now };
        _db.EventStatusHistories.Add(history);
        var outbox = new EventDomainOutbox { TenantId = tenantId, EventId = eventId, AggregateStream = "lifecycle", AggregateVersion = nextVersion, IdempotencyKey = $"event:{tenantId}:{eventId}:lifecycle:v{nextVersion}", Payload = JsonSerializer.Serialize(new { schema_version = 1, tenant_id = tenantId, event_id = eventId, actor_user_id = actorId, organizer_user_id = evt.CreatedById, affected_recipient_user_ids = recipients, lifecycle_version = nextVersion, publication = new { from = fromPublication, to = toPublication }, operational = new { from = fromOperational, to = toOperational }, legacy_status = legacy, reason, metadata, occurred_at = now }), AvailableAt = now, ProcessedAt = now, CreatedAt = now, UpdatedAt = now };
        _db.EventDomainOutbox.Add(outbox);
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        try
        {
            if (action == "approve" && publicationChanged && evt.CreatedById != actorId) AddNotification(tenantId, evt.CreatedById, "event_approved", "Event approved", evt.Id, now);
            if (terminal)
            {
                recipients.Add(evt.CreatedById);
                foreach (var userId in recipients.Where(x => x > 0 && x != actorId)) AddNotification(tenantId, userId, "event_cancelled", "Event cancelled", evt.Id, now);
            }
            else if (action is "postpone" or "restore" or "reschedule" && operationalChanged && evt.CreatedById != actorId)
                AddNotification(tenantId, evt.CreatedById, "event_update", "Event schedule updated", evt.Id, now);
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            foreach (var entry in _db.ChangeTracker.Entries<Notification>().Where(x => x.State == EntityState.Added)) entry.State = EntityState.Detached;
        }
        return new(Resource(evt, action, true, history.Id, outbox.Id, cascade));
    }

    private void AddNotification(int tenantId, int userId, string type, string title, int eventId, DateTime now) => _db.Notifications.Add(new Notification { TenantId = tenantId, UserId = userId, Type = type, Title = title, Link = $"/events/{eventId}", Data = JsonSerializer.Serialize(new { event_id = eventId }), CreatedAt = now });
    private static EventLifecycleResult Resolve(Event evt)
    {
        if (!Publications.Contains(evt.PublicationStatus) || !Operations.Contains(evt.OperationalStatus) || evt.Status != LegacyMirror(evt.PublicationStatus, evt.OperationalStatus)) return Conflict();
        return new(new { });
    }
    private static bool Compatible(string publication, string operational) => publication is not ("draft" or "pending_review") || operational == "scheduled";
    private static bool CanPublicationTransition(string from, string to) => from == to || from switch { "draft" => to is "pending_review" or "published" or "archived", "pending_review" => to is "draft" or "published" or "archived", "published" => to == "archived", "archived" => to == "draft", _ => false };
    private static bool CanOperationalTransition(string from, string to) => from == to || from switch { "scheduled" => to is "postponed" or "cancelled" or "completed", "postponed" => to is "scheduled" or "cancelled", "cancelled" => to == "scheduled", "completed" => false, _ => false };
    private static string LegacyMirror(string publication, string operational) => publication == "archived" ? "cancelled" : publication is "draft" or "pending_review" ? "draft" : operational switch { "scheduled" => "active", "postponed" or "cancelled" => "cancelled", "completed" => "completed", _ => throw new InvalidOperationException() };
    private static Dictionary<string, int> EmptyCascade() => new() { ["reminders_cancelled"] = 0, ["waitlist_cancelled"] = 0, ["registrations_cancelled"] = 0 };
    private static object Resource(Event evt, string action, bool changed, long? historyId, long? outboxId, Dictionary<string, int> cascade) => new { id = evt.Id, evt.Title, description = evt.Description, status = evt.Status, publication_state = evt.PublicationStatus, operational_state = evt.OperationalStatus, lifecycle_version = evt.LifecycleVersion, start_at = evt.StartsAt, end_at = evt.EndsAt, location = evt.Location, organizer = new { id = evt.CreatedById, display_name = (string?)null }, group = evt.GroupId is null ? (object?)null : new { id = evt.GroupId, name = (string?)null }, capacity = new { limit = evt.MaxAttendees, confirmed = 0, remaining = (int?)null, is_full = false }, moderation = new { submitted_at = evt.ModerationSubmittedAt, submitted_by = evt.ModerationSubmittedBy, decided_at = evt.ModeratedAt, decided_by = evt.ModeratedBy, reason = evt.ModerationReason }, lifecycle_reason = evt.LifecycleReason, created_at = evt.CreatedAt, updated_at = evt.UpdatedAt, transition = new { action, changed, history_id = historyId, outbox_id = outboxId, cascade } };
    private static EventLifecycleResult Missing() => new(null, new("NOT_FOUND", "Event not found", 404));
    private static EventLifecycleResult Conflict() => new(null, new("EVENT_LIFECYCLE_CONFLICT", "Invalid event lifecycle transition", 409));
    private static EventLifecycleResult Invalid(string code, string message, string field) => new(null, new(code, message, 422, field));
}

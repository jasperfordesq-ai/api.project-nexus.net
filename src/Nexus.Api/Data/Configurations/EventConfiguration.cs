// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Entities;

namespace Nexus.Api.Data.Configurations;

/// <summary>
/// Entity configurations for event entities:
/// Event, EventRsvp, EventReminder.
/// </summary>
public class EventConfiguration : TenantScopedConfiguration
{
    public EventConfiguration(TenantContext tenantContext) : base(tenantContext) { }

    public override void Configure(ModelBuilder modelBuilder)
    {
        // Event configuration with tenant filter
        modelBuilder.Entity<Event>(entity =>
        {
            entity.ToTable("events");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnType("text");
            entity.Property(e => e.Location).HasMaxLength(500);
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.Status).HasMaxLength(32);
            entity.Property(e => e.PublicationStatus).HasMaxLength(32);
            entity.Property(e => e.OperationalStatus).HasMaxLength(32);
            entity.Property(e => e.Timezone).HasMaxLength(64);
            entity.Property(e => e.FederatedVisibility).HasMaxLength(16);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.CreatedById);
            entity.HasIndex(e => e.GroupId);
            entity.HasIndex(e => e.StartsAt);
            entity.HasIndex(e => e.IsCancelled);
            entity.HasIndex(e => new { e.TenantId, e.PublicationStatus, e.OperationalStatus, e.StartsAt, e.Id })
                .HasDatabaseName("idx_events_tenant_lifecycle_start");

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Group)
                .WithMany(g => g.Events)
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.SetNull);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // EventRsvp configuration with tenant filter
        modelBuilder.Entity<EventRsvp>(entity =>
        {
            entity.ToTable("event_rsvps");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.EventId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.RespondedAt);
            // Unique constraint: one RSVP per user per event
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.UserId }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Event)
                .WithMany(ev => ev.Rsvps)
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // EventReminder
        modelBuilder.Entity<EventReminder>(entity =>
        {
            entity.ToTable("event_reminders");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ReminderType).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(32).IsRequired();
            entity.HasIndex(e => new { e.EventId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Event).WithMany().HasForeignKey(e => e.EventId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        modelBuilder.Entity<EventStatusHistory>(entity =>
        {
            entity.ToTable("event_status_history");
            entity.Property(e => e.FromPublicationStatus).HasMaxLength(32);
            entity.Property(e => e.ToPublicationStatus).HasMaxLength(32);
            entity.Property(e => e.FromOperationalStatus).HasMaxLength(32);
            entity.Property(e => e.ToOperationalStatus).HasMaxLength(32);
            entity.Property(e => e.FromLegacyStatus).HasMaxLength(32);
            entity.Property(e => e.ToLegacyStatus).HasMaxLength(32);
            entity.Property(e => e.Metadata).HasColumnType("jsonb");
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.LifecycleVersion })
                .IsUnique().HasDatabaseName("uq_event_status_history_version");
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.CreatedAt, e.Id })
                .HasDatabaseName("idx_event_status_history_event");
            entity.HasIndex(e => new { e.TenantId, e.ActorUserId, e.CreatedAt })
                .HasDatabaseName("idx_event_status_history_actor");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        modelBuilder.Entity<EventDomainOutbox>(entity =>
        {
            entity.ToTable("event_domain_outbox");
            entity.Property(e => e.AggregateStream).HasMaxLength(191);
            entity.Property(e => e.Action).HasMaxLength(80);
            entity.Property(e => e.IdempotencyKey).HasMaxLength(191);
            entity.Property(e => e.ProductionMode).HasMaxLength(32);
            entity.Property(e => e.Status).HasMaxLength(32);
            entity.Property(e => e.Payload).HasColumnType("jsonb");
            entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique()
                .HasDatabaseName("uq_event_outbox_tenant_key");
            entity.HasIndex(e => new { e.Status, e.AvailableAt, e.NextAttemptAt, e.Id })
                .HasDatabaseName("idx_event_outbox_claim");
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.AggregateVersion })
                .HasDatabaseName("idx_event_outbox_aggregate");
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.AggregateStream, e.AggregateVersion, e.Id })
                .HasDatabaseName("idx_event_outbox_stream");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        modelBuilder.Entity<EventTemplate>(entity =>
        {
            entity.ToTable("event_templates"); entity.Property(e => e.Status).HasMaxLength(16); entity.Property(e => e.ArchiveReason).HasMaxLength(500);
            entity.HasIndex(e => e.PublicId).IsUnique().HasDatabaseName("uq_event_template_public");
            entity.HasIndex(e => new { e.TenantId, e.Id }).IsUnique().HasDatabaseName("uq_event_template_tenant_id");
            entity.HasIndex(e => new { e.TenantId, e.Status, e.UpdatedAt, e.Id }).HasDatabaseName("idx_event_template_status");
            entity.HasIndex(e => new { e.TenantId, e.SourceEventId, e.CreatedAt, e.Id }).HasDatabaseName("idx_event_template_source");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventTemplateVersion>(entity =>
        {
            entity.ToTable("event_template_versions"); entity.Property(e => e.Payload).HasColumnType("jsonb"); entity.Property(e => e.CopiedFields).HasColumnType("jsonb"); entity.Property(e => e.SkippedFields).HasColumnType("jsonb");
            foreach (var property in new[] { nameof(EventTemplateVersion.PayloadHash), nameof(EventTemplateVersion.CaptureIdempotencyHash), nameof(EventTemplateVersion.CaptureRequestHash) }) entity.Property(property).HasMaxLength(64).IsFixedLength();
            entity.HasIndex(e => new { e.TenantId, e.TemplateId, e.VersionNumber }).IsUnique().HasDatabaseName("uq_event_template_version");
            entity.HasIndex(e => new { e.TenantId, e.CaptureIdempotencyHash }).IsUnique().HasDatabaseName("uq_event_template_capture_key");
            entity.HasIndex(e => new { e.TenantId, e.TemplateId, e.Id, e.VersionNumber, e.SourceEventId }).IsUnique().HasDatabaseName("uq_event_template_version_provenance");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventTemplateMaterialization>(entity =>
        {
            entity.ToTable("event_template_materializations"); entity.Property(e => e.ScheduleTimezone).HasMaxLength(64); entity.Property(e => e.OverrideFields).HasColumnType("jsonb");
            foreach (var property in new[] { nameof(EventTemplateMaterialization.TemplatePayloadHash), nameof(EventTemplateMaterialization.EffectivePayloadHash), nameof(EventTemplateMaterialization.IdempotencyHash), nameof(EventTemplateMaterialization.RequestHash) }) entity.Property(property).HasMaxLength(64).IsFixedLength();
            entity.HasIndex(e => new { e.TenantId, e.IdempotencyHash }).IsUnique().HasDatabaseName("uq_event_template_materialize_key");
            entity.HasIndex(e => new { e.TenantId, e.CreatedEventId }).IsUnique().HasDatabaseName("uq_event_template_materialized_event");
            entity.HasIndex(e => new { e.TenantId, e.TemplateId, e.TemplateVersionNumber, e.CreatedAt, e.Id }).HasDatabaseName("idx_event_template_materialized_version");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventTemplateAudit>(entity =>
        {
            entity.ToTable("event_template_audit"); entity.Property(e => e.Action).HasMaxLength(24); entity.Property(e => e.Metadata).HasColumnType("jsonb"); entity.Property(e => e.IdempotencyHash).HasMaxLength(64).IsFixedLength(); entity.Property(e => e.RequestHash).HasMaxLength(64).IsFixedLength();
            entity.HasIndex(e => new { e.TenantId, e.IdempotencyHash }).IsUnique().HasDatabaseName("uq_event_template_audit_key");
            entity.HasIndex(e => new { e.TenantId, e.TemplateId, e.CreatedAt, e.Id }).HasDatabaseName("idx_event_template_audit_template");
            entity.HasIndex(e => new { e.TenantId, e.SourceEventId, e.CreatedAt, e.Id }).HasDatabaseName("idx_event_template_audit_source");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        modelBuilder.Entity<EventRegistration>(entity =>
        {
            entity.ToTable("event_registrations"); entity.Property(e => e.RegistrationState).HasMaxLength(32); entity.Property(e => e.CapacityPoolKey).HasMaxLength(100); entity.Property(e => e.AllocationKey).HasMaxLength(191);
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.UserId, e.CapacityPoolKey }).IsUnique().HasDatabaseName("uq_event_registration_subject");
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.CapacityPoolKey, e.RegistrationState, e.Id }).HasDatabaseName("idx_event_registration_capacity");
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.RegistrationState, e.EventId }).HasDatabaseName("idx_event_registration_user");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventRegistrationHistory>(entity =>
        {
            entity.ToTable("event_registration_history"); entity.Property(e => e.CapacityPoolKey).HasMaxLength(100); entity.Property(e => e.AllocationKey).HasMaxLength(191); entity.Property(e => e.Action).HasMaxLength(64); entity.Property(e => e.FromState).HasMaxLength(32); entity.Property(e => e.ToState).HasMaxLength(32); entity.Property(e => e.IdempotencyKey).HasMaxLength(191); entity.Property(e => e.Reason).HasColumnType("text"); entity.Property(e => e.Metadata).HasColumnType("jsonb");
            entity.HasIndex(e => new { e.TenantId, e.RegistrationId, e.RegistrationVersion }).IsUnique().HasDatabaseName("uq_event_registration_history_version"); entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique().HasDatabaseName("uq_event_registration_history_key"); entity.HasIndex(e => new { e.TenantId, e.EventId, e.CapacityPoolKey, e.CreatedAt, e.Id }).HasDatabaseName("idx_event_registration_history_event"); entity.HasIndex(e => new { e.TenantId, e.UserId, e.CreatedAt, e.Id }).HasDatabaseName("idx_event_registration_history_user");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventWaitlistEntry>(entity =>
        {
            entity.ToTable("event_waitlist_entries"); entity.Property(e => e.QueueState).HasMaxLength(32); entity.Property(e => e.CapacityPoolKey).HasMaxLength(100); entity.Property(e => e.AllocationKey).HasMaxLength(191); entity.Property(e => e.OfferTokenHash).HasMaxLength(64).IsFixedLength();
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.UserId, e.CapacityPoolKey }).IsUnique().HasDatabaseName("uq_event_waitlist_entry_subject"); entity.HasIndex(e => new { e.TenantId, e.EventId, e.CapacityPoolKey, e.QueueSequence }).IsUnique().HasDatabaseName("uq_event_waitlist_entry_sequence"); entity.HasIndex(e => e.OfferTokenHash).IsUnique().HasDatabaseName("uq_event_waitlist_offer_token");
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.CapacityPoolKey, e.QueueState, e.QueueSequence, e.Id }).HasDatabaseName("idx_event_waitlist_queue"); entity.HasIndex(e => new { e.QueueState, e.OfferExpiresAt, e.Id }).HasDatabaseName("idx_event_waitlist_expiry"); entity.HasIndex(e => new { e.TenantId, e.UserId, e.QueueState, e.EventId }).HasDatabaseName("idx_event_waitlist_user");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventWaitlistEntryHistory>(entity =>
        {
            entity.ToTable("event_waitlist_entry_history"); entity.Property(e => e.CapacityPoolKey).HasMaxLength(100); entity.Property(e => e.AllocationKey).HasMaxLength(191); entity.Property(e => e.Action).HasMaxLength(64); entity.Property(e => e.FromState).HasMaxLength(32); entity.Property(e => e.ToState).HasMaxLength(32); entity.Property(e => e.IdempotencyKey).HasMaxLength(191); entity.Property(e => e.Reason).HasColumnType("text"); entity.Property(e => e.Metadata).HasColumnType("jsonb");
            entity.HasIndex(e => new { e.TenantId, e.WaitlistEntryId, e.QueueVersion }).IsUnique().HasDatabaseName("uq_event_waitlist_history_version"); entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique().HasDatabaseName("uq_event_waitlist_history_key"); entity.HasIndex(e => new { e.TenantId, e.EventId, e.CapacityPoolKey, e.CreatedAt, e.Id }).HasDatabaseName("idx_event_waitlist_history_event"); entity.HasIndex(e => new { e.TenantId, e.UserId, e.CreatedAt, e.Id }).HasDatabaseName("idx_event_waitlist_history_user");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventAttendance>(entity =>
        {
            entity.ToTable("event_attendance"); entity.Property(e => e.AttendanceStatus).HasMaxLength(32); entity.Property(e => e.HoursCredited).HasPrecision(10, 2); entity.Property(e => e.Notes).HasColumnType("text");
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.UserId }).IsUnique().HasDatabaseName("uq_event_attendance_user");
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.AttendanceStatus, e.Id }).HasDatabaseName("idx_event_attendance_tenant_event_status");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventAttendanceActivity>(entity =>
        {
            entity.ToTable("event_attendance_activity"); entity.Property(e => e.Action).HasMaxLength(50); entity.Property(e => e.FromStatus).HasMaxLength(32); entity.Property(e => e.ToStatus).HasMaxLength(32); entity.Property(e => e.IdempotencyKey).HasMaxLength(191); entity.Property(e => e.Reason).HasColumnType("text"); entity.Property(e => e.Metadata).HasColumnType("jsonb");
            entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique().HasDatabaseName("uq_event_attendance_activity_key"); entity.HasIndex(e => new { e.TenantId, e.AttendanceId, e.AttendanceVersion }).IsUnique().HasDatabaseName("uq_event_attendance_activity_version"); entity.HasIndex(e => new { e.TenantId, e.EventId, e.CreatedAt, e.Id }).HasDatabaseName("idx_event_attendance_activity_event"); entity.HasIndex(e => new { e.TenantId, e.UserId, e.CreatedAt }).HasDatabaseName("idx_event_attendance_activity_user");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventBroadcast>(entity =>
        {
            entity.ToTable("event_broadcasts"); entity.Property(e => e.Variant).HasMaxLength(32); entity.Property(e => e.Status).HasMaxLength(16);
            entity.Property(e => e.AudienceSegments).HasColumnType("jsonb"); entity.Property(e => e.Channels).HasColumnType("jsonb"); entity.Property(e => e.Body).HasColumnType("text"); entity.Property(e => e.ContentHash).HasMaxLength(64).IsFixedLength(); entity.Property(e => e.FailureCode).HasMaxLength(100);
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.Id }).IsUnique().HasDatabaseName("uq_event_broadcast_scope_id");
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.Status, e.CreatedAt, e.Id }).HasDatabaseName("idx_event_broadcast_event_status");
            entity.HasIndex(e => new { e.Status, e.ScheduledAt, e.Id }).HasDatabaseName("idx_event_broadcast_schedule");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventBroadcastHistory>(entity =>
        {
            entity.ToTable("event_broadcast_history"); entity.Property(e => e.Action).HasMaxLength(16); entity.Property(e => e.FromStatus).HasMaxLength(16); entity.Property(e => e.ToStatus).HasMaxLength(16); entity.Property(e => e.Metadata).HasColumnType("jsonb");
            foreach (var p in new[] { nameof(EventBroadcastHistory.IdempotencyHash), nameof(EventBroadcastHistory.RequestHash), nameof(EventBroadcastHistory.ContentHash) }) entity.Property(p).HasMaxLength(64).IsFixedLength();
            entity.HasIndex(e => new { e.TenantId, e.BroadcastId, e.BroadcastVersion }).IsUnique().HasDatabaseName("uq_event_broadcast_history_version"); entity.HasIndex(e => new { e.TenantId, e.IdempotencyHash }).IsUnique().HasDatabaseName("uq_event_broadcast_history_key"); entity.HasIndex(e => new { e.TenantId, e.EventId, e.BroadcastId, e.CreatedAt, e.Id }).HasDatabaseName("idx_event_broadcast_history_event");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventBroadcastDelivery>(entity =>
        {
            entity.ToTable("event_broadcast_deliveries"); entity.Property(e => e.Channel).HasMaxLength(16); entity.Property(e => e.DeliveryKey).HasMaxLength(64).IsFixedLength(); entity.Property(e => e.Status).HasMaxLength(16); entity.Property(e => e.ClaimToken).HasMaxLength(36); entity.Property(e => e.PreferenceReason).HasMaxLength(100); entity.Property(e => e.SuppressionReason).HasMaxLength(100); entity.Property(e => e.Provider).HasMaxLength(50); entity.Property(e => e.ProviderEvidenceId).HasMaxLength(255); entity.Property(e => e.LastErrorCode).HasMaxLength(100);
            entity.HasIndex(e => new { e.TenantId, e.DeliveryKey }).IsUnique().HasDatabaseName("uq_event_broadcast_delivery_key"); entity.HasIndex(e => new { e.BroadcastId, e.RecipientUserId, e.Channel }).IsUnique().HasDatabaseName("uq_event_broadcast_recipient_channel"); entity.HasIndex(e => new { e.TenantId, e.EventId, e.BroadcastId, e.Id }).IsUnique().HasDatabaseName("uq_event_broadcast_delivery_scope"); entity.HasIndex(e => new { e.Status, e.AvailableAt, e.NextAttemptAt, e.Id }).HasDatabaseName("idx_event_broadcast_delivery_claim"); entity.HasIndex(e => new { e.TenantId, e.BroadcastId, e.Status, e.Id }).HasDatabaseName("idx_event_broadcast_delivery_status");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventBroadcastDeliveryAttempt>(entity =>
        {
            entity.ToTable("event_broadcast_delivery_attempts"); entity.Property(e => e.Outcome).HasMaxLength(16); entity.Property(e => e.Provider).HasMaxLength(50); entity.Property(e => e.ProviderEvidenceId).HasMaxLength(255); entity.Property(e => e.ReasonCode).HasMaxLength(100); entity.Property(e => e.Metadata).HasColumnType("jsonb");
            entity.HasIndex(e => new { e.TenantId, e.DeliveryId, e.AttemptNumber, e.Outcome }).IsUnique().HasDatabaseName("uq_event_broadcast_attempt_outcome"); entity.HasIndex(e => new { e.TenantId, e.BroadcastId, e.CreatedAt, e.Id }).HasDatabaseName("idx_event_broadcast_attempt_parent");
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventSession>(entity =>
        {
            entity.ToTable("event_sessions"); entity.Property(e => e.Title).HasMaxLength(191); entity.Property(e => e.Description).HasColumnType("text"); entity.Property(e => e.SessionType).HasMaxLength(32); entity.Property(e => e.Visibility).HasMaxLength(24); entity.Property(e => e.Status).HasMaxLength(16); entity.Property(e => e.Timezone).HasMaxLength(64); entity.Property(e => e.TrackName).HasMaxLength(120); entity.Property(e => e.RoomName).HasMaxLength(120); entity.Property(e => e.RoomKey).HasMaxLength(64).IsFixedLength(); entity.Property(e => e.CancellationReason).HasMaxLength(500);
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.Status, e.StartsAtUtc, e.Position, e.Id }).HasDatabaseName("idx_event_sessions_event_time"); entity.HasIndex(e => new { e.TenantId, e.EventId, e.RoomKey, e.Status, e.StartsAtUtc, e.EndsAtUtc }).HasDatabaseName("idx_event_sessions_room_time"); entity.HasIndex(e => new { e.TenantId, e.EventId, e.Id }).IsUnique().HasDatabaseName("uq_event_sessions_tenant_event_id");
            entity.HasMany(e => e.Speakers).WithOne().HasForeignKey(e => e.SessionId).OnDelete(DeleteBehavior.Restrict); entity.HasMany(e => e.Resources).WithOne().HasForeignKey(e => e.SessionId).OnDelete(DeleteBehavior.Restrict); entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
        modelBuilder.Entity<EventSessionSpeaker>(entity => { entity.ToTable("event_session_speakers"); entity.Property(e => e.DisplayName).HasMaxLength(191); entity.Property(e => e.RoleLabel).HasMaxLength(120); entity.HasIndex(e => new { e.TenantId, e.SessionId, e.UserId }).IsUnique().HasDatabaseName("uq_event_session_speaker_member"); entity.HasIndex(e => new { e.TenantId, e.EventId, e.SessionId, e.Position, e.Id }).HasDatabaseName("idx_event_session_speakers_order"); entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId); });
        modelBuilder.Entity<EventSessionResource>(entity => { entity.ToTable("event_session_resources"); entity.Property(e => e.ResourceType).HasMaxLength(24); entity.Property(e => e.Visibility).HasMaxLength(24); entity.Property(e => e.Title).HasMaxLength(191); entity.Property(e => e.UrlCiphertext).HasColumnType("text"); entity.HasIndex(e => new { e.TenantId, e.EventId, e.SessionId, e.Position, e.Id }).HasDatabaseName("idx_ev_session_resources_order"); entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId); });
        modelBuilder.Entity<EventSessionHistory>(entity => { entity.ToTable("event_session_history"); entity.Property(e => e.Action).HasMaxLength(32); entity.Property(e => e.IdempotencyKey).HasMaxLength(191); entity.Property(e => e.RequestHash).HasMaxLength(64).IsFixedLength(); entity.Property(e => e.ChangedFields).HasColumnType("jsonb"); entity.Property(e => e.AffectedSessionIds).HasColumnType("jsonb"); entity.HasIndex(e => new { e.TenantId, e.EventId, e.AgendaVersion }).IsUnique().HasDatabaseName("uq_event_session_history_version"); entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique().HasDatabaseName("uq_event_session_history_key"); entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId); });
        modelBuilder.Entity<EventSessionRegistration>(entity => { entity.ToTable("event_session_registrations"); entity.Property(e => e.Status).HasMaxLength(16); entity.HasIndex(e => new { e.TenantId, e.EventId, e.SessionId, e.UserId }).IsUnique().HasDatabaseName("uq_ev_session_reg_member"); entity.HasIndex(e => new { e.TenantId, e.EventId, e.SessionId, e.Status, e.Id }).HasDatabaseName("idx_ev_session_reg_capacity"); entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId); });
        modelBuilder.Entity<EventSessionRegistrationHistory>(entity => { entity.ToTable("event_session_registration_history"); entity.Property(e => e.Action).HasMaxLength(16); entity.Property(e => e.IdempotencyKey).HasMaxLength(191); entity.Property(e => e.RequestHash).HasMaxLength(64).IsFixedLength(); entity.HasIndex(e => new { e.TenantId, e.RegistrationId, e.RegistrationVersion }).IsUnique().HasDatabaseName("uq_ev_session_reg_history_version"); entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique().HasDatabaseName("uq_ev_session_reg_history_key"); entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId); });
    }
}

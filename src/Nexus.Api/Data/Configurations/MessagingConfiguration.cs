// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Entities;

namespace Nexus.Api.Data.Configurations;

/// <summary>
/// Entity configurations for messaging entities:
/// Conversation, Message, VoiceMessage, MessageAttachment.
/// </summary>
public class MessagingConfiguration : TenantScopedConfiguration
{
    public MessagingConfiguration(TenantContext tenantContext) : base(tenantContext) { }

    public override void Configure(ModelBuilder modelBuilder)
    {
        // Conversation configuration with tenant filter
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.ToTable("conversations");
            entity.HasKey(e => e.Id);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.Participant1Id);
            entity.HasIndex(e => e.Participant2Id);
            entity.HasIndex(e => new { e.TenantId, e.Participant1Id, e.Participant2Id }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Participant1)
                .WithMany()
                .HasForeignKey(e => e.Participant1Id)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Participant2)
                .WithMany()
                .HasForeignKey(e => e.Participant2Id)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // Message configuration with tenant filter
        modelBuilder.Entity<Message>(entity =>
        {
            entity.ToTable("messages");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).HasColumnType("text").IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.ConversationId);
            entity.HasIndex(e => e.SenderId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.ConversationId, e.IsRead });

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Sender)
                .WithMany()
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // Voice Messages
        modelBuilder.Entity<VoiceMessage>(entity =>
        {
            entity.ToTable("voice_messages");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AudioUrl).HasMaxLength(1000).IsRequired();
            entity.Property(e => e.Format).HasMaxLength(10).IsRequired();
            entity.HasIndex(e => new { e.ConversationId, e.CreatedAt });
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Sender).WithMany().HasForeignKey(e => e.SenderId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Conversation).WithMany().HasForeignKey(e => e.ConversationId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // --- Message Attachments ---
        modelBuilder.Entity<MessageAttachment>(entity =>
        {
            entity.ToTable("message_attachments");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.MessageId);
            entity.HasOne(e => e.Message).WithMany().HasForeignKey(e => e.MessageId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.FileUpload).WithMany().HasForeignKey(e => e.FileUploadId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.UploadedBy).WithMany().HasForeignKey(e => e.UploadedById).OnDelete(DeleteBehavior.Restrict);
            // No tenant query filter - MessageAttachment is not tenant-scoped
        });
    }
}

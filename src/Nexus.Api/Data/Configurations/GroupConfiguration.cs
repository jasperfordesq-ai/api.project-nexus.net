// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Entities;

namespace Nexus.Api.Data.Configurations;

/// <summary>
/// Entity configurations for group entities:
/// Group, GroupMember, GroupAnnouncement, GroupPolicy, GroupFile, GroupDiscussion,
/// GroupDiscussionReply, GroupExchange, GroupExchangeParticipant.
/// </summary>
public class GroupConfiguration : TenantScopedConfiguration
{
    public GroupConfiguration(TenantContext tenantContext) : base(tenantContext) { }

    public override void Configure(ModelBuilder modelBuilder)
    {
        // Group configuration with tenant filter
        modelBuilder.Entity<Group>(entity =>
        {
            entity.ToTable("groups");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnType("text");
            entity.Property(e => e.ImageUrl).HasMaxLength(500);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.CreatedById);
            entity.HasIndex(e => e.Name);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // GroupMember configuration with tenant filter
        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.ToTable("group_members");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Role).HasMaxLength(20).IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.GroupId);
            entity.HasIndex(e => e.UserId);
            // Unique constraint: one membership per user per group
            entity.HasIndex(e => new { e.TenantId, e.GroupId, e.UserId }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Group)
                .WithMany(g => g.Members)
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // GroupAnnouncement
        modelBuilder.Entity<GroupAnnouncement>(entity =>
        {
            entity.ToTable("group_announcements");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Content).HasColumnType("text").IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.GroupId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author).WithMany().HasForeignKey(e => e.AuthorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // GroupPolicy
        modelBuilder.Entity<GroupPolicy>(entity =>
        {
            entity.ToTable("group_policies");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Value).HasColumnType("text").IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.GroupId, e.Key }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // GroupFile
        modelBuilder.Entity<GroupFile>(entity =>
        {
            entity.ToTable("group_files");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.FileUrl).HasMaxLength(1000).IsRequired();
            entity.Property(e => e.ContentType).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.GroupId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.UploadedBy).WithMany().HasForeignKey(e => e.UploadedById).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // GroupDiscussion
        modelBuilder.Entity<GroupDiscussion>(entity =>
        {
            entity.ToTable("group_discussions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Content).HasColumnType("text").IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.GroupId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author).WithMany().HasForeignKey(e => e.AuthorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // GroupDiscussionReply
        modelBuilder.Entity<GroupDiscussionReply>(entity =>
        {
            entity.ToTable("group_discussion_replies");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).HasColumnType("text").IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.DiscussionId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Discussion).WithMany(d => d.Replies).HasForeignKey(e => e.DiscussionId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author).WithMany().HasForeignKey(e => e.AuthorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // GroupExchange
        modelBuilder.Entity<GroupExchange>(entity =>
        {
            entity.ToTable("group_exchanges");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(30).IsRequired();
            entity.Property(e => e.TotalHours).HasPrecision(10, 2);
            entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.CreatedBy).WithMany().HasForeignKey(e => e.CreatedById).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.ApprovedBy).WithMany().HasForeignKey(e => e.ApprovedById).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // GroupExchangeParticipant - NO tenant query filter
        modelBuilder.Entity<GroupExchangeParticipant>(entity =>
        {
            entity.ToTable("group_exchange_participants");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Role).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Hours).HasPrecision(10, 2);
            entity.HasOne(e => e.GroupExchange).WithMany(g => g.Participants).HasForeignKey(e => e.GroupExchangeId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}

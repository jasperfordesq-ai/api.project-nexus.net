// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Entities;

namespace Nexus.Api.Data.Configurations;

/// <summary>
/// Entity configurations for volunteer and staffing entities:
/// VolunteerOpportunity, VolunteerShift, VolunteerApplication, VolunteerCheckIn,
/// VolunteerAvailability, StaffingPrediction.
/// </summary>
public class VolunteerConfiguration : TenantScopedConfiguration
{
    public VolunteerConfiguration(TenantContext tenantContext) : base(tenantContext) { }

    public override void Configure(ModelBuilder modelBuilder)
    {
        // VolunteerOpportunity
        modelBuilder.Entity<VolunteerOpportunity>(entity =>
        {
            entity.ToTable("volunteer_opportunities");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnType("text");
            entity.Property(e => e.Location).HasMaxLength(500);
            entity.Property(e => e.SkillsRequired).HasColumnType("text");
            entity.Property(e => e.CreditReward).HasPrecision(10, 2);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.OrganizerId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.StartsAt);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Organizer).WithMany().HasForeignKey(e => e.OrganizerId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Category).WithMany().HasForeignKey(e => e.CategoryId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // VolunteerShift
        modelBuilder.Entity<VolunteerShift>(entity =>
        {
            entity.ToTable("volunteer_shifts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255);
            entity.Property(e => e.Location).HasMaxLength(500);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.OpportunityId);
            entity.HasIndex(e => e.StartsAt);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Opportunity).WithMany(o => o.Shifts).HasForeignKey(e => e.OpportunityId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // VolunteerApplication
        modelBuilder.Entity<VolunteerApplication>(entity =>
        {
            entity.ToTable("volunteer_applications");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Message).HasMaxLength(2000);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.OpportunityId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.TenantId, e.OpportunityId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Opportunity).WithMany(o => o.Applications).HasForeignKey(e => e.OpportunityId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ReviewedBy).WithMany().HasForeignKey(e => e.ReviewedById).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // VolunteerCheckIn
        modelBuilder.Entity<VolunteerCheckIn>(entity =>
        {
            entity.ToTable("volunteer_check_ins");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.HoursLogged).HasPrecision(10, 2);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.ShiftId);
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Shift).WithMany(s => s.CheckIns).HasForeignKey(e => e.ShiftId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Transaction).WithMany().HasForeignKey(e => e.TransactionId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // StaffingPrediction (Phase 36)
        modelBuilder.Entity<StaffingPrediction>(entity =>
        {
            entity.ToTable("staffing_predictions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ShortfallRisk).HasPrecision(5, 4);
            entity.Property(e => e.Factors).HasColumnType("text");
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.PredictedDate);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Opportunity).WithMany().HasForeignKey(e => e.OpportunityId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // VolunteerAvailability (Phase 36)
        modelBuilder.Entity<VolunteerAvailability>(entity =>
        {
            entity.ToTable("volunteer_availabilities");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.DayOfWeek });
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
    }
}

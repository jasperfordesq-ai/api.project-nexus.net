// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Entities;

namespace Nexus.Api.Data.Configurations;

/// <summary>
/// Entity configurations for broker assignments and enterprise config:
/// BrokerAssignment, BrokerNote, EnterpriseConfig (not tenant-scoped via query filter).
/// </summary>
public class BrokerEnterpriseConfiguration : TenantScopedConfiguration
{
    public BrokerEnterpriseConfiguration(TenantContext tenantContext) : base(tenantContext) { }

    public override void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BrokerAssignment>(entity =>
        {
            entity.ToTable("broker_assignments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasMaxLength(30).IsRequired();
            entity.HasIndex(e => new { e.BrokerId, e.Status });
            entity.HasOne(e => e.Broker).WithMany().HasForeignKey(e => e.BrokerId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Member).WithMany().HasForeignKey(e => e.MemberId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        modelBuilder.Entity<BrokerNote>(entity =>
        {
            entity.ToTable("broker_notes");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).IsRequired();
            entity.HasOne(e => e.Broker).WithMany().HasForeignKey(e => e.BrokerId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Member).WithMany().HasForeignKey(e => e.MemberId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // EnterpriseConfig uses TenantId as a partition key but does NOT use a global query filter
        modelBuilder.Entity<EnterpriseConfig>(entity =>
        {
            entity.ToTable("enterprise_configs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Value).IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.Key }).IsUnique();
        });
    }
}

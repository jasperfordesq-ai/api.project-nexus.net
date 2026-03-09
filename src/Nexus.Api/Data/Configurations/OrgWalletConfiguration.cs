// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Entities;

namespace Nexus.Api.Data.Configurations;

/// <summary>
/// Entity configurations for organisation wallets:
/// OrgWallet, OrgWalletTransaction.
/// </summary>
public class OrgWalletConfiguration : TenantScopedConfiguration
{
    public OrgWalletConfiguration(TenantContext tenantContext) : base(tenantContext) { }

    public override void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OrgWallet>(entity =>
        {
            entity.ToTable("org_wallets");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.TenantId, e.OrganisationId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Organisation).WithMany().HasForeignKey(e => e.OrganisationId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        modelBuilder.Entity<OrgWalletTransaction>(entity =>
        {
            entity.ToTable("org_wallet_transactions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.HasIndex(e => new { e.OrgWalletId, e.CreatedAt });
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.OrgWallet).WithMany().HasForeignKey(e => e.OrgWalletId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.InitiatedBy).WithMany().HasForeignKey(e => e.InitiatedById).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.FromUser).WithMany().HasForeignKey(e => e.FromUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.ToUser).WithMany().HasForeignKey(e => e.ToUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
    }
}

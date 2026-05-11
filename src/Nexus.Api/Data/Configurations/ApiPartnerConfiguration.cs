// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Entities;

namespace Nexus.Api.Data.Configurations;

/// <summary>
/// Entity configuration for ApiPartner — external API consumers.
/// </summary>
public class ApiPartnerConfiguration : TenantScopedConfiguration
{
    public ApiPartnerConfiguration(TenantContext tenantContext) : base(tenantContext) { }

    public override void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ApiPartner>(entity =>
        {
            entity.ToTable("api_partners");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.ContactEmail).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.ApiKeyHash).HasMaxLength(128).IsRequired();
            entity.Property(e => e.ApiKeyPrefix).HasMaxLength(16).IsRequired();
            entity.Property(e => e.Scopes).HasMaxLength(500).IsRequired();
            entity.Property(e => e.RevokedReason).HasMaxLength(1000);
            entity.Property(e => e.Status).HasConversion<int>();
            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.HasIndex(e => e.ApiKeyHash).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
    }
}

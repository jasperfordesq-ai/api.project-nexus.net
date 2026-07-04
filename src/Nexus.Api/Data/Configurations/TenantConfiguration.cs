// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Entities;

namespace Nexus.Api.Data.Configurations;

/// <summary>
/// Entity configurations for tenant-related entities:
/// Tenant, TenantConfig, TenantRegistrationPolicy, IdentityVerificationSession, IdentityVerificationEvent.
/// </summary>
public class TenantConfiguration : TenantScopedConfiguration
{
    public TenantConfiguration(TenantContext tenantContext) : base(tenantContext) { }

    public override void Configure(ModelBuilder modelBuilder)
    {
        // Tenant configuration
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.ToTable("tenants");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Slug).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.HasIndex(e => e.Slug).IsUnique();
        });

        // TenantConfig configuration with tenant filter
        modelBuilder.Entity<TenantConfig>(entity =>
        {
            entity.ToTable("tenant_configs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Value).HasColumnType("text").IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.Key);
            // Unique constraint: key per tenant
            entity.HasIndex(e => new { e.TenantId, e.Key }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // TenantSsoProvider configuration with tenant filter
        modelBuilder.Entity<TenantSsoProvider>(entity =>
        {
            entity.ToTable("tenant_sso_providers");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProviderKey).HasMaxLength(20).IsRequired();
            entity.Property(e => e.DisplayName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Preset).HasMaxLength(32).HasDefaultValue("generic").IsRequired();
            entity.Property(e => e.IssuerUrl).HasMaxLength(500).IsRequired();
            entity.Property(e => e.ClientId).HasMaxLength(255).IsRequired();
            entity.Property(e => e.ClientSecretEncrypted).HasColumnType("text");
            entity.Property(e => e.Scopes).HasMaxLength(255).HasDefaultValue("openid profile email").IsRequired();
            entity.Property(e => e.AllowedEmailDomains).HasColumnType("jsonb");
            entity.HasIndex(e => e.TenantId).HasDatabaseName("sso_tenant_idx");
            entity.HasIndex(e => new { e.TenantId, e.ProviderKey })
                .IsUnique()
                .HasDatabaseName("sso_tenant_provider_unique");

            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // TenantRegistrationPolicy configuration
        modelBuilder.Entity<TenantRegistrationPolicy>(entity =>
        {
            entity.ToTable("tenant_registration_policies");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Mode)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(e => e.Provider)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(e => e.VerificationLevel)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(e => e.PostVerificationAction)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(e => e.FallbackMode)
                .HasMaxLength(50)
                .HasDefaultValue("none");

            // One active policy per tenant
            entity.HasIndex(e => new { e.TenantId, e.IsActive })
                .HasFilter("\"IsActive\" = true")
                .IsUnique();

            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // TenantProviderCredential configuration
        modelBuilder.Entity<TenantProviderCredential>(entity =>
        {
            entity.ToTable("tenant_provider_credentials");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProviderSlug).HasMaxLength(100).IsRequired();
            entity.Property(e => e.CredentialsEncrypted).HasColumnType("text").IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.ProviderSlug }).IsUnique();

            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // IdentityVerificationSession configuration
        modelBuilder.Entity<IdentityVerificationSession>(entity =>
        {
            entity.ToTable("identity_verification_sessions");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Provider)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(e => e.Level)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.HasIndex(e => new { e.TenantId, e.UserId });
            entity.HasIndex(e => e.ExternalSessionId);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // IdentityVerificationEvent configuration
        modelBuilder.Entity<IdentityVerificationEvent>(entity =>
        {
            entity.ToTable("identity_verification_events");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.PreviousStatus)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(e => e.NewStatus)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.HasIndex(e => e.SessionId);

            entity.HasOne(e => e.Session)
                .WithMany(s => s.Events)
                .HasForeignKey(e => e.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
    }
}

// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Entities;

namespace Nexus.Api.Data.Configurations;

/// <summary>
/// Entity configurations for federation entities:
/// FederationPartner, FederatedListing, FederatedExchange, FederationAuditLog,
/// FederationApiKey, FederationFeatureToggle, FederationUserSetting, FederationApiLog.
/// </summary>
public class FederationConfiguration : TenantScopedConfiguration
{
    public FederationConfiguration(TenantContext tenantContext) : base(tenantContext) { }

    public override void Configure(ModelBuilder modelBuilder)
    {
        // FederationPartner
        modelBuilder.Entity<FederationPartner>(entity =>
        {
            entity.ToTable("federation_partners");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.CreditExchangeRate).HasPrecision(10, 4);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.PartnerTenantId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.PartnerTenant).WithMany().HasForeignKey(e => e.PartnerTenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.RequestedBy).WithMany().HasForeignKey(e => e.RequestedById).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ApprovedBy).WithMany().HasForeignKey(e => e.ApprovedById).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // FederatedListing
        modelBuilder.Entity<FederatedListing>(entity =>
        {
            entity.ToTable("federated_listings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnType("text");
            entity.Property(e => e.ListingType).HasMaxLength(20);
            entity.Property(e => e.OwnerDisplayName).HasMaxLength(255);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.SourceTenantId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.SourceTenant).WithMany().HasForeignKey(e => e.SourceTenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // FederatedExchange
        modelBuilder.Entity<FederatedExchange>(entity =>
        {
            entity.ToTable("federated_exchanges");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RemoteUserDisplayName).HasMaxLength(255);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.AgreedHours).HasPrecision(10, 2);
            entity.Property(e => e.ActualHours).HasPrecision(10, 2);
            entity.Property(e => e.CreditExchangeRate).HasPrecision(10, 4);
            entity.Property(e => e.Notes).HasColumnType("text");
            entity.HasIndex(e => e.TenantId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.PartnerTenant).WithMany().HasForeignKey(e => e.PartnerTenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.LocalUser).WithMany().HasForeignKey(e => e.LocalUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.LocalTransaction).WithMany().HasForeignKey(e => e.LocalTransactionId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // FederationAuditLog
        modelBuilder.Entity<FederationAuditLog>(entity =>
        {
            entity.ToTable("federation_audit_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Action).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityType).HasMaxLength(50);
            entity.Property(e => e.Details).HasColumnType("text");
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // FederationApiKey
        modelBuilder.Entity<FederationApiKey>(entity =>
        {
            entity.ToTable("federation_api_keys");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.KeyHash).HasMaxLength(64).IsRequired();
            entity.Property(e => e.KeyPrefix).HasMaxLength(8).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Scopes).HasMaxLength(500);
            entity.HasIndex(e => e.KeyHash).IsUnique();
            entity.HasIndex(e => e.TenantId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // FederationFeatureToggle
        modelBuilder.Entity<FederationFeatureToggle>(entity =>
        {
            entity.ToTable("federation_feature_toggles");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Feature).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Configuration).HasColumnType("text");
            entity.HasIndex(e => new { e.TenantId, e.Feature }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // FederationUserSetting
        modelBuilder.Entity<FederationUserSetting>(entity =>
        {
            entity.ToTable("federation_user_settings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BlockedPartnerTenants).HasMaxLength(500);
            entity.HasIndex(e => new { e.TenantId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // FederationApiLog - NO tenant query filter (TenantId is nullable)
        modelBuilder.Entity<FederationApiLog>(entity =>
        {
            entity.ToTable("federation_api_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.HttpMethod).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Path).HasMaxLength(500).IsRequired();
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.Direction).HasMaxLength(10);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.TenantId);
            // No tenant query filter - FederationApiLog is not tenant-scoped (TenantId is nullable)
        });

        modelBuilder.Entity<FederationExternalPartner>(entity =>
        {
            entity.ToTable("federation_external_partners");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.BaseUrl).HasMaxLength(1000).IsRequired();
            entity.Property(e => e.ApiPath).HasMaxLength(255);
            entity.Property(e => e.ApiKey).HasColumnType("text");
            entity.Property(e => e.AuthMethod).HasMaxLength(30);
            entity.Property(e => e.ProtocolType).HasMaxLength(30);
            entity.Property(e => e.SigningSecret).HasColumnType("text");
            entity.Property(e => e.OAuthClientId).HasMaxLength(255);
            entity.Property(e => e.OAuthClientSecret).HasColumnType("text");
            entity.Property(e => e.OAuthTokenUrl).HasMaxLength(1000);
            entity.Property(e => e.Status).HasMaxLength(30);
            entity.Property(e => e.LastError).HasColumnType("text");
            entity.Property(e => e.PartnerMetadata).HasColumnType("jsonb");
            entity.HasIndex(e => new { e.TenantId, e.BaseUrl }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        modelBuilder.Entity<FederationExternalPartnerLog>(entity =>
        {
            entity.ToTable("federation_external_partner_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Endpoint).HasMaxLength(1000).IsRequired();
            entity.Property(e => e.Method).HasMaxLength(10);
            entity.Property(e => e.RequestBody).HasColumnType("text");
            entity.Property(e => e.ResponseBody).HasColumnType("text");
            entity.Property(e => e.ErrorMessage).HasColumnType("text");
            entity.HasIndex(e => e.PartnerId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasOne(e => e.Partner).WithMany().HasForeignKey(e => e.PartnerId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FederationWebhookNonce>(entity =>
        {
            entity.ToTable("federation_webhook_nonces");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PlatformId).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Nonce).HasMaxLength(255).IsRequired();
            entity.HasIndex(e => new { e.PlatformId, e.Nonce }).IsUnique();
            entity.HasIndex(e => e.ExpiresAt);
        });

        modelBuilder.Entity<FederationSystemControl>(entity =>
        {
            entity.ToTable("federation_system_control");
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<FederationTenantWhitelist>(entity =>
        {
            entity.ToTable("federation_tenant_whitelist");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Notes).HasColumnType("text");
            entity.HasIndex(e => e.TenantId).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        modelBuilder.Entity<FederationTenantFeature>(entity =>
        {
            entity.ToTable("federation_tenant_features");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Feature).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Configuration).HasColumnType("text");
            entity.HasIndex(e => new { e.TenantId, e.Feature }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        // FederationWebhookSubscription - typed registry replacing TenantConfig JSON blob.
        modelBuilder.Entity<FederationWebhookSubscription>(entity =>
        {
            entity.ToTable("federation_webhook_subscriptions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.TargetUrl).HasMaxLength(1000).IsRequired();
            entity.Property(e => e.EventTypes).HasMaxLength(1000);
            entity.Property(e => e.Direction).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Secret).HasMaxLength(500);
            entity.Property(e => e.LastFailureReason).HasMaxLength(2000);
            entity.HasIndex(e => new { e.TenantId, e.Direction, e.Status });
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });

        modelBuilder.Entity<FederationWebhookDeliveryLog>(entity =>
        {
            entity.ToTable("federation_webhook_delivery_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Reason).HasMaxLength(2000);
            entity.Property(e => e.Action).HasMaxLength(20);
            entity.Property(e => e.PayloadJson).HasColumnType("text");
            entity.HasIndex(e => new { e.TenantId, e.SubscriptionId, e.CreatedAt });
            entity.HasOne(e => e.Subscription).WithMany().HasForeignKey(e => e.SubscriptionId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !TenantContext.IsResolved || e.TenantId == TenantContext.TenantId);
        });
    }
}

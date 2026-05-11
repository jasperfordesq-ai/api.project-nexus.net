// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/*
 * Federation hardening — concurrency tests for CommitAndSettleAsync.
 *
 * Modelled on ExchangeConcurrencyTests. The production
 * HourTransferReconciliationService.CommitAndSettleAsync now wraps the
 * Transactions ledger write in a Serializable transaction with a
 * pg_advisory_xact_lock on the affected local user — matching the
 * exchange completion safety contract.
 *
 * Both tests drive the public ReconcileTenantAsync entrypoint with
 * transfers pre-seeded in the Acknowledged state, using Protocol="native"
 * so CommitAndSettleAsync takes no partner HTTP path before settlement.
 */

using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Services.Federation;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class FederationHourTransferConcurrencyTests : IntegrationTestBase
{
    public FederationHourTransferConcurrencyTests(NexusWebApplicationFactory factory) : base(factory) { }

    /// <summary>
    /// Seed a partner endpoint TenantConfig entry + an Acknowledged outbound
    /// federated hour transfer for the member user. Pre-credits the member
    /// with <paramref name="startingBalance"/> hours via a synthetic
    /// Transaction so the balance check inside CommitAndSettleAsync passes
    /// (or fails, when starting balance is short).
    /// </summary>
    private async Task<(int TransferId, int PartnerId)> SeedAcknowledgedTransferAsync(
        decimal amount,
        decimal startingBalance)
    {
        using var scope = Factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<TenantContext>().SetTenant(TestData.Tenant1.Id);
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

        var partner = await db.FederationPartners
            .IgnoreQueryFilters()
            .FirstAsync(p => p.TenantId == TestData.Tenant1.Id);

        // Endpoint config — CommitAndSettleAsync requires endpoint resolved,
        // even though Protocol="native" never actually calls it.
        var key = $"federation.partner.{partner.Id}.endpoint";
        if (!await db.TenantConfigs.IgnoreQueryFilters().AnyAsync(c => c.TenantId == TestData.Tenant1.Id && c.Key == key))
        {
            db.TenantConfigs.Add(new TenantConfig
            {
                TenantId = TestData.Tenant1.Id,
                Key = key,
                Value = "https://partner.test/federation",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        if (startingBalance > 0)
        {
            db.Transactions.Add(new Transaction
            {
                TenantId = TestData.Tenant1.Id,
                SenderId = TestData.AdminUser.Id,
                ReceiverId = TestData.MemberUser.Id,
                Amount = startingBalance,
                Description = "FederationConcurrencyTests seed credit",
                Status = TransactionStatus.Completed,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var transfer = new FederatedHourTransfer
        {
            TenantId = TestData.Tenant1.Id,
            PartnerId = partner.Id,
            Direction = FederatedTransferDirection.Outbound,
            LocalUserId = TestData.MemberUser.Id,
            RemoteUserExternalId = "remote-test-user",
            RemoteUserDisplayName = "Remote Partner User",
            Amount = amount,
            Protocol = "native",
            // Non-empty so CommitAndSettleAsync doesn't return early.
            ExternalReference = $"native://test/{Guid.NewGuid():N}",
            Status = FederatedTransferStatus.Acknowledged,
            Description = "concurrency-test transfer",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.FederatedHourTransfers.Add(transfer);
        await db.SaveChangesAsync();
        return (transfer.Id, partner.Id);
    }

    [Fact]
    public async Task ConcurrentCommitAndSettle_ExactlyOneTransactionWritten()
    {
        var (transferId, _) = await SeedAcknowledgedTransferAsync(amount: 2.0m, startingBalance: 10m);

        async Task ReconcileOnce()
        {
            using var scope = Factory.Services.CreateScope();
            scope.ServiceProvider.GetRequiredService<TenantContext>().SetTenant(TestData.Tenant1.Id);
            var svc = scope.ServiceProvider.GetRequiredService<HourTransferReconciliationService>();
            await svc.ReconcileTenantAsync(TestData.Tenant1.Id, batchSize: 50, ct: default);
        }

        // Two parallel ticks, mimicking cron tick + manual admin trigger.
        var t1 = Task.Run(ReconcileOnce);
        var t2 = Task.Run(ReconcileOnce);
        await Task.WhenAll(t1, t2);

        using var assertScope = Factory.Services.CreateScope();
        assertScope.ServiceProvider.GetRequiredService<TenantContext>().SetTenant(TestData.Tenant1.Id);
        var db = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();

        var refreshed = await db.FederatedHourTransfers
            .IgnoreQueryFilters()
            .FirstAsync(t => t.Id == transferId);

        refreshed.Status.Should().Be(FederatedTransferStatus.Reconciled,
            "the locked path must drive the transfer to terminal Reconciled exactly once");
        refreshed.LocalTransactionId.Should().NotBeNull();

        var txCount = await db.Transactions
            .IgnoreQueryFilters()
            .CountAsync(x => x.Description != null
                && x.Description.Contains($"transfer #{transferId}:"));
        txCount.Should().Be(1,
            "exactly one credit transaction must be written — no double-spend under contention");
    }

    [Fact]
    public async Task InsufficientBalance_OutboundTransfer_NoTransactionCreated()
    {
        // Member balance: 1 hour. Transfer demands 100. Settlement must abort
        // inside the locked section without writing a Transaction row.
        var (transferId, _) = await SeedAcknowledgedTransferAsync(amount: 100m, startingBalance: 1m);

        using var scope = Factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<TenantContext>().SetTenant(TestData.Tenant1.Id);
        var svc = scope.ServiceProvider.GetRequiredService<HourTransferReconciliationService>();
        await svc.ReconcileTenantAsync(TestData.Tenant1.Id, batchSize: 50, ct: default);

        using var assertScope = Factory.Services.CreateScope();
        assertScope.ServiceProvider.GetRequiredService<TenantContext>().SetTenant(TestData.Tenant1.Id);
        var db = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();

        var refreshed = await db.FederatedHourTransfers
            .IgnoreQueryFilters()
            .FirstAsync(t => t.Id == transferId);

        refreshed.Status.Should().NotBe(FederatedTransferStatus.Reconciled,
            "an under-funded outbound transfer must not be marked settled");
        refreshed.LocalTransactionId.Should().BeNull();
        refreshed.FailureReason.Should().NotBeNull().And.Contain("insufficient_balance");

        var txCount = await db.Transactions
            .IgnoreQueryFilters()
            .CountAsync(x => x.Description != null
                && x.Description.Contains($"transfer #{transferId}:"));
        txCount.Should().Be(0, "no ledger row should exist for an aborted settlement");
    }
}

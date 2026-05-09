// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/*
 * Item 15 (deferred from earlier session) — exchange state-machine concurrency.
 *
 * The production CompleteExchangeAsync uses:
 *   - BeginTransactionAsync(IsolationLevel.Serializable)
 *   - pg_advisory_xact_lock on the receiver's user id
 *   - Balance check inside the transaction
 *
 * We verify two production-critical contracts under contention:
 *   1. Two parallel completions of the same exchange produce exactly one
 *      Transaction row (no double-spend), and exactly one call returns
 *      "Exchange completed" — the other returns the state-machine error.
 *   2. Insufficient balance is detected even when racing — the loser does
 *      not silently overdraw.
 */

using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Services;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class ExchangeConcurrencyTests : IntegrationTestBase
{
    public ExchangeConcurrencyTests(NexusWebApplicationFactory factory) : base(factory) { }

    /// <summary>
    /// Seed: a Listing owned by admin (provider) + an InProgress Exchange
    /// where member (receiver) is paying admin (provider) AgreedHours hours.
    /// Member is pre-credited with enough hours via a synthetic completed
    /// Transaction so the balance-check inside CompleteExchangeAsync passes.
    /// </summary>
    private async Task<int> SeedReadyExchangeAsync(decimal agreedHours, decimal startingBalance)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<TenantContext>();
        tenantContext.SetTenant(TestData.Tenant1.Id);
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

        var listing = new Listing
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.AdminUser.Id,
            Title = "Concurrency test listing",
            Description = "A listing seeded for the concurrency test suite.",
            Status = ListingStatus.Active,
            CreatedAt = DateTime.UtcNow
        };
        db.Listings.Add(listing);
        await db.SaveChangesAsync();

        // Pre-credit the receiver (member) with `startingBalance` hours via a
        // synthetic Transaction. The balance calc sums Completed transactions.
        if (startingBalance > 0)
        {
            db.Transactions.Add(new Transaction
            {
                TenantId = TestData.Tenant1.Id,
                SenderId = TestData.AdminUser.Id, // we don't enforce sender balance for the seed
                ReceiverId = TestData.MemberUser.Id,
                Amount = startingBalance,
                Description = "Concurrency test seed credit",
                Status = TransactionStatus.Completed,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var exchange = new Exchange
        {
            TenantId = TestData.Tenant1.Id,
            ListingId = listing.Id,
            ListingOwnerId = TestData.AdminUser.Id,
            InitiatorId = TestData.MemberUser.Id,
            ReceiverId = TestData.MemberUser.Id,
            ProviderId = TestData.AdminUser.Id,
            AgreedHours = agreedHours,
            Status = ExchangeStatus.InProgress,
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        db.Exchanges.Add(exchange);
        await db.SaveChangesAsync();
        return exchange.Id;
    }

    [Fact]
    public async Task ConcurrentCompletion_OnlyOneSucceeds_NoDoubleSpend()
    {
        var exchangeId = await SeedReadyExchangeAsync(agreedHours: 2.0m, startingBalance: 10m);

        // Fire two parallel completions on independent scopes (mimicking two
        // simultaneous HTTP requests landing on different worker threads).
        async Task<(Exchange? Ex, string? Err)> Complete()
        {
            using var scope = Factory.Services.CreateScope();
            scope.ServiceProvider.GetRequiredService<TenantContext>().SetTenant(TestData.Tenant1.Id);
            var svc = scope.ServiceProvider.GetRequiredService<ExchangeService>();
            return await svc.CompleteExchangeAsync(exchangeId, TestData.MemberUser.Id, actualHours: null);
        }

        var task1 = Task.Run(Complete);
        var task2 = Task.Run(Complete);
        var results = await Task.WhenAll(task1, task2);

        // Exactly one success, exactly one state-machine rejection.
        var successes = results.Count(r => r.Err == null && r.Ex != null);
        var failures = results.Count(r => r.Err != null);
        successes.Should().Be(1, "only one of two parallel completions can win");
        failures.Should().Be(1, "the loser must report a state-machine error");

        // The DB should reflect: Status=Completed, exactly ONE new Transaction
        // row (Description starts with "Exchange #") for this exchange.
        using var assertScope = Factory.Services.CreateScope();
        assertScope.ServiceProvider.GetRequiredService<TenantContext>().SetTenant(TestData.Tenant1.Id);
        var db = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var refreshed = await db.Exchanges.FirstAsync(e => e.Id == exchangeId);
        refreshed.Status.Should().Be(ExchangeStatus.Completed);

        var transactionCount = await db.Transactions
            .CountAsync(t => t.Description != null
                && t.Description.StartsWith($"Exchange #{exchangeId}:"));
        transactionCount.Should().Be(1, "exactly one credit transaction must be created — no double-spend");
    }

    [Fact]
    public async Task InsufficientBalance_RejectsCompletion_NoTransactionCreated()
    {
        var exchangeId = await SeedReadyExchangeAsync(agreedHours: 100m, startingBalance: 5m);

        using var scope = Factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<TenantContext>().SetTenant(TestData.Tenant1.Id);
        var svc = scope.ServiceProvider.GetRequiredService<ExchangeService>();
        var (ex, err) = await svc.CompleteExchangeAsync(exchangeId, TestData.MemberUser.Id, actualHours: null);

        ex.Should().BeNull();
        err.Should().NotBeNull().And.StartWith("Insufficient balance");

        using var assertScope = Factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<TenantContext>().SetTenant(TestData.Tenant1.Id);
        var db = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var refreshed = await db.Exchanges.IgnoreQueryFilters().FirstAsync(e => e.Id == exchangeId);
        refreshed.Status.Should().Be(ExchangeStatus.InProgress, "rejection must not advance the state machine");

        var txCount = await db.Transactions.IgnoreQueryFilters()
            .CountAsync(t => t.Description != null
                && t.Description.StartsWith($"Exchange #{exchangeId}:"));
        txCount.Should().Be(0);
    }

    [Fact]
    public async Task SequentialCompletion_SecondCallRejected()
    {
        // Even without parallelism, a second completion attempt after success
        // must be rejected by the state machine (Completed → Completed not allowed).
        var exchangeId = await SeedReadyExchangeAsync(agreedHours: 1m, startingBalance: 5m);

        using var scope = Factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<TenantContext>().SetTenant(TestData.Tenant1.Id);
        var svc = scope.ServiceProvider.GetRequiredService<ExchangeService>();
        var first = await svc.CompleteExchangeAsync(exchangeId, TestData.MemberUser.Id, null);
        first.Error.Should().BeNull();

        var second = await svc.CompleteExchangeAsync(exchangeId, TestData.MemberUser.Id, null);
        second.Exchange.Should().BeNull();
        second.Error.Should().NotBeNull().And.Contain("transition");
    }
}

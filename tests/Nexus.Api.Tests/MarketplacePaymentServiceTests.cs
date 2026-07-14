// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Text;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Services;
using Xunit;

namespace Nexus.Api.Tests;

public sealed class MarketplacePaymentServiceTests
{
    [Fact]
    public async Task CreateAndConfirm_UsesProviderBoundEconomicsAndPersistsExactlyOnce()
    {
        await using var db = CreateDb();
        var gateway = new FakeGateway { Configured = true };
        var service = CreateService(db, gateway);
        var order = SeedPayableOrder(db);

        var created = await service.CreateIntentAsync(42, 11, order.Id, CancellationToken.None);

        created.Succeeded.Should().BeTrue();
        gateway.CreateCalls.Should().Be(1);
        gateway.AmountMinor.Should().Be(2599);
        gateway.PlatformFeeMinor.Should().Be(130);
        gateway.ConnectedAccountId.Should().Be("acct_real_seller");
        gateway.IdempotencyKey.Should().Be($"market-order-42-{order.Id}");
        gateway.Metadata.Should().Contain(new KeyValuePair<string, string>("nexus_seller_payout_minor", "2469"));
        order.PaymentIntentId.Should().Be("pi_marketplace_1");
        order.Status.Should().Be("pending_payment");

        gateway.Retrieved = gateway.Created! with { Status = "succeeded", AmountReceivedMinor = 2599, LatestChargeId = "ch_1" };
        var confirmed = await service.ConfirmAsync(42, 11, "pi_marketplace_1", CancellationToken.None);
        var replay = await service.ConfirmAsync(42, 11, "pi_marketplace_1", CancellationToken.None);

        confirmed.Succeeded.Should().BeTrue();
        replay.Succeeded.Should().BeTrue();
        gateway.RetrieveCalls.Should().Be(2, "replays must revalidate the provider before returning local evidence");
        order.Status.Should().Be("paid");
        var payment = await db.MarketplacePayments.SingleAsync();
        payment.Amount.Should().Be(25.99m);
        payment.PlatformFee.Should().Be(1.30m);
        payment.SellerPayout.Should().Be(24.69m);
        payment.Status.Should().Be("succeeded");
        payment.PayoutStatus.Should().Be("paid");
        payment.StripeChargeId.Should().Be("ch_1");
    }

    [Fact]
    public async Task MissingProviderAndMismatchedEconomics_FailClosedWithoutLocalPaymentEvidence()
    {
        await using var db = CreateDb();
        var order = SeedPayableOrder(db);
        var disabled = CreateService(db, new FakeGateway());

        var disabledResult = await disabled.CreateIntentAsync(42, 11, order.Id, CancellationToken.None);
        disabledResult.Error!.Code.Should().Be("FEATURE_DISABLED");
        order.PaymentIntentId.Should().BeNull();

        var gateway = new FakeGateway { Configured = true, CorruptCreateMetadata = true };
        var service = CreateService(db, gateway);
        var mismatch = await service.CreateIntentAsync(42, 11, order.Id, CancellationToken.None);

        mismatch.Error!.Code.Should().Be("PAYMENT_ERROR");
        order.PaymentIntentId.Should().BeNull();
        order.Status.Should().Be("pending_payment");
        (await db.MarketplacePayments.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task StripeGateway_SendsConnectDestinationChargeAndStableIdempotencyKey()
    {
        var handler = new RecordingHandler();
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Stripe:SecretKey"] = "sk_test_redacted",
            ["Stripe:ApiBaseUrl"] = "https://stripe.test"
        }).Build();
        var gateway = new MarketplaceStripeGateway(new SingleClientFactory(new HttpClient(handler)), configuration,
            NullLogger<MarketplaceStripeGateway>.Instance);
        var metadata = new Dictionary<string, string> { ["nexus_order_id"] = "77", ["nexus_tenant_id"] = "42" };

        var result = await gateway.CreateIntentAsync(2599, "EUR", "acct_123", 130, metadata, "market-order-42-77", CancellationToken.None);

        result.Id.Should().Be("pi_provider_77");
        handler.Method.Should().Be(HttpMethod.Post);
        handler.Uri.Should().Be("https://stripe.test/v1/payment_intents");
        handler.Authorization.Should().Be("Bearer sk_test_redacted");
        handler.IdempotencyKey.Should().Be("market-order-42-77");
        handler.Body.Should().Contain("amount=2599");
        handler.Body.Should().Contain("application_fee_amount=130");
        handler.Body.Should().Contain("transfer_data%5Bdestination%5D=acct_123");
        handler.Body.Should().Contain("metadata%5Bnexus_order_id%5D=77");
    }

    [Fact]
    public async Task Confirm_RejectsTamperedIdentityCurrencyAndDestinationEconomics()
    {
        await using var db = CreateDb();
        var gateway = new FakeGateway { Configured = true };
        var service = CreateService(db, gateway);
        var order = SeedPayableOrder(db);
        (await service.CreateIntentAsync(42, 11, order.Id, CancellationToken.None)).Succeeded.Should().BeTrue();
        var created = gateway.Created!;

        gateway.Retrieved = created with
        {
            Status = "succeeded",
            AmountReceivedMinor = 2599,
            Metadata = created.Metadata.ToDictionary(x => x.Key, x => x.Key == "nexus_buyer_id" ? "999" : x.Value)
        };
        (await service.ConfirmAsync(42, 11, created.Id, CancellationToken.None)).Error!.Code.Should().Be("PAYMENT_ERROR");

        gateway.Retrieved = created with { Status = "succeeded", AmountReceivedMinor = 2599, Currency = "USD" };
        (await service.ConfirmAsync(42, 11, created.Id, CancellationToken.None)).Error!.Code.Should().Be("PAYMENT_ERROR");

        gateway.Retrieved = created with { Status = "succeeded", AmountReceivedMinor = 2599, DestinationAccountId = "acct_other" };
        (await service.ConfirmAsync(42, 11, created.Id, CancellationToken.None)).Error!.Code.Should().Be("PAYMENT_ERROR");
        (await db.MarketplacePayments.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task SellerPayoutsAndBalance_AreTenantSellerScopedAndCurrencyAware()
    {
        await using var db = CreateDb();
        var gateway = new FakeGateway { Configured = true };
        var service = CreateService(db, gateway);
        var order = SeedPayableOrder(db);
        (await service.CreateIntentAsync(42, 11, order.Id, CancellationToken.None)).Succeeded.Should().BeTrue();
        gateway.Retrieved = gateway.Created! with { Status = "succeeded", AmountReceivedMinor = 2599, LatestChargeId = "ch_1" };
        (await service.ConfirmAsync(42, 11, gateway.Created!.Id, CancellationToken.None)).Succeeded.Should().BeTrue();

        var payouts = await service.SellerPayoutsAsync(42, 22, 1, 20, CancellationToken.None);
        var balance = await service.SellerBalanceAsync(42, 22, CancellationToken.None);
        var otherSeller = await service.SellerPayoutsAsync(42, 999, 1, 20, CancellationToken.None);

        payouts.Total.Should().Be(1);
        payouts.Items.Single().SellerPayout.Should().Be(24.69m);
        balance.Currency.Should().Be("EUR");
        balance.Pending.Should().Be(0m);
        balance.Available.Should().Be(24.69m);
        balance.TotalEarned.Should().Be(24.69m);
        balance.BalancesByCurrency.Should().ContainSingle();
        otherSeller.Total.Should().Be(0);
    }

    [Fact]
    public async Task CreateIntent_UsesZeroDecimalCurrencyAndRejectsUnsupportedCurrency()
    {
        await using var db = CreateDb();
        var gateway = new FakeGateway { Configured = true };
        var service = CreateService(db, gateway);
        var order = SeedPayableOrder(db);
        order.Currency = "JPY";
        order.TotalAmount = 2500m;
        await db.SaveChangesAsync();

        (await service.CreateIntentAsync(42, 11, order.Id, CancellationToken.None)).Succeeded.Should().BeTrue();
        gateway.AmountMinor.Should().Be(2500);
        gateway.PlatformFeeMinor.Should().Be(125);

        order.PaymentIntentId = null;
        order.Currency = "ZZZ";
        await db.SaveChangesAsync();
        (await service.CreateIntentAsync(42, 11, order.Id, CancellationToken.None)).Error!.Code.Should().Be("VALIDATION_ERROR");
    }

    [Fact]
    public async Task CreateIntent_AllowsConfiguredZeroPercentPlatformFee()
    {
        await using var db = CreateDb();
        var gateway = new FakeGateway { Configured = true };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Marketplace:PlatformFeePercent"] = "0",
            ["Marketplace:EscrowEnabled"] = "false"
        }).Build();
        var service = new MarketplacePaymentService(
            db, gateway, configuration, NullLogger<MarketplacePaymentService>.Instance);
        var order = SeedPayableOrder(db);

        (await service.CreateIntentAsync(42, 11, order.Id, CancellationToken.None)).Succeeded.Should().BeTrue();
        gateway.PlatformFeeMinor.Should().Be(0);
        gateway.Metadata.Should().Contain(new KeyValuePair<string, string>("nexus_seller_payout_minor", "2599"));
    }

    [Theory]
    [InlineData(true, null)]
    [InlineData(false, "checkout_session")]
    public async Task CreateIntent_RejectsExpiredOrDifferentlyClaimedCheckout(bool expired, string? checkoutMode)
    {
        await using var db = CreateDb();
        var gateway = new FakeGateway { Configured = true };
        var service = CreateService(db, gateway);
        var order = SeedPayableOrder(db);
        order.PaymentExpiresAt = expired ? DateTime.UtcNow.AddMinutes(-1) : DateTime.UtcNow.AddMinutes(10);
        order.StripeCheckoutMode = checkoutMode;
        await db.SaveChangesAsync();

        var result = await service.CreateIntentAsync(42, 11, order.Id, CancellationToken.None);

        result.Error!.Code.Should().Be("VALIDATION_ERROR");
        gateway.CreateCalls.Should().Be(0);
        order.PaymentIntentId.Should().BeNull();
    }

    private static NexusDbContext CreateDb()
    {
        var tenant = new TenantContext();
        tenant.SetTenant(42);
        var options = new DbContextOptionsBuilder<NexusDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;
        return new NexusDbContext(options, tenant);
    }

    private static MarketplaceOrder SeedPayableOrder(NexusDbContext db)
    {
        var seller = new MarketplaceSellerProfile
        {
            TenantId = 42,
            UserId = 22,
            DisplayName = "Provider Seller",
            StripeAccountId = "acct_real_seller",
            StripeOnboardingComplete = true
        };
        var order = new MarketplaceOrder
        {
            TenantId = 42,
            MarketplaceListingId = 100,
            BuyerUserId = 11,
            SellerUserId = 22,
            TotalAmount = 25.99m,
            TimeCreditTotal = 0,
            Currency = "EUR",
            Status = "pending_payment"
        };
        db.MarketplaceSellerProfiles.Add(seller);
        db.MarketplaceOrders.Add(order);
        db.SaveChanges();
        return order;
    }

    private static IConfiguration Configuration() => new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["Marketplace:PlatformFeePercent"] = "5",
        ["Marketplace:EscrowEnabled"] = "false"
    }).Build();

    private static MarketplacePaymentService CreateService(NexusDbContext db, IMarketplaceStripeGateway gateway) =>
        new(db, gateway, Configuration(), NullLogger<MarketplacePaymentService>.Instance);

    private sealed class FakeGateway : IMarketplaceStripeGateway
    {
        public bool Configured { get; init; }
        public bool CorruptCreateMetadata { get; init; }
        public bool IsConfigured => Configured;
        public int CreateCalls { get; private set; }
        public int RetrieveCalls { get; private set; }
        public long AmountMinor { get; private set; }
        public long PlatformFeeMinor { get; private set; }
        public string? ConnectedAccountId { get; private set; }
        public string? IdempotencyKey { get; private set; }
        public IReadOnlyDictionary<string, string> Metadata { get; private set; } = new Dictionary<string, string>();
        public MarketplaceStripeIntent? Created { get; private set; }
        public MarketplaceStripeIntent? Retrieved { get; set; }

        public Task<MarketplaceStripeIntent> CreateIntentAsync(long amountMinor, string currency, string connectedAccountId,
            long platformFeeMinor, IReadOnlyDictionary<string, string> metadata, string idempotencyKey, CancellationToken ct)
        {
            CreateCalls++;
            AmountMinor = amountMinor;
            PlatformFeeMinor = platformFeeMinor;
            ConnectedAccountId = connectedAccountId;
            IdempotencyKey = idempotencyKey;
            Metadata = new Dictionary<string, string>(metadata);
            if (CorruptCreateMetadata) Metadata = Metadata.Where(x => x.Key != "nexus_order_id").ToDictionary();
            Created = new("pi_marketplace_1", "pi_marketplace_1_secret", "requires_payment_method", amountMinor, 0,
                currency, null, "card", Metadata, platformFeeMinor, connectedAccountId);
            return Task.FromResult(Created);
        }

        public Task<MarketplaceStripeIntent> RetrieveIntentAsync(string paymentIntentId, CancellationToken ct)
        {
            RetrieveCalls++;
            return Task.FromResult(Retrieved ?? throw new InvalidOperationException("No provider result configured."));
        }

        public Task CancelIntentAsync(string paymentIntentId, string idempotencyKey, CancellationToken ct) => Task.CompletedTask;
    }

    private sealed class SingleClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public HttpMethod? Method { get; private set; }
        public string? Uri { get; private set; }
        public string? Authorization { get; private set; }
        public string? IdempotencyKey { get; private set; }
        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Method = request.Method;
            Uri = request.RequestUri?.ToString();
            Authorization = request.Headers.Authorization?.ToString();
            IdempotencyKey = request.Headers.TryGetValues("Idempotency-Key", out var values) ? values.Single() : null;
            Body = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            const string json = """
                {
                  "id":"pi_provider_77",
                  "client_secret":"pi_provider_77_secret",
                  "status":"requires_payment_method",
                  "amount":2599,
                  "amount_received":0,
                  "currency":"eur",
                  "application_fee_amount":130,
                  "transfer_data":{"destination":"acct_123"},
                  "latest_charge":null,
                  "payment_method_types":["card"],
                  "metadata":{"nexus_order_id":"77","nexus_tenant_id":"42"}
                }
                """;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
        }
    }
}

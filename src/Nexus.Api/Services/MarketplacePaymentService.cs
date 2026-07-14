// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

public sealed record MarketplacePaymentError(string Code, string Message, int Status, string? Field = null);
public sealed record MarketplacePaymentResult(object? Data, MarketplacePaymentError? Error = null, int Status = 200)
{
    public bool Succeeded => Error is null;
}

public sealed record MarketplaceSellerPayout(
    long Id,
    int OrderId,
    decimal Amount,
    decimal PlatformFee,
    decimal SellerPayout,
    string Currency,
    string Status,
    string PayoutStatus,
    string? PayoutId,
    string? PaidOutAt,
    string? CreatedAt);

public sealed record MarketplaceSellerPayoutPage(
    IReadOnlyList<MarketplaceSellerPayout> Items,
    int Total,
    int Page,
    int Limit)
{
    public int TotalPages => Total > 0 ? (int)Math.Ceiling((double)Total / Limit) : 0;
}

public sealed record MarketplaceCurrencyBalance(
    string Currency,
    decimal Pending,
    decimal Available,
    decimal TotalEarned);

public sealed record MarketplaceSellerBalance(
    decimal? Pending,
    decimal? Available,
    string? Currency,
    decimal? TotalEarned,
    IReadOnlyList<MarketplaceCurrencyBalance> BalancesByCurrency);

public sealed record MarketplaceStripeIntent(
    string Id,
    string? ClientSecret,
    string Status,
    long AmountMinor,
    long AmountReceivedMinor,
    string Currency,
    string? LatestChargeId,
    string PaymentMethod,
    IReadOnlyDictionary<string, string> Metadata,
    long? ApplicationFeeMinor = null,
    string? DestinationAccountId = null);

public interface IMarketplaceStripeGateway
{
    bool IsConfigured { get; }
    Task<MarketplaceStripeIntent> CreateIntentAsync(
        long amountMinor,
        string currency,
        string connectedAccountId,
        long platformFeeMinor,
        IReadOnlyDictionary<string, string> metadata,
        string idempotencyKey,
        CancellationToken ct);
    Task<MarketplaceStripeIntent> RetrieveIntentAsync(string paymentIntentId, CancellationToken ct);
    Task CancelIntentAsync(string paymentIntentId, string idempotencyKey, CancellationToken ct);
}

public sealed class MarketplaceStripeGateway(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<MarketplaceStripeGateway> logger) : IMarketplaceStripeGateway
{
    private const string DefaultApiBase = "https://api.stripe.com";
    private string? SecretKey => configuration["Stripe:SecretKey"];
    public bool IsConfigured => !string.IsNullOrWhiteSpace(SecretKey);

    public Task<MarketplaceStripeIntent> CreateIntentAsync(
        long amountMinor,
        string currency,
        string connectedAccountId,
        long platformFeeMinor,
        IReadOnlyDictionary<string, string> metadata,
        string idempotencyKey,
        CancellationToken ct)
    {
        var values = new List<KeyValuePair<string, string>>
        {
            new("amount", amountMinor.ToString(CultureInfo.InvariantCulture)),
            new("currency", currency.ToLowerInvariant()),
            new("application_fee_amount", platformFeeMinor.ToString(CultureInfo.InvariantCulture)),
            new("transfer_data[destination]", connectedAccountId),
            new("description", $"NEXUS marketplace order {metadata["nexus_order_id"]}")
        };
        values.AddRange(metadata.Select(pair => new KeyValuePair<string, string>($"metadata[{pair.Key}]", pair.Value)));
        return SendAsync(HttpMethod.Post, "/v1/payment_intents", values, idempotencyKey, ct);
    }

    public Task<MarketplaceStripeIntent> RetrieveIntentAsync(string paymentIntentId, CancellationToken ct) =>
        SendAsync(HttpMethod.Get, $"/v1/payment_intents/{Uri.EscapeDataString(paymentIntentId)}", null, null, ct);

    public async Task CancelIntentAsync(string paymentIntentId, string idempotencyKey, CancellationToken ct) =>
        _ = await SendAsync(HttpMethod.Post, $"/v1/payment_intents/{Uri.EscapeDataString(paymentIntentId)}/cancel",
            Array.Empty<KeyValuePair<string, string>>(), idempotencyKey, ct);

    private async Task<MarketplaceStripeIntent> SendAsync(
        HttpMethod method,
        string path,
        IReadOnlyCollection<KeyValuePair<string, string>>? form,
        string? idempotencyKey,
        CancellationToken ct)
    {
        if (!IsConfigured) throw new InvalidOperationException("Stripe is not configured.");
        var client = httpClientFactory.CreateClient("NexusStripe");
        var apiBase = configuration["Stripe:ApiBaseUrl"]?.TrimEnd('/') ?? DefaultApiBase;
        using var request = new HttpRequestMessage(method, apiBase + path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", SecretKey);
        if (!string.IsNullOrWhiteSpace(idempotencyKey)) request.Headers.TryAddWithoutValidation("Idempotency-Key", idempotencyKey);
        if (form is not null) request.Content = new FormUrlEncodedContent(form);
        using var response = await client.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Stripe marketplace request failed with HTTP {StatusCode}.", (int)response.StatusCode);
            throw new InvalidOperationException("Stripe rejected the marketplace payment request.");
        }

        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;
        var id = Text(root, "id");
        var status = Text(root, "status");
        var currency = Text(root, "currency");
        if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(status) || string.IsNullOrWhiteSpace(currency))
            throw new InvalidOperationException("Stripe returned an incomplete PaymentIntent.");
        var metadata = new Dictionary<string, string>(StringComparer.Ordinal);
        if (root.TryGetProperty("metadata", out var metadataElement) && metadataElement.ValueKind == JsonValueKind.Object)
            foreach (var property in metadataElement.EnumerateObject()) metadata[property.Name] = property.Value.ToString();
        var latestCharge = root.TryGetProperty("latest_charge", out var charge) && charge.ValueKind == JsonValueKind.String
            ? charge.GetString()
            : null;
        var paymentMethod = "card";
        if (root.TryGetProperty("payment_method_types", out var methods) && methods.ValueKind == JsonValueKind.Array && methods.GetArrayLength() > 0)
            paymentMethod = methods[0].GetString() ?? "card";
        long? applicationFee = root.TryGetProperty("application_fee_amount", out var applicationFeeElement) &&
                               applicationFeeElement.TryGetInt64(out var parsedApplicationFee)
            ? parsedApplicationFee
            : null;
        string? destination = null;
        if (root.TryGetProperty("transfer_data", out var transferData) && transferData.ValueKind == JsonValueKind.Object &&
            transferData.TryGetProperty("destination", out var destinationElement) && destinationElement.ValueKind == JsonValueKind.String)
            destination = destinationElement.GetString();
        return new(
            id!,
            Text(root, "client_secret"),
            status!,
            Integer(root, "amount"),
            Integer(root, "amount_received"),
            currency!.ToUpperInvariant(),
            latestCharge,
            paymentMethod,
            metadata,
            applicationFee,
            destination);
    }

    private static string? Text(JsonElement root, string name) =>
        root.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    private static long Integer(JsonElement root, string name) =>
        root.TryGetProperty(name, out var value) && value.TryGetInt64(out var parsed) ? parsed : 0;
}

public sealed class MarketplacePaymentService(
    NexusDbContext db,
    IMarketplaceStripeGateway stripe,
    IConfiguration configuration,
    ILogger<MarketplacePaymentService> logger)
{
    private static readonly HashSet<string> SupportedCurrencies = new(StringComparer.Ordinal)
    {
        "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
        "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL",
        "BSD", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY", "COP",
        "CRC", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ETB", "EUR",
        "FJD", "FKP", "GBP", "GEL", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD",
        "HNL", "HTG", "HUF", "IDR", "ILS", "INR", "ISK", "JMD", "JOD", "JPY",
        "KES", "KGS", "KHR", "KMF", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP",
        "LKR", "LRD", "LSL", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP",
        "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK",
        "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG",
        "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SEK", "SGD",
        "SHP", "SLE", "SOS", "SRD", "STD", "SZL", "THB", "TJS", "TND", "TOP",
        "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD", "UYU", "UZS", "VND",
        "VUV", "WST", "XAF", "XCD", "XCG", "XOF", "XPF", "YER", "ZAR", "ZMW"
    };

    private static readonly HashSet<string> ZeroDecimalCurrencies = new(StringComparer.Ordinal)
    {
        "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG",
        "RWF", "VND", "VUV", "XAF", "XOF", "XPF"
    };

    public async Task<MarketplacePaymentResult> CreateIntentAsync(int tenantId, int buyerId, int orderId, CancellationToken ct)
    {
        if (!stripe.IsConfigured) return Error("FEATURE_DISABLED", "Stripe marketplace payments are disabled.", 403);
        var order = await db.MarketplaceOrders.IgnoreQueryFilters()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == orderId, ct);
        if (order is null) return Error("NOT_FOUND", "Marketplace order not found.", 404, "order_id");
        if (order.BuyerUserId != buyerId) return Error("FORBIDDEN", "Only the buyer can initiate payment.", 403);
        if (order.Status != "pending_payment") return Error("VALIDATION_ERROR", "Order is not awaiting payment.", 422, "order_id");
        if (order.PaymentExpiresAt is not null && order.PaymentExpiresAt <= DateTime.UtcNow)
            return Error("VALIDATION_ERROR", "Marketplace checkout has expired.", 422, "order_id");
        if (!string.IsNullOrWhiteSpace(order.StripeCheckoutMode) && order.StripeCheckoutMode != "payment_intent")
            return Error("VALIDATION_ERROR", "Order is already bound to a different Stripe checkout mode.", 422, "order_id");
        if ((order.TotalAmount ?? 0) <= 0 || (order.TimeCreditTotal ?? 0) > 0)
            return Error("VALIDATION_ERROR", "Card payment is not required for this order.", 422, "order_id");
        if (configuration.GetValue("Marketplace:EscrowEnabled", false))
            return Error("PAYMENT_ERROR", "Stripe escrow settlement is not yet available.", 409);

        var seller = await db.MarketplaceSellerProfiles.IgnoreQueryFilters()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.UserId == order.SellerUserId, ct);
        if (seller is null || string.IsNullOrWhiteSpace(seller.StripeAccountId))
            return Error("PAYMENT_ERROR", "Seller Stripe onboarding is required.", 400);
        if (!seller.StripeOnboardingComplete)
            return Error("PAYMENT_ERROR", "Seller Stripe onboarding is incomplete.", 400);

        var currency = NormalizeCurrency(order.Currency);
        if (currency is null) return Error("VALIDATION_ERROR", "Unsupported payment currency.", 422, "currency");
        if (!TryToMinor(order.TotalAmount!.Value, currency, out var amountMinor))
            return Error("VALIDATION_ERROR", "Payment amount has invalid currency precision.", 422, "order_id");
        var feePercent = Math.Clamp(configuration.GetValue("Marketplace:PlatformFeePercent", 5m), 0m, 100m);
        var normalizedAmount = FromMinor(amountMinor, currency);
        var feeMajor = RoundMajor(normalizedAmount * feePercent / 100m, currency);
        if (!TryToMinor(feeMajor, currency, out var feeMinor, allowZero: true))
            return Error("VALIDATION_ERROR", "Platform fee has invalid currency precision.", 422, "order_id");
        var metadata = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["nexus_tenant_id"] = tenantId.ToString(CultureInfo.InvariantCulture),
            ["nexus_order_id"] = order.Id.ToString(CultureInfo.InvariantCulture),
            ["nexus_buyer_id"] = order.BuyerUserId.ToString(CultureInfo.InvariantCulture),
            ["nexus_seller_id"] = order.SellerUserId.ToString(CultureInfo.InvariantCulture),
            ["nexus_type"] = "marketplace",
            ["nexus_funds_flow"] = "destination_charge",
            ["nexus_currency"] = currency,
            ["nexus_amount_minor"] = amountMinor.ToString(CultureInfo.InvariantCulture),
            ["nexus_platform_fee_minor"] = feeMinor.ToString(CultureInfo.InvariantCulture),
            ["nexus_seller_payout_minor"] = (amountMinor - feeMinor).ToString(CultureInfo.InvariantCulture)
        };

        await using (var claimTransaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, ct)
            : null)
        {
            if (claimTransaction is not null)
            {
                await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({tenantId}, {order.Id})", ct);
                await db.Entry(order).ReloadAsync(ct);
            }
            if (order.Status != "pending_payment" ||
                (order.PaymentExpiresAt is not null && order.PaymentExpiresAt <= DateTime.UtcNow) ||
                (!string.IsNullOrWhiteSpace(order.StripeCheckoutMode) && order.StripeCheckoutMode != "payment_intent"))
                return Error("VALIDATION_ERROR", "Order is no longer available for card payment.", 422, "order_id");
            order.StripeCheckoutMode = "payment_intent";
            order.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            if (claimTransaction is not null) await claimTransaction.CommitAsync(ct);
        }

        if (!string.IsNullOrWhiteSpace(order.PaymentIntentId))
        {
            try
            {
                var existingIntent = await stripe.RetrieveIntentAsync(order.PaymentIntentId, ct);
                if (!string.Equals(existingIntent.Id, order.PaymentIntentId, StringComparison.Ordinal) ||
                    string.IsNullOrWhiteSpace(existingIntent.ClientSecret) || existingIntent.AmountMinor != amountMinor ||
                    !string.Equals(existingIntent.Currency, currency, StringComparison.Ordinal) ||
                    !SameEconomics(existingIntent, metadata) || existingIntent.ApplicationFeeMinor != feeMinor ||
                    !string.Equals(existingIntent.DestinationAccountId, seller.StripeAccountId, StringComparison.Ordinal))
                    return Error("PAYMENT_ERROR", "Stripe PaymentIntent economics do not match the order.", 400);
                return new(new { client_secret = existingIntent.ClientSecret, payment_intent_id = existingIntent.Id });
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Stripe marketplace PaymentIntent resume failed for tenant {TenantId}, order {OrderId}.", tenantId, order.Id);
                return Error("PAYMENT_ERROR", "Unable to resume marketplace payment.", 400);
            }
        }

        MarketplaceStripeIntent intent;
        try
        {
            intent = await stripe.CreateIntentAsync(amountMinor, currency, seller.StripeAccountId!, feeMinor, metadata,
                $"market-order-{tenantId}-{order.Id}", ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Stripe marketplace PaymentIntent creation failed for tenant {TenantId}, order {OrderId}.", tenantId, order.Id);
            return Error("PAYMENT_ERROR", "Unable to create marketplace payment.", 400);
        }
        if (string.IsNullOrWhiteSpace(intent.ClientSecret) || intent.AmountMinor != amountMinor ||
            !string.Equals(intent.Currency, currency, StringComparison.Ordinal) || !SameEconomics(intent, metadata) ||
            intent.ApplicationFeeMinor != feeMinor ||
            !string.Equals(intent.DestinationAccountId, seller.StripeAccountId, StringComparison.Ordinal))
        {
            await TryCancelUnboundIntentAsync(intent.Id, tenantId, order.Id, ct);
            return Error("PAYMENT_ERROR", "Stripe PaymentIntent economics do not match the order.", 400);
        }

        MarketplacePaymentResult? bindFailure = null;
        await using (var bindTransaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, ct)
            : null)
        {
            if (bindTransaction is not null)
            {
                await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({tenantId}, {order.Id})", ct);
                await db.Entry(order).ReloadAsync(ct);
            }
            if (order.Status != "pending_payment" ||
                (order.PaymentExpiresAt is not null && order.PaymentExpiresAt <= DateTime.UtcNow) ||
                order.StripeCheckoutMode != "payment_intent")
                bindFailure = Error("VALIDATION_ERROR", "Order is no longer available for card payment.", 422, "order_id");
            else if (!string.IsNullOrWhiteSpace(order.PaymentIntentId) && order.PaymentIntentId != intent.Id)
                bindFailure = Error("PAYMENT_ERROR", "The order is already bound to a different payment intent.", 409);
            else
            {
                order.PaymentIntentId = intent.Id;
                order.UpdatedAt = DateTime.UtcNow;
                try { await db.SaveChangesAsync(ct); }
                catch (DbUpdateException)
                {
                    bindFailure = Error("PAYMENT_ERROR", "The order already has a different payment intent.", 409);
                }
            }
            if (bindTransaction is not null && bindFailure is null) await bindTransaction.CommitAsync(ct);
        }
        if (bindFailure is not null)
        {
            await TryCancelUnboundIntentAsync(intent.Id, tenantId, order.Id, ct);
            return bindFailure;
        }
        return new(new { client_secret = intent.ClientSecret, payment_intent_id = intent.Id });
    }

    public async Task<MarketplacePaymentResult> ConfirmAsync(int tenantId, int buyerId, string? paymentIntentId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(paymentIntentId) || paymentIntentId.Length > 255)
            return Error("VALIDATION_ERROR", "Payment intent is required.", 422, "payment_intent_id");
        var order = await db.MarketplaceOrders.IgnoreQueryFilters()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.PaymentIntentId == paymentIntentId, ct);
        if (order is null) return Error("NOT_FOUND", "Local marketplace order not found.", 404);
        if (order.BuyerUserId != buyerId) return Error("FORBIDDEN", "Only the buyer can confirm payment.", 403);
        if (!stripe.IsConfigured) return Error("FEATURE_DISABLED", "Stripe marketplace payments are disabled.", 403);
        return await ConfirmBoundOrderAsync(order, paymentIntentId, ct);
    }

    public async Task<MarketplacePaymentResult> ReconcileSucceededIntentAsync(
        string paymentIntentId,
        string? externalEventId,
        CancellationToken ct)
    {
        if (!stripe.IsConfigured) return Error("FEATURE_DISABLED", "Stripe marketplace payments are disabled.", 503);
        if (string.IsNullOrWhiteSpace(paymentIntentId) || paymentIntentId.Length > 255)
            return Error("VALIDATION_ERROR", "Payment intent is required.", 422, "payment_intent_id");
        if (string.IsNullOrWhiteSpace(externalEventId) || externalEventId.Length > 200)
            return Error("VALIDATION_ERROR", "Stripe event id is required.", 422, "event_id");

        var order = await db.MarketplaceOrders.IgnoreQueryFilters()
            .SingleOrDefaultAsync(x => x.PaymentIntentId == paymentIntentId, ct);
        if (order is null) return Error("NOT_FOUND", "Local marketplace order not found.", 404);
        var existingEvent = await db.WebhookEvents.IgnoreQueryFilters().AsNoTracking()
            .SingleOrDefaultAsync(x => x.TenantId == order.TenantId && x.Provider == "stripe-marketplace" &&
                                       x.ExternalEventId == externalEventId, ct);
        if (existingEvent is not null) return new(new { received = true, applied = existingEvent.Status == "processed" });

        var result = await ConfirmBoundOrderAsync(order, paymentIntentId, ct);
        if (!result.Succeeded) return result;

        db.WebhookEvents.Add(new WebhookEvent
        {
            TenantId = order.TenantId,
            EventType = "payment_intent.succeeded",
            Source = "stripe",
            Provider = "stripe-marketplace",
            ExternalEventId = externalEventId,
            PayloadJson = JsonSerializer.Serialize(new { payment_intent_id = paymentIntentId }),
            Status = "processed",
            ReceivedAt = DateTime.UtcNow
        });
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
        }
        return new(new { received = true, applied = true });
    }

    private async Task<MarketplacePaymentResult> ConfirmBoundOrderAsync(
        MarketplaceOrder order,
        string paymentIntentId,
        CancellationToken ct)
    {
        var tenantId = order.TenantId;
        MarketplaceStripeIntent intent;
        try { intent = await stripe.RetrieveIntentAsync(paymentIntentId, ct); }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Stripe marketplace PaymentIntent verification failed for tenant {TenantId}, order {OrderId}.", tenantId, order.Id);
            return Error("PAYMENT_ERROR", "Unable to verify marketplace payment.", 400);
        }
        if (!string.Equals(intent.Status, "succeeded", StringComparison.Ordinal))
            return Error("PAYMENT_ERROR", $"Marketplace payment has not succeeded ({intent.Status}).", 400);
        if (!string.Equals(intent.Id, paymentIntentId, StringComparison.Ordinal))
            return Error("PAYMENT_ERROR", "Stripe returned a different PaymentIntent.", 400);
        var metadata = intent.Metadata;
        if (!IdentityMetadataMatches(metadata, order))
            return Error("PAYMENT_ERROR", "Stripe PaymentIntent is not bound to this order.", 400);
        var currency = NormalizeCurrency(order.Currency);
        if (currency is null || !TryToMinor(order.TotalAmount ?? 0, currency, out var amountMinor))
            return Error("PAYMENT_ERROR", "Local marketplace order currency is invalid.", 400);
        if (intent.AmountReceivedMinor != amountMinor || intent.AmountMinor != amountMinor ||
            !string.Equals(intent.Currency, currency, StringComparison.Ordinal) ||
            ParseMinor(metadata, "nexus_amount_minor") != amountMinor ||
            !metadata.TryGetValue("nexus_currency", out var metadataCurrency) || metadataCurrency != currency)
            return Error("PAYMENT_ERROR", "Stripe payment amount does not match the order.", 400);
        var feeMinor = ParseMinor(metadata, "nexus_platform_fee_minor");
        var payoutMinor = ParseMinor(metadata, "nexus_seller_payout_minor");
        if (feeMinor < 0 || payoutMinor < 0 || feeMinor + payoutMinor != amountMinor ||
            !metadata.TryGetValue("nexus_funds_flow", out var fundsFlow) || fundsFlow != "destination_charge" ||
            intent.ApplicationFeeMinor != feeMinor)
            return Error("PAYMENT_ERROR", "Stripe settlement economics are invalid.", 400);
        var seller = await db.MarketplaceSellerProfiles.IgnoreQueryFilters().AsNoTracking()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.UserId == order.SellerUserId, ct);
        if (seller is null || string.IsNullOrWhiteSpace(seller.StripeAccountId) ||
            !string.Equals(intent.DestinationAccountId, seller.StripeAccountId, StringComparison.Ordinal))
            return Error("PAYMENT_ERROR", "Stripe destination account does not match the seller.", 400);

        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, ct)
            : null;
        if (transaction is not null)
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({tenantId}, {order.Id})", ct);
            await db.Entry(order).ReloadAsync(ct);
        }
        var existing = await db.MarketplacePayments.IgnoreQueryFilters()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.StripePaymentIntentId == paymentIntentId, ct);
        if (existing is not null) return new(Projection(existing));
        if (order.Status != "pending_payment") return Error("PAYMENT_ERROR", "Order is not awaiting payment.", 400);
        var payment = new MarketplacePayment
        {
            TenantId = tenantId,
            MarketplaceOrderId = order.Id,
            StripePaymentIntentId = intent.Id,
            StripeChargeId = intent.LatestChargeId,
            FundsFlow = "destination_charge",
            Amount = FromMinor(amountMinor, currency),
            Currency = currency,
            PlatformFee = FromMinor(feeMinor, currency),
            SellerPayout = FromMinor(payoutMinor, currency),
            PaymentMethod = intent.PaymentMethod,
            Status = "succeeded",
            PayoutStatus = "paid",
            PaidOutAt = DateTime.UtcNow
        };
        db.MarketplacePayments.Add(payment);
        order.Status = "paid";
        order.PaymentExpiresAt = null;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return new(Projection(payment));
    }

    public async Task<MarketplacePaymentResult> StatusAsync(int tenantId, int userId, long paymentId, CancellationToken ct)
    {
        var payment = await db.MarketplacePayments.IgnoreQueryFilters().AsNoTracking()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == paymentId, ct);
        if (payment is null) return Error("NOT_FOUND", "Marketplace payment not found.", 404);
        var order = await db.MarketplaceOrders.IgnoreQueryFilters().AsNoTracking()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == payment.MarketplaceOrderId, ct);
        if (order is null) return Error("NOT_FOUND", "Marketplace payment not found.", 404);
        if (order.BuyerUserId != userId && order.SellerUserId != userId)
            return Error("FORBIDDEN", "Marketplace payment access denied.", 403);
        return new(Projection(payment, detailed: true));
    }

    public async Task<MarketplaceSellerPayoutPage> SellerPayoutsAsync(
        int tenantId,
        int sellerId,
        int page,
        int limit,
        CancellationToken ct)
    {
        var query =
            from payment in db.MarketplacePayments.IgnoreQueryFilters().AsNoTracking()
            join order in db.MarketplaceOrders.IgnoreQueryFilters().AsNoTracking()
                on new { payment.TenantId, Id = payment.MarketplaceOrderId }
                equals new { order.TenantId, order.Id }
            where payment.TenantId == tenantId && order.SellerUserId == sellerId &&
                  (payment.Status == "succeeded" || payment.Status == "partially_refunded")
            select payment;

        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.Id)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(ct);
        return new(
            rows.Select(x => new MarketplaceSellerPayout(
                x.Id,
                x.MarketplaceOrderId,
                x.Amount,
                x.PlatformFee,
                x.SellerPayout,
                x.Currency,
                x.Status,
                x.PayoutStatus,
                x.PayoutId,
                Iso(x.PaidOutAt),
                Iso(x.CreatedAt))).ToList(),
            total,
            page,
            limit);
    }

    public async Task<MarketplaceSellerBalance> SellerBalanceAsync(
        int tenantId,
        int sellerId,
        CancellationToken ct)
    {
        var rows = await (
            from payment in db.MarketplacePayments.IgnoreQueryFilters().AsNoTracking()
            join order in db.MarketplaceOrders.IgnoreQueryFilters().AsNoTracking()
                on new { payment.TenantId, Id = payment.MarketplaceOrderId }
                equals new { order.TenantId, order.Id }
            where payment.TenantId == tenantId && order.SellerUserId == sellerId &&
                  (payment.Status == "succeeded" || payment.Status == "partially_refunded")
            select payment).ToListAsync(ct);

        var balances = rows
            .GroupBy(x => NormalizeCurrency(x.Currency) ?? x.Currency.ToUpperInvariant(), StringComparer.Ordinal)
            .OrderBy(x => x.Key, StringComparer.Ordinal)
            .Select(group => new MarketplaceCurrencyBalance(
                group.Key,
                RoundMajor(group.Where(x => x.PayoutStatus == "pending").Sum(x => x.SellerPayout), group.Key),
                RoundMajor(group.Where(x => x.PayoutStatus is "scheduled" or "paid").Sum(x => x.SellerPayout), group.Key),
                RoundMajor(group.Sum(x => x.SellerPayout), group.Key)))
            .ToList();
        var single = balances.Count <= 1 ? balances.SingleOrDefault() : null;
        return new(single?.Pending, single?.Available, single?.Currency, single?.TotalEarned, balances);
    }

    private static object Projection(MarketplacePayment payment, bool detailed = false) => detailed
        ? new
        {
            id = payment.Id, order_id = payment.MarketplaceOrderId, amount = payment.Amount,
            currency = payment.Currency, platform_fee = payment.PlatformFee, seller_payout = payment.SellerPayout,
            payment_method = payment.PaymentMethod, status = payment.Status, payout_status = payment.PayoutStatus,
            refund_amount = payment.RefundAmount, refunded_at = Iso(payment.RefundedAt), paid_out_at = Iso(payment.PaidOutAt),
            created_at = Iso(payment.CreatedAt)
        }
        : new
        {
            payment_id = payment.Id, status = payment.Status, amount = payment.Amount,
            currency = payment.Currency, order_id = payment.MarketplaceOrderId
        };

    private static bool SameEconomics(MarketplaceStripeIntent intent, IReadOnlyDictionary<string, string> expected) =>
        expected.All(pair => intent.Metadata.TryGetValue(pair.Key, out var actual) && actual == pair.Value);
    private static bool IdentityMetadataMatches(IReadOnlyDictionary<string, string> metadata, MarketplaceOrder order) =>
        metadata.TryGetValue("nexus_type", out var type) && type == "marketplace" &&
        metadata.TryGetValue("nexus_order_id", out var orderId) && orderId == order.Id.ToString(CultureInfo.InvariantCulture) &&
        metadata.TryGetValue("nexus_tenant_id", out var tenantId) && tenantId == order.TenantId.ToString(CultureInfo.InvariantCulture) &&
        metadata.TryGetValue("nexus_buyer_id", out var buyerId) && buyerId == order.BuyerUserId.ToString(CultureInfo.InvariantCulture) &&
        metadata.TryGetValue("nexus_seller_id", out var sellerId) && sellerId == order.SellerUserId.ToString(CultureInfo.InvariantCulture);
    private async Task TryCancelUnboundIntentAsync(string paymentIntentId, int tenantId, int orderId, CancellationToken ct)
    {
        try
        {
            await stripe.CancelIntentAsync(paymentIntentId, $"marketplace-unbound-intent-{tenantId}-{orderId}", ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogCritical(exception,
                "Unbound Stripe marketplace PaymentIntent {PaymentIntentId} could not be cancelled for tenant {TenantId}, order {OrderId}.",
                paymentIntentId, tenantId, orderId);
        }
    }
    private static long ParseMinor(IReadOnlyDictionary<string, string> metadata, string key) =>
        metadata.TryGetValue(key, out var value) && long.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var parsed) ? parsed : -1;
    private static string? NormalizeCurrency(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var normalized = value.Trim().ToUpperInvariant();
        return SupportedCurrencies.Contains(normalized) ? normalized : null;
    }

    private static int CurrencyExponent(string currency) => ZeroDecimalCurrencies.Contains(currency) ? 0 : 2;

    private static bool TryToMinor(decimal value, string currency, out long minor, bool allowZero = false)
    {
        minor = 0;
        if ((allowZero ? value < 0 : value <= 0) || NormalizeCurrency(currency) is null) return false;
        if (currency is "ISK" or "UGX" && value != decimal.Round(value, 0, MidpointRounding.AwayFromZero)) return false;
        var factor = CurrencyExponent(currency) == 0 ? 1m : 100m;
        var scaled = value * factor;
        if (scaled != decimal.Round(scaled, 0, MidpointRounding.AwayFromZero)) return false;
        try { minor = checked((long)scaled); }
        catch (OverflowException) { return false; }
        return allowZero ? minor >= 0 : minor > 0;
    }

    private static decimal FromMinor(long value, string currency) =>
        CurrencyExponent(currency) == 0 ? value : value / 100m;
    private static decimal RoundMajor(decimal value, string currency) =>
        decimal.Round(value, CurrencyExponent(currency), MidpointRounding.AwayFromZero);
    private static string? Iso(DateTime? value) => value?.ToUniversalTime().ToString("O");
    private static string Iso(DateTime value) => value.ToUniversalTime().ToString("O");
    private static MarketplacePaymentResult Error(string code, string message, int status, string? field = null) =>
        new(null, new(code, message, status, field), status);
}

// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

namespace Nexus.Api.Entities;

public class MarketplaceCategory : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<MarketplaceListing> Listings { get; set; } = new List<MarketplaceListing>();
}

public class MarketplaceListing : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public int? CategoryId { get; set; }
    public int? GroupId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Tagline { get; set; }
    public decimal? Price { get; set; }
    public string PriceCurrency { get; set; } = "EUR";
    public string PriceType { get; set; } = "fixed";
    public decimal? TimeCreditPrice { get; set; }
    public string Condition { get; set; } = "good";
    public int Quantity { get; set; } = 1;
    public string? TemplateDataJson { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool ShippingAvailable { get; set; }
    public bool LocalPickup { get; set; } = true;
    public string DeliveryMethod { get; set; } = "pickup";
    public string SellerType { get; set; } = "private";
    public string Status { get; set; } = "draft";
    public string MarketplaceStatus { get; set; } = "available";
    public string ModerationStatus { get; set; } = "pending";
    public string? ModerationNotes { get; set; }
    public int? ModeratedByUserId { get; set; }
    public DateTime? ModeratedAt { get; set; }
    public string? PromotionType { get; set; }
    public DateTime? PromotedUntil { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime? RenewedAt { get; set; }
    public int RenewalCount { get; set; }
    public string? VideoUrl { get; set; }
    public int ViewsCount { get; set; }
    public int SavesCount { get; set; }
    public int ContactsCount { get; set; }
    public int? MarketplaceEnforcementReportId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Tenant? Tenant { get; set; }
    public User? User { get; set; }
    public MarketplaceCategory? Category { get; set; }
    public Group? Group { get; set; }
    public ICollection<MarketplaceImage> Images { get; set; } = new List<MarketplaceImage>();
    public ICollection<MarketplaceOffer> Offers { get; set; } = new List<MarketplaceOffer>();
}

public class MarketplaceImage : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int MarketplaceListingId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public MarketplaceListing? MarketplaceListing { get; set; }
}

public class MarketplaceSellerProfile : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string SellerType { get; set; } = "private";
    public bool IsVerified { get; set; }
    public bool IsSuspended { get; set; }
    public string? SuspensionReason { get; set; }
    public decimal RatingAverage { get; set; }
    public int RatingCount { get; set; }
    public int ListingsCount { get; set; }
    public int SalesCount { get; set; }
    public string? StripeAccountId { get; set; }
    public bool StripeOnboardingComplete { get; set; }
    public int? MarketplaceSuspensionReportId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public User? User { get; set; }
}

public class MarketplaceSavedListing : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public int MarketplaceListingId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MarketplaceOffer : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int MarketplaceListingId { get; set; }
    public int BuyerUserId { get; set; }
    public int SellerUserId { get; set; }
    public decimal? Amount { get; set; }
    public decimal? TimeCreditAmount { get; set; }
    public string Currency { get; set; } = "EUR";
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public decimal? CounterAmount { get; set; }
    public string? CounterMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public MarketplaceListing? Listing { get; set; }
}

public class MarketplaceOrder : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int MarketplaceListingId { get; set; }
    public int BuyerUserId { get; set; }
    public int SellerUserId { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal? TotalAmount { get; set; }
    public decimal? TimeCreditTotal { get; set; }
    public int? WalletTransactionId { get; set; }
    public int? WalletRefundTransactionId { get; set; }
    public string? PaymentIntentId { get; set; }
    public string? StripeCheckoutMode { get; set; }
    public DateTime? PaymentExpiresAt { get; set; }
    public string Currency { get; set; } = "EUR";
    public string Status { get; set; } = "pending";
    public string DeliveryMethod { get; set; } = "pickup";
    public string? ShippingAddress { get; set; }
    public string? TrackingNumber { get; set; }
    public string? TrackingUrl { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public MarketplaceListing? Listing { get; set; }
}

public class MarketplacePayment : ITenantEntity
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public int MarketplaceOrderId { get; set; }
    public string StripePaymentIntentId { get; set; } = string.Empty;
    public string? StripeChargeId { get; set; }
    public string FundsFlow { get; set; } = "destination_charge";
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public decimal PlatformFee { get; set; }
    public decimal SellerPayout { get; set; }
    public string? PaymentMethod { get; set; }
    public string Status { get; set; } = "pending";
    public decimal? RefundAmount { get; set; }
    public string? RefundReason { get; set; }
    public DateTime? RefundedAt { get; set; }
    public string PayoutStatus { get; set; } = "pending";
    public string? PayoutId { get; set; }
    public DateTime? PaidOutAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class MarketplaceDispute : ITenantEntity
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public int MarketplaceOrderId { get; set; }
    public int OpenedByUserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? EvidenceUrlsJson { get; set; }
    public string Status { get; set; } = "open";
    public string? PriorOrderStatus { get; set; }
    public string? ResolutionNotes { get; set; }
    public int? ResolvedByUserId { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public decimal? RefundAmount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class MarketplaceReport : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int MarketplaceListingId { get; set; }
    public int ReporterUserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Details { get; set; }
    public string? EvidenceUrlsJson { get; set; }
    public string Status { get; set; } = "received";
    public int? ResolvedByUserId { get; set; }
    public string? ResolutionNotes { get; set; }
    public string? ActionTaken { get; set; }
    public string? EnforcementSnapshotJson { get; set; }
    public string? AppealText { get; set; }
    public int? AppealedByUserId { get; set; }
    public DateTime? AppealResolvedAt { get; set; }
    public bool TransparencyReportIncluded { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class MarketplaceSavedSearch : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Query { get; set; } = string.Empty;
    public string? FiltersJson { get; set; }
    public bool AlertsEnabled { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MarketplaceCollection : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsPublic { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class MarketplaceCollectionItem : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int MarketplaceCollectionId { get; set; }
    public int MarketplaceListingId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MarketplacePromotion : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int MarketplaceListingId { get; set; }
    public int UserId { get; set; }
    public string ProductCode { get; set; } = "featured_7d";
    public string Status { get; set; } = "active";
    public DateTime StartsAt { get; set; } = DateTime.UtcNow;
    public DateTime EndsAt { get; set; } = DateTime.UtcNow.AddDays(7);
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MarketplaceShippingOption : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "EUR";
    public string? Region { get; set; }
    public int? EstimatedDays { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MarketplacePickupSlot : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public string Location { get; set; } = string.Empty;
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public int Capacity { get; set; } = 1;
    public int BookedCount { get; set; }
    public bool IsRecurring { get; set; }
    public string? RecurringPattern { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class MarketplacePickupReservation : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int MarketplaceOrderId { get; set; }
    public int MarketplacePickupSlotId { get; set; }
    public int? MarketplaceListingId { get; set; }
    public int UserId { get; set; }
    public string QrCode { get; set; } = string.Empty;
    public string Status { get; set; } = "reserved";
    public DateTime? ReservedAt { get; set; }
    public DateTime? PickedUpAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MarketplaceDeliveryOffer : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int MarketplaceOrderId { get; set; }
    public int DelivererUserId { get; set; }
    public decimal TimeCreditAmount { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class MarketplaceSellerRating : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int MarketplaceOrderId { get; set; }
    public int SellerUserId { get; set; }
    public int BuyerUserId { get; set; }
    public string RaterRole { get; set; } = "buyer";
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public bool IsAnonymous { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MerchantCoupon : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int SellerUserId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal DiscountAmount { get; set; }
    public string DiscountType { get; set; } = "fixed";
    public int? MinOrderCents { get; set; }
    public int? MaxUses { get; set; }
    public int MaxUsesPerMember { get; set; } = 1;
    public DateTime? ValidFrom { get; set; }
    public string Status { get; set; } = "draft";
    public string AppliesTo { get; set; } = "all_listings";
    public string? AppliesToIdsJson { get; set; }
    public int UsageCount { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class MerchantCouponRedemption : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int MerchantCouponId { get; set; }
    public int UserId { get; set; }
    public int? MarketplaceOrderId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MarketplaceSellerLoyaltySetting : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int SellerUserId { get; set; }
    public bool AcceptsTimeCredits { get; set; }
    public decimal LoyaltyChfPerHour { get; set; } = 25m;
    public int LoyaltyMaxDiscountPct { get; set; } = 50;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class CaringLoyaltyRedemption : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int MemberUserId { get; set; }
    public int MerchantUserId { get; set; }
    public int? MarketplaceListingId { get; set; }
    public int? MarketplaceOrderId { get; set; }
    public int? RedemptionTransactionId { get; set; }
    public int? ReversalTransactionId { get; set; }
    public decimal CreditsUsed { get; set; }
    public decimal ExchangeRateChf { get; set; }
    public decimal DiscountChf { get; set; }
    public decimal OrderTotalChf { get; set; }
    public string Status { get; set; } = "applied";
    public DateTime RedeemedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReversedAt { get; set; }
    public int? ReversedBy { get; set; }
    public string? ReversalReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Transaction? RedemptionTransaction { get; set; }
    public Transaction? ReversalTransaction { get; set; }
}

// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Manages the exchange workflow lifecycle.
/// Handles state transitions, credit transfers, and ratings.
/// </summary>
public class ExchangeService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly GamificationService _gamification;
    private readonly ILogger<ExchangeService> _logger;

    // Valid state transitions: from -> allowed destinations
    private static readonly Dictionary<ExchangeStatus, ExchangeStatus[]> ValidTransitions = new()
    {
        [ExchangeStatus.Requested] = new[] { ExchangeStatus.Accepted, ExchangeStatus.Declined, ExchangeStatus.Cancelled, ExchangeStatus.Expired },
        [ExchangeStatus.Accepted] = new[] { ExchangeStatus.InProgress, ExchangeStatus.Cancelled },
        [ExchangeStatus.InProgress] = new[] { ExchangeStatus.Completed, ExchangeStatus.Cancelled, ExchangeStatus.Disputed },
        [ExchangeStatus.Completed] = new[] { ExchangeStatus.Disputed },
        [ExchangeStatus.Disputed] = new[] { ExchangeStatus.Resolved },
        [ExchangeStatus.Declined] = Array.Empty<ExchangeStatus>(),
        [ExchangeStatus.Cancelled] = Array.Empty<ExchangeStatus>(),
        [ExchangeStatus.Resolved] = Array.Empty<ExchangeStatus>(),
        [ExchangeStatus.Expired] = Array.Empty<ExchangeStatus>(),
    };

    public ExchangeService(NexusDbContext db, TenantContext tenantContext, GamificationService gamification, ILogger<ExchangeService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _gamification = gamification;
        _logger = logger;
    }

    /// <summary>
    /// Create a new exchange request on a listing.
    /// </summary>
    public async Task<(Exchange? Exchange, string? Error)> CreateExchangeAsync(
        int initiatorId, int listingId, decimal? agreedHours, string? message, DateTime? scheduledAt, int? groupId)
    {
        var listing = await _db.Listings
            .FirstOrDefaultAsync(l => l.Id == listingId && l.Status == ListingStatus.Active);

        if (listing == null)
            return (null, "Listing not found or not active");

        if (listing.UserId == initiatorId)
            return (null, "Cannot request an exchange on your own listing");

        // Check for existing active exchange between these users on this listing
        var existingExchange = await _db.Exchanges
            .AnyAsync(e => e.ListingId == listingId
                && e.InitiatorId == initiatorId
                && e.Status != ExchangeStatus.Declined
                && e.Status != ExchangeStatus.Cancelled
                && e.Status != ExchangeStatus.Expired
                && e.Status != ExchangeStatus.Completed
                && e.Status != ExchangeStatus.Resolved);

        if (existingExchange)
            return (null, "You already have an active exchange request on this listing");

        // Determine provider and receiver based on listing type
        int? providerId = null;
        int? receiverId = null;

        if (listing.Type == ListingType.Offer)
        {
            // Listing owner offers a service, initiator receives it
            providerId = listing.UserId;
            receiverId = initiatorId;
        }
        else
        {
            // Listing owner requests a service, initiator provides it
            providerId = initiatorId;
            receiverId = listing.UserId;
        }

        // V1 rule: hours must be between 0.25 and 24
        var hours = agreedHours ?? listing.EstimatedHours ?? 1.0m;
        if (hours < 0.25m)
            return (null, "Minimum exchange duration is 0.25 hours (15 minutes)");
        if (hours > 24.0m)
            return (null, "Maximum exchange duration is 24 hours");

        var exchange = new Exchange
        {
            ListingId = listingId,
            InitiatorId = initiatorId,
            ListingOwnerId = listing.UserId,
            ProviderId = providerId,
            ReceiverId = receiverId,
            AgreedHours = hours,
            RequestMessage = message?.Trim(),
            ScheduledAt = scheduledAt,
            GroupId = groupId,
            Status = ExchangeStatus.Requested,
            CreatedAt = DateTime.UtcNow
        };

        _db.Exchanges.Add(exchange);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Exchange {ExchangeId} created: user {InitiatorId} → listing {ListingId}",
            exchange.Id, initiatorId, listingId);

        return (exchange, null);
    }

    /// <summary>
    /// Accept an exchange request. Only the listing owner can accept.
    /// </summary>
    public async Task<(Exchange? Exchange, string? Error)> AcceptExchangeAsync(
        int exchangeId, int userId, decimal? adjustedHours)
    {
        var exchange = await GetExchangeWithValidation(exchangeId, userId);
        if (exchange == null)
            return (null, "Exchange not found");

        if (exchange.ListingOwnerId != userId)
            return (null, "Only the listing owner can accept this exchange");

        var transitionError = ValidateTransition(exchange, ExchangeStatus.Accepted);
        if (transitionError != null)
            return (null, transitionError);

        exchange.Status = ExchangeStatus.Accepted;
        if (adjustedHours.HasValue && adjustedHours.Value > 0)
            exchange.AgreedHours = adjustedHours.Value;
        exchange.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Exchange {ExchangeId} accepted by user {UserId}", exchangeId, userId);
        return (exchange, null);
    }

    /// <summary>
    /// Decline an exchange request. Only the listing owner can decline.
    /// </summary>
    public async Task<(Exchange? Exchange, string? Error)> DeclineExchangeAsync(
        int exchangeId, int userId, string? reason)
    {
        var exchange = await GetExchangeWithValidation(exchangeId, userId);
        if (exchange == null)
            return (null, "Exchange not found");

        if (exchange.ListingOwnerId != userId)
            return (null, "Only the listing owner can decline this exchange");

        var transitionError = ValidateTransition(exchange, ExchangeStatus.Declined);
        if (transitionError != null)
            return (null, transitionError);

        exchange.Status = ExchangeStatus.Declined;
        exchange.DeclineReason = reason?.Trim();
        exchange.CancelledAt = DateTime.UtcNow;
        exchange.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Exchange {ExchangeId} declined by user {UserId}", exchangeId, userId);
        return (exchange, null);
    }

    /// <summary>
    /// Start the exchange (move to InProgress). Either party can start.
    /// </summary>
    public async Task<(Exchange? Exchange, string? Error)> StartExchangeAsync(int exchangeId, int userId)
    {
        var exchange = await GetExchangeWithValidation(exchangeId, userId);
        if (exchange == null)
            return (null, "Exchange not found");

        if (!IsParticipant(exchange, userId))
            return (null, "You are not a participant in this exchange");

        var transitionError = ValidateTransition(exchange, ExchangeStatus.InProgress);
        if (transitionError != null)
            return (null, transitionError);

        exchange.Status = ExchangeStatus.InProgress;
        exchange.StartedAt = DateTime.UtcNow;
        exchange.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Exchange {ExchangeId} started by user {UserId}", exchangeId, userId);
        return (exchange, null);
    }

    /// <summary>
    /// Complete an exchange and transfer credits.
    /// Either party can mark as complete, but credits transfer from receiver to provider.
    /// </summary>
    public async Task<(Exchange? Exchange, string? Error)> CompleteExchangeAsync(
        int exchangeId, int userId, decimal? actualHours)
    {
        var exchange = await GetExchangeWithValidation(exchangeId, userId);
        if (exchange == null)
            return (null, "Exchange not found");

        if (!IsParticipant(exchange, userId))
            return (null, "You are not a participant in this exchange");

        var transitionError = ValidateTransition(exchange, ExchangeStatus.Completed);
        if (transitionError != null)
            return (null, transitionError);

        if (!exchange.ProviderId.HasValue || !exchange.ReceiverId.HasValue)
            return (null, "Exchange provider/receiver not set");

        var hours = actualHours ?? exchange.AgreedHours;
        if (hours <= 0)
            return (null, "Hours must be greater than zero");

        // Transfer credits atomically
        await using var dbTransaction = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            // Advisory lock on the receiver (who pays credits)
            await _db.Database.ExecuteSqlRawAsync(
                "SELECT pg_advisory_xact_lock({0})",
                exchange.ReceiverId.Value);

            // Check receiver's balance
            var received = await _db.Transactions
                .Where(t => t.ReceiverId == exchange.ReceiverId.Value && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Amount);
            var sent = await _db.Transactions
                .Where(t => t.SenderId == exchange.ReceiverId.Value && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Amount);
            var balance = received - sent;

            if (balance < hours)
            {
                await dbTransaction.RollbackAsync();
                return (null, $"Insufficient balance. Current: {balance:F2}, Required: {hours:F2}");
            }

            // Create the credit transaction
            var transaction = new Transaction
            {
                TenantId = exchange.TenantId,
                SenderId = exchange.ReceiverId.Value,
                ReceiverId = exchange.ProviderId.Value,
                Amount = hours,
                Description = $"Exchange #{exchange.Id}: {exchange.Listing?.Title ?? "Service exchange"}",
                ListingId = exchange.ListingId,
                Status = TransactionStatus.Completed,
                CreatedAt = DateTime.UtcNow
            };

            _db.Transactions.Add(transaction);
            await _db.SaveChangesAsync();

            // Update exchange
            exchange.Status = ExchangeStatus.Completed;
            exchange.ActualHours = hours;
            exchange.CompletedAt = DateTime.UtcNow;
            exchange.TransactionId = transaction.Id;
            exchange.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            _logger.LogInformation(
                "Exchange {ExchangeId} completed: {Hours}h transferred from user {ReceiverId} to user {ProviderId}",
                exchangeId, hours, exchange.ReceiverId, exchange.ProviderId);

            // Award XP using V1 values (non-critical)
            try
            {
                await _gamification.AwardXpAsync(exchange.ProviderId.Value,
                    XpLog.Amounts.ExchangeCompleted, XpLog.Sources.ExchangeCompleted,
                    exchange.Id, "Completed an exchange as provider");
                await _gamification.AwardXpAsync(exchange.ReceiverId.Value,
                    XpLog.Amounts.ExchangeCompleted, XpLog.Sources.ExchangeCompleted,
                    exchange.Id, "Completed an exchange as receiver");
                // Credit-based XP: provider earned credits, receiver spent credits
                await _gamification.AwardXpAsync(exchange.ProviderId.Value,
                    (int)(hours * XpLog.Amounts.CreditsReceivedPerCredit), XpLog.Sources.CreditsReceived,
                    exchange.Id, $"Received {hours} credits");
                await _gamification.AwardXpAsync(exchange.ReceiverId.Value,
                    (int)(hours * XpLog.Amounts.CreditsSentPerCredit), XpLog.Sources.CreditsSent,
                    exchange.Id, $"Sent {hours} credits");
                await _gamification.CheckAndAwardBadgesAsync(exchange.ProviderId.Value, "exchange_completed");
                await _gamification.CheckAndAwardBadgesAsync(exchange.ReceiverId.Value, "exchange_completed");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to award XP for exchange {ExchangeId}", exchangeId);
            }

            return (exchange, null);
        }
        catch (Exception ex)
        {
            await dbTransaction.RollbackAsync();
            _logger.LogError(ex, "Failed to complete exchange {ExchangeId}", exchangeId);
            return (null, "Failed to complete exchange. Please try again.");
        }
    }

    /// <summary>
    /// Cancel an exchange. Either party can cancel before completion.
    /// </summary>
    public async Task<(Exchange? Exchange, string? Error)> CancelExchangeAsync(
        int exchangeId, int userId, string? reason)
    {
        var exchange = await GetExchangeWithValidation(exchangeId, userId);
        if (exchange == null)
            return (null, "Exchange not found");

        if (!IsParticipant(exchange, userId))
            return (null, "You are not a participant in this exchange");

        var transitionError = ValidateTransition(exchange, ExchangeStatus.Cancelled);
        if (transitionError != null)
            return (null, transitionError);

        exchange.Status = ExchangeStatus.Cancelled;
        exchange.DeclineReason = reason?.Trim();
        exchange.CancelledAt = DateTime.UtcNow;
        exchange.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Exchange {ExchangeId} cancelled by user {UserId}", exchangeId, userId);
        return (exchange, null);
    }

    /// <summary>
    /// Dispute a completed exchange.
    /// </summary>
    public async Task<(Exchange? Exchange, string? Error)> DisputeExchangeAsync(
        int exchangeId, int userId, string reason)
    {
        var exchange = await GetExchangeWithValidation(exchangeId, userId);
        if (exchange == null)
            return (null, "Exchange not found");

        if (!IsParticipant(exchange, userId))
            return (null, "You are not a participant in this exchange");

        if (string.IsNullOrWhiteSpace(reason))
            return (null, "A reason is required for disputes");

        var transitionError = ValidateTransition(exchange, ExchangeStatus.Disputed);
        if (transitionError != null)
            return (null, transitionError);

        exchange.Status = ExchangeStatus.Disputed;
        exchange.Notes = $"Disputed by user {userId}: {reason.Trim()}";
        exchange.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogWarning("Exchange {ExchangeId} disputed by user {UserId}: {Reason}",
            exchangeId, userId, reason);
        return (exchange, null);
    }

    /// <summary>
    /// Rate the other participant after exchange completion.
    /// </summary>
    public async Task<(ExchangeRating? Rating, string? Error)> RateExchangeAsync(
        int exchangeId, int raterId, int rating, string? comment, bool? wouldWorkAgain)
    {
        var exchange = await _db.Exchanges
            .Include(e => e.Ratings)
            .FirstOrDefaultAsync(e => e.Id == exchangeId);

        if (exchange == null)
            return (null, "Exchange not found");

        if (!IsParticipant(exchange, raterId))
            return (null, "You are not a participant in this exchange");

        if (exchange.Status != ExchangeStatus.Completed && exchange.Status != ExchangeStatus.Resolved)
            return (null, "Can only rate completed exchanges");

        if (rating < 1 || rating > 5)
            return (null, "Rating must be between 1 and 5");

        // Check if already rated
        if (exchange.Ratings.Any(r => r.RaterId == raterId))
            return (null, "You have already rated this exchange");

        // Determine who is being rated
        var ratedUserId = GetOtherParticipant(exchange, raterId);
        if (ratedUserId == null)
            return (null, "Cannot determine the other participant");

        var exchangeRating = new ExchangeRating
        {
            ExchangeId = exchangeId,
            RaterId = raterId,
            RatedUserId = ratedUserId.Value,
            Rating = rating,
            Comment = comment?.Trim(),
            WouldWorkAgain = wouldWorkAgain,
            CreatedAt = DateTime.UtcNow
        };

        _db.ExchangeRatings.Add(exchangeRating);
        await _db.SaveChangesAsync();

        // Award XP and check badges (non-critical)
        try
        {
            await _gamification.AwardXpAsync(raterId, XpLog.Amounts.ReviewLeft, XpLog.Sources.ReviewLeft, exchangeId, "Rated an exchange");
            await _gamification.CheckAndAwardBadgesAsync(raterId, "review_left");
            if (rating == 5)
                await _gamification.CheckAndAwardBadgesAsync(ratedUserId.Value, "five_star_received");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to award XP for rating exchange {ExchangeId}", exchangeId);
        }

        _logger.LogInformation("Exchange {ExchangeId} rated by user {RaterId}: {Rating}/5",
            exchangeId, raterId, rating);
        return (exchangeRating, null);
    }

    private async Task<Exchange?> GetExchangeWithValidation(int exchangeId, int userId)
    {
        return await _db.Exchanges
            .Include(e => e.Listing)
            .FirstOrDefaultAsync(e => e.Id == exchangeId);
    }

    private static bool IsParticipant(Exchange exchange, int userId)
    {
        return exchange.InitiatorId == userId || exchange.ListingOwnerId == userId;
    }

    private static int? GetOtherParticipant(Exchange exchange, int userId)
    {
        if (exchange.InitiatorId == userId) return exchange.ListingOwnerId;
        if (exchange.ListingOwnerId == userId) return exchange.InitiatorId;
        return null;
    }

    private static string? ValidateTransition(Exchange exchange, ExchangeStatus newStatus)
    {
        if (!ValidTransitions.TryGetValue(exchange.Status, out var allowed) || !allowed.Contains(newStatus))
            return $"Cannot transition from {exchange.Status} to {newStatus}";
        return null;
    }
}

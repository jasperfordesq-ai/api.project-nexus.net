// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

public sealed class CaringHourGiftService
{
    private const string StatusPending = "pending";
    private const string StatusAccepted = "accepted";
    private const string StatusDeclined = "declined";
    private const string StatusReverted = "reverted";
    private const string PendingGiftTransactionDescription = "Caring hour gift pending";
    private const int MaxMessageLength = 500;

    private readonly NexusDbContext _db;

    public CaringHourGiftService(NexusDbContext db, TenantContext tenantContext)
    {
        _db = db;
        _ = tenantContext;
    }

    public async Task<bool> IsFeatureEnabledAsync(int tenantId, CancellationToken ct)
    {
        var raw = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantId && c.Key == "features.caring_community")
            .Select(c => c.Value)
            .FirstOrDefaultAsync(ct);

        return ParseBool(raw) == true;
    }

    public async Task<IReadOnlyList<CaringHourGiftItemDto>> InboxAsync(
        int tenantId,
        int userId,
        CancellationToken ct)
    {
        var rows = await _db.CaringHourGifts
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(g => g.TenantId == tenantId
                && g.RecipientUserId == userId
                && g.Status == StatusPending)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync(ct);

        var partners = await LoadUsersAsync(tenantId, rows.Select(g => g.SenderUserId), ct);
        return rows.Select(row => Map(row, row.SenderUserId, partners)).ToArray();
    }

    public async Task<IReadOnlyList<CaringHourGiftItemDto>> SentAsync(
        int tenantId,
        int userId,
        CancellationToken ct)
    {
        var rows = await _db.CaringHourGifts
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(g => g.TenantId == tenantId && g.SenderUserId == userId)
            .OrderByDescending(g => g.CreatedAt)
            .Take(100)
            .ToListAsync(ct);

        var partners = await LoadUsersAsync(tenantId, rows.Select(g => g.RecipientUserId), ct);
        return rows.Select(row => Map(row, row.RecipientUserId, partners)).ToArray();
    }

    public async Task<CaringHourGiftSendResult> SendAsync(
        int tenantId,
        int senderUserId,
        int recipientUserId,
        decimal hours,
        string? message,
        CancellationToken ct)
    {
        if (senderUserId <= 0 || recipientUserId <= 0)
        {
            throw new ArgumentException("Sender and recipient are required.");
        }

        if (senderUserId == recipientUserId)
        {
            throw new ArgumentException("You cannot gift hours to yourself.");
        }

        if (hours <= 0)
        {
            throw new ArgumentException("Hours must be greater than zero.");
        }

        if (Math.Round(hours, 2, MidpointRounding.AwayFromZero) != hours)
        {
            throw new ArgumentException("Hours must have at most 2 decimal places.");
        }

        var cleanMessage = NormalizeMessage(message);
        var roundedHours = Math.Round(hours, 2, MidpointRounding.AwayFromZero);

        var senderExists = await _db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.TenantId == tenantId && u.Id == senderUserId && u.IsActive, ct);
        if (!senderExists)
        {
            throw new InvalidOperationException("Sender not found.");
        }

        var availableBalance = await AvailableBalanceAsync(tenantId, senderUserId, ct);
        if (availableBalance < roundedHours)
        {
            throw new InvalidOperationException("Insufficient banked hours.");
        }

        var recipientExists = await _db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.TenantId == tenantId && u.Id == recipientUserId && u.IsActive, ct);
        if (!recipientExists)
        {
            throw new InvalidOperationException("Recipient not found.");
        }

        var now = DateTime.UtcNow;
        var gift = new CaringHourGift
        {
            TenantId = tenantId,
            SenderUserId = senderUserId,
            RecipientUserId = recipientUserId,
            Hours = roundedHours,
            Message = cleanMessage,
            Status = StatusPending,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.CaringHourGifts.Add(gift);
        _db.Transactions.Add(new Transaction
        {
            TenantId = tenantId,
            SenderId = senderUserId,
            ReceiverId = recipientUserId,
            Amount = roundedHours,
            Description = PendingGiftTransactionDescription,
            Status = TransactionStatus.Pending,
            CreatedAt = now
        });

        await _db.SaveChangesAsync(ct);

        return new CaringHourGiftSendResult(gift.Id, StatusPending, true);
    }

    public async Task AcceptAsync(
        int tenantId,
        long giftId,
        int recipientUserId,
        CancellationToken ct)
    {
        var gift = await _db.CaringHourGifts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(g => g.TenantId == tenantId && g.Id == giftId, ct);

        if (gift is null)
        {
            throw new InvalidOperationException("Gift not found.");
        }

        if (gift.RecipientUserId != recipientUserId)
        {
            throw new InvalidOperationException("Only the recipient can accept this gift.");
        }

        if (gift.Status != StatusPending)
        {
            throw new InvalidOperationException("Gift is no longer pending.");
        }

        var now = DateTime.UtcNow;
        gift.Status = StatusAccepted;
        gift.AcceptedAt = now;
        gift.UpdatedAt = now;

        var pendingHold = await FindPendingGiftTransactionAsync(gift, ct);
        if (pendingHold is not null)
        {
            pendingHold.Status = TransactionStatus.Completed;
            pendingHold.Description = "Caring hour gift accepted";
            pendingHold.UpdatedAt = now;
        }
        else
        {
            _db.Transactions.Add(new Transaction
            {
                TenantId = tenantId,
                SenderId = gift.SenderUserId,
                ReceiverId = gift.RecipientUserId,
                Amount = Math.Round(gift.Hours, 2, MidpointRounding.AwayFromZero),
                Description = "Caring hour gift accepted",
                Status = TransactionStatus.Completed,
                CreatedAt = now
            });
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task DeclineAsync(
        int tenantId,
        long giftId,
        int recipientUserId,
        string? reason,
        CancellationToken ct)
    {
        var gift = await _db.CaringHourGifts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(g => g.TenantId == tenantId && g.Id == giftId, ct);

        if (gift is null)
        {
            throw new InvalidOperationException("Gift not found.");
        }

        if (gift.RecipientUserId != recipientUserId)
        {
            throw new InvalidOperationException("Only the recipient can decline this gift.");
        }

        if (gift.Status != StatusPending)
        {
            throw new InvalidOperationException("Gift is no longer pending.");
        }

        var now = DateTime.UtcNow;
        gift.Status = StatusDeclined;
        gift.DeclinedAt = now;
        gift.DeclineReason = NormalizeReason(reason);
        gift.UpdatedAt = now;

        var pendingHold = await FindPendingGiftTransactionAsync(gift, ct);
        if (pendingHold is not null)
        {
            pendingHold.Status = TransactionStatus.Cancelled;
            pendingHold.UpdatedAt = now;
        }
        else
        {
            _db.Transactions.Add(new Transaction
            {
                TenantId = tenantId,
                SenderId = 0,
                ReceiverId = gift.SenderUserId,
                Amount = Math.Round(gift.Hours, 2, MidpointRounding.AwayFromZero),
                Description = "Caring hour gift declined refund",
                Status = TransactionStatus.Completed,
                CreatedAt = now
            });
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task RevertAsync(
        int tenantId,
        long giftId,
        int senderUserId,
        CancellationToken ct)
    {
        var gift = await _db.CaringHourGifts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(g => g.TenantId == tenantId && g.Id == giftId, ct);

        if (gift is null)
        {
            throw new InvalidOperationException("Gift not found.");
        }

        if (gift.SenderUserId != senderUserId)
        {
            throw new InvalidOperationException("Only the sender can withdraw this gift.");
        }

        if (gift.Status != StatusPending)
        {
            throw new InvalidOperationException("Only pending gifts can be withdrawn.");
        }

        var now = DateTime.UtcNow;
        gift.Status = StatusReverted;
        gift.RevertedAt = now;
        gift.UpdatedAt = now;

        var pendingHold = await FindPendingGiftTransactionAsync(gift, ct);
        if (pendingHold is not null)
        {
            pendingHold.Status = TransactionStatus.Cancelled;
            pendingHold.UpdatedAt = now;
        }
        else
        {
            _db.Transactions.Add(new Transaction
            {
                TenantId = tenantId,
                SenderId = 0,
                ReceiverId = gift.SenderUserId,
                Amount = Math.Round(gift.Hours, 2, MidpointRounding.AwayFromZero),
                Description = "Caring hour gift reverted refund",
                Status = TransactionStatus.Completed,
                CreatedAt = now
            });
        }

        await _db.SaveChangesAsync(ct);
    }

    private async Task<decimal> AvailableBalanceAsync(int tenantId, int userId, CancellationToken ct)
    {
        var received = await _db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.TenantId == tenantId
                && t.ReceiverId == userId
                && t.Status == TransactionStatus.Completed)
            .SumAsync(t => t.Amount, ct);

        var sent = await _db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.TenantId == tenantId
                && t.SenderId == userId
                && t.Status == TransactionStatus.Completed)
            .SumAsync(t => t.Amount, ct);

        var pendingOut = await _db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.TenantId == tenantId
                && t.SenderId == userId
                && t.Status == TransactionStatus.Pending)
            .SumAsync(t => t.Amount, ct);

        return received - sent - pendingOut;
    }

    private Task<Transaction?> FindPendingGiftTransactionAsync(CaringHourGift gift, CancellationToken ct)
    {
        var hours = Math.Round(gift.Hours, 2, MidpointRounding.AwayFromZero);
        return _db.Transactions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.TenantId == gift.TenantId
                && t.SenderId == gift.SenderUserId
                && t.ReceiverId == gift.RecipientUserId
                && t.Amount == hours
                && t.Status == TransactionStatus.Pending
                && t.Description == PendingGiftTransactionDescription, ct);
    }

    private async Task<IReadOnlyDictionary<int, User>> LoadUsersAsync(
        int tenantId,
        IEnumerable<int> userIds,
        CancellationToken ct)
    {
        var ids = userIds
            .Where(id => id > 0)
            .Distinct()
            .ToArray();

        if (ids.Length == 0)
        {
            return new Dictionary<int, User>();
        }

        return await _db.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.TenantId == tenantId && ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, ct);
    }

    private static CaringHourGiftItemDto Map(
        CaringHourGift gift,
        int partnerUserId,
        IReadOnlyDictionary<int, User> partners)
    {
        partners.TryGetValue(partnerUserId, out var partner);

        return new CaringHourGiftItemDto(
            Id: gift.Id,
            Hours: Math.Round(gift.Hours, 2, MidpointRounding.AwayFromZero),
            Message: gift.Message,
            Status: gift.Status,
            CreatedAt: gift.CreatedAt,
            Partner: new CaringHourGiftPartnerDto(
                Id: partnerUserId,
                Name: DisplayName(partner),
                AvatarUrl: partner?.AvatarUrl));
    }

    private static string DisplayName(User? user)
    {
        if (user is null)
        {
            return string.Empty;
        }

        return $"{user.FirstName} {user.LastName}".Trim();
    }

    private static string? NormalizeReason(string? reason)
    {
        if (reason is null)
        {
            return null;
        }

        var trimmed = reason.Trim();
        if (trimmed.Length == 0)
        {
            return null;
        }

        return trimmed.Length <= MaxMessageLength
            ? trimmed
            : trimmed[..MaxMessageLength];
    }

    private static string? NormalizeMessage(string? message)
    {
        if (message is null)
        {
            return null;
        }

        var trimmed = message.Trim();
        if (trimmed.Length == 0)
        {
            return null;
        }

        if (trimmed.Length > MaxMessageLength)
        {
            throw new ArgumentException("Message is too long.");
        }

        return trimmed;
    }

    private static bool? ParseBool(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        return raw.Trim().ToLowerInvariant() switch
        {
            "true" or "1" or "yes" or "on" or "enabled" => true,
            "false" or "0" or "no" or "off" or "disabled" => false,
            _ => null
        };
    }
}

public sealed record CaringHourGiftItemDto(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("hours")] decimal Hours,
    [property: JsonPropertyName("message")] string? Message,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("created_at")] DateTime CreatedAt,
    [property: JsonPropertyName("partner")] CaringHourGiftPartnerDto Partner);

public sealed record CaringHourGiftPartnerDto(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("avatar_url")] string? AvatarUrl);

public sealed record CaringHourGiftSendResult(
    [property: JsonPropertyName("gift_id")] long GiftId,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("success")] bool Success);

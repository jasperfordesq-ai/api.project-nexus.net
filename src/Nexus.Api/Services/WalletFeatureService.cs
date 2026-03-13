// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for expanded wallet features: limits, categories, donations, alerts, export.
/// Phase 19: Expanded Wallet.
/// </summary>
public class WalletFeatureService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<WalletFeatureService> _logger;

    public WalletFeatureService(NexusDbContext db, TenantContext tenantContext, ILogger<WalletFeatureService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Validate a proposed transaction against the user's and tenant's limits.
    /// Returns (allowed, reason) where reason explains why it was denied.
    /// </summary>
    public async Task<(bool Allowed, string? Reason)> CheckTransactionLimitsAsync(int userId, decimal amount)
    {
        // Get user-specific limits first, then fall back to tenant-wide limits
        var userLimit = await _db.Set<TransactionLimit>()
            .Where(l => l.UserId == userId && l.IsActive)
            .FirstOrDefaultAsync();

        var tenantLimit = await _db.Set<TransactionLimit>()
            .Where(l => l.UserId == null && l.IsActive)
            .FirstOrDefaultAsync();

        // Merge: user-specific overrides tenant-wide
        var maxSingle = userLimit?.MaxSingleAmount ?? tenantLimit?.MaxSingleAmount;
        var maxDailyAmount = userLimit?.MaxDailyAmount ?? tenantLimit?.MaxDailyAmount;
        var maxDailyTx = userLimit?.MaxDailyTransactions ?? tenantLimit?.MaxDailyTransactions;
        var minBalance = userLimit?.MinBalance ?? tenantLimit?.MinBalance;

        // Check single transaction limit
        if (maxSingle.HasValue && amount > maxSingle.Value)
        {
            return (false, $"Amount exceeds maximum single transaction limit of {maxSingle.Value} hours.");
        }

        // Check daily amount limit
        if (maxDailyAmount.HasValue)
        {
            var todayStart = DateTime.UtcNow.Date;
            var dailyTotal = await _db.Transactions
                .Where(t => t.SenderId == userId
                    && t.Status == TransactionStatus.Completed
                    && t.CreatedAt >= todayStart)
                .SumAsync(t => t.Amount);

            if (dailyTotal + amount > maxDailyAmount.Value)
            {
                return (false, $"Transfer would exceed daily limit of {maxDailyAmount.Value} hours. Already transferred {dailyTotal} today.");
            }
        }

        // Check daily transaction count
        if (maxDailyTx.HasValue)
        {
            var todayStart = DateTime.UtcNow.Date;
            var dailyCount = await _db.Transactions
                .Where(t => t.SenderId == userId
                    && t.Status == TransactionStatus.Completed
                    && t.CreatedAt >= todayStart)
                .CountAsync();

            if (dailyCount >= maxDailyTx.Value)
            {
                return (false, $"Maximum daily transaction count of {maxDailyTx.Value} reached.");
            }
        }

        // Check minimum balance
        if (minBalance.HasValue)
        {
            var received = await _db.Transactions
                .Where(t => t.ReceiverId == userId && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Amount);

            var sent = await _db.Transactions
                .Where(t => t.SenderId == userId && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Amount);

            var currentBalance = received - sent;
            if (currentBalance - amount < minBalance.Value)
            {
                return (false, $"Transfer would bring balance below minimum of {minBalance.Value} hours.");
            }
        }

        return (true, null);
    }

    /// <summary>
    /// Get all transaction categories for the current tenant.
    /// </summary>
    public async Task<List<TransactionCategory>> GetTransactionCategoriesAsync()
    {
        return await _db.Set<TransactionCategory>()
            .OrderBy(c => c.Name)
            .ToListAsync();
    }

    /// <summary>
    /// Create a balance alert for a user.
    /// </summary>
    public async Task<BalanceAlert> CreateBalanceAlertAsync(int userId, decimal threshold)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var alert = new BalanceAlert
        {
            TenantId = tenantId,
            UserId = userId,
            ThresholdAmount = threshold,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<BalanceAlert>().Add(alert);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Balance alert created for user {UserId} at threshold {Threshold}", userId, threshold);
        return alert;
    }

    /// <summary>
    /// Process a credit donation. Creates the underlying transaction and donation record.
    /// </summary>
    public async Task<CreditDonation> ProcessDonationAsync(int donorId, int? recipientId, decimal amount, string? message, bool anonymous)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();

        // Determine effective receiver: if community fund (recipientId is null), use donor as both (self-transaction marked as donation)
        // In practice, community fund donations go to a system account or are tracked separately.
        // For now, if no recipient, we still need a receiver for the Transaction entity.
        // We'll use the donor as receiver for community fund donations (amount is deducted, tracked as donation).
        var effectiveReceiverId = recipientId ?? donorId;

        await using var dbTransaction = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            // Advisory lock on donor
            await _db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock({0})", donorId);

            // Check balance
            var received = await _db.Transactions
                .Where(t => t.ReceiverId == donorId && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Amount);

            var sent = await _db.Transactions
                .Where(t => t.SenderId == donorId && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Amount);

            var balance = received - sent;
            if (balance < amount)
            {
                throw new InvalidOperationException("Insufficient balance for donation.");
            }

            // Create transaction
            var transaction = new Transaction
            {
                TenantId = tenantId,
                SenderId = donorId,
                ReceiverId = effectiveReceiverId,
                Amount = amount,
                Description = recipientId.HasValue
                    ? $"Donation{(anonymous ? " (anonymous)" : "")}: {message ?? "No message"}"
                    : $"Community fund donation: {message ?? "No message"}",
                Status = TransactionStatus.Completed,
                CreatedAt = DateTime.UtcNow
            };

            _db.Transactions.Add(transaction);
            await _db.SaveChangesAsync();

            // Create donation record
            var donation = new CreditDonation
            {
                TenantId = tenantId,
                DonorId = donorId,
                RecipientId = recipientId,
                Amount = amount,
                Message = message?.Trim(),
                TransactionId = transaction.Id,
                IsAnonymous = anonymous,
                CreatedAt = DateTime.UtcNow
            };

            _db.Set<CreditDonation>().Add(donation);
            await _db.SaveChangesAsync();

            await dbTransaction.CommitAsync();

            _logger.LogInformation("Donation of {Amount} from user {DonorId} to {RecipientId} processed (transaction {TransactionId})",
                amount, donorId, recipientId?.ToString() ?? "community fund", transaction.Id);

            return donation;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Donation processing failed for donor {DonorId}, amount {Amount}", donorId, amount);
            await dbTransaction.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Get donation history for a user (as donor or recipient).
    /// </summary>
    public async Task<(List<CreditDonation> Donations, int Total)> GetDonationHistoryAsync(int userId, int page, int limit)
    {
        var query = _db.Set<CreditDonation>()
            .Include(d => d.Donor)
            .Include(d => d.Recipient)
            .Where(d => d.DonorId == userId || d.RecipientId == userId)
            .OrderByDescending(d => d.CreatedAt);

        var total = await query.CountAsync();
        var donations = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return (donations, total);
    }

    /// <summary>
    /// Export transactions as CSV.
    /// </summary>
    public async Task<string> ExportTransactionsAsync(int userId, DateTime? startDate, DateTime? endDate, string format = "csv")
    {
        var query = _db.Transactions
            .Include(t => t.Sender)
            .Include(t => t.Receiver)
            .Where(t => t.SenderId == userId || t.ReceiverId == userId);

        if (startDate.HasValue)
            query = query.Where(t => t.CreatedAt >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(t => t.CreatedAt <= endDate.Value);

        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Id,Date,Type,Amount,Description,Counterparty,Status");

        foreach (var t in transactions)
        {
            var type = t.SenderId == userId ? "sent" : "received";
            var counterparty = t.SenderId == userId
                ? $"{t.Receiver?.FirstName} {t.Receiver?.LastName}"
                : $"{t.Sender?.FirstName} {t.Sender?.LastName}";
            var description = (t.Description ?? "").Replace(",", ";").Replace("\n", " ");

            sb.AppendLine($"{t.Id},{t.CreatedAt:yyyy-MM-dd HH:mm:ss},{type},{t.Amount},{description},{counterparty},{t.Status}");
        }

        return sb.ToString();
    }

    /// <summary>
    /// Get an extended balance summary for a user.
    /// </summary>
    public async Task<BalanceSummary> GetBalanceSummaryAsync(int userId)
    {
        var received = await _db.Transactions
            .Where(t => t.ReceiverId == userId && t.Status == TransactionStatus.Completed)
            .SumAsync(t => t.Amount);

        var sent = await _db.Transactions
            .Where(t => t.SenderId == userId && t.Status == TransactionStatus.Completed)
            .SumAsync(t => t.Amount);

        var pending = await _db.Transactions
            .Where(t => (t.SenderId == userId || t.ReceiverId == userId) && t.Status == TransactionStatus.Pending)
            .SumAsync(t => t.Amount);

        var donated = await _db.Set<CreditDonation>()
            .Where(d => d.DonorId == userId)
            .SumAsync(d => d.Amount);

        var donationsReceived = await _db.Set<CreditDonation>()
            .Where(d => d.RecipientId == userId)
            .SumAsync(d => d.Amount);

        return new BalanceSummary
        {
            Balance = received - sent,
            ReceivedTotal = received,
            SentTotal = sent,
            PendingTotal = pending,
            DonatedTotal = donated,
            DonationsReceivedTotal = donationsReceived
        };
    }
}

/// <summary>
/// Extended balance summary with donation and pending totals.
/// </summary>
public class BalanceSummary
{
    public decimal Balance { get; set; }
    public decimal ReceivedTotal { get; set; }
    public decimal SentTotal { get; set; }
    public decimal PendingTotal { get; set; }
    public decimal DonatedTotal { get; set; }
    public decimal DonationsReceivedTotal { get; set; }
}

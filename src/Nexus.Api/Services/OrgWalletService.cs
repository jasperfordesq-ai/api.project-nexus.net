// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for organisation wallet operations.
/// </summary>
public class OrgWalletService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<OrgWalletService> _logger;

    public OrgWalletService(NexusDbContext db, TenantContext tenantContext, ILogger<OrgWalletService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<OrgWallet?> GetWalletAsync(int organisationId)
    {
        return await _db.Set<OrgWallet>()
            .Include(w => w.Organisation)
            .FirstOrDefaultAsync(w => w.OrganisationId == organisationId);
    }

    public async Task<OrgWallet> EnsureWalletAsync(int organisationId)
    {
        var wallet = await _db.Set<OrgWallet>()
            .FirstOrDefaultAsync(w => w.OrganisationId == organisationId);

        if (wallet == null)
        {
            wallet = new OrgWallet { OrganisationId = organisationId };
            _db.Set<OrgWallet>().Add(wallet);
            await _db.SaveChangesAsync();
        }

        return wallet;
    }

    public async Task<List<OrgWalletTransaction>> GetTransactionsAsync(
        int organisationId, int page = 1, int limit = 20)
    {
        var wallet = await _db.Set<OrgWallet>()
            .FirstOrDefaultAsync(w => w.OrganisationId == organisationId);
        if (wallet == null) return new List<OrgWalletTransaction>();

        return await _db.Set<OrgWalletTransaction>()
            .Where(t => t.OrgWalletId == wallet.Id)
            .Include(t => t.InitiatedBy)
            .Include(t => t.FromUser)
            .Include(t => t.ToUser)
            .OrderByDescending(t => t.CreatedAt)
            .Skip((Math.Max(1, page) - 1) * Math.Clamp(limit, 1, 100))
            .Take(Math.Clamp(limit, 1, 100))
            .ToListAsync();
    }

    public async Task<(OrgWalletTransaction? Tx, string? Error)> DonateAsync(
        int organisationId, int fromUserId, decimal amount, string? description)
    {
        if (amount <= 0) return (null, "Amount must be positive");
        if (amount > 100) return (null, "Maximum donation is 100 credits per transaction");

        // Use serializable transaction with advisory lock to prevent race conditions
        await using var dbTransaction = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            // Lock on sender to serialize concurrent donations from same user
            await _db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock({0})", fromUserId);

            // Check user has sufficient balance (now protected by lock)
            var received = await _db.Transactions
                .Where(t => t.ReceiverId == fromUserId && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Amount);
            var sent = await _db.Transactions
                .Where(t => t.SenderId == fromUserId && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Amount);
            var userBalance = received - sent;
            if (userBalance < amount)
            {
                await dbTransaction.RollbackAsync();
                return (null, "Insufficient balance");
            }

            var wallet = await EnsureWalletAsync(organisationId);

            // Look up org owner to use as receiver in the personal Transaction
            // (personal balance is computed from Transactions: received - sent)
            var org = await _db.Set<Organisation>()
                .FirstOrDefaultAsync(o => o.Id == organisationId);
            if (org == null)
            {
                await dbTransaction.RollbackAsync();
                return (null, "Organisation not found");
            }

            // Debit donor's personal wallet by creating a Transaction
            // The org owner receives the credits on behalf of the org
            var debitTx = new Transaction
            {
                TenantId = _tenantContext.GetTenantIdOrThrow(),
                SenderId = fromUserId,
                ReceiverId = org.OwnerId,
                Amount = amount,
                Description = description ?? $"Donation to organisation #{organisationId}",
                Status = TransactionStatus.Completed,
                CreatedAt = DateTime.UtcNow
            };
            _db.Transactions.Add(debitTx);

            // Credit org wallet
            wallet.Balance += amount;
            wallet.TotalReceived += amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            var tx = new OrgWalletTransaction
            {
                OrgWalletId = wallet.Id,
                Type = "credit",
                Amount = amount,
                BalanceAfter = wallet.Balance,
                Category = "donation",
                Description = description ?? "Personal donation",
                InitiatedById = fromUserId,
                FromUserId = fromUserId
            };

            _db.Set<OrgWalletTransaction>().Add(tx);
            await _db.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            _logger.LogInformation("User {UserId} donated {Amount} to org {OrgId}", fromUserId, amount, organisationId);
            return (tx, null);
        }
        catch (DbUpdateException ex)
        {
            await dbTransaction.RollbackAsync();
            _logger.LogError(ex, "Database error during donation from user {UserId} to org {OrgId}", fromUserId, organisationId);
            return (null, "Donation failed due to a database error. Please try again.");
        }
    }

    public async Task<(OrgWalletTransaction? Tx, string? Error)> TransferToUserAsync(
        int organisationId, int toUserId, int initiatedById, decimal amount, string? description)
    {
        if (amount <= 0) return (null, "Amount must be positive");

        // Check initiator is org admin/owner (before transaction — read-only check)
        var member = await _db.Set<OrganisationMember>()
            .FirstOrDefaultAsync(m => m.OrganisationId == organisationId && m.UserId == initiatedById);
        if (member == null || (member.Role != "owner" && member.Role != "admin"))
            return (null, "Not authorized to transfer from this wallet");

        var targetUser = await _db.Set<User>().FirstOrDefaultAsync(u => u.Id == toUserId);
        if (targetUser == null) return (null, "Target user not found");

        // Use serializable transaction with advisory lock to prevent race conditions
        await using var dbTransaction = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            // Lock on org ID to serialize concurrent transfers from same wallet
            await _db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock({0})", organisationId + int.MaxValue / 2);

            var wallet = await _db.Set<OrgWallet>()
                .FirstOrDefaultAsync(w => w.OrganisationId == organisationId);
            if (wallet == null)
            {
                await dbTransaction.RollbackAsync();
                return (null, "Organisation wallet not found");
            }
            if (wallet.Balance < amount)
            {
                await dbTransaction.RollbackAsync();
                return (null, "Insufficient org wallet balance");
            }

            // Debit org wallet
            wallet.Balance -= amount;
            wallet.TotalSpent += amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            // Look up org owner to use as sender in the personal Transaction
            var org = await _db.Set<Organisation>()
                .FirstOrDefaultAsync(o => o.Id == organisationId);
            if (org == null)
            {
                await dbTransaction.RollbackAsync();
                return (null, "Organisation not found");
            }

            // Credit target user's personal wallet by creating a Transaction
            // The org owner sends credits on behalf of the org
            var creditTx = new Transaction
            {
                TenantId = _tenantContext.GetTenantIdOrThrow(),
                SenderId = org.OwnerId,
                ReceiverId = toUserId,
                Amount = amount,
                Description = description ?? $"Transfer from organisation #{organisationId}",
                Status = TransactionStatus.Completed,
                CreatedAt = DateTime.UtcNow
            };
            _db.Transactions.Add(creditTx);

            var tx = new OrgWalletTransaction
            {
                OrgWalletId = wallet.Id,
                Type = "debit",
                Amount = amount,
                BalanceAfter = wallet.Balance,
                Category = "transfer",
                Description = description ?? "Transfer to member",
                InitiatedById = initiatedById,
                ToUserId = toUserId
            };

            _db.Set<OrgWalletTransaction>().Add(tx);
            await _db.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            _logger.LogInformation("Org {OrgId} transferred {Amount} to user {UserId}", organisationId, amount, toUserId);
            return (tx, null);
        }
        catch (DbUpdateException ex)
        {
            await dbTransaction.RollbackAsync();
            _logger.LogError(ex, "Database error during transfer from org {OrgId} to user {UserId}", organisationId, toUserId);
            return (null, "Transfer failed due to a database error. Please try again.");
        }
    }

    public async Task<(OrgWalletTransaction? Tx, string? Error)> AdminGrantAsync(
        int organisationId, decimal amount, string? description)
    {
        if (amount <= 0) return (null, "Amount must be positive");

        try
        {
            var wallet = await EnsureWalletAsync(organisationId);

            wallet.Balance += amount;
            wallet.TotalReceived += amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            var tx = new OrgWalletTransaction
            {
                OrgWalletId = wallet.Id,
                Type = "credit",
                Amount = amount,
                BalanceAfter = wallet.Balance,
                Category = "admin_grant",
                Description = description ?? "Admin grant"
            };

            _db.Set<OrgWalletTransaction>().Add(tx);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Admin granted {Amount} to org {OrgId}", amount, organisationId);
            return (tx, null);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error during admin grant to org {OrgId}", organisationId);
            return (null, "Grant failed due to a database error. Please try again.");
        }
    }
}

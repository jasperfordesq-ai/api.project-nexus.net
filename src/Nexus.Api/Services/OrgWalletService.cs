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

        // Check user has sufficient balance (computed from Transactions)
        var received = await _db.Transactions
            .Where(t => t.ReceiverId == fromUserId && t.Status == TransactionStatus.Completed)
            .SumAsync(t => t.Amount);
        var sent = await _db.Transactions
            .Where(t => t.SenderId == fromUserId && t.Status == TransactionStatus.Completed)
            .SumAsync(t => t.Amount);
        var userBalance = received - sent;
        if (userBalance < amount) return (null, "Insufficient balance");

        var wallet = await EnsureWalletAsync(organisationId);

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

        _logger.LogInformation("User {UserId} donated {Amount} to org {OrgId}", fromUserId, amount, organisationId);
        return (tx, null);
    }

    public async Task<(OrgWalletTransaction? Tx, string? Error)> TransferToUserAsync(
        int organisationId, int toUserId, int initiatedById, decimal amount, string? description)
    {
        if (amount <= 0) return (null, "Amount must be positive");

        var wallet = await _db.Set<OrgWallet>()
            .FirstOrDefaultAsync(w => w.OrganisationId == organisationId);
        if (wallet == null) return (null, "Organisation wallet not found");
        if (wallet.Balance < amount) return (null, "Insufficient org wallet balance");

        // Check initiator is org admin/owner
        var member = await _db.Set<OrganisationMember>()
            .FirstOrDefaultAsync(m => m.OrganisationId == organisationId && m.UserId == initiatedById);
        if (member == null || (member.Role != "owner" && member.Role != "admin"))
            return (null, "Not authorized to transfer from this wallet");

        var targetUser = await _db.Set<User>().FindAsync(toUserId);
        if (targetUser == null) return (null, "Target user not found");

        // Debit org wallet
        wallet.Balance -= amount;
        wallet.TotalSpent += amount;
        wallet.UpdatedAt = DateTime.UtcNow;

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

        _logger.LogInformation("Org {OrgId} transferred {Amount} to user {UserId}", organisationId, amount, toUserId);
        return (tx, null);
    }

    public async Task<(OrgWalletTransaction? Tx, string? Error)> AdminGrantAsync(
        int organisationId, decimal amount, string? description)
    {
        if (amount <= 0) return (null, "Amount must be positive");

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

        return (tx, null);
    }
}

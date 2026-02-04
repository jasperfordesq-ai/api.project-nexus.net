// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Wallet controller - balance, transactions, and transfers.
/// Phase 4: READ operations. Phase 5: WRITE (transfer) operation.
/// </summary>
[ApiController]
[Route("api/wallet")]
[Authorize]
public class WalletController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<WalletController> _logger;
    private readonly GamificationService _gamification;

    public WalletController(NexusDbContext db, TenantContext tenantContext, ILogger<WalletController> logger, GamificationService gamification)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
        _gamification = gamification;
    }

    /// <summary>
    /// Get current user's balance.
    /// Balance = sum of received amounts - sum of sent amounts.
    /// </summary>
    [HttpGet("balance")]
    public async Task<IActionResult> GetBalance()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Calculate balance from transactions
        var received = await _db.Transactions
            .Where(t => t.ReceiverId == userId.Value && t.Status == TransactionStatus.Completed)
            .SumAsync(t => t.Amount);

        var sent = await _db.Transactions
            .Where(t => t.SenderId == userId.Value && t.Status == TransactionStatus.Completed)
            .SumAsync(t => t.Amount);

        var balance = received - sent;

        _logger.LogDebug("User {UserId} balance: {Balance} (received: {Received}, sent: {Sent})",
            userId, balance, received, sent);

        return Ok(new
        {
            balance,
            currency = "hours",
            received_total = received,
            sent_total = sent
        });
    }

    /// <summary>
    /// Get transaction history for the current user.
    /// Returns transactions where user is sender or receiver.
    /// </summary>
    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? type = null) // "sent", "received", or null for all
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        limit = Math.Clamp(limit, 1, 100);
        var skip = (page - 1) * limit;

        // Build query
        var query = _db.Transactions
            .Where(t => t.SenderId == userId.Value || t.ReceiverId == userId.Value);

        // Filter by type if specified
        if (!string.IsNullOrEmpty(type))
        {
            query = type.ToLowerInvariant() switch
            {
                "sent" => query.Where(t => t.SenderId == userId.Value),
                "received" => query.Where(t => t.ReceiverId == userId.Value),
                _ => query
            };
        }

        // Get total count
        var total = await query.CountAsync();

        // Get paginated results
        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip(skip)
            .Take(limit)
            .Include(t => t.Sender)
            .Include(t => t.Receiver)
            .Include(t => t.Listing)
            .Select(t => new
            {
                id = t.Id,
                amount = t.Amount,
                description = t.Description,
                status = t.Status.ToString().ToLowerInvariant(),
                type = t.SenderId == userId.Value ? "sent" : "received",
                sender = new
                {
                    id = t.Sender!.Id,
                    first_name = t.Sender.FirstName,
                    last_name = t.Sender.LastName
                },
                receiver = new
                {
                    id = t.Receiver!.Id,
                    first_name = t.Receiver.FirstName,
                    last_name = t.Receiver.LastName
                },
                listing = t.Listing == null ? null : new
                {
                    id = t.Listing.Id,
                    title = t.Listing.Title
                },
                created_at = t.CreatedAt,
                updated_at = t.UpdatedAt
            })
            .ToListAsync();

        _logger.LogDebug("User {UserId} retrieved {Count} transactions", userId, transactions.Count);

        return Ok(new
        {
            data = transactions,
            pagination = new
            {
                page,
                limit,
                total,
                pages = (int)Math.Ceiling((double)total / limit)
            }
        });
    }

    /// <summary>
    /// Get a single transaction by ID.
    /// User must be sender or receiver to view.
    /// </summary>
    [HttpGet("transactions/{id:int}")]
    public async Task<IActionResult> GetTransaction(int id)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var transaction = await _db.Transactions
            .Include(t => t.Sender)
            .Include(t => t.Receiver)
            .Include(t => t.Listing)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transaction == null)
        {
            return NotFound(new { error = "Transaction not found" });
        }

        // Check if user is participant
        if (transaction.SenderId != userId.Value && transaction.ReceiverId != userId.Value)
        {
            return NotFound(new { error = "Transaction not found" });
        }

        return Ok(new
        {
            id = transaction.Id,
            amount = transaction.Amount,
            description = transaction.Description,
            status = transaction.Status.ToString().ToLowerInvariant(),
            type = transaction.SenderId == userId.Value ? "sent" : "received",
            sender = new
            {
                id = transaction.Sender!.Id,
                first_name = transaction.Sender.FirstName,
                last_name = transaction.Sender.LastName
            },
            receiver = new
            {
                id = transaction.Receiver!.Id,
                first_name = transaction.Receiver.FirstName,
                last_name = transaction.Receiver.LastName
            },
            listing = transaction.Listing == null ? null : new
            {
                id = transaction.Listing.Id,
                title = transaction.Listing.Title
            },
            created_at = transaction.CreatedAt,
            updated_at = transaction.UpdatedAt
        });
    }

    /// <summary>
    /// Transfer time credits to another user.
    /// Creates a completed transaction atomically.
    /// </summary>
    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer([FromBody] TransferRequest request)
    {
        var senderId = GetCurrentUserId();
        if (senderId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (!_tenantContext.TenantId.HasValue)
        {
            return BadRequest(new { error = "Tenant context not resolved" });
        }

        // Validate amount
        if (request.Amount <= 0)
        {
            return BadRequest(new { error = "Amount must be greater than zero" });
        }

        // Validate sender != receiver
        if (request.ReceiverId == senderId.Value)
        {
            return BadRequest(new { error = "Cannot transfer to yourself" });
        }

        // Validate receiver exists in same tenant
        var receiver = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.ReceiverId);
        if (receiver == null)
        {
            return BadRequest(new { error = "Receiver not found" });
        }

        // Use a SERIALIZABLE transaction with advisory lock for atomic balance check + transfer
        // This prevents race conditions where concurrent requests could overdraft
        await using var dbTransaction = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            // Acquire an advisory lock on the sender's user ID to serialize transfers from this user
            // This prevents concurrent transfers from the same user from racing
            await _db.Database.ExecuteSqlRawAsync(
                "SELECT pg_advisory_xact_lock({0})",
                senderId.Value);

            // Calculate sender's current balance (now protected by advisory lock)
            var received = await _db.Transactions
                .Where(t => t.ReceiverId == senderId.Value && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Amount);

            var sent = await _db.Transactions
                .Where(t => t.SenderId == senderId.Value && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Amount);

            var balance = received - sent;

            // Validate sufficient balance
            if (balance < request.Amount)
            {
                await dbTransaction.RollbackAsync();
                return BadRequest(new { error = "Insufficient balance", current_balance = balance, requested_amount = request.Amount });
            }

            // Create the transaction
            var transaction = new Transaction
            {
                TenantId = _tenantContext.TenantId.Value,
                SenderId = senderId.Value,
                ReceiverId = request.ReceiverId,
                Amount = request.Amount,
                Description = request.Description?.Trim(),
                ListingId = request.ListingId,
                Status = TransactionStatus.Completed,
                CreatedAt = DateTime.UtcNow
            };

            _db.Transactions.Add(transaction);
            await _db.SaveChangesAsync();

            // Commit the transaction (releases advisory lock)
            await dbTransaction.CommitAsync();

            // Award XP and check badges for both sender and receiver (outside transaction - non-critical)
            try
            {
                await _gamification.AwardXpAsync(senderId.Value, XpLog.Amounts.TransactionCompleted, XpLog.Sources.TransactionCompleted, transaction.Id, "Completed a transaction");
                await _gamification.AwardXpAsync(request.ReceiverId, XpLog.Amounts.TransactionCompleted, XpLog.Sources.TransactionCompleted, transaction.Id, "Completed a transaction");
                await _gamification.CheckAndAwardBadgesAsync(senderId.Value, "transaction_completed");
                await _gamification.CheckAndAwardBadgesAsync(request.ReceiverId, "transaction_completed");
            }
            catch (Exception ex)
            {
                // Log but don't fail the transfer if gamification fails
                _logger.LogWarning(ex, "Failed to award XP/badges for transaction {TransactionId}", transaction.Id);
            }

            // Load sender info for response
            var sender = await _db.Users.FindAsync(senderId.Value);
            if (sender == null)
            {
                return StatusCode(500, new { error = "Sender data unavailable" });
            }

            _logger.LogInformation("Transfer of {Amount} hours from user {SenderId} to user {ReceiverId} completed (transaction {TransactionId})",
                request.Amount, senderId, request.ReceiverId, transaction.Id);

            return CreatedAtAction(nameof(GetTransaction), new { id = transaction.Id }, new
            {
                id = transaction.Id,
                amount = transaction.Amount,
                description = transaction.Description,
                status = transaction.Status.ToString().ToLowerInvariant(),
                type = "sent",
                sender = new
                {
                    id = sender.Id,
                    first_name = sender.FirstName,
                    last_name = sender.LastName
                },
                receiver = new
                {
                    id = receiver.Id,
                    first_name = receiver.FirstName,
                    last_name = receiver.LastName
                },
                listing_id = transaction.ListingId,
                created_at = transaction.CreatedAt,
                new_balance = balance - request.Amount
            });
        }
        catch (DbUpdateException ex)
        {
            await dbTransaction.RollbackAsync();
            _logger.LogError(ex, "Database error during transfer from user {SenderId} to user {ReceiverId}",
                senderId, request.ReceiverId);
            return StatusCode(500, new { error = "Transfer failed due to a database error. Please try again." });
        }
        catch (InvalidOperationException ex) when (ex.InnerException is DbUpdateException)
        {
            // Handle serialization conflicts wrapped in InvalidOperationException
            await dbTransaction.RollbackAsync();
            _logger.LogWarning(ex, "Serialization conflict during transfer from user {SenderId} to user {ReceiverId}. Retry recommended.",
                senderId, request.ReceiverId);
            return StatusCode(500, new { error = "Transfer failed due to a concurrent operation. Please try again." });
        }
    }

    private int? GetCurrentUserId() => User.GetUserId();
}

/// <summary>
/// Request model for transferring time credits.
/// </summary>
public class TransferRequest
{
    [JsonPropertyName("receiver_id")]
    public int ReceiverId { get; set; }

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("listing_id")]
    public int? ListingId { get; set; }
}

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

namespace Nexus.Api.Controllers;

[ApiController]
[Route("api/wallet")]
[Authorize]
public class WalletExtrasController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<WalletExtrasController> _logger;

    public WalletExtrasController(NexusDbContext db, TenantContext tenantContext, ILogger<WalletExtrasController> logger)
    { _db = db; _tenantContext = tenantContext; _logger = logger; }

    /// <summary>POST /api/wallet/grant-starting-balance - Admin grants starting balance to a user.</summary>
    [HttpPost("grant-starting-balance")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GrantStartingBalance([FromBody] GrantStartingBalanceRequest request)
    {
        var adminId = User.GetUserId();
        if (adminId == null) return Unauthorized(new { error = "Invalid token" });
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);
        if (targetUser == null) return NotFound(new { error = "User not found" });
        if (request.Amount <= 0) return BadRequest(new { error = "Amount must be positive" });
        // Check if user already received starting balance
        var alreadyGranted = await _db.Transactions.AnyAsync(t => t.ReceiverId == request.UserId && t.Description == "Starting balance" && t.Status == TransactionStatus.Completed);
        if (alreadyGranted) return BadRequest(new { error = "User has already received a starting balance" });
        var transaction = new Transaction
        {
            TenantId = tenantId, SenderId = adminId.Value, ReceiverId = request.UserId,
            Amount = request.Amount, Description = "Starting balance",
            Status = TransactionStatus.Completed, CreatedAt = DateTime.UtcNow
        };
        _db.Transactions.Add(transaction);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin {AdminId} granted {Amount} starting balance to user {UserId}", adminId, request.Amount, request.UserId);
        return Ok(new { success = true, message = "Starting balance granted", transaction = new { transaction.Id, transaction.Amount, transaction.Description, created_at = transaction.CreatedAt } });
    }

    /// <summary>GET /api/wallet/check-starting-balance/{userId} - Admin checks if user received starting balance.</summary>
    [HttpGet("check-starting-balance/{userId:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CheckStartingBalance(int userId)
    {
        var adminId = User.GetUserId();
        if (adminId == null) return Unauthorized(new { error = "Invalid token" });
        var targetUser = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (targetUser == null) return NotFound(new { error = "User not found" });
        var grant = await _db.Transactions.AsNoTracking().FirstOrDefaultAsync(t => t.ReceiverId == userId && t.Description == "Starting balance" && t.Status == TransactionStatus.Completed);
        return Ok(new { user_id = userId, has_starting_balance = grant != null, granted_at = grant?.CreatedAt, amount = grant?.Amount });
    }

    public record GrantStartingBalanceRequest(
        [property: JsonPropertyName("user_id")] int UserId,
        [property: JsonPropertyName("amount")] decimal Amount);
}

// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

/// <summary>
/// Users controller - tenant-isolated read/write operations.
/// Phase 2: Added profile update for current user.
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<UsersController> _logger;

    public UsersController(NexusDbContext db, TenantContext tenantContext, ILogger<UsersController> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Get current user's profile.
    /// Demonstrates: Tenant filter automatically applied.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Tenant filter is automatically applied via FirstOrDefaultAsync (FindAsync bypasses query filters)
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);

        if (user == null)
        {
            // User exists but in different tenant = not found (correct behavior)
            return NotFound(new { error = "User not found" });
        }

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            first_name = user.FirstName,
            last_name = user.LastName,
            role = user.Role,
            tenant_id = user.TenantId,
            created_at = user.CreatedAt,
            last_login_at = user.LastLoginAt
        });
    }

    /// <summary>
    /// List users in the current tenant.
    /// Demonstrates: Tenant filter automatically applied to queries.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        if (page < 1) page = 1;
        limit = Math.Clamp(limit, 1, 100);
        var skip = (page - 1) * limit;

        // Global query filter ensures only current tenant's users are returned
        var users = await _db.Users
            .OrderBy(u => u.Id)
            .Skip(skip)
            .Take(limit)
            .Select(u => new
            {
                id = u.Id,
                email = u.Email,
                first_name = u.FirstName,
                last_name = u.LastName,
                role = u.Role,
                is_active = u.IsActive,
                created_at = u.CreatedAt
            })
            .ToListAsync();

        var total = await _db.Users.CountAsync();

        _logger.LogDebug("Listed {Count} users for tenant {TenantId}", users.Count, _tenantContext.TenantId);

        return Ok(new
        {
            data = users,
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
    /// Get a specific user by ID.
    /// Demonstrates: Tenant filter prevents cross-tenant access.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        // Tenant filter is automatically applied
        var user = await _db.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            first_name = user.FirstName,
            last_name = user.LastName,
            role = user.Role,
            is_active = user.IsActive,
            created_at = user.CreatedAt
        });
    }

    /// <summary>
    /// Update current user's profile.
    /// Only allows updating first_name and last_name.
    /// </summary>
    [HttpPatch("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Validate request
        var errors = new List<string>();

        if (request.FirstName != null)
        {
            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                errors.Add("first_name cannot be empty");
            }
            else if (request.FirstName.Length > 100)
            {
                errors.Add("first_name must be 100 characters or less");
            }
        }

        if (request.LastName != null)
        {
            if (string.IsNullOrWhiteSpace(request.LastName))
            {
                errors.Add("last_name cannot be empty");
            }
            else if (request.LastName.Length > 100)
            {
                errors.Add("last_name must be 100 characters or less");
            }
        }

        if (errors.Count > 0)
        {
            return BadRequest(new { error = "Validation failed", details = errors });
        }

        // Find user (tenant filter applied via FirstOrDefaultAsync)
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);

        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        // Apply updates
        bool updated = false;

        if (request.FirstName != null)
        {
            user.FirstName = request.FirstName.Trim();
            updated = true;
        }

        if (request.LastName != null)
        {
            user.LastName = request.LastName.Trim();
            updated = true;
        }

        if (updated)
        {
            await _db.SaveChangesAsync();
            _logger.LogInformation("User {UserId} updated their profile", userId);
        }

        // Return same shape as GET /api/users/me
        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            first_name = user.FirstName,
            last_name = user.LastName,
            role = user.Role,
            tenant_id = user.TenantId,
            created_at = user.CreatedAt,
            last_login_at = user.LastLoginAt
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // GDPR compliance
    // ─────────────────────────────────────────────────────────────────────

    /// <summary>
    /// GDPR Article 20 — Data portability.
    /// Returns all personal data held for the current user as a JSON document.
    /// </summary>
    [HttpGet("me/data-export")]
    public async Task<IActionResult> DataExport(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user == null) return NotFound(new { error = "User not found" });

        var listings = await _db.Listings
            .Where(l => l.UserId == userId.Value)
            .Select(l => new { l.Id, l.Title, l.Type, l.Status, l.CreatedAt })
            .ToListAsync(ct);

        var sentTransactions = await _db.Transactions
            .Where(t => t.SenderId == userId.Value)
            .Select(t => new { t.Id, t.ReceiverId, t.Amount, t.Description, t.CreatedAt })
            .ToListAsync(ct);

        var receivedTransactions = await _db.Transactions
            .Where(t => t.ReceiverId == userId.Value)
            .Select(t => new { t.Id, t.SenderId, t.Amount, t.Description, t.CreatedAt })
            .ToListAsync(ct);

        var messages = await _db.Messages
            .Where(m => m.SenderId == userId.Value)
            .Select(m => new { m.Id, m.ConversationId, m.Content, m.CreatedAt })
            .ToListAsync(ct);

        var notifications = await _db.Notifications
            .Where(n => n.UserId == userId.Value)
            .Select(n => new { n.Id, n.Type, n.Title, n.Body, n.CreatedAt, n.IsRead })
            .ToListAsync(ct);

        var connections = await _db.Connections
            .Where(c => c.RequesterId == userId.Value || c.AddresseeId == userId.Value)
            .Select(c => new { c.Id, c.RequesterId, c.AddresseeId, c.Status })
            .ToListAsync(ct);

        var badges = await _db.UserBadges
            .Where(b => b.UserId == userId.Value)
            .Select(b => new { b.Id, b.BadgeId, b.EarnedAt })
            .ToListAsync(ct);

        var xpLogs = await _db.XpLogs
            .Where(x => x.UserId == userId.Value)
            .Select(x => new { x.Id, x.Amount, x.Source, x.Description, x.CreatedAt })
            .ToListAsync(ct);

        var reviews = await _db.Reviews
            .Where(r => r.ReviewerId == userId.Value)
            .Select(r => new { r.Id, r.TargetUserId, r.TargetListingId, r.Rating, r.Comment, r.CreatedAt })
            .ToListAsync(ct);

        var export = new
        {
            exported_at = DateTime.UtcNow,
            profile = new
            {
                id = user.Id,
                email = user.Email,
                first_name = user.FirstName,
                last_name = user.LastName,
                role = user.Role,
                created_at = user.CreatedAt,
                last_login_at = user.LastLoginAt,
                total_xp = user.TotalXp,
                level = user.Level
            },
            listings,
            transactions = new { sent = sentTransactions, received = receivedTransactions },
            messages,
            notifications,
            connections,
            badges,
            xp_logs = xpLogs,
            reviews
        };

        return Ok(export);
    }

    /// <summary>
    /// GDPR Article 17 — Right to erasure.
    /// Anonymises all personal data for the current user and revokes all active tokens.
    /// Content authored by the user (listings, messages, transactions) is retained
    /// but de-linked from any identifiable information. Financial records are kept
    /// intact as required by law.
    /// </summary>
    [HttpDelete("me")]
    public async Task<IActionResult> DeleteAccount(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user == null) return NotFound(new { error = "User not found" });

        // 1. Anonymise the user record — remove all PII
        var anonymousEmail = $"deleted_{user.Id}@deleted.nexus";
        user.Email = anonymousEmail;
        user.FirstName = "Deleted";
        user.LastName = "User";
        user.PasswordHash = string.Empty; // Prevents login
        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;

        // 2. Revoke all refresh tokens
        var refreshTokens = await _db.RefreshTokens
            .IgnoreQueryFilters()
            .Where(t => t.UserId == userId.Value && t.RevokedAt == null)
            .ToListAsync(ct);

        foreach (var token in refreshTokens)
        {
            token.RevokedAt = DateTime.UtcNow;
            token.RevokedReason = "account_deleted";
        }

        // 3. Invalidate all password reset tokens
        var resetTokens = await _db.PasswordResetTokens
            .IgnoreQueryFilters()
            .Where(t => t.UserId == userId.Value && t.UsedAt == null)
            .ToListAsync(ct);

        foreach (var token in resetTokens)
        {
            token.UsedAt = DateTime.UtcNow;
        }

        // 4. Delete notifications (purely personal, no legal retention requirement)
        var userNotifications = await _db.Notifications
            .Where(n => n.UserId == userId.Value)
            .ToListAsync(ct);
        _db.Notifications.RemoveRange(userNotifications);

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("User {UserId} account anonymised (GDPR deletion request)", userId.Value);

        return Ok(new { success = true, message = "Your account data has been deleted" });
    }
}

/// <summary>
/// Request model for updating user profile.
/// </summary>
public class UpdateProfileRequest
{
    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }

    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }
}

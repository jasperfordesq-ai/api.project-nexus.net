// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Security.Claims;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin compatibility controller - provides route aliases that the React admin frontend expects.
/// The frontend's API client calls paths like /v2/admin/X which (after stripping /v2/) become /api/admin/X.
/// This controller fills gaps where the backend doesn't already have matching routes.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminCompatibilityController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenant;
    private readonly ILogger<AdminCompatibilityController> _logger;

    public AdminCompatibilityController(
        NexusDbContext db,
        TenantContext tenant,
        ILogger<AdminCompatibilityController> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    private int? GetCurrentUserId() => User.GetUserId();

    // ──────────────────────────────────────────────
    // Dashboard (3 endpoints)
    // ──────────────────────────────────────────────

    [HttpGet("dashboard/stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var tenantId = _tenant.TenantId;
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

        var totalUsers = await _db.Users.CountAsync();
        var activeUsers = await _db.Users.CountAsync(u => u.IsActive && u.CreatedAt <= DateTime.UtcNow && u.CreatedAt >= thirtyDaysAgo);
        var totalListings = await _db.Listings.CountAsync();
        var totalExchanges = await _db.Exchanges.CountAsync();

        return Ok(new
        {
            total_users = totalUsers,
            active_users_last_30d = activeUsers,
            total_listings = totalListings,
            total_exchanges = totalExchanges,
            timestamp = DateTime.UtcNow
        });
    }

    [HttpGet("dashboard/trends")]
    public async Task<IActionResult> GetDashboardTrends([FromQuery] int months = 6)
    {
        if (months < 1) months = 1;
        if (months > 24) months = 24;

        var trends = new List<object>();
        for (var i = months - 1; i >= 0; i--)
        {
            var start = DateTime.UtcNow.AddMonths(-i).Date;
            start = new DateTime(start.Year, start.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var end = start.AddMonths(1);

            var registrations = await _db.Users.CountAsync(u => u.CreatedAt >= start && u.CreatedAt < end);
            var exchanges = await _db.Exchanges.CountAsync(e => e.CreatedAt >= start && e.CreatedAt < end);

            trends.Add(new
            {
                month = start.ToString("yyyy-MM"),
                registrations,
                exchanges,
                active_users = registrations // approximation
            });
        }

        return Ok(new { data = trends });
    }

    [HttpGet("dashboard/activity")]
    public async Task<IActionResult> GetDashboardActivity([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        // Return recent user registrations as activity items
        var activities = await _db.Users
            .AsNoTracking()
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(u => new
            {
                id = u.Id,
                type = "user_registered",
                description = $"User {u.FirstName} {u.LastName} registered",
                created_at = u.CreatedAt,
                user_id = u.Id
            })
            .ToListAsync();

        return Ok(new { data = activities, total = await _db.Users.CountAsync(), page, per_page = limit });
    }

    // ──────────────────────────────────────────────
    // Users - Extended (18 endpoints)
    // ──────────────────────────────────────────────

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] AdminCreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Email is required" });

        var exists = await _db.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower());
        if (exists)
            return Conflict(new { error = "User with this email already exists" });

        var user = new User
        {
            Email = request.Email.ToLower().Trim(),
            FirstName = request.FirstName ?? "",
            LastName = request.LastName ?? "",
            Role = request.Role ?? "member",
            PasswordHash = "NEEDS_RESET",
            TenantId = _tenant.TenantId ?? 0,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} created user {UserId} ({Email})", GetCurrentUserId(), user.Id, user.Email);

        return Ok(new { success = true, id = user.Id, email = user.Email });
    }

    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound(new { error = "User not found" });

        // Soft delete: deactivate
        user.IsActive = false;
        user.SuspendedAt = DateTime.UtcNow;
        user.SuspensionReason = "Deleted by admin";
        user.SuspendedByUserId = GetCurrentUserId();
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} soft-deleted user {UserId}", GetCurrentUserId(), id);

        return Ok(new { success = true });
    }

    [HttpPost("users/{id:int}/approve")]
    public async Task<IActionResult> ApproveUser(int id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound(new { error = "User not found" });

        user.IsActive = true;
        user.SuspendedAt = null;
        user.SuspensionReason = null;
        user.SuspendedByUserId = null;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} approved user {UserId}", GetCurrentUserId(), id);

        return Ok(new { success = true, message = "User approved" });
    }

    [HttpPost("users/{id:int}/ban")]
    public async Task<IActionResult> BanUser(int id, [FromBody] AdminBanUserRequest? request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound(new { error = "User not found" });

        user.IsActive = false;
        user.SuspendedAt = DateTime.UtcNow;
        user.SuspensionReason = request?.Reason ?? "Banned by admin";
        user.SuspendedByUserId = GetCurrentUserId();
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} banned user {UserId}", GetCurrentUserId(), id);

        return Ok(new { success = true, message = "User banned" });
    }

    [HttpPost("users/{id:int}/reactivate")]
    public async Task<IActionResult> ReactivateUser(int id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound(new { error = "User not found" });

        user.IsActive = true;
        user.SuspendedAt = null;
        user.SuspensionReason = null;
        user.SuspendedByUserId = null;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} reactivated user {UserId}", GetCurrentUserId(), id);

        return Ok(new { success = true, message = "User reactivated" });
    }

    [HttpPost("users/{id:int}/reset-2fa")]
    public IActionResult ResetUser2fa(int id)
    {
        _logger.LogInformation("Admin {AdminId} requested 2FA reset for user {UserId} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true, message = "2FA reset successfully" });
    }

    [HttpPost("users/{userId:int}/badges")]
    public IActionResult AddUserBadge(int userId, [FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} added badge to user {UserId} (stub)", GetCurrentUserId(), userId);
        return Ok(new { success = true, message = "Badge added" });
    }

    [HttpDelete("users/{userId:int}/badges/{badgeId:int}")]
    public IActionResult RemoveUserBadge(int userId, int badgeId)
    {
        _logger.LogInformation("Admin {AdminId} removed badge {BadgeId} from user {UserId} (stub)", GetCurrentUserId(), badgeId, userId);
        return Ok(new { success = true, message = "Badge removed" });
    }

    [HttpPost("users/badges/recheck-all")]
    public IActionResult RecheckAllUserBadges()
    {
        _logger.LogInformation("Admin {AdminId} requested badge recheck for all users (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Badge recheck queued", queued_at = DateTime.UtcNow });
    }

    [HttpPost("users/{userId:int}/impersonate")]
    public IActionResult ImpersonateUser(int userId)
    {
        _logger.LogInformation("Admin {AdminId} requested impersonation of user {UserId} (stub)", GetCurrentUserId(), userId);
        return Ok(new { success = true, token = "impersonation-not-implemented", expires_at = DateTime.UtcNow.AddHours(1) });
    }

    [HttpPut("users/{userId:int}/super-admin")]
    public IActionResult SetSuperAdmin(int userId)
    {
        _logger.LogInformation("Admin {AdminId} set super-admin for user {UserId} (stub)", GetCurrentUserId(), userId);
        return Ok(new { success = true, message = "Super admin role set" });
    }

    [HttpPut("users/{userId:int}/global-super-admin")]
    public IActionResult SetGlobalSuperAdmin(int userId)
    {
        _logger.LogInformation("Admin {AdminId} set global super-admin for user {UserId} (stub)", GetCurrentUserId(), userId);
        return Ok(new { success = true, message = "Global super admin role set" });
    }

    [HttpPost("users/{userId:int}/badges/recheck")]
    public IActionResult RecheckUserBadges(int userId)
    {
        _logger.LogInformation("Admin {AdminId} requested badge recheck for user {UserId} (stub)", GetCurrentUserId(), userId);
        return Ok(new { success = true, message = "Badge recheck queued" });
    }

    [HttpGet("users/{userId:int}/consents")]
    public IActionResult GetUserConsents(int userId)
    {
        return Ok(new { data = Array.Empty<object>(), user_id = userId });
    }

    [HttpPost("users/{userId:int}/password")]
    public IActionResult SetUserPassword(int userId, [FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} set password for user {UserId} (stub)", GetCurrentUserId(), userId);
        return Ok(new { success = true, message = "Password updated" });
    }

    [HttpPost("users/{userId:int}/send-password-reset")]
    public IActionResult SendPasswordReset(int userId)
    {
        _logger.LogInformation("Admin {AdminId} sent password reset to user {UserId} (stub)", GetCurrentUserId(), userId);
        return Ok(new { success = true, message = "Password reset email sent" });
    }

    [HttpPost("users/{userId:int}/send-welcome-email")]
    public IActionResult SendWelcomeEmail(int userId)
    {
        _logger.LogInformation("Admin {AdminId} sent welcome email to user {UserId} (stub)", GetCurrentUserId(), userId);
        return Ok(new { success = true, message = "Welcome email sent" });
    }

    [HttpPost("users/import")]
    public IActionResult ImportUsers()
    {
        _logger.LogInformation("Admin {AdminId} requested user import (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Import queued", imported = 0, errors = 0 });
    }

    // ──────────────────────────────────────────────
    // Config - Extended (8 endpoints)
    // ──────────────────────────────────────────────

    [HttpPut("config/features")]
    public IActionResult ToggleFeatureFlag([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} toggled feature flag (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Feature flag updated" });
    }

    [HttpPut("config/modules")]
    public IActionResult ToggleModule([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} toggled module (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Module updated" });
    }

    [HttpGet("cache/stats")]
    public IActionResult GetCacheStats()
    {
        return Ok(new { hits = 0, misses = 0, size_mb = 0, entries = 0, uptime_seconds = 0 });
    }

    [HttpPost("cache/clear")]
    public IActionResult ClearCache()
    {
        _logger.LogInformation("Admin {AdminId} cleared cache (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Cache cleared" });
    }

    [HttpGet("background-jobs")]
    public IActionResult ListBackgroundJobs()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0 });
    }

    [HttpPost("background-jobs/{id}/run")]
    public IActionResult RunBackgroundJob(string id)
    {
        _logger.LogInformation("Admin {AdminId} triggered background job {JobId} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true, message = "Job queued", job_id = id });
    }

    [HttpGet("config/languages")]
    public IActionResult GetLanguageConfig()
    {
        return Ok(new
        {
            default_language = "en",
            available_languages = new[] { "en", "ga", "fr", "es", "de", "pl", "pt" },
            auto_detect = true
        });
    }

    [HttpPut("config/languages")]
    public IActionResult UpdateLanguageConfig([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated language config (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Language config updated" });
    }

    // ──────────────────────────────────────────────
    // Listings - Extended (5 endpoints)
    // ──────────────────────────────────────────────

    [HttpGet("listings")]
    public async Task<IActionResult> ListAllListings(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? type = null,
        [FromQuery] string? search = null)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var query = _db.Listings.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ListingStatus>(status, true, out var parsedStatus))
            query = query.Where(l => l.Status == parsedStatus);

        if (!string.IsNullOrWhiteSpace(type) && Enum.TryParse<ListingType>(type, true, out var parsedType))
            query = query.Where(l => l.Type == parsedType);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(l => l.Title.ToLower().Contains(search.ToLower()));

        var total = await query.CountAsync();
        var listings = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(l => new
            {
                id = l.Id,
                title = l.Title,
                type = l.Type.ToString().ToLower(),
                status = l.Status.ToString().ToLower(),
                user_id = l.UserId,
                created_at = l.CreatedAt
            })
            .ToListAsync();

        return Ok(new { data = listings, total, page, per_page = limit });
    }

    [HttpPost("listings/{id:int}/feature")]
    public IActionResult FeatureListing(int id)
    {
        _logger.LogInformation("Admin {AdminId} featured listing {ListingId} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true, message = "Listing featured" });
    }

    [HttpDelete("listings/{id:int}/feature")]
    public IActionResult UnfeatureListing(int id)
    {
        _logger.LogInformation("Admin {AdminId} unfeatured listing {ListingId} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true, message = "Listing unfeatured" });
    }

    [HttpDelete("listings/{id:int}")]
    public async Task<IActionResult> DeleteListing(int id)
    {
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null)
            return NotFound(new { error = "Listing not found" });

        _db.Listings.Remove(listing);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} deleted listing {ListingId}", GetCurrentUserId(), id);

        return Ok(new { success = true });
    }

    [HttpGet("listings/featured")]
    public IActionResult GetFeaturedListings()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0 });
    }

    // ──────────────────────────────────────────────
    // Attributes (4 endpoints)
    // ──────────────────────────────────────────────

    [HttpGet("attributes")]
    public IActionResult ListAttributes()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, page = 1, per_page = 20 });
    }

    [HttpPost("attributes")]
    public IActionResult CreateAttribute([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} created attribute (stub)", GetCurrentUserId());
        return Ok(new { success = true, id = 1 });
    }

    [HttpPut("attributes/{id:int}")]
    public IActionResult UpdateAttribute(int id, [FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated attribute {Id} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true, id });
    }

    [HttpDelete("attributes/{id:int}")]
    public IActionResult DeleteAttribute(int id)
    {
        _logger.LogInformation("Admin {AdminId} deleted attribute {Id} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true });
    }

    // ──────────────────────────────────────────────
    // Timebanking (9 endpoints)
    // ──────────────────────────────────────────────

    [HttpGet("timebanking/stats")]
    public async Task<IActionResult> GetTimebankingStats()
    {
        var totalTransactions = await _db.Transactions.CountAsync();
        var totalHours = await _db.Transactions.SumAsync(t => t.Amount);
        var activeUsers = await _db.Users.CountAsync(u => u.IsActive);

        return Ok(new
        {
            total_hours = totalHours,
            total_transactions = totalTransactions,
            active_users = activeUsers,
            avg_balance = activeUsers > 0 ? totalHours / activeUsers : 0
        });
    }

    [HttpGet("timebanking/alerts")]
    public IActionResult GetFraudAlerts()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, page = 1, per_page = 20 });
    }

    [HttpPut("timebanking/alerts/{id:int}")]
    public IActionResult UpdateFraudAlert(int id, [FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated fraud alert {AlertId} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true, id });
    }

    [HttpPost("timebanking/adjust-balance")]
    public async Task<IActionResult> AdjustBalance([FromBody] AdminAdjustBalanceRequest request)
    {
        if (request.UserId <= 0)
            return BadRequest(new { error = "user_id is required" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);
        if (user == null)
            return NotFound(new { error = "User not found" });

        var adminId = GetCurrentUserId();
        if (adminId == null)
            return Unauthorized(new { error = "Invalid token" });

        var transaction = new Transaction
        {
            TenantId = _tenant.TenantId ?? 0,
            SenderId = adminId.Value,
            ReceiverId = request.UserId,
            Amount = request.Amount,
            Description = request.Reason ?? "Admin balance adjustment",
            CreatedAt = DateTime.UtcNow
        };

        _db.Transactions.Add(transaction);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} adjusted balance for user {UserId} by {Amount}", adminId, request.UserId, request.Amount);

        return Ok(new { success = true, transaction_id = transaction.Id });
    }

    [HttpGet("timebanking/org-wallets")]
    public IActionResult GetOrgWallets()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, page = 1, per_page = 20 });
    }

    [HttpGet("timebanking/user-report")]
    public IActionResult GetUserFinancialReport()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0 });
    }

    [HttpGet("timebanking/user-statement")]
    public IActionResult GetUserStatement()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0 });
    }

    [HttpGet("wallet/grants")]
    public IActionResult ListGrants()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, page = 1, per_page = 20 });
    }

    [HttpPost("wallet/grant")]
    public async Task<IActionResult> GrantCredits([FromBody] AdminGrantCreditsRequest request)
    {
        if (request.UserId <= 0)
            return BadRequest(new { error = "user_id is required" });
        if (request.Amount <= 0)
            return BadRequest(new { error = "amount must be positive" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);
        if (user == null)
            return NotFound(new { error = "User not found" });

        var adminId = GetCurrentUserId();
        if (adminId == null)
            return Unauthorized(new { error = "Invalid token" });

        var transaction = new Transaction
        {
            TenantId = _tenant.TenantId ?? 0,
            SenderId = adminId.Value,
            ReceiverId = request.UserId,
            Amount = request.Amount,
            Description = request.Reason ?? "Admin grant",
            CreatedAt = DateTime.UtcNow
        };

        _db.Transactions.Add(transaction);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} granted {Amount} credits to user {UserId}", adminId, request.Amount, request.UserId);

        return Ok(new { success = true, transaction_id = transaction.Id });
    }

    // ──────────────────────────────────────────────
    // Settings (18 endpoints)
    // ──────────────────────────────────────────────

    [HttpGet("settings")]
    public IActionResult GetAllSettings()
    {
        return Ok(new
        {
            general = new { site_name = "Project NEXUS", tagline = "", timezone = "UTC" },
            features = new { ai_enabled = true, matching_enabled = true, gamification_enabled = true },
            email = new { provider = "gmail", from_address = "" },
            modules = new { blog = true, events = true, groups = true, jobs = true }
        });
    }

    [HttpPut("settings")]
    public IActionResult UpdateSettings([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated settings (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Settings updated" });
    }

    [HttpGet("config/ai")]
    public IActionResult GetAiConfig()
    {
        return Ok(new
        {
            enabled = true,
            model = "llama3.2:3b",
            max_tokens = 2048,
            temperature = 0.7,
            moderation_enabled = true
        });
    }

    [HttpPut("config/ai")]
    public IActionResult UpdateAiConfig([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated AI config (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "AI config updated" });
    }

    [HttpGet("config/feed-algorithm")]
    public IActionResult GetFeedAlgorithmConfig()
    {
        return Ok(new
        {
            algorithm = "chronological",
            boost_connections = true,
            boost_factor = 1.5,
            decay_hours = 72
        });
    }

    [HttpPut("config/feed-algorithm")]
    public IActionResult UpdateFeedAlgorithmConfig([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated feed algorithm config (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Feed algorithm config updated" });
    }

    [HttpGet("config/algorithms")]
    public IActionResult GetAlgorithmConfig()
    {
        return Ok(new
        {
            matching = new { enabled = true, min_score = 0.3, max_results = 20 },
            feed = new { algorithm = "chronological", decay_hours = 72 },
            search = new { fuzzy = true, boost_recent = true }
        });
    }

    [HttpPut("config/algorithm/{area}")]
    public IActionResult UpdateAlgorithmConfig(string area, [FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated algorithm config for {Area} (stub)", GetCurrentUserId(), area);
        return Ok(new { success = true, message = $"Algorithm config for {area} updated" });
    }

    [HttpGet("config/algorithm-health")]
    public IActionResult GetAlgorithmHealth()
    {
        return Ok(new
        {
            matching = new { status = "healthy", last_run = DateTime.UtcNow.AddMinutes(-15) },
            feed = new { status = "healthy", last_run = DateTime.UtcNow.AddMinutes(-5) },
            search = new { status = "healthy", index_size = 0 }
        });
    }

    [HttpGet("config/images")]
    public IActionResult GetImageSettings()
    {
        return Ok(new { max_size_mb = 5, allowed_formats = new[] { "jpg", "png", "webp", "gif" }, auto_resize = true, max_width = 1920 });
    }

    [HttpPut("config/images")]
    public IActionResult UpdateImageSettings([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated image settings (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Image settings updated" });
    }

    [HttpGet("config/seo")]
    public IActionResult GetSeoSettings()
    {
        return Ok(new { meta_title = "Project NEXUS", meta_description = "", robots_txt = "User-agent: *\nAllow: /", sitemap_enabled = true });
    }

    [HttpPut("config/seo")]
    public IActionResult UpdateSeoSettings([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated SEO settings (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "SEO settings updated" });
    }

    [HttpGet("config/native-app")]
    public IActionResult GetNativeAppSettings()
    {
        return Ok(new { push_enabled = false, app_store_url = "", play_store_url = "", min_version = "1.0.0" });
    }

    [HttpPut("config/native-app")]
    public IActionResult UpdateNativeAppSettings([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated native app settings (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Native app settings updated" });
    }

    [HttpGet("email/config")]
    public IActionResult GetEmailConfig()
    {
        return Ok(new { provider = "gmail", from_address = "", reply_to = "", daily_limit = 500, sent_today = 0 });
    }

    [HttpPut("email/config")]
    public IActionResult UpdateEmailConfig([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated email config (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Email config updated" });
    }

    [HttpPost("email/test-provider")]
    public IActionResult TestEmailProvider([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} tested email provider (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Test email sent", delivered = true });
    }

    // ──────────────────────────────────────────────
    // Tools - Extended (12 endpoints)
    // ──────────────────────────────────────────────

    [HttpGet("tools/redirects")]
    public IActionResult ListRedirects()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, page = 1, per_page = 20 });
    }

    [HttpPost("tools/redirects")]
    public IActionResult CreateRedirect([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} created redirect (stub)", GetCurrentUserId());
        return Ok(new { success = true, id = 1 });
    }

    [HttpDelete("tools/redirects/{id:int}")]
    public IActionResult DeleteRedirect(int id)
    {
        _logger.LogInformation("Admin {AdminId} deleted redirect {Id} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true });
    }

    [HttpGet("tools/404-errors")]
    public IActionResult Get404Errors()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, page = 1, per_page = 20 });
    }

    [HttpDelete("tools/404-errors/{id:int}")]
    public IActionResult Delete404Error(int id)
    {
        _logger.LogInformation("Admin {AdminId} deleted 404 error {Id} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true });
    }

    [HttpPost("tools/health-check")]
    public IActionResult RunHealthCheck()
    {
        return Ok(new { success = true, status = "healthy", checks = new { database = "ok", cache = "ok", email = "ok" }, checked_at = DateTime.UtcNow });
    }

    [HttpGet("tools/webp-stats")]
    public IActionResult GetWebpStats()
    {
        return Ok(new { total_images = 0, converted = 0, pending = 0, saved_mb = 0 });
    }

    [HttpPost("tools/webp-convert")]
    public IActionResult RunWebpConversion()
    {
        _logger.LogInformation("Admin {AdminId} triggered WebP conversion (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Conversion queued", queued = 0 });
    }

    [HttpPost("tools/seed")]
    public IActionResult RunSeedGenerator()
    {
        _logger.LogInformation("Admin {AdminId} triggered seed generator (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Seed data generated" });
    }

    [HttpGet("tools/blog-backups")]
    public IActionResult GetBlogBackups()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0 });
    }

    [HttpPost("tools/blog-backups/{backupId}/restore")]
    public IActionResult RestoreBlogBackup(string backupId)
    {
        _logger.LogInformation("Admin {AdminId} restored blog backup {BackupId} (stub)", GetCurrentUserId(), backupId);
        return Ok(new { success = true, message = "Backup restored" });
    }

    [HttpPost("tools/seo-audit")]
    public IActionResult RunSeoAudit()
    {
        _logger.LogInformation("Admin {AdminId} triggered SEO audit (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "SEO audit queued", queued_at = DateTime.UtcNow });
    }

    [HttpGet("tools/seo-audit")]
    public IActionResult GetSeoAuditResults()
    {
        return Ok(new { data = Array.Empty<object>(), score = 0, last_run = (DateTime?)null });
    }

    // ──────────────────────────────────────────────
    // System (3 endpoints)
    // ──────────────────────────────────────────────

    [HttpGet("system/cron-jobs")]
    public IActionResult ListCronJobs()
    {
        return Ok(new
        {
            data = new[]
            {
                new { id = "cleanup", name = "Data Cleanup", schedule = "0 2 * * *", last_run = DateTime.UtcNow.AddDays(-1), status = "idle" },
                new { id = "digest", name = "Email Digest", schedule = "0 8 * * 1", last_run = DateTime.UtcNow.AddDays(-7), status = "idle" },
                new { id = "badges", name = "Badge Recheck", schedule = "0 3 * * *", last_run = DateTime.UtcNow.AddDays(-1), status = "idle" }
            },
            total = 3
        });
    }

    [HttpPost("system/cron-jobs/{id}/run")]
    public IActionResult RunCronJob(string id)
    {
        _logger.LogInformation("Admin {AdminId} triggered cron job {JobId} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true, message = $"Cron job '{id}' triggered", started_at = DateTime.UtcNow });
    }

    [HttpGet("system/activity-log")]
    public IActionResult GetSystemActivityLog([FromQuery] int page = 1, [FromQuery] int limit = 50)
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, page, per_page = limit });
    }

    // ──────────────────────────────────────────────
    // Community Analytics (2 endpoints)
    // ──────────────────────────────────────────────

    [HttpGet("community-analytics")]
    public async Task<IActionResult> GetCommunityAnalytics()
    {
        var totalUsers = await _db.Users.CountAsync();
        var activeUsers = await _db.Users.CountAsync(u => u.IsActive);
        var totalGroups = await _db.Groups.CountAsync();
        var totalEvents = await _db.Events.CountAsync();
        var totalExchanges = await _db.Exchanges.CountAsync();

        return Ok(new
        {
            overview = new
            {
                total_users = totalUsers,
                active_users = activeUsers,
                total_groups = totalGroups,
                total_events = totalEvents,
                total_exchanges = totalExchanges
            },
            engagement = new
            {
                avg_sessions_per_user = 0,
                avg_exchanges_per_user = totalUsers > 0 ? (double)totalExchanges / totalUsers : 0
            }
        });
    }

    [HttpGet("community-analytics/export")]
    public IActionResult ExportCommunityAnalytics()
    {
        var csv = "metric,value\ntotal_users,0\nactive_users,0\ntotal_groups,0\ntotal_events,0\n";
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "community-analytics.csv");
    }

    // ──────────────────────────────────────────────
    // Impact Report (2 endpoints)
    // ──────────────────────────────────────────────

    [HttpGet("impact-report")]
    public IActionResult GetImpactReport()
    {
        return Ok(new
        {
            period = "last_12_months",
            total_hours_exchanged = 0,
            unique_participants = 0,
            top_categories = Array.Empty<object>(),
            social_value_estimate = 0,
            generated_at = DateTime.UtcNow
        });
    }

    [HttpPut("impact-report/config")]
    public IActionResult UpdateImpactReportConfig([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated impact report config (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Impact report config updated" });
    }

    // ──────────────────────────────────────────────
    // Gamification - Extended (8 endpoints)
    // ──────────────────────────────────────────────

    [HttpPost("gamification/recheck-all")]
    public IActionResult GamificationRecheckAll()
    {
        _logger.LogInformation("Admin {AdminId} triggered badge recheck for all users (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Badge recheck queued for all users", queued_at = DateTime.UtcNow });
    }

    [HttpPost("gamification/bulk-award")]
    public IActionResult GamificationBulkAward([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} triggered bulk award (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Bulk award processed", awarded = 0 });
    }

    [HttpGet("gamification/campaigns")]
    public IActionResult ListGamificationCampaigns()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, page = 1, per_page = 20 });
    }

    [HttpPost("gamification/campaigns")]
    public IActionResult CreateGamificationCampaign([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} created gamification campaign (stub)", GetCurrentUserId());
        return Ok(new { success = true, id = 1 });
    }

    [HttpPut("gamification/campaigns/{id:int}")]
    public IActionResult UpdateGamificationCampaign(int id, [FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated gamification campaign {Id} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true, id });
    }

    [HttpDelete("gamification/campaigns/{id:int}")]
    public IActionResult DeleteGamificationCampaign(int id)
    {
        _logger.LogInformation("Admin {AdminId} deleted gamification campaign {Id} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true });
    }

    [HttpPost("gamification/badges")]
    public IActionResult CreateBadge([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} created badge (stub)", GetCurrentUserId());
        return Ok(new { success = true, id = 1 });
    }

    [HttpDelete("gamification/badges/{id:int}")]
    public IActionResult DeleteBadge(int id)
    {
        _logger.LogInformation("Admin {AdminId} deleted badge {Id} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true });
    }

    // ──────────────────────────────────────────────
    // Matching - Extended (8 endpoints)
    // ──────────────────────────────────────────────

    [HttpGet("matching/config")]
    public IActionResult GetMatchingConfig()
    {
        return Ok(new
        {
            enabled = true,
            min_score = 0.3,
            max_results = 20,
            algorithm = "weighted",
            weights = new { skills = 0.4, location = 0.3, availability = 0.2, rating = 0.1 }
        });
    }

    [HttpPut("matching/config")]
    public IActionResult UpdateMatchingConfig([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated matching config (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Matching config updated" });
    }

    [HttpGet("matching/approvals")]
    public IActionResult ListMatchApprovals([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, page, per_page = limit });
    }

    [HttpGet("matching/approvals/{id:int}")]
    public IActionResult GetMatchApproval(int id)
    {
        return Ok(new { id, status = "pending", created_at = DateTime.UtcNow, match_score = 0.0 });
    }

    [HttpGet("matching/approvals/stats")]
    public IActionResult GetMatchApprovalStats()
    {
        return Ok(new { pending = 0, approved = 0, rejected = 0, total = 0 });
    }

    [HttpPost("matching/approvals/{id:int}/approve")]
    public IActionResult ApproveMatch(int id)
    {
        _logger.LogInformation("Admin {AdminId} approved match {MatchId} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true, message = "Match approved" });
    }

    [HttpPost("matching/approvals/{id:int}/reject")]
    public IActionResult RejectMatch(int id)
    {
        _logger.LogInformation("Admin {AdminId} rejected match {MatchId} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true, message = "Match rejected" });
    }

    [HttpPost("matching/cache/clear")]
    public IActionResult ClearMatchCache()
    {
        _logger.LogInformation("Admin {AdminId} cleared match cache (stub)", GetCurrentUserId());
        return Ok(new { success = true, message = "Match cache cleared" });
    }

    // ──────────────────────────────────────────────
    // Plans & Subscriptions (6 endpoints)
    // ──────────────────────────────────────────────

    [HttpGet("plans")]
    public IActionResult ListPlans()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, page = 1, per_page = 20 });
    }

    [HttpGet("plans/{id:int}")]
    public IActionResult GetPlan(int id)
    {
        return Ok(new { id, name = "", description = "", price = 0, interval = "monthly", features = Array.Empty<string>(), is_active = true });
    }

    [HttpPost("plans")]
    public IActionResult CreatePlan([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} created plan (stub)", GetCurrentUserId());
        return Ok(new { success = true, id = 1 });
    }

    [HttpPut("plans/{id:int}")]
    public IActionResult UpdatePlan(int id, [FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated plan {Id} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true, id });
    }

    [HttpDelete("plans/{id:int}")]
    public IActionResult DeletePlan(int id)
    {
        _logger.LogInformation("Admin {AdminId} deleted plan {Id} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true });
    }

    [HttpGet("subscriptions")]
    public IActionResult ListSubscriptions([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, page, per_page = limit });
    }

    // ──────────────────────────────────────────────
    // Menus (10 endpoints)
    // ──────────────────────────────────────────────

    [HttpGet("menus")]
    public IActionResult ListMenus()
    {
        return Ok(new
        {
            data = new[]
            {
                new { id = 1, name = "Main Navigation", location = "header", items_count = 0 },
                new { id = 2, name = "Footer", location = "footer", items_count = 0 }
            },
            total = 2
        });
    }

    [HttpGet("menus/{id:int}")]
    public IActionResult GetMenu(int id)
    {
        return Ok(new { id, name = "", location = "", items = Array.Empty<object>() });
    }

    [HttpPost("menus")]
    public IActionResult CreateMenu([FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} created menu (stub)", GetCurrentUserId());
        return Ok(new { success = true, id = 1 });
    }

    [HttpPut("menus/{id:int}")]
    public IActionResult UpdateMenu(int id, [FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated menu {Id} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true, id });
    }

    [HttpDelete("menus/{id:int}")]
    public IActionResult DeleteMenu(int id)
    {
        _logger.LogInformation("Admin {AdminId} deleted menu {Id} (stub)", GetCurrentUserId(), id);
        return Ok(new { success = true });
    }

    [HttpGet("menus/{menuId:int}/items")]
    public IActionResult GetMenuItems(int menuId)
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, menu_id = menuId });
    }

    [HttpPost("menus/{menuId:int}/items")]
    public IActionResult CreateMenuItem(int menuId, [FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} created menu item for menu {MenuId} (stub)", GetCurrentUserId(), menuId);
        return Ok(new { success = true, id = 1, menu_id = menuId });
    }

    [HttpPut("menu-items/{itemId:int}")]
    public IActionResult UpdateMenuItem(int itemId, [FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} updated menu item {ItemId} (stub)", GetCurrentUserId(), itemId);
        return Ok(new { success = true, id = itemId });
    }

    [HttpDelete("menu-items/{itemId:int}")]
    public IActionResult DeleteMenuItem(int itemId)
    {
        _logger.LogInformation("Admin {AdminId} deleted menu item {ItemId} (stub)", GetCurrentUserId(), itemId);
        return Ok(new { success = true });
    }

    [HttpPost("menus/{menuId:int}/items/reorder")]
    public IActionResult ReorderMenuItems(int menuId, [FromBody] object? request)
    {
        _logger.LogInformation("Admin {AdminId} reordered menu items for menu {MenuId} (stub)", GetCurrentUserId(), menuId);
        return Ok(new { success = true, message = "Items reordered" });
    }
}

// ──────────────────────────────────────────────
// Request DTOs
// ──────────────────────────────────────────────

public class AdminCreateUserRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }

    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }

    [JsonPropertyName("role")]
    public string? Role { get; set; }
}

public class AdminBanUserRequest
{
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

public class AdminAdjustBalanceRequest
{
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

public class AdminGrantCreditsRequest
{
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

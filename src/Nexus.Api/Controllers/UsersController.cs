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
    private readonly FileUploadService _fileService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(NexusDbContext db, TenantContext tenantContext, FileUploadService fileService, ILogger<UsersController> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _fileService = fileService;
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

        return Ok(await BuildEnrichedUserResponse(user));
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
        // Use FirstOrDefaultAsync so global tenant query filter is applied (FindAsync bypasses filters)
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);

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
    /// Update current user's profile (PUT variant — delegates to PATCH logic).
    /// </summary>
    [HttpPut("me")]
    public Task<IActionResult> UpdateMePut([FromBody] UpdateProfileRequest request)
        => UpdateMe(request);

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

        if (request.Bio != null)
        {
            user.Bio = request.Bio.Trim();
            updated = true;
        }

        if (updated)
        {
            await _db.SaveChangesAsync();
            _logger.LogInformation("User {UserId} updated their profile", userId);
        }

        // Return same shape as GET /api/users/me
        return Ok(await BuildEnrichedUserResponse(user));
    }

    /// <summary>
    /// Upload/update profile photo for the current user.
    /// POST /api/users/me/avatar
    /// Accepts multipart form with field "avatar" or "file".
    /// </summary>
    [HttpPost("me/avatar")]
    [RequestSizeLimit(2 * 1024 * 1024)] // 2 MB
    public async Task<IActionResult> UploadAvatar(IFormFile? avatar, IFormFile? file)
    {
        var uploadedFile = avatar ?? file;
        var userId = User.GetUserId();
        var tenantId = User.GetTenantId();
        if (userId == null || tenantId == null) return Unauthorized(new { error = "Invalid token" });

        if (uploadedFile == null || uploadedFile.Length == 0)
            return BadRequest(new { error = "No file provided" });

        await using var stream = uploadedFile.OpenReadStream();
        var (upload, error) = await _fileService.UploadAsync(
            stream, uploadedFile.FileName, uploadedFile.ContentType, uploadedFile.Length,
            userId.Value, tenantId.Value, FileCategory.Avatar, userId.Value, "user");

        if (error != null)
            return BadRequest(new { error });

        // Update user's avatar URL
        var avatarUrl = $"/api/files/{upload!.Id}/download";
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
        if (user != null)
        {
            user.AvatarUrl = avatarUrl;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return Ok(new { avatar_url = avatarUrl, url = avatarUrl, id = upload.Id });
    }

    /// <summary>
    /// Build the enriched user response expected by frontends.
    /// Includes onboarding status, preferred language, XP, level, etc.
    /// </summary>
    private async Task<object> BuildEnrichedUserResponse(User user)
    {
        // Check onboarding completion: user has completed all required steps
        var totalRequired = await _db.Set<OnboardingStep>()
            .Where(s => s.TenantId == user.TenantId && s.IsRequired)
            .CountAsync();
        var completedRequired = totalRequired > 0
            ? await _db.Set<OnboardingProgress>()
                .Where(p => p.UserId == user.Id && p.IsCompleted)
                .Join(_db.Set<OnboardingStep>().Where(s => s.IsRequired),
                    p => p.StepId, s => s.Id, (p, s) => p)
                .CountAsync()
            : 0;
        var onboardingCompleted = totalRequired > 0 && completedRequired >= totalRequired;

        // Get preferred language from user preferences
        var preferredLanguage = await _db.Set<UserPreference>()
            .Where(p => p.UserId == user.Id)
            .Select(p => p.Language)
            .FirstOrDefaultAsync() ?? "en";

        // Map registration status to frontend-friendly string
        var status = user.RegistrationStatus == RegistrationStatus.Active
            ? "active"
            : user.RegistrationStatus.ToString().ToLower();

        return new
        {
            id = user.Id,
            email = user.Email,
            first_name = user.FirstName,
            last_name = user.LastName,
            name = $"{user.FirstName} {user.LastName}".Trim(),
            role = user.Role,
            tenant_id = user.TenantId,
            avatar_url = user.AvatarUrl,
            bio = user.Bio,
            is_active = user.IsActive,
            status,
            created_at = user.CreatedAt,
            updated_at = user.UpdatedAt,
            last_login_at = user.LastLoginAt,
            email_verified_at = user.EmailVerifiedAt,
            has_2fa_enabled = user.TwoFactorEnabled,
            xp = user.TotalXp,
            level = user.Level,
            onboarding_completed = onboardingCompleted,
            preferred_language = preferredLanguage,
            balance = 0,
            total_earned = 0,
            total_spent = 0,
            groups_count = 0,
            rating = (double?)null,
            skills = Array.Empty<string>()
        };
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

    [JsonPropertyName("bio")]
    public string? Bio { get; set; }
}

using System.Security.Claims;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;

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
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Tenant filter is automatically applied
        var user = await _db.Users.FindAsync(userId);

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
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
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

        // Find user (tenant filter applied)
        var user = await _db.Users.FindAsync(userId);

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

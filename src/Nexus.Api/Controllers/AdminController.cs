using System.Security.Claims;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Contracts.Events;
using Nexus.Messaging;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin controller - tenant-scoped administrative operations.
/// Requires "admin" role for all endpoints.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly IEventPublisher _eventPublisher;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        NexusDbContext db,
        TenantContext tenantContext,
        IEventPublisher eventPublisher,
        ILogger<AdminController> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _eventPublisher = eventPublisher;
        _logger = logger;
    }

    private int? GetCurrentUserId() => User.GetUserId();

    #region Dashboard

    /// <summary>
    /// Get admin dashboard metrics.
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

        var userCount = await _db.Users.CountAsync();
        var activeUserCount = await _db.Users.CountAsync(u => u.IsActive);
        var newUsersLast30Days = await _db.Users.CountAsync(u => u.CreatedAt >= thirtyDaysAgo);

        var listingCount = await _db.Listings.CountAsync();
        var activeListingCount = await _db.Listings.CountAsync(l => l.Status == ListingStatus.Active);
        var pendingListingCount = await _db.Listings.CountAsync(l => l.Status == ListingStatus.Pending);

        var transactionCount = await _db.Transactions.CountAsync();
        var transactionsLast30Days = await _db.Transactions.CountAsync(t => t.CreatedAt >= thirtyDaysAgo);
        var totalCreditsTransferred = await _db.Transactions
            .Where(t => t.Status == TransactionStatus.Completed)
            .SumAsync(t => t.Amount);

        var categoryCount = await _db.Categories.CountAsync();
        var groupCount = await _db.Groups.CountAsync();
        var eventCount = await _db.Events.CountAsync(e => !e.IsCancelled);

        return Ok(new
        {
            users = new
            {
                total = userCount,
                active = activeUserCount,
                suspended = userCount - activeUserCount,
                new_last_30_days = newUsersLast30Days
            },
            listings = new
            {
                total = listingCount,
                active = activeListingCount,
                pending_review = pendingListingCount
            },
            transactions = new
            {
                total = transactionCount,
                last_30_days = transactionsLast30Days,
                total_credits_transferred = totalCreditsTransferred
            },
            community = new
            {
                categories = categoryCount,
                groups = groupCount,
                upcoming_events = eventCount
            }
        });
    }

    #endregion

    #region User Management

    /// <summary>
    /// List all users with filtering and pagination.
    /// </summary>
    [HttpGet("users")]
    public async Task<IActionResult> ListUsers(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? role = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        limit = Math.Clamp(limit, 1, 100);
        var skip = (page - 1) * limit;

        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrEmpty(role))
        {
            query = query.Where(u => u.Role == role);
        }

        if (!string.IsNullOrEmpty(status))
        {
            var isActive = status.ToLower() == "active";
            query = query.Where(u => u.IsActive == isActive);
        }

        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(u =>
                u.Email.ToLower().Contains(searchLower) ||
                u.FirstName.ToLower().Contains(searchLower) ||
                u.LastName.ToLower().Contains(searchLower));
        }

        var total = await query.CountAsync();

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
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
                created_at = u.CreatedAt,
                last_login_at = u.LastLoginAt,
                suspended_at = u.SuspendedAt,
                suspension_reason = u.SuspensionReason
            })
            .ToListAsync();

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
    /// Get user details with activity stats.
    /// </summary>
    [HttpGet("users/{id:int}")]
    public async Task<IActionResult> GetUser(int id)
    {
        var user = await _db.Users
            .Where(u => u.Id == id)
            .Select(u => new
            {
                id = u.Id,
                email = u.Email,
                first_name = u.FirstName,
                last_name = u.LastName,
                role = u.Role,
                is_active = u.IsActive,
                created_at = u.CreatedAt,
                last_login_at = u.LastLoginAt,
                suspended_at = u.SuspendedAt,
                suspension_reason = u.SuspensionReason,
                suspended_by_user_id = u.SuspendedByUserId,
                total_xp = u.TotalXp,
                level = u.Level
            })
            .FirstOrDefaultAsync();

        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        // Get activity stats
        var listingCount = await _db.Listings.CountAsync(l => l.UserId == id);
        var transactionCount = await _db.Transactions.CountAsync(t => t.SenderId == id || t.ReceiverId == id);
        var connectionCount = await _db.Connections.CountAsync(c =>
            (c.RequesterId == id || c.AddresseeId == id) && c.Status == Connection.Statuses.Accepted);

        return Ok(new
        {
            user,
            stats = new
            {
                listings = listingCount,
                transactions = transactionCount,
                connections = connectionCount
            }
        });
    }

    /// <summary>
    /// Update a user's details (role, name, email).
    /// </summary>
    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] AdminUpdateUserRequest request)
    {
        var adminUserId = GetCurrentUserId();
        if (adminUserId == null) return Unauthorized(new { error = "Invalid token" });

        var user = await _db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        // Prevent admin from demoting themselves
        if (id == adminUserId && request.Role != null && request.Role != "admin")
        {
            return BadRequest(new { error = "Cannot change your own admin role" });
        }

        var updated = false;

        if (request.Role != null && request.Role != user.Role)
        {
            if (request.Role != "admin" && request.Role != "member")
            {
                return BadRequest(new { error = "Role must be 'admin' or 'member'" });
            }
            user.Role = request.Role;
            updated = true;
        }

        if (request.FirstName != null && request.FirstName != user.FirstName)
        {
            user.FirstName = request.FirstName.Trim();
            updated = true;
        }

        if (request.LastName != null && request.LastName != user.LastName)
        {
            user.LastName = request.LastName.Trim();
            updated = true;
        }

        if (request.Email != null && request.Email != user.Email)
        {
            // Check for duplicate email
            var emailExists = await _db.Users.AnyAsync(u => u.Email == request.Email && u.Id != id);
            if (emailExists)
            {
                return BadRequest(new { error = "Email already in use" });
            }
            user.Email = request.Email.Trim().ToLower();
            updated = true;
        }

        if (updated)
        {
            await _db.SaveChangesAsync();
            _logger.LogInformation("Admin {AdminId} updated user {UserId}", adminUserId, id);

            await _eventPublisher.PublishAsync(new UserUpdatedEvent
            {
                TenantId = user.TenantId,
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role
            });
        }

        return Ok(new
        {
            success = true,
            message = "User updated",
            user = new
            {
                id = user.Id,
                email = user.Email,
                first_name = user.FirstName,
                last_name = user.LastName,
                role = user.Role,
                is_active = user.IsActive
            }
        });
    }

    /// <summary>
    /// Suspend a user.
    /// </summary>
    [HttpPut("users/{id:int}/suspend")]
    public async Task<IActionResult> SuspendUser(int id, [FromBody] SuspendUserRequest request)
    {
        var adminUserId = GetCurrentUserId();
        if (adminUserId == null) return Unauthorized(new { error = "Invalid token" });

        if (id == adminUserId)
        {
            return BadRequest(new { error = "Cannot suspend yourself" });
        }

        var user = await _db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        if (!user.IsActive)
        {
            return BadRequest(new { error = "User is already suspended" });
        }

        user.IsActive = false;
        user.SuspendedAt = DateTime.UtcNow;
        user.SuspensionReason = request.Reason;
        user.SuspendedByUserId = adminUserId;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} suspended user {UserId}. Reason: {Reason}",
            adminUserId, id, request.Reason);

        await _eventPublisher.PublishAsync(new UserSuspendedEvent
        {
            TenantId = user.TenantId,
            UserId = user.Id,
            SuspendedByUserId = adminUserId.Value,
            Reason = request.Reason
        });

        return Ok(new
        {
            success = true,
            message = "User suspended",
            user = new
            {
                id = user.Id,
                is_active = user.IsActive,
                suspended_at = user.SuspendedAt,
                suspension_reason = user.SuspensionReason
            }
        });
    }

    /// <summary>
    /// Activate (unsuspend) a user.
    /// </summary>
    [HttpPut("users/{id:int}/activate")]
    public async Task<IActionResult> ActivateUser(int id)
    {
        var adminUserId = GetCurrentUserId();
        if (adminUserId == null) return Unauthorized(new { error = "Invalid token" });

        var user = await _db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        if (user.IsActive)
        {
            return BadRequest(new { error = "User is already active" });
        }

        user.IsActive = true;
        user.SuspendedAt = null;
        user.SuspensionReason = null;
        user.SuspendedByUserId = null;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} activated user {UserId}", adminUserId, id);

        await _eventPublisher.PublishAsync(new UserActivatedEvent
        {
            TenantId = user.TenantId,
            UserId = user.Id
        });

        return Ok(new
        {
            success = true,
            message = "User activated",
            user = new
            {
                id = user.Id,
                is_active = user.IsActive
            }
        });
    }

    #endregion

    #region Content Moderation

    /// <summary>
    /// Get pending listings awaiting review.
    /// </summary>
    [HttpGet("listings/pending")]
    public async Task<IActionResult> GetPendingListings(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        limit = Math.Clamp(limit, 1, 100);
        var skip = (page - 1) * limit;

        var query = _db.Listings.Where(l => l.Status == ListingStatus.Pending);
        var total = await query.CountAsync();

        var listings = await query
            .OrderBy(l => l.CreatedAt)
            .Skip(skip)
            .Take(limit)
            .Select(l => new
            {
                id = l.Id,
                title = l.Title,
                description = l.Description,
                type = l.Type.ToString().ToLower(),
                status = l.Status.ToString().ToLower(),
                location = l.Location,
                estimated_hours = l.EstimatedHours,
                created_at = l.CreatedAt,
                user = new
                {
                    id = l.User!.Id,
                    email = l.User.Email,
                    first_name = l.User.FirstName,
                    last_name = l.User.LastName
                }
            })
            .ToListAsync();

        return Ok(new
        {
            data = listings,
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
    /// Approve a pending listing.
    /// </summary>
    [HttpPut("listings/{id:int}/approve")]
    public async Task<IActionResult> ApproveListing(int id)
    {
        var adminUserId = GetCurrentUserId();
        if (adminUserId == null) return Unauthorized(new { error = "Invalid token" });

        var listing = await _db.Listings.FindAsync(id);
        if (listing == null)
        {
            return NotFound(new { error = "Listing not found" });
        }

        if (listing.Status != ListingStatus.Pending)
        {
            return BadRequest(new { error = $"Listing status is '{listing.Status}', not 'Pending'" });
        }

        listing.Status = ListingStatus.Active;
        listing.ReviewedAt = DateTime.UtcNow;
        listing.ReviewedByUserId = adminUserId;
        listing.RejectionReason = null;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} approved listing {ListingId}", adminUserId, id);

        await _eventPublisher.PublishAsync(new ListingApprovedEvent
        {
            TenantId = listing.TenantId,
            ListingId = listing.Id,
            ApprovedByUserId = adminUserId.Value
        });

        return Ok(new
        {
            success = true,
            message = "Listing approved",
            listing = new
            {
                id = listing.Id,
                status = listing.Status.ToString().ToLower(),
                reviewed_at = listing.ReviewedAt,
                reviewed_by_user_id = listing.ReviewedByUserId
            }
        });
    }

    /// <summary>
    /// Reject a pending listing.
    /// </summary>
    [HttpPut("listings/{id:int}/reject")]
    public async Task<IActionResult> RejectListing(int id, [FromBody] RejectListingRequest request)
    {
        var adminUserId = GetCurrentUserId();
        if (adminUserId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new { error = "Rejection reason is required" });
        }

        var listing = await _db.Listings.FindAsync(id);
        if (listing == null)
        {
            return NotFound(new { error = "Listing not found" });
        }

        if (listing.Status != ListingStatus.Pending)
        {
            return BadRequest(new { error = $"Listing status is '{listing.Status}', not 'Pending'" });
        }

        listing.Status = ListingStatus.Rejected;
        listing.ReviewedAt = DateTime.UtcNow;
        listing.ReviewedByUserId = adminUserId;
        listing.RejectionReason = request.Reason;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} rejected listing {ListingId}. Reason: {Reason}",
            adminUserId, id, request.Reason);

        await _eventPublisher.PublishAsync(new ListingRejectedEvent
        {
            TenantId = listing.TenantId,
            ListingId = listing.Id,
            RejectedByUserId = adminUserId.Value
        });

        return Ok(new
        {
            success = true,
            message = "Listing rejected",
            listing = new
            {
                id = listing.Id,
                status = listing.Status.ToString().ToLower(),
                rejection_reason = listing.RejectionReason,
                reviewed_at = listing.ReviewedAt,
                reviewed_by_user_id = listing.ReviewedByUserId
            }
        });
    }

    #endregion

    #region Categories

    /// <summary>
    /// List all categories.
    /// </summary>
    [HttpGet("categories")]
    public async Task<IActionResult> ListCategories()
    {
        var categories = await _db.Categories
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                description = c.Description,
                slug = c.Slug,
                parent_category_id = c.ParentCategoryId,
                sort_order = c.SortOrder,
                is_active = c.IsActive,
                created_at = c.CreatedAt,
                updated_at = c.UpdatedAt,
                listing_count = c.Listings.Count
            })
            .ToListAsync();

        return Ok(new { data = categories });
    }

    /// <summary>
    /// Create a new category.
    /// </summary>
    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        var adminUserId = GetCurrentUserId();
        if (adminUserId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { error = "Name is required" });
        }

        // Generate slug from name if not provided
        var slug = request.Slug ?? GenerateSlug(request.Name);

        // Check for duplicate slug
        var slugExists = await _db.Categories.AnyAsync(c => c.Slug == slug);
        if (slugExists)
        {
            return BadRequest(new { error = "Category with this slug already exists" });
        }

        // Validate parent category if provided
        if (request.ParentCategoryId.HasValue)
        {
            var parentExists = await _db.Categories.AnyAsync(c => c.Id == request.ParentCategoryId.Value);
            if (!parentExists)
            {
                return BadRequest(new { error = "Parent category not found" });
            }
        }

        var category = new Category
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Slug = slug,
            ParentCategoryId = request.ParentCategoryId,
            SortOrder = request.SortOrder ?? 0,
            IsActive = request.IsActive ?? true
        };

        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} created category {CategoryId}: {Name}",
            adminUserId, category.Id, category.Name);

        await _eventPublisher.PublishAsync(new CategoryCreatedEvent
        {
            TenantId = category.TenantId,
            CategoryId = category.Id,
            Name = category.Name,
            Description = category.Description,
            Slug = category.Slug,
            ParentCategoryId = category.ParentCategoryId,
            SortOrder = category.SortOrder,
            IsActive = category.IsActive
        });

        return CreatedAtAction(nameof(ListCategories), new
        {
            success = true,
            message = "Category created",
            category = new
            {
                id = category.Id,
                name = category.Name,
                description = category.Description,
                slug = category.Slug,
                parent_category_id = category.ParentCategoryId,
                sort_order = category.SortOrder,
                is_active = category.IsActive,
                created_at = category.CreatedAt
            }
        });
    }

    /// <summary>
    /// Update a category.
    /// </summary>
    [HttpPut("categories/{id:int}")]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] UpdateCategoryRequest request)
    {
        var adminUserId = GetCurrentUserId();
        if (adminUserId == null) return Unauthorized(new { error = "Invalid token" });

        var category = await _db.Categories.FindAsync(id);
        if (category == null)
        {
            return NotFound(new { error = "Category not found" });
        }

        var updated = false;

        if (request.Name != null && request.Name != category.Name)
        {
            category.Name = request.Name.Trim();
            updated = true;
        }

        if (request.Description != null && request.Description != category.Description)
        {
            category.Description = request.Description.Trim();
            updated = true;
        }

        if (request.Slug != null && request.Slug != category.Slug)
        {
            var slugExists = await _db.Categories.AnyAsync(c => c.Slug == request.Slug && c.Id != id);
            if (slugExists)
            {
                return BadRequest(new { error = "Category with this slug already exists" });
            }
            category.Slug = request.Slug;
            updated = true;
        }

        if (request.ParentCategoryId.HasValue)
        {
            if (request.ParentCategoryId.Value == id)
            {
                return BadRequest(new { error = "Category cannot be its own parent" });
            }
            var parentExists = await _db.Categories.AnyAsync(c => c.Id == request.ParentCategoryId.Value);
            if (!parentExists)
            {
                return BadRequest(new { error = "Parent category not found" });
            }
            category.ParentCategoryId = request.ParentCategoryId;
            updated = true;
        }

        if (request.SortOrder.HasValue && request.SortOrder != category.SortOrder)
        {
            category.SortOrder = request.SortOrder.Value;
            updated = true;
        }

        if (request.IsActive.HasValue && request.IsActive != category.IsActive)
        {
            category.IsActive = request.IsActive.Value;
            updated = true;
        }

        if (updated)
        {
            category.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation("Admin {AdminId} updated category {CategoryId}", adminUserId, id);

            await _eventPublisher.PublishAsync(new CategoryUpdatedEvent
            {
                TenantId = category.TenantId,
                CategoryId = category.Id,
                Name = category.Name,
                Description = category.Description,
                Slug = category.Slug,
                ParentCategoryId = category.ParentCategoryId,
                SortOrder = category.SortOrder,
                IsActive = category.IsActive
            });
        }

        return Ok(new
        {
            success = true,
            message = "Category updated",
            category = new
            {
                id = category.Id,
                name = category.Name,
                description = category.Description,
                slug = category.Slug,
                parent_category_id = category.ParentCategoryId,
                sort_order = category.SortOrder,
                is_active = category.IsActive,
                updated_at = category.UpdatedAt
            }
        });
    }

    /// <summary>
    /// Delete a category.
    /// </summary>
    [HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var adminUserId = GetCurrentUserId();
        if (adminUserId == null) return Unauthorized(new { error = "Invalid token" });

        var category = await _db.Categories
            .Include(c => c.Listings)
            .Include(c => c.ChildCategories)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (category == null)
        {
            return NotFound(new { error = "Category not found" });
        }

        if (category.Listings.Any())
        {
            return BadRequest(new { error = $"Cannot delete category with {category.Listings.Count} listings. Reassign listings first." });
        }

        if (category.ChildCategories.Any())
        {
            return BadRequest(new { error = $"Cannot delete category with {category.ChildCategories.Count} subcategories. Delete or reassign subcategories first." });
        }

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} deleted category {CategoryId}: {Name}",
            adminUserId, id, category.Name);

        return Ok(new
        {
            success = true,
            message = "Category deleted"
        });
    }

    #endregion

    #region Tenant Config

    /// <summary>
    /// Get all tenant configuration.
    /// </summary>
    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        var configs = await _db.TenantConfigs
            .OrderBy(c => c.Key)
            .Select(c => new
            {
                id = c.Id,
                key = c.Key,
                value = c.Value,
                updated_at = c.UpdatedAt
            })
            .ToListAsync();

        // Also return as a dictionary for easier access
        var configDict = configs.ToDictionary(c => c.key, c => c.value);

        return Ok(new
        {
            data = configs,
            config = configDict
        });
    }

    /// <summary>
    /// Update tenant configuration (batch update).
    /// </summary>
    [HttpPut("config")]
    public async Task<IActionResult> UpdateConfig([FromBody] UpdateConfigRequest request)
    {
        var adminUserId = GetCurrentUserId();
        if (adminUserId == null) return Unauthorized(new { error = "Invalid token" });

        if (request.Config == null || !request.Config.Any())
        {
            return BadRequest(new { error = "Config object is required" });
        }

        var existingConfigs = await _db.TenantConfigs.ToListAsync();
        var updated = new List<string>();
        var created = new List<string>();

        foreach (var kvp in request.Config)
        {
            var existing = existingConfigs.FirstOrDefault(c => c.Key == kvp.Key);
            if (existing != null)
            {
                if (existing.Value != kvp.Value)
                {
                    existing.Value = kvp.Value;
                    existing.UpdatedAt = DateTime.UtcNow;
                    updated.Add(kvp.Key);
                }
            }
            else
            {
                _db.TenantConfigs.Add(new TenantConfig
                {
                    Key = kvp.Key,
                    Value = kvp.Value
                });
                created.Add(kvp.Key);
            }
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} updated config. Created: {Created}, Updated: {Updated}",
            adminUserId, created.Count, updated.Count);

        return Ok(new
        {
            success = true,
            message = "Config updated",
            created = created,
            updated = updated
        });
    }

    #endregion

    #region Roles

    /// <summary>
    /// List all roles.
    /// </summary>
    [HttpGet("roles")]
    public async Task<IActionResult> ListRoles()
    {
        var roles = await _db.Roles
            .OrderBy(r => r.IsSystem ? 0 : 1)
            .ThenBy(r => r.Name)
            .Select(r => new
            {
                id = r.Id,
                name = r.Name,
                description = r.Description,
                permissions = r.Permissions,
                is_system = r.IsSystem,
                created_at = r.CreatedAt,
                updated_at = r.UpdatedAt
            })
            .ToListAsync();

        return Ok(new { data = roles });
    }

    /// <summary>
    /// Create a new custom role.
    /// </summary>
    [HttpPost("roles")]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
    {
        var adminUserId = GetCurrentUserId();
        if (adminUserId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { error = "Name is required" });
        }

        // Check for duplicate name
        var nameExists = await _db.Roles.AnyAsync(r => r.Name == request.Name.ToLower());
        if (nameExists)
        {
            return BadRequest(new { error = "Role with this name already exists" });
        }

        var role = new Role
        {
            Name = request.Name.ToLower().Trim(),
            Description = request.Description?.Trim(),
            Permissions = request.Permissions ?? "[]",
            IsSystem = false
        };

        _db.Roles.Add(role);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} created role {RoleId}: {Name}",
            adminUserId, role.Id, role.Name);

        return CreatedAtAction(nameof(ListRoles), new
        {
            success = true,
            message = "Role created",
            role = new
            {
                id = role.Id,
                name = role.Name,
                description = role.Description,
                permissions = role.Permissions,
                is_system = role.IsSystem,
                created_at = role.CreatedAt
            }
        });
    }

    /// <summary>
    /// Update a role.
    /// </summary>
    [HttpPut("roles/{id:int}")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] AdminUpdateRoleRequest request)
    {
        var adminUserId = GetCurrentUserId();
        if (adminUserId == null) return Unauthorized(new { error = "Invalid token" });

        var role = await _db.Roles.FindAsync(id);
        if (role == null)
        {
            return NotFound(new { error = "Role not found" });
        }

        // System roles cannot be renamed
        if (role.IsSystem && request.Name != null && request.Name != role.Name)
        {
            return BadRequest(new { error = "Cannot rename system roles" });
        }

        var updated = false;

        if (request.Name != null && request.Name != role.Name)
        {
            var nameExists = await _db.Roles.AnyAsync(r => r.Name == request.Name.ToLower() && r.Id != id);
            if (nameExists)
            {
                return BadRequest(new { error = "Role with this name already exists" });
            }
            role.Name = request.Name.ToLower().Trim();
            updated = true;
        }

        if (request.Description != null && request.Description != role.Description)
        {
            role.Description = request.Description.Trim();
            updated = true;
        }

        if (request.Permissions != null && request.Permissions != role.Permissions)
        {
            role.Permissions = request.Permissions;
            updated = true;
        }

        if (updated)
        {
            role.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation("Admin {AdminId} updated role {RoleId}", adminUserId, id);
        }

        return Ok(new
        {
            success = true,
            message = "Role updated",
            role = new
            {
                id = role.Id,
                name = role.Name,
                description = role.Description,
                permissions = role.Permissions,
                is_system = role.IsSystem,
                updated_at = role.UpdatedAt
            }
        });
    }

    /// <summary>
    /// Delete a custom role.
    /// </summary>
    [HttpDelete("roles/{id:int}")]
    public async Task<IActionResult> DeleteRole(int id)
    {
        var adminUserId = GetCurrentUserId();
        if (adminUserId == null) return Unauthorized(new { error = "Invalid token" });

        var role = await _db.Roles.FindAsync(id);
        if (role == null)
        {
            return NotFound(new { error = "Role not found" });
        }

        if (role.IsSystem)
        {
            return BadRequest(new { error = "Cannot delete system roles" });
        }

        // Check if any users have this role
        var usersWithRole = await _db.Users.CountAsync(u => u.Role == role.Name);
        if (usersWithRole > 0)
        {
            return BadRequest(new { error = $"Cannot delete role with {usersWithRole} users. Reassign users first." });
        }

        _db.Roles.Remove(role);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} deleted role {RoleId}: {Name}",
            adminUserId, id, role.Name);

        return Ok(new
        {
            success = true,
            message = "Role deleted"
        });
    }

    #endregion

    #region Helpers

    private static string GenerateSlug(string name)
    {
        return name
            .ToLower()
            .Replace(" ", "-")
            .Replace("&", "and")
            .Replace("'", "")
            .Replace("\"", "");
    }

    #endregion
}

#region Request Models

public class AdminUpdateUserRequest
{
    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }

    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }
}

public class SuspendUserRequest
{
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

public class RejectListingRequest
{
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

public class CreateCategoryRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("slug")]
    public string? Slug { get; set; }

    [JsonPropertyName("parent_category_id")]
    public int? ParentCategoryId { get; set; }

    [JsonPropertyName("sort_order")]
    public int? SortOrder { get; set; }

    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }
}

public class UpdateCategoryRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("slug")]
    public string? Slug { get; set; }

    [JsonPropertyName("parent_category_id")]
    public int? ParentCategoryId { get; set; }

    [JsonPropertyName("sort_order")]
    public int? SortOrder { get; set; }

    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }
}

public class UpdateConfigRequest
{
    [JsonPropertyName("config")]
    public Dictionary<string, string>? Config { get; set; }
}

public class CreateRoleRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("permissions")]
    public string? Permissions { get; set; }
}

public class AdminUpdateRoleRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("permissions")]
    public string? Permissions { get; set; }
}

#endregion

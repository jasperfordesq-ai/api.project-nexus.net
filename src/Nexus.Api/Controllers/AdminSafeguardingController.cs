// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

[ApiController]
[Route("api/admin/safeguarding")]
[Authorize(Policy = "AdminOnly")]
public class AdminSafeguardingController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenant;

    public AdminSafeguardingController(NexusDbContext db, TenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var activeAssignments = await _db.SafeguardingAssignments.CountAsync(a => a.RevokedAt == null && a.Status == "active");
        var consentedWards = await _db.SafeguardingAssignments.CountAsync(a => a.RevokedAt == null && a.ConsentGivenAt != null);
        var unreviewedFlags = await _db.SafeguardingMessageReviews.CountAsync(r => r.IsFlagged && r.ReviewedAt == null);
        var flagsThisMonth = await _db.SafeguardingMessageReviews.CountAsync(r => r.IsFlagged && r.CreatedAt >= monthStart);
        var criticalFlags = await _db.SafeguardingMessageReviews.CountAsync(r =>
            r.IsFlagged && r.ReviewedAt == null && (r.Severity == "high" || r.Severity == "critical"));

        return Ok(new
        {
            data = new
            {
                active_assignments = activeAssignments,
                unreviewed_flags = unreviewedFlags,
                consented_wards = consentedWards,
                total_flags_this_month = flagsThisMonth,
                critical_flags = criticalFlags
            }
        });
    }

    [HttpGet("flagged-messages")]
    public async Task<IActionResult> FlaggedMessages(
        [FromQuery] string? status = null,
        [FromQuery] string? severity = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        page = Math.Max(page, 1);
        limit = Math.Clamp(limit, 1, 200);

        var query = _db.SafeguardingMessageReviews
            .Include(r => r.Message).ThenInclude(m => m!.Conversation)
            .Include(r => r.Sender)
            .Include(r => r.Recipient)
            .Include(r => r.ReviewedBy)
            .Where(r => r.IsFlagged)
            .AsQueryable();

        if (status == "reviewed") query = query.Where(r => r.ReviewedAt != null);
        if (status == "unreviewed") query = query.Where(r => r.ReviewedAt == null);
        if (!string.IsNullOrWhiteSpace(severity)) query = query.Where(r => r.Severity == severity);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(r =>
                r.Message!.Content.ToLower().Contains(term) ||
                r.Sender!.Email.ToLower().Contains(term) ||
                (r.Recipient != null && r.Recipient.Email.ToLower().Contains(term)));
        }

        var total = await query.CountAsync();
        var rows = await query
            .OrderBy(r => r.ReviewedAt != null)
            .ThenByDescending(r => r.Severity == "critical")
            .ThenByDescending(r => r.Severity == "high")
            .ThenByDescending(r => r.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            data = rows.Select(MapMessageReview),
            pagination = new { page, limit, total, total_pages = (int)Math.Ceiling(total / (double)limit) }
        });
    }

    [HttpPost("flagged-messages/{id:int}/review")]
    public async Task<IActionResult> ReviewMessage(int id, [FromBody] ReviewMessageRequest request)
    {
        var review = await _db.SafeguardingMessageReviews.FirstOrDefaultAsync(r => r.Id == id);
        if (review == null) return NotFound(new { error = "Flagged message not found" });

        review.ReviewedAt = DateTime.UtcNow;
        review.ReviewedByUserId = User.GetUserId();
        review.ReviewNotes = request.Notes;
        review.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { data = MapMessageReview(review) });
    }

    [HttpGet("assignments")]
    public async Task<IActionResult> Assignments([FromQuery] string? status = null)
    {
        var query = _db.SafeguardingAssignments
            .Include(a => a.Ward)
            .Include(a => a.Guardian)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(a => a.Status == status);

        var rows = await query.OrderByDescending(a => a.AssignedAt).ToListAsync();
        return Ok(new { data = rows.Select(MapAssignment), meta = new { total = rows.Count } });
    }

    [HttpPost("assignments")]
    public async Task<IActionResult> CreateAssignment([FromBody] CreateSafeguardingAssignmentRequest request)
    {
        var tenantId = _tenant.GetTenantIdOrThrow();
        var ward = await ResolveUserAsync(request.WardUserId, request.WardEmail);
        if (ward == null) return BadRequest(new { error = "Ward user not found" });
        var guardian = await ResolveUserAsync(request.GuardianUserId, request.GuardianEmail);
        if (guardian == null) return BadRequest(new { error = "Guardian user not found" });
        if (ward.Id == guardian.Id) return BadRequest(new { error = "Ward and guardian must be different users" });

        var existing = await _db.SafeguardingAssignments.FirstOrDefaultAsync(a =>
            a.WardUserId == ward.Id && a.GuardianUserId == guardian.Id && a.RevokedAt == null);
        if (existing != null) return Conflict(new { error = "An active safeguarding assignment already exists for these users" });

        var assignment = new SafeguardingAssignment
        {
            TenantId = tenantId,
            WardUserId = ward.Id,
            GuardianUserId = guardian.Id,
            ConsentGivenAt = request.ConsentGiven ? DateTime.UtcNow : null,
            ExpiresAt = request.ExpiresAt,
            Notes = request.Notes
        };

        _db.SafeguardingAssignments.Add(assignment);
        await _db.SaveChangesAsync();
        assignment.Ward = ward;
        assignment.Guardian = guardian;

        return Created($"/api/admin/safeguarding/assignments/{assignment.Id}", new { data = MapAssignment(assignment) });
    }

    [HttpDelete("assignments/{id:int}")]
    public async Task<IActionResult> DeleteAssignment(int id)
    {
        var assignment = await _db.SafeguardingAssignments.FirstOrDefaultAsync(a => a.Id == id);
        if (assignment == null) return NotFound(new { error = "Assignment not found" });

        assignment.Status = "revoked";
        assignment.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Assignment revoked" });
    }

    [HttpGet("member-preferences")]
    public async Task<IActionResult> MemberPreferences()
    {
        var assignments = await _db.SafeguardingAssignments
            .Include(a => a.Ward)
            .Where(a => a.RevokedAt == null)
            .OrderByDescending(a => a.AssignedAt)
            .Take(250)
            .ToListAsync();

        return Ok(new
        {
            data = assignments
                .GroupBy(a => a.WardUserId)
                .Select(g =>
                {
                    var first = g.First();
                    return new
                    {
                        user_id = g.Key,
                        user_name = Name(first.Ward),
                        user_avatar = first.Ward?.AvatarUrl,
                        options = g.Select(a => new
                        {
                            option_key = "guardian_assigned",
                            label = "Guardian assigned",
                            is_declination = false
                        }).ToList(),
                        consent_given_at = g.Where(a => a.ConsentGivenAt != null).Max(a => a.ConsentGivenAt),
                        has_triggers = true,
                        is_declination_only = false
                    };
                })
        });
    }

    [HttpGet("options")]
    public async Task<IActionResult> Options([FromQuery] bool includeInactive = true)
    {
        var query = _db.SafeguardingOptions.AsQueryable();
        if (!includeInactive) query = query.Where(o => o.IsActive);
        var options = await query.OrderBy(o => o.SortOrder).ThenBy(o => o.Label).ToListAsync();
        return Ok(new { data = options.Select(MapOption) });
    }

    [HttpPost("options")]
    public async Task<IActionResult> CreateOption([FromBody] SaveSafeguardingOptionRequest request)
    {
        var tenantId = _tenant.GetTenantIdOrThrow();
        var key = Slug(request.OptionKey ?? request.Label);
        if (string.IsNullOrWhiteSpace(key)) return BadRequest(new { error = "Option key or label is required" });
        if (await _db.SafeguardingOptions.AnyAsync(o => o.OptionKey == key))
            return Conflict(new { error = "Option key already exists" });

        var option = new SafeguardingOption { TenantId = tenantId, OptionKey = key };
        ApplyOption(option, request);
        _db.SafeguardingOptions.Add(option);
        await _db.SaveChangesAsync();
        return Created($"/api/admin/safeguarding/options/{option.Id}", new { data = MapOption(option) });
    }

    [HttpPut("options/{id:int}")]
    public async Task<IActionResult> UpdateOption(int id, [FromBody] SaveSafeguardingOptionRequest request)
    {
        var option = await _db.SafeguardingOptions.FirstOrDefaultAsync(o => o.Id == id);
        if (option == null) return NotFound(new { error = "Option not found" });
        ApplyOption(option, request);
        option.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = MapOption(option) });
    }

    [HttpDelete("options/{id:int}")]
    public async Task<IActionResult> DeactivateOption(int id)
    {
        var option = await _db.SafeguardingOptions.FirstOrDefaultAsync(o => o.Id == id);
        if (option == null) return NotFound(new { error = "Option not found" });
        option.IsActive = false;
        option.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Option deactivated" });
    }

    private async Task<User?> ResolveUserAsync(int? userId, string? email)
    {
        if (userId.HasValue) return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
        if (!string.IsNullOrWhiteSpace(email))
        {
            var normalized = email.Trim().ToLower();
            return await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalized);
        }
        return null;
    }

    private static void ApplyOption(SafeguardingOption option, SaveSafeguardingOptionRequest request)
    {
        option.OptionType = string.IsNullOrWhiteSpace(request.OptionType) ? "checkbox" : request.OptionType.Trim();
        option.Label = request.Label.Trim();
        option.Description = request.Description;
        option.HelpUrl = request.HelpUrl;
        option.SortOrder = request.SortOrder;
        option.IsActive = request.IsActive;
        option.IsRequired = request.IsRequired;
        option.SelectOptionsJson = request.SelectOptions.HasValue ? request.SelectOptions.Value.GetRawText() : null;
        option.TriggersJson = request.Triggers.HasValue ? request.Triggers.Value.GetRawText() : null;
        option.PresetSource = request.PresetSource;
    }

    private static object MapOption(SafeguardingOption option) => new
    {
        option.Id,
        option_key = option.OptionKey,
        option_type = option.OptionType,
        option.Label,
        option.Description,
        help_url = option.HelpUrl,
        sort_order = option.SortOrder,
        is_active = option.IsActive,
        is_required = option.IsRequired,
        select_options = ParseJson(option.SelectOptionsJson),
        triggers = ParseJson(option.TriggersJson),
        preset_source = option.PresetSource,
        created_at = option.CreatedAt,
        updated_at = option.UpdatedAt
    };

    private static object MapAssignment(SafeguardingAssignment a) => new
    {
        a.Id,
        ward = MapUser(a.Ward, a.WardUserId),
        guardian = MapUser(a.Guardian, a.GuardianUserId),
        a.Status,
        consent_given = a.ConsentGivenAt != null,
        consent_given_at = a.ConsentGivenAt,
        created_at = a.AssignedAt,
        expires_at = a.ExpiresAt,
        revoked_at = a.RevokedAt,
        a.Notes
    };

    private static object MapMessageReview(SafeguardingMessageReview r) => new
    {
        r.Id,
        message_id = r.MessageId,
        message_content = r.Message?.Content ?? string.Empty,
        sender = MapUser(r.Sender, r.SenderId),
        recipient = MapUser(r.Recipient, r.RecipientId),
        severity = r.Severity,
        flag_reason = r.FlagReason,
        is_reviewed = r.ReviewedAt != null,
        reviewed_by = Name(r.ReviewedBy),
        review_notes = r.ReviewNotes,
        reviewed_at = r.ReviewedAt,
        created_at = r.CreatedAt
    };

    private static object MapUser(User? user, int? id) => new
    {
        id = user?.Id ?? id,
        name = Name(user),
        email = user?.Email,
        avatar_url = user?.AvatarUrl
    };

    private static string Name(User? user)
    {
        if (user == null) return "Unknown user";
        var name = $"{user.FirstName} {user.LastName}".Trim();
        return string.IsNullOrWhiteSpace(name) ? user.Email : name;
    }

    private static object? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<JsonElement>(json, JsonOptions); }
        catch { return null; }
    }

    private static string Slug(string value)
    {
        var chars = value.Trim().ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '_')
            .ToArray();
        return string.Join("_", new string(chars).Split('_', StringSplitOptions.RemoveEmptyEntries));
    }

    public class ReviewMessageRequest
    {
        [JsonPropertyName("notes"), MaxLength(4000)] public string? Notes { get; set; }
    }

    public class CreateSafeguardingAssignmentRequest
    {
        [JsonPropertyName("ward_user_id")] public int? WardUserId { get; set; }
        [JsonPropertyName("guardian_user_id")] public int? GuardianUserId { get; set; }
        [JsonPropertyName("ward_email")] public string? WardEmail { get; set; }
        [JsonPropertyName("guardian_email")] public string? GuardianEmail { get; set; }
        [JsonPropertyName("consent_given")] public bool ConsentGiven { get; set; }
        [JsonPropertyName("expires_at")] public DateTime? ExpiresAt { get; set; }
        [JsonPropertyName("notes"), MaxLength(2000)] public string? Notes { get; set; }
    }

    public class SaveSafeguardingOptionRequest
    {
        [JsonPropertyName("option_key"), MaxLength(120)] public string? OptionKey { get; set; }
        [JsonPropertyName("option_type"), MaxLength(40)] public string OptionType { get; set; } = "checkbox";
        [JsonPropertyName("label"), Required, MaxLength(200)] public string Label { get; set; } = string.Empty;
        [JsonPropertyName("description"), MaxLength(2000)] public string? Description { get; set; }
        [JsonPropertyName("help_url"), MaxLength(500)] public string? HelpUrl { get; set; }
        [JsonPropertyName("sort_order")] public int SortOrder { get; set; }
        [JsonPropertyName("is_active")] public bool IsActive { get; set; } = true;
        [JsonPropertyName("is_required")] public bool IsRequired { get; set; }
        [JsonPropertyName("select_options")] public JsonElement? SelectOptions { get; set; }
        [JsonPropertyName("triggers")] public JsonElement? Triggers { get; set; }
        [JsonPropertyName("preset_source"), MaxLength(80)] public string? PresetSource { get; set; }
    }
}

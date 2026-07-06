// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersParityController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;

    public UsersParityController(NexusDbContext db, TenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? q = null)
    {
        var users = await _db.Users.Where(u => u.TenantId == TenantId() && (q == null || u.FirstName.Contains(q) || u.LastName.Contains(q) || u.Email.Contains(q))).Take(50).Select(u => new { u.Id, u.FirstName, u.LastName, u.Email, u.AvatarUrl }).ToListAsync();
        return Ok(new { data = users });
    }

    [HttpGet("blocked")]
    public IActionResult Blocked() => Ok(new { data = Array.Empty<object>() });

    [HttpPost("{userId:int}/block")]
    public IActionResult BlockUser(int userId) => Ok(new { data = new { user_id = userId, blocked = true } });

    [HttpDelete("{userId:int}/block")]
    public IActionResult UnblockUser(int userId) => NoContent();

    [HttpGet("{userId:int}/block-status")]
    public IActionResult BlockStatus(int userId) => Ok(new { data = new { user_id = userId, blocked = false } });

    [HttpGet("{userId:int}/appreciations")]
    public async Task<IActionResult> Appreciations(int userId) => Ok(new { data = await _db.Reviews.Where(r => r.TenantId == TenantId() && r.TargetUserId == userId).ToListAsync() });

    [HttpGet("{userId:int}/rating")]
    public async Task<IActionResult> Rating(int userId)
    {
        var reviews = await _db.Reviews.Where(r => r.TenantId == TenantId() && r.TargetUserId == userId).ToListAsync();
        return Ok(new { data = new { user_id = userId, average = reviews.Count == 0 ? 0 : Math.Round(reviews.Average(r => r.Rating), 2), count = reviews.Count } });
    }

    [HttpGet("{userId:int}/skills")]
    public async Task<IActionResult> Skills(int userId) => Ok(new { data = await _db.UserSkills.Where(s => s.TenantId == TenantId() && s.UserId == userId).Include(s => s.Skill).ToListAsync() });

    [HttpGet("{userId:int}/public-collections")]
    public async Task<IActionResult> PublicCollections(int userId) => Ok(new { data = await _db.MarketplaceCollections.Where(c => c.TenantId == TenantId() && c.UserId == userId && c.IsPublic).ToListAsync() });

    [HttpGet("{userId:int}/verein-membership-status")]
    public IActionResult VereinMembershipStatus(int userId) => Ok(new { data = new { user_id = userId, status = "none" } });

    [HttpGet("me/listings")]
    public async Task<IActionResult> MyListings() => Ok(new { data = await _db.Listings.Where(l => l.TenantId == TenantId() && l.UserId == UserId()).ToListAsync() });

    [HttpGet("me/activity/hours")]
    public async Task<IActionResult> ActivityHours()
    {
        var hours = await _db.VolunteerCheckIns.Where(c => c.TenantId == TenantId() && c.UserId == UserId()).SumAsync(c => c.HoursLogged ?? 0);
        return Ok(new { data = new { hours } });
    }

    [HttpGet("me/activity/monthly")]
    public IActionResult ActivityMonthly() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("me/activity/timeline")]
    public async Task<IActionResult> ActivityTimeline() => Ok(new { data = await _db.AuditLogs.Where(a => a.TenantId == TenantId() && a.UserId == UserId()).OrderByDescending(a => a.CreatedAt).Take(50).ToListAsync() });

    [HttpGet("me/availability")]
    public async Task<IActionResult> Availability() => Ok(new { data = await _db.MemberAvailabilities.Where(a => a.TenantId == TenantId() && a.UserId == UserId()).OrderBy(a => a.DayOfWeek).ToListAsync() });

    [HttpPost("me/availability/date")]
    public async Task<IActionResult> AvailabilityDate([FromBody] JsonElement body)
    {
        var exception = new AvailabilityException { TenantId = TenantId(), UserId = UserId(), Date = Date(body, "date") ?? DateTime.UtcNow.Date, Type = Str(body, "type") ?? "available", StartTime = Str(body, "start_time"), EndTime = Str(body, "end_time"), Reason = Str(body, "reason") };
        _db.AvailabilityExceptions.Add(exception);
        await _db.SaveChangesAsync();
        return Ok(new { data = exception });
    }

    [HttpPut("me/availability/{id:int}")]
    public async Task<IActionResult> UpdateAvailability([FromRoute(Name = "id")] int availabilityId, [FromBody] JsonElement body)
    {
        var slot = await _db.MemberAvailabilities.FirstOrDefaultAsync(a => a.TenantId == TenantId() && a.UserId == UserId() && a.Id == availabilityId);
        if (slot == null) return NotFound(new { error = "Availability not found" });
        slot.StartTime = Str(body, "start_time") ?? slot.StartTime;
        slot.EndTime = Str(body, "end_time") ?? slot.EndTime;
        slot.IsActive = Bool(body, "is_active") ?? slot.IsActive;
        slot.Note = Str(body, "note") ?? slot.Note;
        slot.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = slot });
    }

    [HttpPut("me/availability/{day}")]
    public async Task<IActionResult> UpdateAvailabilityByDay(string day, [FromBody] JsonElement body)
    {
        var dayNumber = ParseDayOfWeek(day);
        if (dayNumber is null) return BadRequest(new { error = "Invalid day" });

        var tenantId = TenantId();
        var userId = UserId();
        var slot = await _db.MemberAvailabilities.FirstOrDefaultAsync(a =>
            a.TenantId == tenantId && a.UserId == userId && a.DayOfWeek == dayNumber.Value);
        if (slot == null)
        {
            slot = new MemberAvailability
            {
                TenantId = tenantId,
                UserId = userId,
                DayOfWeek = dayNumber.Value,
                StartTime = Str(body, "start_time") ?? "09:00",
                EndTime = Str(body, "end_time") ?? "17:00",
                IsActive = Bool(body, "is_active") ?? true,
                Note = Str(body, "note"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.MemberAvailabilities.Add(slot);
        }
        else
        {
            slot.StartTime = Str(body, "start_time") ?? slot.StartTime;
            slot.EndTime = Str(body, "end_time") ?? slot.EndTime;
            slot.IsActive = Bool(body, "is_active") ?? slot.IsActive;
            slot.Note = Str(body, "note") ?? slot.Note;
            slot.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(new { data = slot });
    }

    [HttpDelete("me/availability/{id:int}")]
    public async Task<IActionResult> DeleteAvailability([FromRoute(Name = "id")] int availabilityId)
    {
        var slot = await _db.MemberAvailabilities.FirstOrDefaultAsync(a => a.TenantId == TenantId() && a.UserId == UserId() && a.Id == availabilityId);
        if (slot != null) _db.MemberAvailabilities.Remove(slot);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("me/match-preferences")]
    public async Task<IActionResult> MatchPreferences() => Ok(new { data = await _db.MatchPreferences.FirstOrDefaultAsync(p => p.TenantId == TenantId() && p.UserId == UserId()) });

    [HttpPut("me/theme-preferences")]
    public async Task<IActionResult> ThemePreferences([FromBody] JsonElement body)
    {
        var pref = await _db.UserPreferences.FirstOrDefaultAsync(p => p.TenantId == TenantId() && p.UserId == UserId());
        if (pref == null)
        {
            pref = new Nexus.Api.Entities.UserPreference { TenantId = TenantId(), UserId = UserId() };
            _db.UserPreferences.Add(pref);
        }
        pref.Theme = Str(body, "theme") ?? pref.Theme;
        pref.Language = Str(body, "language") ?? pref.Language;
        pref.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = pref });
    }

    [HttpPut("me/resume-visibility")]
    public async Task<IActionResult> ResumeVisibility([FromBody] JsonElement body)
    {
        var profile = await _db.JobSavedProfiles.FirstOrDefaultAsync(p => p.TenantId == TenantId() && p.UserId == UserId());
        if (profile == null)
        {
            profile = new Nexus.Api.Entities.JobSavedProfile { TenantId = TenantId(), UserId = UserId() };
            _db.JobSavedProfiles.Add(profile);
        }
        profile.VisibleToEmployers = Bool(body, "visible") ?? Bool(body, "visible_to_employers") ?? profile.VisibleToEmployers;
        await _db.SaveChangesAsync();
        return Ok(new { data = profile });
    }

    [HttpPut("me/skills/{id:int}")]
    public async Task<IActionResult> UpdateSkill([FromRoute(Name = "id")] int skillId, [FromBody] JsonElement body)
    {
        var skill = await _db.UserSkills.FirstOrDefaultAsync(s => s.TenantId == TenantId() && s.UserId == UserId() && s.SkillId == skillId);
        if (skill == null) return NotFound(new { error = "Skill not found" });
        skill.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = skill });
    }

    [HttpGet("me/parent-accounts")]
    public IActionResult ParentAccounts() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("me/sub-accounts")]
    public IActionResult SubAccounts() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("me/sub-accounts/{childId:int}/activity")]
    public IActionResult SubAccountActivity([FromRoute(Name = "childId")] int subAccountId) => Ok(new { data = Array.Empty<object>(), sub_account_id = subAccountId });

    private int TenantId() => _tenantContext.TenantId ?? throw new InvalidOperationException("Tenant context not resolved");
    private int UserId() => User.GetUserId() ?? throw new UnauthorizedAccessException("Invalid token");
    private static string? Str(JsonElement e, string name) => e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind != JsonValueKind.Null ? v.ToString() : null;
    private static bool? Bool(JsonElement e, string name) => bool.TryParse(Str(e, name), out var value) ? value : null;
    private static DateTime? Date(JsonElement e, string name) => DateTime.TryParse(Str(e, name), out var value) ? value : null;
    private static int? ParseDayOfWeek(string day)
    {
        if (int.TryParse(day, out var number) && number is >= 0 and <= 6) return number;
        return day.Trim().ToLowerInvariant() switch
        {
            "sunday" or "sun" => 0,
            "monday" or "mon" => 1,
            "tuesday" or "tue" or "tues" => 2,
            "wednesday" or "wed" => 3,
            "thursday" or "thu" or "thurs" => 4,
            "friday" or "fri" => 5,
            "saturday" or "sat" => 6,
            _ => null
        };
    }
}

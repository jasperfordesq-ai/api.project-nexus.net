// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for organisation / employer profile management.
/// </summary>
public class OrganisationService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<OrganisationService> _logger;

    public OrganisationService(NexusDbContext db, TenantContext tenantContext, ILogger<OrganisationService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    // ── List / Search ───────────────────────────────────────

    public async Task<List<Organisation>> GetOrganisationsAsync(
        string? type = null, string? search = null, int page = 1, int limit = 20)
    {
        var query = _db.Set<Organisation>()
            .Where(o => o.IsPublic && o.Status == "verified")
            .Include(o => o.Owner)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(type))
            query = query.Where(o => o.Type == type);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(o =>
                o.Name.ToLower().Contains(term) ||
                (o.Description != null && o.Description.ToLower().Contains(term)) ||
                (o.Industry != null && o.Industry.ToLower().Contains(term)));
        }

        return await query
            .OrderBy(o => o.Name)
            .Skip((Math.Max(1, page) - 1) * Math.Clamp(limit, 1, 100))
            .Take(Math.Clamp(limit, 1, 100))
            .ToListAsync();
    }

    public async Task<int> CountOrganisationsAsync(string? type = null, string? search = null)
    {
        var query = _db.Set<Organisation>().Where(o => o.IsPublic && o.Status == "verified");
        if (!string.IsNullOrWhiteSpace(type))
            query = query.Where(o => o.Type == type);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(o => o.Name.ToLower().Contains(term));
        }
        return await query.CountAsync();
    }

    public async Task<Organisation?> GetByIdAsync(int id)
    {
        return await _db.Set<Organisation>()
            .Include(o => o.Owner)
            .Include(o => o.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(o => o.Id == id);
    }

    public async Task<Organisation?> GetBySlugAsync(string slug)
    {
        return await _db.Set<Organisation>()
            .Include(o => o.Owner)
            .FirstOrDefaultAsync(o => o.Slug == slug && o.IsPublic && o.Status == "verified");
    }

    public async Task<List<Organisation>> GetMyOrganisationsAsync(int userId)
    {
        var orgIds = await _db.Set<OrganisationMember>()
            .Where(m => m.UserId == userId)
            .Select(m => m.OrganisationId)
            .ToListAsync();

        return await _db.Set<Organisation>()
            .Where(o => orgIds.Contains(o.Id))
            .OrderBy(o => o.Name)
            .ToListAsync();
    }

    // ── CRUD ────────────────────────────────────────────────

    public async Task<(Organisation? Org, string? Error)> CreateAsync(
        int ownerId, string name, string? description, string? logoUrl,
        string? websiteUrl, string? email, string? phone, string? address,
        double? latitude, double? longitude, string type, string? industry)
    {
        var slug = GenerateSlug(name);
        var existing = await _db.Set<Organisation>().AnyAsync(o => o.Slug == slug);
        if (existing)
            slug = $"{slug}-{DateTime.UtcNow.Ticks % 10000}";

        var org = new Organisation
        {
            Name = name,
            Slug = slug,
            Description = description,
            LogoUrl = logoUrl,
            WebsiteUrl = websiteUrl,
            Email = email,
            Phone = phone,
            Address = address,
            Latitude = latitude,
            Longitude = longitude,
            Type = type,
            Industry = industry,
            OwnerId = ownerId,
            Status = "pending"
        };

        _db.Set<Organisation>().Add(org);
        await _db.SaveChangesAsync();

        // Auto-add owner as member
        _db.Set<OrganisationMember>().Add(new OrganisationMember
        {
            OrganisationId = org.Id,
            UserId = ownerId,
            Role = "owner"
        });
        await _db.SaveChangesAsync();

        _logger.LogInformation("Organisation {OrgId} created by user {UserId}", org.Id, ownerId);
        return (org, null);
    }

    public async Task<(Organisation? Org, string? Error)> UpdateAsync(
        int orgId, int userId, string? name, string? description, string? logoUrl,
        string? websiteUrl, string? email, string? phone, string? address,
        double? latitude, double? longitude, string? type, string? industry, bool? isPublic)
    {
        var org = await _db.Set<Organisation>().FirstOrDefaultAsync(x => x.Id == orgId);
        if (org == null) return (null, "Organisation not found");

        // Only owner or org admin can update
        var member = await _db.Set<OrganisationMember>()
            .FirstOrDefaultAsync(m => m.OrganisationId == orgId && m.UserId == userId);
        if (member == null || (member.Role != "owner" && member.Role != "admin"))
            return (null, "Not authorized to update this organisation");

        if (name != null)
        {
            org.Name = name;
            var newSlug = GenerateSlug(name);
            var slugExists = await _db.Set<Organisation>().AnyAsync(o => o.Slug == newSlug && o.Id != orgId);
            if (slugExists)
                newSlug = $"{newSlug}-{DateTime.UtcNow.Ticks % 10000}";
            org.Slug = newSlug;
        }
        if (description != null) org.Description = description;
        if (logoUrl != null) org.LogoUrl = logoUrl;
        if (websiteUrl != null) org.WebsiteUrl = websiteUrl;
        if (email != null) org.Email = email;
        if (phone != null) org.Phone = phone;
        if (address != null) org.Address = address;
        if (latitude.HasValue) org.Latitude = latitude;
        if (longitude.HasValue) org.Longitude = longitude;
        if (type != null) org.Type = type;
        if (industry != null) org.Industry = industry;
        if (isPublic.HasValue) org.IsPublic = isPublic.Value;

        org.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (org, null);
    }

    public async Task<string?> DeleteAsync(int orgId, int userId)
    {
        var org = await _db.Set<Organisation>().FirstOrDefaultAsync(x => x.Id == orgId);
        if (org == null) return "Organisation not found";
        if (org.OwnerId != userId) return "Only the owner can delete this organisation";

        var members = await _db.Set<OrganisationMember>()
            .Where(m => m.OrganisationId == orgId).ToListAsync();
        _db.Set<OrganisationMember>().RemoveRange(members);
        _db.Set<Organisation>().Remove(org);
        await _db.SaveChangesAsync();
        return null;
    }

    // ── Members ─────────────────────────────────────────────

    public async Task<List<OrganisationMember>> GetMembersAsync(int orgId)
    {
        return await _db.Set<OrganisationMember>()
            .Where(m => m.OrganisationId == orgId)
            .Include(m => m.User)
            .OrderBy(m => m.Role)
            .ThenBy(m => m.JoinedAt)
            .ToListAsync();
    }

    public async Task<(OrganisationMember? Member, string? Error)> AddMemberAsync(
        int orgId, int userId, int requesterId, string role = "member", string? jobTitle = null)
    {
        // Check requester is owner/admin
        var requester = await _db.Set<OrganisationMember>()
            .FirstOrDefaultAsync(m => m.OrganisationId == orgId && m.UserId == requesterId);
        if (requester == null || (requester.Role != "owner" && requester.Role != "admin"))
            return (null, "Not authorized to add members");

        var existing = await _db.Set<OrganisationMember>()
            .AnyAsync(m => m.OrganisationId == orgId && m.UserId == userId);
        if (existing) return (null, "User is already a member");

        var member = new OrganisationMember
        {
            OrganisationId = orgId,
            UserId = userId,
            Role = role,
            JobTitle = jobTitle
        };

        _db.Set<OrganisationMember>().Add(member);
        await _db.SaveChangesAsync();
        return (member, null);
    }

    public async Task<string?> RemoveMemberAsync(int orgId, int userId, int requesterId)
    {
        var requester = await _db.Set<OrganisationMember>()
            .FirstOrDefaultAsync(m => m.OrganisationId == orgId && m.UserId == requesterId);
        if (requester == null || (requester.Role != "owner" && requester.Role != "admin"))
            return "Not authorized to remove members";

        var member = await _db.Set<OrganisationMember>()
            .FirstOrDefaultAsync(m => m.OrganisationId == orgId && m.UserId == userId);
        if (member == null) return "Member not found";
        if (member.Role == "owner") return "Cannot remove the owner";

        _db.Set<OrganisationMember>().Remove(member);
        await _db.SaveChangesAsync();
        return null;
    }

    public async Task<(OrganisationMember? Member, string? Error)> UpdateMemberRoleAsync(
        int orgId, int userId, int requesterId, string newRole, string? jobTitle = null)
    {
        var requester = await _db.Set<OrganisationMember>()
            .FirstOrDefaultAsync(m => m.OrganisationId == orgId && m.UserId == requesterId);
        if (requester == null || requester.Role != "owner")
            return (null, "Only the owner can change roles");

        var member = await _db.Set<OrganisationMember>()
            .FirstOrDefaultAsync(m => m.OrganisationId == orgId && m.UserId == userId);
        if (member == null) return (null, "Member not found");

        member.Role = newRole;
        if (jobTitle != null) member.JobTitle = jobTitle;
        await _db.SaveChangesAsync();
        return (member, null);
    }

    // ── Admin ───────────────────────────────────────────────

    public async Task<List<Organisation>> AdminListAsync(string? status = null, int page = 1, int limit = 20)
    {
        var query = _db.Set<Organisation>()
            .Include(o => o.Owner)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(o => o.Status == status);

        return await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((Math.Max(1, page) - 1) * Math.Clamp(limit, 1, 100))
            .Take(Math.Clamp(limit, 1, 100))
            .ToListAsync();
    }

    public async Task<(Organisation? Org, string? Error)> AdminVerifyAsync(int orgId)
    {
        var org = await _db.Set<Organisation>().FirstOrDefaultAsync(x => x.Id == orgId);
        if (org == null) return (null, "Organisation not found");

        org.Status = "verified";
        org.VerifiedAt = DateTime.UtcNow;
        org.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (org, null);
    }

    public async Task<(Organisation? Org, string? Error)> AdminSuspendAsync(int orgId)
    {
        var org = await _db.Set<Organisation>().FirstOrDefaultAsync(x => x.Id == orgId);
        if (org == null) return (null, "Organisation not found");

        org.Status = "suspended";
        org.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (org, null);
    }

    private static string GenerateSlug(string name)
    {
        return System.Text.RegularExpressions.Regex
            .Replace(name.ToLower().Trim(), @"[^a-z0-9\s-]", "")
            .Replace(' ', '-')
            .Trim('-');
    }
}

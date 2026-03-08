// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

public class DeliverableService
{
    private readonly NexusDbContext _db;
    private readonly ILogger<DeliverableService> _logger;

    public DeliverableService(NexusDbContext db, ILogger<DeliverableService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<(List<Deliverable> Items, int Total)> ListDeliverablesAsync(
        int tenantId, string? status, string? priority, int? assignedToUserId, int page, int limit)
    {
        var q = _db.Deliverables
            .Include(d => d.AssignedTo)
            .Include(d => d.CreatedBy)
            .Where(d => d.TenantId == tenantId);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<DeliverableStatus>(status, true, out var st))
            q = q.Where(d => d.Status == st);
        if (!string.IsNullOrEmpty(priority) && Enum.TryParse<DeliverablePriority>(priority, true, out var pr))
            q = q.Where(d => d.Priority == pr);
        if (assignedToUserId.HasValue)
            q = q.Where(d => d.AssignedToUserId == assignedToUserId.Value);
        q = q.OrderByDescending(d => d.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * limit).Take(limit).ToListAsync();
        return (items, total);
    }

    public async Task<Deliverable?> GetDeliverableAsync(int tenantId, int id)
        => await _db.Deliverables
            .Include(d => d.AssignedTo)
            .Include(d => d.CreatedBy)
            .Include(d => d.Comments).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == id);

    public async Task<(Deliverable? Item, string? Error)> CreateDeliverableAsync(
        int tenantId, int createdByUserId, string title, string? description,
        int? assignedToUserId, string? priority, DateTime? dueDate, string? tags)
    {
        if (string.IsNullOrWhiteSpace(title)) return (null, "Title is required.");
        var pr = DeliverablePriority.Medium;
        if (!string.IsNullOrEmpty(priority)) Enum.TryParse(priority, true, out pr);
        var d = new Deliverable
        {
            TenantId = tenantId, CreatedByUserId = createdByUserId,
            Title = title.Trim(), Description = description?.Trim(),
            AssignedToUserId = assignedToUserId, Priority = pr,
            DueDate = dueDate, Tags = tags,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        _db.Deliverables.Add(d);
        await _db.SaveChangesAsync();
        return (d, null);
    }

    public async Task<(Deliverable? Item, string? Error)> UpdateDeliverableAsync(
        int tenantId, int id, string? title, string? description,
        int? assignedToUserId, string? status, string? priority, DateTime? dueDate, string? tags)
    {
        var d = await _db.Deliverables.FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id);
        if (d is null) return (null, "Not found.");
        if (title is not null) d.Title = title.Trim();
        if (description is not null) d.Description = description.Trim();
        if (assignedToUserId.HasValue) d.AssignedToUserId = assignedToUserId.Value;
        if (tags is not null) d.Tags = tags;
        if (dueDate.HasValue) d.DueDate = dueDate.Value;
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<DeliverableStatus>(status, true, out var st))
        {
            d.Status = st;
            if (st == DeliverableStatus.Completed && !d.CompletedAt.HasValue)
                d.CompletedAt = DateTime.UtcNow;
        }
        if (!string.IsNullOrEmpty(priority) && Enum.TryParse<DeliverablePriority>(priority, true, out var pr))
            d.Priority = pr;
        d.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (d, null);
    }

    public async Task<(bool Success, string? Error)> DeleteDeliverableAsync(int tenantId, int id)
    {
        var d = await _db.Deliverables.FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id);
        if (d is null) return (false, "Not found.");
        _db.Deliverables.Remove(d);
        await _db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(DeliverableComment? Comment, string? Error)> AddCommentAsync(
        int tenantId, int deliverableId, int userId, string content)
    {
        var exists = await _db.Deliverables.AnyAsync(d => d.TenantId == tenantId && d.Id == deliverableId);
        if (!exists) return (null, "Deliverable not found.");
        var c = new DeliverableComment
        {
            TenantId = tenantId, DeliverableId = deliverableId, UserId = userId,
            Content = content.Trim(), CreatedAt = DateTime.UtcNow,
        };
        _db.DeliverableComments.Add(c);
        await _db.SaveChangesAsync();
        return (c, null);
    }

    public async Task<object> GetDashboardAsync(int tenantId)
    {
        var all = await _db.Deliverables.Where(d => d.TenantId == tenantId).ToListAsync();
        var now = DateTime.UtcNow;
        var soon = now.AddDays(7);
        return new
        {
            total = all.Count,
            by_status = Enum.GetValues<DeliverableStatus>()
                .ToDictionary(s => s.ToString().ToLower(), s => all.Count(d => d.Status == s)),
            by_priority = Enum.GetValues<DeliverablePriority>()
                .ToDictionary(p => p.ToString().ToLower(), p => all.Count(d => d.Priority == p)),
            overdue_count = all.Count(d => d.DueDate.HasValue && d.DueDate < now
                && d.Status != DeliverableStatus.Completed && d.Status != DeliverableStatus.Cancelled),
            due_soon_count = all.Count(d => d.DueDate.HasValue && d.DueDate >= now && d.DueDate <= soon),
        };
    }

    public async Task<object> GetAnalyticsAsync(int tenantId)
    {
        var completed = await _db.Deliverables
            .Where(d => d.TenantId == tenantId && d.Status == DeliverableStatus.Completed)
            .ToListAsync();
        var total = await _db.Deliverables.CountAsync(d => d.TenantId == tenantId);
        var completionRate = total > 0 ? (double)completed.Count / total * 100 : 0;
        var avgDays = completed
            .Where(d => d.CompletedAt.HasValue)
            .Select(d => (d.CompletedAt!.Value - d.CreatedAt).TotalDays)
            .DefaultIfEmpty(0).Average();
        var byAssignee = await _db.Deliverables
            .Include(d => d.AssignedTo)
            .Where(d => d.TenantId == tenantId && d.AssignedToUserId.HasValue)
            .GroupBy(d => new { d.AssignedToUserId, d.AssignedTo })
            .Select(g => new {
                assignee_id = g.Key.AssignedToUserId,
                name = g.Key.AssignedTo != null ? (g.Key.AssignedTo.FirstName + " " + g.Key.AssignedTo.LastName).Trim() : null,
                count = g.Count() })
            .ToListAsync();
        return new
        {
            completion_rate = Math.Round(completionRate, 1),
            avg_completion_days = Math.Round(avgDays, 1),
            by_assignee = byAssignee,
        };
    }
}

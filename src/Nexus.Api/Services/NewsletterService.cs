// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for newsletter management and subscription handling.
/// Phase 31: Newsletter system.
/// </summary>
public class NewsletterService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<NewsletterService> _logger;

    public NewsletterService(
        NexusDbContext db,
        TenantContext tenantContext,
        ILogger<NewsletterService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Create a new newsletter draft.
    /// </summary>
    public async Task<Newsletter> CreateNewsletterAsync(
        int adminId,
        string subject,
        string contentHtml,
        string? contentText = null,
        DateTime? scheduledAt = null)
    {
        var newsletter = new Newsletter
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            Subject = subject,
            ContentHtml = contentHtml,
            ContentText = contentText,
            Status = scheduledAt.HasValue ? NewsletterStatus.Scheduled : NewsletterStatus.Draft,
            ScheduledAt = scheduledAt,
            CreatedById = adminId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<Newsletter>().Add(newsletter);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Newsletter {NewsletterId} created by admin {AdminId} in tenant {TenantId}",
            newsletter.Id, adminId, newsletter.TenantId);

        return newsletter;
    }

    /// <summary>
    /// Update a newsletter (only if Draft or Scheduled).
    /// </summary>
    public async Task<Newsletter?> UpdateNewsletterAsync(
        int id,
        string? subject = null,
        string? contentHtml = null,
        string? contentText = null,
        DateTime? scheduledAt = null)
    {
        var newsletter = await _db.Set<Newsletter>()
            .FirstOrDefaultAsync(n => n.Id == id);

        if (newsletter == null) return null;

        if (newsletter.Status != NewsletterStatus.Draft && newsletter.Status != NewsletterStatus.Scheduled)
        {
            throw new InvalidOperationException(
                $"Cannot update newsletter in {newsletter.Status} status. Only Draft or Scheduled newsletters can be edited.");
        }

        if (subject != null) newsletter.Subject = subject;
        if (contentHtml != null) newsletter.ContentHtml = contentHtml;
        if (contentText != null) newsletter.ContentText = contentText;

        if (scheduledAt.HasValue)
        {
            newsletter.ScheduledAt = scheduledAt;
            newsletter.Status = NewsletterStatus.Scheduled;
        }

        newsletter.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Newsletter {NewsletterId} updated", id);
        return newsletter;
    }

    /// <summary>
    /// List newsletters with optional status filter and pagination.
    /// </summary>
    public async Task<(List<Newsletter> Items, int Total)> GetNewslettersAsync(
        NewsletterStatus? status = null,
        int page = 1,
        int limit = 20)
    {
        var query = _db.Set<Newsletter>()
            .AsNoTracking()
            .Include(n => n.CreatedBy)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(n => n.Status == status.Value);
        }

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return (items, total);
    }

    /// <summary>
    /// Get a single newsletter by ID.
    /// </summary>
    public async Task<Newsletter?> GetNewsletterAsync(int id)
    {
        return await _db.Set<Newsletter>()
            .AsNoTracking()
            .Include(n => n.CreatedBy)
            .FirstOrDefaultAsync(n => n.Id == id);
    }

    /// <summary>
    /// Send a newsletter. Marks as Sending and counts active subscribers as recipients.
    /// </summary>
    public async Task<Newsletter?> SendNewsletterAsync(int id)
    {
        var newsletter = await _db.Set<Newsletter>()
            .FirstOrDefaultAsync(n => n.Id == id);

        if (newsletter == null) return null;

        if (newsletter.Status != NewsletterStatus.Draft && newsletter.Status != NewsletterStatus.Scheduled)
        {
            throw new InvalidOperationException(
                $"Cannot send newsletter in {newsletter.Status} status. Only Draft or Scheduled newsletters can be sent.");
        }

        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var recipientCount = await _db.Set<NewsletterSubscription>()
            .CountAsync(s => s.TenantId == tenantId && s.IsSubscribed);

        // TODO: Actual email dispatch must be implemented (e.g. via a background service / email provider).
        // For now we mark as Queued so callers know dispatch has not yet occurred.
        newsletter.Status = NewsletterStatus.Queued;
        newsletter.RecipientCount = recipientCount;
        newsletter.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Newsletter {NewsletterId} queued for {RecipientCount} recipients in tenant {TenantId}",
            id, recipientCount, tenantId);

        return newsletter;
    }

    /// <summary>
    /// Cancel a scheduled newsletter.
    /// </summary>
    public async Task<Newsletter?> CancelNewsletterAsync(int id)
    {
        var newsletter = await _db.Set<Newsletter>()
            .FirstOrDefaultAsync(n => n.Id == id);

        if (newsletter == null) return null;

        if (newsletter.Status != NewsletterStatus.Draft && newsletter.Status != NewsletterStatus.Scheduled)
        {
            throw new InvalidOperationException(
                $"Cannot cancel newsletter in {newsletter.Status} status.");
        }

        newsletter.Status = NewsletterStatus.Cancelled;
        newsletter.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Newsletter {NewsletterId} cancelled", id);
        return newsletter;
    }

    /// <summary>
    /// Subscribe an email to the newsletter.
    /// If the email already exists, re-subscribes it.
    /// </summary>
    public async Task<NewsletterSubscription> SubscribeAsync(
        string email,
        int? userId = null,
        string? source = null)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var existing = await _db.Set<NewsletterSubscription>()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Email == normalizedEmail);

        if (existing != null)
        {
            if (!existing.IsSubscribed)
            {
                existing.IsSubscribed = true;
                existing.SubscribedAt = DateTime.UtcNow;
                existing.UnsubscribedAt = null;
                existing.Source = source ?? existing.Source;
                if (userId.HasValue) existing.UserId = userId;
                await _db.SaveChangesAsync();

                _logger.LogInformation(
                    "Email {Email} re-subscribed to newsletter in tenant {TenantId}",
                    normalizedEmail, tenantId);
            }
            return existing;
        }

        var subscription = new NewsletterSubscription
        {
            TenantId = tenantId,
            UserId = userId,
            Email = normalizedEmail,
            IsSubscribed = true,
            SubscribedAt = DateTime.UtcNow,
            Source = source ?? "manual",
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<NewsletterSubscription>().Add(subscription);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Email {Email} subscribed to newsletter in tenant {TenantId}",
            normalizedEmail, tenantId);

        return subscription;
    }

    /// <summary>
    /// Unsubscribe an email from the newsletter.
    /// </summary>
    public async Task<bool> UnsubscribeAsync(string email)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var subscription = await _db.Set<NewsletterSubscription>()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Email == normalizedEmail);

        if (subscription == null) return false;

        subscription.IsSubscribed = false;
        subscription.UnsubscribedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Email {Email} unsubscribed from newsletter in tenant {TenantId}",
            normalizedEmail, tenantId);

        return true;
    }

    /// <summary>
    /// List newsletter subscribers with pagination.
    /// </summary>
    public async Task<(List<NewsletterSubscription> Items, int Total)> GetSubscribersAsync(
        int page = 1,
        int limit = 20,
        bool? subscribedOnly = null)
    {
        var query = _db.Set<NewsletterSubscription>()
            .AsNoTracking()
            .AsQueryable();

        if (subscribedOnly == true)
        {
            query = query.Where(s => s.IsSubscribed);
        }
        else if (subscribedOnly == false)
        {
            query = query.Where(s => !s.IsSubscribed);
        }

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(s => s.SubscribedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return (items, total);
    }

    /// <summary>
    /// Get subscription statistics: total, active, unsubscribed counts.
    /// </summary>
    public async Task<SubscriptionStats> GetSubscriptionStatsAsync()
    {
        var stats = await _db.Set<NewsletterSubscription>()
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new SubscriptionStats
            {
                Total = g.Count(),
                Active = g.Count(s => s.IsSubscribed),
                Unsubscribed = g.Count(s => !s.IsSubscribed)
            })
            .FirstOrDefaultAsync() ?? new SubscriptionStats();

        return stats;
    }
}

public class SubscriptionStats
{
    public int Total { get; set; }
    public int Active { get; set; }
    public int Unsubscribed { get; set; }
}

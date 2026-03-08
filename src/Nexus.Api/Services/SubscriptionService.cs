// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Manages subscription plans and user plan assignments for a tenant.
/// Billing integration (Stripe) is optional; the service stores IDs but does not charge.
/// </summary>
public class SubscriptionService
{
    private readonly NexusDbContext _db;
    private readonly ILogger<SubscriptionService> _logger;

    public SubscriptionService(NexusDbContext db, ILogger<SubscriptionService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ── Plans ──────────────────────────────────────────────────────────────

    public async Task<List<SubscriptionPlan>> ListPlansAsync(int tenantId)
        => await _db.SubscriptionPlans
            .Where(p => p.TenantId == tenantId && p.IsActive && p.IsPublic)
            .OrderBy(p => p.Price)
            .ToListAsync();

    public async Task<SubscriptionPlan?> GetPlanAsync(int tenantId, int planId)
        => await _db.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == planId);

    public async Task<(SubscriptionPlan? Plan, string? Error)> CreatePlanAsync(
        int tenantId, string name, string? description, decimal price, string currency,
        int maxMembers, int maxListings, int maxExchanges, string[] features)
    {
        if (string.IsNullOrWhiteSpace(name))
            return (null, "Plan name is required.");

        var plan = new SubscriptionPlan
        {
            TenantId = tenantId,
            Name = name.Trim(),
            Description = description?.Trim(),
            Price = price,
            Currency = currency.ToUpperInvariant(),
            MaxMembers = maxMembers,
            MaxListings = maxListings,
            MaxExchangesPerMonth = maxExchanges,
            Features = System.Text.Json.JsonSerializer.Serialize(features),
            IsActive = true,
            IsPublic = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.SubscriptionPlans.Add(plan);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Created subscription plan {PlanId} for tenant {TenantId}", plan.Id, tenantId);
        return (plan, null);
    }

    public async Task<(SubscriptionPlan? Plan, string? Error)> UpdatePlanAsync(
        int tenantId, int planId, string? name, string? description, decimal? price,
        bool? isActive, bool? isPublic)
    {
        var plan = await GetPlanAsync(tenantId, planId);
        if (plan is null)
            return (null, "Plan not found.");

        if (name is not null) plan.Name = name.Trim();
        if (description is not null) plan.Description = description.Trim();
        if (price.HasValue) plan.Price = price.Value;
        if (isActive.HasValue) plan.IsActive = isActive.Value;
        if (isPublic.HasValue) plan.IsPublic = isPublic.Value;
        plan.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return (plan, null);
    }

    public async Task<(bool Success, string? Error)> DeletePlanAsync(int tenantId, int planId)
    {
        var plan = await GetPlanAsync(tenantId, planId);
        if (plan is null)
            return (false, "Plan not found.");

        var hasSubscriptions = await _db.UserSubscriptions
            .AnyAsync(s => s.PlanId == planId && s.Status == SubscriptionStatus.Active);
        if (hasSubscriptions)
            return (false, "Cannot delete a plan with active subscribers. Deactivate it instead.");

        _db.SubscriptionPlans.Remove(plan);
        await _db.SaveChangesAsync();
        return (true, null);
    }

    // ── User Subscriptions ─────────────────────────────────────────────────

    public async Task<UserSubscription?> GetUserSubscriptionAsync(int tenantId, int userId)
        => await _db.UserSubscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s =>
                s.TenantId == tenantId &&
                s.UserId == userId &&
                s.Status == SubscriptionStatus.Active);

    public async Task<(UserSubscription? Subscription, string? Error)> AssignPlanAsync(
        int tenantId, int userId, int planId)
    {
        var plan = await GetPlanAsync(tenantId, planId);
        if (plan is null || !plan.IsActive)
            return (null, "Plan not found or inactive.");

        // Cancel existing active subscription
        var existing = await GetUserSubscriptionAsync(tenantId, userId);
        if (existing is not null)
        {
            existing.Status = SubscriptionStatus.Cancelled;
            existing.CancelledAt = DateTime.UtcNow;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        var sub = new UserSubscription
        {
            TenantId = tenantId,
            UserId = userId,
            PlanId = planId,
            Status = SubscriptionStatus.Active,
            StartedAt = DateTime.UtcNow,
            NextBillingDate = DateTime.UtcNow.AddMonths(1),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.UserSubscriptions.Add(sub);
        await _db.SaveChangesAsync();
        await _db.Entry(sub).Reference(s => s.Plan).LoadAsync();
        _logger.LogInformation("User {UserId} subscribed to plan {PlanId} on tenant {TenantId}", userId, planId, tenantId);
        return (sub, null);
    }

    public async Task<(bool Success, string? Error)> CancelSubscriptionAsync(int tenantId, int userId)
    {
        var sub = await GetUserSubscriptionAsync(tenantId, userId);
        if (sub is null)
            return (false, "No active subscription found.");

        sub.Status = SubscriptionStatus.Cancelled;
        sub.CancelledAt = DateTime.UtcNow;
        sub.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(List<UserSubscription> Subscriptions, int Total)> ListSubscriptionsAsync(
        int tenantId, int page, int limit)
    {
        var query = _db.UserSubscriptions
            .Include(s => s.User)
            .Include(s => s.Plan)
            .Where(s => s.TenantId == tenantId)
            .OrderByDescending(s => s.CreatedAt);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return (items, total);
    }

    public async Task<List<UserSubscription>> GetExpiringSubscriptionsAsync(int tenantId, int daysAhead)
    {
        var cutoff = DateTime.UtcNow.AddDays(daysAhead);
        return await _db.UserSubscriptions
            .Include(s => s.User)
            .Include(s => s.Plan)
            .Where(s =>
                s.TenantId == tenantId &&
                s.Status == SubscriptionStatus.Active &&
                s.ExpiresAt.HasValue &&
                s.ExpiresAt <= cutoff)
            .OrderBy(s => s.ExpiresAt)
            .ToListAsync();
    }
}

// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Data;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

[ApiController]
public class SubscriptionsController : ControllerBase
{
    private readonly SubscriptionService _subscriptions;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<SubscriptionsController> _logger;

    public SubscriptionsController(
        SubscriptionService subscriptions,
        TenantContext tenantContext,
        ILogger<SubscriptionsController> logger)
    {
        _subscriptions = subscriptions;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    private int? GetCurrentUserId() => User.GetUserId();

    [AllowAnonymous]
    [HttpGet("api/subscriptions/plans")]
    public async Task<IActionResult> ListPlans()
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var plans = await _subscriptions.ListPlansAsync(_tenantContext.TenantId.Value);
        return Ok(new { data = plans.Select(p => new {
            id = p.Id, name = p.Name, description = p.Description,
            price = p.Price, currency = p.Currency,
            max_members = p.MaxMembers, max_listings = p.MaxListings,
            max_exchanges_per_month = p.MaxExchangesPerMonth,
            features = p.Features, created_at = p.CreatedAt }),
            total = plans.Count });
    }

    [AllowAnonymous]
    [HttpGet("api/subscriptions/plans/{id:int}")]
    public async Task<IActionResult> GetPlan(int id)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var plan = await _subscriptions.GetPlanAsync(_tenantContext.TenantId.Value, id);
        if (plan is null || !plan.IsActive || !plan.IsPublic)
            return NotFound(new { error = "Plan not found." });
        return Ok(new { id = plan.Id, name = plan.Name, description = plan.Description,
            price = plan.Price, currency = plan.Currency, max_members = plan.MaxMembers,
            max_listings = plan.MaxListings, max_exchanges_per_month = plan.MaxExchangesPerMonth,
            features = plan.Features, created_at = plan.CreatedAt });
    }

    [Authorize]
    [HttpGet("api/subscriptions/my")]
    public async Task<IActionResult> GetMySubscription()
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();
        var sub = await _subscriptions.GetUserSubscriptionAsync(_tenantContext.TenantId.Value, userId.Value);
        if (sub is null) return Ok(new { subscription = (object?)null });
        return Ok(new { subscription = new { id = sub.Id, plan_id = sub.PlanId,
            plan_name = sub.Plan != null ? sub.Plan.Name : null,
            status = sub.Status.ToString(), started_at = sub.StartedAt,
            expires_at = sub.ExpiresAt, next_billing_date = sub.NextBillingDate } });
    }

    [Authorize]
    [HttpPost("api/subscriptions/subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest req)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();
        var (sub, error) = await _subscriptions.AssignPlanAsync(
            _tenantContext.TenantId.Value, userId.Value, req.PlanId);
        if (error is not null) return BadRequest(new { error });
        return Ok(new { message = "Subscribed successfully.",
            subscription_id = sub!.Id, plan_id = sub.PlanId,
            status = sub.Status.ToString(), started_at = sub.StartedAt,
            next_billing_date = sub.NextBillingDate });
    }

    [Authorize]
    [HttpDelete("api/subscriptions/cancel")]
    public async Task<IActionResult> Cancel()
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();
        var (success, error) = await _subscriptions.CancelSubscriptionAsync(
            _tenantContext.TenantId.Value, userId.Value);
        if (!success) return BadRequest(new { error });
        return Ok(new { message = "Subscription cancelled." });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("api/admin/subscriptions/plans")]
    public async Task<IActionResult> AdminListPlans()
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var plans = await _subscriptions.ListPlansAsync(_tenantContext.TenantId.Value);
        return Ok(new { data = plans.Select(p => new {
            id = p.Id, name = p.Name, description = p.Description,
            price = p.Price, currency = p.Currency, max_members = p.MaxMembers,
            max_listings = p.MaxListings, max_exchanges_per_month = p.MaxExchangesPerMonth,
            features = p.Features, is_active = p.IsActive, is_public = p.IsPublic,
            created_at = p.CreatedAt, updated_at = p.UpdatedAt }),
            total = plans.Count });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("api/admin/subscriptions/plans")]
    public async Task<IActionResult> AdminCreatePlan([FromBody] CreatePlanRequest req)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var (plan, error) = await _subscriptions.CreatePlanAsync(
            _tenantContext.TenantId.Value, req.Name, req.Description, req.Price,
            req.Currency ?? "EUR", req.MaxMembers, req.MaxListings,
            req.MaxExchangesPerMonth, req.Features ?? Array.Empty<string>());
        if (error is not null) return BadRequest(new { error });
        return Ok(new { message = "Plan created.", id = plan!.Id, name = plan.Name });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("api/admin/subscriptions/plans/{id:int}")]
    public async Task<IActionResult> AdminUpdatePlan(int id, [FromBody] UpdatePlanRequest req)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var (plan, error) = await _subscriptions.UpdatePlanAsync(
            _tenantContext.TenantId.Value, id,
            req.Name, req.Description, req.Price, req.IsActive, req.IsPublic);
        if (error is not null)
            return error == "Plan not found." ? NotFound(new { error }) : BadRequest(new { error });
        return Ok(new { message = "Plan updated.", id = plan!.Id });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("api/admin/subscriptions/plans/{id:int}")]
    public async Task<IActionResult> AdminDeletePlan(int id)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var (success, error) = await _subscriptions.DeletePlanAsync(_tenantContext.TenantId.Value, id);
        if (!success)
            return error == "Plan not found." ? NotFound(new { error }) : BadRequest(new { error });
        return Ok(new { message = "Plan deleted." });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("api/admin/subscriptions")]
    public async Task<IActionResult> AdminListSubscriptions(
        [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var (subs, total) = await _subscriptions.ListSubscriptionsAsync(
            _tenantContext.TenantId.Value, page, limit);
        return Ok(new
        {
            data = subs.Select(s => new
            {
                id = s.Id, user_id = s.UserId,
                user_name = s.User != null ? (s.User.FirstName + " " + s.User.LastName).Trim() : null,
                user_email = s.User != null ? s.User.Email : null,
                plan_id = s.PlanId, plan_name = s.Plan != null ? s.Plan.Name : null,
                status = s.Status.ToString(), started_at = s.StartedAt,
                expires_at = s.ExpiresAt, cancelled_at = s.CancelledAt,
                next_billing_date = s.NextBillingDate,
                stripe_subscription_id = s.StripeSubscriptionId,
                created_at = s.CreatedAt,
            }),
            total, page,
            pages = (int)System.Math.Ceiling(total / (double)limit),
        });
    }
}

public record SubscribeRequest(int PlanId);
public record CreatePlanRequest(string Name, string? Description, decimal Price, string? Currency,
    int MaxMembers, int MaxListings, int MaxExchangesPerMonth, string[]? Features);
public record UpdatePlanRequest(string? Name, string? Description, decimal? Price,
    bool? IsActive, bool? IsPublic);

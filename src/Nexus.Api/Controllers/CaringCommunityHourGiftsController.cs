// Copyright (c) 2024-2026 Jasper Ford
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
[Route("api/caring-community/hour-gifts")]
[Authorize]
public sealed class CaringCommunityHourGiftsController : ControllerBase
{
    private readonly CaringHourGiftService _gifts;
    private readonly TenantContext _tenant;

    public CaringCommunityHourGiftsController(
        CaringHourGiftService gifts,
        TenantContext tenant)
    {
        _gifts = gifts;
        _tenant = tenant;
    }

    [HttpGet("inbox")]
    public async Task<IActionResult> Inbox(CancellationToken ct)
    {
        var guard = await GuardAsync(ct);
        if (guard is not null)
        {
            return guard;
        }

        var userId = User.GetUserId();
        if (userId is null)
        {
            return Unauthorized(LaravelError("AUTH_REQUIRED", "Authentication required."));
        }

        var items = await _gifts.InboxAsync(_tenant.GetTenantIdOrThrow(), userId.Value, ct);
        return Ok(new { data = new { items } });
    }

    [HttpGet("sent")]
    public async Task<IActionResult> Sent(CancellationToken ct)
    {
        var guard = await GuardAsync(ct);
        if (guard is not null)
        {
            return guard;
        }

        var userId = User.GetUserId();
        if (userId is null)
        {
            return Unauthorized(LaravelError("AUTH_REQUIRED", "Authentication required."));
        }

        var items = await _gifts.SentAsync(_tenant.GetTenantIdOrThrow(), userId.Value, ct);
        return Ok(new { data = new { items } });
    }

    [HttpPost("{id}/accept")]
    public async Task<IActionResult> Accept(long id, CancellationToken ct)
    {
        var guard = await GuardAsync(ct);
        if (guard is not null)
        {
            return guard;
        }

        var userId = User.GetUserId();
        if (userId is null)
        {
            return Unauthorized(LaravelError("AUTH_REQUIRED", "Authentication required."));
        }

        try
        {
            await _gifts.AcceptAsync(_tenant.GetTenantIdOrThrow(), id, userId.Value, ct);
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(LaravelError("GIFT_ACCEPT_FAILED", ex.Message));
        }

        return Ok(new { data = new { success = true } });
    }

    private async Task<IActionResult?> GuardAsync(CancellationToken ct)
    {
        var tenantId = _tenant.GetTenantIdOrThrow();
        if (!await _gifts.IsFeatureEnabledAsync(tenantId, ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                LaravelError("FEATURE_DISABLED", "Service unavailable."));
        }

        return null;
    }

    private static object LaravelError(string code, string message)
    {
        return new
        {
            errors = new[]
            {
                new
                {
                    code,
                    message
                }
            }
        };
    }
}

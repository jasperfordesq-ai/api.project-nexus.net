// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

[ApiController]
[Authorize]
public class ShiftManagementController : ControllerBase
{
    private readonly ShiftManagementService _svc;

    public ShiftManagementController(ShiftManagementService svc) => _svc = svc;

    // ── Recurring Patterns ────────────────────────────────────────────────────

    [HttpGet("api/volunteering/opportunities/{opportunityId:int}/recurring-patterns")]
    public async Task<IActionResult> GetPatterns(int opportunityId)
    {
        var patterns = await _svc.GetPatternsAsync(opportunityId);
        return Ok(patterns);
    }

    [HttpPost("api/volunteering/opportunities/{opportunityId:int}/recurring-patterns")]
    public async Task<IActionResult> CreatePattern(
        int opportunityId, [FromBody] CreatePatternRequest req)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var (pattern, error) = await _svc.CreatePatternAsync(opportunityId, userId.Value, req);
        if (error != null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetPatterns),
            new { opportunityId }, pattern);
    }

    [HttpPut("api/volunteering/recurring-patterns/{patternId:int}")]
    public async Task<IActionResult> UpdatePattern(
        int patternId, [FromBody] CreatePatternRequest req)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var (pattern, error) = await _svc.UpdatePatternAsync(patternId, userId.Value, req);
        if (error != null) return NotFound(new { error });
        return Ok(pattern);
    }

    [HttpDelete("api/volunteering/recurring-patterns/{patternId:int}")]
    public async Task<IActionResult> DeactivatePattern(int patternId)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var error = await _svc.DeactivatePatternAsync(patternId, userId.Value);
        if (error != null) return NotFound(new { error });
        return NoContent();
    }

    // ── Shift Swaps ───────────────────────────────────────────────────────────

    [HttpGet("api/volunteering/swaps")]
    public async Task<IActionResult> GetSwaps()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var swaps = await _svc.GetSwapRequestsAsync(userId.Value);
        return Ok(swaps);
    }

    [HttpPost("api/volunteering/swaps")]
    public async Task<IActionResult> RequestSwap([FromBody] SwapRequest req)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var (swap, error) = await _svc.RequestSwapAsync(userId.Value, req);
        if (error != null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetSwaps), swap);
    }

    [HttpPut("api/volunteering/swaps/{swapId:int}")]
    public async Task<IActionResult> RespondToSwap(int swapId, [FromBody] RespondSwapDto dto)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var (swap, error) = await _svc.RespondToSwapAsync(swapId, userId.Value, dto.Accept);
        if (error != null) return BadRequest(new { error });
        return Ok(swap);
    }

    [HttpDelete("api/volunteering/swaps/{swapId:int}")]
    public async Task<IActionResult> CancelSwap(int swapId)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var error = await _svc.CancelSwapAsync(swapId, userId.Value);
        if (error != null) return BadRequest(new { error });
        return NoContent();
    }

    // ── Waitlist ──────────────────────────────────────────────────────────────

    [HttpGet("api/volunteering/my-waitlists")]
    public async Task<IActionResult> GetMyWaitlists()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var entries = await _svc.GetUserWaitlistsAsync(userId.Value);
        return Ok(entries);
    }

    [HttpPost("api/volunteering/shifts/{shiftId:int}/waitlist")]
    public async Task<IActionResult> JoinWaitlist(int shiftId)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var (entry, error) = await _svc.JoinWaitlistAsync(shiftId, userId.Value);
        if (error != null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetMyWaitlists), entry);
    }

    [HttpDelete("api/volunteering/shifts/{shiftId:int}/waitlist")]
    public async Task<IActionResult> LeaveWaitlist(int shiftId)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var error = await _svc.LeaveWaitlistAsync(shiftId, userId.Value);
        if (error != null) return BadRequest(new { error });
        return NoContent();
    }

    [HttpPost("api/volunteering/shifts/{shiftId:int}/waitlist/promote")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> PromoteFromWaitlist(int shiftId)
    {
        var (entry, error) = await _svc.PromoteFromWaitlistAsync(shiftId);
        if (error != null) return BadRequest(new { error });
        return Ok(entry);
    }

    // ── Group Reservations ────────────────────────────────────────────────────

    [HttpGet("api/volunteering/group-reservations")]
    public async Task<IActionResult> GetGroupReservations()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var reservations = await _svc.GetUserGroupReservationsAsync(userId.Value);
        return Ok(reservations);
    }

    [HttpPost("api/volunteering/shifts/{shiftId:int}/group-reserve")]
    public async Task<IActionResult> CreateGroupReservation(
        int shiftId, [FromBody] GroupReservationRequest req)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var (reservation, error) = await _svc.CreateGroupReservationAsync(shiftId, userId.Value, req);
        if (error != null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetGroupReservations), reservation);
    }

    [HttpPost("api/volunteering/group-reservations/{reservationId:int}/members")]
    public async Task<IActionResult> AddGroupMember(
        int reservationId, [FromBody] AddGroupMemberRequest req)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var (member, error) = await _svc.AddGroupMemberAsync(reservationId, userId.Value, req);
        if (error != null) return BadRequest(new { error });
        return Ok(member);
    }

    [HttpDelete("api/volunteering/group-reservations/{reservationId:int}/members/{memberId:int}")]
    public async Task<IActionResult> RemoveGroupMember(int reservationId, int memberId)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var error = await _svc.RemoveGroupMemberAsync(reservationId, memberId, userId.Value);
        if (error != null) return BadRequest(new { error });
        return NoContent();
    }

    [HttpDelete("api/volunteering/group-reservations/{reservationId:int}")]
    public async Task<IActionResult> CancelGroupReservation(int reservationId)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var error = await _svc.CancelGroupReservationAsync(reservationId, userId.Value);
        if (error != null) return BadRequest(new { error });
        return NoContent();
    }
}

public record RespondSwapDto(bool Accept);

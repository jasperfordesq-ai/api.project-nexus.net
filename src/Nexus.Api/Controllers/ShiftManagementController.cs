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
    public async Task<IActionResult> GetMyWaitlists(CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return AuthError();
        if (await FeatureDisabledAsync(ct) is { } featureError) return featureError;
        var entries = await _svc.GetUserWaitlistsAsync(userId.Value, ct);
        if (!IsCanonicalV2) return Ok(entries);

        return Ok(new
        {
            data = entries.Select(entry => new
            {
                id = entry.Id,
                position = entry.Position,
                status = entry.Status,
                notified_at = entry.NotifiedAt,
                shift = new
                {
                    id = entry.Shift.Id,
                    start_time = entry.Shift.StartsAt,
                    end_time = entry.Shift.EndsAt,
                    capacity = entry.Shift.Capacity
                },
                opportunity = new
                {
                    id = entry.Opportunity.Id,
                    title = entry.Opportunity.Title,
                    location = entry.Opportunity.Location
                },
                organization = new { id = 0, name = string.Empty, logo_url = (string?)null },
                joined_at = entry.JoinedAt
            }),
            meta = Meta(entries.Count)
        });
    }

    [HttpPost("api/volunteering/shifts/{shiftId:int}/waitlist")]
    public async Task<IActionResult> JoinWaitlist(int shiftId, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return AuthError();
        if (await FeatureDisabledAsync(ct) is { } featureError) return featureError;
        var (entry, error) = await _svc.JoinWaitlistAsync(shiftId, userId.Value, ct);
        if (error != null) return WorkflowError(error);
        return StatusCode(StatusCodes.Status201Created, new
        {
            data = new
            {
                id = entry!.Id,
                position = entry.Position,
                message = "Joined waitlist"
            },
            meta = IsCanonicalV2 ? Meta() : null
        });
    }

    [HttpDelete("api/volunteering/shifts/{shiftId:int}/waitlist")]
    public async Task<IActionResult> LeaveWaitlist(int shiftId, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return AuthError();
        if (await FeatureDisabledAsync(ct) is { } featureError) return featureError;
        var error = await _svc.LeaveWaitlistAsync(shiftId, userId.Value, ct);
        if (error != null) return WorkflowError(error);
        return NoContent();
    }

    [HttpPost("api/volunteering/shifts/{shiftId:int}/waitlist/promote")]
    public async Task<IActionResult> PromoteFromWaitlist(int shiftId, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return AuthError();
        if (await FeatureDisabledAsync(ct) is { } featureError) return featureError;
        var (entry, error) = await _svc.PromoteFromWaitlistAsync(shiftId, userId.Value, ct);
        if (error != null) return WorkflowError(error);
        return Ok(new
        {
            data = new
            {
                id = entry!.Id,
                shift_id = entry.ShiftId,
                message = "Claimed spot"
            },
            meta = IsCanonicalV2 ? Meta() : null
        });
    }

    // ── Group Reservations ────────────────────────────────────────────────────

    [HttpGet("api/volunteering/group-reservations")]
    public async Task<IActionResult> GetGroupReservations(CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return AuthError();
        if (await FeatureDisabledAsync(ct) is { } featureError) return featureError;
        var reservations = await _svc.GetUserGroupReservationsAsync(userId.Value, ct);
        if (!IsCanonicalV2) return Ok(reservations);

        return Ok(new
        {
            data = reservations.Select(reservation => new
            {
                id = reservation.Id,
                group_name = reservation.GroupName,
                status = reservation.Status,
                is_leader = reservation.IsLeader,
                shift = new
                {
                    id = reservation.Shift.Id,
                    start_time = reservation.Shift.StartsAt,
                    end_time = reservation.Shift.EndsAt
                },
                opportunity = new
                {
                    id = reservation.Opportunity.Id,
                    title = reservation.Opportunity.Title,
                    location = reservation.Opportunity.Location
                },
                organization = new { id = 0, name = string.Empty, logo_url = (string?)null },
                members = reservation.Members.Select(member => new
                {
                    id = member.Id,
                    name = member.Name,
                    avatar_url = member.AvatarUrl,
                    status = member.Status,
                    created_at = member.CreatedAt
                }),
                max_members = reservation.MaxMembers,
                created_at = reservation.CreatedAt
            }),
            meta = Meta(reservations.Count)
        });
    }

    [HttpPost("api/volunteering/shifts/{shiftId:int}/group-reserve")]
    public async Task<IActionResult> CreateGroupReservation(
        int shiftId,
        [FromBody] GroupReservationRequest req,
        CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return AuthError();
        if (await FeatureDisabledAsync(ct) is { } featureError) return featureError;
        if (IsCanonicalV2 && req.GroupId <= 0)
            return WorkflowError("Group ID is required", "group_id");
        var (reservation, error) = await _svc.CreateGroupReservationAsync(shiftId, userId.Value, req);
        if (error != null) return WorkflowError(error);
        return StatusCode(StatusCodes.Status201Created, new
        {
            data = new
            {
                id = reservation!.Id,
                message = $"Reserved {reservation.ReservedSlots} slots"
            },
            meta = IsCanonicalV2 ? Meta() : null
        });
    }

    [HttpPost("api/volunteering/group-reservations/{reservationId:int}/members")]
    public async Task<IActionResult> AddGroupMember(
        int reservationId,
        [FromBody] AddGroupMemberRequest req,
        CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return AuthError();
        if (await FeatureDisabledAsync(ct) is { } featureError) return featureError;
        if (IsCanonicalV2 && req.UserId <= 0)
            return WorkflowError("User ID is required", "user_id");
        var (member, error) = await _svc.AddGroupMemberAsync(reservationId, userId.Value, req);
        if (error != null) return WorkflowError(error);
        return Ok(new
        {
            data = new
            {
                id = member!.Id,
                user_id = member.UserId,
                message = "Member added to reservation"
            },
            meta = IsCanonicalV2 ? Meta() : null
        });
    }

    [HttpDelete("api/volunteering/group-reservations/{reservationId:int}/members/{userId:int}")]
    public async Task<IActionResult> RemoveGroupMember(
        int reservationId,
        int userId,
        CancellationToken ct = default)
    {
        var leaderUserId = User.GetUserId();
        if (leaderUserId == null) return AuthError();
        if (await FeatureDisabledAsync(ct) is { } featureError) return featureError;
        var error = await _svc.RemoveGroupMemberAsync(
            reservationId,
            userId,
            leaderUserId.Value,
            identifierIsLegacyMemberId: !IsCanonicalV2,
            ct: ct);
        if (error != null) return WorkflowError(error);
        return NoContent();
    }

    [HttpDelete("api/volunteering/group-reservations/{reservationId:int}")]
    public async Task<IActionResult> CancelGroupReservation(
        int reservationId,
        CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return AuthError();
        if (await FeatureDisabledAsync(ct) is { } featureError) return featureError;
        var error = await _svc.CancelGroupReservationAsync(reservationId, userId.Value);
        if (error != null) return WorkflowError(error);
        return NoContent();
    }

    private bool IsCanonicalV2 => Request.Path.StartsWithSegments("/api/v2");

    private async Task<IActionResult?> FeatureDisabledAsync(CancellationToken ct)
    {
        if (!IsCanonicalV2 || await _svc.IsVolunteeringEnabledAsync(ct))
        {
            return null;
        }

        return StatusCode(StatusCodes.Status403Forbidden, new
        {
            errors = new[]
            {
                new
                {
                    code = "FEATURE_DISABLED",
                    message = "Volunteering module is not enabled for this community"
                }
            }
        });
    }

    private IActionResult AuthError() => IsCanonicalV2
        ? StatusCode(StatusCodes.Status401Unauthorized, new
        {
            errors = new[] { new { code = "UNAUTHORIZED", message = "Invalid token" } }
        })
        : Unauthorized(new { error = "Invalid token" });

    private IActionResult WorkflowError(string message, string? field = null)
    {
        if (!IsCanonicalV2)
        {
            return BadRequest(new { error = message });
        }

        var (code, statusCode, inferredField) = ClassifyError(message);
        return StatusCode(statusCode, new
        {
            errors = new[]
            {
                new
                {
                    code,
                    message,
                    field = field ?? inferredField
                }
            }
        });
    }

    private static (string Code, int StatusCode, string? Field) ClassifyError(string message)
    {
        if (message == VolunteerGuardianConsentService.RequiredMessage)
        {
            return (
                VolunteerGuardianConsentService.RequiredCode,
                StatusCodes.Status403Forbidden,
                null);
        }

        if (message is "Shift not found"
            or "Opportunity not found or is not active"
            or "Waitlist entry not found"
            or "You are not on the waitlist for this shift"
            or "Group not found"
            or "Reservation not found"
            or "Member not found in this reservation")
        {
            return ("NOT_FOUND", StatusCodes.Status404NotFound, null);
        }

        if (message is "You must have an approved application to sign up for shifts"
            or "Only group leaders/admins can reserve slots for this group"
            or "Only group leaders/admins can manage this reservation"
            or "Only group leaders/admins can cancel this reservation")
        {
            return ("FORBIDDEN", StatusCodes.Status403Forbidden, null);
        }

        if (message is "You are already on the waitlist for this shift"
            or "You are already signed up for this shift"
            or "This group already has a reservation for this shift"
            or "User is already in this group reservation")
        {
            return ("ALREADY_EXISTS", StatusCodes.Status409Conflict, null);
        }

        if (message.StartsWith("Failed to ", StringComparison.Ordinal)
            || message.StartsWith("Could not ", StringComparison.Ordinal))
        {
            return ("SERVER_ERROR", StatusCodes.Status500InternalServerError, null);
        }

        var inferredField = message switch
        {
            "Group ID is required" => "group_id",
            "User ID is required" or "Invalid user" => "user_id",
            "Must reserve at least 1 slot" => "reserved_slots",
            _ when message.StartsWith("Only ", StringComparison.Ordinal)
                && message.EndsWith(" slots available", StringComparison.Ordinal) => "reserved_slots",
            _ => null
        };
        return ("VALIDATION_ERROR", StatusCodes.Status422UnprocessableEntity, inferredField);
    }

    private object Meta(int? total = null) => new
    {
        base_url = $"{Request.Scheme}://{Request.Host}",
        total
    };
}

public record RespondSwapDto(bool Accept);

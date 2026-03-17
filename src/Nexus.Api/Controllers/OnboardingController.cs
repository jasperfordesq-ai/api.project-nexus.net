// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Onboarding wizard endpoints.
/// </summary>
[ApiController]
[Route("api/onboarding")]
[Authorize]
public class OnboardingController : ControllerBase
{
    private readonly OnboardingService _onboarding;

    public OnboardingController(OnboardingService onboarding)
    {
        _onboarding = onboarding;
    }

    /// <summary>
    /// GET /api/onboarding/steps - Get onboarding steps.
    /// </summary>
    [HttpGet("steps")]
    public async Task<IActionResult> GetSteps()
    {
        var steps = await _onboarding.GetStepsAsync();
        return Ok(new
        {
            data = steps.Select(s => new
            {
                s.Id, s.Key, s.Title, s.Description, sort_order = s.SortOrder,
                is_required = s.IsRequired, xp_reward = s.XpReward
            })
        });
    }

    /// <summary>
    /// GET /api/onboarding/progress - Get my onboarding progress.
    /// </summary>
    [HttpGet("progress")]
    public async Task<IActionResult> GetProgress()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var progress = await _onboarding.GetProgressAsync(userId.Value);
        return Ok(new { data = progress });
    }

    /// <summary>
    /// POST /api/onboarding/complete - Mark a step as complete.
    /// </summary>
    [HttpPost("complete")]
    public async Task<IActionResult> CompleteStep([FromBody] CompleteStepRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (success, error) = await _onboarding.CompleteStepAsync(userId.Value, request.StepKey);
        if (!success) return BadRequest(new { error });
        return Ok(new { message = "Step completed" });
    }

    /// <summary>
    /// POST /api/onboarding/reset - Reset onboarding progress.
    /// </summary>
    [HttpPost("reset")]
    public async Task<IActionResult> ResetProgress()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        await _onboarding.ResetProgressAsync(userId.Value);
        return Ok(new { message = "Progress reset" });
    }

    // Admin endpoints
    /// <summary>
    /// POST /api/onboarding/admin/steps - Create onboarding step.
    /// </summary>
    [HttpPost("admin/steps")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CreateStep([FromBody] CreateOnboardingStepRequest request)
    {
        var (step, error) = await _onboarding.CreateStepAsync(
            request.Key, request.Title, request.Description,
            request.SortOrder, request.IsRequired, request.XpReward);
        if (error != null) return BadRequest(new { error });
        return Created($"/api/onboarding/steps", new { data = new { step!.Id, step.Key, step.Title } });
    }

    /// <summary>
    /// PUT /api/onboarding/admin/steps/{id} - Update step.
    /// </summary>
    [HttpPut("admin/steps/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateStep(int id, [FromBody] UpdateOnboardingStepRequest request)
    {
        var (step, error) = await _onboarding.UpdateStepAsync(
            id, request.Title, request.Description, request.SortOrder, request.IsRequired, request.XpReward);
        if (error != null) return NotFound(new { error });
        return Ok(new { data = new { step!.Id, step.Key, step.Title } });
    }

    /// <summary>
    /// DELETE /api/onboarding/admin/steps/{id} - Delete step.
    /// </summary>
    [HttpDelete("admin/steps/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteStep(int id)
    {
        var error = await _onboarding.DeleteStepAsync(id);
        if (error != null) return NotFound(new { error });
        return Ok(new { message = "Step deleted" });
    }
}

public class CompleteStepRequest
{
    [JsonPropertyName("step_key")] public string StepKey { get; set; } = string.Empty;
}

public class CreateOnboardingStepRequest
{
    [JsonPropertyName("key")] public string Key { get; set; } = string.Empty;
    [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("sort_order")] public int SortOrder { get; set; } = 0;
    [JsonPropertyName("is_required")] public bool IsRequired { get; set; } = false;
    [JsonPropertyName("xp_reward")] public int XpReward { get; set; } = 0;
}

public class UpdateOnboardingStepRequest
{
    [JsonPropertyName("title")] public string? Title { get; set; }
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("sort_order")] public int? SortOrder { get; set; }
    [JsonPropertyName("is_required")] public bool? IsRequired { get; set; }
    [JsonPropertyName("xp_reward")] public int? XpReward { get; set; }
}

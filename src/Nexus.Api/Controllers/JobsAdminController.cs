// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Data;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin controller for job moderation and management.
/// </summary>
[ApiController]
[Route("api/admin/jobs")]
[Authorize(Policy = "AdminOnly")]
public class JobsAdminController : ControllerBase
{
    private readonly JobService _jobService;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<JobsAdminController> _logger;

    public JobsAdminController(JobService jobService, TenantContext tenantContext, ILogger<JobsAdminController> logger)
    {
        _jobService = jobService;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// List all jobs (any status) for admin moderation.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? status = null)
    {
        if (page < 1) page = 1;
        limit = Math.Clamp(limit, 1, 100);

        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context not resolved" });

        var (jobs, total) = await _jobService.ListAllJobsAsync(
            _tenantContext.TenantId.Value, status, page, limit);

        var data = jobs.Select(j => new
        {
            id = j.Id,
            title = j.Title,
            description = j.Description,
            category = j.Category,
            job_type = j.JobType,
            location = j.Location,
            is_remote = j.IsRemote,
            time_credits_per_hour = j.TimeCreditsPerHour,
            required_skills = j.RequiredSkills,
            contact_email = j.ContactEmail,
            status = j.Status,
            is_featured = j.IsFeatured,
            expires_at = j.ExpiresAt,
            filled_at = j.FilledAt,
            view_count = j.ViewCount,
            application_count = j.ApplicationCount,
            created_at = j.CreatedAt,
            updated_at = j.UpdatedAt,
            posted_by = j.PostedBy != null
                ? new
                {
                    id = j.PostedBy.Id,
                    first_name = j.PostedBy.FirstName,
                    last_name = j.PostedBy.LastName
                }
                : null
        });

        return Ok(new
        {
            data,
            pagination = new
            {
                page,
                limit,
                total,
                pages = (int)Math.Ceiling((double)total / limit)
            }
        });
    }

    /// <summary>
    /// Admin: change job status (override).
    /// </summary>
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] AdminUpdateJobStatusRequest request)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context not resolved" });

        if (string.IsNullOrWhiteSpace(request.Status))
            return BadRequest(new { error = "Status is required" });

        var (job, error) = await _jobService.AdminUpdateStatusAsync(
            _tenantContext.TenantId.Value, id, request.Status);

        if (error == "Job not found")
            return NotFound(new { error });

        if (error != null)
            return BadRequest(new { error });

        return Ok(new
        {
            id = job!.Id,
            title = job.Title,
            status = job.Status,
            updated_at = job.UpdatedAt
        });
    }

    /// <summary>
    /// Admin: toggle featured flag.
    /// </summary>
    [HttpPost("{id:int}/feature")]
    public async Task<IActionResult> ToggleFeatured(int id, [FromBody] AdminFeatureJobRequest request)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context not resolved" });

        var (job, error) = await _jobService.FeatureJobAsync(
            _tenantContext.TenantId.Value, id, request.Featured);

        if (error == "Job not found")
            return NotFound(new { error });

        if (error != null)
            return BadRequest(new { error });

        return Ok(new
        {
            id = job!.Id,
            title = job.Title,
            is_featured = job.IsFeatured,
            updated_at = job.UpdatedAt
        });
    }

    /// <summary>
    /// Admin: get job module statistics.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context not resolved" });

        var stats = await _jobService.GetJobStatsAsync(_tenantContext.TenantId.Value);

        return Ok(stats);
    }
}

// Admin DTOs

public class AdminUpdateJobStatusRequest
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}

public class AdminFeatureJobRequest
{
    [JsonPropertyName("featured")]
    public bool Featured { get; set; }
}

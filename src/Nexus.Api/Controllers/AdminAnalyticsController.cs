// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin analytics endpoints for platform metrics, growth tracking, and insights.
/// All endpoints require admin role.
/// </summary>
[ApiController]
[Route("api/admin/analytics")]
[Authorize(Policy = "AdminOnly")]
public class AdminAnalyticsController : ControllerBase
{
    private readonly AdminAnalyticsService _analyticsService;
    private readonly ILogger<AdminAnalyticsController> _logger;

    public AdminAnalyticsController(
        AdminAnalyticsService analyticsService,
        ILogger<AdminAnalyticsController> logger)
    {
        _analyticsService = analyticsService;
        _logger = logger;
    }

    /// <summary>
    /// Get platform overview with key metrics.
    /// </summary>
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var overview = await _analyticsService.GetPlatformOverviewAsync();
        return Ok(overview);
    }

    /// <summary>
    /// Get growth metrics as time-series data.
    /// </summary>
    /// <param name="days">Number of days to look back (default: 30, max: 365)</param>
    [HttpGet("growth")]
    public async Task<IActionResult> GetGrowth([FromQuery] int days = 30)
    {
        days = Math.Clamp(days, 1, 365);
        var growth = await _analyticsService.GetGrowthMetricsAsync(days);
        return Ok(growth);
    }

    /// <summary>
    /// Get user retention and engagement cohort analysis.
    /// </summary>
    [HttpGet("retention")]
    public async Task<IActionResult> GetRetention()
    {
        var retention = await _analyticsService.GetUserRetentionAsync();
        return Ok(retention);
    }

    /// <summary>
    /// Get top users ranked by a specified metric.
    /// </summary>
    /// <param name="metric">Metric to rank by: exchanges, hours_given, hours_received, xp, listings, connections</param>
    /// <param name="limit">Number of users to return (default: 10, max: 100)</param>
    [HttpGet("top-users")]
    public async Task<IActionResult> GetTopUsers(
        [FromQuery] string metric = "exchanges",
        [FromQuery] int limit = 10)
    {
        var validMetrics = new[] { "exchanges", "hours_given", "hours_received", "xp", "listings", "connections" };
        if (!validMetrics.Contains(metric.ToLowerInvariant()))
        {
            return BadRequest(new { error = $"Invalid metric. Valid options: {string.Join(", ", validMetrics)}" });
        }

        var topUsers = await _analyticsService.GetTopUsersAsync(metric, limit);
        return Ok(new { metric, limit, users = topUsers });
    }

    /// <summary>
    /// Get listing breakdown by category.
    /// </summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var breakdown = await _analyticsService.GetCategoryBreakdownAsync();
        return Ok(new { categories = breakdown });
    }

    /// <summary>
    /// Get exchange health metrics: completion rates, timing, disputes.
    /// </summary>
    [HttpGet("exchange-health")]
    public async Task<IActionResult> GetExchangeHealth()
    {
        var health = await _analyticsService.GetExchangeHealthAsync();
        return Ok(health);
    }
}

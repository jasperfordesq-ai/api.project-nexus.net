// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Data.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Data;

namespace Nexus.Api.Controllers;

/// <summary>
/// Health check endpoints for load balancers and monitoring.
/// These endpoints do NOT require tenant resolution.
/// </summary>
[ApiController]
[Route("[controller]")]
[AllowAnonymous]
public class HealthController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly ILogger<HealthController> _logger;

    public HealthController(NexusDbContext db, ILogger<HealthController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Basic liveness check - returns 200 if the app is running.
    /// </summary>
    [HttpGet]
    [HttpGet("live")]
    public IActionResult Live()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// Readiness check - verifies database connectivity.
    /// </summary>
    [HttpGet("ready")]
    public async Task<IActionResult> Ready()
    {
        try
        {
            // Test database connection
            var canConnect = await _db.Database.CanConnectAsync();

            if (canConnect)
            {
                return Ok(new
                {
                    status = "healthy",
                    checks = new
                    {
                        database = "healthy"
                    },
                    timestamp = DateTime.UtcNow
                });
            }

            return StatusCode(503, new
            {
                status = "unhealthy",
                checks = new
                {
                    database = "unhealthy"
                },
                timestamp = DateTime.UtcNow
            });
        }
        catch (DbException ex)
        {
            _logger.LogError(ex, "Database health check failed");
            return StatusCode(503, new
            {
                status = "unhealthy",
                checks = new
                {
                    database = "unhealthy"
                },
                timestamp = DateTime.UtcNow
            });
        }
    }
}

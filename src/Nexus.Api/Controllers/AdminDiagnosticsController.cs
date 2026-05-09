// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Services.Scheduled;

namespace Nexus.Api.Controllers;

/// <summary>
/// Phase 73 — comprehensive operational diagnostics endpoint for ops staff.
///
/// Returns at-a-glance system health: DB migration version, hosted-service
/// runtime status, external-service config presence, application metadata.
/// Distinct from <c>/health</c> (which is the load-balancer probe — fast
/// + binary up/down). This endpoint is admin-only and gives operators the
/// detail they need to triage incidents.
/// </summary>
[ApiController]
[Route("api/admin/system/diagnostics")]
[Authorize(Policy = "AdminOnly")]
public class AdminDiagnosticsController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly ScheduledJobsRegistry _jobsRegistry;
    private readonly IConfiguration _config;

    public AdminDiagnosticsController(
        NexusDbContext db,
        ScheduledJobsRegistry jobsRegistry,
        IConfiguration config)
    {
        _db = db;
        _jobsRegistry = jobsRegistry;
        _config = config;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        // Database — migration version + connection.
        string? appliedMigration = null;
        var dbConnected = false;
        try
        {
            var applied = await _db.Database.GetAppliedMigrationsAsync();
            appliedMigration = applied.LastOrDefault();
            dbConnected = appliedMigration != null;
        }
        catch (Exception ex)
        {
            appliedMigration = $"error:{ex.GetType().Name}";
        }

        // Pending migrations (would be applied on next startup).
        IList<string> pending;
        try { pending = (await _db.Database.GetPendingMigrationsAsync()).ToList(); }
        catch { pending = Array.Empty<string>(); }

        // Hosted-services snapshot.
        var jobs = _jobsRegistry.Snapshot();

        // External services — presence-only check (does the config key exist?).
        // We deliberately do NOT round-trip live calls here — this endpoint
        // must stay fast and side-effect-free. Live probes belong on per-service
        // health pages (/api/admin/ai/providers/test, /api/admin/federation/protocols/partners/{id}/ping/...).
        var externals = new Dictionary<string, object>
        {
            ["sendgrid"] = new
            {
                configured = !string.IsNullOrWhiteSpace(_config["SendGrid:ApiKey"]),
                enabled = _config.GetValue("SendGrid:Enabled", false)
            },
            ["gmail"] = new
            {
                configured = !string.IsNullOrWhiteSpace(_config["Gmail:RefreshToken"]),
            },
            ["stripe"] = new
            {
                secret_configured = !string.IsNullOrWhiteSpace(_config["Stripe:SecretKey"]),
                webhook_secret_configured = !string.IsNullOrWhiteSpace(_config["Stripe:WebhookSecret"])
                    || !string.IsNullOrWhiteSpace(_config["Stripe:WebhookSecret_Donations"])
            },
            ["ai"] = new
            {
                active_provider = _config["Ai:Provider"] ?? "ollama",
                anthropic_configured = !string.IsNullOrWhiteSpace(_config["Ai:Anthropic:ApiKey"]),
                openai_configured = !string.IsNullOrWhiteSpace(_config["Ai:OpenAI:ApiKey"]),
                gemini_configured = !string.IsNullOrWhiteSpace(_config["Ai:Gemini:ApiKey"]),
                ollama_url = _config["LlamaService:BaseUrl"]
            },
            ["push"] = new
            {
                provider = _config["Push:Provider"],
                fcm_configured = !string.IsNullOrWhiteSpace(_config["Firebase:ServerKey"])
                    || !string.IsNullOrWhiteSpace(_config["Fcm:ServerKey"]),
                vapid_configured = !string.IsNullOrWhiteSpace(_config["Vapid:PublicKey"])
                    && !string.IsNullOrWhiteSpace(_config["Vapid:PrivateKey"])
            },
            ["meilisearch"] = new
            {
                configured = !string.IsNullOrWhiteSpace(_config["Meilisearch:BaseUrl"])
            },
            ["sentry"] = new
            {
                configured = !string.IsNullOrWhiteSpace(_config["Sentry:Dsn"])
            }
        };

        // Process info.
        var process = System.Diagnostics.Process.GetCurrentProcess();
        var info = new
        {
            uptime_seconds = (DateTime.UtcNow - process.StartTime.ToUniversalTime()).TotalSeconds,
            working_set_mb = process.WorkingSet64 / 1024 / 1024,
            thread_count = process.Threads.Count,
            machine_name = Environment.MachineName,
            os = Environment.OSVersion.VersionString,
            framework = Environment.Version.ToString(),
            assembly_version = typeof(AdminDiagnosticsController).Assembly.GetName().Version?.ToString()
        };

        // Overall health verdict.
        var anyJobFailing = jobs.Any(j => j.Status == "failing" && j.ConsecutiveFailures >= 3);
        var pendingMigrations = pending.Count;
        var verdict = !dbConnected
            ? "critical"
            : anyJobFailing || pendingMigrations > 0
                ? "degraded"
                : "ok";

        return Ok(new
        {
            verdict,
            generated_at = DateTime.UtcNow,
            database = new
            {
                connected = dbConnected,
                applied_migration = appliedMigration,
                pending_migrations = pending,
                pending_count = pendingMigrations
            },
            hosted_services = jobs,
            external_services = externals,
            process = info
        });
    }
}

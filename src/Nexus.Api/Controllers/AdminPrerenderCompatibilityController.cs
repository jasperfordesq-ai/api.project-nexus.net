// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

[ApiController]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminPrerenderCompatibilityController : ControllerBase
{
    private const string JobsKey = "admin_prerender.jobs";
    private const string AuditKey = "admin_prerender.audit";
    private const string Channel = "private-admin-prerender";
    private const string EventName = "job.updated";

    private static readonly string[] ExpectedRoutes = ["/", "/about", "/jobs", "/events", "/marketplace"];
    private static readonly JsonSerializerOptions StoreJsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    private readonly NexusDbContext _db;

    public AdminPrerenderCompatibilityController(NexusDbContext db)
    {
        _db = db;
    }

    [HttpGet("/api/admin/prerender/summary")]
    [HttpGet("/api/v2/admin/prerender/summary")]
    public async Task<IActionResult> Summary()
    {
        var jobs = await LoadJobsAsync();
        var tenants = await ActiveTenants().ToListAsync();
        var queued = jobs.Count(j => j.Status == "queued");
        var active = jobs.Count(j => j.Status is "claimed" or "running");
        var failures = jobs.Count(j => j.Status == "failed");
        var expected = tenants.Count * ExpectedRoutes.Length;

        return Data(new
        {
            cache_readable = true,
            cache_path = "compat://aspnet-prerender",
            total_snapshots = 0,
            total_size_bytes = 0,
            oldest_age_s = (int?)null,
            newest_age_s = (int?)null,
            stale_count = 0,
            warn_count = 0,
            missing_count = expected,
            expected_count = expected,
            coverage_pct = expected == 0 ? 100 : 0,
            last_run = jobs.OrderByDescending(j => j.Id).FirstOrDefault(),
            recent_failures = failures,
            active_jobs = active,
            queued_jobs = queued,
            last_event_at = jobs.OrderByDescending(j => j.QueuedAt).FirstOrDefault()?.QueuedAt,
            build_commit = Environment.GetEnvironmentVariable("BUILD_COMMIT"),
            expected_routes = ExpectedRoutes,
            tenant_count = tenants.Count,
            content_stale_count = 0,
            asset_invalid_count = 0,
            realtime_channel = Channel,
            realtime_event = EventName
        });
    }

    [HttpGet("/api/admin/prerender/inventory")]
    [HttpGet("/api/v2/admin/prerender/inventory")]
    public IActionResult Inventory([FromQuery] string? tenant = null)
    {
        if (!IsValidOptionalSlug(tenant))
        {
            return Error("Invalid tenant slug", StatusCodes.Status400BadRequest, "VALIDATION_INVALID");
        }

        return Data(new
        {
            cache_readable = true,
            cache_path = "compat://aspnet-prerender",
            items = Array.Empty<object>()
        });
    }

    [HttpGet("/api/admin/prerender/inspect")]
    [HttpGet("/api/v2/admin/prerender/inspect")]
    public IActionResult Inspect([FromQuery] string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return Error("Missing path", StatusCodes.Status400BadRequest, "VALIDATION_REQUIRED_FIELD");
        }

        return Error("Snapshot not found", StatusCodes.Status404NotFound, "NOT_FOUND");
    }

    [HttpGet("/api/admin/prerender/coverage")]
    [HttpGet("/api/v2/admin/prerender/coverage")]
    public async Task<IActionResult> Coverage()
    {
        var tenants = await ActiveTenants().ToListAsync();
        return Data(new
        {
            expected_routes = ExpectedRoutes,
            rows = tenants.Select(t => new
            {
                tenant_id = t.Id,
                slug = t.Slug,
                host = HostForTenant(t),
                expected = ExpectedRoutes.Length,
                rendered = 0,
                missing = ExpectedRoutes.Length,
                missing_routes = ExpectedRoutes,
                stale_routes = Array.Empty<string>(),
                asset_invalid_routes = Array.Empty<string>()
            })
        });
    }

    [HttpGet("/api/admin/prerender/events")]
    [HttpGet("/api/v2/admin/prerender/events")]
    public async Task<IActionResult> Events([FromQuery] int limit = 200)
    {
        var capped = Math.Clamp(limit, 1, 1000);
        var audit = await LoadAuditAsync();
        return Data(new
        {
            events = audit
                .OrderByDescending(a => a.Id)
                .Take(capped)
                .Select(a => new { ts = a.CreatedAt, @event = a.Action, pid = (int?)null, host = "aspnet", commit = Environment.GetEnvironmentVariable("BUILD_COMMIT") })
        });
    }

    [HttpGet("/api/admin/prerender/failures")]
    [HttpGet("/api/v2/admin/prerender/failures")]
    public async Task<IActionResult> Failures()
    {
        var jobs = await LoadJobsAsync();
        return Data(new
        {
            items = jobs.Where(j => j.Status == "failed").Select(j => new
            {
                cache_path = j.Routes ?? string.Empty,
                failed_at = ToUnix(j.FinishedAt ?? j.QueuedAt),
                age_s = Math.Max(0, (int)(DateTime.UtcNow - ParseDate(j.FinishedAt ?? j.QueuedAt)).TotalSeconds)
            })
        });
    }

    [HttpGet("/api/admin/prerender/jobs")]
    [HttpGet("/api/v2/admin/prerender/jobs")]
    public async Task<IActionResult> Jobs([FromQuery] string? status = null, [FromQuery] int limit = 50)
    {
        var capped = Math.Clamp(limit, 1, 5000);
        var jobs = await LoadJobsAsync();
        if (!string.IsNullOrWhiteSpace(status))
        {
            jobs = jobs.Where(j => j.Status == status).ToList();
        }

        return Data(new { items = jobs.OrderByDescending(j => j.Id).Take(capped).Select(FormatJob) });
    }

    [HttpGet("/api/admin/prerender/jobs/{id:int}")]
    [HttpGet("/api/v2/admin/prerender/jobs/{id:int}")]
    public async Task<IActionResult> ShowJob(int id)
    {
        var job = (await LoadJobsAsync()).FirstOrDefault(j => j.Id == id);
        return job == null ? Error("Job not found", StatusCodes.Status404NotFound, "NOT_FOUND") : Data(FormatJob(job));
    }

    [HttpPost("/api/admin/prerender/jobs")]
    [HttpPost("/api/v2/admin/prerender/jobs")]
    public async Task<IActionResult> Enqueue([FromBody] JsonElement body)
    {
        var tenantSlug = ReadString(body, "tenant_slug", "tenantSlug");
        if (!string.IsNullOrWhiteSpace(tenantSlug) && !IsValidRequiredSlug(tenantSlug))
        {
            return Error("Invalid tenant slug", StatusCodes.Status400BadRequest, "VALIDATION_INVALID");
        }

        Tenant? tenant = null;
        if (!string.IsNullOrWhiteSpace(tenantSlug))
        {
            tenant = await ActiveTenants().FirstOrDefaultAsync(t => t.Slug == tenantSlug);
            if (tenant == null)
            {
                return Error("Tenant not found", StatusCodes.Status404NotFound, "NOT_FOUND");
            }
        }

        var routes = NormalizeRoutes(ReadString(body, "routes"));
        if (routes == InvalidRoutes)
        {
            return Error("Invalid route", StatusCodes.Status400BadRequest, "VALIDATION_INVALID");
        }

        var jobs = await LoadJobsAsync();
        var job = new PrerenderJobRecord
        {
            Id = jobs.Count == 0 ? 1 : jobs.Max(j => j.Id) + 1,
            Status = "queued",
            TenantId = tenant?.Id,
            TenantSlug = tenant?.Slug,
            Routes = routes,
            Force = ReadBool(body, "force") ?? false,
            DryRun = ReadBool(body, "dry_run", "dryRun") ?? false,
            Priority = Math.Clamp(ReadInt(body, "priority") ?? 5, 1, 9),
            RequestedByUserId = User.GetUserId(),
            RequestedByEmail = User.GetEmail(),
            RequestedByName = User.Identity?.Name,
            QueuedAt = DateTime.UtcNow.ToString("O")
        };

        jobs.Add(job);
        await SaveJobsAsync(jobs);
        await AddAuditAsync("enqueue", "ok", job.TenantId, job.Id, new { job.Routes, job.Force, job.DryRun, job.Priority });

        return Data(new { job_id = job.Id, job = FormatJob(job) });
    }

    [HttpPost("/api/admin/prerender/jobs/{id:int}/cancel")]
    [HttpPost("/api/v2/admin/prerender/jobs/{id:int}/cancel")]
    public async Task<IActionResult> CancelJob(int id)
    {
        var jobs = await LoadJobsAsync();
        var job = jobs.FirstOrDefault(j => j.Id == id);
        if (job == null)
        {
            return Error("Job not found", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        if (job.Status is not "queued")
        {
            return Error("Job is not cancellable (already claimed or finished)", StatusCodes.Status409Conflict, "CONFLICT");
        }

        job.Status = "cancelled";
        job.FinishedAt = DateTime.UtcNow.ToString("O");
        await SaveJobsAsync(jobs);
        await AddAuditAsync("cancel", "ok", job.TenantId, job.Id, null);
        return Data(new { cancelled = true, id });
    }

    [HttpPost("/api/admin/prerender/jobs/{id:int}/retry")]
    [HttpPost("/api/v2/admin/prerender/jobs/{id:int}/retry")]
    public async Task<IActionResult> RetryJob(int id)
    {
        var jobs = await LoadJobsAsync();
        var original = jobs.FirstOrDefault(j => j.Id == id);
        if (original == null)
        {
            return Error("Job not found", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        if (original.Status is "queued" or "claimed" or "running")
        {
            return Error("Job is still in flight - cancel it before retrying", StatusCodes.Status409Conflict, "CONFLICT");
        }

        var job = original with
        {
            Id = jobs.Max(j => j.Id) + 1,
            Status = "queued",
            Priority = 5,
            QueuedAt = DateTime.UtcNow.ToString("O"),
            ClaimedAt = null,
            StartedAt = null,
            FinishedAt = null,
            DurationS = null,
            ExitCode = null,
            ErrorMessage = null,
            LogExcerpt = null,
            RequestedByUserId = User.GetUserId(),
            RequestedByEmail = User.GetEmail(),
            RequestedByName = User.Identity?.Name
        };
        jobs.Add(job);
        await SaveJobsAsync(jobs);
        await AddAuditAsync("retry", "ok", job.TenantId, job.Id, new { retried_from_job_id = id });
        return Data(new { job_id = job.Id, retried_from_job_id = id, job = FormatJob(job) });
    }

    [HttpPost("/api/admin/prerender/purge")]
    [HttpPost("/api/v2/admin/prerender/purge")]
    public async Task<IActionResult> Purge([FromBody] JsonElement body)
    {
        var pattern = ReadString(body, "pattern")?.Trim();
        if (string.IsNullOrWhiteSpace(pattern) || !pattern.StartsWith('/'))
        {
            return Error("Pattern must start with \"/\"", StatusCodes.Status400BadRequest, "VALIDATION_INVALID");
        }

        var tenantSlug = ReadString(body, "tenant_slug", "tenantSlug");
        if (!string.IsNullOrWhiteSpace(tenantSlug) && !await ActiveTenants().AnyAsync(t => t.Slug == tenantSlug))
        {
            return Error("Tenant not found", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        var dryRun = ReadBool(body, "dry_run", "dryRun") ?? false;
        await AddAuditAsync("purge", "ok", null, null, new { pattern, tenant_slug = tenantSlug, dry_run = dryRun });
        return Data(new { pattern, tenant_slug = tenantSlug, dry_run = dryRun, deleted_count = 0, deleted = Array.Empty<string>(), recache_job_id = (int?)null });
    }

    [HttpPost("/api/admin/prerender/invalidate")]
    [HttpPost("/api/v2/admin/prerender/invalidate")]
    public async Task<IActionResult> Invalidate([FromBody] JsonElement body)
    {
        var tenantId = ReadInt(body, "tenant_id", "tenantId") ?? 0;
        if (tenantId <= 0)
        {
            return Error("tenant_id is required", StatusCodes.Status400BadRequest, "VALIDATION_REQUIRED_FIELD");
        }

        if (!await ActiveTenants().AnyAsync(t => t.Id == tenantId))
        {
            return Error("Tenant not found", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        var routes = ReadStringArray(body, "routes");
        if (routes.Count == 0)
        {
            return Error("routes[] is required and must be non-empty", StatusCodes.Status400BadRequest, "VALIDATION_REQUIRED_FIELD");
        }

        foreach (var route in routes)
        {
            if (!IsValidRoute(route))
            {
                return Error($"Invalid route: {route}", StatusCodes.Status400BadRequest, "VALIDATION_INVALID");
            }
        }

        var jobId = (int?)null;
        if (ReadBool(body, "recache") ?? true)
        {
            var jobs = await LoadJobsAsync();
            var tenant = await ActiveTenants().FirstAsync(t => t.Id == tenantId);
            var job = new PrerenderJobRecord
            {
                Id = jobs.Count == 0 ? 1 : jobs.Max(j => j.Id) + 1,
                Status = "queued",
                TenantId = tenant.Id,
                TenantSlug = tenant.Slug,
                Routes = string.Join(',', routes),
                Priority = 5,
                RequestedByUserId = User.GetUserId(),
                RequestedByEmail = User.GetEmail(),
                QueuedAt = DateTime.UtcNow.ToString("O")
            };
            jobs.Add(job);
            await SaveJobsAsync(jobs);
            jobId = job.Id;
        }

        await AddAuditAsync("invalidate", "ok", tenantId, jobId, new { routes, invalidated = routes.Count });
        return Data(new { invalidated = routes.Count, tenant_id = tenantId, routes, job_id = jobId });
    }

    [HttpGet("/api/admin/prerender/analytics")]
    [HttpGet("/api/v2/admin/prerender/analytics")]
    public IActionResult Analytics([FromQuery] string? since = null, [FromQuery] int limit = 200)
    {
        return Data(new
        {
            total_hits = 0,
            verified_hits = 0,
            spoofed_by_crawler = new Dictionary<string, int>(),
            window_started_at = since ?? DateTime.UtcNow.AddDays(-7).ToString("O"),
            hits_by_status = new Dictionary<string, int>(),
            hits_by_crawler = new Dictionary<string, int>(),
            hits_by_host = new Dictionary<string, int>(),
            top_uris = Array.Empty<object>(),
            recent = Array.Empty<object>(),
            log_path = "compat://aspnet-prerender/access-log.jsonl",
            log_size_bytes = 0
        });
    }

    [HttpPost("/api/admin/prerender/auto-recache")]
    [HttpPost("/api/v2/admin/prerender/auto-recache")]
    public async Task<IActionResult> AutoRecache([FromBody] JsonElement body)
    {
        var apply = ReadBool(body, "apply") ?? false;
        await AddAuditAsync("auto_recache", "ok", null, null, new { applied = apply, exit_code = 0 });
        return Data(new { exit_code = 0, output = apply ? "compatibility recache accepted" : "compatibility recache dry-run", applied = apply });
    }

    [HttpPost("/api/admin/prerender/detect-drift")]
    [HttpPost("/api/v2/admin/prerender/detect-drift")]
    public async Task<IActionResult> DetectDrift([FromBody] JsonElement body)
    {
        var apply = ReadBool(body, "apply") ?? false;
        await AddAuditAsync("detect_drift", "ok", null, null, new { applied = apply, exit_code = 0 });
        return Data(new { exit_code = 0, output = apply ? "compatibility drift detection accepted" : "compatibility drift detection dry-run", applied = apply });
    }

    [HttpPost("/api/admin/prerender/purge-unexpected")]
    [HttpPost("/api/v2/admin/prerender/purge-unexpected")]
    public async Task<IActionResult> PurgeUnexpected([FromBody] JsonElement body)
    {
        var apply = ReadBool(body, "apply") ?? false;
        await AddAuditAsync("purge_unexpected", "ok", null, null, new { applied = apply, deleted_total = 0 });
        return Data(new { deleted_total = 0, by_tenant = new Dictionary<string, string[]>(), dry_run = !apply });
    }

    [HttpGet("/api/admin/prerender/metrics")]
    [HttpGet("/api/v2/admin/prerender/metrics")]
    public ContentResult Metrics()
    {
        var body = string.Join('\n', new[]
        {
            "# HELP nexus_prerender_health_status Engine health: 0=green, 1=yellow, 2=red",
            "# TYPE nexus_prerender_health_status gauge",
            "nexus_prerender_health_status 0",
            "nexus_prerender_jobs_queued 0"
        }) + "\n";

        return Content(body, "text/plain; version=0.0.4; charset=utf-8", Encoding.UTF8);
    }

    [HttpGet("/api/admin/prerender/realtime-channel")]
    [HttpGet("/api/v2/admin/prerender/realtime-channel")]
    public IActionResult RealtimeChannel() => Data(new { channel = Channel, @event = EventName });

    [HttpGet("/api/admin/prerender/health")]
    [HttpGet("/api/v2/admin/prerender/health")]
    public IActionResult Health()
    {
        return Data(new
        {
            status = "green",
            checked_at = DateTime.UtcNow.ToString("O"),
            breaker_until = (int?)null,
            checks = new[]
            {
                new { name = "compatibility_layer", status = "green", detail = "ASP.NET compatibility endpoints are responding.", action = (string?)null }
            }
        });
    }

    [HttpGet("/api/admin/prerender/audit")]
    [HttpGet("/api/v2/admin/prerender/audit")]
    public async Task<IActionResult> Audit([FromQuery] string? action = null, [FromQuery] int limit = 100)
    {
        var capped = Math.Clamp(limit, 1, 5000);
        var rows = await LoadAuditAsync();
        if (!string.IsNullOrWhiteSpace(action))
        {
            rows = rows.Where(r => r.Action == action).ToList();
        }

        return Data(new { items = rows.OrderByDescending(r => r.Id).Take(capped).Select(FormatAudit) });
    }

    [HttpPost("/api/admin/prerender/reset-breaker")]
    [HttpPost("/api/v2/admin/prerender/reset-breaker")]
    public async Task<IActionResult> ResetBreaker()
    {
        await AddAuditAsync("reset_breaker", "ok", null, null, null);
        return Data(new { ok = true, was_tripped_until = (int?)null });
    }

    [HttpPost("/api/admin/prerender/reset-queue")]
    [HttpPost("/api/v2/admin/prerender/reset-queue")]
    public async Task<IActionResult> ResetQueue()
    {
        await AddAuditAsync("reset_queue", "ok", null, null, null);
        return Data(new { rows_reset = 0, breaker_cleared = true });
    }

    [HttpGet("/api/admin/prerender/export/{kind}.csv")]
    [HttpGet("/api/v2/admin/prerender/export/{kind}.csv")]
    public async Task<IActionResult> ExportCsv(string kind)
    {
        kind = kind.ToLowerInvariant();
        var csv = new StringBuilder();
        switch (kind)
        {
            case "jobs":
                csv.AppendLine("id,status,priority,tenant_slug,routes,force,dry_run,queued_at,started_at,finished_at,duration_s,exit_code,rendered_count,planned_count,requested_by");
                foreach (var job in (await LoadJobsAsync()).OrderByDescending(j => j.Id).Take(5000))
                {
                    csv.AppendLine($"{job.Id},{job.Status},{job.Priority},{job.TenantSlug},{job.Routes},{BoolCsv(job.Force)},{BoolCsv(job.DryRun)},{job.QueuedAt},{job.StartedAt},{job.FinishedAt},{job.DurationS},{job.ExitCode},{job.RenderedCount},{job.PlannedCount},{job.RequestedByEmail}");
                }
                break;
            case "audit":
                csv.AppendLine("id,created_at,action,outcome,actor_email,tenant_slug,job_id,ip,details");
                foreach (var row in (await LoadAuditAsync()).OrderByDescending(a => a.Id).Take(5000))
                {
                    csv.AppendLine($"{row.Id},{row.CreatedAt},{row.Action},{row.Outcome},{row.ActorEmail},{row.TenantSlug},{row.JobId},{row.Ip},\"{row.DetailsJson?.Replace("\"", "\"\"")}\"");
                }
                break;
            case "inventory":
                csv.AppendLine("host,route,cache_path,size_bytes,mtime,age_s,staleness,http_status,content_stale,asset_issues");
                break;
            default:
                return NotFound();
        }

        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv; charset=utf-8", $"prerender-{kind}-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv");
    }

    [HttpGet("/api/admin/prerender/ttl-inspector")]
    [HttpGet("/api/v2/admin/prerender/ttl-inspector")]
    public IActionResult TtlInspector([FromQuery] string? route)
    {
        if (string.IsNullOrWhiteSpace(route) || !route.StartsWith('/'))
        {
            return Error("route must start with \"/\"", StatusCodes.Status400BadRequest, "VALIDATION_INVALID");
        }

        if (!IsValidRoute(route))
        {
            return Error("Invalid route", StatusCodes.Status400BadRequest, "VALIDATION_INVALID");
        }

        return Data(new
        {
            route,
            ttl_seconds = 3600,
            matched_pattern = "*",
            source = "default",
            all_matches = new[] { new { pattern = "*", ttl = 3600, specificity = 0 } }
        });
    }

    [HttpGet("/api/admin/prerender/tenant-safety")]
    [HttpGet("/api/v2/admin/prerender/tenant-safety")]
    public async Task<IActionResult> TenantSafety([FromQuery] string? tenant)
    {
        if (string.IsNullOrWhiteSpace(tenant) || !IsValidRequiredSlug(tenant))
        {
            return Error("Valid tenant slug required", StatusCodes.Status400BadRequest, "VALIDATION_INVALID");
        }

        var row = await ActiveTenants().FirstOrDefaultAsync(t => t.Slug == tenant);
        if (row == null)
        {
            return Error("Tenant not found", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        return Data(new
        {
            tenant = new
            {
                tenant_id = row.Id,
                slug = row.Slug,
                host = HostForTenant(row),
                prefix = string.Empty
            },
            counts = new
            {
                expected = ExpectedRoutes.Length,
                @static = ExpectedRoutes.Length,
                sitemap = 0,
                snapshots = 0,
                missing = ExpectedRoutes.Length,
                stale = 0,
                asset_invalid = 0,
                unexpected = 0
            },
            static_routes = ExpectedRoutes,
            sitemap_routes = Array.Empty<string>(),
            expected_routes = ExpectedRoutes,
            missing_routes = ExpectedRoutes,
            stale_routes = Array.Empty<string>(),
            asset_invalid_routes = Array.Empty<string>(),
            unexpected_routes = Array.Empty<string>(),
            snapshots = Array.Empty<object>()
        });
    }

    [HttpGet("/api/admin/prerender/sitemap-explorer")]
    [HttpGet("/api/v2/admin/prerender/sitemap-explorer")]
    public async Task<IActionResult> SitemapExplorer([FromQuery] string? tenant)
    {
        if (string.IsNullOrWhiteSpace(tenant) || !IsValidRequiredSlug(tenant))
        {
            return Error("Valid tenant slug required", StatusCodes.Status400BadRequest, "VALIDATION_INVALID");
        }

        var row = await ActiveTenants().FirstOrDefaultAsync(t => t.Slug == tenant);
        if (row == null)
        {
            return Error("Tenant not found", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        return Data(new
        {
            tenant_slug = row.Slug,
            tenant_id = row.Id,
            static_routes = ExpectedRoutes,
            dynamic_routes = Array.Empty<string>(),
            total_count = ExpectedRoutes.Length
        });
    }

    private IQueryable<Tenant> ActiveTenants() => _db.Tenants.AsNoTracking().Where(t => t.IsActive);

    private IActionResult Data(object data) => Ok(new { success = true, data });

    private IActionResult Error(string message, int status, string code)
    {
        return StatusCode(status, new { success = false, error = message, code });
    }

    private async Task<List<PrerenderJobRecord>> LoadJobsAsync()
    {
        var raw = await GetTenantConfigAsync(JobsKey);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new List<PrerenderJobRecord>();
        }

        try
        {
            return JsonSerializer.Deserialize<List<PrerenderJobRecord>>(raw, StoreJsonOptions) ?? new List<PrerenderJobRecord>();
        }
        catch (JsonException)
        {
            return new List<PrerenderJobRecord>();
        }
    }

    private async Task SaveJobsAsync(List<PrerenderJobRecord> jobs)
    {
        await UpsertTenantConfigAsync(JobsKey, JsonSerializer.Serialize(jobs.OrderBy(j => j.Id), StoreJsonOptions));
    }

    private async Task<List<PrerenderAuditRecord>> LoadAuditAsync()
    {
        var raw = await GetTenantConfigAsync(AuditKey);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new List<PrerenderAuditRecord>();
        }

        try
        {
            return JsonSerializer.Deserialize<List<PrerenderAuditRecord>>(raw, StoreJsonOptions) ?? new List<PrerenderAuditRecord>();
        }
        catch (JsonException)
        {
            return new List<PrerenderAuditRecord>();
        }
    }

    private async Task AddAuditAsync(string action, string outcome, int? tenantId, int? jobId, object? details)
    {
        var rows = await LoadAuditAsync();
        Tenant? tenant = null;
        if (tenantId.HasValue)
        {
            tenant = await ActiveTenants().FirstOrDefaultAsync(t => t.Id == tenantId.Value);
        }

        rows.Add(new PrerenderAuditRecord
        {
            Id = rows.Count == 0 ? 1 : rows.Max(r => r.Id) + 1,
            ActorUserId = User.GetUserId(),
            ActorEmail = User.GetEmail(),
            Action = action,
            TenantId = tenantId,
            TenantSlug = tenant?.Slug,
            JobId = jobId,
            Outcome = outcome,
            DetailsJson = details == null ? null : JsonSerializer.Serialize(details, StoreJsonOptions),
            Ip = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.FirstOrDefault(),
            CreatedAt = DateTime.UtcNow.ToString("O")
        });

        await UpsertTenantConfigAsync(AuditKey, JsonSerializer.Serialize(rows.OrderBy(r => r.Id), StoreJsonOptions));
    }

    private async Task<string?> GetTenantConfigAsync(string key)
    {
        var tenantId = User.GetTenantId() ?? 0;
        return await _db.TenantConfigs
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Key == key)
            .Select(c => c.Value)
            .FirstOrDefaultAsync();
    }

    private async Task UpsertTenantConfigAsync(string key, string value)
    {
        var tenantId = User.GetTenantId() ?? throw new InvalidOperationException("Tenant context is required.");
        var existing = await _db.TenantConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Key == key);
        if (existing == null)
        {
            _db.TenantConfigs.Add(new TenantConfig
            {
                TenantId = tenantId,
                Key = key,
                Value = value,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.Value = value;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }

    private static object FormatJob(PrerenderJobRecord job)
    {
        return new
        {
            id = job.Id,
            status = job.Status,
            tenant_id = job.TenantId,
            tenant_slug = job.TenantSlug,
            routes = job.Routes,
            force = job.Force,
            dry_run = job.DryRun,
            priority = job.Priority,
            planned_count = job.PlannedCount,
            rendered_count = job.RenderedCount,
            invalid_count = job.InvalidCount,
            duration_s = job.DurationS,
            exit_code = job.ExitCode,
            log_excerpt = job.LogExcerpt,
            error_message = job.ErrorMessage,
            claimed_by = job.ClaimedBy,
            queued_at = job.QueuedAt,
            claimed_at = job.ClaimedAt,
            started_at = job.StartedAt,
            finished_at = job.FinishedAt,
            requested_by = job.RequestedByUserId.HasValue
                ? new { id = job.RequestedByUserId.Value, name = job.RequestedByName ?? job.RequestedByEmail ?? "Admin", email = job.RequestedByEmail }
                : null
        };
    }

    private static object FormatAudit(PrerenderAuditRecord row)
    {
        return new
        {
            id = row.Id,
            actor_user_id = row.ActorUserId,
            actor_email = row.ActorEmail,
            action = row.Action,
            tenant_id = row.TenantId,
            tenant_slug = row.TenantSlug,
            job_id = row.JobId,
            outcome = row.Outcome,
            details = ParseAuditDetails(row.DetailsJson),
            ip = row.Ip,
            user_agent = row.UserAgent,
            created_at = row.CreatedAt
        };
    }

    private static object? ParseAuditDetails(string? detailsJson)
    {
        return string.IsNullOrWhiteSpace(detailsJson) ? null : JsonSerializer.Deserialize<JsonElement>(detailsJson);
    }

    private static string HostForTenant(Tenant tenant) => string.IsNullOrWhiteSpace(tenant.Domain) ? $"{tenant.Slug}.localhost" : tenant.Domain;

    private const string InvalidRoutes = "\u0000";

    private static string? NormalizeRoutes(string? routes)
    {
        if (string.IsNullOrWhiteSpace(routes))
        {
            return null;
        }

        var tokens = routes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return tokens.Any(route => !IsValidRoute(route)) ? InvalidRoutes : string.Join(',', tokens);
    }

    private static bool IsValidRoute(string route)
    {
        return route.StartsWith('/') && route.All(c => char.IsLetterOrDigit(c) || "/._~%:@!$()*+,;=-?".Contains(c));
    }

    private static bool IsValidOptionalSlug(string? slug) => string.IsNullOrWhiteSpace(slug) || IsValidRequiredSlug(slug);

    private static bool IsValidRequiredSlug(string slug)
    {
        return slug.Length <= 64 && slug.All(c => char.IsLetterOrDigit(c) || c is '_' or '-');
    }

    private static int ToUnix(string? iso) => (int)new DateTimeOffset(ParseDate(iso)).ToUnixTimeSeconds();

    private static DateTime ParseDate(string? iso) => DateTime.TryParse(iso, out var parsed) ? parsed.ToUniversalTime() : DateTime.UtcNow;

    private static string BoolCsv(bool value) => value ? "1" : "0";

    private static string? ReadString(JsonElement body, params string[] names)
    {
        foreach (var name in names)
        {
            if (body.ValueKind == JsonValueKind.Object && body.TryGetProperty(name, out var value))
            {
                return value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
            }
        }

        return null;
    }

    private static int? ReadInt(JsonElement body, params string[] names)
    {
        foreach (var name in names)
        {
            if (body.ValueKind == JsonValueKind.Object && body.TryGetProperty(name, out var value))
            {
                if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number)) return number;
                if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out number)) return number;
            }
        }

        return null;
    }

    private static bool? ReadBool(JsonElement body, params string[] names)
    {
        foreach (var name in names)
        {
            if (body.ValueKind == JsonValueKind.Object && body.TryGetProperty(name, out var value))
            {
                if (value.ValueKind is JsonValueKind.True or JsonValueKind.False) return value.GetBoolean();
                if (value.ValueKind == JsonValueKind.String && bool.TryParse(value.GetString(), out var flag)) return flag;
                if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number)) return number != 0;
            }
        }

        return null;
    }

    private static List<string> ReadStringArray(JsonElement body, string name)
    {
        if (body.ValueKind != JsonValueKind.Object || !body.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.Array)
        {
            return new List<string>();
        }

        return value.EnumerateArray()
            .Where(item => item.ValueKind == JsonValueKind.String)
            .Select(item => item.GetString()!)
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .ToList();
    }

    private sealed record PrerenderJobRecord
    {
        public int Id { get; init; }
        public string Status { get; set; } = "queued";
        public int? TenantId { get; init; }
        public string? TenantSlug { get; init; }
        public string? Routes { get; init; }
        public bool Force { get; init; }
        public bool DryRun { get; init; }
        public int Priority { get; init; } = 5;
        public int? PlannedCount { get; init; }
        public int? RenderedCount { get; init; }
        public int? InvalidCount { get; init; }
        public int? DurationS { get; init; }
        public int? ExitCode { get; init; }
        public string? LogExcerpt { get; init; }
        public string? ErrorMessage { get; set; }
        public string? ClaimedBy { get; init; }
        public string? QueuedAt { get; init; }
        public string? ClaimedAt { get; init; }
        public string? StartedAt { get; init; }
        public string? FinishedAt { get; set; }
        public int? RequestedByUserId { get; init; }
        public string? RequestedByName { get; init; }
        public string? RequestedByEmail { get; init; }
    }

    private sealed record PrerenderAuditRecord
    {
        public int Id { get; init; }
        public int? ActorUserId { get; init; }
        public string? ActorEmail { get; init; }
        public string Action { get; init; } = string.Empty;
        public int? TenantId { get; init; }
        public string? TenantSlug { get; init; }
        public int? JobId { get; init; }
        public string Outcome { get; init; } = "ok";
        public string? DetailsJson { get; init; }
        public string? Ip { get; init; }
        public string? UserAgent { get; init; }
        public string CreatedAt { get; init; } = DateTime.UtcNow.ToString("O");
    }
}

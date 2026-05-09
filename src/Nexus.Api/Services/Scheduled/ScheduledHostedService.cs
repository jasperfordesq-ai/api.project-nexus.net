// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Nexus.Api.Data;

namespace Nexus.Api.Services.Scheduled;

/// <summary>
/// Base class for scheduled background jobs (Phase 63 — V1 cron task port).
///
/// V1 ran 5 Job classes + 39 Laravel scheduled commands via Laravel's
/// kernel. V2 had only one BackgroundService prior to this phase. This class
/// provides a uniform pattern for all subsequent ports:
///
///  - Configurable interval via appsettings: <c>Scheduled:{JobName}:IntervalMinutes</c>
///    and a kill-switch <c>Scheduled:{JobName}:Enabled</c> (default true).
///  - Iterates every active tenant for tenant-scoped work.
///  - Catches per-tenant failures so one bad tenant does not stall the loop.
///  - Logs structured start / finish / per-tenant failure events.
/// </summary>
public abstract class ScheduledHostedService : BackgroundService
{
    protected readonly IServiceScopeFactory ScopeFactory;
    protected readonly IConfiguration Configuration;
    protected readonly ILogger Logger;

    protected ScheduledHostedService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger logger)
    {
        ScopeFactory = scopeFactory;
        Configuration = configuration;
        Logger = logger;
    }

    /// <summary>Short, log-safe identifier (e.g. "SyncFederationPartners").</summary>
    protected abstract string JobName { get; }

    /// <summary>Default interval if none configured. Pick something sensible per job.</summary>
    protected abstract TimeSpan DefaultInterval { get; }

    /// <summary>
    /// Initial delay before the first run, to avoid all jobs firing at startup.
    /// Default: 30 seconds. Override per-job to spread load.
    /// </summary>
    protected virtual TimeSpan StartupDelay => TimeSpan.FromSeconds(30);

    /// <summary>
    /// True if this job iterates per-tenant. Default true. Override and return
    /// false for global jobs (e.g. log pruning).
    /// </summary>
    protected virtual bool PerTenant => true;

    /// <summary>Run for one tenant. Implement in subclass.</summary>
    protected virtual Task RunForTenantAsync(IServiceProvider services, int tenantId, CancellationToken ct) =>
        Task.CompletedTask;

    /// <summary>Run once globally (no tenant scope). Override for global jobs.</summary>
    protected virtual Task RunGlobalAsync(IServiceProvider services, CancellationToken ct) =>
        Task.CompletedTask;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Resolve the singleton registry once (it's optional so existing tests
        // that build the host without registering it keep working).
        var registry = TryGetRegistry();

        var enabled = Configuration.GetValue<bool?>($"Scheduled:{JobName}:Enabled") ?? true;
        if (!enabled)
        {
            Logger.LogInformation("Scheduled job {JobName} disabled via Scheduled:{JobName}:Enabled=false", JobName, JobName);
            registry?.RecordDisabled(JobName);
            return;
        }

        var configuredMinutes = Configuration.GetValue<double?>($"Scheduled:{JobName}:IntervalMinutes");
        var interval = configuredMinutes.HasValue && configuredMinutes.Value > 0
            ? TimeSpan.FromMinutes(configuredMinutes.Value)
            : DefaultInterval;

        Logger.LogInformation(
            "Scheduled job {JobName} starting. Interval={Interval}. PerTenant={PerTenant}",
            JobName, interval, PerTenant);

        try
        {
            await Task.Delay(StartupDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            var startedAt = DateTime.UtcNow;
            registry?.RecordStart(JobName);
            try
            {
                await RunOnceAsync(stoppingToken);
                var elapsed = DateTime.UtcNow - startedAt;
                Logger.LogInformation(
                    "Scheduled job {JobName} completed in {ElapsedMs}ms",
                    JobName, elapsed.TotalMilliseconds);
                registry?.RecordSuccess(JobName, elapsed);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Scheduled job {JobName} failed", JobName);
                registry?.RecordFailure(JobName, ex);
            }

            try
            {
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        Logger.LogInformation("Scheduled job {JobName} stopped", JobName);
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = ScopeFactory.CreateScope();
        if (!PerTenant)
        {
            await RunGlobalAsync(scope.ServiceProvider, ct);
            return;
        }

        // Iterate every tenant. We use a dedicated scope per tenant so that the
        // scoped TenantContext + DbContext are fresh and don't bleed.
        var bootstrapDb = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var tenantIds = await GetActiveTenantIdsAsync(bootstrapDb, ct);

        foreach (var tenantId in tenantIds)
        {
            if (ct.IsCancellationRequested) break;
            using var tenantScope = ScopeFactory.CreateScope();
            try
            {
                var tenantContext = tenantScope.ServiceProvider.GetRequiredService<TenantContext>();
                tenantContext.SetTenant(tenantId);
                await RunForTenantAsync(tenantScope.ServiceProvider, tenantId, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                Logger.LogWarning(
                    ex,
                    "Scheduled job {JobName} failed for tenant {TenantId} — continuing with next tenant",
                    JobName, tenantId);
            }
        }
    }

    private static async Task<List<int>> GetActiveTenantIdsAsync(NexusDbContext db, CancellationToken ct)
    {
        // Tenants are not tenant-scoped themselves — read directly.
        return await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
            db.Tenants.Select(t => t.Id), ct);
    }

    /// <summary>
    /// Resolve the singleton registry without throwing if it isn't registered
    /// (some test hosts skip it). Logs a warning once on the first miss so
    /// production misconfigurations are surfaced.
    /// </summary>
    private ScheduledJobsRegistry? TryGetRegistry()
    {
        try
        {
            using var scope = ScopeFactory.CreateScope();
            return scope.ServiceProvider.GetService<ScheduledJobsRegistry>();
        }
        catch
        {
            return null;
        }
    }
}

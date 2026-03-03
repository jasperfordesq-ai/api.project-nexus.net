// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

namespace Nexus.Api.Services;

/// <summary>
/// Background service that periodically purges stale SignalR connections
/// from the UserConnectionService to prevent memory leaks from connections
/// that were never properly cleaned up (e.g., abrupt disconnects).
/// </summary>
public class StaleConnectionCleanupService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<StaleConnectionCleanupService> _logger;
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(1);

    public StaleConnectionCleanupService(
        IServiceProvider services,
        ILogger<StaleConnectionCleanupService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Stale connection cleanup service started. Interval: {Interval}", CleanupInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(CleanupInterval, stoppingToken);

            try
            {
                var connectionService = _services.GetRequiredService<IUserConnectionService>();
                if (connectionService is UserConnectionService service)
                {
                    var removed = service.PurgeStaleConnections();
                    if (removed > 0)
                    {
                        _logger.LogInformation("Purged {Count} stale SignalR connections", removed);
                    }
                    else
                    {
                        _logger.LogDebug("No stale connections found. Active: {Count}", service.GetTotalConnectionCount());
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during stale connection cleanup");
            }
        }
    }
}

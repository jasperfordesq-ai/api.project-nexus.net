// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

namespace Nexus.Api.Services;

/// <summary>
/// Interface for tracking user-to-SignalR-connection mappings.
/// Uses a composite (tenantId, userId) key to ensure tenant isolation.
/// </summary>
public interface IUserConnectionService
{
    /// <summary>
    /// Register a connection for a user within a tenant.
    /// </summary>
    void AddConnection(int tenantId, int userId, string connectionId);

    /// <summary>
    /// Remove a connection for a user within a tenant.
    /// </summary>
    void RemoveConnection(int tenantId, int userId, string connectionId);

    /// <summary>
    /// Get all connection IDs for a user within a tenant (they may have multiple tabs/devices).
    /// </summary>
    IReadOnlyList<string> GetConnections(int tenantId, int userId);

    /// <summary>
    /// Check if a user has any active connections within a tenant.
    /// </summary>
    bool IsUserConnected(int tenantId, int userId);
}

/// <summary>
/// Thread-safe in-memory service for tracking user-to-SignalR-connection mappings.
/// Singleton lifetime - shared across all requests.
///
/// Uses a composite (tenantId, userId) key to prevent cross-tenant connection lookups.
/// Supports multiple connections per user (multiple browser tabs, devices).
/// </summary>
public class UserConnectionService : IUserConnectionService
{
    // (tenantId, userId) -> set of connectionIds
    private readonly Dictionary<(int TenantId, int UserId), HashSet<string>> _userConnections = new();
    private readonly object _lock = new();

    public void AddConnection(int tenantId, int userId, string connectionId)
    {
        lock (_lock)
        {
            var key = (tenantId, userId);
            if (!_userConnections.TryGetValue(key, out var connections))
            {
                connections = new HashSet<string>();
                _userConnections[key] = connections;
            }
            connections.Add(connectionId);
        }
    }

    public void RemoveConnection(int tenantId, int userId, string connectionId)
    {
        lock (_lock)
        {
            var key = (tenantId, userId);
            if (_userConnections.TryGetValue(key, out var connections))
            {
                connections.Remove(connectionId);

                // Clean up empty entries
                if (connections.Count == 0)
                {
                    _userConnections.Remove(key);
                }
            }
        }
    }

    public IReadOnlyList<string> GetConnections(int tenantId, int userId)
    {
        lock (_lock)
        {
            var key = (tenantId, userId);
            if (_userConnections.TryGetValue(key, out var connections))
            {
                return connections.ToList();
            }
            return Array.Empty<string>();
        }
    }

    public bool IsUserConnected(int tenantId, int userId)
    {
        lock (_lock)
        {
            var key = (tenantId, userId);
            return _userConnections.TryGetValue(key, out var connections) && connections.Count > 0;
        }
    }
}

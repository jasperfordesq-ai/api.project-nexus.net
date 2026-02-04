// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Collections.Concurrent;

namespace Nexus.Api.Services;

/// <summary>
/// Interface for tracking user-to-SignalR-connection mappings.
/// </summary>
public interface IUserConnectionService
{
    /// <summary>
    /// Register a connection for a user.
    /// </summary>
    void AddConnection(int userId, string connectionId);

    /// <summary>
    /// Remove a connection for a user.
    /// </summary>
    void RemoveConnection(int userId, string connectionId);

    /// <summary>
    /// Get all connection IDs for a user (they may have multiple tabs/devices).
    /// </summary>
    IReadOnlyList<string> GetConnections(int userId);

    /// <summary>
    /// Check if a user has any active connections.
    /// </summary>
    bool IsUserConnected(int userId);
}

/// <summary>
/// Thread-safe in-memory service for tracking user-to-SignalR-connection mappings.
/// Singleton lifetime - shared across all requests.
///
/// Supports multiple connections per user (multiple browser tabs, devices).
/// </summary>
public class UserConnectionService : IUserConnectionService
{
    // userId -> set of connectionIds
    private readonly ConcurrentDictionary<int, HashSet<string>> _userConnections = new();
    private readonly object _lock = new();

    public void AddConnection(int userId, string connectionId)
    {
        lock (_lock)
        {
            if (!_userConnections.TryGetValue(userId, out var connections))
            {
                connections = new HashSet<string>();
                _userConnections[userId] = connections;
            }
            connections.Add(connectionId);
        }
    }

    public void RemoveConnection(int userId, string connectionId)
    {
        lock (_lock)
        {
            if (_userConnections.TryGetValue(userId, out var connections))
            {
                connections.Remove(connectionId);

                // Clean up empty entries
                if (connections.Count == 0)
                {
                    _userConnections.TryRemove(userId, out _);
                }
            }
        }
    }

    public IReadOnlyList<string> GetConnections(int userId)
    {
        lock (_lock)
        {
            if (_userConnections.TryGetValue(userId, out var connections))
            {
                return connections.ToList();
            }
            return Array.Empty<string>();
        }
    }

    public bool IsUserConnected(int userId)
    {
        lock (_lock)
        {
            return _userConnections.TryGetValue(userId, out var connections) && connections.Count > 0;
        }
    }
}

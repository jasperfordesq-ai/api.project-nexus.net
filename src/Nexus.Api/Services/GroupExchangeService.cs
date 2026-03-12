// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for managing group exchanges - bulk credit exchanges
/// involving multiple participants within a group.
/// </summary>
public class GroupExchangeService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<GroupExchangeService> _logger;

    public GroupExchangeService(NexusDbContext db, TenantContext tenantContext, ILogger<GroupExchangeService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// List group exchanges with participants, ordered by CreatedAt desc.
    /// </summary>
    public async Task<(List<GroupExchange> Data, int Total)> GetGroupExchangesAsync(
        int groupId, string? status, int page, int limit)
    {
        page = Math.Max(page, 1);
        limit = Math.Clamp(limit, 1, 100);

        var query = _db.Set<GroupExchange>()
            .AsNoTracking()
            .Where(ge => ge.GroupId == groupId);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(ge => ge.Status == status);

        var total = await query.CountAsync();

        var data = await query
            .Include(ge => ge.CreatedBy)
            .Include(ge => ge.Participants)
                .ThenInclude(p => p.User)
            .OrderByDescending(ge => ge.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return (data, total);
    }

    /// <summary>
    /// Get a single group exchange with participants and user details.
    /// </summary>
    public async Task<GroupExchange?> GetGroupExchangeAsync(int id)
    {
        return await _db.Set<GroupExchange>()
            .Include(ge => ge.CreatedBy)
            .Include(ge => ge.ApprovedBy)
            .Include(ge => ge.Participants)
                .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(ge => ge.Id == id);
    }

    /// <summary>
    /// Create a group exchange. Validates group exists; sets status=draft.
    /// </summary>
    public async Task<(GroupExchange? Exchange, string? Error)> CreateGroupExchangeAsync(
        int tenantId, int userId, int groupId, string title, string? description, decimal totalHours)
    {
        if (string.IsNullOrWhiteSpace(title))
            return (null, "Title is required");

        if (totalHours <= 0)
            return (null, "Total hours must be greater than zero");

        var group = await _db.Set<Group>()
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
            return (null, "Group not found");

        var exchange = new GroupExchange
        {
            TenantId = tenantId,
            GroupId = groupId,
            Title = title.Trim(),
            Description = description?.Trim(),
            TotalHours = totalHours,
            Status = "draft",
            CreatedById = userId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<GroupExchange>().Add(exchange);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Group exchange {ExchangeId} created by user {UserId} in group {GroupId}",
            exchange.Id, userId, groupId);

        return (exchange, null);
    }

    /// <summary>
    /// Add a participant. Validates exchange is draft/pending and no duplicate users.
    /// </summary>
    public async Task<(GroupExchangeParticipant? Participant, string? Error)> AddParticipantAsync(
        int exchangeId, int userId, decimal hours, string role)
    {
        var exchange = await _db.Set<GroupExchange>()
            .Include(ge => ge.Participants)
            .FirstOrDefaultAsync(ge => ge.Id == exchangeId);

        if (exchange == null)
            return (null, "Group exchange not found");

        if (exchange.Status != "draft" && exchange.Status != "pending")
            return (null, "Participants can only be added when exchange is in draft or pending status");

        if (exchange.Participants.Any(p => p.UserId == userId))
            return (null, "User is already a participant in this exchange");

        if (role != "provider" && role != "receiver")
            return (null, "Role must be provider or receiver");

        if (hours <= 0)
            return (null, "Hours must be greater than zero");

        var participant = new GroupExchangeParticipant
        {
            GroupExchangeId = exchangeId,
            UserId = userId,
            Hours = hours,
            Role = role,
            IsConfirmed = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<GroupExchangeParticipant>().Add(participant);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} added as {Role} to group exchange {ExchangeId}",
            userId, role, exchangeId);

        return (participant, null);
    }

    /// <summary>
    /// Remove a participant. Only allowed when exchange is in draft status.
    /// </summary>
    public async Task<(bool Success, string? Error)> RemoveParticipantAsync(int exchangeId, int userId)
    {
        var exchange = await _db.Set<GroupExchange>()
            .FirstOrDefaultAsync(ge => ge.Id == exchangeId);

        if (exchange == null)
            return (false, "Group exchange not found");

        if (exchange.Status != "draft")
            return (false, "Participants can only be removed when exchange is in draft status");

        var participant = await _db.Set<GroupExchangeParticipant>()
            .FirstOrDefaultAsync(p => p.GroupExchangeId == exchangeId && p.UserId == userId);

        if (participant == null)
            return (false, "Participant not found");

        _db.Set<GroupExchangeParticipant>().Remove(participant);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} removed from group exchange {ExchangeId}", userId, exchangeId);
        return (true, null);
    }

    /// <summary>
    /// Move from draft to pending. Must have at least 2 participants.
    /// </summary>
    public async Task<(bool Success, string? Error)> SubmitForApprovalAsync(int id, int userId)
    {
        var exchange = await _db.Set<GroupExchange>()
            .Include(ge => ge.Participants)
            .FirstOrDefaultAsync(ge => ge.Id == id);

        if (exchange == null)
            return (false, "Group exchange not found");

        if (exchange.CreatedById != userId)
            return (false, "Only the creator can submit for approval");

        if (exchange.Status != "draft")
            return (false, "Exchange must be in draft status to submit for approval");

        if (exchange.Participants.Count < 2)
            return (false, "Exchange must have at least 2 participants");

        exchange.Status = "pending";
        exchange.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Group exchange {ExchangeId} submitted for approval by user {UserId}",
            id, userId);
        return (true, null);
    }

    /// <summary>
    /// Move from pending to approved.
    /// </summary>
    public async Task<(bool Success, string? Error)> ApproveGroupExchangeAsync(int id, int adminUserId)
    {
        var exchange = await _db.Set<GroupExchange>()
            .FirstOrDefaultAsync(ge => ge.Id == id);

        if (exchange == null)
            return (false, "Group exchange not found");

        if (exchange.Status != "pending")
            return (false, "Exchange must be in pending status to approve");

        exchange.Status = "approved";
        exchange.ApprovedById = adminUserId;
        exchange.ApprovedAt = DateTime.UtcNow;
        exchange.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Group exchange {ExchangeId} approved by admin {AdminId}", id, adminUserId);
        return (true, null);
    }

    /// <summary>
    /// Complete a group exchange. All participants must be confirmed.
    /// </summary>
    public async Task<(bool Success, string? Error)> CompleteGroupExchangeAsync(int id)
    {
        var exchange = await _db.Set<GroupExchange>()
            .Include(ge => ge.Participants)
            .FirstOrDefaultAsync(ge => ge.Id == id);

        if (exchange == null)
            return (false, "Group exchange not found");

        if (exchange.Status != "approved")
            return (false, "Exchange must be approved before it can be completed");

        if (exchange.Participants.Any(p => !p.IsConfirmed))
            return (false, "All participants must confirm before completing the exchange");

        exchange.Status = "completed";
        exchange.CompletedAt = DateTime.UtcNow;
        exchange.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Group exchange {ExchangeId} completed", id);
        return (true, null);
    }

    /// <summary>
    /// Participant confirms their role in an approved exchange.
    /// </summary>
    public async Task<(bool Success, string? Error)> ConfirmParticipationAsync(int exchangeId, int userId)
    {
        var participant = await _db.Set<GroupExchangeParticipant>()
            .FirstOrDefaultAsync(p => p.GroupExchangeId == exchangeId && p.UserId == userId);

        if (participant == null)
            return (false, "Participant not found");

        if (participant.IsConfirmed)
            return (false, "Participation already confirmed");

        var exchange = await _db.Set<GroupExchange>()
            .FirstOrDefaultAsync(ge => ge.Id == exchangeId);

        if (exchange == null)
            return (false, "Group exchange not found");

        if (exchange.Status != "approved")
            return (false, "Exchange must be approved before confirming participation");

        participant.IsConfirmed = true;
        participant.ConfirmedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} confirmed participation in group exchange {ExchangeId}",
            userId, exchangeId);
        return (true, null);
    }

    /// <summary>
    /// Cancel a group exchange. Cannot cancel if already completed.
    /// </summary>
    public async Task<(bool Success, string? Error)> CancelGroupExchangeAsync(int id, int userId)
    {
        var exchange = await _db.Set<GroupExchange>()
            .FirstOrDefaultAsync(ge => ge.Id == id);

        if (exchange == null)
            return (false, "Group exchange not found");

        if (exchange.Status == "completed")
            return (false, "Cannot cancel a completed exchange");

        if (exchange.Status == "cancelled")
            return (false, "Exchange is already cancelled");

        exchange.Status = "cancelled";
        exchange.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Group exchange {ExchangeId} cancelled by user {UserId}", id, userId);
        return (true, null);
    }
}

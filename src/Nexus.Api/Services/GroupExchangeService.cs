// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Npgsql;

namespace Nexus.Api.Services;

/// <summary>
/// Laravel-contract-compatible group time exchanges.
///
/// The Laravel edition stores a mutable balance and writes provider credit rows.
/// ASP.NET derives balances from its transaction ledger, so completion pairs the
/// receiver debits with provider credits as direct transfers. This preserves the
/// same user-visible split while making conservation an invariant of the ledger.
/// </summary>
public class GroupExchangeService
{
    private const string ProviderRole = "provider";
    private const string ReceiverRole = "receiver";

    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly PushNotificationService _pushNotifications;
    private readonly EmailNotificationService _emailNotifications;
    private readonly ILogger<GroupExchangeService> _logger;
    private readonly PersonalWalletLedgerService _personalWallet;

    public GroupExchangeService(
        NexusDbContext db,
        TenantContext tenantContext,
        PushNotificationService pushNotifications,
        EmailNotificationService emailNotifications,
        ILogger<GroupExchangeService> logger,
        PersonalWalletLedgerService personalWallet)
    {
        _db = db;
        _tenantContext = tenantContext;
        _pushNotifications = pushNotifications;
        _emailNotifications = emailNotifications;
        _logger = logger;
        _personalWallet = personalWallet;
    }

    public async Task<GroupExchangeListResult> ListForUserAsync(
        int userId,
        string? status,
        int limit,
        int offset,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        limit = Math.Clamp(limit, 1, 100);
        offset = Math.Max(offset, 0);

        var query = _db.GroupExchanges
            .AsNoTracking()
            .Include(exchange => exchange.CreatedBy)
            .Include(exchange => exchange.Participants)
            .Where(exchange => exchange.TenantId == tenantId &&
                (exchange.CreatedById == userId ||
                 exchange.Participants.Any(participant => participant.UserId == userId)));

        if (HasPhpNonEmptyString(status))
        {
            query = query.Where(exchange => exchange.Status == status);
        }

        var exchanges = await query
            .OrderByDescending(exchange => exchange.Id)
            .Skip(offset)
            .Take(limit + 1)
            .ToListAsync(cancellationToken);

        var hasMore = exchanges.Count > limit;
        if (hasMore)
        {
            exchanges.RemoveAt(exchanges.Count - 1);
        }

        return new GroupExchangeListResult(
            exchanges.Select(MapListItem).ToList(),
            hasMore);
    }

    public async Task<GroupExchangeDetail?> GetAsync(
        int id,
        bool includeCalculatedSplit = false,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var exchange = await _db.GroupExchanges
            .AsNoTracking()
            .Include(item => item.CreatedBy)
            .Include(item => item.Participants)
                .ThenInclude(participant => participant.User)
            .FirstOrDefaultAsync(item => item.Id == id && item.TenantId == tenantId, cancellationToken);

        return exchange == null
            ? null
            : MapDetail(exchange, includeCalculatedSplit ? CalculateSplit(exchange) : null);
    }

    public async Task<GroupExchangeMutationResult> CreateAsync(
        int organizerId,
        CreateGroupExchangeInput input,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        if (RoundHours(input.TotalHours) <= 0m ||
            (input.SplitType != null && input.SplitType is not ("equal" or "custom" or "weighted")))
        {
            return GroupExchangeMutationResult.Failed("Invalid exchange total or split type");
        }

        var participantInputs = input.Participants ?? Array.Empty<GroupExchangeParticipantInput>();
        GroupExchange exchange;
        try
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            var now = DateTime.UtcNow;
            exchange = new GroupExchange
            {
                TenantId = tenantId,
                GroupId = null,
                Title = input.Title.Trim(),
                Description = NormalizeOptionalText(input.Description),
                TotalHours = RoundHours(input.TotalHours),
                // Lifecycle state is server-owned. Accepting a caller supplied
                // completed/pending status would bypass start and fresh consent.
                Status = "draft",
                SplitType = input.SplitType ?? "equal",
                ListingId = input.ListingId,
                BrokerId = input.BrokerId,
                BrokerNotes = input.BrokerNotes,
                CreatedById = organizerId,
                CreatedAt = now,
                UpdatedAt = now
            };

            _db.GroupExchanges.Add(exchange);
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            _logger.LogWarning(exception, "Could not create group exchange for user {OrganizerId}", organizerId);
            return GroupExchangeMutationResult.Failed("Failed to create exchange");
        }

        // Canonical store semantics persist the exchange first and treat inline
        // participant additions as independent best-effort operations. A blocked,
        // cross-tenant, duplicate, or otherwise invalid participant is omitted; it
        // does not roll back or reject the newly-created exchange.
        foreach (var participantInput in participantInputs)
        {
            try
            {
                await AddParticipantAsync(
                    exchange.Id,
                    organizerId,
                    participantInput,
                    cancellationToken);
            }
            catch (Exception exception)
            {
                _logger.LogWarning(
                    exception,
                    "Inline participant {ParticipantId}/{Role} was skipped for group exchange {ExchangeId}",
                    participantInput.UserId,
                    participantInput.Role,
                    exchange.Id);
            }
        }

        _logger.LogInformation(
            "User {OrganizerId} created group exchange {ExchangeId} for tenant {TenantId}",
            organizerId,
            exchange.Id,
            tenantId);

        return GroupExchangeMutationResult.Succeeded(exchange.Id);
    }

    public async Task<bool> UpdateAsync(
        int id,
        UpdateGroupExchangeInput input,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        if (input.TotalHours is <= 0m ||
            (input.SplitType != null && input.SplitType is not ("equal" or "custom" or "weighted")))
        {
            return false;
        }

        var lockAttempted = false;
        await _db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            lockAttempted = true;
            await AcquireSessionExchangeLockAsync(tenantId, id, cancellationToken);
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            var exchange = await _db.GroupExchanges
                .Include(item => item.Participants)
                .FirstOrDefaultAsync(item => item.Id == id && item.TenantId == tenantId, cancellationToken);

            if (exchange == null || exchange.Status is not ("draft" or "pending_participants"))
            {
                return false;
            }

            var resultingSplitType = input.SplitType ?? exchange.SplitType;
            if (resultingSplitType == "custom" &&
                exchange.Participants.Any(participant => RoundHours(participant.Hours) <= 0m))
            {
                return false;
            }

            if (input.Title != null) exchange.Title = input.Title;
            if (input.Description != null) exchange.Description = input.Description;
            if (input.SplitType != null) exchange.SplitType = input.SplitType;
            if (input.TotalHours.HasValue) exchange.TotalHours = RoundHours(input.TotalHours.Value);
            if (input.BrokerId.HasValue) exchange.BrokerId = input.BrokerId;
            if (input.BrokerNotes != null) exchange.BrokerNotes = input.BrokerNotes;
            if (input.ListingId.HasValue) exchange.ListingId = input.ListingId;
            exchange.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        }
        finally
        {
            await ReleaseSessionExchangeLockAndCloseAsync(tenantId, id, lockAttempted);
        }
    }

    public async Task<bool> CancelAsync(int id, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var lockAttempted = false;
        await _db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            lockAttempted = true;
            await AcquireSessionExchangeLockAsync(tenantId, id, cancellationToken);
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            var exchange = await _db.GroupExchanges
                .FirstOrDefaultAsync(item => item.Id == id && item.TenantId == tenantId, cancellationToken);

            if (exchange == null ||
                exchange.Status is not ("draft" or "pending_participants" or "pending_confirmation"))
            {
                return false;
            }

            exchange.Status = "cancelled";
            exchange.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        }
        finally
        {
            await ReleaseSessionExchangeLockAndCloseAsync(tenantId, id, lockAttempted);
        }
    }

    public async Task<bool> AddParticipantAsync(
        int exchangeId,
        int organizerId,
        GroupExchangeParticipantInput input,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        if (!IsValidParticipant(input))
        {
            return false;
        }

        var lockAttempted = false;
        await _db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            lockAttempted = true;
            await AcquireSessionExchangeLockAsync(tenantId, exchangeId, cancellationToken);
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            var exchange = await _db.GroupExchanges
                .FirstOrDefaultAsync(item => item.Id == exchangeId &&
                                             item.TenantId == tenantId &&
                                             item.CreatedById == organizerId &&
                                             (item.Status == "draft" || item.Status == "pending_participants"),
                    cancellationToken);

            if (exchange == null || (exchange.SplitType == "custom" && RoundHours(input.Hours) <= 0m))
            {
                return false;
            }

            var participantError = await ValidateParticipantInputsAsync(
                organizerId,
                new[] { input },
                cancellationToken,
                exchangeId);

            if (participantError != null)
            {
                return false;
            }

            var participant = new GroupExchangeParticipant
            {
                GroupExchangeId = exchangeId,
                UserId = input.UserId,
                Role = input.Role,
                Hours = RoundHours(input.Hours),
                Weight = RoundWeight(input.Weight),
                IsConfirmed = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.GroupExchangeParticipants.Add(participant);

            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException exception)
        {
            if (IsUniqueViolation(exception))
            {
                _logger.LogInformation(
                    exception,
                    "Participant {ParticipantId}/{Role} was not added to exchange {ExchangeId}",
                    input.UserId,
                    input.Role,
                    exchangeId);
                return false;
            }

            // Laravel only turns an already-present participant into false. Enum,
            // precision, and other database-domain failures escape as server errors.
            throw;
        }
        finally
        {
            await ReleaseSessionExchangeLockAndCloseAsync(
                tenantId,
                exchangeId,
                lockAttempted);
        }
    }

    public async Task<bool> RemoveParticipantAsync(
        int exchangeId,
        int organizerId,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var lockAttempted = false;
        await _db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            lockAttempted = true;
            await AcquireSessionExchangeLockAsync(tenantId, exchangeId, cancellationToken);
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            var exchange = await _db.GroupExchanges
                .Include(item => item.Participants)
                .FirstOrDefaultAsync(item => item.Id == exchangeId &&
                                             item.TenantId == tenantId &&
                                             item.CreatedById == organizerId,
                    cancellationToken);

            if (exchange == null || exchange.Status is not ("draft" or "pending_participants"))
            {
                return false;
            }

            var participants = exchange.Participants
                .Where(participant => participant.UserId == userId)
                .ToList();
            if (participants.Count == 0)
            {
                return false;
            }

            _db.GroupExchangeParticipants.RemoveRange(participants);
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        }
        finally
        {
            await ReleaseSessionExchangeLockAndCloseAsync(
                tenantId,
                exchangeId,
                lockAttempted);
        }
    }

    public async Task<GroupExchangeOperationResult> StartAsync(
        int exchangeId,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        IReadOnlyCollection<int> recipients;
        string exchangeTitle;

        var lockAttempted = false;
        await _db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            // Acquire the session lock BEFORE opening the Serializable
            // transaction. A waiter therefore begins with a post-lock snapshot
            // and observes the preceding start instead of reading stale state.
            lockAttempted = true;
            await AcquireSessionExchangeLockAsync(tenantId, exchangeId, cancellationToken);

            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            var exchange = await _db.GroupExchanges
                .Include(item => item.Participants)
                .FirstOrDefaultAsync(item => item.Id == exchangeId && item.TenantId == tenantId, cancellationToken);

            if (exchange == null)
            {
                return GroupExchangeOperationResult.Failed("Exchange not found");
            }

            if (exchange.Status is not ("draft" or "pending_participants"))
            {
                return GroupExchangeOperationResult.Failed(
                    "This exchange cannot be started from its current status.");
            }

            if (!await HasValidTenantParticipantsAsync(exchange, tenantId, cancellationToken))
            {
                return GroupExchangeOperationResult.Failed("Exchange has invalid participants");
            }

            if (!exchange.Participants.Any(item => item.Role == ProviderRole) ||
                !exchange.Participants.Any(item => item.Role == ReceiverRole))
            {
                return GroupExchangeOperationResult.Failed(
                    "An exchange needs at least one provider and one receiver before it can start.");
            }

            var split = CalculateSplit(exchange);
            var imbalance = GetSplitImbalanceError(split);
            if (imbalance != null)
            {
                return GroupExchangeOperationResult.Failed(imbalance);
            }

            if (exchange.Participants.GroupBy(item => item.UserId).Any(group => group.Count() > 1))
            {
                return GroupExchangeOperationResult.Failed(
                    "A member cannot be both a provider and a receiver in the same exchange.");
            }

            // Confirmations are consent to the exact immutable split. Quarantine
            // historical draft confirmations before entering the consent state.
            foreach (var participant in exchange.Participants)
            {
                participant.IsConfirmed = false;
                participant.ConfirmedAt = null;
            }

            exchange.Status = "pending_confirmation";
            exchange.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            recipients = exchange.Participants.Select(item => item.UserId).Distinct().ToArray();
            exchangeTitle = exchange.Title;
        }
        finally
        {
            await ReleaseSessionExchangeLockAndCloseAsync(
                tenantId,
                exchangeId,
                lockAttempted);
        }

        // The status transition is committed. A client disconnect must not cancel
        // the best-effort delivery side effects for that durable event.
        await NotifyStartAsync(exchangeId, exchangeTitle, recipients, tenantId, CancellationToken.None);
        return GroupExchangeOperationResult.Succeeded();
    }

    public async Task<bool> ConfirmParticipationAsync(
        int exchangeId,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var lockAttempted = false;
        await _db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            lockAttempted = true;
            await AcquireSessionExchangeLockAsync(tenantId, exchangeId, cancellationToken);
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted,
                cancellationToken);

            var affected = await _db.GroupExchangeParticipants
                .Where(participant => participant.GroupExchangeId == exchangeId &&
                                      participant.UserId == userId &&
                                      !participant.IsConfirmed &&
                                      participant.GroupExchange != null &&
                                      participant.GroupExchange.TenantId == tenantId &&
                                      participant.GroupExchange.Status == "pending_confirmation")
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(participant => participant.IsConfirmed, true)
                    .SetProperty(participant => participant.ConfirmedAt, DateTime.UtcNow), cancellationToken);

            await transaction.CommitAsync(cancellationToken);
            return affected > 0;
        }
        finally
        {
            await ReleaseSessionExchangeLockAndCloseAsync(
                tenantId,
                exchangeId,
                lockAttempted);
        }
    }

    public async Task<GroupExchangeCompletionResult> CompleteAsync(
        int exchangeId,
        CancellationToken cancellationToken = default)
    {
        // The session lock serializes same-exchange completion; payer locks inside
        // the transaction serialize the shared personal-ledger balance across
        // different exchange and wallet workflows.
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                return await CompleteOnceAsync(exchangeId, cancellationToken);
            }
            catch (Exception exception) when (attempt < 2 && IsSerializationFailure(exception))
            {
                _db.ChangeTracker.Clear();
                _logger.LogWarning(
                    exception,
                    "Retrying serialized completion for group exchange {ExchangeId} (attempt {Attempt})",
                    exchangeId,
                    attempt + 2);
            }
        }

        return GroupExchangeCompletionResult.Failed("Exchange is already completed");
    }

    private async Task<GroupExchangeCompletionResult> CompleteOnceAsync(
        int exchangeId,
        CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        List<GroupExchangeSplit> split;
        List<int> transactionIds;
        string title;

        var lockAttempted = false;
        await _db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            lockAttempted = true;
            await AcquireSessionExchangeLockAsync(tenantId, exchangeId, cancellationToken);

            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted,
                cancellationToken);

            var exchange = await _db.GroupExchanges
                .Include(item => item.Participants)
                .FirstOrDefaultAsync(item => item.Id == exchangeId && item.TenantId == tenantId, cancellationToken);

            if (exchange == null)
            {
                return GroupExchangeCompletionResult.Failed("Exchange not found");
            }

            if (exchange.Status == "completed")
            {
                return GroupExchangeCompletionResult.Failed("Exchange is already completed");
            }

            if (exchange.Status == "cancelled")
            {
                return GroupExchangeCompletionResult.Failed("Exchange cancelled");
            }

            if (exchange.Status != "pending_confirmation")
            {
                return GroupExchangeCompletionResult.Failed(
                    "Exchange must be started before it can be completed");
            }

            if (!await HasValidTenantParticipantsAsync(exchange, tenantId, cancellationToken))
            {
                return GroupExchangeCompletionResult.Failed("Exchange has invalid participants");
            }

            var unconfirmed = exchange.Participants.Count(item => !item.IsConfirmed);
            if (unconfirmed > 0)
            {
                return GroupExchangeCompletionResult.Failed(
                    $"{unconfirmed} participant(s) still need to confirm");
            }

            split = CalculateSplit(exchange);
            if (split.Count == 0)
            {
                return GroupExchangeCompletionResult.Failed("Exchange has no participants");
            }

            var imbalance = GetSplitImbalanceError(split);
            if (imbalance != null)
            {
                return GroupExchangeCompletionResult.Failed(imbalance);
            }

            var receivers = AggregatePositiveSplit(split, ReceiverRole);
            var providers = AggregatePositiveSplit(split, ProviderRole);

            foreach (var payerId in receivers
                         .Select(item => item.UserId)
                         .Distinct()
                         .OrderBy(id => id))
            {
                await _personalWallet.AcquireSpendLockAsync(payerId, cancellationToken);
            }

            foreach (var receiver in receivers)
            {
                var balance = await _personalWallet.GetBalanceAsync(
                    tenantId,
                    receiver.UserId,
                    cancellationToken);
                if (balance < receiver.Hours)
                {
                    return GroupExchangeCompletionResult.Failed("Insufficient balance for transfer");
                }
            }

            var ledgerRows = PairTransfers(receivers, providers);
            if (ledgerRows.Count == 0)
            {
                return GroupExchangeCompletionResult.Failed(
                    "An exchange must settle a positive number of hours");
            }
            if (ledgerRows.Any(row => row.ReceiverId == row.ProviderId))
            {
                return GroupExchangeCompletionResult.Failed(
                    "A member cannot transfer group-exchange hours to themselves");
            }
            var now = DateTime.UtcNow;
            var transactions = ledgerRows.Select(row => new Transaction
            {
                TenantId = tenantId,
                SenderId = row.ReceiverId,
                ReceiverId = row.ProviderId,
                Amount = row.Hours,
                Description = $"Group exchange: {exchange.Title}",
                TransactionType = "group_exchange",
                ListingId = null,
                Status = TransactionStatus.Completed,
                CreatedAt = now
            }).ToList();

            _db.Transactions.AddRange(transactions);
            exchange.Status = "completed";
            exchange.CompletedAt = now;
            exchange.UpdatedAt = now;
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            transactionIds = transactions.Select(item => item.Id).ToList();
            title = exchange.Title;
        }
        finally
        {
            await ReleaseSessionExchangeLockAndCloseAsync(
                tenantId,
                exchangeId,
                lockAttempted);
        }

        // Settlement is committed. Notification delivery is deliberately detached
        // from the request token so a disconnect cannot silence the financial event.
        await NotifyCompletionAsync(exchangeId, title, split, tenantId, CancellationToken.None);
        _logger.LogInformation(
            "Completed group exchange {ExchangeId} with {TransactionCount} conserved ledger transfers",
            exchangeId,
            transactionIds.Count);

        return GroupExchangeCompletionResult.Succeeded(transactionIds);
    }

    private async Task<string?> ValidateParticipantInputsAsync(
        int organizerId,
        IReadOnlyCollection<GroupExchangeParticipantInput> participants,
        CancellationToken cancellationToken,
        int? existingExchangeId = null)
    {
        if (participants.Any(item => !IsValidParticipant(item)))
        {
            return "Failed to add participant (may already exist)";
        }

        var duplicate = participants
            .GroupBy(item => item.UserId)
            .Any(group => group.Count() > 1);
        if (duplicate)
        {
            return "Failed to add participant (may already exist)";
        }

        if (participants.Count == 0)
        {
            return null;
        }

        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var userIds = participants.Select(item => item.UserId).Distinct().ToArray();
        var foundUserIds = await _db.Users
            .AsNoTracking()
            .Where(user => user.TenantId == tenantId && userIds.Contains(user.Id) && user.IsActive)
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

        if (foundUserIds.Count != userIds.Length)
        {
            return "Failed to add participant (may already exist)";
        }

        var brokerApprovalRequired = await _db.UserMonitoringRestrictions
            .AsNoTracking()
            .AnyAsync(restriction => userIds.Contains(restriction.UserId) &&
                                     restriction.RequiresBrokerApproval &&
                                     (restriction.MonitoringExpiresAt == null ||
                                      restriction.MonitoringExpiresAt > DateTime.UtcNow),
                cancellationToken);
        if (brokerApprovalRequired)
        {
            _logger.LogInformation(
                "Organizer {OrganizerId} was blocked from adding a participant whose active restriction requires broker approval",
                organizerId);
            return "Failed to add participant (may already exist)";
        }

        var protectionError = await ValidateSafeguardingAndVettingAsync(
            tenantId,
            organizerId,
            userIds,
            cancellationToken);
        if (protectionError != null)
        {
            return protectionError;
        }

        if (existingExchangeId.HasValue)
        {
            var existingUserIds = await _db.GroupExchangeParticipants
                .AsNoTracking()
                .Where(item => item.GroupExchangeId == existingExchangeId.Value && userIds.Contains(item.UserId))
                .Select(item => item.UserId)
                .ToListAsync(cancellationToken);

            if (existingUserIds.Count > 0)
            {
                return "Failed to add participant (may already exist)";
            }
        }

        return null;
    }

    private async Task<string?> ValidateSafeguardingAndVettingAsync(
        int tenantId,
        int organizerId,
        IReadOnlyCollection<int> participantUserIds,
        CancellationToken cancellationToken)
    {
        try
        {
            return await ValidateSafeguardingAndVettingCoreAsync(
                tenantId,
                organizerId,
                participantUserIds,
                cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            // Canonical behavior treats the denormalized broker restriction as
            // authoritative, then fails open if the supplemental preference /
            // vetting lookup itself is unavailable.
            _logger.LogWarning(
                exception,
                "Supplemental safeguarding/vetting lookup failed for organizer {OrganizerId}; continuing after broker gate",
                organizerId);
            return null;
        }
    }

    private async Task<string?> ValidateSafeguardingAndVettingCoreAsync(
        int tenantId,
        int organizerId,
        IReadOnlyCollection<int> participantUserIds,
        CancellationToken cancellationToken)
    {
        var relevantUserIds = participantUserIds
            .Append(organizerId)
            .Distinct()
            .ToArray();

        var triggerRows = await _db.UserSafeguardingPreferences
            .AsNoTracking()
            .Where(preference => preference.TenantId == tenantId &&
                                 relevantUserIds.Contains(preference.UserId) &&
                                 preference.RevokedAt == null &&
                                 preference.Option != null &&
                                 preference.Option.TenantId == tenantId &&
                                 preference.Option.IsActive)
            .Select(preference => new SafeguardingTriggerRow(
                preference.UserId,
                preference.Option!.TriggersJson))
            .ToListAsync(cancellationToken);

        var rulesByUser = relevantUserIds.ToDictionary(
            userId => userId,
            _ => new SafeguardingInteractionRules());

        foreach (var triggerRow in triggerRows)
        {
            MergeSafeguardingTriggers(rulesByUser[triggerRow.UserId], triggerRow.TriggersJson);
        }

        foreach (var participantUserId in participantUserIds.Distinct())
        {
            var participantRules = rulesByUser[participantUserId];
            // Laravel skips the bidirectional gate when a user is adding their
            // own provider/receiver role.
            if (participantUserId == organizerId)
            {
                continue;
            }

            var organizerRules = rulesByUser[organizerId];
            if (!await HasAllValidVettingsAsync(
                    tenantId,
                    organizerId,
                    participantRules.RequiredVettingTypes,
                    cancellationToken) ||
                !await HasAllValidVettingsAsync(
                    tenantId,
                    participantUserId,
                    organizerRules.RequiredVettingTypes,
                    cancellationToken))
            {
                _logger.LogInformation(
                    "Organizer {OrganizerId} and participant {ParticipantId} failed the bidirectional vetting gate",
                    organizerId,
                    participantUserId);
                return "Failed to add participant (may already exist)";
            }
        }

        return null;
    }

    private async Task<bool> HasAllValidVettingsAsync(
        int tenantId,
        int userId,
        IReadOnlyCollection<string> requiredTypes,
        CancellationToken cancellationToken)
    {
        if (requiredTypes.Count == 0)
        {
            return true;
        }

        var distinctTypes = requiredTypes.Distinct(StringComparer.Ordinal).ToArray();
        var today = DateTime.UtcNow.Date;
        var validTypes = await _db.Set<VettingRecord>()
            .AsNoTracking()
            .Where(record => record.TenantId == tenantId &&
                             record.UserId == userId &&
                             record.Status == "verified" &&
                             distinctTypes.Contains(record.VettingType) &&
                             (record.ExpiresAt == null || record.ExpiresAt >= today))
            .Select(record => record.VettingType)
            .Distinct()
            .ToListAsync(cancellationToken);

        return validTypes.Count == distinctTypes.Length;
    }

    private static void MergeSafeguardingTriggers(
        SafeguardingInteractionRules rules,
        string? triggersJson)
    {
        if (string.IsNullOrWhiteSpace(triggersJson))
        {
            return;
        }

        try
        {
            using var document = JsonDocument.Parse(triggersJson);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                return;
            }

            var requiresVetting = root.TryGetProperty("requires_vetted_interaction", out var vettedInteraction) &&
                                  vettedInteraction.ValueKind == JsonValueKind.True;
            if (requiresVetting &&
                root.TryGetProperty("vetting_type_required", out var vettingType) &&
                vettingType.ValueKind == JsonValueKind.String &&
                !string.IsNullOrWhiteSpace(vettingType.GetString()))
            {
                rules.RequiredVettingTypes.Add(vettingType.GetString()!);
            }
        }
        catch (JsonException)
        {
            // Option writes validate this schema. A historical malformed row has
            // no safely actionable trigger and therefore contributes no rules,
            // matching Laravel's json_decode(... ) ?: [] behavior.
        }
    }

    private async Task AcquireSessionExchangeLockAsync(
        int tenantId,
        int exchangeId,
        CancellationToken cancellationToken)
    {
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_lock({tenantId}, {exchangeId})",
            cancellationToken);
    }

    private async Task ReleaseSessionExchangeLockAndCloseAsync(
        int tenantId,
        int exchangeId,
        bool lockAttempted)
    {
        try
        {
            if (lockAttempted &&
                _db.Database.GetDbConnection().State != ConnectionState.Closed)
            {
                // Never pass the request token here: after a commit (or a client
                // disconnect), releasing the session lock is mandatory before the
                // connection can return to the pool.
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"SELECT pg_advisory_unlock({tenantId}, {exchangeId})",
                    CancellationToken.None);
            }
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Could not explicitly release group-exchange session lock {TenantId}/{ExchangeId}; closing connection",
                tenantId,
                exchangeId);
        }
        finally
        {
            try
            {
                await _db.Database.CloseConnectionAsync();
            }
            catch (Exception exception)
            {
                _logger.LogError(
                    exception,
                    "Could not close connection after group-exchange session lock {TenantId}/{ExchangeId}",
                    tenantId,
                    exchangeId);
            }
        }
    }

    private async Task<bool> HasValidTenantParticipantsAsync(
        GroupExchange exchange,
        int tenantId,
        CancellationToken cancellationToken)
    {
        var userIds = exchange.Participants.Select(item => item.UserId).Distinct().ToArray();
        if (userIds.Length == 0)
        {
            return true;
        }

        var tenantUserCount = await _db.Users
            .AsNoTracking()
            .CountAsync(user => user.TenantId == tenantId &&
                                userIds.Contains(user.Id) &&
                                user.IsActive &&
                                user.SuspendedAt == null,
                cancellationToken);
        return tenantUserCount == userIds.Length;
    }

    private static List<GroupExchangeSplit> CalculateSplit(GroupExchange exchange)
    {
        var participants = exchange.Participants.OrderBy(item => item.Id).ToList();
        if (participants.Count == 0)
        {
            return new List<GroupExchangeSplit>();
        }

        if (exchange.SplitType == "custom")
        {
            return participants.Select(item => new GroupExchangeSplit(
                item.UserId,
                item.Role,
                RoundHours(item.Hours))).ToList();
        }

        var result = new List<GroupExchangeSplit>();
        foreach (var roleGroup in participants.GroupBy(item => item.Role))
        {
            var roleParticipants = roleGroup.ToList();
            var allocated = 0m;

            if (exchange.SplitType == "weighted")
            {
                // Laravel treats each non-positive weight as 1. Calculate the
                // denominator from those effective weights as well; otherwise a
                // mix of positive and negative inputs can produce a negative final
                // remainder even though every participant's effective weight is
                // positive.
                var totalWeight = roleParticipants.Sum(item => item.Weight > 0m ? item.Weight : 1m);

                for (var index = 0; index < roleParticipants.Count; index++)
                {
                    var participant = roleParticipants[index];
                    var hours = index == roleParticipants.Count - 1
                        ? RoundHours(exchange.TotalHours - allocated)
                        : RoundHours(((participant.Weight > 0m ? participant.Weight : 1m) / totalWeight) *
                                     exchange.TotalHours);
                    allocated += hours;
                    result.Add(new GroupExchangeSplit(participant.UserId, participant.Role, hours));
                }
            }
            else
            {
                var hoursEach = RoundHours(exchange.TotalHours / roleParticipants.Count);
                for (var index = 0; index < roleParticipants.Count; index++)
                {
                    var participant = roleParticipants[index];
                    var hours = index == roleParticipants.Count - 1
                        ? RoundHours(exchange.TotalHours - allocated)
                        : hoursEach;
                    allocated += hours;
                    result.Add(new GroupExchangeSplit(participant.UserId, participant.Role, hours));
                }
            }
        }

        return result;
    }

    private static string? GetSplitImbalanceError(IReadOnlyCollection<GroupExchangeSplit> split)
    {
        if (split.Any(item => item.Hours <= 0m))
        {
            return "Every provider and receiver must settle more than zero hours.";
        }

        var credits = split
            .Where(item => item.Role == ProviderRole && item.Hours > 0m)
            .Sum(item => RoundHours(item.Hours));
        var debits = split
            .Where(item => item.Role != ProviderRole && item.Hours > 0m)
            .Sum(item => RoundHours(item.Hours));

        credits = RoundHours(credits);
        debits = RoundHours(debits);
        if (credits <= 0m || debits <= 0m)
        {
            return "Provider and receiver hours must both be greater than zero.";
        }

        return credits == debits
            ? null
            : $"Provider hours ({credits:F2}) and receiver hours ({debits:F2}) must be equal — " +
              "an exchange cannot create or destroy time credits. Adjust participant hours and try again.";
    }

    private static List<GroupExchangeSplit> AggregatePositiveSplit(
        IEnumerable<GroupExchangeSplit> split,
        string role)
    {
        return split
            .Where(item => item.Role == role && item.Hours > 0m)
            .GroupBy(item => item.UserId)
            .Select(group => new GroupExchangeSplit(group.Key, role, RoundHours(group.Sum(item => item.Hours))))
            .OrderBy(item => item.UserId)
            .ToList();
    }

    private static List<GroupExchangeLedgerTransfer> PairTransfers(
        IReadOnlyList<GroupExchangeSplit> receivers,
        IReadOnlyList<GroupExchangeSplit> providers)
    {
        var result = new List<GroupExchangeLedgerTransfer>();
        var receiverIndex = 0;
        var providerIndex = 0;
        var receiverRemaining = receivers.Count > 0 ? receivers[0].Hours : 0m;
        var providerRemaining = providers.Count > 0 ? providers[0].Hours : 0m;

        while (receiverIndex < receivers.Count && providerIndex < providers.Count)
        {
            var amount = RoundHours(Math.Min(receiverRemaining, providerRemaining));
            if (amount > 0m)
            {
                result.Add(new GroupExchangeLedgerTransfer(
                    receivers[receiverIndex].UserId,
                    providers[providerIndex].UserId,
                    amount));
            }

            receiverRemaining = RoundHours(receiverRemaining - amount);
            providerRemaining = RoundHours(providerRemaining - amount);

            if (receiverRemaining == 0m)
            {
                receiverIndex++;
                receiverRemaining = receiverIndex < receivers.Count ? receivers[receiverIndex].Hours : 0m;
            }

            if (providerRemaining == 0m)
            {
                providerIndex++;
                providerRemaining = providerIndex < providers.Count ? providers[providerIndex].Hours : 0m;
            }
        }

        if (receiverIndex != receivers.Count || providerIndex != providers.Count)
        {
            throw new InvalidOperationException("Balanced exchange could not be paired into ledger transfers.");
        }

        return result;
    }

    private async Task NotifyStartAsync(
        int exchangeId,
        string title,
        IReadOnlyCollection<int> userIds,
        int tenantId,
        CancellationToken cancellationToken)
    {
        foreach (var userId in userIds.Distinct())
        {
            var body = $"Group exchange “{title}” needs your confirmation.";
            await NotifyBestEffortAsync(
                tenantId,
                userId,
                "group_exchange",
                "Group exchange needs confirmation",
                body,
                $"/group-exchanges/{exchangeId}",
                "group_exchange_start",
                exchangeId,
                cancellationToken);
        }
    }

    private async Task NotifyCompletionAsync(
        int exchangeId,
        string title,
        IReadOnlyCollection<GroupExchangeSplit> split,
        int tenantId,
        CancellationToken cancellationToken)
    {
        foreach (var change in split.Where(item => item.Hours > 0m))
        {
            var direction = change.Role == ProviderRole ? "credited" : "debited";
            var body = $"Your wallet was {direction} {change.Hours:F2} hours for “{title}”.";
            await NotifyBestEffortAsync(
                tenantId,
                change.UserId,
                "transaction",
                "Group exchange completed",
                body,
                "/wallet",
                "group_exchange_completed",
                exchangeId,
                cancellationToken);
        }
    }

    private async Task NotifyBestEffortAsync(
        int tenantId,
        int userId,
        string type,
        string title,
        string body,
        string link,
        string emailTemplate,
        int exchangeId,
        CancellationToken cancellationToken)
    {
        var notification = new Notification
        {
            TenantId = tenantId,
            UserId = userId,
            Type = type,
            Title = title,
            Body = body,
            Data = JsonSerializer.Serialize(new { exchange_id = exchangeId, link }),
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Could not create {NotificationType} notification for user {UserId}",
                type,
                userId);
            _db.Entry(notification).State = EntityState.Detached;
        }

        try
        {
            await _pushNotifications.SendPushAsync(
                userId,
                title,
                body,
                JsonSerializer.Serialize(new { exchange_id = exchangeId, link }));
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Could not send group-exchange push to user {UserId}", userId);
            // A provider-log entity left Added after a failed push save must not
            // poison the independent email channel.
            _db.ChangeTracker.Clear();
        }

        try
        {
            if (await ShouldSendTransactionalEmailAsync(userId, cancellationToken))
            {
                await _emailNotifications.SendTemplatedEmailAsync(userId, emailTemplate, new Dictionary<string, string>
                {
                    ["exchange_id"] = exchangeId.ToString(),
                    ["title"] = title,
                    ["message"] = body,
                    ["link"] = link
                });
            }
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Could not send group-exchange email to user {UserId}", userId);
        }
    }

    private async Task<bool> ShouldSendTransactionalEmailAsync(
        int userId,
        CancellationToken cancellationToken)
    {
        string? preferencesJson;
        try
        {
            preferencesJson = await _db.Users
                .AsNoTracking()
                .Where(user => user.Id == userId)
                .Select(user => user.NotificationPreferences)
                .FirstOrDefaultAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            // Canonical behavior is fail-open for this preference lookup; the
            // outer channel wrapper still prevents a transport failure from
            // affecting the committed exchange.
            _logger.LogDebug(
                exception,
                "Could not load email_transactions preference for user {UserId}; using canonical default-on",
                userId);
            return true;
        }

        if (string.IsNullOrWhiteSpace(preferencesJson))
        {
            return true;
        }

        try
        {
            using var document = JsonDocument.Parse(preferencesJson);
            if (document.RootElement.ValueKind != JsonValueKind.Object ||
                !document.RootElement.TryGetProperty("email_transactions", out var preference))
            {
                return true;
            }

            return preference.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Number when preference.TryGetInt64(out var numeric) => numeric != 0,
                JsonValueKind.String when bool.TryParse(preference.GetString(), out var parsed) => parsed,
                _ => true
            };
        }
        catch (JsonException exception)
        {
            _logger.LogDebug(
                exception,
                "Could not parse email_transactions preference for user {UserId}; using canonical default-on",
                userId);
            return true;
        }
    }

    private static GroupExchangeListItem MapListItem(GroupExchange exchange)
    {
        return new GroupExchangeListItem(
            exchange.Id,
            exchange.Title,
            exchange.Description,
            exchange.CreatedById,
            DisplayName(exchange.CreatedBy),
            exchange.CreatedBy?.AvatarUrl,
            exchange.Status,
            exchange.SplitType,
            exchange.TotalHours,
            exchange.Participants.Count,
            exchange.CreatedAt,
            exchange.UpdatedAt,
            exchange.CompletedAt);
    }

    private static GroupExchangeDetail MapDetail(
        GroupExchange exchange,
        IReadOnlyCollection<GroupExchangeSplit>? calculatedSplit)
    {
        return new GroupExchangeDetail(
            exchange.Id,
            exchange.TenantId,
            exchange.Title,
            exchange.Description,
            exchange.CreatedById,
            DisplayName(exchange.CreatedBy),
            exchange.CreatedBy?.AvatarUrl,
            exchange.ListingId,
            exchange.Status,
            exchange.SplitType,
            exchange.TotalHours,
            exchange.BrokerId,
            exchange.BrokerNotes,
            exchange.CompletedAt,
            exchange.CreatedAt,
            exchange.UpdatedAt,
            exchange.Participants.Count,
            exchange.Participants.OrderBy(item => item.Id).Select(item => new GroupExchangeParticipantDetail(
                item.Id,
                item.GroupExchangeId,
                item.UserId,
                DisplayName(item.User),
                DisplayName(item.User),
                item.User?.AvatarUrl,
                item.User?.AvatarUrl,
                item.User?.Email,
                item.Role,
                item.Hours,
                item.Weight,
                item.IsConfirmed,
                item.ConfirmedAt,
                item.Notes,
                item.CreatedAt)).ToList(),
            calculatedSplit);
    }

    private static string DisplayName(User? user) => user == null
        ? string.Empty
        : $"{user.FirstName} {user.LastName}".Trim();

    private static bool IsValidParticipant(GroupExchangeParticipantInput input) =>
        input.UserId > 0 &&
        input.Role is ProviderRole or ReceiverRole;

    private static bool HasPhpNonEmptyString(string? value) =>
        !string.IsNullOrEmpty(value) && value != "0";

    private static string? NormalizeOptionalText(string? value)
    {
        if (value == null) return null;
        var trimmed = value.Trim();
        return HasPhpNonEmptyString(trimmed) ? trimmed : null;
    }

    private static decimal RoundHours(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private static decimal RoundWeight(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private static bool IsUniqueViolation(Exception exception)
    {
        var pending = new Stack<Exception>();
        pending.Push(exception);

        while (pending.Count > 0)
        {
            var current = pending.Pop();
            if (current is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                return true;
            }

            if (current is AggregateException aggregate)
            {
                foreach (var inner in aggregate.InnerExceptions)
                {
                    pending.Push(inner);
                }
            }
            else if (current.InnerException != null)
            {
                pending.Push(current.InnerException);
            }
        }

        return false;
    }

    private static bool IsSerializationFailure(Exception exception)
    {
        var pending = new Stack<Exception>();
        pending.Push(exception);

        while (pending.Count > 0)
        {
            var current = pending.Pop();
            if (current is PostgresException { SqlState: PostgresErrorCodes.SerializationFailure })
            {
                return true;
            }

            if (current is AggregateException aggregate)
            {
                foreach (var inner in aggregate.InnerExceptions)
                {
                    pending.Push(inner);
                }
            }
            else if (current.InnerException != null)
            {
                pending.Push(current.InnerException);
            }
        }

        return false;
    }
}

public sealed record CreateGroupExchangeInput(
    string Title,
    string? Description,
    string? Status,
    string? SplitType,
    decimal TotalHours,
    int? ListingId,
    int? BrokerId,
    string? BrokerNotes,
    IReadOnlyCollection<GroupExchangeParticipantInput>? Participants);

public sealed record UpdateGroupExchangeInput(
    string? Title,
    string? Description,
    string? SplitType,
    decimal? TotalHours,
    int? BrokerId,
    string? BrokerNotes,
    int? ListingId);

public sealed record GroupExchangeParticipantInput(
    int UserId,
    string Role,
    decimal Hours,
    decimal Weight = 1m);

public sealed record GroupExchangeListResult(
    IReadOnlyCollection<GroupExchangeListItem> Items,
    bool HasMore);

public sealed record GroupExchangeMutationResult(bool Success, int? ExchangeId, string? Error)
{
    public static GroupExchangeMutationResult Succeeded(int exchangeId) => new(true, exchangeId, null);
    public static GroupExchangeMutationResult Failed(string error) => new(false, null, error);
}

public sealed record GroupExchangeOperationResult(bool Success, string? Error)
{
    public static GroupExchangeOperationResult Succeeded() => new(true, null);
    public static GroupExchangeOperationResult Failed(string error) => new(false, error);
}

public sealed record GroupExchangeCompletionResult(
    bool Success,
    IReadOnlyCollection<int> TransactionIds,
    string? Error)
{
    public static GroupExchangeCompletionResult Succeeded(IReadOnlyCollection<int> ids) => new(true, ids, null);
    public static GroupExchangeCompletionResult Failed(string error) => new(false, Array.Empty<int>(), error);
}

public sealed record GroupExchangeListItem(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("organizer_id")] int OrganizerId,
    [property: JsonPropertyName("organizer_name")] string OrganizerName,
    [property: JsonPropertyName("organizer_avatar")] string? OrganizerAvatar,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("split_type")] string SplitType,
    [property: JsonPropertyName("total_hours")] decimal TotalHours,
    [property: JsonPropertyName("participant_count")] int ParticipantCount,
    [property: JsonPropertyName("created_at")] DateTime CreatedAt,
    [property: JsonPropertyName("updated_at")] DateTime? UpdatedAt,
    [property: JsonPropertyName("completed_at")] DateTime? CompletedAt);

public sealed record GroupExchangeDetail(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("tenant_id")] int TenantId,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("organizer_id")] int OrganizerId,
    [property: JsonPropertyName("organizer_name")] string OrganizerName,
    [property: JsonPropertyName("organizer_avatar")] string? OrganizerAvatar,
    [property: JsonPropertyName("listing_id")] int? ListingId,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("split_type")] string SplitType,
    [property: JsonPropertyName("total_hours")] decimal TotalHours,
    [property: JsonPropertyName("broker_id")] int? BrokerId,
    [property: JsonPropertyName("broker_notes")] string? BrokerNotes,
    [property: JsonPropertyName("completed_at")] DateTime? CompletedAt,
    [property: JsonPropertyName("created_at")] DateTime CreatedAt,
    [property: JsonPropertyName("updated_at")] DateTime? UpdatedAt,
    [property: JsonPropertyName("participant_count")] int ParticipantCount,
    [property: JsonPropertyName("participants")] IReadOnlyCollection<GroupExchangeParticipantDetail> Participants,
    [property: JsonPropertyName("calculated_split")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    IReadOnlyCollection<GroupExchangeSplit>? CalculatedSplit);

public sealed record GroupExchangeParticipantDetail(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("group_exchange_id")] int GroupExchangeId,
    [property: JsonPropertyName("user_id")] int UserId,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("user_name")] string UserName,
    [property: JsonPropertyName("avatar_url")] string? AvatarUrl,
    [property: JsonPropertyName("user_avatar")] string? UserAvatar,
    [property: JsonPropertyName("user_email")] string? UserEmail,
    [property: JsonPropertyName("role")] string Role,
    [property: JsonPropertyName("hours")] decimal Hours,
    [property: JsonPropertyName("weight")] decimal Weight,
    [property: JsonPropertyName("confirmed")] bool Confirmed,
    [property: JsonPropertyName("confirmed_at")] DateTime? ConfirmedAt,
    [property: JsonPropertyName("notes")] string? Notes,
    [property: JsonPropertyName("created_at")] DateTime CreatedAt);

public sealed record GroupExchangeSplit(
    [property: JsonPropertyName("user_id")] int UserId,
    [property: JsonPropertyName("role")] string Role,
    [property: JsonPropertyName("hours")] decimal Hours);

internal sealed record GroupExchangeLedgerTransfer(int ReceiverId, int ProviderId, decimal Hours);

internal sealed record SafeguardingTriggerRow(int UserId, string? TriggersJson);

internal sealed class SafeguardingInteractionRules
{
    public HashSet<string> RequiredVettingTypes { get; } = new(StringComparer.Ordinal);
}

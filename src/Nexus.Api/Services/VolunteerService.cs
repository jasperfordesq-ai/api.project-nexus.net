// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for managing volunteer opportunities, shifts, applications, and check-ins.
/// </summary>
public class VolunteerService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly GamificationService _gamification;
    private readonly ILogger<VolunteerService> _logger;

    public VolunteerService(NexusDbContext db, TenantContext tenantContext, GamificationService gamification, ILogger<VolunteerService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _gamification = gamification;
        _logger = logger;
    }

    // === Opportunities ===

    /// <summary>
    /// Create a new volunteer opportunity (starts in Draft status).
    /// </summary>
    public async Task<(VolunteerOpportunity? Opportunity, string? Error)> CreateOpportunityAsync(
        int organizerId, string title, string? description, int? groupId, string? location,
        int? categoryId, int requiredVolunteers, bool isRecurring, DateTime? startsAt,
        DateTime? endsAt, DateTime? applicationDeadline, string? skillsRequired, decimal? creditReward)
    {
        if (string.IsNullOrWhiteSpace(title))
            return (null, "Title is required");

        if (requiredVolunteers < 1)
            return (null, "At least one volunteer is required");

        if (startsAt.HasValue && endsAt.HasValue && endsAt <= startsAt)
            return (null, "End date must be after start date");

        // Validate group exists if specified
        if (groupId.HasValue)
        {
            var groupExists = await _db.Groups.AnyAsync(g => g.Id == groupId.Value);
            if (!groupExists)
                return (null, "Group not found");
        }

        // Validate category exists if specified
        if (categoryId.HasValue)
        {
            var categoryExists = await _db.Categories.AnyAsync(c => c.Id == categoryId.Value);
            if (!categoryExists)
                return (null, "Category not found");
        }

        var opportunity = new VolunteerOpportunity
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            Title = title.Trim(),
            Description = description?.Trim(),
            OrganizerId = organizerId,
            GroupId = groupId,
            Location = location?.Trim(),
            CategoryId = categoryId,
            Status = OpportunityStatus.Draft,
            RequiredVolunteers = requiredVolunteers,
            IsRecurring = isRecurring,
            StartsAt = startsAt,
            EndsAt = endsAt,
            ApplicationDeadline = applicationDeadline,
            SkillsRequired = skillsRequired?.Trim(),
            CreditReward = creditReward,
            CreatedAt = DateTime.UtcNow
        };

        _db.VolunteerOpportunities.Add(opportunity);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Volunteer opportunity {OpportunityId} created by user {UserId}",
            opportunity.Id, organizerId);

        return (opportunity, null);
    }

    /// <summary>
    /// Update an existing volunteer opportunity. Only the organizer can update.
    /// </summary>
    public async Task<(VolunteerOpportunity? Opportunity, string? Error)> UpdateOpportunityAsync(
        int opportunityId, int userId, string? title, string? description, string? location,
        int? categoryId, int? requiredVolunteers, bool? isRecurring, DateTime? startsAt,
        DateTime? endsAt, DateTime? applicationDeadline, string? skillsRequired, decimal? creditReward)
    {
        var opportunity = await _db.VolunteerOpportunities
            .FirstOrDefaultAsync(o => o.Id == opportunityId);

        if (opportunity == null)
            return (null, "Opportunity not found");

        if (opportunity.OrganizerId != userId)
            return (null, "Only the organizer can update this opportunity");

        if (opportunity.Status == OpportunityStatus.Cancelled)
            return (null, "Cannot update a cancelled opportunity");

        if (title != null)
        {
            if (string.IsNullOrWhiteSpace(title))
                return (null, "Title cannot be empty");
            opportunity.Title = title.Trim();
        }

        if (description != null) opportunity.Description = description.Trim();
        if (location != null) opportunity.Location = location.Trim();
        if (categoryId.HasValue) opportunity.CategoryId = categoryId.Value;
        if (requiredVolunteers.HasValue)
        {
            if (requiredVolunteers.Value < 1)
                return (null, "At least one volunteer is required");
            opportunity.RequiredVolunteers = requiredVolunteers.Value;
        }
        if (isRecurring.HasValue) opportunity.IsRecurring = isRecurring.Value;
        if (startsAt.HasValue) opportunity.StartsAt = startsAt.Value;
        if (endsAt.HasValue) opportunity.EndsAt = endsAt.Value;
        if (applicationDeadline.HasValue) opportunity.ApplicationDeadline = applicationDeadline.Value;
        if (skillsRequired != null) opportunity.SkillsRequired = skillsRequired.Trim();
        if (creditReward.HasValue) opportunity.CreditReward = creditReward.Value;

        opportunity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Volunteer opportunity {OpportunityId} updated by user {UserId}",
            opportunityId, userId);

        return (opportunity, null);
    }

    /// <summary>
    /// Publish a draft opportunity so it becomes visible and accepts applications.
    /// </summary>
    public async Task<(VolunteerOpportunity? Opportunity, string? Error)> PublishOpportunityAsync(
        int opportunityId, int userId)
    {
        var opportunity = await _db.VolunteerOpportunities
            .FirstOrDefaultAsync(o => o.Id == opportunityId);

        if (opportunity == null)
            return (null, "Opportunity not found");

        if (opportunity.OrganizerId != userId)
            return (null, "Only the organizer can publish this opportunity");

        if (opportunity.Status != OpportunityStatus.Draft)
            return (null, $"Cannot publish an opportunity with status {opportunity.Status}");

        opportunity.Status = OpportunityStatus.Published;
        opportunity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Volunteer opportunity {OpportunityId} published by user {UserId}",
            opportunityId, userId);

        return (opportunity, null);
    }

    /// <summary>
    /// Close an opportunity so it no longer accepts applications.
    /// </summary>
    public async Task<(VolunteerOpportunity? Opportunity, string? Error)> CloseOpportunityAsync(
        int opportunityId, int userId)
    {
        var opportunity = await _db.VolunteerOpportunities
            .FirstOrDefaultAsync(o => o.Id == opportunityId);

        if (opportunity == null)
            return (null, "Opportunity not found");

        if (opportunity.OrganizerId != userId)
            return (null, "Only the organizer can close this opportunity");

        if (opportunity.Status != OpportunityStatus.Published)
            return (null, $"Cannot close an opportunity with status {opportunity.Status}");

        opportunity.Status = OpportunityStatus.Closed;
        opportunity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Volunteer opportunity {OpportunityId} closed by user {UserId}",
            opportunityId, userId);

        return (opportunity, null);
    }

    // === Applications ===

    /// <summary>
    /// Apply to a published volunteer opportunity.
    /// </summary>
    public async Task<(VolunteerApplication? Application, string? Error)> ApplyToOpportunityAsync(
        int opportunityId, int userId, string? message)
    {
        var opportunity = await _db.VolunteerOpportunities
            .FirstOrDefaultAsync(o => o.Id == opportunityId);

        if (opportunity == null)
            return (null, "Opportunity not found");

        if (opportunity.Status != OpportunityStatus.Published)
            return (null, "This opportunity is not accepting applications");

        if (opportunity.OrganizerId == userId)
            return (null, "Cannot apply to your own opportunity");

        if (opportunity.ApplicationDeadline.HasValue && DateTime.UtcNow > opportunity.ApplicationDeadline.Value)
            return (null, "The application deadline has passed");

        // Check for existing active application
        var existingApplication = await _db.VolunteerApplications
            .AnyAsync(a => a.OpportunityId == opportunityId
                && a.UserId == userId
                && a.Status != ApplicationStatus.Withdrawn
                && a.Status != ApplicationStatus.Declined);

        if (existingApplication)
            return (null, "You already have an active application for this opportunity");

        var application = new VolunteerApplication
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            OpportunityId = opportunityId,
            UserId = userId,
            Status = ApplicationStatus.Pending,
            Message = message?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.VolunteerApplications.Add(application);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} applied to volunteer opportunity {OpportunityId}",
            userId, opportunityId);

        // Award XP for applying (non-critical)
        try
        {
            await _gamification.AwardXpAsync(userId, 5, "volunteer_applied", application.Id,
                "Applied to a volunteer opportunity");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "Failed to award XP for volunteer application {ApplicationId}", application.Id);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to award XP for volunteer application {ApplicationId}", application.Id);
        }

        return (application, null);
    }

    /// <summary>
    /// Review (approve or decline) a volunteer application. Only the organizer can review.
    /// </summary>
    public async Task<(VolunteerApplication? Application, string? Error)> ReviewApplicationAsync(
        int applicationId, int reviewerId, bool approved, string? reason)
    {
        var application = await _db.VolunteerApplications
            .Include(a => a.Opportunity)
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (application == null)
            return (null, "Application not found");

        if (application.Opportunity == null)
            return (null, "Opportunity not found");

        if (application.Opportunity.OrganizerId != reviewerId)
            return (null, "Only the organizer can review applications");

        if (application.Status != ApplicationStatus.Pending)
            return (null, $"Cannot review an application with status {application.Status}");

        application.Status = approved ? ApplicationStatus.Approved : ApplicationStatus.Declined;
        application.ReviewedById = reviewerId;
        application.ReviewedAt = DateTime.UtcNow;
        application.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Volunteer application {ApplicationId} {Status} by user {ReviewerId}",
            applicationId, application.Status, reviewerId);

        return (application, null);
    }

    /// <summary>
    /// Withdraw a volunteer application. Only the applicant can withdraw.
    /// </summary>
    public async Task<(VolunteerApplication? Application, string? Error)> WithdrawApplicationAsync(
        int applicationId, int userId)
    {
        var application = await _db.VolunteerApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (application == null)
            return (null, "Application not found");

        if (application.UserId != userId)
            return (null, "Only the applicant can withdraw their application");

        if (application.Status == ApplicationStatus.Withdrawn)
            return (null, "Application has already been withdrawn");

        if (application.Status == ApplicationStatus.Declined)
            return (null, "Cannot withdraw a declined application");

        application.Status = ApplicationStatus.Withdrawn;
        application.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Volunteer application {ApplicationId} withdrawn by user {UserId}",
            applicationId, userId);

        return (application, null);
    }

    // === Shifts ===

    /// <summary>
    /// Create a new shift for a volunteer opportunity.
    /// </summary>
    public async Task<(VolunteerShift? Shift, string? Error)> CreateShiftAsync(
        int opportunityId, int userId, string? title, DateTime startsAt, DateTime endsAt,
        int maxVolunteers, string? location, string? notes)
    {
        var opportunity = await _db.VolunteerOpportunities
            .FirstOrDefaultAsync(o => o.Id == opportunityId);

        if (opportunity == null)
            return (null, "Opportunity not found");

        if (opportunity.OrganizerId != userId)
            return (null, "Only the organizer can create shifts");

        if (opportunity.Status == OpportunityStatus.Cancelled)
            return (null, "Cannot create shifts for a cancelled opportunity");

        if (endsAt <= startsAt)
            return (null, "End time must be after start time");

        if (maxVolunteers < 1)
            return (null, "At least one volunteer slot is required");

        var shift = new VolunteerShift
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            OpportunityId = opportunityId,
            Title = title?.Trim(),
            StartsAt = startsAt,
            EndsAt = endsAt,
            MaxVolunteers = maxVolunteers,
            Location = location?.Trim(),
            Notes = notes?.Trim(),
            Status = ShiftStatus.Scheduled,
            CreatedAt = DateTime.UtcNow
        };

        _db.VolunteerShifts.Add(shift);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Shift {ShiftId} created for opportunity {OpportunityId} by user {UserId}",
            shift.Id, opportunityId, userId);

        return (shift, null);
    }

    // === Check-ins ===

    /// <summary>
    /// Check in a volunteer to a shift. User must have an approved application.
    /// </summary>
    public async Task<(VolunteerCheckIn? CheckIn, string? Error)> CheckInAsync(
        int shiftId, int userId)
    {
        var shift = await _db.VolunteerShifts
            .Include(s => s.Opportunity)
            .Include(s => s.CheckIns)
            .FirstOrDefaultAsync(s => s.Id == shiftId);

        if (shift == null)
            return (null, "Shift not found");

        if (shift.Opportunity == null)
            return (null, "Opportunity not found");

        if (shift.Status == ShiftStatus.Cancelled)
            return (null, "This shift has been cancelled");

        if (shift.Status == ShiftStatus.Completed)
            return (null, "This shift has already been completed");

        // Verify user has an approved application (or is the organizer)
        if (shift.Opportunity.OrganizerId != userId)
        {
            var hasApprovedApplication = await _db.VolunteerApplications
                .AnyAsync(a => a.OpportunityId == shift.OpportunityId
                    && a.UserId == userId
                    && a.Status == ApplicationStatus.Approved);

            if (!hasApprovedApplication)
                return (null, "You must have an approved application to check in");
        }

        // Check if already checked in (without checkout)
        var existingCheckIn = shift.CheckIns
            .FirstOrDefault(c => c.UserId == userId && c.CheckedOutAt == null);

        if (existingCheckIn != null)
            return (null, "You are already checked in to this shift");

        // Check if shift is full
        var activeCheckIns = shift.CheckIns.Count(c => c.CheckedOutAt == null);
        if (activeCheckIns >= shift.MaxVolunteers)
            return (null, "This shift is full");

        var checkIn = new VolunteerCheckIn
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            ShiftId = shiftId,
            UserId = userId,
            CheckedInAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _db.VolunteerCheckIns.Add(checkIn);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} checked in to shift {ShiftId}", userId, shiftId);

        return (checkIn, null);
    }

    /// <summary>
    /// Check out a volunteer from a shift and optionally award credits.
    /// </summary>
    public async Task<(VolunteerCheckIn? CheckIn, string? Error)> CheckOutAsync(
        int shiftId, int userId, decimal? hoursLogged)
    {
        var shift = await _db.VolunteerShifts
            .Include(s => s.Opportunity)
            .FirstOrDefaultAsync(s => s.Id == shiftId);

        if (shift == null)
            return (null, "Shift not found");

        var checkIn = await _db.VolunteerCheckIns
            .FirstOrDefaultAsync(c => c.ShiftId == shiftId && c.UserId == userId && c.CheckedOutAt == null);

        if (checkIn == null)
            return (null, "No active check-in found for this shift");

        checkIn.CheckedOutAt = DateTime.UtcNow;

        // Calculate hours: use provided value, or calculate from check-in/check-out times
        if (hoursLogged.HasValue && hoursLogged.Value > 0)
        {
            checkIn.HoursLogged = hoursLogged.Value;
        }
        else
        {
            var duration = checkIn.CheckedOutAt.Value - checkIn.CheckedInAt;
            checkIn.HoursLogged = Math.Round((decimal)duration.TotalHours, 2);
        }

        // Award credits if the opportunity has a CreditReward set
        if (shift.Opportunity?.CreditReward.HasValue == true && shift.Opportunity.CreditReward.Value > 0)
        {
            await using var dbTransaction = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            try
            {
                // Advisory lock on the organizer (who pays credits)
                await _db.Database.ExecuteSqlRawAsync(
                    "SELECT pg_advisory_xact_lock({0})",
                    shift.Opportunity.OrganizerId);

                // Check organizer's balance
                var received = await _db.Transactions
                    .Where(t => t.ReceiverId == shift.Opportunity.OrganizerId && t.Status == TransactionStatus.Completed)
                    .SumAsync(t => t.Amount);
                var sent = await _db.Transactions
                    .Where(t => t.SenderId == shift.Opportunity.OrganizerId && t.Status == TransactionStatus.Completed)
                    .SumAsync(t => t.Amount);
                var balance = received - sent;

                if (balance >= shift.Opportunity.CreditReward.Value)
                {
                    var transaction = new Transaction
                    {
                        TenantId = checkIn.TenantId,
                        SenderId = shift.Opportunity.OrganizerId,
                        ReceiverId = userId,
                        Amount = shift.Opportunity.CreditReward.Value,
                        Description = $"Volunteer shift: {shift.Title ?? shift.Opportunity.Title}",
                        Status = TransactionStatus.Completed,
                        CreatedAt = DateTime.UtcNow
                    };

                    _db.Transactions.Add(transaction);
                    await _db.SaveChangesAsync();

                    checkIn.TransactionId = transaction.Id;

                    _logger.LogInformation(
                        "Credit reward {Amount} transferred from organizer {OrganizerId} to volunteer {UserId} for shift {ShiftId}",
                        shift.Opportunity.CreditReward.Value, shift.Opportunity.OrganizerId, userId, shiftId);
                }
                else
                {
                    _logger.LogWarning(
                        "Organizer {OrganizerId} has insufficient balance ({Balance}) for credit reward ({Reward}) on shift {ShiftId}",
                        shift.Opportunity.OrganizerId, balance, shift.Opportunity.CreditReward.Value, shiftId);
                }

                await _db.SaveChangesAsync();
                await dbTransaction.CommitAsync();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                await dbTransaction.RollbackAsync();
                _logger.LogError(ex, "Failed to process credit reward for shift {ShiftId}, user {UserId}", shiftId, userId);
                // Still save the checkout even if credit transfer fails
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                await dbTransaction.RollbackAsync();
                _logger.LogError(ex, "Failed to process credit reward for shift {ShiftId}, user {UserId}", shiftId, userId);
                // Still save the checkout even if credit transfer fails
                await _db.SaveChangesAsync();
            }
            catch (InvalidOperationException ex)
            {
                await dbTransaction.RollbackAsync();
                _logger.LogError(ex, "Failed to process credit reward for shift {ShiftId}, user {UserId}", shiftId, userId);
                // Still save the checkout even if credit transfer fails
                await _db.SaveChangesAsync();
            }
            catch (OperationCanceledException ex)
            {
                await dbTransaction.RollbackAsync();
                _logger.LogError(ex, "Failed to process credit reward for shift {ShiftId}, user {UserId}", shiftId, userId);
                // Still save the checkout even if credit transfer fails
                await _db.SaveChangesAsync();
            }
        }
        else
        {
            await _db.SaveChangesAsync();
        }

        _logger.LogInformation("User {UserId} checked out of shift {ShiftId}, hours logged: {Hours}",
            userId, shiftId, checkIn.HoursLogged);

        // Award XP for volunteering (non-critical)
        try
        {
            var xpAmount = (int)Math.Max(10, Math.Round(checkIn.HoursLogged.Value * 15));
            await _gamification.AwardXpAsync(userId, xpAmount, "volunteer_shift_completed", checkIn.Id,
                $"Completed volunteer shift ({checkIn.HoursLogged:F1}h)");
            await _gamification.CheckAndAwardBadgesAsync(userId, "volunteer_shift_completed");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "Failed to award XP for volunteer check-out {CheckInId}", checkIn.Id);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to award XP for volunteer check-out {CheckInId}", checkIn.Id);
        }

        return (checkIn, null);
    }

    // === Stats ===

    /// <summary>
    /// Get volunteer statistics for a user.
    /// </summary>
    public async Task<object> GetVolunteerStatsAsync(int userId)
    {
        var totalCheckIns = await _db.VolunteerCheckIns
            .CountAsync(c => c.UserId == userId && c.CheckedOutAt != null);

        var totalHours = await _db.VolunteerCheckIns
            .Where(c => c.UserId == userId && c.CheckedOutAt != null && c.HoursLogged.HasValue)
            .SumAsync(c => c.HoursLogged!.Value);

        var opportunitiesApplied = await _db.VolunteerApplications
            .Where(a => a.UserId == userId)
            .Select(a => a.OpportunityId)
            .Distinct()
            .CountAsync();

        var opportunitiesApproved = await _db.VolunteerApplications
            .Where(a => a.UserId == userId && a.Status == ApplicationStatus.Approved)
            .Select(a => a.OpportunityId)
            .Distinct()
            .CountAsync();

        var activeCheckIns = await _db.VolunteerCheckIns
            .CountAsync(c => c.UserId == userId && c.CheckedOutAt == null);

        var creditsEarned = await _db.VolunteerCheckIns
            .Where(c => c.UserId == userId && c.TransactionId != null)
            .Join(_db.Transactions, c => c.TransactionId, t => t.Id, (c, t) => t.Amount)
            .SumAsync();

        return new
        {
            total_shifts_completed = totalCheckIns,
            total_hours = Math.Round(totalHours, 2),
            opportunities_applied = opportunitiesApplied,
            opportunities_approved = opportunitiesApproved,
            active_check_ins = activeCheckIns,
            credits_earned = Math.Round(creditsEarned, 2)
        };
    }
}

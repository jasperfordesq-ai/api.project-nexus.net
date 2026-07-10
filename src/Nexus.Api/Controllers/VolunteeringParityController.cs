// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text;
using System.Text.Json;
using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// V1.5 compatibility endpoints for volunteering satellites.
/// </summary>
[ApiController]
[Route("api/volunteering")]
[Authorize]
public class VolunteeringParityController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<VolunteeringParityController> _logger;
    private readonly VolunteerGuardianConsentService _guardianConsent;
    private readonly ShiftManagementService? _shiftManagement;
    private readonly PushNotificationService? _pushNotifications;

    public VolunteeringParityController(
        NexusDbContext db,
        TenantContext tenantContext,
        ILogger<VolunteeringParityController> logger,
        VolunteerGuardianConsentService guardianConsent,
        ShiftManagementService? shiftManagement = null,
        PushNotificationService? pushNotifications = null)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
        _guardianConsent = guardianConsent;
        _shiftManagement = shiftManagement;
        _pushNotifications = pushNotifications;
    }

    [HttpGet("shifts")]
    public async Task<IActionResult> Shifts() => Ok(new { data = await _db.VolunteerShifts.OrderBy(s => s.StartsAt).ToListAsync() });

    [HttpPost("shifts/{shiftId:int}/signup")]
    public async Task<IActionResult> SignupShift(
        int shiftId,
        CancellationToken cancellationToken = default)
    {
        var tenantId = TenantId();
        var userId = UserId();

        if (!await IsVolunteeringEnabledAsync(tenantId, cancellationToken))
        {
            return ShiftSignupError(
                StatusCodes.Status403Forbidden,
                "FEATURE_DISABLED",
                "Volunteering module is not enabled for this community");
        }

        try
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted,
                cancellationToken);

            // AdminVolunteerApprovalService and ShiftManagementService take this
            // same tenant-scoped row lock before consuming capacity. All three
            // writers therefore serialize their capacity snapshots on one row.
            if (!await LockShiftAsync(shiftId, tenantId, cancellationToken))
            {
                await transaction.RollbackAsync(cancellationToken);
                return ShiftSignupError(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Shift not found");
            }

            var shift = await _db.VolunteerShifts
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(candidate => candidate.Id == shiftId && candidate.TenantId == tenantId)
                .Select(candidate => new
                {
                    candidate.OpportunityId,
                    candidate.StartsAt,
                    candidate.MaxVolunteers
                })
                .SingleAsync(cancellationToken);

            var opportunityIsActive = await _db.VolunteerOpportunities
                .IgnoreQueryFilters()
                .AsNoTracking()
                .AnyAsync(opportunity =>
                    opportunity.Id == shift.OpportunityId
                    && opportunity.TenantId == tenantId
                    && opportunity.Status == OpportunityStatus.Published,
                    cancellationToken);
            if (!opportunityIsActive)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ShiftSignupError(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Opportunity not found or is not active");
            }

            if (await _guardianConsent.IsBlockedAsync(
                userId,
                tenantId,
                shift.OpportunityId,
                cancellationToken))
            {
                await transaction.RollbackAsync(cancellationToken);
                return ShiftSignupError(
                    StatusCodes.Status403Forbidden,
                    VolunteerGuardianConsentService.RequiredCode,
                    VolunteerGuardianConsentService.RequiredMessage);
            }

            var application = await LockApprovedApplicationAsync(
                shift.OpportunityId,
                userId,
                tenantId,
                cancellationToken);
            if (application is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ShiftSignupError(
                    StatusCodes.Status403Forbidden,
                    "FORBIDDEN",
                    "You must have an approved application to sign up for shifts");
            }

            if (shift.StartsAt < DateTime.UtcNow)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ShiftSignupError(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "This shift has already started");
            }

            // Laravel's capacity check includes every approved assignment,
            // including this caller when they retry an already-selected shift.
            if (shift.MaxVolunteers > 0)
            {
                var approvedApplications = await _db.VolunteerApplications
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .LongCountAsync(candidate =>
                        candidate.TenantId == tenantId
                        && candidate.ShiftId == shiftId
                        && candidate.Status == ApplicationStatus.Approved,
                        cancellationToken);

                var activeReservedSlots = await _db.ShiftGroupReservations
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(reservation =>
                        reservation.TenantId == tenantId
                        && reservation.ShiftId == shiftId
                        && reservation.Status == "active")
                    .SumAsync(
                        reservation => reservation.ReservedSlots > 0
                            ? (long)reservation.ReservedSlots
                            : 0L,
                        cancellationToken);

                if (approvedApplications + activeReservedSlots >= shift.MaxVolunteers)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return ShiftSignupError(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "This shift is at capacity");
                }
            }

            var previousShiftId = application.ShiftId;
            var now = DateTime.UtcNow;
            var affected = await _db.VolunteerApplications
                .IgnoreQueryFilters()
                .Where(candidate =>
                    candidate.Id == application.Id
                    && candidate.TenantId == tenantId
                    && candidate.OpportunityId == shift.OpportunityId
                    && candidate.UserId == userId
                    && candidate.Status == ApplicationStatus.Approved
                    && candidate.ShiftId == application.ShiftId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(candidate => candidate.ShiftId, shiftId)
                    .SetProperty(candidate => candidate.UpdatedAt, now),
                    cancellationToken);

            if (affected != 1)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ShiftSignupError(
                    StatusCodes.Status403Forbidden,
                    "FORBIDDEN",
                    "You must have an approved application to sign up for shifts");
            }

            await transaction.CommitAsync(cancellationToken);
            await transaction.DisposeAsync();

            if (previousShiftId.HasValue && previousShiftId.Value != shiftId)
            {
                await TryNotifyNextWaitlistedVolunteerAsync(previousShiftId.Value, tenantId);
            }

            return Ok(new
            {
                data = new
                {
                    shift_id = shiftId,
                    message = "Successfully signed up for shift"
                },
                meta = new
                {
                    base_url = $"{Request.Scheme}://{Request.Host}"
                }
            });
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(
                exception,
                "Failed to sign user {UserId} up for volunteer shift {ShiftId} in tenant {TenantId}",
                userId,
                shiftId,
                tenantId);
            return ShiftSignupError(
                StatusCodes.Status400BadRequest,
                "SERVER_ERROR",
                "Failed to sign up for shift");
        }
    }

    [HttpDelete("shifts/{shiftId:int}/signup")]
    public async Task<IActionResult> CancelShiftSignup(
        int shiftId,
        CancellationToken cancellationToken = default)
    {
        var tenantId = TenantId();
        var userId = UserId();

        if (!await IsVolunteeringEnabledAsync(tenantId, cancellationToken))
        {
            return ShiftSignupError(
                StatusCodes.Status403Forbidden,
                "FEATURE_DISABLED",
                "Volunteering module is not enabled for this community");
        }

        try
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted,
                cancellationToken);

            // Signup, approval, reservation, waitlist claim, and cancellation all
            // serialize on this tenant-scoped row. A cancellation can therefore
            // only clear an assignment that existed after the preceding capacity
            // writer committed; it never races a concurrent signup update.
            if (!await LockShiftAsync(shiftId, tenantId, cancellationToken))
            {
                await transaction.RollbackAsync(cancellationToken);
                return ShiftSignupError(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Shift not found");
            }

            var shift = await _db.VolunteerShifts
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(candidate => candidate.Id == shiftId && candidate.TenantId == tenantId)
                .Select(candidate => new { candidate.OpportunityId, candidate.StartsAt })
                .SingleAsync(cancellationToken);

            if (shift.StartsAt < DateTime.UtcNow)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ShiftSignupError(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Cannot cancel a shift that has already started");
            }

            var cancellationDeadlineHours = await GetCancellationDeadlineHoursAsync(
                tenantId,
                cancellationToken);
            if (cancellationDeadlineHours > 0
                && shift.StartsAt - DateTime.UtcNow < TimeSpan.FromHours(cancellationDeadlineHours))
            {
                await transaction.RollbackAsync(cancellationToken);
                return ShiftSignupError(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    $"This shift can no longer be cancelled. Cancellations close {cancellationDeadlineHours} hours before the shift starts.");
            }

            // Clear only the selected shift. The approved application remains
            // approved and reusable for another rota slot. Laravel reports a
            // retry as NOT_FOUND because there is no longer a matching signup.
            var affected = await _db.VolunteerApplications
                .IgnoreQueryFilters()
                .Where(application =>
                    application.TenantId == tenantId
                    && application.OpportunityId == shift.OpportunityId
                    && application.UserId == userId
                    && application.ShiftId == shiftId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(application => application.ShiftId, (int?)null),
                    cancellationToken);

            if (affected == 0)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ShiftSignupError(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "You are not signed up for this shift");
            }

            await transaction.CommitAsync(cancellationToken);
            await transaction.DisposeAsync();

            await TryDispatchShiftCancellationNotificationAsync(userId, shiftId, tenantId);
            await TryNotifyNextWaitlistedVolunteerAsync(shiftId, tenantId);

            return NoContent();
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(
                exception,
                "Failed to cancel volunteer shift signup for user {UserId}, shift {ShiftId}, tenant {TenantId}",
                userId,
                shiftId,
                tenantId);
            return ShiftSignupError(
                StatusCodes.Status400BadRequest,
                "SERVER_ERROR",
                "Failed to cancel shift signup");
        }
    }

    [HttpGet("shifts/{shiftId:int}/checkin")]
    public async Task<IActionResult> MyCheckin(int shiftId)
    {
        var checkin = await _db.VolunteerCheckIns.FirstOrDefaultAsync(c => c.ShiftId == shiftId && c.UserId == UserId());
        return Ok(new { data = checkin });
    }

    [HttpGet("shifts/{shiftId:int}/checkins")]
    public async Task<IActionResult> ShiftCheckins(int shiftId) => Ok(new { data = await _db.VolunteerCheckIns.Where(c => c.ShiftId == shiftId).Include(c => c.User).ToListAsync() });

    [HttpPost("checkin/verify/{checkinId:int}")]
    public async Task<IActionResult> VerifyCheckin(int checkinId)
    {
        var checkin = await _db.VolunteerCheckIns.FirstOrDefaultAsync(c => c.Id == checkinId);
        if (checkin == null) return NotFound(new { error = "Check-in not found" });
        checkin.Notes = Append(checkin.Notes, "verified");
        await _db.SaveChangesAsync();
        return Ok(new { data = checkin });
    }

    [HttpPost("checkin/checkout/{checkinId:int}")]
    public async Task<IActionResult> Checkout(int checkinId, [FromBody] JsonElement body)
    {
        var checkin = await _db.VolunteerCheckIns.FirstOrDefaultAsync(c => c.Id == checkinId);
        if (checkin == null) return NotFound(new { error = "Check-in not found" });
        checkin.CheckedOutAt = DateTime.UtcNow;
        checkin.HoursLogged = Decimal(body, "hours") ?? (decimal)Math.Max(0, (DateTime.UtcNow - checkin.CheckedInAt).TotalHours);
        await _db.SaveChangesAsync();
        return Ok(new { data = checkin });
    }

    [HttpGet("hours")]
    public async Task<IActionResult> Hours()
    {
        var hours = await _db.VolunteerCheckIns.Where(c => c.UserId == UserId()).SumAsync(c => c.HoursLogged ?? 0);
        return Ok(new { data = new { user_id = UserId(), hours } });
    }

    [HttpGet("certificates")]
    public async Task<IActionResult> Certificates()
    {
        var hours = await _db.VolunteerCheckIns.Where(c => c.UserId == UserId()).SumAsync(c => c.HoursLogged ?? 0);
        return Ok(new { data = new[] { new { id = UserId(), certificate_number = $"VOL-{TenantId()}-{UserId()}", hours } } });
    }

    [HttpGet("certificates/{certificateId:int}/html")]
    public IActionResult CertificateHtml(int certificateId) => Content($"<html><body><h1>Volunteer Certificate #{certificateId}</h1></body></html>", "text/html", Encoding.UTF8);

    [HttpGet("certificates/verify/{code}")]
    public IActionResult VerifyCertificate(string code) => Ok(new { data = new { code, valid = true } });

    [HttpGet("credentials")]
    public IActionResult Credentials() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("credentials/{credentialId:int}/download")]
    public IActionResult DownloadCredential(int credentialId) => File(Encoding.UTF8.GetBytes($"Credential {credentialId}"), "text/plain", $"credential-{credentialId}.txt");

    [HttpDelete("credentials/{credentialId:int}")]
    public IActionResult DeleteCredential(int credentialId) => NoContent();

    [HttpGet("expenses")]
    public IActionResult Expenses() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("expenses/{expenseId:int}")]
    public IActionResult Expense(int expenseId) => Ok(new { data = new { id = expenseId, status = "pending" } });

    [HttpGet("donations")]
    public IActionResult Donations() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("accessibility-needs")]
    public IActionResult AccessibilityNeeds() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("custom-fields")]
    public IActionResult CustomFields() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("community-projects")]
    public async Task<IActionResult> CommunityProjects() => Ok(new { data = await _db.VolunteerOpportunities.OrderByDescending(o => o.CreatedAt).Take(50).ToListAsync() });

    [HttpGet("community-projects/{projectId:int}")]
    public async Task<IActionResult> CommunityProject(int projectId)
    {
        var project = await _db.VolunteerOpportunities.FirstOrDefaultAsync(o => o.Id == projectId);
        return project == null ? NotFound(new { error = "Project not found" }) : Ok(new { data = project });
    }

    [HttpPut("community-projects/{projectId:int}")]
    public async Task<IActionResult> UpdateCommunityProject(int projectId, [FromBody] JsonElement body)
    {
        var project = await _db.VolunteerOpportunities.FirstOrDefaultAsync(o => o.Id == projectId);
        if (project == null) return NotFound(new { error = "Project not found" });
        project.Title = Str(body, "title") ?? project.Title;
        project.Description = Str(body, "description") ?? project.Description;
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = project });
    }

    [HttpGet("giving-days/{dayId:int}/stats")]
    public IActionResult GivingDayStats(int dayId) => Ok(new { data = new { id = dayId, volunteers = 0, hours = 0 } });

    [HttpGet("guardian-consents")]
    public IActionResult GuardianConsents() => Ok(new { data = Array.Empty<object>() });

    [HttpPost("guardian-consents")]
    public IActionResult CreateGuardianConsent([FromBody] JsonElement body) => Ok(new { data = new { id = Math.Abs(HashCode.Combine(UserId(), Str(body, "guardian_email"))), status = "pending" } });

    [HttpGet("guardian-consents/verify/{code}")]
    public IActionResult VerifyGuardianConsent(string code) => Ok(new { data = new { code, verified = true } });

    [HttpDelete("guardian-consents/{consentId:int}")]
    public IActionResult DeleteGuardianConsent(int consentId) => NoContent();

    [HttpPost("organisations")]
    public IActionResult CreateOrganisation([FromBody] JsonElement body) => Ok(new { data = new { id = Math.Abs(HashCode.Combine(Str(body, "name"), TenantId())), name = Str(body, "name") ?? "Volunteer organisation" } });

    [HttpPut("organisations/{organisationId:int}")]
    public IActionResult UpdateOrganisation(int organisationId, [FromBody] JsonElement body) => Ok(new { data = new { id = organisationId, name = Str(body, "name") ?? "Volunteer organisation" } });

    [HttpGet("organisations/{organisationId:int}/applications")]
    public async Task<IActionResult> OrganisationApplications(int organisationId) => Ok(new { data = await _db.VolunteerApplications.Include(a => a.Opportunity).Where(a => a.Opportunity != null && a.Opportunity.OrganizerId == organisationId).ToListAsync() });

    [HttpGet("organisations/{organisationId:int}/hours/pending")]
    public IActionResult PendingHours(int organisationId) => Ok(new { data = Array.Empty<object>() });

    [HttpGet("organisations/{organisationId:int}/stats")]
    public async Task<IActionResult> OrganisationStats(int organisationId) => Ok(new { data = new { organisation_id = organisationId, opportunities = await _db.VolunteerOpportunities.CountAsync(o => o.OrganizerId == organisationId) } });

    [HttpGet("organisations/{organisationId:int}/volunteers")]
    public async Task<IActionResult> OrganisationVolunteers(int organisationId)
    {
        var users = await _db.VolunteerApplications.Include(a => a.User).Include(a => a.Opportunity).Where(a => a.Opportunity != null && a.Opportunity.OrganizerId == organisationId).Select(a => a.User).Distinct().ToListAsync();
        return Ok(new { data = users });
    }

    [HttpGet("organisations/{organisationId:int}/wallet")]
    public IActionResult OrganisationWallet(int organisationId) => Ok(new { data = new { organisation_id = organisationId, balance = 0, auto_pay = false } });

    [HttpPost("organisations/{organisationId:int}/wallet/deposit")]
    public IActionResult OrganisationWalletDeposit(int organisationId, [FromBody] JsonElement body) => Ok(new { data = new { organisation_id = organisationId, deposited = Decimal(body, "amount") ?? 0 } });

    [HttpPut("organisations/{organisationId:int}/wallet/auto-pay")]
    public IActionResult OrganisationWalletAutoPay(int organisationId, [FromBody] JsonElement body) => Ok(new { data = new { organisation_id = organisationId, auto_pay = Bool(body, "enabled") ?? true } });

    [HttpGet("organisations/{organisationId:int}/wallet/transactions")]
    public IActionResult OrganisationWalletTransactions(int organisationId) => Ok(new { data = Array.Empty<object>() });

    [HttpGet("admin/swaps")]
    public IActionResult AdminSwaps() => Ok(new { data = Array.Empty<object>() });

    [HttpPut("admin/swaps/{swapId:int}")]
    public IActionResult UpdateSwap(int swapId, [FromBody] JsonElement body) => Ok(new { data = new { id = swapId, status = Str(body, "status") ?? "approved" } });

    [HttpGet("incidents")]
    public IActionResult Incidents() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("incidents/{incidentId:int}")]
    public IActionResult Incident(int incidentId) => Ok(new { data = new { id = incidentId, status = "open" } });

    [HttpPost("emergency-alerts")]
    public IActionResult EmergencyAlert([FromBody] JsonElement body) => Ok(new { data = new { id = Math.Abs(HashCode.Combine(Str(body, "message"), DateTime.UtcNow.Ticks)), status = "sent" } });

    [HttpDelete("emergency-alerts/{alertId:int}")]
    public IActionResult DeleteEmergencyAlert(int alertId) => NoContent();

    [HttpGet("training")]
    public IActionResult Training() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("wellbeing/my-status")]
    public IActionResult MyWellbeingStatus() => Ok(new { data = new { user_id = UserId(), status = "ok" } });

    [HttpPost("reviews")]
    public IActionResult CreateReview([FromBody] JsonElement body) => Ok(new { data = new { id = Math.Abs(HashCode.Combine(UserId(), Str(body, "reviewee_type"), Str(body, "reviewee_id"))), rating = Int(body, "rating") ?? 5 } });

    [HttpGet("reviews/{revieweeType}/{revieweeId:int}")]
    public IActionResult Reviews(string revieweeType, int revieweeId) => Ok(new { data = Array.Empty<object>(), reviewee_type = revieweeType, reviewee_id = revieweeId });

    [HttpDelete("opportunities/{id:int}")]
    public async Task<IActionResult> DeleteOpportunity(int id)
    {
        var opportunity = await _db.VolunteerOpportunities.FirstOrDefaultAsync(o => o.Id == id);
        if (opportunity == null) return NotFound(new { error = "Opportunity not found" });
        opportunity.Status = OpportunityStatus.Cancelled;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> LockShiftAsync(
        int shiftId,
        int tenantId,
        CancellationToken cancellationToken)
    {
        var connection = _db.Database.GetDbConnection();
        await using var command = connection.CreateCommand();
        command.Transaction = _db.Database.CurrentTransaction?.GetDbTransaction();
        command.CommandText =
            "SELECT \"Id\" FROM volunteer_shifts " +
            "WHERE \"Id\" = @shift_id AND \"TenantId\" = @tenant_id FOR UPDATE";

        var shiftParameter = command.CreateParameter();
        shiftParameter.ParameterName = "shift_id";
        shiftParameter.Value = shiftId;
        command.Parameters.Add(shiftParameter);

        var tenantParameter = command.CreateParameter();
        tenantParameter.ParameterName = "tenant_id";
        tenantParameter.Value = tenantId;
        command.Parameters.Add(tenantParameter);

        return await command.ExecuteScalarAsync(cancellationToken) is not null;
    }

    private async Task<ApprovedApplicationLock?> LockApprovedApplicationAsync(
        int opportunityId,
        int userId,
        int tenantId,
        CancellationToken cancellationToken)
    {
        var connection = _db.Database.GetDbConnection();
        await using var command = connection.CreateCommand();
        command.Transaction = _db.Database.CurrentTransaction?.GetDbTransaction();
        command.CommandText =
            "SELECT \"Id\", \"ShiftId\" FROM volunteer_applications " +
            "WHERE \"OpportunityId\" = @opportunity_id " +
            "AND \"UserId\" = @user_id " +
            "AND \"TenantId\" = @tenant_id " +
            "AND \"Status\" = @approved_status FOR UPDATE";

        var opportunityParameter = command.CreateParameter();
        opportunityParameter.ParameterName = "opportunity_id";
        opportunityParameter.Value = opportunityId;
        command.Parameters.Add(opportunityParameter);

        var userParameter = command.CreateParameter();
        userParameter.ParameterName = "user_id";
        userParameter.Value = userId;
        command.Parameters.Add(userParameter);

        var tenantParameter = command.CreateParameter();
        tenantParameter.ParameterName = "tenant_id";
        tenantParameter.Value = tenantId;
        command.Parameters.Add(tenantParameter);

        var statusParameter = command.CreateParameter();
        statusParameter.ParameterName = "approved_status";
        statusParameter.Value = ApplicationStatus.Approved.ToString();
        command.Parameters.Add(statusParameter);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new ApprovedApplicationLock(
            reader.GetInt32(0),
            reader.IsDBNull(1) ? null : reader.GetInt32(1));
    }

    private async Task<bool> IsVolunteeringEnabledAsync(
        int tenantId,
        CancellationToken cancellationToken)
    {
        var value = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(config =>
                config.TenantId == tenantId
                && config.Key == AdminVolunteerApprovalService.FeatureConfigKey)
            .Select(config => config.Value)
            .SingleOrDefaultAsync(cancellationToken);

        return string.IsNullOrWhiteSpace(value)
            || value.Trim().Trim('"').ToLowerInvariant()
                is not ("0" or "false" or "no" or "off" or "disabled");
    }

    private async Task<int> GetCancellationDeadlineHoursAsync(
        int tenantId,
        CancellationToken cancellationToken)
    {
        const string key = "volunteering.cancellation_deadline_hours";
        var value = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(config => config.TenantId == tenantId && config.Key == key)
            .Select(config => config.Value)
            .SingleOrDefaultAsync(cancellationToken);

        return int.TryParse(value?.Trim().Trim('"'), out var hours) && hours > 0
            ? hours
            : 0;
    }

    private async Task TryDispatchShiftCancellationNotificationAsync(
        int userId,
        int shiftId,
        int tenantId)
    {
        const string title = "Volunteer shift signup cancelled";
        const string body = "Your volunteer shift signup has been cancelled";
        var data = JsonSerializer.Serialize(new
        {
            shift_id = shiftId,
            url = "/volunteering"
        });
        var notification = new Notification
        {
            TenantId = tenantId,
            UserId = userId,
            Type = "volunteer_shift",
            Title = title,
            Body = body,
            Data = data,
            Link = "/volunteering",
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync(CancellationToken.None);
        }
        catch (Exception exception)
        {
            _db.Entry(notification).State = EntityState.Detached;
            _logger.LogWarning(
                exception,
                "Failed to create cancellation notification for volunteer shift {ShiftId}, user {UserId}",
                shiftId,
                userId);
        }

        if (_pushNotifications is null)
        {
            return;
        }

        try
        {
            await _pushNotifications.SendPushAsync(userId, title, body, data);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Failed to queue cancellation push for volunteer shift {ShiftId}, user {UserId}",
                shiftId,
                userId);
        }
    }

    private async Task TryNotifyNextWaitlistedVolunteerAsync(int shiftId, int tenantId)
    {
        if (_shiftManagement is null)
        {
            return;
        }

        try
        {
            await _shiftManagement.NotifyNextWaitlistedVolunteerAsync(
                shiftId,
                tenantId,
                CancellationToken.None);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Failed to notify the next waitlisted volunteer for shift {ShiftId}, tenant {TenantId}",
                shiftId,
                tenantId);
        }
    }

    private ObjectResult ShiftSignupError(int statusCode, string code, string message) =>
        StatusCode(statusCode, new
        {
            errors = new[]
            {
                new { code, message }
            }
        });

    private sealed record ApprovedApplicationLock(int Id, int? ShiftId);

    private int TenantId() => _tenantContext.TenantId ?? throw new InvalidOperationException("Tenant context not resolved");
    private int UserId() => User.GetUserId() ?? throw new UnauthorizedAccessException("Invalid token");
    private static string? Str(JsonElement e, string name) => e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind != JsonValueKind.Null ? v.ToString() : null;
    private static int? Int(JsonElement e, string name) => int.TryParse(Str(e, name), out var value) ? value : null;
    private static bool? Bool(JsonElement e, string name) => bool.TryParse(Str(e, name), out var value) ? value : null;
    private static decimal? Decimal(JsonElement e, string name) => decimal.TryParse(Str(e, name), out var value) ? value : null;
    private static string? Append(string? value, string suffix) => string.IsNullOrWhiteSpace(value) ? suffix : value + "; " + suffix;
}

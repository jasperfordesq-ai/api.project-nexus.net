// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

public record CreatePatternRequest(
    string? Title,
    string Frequency,
    string? DaysOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime,
    int? Capacity,
    DateOnly StartDate,
    DateOnly? EndDate,
    int? MaxOccurrences);

public record SwapRequest(
    int FromShiftId,
    int? ToShiftId,
    int? ToUserId,
    string? Message);

public record GroupReservationRequest(
    int GroupId,
    int ReservedSlots,
    string? Notes);

public record AddGroupMemberRequest(int UserId);

public class ShiftManagementService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenant;

    public ShiftManagementService(NexusDbContext db, TenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    // ── Recurring Patterns ────────────────────────────────────────────────────

    public async Task<List<RecurringShiftPattern>> GetPatternsAsync(int opportunityId)
    {
        return await _db.RecurringShiftPatterns
            .Where(p => p.OpportunityId == opportunityId && p.IsActive)
            .OrderBy(p => p.StartDate)
            .ToListAsync();
    }

    public async Task<(RecurringShiftPattern? Pattern, string? Error)> CreatePatternAsync(
        int opportunityId, int userId, CreatePatternRequest req)
    {
        var exists = await _db.VolunteerOpportunities
            .AnyAsync(o => o.Id == opportunityId);
        if (!exists) return (null, "Opportunity not found");

        var pattern = new RecurringShiftPattern
        {
            TenantId = _tenant.GetTenantIdOrThrow(),
            OpportunityId = opportunityId,
            CreatedBy = userId,
            Title = req.Title,
            Frequency = req.Frequency,
            DaysOfWeek = req.DaysOfWeek,
            StartTime = req.StartTime,
            EndTime = req.EndTime,
            Capacity = req.Capacity,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            MaxOccurrences = req.MaxOccurrences
        };

        _db.RecurringShiftPatterns.Add(pattern);
        await _db.SaveChangesAsync();
        await GenerateOccurrencesAsync(pattern.Id, 14);
        return (pattern, null);
    }

    public async Task<(RecurringShiftPattern? Pattern, string? Error)> UpdatePatternAsync(
        int patternId, int userId, CreatePatternRequest req)
    {
        var pattern = await _db.RecurringShiftPatterns
            .FirstOrDefaultAsync(p => p.Id == patternId);
        if (pattern == null) return (null, "Pattern not found");

        pattern.Title = req.Title;
        pattern.Frequency = req.Frequency;
        pattern.DaysOfWeek = req.DaysOfWeek;
        pattern.StartTime = req.StartTime;
        pattern.EndTime = req.EndTime;
        pattern.Capacity = req.Capacity;
        pattern.StartDate = req.StartDate;
        pattern.EndDate = req.EndDate;
        pattern.MaxOccurrences = req.MaxOccurrences;
        pattern.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (pattern, null);
    }

    public async Task<string?> DeactivatePatternAsync(int patternId, int userId)
    {
        var pattern = await _db.RecurringShiftPatterns
            .FirstOrDefaultAsync(p => p.Id == patternId);
        if (pattern == null) return "Pattern not found";

        pattern.IsActive = false;
        pattern.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return null;
    }

    public async Task GenerateOccurrencesAsync(int patternId, int daysAhead)
    {
        var pattern = await _db.RecurringShiftPatterns
            .FirstOrDefaultAsync(p => p.Id == patternId);
        if (pattern == null || !pattern.IsActive) return;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var cutoff = today.AddDays(daysAhead);

        var existing = await _db.VolunteerShifts
            .Where(s => s.RecurringPatternId == patternId)
            .Select(s => DateOnly.FromDateTime(s.StartsAt))
            .ToListAsync();

        var daysOfWeek = pattern.DaysOfWeek?
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(d => Enum.TryParse<DayOfWeek>(d.Trim(), true, out var day) ? day : (DayOfWeek?)null)
            .Where(d => d.HasValue)
            .Select(d => d!.Value)
            .ToHashSet() ?? new HashSet<DayOfWeek>();

        var current = pattern.StartDate > today ? pattern.StartDate : today;
        var generated = 0;

        while (current <= cutoff &&
               (pattern.EndDate == null || current <= pattern.EndDate) &&
               (pattern.MaxOccurrences == null ||
                pattern.OccurrencesGenerated + generated < pattern.MaxOccurrences))
        {
            bool shouldGenerate = pattern.Frequency switch
            {
                "daily" => true,
                "weekly" => daysOfWeek.Contains(current.DayOfWeek),
                "biweekly" => daysOfWeek.Contains(current.DayOfWeek) &&
                              ((current.DayNumber - pattern.StartDate.DayNumber) / 7) % 2 == 0,
                "monthly" => current.Day == pattern.StartDate.Day,
                _ => false
            };

            if (shouldGenerate && !existing.Contains(current))
            {
                _db.VolunteerShifts.Add(new VolunteerShift
                {
                    TenantId = pattern.TenantId,
                    OpportunityId = pattern.OpportunityId,
                    RecurringPatternId = patternId,
                    Title = pattern.Title,
                    StartsAt = current.ToDateTime(TimeOnly.FromTimeSpan(pattern.StartTime)),
                    EndsAt = current.ToDateTime(TimeOnly.FromTimeSpan(pattern.EndTime)),
                    MaxVolunteers = pattern.Capacity ?? 10,
                    Status = ShiftStatus.Scheduled
                });
                generated++;
            }
            current = current.AddDays(1);
        }

        if (generated > 0)
        {
            pattern.OccurrencesGenerated += generated;
            pattern.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    // ── Shift Swaps ───────────────────────────────────────────────────────────

    public async Task<List<ShiftSwapRequest>> GetSwapRequestsAsync(int userId)
    {
        return await _db.ShiftSwapRequests
            .Include(s => s.FromShift)
            .Include(s => s.ToShift)
            .Include(s => s.ToUser)
            .Where(s => s.FromUserId == userId || s.ToUserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<(ShiftSwapRequest? Swap, string? Error)> RequestSwapAsync(
        int userId, SwapRequest req)
    {
        var exists = await _db.VolunteerShifts.AnyAsync(s => s.Id == req.FromShiftId);
        if (!exists) return (null, "Shift not found");

        var swap = new ShiftSwapRequest
        {
            TenantId = _tenant.GetTenantIdOrThrow(),
            FromUserId = userId,
            ToUserId = req.ToUserId,
            FromShiftId = req.FromShiftId,
            ToShiftId = req.ToShiftId,
            Message = req.Message,
            Status = "pending"
        };

        _db.ShiftSwapRequests.Add(swap);
        await _db.SaveChangesAsync();
        return (swap, null);
    }

    public async Task<(ShiftSwapRequest? Swap, string? Error)> RespondToSwapAsync(
        int swapId, int userId, bool accept)
    {
        var swap = await _db.ShiftSwapRequests
            .FirstOrDefaultAsync(s => s.Id == swapId);
        if (swap == null) return (null, "Swap request not found");
        if (swap.ToUserId != userId) return (null, "Not authorized");
        if (swap.Status != "pending") return (null, "Swap already resolved");

        swap.Status = accept ? "accepted" : "declined";
        swap.UpdatedAt = DateTime.UtcNow;

        if (accept && !swap.RequiresAdminApproval)
            await ExecuteSwapInternalAsync(swap);

        await _db.SaveChangesAsync();
        return (swap, null);
    }

    public async Task<string?> CancelSwapAsync(int swapId, int userId)
    {
        var swap = await _db.ShiftSwapRequests
            .FirstOrDefaultAsync(s => s.Id == swapId);
        if (swap == null) return "Swap request not found";
        if (swap.FromUserId != userId) return "Not authorized";

        swap.Status = "cancelled";
        swap.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return null;
    }

    private async Task ExecuteSwapInternalAsync(ShiftSwapRequest swap)
    {
        var fromCheckin = await _db.VolunteerCheckIns
            .FirstOrDefaultAsync(c => c.ShiftId == swap.FromShiftId && c.UserId == swap.FromUserId);
        if (fromCheckin != null && swap.ToShiftId.HasValue)
            fromCheckin.ShiftId = swap.ToShiftId.Value;

        if (swap.ToUserId.HasValue && swap.ToShiftId.HasValue)
        {
            var toCheckin = await _db.VolunteerCheckIns
                .FirstOrDefaultAsync(c => c.ShiftId == swap.ToShiftId && c.UserId == swap.ToUserId);
            if (toCheckin != null)
                toCheckin.ShiftId = swap.FromShiftId;
        }
    }

    // ── Waitlist ──────────────────────────────────────────────────────────────

    public async Task<List<ShiftWaitlistEntry>> GetUserWaitlistsAsync(int userId)
    {
        return await _db.ShiftWaitlistEntries
            .Include(w => w.Shift)
            .Where(w => w.UserId == userId && w.Status == "waiting")
            .OrderBy(w => w.Position)
            .ToListAsync();
    }

    public async Task<(ShiftWaitlistEntry? Entry, string? Error)> JoinWaitlistAsync(
        int shiftId, int userId)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(
            System.Data.IsolationLevel.Serializable);
        try
        {
            var alreadyOn = await _db.ShiftWaitlistEntries
                .AnyAsync(w => w.ShiftId == shiftId && w.UserId == userId);
            if (alreadyOn)
            {
                await transaction.RollbackAsync();
                return (null, "Already on waitlist");
            }

            var position = await _db.ShiftWaitlistEntries
                .CountAsync(w => w.ShiftId == shiftId && w.Status == "waiting") + 1;

            var entry = new ShiftWaitlistEntry
            {
                TenantId = _tenant.GetTenantIdOrThrow(),
                ShiftId = shiftId,
                UserId = userId,
                Position = position,
                Status = "waiting"
            };

            _db.ShiftWaitlistEntries.Add(entry);
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return (entry, null);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<string?> LeaveWaitlistAsync(int shiftId, int userId)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(
            System.Data.IsolationLevel.Serializable);
        try
        {
            var entry = await _db.ShiftWaitlistEntries
                .FirstOrDefaultAsync(w => w.ShiftId == shiftId && w.UserId == userId);
            if (entry == null)
            {
                await transaction.RollbackAsync();
                return "Not on waitlist";
            }

            var removedPos = entry.Position;
            _db.ShiftWaitlistEntries.Remove(entry);

            var remaining = await _db.ShiftWaitlistEntries
                .Where(w => w.ShiftId == shiftId && w.Status == "waiting" && w.Position > removedPos)
                .ToListAsync();
            foreach (var e in remaining) e.Position--;

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return null;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<(ShiftWaitlistEntry? Entry, string? Error)> PromoteFromWaitlistAsync(
        int shiftId)
    {
        var next = await _db.ShiftWaitlistEntries
            .FirstOrDefaultAsync(w => w.ShiftId == shiftId && w.Status == "waiting" && w.Position == 1);
        if (next == null) return (null, "Waitlist is empty");

        next.Status = "promoted";
        next.PromotedAt = DateTime.UtcNow;

        var remaining = await _db.ShiftWaitlistEntries
            .Where(w => w.ShiftId == shiftId && w.Status == "waiting" && w.Position > 1)
            .ToListAsync();
        foreach (var e in remaining) e.Position--;

        await _db.SaveChangesAsync();
        return (next, null);
    }

    // ── Group Reservations ────────────────────────────────────────────────────

    public async Task<List<ShiftGroupReservation>> GetUserGroupReservationsAsync(int userId)
    {
        return await _db.ShiftGroupReservations
            .Include(r => r.Shift)
            .Include(r => r.Group)
            .Include(r => r.Members)
            .Where(r => r.ReservedBy == userId && r.Status == "active")
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<(ShiftGroupReservation? Reservation, string? Error)> CreateGroupReservationAsync(
        int shiftId, int userId, GroupReservationRequest req)
    {
        var shiftExists = await _db.VolunteerShifts.AnyAsync(s => s.Id == shiftId);
        if (!shiftExists) return (null, "Shift not found");

        var reservation = new ShiftGroupReservation
        {
            TenantId = _tenant.GetTenantIdOrThrow(),
            ShiftId = shiftId,
            GroupId = req.GroupId,
            ReservedBy = userId,
            ReservedSlots = req.ReservedSlots,
            Notes = req.Notes,
            Status = "active"
        };

        _db.ShiftGroupReservations.Add(reservation);
        await _db.SaveChangesAsync();
        return (reservation, null);
    }

    public async Task<(ShiftGroupMember? Member, string? Error)> AddGroupMemberAsync(
        int reservationId, int userId, AddGroupMemberRequest req)
    {
        var reservation = await _db.ShiftGroupReservations
            .Include(r => r.Members)
            .FirstOrDefaultAsync(r => r.Id == reservationId);
        if (reservation == null) return (null, "Reservation not found");
        if (reservation.ReservedBy != userId) return (null, "Not authorized");
        if (reservation.FilledSlots >= reservation.ReservedSlots)
            return (null, "No slots remaining");

        var member = new ShiftGroupMember
        {
            TenantId = _tenant.GetTenantIdOrThrow(),
            ReservationId = reservationId,
            UserId = req.UserId,
            Status = "confirmed"
        };

        reservation.FilledSlots++;
        _db.ShiftGroupMembers.Add(member);
        await _db.SaveChangesAsync();
        return (member, null);
    }

    public async Task<string?> RemoveGroupMemberAsync(int reservationId, int memberId, int userId)
    {
        var reservation = await _db.ShiftGroupReservations
            .FirstOrDefaultAsync(r => r.Id == reservationId);
        if (reservation == null) return "Reservation not found";
        if (reservation.ReservedBy != userId) return "Not authorized";

        var member = await _db.ShiftGroupMembers
            .FirstOrDefaultAsync(m => m.Id == memberId && m.ReservationId == reservationId);
        if (member == null) return "Member not found";

        reservation.FilledSlots = Math.Max(0, reservation.FilledSlots - 1);
        _db.ShiftGroupMembers.Remove(member);
        await _db.SaveChangesAsync();
        return null;
    }

    public async Task<string?> CancelGroupReservationAsync(int reservationId, int userId)
    {
        var reservation = await _db.ShiftGroupReservations
            .FirstOrDefaultAsync(r => r.Id == reservationId);
        if (reservation == null) return "Reservation not found";
        if (reservation.ReservedBy != userId) return "Not authorized";

        reservation.Status = "cancelled";
        await _db.SaveChangesAsync();
        return null;
    }
}

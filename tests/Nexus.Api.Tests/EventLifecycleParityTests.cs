// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Tests.Fixtures;
using Npgsql;
using Xunit;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public sealed class EventLifecycleParityTests : IntegrationTestBase
{
    public EventLifecycleParityTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task Approve_IsVersionedNotifiedAndIdempotent()
    {
        var eventId = await CreateEventAsync("pending_review", "scheduled", "draft");
        await AuthenticateAsAdminAsync();
        var first = await Client.PostAsJsonAsync($"/api/v2/admin/events/{eventId}/approve", new { });
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        var firstJson = await first.Content.ReadFromJsonAsync<JsonElement>();
        firstJson.GetProperty("data").GetProperty("publication_state").GetString().Should().Be("published");
        firstJson.GetProperty("data").GetProperty("status").GetString().Should().Be("active");
        firstJson.GetProperty("data").GetProperty("transition").GetProperty("changed").GetBoolean().Should().BeTrue();

        var replay = await Client.PostAsJsonAsync($"/api/v2/admin/events/{eventId}/approve", new { });
        var replayJson = await replay.Content.ReadFromJsonAsync<JsonElement>();
        replayJson.GetProperty("data").GetProperty("transition").GetProperty("changed").GetBoolean().Should().BeFalse();
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        (await db.EventStatusHistories.IgnoreQueryFilters().CountAsync(x => x.EventId == eventId)).Should().Be(1);
        (await db.EventDomainOutbox.IgnoreQueryFilters().CountAsync(x => x.EventId == eventId)).Should().Be(1);
        (await db.Notifications.IgnoreQueryFilters().CountAsync(x => x.UserId == TestData.MemberUser.Id && x.Type == "event_approved")).Should().Be(1);
    }

    [Fact]
    public async Task Reject_RequiresReasonAndEnforcesSourceGuard()
    {
        var eventId = await CreateEventAsync("pending_review", "scheduled", "draft");
        await AuthenticateAsAdminAsync();
        var missing = await Client.PostAsJsonAsync($"/api/v2/admin/events/{eventId}/reject", new { });
        missing.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var rejected = await Client.PostAsJsonAsync($"/api/v2/admin/events/{eventId}/reject", new { reason = "Insufficient safety details" });
        rejected.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await rejected.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("data").GetProperty("publication_state").GetString().Should().Be("draft");
        json.GetProperty("data").GetProperty("moderation").GetProperty("reason").GetString().Should().Be("Insufficient safety details");

        var publishedId = await CreateEventAsync("published", "scheduled", "active");
        (await Client.PostAsJsonAsync($"/api/v2/admin/events/{publishedId}/reject", new { reason = "Late rejection" })).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Archive_CascadesAtomicallyAndRestoreReturnsDraftScheduled()
    {
        var eventId = await CreateEventAsync("published", "scheduled", "active", withParticipantState: true);
        await AuthenticateAsAdminAsync();
        (await Client.PostAsJsonAsync($"/api/v2/admin/events/{eventId}/archive", new { })).StatusCode.Should().Be(HttpStatusCode.Conflict);
        var concurrent = await Task.WhenAll(
            Client.PostAsJsonAsync($"/api/v2/admin/events/{eventId}/archive", new { reason = "Venue unavailable" }),
            Client.PostAsJsonAsync($"/api/v2/admin/events/{eventId}/archive", new { reason = "Venue unavailable" }));
        concurrent.Should().OnlyContain(x => x.StatusCode == HttpStatusCode.OK);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var evt = await db.Events.IgnoreQueryFilters().SingleAsync(x => x.Id == eventId);
            evt.PublicationStatus.Should().Be("archived"); evt.OperationalStatus.Should().Be("cancelled"); evt.Status.Should().Be("cancelled");
            (await db.EventRsvps.IgnoreQueryFilters().SingleAsync(x => x.EventId == eventId)).Status.Should().Be("cancelled");
            var reminder = await db.EventReminders.IgnoreQueryFilters().SingleAsync(x => x.EventId == eventId);
            reminder.Status.Should().Be("cancelled"); reminder.ClosedReason.Should().Be("event_unavailable");
            (await db.EventStatusHistories.IgnoreQueryFilters().CountAsync(x => x.EventId == eventId)).Should().Be(1);
        }

        var restored = await Client.PostAsJsonAsync($"/api/v2/admin/events/{eventId}/restore", new { reason = "New venue confirmed" });
        restored.StatusCode.Should().Be(HttpStatusCode.OK);
        var restoredJson = await restored.Content.ReadFromJsonAsync<JsonElement>();
        restoredJson.GetProperty("data").GetProperty("publication_state").GetString().Should().Be("draft");
        restoredJson.GetProperty("data").GetProperty("operational_state").GetString().Should().Be("scheduled");
        restoredJson.GetProperty("data").GetProperty("lifecycle_version").GetInt64().Should().Be(2);
    }

    [Fact]
    public async Task RoutesAreAdminTenantScopedAndHistoryIsDatabaseImmutable()
    {
        var eventId = await CreateEventAsync("published", "scheduled", "active");
        await AuthenticateAsMemberAsync();
        (await Client.PostAsJsonAsync($"/api/v2/admin/events/{eventId}/postpone", new { reason = "Weather" })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        await AuthenticateAsOtherTenantUserAsync();
        (await Client.PostAsJsonAsync($"/api/v2/admin/events/{eventId}/postpone", new { reason = "Weather" })).StatusCode.Should().Be(HttpStatusCode.NotFound);
        await AuthenticateAsAdminAsync();
        (await Client.PostAsJsonAsync($"/api/v2/admin/events/{eventId}/postpone", new { reason = "Weather" })).StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var history = await db.EventStatusHistories.IgnoreQueryFilters().SingleAsync(x => x.EventId == eventId);
        var mutate = async () => await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE event_status_history SET \"Reason\" = {'x'} WHERE \"Id\" = {history.Id}");
        await mutate.Should().ThrowAsync<PostgresException>().Where(x => x.SqlState == "P0001");
    }

    private async Task<int> CreateEventAsync(string publication, string operational, string legacy, bool withParticipantState = false)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var evt = new Event { TenantId = TestData.Tenant1.Id, CreatedById = TestData.MemberUser.Id, Title = $"Lifecycle {Guid.NewGuid():N}", StartsAt = DateTime.UtcNow.AddDays(7), PublicationStatus = publication, OperationalStatus = operational, Status = legacy, IsCancelled = legacy == "cancelled" };
        db.Events.Add(evt); await db.SaveChangesAsync();
        if (withParticipantState)
        {
            db.EventRsvps.Add(new EventRsvp { TenantId = TestData.Tenant1.Id, EventId = evt.Id, UserId = TestData.MemberUser.Id, Status = "going" });
            db.EventReminders.Add(new EventReminder { TenantId = TestData.Tenant1.Id, EventId = evt.Id, UserId = TestData.MemberUser.Id, Status = "pending" });
            await db.SaveChangesAsync();
        }
        return evt.Id;
    }
}

// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class GroupExchangeControllerTests : IntegrationTestBase
{
    public GroupExchangeControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public void ModelMatchesLaravelEnumDomainsAndWeightPrecision()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var designModel = db.GetService<IDesignTimeModel>().Model;
        var exchange = designModel.FindEntityType(typeof(GroupExchange))
            ?? throw new InvalidOperationException("GroupExchange is not mapped");
        var participant = designModel.FindEntityType(typeof(GroupExchangeParticipant))
            ?? throw new InvalidOperationException("GroupExchangeParticipant is not mapped");

        exchange.GetCheckConstraints()
            .Single(item => item.Name == "CK_group_exchanges_Status")
            .Sql.Should().Be(
                "\"Status\" IN ('draft', 'pending_participants', 'pending_broker', 'active', 'pending_confirmation', 'completed', 'cancelled', 'disputed')");
        exchange.GetCheckConstraints()
            .Single(item => item.Name == "CK_group_exchanges_SplitType")
            .Sql.Should().Be("\"SplitType\" IN ('equal', 'custom', 'weighted')");
        participant.GetCheckConstraints()
            .Single(item => item.Name == "CK_group_exchange_participants_Role")
            .Sql.Should().Be("\"Role\" IN ('provider', 'receiver')");

        var weight = participant.FindProperty(nameof(GroupExchangeParticipant.Weight));
        weight.Should().NotBeNull();
        weight!.GetPrecision().Should().Be(5);
        weight.GetScale().Should().Be(2);
    }

    [Fact]
    public async Task CanonicalRoutes_RequireAuthentication_AndReturnLaravelEnvelopes()
    {
        ClearAuthToken();
        (await Client.GetAsync("/api/v2/group-exchanges")).StatusCode
            .Should().Be(HttpStatusCode.Unauthorized);

        await AuthenticateAsAdminAsync();
        var phpEmptyTitle = await Client.PostAsJsonAsync("/api/v2/group-exchanges", new
        {
            title = "0",
            total_hours = 1m
        });
        phpEmptyTitle.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await JsonAsync(phpEmptyTitle)).GetProperty("errors")[0].GetProperty("field").GetString()
            .Should().Be("title");

        var created = await Client.PostAsJsonAsync("/api/v2/group-exchanges", new
        {
            title = "Neighbourhood rota",
            description = "A shared Saturday rota",
            split_type = "equal",
            total_hours = 6m,
            participants = new object[]
            {
                new { user_id = TestData.AdminUser.Id, role = "provider", hours = 0m, weight = 1m },
                new { user_id = TestData.MemberUser.Id, role = "receiver", hours = 0m, weight = 1m }
            }
        });

        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await JsonAsync(created);
        createJson.GetProperty("meta").GetProperty("base_url").GetString().Should().NotBeNullOrWhiteSpace();
        var createdData = createJson.GetProperty("data");
        createdData.GetProperty("organizer_id").GetInt32().Should().Be(TestData.AdminUser.Id);
        createdData.GetProperty("participant_count").GetInt32().Should().Be(2);
        createdData.TryGetProperty("calculated_split", out _).Should().BeFalse();
        var exchangeId = createdData.GetProperty("id").GetInt32();

        var v2Show = await Client.GetAsync($"/api/v2/group-exchanges/{exchangeId}");
        var v1Show = await Client.GetAsync($"/api/group-exchanges/{exchangeId}");
        v2Show.StatusCode.Should().Be(HttpStatusCode.OK);
        v1Show.StatusCode.Should().Be(HttpStatusCode.OK);

        var showData = (await JsonAsync(v2Show)).GetProperty("data");
        showData.GetProperty("calculated_split").EnumerateArray()
            .Select(item => item.GetProperty("hours").GetDecimal())
            .Should().Equal(6m, 6m);

        var listJson = await JsonAsync(await Client.GetAsync("/api/v2/group-exchanges?limit=1&offset=0"));
        listJson.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        listJson.GetProperty("data").GetArrayLength().Should().Be(1);
        listJson.GetProperty("meta").GetProperty("has_more").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task RoundedSubCentHours_AreRejectedBeforeExchangeOrCustomParticipantPersistence()
    {
        await AuthenticateAsAdminAsync();
        var roundedZeroTitle = $"Rounded zero {Guid.NewGuid():N}";
        var create = await Client.PostAsJsonAsync("/api/v2/group-exchanges", new
        {
            title = roundedZeroTitle,
            split_type = "custom",
            total_hours = 0.001m
        });

        create.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            (await db.GroupExchanges.AsNoTracking().AnyAsync(item => item.Title == roundedZeroTitle))
                .Should().BeFalse();
        }

        var exchangeId = await CreateExchangeAsync(
            $"Custom rounded participant {Guid.NewGuid():N}",
            1m,
            "custom",
            Array.Empty<object>());
        var add = await Client.PostAsJsonAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants",
            new
            {
                user_id = TestData.MemberUser.Id,
                role = "provider",
                hours = 0.001m,
                weight = 1m
            });

        add.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var finalScope = Factory.Services.CreateScope();
        var finalDb = finalScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        (await finalDb.GroupExchangeParticipants.AsNoTracking()
            .AnyAsync(item => item.GroupExchangeId == exchangeId
                && item.UserId == TestData.MemberUser.Id))
            .Should().BeFalse();
    }

    [Fact]
    public async Task AuthorizationAndTenantIsolation_AreOrganizerOrParticipantOnly()
    {
        await AuthenticateAsAdminAsync();
        var exchangeId = await CreateExchangeAsync(
            "Private exchange",
            3m,
            "equal",
            new[]
            {
                Participant(TestData.MemberUser.Id, "receiver"),
                Participant(TestData.AdminUser.Id, "provider")
            });

        await AuthenticateAsMemberAsync();
        (await Client.GetAsync($"/api/v2/group-exchanges/{exchangeId}"))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        var forbiddenUpdate = await Client.PutAsJsonAsync($"/api/v2/group-exchanges/{exchangeId}", new
        {
            title = "Participant cannot rename"
        });
        forbiddenUpdate.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await JsonAsync(forbiddenUpdate)).GetProperty("errors")[0].GetProperty("code").GetString()
            .Should().Be("FORBIDDEN");

        await AuthenticateAsOtherTenantUserAsync();
        (await Client.GetAsync($"/api/v2/group-exchanges/{exchangeId}"))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
        var otherList = await JsonAsync(await Client.GetAsync("/api/v2/group-exchanges"));
        otherList.GetProperty("data").GetArrayLength().Should().Be(0);

        await AuthenticateAsAdminAsync();
        var crossTenantAdd = await Client.PostAsJsonAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants",
            new { user_id = TestData.OtherTenantUser.Id, role = "provider", hours = 1m, weight = 1m });
        crossTenantAdd.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task FullLifecycle_ConservesLedger_IsParallelIdempotent_AndEmitsNotifications()
    {
        await SetEmailTransactionsPreferenceAsync(TestData.MemberUser.Id, enabled: false);
        await AuthenticateAsAdminAsync();
        var exchangeId = await CreateExchangeAsync(
            "Community repair day",
            6m,
            "equal",
            new[]
            {
                Participant(TestData.AdminUser.Id, "provider"),
                Participant(TestData.MemberUser.Id, "receiver")
            });

        var start = await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/start", null);
        start.StatusCode.Should().Be(HttpStatusCode.OK);
        (await JsonAsync(start)).GetProperty("data").GetProperty("status").GetString()
            .Should().Be("pending_confirmation");

        (await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/confirm", null))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        await AuthenticateAsMemberAsync();
        (await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/confirm", null))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        (await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/confirm", null))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        await AuthenticateAsAdminAsync();
        var firstCompletion = Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/complete", null);
        var concurrentCompletion = Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/complete", null);
        var completionResponses = await Task.WhenAll(firstCompletion, concurrentCompletion);

        completionResponses.Count(response => response.StatusCode == HttpStatusCode.OK).Should().Be(1);
        completionResponses.Count(response => response.StatusCode == HttpStatusCode.BadRequest).Should().Be(1);
        var success = completionResponses.Single(response => response.StatusCode == HttpStatusCode.OK);
        (await JsonAsync(success)).GetProperty("data").GetProperty("transaction_ids").GetArrayLength()
            .Should().Be(1);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var settlementRows = await db.Transactions.AsNoTracking()
            .Where(item => item.TenantId == TestData.Tenant1.Id &&
                           item.Description == "Group exchange: Community repair day")
            .ToListAsync();
        settlementRows.Should().ContainSingle();
        settlementRows[0].SenderId.Should().Be(TestData.MemberUser.Id);
        settlementRows[0].ReceiverId.Should().Be(TestData.AdminUser.Id);
        settlementRows[0].Amount.Should().Be(6m);

        var adminBalance = await BalanceAsync(db, TestData.AdminUser.Id);
        var memberBalance = await BalanceAsync(db, TestData.MemberUser.Id);
        adminBalance.Should().Be(-4m);
        memberBalance.Should().Be(4m);
        (adminBalance + memberBalance).Should().Be(0m);

        var notifications = await db.Notifications.AsNoTracking()
            .Where(item => item.UserId == TestData.AdminUser.Id || item.UserId == TestData.MemberUser.Id)
            .ToListAsync();
        notifications.Should().Contain(item => item.Type == "group_exchange" && item.Data!.Contains($"/group-exchanges/{exchangeId}"));
        notifications.Should().Contain(item => item.Type == "transaction" && item.Data!.Contains("/wallet"));

        var memberCompletionEmails = await db.Set<EmailLog>().AsNoTracking()
            .CountAsync(item => item.UserId == TestData.MemberUser.Id && item.TemplateKey == "group_exchange_completed");
        memberCompletionEmails.Should().Be(0);
    }

    [Fact]
    public async Task CompletionRejectsUnconfirmedAndInsufficientBalance_WithoutChangingStatusOrLedger()
    {
        await AuthenticateAsAdminAsync();
        var exchangeId = await CreateExchangeAsync(
            "Rollback proof",
            11m,
            "equal",
            new[]
            {
                Participant(TestData.AdminUser.Id, "provider"),
                Participant(TestData.MemberUser.Id, "receiver")
            });
        (await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/start", null))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        (await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/confirm", null))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        var unconfirmed = await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/complete", null);
        unconfirmed.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await JsonAsync(unconfirmed)).GetProperty("errors")[0].GetProperty("message").GetString()
            .Should().Be("1 participant(s) still need to confirm");

        await AuthenticateAsMemberAsync();
        (await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/confirm", null))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        await AuthenticateAsAdminAsync();

        var insufficient = await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/complete", null);
        insufficient.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await JsonAsync(insufficient)).GetProperty("errors")[0].GetProperty("message").GetString()
            .Should().Be("Insufficient balance for transfer");

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var persisted = await db.GroupExchanges.AsNoTracking().SingleAsync(item => item.Id == exchangeId);
        persisted.Status.Should().Be("pending_confirmation");
        persisted.CompletedAt.Should().BeNull();
        (await db.Transactions.CountAsync(item => item.Description == "Group exchange: Rollback proof"))
            .Should().Be(0);
        (await BalanceAsync(db, TestData.MemberUser.Id)).Should().Be(10m);
    }

    [Fact]
    public async Task ListFiltersStatusAndImplementsLimitOffsetHasMore()
    {
        await AuthenticateAsAdminAsync();
        var firstDraft = await CreateExchangeAsync(
            "First draft",
            1m,
            "equal",
            Array.Empty<object>());
        var secondDraft = await CreateExchangeAsync(
            "Second draft",
            1m,
            "equal",
            Array.Empty<object>());
        var pendingId = await CreateExchangeAsync(
            "Waiting for participants",
            1m,
            "equal",
            Array.Empty<object>(),
            status: "pending_participants");

        // Store always starts in draft. Seed a historical pending row directly so
        // the list filter itself remains covered without weakening lifecycle ownership.
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            await db.GroupExchanges
                .Where(item => item.Id == pendingId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Status, "pending_participants"));
        }

        var firstPage = await JsonAsync(await Client.GetAsync(
            "/api/v2/group-exchanges?status=draft&limit=1&offset=0"));
        firstPage.GetProperty("data").GetArrayLength().Should().Be(1);
        firstPage.GetProperty("data")[0].GetProperty("id").GetInt32().Should().Be(secondDraft);
        firstPage.GetProperty("data")[0].GetProperty("status").GetString().Should().Be("draft");
        firstPage.GetProperty("meta").GetProperty("has_more").GetBoolean().Should().BeTrue();

        var secondPage = await JsonAsync(await Client.GetAsync(
            "/api/v2/group-exchanges?status=draft&limit=1&offset=1"));
        secondPage.GetProperty("data").GetArrayLength().Should().Be(1);
        secondPage.GetProperty("data")[0].GetProperty("id").GetInt32().Should().Be(firstDraft);
        secondPage.GetProperty("meta").GetProperty("has_more").GetBoolean().Should().BeFalse();

        var pendingOnly = await JsonAsync(await Client.GetAsync(
            "/api/v2/group-exchanges?status=pending_participants&limit=100&offset=0"));
        pendingOnly.GetProperty("data").GetArrayLength().Should().Be(1);
        pendingOnly.GetProperty("data")[0].GetProperty("title").GetString()
            .Should().Be("Waiting for participants");

        // PHP empty("0") is true, so status=0 means no filter in Laravel.
        var zeroStatus = await JsonAsync(await Client.GetAsync(
            "/api/v2/group-exchanges?status=0&limit=100&offset=0"));
        zeroStatus.GetProperty("data").GetArrayLength().Should().Be(3);
    }

    [Fact]
    public async Task SplitModes_AreRoundedPerRole_AndCustomImbalanceCannotStart()
    {
        var (providerTwo, receiverTwo) = await AddSameTenantUsersAsync();
        await AuthenticateAsAdminAsync();

        var weightedId = await CreateExchangeAsync(
            "Weighted rota",
            10m,
            "weighted",
            new[]
            {
                Participant(TestData.AdminUser.Id, "provider", weight: 1m),
                Participant(providerTwo, "provider", weight: 2m),
                Participant(TestData.MemberUser.Id, "receiver", weight: 1m),
                Participant(receiverTwo, "receiver", weight: 3m)
            });

        var weighted = (await JsonAsync(await Client.GetAsync($"/api/v2/group-exchanges/{weightedId}")))
            .GetProperty("data").GetProperty("calculated_split").EnumerateArray()
            .Select(item => new
            {
                Role = item.GetProperty("role").GetString(),
                Hours = item.GetProperty("hours").GetDecimal()
            }).ToList();
        weighted.Where(item => item.Role == "provider").Select(item => item.Hours)
            .Should().Equal(3.33m, 6.67m);
        weighted.Where(item => item.Role == "receiver").Select(item => item.Hours)
            .Should().Equal(2.5m, 7.5m);
        weighted.Where(item => item.Role == "provider").Sum(item => item.Hours).Should().Be(10m);
        weighted.Where(item => item.Role == "receiver").Sum(item => item.Hours).Should().Be(10m);

        var customId = await CreateExchangeAsync(
            "Unbalanced custom rota",
            5m,
            "custom",
            new[]
            {
                Participant(TestData.AdminUser.Id, "provider", hours: 5m),
                Participant(TestData.MemberUser.Id, "receiver", hours: 4m)
            });
        var rejected = await Client.PostAsync($"/api/v2/group-exchanges/{customId}/start", null);
        rejected.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await JsonAsync(rejected)).GetProperty("errors")[0].GetProperty("message").GetString()
            .Should().Contain("cannot create or destroy time credits");

        var zeroId = await CreateExchangeAsync(
            "Legacy zero custom rota",
            5m,
            "custom",
            Array.Empty<object>());
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            db.GroupExchangeParticipants.AddRange(
                new GroupExchangeParticipant
                {
                    GroupExchangeId = zeroId,
                    UserId = TestData.AdminUser.Id,
                    Role = "provider",
                    Hours = 2m,
                    Weight = 1m,
                    IsConfirmed = true,
                    ConfirmedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                },
                new GroupExchangeParticipant
                {
                    GroupExchangeId = zeroId,
                    UserId = TestData.MemberUser.Id,
                    Role = "receiver",
                    Hours = 2m,
                    Weight = 1m,
                    IsConfirmed = true,
                    ConfirmedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                },
                new GroupExchangeParticipant
                {
                    GroupExchangeId = zeroId,
                    UserId = providerTwo,
                    Role = "provider",
                    Hours = 0m,
                    Weight = 1m,
                    IsConfirmed = true,
                    ConfirmedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                },
                new GroupExchangeParticipant
                {
                    GroupExchangeId = zeroId,
                    UserId = receiverTwo,
                    Role = "receiver",
                    Hours = -1m,
                    Weight = 1m,
                    IsConfirmed = true,
                    ConfirmedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                });
            await db.GroupExchanges
                .Where(item => item.Id == zeroId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Status, "pending_confirmation"));
            await db.SaveChangesAsync();
        }

        (await Client.PostAsync($"/api/v2/group-exchanges/{zeroId}/complete", null))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            (await db.GroupExchanges.AsNoTracking().SingleAsync(item => item.Id == zeroId))
                .Status.Should().Be("pending_confirmation");
            (await db.Transactions.AsNoTracking()
                .CountAsync(item => item.Description == "Group exchange: Legacy zero custom rota"))
                .Should().Be(0);
        }


        var roundedZeroId = await CreateExchangeAsync(
            "Rounded zero equal rota",
            0.01m,
            "equal",
            new[]
            {
                Participant(TestData.AdminUser.Id, "provider"),
                Participant(providerTwo, "provider"),
                Participant(TestData.MemberUser.Id, "receiver"),
                Participant(receiverTwo, "receiver")
            });
        var roundedZeroStart = await Client.PostAsync(
            $"/api/v2/group-exchanges/{roundedZeroId}/start",
            null);
        roundedZeroStart.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await JsonAsync(roundedZeroStart)).GetProperty("errors")[0].GetProperty("message").GetString()
            .Should().Contain("more than zero hours");

        var invalidTransitionId = await CreateExchangeAsync(
            "Invalid custom transition",
            2m,
            "equal",
            new[]
            {
                Participant(TestData.AdminUser.Id, "provider"),
                Participant(TestData.MemberUser.Id, "receiver")
            });
        (await Client.PutAsJsonAsync(
            $"/api/v2/group-exchanges/{invalidTransitionId}",
            new { split_type = "custom" }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task OrganizerCanMutateParticipantsAndFields_ButStatusInputIsIgnored()
    {
        await AuthenticateAsAdminAsync();
        var exchangeId = await CreateExchangeAsync(
            "Editable exchange",
            2m,
            "equal",
            Array.Empty<object>());

        var addProvider = await Client.PostAsJsonAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants",
            new { user_id = TestData.MemberUser.Id, role = "provider", hours = 1m, weight = 1m });
        addProvider.StatusCode.Should().Be(HttpStatusCode.OK);

        // A user cannot occupy both sides of a settlement.
        var addReceiver = await Client.PostAsJsonAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants",
            new { user_id = TestData.MemberUser.Id, role = "receiver", hours = 1m, weight = 1m });
        addReceiver.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var duplicateRole = await Client.PostAsJsonAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants",
            new { user_id = TestData.MemberUser.Id, role = "provider", hours = 1m, weight = 1m });
        duplicateRole.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var zeroRole = await Client.PostAsJsonAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants",
            new { user_id = TestData.AdminUser.Id, role = "0", hours = 1m, weight = 1m });
        zeroRole.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var updated = await Client.PutAsJsonAsync($"/api/v2/group-exchanges/{exchangeId}", new
        {
            title = "Renamed exchange",
            status = "completed",
            total_hours = 4m
        });
        updated.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedData = (await JsonAsync(updated)).GetProperty("data");
        updatedData.GetProperty("title").GetString().Should().Be("Renamed exchange");
        updatedData.GetProperty("status").GetString().Should().Be("draft");

        var removed = await Client.DeleteAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants/{TestData.MemberUser.Id}");
        removed.StatusCode.Should().Be(HttpStatusCode.OK);
        (await JsonAsync(removed)).GetProperty("data").GetProperty("participant_count").GetInt32()
            .Should().Be(0);

        var cancelled = await Client.DeleteAsync($"/api/v2/group-exchanges/{exchangeId}");
        cancelled.StatusCode.Should().Be(HttpStatusCode.OK);
        (await JsonAsync(cancelled)).GetProperty("data").GetProperty("message").GetString()
            .Should().Be("Exchange cancelled");
    }

    [Fact]
    public async Task StoreForcesDraftState_PreservesSplit_AndIgnoresInlineParticipantFailure()
    {
        await AuthenticateAsAdminAsync();
        var response = await Client.PostAsJsonAsync("/api/v2/group-exchanges", new
        {
            title = "Forward-compatible exchange",
            status = "pending_broker",
            split_type = "weighted",
            total_hours = 2m,
            participants = new[]
            {
                new { user_id = TestData.OtherTenantUser.Id, role = "provider", hours = 2m, weight = 1m },
                new { user_id = TestData.MemberUser.Id, role = "receiver", hours = 2m, weight = 1m },
                new { user_id = TestData.MemberUser.Id, role = "receiver", hours = 2m, weight = 1m },
                new { user_id = TestData.AdminUser.Id, role = "provider", hours = 2m, weight = 1m }
            }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var data = (await JsonAsync(response)).GetProperty("data");
        data.GetProperty("status").GetString().Should().Be("draft");
        data.GetProperty("split_type").GetString().Should().Be("weighted");
        data.GetProperty("participant_count").GetInt32().Should().Be(2);
        data.GetProperty("participants").EnumerateArray()
            .Select(item => (item.GetProperty("user_id").GetInt32(), item.GetProperty("role").GetString()))
            .Should().BeEquivalentTo(new[]
            {
                (TestData.MemberUser.Id, "receiver"),
                (TestData.AdminUser.Id, "provider")
            });
    }

    [Fact]
    public async Task BrokerApprovalRestriction_UsesActiveWindow_AndInlineFailureDoesNotRollbackStore()
    {
        int restrictionId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var restriction = new UserMonitoringRestriction
            {
                TenantId = TestData.Tenant1.Id,
                UserId = TestData.MemberUser.Id,
                UnderMonitoring = true,
                RequiresBrokerApproval = false,
                MonitoringExpiresAt = DateTime.UtcNow.AddDays(7),
                Reason = "False broker flag must not block"
            };
            db.UserMonitoringRestrictions.Add(restriction);
            await db.SaveChangesAsync();
            restrictionId = restriction.Id;
        }

        await AuthenticateAsAdminAsync();
        var falseFlagId = await CreateExchangeAsync(
            "False broker flag",
            1m,
            "equal",
            new[] { Participant(TestData.MemberUser.Id, "receiver") });
        var falseFlagDetail = await JsonAsync(await Client.GetAsync($"/api/v2/group-exchanges/{falseFlagId}"));
        falseFlagDetail.GetProperty("data").GetProperty("participant_count").GetInt32().Should().Be(1);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var restriction = await db.UserMonitoringRestrictions.SingleAsync(item => item.Id == restrictionId);
            restriction.RequiresBrokerApproval = true;
            restriction.MonitoringExpiresAt = DateTime.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        }

        var expiredId = await CreateExchangeAsync(
            "Expired broker gate",
            1m,
            "equal",
            new[] { Participant(TestData.MemberUser.Id, "receiver") });
        var expiredDetail = await JsonAsync(await Client.GetAsync($"/api/v2/group-exchanges/{expiredId}"));
        expiredDetail.GetProperty("data").GetProperty("participant_count").GetInt32().Should().Be(1);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var restriction = await db.UserMonitoringRestrictions.SingleAsync(item => item.Id == restrictionId);
            restriction.MonitoringExpiresAt = DateTime.UtcNow.AddDays(7);
            await db.SaveChangesAsync();
        }

        var blocked = await Client.PostAsJsonAsync("/api/v2/group-exchanges", new
        {
            title = "Blocked inline participant",
            split_type = "equal",
            total_hours = 1m,
            participants = new[]
            {
                new { user_id = TestData.MemberUser.Id, role = "receiver", hours = 1m, weight = 1m }
            }
        });
        blocked.StatusCode.Should().Be(HttpStatusCode.Created);
        var blockedData = (await JsonAsync(blocked)).GetProperty("data");
        blockedData.GetProperty("participant_count").GetInt32().Should().Be(0);
        var blockedExchangeId = blockedData.GetProperty("id").GetInt32();

        var explicitAdd = await Client.PostAsJsonAsync(
            $"/api/v2/group-exchanges/{blockedExchangeId}/participants",
            new { user_id = TestData.MemberUser.Id, role = "receiver", hours = 1m, weight = 1m });
        explicitAdd.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ParticipantAdd_EnforcesBidirectionalRequiredVetting()
    {
        var (secondParticipantId, _) = await AddSameTenantUsersAsync();
        await AuthenticateAsAdminAsync();
        var exchangeId = await CreateExchangeAsync(
            "Vetting-gated exchange",
            2m,
            "custom",
            Array.Empty<object>());

        await AddSafeguardingPreferenceAsync(
            TestData.MemberUser.Id,
            "participant-garda",
            "{\"requires_vetted_interaction\":true,\"vetting_type_required\":\"garda_vetting\"}");

        var participantRequest = new
        {
            user_id = TestData.MemberUser.Id,
            role = "receiver",
            hours = 2m,
            weight = 1m
        };
        (await Client.PostAsJsonAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants",
            participantRequest)).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        await AddVerifiedVettingAsync(TestData.AdminUser.Id, "garda_vetting");
        (await Client.PostAsJsonAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants",
            participantRequest)).StatusCode.Should().Be(HttpStatusCode.OK);

        await AddSafeguardingPreferenceAsync(
            TestData.AdminUser.Id,
            "organizer-dbs",
            "{\"requires_vetted_interaction\":true,\"vetting_type_required\":\"dbs_enhanced\"}");
        var secondRole = new
        {
            user_id = secondParticipantId,
            role = "provider",
            hours = 2m,
            weight = 1m
        };
        (await Client.PostAsJsonAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants",
            secondRole)).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        await AddVerifiedVettingAsync(secondParticipantId, "dbs_enhanced");
        (await Client.PostAsJsonAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants",
            secondRole)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task StartFreezesRevision_ResetsDraftConfirmations_AndCompletedCannotCancel()
    {
        var (additionalUserId, _) = await AddSameTenantUsersAsync();
        await AuthenticateAsAdminAsync();
        var exchangeId = await CreateExchangeAsync(
            "Immutable consent revision",
            2m,
            "equal",
            new[]
            {
                Participant(TestData.AdminUser.Id, "provider"),
                Participant(TestData.MemberUser.Id, "receiver")
            },
            status: "completed");

        // A confirmation written by a historical/pre-fix client while draft must
        // never survive the transition into the immutable consent state.
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            await db.GroupExchangeParticipants
                .Where(item => item.GroupExchangeId == exchangeId && item.UserId == TestData.AdminUser.Id)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(item => item.IsConfirmed, true)
                    .SetProperty(item => item.ConfirmedAt, DateTime.UtcNow));
        }

        (await Client.PutAsJsonAsync($"/api/v2/group-exchanges/{exchangeId}", new { total_hours = 0m }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/complete", null))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/confirm", null))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/start", null))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        var frozen = (await JsonAsync(await Client.GetAsync($"/api/v2/group-exchanges/{exchangeId}")))
            .GetProperty("data");
        frozen.GetProperty("status").GetString().Should().Be("pending_confirmation");
        frozen.GetProperty("participants").EnumerateArray()
            .Should().OnlyContain(item => !item.GetProperty("confirmed").GetBoolean());

        (await Client.PutAsJsonAsync($"/api/v2/group-exchanges/{exchangeId}", new { total_hours = 9m }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Client.PostAsJsonAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants",
            new { user_id = additionalUserId, role = "provider", hours = 1m, weight = 1m }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Client.DeleteAsync(
            $"/api/v2/group-exchanges/{exchangeId}/participants/{TestData.MemberUser.Id}"))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/confirm", null))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        await AuthenticateAsMemberAsync();
        (await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/confirm", null))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        await AuthenticateAsAdminAsync();
        (await Client.PostAsync($"/api/v2/group-exchanges/{exchangeId}/complete", null))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        (await Client.DeleteAsync($"/api/v2/group-exchanges/{exchangeId}"))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        using var finalScope = Factory.Services.CreateScope();
        var finalDb = finalScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var persisted = await finalDb.GroupExchanges.AsNoTracking()
            .SingleAsync(item => item.Id == exchangeId);
        persisted.Status.Should().Be("completed");
        (await finalDb.Transactions.AsNoTracking()
            .CountAsync(item => item.Description == "Group exchange: Immutable consent revision"))
            .Should().Be(1);
    }

    private async Task<int> CreateExchangeAsync(
        string title,
        decimal totalHours,
        string splitType,
        IReadOnlyCollection<object> participants,
        string? status = null)
    {
        var response = await Client.PostAsJsonAsync("/api/v2/group-exchanges", new
        {
            title,
            description = (string?)null,
            status,
            split_type = splitType,
            total_hours = totalHours,
            participants
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await JsonAsync(response)).GetProperty("data").GetProperty("id").GetInt32();
    }

    private static object Participant(int userId, string role, decimal hours = 0m, decimal weight = 1m) =>
        new { user_id = userId, role, hours, weight };

    private static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<decimal> BalanceAsync(NexusDbContext db, int userId)
    {
        var received = await db.Transactions.AsNoTracking()
            .Where(item => item.ReceiverId == userId && item.Status == TransactionStatus.Completed)
            .SumAsync(item => (decimal?)item.Amount) ?? 0m;
        var sent = await db.Transactions.AsNoTracking()
            .Where(item => item.SenderId == userId && item.Status == TransactionStatus.Completed)
            .SumAsync(item => (decimal?)item.Amount) ?? 0m;
        return received - sent;
    }

    private async Task<(int ProviderId, int ReceiverId)> AddSameTenantUsersAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var hash = BCrypt.Net.BCrypt.HashPassword(TestDataSeeder.TestPassword);
        var provider = NewUser("provider-two@test.com", "Provider", hash);
        var receiver = NewUser("receiver-two@test.com", "Receiver", hash);
        db.Users.AddRange(provider, receiver);
        await db.SaveChangesAsync();
        return (provider.Id, receiver.Id);
    }

    private User NewUser(string email, string firstName, string passwordHash) => new()
    {
        TenantId = TestData.Tenant1.Id,
        Email = email,
        PasswordHash = passwordHash,
        FirstName = firstName,
        LastName = "User",
        Role = "member",
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };

    private async Task AddSafeguardingPreferenceAsync(int userId, string key, string triggersJson)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var option = new SafeguardingOption
        {
            TenantId = TestData.Tenant1.Id,
            OptionKey = key,
            OptionType = "checkbox",
            Label = key,
            IsActive = true,
            TriggersJson = triggersJson,
            CreatedAt = DateTime.UtcNow
        };
        db.SafeguardingOptions.Add(option);
        await db.SaveChangesAsync();
        db.UserSafeguardingPreferences.Add(new UserSafeguardingPreference
        {
            TenantId = TestData.Tenant1.Id,
            UserId = userId,
            OptionId = option.Id,
            SelectedValue = "true",
            ConsentGivenAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
    }

    private async Task AddVerifiedVettingAsync(int userId, string type)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        db.Set<VettingRecord>().Add(new VettingRecord
        {
            TenantId = TestData.Tenant1.Id,
            UserId = userId,
            VettingType = type,
            Status = "verified",
            IssuedAt = DateTime.UtcNow.AddDays(-1),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            VerifiedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
    }

    private async Task SetEmailTransactionsPreferenceAsync(int userId, bool enabled)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var user = await db.Users.FirstAsync(item => item.Id == userId);
        user.NotificationPreferences = JsonSerializer.Serialize(new { email_transactions = enabled });
        await db.SaveChangesAsync();
    }
}

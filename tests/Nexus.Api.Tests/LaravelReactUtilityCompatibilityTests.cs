// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public sealed class LaravelReactUtilityCompatibilityTests : IntegrationTestBase
{
    public LaravelReactUtilityCompatibilityTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task SsoAndOauthRoutes_ReturnLaravelReactPublicShapes()
    {
        await SeedEnabledSsoProviderAsync();

        var providersJson = await ReadJsonAsync(await Client.GetAsync($"/api/v2/auth/sso/providers?tenant_id={TestData.Tenant1.Id}"), HttpStatusCode.OK);
        providersJson.GetProperty("success").GetBoolean().Should().BeTrue();
        providersJson.GetProperty("providers").EnumerateArray().Should().Contain(p =>
            p.GetProperty("provider_key").GetString() == "azure-entra" &&
            p.GetProperty("display_name").GetString() == "Azure Entra");

        var redirectJson = await ReadJsonAsync(await Client.GetAsync($"/api/v2/auth/sso/azure-entra/redirect?tenant_id={TestData.Tenant1.Id}"), HttpStatusCode.OK);
        redirectJson.GetProperty("success").GetBoolean().Should().BeTrue();
        redirectJson.GetProperty("provider").GetString().Should().Be("azure-entra");
        redirectJson.GetProperty("redirect_url").GetString().Should().Contain("response_type=code");

        var exchangeJson = await ReadJsonAsync(await Client.PostAsJsonAsync("/api/v2/auth/oauth/exchange", new { code = "bad-code" }), HttpStatusCode.BadRequest);
        exchangeJson.GetProperty("success").GetBoolean().Should().BeFalse();
        exchangeJson.GetProperty("error").GetString().Should().Be("invalid_oauth_code");
    }

    [Fact]
    public async Task LocationExchangeAndGivenReviewsRoutes_ReturnLaravelReactShapes()
    {
        await SeedGivenReviewAsync();
        await AuthenticateAsMemberAsync();

        var places = await ReadDataAsync(await Client.GetAsync("/api/v2/geo/os-places/search?q=York"));
        places.GetProperty("enabled").GetBoolean().Should().BeFalse();
        places.GetProperty("results").ValueKind.Should().Be(JsonValueKind.Array);

        var attention = await ReadDataAsync(await Client.GetAsync("/api/v2/exchanges/needs-attention-count"));
        attention.GetProperty("count").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        attention.GetProperty("items").ValueKind.Should().Be(JsonValueKind.Array);

        var reviews = await ReadJsonAsync(await Client.GetAsync("/api/v2/reviews/given?per_page=10"), HttpStatusCode.OK);
        reviews.GetProperty("success").GetBoolean().Should().BeTrue();
        reviews.GetProperty("data").EnumerateArray().Should().Contain(r =>
            r.GetProperty("reviewer_id").GetInt32() == TestData.MemberUser.Id &&
            r.GetProperty("rating").GetInt32() == 5);
        reviews.GetProperty("meta").GetProperty("per_page").GetInt32().Should().Be(10);
    }

    [Fact]
    public async Task GoalMatchAndMessageActionRoutes_ReturnLaravelReactShapes()
    {
        var goalId = await SeedMemberGoalAsync();
        await AuthenticateAsMemberAsync();

        var insights = await ReadDataAsync(await Client.GetAsync($"/api/v2/goals/{goalId}/insights"));
        insights.GetProperty("goal_id").GetInt32().Should().Be(goalId);
        insights.GetProperty("progress_percent").GetDecimal().Should().BeGreaterThan(0);
        insights.GetProperty("milestones").ValueKind.Should().Be(JsonValueKind.Array);

        var nudgeResponse = await Client.PostAsJsonAsync($"/api/v2/goals/{goalId}/buddy/nudge", new { type = "nudge" });
        var nudgeJson = await ReadJsonAsync(nudgeResponse, HttpStatusCode.Created);
        nudgeJson.GetProperty("success").GetBoolean().Should().BeTrue();
        nudgeJson.GetProperty("data").GetProperty("type").GetString().Should().Be("nudge");

        var dismiss = await ReadDataAsync(await Client.PostAsJsonAsync($"/api/v2/matches/listing/{TestData.Listing1.Id}/dismiss", new { reason = "not_relevant" }));
        dismiss.GetProperty("dismissed").GetBoolean().Should().BeTrue();
        dismiss.GetProperty("source_type").GetString().Should().Be("listing");
        dismiss.GetProperty("source_id").GetInt32().Should().Be(TestData.Listing1.Id);

        var coordinator = await ReadDataAsync(await Client.PostAsJsonAsync($"/api/v2/messages/{TestData.AdminUser.Id}/request-coordinator", new { }));
        coordinator.GetProperty("requested").GetBoolean().Should().BeTrue();
        coordinator.GetProperty("recipient_id").GetInt32().Should().Be(TestData.AdminUser.Id);
    }

    private async Task SeedEnabledSsoProviderAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        db.TenantSsoProviders.Add(new TenantSsoProvider
        {
            TenantId = TestData.Tenant1.Id,
            ProviderKey = "azure-entra",
            DisplayName = "Azure Entra",
            Preset = "azure-entra",
            IssuerUrl = "https://login.microsoftonline.com/common/v2.0",
            ClientId = "client-id",
            Scopes = "openid profile email",
            IsEnabled = true
        });
        await db.SaveChangesAsync();
    }

    private async Task SeedGivenReviewAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        db.Reviews.Add(new Review
        {
            TenantId = TestData.Tenant1.Id,
            ReviewerId = TestData.MemberUser.Id,
            TargetUserId = TestData.AdminUser.Id,
            Rating = 5,
            Comment = "Great exchange",
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
    }

    private async Task<int> SeedMemberGoalAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var goal = new Goal
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.MemberUser.Id,
            Title = "Help neighbours",
            Description = "Complete community help",
            GoalType = "count",
            TargetValue = 10,
            CurrentValue = 4,
            Status = "active",
            CreatedAt = DateTime.UtcNow.AddDays(-5)
        };
        goal.Milestones.Add(new GoalMilestone
        {
            TenantId = TestData.Tenant1.Id,
            Title = "First four",
            IsCompleted = true,
            CompletedAt = DateTime.UtcNow.AddDays(-1),
            SortOrder = 1,
            CreatedAt = DateTime.UtcNow.AddDays(-3)
        });
        db.Goals.Add(goal);
        await db.SaveChangesAsync();
        return goal.Id;
    }

    private static async Task<JsonElement> ReadDataAsync(HttpResponseMessage response)
    {
        var json = await ReadJsonAsync(response, HttpStatusCode.OK);
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        return json.GetProperty("data");
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response, HttpStatusCode expectedStatus)
    {
        response.StatusCode.Should().Be(expectedStatus);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}

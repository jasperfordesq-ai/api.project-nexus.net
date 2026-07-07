// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class LaravelReactFrontendContractTests : IntegrationTestBase
{
    public LaravelReactFrontendContractTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task SwReset_ReturnsBrowserRecoveryDocument()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/sw-reset");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("text/html");
        response.Headers.TryGetValues("Clear-Site-Data", out var clearSiteData).Should().BeTrue();
        clearSiteData!.Single().Should().Contain("\"cache\"");
        var html = await response.Content.ReadAsStringAsync();
        html.Should().Contain("serviceWorker");
        html.Should().Contain("caches");
    }

    [Fact]
    public async Task PartnerAnalytics_WithQueryToken_ReturnsDashboardAndReportsEnvelope()
    {
        const string token = "partner-token-contract";

        await SeedRegionalAnalyticsSubscriptionAsync(token);
        ClearAuthToken();

        var dashboard = await Client.GetAsync($"/api/partner-analytics/me/dashboard?period=last_30d&token={token}");
        dashboard.StatusCode.Should().Be(HttpStatusCode.OK);
        var dashboardJson = await dashboard.Content.ReadFromJsonAsync<JsonElement>();
        dashboardJson.GetProperty("success").GetBoolean().Should().BeTrue();
        dashboardJson.GetProperty("data").TryGetProperty("period", out _).Should().BeTrue();

        var reports = await Client.GetAsync($"/api/partner-analytics/me/reports?token={token}");
        reports.StatusCode.Should().Be(HttpStatusCode.OK);
        var reportsJson = await reports.Content.ReadFromJsonAsync<JsonElement>();
        reportsJson.GetProperty("success").GetBoolean().Should().BeTrue();
        reportsJson.GetProperty("data").GetProperty("reports").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task AdminEnterpriseGdprDashboard_UsesLaravelReactMetricKeys()
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync("/api/v2/admin/enterprise/gdpr/dashboard");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("total_requests").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        json.GetProperty("pending_requests").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        json.GetProperty("total_consents").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        json.GetProperty("total_breaches").GetInt32().Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task AdminEnterpriseMonitoring_UsesLaravelReactHealthShapes()
    {
        await AuthenticateAsAdminAsync();

        var monitoring = await Client.GetAsync("/api/v2/admin/enterprise/monitoring");

        monitoring.StatusCode.Should().Be(HttpStatusCode.OK);
        var monitoringJson = await monitoring.Content.ReadFromJsonAsync<JsonElement>();
        monitoringJson.GetProperty("php_version").GetString().Should().NotBeNullOrWhiteSpace();
        monitoringJson.GetProperty("memory_usage").GetString().Should().NotBeNullOrWhiteSpace();
        monitoringJson.GetProperty("memory_limit").GetString().Should().NotBeNullOrWhiteSpace();
        monitoringJson.GetProperty("db_connected").GetBoolean().Should().BeTrue();
        monitoringJson.GetProperty("redis_connected").ValueKind.Should().Be(JsonValueKind.True);
        monitoringJson.GetProperty("redis_memory").GetString().Should().NotBeNullOrWhiteSpace();
        monitoringJson.GetProperty("db_size").GetString().Should().NotBeNullOrWhiteSpace();
        monitoringJson.GetProperty("uptime").GetString().Should().NotBeNullOrWhiteSpace();
        monitoringJson.GetProperty("server_time").GetString().Should().NotBeNullOrWhiteSpace();
        monitoringJson.GetProperty("os").GetString().Should().NotBeNullOrWhiteSpace();

        var health = await Client.GetAsync("/api/v2/admin/enterprise/monitoring/health");

        health.StatusCode.Should().Be(HttpStatusCode.OK);
        var healthJson = await health.Content.ReadFromJsonAsync<JsonElement>();
        healthJson.GetProperty("status").GetString().Should().BeOneOf("healthy", "degraded", "unhealthy");
        var checks = healthJson.GetProperty("checks");
        checks.ValueKind.Should().Be(JsonValueKind.Array);
        checks.EnumerateArray().Should().Contain(c =>
            c.GetProperty("name").GetString() == "database" &&
            c.GetProperty("status").GetString() == "ok");
    }

    [Fact]
    public async Task AdminEnterpriseGdprBreaches_CreateAndListUseLaravelReactShape()
    {
        await AuthenticateAsAdminAsync();

        var create = await Client.PostAsJsonAsync("/api/v2/admin/enterprise/gdpr/breaches", new
        {
            title = "Contract parity breach",
            description = "A runtime smoke test created this record.",
            severity = "high",
            affected_users = 3
        });

        create.StatusCode.Should().Be(HttpStatusCode.OK);
        var createdJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        var createdData = createdJson.TryGetProperty("data", out var data) ? data : createdJson;
        createdData.GetProperty("id").GetInt32().Should().BeGreaterThan(0);
        createdData.GetProperty("title").GetString().Should().Be("Contract parity breach");
        createdData.GetProperty("description").GetString().Should().Be("A runtime smoke test created this record.");
        createdData.GetProperty("severity").GetString().Should().Be("high");
        createdData.GetProperty("status").GetString().Should().Be("open");
        createdData.GetProperty("reported_at").GetString().Should().NotBeNullOrWhiteSpace();

        var list = await Client.GetAsync("/api/v2/admin/enterprise/gdpr/breaches");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        var listData = listJson.GetProperty("data");
        listData.ValueKind.Should().Be(JsonValueKind.Array);
        var createdId = createdData.GetProperty("id").GetInt32();
        listData.EnumerateArray()
            .Any(item =>
                item.GetProperty("id").GetInt32() == createdId &&
                item.GetProperty("title").GetString() == "Contract parity breach" &&
                item.GetProperty("status").GetString() == "open" &&
                item.TryGetProperty("reported_at", out var reportedAt) &&
            !string.IsNullOrWhiteSpace(reportedAt.GetString()))
            .Should().BeTrue();
    }

    [Fact]
    public async Task AdminDeliverabilityV2_UsesLaravelReactCrudDashboardAnalyticsAndCommentShape()
    {
        await AuthenticateAsAdminAsync();

        var title = $"Laravel React deliverable {Guid.NewGuid():N}";
        var create = await Client.PostAsJsonAsync("/api/v2/admin/deliverability", new
        {
            title,
            description = "Backend contract parity deliverable.",
            priority = "high",
            status = "in_progress",
            due_date = "2026-08-15",
            assigned_to = TestData.MemberUser.Id
        });

        create.StatusCode.Should().Be(HttpStatusCode.OK);
        var createJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        var created = createJson.GetProperty("data");
        var id = created.GetProperty("id").GetInt32();
        id.Should().BeGreaterThan(0);
        created.GetProperty("title").GetString().Should().Be(title);
        created.GetProperty("status").GetString().Should().Be("in_progress");
        created.GetProperty("priority").GetString().Should().Be("high");

        var list = await Client.GetAsync("/api/v2/admin/deliverability?status=in_progress&priority=high&page=1&limit=10");
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        var listData = listJson.GetProperty("data");
        listData.ValueKind.Should().Be(JsonValueKind.Array);
        listData.EnumerateArray().Should().Contain(item =>
            item.GetProperty("id").GetInt32() == id &&
            item.GetProperty("title").GetString() == title &&
            item.GetProperty("assigned_to").GetInt32() == TestData.MemberUser.Id);
        var meta = listJson.GetProperty("meta");
        meta.GetProperty("current_page").GetInt32().Should().Be(1);
        meta.GetProperty("per_page").GetInt32().Should().Be(10);
        meta.GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);

        var detail = await Client.GetAsync($"/api/v2/admin/deliverability/{id}");
        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailJson = await detail.Content.ReadFromJsonAsync<JsonElement>();
        var detailData = detailJson.GetProperty("data");
        detailData.GetProperty("id").GetInt32().Should().Be(id);
        detailData.GetProperty("description").GetString().Should().Be("Backend contract parity deliverable.");
        detailData.GetProperty("comments").ValueKind.Should().Be(JsonValueKind.Array);

        var comment = await Client.PostAsJsonAsync($"/api/v2/admin/deliverability/{id}/comments", new
        {
            comment_text = "Confirmed against Laravel React contract.",
            comment_type = "comment"
        });

        comment.StatusCode.Should().Be(HttpStatusCode.OK);
        var commentJson = await comment.Content.ReadFromJsonAsync<JsonElement>();
        var commentData = commentJson.GetProperty("data");
        commentData.GetProperty("id").GetInt32().Should().BeGreaterThan(0);
        commentData.GetProperty("deliverable_id").GetInt32().Should().Be(id);
        commentData.GetProperty("comment_text").GetString().Should().Be("Confirmed against Laravel React contract.");
        commentData.GetProperty("comment_type").GetString().Should().Be("comment");

        var update = await Client.PutAsJsonAsync($"/api/v2/admin/deliverability/{id}", new
        {
            status = "completed",
            priority = "urgent"
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        var updateData = updateJson.GetProperty("data");
        updateData.GetProperty("status").GetString().Should().Be("completed");
        updateData.GetProperty("priority").GetString().Should().Be("urgent");
        updateData.GetProperty("comments").EnumerateArray().Should().Contain(item =>
            item.GetProperty("comment_text").GetString() == "Confirmed against Laravel React contract.");

        var dashboard = await Client.GetAsync("/api/v2/admin/deliverability/dashboard");
        dashboard.StatusCode.Should().Be(HttpStatusCode.OK);
        var dashboardJson = await dashboard.Content.ReadFromJsonAsync<JsonElement>();
        var dashboardData = dashboardJson.GetProperty("data");
        dashboardData.GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        dashboardData.GetProperty("by_status").TryGetProperty("completed", out _).Should().BeTrue();
        dashboardData.GetProperty("completion_rate").GetDouble().Should().BeGreaterThanOrEqualTo(0);
        dashboardData.GetProperty("recent_activity").ValueKind.Should().Be(JsonValueKind.Array);

        var analytics = await Client.GetAsync("/api/v2/admin/deliverability/analytics");
        analytics.StatusCode.Should().Be(HttpStatusCode.OK);
        var analyticsJson = await analytics.Content.ReadFromJsonAsync<JsonElement>();
        var analyticsData = analyticsJson.GetProperty("data");
        analyticsData.GetProperty("completion_trends").ValueKind.Should().Be(JsonValueKind.Array);
        analyticsData.GetProperty("priority_distribution").TryGetProperty("urgent", out _).Should().BeTrue();
        analyticsData.TryGetProperty("avg_days_to_complete", out _).Should().BeTrue();
        analyticsData.GetProperty("risk_distribution").ValueKind.Should().Be(JsonValueKind.Object);

        var delete = await Client.DeleteAsync($"/api/v2/admin/deliverability/{id}");
        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        var deleteData = deleteJson.GetProperty("data");
        deleteData.GetProperty("deleted").GetBoolean().Should().BeTrue();
        deleteData.GetProperty("id").GetInt32().Should().Be(id);
    }

    [Fact]
    public async Task AdminVolunteeringOpportunitiesV2_ExposesLaravelAdminAlias()
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync("/api/v2/admin/volunteering/opportunities?page=1&limit=10");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        var meta = json.GetProperty("meta");
        meta.GetProperty("current_page").GetInt32().Should().Be(1);
        meta.GetProperty("per_page").GetInt32().Should().Be(10);
        meta.GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task AdminCrmV2_UsesLaravelReactNotesTagsAdminsAndFunnelShape()
    {
        await AuthenticateAsAdminAsync();

        var funnel = await Client.GetAsync("/api/v2/admin/crm/funnel");
        funnel.StatusCode.Should().Be(HttpStatusCode.OK);
        var funnelData = (await funnel.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        var stages = funnelData.GetProperty("stages");
        stages.ValueKind.Should().Be(JsonValueKind.Array);
        stages.EnumerateArray()
            .Any(stage =>
                stage.TryGetProperty("name", out var name) &&
                !string.IsNullOrWhiteSpace(name.GetString()) &&
                stage.TryGetProperty("color", out var color) &&
                !string.IsNullOrWhiteSpace(color.GetString()))
            .Should().BeTrue();
        funnelData.GetProperty("monthly_registrations").ValueKind.Should().Be(JsonValueKind.Array);

        var admins = await Client.GetAsync("/api/v2/admin/crm/admins");
        admins.StatusCode.Should().Be(HttpStatusCode.OK);
        var adminData = (await admins.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        adminData.ValueKind.Should().Be(JsonValueKind.Array);
        adminData.EnumerateArray().Should().Contain(admin =>
            admin.GetProperty("id").GetInt32() == TestData.AdminUser.Id &&
            admin.GetProperty("email").GetString() == TestData.AdminUser.Email &&
            admin.GetProperty("role").GetString() == "admin");

        var noteContent = $"Laravel React CRM note {Guid.NewGuid():N}";
        var createNote = await Client.PostAsJsonAsync("/api/v2/admin/crm/notes", new
        {
            user_id = TestData.MemberUser.Id,
            content = noteContent,
            category = "outreach",
            is_pinned = true
        });

        createNote.StatusCode.Should().Be(HttpStatusCode.OK);
        var createdNote = (await createNote.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        var noteId = createdNote.GetProperty("id").GetInt32();
        noteId.Should().BeGreaterThan(0);
        createdNote.GetProperty("user_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        createdNote.GetProperty("content").GetString().Should().Be(noteContent);
        createdNote.GetProperty("category").GetString().Should().Be("outreach");
        createdNote.GetProperty("is_pinned").GetBoolean().Should().BeTrue();
        createdNote.GetProperty("user_name").GetString().Should().Be($"{TestData.MemberUser.FirstName} {TestData.MemberUser.LastName}");
        createdNote.GetProperty("author_name").GetString().Should().Be($"{TestData.AdminUser.FirstName} {TestData.AdminUser.LastName}");

        var notes = await Client.GetAsync($"/api/v2/admin/crm/notes?user_id={TestData.MemberUser.Id}&category=outreach&page=1&limit=10");
        notes.StatusCode.Should().Be(HttpStatusCode.OK);
        var notesJson = await notes.Content.ReadFromJsonAsync<JsonElement>();
        notesJson.GetProperty("data").EnumerateArray().Should().Contain(note =>
            note.GetProperty("id").GetInt32() == noteId &&
            note.GetProperty("content").GetString() == noteContent);
        notesJson.GetProperty("meta").GetProperty("current_page").GetInt32().Should().Be(1);
        notesJson.GetProperty("meta").GetProperty("per_page").GetInt32().Should().Be(10);

        var updateNote = await Client.PutAsJsonAsync($"/api/v2/admin/crm/notes/{noteId}", new
        {
            content = $"{noteContent} updated",
            category = "follow_up",
            is_pinned = false
        });

        updateNote.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedNote = (await updateNote.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        updatedNote.GetProperty("id").GetInt32().Should().Be(noteId);
        updatedNote.GetProperty("content").GetString().Should().Be($"{noteContent} updated");
        updatedNote.GetProperty("category").GetString().Should().Be("follow_up");
        updatedNote.GetProperty("is_pinned").GetBoolean().Should().BeFalse();

        var tag = $"crm-{Guid.NewGuid():N}"[..12];
        var createTag = await Client.PostAsJsonAsync("/api/v2/admin/crm/tags", new
        {
            user_id = TestData.MemberUser.Id,
            tag
        });

        createTag.StatusCode.Should().Be(HttpStatusCode.OK);
        var createdTag = (await createTag.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        var tagId = createdTag.GetProperty("id").GetInt32();
        tagId.Should().BeGreaterThan(0);
        createdTag.GetProperty("user_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        createdTag.GetProperty("tag").GetString().Should().Be(tag);

        var tagsForUser = await Client.GetAsync($"/api/v2/admin/crm/tags?user_id={TestData.MemberUser.Id}");
        tagsForUser.StatusCode.Should().Be(HttpStatusCode.OK);
        var tagsForUserData = (await tagsForUser.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        tagsForUserData.EnumerateArray().Should().Contain(item =>
            item.GetProperty("id").GetInt32() == tagId &&
            item.GetProperty("tag").GetString() == tag &&
            item.GetProperty("user_name").GetString() == $"{TestData.MemberUser.FirstName} {TestData.MemberUser.LastName}");

        var tagSummary = await Client.GetAsync("/api/v2/admin/crm/tags");
        tagSummary.StatusCode.Should().Be(HttpStatusCode.OK);
        var tagSummaryData = (await tagSummary.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        tagSummaryData.EnumerateArray().Should().Contain(item =>
            item.GetProperty("tag").GetString() == tag &&
            item.GetProperty("member_count").GetInt32() >= 1);

        var bulkRemoveTag = await Client.DeleteAsync($"/api/v2/admin/crm/tags/bulk?tag={Uri.EscapeDataString(tag)}");
        bulkRemoveTag.StatusCode.Should().Be(HttpStatusCode.OK);
        var bulkRemoveData = (await bulkRemoveTag.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        bulkRemoveData.GetProperty("deleted").GetInt32().Should().BeGreaterThanOrEqualTo(1);

        var deleteNote = await Client.DeleteAsync($"/api/v2/admin/crm/notes/{noteId}");
        deleteNote.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteNoteData = (await deleteNote.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        deleteNoteData.GetProperty("deleted").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task AdminCrmTasksV2_UsesLaravelReactCoordinatorTaskShape()
    {
        await AuthenticateAsAdminAsync();

        var title = $"Laravel React CRM task {Guid.NewGuid():N}";
        var create = await Client.PostAsJsonAsync("/api/v2/admin/crm/tasks", new
        {
            title,
            description = "Created by backend contract smoke test.",
            priority = "high",
            assigned_to = TestData.AdminUser.Id,
            user_id = TestData.MemberUser.Id,
            due_date = "2026-09-01"
        });

        create.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        var taskId = created.GetProperty("id").GetInt32();
        taskId.Should().BeGreaterThan(0);
        created.GetProperty("title").GetString().Should().Be(title);
        created.GetProperty("description").GetString().Should().Be("Created by backend contract smoke test.");
        created.GetProperty("priority").GetString().Should().Be("high");
        created.GetProperty("status").GetString().Should().Be("pending");
        created.GetProperty("assigned_to").GetInt32().Should().Be(TestData.AdminUser.Id);
        created.GetProperty("assigned_to_name").GetString().Should().Be($"{TestData.AdminUser.FirstName} {TestData.AdminUser.LastName}");
        created.GetProperty("user_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        created.GetProperty("user_name").GetString().Should().Be($"{TestData.MemberUser.FirstName} {TestData.MemberUser.LastName}");
        created.GetProperty("created_by").GetInt32().Should().Be(TestData.AdminUser.Id);
        created.GetProperty("created_by_name").GetString().Should().Be($"{TestData.AdminUser.FirstName} {TestData.AdminUser.LastName}");

        var list = await Client.GetAsync("/api/v2/admin/crm/tasks?status=pending&priority=high&page=1&limit=10");
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("data").EnumerateArray().Should().Contain(task =>
            task.GetProperty("id").GetInt32() == taskId &&
            task.GetProperty("title").GetString() == title &&
            task.GetProperty("assigned_to").GetInt32() == TestData.AdminUser.Id);
        listJson.GetProperty("meta").GetProperty("current_page").GetInt32().Should().Be(1);
        listJson.GetProperty("meta").GetProperty("per_page").GetInt32().Should().Be(10);
        listJson.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);

        var update = await Client.PutAsJsonAsync($"/api/v2/admin/crm/tasks/{taskId}", new
        {
            title = $"{title} updated",
            description = "Updated by backend contract smoke test.",
            priority = "urgent",
            status = "in_progress",
            assigned_to = TestData.AdminUser.Id,
            user_id = TestData.MemberUser.Id,
            due_date = "2026-09-02"
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = (await update.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        updated.GetProperty("id").GetInt32().Should().Be(taskId);
        updated.GetProperty("title").GetString().Should().Be($"{title} updated");
        updated.GetProperty("priority").GetString().Should().Be("urgent");
        updated.GetProperty("status").GetString().Should().Be("in_progress");
        updated.GetProperty("due_date").GetString().Should().StartWith("2026-09-02");

        var complete = await Client.PutAsJsonAsync($"/api/v2/admin/crm/tasks/{taskId}", new
        {
            status = "completed"
        });

        complete.StatusCode.Should().Be(HttpStatusCode.OK);
        var completed = (await complete.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        completed.GetProperty("status").GetString().Should().Be("completed");
        completed.GetProperty("completed_at").GetString().Should().NotBeNullOrWhiteSpace();

        var delete = await Client.DeleteAsync($"/api/v2/admin/crm/tasks/{taskId}");
        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleted = (await delete.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        deleted.GetProperty("deleted").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task AdminCrmTimelineV2_UsesLaravelReactActivityShapeAndFilters()
    {
        await AuthenticateAsAdminAsync();

        var noteContent = $"Timeline CRM note {Guid.NewGuid():N}";
        var createNote = await Client.PostAsJsonAsync("/api/v2/admin/crm/notes", new
        {
            user_id = TestData.MemberUser.Id,
            content = noteContent,
            category = "support"
        });
        createNote.StatusCode.Should().Be(HttpStatusCode.OK);

        var taskTitle = $"Timeline CRM task {Guid.NewGuid():N}";
        var createTask = await Client.PostAsJsonAsync("/api/v2/admin/crm/tasks", new
        {
            title = taskTitle,
            priority = "medium",
            assigned_to = TestData.AdminUser.Id,
            user_id = TestData.MemberUser.Id
        });
        createTask.StatusCode.Should().Be(HttpStatusCode.OK);

        var notesTimeline = await Client.GetAsync($"/api/v2/admin/crm/timeline?type=note_added&user_id={TestData.MemberUser.Id}&days=30&page=1&limit=25");
        notesTimeline.StatusCode.Should().Be(HttpStatusCode.OK);
        var notesJson = await notesTimeline.Content.ReadFromJsonAsync<JsonElement>();
        var noteSnippet = noteContent.Substring(0, Math.Min(noteContent.Length, 24));
        notesJson.GetProperty("data").EnumerateArray().Should().Contain(entry =>
            entry.GetProperty("activity_type").GetString() == "note_added" &&
            entry.GetProperty("user_id").GetInt32() == TestData.MemberUser.Id &&
            entry.GetProperty("user_name").GetString() == $"{TestData.MemberUser.FirstName} {TestData.MemberUser.LastName}" &&
            entry.GetProperty("description").GetString()!.Contains(noteSnippet) &&
            !string.IsNullOrWhiteSpace(entry.GetProperty("created_at").GetString()));
        notesJson.GetProperty("meta").GetProperty("current_page").GetInt32().Should().Be(1);
        notesJson.GetProperty("meta").GetProperty("per_page").GetInt32().Should().Be(25);
        notesJson.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);

        var tasksTimeline = await Client.GetAsync($"/api/v2/admin/crm/timeline?type=task_created&user_id={TestData.AdminUser.Id}&days=30&page=1&limit=25");
        tasksTimeline.StatusCode.Should().Be(HttpStatusCode.OK);
        var tasksJson = await tasksTimeline.Content.ReadFromJsonAsync<JsonElement>();
        tasksJson.GetProperty("data").EnumerateArray().Should().Contain(entry =>
            entry.GetProperty("activity_type").GetString() == "task_created" &&
            entry.GetProperty("user_id").GetInt32() == TestData.AdminUser.Id &&
            entry.GetProperty("description").GetString()!.Contains(taskTitle) &&
            entry.GetProperty("metadata").ValueKind == JsonValueKind.Object);
        tasksJson.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task AdminCrmExportsV2_IncludeLaravelReactCsvRows()
    {
        await AuthenticateAsAdminAsync();

        var noteContent = $"Export CRM note {Guid.NewGuid():N}";
        var createNote = await Client.PostAsJsonAsync("/api/v2/admin/crm/notes", new
        {
            user_id = TestData.MemberUser.Id,
            content = noteContent,
            category = "support",
            is_pinned = true
        });
        createNote.StatusCode.Should().Be(HttpStatusCode.OK);

        var taskTitle = $"Export CRM task {Guid.NewGuid():N}";
        var createTask = await Client.PostAsJsonAsync("/api/v2/admin/crm/tasks", new
        {
            title = taskTitle,
            description = "CSV export contract task.",
            priority = "urgent",
            assigned_to = TestData.AdminUser.Id,
            user_id = TestData.MemberUser.Id,
            due_date = "2026-10-01"
        });
        createTask.StatusCode.Should().Be(HttpStatusCode.OK);

        var notesExport = await Client.GetAsync("/api/v2/admin/crm/export/notes");
        notesExport.StatusCode.Should().Be(HttpStatusCode.OK);
        notesExport.Content.Headers.ContentType?.MediaType.Should().Be("text/csv");
        var notesCsv = await notesExport.Content.ReadAsStringAsync();
        notesCsv.Should().Contain("ID,User ID,User Name,Content,Category,Pinned,Author,Created,Updated");
        notesCsv.Should().Contain(noteContent);
        notesCsv.Should().Contain($"{TestData.MemberUser.FirstName} {TestData.MemberUser.LastName}");
        notesCsv.Should().Contain($"{TestData.AdminUser.FirstName} {TestData.AdminUser.LastName}");

        var tasksExport = await Client.GetAsync("/api/v2/admin/crm/export/tasks");
        tasksExport.StatusCode.Should().Be(HttpStatusCode.OK);
        tasksExport.Content.Headers.ContentType?.MediaType.Should().Be("text/csv");
        var tasksCsv = await tasksExport.Content.ReadAsStringAsync();
        tasksCsv.Should().Contain("ID,Title,Description,Priority,Status,Assigned To,Related Member,Due Date,Completed At,Created By,Created");
        tasksCsv.Should().Contain(taskTitle);
        tasksCsv.Should().Contain("urgent");
        tasksCsv.Should().Contain($"{TestData.MemberUser.FirstName} {TestData.MemberUser.LastName}");

        var dashboardExport = await Client.GetAsync("/api/v2/admin/crm/export/dashboard");
        dashboardExport.StatusCode.Should().Be(HttpStatusCode.OK);
        dashboardExport.Content.Headers.ContentType?.MediaType.Should().Be("text/csv");
        var dashboardCsv = await dashboardExport.Content.ReadAsStringAsync();
        dashboardCsv.Should().Contain("Metric,Value");
        dashboardCsv.Should().Contain("Total Members");
        dashboardCsv.Should().Contain("New This Month");
    }

    [Fact]
    public async Task AdminEnterpriseGdprRequests_CreateAndListUseLaravelReactShape()
    {
        await AuthenticateAsAdminAsync();

        var create = await Client.PostAsJsonAsync("/api/v2/admin/enterprise/gdpr/requests", new
        {
            user_id = TestData.MemberUser.Id,
            type = "access",
            priority = "high",
            notes = "Created by Laravel React contract smoke test"
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        createdJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var createdData = createdJson.GetProperty("data");
        createdData.GetProperty("id").GetInt32().Should().BeGreaterThan(0);
        createdData.GetProperty("type").GetString().Should().Be("access");
        createdData.GetProperty("status").GetString().Should().Be("pending");

        var list = await Client.GetAsync("/api/v2/admin/enterprise/gdpr/requests?status=pending");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        var listData = listJson.GetProperty("data");
        listData.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        listData.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThan(0);
        var createdId = createdData.GetProperty("id").GetInt32();
        listData.GetProperty("data").EnumerateArray()
            .Any(item =>
                item.GetProperty("id").GetInt32() == createdId &&
                item.GetProperty("user_name").GetString() == $"{TestData.MemberUser.FirstName} {TestData.MemberUser.LastName}" &&
                item.GetProperty("type").GetString() == "access" &&
                item.GetProperty("status").GetString() == "pending" &&
                !string.IsNullOrWhiteSpace(item.GetProperty("created_at").GetString()))
            .Should().BeTrue();
    }

    [Fact]
    public async Task AdminEnterpriseGdprRequestDetail_UsesLaravelReactDetailShape()
    {
        await AuthenticateAsAdminAsync();

        var create = await Client.PostAsJsonAsync("/api/v2/admin/enterprise/gdpr/requests", new
        {
            user_id = TestData.MemberUser.Id,
            type = "portability",
            priority = "normal",
            notes = "Detail shape contract test"
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdData = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        var requestId = createdData.GetProperty("id").GetInt32();

        var detail = await Client.GetAsync($"/api/v2/admin/enterprise/gdpr/requests/{requestId}");

        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailJson = await detail.Content.ReadFromJsonAsync<JsonElement>();
        var data = detailJson.GetProperty("data");
        data.GetProperty("id").GetInt32().Should().Be(requestId);
        data.GetProperty("user_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        data.GetProperty("user_name").GetString().Should().Be($"{TestData.MemberUser.FirstName} {TestData.MemberUser.LastName}");
        data.GetProperty("user_email").GetString().Should().Be(TestData.MemberUser.Email);
        data.GetProperty("type").GetString().Should().Be("portability");
        data.GetProperty("request_type").GetString().Should().Be("portability");
        data.GetProperty("status").GetString().Should().Be("pending");
        data.GetProperty("created_at").GetString().Should().NotBeNullOrWhiteSpace();
        data.GetProperty("sla_deadline").GetString().Should().NotBeNullOrWhiteSpace();
        data.GetProperty("sla_days_remaining").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        data.GetProperty("sla_overdue").GetBoolean().Should().BeFalse();
        data.GetProperty("timeline").ValueKind.Should().Be(JsonValueKind.Array);
        data.TryGetProperty("export_file_path", out _).Should().BeTrue();
        data.TryGetProperty("assigned_to", out _).Should().BeTrue();
    }

    [Fact]
    public async Task LocalAdvertisingCampaigns_UseLaravelReactAdminShape()
    {
        await AuthenticateAsAdminAsync();

        var create = await Client.PostAsJsonAsync("/api/v2/me/ad-campaigns", new
        {
            name = "Laravel React local ad",
            advertiser_type = "verein",
            budget_cents = 12345,
            placement = "feed",
            start_date = "2026-07-10",
            end_date = "2026-07-31",
            audience_filters = new { radius_km = 5, interests = new[] { "gardening" } }
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        created.GetProperty("id").GetInt32().Should().BeGreaterThan(0);
        created.GetProperty("tenant_id").GetInt32().Should().Be(TestData.Tenant1.Id);
        created.GetProperty("created_by").GetInt32().Should().Be(TestData.AdminUser.Id);
        created.GetProperty("name").GetString().Should().Be("Laravel React local ad");
        created.GetProperty("status").GetString().Should().Be("pending_review");
        created.GetProperty("advertiser_type").GetString().Should().Be("verein");
        created.GetProperty("budget_cents").GetInt32().Should().Be(12345);
        created.GetProperty("spent_cents").GetInt32().Should().Be(0);
        created.GetProperty("placement").GetString().Should().Be("feed");
        created.GetProperty("impression_count").GetInt32().Should().Be(0);
        created.GetProperty("click_count").GetInt32().Should().Be(0);
        created.GetProperty("advertiser_name").GetString().Should().Be("Admin User");
        created.GetProperty("advertiser_email").GetString().Should().Be(TestData.AdminUser.Email);

        var campaignId = created.GetProperty("id").GetInt32();

        var list = await Client.GetAsync("/api/v2/admin/ad-campaigns?status=pending_review&limit=50");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var listed = listJson.GetProperty("data").EnumerateArray()
            .Single(item => item.GetProperty("id").GetInt32() == campaignId);
        listed.GetProperty("creative_count").GetInt32().Should().Be(0);

        var stats = await Client.GetAsync("/api/v2/admin/ad-campaigns/stats");

        stats.StatusCode.Should().Be(HttpStatusCode.OK);
        var statsData = (await stats.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        statsData.GetProperty("active_campaigns").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        statsData.GetProperty("impressions_today").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        statsData.GetProperty("clicks_today").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        statsData.GetProperty("total_revenue_cents").GetInt32().Should().BeGreaterThanOrEqualTo(0);

        var detail = await Client.GetAsync($"/api/v2/admin/ad-campaigns/{campaignId}");

        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailData = (await detail.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        detailData.GetProperty("id").GetInt32().Should().Be(campaignId);
        detailData.GetProperty("creatives").ValueKind.Should().Be(JsonValueKind.Array);
        detailData.GetProperty("stats").GetProperty("campaign_id").GetInt32().Should().Be(campaignId);
        detailData.GetProperty("stats").GetProperty("daily").ValueKind.Should().Be(JsonValueKind.Array);

        var approve = await Client.PostAsync($"/api/v2/admin/ad-campaigns/{campaignId}/approve", null);

        approve.StatusCode.Should().Be(HttpStatusCode.OK);
        var approved = (await approve.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        approved.GetProperty("status").GetString().Should().Be("active");
        approved.GetProperty("approved_by").GetInt32().Should().Be(TestData.AdminUser.Id);
        approved.GetProperty("approved_at").GetString().Should().NotBeNullOrWhiteSpace();

        var pause = await Client.PostAsync($"/api/v2/admin/ad-campaigns/{campaignId}/pause", null);

        pause.StatusCode.Should().Be(HttpStatusCode.OK);
        var paused = (await pause.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        paused.GetProperty("id").GetInt32().Should().Be(campaignId);
        paused.GetProperty("status").GetString().Should().Be("paused");

        var rejectCreate = await Client.PostAsJsonAsync("/api/v2/me/ad-campaigns", new
        {
            name = "Laravel React rejected local ad",
            advertiser_type = "sme",
            budget_cents = 5000,
            placement = "markt"
        });
        var rejectedCampaignId = (await rejectCreate.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data")
            .GetProperty("id")
            .GetInt32();

        var reject = await Client.PostAsJsonAsync($"/api/v2/admin/ad-campaigns/{rejectedCampaignId}/reject", new
        {
            reason = "Audience is too broad."
        });

        reject.StatusCode.Should().Be(HttpStatusCode.OK);
        var rejected = (await reject.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        rejected.GetProperty("id").GetInt32().Should().Be(rejectedCampaignId);
        rejected.GetProperty("status").GetString().Should().Be("rejected");

        var rejectedDetail = await Client.GetAsync($"/api/v2/admin/ad-campaigns/{rejectedCampaignId}");
        var rejectedDetailData = (await rejectedDetail.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        rejectedDetailData.GetProperty("rejection_reason").GetString().Should().Be("Audience is too broad.");
    }

    [Fact]
    public async Task PaidPushCampaigns_UseLaravelReactMemberAndAdminShape()
    {
        await AuthenticateAsAdminAsync();

        var estimate = await Client.PostAsJsonAsync("/api/v2/me/push-campaigns/estimate-audience", new
        {
            audience_min_trust_tier = "member",
            audience_radius_km = 25
        });

        estimate.StatusCode.Should().Be(HttpStatusCode.OK);
        var estimateData = (await estimate.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        estimateData.GetProperty("estimated_reach").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        estimateData.GetProperty("estimated_count").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        estimateData.GetProperty("minimum_reached").ValueKind.Should().BeOneOf(JsonValueKind.True, JsonValueKind.False);

        var scheduledAt = DateTime.UtcNow.AddDays(7).ToString("O");
        var create = await Client.PostAsJsonAsync("/api/v2/me/push-campaigns", new
        {
            name = "Laravel React push campaign",
            title = "Garden day reminder",
            body = "Join the community garden session this weekend.",
            advertiser_type = "gemeinde",
            cta_url = "https://example.test/garden",
            schedule_at = scheduledAt,
            audience_radius_km = 25,
            audience_min_trust_tier = "trusted"
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        var campaignId = created.GetProperty("id").GetInt32();
        campaignId.Should().BeGreaterThan(0);
        created.GetProperty("tenant_id").GetInt32().Should().Be(TestData.Tenant1.Id);
        created.GetProperty("created_by").GetInt32().Should().Be(TestData.AdminUser.Id);
        created.GetProperty("name").GetString().Should().Be("Laravel React push campaign");
        created.GetProperty("title").GetString().Should().Be("Garden day reminder");
        created.GetProperty("body").GetString().Should().Be("Join the community garden session this weekend.");
        created.GetProperty("status").GetString().Should().Be("draft");
        created.GetProperty("advertiser_type").GetString().Should().Be("gemeinde");
        created.GetProperty("schedule_at").GetString().Should().NotBeNullOrWhiteSpace();
        created.GetProperty("scheduled_at").GetString().Should().NotBeNullOrWhiteSpace();
        created.GetProperty("audience_radius_km").GetInt32().Should().Be(25);
        created.GetProperty("audience_min_trust_tier").GetString().Should().Be("trusted");

        var update = await Client.PutAsJsonAsync($"/api/v2/me/push-campaigns/{campaignId}", new
        {
            title = "Updated garden day reminder",
            body = "Updated notification body.",
            cost_per_send = 7
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = (await update.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        updated.GetProperty("title").GetString().Should().Be("Updated garden day reminder");
        updated.GetProperty("body").GetString().Should().Be("Updated notification body.");
        updated.GetProperty("cost_per_send").GetInt32().Should().Be(7);

        var submit = await Client.PostAsync($"/api/v2/me/push-campaigns/{campaignId}/submit", null);

        submit.StatusCode.Should().Be(HttpStatusCode.OK);
        var submitted = (await submit.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        submitted.GetProperty("status").GetString().Should().Be("pending_review");

        var mine = await Client.GetAsync("/api/v2/me/push-campaigns");

        mine.StatusCode.Should().Be(HttpStatusCode.OK);
        var mineData = (await mine.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        mineData.EnumerateArray()
            .Should().Contain(item => item.GetProperty("id").GetInt32() == campaignId
                && item.GetProperty("status").GetString() == "pending_review");

        var adminList = await Client.GetAsync("/api/v2/admin/push-campaigns?status=pending_review");

        adminList.StatusCode.Should().Be(HttpStatusCode.OK);
        var adminListJson = await adminList.Content.ReadFromJsonAsync<JsonElement>();
        adminListJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        adminListJson.GetProperty("data").EnumerateArray()
            .Should().Contain(item => item.GetProperty("id").GetInt32() == campaignId
                && item.GetProperty("advertiser_name").GetString() == "Admin User");

        var stats = await Client.GetAsync("/api/v2/admin/push-campaigns/stats");

        stats.StatusCode.Should().Be(HttpStatusCode.OK);
        var statsData = (await stats.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        statsData.GetProperty("total_campaigns").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        statsData.GetProperty("by_status").GetProperty("pending_review").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        statsData.GetProperty("sends_this_month").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        statsData.GetProperty("opens_this_month").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        statsData.GetProperty("revenue_cents_this_month").GetInt32().Should().BeGreaterThanOrEqualTo(0);

        var detail = await Client.GetAsync($"/api/v2/admin/push-campaigns/{campaignId}");

        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailData = (await detail.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        detailData.GetProperty("id").GetInt32().Should().Be(campaignId);
        detailData.GetProperty("analytics").GetProperty("daily_breakdown").ValueKind.Should().Be(JsonValueKind.Array);

        var approve = await Client.PostAsync($"/api/v2/admin/push-campaigns/{campaignId}/approve", null);

        approve.StatusCode.Should().Be(HttpStatusCode.OK);
        var approved = (await approve.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        approved.GetProperty("status").GetString().Should().Be("scheduled");
        approved.GetProperty("approved_by").GetInt32().Should().Be(TestData.AdminUser.Id);
        approved.GetProperty("approved_at").GetString().Should().NotBeNullOrWhiteSpace();

        var dispatch = await Client.PostAsync($"/api/v2/admin/push-campaigns/{campaignId}/dispatch", null);

        dispatch.StatusCode.Should().Be(HttpStatusCode.OK);
        var dispatchData = (await dispatch.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        dispatchData.GetProperty("sent").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        dispatchData.GetProperty("failed").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        dispatchData.GetProperty("total_cost_cents").GetInt32().Should().BeGreaterThanOrEqualTo(0);

        var rejectCreate = await Client.PostAsJsonAsync("/api/v2/me/push-campaigns", new
        {
            name = "Laravel React rejected push campaign",
            title = "Rejected title",
            body = "Rejected body",
            advertiser_type = "sme"
        });
        var rejectCampaignId = (await rejectCreate.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data")
            .GetProperty("id")
            .GetInt32();
        await Client.PostAsync($"/api/v2/me/push-campaigns/{rejectCampaignId}/submit", null);

        var reject = await Client.PostAsJsonAsync($"/api/v2/admin/push-campaigns/{rejectCampaignId}/reject", new
        {
            reason = "Needs clearer targeting."
        });

        reject.StatusCode.Should().Be(HttpStatusCode.OK);
        var rejectData = (await reject.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        rejectData.GetProperty("rejected").GetBoolean().Should().BeTrue();

        var rejectedDetail = await Client.GetAsync($"/api/v2/admin/push-campaigns/{rejectCampaignId}");
        var rejectedDetailData = (await rejectedDetail.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        rejectedDetailData.GetProperty("status").GetString().Should().Be("rejected");
        rejectedDetailData.GetProperty("rejection_reason").GetString().Should().Be("Needs clearer targeting.");
    }

    [Fact]
    public async Task AdminApiPartners_UseLaravelReactManagementShape()
    {
        await AuthenticateAsAdminAsync();

        var create = await Client.PostAsJsonAsync("/api/v2/admin/api-partners", new
        {
            name = "Laravel React Bank Partner",
            contact_email = "bank-partner@example.test",
            description = "Created by Laravel React contract smoke test.",
            allowed_scopes = new[] { "users.read", "wallet.read" },
            allowed_ip_cidrs = new[] { "203.0.113.0/24" },
            rate_limit_per_minute = 120,
            is_sandbox = true
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        createJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var createData = createJson.GetProperty("data");
        var partnerId = createData.GetProperty("partner_id").GetInt32();
        partnerId.Should().BeGreaterThan(0);
        createData.GetProperty("credentials").GetProperty("client_id").GetString().Should().NotBeNullOrWhiteSpace();
        createData.GetProperty("credentials").GetProperty("client_secret").GetString().Should().NotBeNullOrWhiteSpace();

        var list = await Client.GetAsync("/api/v2/admin/api-partners");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var partners = listJson.GetProperty("data").GetProperty("partners").EnumerateArray().ToArray();
        var partner = partners.Single(item => item.GetProperty("id").GetInt32() == partnerId);
        partner.GetProperty("name").GetString().Should().Be("Laravel React Bank Partner");
        partner.GetProperty("slug").GetString().Should().NotBeNullOrWhiteSpace();
        partner.GetProperty("description").GetString().Should().Be("Created by Laravel React contract smoke test.");
        partner.GetProperty("contact_email").GetString().Should().Be("bank-partner@example.test");
        partner.GetProperty("status").GetString().Should().Be("pending");
        partner.GetProperty("is_sandbox").GetBoolean().Should().BeTrue();
        partner.GetProperty("allowed_scopes").EnumerateArray().Select(x => x.GetString()).Should().Equal("users.read", "wallet.read");
        partner.GetProperty("allowed_ip_cidrs").EnumerateArray().Select(x => x.GetString()).Should().Equal("203.0.113.0/24");
        partner.GetProperty("rate_limit_per_minute").GetInt32().Should().Be(120);

        var activate = await Client.PostAsync($"/api/v2/admin/api-partners/{partnerId}/activate", null);

        activate.StatusCode.Should().Be(HttpStatusCode.OK);
        var activated = (await activate.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        activated.GetProperty("partner_id").GetInt32().Should().Be(partnerId);
        activated.GetProperty("status").GetString().Should().Be("active");

        var rotate = await Client.PostAsync($"/api/v2/admin/api-partners/{partnerId}/regenerate-credentials", null);

        rotate.StatusCode.Should().Be(HttpStatusCode.Created);
        var rotatedCredentials = (await rotate.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data")
            .GetProperty("credentials");
        rotatedCredentials.GetProperty("client_id").GetString().Should().NotBeNullOrWhiteSpace();
        rotatedCredentials.GetProperty("client_secret").GetString().Should().NotBeNullOrWhiteSpace();

        var suspend = await Client.PostAsync($"/api/v2/admin/api-partners/{partnerId}/suspend", null);

        suspend.StatusCode.Should().Be(HttpStatusCode.OK);
        var suspended = (await suspend.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        suspended.GetProperty("partner_id").GetInt32().Should().Be(partnerId);
        suspended.GetProperty("status").GetString().Should().Be("suspended");

        var callLog = await Client.GetAsync($"/api/v2/admin/api-partners/{partnerId}/call-log?per_page=50");

        callLog.StatusCode.Should().Be(HttpStatusCode.OK);
        var callLogData = (await callLog.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        callLogData.GetProperty("items").ValueKind.Should().Be(JsonValueKind.Array);
        callLogData.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task UserNotificationPreferences_UseLaravelSettingsShape()
    {
        await AuthenticateAsMemberAsync();

        var initial = await Client.GetAsync("/api/v2/users/me/notifications");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        initialJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var initialData = initialJson.GetProperty("data");
        initialData.GetProperty("email_messages").GetBoolean().Should().BeTrue();
        initialData.GetProperty("email_digest").GetBoolean().Should().BeFalse();
        initialData.GetProperty("federation_notifications_enabled").GetBoolean().Should().BeTrue();
        initialData.GetProperty("push_enabled").GetBoolean().Should().BeTrue();

        var update = await Client.PutAsJsonAsync("/api/v2/users/me/notifications", new
        {
            email_messages = false,
            email_listings = false,
            email_digest = true,
            email_connections = false,
            email_transactions = true,
            email_reviews = false,
            email_gamification_digest = false,
            email_gamification_milestones = true,
            email_org_payments = false,
            email_org_transfers = true,
            email_org_membership = false,
            email_org_admin = true,
            caring_smart_nudges = false,
            push_enabled = false,
            push_campaigns_opted_in = true,
            federation_notifications_enabled = false
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        updateJson.GetProperty("success").GetBoolean().Should().BeTrue();
        updateJson.GetProperty("data").GetProperty("message").GetString().Should().NotBeNullOrWhiteSpace();

        var reloaded = await Client.GetAsync("/api/v2/users/me/notifications");

        reloaded.StatusCode.Should().Be(HttpStatusCode.OK);
        var reloadedData = (await reloaded.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        reloadedData.GetProperty("email_messages").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("email_listings").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("email_digest").GetBoolean().Should().BeTrue();
        reloadedData.GetProperty("email_connections").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("email_transactions").GetBoolean().Should().BeTrue();
        reloadedData.GetProperty("email_reviews").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("email_gamification_digest").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("email_gamification_milestones").GetBoolean().Should().BeTrue();
        reloadedData.GetProperty("email_org_payments").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("email_org_transfers").GetBoolean().Should().BeTrue();
        reloadedData.GetProperty("email_org_membership").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("email_org_admin").GetBoolean().Should().BeTrue();
        reloadedData.GetProperty("caring_smart_nudges").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("push_enabled").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("push_campaigns_opted_in").GetBoolean().Should().BeTrue();
        reloadedData.GetProperty("federation_notifications_enabled").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task UserMatchPreferences_UseLaravelDefaultsAndUpdateShape()
    {
        await AuthenticateAsMemberAsync();

        var initial = await Client.GetAsync("/api/v2/users/me/match-preferences");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        initialJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var initialData = initialJson.GetProperty("data");
        initialData.GetProperty("max_distance_km").GetInt32().Should().Be(25);
        initialData.GetProperty("min_match_score").GetInt32().Should().Be(50);
        initialData.GetProperty("notification_frequency").GetString().Should().Be("monthly");
        initialData.GetProperty("notify_hot_matches").GetBoolean().Should().BeTrue();
        initialData.GetProperty("notify_mutual_matches").GetBoolean().Should().BeTrue();
        initialData.GetProperty("matching_paused").GetBoolean().Should().BeFalse();
        initialData.GetProperty("categories").EnumerateArray().Should().BeEmpty();
        initialData.GetProperty("availability").EnumerateArray().Should().BeEmpty();

        var update = await Client.PutAsJsonAsync("/api/v2/users/me/match-preferences", new
        {
            notification_frequency = "weekly",
            notify_hot_matches = false,
            notify_mutual_matches = false,
            matching_paused = true,
            max_distance_km = 500,
            min_match_score = -3,
            categories = new[] { 3, 5, 5 },
            availability = new[] { "weekends", "weekday_evenings" }
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateData = (await update.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        updateData.GetProperty("notification_frequency").GetString().Should().Be("monthly");
        updateData.GetProperty("notify_hot_matches").GetBoolean().Should().BeFalse();
        updateData.GetProperty("notify_mutual_matches").GetBoolean().Should().BeFalse();
        updateData.GetProperty("matching_paused").GetBoolean().Should().BeTrue();
        updateData.GetProperty("max_distance_km").GetInt32().Should().Be(100);
        updateData.GetProperty("min_match_score").GetInt32().Should().Be(0);
        updateData.GetProperty("categories").EnumerateArray().Select(x => x.GetInt32()).Should().Equal(3, 5, 5);
        updateData.GetProperty("availability").EnumerateArray().Select(x => x.GetString()).Should().Equal("weekends", "weekday_evenings");
    }

    [Fact]
    public async Task UserConsentAndGdprRequest_UseLaravelSettingsShape()
    {
        await AuthenticateAsMemberAsync();

        var initial = await Client.GetAsync("/api/v2/users/me/consent");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        initialJson.GetProperty("success").GetBoolean().Should().BeTrue();
        initialJson.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);

        var update = await Client.PutAsJsonAsync("/api/v2/users/me/consent", new
        {
            slug = "marketing_email",
            given = true
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateData = (await update.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        updateData.GetProperty("consent_type_slug").GetString().Should().Be("marketing_email");
        updateData.GetProperty("given").GetBoolean().Should().BeTrue();

        var reloaded = await Client.GetAsync("/api/v2/users/me/consent");

        reloaded.StatusCode.Should().Be(HttpStatusCode.OK);
        var reloadedData = (await reloaded.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        reloadedData.EnumerateArray()
            .Should().Contain(c => c.GetProperty("consent_type_slug").GetString() == "marketing_email"
                && c.GetProperty("given").GetBoolean());

        var gdpr = await Client.PostAsJsonAsync("/api/v2/users/me/gdpr-request", new
        {
            type = "access",
            notes = "Please send my data export."
        });

        gdpr.StatusCode.Should().Be(HttpStatusCode.Created);
        var gdprData = (await gdpr.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        gdprData.GetProperty("request_id").GetInt32().Should().BeGreaterThan(0);
        gdprData.GetProperty("type").GetString().Should().Be("access");
        gdprData.GetProperty("status").GetString().Should().Be("pending");
    }

    [Fact]
    public async Task UserPreferences_UseLaravelPrivacyFeedAndTranslationShape()
    {
        await AuthenticateAsMemberAsync();

        var initial = await Client.GetAsync("/api/v2/users/me/preferences");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        initialJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var initialData = initialJson.GetProperty("data");
        initialData.GetProperty("privacy").GetProperty("privacy_profile").GetString().Should().Be("public");
        initialData.GetProperty("privacy").GetProperty("privacy_search").GetBoolean().Should().BeTrue();
        initialData.GetProperty("privacy").GetProperty("privacy_contact").GetBoolean().Should().BeTrue();
        initialData.GetProperty("feed").GetProperty("prefers_chronological").GetBoolean().Should().BeFalse();
        initialData.GetProperty("translation").GetProperty("auto_translate_ugc").GetBoolean().Should().BeFalse();

        var update = await Client.PutAsJsonAsync("/api/v2/users/me/preferences", new
        {
            privacy = new
            {
                privacy_profile = "connections",
                privacy_search = false,
                privacy_contact = false
            },
            feed = new
            {
                prefers_chronological = true
            },
            translation = new
            {
                auto_translate_ugc = true,
                auto_translate_target_locale = "ga"
            }
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        updateJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var updateData = updateJson.GetProperty("data");
        updateData.GetProperty("privacy").GetProperty("privacy_profile").GetString().Should().Be("connections");
        updateData.GetProperty("privacy").GetProperty("privacy_search").GetBoolean().Should().BeFalse();
        updateData.GetProperty("privacy").GetProperty("privacy_contact").GetBoolean().Should().BeFalse();
        updateData.GetProperty("feed").GetProperty("prefers_chronological").GetBoolean().Should().BeTrue();
        updateData.GetProperty("translation").GetProperty("auto_translate_ugc").GetBoolean().Should().BeTrue();
        updateData.GetProperty("translation").GetProperty("auto_translate_target_locale").GetString().Should().Be("ga");

        var reloaded = await Client.GetAsync("/api/v2/users/me/preferences");

        reloaded.StatusCode.Should().Be(HttpStatusCode.OK);
        var reloadedData = (await reloaded.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        reloadedData.GetProperty("privacy").GetProperty("privacy_profile").GetString().Should().Be("connections");
        reloadedData.GetProperty("privacy").GetProperty("privacy_search").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("privacy").GetProperty("privacy_contact").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("feed").GetProperty("prefers_chronological").GetBoolean().Should().BeTrue();
        reloadedData.GetProperty("translation").GetProperty("auto_translate_ugc").GetBoolean().Should().BeTrue();
        reloadedData.GetProperty("translation").GetProperty("auto_translate_target_locale").GetString().Should().Be("ga");
    }

    [Fact]
    public async Task SettingsSecurityApis_UseLaravelTwoFactorAndSessionsShape()
    {
        await AuthenticateAsMemberAsync();

        var status = await Client.GetAsync("/api/v2/auth/2fa/status");

        status.StatusCode.Should().Be(HttpStatusCode.OK);
        var statusData = (await status.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        statusData.GetProperty("enabled").GetBoolean().Should().BeFalse();
        statusData.GetProperty("setup_required").GetBoolean().Should().BeFalse();
        statusData.GetProperty("backup_codes_remaining").GetInt32().Should().Be(0);

        var setup = await Client.PostAsync("/api/v2/auth/2fa/setup", null);

        setup.StatusCode.Should().Be(HttpStatusCode.OK);
        var setupData = (await setup.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        setupData.GetProperty("secret").GetString().Should().NotBeNullOrWhiteSpace();
        setupData.GetProperty("qr_code_url").GetString().Should().StartWith("data:image/svg+xml;base64,");
        setupData.GetProperty("backup_codes").ValueKind.Should().Be(JsonValueKind.Array);

        var sessions = await Client.GetAsync("/api/v2/users/me/sessions");

        sessions.StatusCode.Should().Be(HttpStatusCode.OK);
        var sessionsJson = await sessions.Content.ReadFromJsonAsync<JsonElement>();
        sessionsJson.GetProperty("success").GetBoolean().Should().BeTrue();
        sessionsJson.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task UserProfileMe_UsesLaravelOwnProfileShapeAndUpdateFields()
    {
        await AuthenticateAsMemberAsync();

        var initial = await Client.GetAsync("/api/v2/users/me");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        initialJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var initialData = initialJson.GetProperty("data");
        initialData.GetProperty("id").GetInt32().Should().Be(TestData.MemberUser.Id);
        initialData.GetProperty("email").GetString().Should().Be(TestData.MemberUser.Email);
        initialData.GetProperty("profile_type").GetString().Should().Be("individual");
        initialData.TryGetProperty("phone", out _).Should().BeTrue();
        initialData.TryGetProperty("tagline", out _).Should().BeTrue();
        initialData.TryGetProperty("location", out _).Should().BeTrue();
        initialData.TryGetProperty("latitude", out _).Should().BeTrue();
        initialData.TryGetProperty("longitude", out _).Should().BeTrue();
        initialData.TryGetProperty("organization_name", out _).Should().BeTrue();
        initialData.TryGetProperty("date_of_birth", out _).Should().BeTrue();
        initialData.GetProperty("has_2fa_enabled").GetBoolean().Should().BeFalse();

        var update = await Client.PutAsJsonAsync("/api/v2/users/me", new
        {
            first_name = "Taylor",
            last_name = "Timebank",
            name = "Taylor Timebank",
            phone = "+353 1 555 0101",
            tagline = "Community repair mentor",
            bio = "<p>I help neighbours repair bikes.</p>",
            location = "Dublin",
            latitude = 53.3498,
            longitude = -6.2603,
            profile_type = "organisation",
            organization_name = "Taylor Repairs",
            date_of_birth = "1990-01-02"
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateData = (await update.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        updateData.GetProperty("first_name").GetString().Should().Be("Taylor");
        updateData.GetProperty("last_name").GetString().Should().Be("Timebank");
        updateData.GetProperty("name").GetString().Should().Be("Taylor Repairs");
        updateData.GetProperty("phone").GetString().Should().Be("+353 1 555 0101");
        updateData.GetProperty("tagline").GetString().Should().Be("Community repair mentor");
        updateData.GetProperty("bio").GetString().Should().Be("<p>I help neighbours repair bikes.</p>");
        updateData.GetProperty("location").GetString().Should().Be("Dublin");
        updateData.GetProperty("latitude").GetDecimal().Should().Be(53.3498m);
        updateData.GetProperty("longitude").GetDecimal().Should().Be(-6.2603m);
        updateData.GetProperty("profile_type").GetString().Should().Be("organisation");
        updateData.GetProperty("organization_name").GetString().Should().Be("Taylor Repairs");
        updateData.GetProperty("date_of_birth").GetString().Should().Be("1990-01-02");

        var reloaded = await Client.GetAsync("/api/v2/users/me");

        reloaded.StatusCode.Should().Be(HttpStatusCode.OK);
        var reloadedData = (await reloaded.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        reloadedData.GetProperty("name").GetString().Should().Be("Taylor Repairs");
        reloadedData.GetProperty("phone").GetString().Should().Be("+353 1 555 0101");
        reloadedData.GetProperty("tagline").GetString().Should().Be("Community repair mentor");
        reloadedData.GetProperty("profile_type").GetString().Should().Be("organisation");
        reloadedData.GetProperty("organization_name").GetString().Should().Be("Taylor Repairs");
    }

    [Fact]
    public async Task PartnerApiV1_UsesLaravelClientCredentialsAndScopedResponseShapes()
    {
        var (clientId, clientSecret) = await RegisterApiPartnerAsync("users.read listings.read wallet.read wallet.write aggregates.read webhooks.manage");
        ClearAuthToken();

        var unsupportedGrant = await Client.PostAsJsonAsync("/api/partner/v1/oauth/token", new
        {
            grant_type = "password",
            client_id = clientId,
            client_secret = clientSecret
        });

        unsupportedGrant.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var unsupportedJson = await unsupportedGrant.Content.ReadFromJsonAsync<JsonElement>();
        unsupportedJson.GetProperty("errors")[0].GetProperty("code").GetString().Should().Be("unsupported_grant_type");

        var tokenResponse = await Client.PostAsJsonAsync("/api/partner/v1/oauth/token", new
        {
            grant_type = "client_credentials",
            client_id = clientId,
            client_secret = clientSecret,
            scope = "listings.read wallet.read wallet.write aggregates.read webhooks.manage"
        });

        tokenResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        tokenResponse.Headers.GetValues("API-Version").Single().Should().Be("2.0");
        var tokenJson = await tokenResponse.Content.ReadFromJsonAsync<JsonElement>();
        var accessToken = tokenJson.GetProperty("access_token").GetString();
        accessToken.Should().NotBeNullOrWhiteSpace();
        tokenJson.GetProperty("token_type").GetString().Should().Be("bearer");
        tokenJson.GetProperty("expires_in").GetInt32().Should().Be(3600);
        tokenJson.GetProperty("scope").GetString().Should().Be("listings.read wallet.read wallet.write aggregates.read webhooks.manage");

        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var listings = await Client.GetAsync("/api/partner/v1/listings?page=1&per_page=2");
        listings.StatusCode.Should().Be(HttpStatusCode.OK);
        listings.Headers.GetValues("API-Version").Single().Should().Be("2.0");
        var listingsJson = await listings.Content.ReadFromJsonAsync<JsonElement>();
        listingsJson.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        listingsJson.GetProperty("meta").GetProperty("current_page").GetInt32().Should().Be(1);
        listingsJson.GetProperty("meta").GetProperty("per_page").GetInt32().Should().Be(2);

        var aggregate = await Client.GetAsync("/api/partner/v1/aggregates/community");
        aggregate.StatusCode.Should().Be(HttpStatusCode.OK);
        var aggregateData = (await aggregate.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        aggregateData.GetProperty("tenant_id").GetInt32().Should().Be(TestData.Tenant1.Id);
        aggregateData.GetProperty("active_members_bucket").GetInt32().Should().Be(0);
        aggregateData.GetProperty("active_listings_bucket").GetInt32().Should().Be(0);
        aggregateData.GetProperty("generated_at").GetString().Should().NotBeNullOrWhiteSpace();

        var credit = await Client.PostAsJsonAsync("/api/partner/v1/wallet/credit", new
        {
            user_id = TestData.MemberUser.Id,
            hours = 1.25m,
            reference = "settlement-001",
            note = "Bank settlement"
        });

        credit.StatusCode.Should().Be(HttpStatusCode.Created);
        var creditData = (await credit.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        creditData.GetProperty("transaction_id").GetInt32().Should().BeGreaterThan(0);
        creditData.GetProperty("user_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        creditData.GetProperty("hours").GetDecimal().Should().Be(1.25m);
        creditData.GetProperty("reference").GetString().Should().Be("settlement-001");
        creditData.GetProperty("replayed").GetBoolean().Should().BeFalse();

        var balance = await Client.GetAsync($"/api/partner/v1/wallet/balance/{TestData.MemberUser.Id}");

        balance.StatusCode.Should().Be(HttpStatusCode.OK);
        var balanceData = (await balance.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        balanceData.GetProperty("user_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        balanceData.GetProperty("balance_hours").GetDecimal().Should().BeGreaterThan(0m);
        balanceData.GetProperty("currency").GetString().Should().Be("time_credits");

        var webhook = await Client.PostAsJsonAsync("/api/partner/v1/webhooks/subscriptions", new
        {
            event_types = new[] { "wallet.credited" },
            target_url = "https://partner.example.test/hooks/nexus"
        });

        webhook.StatusCode.Should().Be(HttpStatusCode.Created);
        var webhookData = (await webhook.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetProperty("subscription");
        webhookData.GetProperty("event_types").EnumerateArray().Select(x => x.GetString())
            .Should().BeEquivalentTo(["wallet.credited"]);
        webhookData.GetProperty("target_url").GetString().Should().Be("https://partner.example.test/hooks/nexus");
        webhookData.GetProperty("secret").GetString().Should().StartWith("whsec_");
    }

    [Fact]
    public async Task MarketplaceSellerShippingOptions_BySellerId_ReturnsActiveOptions()
    {
        await AuthenticateAsMemberAsync();
        await SeedShippingOptionAsync(TestData.AdminUser.Id);

        var response = await Client.GetAsync($"/api/v2/marketplace/sellers/{TestData.AdminUser.Id}/shipping-options");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = json.GetProperty("data");
        data.ValueKind.Should().Be(JsonValueKind.Array);
        data.EnumerateArray().Should().Contain(item =>
            item.GetProperty("name").GetString() == "Tracked courier" &&
            item.GetProperty("currency").GetString() == "EUR");
    }

    [Fact]
    public async Task MembersSearchAlias_ReturnsLaravelReactArrayShape()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/v2/members/search?q=Admin&limit=5");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = json.GetProperty("data");
        data.ValueKind.Should().Be(JsonValueKind.Array);
        data.EnumerateArray().Should().Contain(item =>
            item.GetProperty("id").GetInt32() == TestData.AdminUser.Id &&
            !string.IsNullOrWhiteSpace(item.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task V2UploadAndList_ReturnNewsletterAssetShape()
    {
        await AuthenticateAsAdminAsync();

        using var form = CreateImageForm();
        var upload = await Client.PostAsync("/api/v2/upload", form);

        upload.StatusCode.Should().Be(HttpStatusCode.Created);
        var uploadJson = await upload.Content.ReadFromJsonAsync<JsonElement>();
        uploadJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var uploaded = uploadJson.GetProperty("data");
        uploaded.GetProperty("url").GetString().Should().StartWith("/api/files/");
        var path = uploaded.GetProperty("path").GetString();
        path.Should().NotBeNullOrWhiteSpace();

        var list = await Client.GetAsync("/api/v2/upload/list");
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        listJson.GetProperty("data").GetProperty("images").EnumerateArray()
            .Should().Contain(image => image.GetProperty("path").GetString() == path);
    }

    [Fact]
    public async Task BookmarkCollectionPatchAlias_UpdatesCurrentUsersCollection()
    {
        await AuthenticateAsMemberAsync();

        var create = await Client.PostAsJsonAsync("/api/v2/bookmark-collections", new
        {
            name = "Original",
            description = "Before"
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = createJson.GetProperty("data").GetProperty("id").GetInt32();

        var patch = await Client.PatchAsJsonAsync($"/api/v2/bookmark-collections/{id}", new
        {
            name = "Updated",
            description = "After"
        });

        patch.StatusCode.Should().Be(HttpStatusCode.OK);
        var patchJson = await patch.Content.ReadFromJsonAsync<JsonElement>();
        patchJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = patchJson.GetProperty("data");
        data.GetProperty("id").GetInt32().Should().Be(id);
        data.GetProperty("name").GetString().Should().Be("Updated");
        data.GetProperty("description").GetString().Should().Be("After");
    }

    [Fact]
    public async Task AdminPrerenderTenantSafety_ReturnsLaravelReactShape()
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync($"/api/v2/admin/prerender/tenant-safety?tenant={TestData.Tenant1.Slug}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = json.GetProperty("data");
        data.GetProperty("tenant").GetProperty("slug").GetString().Should().Be(TestData.Tenant1.Slug);
        data.GetProperty("counts").TryGetProperty("expected", out _).Should().BeTrue();
        data.GetProperty("static_routes").ValueKind.Should().Be(JsonValueKind.Array);
        data.GetProperty("snapshots").ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task AdminWindowOpenAndDownloadContracts_UseExpectedMethods()
    {
        await AuthenticateAsAdminAsync();

        var template = await Client.GetAsync("/api/v2/admin/users/import/template");
        template.StatusCode.Should().Be(HttpStatusCode.OK);
        template.Content.Headers.ContentType?.MediaType.Should().NotBeNullOrWhiteSpace();

        var export = await Client.PostAsJsonAsync("/api/v2/admin/federation/data/export", new { });
        export.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        export.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Fact]
    public async Task AdminSession_FormToken_BridgesToLegacyAdminRedirect()
    {
        var token = await GetAccessTokenAsync("admin@test.com", "test-tenant");
        ClearAuthToken();
        using var redirectClient = Factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var response = await redirectClient.PostAsync("/api/auth/admin-session", new FormUrlEncodedContent([
            new KeyValuePair<string, string>("token", token),
            new KeyValuePair<string, string>("redirect", "/admin-legacy")
        ]));

        response.StatusCode.Should().Be(HttpStatusCode.Redirect);
        response.Headers.Location?.ToString().Should().Be("/admin-legacy");
    }

    [Fact]
    public async Task AdminAttributesV2_ReturnsLaravelReactAttributeShape()
    {
        await AuthenticateAsAdminAsync();

        var create = await Client.PostAsJsonAsync("/api/v2/admin/attributes", new
        {
            name = "Skill Level",
            type = "select",
            category_id = (int?)null
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        var created = createJson.GetProperty("data");
        created.GetProperty("slug").GetString().Should().Be("skill-level");
        created.GetProperty("type").GetString().Should().Be("select");
        created.GetProperty("category_id").ValueKind.Should().Be(JsonValueKind.Null);
        created.GetProperty("is_active").GetBoolean().Should().BeTrue();
        var id = created.GetProperty("id").GetInt32();

        var list = await Client.GetAsync("/api/v2/admin/attributes");
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        var listed = listJson.GetProperty("data").EnumerateArray()
            .Single(attribute => attribute.GetProperty("id").GetInt32() == id);
        listed.GetProperty("slug").GetString().Should().Be("skill-level");
        listed.GetProperty("options").ValueKind.Should().Be(JsonValueKind.Null);
        listed.GetProperty("category_name").ValueKind.Should().Be(JsonValueKind.Null);
        listed.GetProperty("target_type").GetString().Should().Be("any");

        var update = await Client.PutAsJsonAsync($"/api/v2/admin/attributes/{id}", new
        {
            name = "Skill Rating",
            is_active = false
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        var updated = updateJson.GetProperty("data");
        updated.GetProperty("slug").GetString().Should().Be("skill-rating");
        updated.GetProperty("is_active").GetBoolean().Should().BeFalse();

        var delete = await Client.DeleteAsync($"/api/v2/admin/attributes/{id}");
        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("data").GetProperty("deleted").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task AdminBackgroundJobsV2_ReturnsLaravelReactOperationsShape()
    {
        await AuthenticateAsAdminAsync();

        var list = await Client.GetAsync("/api/v2/admin/background-jobs");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        var jobs = listJson.GetProperty("data").EnumerateArray().ToList();
        jobs.Select(job => job.GetProperty("id").GetString()).Should().BeEquivalentTo([
            "digest_emails",
            "badge_checker",
            "streak_updater"
        ]);
        jobs.Should().OnlyContain(job => HasLaravelBackgroundJobShape(job));

        var run = await Client.PostAsync("/api/v2/admin/background-jobs/digest_emails/run", null);

        run.StatusCode.Should().Be(HttpStatusCode.OK);
        var runJson = await run.Content.ReadFromJsonAsync<JsonElement>();
        runJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = runJson.GetProperty("data");
        data.GetProperty("triggered").GetBoolean().Should().BeTrue();
        data.GetProperty("job").GetString().Should().Be("digest_emails");
    }

    [Fact]
    public async Task AdminCacheStatsV2_ReturnsLaravelReactOperationsShape()
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync("/api/v2/admin/cache/stats");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        data.GetProperty("redis_connected").ValueKind.Should().BeOneOf(JsonValueKind.True, JsonValueKind.False);
        data.GetProperty("redis_memory_used").GetString().Should().NotBeNullOrWhiteSpace();
        data.GetProperty("redis_keys_count").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        data.GetProperty("cache_hit_rate").GetDouble().Should().BeGreaterThanOrEqualTo(0);

        var clear = await Client.PostAsJsonAsync("/api/v2/admin/cache/clear", new { type = "tenant" });
        clear.StatusCode.Should().Be(HttpStatusCode.OK);
        var clearJson = await clear.Content.ReadFromJsonAsync<JsonElement>();
        clearJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var clearData = clearJson.GetProperty("data");
        clearData.GetProperty("cleared").GetBoolean().Should().BeTrue();
        clearData.GetProperty("type").GetString().Should().Be("tenant");
    }

    [Fact]
    public async Task AdminLanguageConfigV2_AcceptsAndReturnsLaravelReactSupportedLanguagesShape()
    {
        await AuthenticateAsAdminAsync();

        var update = await Client.PutAsJsonAsync("/api/v2/admin/config/languages", new
        {
            default_language = "ga",
            supported_languages = new[] { "en", "ga", "fr" }
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        var updateData = updateJson.GetProperty("data");
        updateData.GetProperty("default_language").GetString().Should().Be("ga");
        updateData.GetProperty("supported_languages").EnumerateArray().Select(x => x.GetString())
            .Should().BeEquivalentTo(["en", "ga", "fr"]);

        var get = await Client.GetAsync("/api/v2/admin/config/languages");

        get.StatusCode.Should().Be(HttpStatusCode.OK);
        var getJson = await get.Content.ReadFromJsonAsync<JsonElement>();
        getJson.GetProperty("default_language").GetString().Should().Be("ga");
        getJson.GetProperty("supported_languages").EnumerateArray().Select(x => x.GetString())
            .Should().BeEquivalentTo(["en", "ga", "fr"]);
    }

    [Fact]
    public async Task AdminGroupConfigV2_ReturnsAndPersistsLaravelReactModuleConfigShape()
    {
        await AuthenticateAsAdminAsync();

        var initial = await Client.GetAsync("/api/v2/admin/config/groups");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        var initialData = initialJson.GetProperty("data");
        initialData.GetProperty("config").ValueKind.Should().Be(JsonValueKind.Object);
        initialData.GetProperty("defaults").ValueKind.Should().Be(JsonValueKind.Object);

        var singleUpdate = await Client.PutAsJsonAsync("/api/v2/admin/config/groups", new
        {
            key = "max_members_per_group",
            value = 250
        });

        singleUpdate.StatusCode.Should().Be(HttpStatusCode.OK);
        var singleJson = await singleUpdate.Content.ReadFromJsonAsync<JsonElement>();
        var singleData = singleJson.GetProperty("data");
        singleData.GetProperty("key").GetString().Should().Be("max_members_per_group");
        singleData.GetProperty("value").GetInt32().Should().Be(250);

        var bulkUpdate = await Client.PutAsJsonAsync("/api/v2/admin/config/groups/bulk", new
        {
            settings = new
            {
                allow_private_groups = true,
                max_members_per_group = 300
            }
        });

        bulkUpdate.StatusCode.Should().Be(HttpStatusCode.OK);
        var bulkJson = await bulkUpdate.Content.ReadFromJsonAsync<JsonElement>();
        var updated = bulkJson.GetProperty("data").GetProperty("updated");
        updated.GetProperty("allow_private_groups").GetBoolean().Should().BeTrue();
        updated.GetProperty("max_members_per_group").GetInt32().Should().Be(300);

        var saved = await Client.GetAsync("/api/v2/admin/config/groups");
        saved.StatusCode.Should().Be(HttpStatusCode.OK);
        var savedJson = await saved.Content.ReadFromJsonAsync<JsonElement>();
        var config = savedJson.GetProperty("data").GetProperty("config");
        config.GetProperty("allow_private_groups").GetBoolean().Should().BeTrue();
        config.GetProperty("max_members_per_group").GetInt32().Should().Be(300);
    }

    [Fact]
    public async Task AdminIdentityConfigV2_ReturnsAndPersistsLaravelReactModuleConfigShape()
    {
        await AuthenticateAsAdminAsync();

        var initial = await Client.GetAsync("/api/v2/admin/config/identity");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        var initialData = initialJson.GetProperty("data");
        initialData.GetProperty("config").GetProperty("identity_verification_fee_cents")
            .GetInt32().Should().Be(500);
        initialData.GetProperty("defaults").GetProperty("identity_verification_fee_cents")
            .GetInt32().Should().Be(500);

        var bulkUpdate = await Client.PutAsJsonAsync("/api/v2/admin/config/identity/bulk", new
        {
            settings = new
            {
                identity_verification_fee_cents = 0
            }
        });

        bulkUpdate.StatusCode.Should().Be(HttpStatusCode.OK);
        var bulkJson = await bulkUpdate.Content.ReadFromJsonAsync<JsonElement>();
        bulkJson.GetProperty("data").GetProperty("updated")
            .GetProperty("identity_verification_fee_cents").GetInt32().Should().Be(0);

        var saved = await Client.GetAsync("/api/v2/admin/config/identity");
        saved.StatusCode.Should().Be(HttpStatusCode.OK);
        var savedJson = await saved.Content.ReadFromJsonAsync<JsonElement>();
        savedJson.GetProperty("data").GetProperty("config")
            .GetProperty("identity_verification_fee_cents").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task AdminTranslationConfigV2_ReturnsAndPersistsLaravelReactConfigShape()
    {
        await AuthenticateAsAdminAsync();

        var initial = await Client.GetAsync("/api/v2/admin/config/translation");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        var initialData = initialJson.GetProperty("data");
        initialData.GetProperty("config").GetProperty("translation.engine")
            .GetString().Should().Be("openai");
        initialData.GetProperty("defaults").GetProperty("translation.max_per_user_per_hour")
            .GetInt32().Should().Be(100);

        var update = await Client.PutAsJsonAsync("/api/v2/admin/config/translation", new
        {
            key = "translation.auto_translate_default",
            value = true
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        var updateData = updateJson.GetProperty("data");
        updateData.GetProperty("key").GetString().Should().Be("translation.auto_translate_default");
        updateData.GetProperty("value").GetBoolean().Should().BeTrue();

        var saved = await Client.GetAsync("/api/v2/admin/config/translation");
        saved.StatusCode.Should().Be(HttpStatusCode.OK);
        var savedJson = await saved.Content.ReadFromJsonAsync<JsonElement>();
        savedJson.GetProperty("data").GetProperty("config")
            .GetProperty("translation.auto_translate_default").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task AdminTranslationGlossaryV2_ReturnsCreatesAndDeletesLaravelReactShape()
    {
        await AuthenticateAsAdminAsync();

        var empty = await Client.GetAsync("/api/v2/admin/translation/glossary?language=ga");

        empty.StatusCode.Should().Be(HttpStatusCode.OK);
        var emptyJson = await empty.Content.ReadFromJsonAsync<JsonElement>();
        emptyJson.GetProperty("data").GetProperty("items").ValueKind.Should().Be(JsonValueKind.Array);
        emptyJson.GetProperty("data").GetProperty("total").GetInt32().Should().Be(0);

        var create = await Client.PostAsJsonAsync("/api/v2/admin/translation/glossary", new
        {
            source_term = "hello",
            target_term = "dia dhuit",
            target_language = "ga"
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        var createdId = createJson.GetProperty("data").GetProperty("id").GetInt32();
        createdId.Should().BeGreaterThan(0);

        var list = await Client.GetAsync("/api/v2/admin/translation/glossary?language=ga");
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        var data = listJson.GetProperty("data");
        data.GetProperty("total").GetInt32().Should().Be(1);
        var item = data.GetProperty("items").EnumerateArray().Single();
        item.GetProperty("id").GetInt32().Should().Be(createdId);
        item.GetProperty("source_term").GetString().Should().Be("hello");
        item.GetProperty("target_term").GetString().Should().Be("dia dhuit");
        item.GetProperty("target_language").GetString().Should().Be("ga");
        item.GetProperty("is_active").GetBoolean().Should().BeTrue();

        var delete = await Client.DeleteAsync($"/api/v2/admin/translation/glossary/{createdId}");
        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("data").GetProperty("deleted").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task AdminListingConfigV2_ReturnsFrontendDefaultsAndPersistsUpdates()
    {
        await AuthenticateAsAdminAsync();

        var initial = await Client.GetAsync("/api/v2/admin/config/listings");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        var defaults = initialJson.GetProperty("data").GetProperty("defaults");
        defaults.GetProperty("listing.max_per_user").GetInt32().Should().Be(50);
        defaults.GetProperty("listing.max_images").GetInt32().Should().Be(5);
        defaults.GetProperty("listing.allow_offers").GetBoolean().Should().BeTrue();
        defaults.GetProperty("listing.enable_map_view").GetBoolean().Should().BeTrue();

        var update = await Client.PutAsJsonAsync("/api/v2/admin/config/listings", new
        {
            key = "listing.max_per_user",
            value = 25
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        updateJson.GetProperty("data").GetProperty("value").GetInt32().Should().Be(25);

        var bulk = await Client.PutAsJsonAsync("/api/v2/admin/config/listings/bulk", new
        {
            settings = new Dictionary<string, object?>
            {
                ["listing.max_images"] = 3,
                ["listing.require_image"] = true
            }
        });

        bulk.StatusCode.Should().Be(HttpStatusCode.OK);
        var bulkJson = await bulk.Content.ReadFromJsonAsync<JsonElement>();
        var updated = bulkJson.GetProperty("data").GetProperty("updated");
        updated.GetProperty("listing.max_images").GetInt32().Should().Be(3);
        updated.GetProperty("listing.require_image").GetBoolean().Should().BeTrue();

        var saved = await Client.GetAsync("/api/v2/admin/config/listings");
        saved.StatusCode.Should().Be(HttpStatusCode.OK);
        var config = (await saved.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data").GetProperty("config");
        config.GetProperty("listing.max_per_user").GetInt32().Should().Be(25);
        config.GetProperty("listing.max_images").GetInt32().Should().Be(3);
        config.GetProperty("listing.require_image").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task AdminVolunteeringConfigV2_ReturnsFrontendDefaultsAndPersistsBulkUpdates()
    {
        await AuthenticateAsAdminAsync();

        var initial = await Client.GetAsync("/api/v2/admin/config/volunteering");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        var defaults = initialJson.GetProperty("data").GetProperty("defaults");
        defaults.GetProperty("volunteering.tab_opportunities").GetBoolean().Should().BeTrue();
        defaults.GetProperty("volunteering.cancellation_deadline_hours").GetInt32().Should().Be(24);
        defaults.GetProperty("volunteering.max_hours_per_shift").GetInt32().Should().Be(8);
        defaults.GetProperty("volunteering.expense_max_amount").GetInt32().Should().Be(500);
        defaults.GetProperty("volunteering.enable_matching").GetBoolean().Should().BeTrue();

        var bulk = await Client.PutAsJsonAsync("/api/v2/admin/config/volunteering/bulk", new
        {
            settings = new Dictionary<string, object?>
            {
                ["volunteering.max_hours_per_shift"] = 6,
                ["volunteering.expense_require_receipt"] = true,
                ["volunteering.enable_matching"] = false
            }
        });

        bulk.StatusCode.Should().Be(HttpStatusCode.OK);
        var bulkJson = await bulk.Content.ReadFromJsonAsync<JsonElement>();
        var updated = bulkJson.GetProperty("data").GetProperty("updated");
        updated.GetProperty("volunteering.max_hours_per_shift").GetInt32().Should().Be(6);
        updated.GetProperty("volunteering.expense_require_receipt").GetBoolean().Should().BeTrue();
        updated.GetProperty("volunteering.enable_matching").GetBoolean().Should().BeFalse();

        var saved = await Client.GetAsync("/api/v2/admin/config/volunteering");
        saved.StatusCode.Should().Be(HttpStatusCode.OK);
        var config = (await saved.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data").GetProperty("config");
        config.GetProperty("volunteering.max_hours_per_shift").GetInt32().Should().Be(6);
        config.GetProperty("volunteering.expense_require_receipt").GetBoolean().Should().BeTrue();
        config.GetProperty("volunteering.enable_matching").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task AdminJobsConfigV2_ReturnsFrontendDefaultsAndPersistsBulkUpdates()
    {
        await AuthenticateAsAdminAsync();

        var initial = await Client.GetAsync("/api/v2/admin/config/jobs");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        var defaults = initialJson.GetProperty("data").GetProperty("defaults");
        defaults.GetProperty("jobs.tab_browse").GetBoolean().Should().BeTrue();
        defaults.GetProperty("jobs.default_currency").GetString().Should().Be("EUR");
        defaults.GetProperty("jobs.max_postings_per_user").GetInt32().Should().Be(20);
        defaults.GetProperty("jobs.default_deadline_days").GetInt32().Should().Be(30);
        defaults.GetProperty("jobs.enable_cv_upload").GetBoolean().Should().BeTrue();
        defaults.GetProperty("jobs.featured_duration_days").GetInt32().Should().Be(7);

        var bulk = await Client.PutAsJsonAsync("/api/v2/admin/config/jobs/bulk", new
        {
            settings = new Dictionary<string, object?>
            {
                ["jobs.max_postings_per_user"] = 12,
                ["jobs.require_salary"] = true,
                ["jobs.enable_blind_hiring"] = true
            }
        });

        bulk.StatusCode.Should().Be(HttpStatusCode.OK);
        var bulkJson = await bulk.Content.ReadFromJsonAsync<JsonElement>();
        var updated = bulkJson.GetProperty("data").GetProperty("updated");
        updated.GetProperty("jobs.max_postings_per_user").GetInt32().Should().Be(12);
        updated.GetProperty("jobs.require_salary").GetBoolean().Should().BeTrue();
        updated.GetProperty("jobs.enable_blind_hiring").GetBoolean().Should().BeTrue();

        var saved = await Client.GetAsync("/api/v2/admin/config/jobs");
        saved.StatusCode.Should().Be(HttpStatusCode.OK);
        var config = (await saved.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data").GetProperty("config");
        config.GetProperty("jobs.max_postings_per_user").GetInt32().Should().Be(12);
        config.GetProperty("jobs.require_salary").GetBoolean().Should().BeTrue();
        config.GetProperty("jobs.enable_blind_hiring").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task AdminPodcastConfigV2_ReturnsFrontendDefaultsAndPersistsBulkUpdates()
    {
        await AuthenticateAsAdminAsync();

        var initial = await Client.GetAsync("/api/v2/admin/config/podcasts");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        var defaults = initialJson.GetProperty("defaults");
        defaults.GetProperty("podcasts.allow_member_show_creation").GetBoolean().Should().BeTrue();
        defaults.GetProperty("podcasts.max_shows_per_user").GetInt32().Should().Be(5);
        defaults.GetProperty("podcasts.max_audio_size_mb").GetInt32().Should().Be(250);
        defaults.GetProperty("podcasts.enable_media_scanning").GetBoolean().Should().BeTrue();
        defaults.GetProperty("podcasts.enable_media_processing").GetBoolean().Should().BeTrue();

        var bulk = await Client.PutAsJsonAsync("/api/v2/admin/config/podcasts/bulk", new
        {
            settings = new Dictionary<string, object?>
            {
                ["podcasts.max_shows_per_user"] = 2,
                ["podcasts.enable_rss_feed"] = false,
                ["podcasts.media_storage_driver"] = "cloud"
            }
        });

        bulk.StatusCode.Should().Be(HttpStatusCode.OK);
        var bulkJson = await bulk.Content.ReadFromJsonAsync<JsonElement>();
        var updated = bulkJson.GetProperty("updated");
        updated.GetProperty("podcasts.max_shows_per_user").GetInt32().Should().Be(2);
        updated.GetProperty("podcasts.enable_rss_feed").GetBoolean().Should().BeFalse();
        updated.GetProperty("podcasts.media_storage_driver").GetString().Should().Be("cloud");

        var saved = await Client.GetAsync("/api/v2/admin/config/podcasts");
        saved.StatusCode.Should().Be(HttpStatusCode.OK);
        var config = (await saved.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("config");
        config.GetProperty("podcasts.max_shows_per_user").GetInt32().Should().Be(2);
        config.GetProperty("podcasts.enable_rss_feed").GetBoolean().Should().BeFalse();
        config.GetProperty("podcasts.media_storage_driver").GetString().Should().Be("cloud");
    }

    [Fact]
    public async Task AdminPodcastsV2_UsesLaravelReactIndexAndModerationShape()
    {
        await AuthenticateAsAdminAsync();

        var createShow = await Client.PostAsJsonAsync("/api/v2/podcasts", new
        {
            title = $"Laravel React Podcast {Guid.NewGuid():N}",
            summary = "Podcast admin contract show.",
            language = "en",
            category = "community",
            visibility = "public"
        });
        createShow.StatusCode.Should().Be(HttpStatusCode.Created);
        var showId = (await createShow.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data")
            .GetProperty("id")
            .GetInt32();

        var createEpisode = await Client.PostAsJsonAsync($"/api/v2/podcasts/{showId}/episodes", new
        {
            title = "Laravel React Podcast Episode",
            summary = "Podcast admin contract episode.",
            audio_url = "https://cdn.example.test/podcast-admin.mp3",
            duration_seconds = 120
        });
        createEpisode.StatusCode.Should().Be(HttpStatusCode.Created);
        var episodeId = (await createEpisode.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data")
            .GetProperty("id")
            .GetInt32();

        var index = await Client.GetAsync("/api/v2/admin/podcasts?moderation_status=pending&shows_page=1&episodes_page=1&per_page=20");

        index.StatusCode.Should().Be(HttpStatusCode.OK);
        var indexJson = await index.Content.ReadFromJsonAsync<JsonElement>();
        indexJson.GetProperty("success").GetBoolean().Should().BeTrue();
        indexJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var indexData = indexJson.GetProperty("data");
        indexData.GetProperty("shows").EnumerateArray().Should().Contain(row => row.GetProperty("id").GetInt32() == showId);
        indexData.GetProperty("episodes").EnumerateArray().Should().Contain(row => row.GetProperty("id").GetInt32() == episodeId);
        indexData.GetProperty("stats").GetProperty("pending_shows").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        indexData.GetProperty("stats").GetProperty("pending_episodes").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        indexJson.GetProperty("meta").GetProperty("shows_total").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        indexJson.GetProperty("meta").GetProperty("episodes_total").GetInt32().Should().BeGreaterThanOrEqualTo(1);

        var moderateShow = await Client.PostAsJsonAsync($"/api/v2/admin/podcasts/shows/{showId}/moderate", new { action = "approve" });

        moderateShow.StatusCode.Should().Be(HttpStatusCode.OK);
        var moderateShowJson = await moderateShow.Content.ReadFromJsonAsync<JsonElement>();
        moderateShowJson.GetProperty("success").GetBoolean().Should().BeTrue();
        moderateShowJson.GetProperty("data").GetProperty("moderation_status").GetString().Should().Be("approved");

        var moderateEpisode = await Client.PostAsJsonAsync($"/api/v2/admin/podcasts/episodes/{episodeId}/moderate", new { action = "reject" });

        moderateEpisode.StatusCode.Should().Be(HttpStatusCode.OK);
        var moderateEpisodeJson = await moderateEpisode.Content.ReadFromJsonAsync<JsonElement>();
        moderateEpisodeJson.GetProperty("success").GetBoolean().Should().BeTrue();
        moderateEpisodeJson.GetProperty("data").GetProperty("moderation_status").GetString().Should().Be("rejected");
    }

    [Fact]
    public async Task AdminRegistrationPolicyV2_UsesLaravelReactPolicyProviderAndCredentialShape()
    {
        await AuthenticateAsAdminAsync();

        var policy = await Client.GetAsync("/api/v2/admin/config/registration-policy");

        policy.StatusCode.Should().Be(HttpStatusCode.OK);
        var policyJson = await policy.Content.ReadFromJsonAsync<JsonElement>();
        policyJson.GetProperty("success").GetBoolean().Should().BeTrue();
        policyJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var policyData = policyJson.GetProperty("data");
        policyData.GetProperty("registration_mode").GetString().Should().NotBeNullOrWhiteSpace();
        policyData.GetProperty("verification_level").GetString().Should().NotBeNullOrWhiteSpace();
        policyData.GetProperty("post_verification").GetString().Should().NotBeNullOrWhiteSpace();
        policyData.GetProperty("fallback_mode").GetString().Should().NotBeNullOrWhiteSpace();
        policyData.GetProperty("require_email_verify").ValueKind.Should().BeOneOf(JsonValueKind.True, JsonValueKind.False);

        var providers = await Client.GetAsync("/api/v2/admin/identity/providers");

        providers.StatusCode.Should().Be(HttpStatusCode.OK);
        var providersJson = await providers.Content.ReadFromJsonAsync<JsonElement>();
        providersJson.GetProperty("success").GetBoolean().Should().BeTrue();
        providersJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        providersJson.GetProperty("data").EnumerateArray()
            .Should().Contain(provider =>
                provider.GetProperty("slug").GetString() == "veriff" &&
                provider.GetProperty("levels").ValueKind == JsonValueKind.Array &&
                HasProperty(provider, "available") &&
                HasProperty(provider, "has_credentials"));

        var update = await Client.PutAsJsonAsync("/api/v2/admin/config/registration-policy", new
        {
            registration_mode = "verified_identity",
            verification_provider = "veriff",
            verification_level = "document_selfie",
            post_verification = "admin_approval",
            fallback_mode = "admin_review",
            require_email_verify = true
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        updateJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var updatedPolicy = updateJson.GetProperty("data");
        updatedPolicy.GetProperty("registration_mode").GetString().Should().Be("verified_identity");
        updatedPolicy.GetProperty("verification_provider").GetString().Should().Be("veriff");
        updatedPolicy.GetProperty("verification_level").GetString().Should().Be("document_selfie");
        updatedPolicy.GetProperty("post_verification").GetString().Should().Be("admin_approval");
        updatedPolicy.GetProperty("fallback_mode").GetString().Should().Be("admin_review");
        updatedPolicy.GetProperty("require_email_verify").GetBoolean().Should().BeTrue();

        var saveCredentials = await Client.PutAsJsonAsync("/api/v2/admin/identity/provider-credentials/veriff", new
        {
            api_key = "contract-veriff-key",
            webhook_secret = "contract-veriff-secret"
        });

        saveCredentials.StatusCode.Should().Be(HttpStatusCode.OK);
        var saveJson = await saveCredentials.Content.ReadFromJsonAsync<JsonElement>();
        saveJson.GetProperty("success").GetBoolean().Should().BeTrue();
        saveJson.GetProperty("data").GetProperty("saved").GetBoolean().Should().BeTrue();
        saveJson.GetProperty("data").GetProperty("provider_slug").GetString().Should().Be("veriff");

        var deleteCredentials = await Client.DeleteAsync("/api/v2/admin/identity/provider-credentials/veriff");

        deleteCredentials.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await deleteCredentials.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("success").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("deleted").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("provider_slug").GetString().Should().Be("veriff");
    }

    [Fact]
    public async Task AdminFederationNeighborhoodsV2_UsesLaravelReactCrudAndMembershipShape()
    {
        await AuthenticateAsAdminAsync();

        var available = await Client.GetAsync("/api/v2/admin/federation/available-tenants");

        available.StatusCode.Should().Be(HttpStatusCode.OK);
        var availableJson = await available.Content.ReadFromJsonAsync<JsonElement>();
        availableJson.GetProperty("success").GetBoolean().Should().BeTrue();
        availableJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var availableTenants = availableJson.GetProperty("data").EnumerateArray().ToArray();
        availableTenants.Should().Contain(t =>
            t.GetProperty("id").GetInt32() == TestData.Tenant2.Id &&
            t.GetProperty("name").GetString() == TestData.Tenant2.Name &&
            t.GetProperty("slug").GetString() == TestData.Tenant2.Slug);

        var create = await Client.PostAsJsonAsync("/api/v2/admin/federation/neighborhoods", new
        {
            name = $"Laravel React Neighborhood {Guid.NewGuid():N}",
            description = "Runtime contract neighborhood"
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        createJson.GetProperty("success").GetBoolean().Should().BeTrue();
        createJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var created = createJson.GetProperty("data");
        var neighborhoodId = created.GetProperty("id").GetInt32();
        created.GetProperty("name").GetString().Should().StartWith("Laravel React Neighborhood");
        created.GetProperty("description").GetString().Should().Be("Runtime contract neighborhood");
        created.GetProperty("tenants").ValueKind.Should().Be(JsonValueKind.Array);
        created.GetProperty("tenant_count").GetInt32().Should().Be(0);
        created.GetProperty("total_members").GetInt32().Should().Be(0);
        created.GetProperty("shared_events_count").GetInt32().Should().Be(0);
        created.GetProperty("created_at").GetString().Should().NotBeNullOrWhiteSpace();

        var addTenant = await Client.PostAsJsonAsync($"/api/v2/admin/federation/neighborhoods/{neighborhoodId}/tenants", new
        {
            tenant_id = TestData.Tenant2.Id
        });

        addTenant.StatusCode.Should().Be(HttpStatusCode.OK);
        var addTenantJson = await addTenant.Content.ReadFromJsonAsync<JsonElement>();
        addTenantJson.GetProperty("success").GetBoolean().Should().BeTrue();

        var list = await Client.GetAsync("/api/v2/admin/federation/neighborhoods");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        listJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var listed = listJson.GetProperty("data").EnumerateArray()
            .Single(n => n.GetProperty("id").GetInt32() == neighborhoodId);
        listed.GetProperty("tenant_count").GetInt32().Should().Be(1);
        listed.GetProperty("tenants").EnumerateArray().Should().Contain(t =>
            t.GetProperty("tenant_id").GetInt32() == TestData.Tenant2.Id &&
            t.GetProperty("name").GetString() == TestData.Tenant2.Name &&
            t.GetProperty("slug").GetString() == TestData.Tenant2.Slug);
        listed.GetProperty("total_members").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        listed.GetProperty("shared_events_count").GetInt32().Should().BeGreaterThanOrEqualTo(0);

        var removeTenant = await Client.DeleteAsync($"/api/v2/admin/federation/neighborhoods/{neighborhoodId}/tenants/{TestData.Tenant2.Id}");

        removeTenant.StatusCode.Should().Be(HttpStatusCode.OK);
        var removeTenantJson = await removeTenant.Content.ReadFromJsonAsync<JsonElement>();
        removeTenantJson.GetProperty("success").GetBoolean().Should().BeTrue();

        var delete = await Client.DeleteAsync($"/api/v2/admin/federation/neighborhoods/{neighborhoodId}");

        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("success").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("success").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task AdminCommunityAnalyticsV2_UsesLaravelReactDashboardGeographyAndExportShape()
    {
        await AuthenticateAsAdminAsync();

        var dashboard = await Client.GetAsync("/api/v2/admin/community-analytics");

        dashboard.StatusCode.Should().Be(HttpStatusCode.OK);
        var dashboardJson = await dashboard.Content.ReadFromJsonAsync<JsonElement>();
        dashboardJson.GetProperty("success").GetBoolean().Should().BeTrue();
        dashboardJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var data = dashboardJson.GetProperty("data");
        var overview = data.GetProperty("overview");
        overview.GetProperty("total_credits_circulation").ValueKind.Should().Be(JsonValueKind.Number);
        overview.GetProperty("transaction_volume_30d").ValueKind.Should().Be(JsonValueKind.Number);
        overview.GetProperty("transaction_count_30d").ValueKind.Should().Be(JsonValueKind.Number);
        overview.GetProperty("active_traders_30d").ValueKind.Should().Be(JsonValueKind.Number);
        overview.GetProperty("new_users_30d").ValueKind.Should().Be(JsonValueKind.Number);
        overview.GetProperty("avg_transaction_size").ValueKind.Should().Be(JsonValueKind.Number);
        data.GetProperty("monthly_trends").GetArrayLength().Should().Be(12);
        data.GetProperty("weekly_trends").GetArrayLength().Should().Be(12);
        data.GetProperty("top_earners").ValueKind.Should().Be(JsonValueKind.Array);
        data.GetProperty("top_spenders").ValueKind.Should().Be(JsonValueKind.Array);
        data.GetProperty("category_demand").ValueKind.Should().Be(JsonValueKind.Array);
        data.GetProperty("engagement_rate").ValueKind.Should().Be(JsonValueKind.Number);

        var geography = await Client.GetAsync("/api/v2/admin/community-analytics/geography");

        geography.StatusCode.Should().Be(HttpStatusCode.OK);
        var geographyJson = await geography.Content.ReadFromJsonAsync<JsonElement>();
        geographyJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var geographyData = geographyJson.GetProperty("data");
        geographyData.GetProperty("member_locations").ValueKind.Should().Be(JsonValueKind.Array);
        geographyData.GetProperty("total_with_location").ValueKind.Should().Be(JsonValueKind.Number);
        geographyData.GetProperty("total_members").ValueKind.Should().Be(JsonValueKind.Number);
        geographyData.GetProperty("coverage_percentage").ValueKind.Should().Be(JsonValueKind.Number);
        geographyData.GetProperty("top_areas").ValueKind.Should().Be(JsonValueKind.Array);

        var export = await Client.GetAsync("/api/v2/admin/community-analytics/export");

        export.StatusCode.Should().Be(HttpStatusCode.OK);
        export.Content.Headers.ContentType?.MediaType.Should().Be("text/csv");
        export.Content.Headers.ContentDisposition?.FileName.Should().Contain("community-analytics.csv");
        var csv = await export.Content.ReadAsStringAsync();
        csv.Split('\n')[0].Trim().Should().Be("Month,New Users,Active Traders,Transactions,Hours Exchanged");
    }

    [Fact]
    public async Task AdminCommentsV2_UsesLaravelReactModerationListDetailHideAndDeleteShape()
    {
        await AuthenticateAsAdminAsync();
        var commentId = await SeedAdminFeedCommentAsync("Laravel React moderation comment");

        var list = await Client.GetAsync("/api/v2/admin/comments?content_type=post&search=Laravel%20React%20moderation&page=1&limit=20");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        listJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var listed = listJson.GetProperty("data").EnumerateArray()
            .Single(comment => comment.GetProperty("id").GetInt32() == commentId);
        listed.GetProperty("user_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        listed.GetProperty("tenant_id").GetInt32().Should().Be(TestData.Tenant1.Id);
        listed.GetProperty("tenant_name").GetString().Should().Be(TestData.Tenant1.Name);
        listed.GetProperty("user_name").GetString().Should().Contain(TestData.MemberUser.FirstName);
        listed.GetProperty("target_type").GetString().Should().Be("post");
        listed.GetProperty("content_type").GetString().Should().Be("post");
        listed.GetProperty("content").GetString().Should().Contain("Laravel React moderation comment");
        listed.GetProperty("is_hidden").GetBoolean().Should().BeFalse();
        listed.GetProperty("is_flagged").GetBoolean().Should().BeFalse();
        listed.GetProperty("reports_count").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        listJson.GetProperty("meta").GetProperty("current_page").GetInt32().Should().Be(1);
        listJson.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);

        var detail = await Client.GetAsync($"/api/v2/admin/comments/{commentId}");

        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailJson = await detail.Content.ReadFromJsonAsync<JsonElement>();
        detailJson.GetProperty("success").GetBoolean().Should().BeTrue();
        detailJson.GetProperty("data").GetProperty("id").GetInt32().Should().Be(commentId);

        var hide = await Client.PostAsync($"/api/v2/admin/comments/{commentId}/hide", null);

        hide.StatusCode.Should().Be(HttpStatusCode.OK);
        var hideJson = await hide.Content.ReadFromJsonAsync<JsonElement>();
        hideJson.GetProperty("success").GetBoolean().Should().BeTrue();
        hideJson.GetProperty("data").GetProperty("success").GetBoolean().Should().BeTrue();

        var hiddenList = await Client.GetAsync("/api/v2/admin/comments?content_type=post&search=Laravel%20React%20moderation&page=1&limit=20");

        hiddenList.StatusCode.Should().Be(HttpStatusCode.OK);
        var hiddenComment = (await hiddenList.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data")
            .EnumerateArray()
            .Single(comment => comment.GetProperty("id").GetInt32() == commentId);
        hiddenComment.GetProperty("is_hidden").GetBoolean().Should().BeTrue();

        var delete = await Client.DeleteAsync($"/api/v2/admin/comments/{commentId}");

        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("success").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("success").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task AdminReviewsV2_UsesLaravelReactModerationListDetailFlagHideAndDeleteShape()
    {
        await AuthenticateAsAdminAsync();
        var seeded = await SeedAdminReviewAsync("Laravel React moderation review");

        var list = await Client.GetAsync("/api/v2/admin/reviews?rating=2&search=Laravel%20React%20moderation&page=1&limit=20");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        listJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var listed = listJson.GetProperty("data").EnumerateArray()
            .Single(review => review.GetProperty("id").GetInt32() == seeded.ReviewId);
        listed.GetProperty("reviewer_id").GetInt32().Should().Be(seeded.ReviewerId);
        listed.GetProperty("reviewee_id").GetInt32().Should().Be(seeded.RevieweeId);
        listed.GetProperty("tenant_id").GetInt32().Should().Be(TestData.Tenant1.Id);
        listed.GetProperty("tenant_name").GetString().Should().Be(TestData.Tenant1.Name);
        listed.GetProperty("reviewer_name").GetString().Should().Contain("Review Writer");
        listed.GetProperty("reviewee_name").GetString().Should().Contain("Review Target");
        listed.GetProperty("rating").GetInt32().Should().Be(2);
        listed.GetProperty("content").GetString().Should().Contain("Laravel React moderation review");
        listed.GetProperty("is_hidden").GetBoolean().Should().BeFalse();
        listed.GetProperty("is_flagged").GetBoolean().Should().BeFalse();
        listed.GetProperty("reports_count").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        listJson.GetProperty("meta").GetProperty("current_page").GetInt32().Should().Be(1);
        listJson.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);

        var detail = await Client.GetAsync($"/api/v2/admin/reviews/{seeded.ReviewId}");

        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailJson = await detail.Content.ReadFromJsonAsync<JsonElement>();
        detailJson.GetProperty("success").GetBoolean().Should().BeTrue();
        detailJson.GetProperty("data").GetProperty("id").GetInt32().Should().Be(seeded.ReviewId);

        var flag = await Client.PostAsync($"/api/v2/admin/reviews/{seeded.ReviewId}/flag", null);

        flag.StatusCode.Should().Be(HttpStatusCode.OK);
        var flagJson = await flag.Content.ReadFromJsonAsync<JsonElement>();
        flagJson.GetProperty("success").GetBoolean().Should().BeTrue();
        flagJson.GetProperty("data").GetProperty("success").GetBoolean().Should().BeTrue();

        var flaggedList = await Client.GetAsync("/api/v2/admin/reviews?rating=2&search=Laravel%20React%20moderation&page=1&limit=20");

        flaggedList.StatusCode.Should().Be(HttpStatusCode.OK);
        var flaggedReview = (await flaggedList.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data")
            .EnumerateArray()
            .Single(review => review.GetProperty("id").GetInt32() == seeded.ReviewId);
        flaggedReview.GetProperty("is_flagged").GetBoolean().Should().BeTrue();

        var hide = await Client.PostAsync($"/api/v2/admin/reviews/{seeded.ReviewId}/hide", null);

        hide.StatusCode.Should().Be(HttpStatusCode.OK);
        var hideJson = await hide.Content.ReadFromJsonAsync<JsonElement>();
        hideJson.GetProperty("success").GetBoolean().Should().BeTrue();
        hideJson.GetProperty("data").GetProperty("success").GetBoolean().Should().BeTrue();

        var hiddenList = await Client.GetAsync("/api/v2/admin/reviews?rating=2&search=Laravel%20React%20moderation&page=1&limit=20");

        hiddenList.StatusCode.Should().Be(HttpStatusCode.OK);
        var hiddenReview = (await hiddenList.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data")
            .EnumerateArray()
            .Single(review => review.GetProperty("id").GetInt32() == seeded.ReviewId);
        hiddenReview.GetProperty("is_hidden").GetBoolean().Should().BeTrue();

        var delete = await Client.DeleteAsync($"/api/v2/admin/reviews/{seeded.ReviewId}");

        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("success").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("success").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task AdminPollsV2_UsesLaravelReactListDetailAndDeleteShape()
    {
        await AuthenticateAsAdminAsync();
        var pollId = await SeedAdminPollAsync("Laravel React admin poll");

        var list = await Client.GetAsync("/api/v2/admin/polls?search=Laravel%20React&page=1&limit=50");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        listJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        listJson.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        listJson.GetProperty("meta").GetProperty("current_page").GetInt32().Should().Be(1);
        listJson.GetProperty("meta").GetProperty("per_page").GetInt32().Should().Be(50);
        var listed = listJson.GetProperty("data").EnumerateArray()
            .Single(item => item.GetProperty("id").GetInt32() == pollId);
        listed.GetProperty("question").GetString().Should().Be("Laravel React admin poll");
        listed.GetProperty("options").GetArrayLength().Should().Be(2);
        listed.GetProperty("total_votes").GetInt32().Should().Be(1);
        listed.GetProperty("user").GetProperty("name").GetString().Should().Be("Member User");

        var detail = await Client.GetAsync($"/api/v2/admin/polls/{pollId}");

        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailJson = await detail.Content.ReadFromJsonAsync<JsonElement>();
        detailJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var detailData = detailJson.GetProperty("data");
        detailData.GetProperty("id").GetInt32().Should().Be(pollId);
        detailData.GetProperty("question").GetString().Should().Be("Laravel React admin poll");
        detailData.GetProperty("options").GetArrayLength().Should().Be(2);
        detailData.GetProperty("total_votes").GetInt32().Should().Be(1);

        var delete = await Client.DeleteAsync($"/api/v2/admin/polls/{pollId}");

        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("success").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("deleted").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("id").GetInt32().Should().Be(pollId);
    }

    [Fact]
    public async Task AdminResourcesV2_UsesLaravelReactListDetailAndDeleteShape()
    {
        await AuthenticateAsAdminAsync();
        var articleId = await SeedAdminResourceArticleAsync("Laravel React resource article");

        var list = await Client.GetAsync("/api/v2/admin/resources?search=Laravel%20React&status=published&page=1&limit=50");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        listJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var payload = listJson.GetProperty("data");
        payload.GetProperty("meta").GetProperty("page").GetInt32().Should().Be(1);
        payload.GetProperty("meta").GetProperty("per_page").GetInt32().Should().Be(50);
        payload.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        var listed = payload.GetProperty("items").EnumerateArray()
            .Single(item => item.GetProperty("id").GetInt32() == articleId);
        listed.GetProperty("title").GetString().Should().Be("Laravel React resource article");
        listed.GetProperty("category").GetString().Should().Be("Getting Started");
        listed.GetProperty("author_name").GetString().Should().Be("Admin User");
        listed.GetProperty("views").GetInt32().Should().Be(42);
        listed.GetProperty("helpful_votes").GetInt32().Should().Be(0);
        listed.GetProperty("status").GetString().Should().Be("published");
        listed.GetProperty("updated_at").GetString().Should().NotBeNullOrWhiteSpace();

        var detail = await Client.GetAsync($"/api/v2/admin/resources/{articleId}");

        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailJson = await detail.Content.ReadFromJsonAsync<JsonElement>();
        detailJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var detailData = detailJson.GetProperty("data");
        detailData.GetProperty("id").GetInt32().Should().Be(articleId);
        detailData.GetProperty("title").GetString().Should().Be("Laravel React resource article");
        detailData.GetProperty("slug").GetString().Should().Be($"resource-{articleId}");
        detailData.GetProperty("content").GetString().Should().Contain("Laravel React resource body");
        detailData.GetProperty("attachments").ValueKind.Should().Be(JsonValueKind.Array);

        var delete = await Client.DeleteAsync($"/api/v2/admin/resources/{articleId}");

        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("success").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("deleted").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("id").GetInt32().Should().Be(articleId);
    }

    [Fact]
    public async Task AdminGoalsV2_UsesLaravelReactListDetailAndDeleteShape()
    {
        await AuthenticateAsAdminAsync();
        var goalId = await SeedAdminGoalAsync("Laravel React admin goal");

        var list = await Client.GetAsync("/api/v2/admin/goals?search=Laravel%20React&page=1&limit=50");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        listJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        listJson.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        listJson.GetProperty("meta").GetProperty("current_page").GetInt32().Should().Be(1);
        listJson.GetProperty("meta").GetProperty("per_page").GetInt32().Should().Be(50);
        listJson.GetProperty("meta").GetProperty("total_pages").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        var listed = listJson.GetProperty("data").EnumerateArray()
            .Single(item => item.GetProperty("id").GetInt32() == goalId);
        listed.GetProperty("title").GetString().Should().Be("Laravel React admin goal");
        listed.GetProperty("user_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        listed.GetProperty("target_value").GetDecimal().Should().Be(10m);
        listed.GetProperty("current_value").GetDecimal().Should().Be(4m);
        listed.GetProperty("status").GetString().Should().Be("active");
        listed.GetProperty("mentor_id").ValueKind.Should().Be(JsonValueKind.Null);
        listed.GetProperty("buddy_id").ValueKind.Should().Be(JsonValueKind.Null);
        listed.GetProperty("user").GetProperty("name").GetString().Should().Be("Member User");

        var detail = await Client.GetAsync($"/api/v2/admin/goals/{goalId}");

        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailJson = await detail.Content.ReadFromJsonAsync<JsonElement>();
        detailJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var detailData = detailJson.GetProperty("data");
        detailData.GetProperty("id").GetInt32().Should().Be(goalId);
        detailData.GetProperty("title").GetString().Should().Be("Laravel React admin goal");
        detailData.GetProperty("description").GetString().Should().Contain("Laravel React goal body");
        detailData.GetProperty("milestones").GetArrayLength().Should().Be(1);

        var delete = await Client.DeleteAsync($"/api/v2/admin/goals/{goalId}");

        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("success").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("deleted").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("id").GetInt32().Should().Be(goalId);
    }

    [Fact]
    public async Task AdminIdeationV2_UsesLaravelReactListDetailStatusAndDeleteShape()
    {
        await AuthenticateAsAdminAsync();
        var challengeId = await SeedAdminIdeationChallengeAsync("Laravel React ideation challenge");

        var list = await Client.GetAsync("/api/v2/admin/ideation?search=Laravel%20React&status=open&page=1&limit=50");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        listJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        listJson.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        listJson.GetProperty("meta").GetProperty("current_page").GetInt32().Should().Be(1);
        listJson.GetProperty("meta").GetProperty("per_page").GetInt32().Should().Be(50);
        var listed = listJson.GetProperty("data").EnumerateArray()
            .Single(item => item.GetProperty("id").GetInt32() == challengeId);
        listed.GetProperty("title").GetString().Should().Be("Laravel React ideation challenge");
        listed.GetProperty("creator_name").GetString().Should().NotBeNull();
        listed.GetProperty("ideas_count").GetInt32().Should().Be(1);
        listed.GetProperty("status").GetString().Should().Be("open");
        listed.GetProperty("start_date").GetString().Should().NotBeNullOrWhiteSpace();
        listed.GetProperty("end_date").GetString().Should().NotBeNullOrWhiteSpace();

        var detail = await Client.GetAsync($"/api/v2/admin/ideation/{challengeId}");

        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailJson = await detail.Content.ReadFromJsonAsync<JsonElement>();
        detailJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var detailData = detailJson.GetProperty("data");
        detailData.GetProperty("id").GetInt32().Should().Be(challengeId);
        detailData.GetProperty("title").GetString().Should().Be("Laravel React ideation challenge");
        detailData.GetProperty("ideas_count").GetInt32().Should().Be(1);

        var status = await Client.PostAsJsonAsync($"/api/v2/admin/ideation/{challengeId}/status", new { status = "archived" });

        status.StatusCode.Should().Be(HttpStatusCode.OK);
        var statusJson = await status.Content.ReadFromJsonAsync<JsonElement>();
        statusJson.GetProperty("success").GetBoolean().Should().BeTrue();
        statusJson.GetProperty("data").GetProperty("id").GetInt32().Should().Be(challengeId);
        statusJson.GetProperty("data").GetProperty("status").GetString().Should().Be("archived");

        var delete = await Client.DeleteAsync($"/api/v2/admin/ideation/{challengeId}");

        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("success").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("deleted").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("id").GetInt32().Should().Be(challengeId);
    }

    [Fact]
    public async Task AdminModerationV2_UsesLaravelReactQueueStatsAndReviewShape()
    {
        await AuthenticateAsAdminAsync();
        var reportId = await SeedAdminModerationReportAsync("Laravel React moderation queue item");

        var queue = await Client.GetAsync("/api/v2/admin/moderation/queue?status=pending&content_type=listing&search=Laravel%20React&page=1&limit=20");

        queue.StatusCode.Should().Be(HttpStatusCode.OK);
        var queueJson = await queue.Content.ReadFromJsonAsync<JsonElement>();
        queueJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        queueJson.GetProperty("success").GetBoolean().Should().BeTrue();
        queueJson.GetProperty("meta").GetProperty("current_page").GetInt32().Should().Be(1);
        queueJson.GetProperty("meta").GetProperty("per_page").GetInt32().Should().Be(20);
        queueJson.GetProperty("meta").GetProperty("total_pages").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        var item = queueJson.GetProperty("data").EnumerateArray()
            .Single(row => row.GetProperty("id").GetInt32() == reportId);
        item.GetProperty("content_type").GetString().Should().Be("listing");
        item.GetProperty("content_id").GetInt32().Should().Be(321);
        item.GetProperty("title").GetString().Should().Be("Laravel React moderation queue item");
        item.GetProperty("body").GetString().Should().Contain("Moderation details");
        item.GetProperty("author_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        item.GetProperty("author_name").GetString().Should().Be("Member User");
        item.GetProperty("status").GetString().Should().Be("pending");
        item.GetProperty("auto_flagged").GetBoolean().Should().BeFalse();
        item.GetProperty("submitted_at").GetString().Should().NotBeNullOrWhiteSpace();

        var stats = await Client.GetAsync("/api/v2/admin/moderation/stats");

        stats.StatusCode.Should().Be(HttpStatusCode.OK);
        var statsJson = await stats.Content.ReadFromJsonAsync<JsonElement>();
        statsJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var statsData = statsJson.GetProperty("data");
        statsData.GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        statsData.GetProperty("pending").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        statsData.GetProperty("by_type").GetProperty("listing").GetProperty("pending").GetInt32().Should().BeGreaterThanOrEqualTo(1);

        var review = await Client.PostAsJsonAsync($"/api/v2/admin/moderation/{reportId}/review", new
        {
            decision = "approved"
        });

        review.StatusCode.Should().Be(HttpStatusCode.OK);
        var reviewJson = await review.Content.ReadFromJsonAsync<JsonElement>();
        reviewJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        reviewJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var reviewData = reviewJson.GetProperty("data");
        reviewData.GetProperty("success").GetBoolean().Should().BeTrue();
        reviewData.GetProperty("content_type").GetString().Should().Be("listing");
        reviewData.GetProperty("content_id").GetInt32().Should().Be(321);
    }

    private async Task SeedRegionalAnalyticsSubscriptionAsync(string token)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var subscription = new RegionalAnalyticsSubscription
        {
            TenantId = TestData.Tenant1.Id,
            PartnerName = "Contract Partner",
            ContactEmail = "partner@example.test",
            Status = "active",
            SubscriptionToken = token,
            CurrentPeriodStart = DateTime.UtcNow.AddDays(-30),
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(30)
        };
        db.RegionalAnalyticsSubscriptions.Add(subscription);
        await db.SaveChangesAsync();

        db.RegionalAnalyticsReports.Add(new RegionalAnalyticsReport
        {
            TenantId = TestData.Tenant1.Id,
            SubscriptionId = subscription.Id,
            ReportType = "monthly_summary",
            PeriodStart = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-1)),
            PeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow),
            GeneratedAt = DateTime.UtcNow,
            Status = "ready",
            FileUrl = "/storage/regional-analytics/report.pdf"
        });
        await db.SaveChangesAsync();
    }

    private async Task<int> SeedAdminPollAsync(string question)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var now = DateTime.UtcNow;
        var poll = new Poll
        {
            TenantId = TestData.Tenant1.Id,
            CreatedById = TestData.MemberUser.Id,
            Title = question,
            Description = "Poll seeded for Laravel React admin contract tests.",
            PollType = "single",
            Status = "active",
            ShowResultsBeforeClose = true,
            CreatedAt = now.AddMinutes(-10)
        };
        db.Polls.Add(poll);
        await db.SaveChangesAsync();

        var yes = new PollOption
        {
            TenantId = TestData.Tenant1.Id,
            PollId = poll.Id,
            Text = "Yes",
            SortOrder = 1,
            CreatedAt = now.AddMinutes(-9)
        };
        var no = new PollOption
        {
            TenantId = TestData.Tenant1.Id,
            PollId = poll.Id,
            Text = "No",
            SortOrder = 2,
            CreatedAt = now.AddMinutes(-9)
        };
        db.PollOptions.AddRange(yes, no);
        await db.SaveChangesAsync();

        db.PollVotes.Add(new PollVote
        {
            TenantId = TestData.Tenant1.Id,
            PollId = poll.Id,
            OptionId = yes.Id,
            UserId = TestData.AdminUser.Id,
            CreatedAt = now.AddMinutes(-8)
        });
        await db.SaveChangesAsync();

        return poll.Id;
    }

    private async Task<int> SeedAdminResourceArticleAsync(string title)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var now = DateTime.UtcNow;
        var article = new KnowledgeArticle
        {
            TenantId = TestData.Tenant1.Id,
            CreatedById = TestData.AdminUser.Id,
            Title = title,
            Slug = $"resource-{Guid.NewGuid():N}",
            Content = "Laravel React resource body for the admin resource table.",
            Category = "Getting Started",
            Tags = "contract,resources",
            IsPublished = true,
            SortOrder = 1,
            ViewCount = 42,
            CreatedAt = now.AddDays(-2),
            UpdatedAt = now.AddHours(-1)
        };
        db.KnowledgeArticles.Add(article);
        await db.SaveChangesAsync();
        article.Slug = $"resource-{article.Id}";
        await db.SaveChangesAsync();
        return article.Id;
    }

    private async Task<int> SeedAdminGoalAsync(string title)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var now = DateTime.UtcNow;
        var goal = new Goal
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.MemberUser.Id,
            Title = title,
            Description = "Laravel React goal body for the admin goals table.",
            GoalType = "hours",
            TargetValue = 10m,
            CurrentValue = 4m,
            Category = "community",
            Status = "active",
            TargetDate = now.AddDays(30),
            CreatedAt = now.AddDays(-1),
            UpdatedAt = now.AddHours(-2)
        };
        db.Goals.Add(goal);
        await db.SaveChangesAsync();

        db.GoalMilestones.Add(new GoalMilestone
        {
            TenantId = TestData.Tenant1.Id,
            GoalId = goal.Id,
            Title = "First checkpoint",
            IsCompleted = false,
            SortOrder = 1,
            CreatedAt = now.AddHours(-20)
        });
        await db.SaveChangesAsync();

        return goal.Id;
    }

    private async Task<int> SeedAdminIdeationChallengeAsync(string title)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var now = DateTime.UtcNow;
        var challenge = new Challenge
        {
            TenantId = TestData.Tenant1.Id,
            Title = title,
            Description = "Laravel React ideation body for the admin challenges table.",
            ChallengeType = ChallengeType.Community,
            TargetAction = "idea_submitted",
            TargetCount = 3,
            XpReward = 25,
            StartsAt = now.AddDays(-1),
            EndsAt = now.AddDays(14),
            IsActive = true,
            Difficulty = ChallengeDifficulty.Medium,
            CreatedAt = now.AddHours(-3),
            UpdatedAt = now.AddHours(-1)
        };
        db.Challenges.Add(challenge);
        await db.SaveChangesAsync();

        db.ChallengeParticipants.Add(new ChallengeParticipant
        {
            TenantId = TestData.Tenant1.Id,
            ChallengeId = challenge.Id,
            UserId = TestData.MemberUser.Id,
            CurrentProgress = 1,
            JoinedAt = now.AddHours(-2)
        });
        await db.SaveChangesAsync();

        return challenge.Id;
    }

    private async Task<int> SeedAdminModerationReportAsync(string title)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var report = new ContentReport
        {
            TenantId = TestData.Tenant1.Id,
            ReporterId = TestData.MemberUser.Id,
            ContentType = "listing",
            ContentId = 321,
            Reason = ReportReason.SafetyConcern,
            Description = $"{title}\nModeration details for the React moderation queue.",
            Status = ReportStatus.Pending,
            CreatedAt = DateTime.UtcNow.AddHours(-6)
        };
        db.ContentReports.Add(report);
        await db.SaveChangesAsync();
        return report.Id;
    }

    private async Task<int> SeedAdminFeedCommentAsync(string content)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var now = DateTime.UtcNow;
        var post = new FeedPost
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.AdminUser.Id,
            Content = "Feed post backing a Laravel React admin comment moderation test.",
            CreatedAt = now.AddHours(-3)
        };
        db.FeedPosts.Add(post);
        await db.SaveChangesAsync();

        var comment = new PostComment
        {
            TenantId = TestData.Tenant1.Id,
            PostId = post.Id,
            UserId = TestData.MemberUser.Id,
            Content = content,
            CreatedAt = now.AddHours(-2)
        };
        db.PostComments.Add(comment);
        await db.SaveChangesAsync();
        return comment.Id;
    }

    private async Task<(int ReviewId, int ReviewerId, int RevieweeId)> SeedAdminReviewAsync(string content)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var suffix = Guid.NewGuid().ToString("N");
        var now = DateTime.UtcNow;
        var reviewer = new User
        {
            TenantId = TestData.Tenant1.Id,
            Email = $"review-writer-{suffix}@example.test",
            PasswordHash = "not-used-in-contract-test",
            FirstName = "Review",
            LastName = "Writer",
            Role = "member",
            IsActive = true,
            CreatedAt = now.AddDays(-9)
        };
        var reviewee = new User
        {
            TenantId = TestData.Tenant1.Id,
            Email = $"review-target-{suffix}@example.test",
            PasswordHash = "not-used-in-contract-test",
            FirstName = "Review",
            LastName = "Target",
            Role = "member",
            IsActive = true,
            CreatedAt = now.AddDays(-8)
        };
        db.Users.AddRange(reviewer, reviewee);
        await db.SaveChangesAsync();

        var review = new Review
        {
            TenantId = TestData.Tenant1.Id,
            ReviewerId = reviewer.Id,
            TargetUserId = reviewee.Id,
            Rating = 2,
            Comment = content,
            CreatedAt = now.AddHours(-4)
        };
        db.Reviews.Add(review);
        await db.SaveChangesAsync();
        return (review.Id, reviewer.Id, reviewee.Id);
    }

    private async Task<(string ClientId, string ClientSecret)> RegisterApiPartnerAsync(string scopes)
    {
        await AuthenticateAsAdminAsync();
        var response = await Client.PostAsJsonAsync("/api/admin/api-partners", new
        {
            name = $"Laravel React Partner {Guid.NewGuid():N}",
            contact_email = "partner-contract@example.test",
            description = "Laravel React frontend contract test partner",
            scopes,
            rate_limit_per_minute = 120
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = json.GetProperty("id").GetGuid().ToString();
        var secret = json.GetProperty("api_key").GetString();
        secret.Should().NotBeNullOrWhiteSpace();
        return (id, secret!);
    }

    private static bool HasLaravelBackgroundJobShape(JsonElement job)
    {
        return !string.IsNullOrWhiteSpace(job.GetProperty("name").GetString()) &&
            job.TryGetProperty("last_run_at", out _) &&
            job.TryGetProperty("next_run_at", out _);
    }

    private static bool HasProperty(JsonElement element, string propertyName) =>
        element.TryGetProperty(propertyName, out _);

    private async Task SeedShippingOptionAsync(int sellerId)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        db.MarketplaceShippingOptions.Add(new MarketplaceShippingOption
        {
            TenantId = TestData.Tenant1.Id,
            UserId = sellerId,
            Name = "Tracked courier",
            Price = 4.95m,
            Currency = "EUR",
            Region = "domestic",
            IsActive = true
        });
        await db.SaveChangesAsync();
    }

    private static MultipartFormDataContent CreateImageForm()
    {
        var bytes = new byte[1024];
        bytes[0] = 0x89;
        bytes[1] = 0x50;
        bytes[2] = 0x4E;
        bytes[3] = 0x47;

        var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "file", "newsletter.png");
        return form;
    }
}

// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/*
 * Production-readiness round 7 — tests for the request correlation
 * middleware and the new /api/admin/system/diagnostics endpoint.
 */

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Services.Scheduled;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class RequestCorrelationAndDiagnosticsTests : IntegrationTestBase
{
    public RequestCorrelationAndDiagnosticsTests(NexusWebApplicationFactory factory) : base(factory) { }

    // ─── Correlation middleware ───────────────────────────────────────────

    [Fact]
    public async Task RequestCorrelation_NoIncomingHeader_ServerGeneratesAndReturnsId()
    {
        ClearAuthToken();
        var resp = await Client.GetAsync("/health");
        resp.Headers.Should().ContainKey("X-Request-Id");
        var id = resp.Headers.GetValues("X-Request-Id").FirstOrDefault();
        id.Should().NotBeNullOrEmpty();
        // Server-generated ids are GUID-N (32 hex chars).
        id!.Length.Should().Be(32);
        id.Should().MatchRegex("^[0-9a-f]{32}$");
    }

    [Fact]
    public async Task RequestCorrelation_IncomingHeader_PassedThroughVerbatim()
    {
        ClearAuthToken();
        using var req = new HttpRequestMessage(HttpMethod.Get, "/health");
        req.Headers.TryAddWithoutValidation("X-Request-Id", "trace-from-upstream-12345");
        var resp = await Client.SendAsync(req);
        resp.Headers.GetValues("X-Request-Id").Should().Contain("trace-from-upstream-12345");
    }

    [Fact]
    public async Task RequestCorrelation_FallbackHeader_AlsoAccepted()
    {
        ClearAuthToken();
        using var req = new HttpRequestMessage(HttpMethod.Get, "/health");
        req.Headers.TryAddWithoutValidation("X-Correlation-Id", "alt-trace-id");
        var resp = await Client.SendAsync(req);
        resp.Headers.GetValues("X-Request-Id").Should().Contain("alt-trace-id");
    }

    [Fact]
    public async Task RequestCorrelation_SanitizesControlChars()
    {
        ClearAuthToken();
        using var req = new HttpRequestMessage(HttpMethod.Get, "/health");
        // ASCII tab (\t) + newline (\n) should be stripped; surviving printable chars kept.
        req.Headers.TryAddWithoutValidation("X-Request-Id", "abc\t123\nXYZ");
        var resp = await Client.SendAsync(req);
        var id = resp.Headers.GetValues("X-Request-Id").First();
        id.Should().Be("abc123XYZ");
    }

    // ─── Diagnostics endpoint ─────────────────────────────────────────────

    [Fact]
    public async Task Diagnostics_AsAdmin_ReturnsVerdictPayload()
    {
        await AuthenticateAsAdminAsync();
        var resp = await Client.GetAsync("/api/admin/system/diagnostics");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadAsStringAsync();
        body.Should().Contain("\"verdict\"");
        body.Should().Contain("\"database\"");
        body.Should().Contain("\"hosted_services\"");
        body.Should().Contain("\"external_services\"");
        body.Should().Contain("\"process\"");
    }

    [Fact]
    public async Task Diagnostics_Member_Returns403()
    {
        await AuthenticateAsMemberAsync();
        var resp = await Client.GetAsync("/api/admin/system/diagnostics");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Diagnostics_Anonymous_Returns401()
    {
        ClearAuthToken();
        var resp = await Client.GetAsync("/api/admin/system/diagnostics");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─── ScheduledJobsRegistry ─────────────────────────────────────────────

    [Fact]
    public void ScheduledJobsRegistry_RecordsLifecycle()
    {
        var registry = Factory.Services.GetRequiredService<ScheduledJobsRegistry>();
        registry.RecordStart("TestJobA");
        registry.RecordSuccess("TestJobA", TimeSpan.FromMilliseconds(123));

        var snapshot = registry.Snapshot();
        var entry = snapshot.FirstOrDefault(j => j.JobName == "TestJobA");
        entry.Should().NotBeNull();
        entry!.Status.Should().Be("idle");
        entry.LastDurationMs.Should().BeApproximately(123, 1);
        entry.ConsecutiveFailures.Should().Be(0);
    }

    [Fact]
    public void ScheduledJobsRegistry_ConsecutiveFailures_Increment()
    {
        var registry = Factory.Services.GetRequiredService<ScheduledJobsRegistry>();
        registry.RecordFailure("TestJobB", new InvalidOperationException("first"));
        registry.RecordFailure("TestJobB", new InvalidOperationException("second"));
        registry.RecordFailure("TestJobB", new InvalidOperationException("third"));

        var entry = registry.Snapshot().First(j => j.JobName == "TestJobB");
        entry.Status.Should().Be("failing");
        entry.ConsecutiveFailures.Should().Be(3);
        entry.LastFailureMessage.Should().Be("third");
    }

    [Fact]
    public void ScheduledJobsRegistry_SuccessAfterFailure_ResetsCounter()
    {
        var registry = Factory.Services.GetRequiredService<ScheduledJobsRegistry>();
        registry.RecordFailure("TestJobC", new InvalidOperationException("bad"));
        registry.RecordFailure("TestJobC", new InvalidOperationException("bad again"));
        registry.RecordSuccess("TestJobC", TimeSpan.FromMilliseconds(10));

        var entry = registry.Snapshot().First(j => j.JobName == "TestJobC");
        entry.Status.Should().Be("idle");
        entry.ConsecutiveFailures.Should().Be(0, "success must reset the consecutive failure counter");
    }
}

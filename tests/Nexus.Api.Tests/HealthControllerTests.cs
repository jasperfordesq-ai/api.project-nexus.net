using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

/// <summary>
/// Integration tests for health check endpoints.
/// Tests liveness and readiness probes.
/// </summary>
[Collection("Integration")]
public class HealthControllerTests : IntegrationTestBase
{
    public HealthControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task LivenessCheck_ReturnsHealthy()
    {
        // Act - no auth required
        var response = await Client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("healthy");
    }

    [Fact]
    public async Task LivenessCheck_LiveRoute_ReturnsHealthy()
    {
        // Act
        var response = await Client.GetAsync("/health/live");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("healthy");
    }

    [Fact]
    public async Task ReadinessCheck_WithDatabase_ReturnsOk()
    {
        // Act
        var response = await Client.GetAsync("/health/ready");

        // Assert
        // Should be OK since we have a Testcontainer PostgreSQL running
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("healthy");
        content.GetProperty("checks").GetProperty("database").GetString().Should().Be("healthy");
    }
}

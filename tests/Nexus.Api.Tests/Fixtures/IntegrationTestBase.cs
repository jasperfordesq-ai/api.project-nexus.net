using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;

namespace Nexus.Api.Tests.Fixtures;

/// <summary>
/// Base class for integration tests providing common utilities.
/// </summary>
public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected readonly NexusWebApplicationFactory Factory;
    protected readonly HttpClient Client;
    protected TestData TestData = null!;

    protected static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    protected IntegrationTestBase(NexusWebApplicationFactory factory)
    {
        Factory = factory;
        Client = factory.CreateClient();
    }

    public virtual async Task InitializeAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        TestData = await TestDataSeeder.SeedAsync(db);
    }

    public virtual Task DisposeAsync() => Task.CompletedTask;

    /// <summary>
    /// Login and get an access token for the specified user.
    /// </summary>
    protected async Task<string> GetAccessTokenAsync(string email, string tenantSlug)
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = TestDataSeeder.TestPassword,
            tenant_slug = tenantSlug
        });

        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        return content.GetProperty("access_token").GetString()!;
    }

    /// <summary>
    /// Set the authorization header for authenticated requests.
    /// </summary>
    protected void SetAuthToken(string token)
    {
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    /// <summary>
    /// Clear the authorization header.
    /// </summary>
    protected void ClearAuthToken()
    {
        Client.DefaultRequestHeaders.Authorization = null;
    }

    /// <summary>
    /// Authenticate as the admin user.
    /// </summary>
    protected async Task AuthenticateAsAdminAsync()
    {
        var token = await GetAccessTokenAsync("admin@test.com", "test-tenant");
        SetAuthToken(token);
    }

    /// <summary>
    /// Authenticate as the member user.
    /// </summary>
    protected async Task AuthenticateAsMemberAsync()
    {
        var token = await GetAccessTokenAsync("member@test.com", "test-tenant");
        SetAuthToken(token);
    }

    /// <summary>
    /// Authenticate as the other tenant user.
    /// </summary>
    protected async Task AuthenticateAsOtherTenantUserAsync()
    {
        var token = await GetAccessTokenAsync("other@test.com", "other-tenant");
        SetAuthToken(token);
    }
}

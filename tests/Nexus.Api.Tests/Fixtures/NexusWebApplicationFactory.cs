using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Nexus.Api.Data;
using Testcontainers.PostgreSql;

namespace Nexus.Api.Tests.Fixtures;

/// <summary>
/// Custom WebApplicationFactory for integration tests using PostgreSQL test container.
/// Provides isolated database per test run.
/// </summary>
public class NexusWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16.4-bookworm")
        .WithDatabase("nexus_test")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    public string ConnectionString => _postgres.GetConnectionString();

    // Test JWT secret (32+ characters as required)
    private const string TestJwtSecret = "TestSecretKeyForIntegrationTests123!";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Add test configuration BEFORE services are configured
        builder.ConfigureAppConfiguration((context, config) =>
        {
            // Add in-memory configuration for test settings
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = TestJwtSecret,
                ["Jwt:Issuer"] = "NexusTestIssuer",
                ["Jwt:Audience"] = "NexusTestAudience",
                ["Jwt:AccessTokenExpiryMinutes"] = "120",
                ["ConnectionStrings:DefaultConnection"] = ConnectionString,
                ["RateLimiting:Auth:PermitLimit"] = "1000", // High limit for tests
                ["RateLimiting:Auth:WindowSeconds"] = "1",
                ["RateLimiting:General:PermitLimit"] = "10000",
                ["RateLimiting:General:WindowSeconds"] = "1",
                ["RabbitMq:Enabled"] = "false", // Disable RabbitMQ for tests
                ["LlamaService:BaseUrl"] = "http://localhost:11434" // Mock URL
            });
        });

        builder.ConfigureServices(services =>
        {
            // Remove the existing DbContext registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<NexusDbContext>));

            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            // Remove any existing DbContext registrations
            var dbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(NexusDbContext));

            if (dbContextDescriptor != null)
            {
                services.Remove(dbContextDescriptor);
            }

            // Add DbContext using test container
            services.AddDbContext<NexusDbContext>((sp, options) =>
            {
                options.UseNpgsql(ConnectionString);
            });

            // Ensure database is created and migrated
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            db.Database.Migrate();
        });
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
    }

    public new async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
        await base.DisposeAsync();
    }
}

/// <summary>
/// Collection definition for tests sharing the same factory instance.
/// </summary>
[CollectionDefinition("Integration")]
public class IntegrationTestCollection : ICollectionFixture<NexusWebApplicationFactory>
{
}

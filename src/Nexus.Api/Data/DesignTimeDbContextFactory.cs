using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Nexus.Api.Data;

/// <summary>
/// Design-time factory for creating NexusDbContext instances.
/// Used by EF Core tools (migrations, database updates) when the application
/// cannot be run directly (e.g., due to missing environment variables).
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<NexusDbContext>
{
    public NexusDbContext CreateDbContext(string[] args)
    {
        // Use a default connection string for design-time operations
        // This can be overridden by environment variable or command line args
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Host=localhost;Port=5434;Database=nexus_dev;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<NexusDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        // Create a no-op tenant context for design time
        var tenantContext = new TenantContext();

        return new NexusDbContext(optionsBuilder.Options, tenantContext);
    }
}

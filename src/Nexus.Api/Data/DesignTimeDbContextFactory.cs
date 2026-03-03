// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

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
        // Connection string for design-time operations (EF migrations)
        // MUST be provided via environment variable - see compose.yml for Docker setup
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? throw new InvalidOperationException(
                "ConnectionStrings__DefaultConnection environment variable is required for design-time operations. "
                + "Run EF commands inside Docker: docker compose exec api dotnet ef ...");

        var optionsBuilder = new DbContextOptionsBuilder<NexusDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        // Create a no-op tenant context for design time
        var tenantContext = new TenantContext();

        return new NexusDbContext(optionsBuilder.Options, tenantContext);
    }
}

# Nexus ASP.NET Core Migration Scaffold

This scaffold provides the foundation for migrating Project NEXUS from PHP to ASP.NET Core 8 using the strangler fig pattern.

## Quick Start

### Prerequisites
- .NET 8 SDK
- MySQL 8.0 (same database as PHP)
- Redis (optional, falls back to in-memory cache)
- PHP application running (for proxy during migration)

### Setup

1. **Configure connection strings**

Edit `src/Nexus.Api/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=nexus;User=root;Password=yourpassword"
  },
  "Jwt": {
    "Secret": "MUST_MATCH_PHP_APP_KEY_OR_JWT_SECRET"
  },
  "PhpApi": {
    "BaseUrl": "http://localhost:8080"
  }
}
```

2. **Scaffold entities from database**

```bash
cd src/Nexus.Infrastructure
dotnet ef dbcontext scaffold "Server=localhost;Database=nexus;User=root;Password=yourpassword" Pomelo.EntityFrameworkCore.MySql --output-dir ../Nexus.Domain/Entities --context NexusDbContext --context-dir Persistence --force
```

3. **Build and run**

```bash
dotnet build
dotnet run --project src/Nexus.Api
```

## Project Structure

```
Nexus.sln
├── src/
│   ├── Nexus.Api/                  # Web API (controllers, middleware)
│   │   ├── Controllers/
│   │   │   ├── V1/                 # Legacy API compatibility
│   │   │   └── V2/                 # Modern REST API
│   │   ├── Middleware/
│   │   │   ├── PhpProxyMiddleware.cs       # Strangler fig proxy
│   │   │   ├── TenantResolutionMiddleware.cs
│   │   │   └── ExceptionHandlingMiddleware.cs
│   │   └── Program.cs
│   │
│   ├── Nexus.Application/          # Business logic (CQRS + MediatR)
│   │   ├── Common/
│   │   │   ├── Interfaces/         # Service contracts
│   │   │   ├── Models/             # DTOs, Result types
│   │   │   └── Exceptions/         # Custom exceptions
│   │   └── Features/               # Feature modules
│   │       ├── Auth/
│   │       ├── Listings/
│   │       └── ...
│   │
│   ├── Nexus.Domain/               # Entities and enums
│   │   ├── Entities/
│   │   ├── Enums/
│   │   └── Common/
│   │
│   ├── Nexus.Infrastructure/       # Data access, external services
│   │   ├── Persistence/
│   │   ├── Identity/
│   │   └── Services/
│   │
│   └── Nexus.Shared/               # Cross-cutting utilities
│
└── tests/
```

## Strangler Fig Pattern

The `PhpProxyMiddleware` routes requests based on migration status:

1. **Migrated endpoints** → Handled by ASP.NET Core
2. **Unmigrated endpoints** → Proxied to PHP application

To migrate an endpoint:

1. Implement the endpoint in ASP.NET Core
2. Add the path prefix to `_migratedPrefixes` in `PhpProxyMiddleware.cs`:
```csharp
private static readonly HashSet<string> _migratedPrefixes = new(StringComparer.OrdinalIgnoreCase)
{
    "/api/v2/auth",
    "/api/v2/listings",  // Add new migrated paths here
};
```
3. Test thoroughly
4. Deploy

## JWT Token Compatibility

The ASP.NET Core application MUST use the same JWT signing key as PHP:
- PHP uses `APP_KEY` or `JWT_SECRET` from `.env`
- Copy this value to `appsettings.json` under `Jwt:Secret`

Token claims must match:
- `user_id` - User ID
- `tenant_id` - Tenant ID
- `role` - User role
- `platform` - "mobile" or "web"
- `exp` - Expiration timestamp
- `iat` - Issued at timestamp

## Multi-Tenant Architecture

All database queries are automatically scoped by tenant using EF Core global query filters:

```csharp
// In NexusDbContext.OnModelCreating()
modelBuilder.Entity<User>()
    .HasQueryFilter(u => u.TenantId == _currentTenant.TenantId);
```

Tenant resolution order:
1. Domain-based (tenant.domain matches request host)
2. Header-based (X-Tenant-ID header)
3. Token-based (tenant_id claim in JWT)
4. Path-based (/tenant-slug/ in URL)
5. Default (master tenant, id=1)

## Migration Phases

See [MIGRATION_PLAN.md](../MIGRATION_PLAN.md) for detailed phased migration strategy.

| Phase | Module | Duration |
|-------|--------|----------|
| 0 | Foundation | 2 weeks |
| 1 | Authentication | 2 weeks |
| 2 | Users | 2 weeks |
| 3 | Listings | 2 weeks |
| 4 | Wallet | 2 weeks |
| ... | ... | ... |

## Testing

Run tests:
```bash
dotnet test
```

Contract testing against PHP:
```bash
dotnet test --filter Category=Contract
```

## Health Checks

- `/health` - Overall health
- `/health/ready` - Readiness (database, redis)
- `/health/live` - Liveness

## Useful Commands

```bash
# Build
dotnet build

# Run with hot reload
dotnet watch run --project src/Nexus.Api

# Add migration
dotnet ef migrations add MigrationName --project src/Nexus.Infrastructure

# Update database
dotnet ef database update --project src/Nexus.Infrastructure

# Generate API client
dotnet swagger tofile --output api.json src/Nexus.Api/bin/Debug/net8.0/Nexus.Api.dll v2
```

## Documentation

- [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md) - Detailed project structure
- [STRANGLER_FIG_STRATEGY.md](../STRANGLER_FIG_STRATEGY.md) - Migration strategy
- [ENTITY_MAPPING.md](../ENTITY_MAPPING.md) - PHP to C# entity mapping
- [MIGRATION_PLAN.md](../MIGRATION_PLAN.md) - Full migration plan

// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Asp.Versioning;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Nexus.Api.Data;
using Nexus.Api.Extensions;
using Nexus.Api.HealthChecks;
using Nexus.Api.Hubs;
using Nexus.Api.Middleware;
using Sentry.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Sentry error tracking (configure via Sentry:Dsn env var or appsettings)
builder.WebHost.UseSentry(o =>
{
    o.Dsn = builder.Configuration["Sentry:Dsn"] ?? "";
    o.Environment = builder.Configuration["Sentry:Environment"] ?? builder.Environment.EnvironmentName;
    o.TracesSampleRate = builder.Configuration.GetValue("Sentry:TracesSampleRate", 0.1);
    o.SendDefaultPii = builder.Configuration.GetValue("Sentry:SendDefaultPii", false);
});

// =============================================================================
// DOCKER-ONLY DEVELOPMENT CHECK
// =============================================================================
// This project is designed to run in Docker. Running directly with `dotnet run`
// is not supported and may cause configuration issues.
var isRunningInDocker = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true";
var isTestEnvironment = builder.Environment.EnvironmentName == "Testing";
if (!isRunningInDocker && !isTestEnvironment && builder.Environment.IsDevelopment())
{
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine("╔════════════════════════════════════════════════════════════════════╗");
    Console.WriteLine("║  WARNING: Running outside Docker is not supported.                 ║");
    Console.WriteLine("║  Please use: docker compose up -d                                  ║");
    Console.WriteLine("║  See DOCKER_CONTRACT.md for details.                               ║");
    Console.WriteLine("╚════════════════════════════════════════════════════════════════════╝");
    Console.ResetColor();
}

// =============================================================================
// SERILOG CONFIGURATION (Production only)
// =============================================================================
// In Production, Serilog reads config from appsettings.Production.json
// Features: structured JSON logging, file rotation, enrichers
// In Development, uses default console logging for simplicity
if (!builder.Environment.IsDevelopment())
{
    Log.Logger = new LoggerConfiguration()
        .ReadFrom.Configuration(builder.Configuration)
        .CreateLogger();

    builder.Host.UseSerilog();
}

// =============================================================================
// SERVICES
// =============================================================================

// Add controllers with request body size limit
builder.Services.AddControllers();

// Global request body size limit (5MB) to prevent abuse
// Individual endpoints can override with [RequestSizeLimit] attribute
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 5 * 1024 * 1024; // 5MB
});

// API Versioning
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),
        new HeaderApiVersionReader("X-Api-Version")
    );
}).AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

// Swagger for development
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "Nexus API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter your token below.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// Rate Limiting
builder.Services.AddRateLimitingPolicies(builder.Configuration);

// Response Compression - reduces bandwidth by 70% for JSON responses
// Note: EnableForHttps is safe here because we use JWT Bearer tokens (not cookies).
// BREACH attacks only affect cookie-based auth where secrets are reflected in responses.
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.MimeTypes = new[]
    {
        "application/json",
        "text/json",
        "application/json; charset=utf-8"
    };
});

// PostgreSQL + EF Core
builder.Services.AddDbContext<NexusDbContext>((sp, options) =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});

// TenantContext - scoped per request
builder.Services.AddScoped<TenantContext>();

// Domain services, Meilisearch, Registration Policy Engine, AI, SignalR, Llama
builder.Services.AddNexusServices(builder.Configuration);

// JWT Bearer authentication + AdminOnly authorization policy
builder.Services.AddNexusAuthentication(builder.Configuration, isTestEnvironment);

// Health checks
var healthChecks = builder.Services.AddHealthChecks();
var defaultConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(defaultConnectionString))
    healthChecks.AddNpgSql(defaultConnectionString);
healthChecks.AddCheck<LlamaHealthCheck>("llama", tags: new[] { "ready" });

// CORS - Only browser origins, no internal services
// Note: AllowCredentials() is NOT used since we use JWT Bearer tokens (not cookies)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? Array.Empty<string>();

// Sanitize origins: remove trailing slashes, empty entries, validate format
allowedOrigins = allowedOrigins
    .Where(o => !string.IsNullOrWhiteSpace(o))
    .Select(o => o.TrimEnd('/'))
    .Where(o => Uri.TryCreate(o, UriKind.Absolute, out var uri)
                && (uri.Scheme == "http" || uri.Scheme == "https")
                && string.IsNullOrEmpty(uri.PathAndQuery.TrimStart('/')))
    .Distinct()
    .ToArray();

// In Production, CORS origins are required; in Development, warn but allow startup
if (allowedOrigins.Length == 0)
{
    if (builder.Environment.IsProduction())
    {
        throw new InvalidOperationException(
            "Cors:AllowedOrigins must be configured in Production. " +
            "Check appsettings.Production.json");
    }
    else
    {
        // Development: log warning, CORS policy will reject all cross-origin requests
        // Swagger/same-origin requests still work
        Console.WriteLine("WARNING: No valid CORS origins configured. Cross-origin requests will be blocked.");
    }
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("Default", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyMethod()
                // Security: Only allow headers actually needed by the API
                // - Authorization: JWT Bearer token
                // - Content-Type: JSON request bodies
                // - X-Api-Version: API versioning header
                // - X-Requested-With: Required by SignalR client
                // - X-SignalR-User-Agent: SignalR connection metadata
                .WithHeaders("Authorization", "Content-Type", "X-Api-Version", "X-Requested-With", "X-SignalR-User-Agent")
                // Performance: Cache preflight responses for 30 minutes
                // Reduces OPTIONS requests from browsers
                .SetPreflightMaxAge(TimeSpan.FromMinutes(30));
        }
        // Note: Do NOT use AllowCredentials() with JWT Bearer auth
        // AllowCredentials() is only needed for cookie-based auth
    });
});

var app = builder.Build();

// =============================================================================
// STARTUP LOGGING
// =============================================================================
// Log environment and CORS configuration (no sensitive values)
var startupLogger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
var corsMode = app.Environment.IsProduction() ? "strict" : "permissive";
startupLogger.LogInformation(
    "Environment: {Environment} | CORS origins: {OriginCount} | CORS mode: {CorsMode}",
    app.Environment.EnvironmentName,
    allowedOrigins.Length,
    corsMode);

if (allowedOrigins.Length > 0 && !app.Environment.IsProduction())
{
    // In Development, log the actual origins for debugging (safe - just localhost URLs)
    startupLogger.LogDebug("CORS allowed origins: {Origins}", string.Join(", ", allowedOrigins));
}

// =============================================================================
// DATABASE INITIALIZATION
// =============================================================================
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    // Apply EF migrations on every startup (skip in Testing — tests use EnsureCreated)
    if (!app.Environment.IsEnvironment("Testing"))
    {
        await db.Database.MigrateAsync();
    }

    // WARNING: TEST DATA ONLY — never runs in Production.
    // Seeds fictitious tenants/users/listings with well-known dev passwords.
    if (app.Environment.IsDevelopment())
    {
        await SeedData.SeedAsync(db, logger, app.Environment);
    }
}

// =============================================================================
// MIDDLEWARE PIPELINE (order matters!)
// =============================================================================
// 1. Exception Handling - MUST be first to catch all errors
// 2. Response Compression - compress responses early
// 3. Swagger (dev only)
// 4. HTTPS redirect (prod only)
// 5. Rate Limiting - MUST be early to protect all endpoints
// 6. CORS
// 7. Authentication - parses JWT, populates HttpContext.User
// 8. Authorization - checks [Authorize] attributes
// 9. TenantResolution - reads tenant_id from JWT claims (MUST be after auth)
// 10. Controllers
// =============================================================================

// Forwarded Headers - MUST be first to ensure correct client IPs behind reverse proxy (nginx)
// Without this, HttpContext.Connection.RemoteIpAddress shows the proxy IP, not the real client
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

// Sentry performance tracing
app.UseSentryTracing();

// Global exception handling - MUST be early in pipeline
// In Development: returns full exception details
// In Production: returns generic error message (no sensitive details)
app.UseExceptionHandling();

// Response compression - reduces bandwidth by 70% for JSON payloads
app.UseResponseCompression();

// Development only
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// HTTPS redirection (prod only)
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Security headers - add early to apply to all responses
app.UseSecurityHeaders();

// Rate Limiting - early in pipeline to protect all endpoints
app.UseRateLimiter();

// CORS
app.UseCors("Default");

// Authentication - populates HttpContext.User from JWT
app.UseAuthentication();

// Authorization - enforces [Authorize] attributes
app.UseAuthorization();

// Emergency Lockdown check - blocks non-admin, non-health requests when lockdown is active
// MUST be after Authentication/Authorization so admin role can be checked
app.UseMiddleware<LockdownCheckMiddleware>();

// Federation API middleware - authenticates external federation API calls
// Uses API Key or Federation JWT, separate from standard auth
app.UseMiddleware<FederationApiMiddleware>();

// Tenant resolution - MUST come after UseAuthentication()
// Reads tenant_id from JWT claims and sets TenantContext
app.UseMiddleware<TenantResolutionMiddleware>();

// Map controllers and health checks
app.MapControllers();
app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var result = System.Text.Json.JsonSerializer.Serialize(new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                duration = e.Value.Duration.TotalMilliseconds
            })
        });
        await context.Response.WriteAsync(result);
    }
});

// Map SignalR hubs
// Endpoint: /hubs/messages
// WebSocket connection: ws://localhost:5080/hubs/messages?access_token=<jwt>
app.MapHub<MessagesHub>("/hubs/messages");

// =============================================================================
// RUN
// =============================================================================

app.Run();

// Make Program class accessible for integration tests
public partial class Program { }

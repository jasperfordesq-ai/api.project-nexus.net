using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Nexus.Application.Common.Interfaces;
using Nexus.Infrastructure.Persistence;
using Nexus.Infrastructure.Services;
using Nexus.Infrastructure.Identity;

namespace Nexus.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Database
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string not found");

        services.AddDbContext<NexusDbContext>(options =>
            options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

        // Multi-tenant services
        services.AddScoped<ICurrentTenantService, CurrentTenantService>();
        services.AddScoped<ITenantResolver, TenantResolver>();

        // Identity services
        services.AddScoped<ITokenService, JwtTokenService>();

        // Caching
        var redisConnection = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrEmpty(redisConnection))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnection;
                options.InstanceName = "Nexus:";
            });
        }
        else
        {
            services.AddDistributedMemoryCache();
        }

        // Authentication
        var jwtSecret = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT secret not configured");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    // Check if token is revoked
                    var tokenService = context.HttpContext.RequestServices
                        .GetRequiredService<ITokenService>();

                    var jti = context.Principal?.FindFirst("jti")?.Value;
                    if (!string.IsNullOrEmpty(jti))
                    {
                        var isRevoked = await tokenService.IsTokenRevokedAsync(jti);
                        if (isRevoked)
                        {
                            context.Fail("Token has been revoked");
                        }
                    }
                }
            };
        });

        // HTTP client for PHP proxy
        services.AddHttpClient("PhpProxy", client =>
        {
            var phpBaseUrl = configuration["PhpApi:BaseUrl"]
                ?? "http://localhost:8080";
            client.BaseAddress = new Uri(phpBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        return services;
    }
}

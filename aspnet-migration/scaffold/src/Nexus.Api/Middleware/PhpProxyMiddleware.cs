using System.Net.Http.Headers;

namespace Nexus.Api.Middleware;

/// <summary>
/// Strangler Fig Pattern: Proxies unmigrated endpoints to the PHP application.
/// As endpoints are migrated, remove them from the _unmigratedPaths list.
/// </summary>
public class PhpProxyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PhpProxyMiddleware> _logger;
    private readonly string _phpBaseUrl;

    // List of paths that have been migrated to .NET
    // Remove paths from _unmigratedPaths as they are migrated
    private static readonly HashSet<string> _migratedPrefixes = new(StringComparer.OrdinalIgnoreCase)
    {
        // Phase 1: Authentication (uncomment as migrated)
        // "/api/v2/auth",
        // "/api/auth/login",
        // "/api/auth/refresh-token",

        // Phase 2: Users (uncomment as migrated)
        // "/api/v2/users",

        // Phase 3: Listings (uncomment as migrated)
        // "/api/v2/listings",

        // Add more as migration progresses...
    };

    public PhpProxyMiddleware(
        RequestDelegate next,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<PhpProxyMiddleware> logger)
    {
        _next = next;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _phpBaseUrl = configuration["PhpApi:BaseUrl"]
            ?? throw new InvalidOperationException("PhpApi:BaseUrl not configured");
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "";

        // Check if this endpoint has been migrated
        if (IsMigratedEndpoint(path))
        {
            _logger.LogDebug("Handling migrated endpoint: {Path}", path);
            await _next(context);
            return;
        }

        // Proxy to PHP for unmigrated endpoints
        _logger.LogDebug("Proxying to PHP: {Path}", path);
        await ProxyToPhpAsync(context);
    }

    private bool IsMigratedEndpoint(string path)
    {
        return _migratedPrefixes.Any(prefix =>
            path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));
    }

    private async Task ProxyToPhpAsync(HttpContext context)
    {
        var httpClient = _httpClientFactory.CreateClient("PhpProxy");

        try
        {
            var targetUri = new Uri($"{_phpBaseUrl}{context.Request.Path}{context.Request.QueryString}");

            var requestMessage = new HttpRequestMessage
            {
                Method = new HttpMethod(context.Request.Method),
                RequestUri = targetUri
            };

            // Copy request headers
            foreach (var header in context.Request.Headers)
            {
                // Skip headers that shouldn't be forwarded
                if (header.Key.Equals("Host", StringComparison.OrdinalIgnoreCase))
                    continue;

                requestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }

            // Copy request body for POST/PUT/PATCH
            if (context.Request.ContentLength > 0 ||
                context.Request.Headers.ContainsKey("Transfer-Encoding"))
            {
                var content = new StreamContent(context.Request.Body);

                if (context.Request.ContentType != null)
                {
                    content.Headers.ContentType = MediaTypeHeaderValue.Parse(context.Request.ContentType);
                }

                requestMessage.Content = content;
            }

            // Send request to PHP
            var response = await httpClient.SendAsync(
                requestMessage,
                HttpCompletionOption.ResponseHeadersRead,
                context.RequestAborted);

            // Copy response status
            context.Response.StatusCode = (int)response.StatusCode;

            // Copy response headers
            foreach (var header in response.Headers)
            {
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }

            foreach (var header in response.Content.Headers)
            {
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }

            // Remove headers that shouldn't be passed through
            context.Response.Headers.Remove("transfer-encoding");

            // Copy response body
            await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to proxy request to PHP: {Path}", context.Request.Path);

            context.Response.StatusCode = StatusCodes.Status502BadGateway;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "PHP backend unavailable",
                message = "The legacy API is temporarily unavailable"
            });
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Request to PHP timed out: {Path}", context.Request.Path);

            context.Response.StatusCode = StatusCodes.Status504GatewayTimeout;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Gateway timeout",
                message = "The request timed out"
            });
        }
    }
}

/// <summary>
/// Extension methods for registering the PHP proxy
/// </summary>
public static class PhpProxyExtensions
{
    public static IServiceCollection AddPhpProxy(this IServiceCollection services, IConfiguration configuration)
    {
        var phpBaseUrl = configuration["PhpApi:BaseUrl"]
            ?? throw new InvalidOperationException("PhpApi:BaseUrl not configured");

        services.AddHttpClient("PhpProxy", client =>
        {
            client.BaseAddress = new Uri(phpBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        return services;
    }
}

using System.Net;
using System.Text.Json;
using FluentValidation;
using Nexus.Application.Common.Exceptions;

namespace Nexus.Api.Middleware;

/// <summary>
/// Global exception handling middleware that converts exceptions to standardized API responses.
/// Matches the error response format of the PHP API for compatibility.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, response) = exception switch
        {
            ValidationException validationEx => HandleValidationException(validationEx),
            NotFoundException notFoundEx => HandleNotFoundException(notFoundEx),
            UnauthorizedException unauthorizedEx => HandleUnauthorizedException(unauthorizedEx),
            ForbiddenException forbiddenEx => HandleForbiddenException(forbiddenEx),
            ConflictException conflictEx => HandleConflictException(conflictEx),
            RateLimitExceededException rateLimitEx => HandleRateLimitException(rateLimitEx),
            _ => HandleUnexpectedException(exception)
        };

        // Log the exception
        if (statusCode >= 500)
        {
            _logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);
        }
        else
        {
            _logger.LogWarning("Request failed: {StatusCode} - {Message}", statusCode, exception.Message);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;

        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
    }

    private (int StatusCode, object Response) HandleValidationException(ValidationException exception)
    {
        var errors = exception.Errors
            .GroupBy(e => e.PropertyName)
            .ToDictionary(
                g => ToCamelCase(g.Key),
                g => g.Select(e => e.ErrorMessage).ToArray());

        return (StatusCodes.Status400BadRequest, new
        {
            success = false,
            error = "Validation failed",
            code = "VALIDATION_ERROR",
            errors
        });
    }

    private (int StatusCode, object Response) HandleNotFoundException(NotFoundException exception)
    {
        return (StatusCodes.Status404NotFound, new
        {
            success = false,
            error = exception.Message,
            code = "NOT_FOUND"
        });
    }

    private (int StatusCode, object Response) HandleUnauthorizedException(UnauthorizedException exception)
    {
        return (StatusCodes.Status401Unauthorized, new
        {
            success = false,
            error = exception.Message,
            code = "UNAUTHORIZED"
        });
    }

    private (int StatusCode, object Response) HandleForbiddenException(ForbiddenException exception)
    {
        return (StatusCodes.Status403Forbidden, new
        {
            success = false,
            error = exception.Message,
            code = "FORBIDDEN"
        });
    }

    private (int StatusCode, object Response) HandleConflictException(ConflictException exception)
    {
        return (StatusCodes.Status409Conflict, new
        {
            success = false,
            error = exception.Message,
            code = "CONFLICT"
        });
    }

    private (int StatusCode, object Response) HandleRateLimitException(RateLimitExceededException exception)
    {
        return (StatusCodes.Status429TooManyRequests, new
        {
            success = false,
            error = exception.Message,
            code = "RATE_LIMIT_EXCEEDED",
            retryAfter = exception.RetryAfterSeconds
        });
    }

    private (int StatusCode, object Response) HandleUnexpectedException(Exception exception)
    {
        var response = new
        {
            success = false,
            error = _environment.IsDevelopment()
                ? exception.Message
                : "An unexpected error occurred",
            code = "SERVER_ERROR",
            // Only include stack trace in development
            stackTrace = _environment.IsDevelopment() ? exception.StackTrace : null
        };

        return (StatusCodes.Status500InternalServerError, response);
    }

    private static string ToCamelCase(string value)
    {
        if (string.IsNullOrEmpty(value))
            return value;

        return char.ToLowerInvariant(value[0]) + value[1..];
    }
}

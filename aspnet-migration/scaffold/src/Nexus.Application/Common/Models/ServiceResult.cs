namespace Nexus.Application.Common.Models;

/// <summary>
/// Standard result type for service operations.
/// Maps to the PHP pattern of returning null + errors array.
/// </summary>
public class ServiceResult
{
    public bool Success { get; protected set; }
    public List<ServiceError> Errors { get; protected set; } = new();

    public static ServiceResult Ok() => new() { Success = true };

    public static ServiceResult Fail(string code, string message, string? field = null)
    {
        var result = new ServiceResult { Success = false };
        result.Errors.Add(new ServiceError(code, message, field));
        return result;
    }

    public static ServiceResult Fail(IEnumerable<ServiceError> errors)
    {
        var result = new ServiceResult { Success = false };
        result.Errors.AddRange(errors);
        return result;
    }
}

/// <summary>
/// Generic result type with data payload.
/// </summary>
public class ServiceResult<T> : ServiceResult
{
    public T? Data { get; private set; }

    public static ServiceResult<T> Ok(T data) => new()
    {
        Success = true,
        Data = data
    };

    public new static ServiceResult<T> Fail(string code, string message, string? field = null)
    {
        var result = new ServiceResult<T> { Success = false };
        result.Errors.Add(new ServiceError(code, message, field));
        return result;
    }

    public new static ServiceResult<T> Fail(IEnumerable<ServiceError> errors)
    {
        var result = new ServiceResult<T> { Success = false };
        result.Errors.AddRange(errors);
        return result;
    }
}

/// <summary>
/// Represents a single error in a service operation.
/// Maps to PHP's error array format: ['code' => ..., 'message' => ..., 'field' => ...]
/// </summary>
public record ServiceError(string Code, string Message, string? Field = null);

/// <summary>
/// Common error codes matching PHP ApiErrorCodes.
/// </summary>
public static class ErrorCodes
{
    public const string ValidationError = "VALIDATION_ERROR";
    public const string NotFound = "NOT_FOUND";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string Forbidden = "FORBIDDEN";
    public const string Conflict = "CONFLICT";
    public const string RateLimitExceeded = "RATE_LIMIT_EXCEEDED";
    public const string ServerError = "SERVER_ERROR";
    public const string InvalidToken = "INVALID_TOKEN";
    public const string TokenExpired = "TOKEN_EXPIRED";
    public const string InsufficientBalance = "INSUFFICIENT_BALANCE";
    public const string FeatureDisabled = "FEATURE_DISABLED";
    public const string TenantMismatch = "TENANT_MISMATCH";
}

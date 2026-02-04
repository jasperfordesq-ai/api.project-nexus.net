namespace Nexus.Application.Common.Exceptions;

/// <summary>
/// Exception for when a requested resource is not found.
/// </summary>
public class NotFoundException : Exception
{
    public NotFoundException() : base("Resource not found") { }

    public NotFoundException(string message) : base(message) { }

    public NotFoundException(string entityName, object key)
        : base($"{entityName} with id '{key}' was not found") { }

    public NotFoundException(string message, Exception innerException)
        : base(message, innerException) { }
}

/// <summary>
/// Exception for authentication failures.
/// </summary>
public class UnauthorizedException : Exception
{
    public UnauthorizedException() : base("Unauthorized") { }

    public UnauthorizedException(string message) : base(message) { }

    public UnauthorizedException(string message, Exception innerException)
        : base(message, innerException) { }
}

/// <summary>
/// Exception for authorization failures (authenticated but not permitted).
/// </summary>
public class ForbiddenException : Exception
{
    public ForbiddenException() : base("Access denied") { }

    public ForbiddenException(string message) : base(message) { }

    public ForbiddenException(string message, Exception innerException)
        : base(message, innerException) { }
}

/// <summary>
/// Exception for resource conflicts (e.g., duplicate entries).
/// </summary>
public class ConflictException : Exception
{
    public ConflictException() : base("Resource conflict") { }

    public ConflictException(string message) : base(message) { }

    public ConflictException(string message, Exception innerException)
        : base(message, innerException) { }
}

/// <summary>
/// Exception for rate limit violations.
/// </summary>
public class RateLimitExceededException : Exception
{
    public int RetryAfterSeconds { get; }

    public RateLimitExceededException(int retryAfterSeconds = 60)
        : base("Rate limit exceeded")
    {
        RetryAfterSeconds = retryAfterSeconds;
    }

    public RateLimitExceededException(string message, int retryAfterSeconds = 60)
        : base(message)
    {
        RetryAfterSeconds = retryAfterSeconds;
    }
}

/// <summary>
/// Exception for disabled features.
/// </summary>
public class FeatureDisabledException : Exception
{
    public string FeatureName { get; }

    public FeatureDisabledException(string featureName)
        : base($"Feature '{featureName}' is not enabled for this tenant")
    {
        FeatureName = featureName;
    }
}

/// <summary>
/// Exception for insufficient wallet balance.
/// </summary>
public class InsufficientBalanceException : Exception
{
    public decimal Required { get; }
    public decimal Available { get; }

    public InsufficientBalanceException(decimal required, decimal available)
        : base($"Insufficient balance. Required: {required}, Available: {available}")
    {
        Required = required;
        Available = available;
    }
}

/// <summary>
/// Exception for tenant context issues.
/// </summary>
public class TenantMismatchException : Exception
{
    public TenantMismatchException()
        : base("Tenant context mismatch") { }

    public TenantMismatchException(string message)
        : base(message) { }
}

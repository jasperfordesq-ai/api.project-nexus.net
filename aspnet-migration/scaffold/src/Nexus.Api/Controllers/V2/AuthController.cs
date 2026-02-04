using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Application.Features.Auth.Commands;
using Nexus.Application.Features.Auth.Queries;

namespace Nexus.Api.Controllers.V2;

/// <summary>
/// Authentication controller - handles login, logout, token refresh.
/// Maps to PHP AuthController.
/// </summary>
[ApiController]
[ApiVersion("2.0")]
[Route("api/auth")]
[Route("api/v{version:apiVersion}/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IMediator mediator, ILogger<AuthController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Login with email and password.
    /// Returns JWT tokens for API authentication.
    /// </summary>
    /// <remarks>
    /// Rate limited: 5 attempts per 15 minutes.
    /// Returns 2FA challenge if enabled.
    /// </remarks>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginCommand command)
    {
        // Set client info from request
        command = command with
        {
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString()
        };

        var result = await _mediator.Send(command);

        if (!result.Success)
        {
            return result.Errors.First().Code switch
            {
                "RATE_LIMIT_EXCEEDED" => StatusCode(429, result),
                "INVALID_CREDENTIALS" => Unauthorized(result),
                "ACCOUNT_LOCKED" => StatusCode(423, result),
                _ => BadRequest(result)
            };
        }

        return Ok(result);
    }

    /// <summary>
    /// Refresh access token using refresh token.
    /// </summary>
    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenCommand command)
    {
        var result = await _mediator.Send(command);

        if (!result.Success)
        {
            return Unauthorized(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Validate access token.
    /// </summary>
    [HttpGet("validate-token")]
    [HttpPost("validate-token")]
    [Authorize]
    public async Task<IActionResult> ValidateToken()
    {
        var result = await _mediator.Send(new ValidateTokenQuery());
        return Ok(result);
    }

    /// <summary>
    /// Check current session status.
    /// </summary>
    [HttpGet("check-session")]
    [Authorize]
    public async Task<IActionResult> CheckSession()
    {
        var result = await _mediator.Send(new GetSessionQuery());
        return Ok(result);
    }

    /// <summary>
    /// Logout - revokes current token.
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var result = await _mediator.Send(new LogoutCommand());
        return Ok(result);
    }

    /// <summary>
    /// Revoke a specific token.
    /// </summary>
    [HttpPost("revoke")]
    [Authorize]
    public async Task<IActionResult> RevokeToken([FromBody] RevokeTokenCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Revoke all tokens for current user (logout everywhere).
    /// </summary>
    [HttpPost("revoke-all")]
    [Authorize]
    public async Task<IActionResult> RevokeAllTokens()
    {
        var result = await _mediator.Send(new RevokeAllTokensCommand());
        return Ok(result);
    }

    /// <summary>
    /// Get CSRF token for form submissions.
    /// </summary>
    [HttpGet("csrf-token")]
    [AllowAnonymous]
    public IActionResult GetCsrfToken()
    {
        // Generate CSRF token using ASP.NET Core antiforgery
        // Note: For Bearer token auth, CSRF is not needed
        return Ok(new
        {
            success = true,
            csrf_token = Guid.NewGuid().ToString("N") // Placeholder
        });
    }

    /// <summary>
    /// Session heartbeat - keeps session alive.
    /// </summary>
    [HttpPost("heartbeat")]
    [Authorize]
    public IActionResult Heartbeat()
    {
        return Ok(new { success = true, timestamp = DateTime.UtcNow });
    }
}

// Placeholder command/query records - implement in Application layer
namespace Nexus.Application.Features.Auth.Commands
{
    public record LoginCommand(
        string Email,
        string Password,
        string? TwoFactorCode = null,
        string? TwoFactorToken = null,
        bool RememberMe = false,
        string? IpAddress = null,
        string? UserAgent = null) : IRequest<LoginResult>;

    public record RefreshTokenCommand(string RefreshToken) : IRequest<TokenResult>;
    public record LogoutCommand() : IRequest<ServiceResult>;
    public record RevokeTokenCommand(string Jti) : IRequest<ServiceResult>;
    public record RevokeAllTokensCommand() : IRequest<ServiceResult>;
}

namespace Nexus.Application.Features.Auth.Queries
{
    public record ValidateTokenQuery() : IRequest<TokenValidationDto>;
    public record GetSessionQuery() : IRequest<SessionDto>;
}

// DTOs
public record LoginResult(
    bool Success,
    UserDto? User = null,
    string? AccessToken = null,
    string? RefreshToken = null,
    string? TokenType = null,
    int? ExpiresIn = null,
    bool Requires2FA = false,
    string? TwoFactorToken = null,
    List<string>? TwoFactorMethods = null,
    List<ServiceError>? Errors = null);

public record TokenResult(
    bool Success,
    string? AccessToken = null,
    string? RefreshToken = null,
    int? ExpiresIn = null,
    List<ServiceError>? Errors = null);

public record TokenValidationDto(
    bool Valid,
    int? UserId,
    int? TenantId,
    string? Role,
    DateTime? ExpiresAt);

public record SessionDto(
    bool Active,
    int? UserId,
    int? TenantId,
    string? Role,
    string? Email);

public record UserDto(
    int Id,
    string Email,
    string FirstName,
    string LastName,
    string? Avatar,
    int TenantId,
    string Role);

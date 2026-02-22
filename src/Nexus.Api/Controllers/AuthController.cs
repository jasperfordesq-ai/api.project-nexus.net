// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Middleware;
using Nexus.Api.Services;
using Nexus.Contracts.Events;
using Nexus.Messaging;

namespace Nexus.Api.Controllers;

/// <summary>
/// Authentication controller - JWT generation, validation, and token management.
/// Phase 8: Added logout, refresh, register, and password reset endpoints.
/// Rate limited to prevent brute-force attacks.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/auth")]
[Route("api/auth")] // Backward compatibility
public class AuthController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;
    private readonly IEventPublisher _eventPublisher;
    private readonly IEmailService _emailService;

    // Refresh token validity (7 days default)
    private const int RefreshTokenExpiryDays = 7;
    // Password reset token validity (1 hour)
    private const int PasswordResetExpiryMinutes = 60;

    public AuthController(
        NexusDbContext db,
        IConfiguration config,
        ILogger<AuthController> logger,
        IEventPublisher eventPublisher,
        IEmailService emailService)
    {
        _db = db;
        _config = config;
        _logger = logger;
        _eventPublisher = eventPublisher;
        _emailService = emailService;
    }

    /// <summary>
    /// Login with email, password, and tenant identifier.
    /// Returns access token and refresh token.
    /// Rate limited: 5 requests per minute per IP.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // Validate required fields
        if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest(new { error = "Email and password are required" });
        }

        // Tenant identifier is required (slug preferred, id as fallback)
        if (string.IsNullOrEmpty(request.TenantSlug) && !request.TenantId.HasValue)
        {
            return BadRequest(new
            {
                error = "Tenant identifier required",
                message = "Provide tenant_slug (preferred) or tenant_id"
            });
        }

        // Step 1: Resolve tenant first
        var tenant = await ResolveTenantAsync(request.TenantSlug, request.TenantId);
        if (tenant == null)
        {
            _logger.LogWarning("Login failed: tenant not found (slug={Slug}, id={Id})",
                request.TenantSlug, request.TenantId);
            return Unauthorized(new { error = "Invalid credentials" });
        }

        if (!tenant.IsActive)
        {
            _logger.LogWarning("Login failed: tenant {TenantId} is inactive", tenant.Id);
            return Unauthorized(new { error = "Tenant is not active" });
        }

        // Step 2: Find user within the resolved tenant only
        var user = await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u =>
                u.TenantId == tenant.Id &&
                u.Email == request.Email &&
                u.IsActive);

        if (user == null)
        {
            _logger.LogWarning("Login failed: user not found for {Email} in tenant {TenantId}",
                request.Email, tenant.Id);
            return Unauthorized(new { error = "Invalid credentials" });
        }

        // Step 3: Verify password (using BCrypt - same as PHP)
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Login failed: invalid password for {Email} in tenant {TenantId}",
                request.Email, tenant.Id);
            return Unauthorized(new { error = "Invalid credentials" });
        }

        // Step 4: Update last login
        user.LastLoginAt = DateTime.UtcNow;

        // Step 5: Generate tokens
        var accessToken = GenerateJwt(user);
        var (refreshToken, refreshTokenHash) = GenerateRefreshToken();

        // Step 6: Store refresh token
        var refreshTokenEntity = new RefreshToken
        {
            TenantId = user.TenantId,
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenExpiryDays),
            ClientType = request.ClientType,
            CreatedByIp = GetClientIp()
        };
        _db.RefreshTokens.Add(refreshTokenEntity);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} logged in to tenant {TenantId}", user.Id, tenant.Id);

        return Ok(new
        {
            success = true,
            access_token = accessToken,
            refresh_token = refreshToken,
            token_type = "Bearer",
            expires_in = _config.GetValue<int>("Jwt:AccessTokenExpiryMinutes", 120) * 60,
            user = new
            {
                id = user.Id,
                email = user.Email,
                first_name = user.FirstName,
                last_name = user.LastName,
                role = user.Role,
                tenant_id = user.TenantId,
                tenant_slug = tenant.Slug
            }
        });
    }

    /// <summary>
    /// Logout - revokes the current refresh token.
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest? request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (!string.IsNullOrEmpty(request?.RefreshToken))
        {
            // Revoke specific refresh token
            var tokenHash = HashToken(request.RefreshToken);
            var token = await _db.RefreshTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.TokenHash == tokenHash && t.RevokedAt == null);

            if (token != null)
            {
                token.RevokedAt = DateTime.UtcNow;
                token.RevokedReason = "logout";
                await _db.SaveChangesAsync();
            }
        }
        else
        {
            // Revoke all refresh tokens for this user
            var tokens = await _db.RefreshTokens
                .Where(t => t.UserId == userId && t.RevokedAt == null)
                .ToListAsync();

            foreach (var token in tokens)
            {
                token.RevokedAt = DateTime.UtcNow;
                token.RevokedReason = "logout_all";
            }
            await _db.SaveChangesAsync();
        }

        _logger.LogInformation("User {UserId} logged out", userId);

        return Ok(new { success = true, message = "Logged out successfully" });
    }

    /// <summary>
    /// Refresh access token using a valid refresh token.
    /// </summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        if (string.IsNullOrEmpty(request.RefreshToken))
        {
            return BadRequest(new { error = "Refresh token is required" });
        }

        var tokenHash = HashToken(request.RefreshToken);

        // Find the refresh token (ignore tenant filter - we'll verify manually)
        var refreshToken = await _db.RefreshTokens
            .IgnoreQueryFilters()
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (refreshToken == null)
        {
            _logger.LogWarning("Refresh failed: token not found");
            return Unauthorized(new { error = "Invalid refresh token" });
        }

        if (!refreshToken.IsValid)
        {
            _logger.LogWarning("Refresh failed: token expired or revoked for user {UserId}", refreshToken.UserId);
            return Unauthorized(new { error = "Refresh token expired or revoked" });
        }

        if (refreshToken.User == null || !refreshToken.User.IsActive)
        {
            _logger.LogWarning("Refresh failed: user inactive for token {TokenId}", refreshToken.Id);
            return Unauthorized(new { error = "User account is inactive" });
        }

        // Revoke old refresh token (rotation)
        refreshToken.RevokedAt = DateTime.UtcNow;
        refreshToken.RevokedReason = "rotation";

        // Generate new tokens
        var accessToken = GenerateJwt(refreshToken.User);
        var (newRefreshToken, newRefreshTokenHash) = GenerateRefreshToken();

        // Store new refresh token
        var newRefreshTokenEntity = new RefreshToken
        {
            TenantId = refreshToken.TenantId,
            UserId = refreshToken.UserId,
            TokenHash = newRefreshTokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenExpiryDays),
            ClientType = refreshToken.ClientType,
            CreatedByIp = GetClientIp()
        };
        _db.RefreshTokens.Add(newRefreshTokenEntity);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Token refreshed for user {UserId}", refreshToken.UserId);

        return Ok(new
        {
            success = true,
            access_token = accessToken,
            refresh_token = newRefreshToken,
            token_type = "Bearer",
            expires_in = _config.GetValue<int>("Jwt:AccessTokenExpiryMinutes", 120) * 60
        });
    }

    /// <summary>
    /// Register a new user.
    /// Rate limited: 5 requests per minute per IP.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        // Validate required fields
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.Email))
            errors.Add("Email is required");
        else if (!IsValidEmail(request.Email))
            errors.Add("Invalid email format");

        if (string.IsNullOrWhiteSpace(request.Password))
            errors.Add("Password is required");
        else if (request.Password.Length < 8)
            errors.Add("Password must be at least 8 characters");

        if (string.IsNullOrWhiteSpace(request.FirstName))
            errors.Add("First name is required");
        else if (request.FirstName.Length > 100)
            errors.Add("First name must be 100 characters or less");

        if (string.IsNullOrWhiteSpace(request.LastName))
            errors.Add("Last name is required");
        else if (request.LastName.Length > 100)
            errors.Add("Last name must be 100 characters or less");

        if (string.IsNullOrEmpty(request.TenantSlug) && !request.TenantId.HasValue)
            errors.Add("Tenant identifier required (tenant_slug or tenant_id)");

        if (errors.Count > 0)
        {
            return BadRequest(new { error = "Validation failed", details = errors });
        }

        // Resolve tenant
        var tenant = await ResolveTenantAsync(request.TenantSlug, request.TenantId);
        if (tenant == null || !tenant.IsActive)
        {
            return BadRequest(new { error = "Invalid or inactive tenant" });
        }

        // Check if email already exists in this tenant
        var existingUser = await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.TenantId == tenant.Id && u.Email == request.Email);

        if (existingUser != null)
        {
            return Conflict(new { error = "Email already registered" });
        }

        // Create user
        var user = new User
        {
            TenantId = tenant.Id,
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Role = "member",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _logger.LogInformation("New user {UserId} registered in tenant {TenantId}", user.Id, tenant.Id);

        // Publish user created event
        await _eventPublisher.PublishAsync(new UserCreatedEvent
        {
            TenantId = user.TenantId,
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            IsActive = user.IsActive
        });

        // Send welcome email (fire and forget - don't block registration)
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendWelcomeEmailAsync(
                    user.Email,
                    $"{user.FirstName} {user.LastName}",
                    tenant.Name);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(ex, "HTTP error sending welcome email for user {UserId}", user.Id);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send welcome email for user {UserId}", user.Id);
            }
        });

        // Auto-login: generate tokens
        var accessToken = GenerateJwt(user);
        var (refreshToken, refreshTokenHash) = GenerateRefreshToken();

        var refreshTokenEntity = new RefreshToken
        {
            TenantId = user.TenantId,
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenExpiryDays),
            ClientType = request.ClientType,
            CreatedByIp = GetClientIp()
        };
        _db.RefreshTokens.Add(refreshTokenEntity);
        await _db.SaveChangesAsync();

        return StatusCode(201, new
        {
            success = true,
            access_token = accessToken,
            refresh_token = refreshToken,
            token_type = "Bearer",
            expires_in = _config.GetValue<int>("Jwt:AccessTokenExpiryMinutes", 120) * 60,
            user = new
            {
                id = user.Id,
                email = user.Email,
                first_name = user.FirstName,
                last_name = user.LastName,
                role = user.Role,
                tenant_id = user.TenantId,
                tenant_slug = tenant.Slug
            }
        });
    }

    /// <summary>
    /// Request a password reset. Generates a token (would be emailed in production).
    /// Rate limited: 5 requests per minute per IP.
    /// </summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        // Always return success to prevent email enumeration
        var successResponse = new { success = true, message = "If the email exists, a reset link will be sent" };

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { error = "Email is required" });
        }

        if (string.IsNullOrEmpty(request.TenantSlug) && !request.TenantId.HasValue)
        {
            return BadRequest(new { error = "Tenant identifier required" });
        }

        // Resolve tenant
        var tenant = await ResolveTenantAsync(request.TenantSlug, request.TenantId);
        if (tenant == null)
        {
            // Don't reveal tenant doesn't exist
            return Ok(successResponse);
        }

        // Find user
        var user = await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.TenantId == tenant.Id && u.Email == request.Email && u.IsActive);

        if (user == null)
        {
            // Don't reveal user doesn't exist
            return Ok(successResponse);
        }

        // Invalidate any existing reset tokens
        var existingTokens = await _db.PasswordResetTokens
            .IgnoreQueryFilters()
            .Where(t => t.UserId == user.Id && t.UsedAt == null)
            .ToListAsync();

        foreach (var existingToken in existingTokens)
        {
            existingToken.UsedAt = DateTime.UtcNow; // Mark as used
        }

        // Generate new reset token
        var (resetToken, resetTokenHash) = GenerateRefreshToken(); // Reuse the same generation method

        var passwordResetToken = new PasswordResetToken
        {
            TenantId = user.TenantId,
            UserId = user.Id,
            TokenHash = resetTokenHash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(PasswordResetExpiryMinutes)
        };
        _db.PasswordResetTokens.Add(passwordResetToken);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Password reset requested for user {UserId}", user.Id);

        // Build reset URL
        var baseUrl = _config["App:FrontendUrl"] ?? "https://app.project-nexus.net";
        var resetUrl = $"{baseUrl}/reset-password?token={Uri.EscapeDataString(resetToken)}";

        // Send password reset email
        var emailSent = await _emailService.SendPasswordResetEmailAsync(
            user.Email,
            resetToken,
            $"{user.FirstName} {user.LastName}",
            resetUrl);

        if (!emailSent)
        {
            _logger.LogWarning("Failed to send password reset email for user {UserId}", user.Id);
        }

        // In development, also return the token in the response for testing
        if (_config.GetValue<bool>("IsDevelopment", false) ||
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
        {
            return Ok(new
            {
                success = true,
                message = "Password reset token generated",
                reset_token = resetToken, // Only in development!
                expires_in = PasswordResetExpiryMinutes * 60,
                email_sent = emailSent
            });
        }

        return Ok(successResponse);
    }

    /// <summary>
    /// Reset password using a valid reset token.
    /// Rate limited: 5 requests per minute per IP.
    /// </summary>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrEmpty(request.Token))
        {
            return BadRequest(new { error = "Reset token is required" });
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { error = "New password is required" });
        }

        if (request.NewPassword.Length < 8)
        {
            return BadRequest(new { error = "Password must be at least 8 characters" });
        }

        var tokenHash = HashToken(request.Token);

        // Find the reset token
        var resetToken = await _db.PasswordResetTokens
            .IgnoreQueryFilters()
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (resetToken == null)
        {
            return BadRequest(new { error = "Invalid reset token" });
        }

        if (!resetToken.IsValid)
        {
            return BadRequest(new { error = "Reset token expired or already used" });
        }

        if (resetToken.User == null)
        {
            return BadRequest(new { error = "User not found" });
        }

        // Update password
        resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

        // Mark token as used
        resetToken.UsedAt = DateTime.UtcNow;

        // Revoke all refresh tokens (force re-login)
        var refreshTokens = await _db.RefreshTokens
            .IgnoreQueryFilters()
            .Where(t => t.UserId == resetToken.UserId && t.RevokedAt == null)
            .ToListAsync();

        foreach (var token in refreshTokens)
        {
            token.RevokedAt = DateTime.UtcNow;
            token.RevokedReason = "password_change";
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Password reset completed for user {UserId}", resetToken.UserId);

        // Publish password changed event
        await _eventPublisher.PublishAsync(new UserPasswordChangedEvent
        {
            TenantId = resetToken.TenantId,
            UserId = resetToken.UserId,
            WasReset = true
        });

        return Ok(new { success = true, message = "Password reset successfully" });
    }

    /// <summary>
    /// Validate the current access token and return resolved tenant context.
    /// </summary>
    [HttpGet("validate")]
    [Authorize]
    public IActionResult Validate([FromServices] TenantContext tenantContext)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value;

        return Ok(new
        {
            valid = true,
            user_id = userId,
            tenant_id_claim = tenantIdClaim,
            tenant_id_resolved = tenantContext.TenantId,
            tenant_context_matches = tenantIdClaim == tenantContext.TenantId?.ToString(),
            role = role,
            email = email
        });
    }

    #region Private Methods

    private async Task<Tenant?> ResolveTenantAsync(string? slug, int? id)
    {
        if (!string.IsNullOrEmpty(slug))
        {
            return await _db.Tenants.FirstOrDefaultAsync(t => t.Slug == slug);
        }

        if (id.HasValue)
        {
            return await _db.Tenants.FindAsync(id.Value);
        }

        return null;
    }

    private string GenerateJwt(User user)
    {
        var secret = _config["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT secret not configured");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expiryMinutes = _config.GetValue<int>("Jwt:AccessTokenExpiryMinutes", 120);
        var expires = DateTime.UtcNow.AddMinutes(expiryMinutes);

        // Claims must match PHP structure for interoperability
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim("tenant_id", user.TenantId.ToString()),
            new Claim("role", user.Role),
            new Claim("email", user.Email),
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static (string token, string hash) GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        var token = Convert.ToBase64String(randomBytes);
        var hash = HashToken(token);
        return (token, hash);
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }

    private string? GetClientIp()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    private static readonly System.Text.RegularExpressions.Regex EmailRegex = new(
        @"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
        System.Text.RegularExpressions.RegexOptions.Compiled,
        TimeSpan.FromMilliseconds(250)); // ReDoS protection

    private static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 254)
            return false;

        try
        {
            // First validate with regex (RFC 5322 compliant pattern)
            if (!EmailRegex.IsMatch(email))
                return false;

            // Then use MailAddress for additional validation
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email.Trim();
        }
        catch
        {
            return false;
        }
    }

    #endregion
}

#region Request Models

public record LoginRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("email")]
    public string Email { get; init; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("password")]
    public string Password { get; init; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("tenant_slug")]
    public string? TenantSlug { get; init; }

    [System.Text.Json.Serialization.JsonPropertyName("tenant_id")]
    public int? TenantId { get; init; }

    [System.Text.Json.Serialization.JsonPropertyName("client_type")]
    public string? ClientType { get; init; }
}

public record LogoutRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("refresh_token")]
    public string? RefreshToken { get; init; }
}

public record RefreshRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("refresh_token")]
    public string RefreshToken { get; init; } = string.Empty;
}

public record RegisterRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("email")]
    public string Email { get; init; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("password")]
    public string Password { get; init; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("first_name")]
    public string FirstName { get; init; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("last_name")]
    public string LastName { get; init; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("tenant_slug")]
    public string? TenantSlug { get; init; }

    [System.Text.Json.Serialization.JsonPropertyName("tenant_id")]
    public int? TenantId { get; init; }

    [System.Text.Json.Serialization.JsonPropertyName("client_type")]
    public string? ClientType { get; init; }
}

public record ForgotPasswordRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("email")]
    public string Email { get; init; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("tenant_slug")]
    public string? TenantSlug { get; init; }

    [System.Text.Json.Serialization.JsonPropertyName("tenant_id")]
    public int? TenantId { get; init; }
}

public record ResetPasswordRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("token")]
    public string Token { get; init; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("new_password")]
    public string NewPassword { get; init; } = string.Empty;
}

#endregion

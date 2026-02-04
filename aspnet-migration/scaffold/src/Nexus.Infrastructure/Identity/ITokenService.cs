namespace Nexus.Infrastructure.Identity;

/// <summary>
/// Service for JWT token generation and validation.
/// Must produce tokens compatible with PHP TokenService.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Generates an access token for the user.
    /// </summary>
    string GenerateAccessToken(int userId, int tenantId, string role, bool isMobile = false);

    /// <summary>
    /// Generates a refresh token for the user.
    /// </summary>
    string GenerateRefreshToken(int userId, int tenantId, bool isMobile = false);

    /// <summary>
    /// Validates an access token and returns claims if valid.
    /// </summary>
    TokenValidationResult ValidateAccessToken(string token);

    /// <summary>
    /// Validates a refresh token and returns claims if valid.
    /// </summary>
    TokenValidationResult ValidateRefreshToken(string token);

    /// <summary>
    /// Checks if a token (by JTI) has been revoked.
    /// </summary>
    Task<bool> IsTokenRevokedAsync(string jti);

    /// <summary>
    /// Revokes a specific token.
    /// </summary>
    Task RevokeTokenAsync(string jti, int userId);

    /// <summary>
    /// Revokes all tokens for a user.
    /// </summary>
    Task RevokeAllUserTokensAsync(int userId);
}

/// <summary>
/// Result of token validation.
/// </summary>
public record TokenValidationResult(
    bool IsValid,
    int? UserId = null,
    int? TenantId = null,
    string? Role = null,
    string? Jti = null,
    DateTime? ExpiresAt = null,
    string? ErrorMessage = null);

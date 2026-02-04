using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Nexus.Infrastructure.Persistence;

namespace Nexus.Infrastructure.Identity;

/// <summary>
/// JWT token service compatible with PHP TokenService.
/// CRITICAL: Must use same signing key as PHP APP_KEY or JWT_SECRET.
/// </summary>
public class JwtTokenService : ITokenService
{
    private readonly string _secret;
    private readonly NexusDbContext _context;

    // Expiry times must match PHP TokenService
    private static readonly TimeSpan AccessTokenExpiryWeb = TimeSpan.FromHours(2);
    private static readonly TimeSpan AccessTokenExpiryMobile = TimeSpan.FromDays(365);
    private static readonly TimeSpan RefreshTokenExpiryWeb = TimeSpan.FromDays(730); // 2 years
    private static readonly TimeSpan RefreshTokenExpiryMobile = TimeSpan.FromDays(1825); // 5 years

    public JwtTokenService(IConfiguration configuration, NexusDbContext context)
    {
        _secret = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT secret not configured");
        _context = context;
    }

    public string GenerateAccessToken(int userId, int tenantId, string role, bool isMobile = false)
    {
        var expiry = isMobile ? AccessTokenExpiryMobile : AccessTokenExpiryWeb;

        var claims = new[]
        {
            new Claim("user_id", userId.ToString()),
            new Claim("tenant_id", tenantId.ToString()),
            new Claim("role", role),
            new Claim("platform", isMobile ? "mobile" : "web"),
            new Claim("type", "access"),
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        return GenerateToken(claims, expiry);
    }

    public string GenerateRefreshToken(int userId, int tenantId, bool isMobile = false)
    {
        var expiry = isMobile ? RefreshTokenExpiryMobile : RefreshTokenExpiryWeb;
        var jti = Guid.NewGuid().ToString();

        var claims = new[]
        {
            new Claim("user_id", userId.ToString()),
            new Claim("tenant_id", tenantId.ToString()),
            new Claim("type", "refresh"),
            new Claim("platform", isMobile ? "mobile" : "web"),
            new Claim(JwtRegisteredClaimNames.Jti, jti),
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        return GenerateToken(claims, expiry);
    }

    public TokenValidationResult ValidateAccessToken(string token)
    {
        return ValidateToken(token, "access");
    }

    public TokenValidationResult ValidateRefreshToken(string token)
    {
        return ValidateToken(token, "refresh");
    }

    public async Task<bool> IsTokenRevokedAsync(string jti)
    {
        // Check for specific token revocation
        var revoked = await _context.RevokedTokens
            .AnyAsync(r => r.Jti == jti);

        return revoked;
    }

    public async Task RevokeTokenAsync(string jti, int userId)
    {
        var revokedToken = new RevokedToken
        {
            Jti = jti,
            UserId = userId,
            RevokedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(730) // Keep record for 2 years
        };

        _context.RevokedTokens.Add(revokedToken);
        await _context.SaveChangesAsync();
    }

    public async Task RevokeAllUserTokensAsync(int userId)
    {
        // Add a "global revoke" marker
        var globalRevoke = new RevokedToken
        {
            Jti = $"global_revoke_{userId}",
            UserId = userId,
            RevokedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(730)
        };

        _context.RevokedTokens.Add(globalRevoke);
        await _context.SaveChangesAsync();
    }

    private string GenerateToken(IEnumerable<Claim> claims, TimeSpan expiry)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.Add(expiry),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private TokenValidationResult ValidateToken(string token, string expectedType)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));

            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out var validatedToken);

            var jwtToken = (JwtSecurityToken)validatedToken;

            var type = jwtToken.Claims.FirstOrDefault(c => c.Type == "type")?.Value;
            if (type != expectedType)
            {
                return new TokenValidationResult(false, ErrorMessage: $"Invalid token type. Expected {expectedType}");
            }

            var userId = int.Parse(jwtToken.Claims.First(c => c.Type == "user_id").Value);
            var tenantId = int.Parse(jwtToken.Claims.First(c => c.Type == "tenant_id").Value);
            var role = jwtToken.Claims.FirstOrDefault(c => c.Type == "role")?.Value;
            var jti = jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti)?.Value;

            return new TokenValidationResult(
                IsValid: true,
                UserId: userId,
                TenantId: tenantId,
                Role: role,
                Jti: jti,
                ExpiresAt: jwtToken.ValidTo);
        }
        catch (SecurityTokenExpiredException)
        {
            return new TokenValidationResult(false, ErrorMessage: "Token expired");
        }
        catch (Exception ex)
        {
            return new TokenValidationResult(false, ErrorMessage: $"Invalid token: {ex.Message}");
        }
    }
}

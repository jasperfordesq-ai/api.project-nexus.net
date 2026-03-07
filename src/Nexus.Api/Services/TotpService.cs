// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using OtpNet;

namespace Nexus.Api.Services;

/// <summary>
/// Service for TOTP-based two-factor authentication.
/// Secrets are encrypted at rest using AES-256-GCM via a key derived from the JWT secret.
/// </summary>
public class TotpService
{
    private readonly NexusDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<TotpService> _logger;

    private const int TotpStep = 30; // 30-second window
    private const int TotpDigits = 6;

    public TotpService(NexusDbContext db, IConfiguration config, ILogger<TotpService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Generate a new TOTP secret for setup. Returns the secret and provisioning URI.
    /// Does NOT enable 2FA yet — call VerifyAndEnable after user confirms with a code.
    /// </summary>
    public async Task<(string Secret, string QrUri, string? Error)> GenerateSetupAsync(int userId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return (string.Empty, string.Empty, "User not found");

        if (user.TwoFactorEnabled)
            return (string.Empty, string.Empty, "Two-factor authentication is already enabled");

        // Generate a new 20-byte secret
        var secretBytes = KeyGeneration.GenerateRandomKey(20);
        var base32Secret = Base32Encoding.ToString(secretBytes);

        // Store encrypted (not yet enabled)
        user.TotpSecretEncrypted = EncryptSecret(base32Secret);
        user.TwoFactorEnabled = false;
        await _db.SaveChangesAsync();

        // Build otpauth:// URI for QR code
        var issuer = Uri.EscapeDataString("Project NEXUS");
        var account = Uri.EscapeDataString(user.Email);
        var qrUri = $"otpauth://totp/{issuer}:{account}?secret={base32Secret}&issuer={issuer}&digits={TotpDigits}&period={TotpStep}";

        _logger.LogInformation("TOTP setup initiated for user {UserId}", userId);

        return (base32Secret, qrUri, null);
    }

    /// <summary>
    /// Verify a TOTP code and enable 2FA if valid.
    /// </summary>
    public async Task<(bool Success, string? Error)> VerifyAndEnableAsync(int userId, string code)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return (false, "User not found");

        if (user.TwoFactorEnabled)
            return (false, "Two-factor authentication is already enabled");

        if (string.IsNullOrEmpty(user.TotpSecretEncrypted))
            return (false, "No TOTP secret found. Call setup first.");

        var secret = DecryptSecret(user.TotpSecretEncrypted);
        if (secret == null)
            return (false, "Failed to decrypt TOTP secret");

        if (!ValidateCode(secret, code))
            return (false, "Invalid verification code");

        user.TwoFactorEnabled = true;
        user.TwoFactorEnabledAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("TOTP 2FA enabled for user {UserId}", userId);
        return (true, null);
    }

    /// <summary>
    /// Validate a TOTP code for login. Allows ±1 time step for clock drift.
    /// </summary>
    public async Task<(bool Valid, string? Error)> ValidateLoginCodeAsync(int userId, string code)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return (false, "User not found");

        if (!user.TwoFactorEnabled || string.IsNullOrEmpty(user.TotpSecretEncrypted))
            return (false, "Two-factor authentication is not enabled");

        var secret = DecryptSecret(user.TotpSecretEncrypted);
        if (secret == null)
            return (false, "Failed to decrypt TOTP secret");

        if (!ValidateCode(secret, code))
            return (false, "Invalid verification code");

        return (true, null);
    }

    /// <summary>
    /// Disable 2FA for a user.
    /// </summary>
    public async Task<(bool Success, string? Error)> DisableAsync(int userId, string code)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return (false, "User not found");

        if (!user.TwoFactorEnabled)
            return (false, "Two-factor authentication is not enabled");

        // Require a valid code to disable
        if (!string.IsNullOrEmpty(user.TotpSecretEncrypted))
        {
            var secret = DecryptSecret(user.TotpSecretEncrypted);
            if (secret == null || !ValidateCode(secret, code))
                return (false, "Invalid verification code");
        }

        user.TwoFactorEnabled = false;
        user.TotpSecretEncrypted = null;
        user.TwoFactorEnabledAt = null;
        await _db.SaveChangesAsync();

        _logger.LogInformation("TOTP 2FA disabled for user {UserId}", userId);
        return (true, null);
    }

    /// <summary>
    /// Check if a user has 2FA enabled.
    /// </summary>
    public async Task<bool> IsTwoFactorEnabledAsync(int userId)
    {
        return await _db.Users.AnyAsync(u => u.Id == userId && u.TwoFactorEnabled);
    }

    private static bool ValidateCode(string base32Secret, string code)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Length != TotpDigits)
            return false;

        var secretBytes = Base32Encoding.ToBytes(base32Secret);
        var totp = new Totp(secretBytes, step: TotpStep, totpSize: TotpDigits);

        // VerificationWindow of 1 allows ±1 step (±30s) for clock drift
        return totp.VerifyTotp(code, out _, new VerificationWindow(previous: 1, future: 1));
    }

    #region Secret Encryption (AES-256-GCM)

    private string EncryptSecret(string plaintext)
    {
        var key = DeriveEncryptionKey();
        var nonce = new byte[12]; // 96-bit nonce for AES-GCM
        RandomNumberGenerator.Fill(nonce);

        var plaintextBytes = System.Text.Encoding.UTF8.GetBytes(plaintext);
        var ciphertext = new byte[plaintextBytes.Length];
        var tag = new byte[16]; // 128-bit auth tag

        using var aes = new AesGcm(key, 16);
        aes.Encrypt(nonce, plaintextBytes, ciphertext, tag);

        // Format: nonce(12) + tag(16) + ciphertext
        var result = new byte[nonce.Length + tag.Length + ciphertext.Length];
        Buffer.BlockCopy(nonce, 0, result, 0, nonce.Length);
        Buffer.BlockCopy(tag, 0, result, nonce.Length, tag.Length);
        Buffer.BlockCopy(ciphertext, 0, result, nonce.Length + tag.Length, ciphertext.Length);

        return Convert.ToBase64String(result);
    }

    private string? DecryptSecret(string encrypted)
    {
        try
        {
            var key = DeriveEncryptionKey();
            var data = Convert.FromBase64String(encrypted);

            if (data.Length < 28) // 12 nonce + 16 tag minimum
                return null;

            var nonce = data[..12];
            var tag = data[12..28];
            var ciphertext = data[28..];
            var plaintext = new byte[ciphertext.Length];

            using var aes = new AesGcm(key, 16);
            aes.Decrypt(nonce, ciphertext, tag, plaintext);

            return System.Text.Encoding.UTF8.GetString(plaintext);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to decrypt TOTP secret");
            return null;
        }
    }

    private byte[] DeriveEncryptionKey()
    {
        var jwtSecret = _config["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT secret not configured");

        // Derive a 256-bit key from the JWT secret using HKDF
        var ikm = System.Text.Encoding.UTF8.GetBytes(jwtSecret);
        var info = System.Text.Encoding.UTF8.GetBytes("nexus-totp-encryption");
        return HKDF.DeriveKey(HashAlgorithmName.SHA256, ikm, 32, info: info);
    }

    #endregion
}

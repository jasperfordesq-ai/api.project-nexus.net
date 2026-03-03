// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using Nexus.Api.Configuration;

namespace Nexus.Api.Services;

/// <summary>
/// Sends transactional emails (password reset, notifications) to users.
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Send a password-reset link to the user.
    /// </summary>
    Task SendPasswordResetEmailAsync(string toAddress, string firstName, string resetUrl, CancellationToken ct = default);
}

/// <summary>
/// SMTP implementation. Configure via the "Email" section in appsettings / environment variables.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<EmailOptions> options, ILogger<SmtpEmailService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendPasswordResetEmailAsync(string toAddress, string firstName, string resetUrl, CancellationToken ct = default)
    {
        var subject = "Reset your Project Nexus password";
        var body = BuildPasswordResetBody(firstName, resetUrl);

        using var message = new MailMessage
        {
            From = new MailAddress(_options.FromAddress, _options.FromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        message.To.Add(toAddress);

        using var client = new SmtpClient(_options.Smtp.Host, _options.Smtp.Port)
        {
            EnableSsl = _options.Smtp.EnableSsl,
            Credentials = new NetworkCredential(_options.Smtp.Username, _options.Smtp.Password),
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        try
        {
            await client.SendMailAsync(message, ct);
            _logger.LogInformation("Password reset email sent to {Email}", toAddress);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to {Email}", toAddress);
            throw;
        }
    }

    private static string BuildPasswordResetBody(string firstName, string resetUrl) => $"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Reset your password</h2>
          <p>Hi {System.Net.WebUtility.HtmlEncode(firstName)},</p>
          <p>We received a request to reset your Project Nexus password.
             Click the button below to choose a new password. This link expires in 60 minutes.</p>
          <p style="margin: 32px 0;">
            <a href="{resetUrl}"
               style="background:#1a73e8;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">
              Reset password
            </a>
          </p>
          <p>Or paste this link into your browser:</p>
          <p><a href="{resetUrl}">{resetUrl}</a></p>
          <hr />
          <p style="color:#666;font-size:12px;">
            If you didn't request a password reset you can ignore this email.
            Your password won't change until you click the link above.
          </p>
        </body>
        </html>
        """;
}

/// <summary>
/// No-op email service used in development. Logs the reset URL instead of sending email.
/// </summary>
public class NullEmailService : IEmailService
{
    private readonly ILogger<NullEmailService> _logger;

    public NullEmailService(ILogger<NullEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendPasswordResetEmailAsync(string toAddress, string firstName, string resetUrl, CancellationToken ct = default)
    {
        _logger.LogWarning(
            "[DEV] Password reset email suppressed. To: {Email}, URL: {Url}",
            toAddress, resetUrl);
        return Task.CompletedTask;
    }
}

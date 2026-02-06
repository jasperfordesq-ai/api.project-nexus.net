// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net.Mail;
using System.Text;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Services;
using Microsoft.Extensions.Options;
using MimeKit;
using Nexus.Api.Configuration;

namespace Nexus.Api.Services;

/// <summary>
/// Email service implementation using Gmail API with OAuth2.
/// </summary>
public class GmailEmailService : IEmailService
{
    private readonly GmailOptions _options;
    private readonly ILogger<GmailEmailService> _logger;
    private GmailService? _gmailService;

    public GmailEmailService(
        IOptions<GmailOptions> options,
        ILogger<GmailEmailService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<bool> SendEmailAsync(
        string to,
        string subject,
        string htmlBody,
        string? textBody = null,
        CancellationToken ct = default)
    {
        if (!_options.Enabled)
        {
            _logger.LogWarning("Email sending is disabled. Would have sent to: {To}, Subject: {Subject}", to, subject);
            return true; // Return success since this is intentional
        }

        if (!_options.IsConfigured)
        {
            _logger.LogError("Gmail is not properly configured. Missing required credentials.");
            return false;
        }

        try
        {
            var service = await GetGmailServiceAsync(ct);

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_options.SenderName, _options.SenderEmail));
            message.To.Add(new MailboxAddress(null, to));
            message.Subject = subject;

            var builder = new BodyBuilder();
            builder.HtmlBody = htmlBody;
            if (!string.IsNullOrEmpty(textBody))
            {
                builder.TextBody = textBody;
            }
            message.Body = builder.ToMessageBody();

            var rawMessage = await GetRawMessageAsync(message);

            var gmailMessage = new Message
            {
                Raw = rawMessage
            };

            await service.Users.Messages.Send(gmailMessage, "me").ExecuteAsync(ct);

            _logger.LogInformation("Email sent successfully to {To} with subject: {Subject}", to, subject);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To} with subject: {Subject}", to, subject);
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<bool> SendPasswordResetEmailAsync(
        string to,
        string resetToken,
        string userName,
        string resetUrl,
        CancellationToken ct = default)
    {
        var subject = "Reset Your Password - Project NEXUS";

        var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }}
        .button {{ display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 12px; }}
        .token {{ background: #e2e8f0; padding: 10px; font-family: monospace; border-radius: 4px; word-break: break-all; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1 style='margin: 0;'>Project NEXUS</h1>
        </div>
        <div class='content'>
            <h2>Password Reset Request</h2>
            <p>Hi {userName},</p>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <p style='text-align: center;'>
                <a href='{resetUrl}' class='button' style='color: white;'>Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p class='token'>{resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this password reset, you can safely ignore this email. Your password won't be changed.</p>
        </div>
        <div class='footer'>
            <p>This email was sent by Project NEXUS.<br>
            If you have questions, please contact your timebank administrator.</p>
        </div>
    </div>
</body>
</html>";

        var textBody = $@"
Password Reset Request

Hi {userName},

We received a request to reset your password.

Click this link to reset your password:
{resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email.

---
Project NEXUS
";

        return await SendEmailAsync(to, subject, htmlBody, textBody, ct);
    }

    /// <inheritdoc />
    public async Task<bool> SendWelcomeEmailAsync(
        string to,
        string userName,
        string tenantName,
        CancellationToken ct = default)
    {
        var subject = $"Welcome to {tenantName} - Project NEXUS";

        var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }}
        .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1 style='margin: 0;'>Welcome to {tenantName}!</h1>
        </div>
        <div class='content'>
            <h2>Hi {userName},</h2>
            <p>Welcome to <strong>{tenantName}</strong>! We're excited to have you join our timebanking community.</p>
            <p>Timebanking is a simple idea: for every hour you spend helping someone in your community, you earn one time credit. You can then spend that credit on services from other members.</p>
            <h3>Getting Started</h3>
            <ul>
                <li><strong>Complete your profile</strong> - Add a bio and list your skills</li>
                <li><strong>Browse listings</strong> - See what services are offered and needed</li>
                <li><strong>Create a listing</strong> - Share what you can offer or what you need help with</li>
                <li><strong>Connect with members</strong> - Build relationships in your community</li>
            </ul>
            <p>If you have any questions, don't hesitate to reach out to your timebank coordinator.</p>
            <p>Happy timebanking!</p>
        </div>
        <div class='footer'>
            <p>This email was sent by Project NEXUS on behalf of {tenantName}.</p>
        </div>
    </div>
</body>
</html>";

        var textBody = $@"
Welcome to {tenantName}!

Hi {userName},

Welcome to {tenantName}! We're excited to have you join our timebanking community.

Timebanking is a simple idea: for every hour you spend helping someone in your community, you earn one time credit. You can then spend that credit on services from other members.

Getting Started:
- Complete your profile - Add a bio and list your skills
- Browse listings - See what services are offered and needed
- Create a listing - Share what you can offer or what you need help with
- Connect with members - Build relationships in your community

If you have any questions, don't hesitate to reach out to your timebank coordinator.

Happy timebanking!

---
Project NEXUS on behalf of {tenantName}
";

        return await SendEmailAsync(to, subject, htmlBody, textBody, ct);
    }

    /// <inheritdoc />
    public async Task<bool> IsHealthyAsync(CancellationToken ct = default)
    {
        if (!_options.Enabled)
        {
            return true; // Disabled is a valid state
        }

        if (!_options.IsConfigured)
        {
            return false;
        }

        try
        {
            var service = await GetGmailServiceAsync(ct);
            var profile = await service.Users.GetProfile("me").ExecuteAsync(ct);
            return !string.IsNullOrEmpty(profile.EmailAddress);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gmail health check failed");
            return false;
        }
    }

    private async Task<GmailService> GetGmailServiceAsync(CancellationToken ct)
    {
        if (_gmailService != null)
        {
            return _gmailService;
        }

        var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new ClientSecrets
            {
                ClientId = _options.ClientId,
                ClientSecret = _options.ClientSecret
            },
            Scopes = new[] { GmailService.Scope.GmailSend }
        });

        var token = new Google.Apis.Auth.OAuth2.Responses.TokenResponse
        {
            RefreshToken = _options.RefreshToken
        };

        var credential = new UserCredential(flow, "user", token);

        // Refresh the token if needed
        if (credential.Token.IsStale)
        {
            await credential.RefreshTokenAsync(ct);
        }

        _gmailService = new GmailService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "Project NEXUS"
        });

        return _gmailService;
    }

    private static async Task<string> GetRawMessageAsync(MimeMessage message)
    {
        using var stream = new MemoryStream();
        await message.WriteToAsync(stream);
        var bytes = stream.ToArray();
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .Replace("=", "");
    }
}

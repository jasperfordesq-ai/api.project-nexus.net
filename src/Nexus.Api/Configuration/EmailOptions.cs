// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

namespace Nexus.Api.Configuration;

public class EmailOptions
{
    public const string SectionName = "Email";

    public string FromAddress { get; set; } = "noreply@project-nexus.net";
    public string FromName { get; set; } = "Project Nexus";

    /// <summary>
    /// Base URL of the frontend app used to build password-reset links.
    /// e.g. "https://app.project-nexus.net"
    /// </summary>
    public string AppBaseUrl { get; set; } = "http://localhost:5170";

    public SmtpOptions Smtp { get; set; } = new();
}

public class SmtpOptions
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public bool EnableSsl { get; set; } = true;
}

# Security Policy

Last reviewed: 2026-07-15

Status: **Maintained security-reporting reference**

The ASP.NET edition and shared Web UK implementation are experimental and are
not certified production replacements for Laravel. Security reports are still
welcome and should be handled without exposing users or systems.

## Reporting A Vulnerability

Use GitHub's private vulnerability-reporting/security-advisory channel for this
repository when it is available. If the repository does not expose a private
channel, contact the project maintainer through the existing non-public project
contact before sharing technical details. Do not open a public issue containing
an exploit, secret, personal data, or production infrastructure detail.

Include the affected component and version/SHA, impact, prerequisites, minimal
reproduction against an isolated local environment, and suggested mitigation if
known. Redact all credentials and user data.

## Safe Testing Rules

- Do not test against production or another tenant/account without explicit
  written authorization.
- Do not access, alter, download, retain, or disclose data beyond the minimum
  authorized scope.
- Do not perform denial of service, social engineering, credential attacks,
  persistence, provider charges, or destructive database actions.
- Use local disposable fixtures and stop if a test reaches real user or
  production-derived data.

## Current Security Boundary

Laravel remains the production contract authority. ASP.NET security and
localization deductions, complete-suite/CI evidence, provider proof, and both
unchanged-client runtime certifications remain open. See
[the canonical backend status](docs/CURRENT_ASPNET_CONTRACT_STATUS.md) rather
than inferring readiness from route or feature presence.

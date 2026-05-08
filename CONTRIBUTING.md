# Contributing to Project NEXUS V2

Thank you for your interest in contributing to Project NEXUS V2 — the
ASP.NET Core 8 backend and React/TypeScript front-ends that form the second
generation of the Project NEXUS community timebanking platform.

Project NEXUS V2 is released under **AGPL-3.0-or-later**. By contributing,
you agree that your contributions will be licensed under the same terms.

By submitting a contribution, you also agree to the
[Project NEXUS V2 Contributor Terms](CONTRIBUTOR_TERMS.md), including the
licence, patent, ownership, third-party-code, and AI-disclosure terms
described there.

**Repository:** <https://github.com/jasperfordesq-ai/api.project-nexus.net>

---

## Contributor Terms (Required)

All contributions are subject to the
[Project NEXUS V2 Contributor Terms](CONTRIBUTOR_TERMS.md). These terms give
Jasper Ford, and any entity he designates to steward Project NEXUS V2, the
right to use contributions under AGPL-3.0-or-later **and** under commercial or
proprietary licence terms.

Do not submit a contribution unless you have the right to make that grant.
Contributions must not include secrets, confidential material, incompatible
third-party code, or undisclosed AI-generated material.

Pull requests are checked automatically by the
`Contributor Terms Acceptance` GitHub Actions workflow. A PR cannot be merged
unless the contributor-terms acknowledgement checkboxes in the PR description
are ticked and the AI and third-party-material disclosure fields are
completed.

Bot-authored PRs (Dependabot, Renovate, GitHub Actions, etc.) are exempt from
this check, since automated dependency-update commits are not copyrightable
contributions and a bot cannot legally accept a CLA.

---

## Reporting Bugs

Open an issue on GitHub with:

- A clear, descriptive title
- Steps to reproduce
- Expected vs. actual behaviour
- Browser/OS/version details if relevant
- Any relevant console errors or screenshots

## Requesting Features

Open a GitHub Discussion or issue tagged `enhancement`. Describe the use case,
not just the solution. Large features should be discussed before
implementation begins.

## Submitting a Pull Request

1. Fork the repository and create a branch from the latest `main`.
2. Make your changes and add or update tests where applicable.
3. Run the relevant build, lint, and test commands locally before pushing.
4. Open a PR against `main`. Fill in the PR template completely, including
   the Contributor Terms checkboxes and the disclosure fields.
5. Link any related issues.

Fix PRs must include a **Root Cause** and **Prevention** explanation in the
description.

---

## AGPL-3.0 Compliance

Project NEXUS V2 is licensed under the **GNU Affero General Public License
v3.0 or later (AGPL-3.0-or-later)**.

Key obligations for contributors:

1. **Any modified version** of this software, when made available over a
   network (e.g., as a hosted service), must provide the complete
   corresponding source code to users of that service.
2. **Attribution must not be removed.** The footer, mobile drawer, auth
   pages, and About page must display the AGPL Section 7(b) attribution as
   required by the `NOTICE` file. Do not remove or obscure this attribution.
3. **Third-party dependencies** you add must be compatible with
   AGPL-3.0-or-later. Licences that are incompatible with AGPL (e.g.,
   proprietary, SSPL, non-commercial-only) may not be introduced.
4. **The NOTICE file** contains authoritative legal terms (Section 7 a–f) and
   the dual-licensing reservation that preserves the ability to offer
   commercial licences. Do not modify it without fully understanding the
   implications.

The full licence text is in the `LICENSE` file at the repository root.

---

## Questions?

If anything in this guide is unclear, open a GitHub Discussion or file an
issue.

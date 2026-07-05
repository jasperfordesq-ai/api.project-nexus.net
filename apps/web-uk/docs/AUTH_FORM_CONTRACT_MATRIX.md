# Laravel Auth Form Contract Matrix

Last generated: 2026-07-05

This generated matrix compares Laravel Blade accessible auth web forms with current `apps/web-uk` Nunjucks forms. It is preparation evidence only and does not certify Laravel session, CSRF, redirect, or validation parity.

## Auth Forms

| Laravel Blade view | Laravel route name | Laravel fields | Local Nunjucks fields | Contract notes |
| --- | --- | --- | --- | --- |
| login.blade.php | govuk-alpha.login.store | email, password | email, password, tenant_slug | tenant_slug is local Express-only until Laravel tenant context is resolved by route mode. Local-only fields: tenant_slug. |
| login.blade.php | govuk-alpha.login.resend | email |  | Laravel has a resend-verification form for unverified accounts; local Express has no equivalent yet. Laravel-only fields: email. |
| register.blade.php | govuk-alpha.register.store | website, form_started_at, profile_type, organization_name, invite_code, first_name, last_name, phone, location, latitude, longitude, email, password, password_confirmation, terms_accepted, newsletter_opt_in | website, first_name, last_name, email, tenant_slug, password, confirm_password | Key Laravel-only fields: phone, location, password_confirmation, terms_accepted. confirm_password is local Express-only. Laravel-only fields: form_started_at, profile_type, organization_name, invite_code, phone, location, latitude, longitude, password_confirmation, terms_accepted, newsletter_opt_in. Local-only fields: tenant_slug, confirm_password. |
| forgot-password.blade.php | govuk-alpha.login.forgot.store | email | email, tenant_slug | tenant_slug is local Express-only; Laravel tenant context comes from accessible route mode. Local-only fields: tenant_slug. |
| reset-password.blade.php | govuk-alpha.password.reset.store | token, password, password_confirmation | token, password, confirm_password | Laravel uses password_confirmation; local Express currently uses confirm_password. Laravel-only fields: password_confirmation. Local-only fields: confirm_password. |
| two-factor.blade.php | govuk-alpha.login.twofactor.store | code, use_backup_code, trust_device | code | Laravel supports use_backup_code and trust_device; local Express only posts code. Laravel-only fields: use_backup_code, trust_device. |

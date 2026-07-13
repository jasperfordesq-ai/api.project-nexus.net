# Generated Laravel Accessible Catalogs

These JSON files are deterministic, read-only copies of the authoritative
`lang/{locale}/govuk_alpha*.php` and `event_offline_checkin.php` arrays in the sibling Laravel repository.
They remain covered by this project's AGPL-3.0-or-later licence and NOTICE.

Do not edit the JSON by hand. From `apps/web-uk`, regenerate it with:

```text
npm run locales:sync
```

Pass the Laravel repository path directly to
`scripts/sync-laravel-locales.php` when the repositories do not use the normal
sibling layout.

// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

process.env.NODE_ENV = 'test';
process.env.COOKIE_SECRET = process.env.COOKIE_SECRET || 'smoke-secret-12345678901234567890';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'smoke-session-12345678901234567890';
process.env.ACCESSIBLE_BACKEND_TARGET = process.env.ACCESSIBLE_BACKEND_TARGET || 'laravel';
process.env.TENANT_ID = process.env.TENANT_ID || '2';

const app = require('../src/server');
const { runLaravelRuntimeSmokeAgainstApp } = require('./laravel-runtime-smoke');

async function main() {
  const result = await runLaravelRuntimeSmokeAgainstApp(app);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

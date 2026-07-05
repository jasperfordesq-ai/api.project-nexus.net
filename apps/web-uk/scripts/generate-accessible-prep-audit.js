#!/usr/bin/env node
// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Generate preparation-only accessible frontend parity inventories.
 *
 * This script reads the Laravel Blade accessible route/view source of truth and
 * the local Express/Nunjucks candidate. It writes Markdown inventories that are
 * deliberately not production-readiness certificates.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const appRoot = path.resolve(__dirname, '..');
const laravelRoot = process.env.LARAVEL_ROOT || 'C:\\platforms\\htdocs\\staging';
const docsDir = path.join(appRoot, 'docs');

const routeFiles = [
  path.join(laravelRoot, 'routes', 'govuk-alpha.php'),
  ...fs.readdirSync(path.join(laravelRoot, 'routes', 'govuk-alpha-parity'))
    .filter((name) => name.endsWith('.php'))
    .sort()
    .map((name) => path.join(laravelRoot, 'routes', 'govuk-alpha-parity', name))
];

const bladeViewsDir = path.join(laravelRoot, 'accessible-frontend', 'views');
const nunjucksViewsDir = path.join(appRoot, 'src', 'views');
const authFormContracts = [
  {
    bladeView: 'login.blade.php',
    localView: 'login.njk',
    laravelRouteName: 'govuk-alpha.login.store',
    localAction: '/login',
    notes: 'tenant_slug is local Express-only until Laravel tenant context is resolved by route mode.'
  },
  {
    bladeView: 'login.blade.php',
    localView: 'login.njk',
    laravelRouteName: 'govuk-alpha.login.resend',
    localAction: '',
    notes: 'Laravel has a resend-verification form for unverified accounts; local Express has no equivalent yet.'
  },
  {
    bladeView: 'register.blade.php',
    localView: 'register.njk',
    laravelRouteName: 'govuk-alpha.register.store',
    localAction: '/register',
    notes: 'Key Laravel-only fields: phone, location, password_confirmation, terms_accepted. confirm_password is local Express-only.'
  },
  {
    bladeView: 'forgot-password.blade.php',
    localView: 'forgot-password.njk',
    laravelRouteName: 'govuk-alpha.login.forgot.store',
    localAction: '/forgot-password',
    notes: 'tenant_slug is local Express-only; Laravel tenant context comes from accessible route mode.'
  },
  {
    bladeView: 'reset-password.blade.php',
    localView: 'reset-password.njk',
    laravelRouteName: 'govuk-alpha.password.reset.store',
    localAction: '/reset-password',
    notes: 'Laravel uses password_confirmation; local Express currently uses confirm_password.'
  },
  {
    bladeView: 'two-factor.blade.php',
    localView: 'login.njk',
    laravelRouteName: 'govuk-alpha.login.twofactor.store',
    localAction: '/verify-2fa',
    notes: 'Laravel supports use_backup_code and trust_device; local Express only posts code.'
  }
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function walkFiles(dir, predicate) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, predicate));
    } else if (!predicate || predicate(full)) {
      out.push(full);
    }
  }
  return out.sort();
}

function rel(file, base = repoRoot) {
  return path.relative(base, file).replace(/\\/g, '/');
}

function routeFamily(routePath) {
  if (routePath === '/') return 'home';
  return routePath.replace(/^\//, '').split('/')[0] || 'home';
}

function normalizeRoutePath(routePath) {
  return routePath.replace(/\{([^}]+)\}/g, ':$1');
}

function extractLaravelRoutes() {
  const routes = [];
  const routeRegex = /Route::(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/i;

  for (const file of routeFiles) {
    const lines = read(file).split(/\r?\n/);
    let statement = '';
    let startLine = 0;

    lines.forEach((line, index) => {
      if (line.includes('Route::')) {
        statement = line.trim();
        startLine = index + 1;
      } else if (statement) {
        statement += ` ${line.trim()}`;
      }

      if (statement && line.includes(';')) {
        const routeMatch = statement.match(routeRegex);
        if (routeMatch) {
          const [, method, routePath] = routeMatch;
          const nameMatch = statement.match(/->name\(\s*['"]([^'"]+)['"]\s*\)/);
          const controllerMatch = statement.match(/\[\s*AlphaController::class\s*,\s*['"]([^'"]+)['"]\s*\]/);
          routes.push({
            method: method.toUpperCase(),
            path: routePath,
            normalizedPath: normalizeRoutePath(routePath),
            name: nameMatch ? nameMatch[1] : '',
            controller: controllerMatch ? controllerMatch[1] : '',
            family: routeFamily(routePath),
            source: `${rel(file, laravelRoot)}:${startLine}`
          });
        }
        statement = '';
        startLine = 0;
      }
    });
  }

  return routes;
}

function extractExpressInventory() {
  const server = read(path.join(appRoot, 'src', 'server.js'));
  const routeFilesLocal = walkFiles(path.join(appRoot, 'src', 'routes'), (file) => file.endsWith('.js'));
  const staticPagesSource = read(path.join(appRoot, 'src', 'routes', 'static-pages.js'));

  const mountedPrefixes = [...server.matchAll(/app\.use\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  const appRoutes = [...server.matchAll(/app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)].map((match) => ({
    method: match[1].toUpperCase(),
    path: match[2],
    source: 'src/server.js'
  }));
  const appRouteKeys = new Set(appRoutes.map((route) => `${route.method} ${route.path}`));

  const routerRoutes = [];
  for (const file of routeFilesLocal) {
    const source = read(file);
    for (const match of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)) {
      routerRoutes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        source: rel(file, appRoot)
      });
    }
  }

  const staticSkeletonPaths = [...staticPagesSource.matchAll(/^\s*['"]([^'"]+)['"]:\s*\{/gm)]
    .map((match) => match[1])
    .sort();

  const exactPaths = new Set(appRoutes.map((route) => route.path));
  staticSkeletonPaths.forEach((routePath) => exactPaths.add(routePath));
  for (const prefix of mountedPrefixes) {
    if (prefix !== '/') exactPaths.add(prefix);
  }

  return {
    appRoutes,
    appRouteKeys,
    routerRoutes,
    mountedPrefixes,
    staticSkeletonPaths,
    exactPaths
  };
}

function extractViews() {
  const bladeViews = walkFiles(bladeViewsDir, (file) => file.endsWith('.blade.php')).map((file) => {
    const relative = rel(file, bladeViewsDir);
    const stem = relative.replace(/\.blade\.php$/, '');
    return {
      relative,
      stem,
      family: stem.includes('/') ? stem.split('/')[0] : stem.split('-')[0]
    };
  });

  const nunjucksViews = new Set(
    walkFiles(nunjucksViewsDir, (file) => file.endsWith('.njk'))
      .map((file) => rel(file, nunjucksViewsDir).replace(/\.njk$/, ''))
  );

  return { bladeViews, nunjucksViews };
}

function statusFor(route, expressInventory) {
  if (expressInventory.appRouteKeys.has(`${route.method} ${route.path}`)) {
    return route.method === 'GET' ? 'candidate-route' : 'candidate-workflow';
  }

  if (expressInventory.staticSkeletonPaths.includes(route.path)) {
    return 'skeleton';
  }
  if (expressInventory.exactPaths.has(route.path)) {
    return route.method === 'GET' ? 'candidate-route' : 'candidate-workflow';
  }

  const familyPrefix = `/${route.family}`;
  if (expressInventory.mountedPrefixes.includes(familyPrefix)) {
    return route.method === 'GET' ? 'candidate-family' : 'candidate-workflow-family';
  }

  return 'missing';
}

function tableRow(cells) {
  return `| ${cells.map((cell) => String(cell || '').replace(/\|/g, '\\|')).join(' | ')} |`;
}

function writeMarkdown(fileName, lines) {
  fs.writeFileSync(path.join(docsDir, fileName), `${lines.join('\n').replace(/\n+$/g, '')}\n`);
}

function laravelSharedDomainPath(routePath) {
  return routePath === '/' ? '/{tenantSlug}/alpha' : `/{tenantSlug}/alpha${routePath}`;
}

function laravelCustomDomainPath(routePath) {
  return routePath || '/';
}

function writeRouteInventory(routes, expressInventory) {
  const rows = routes.map((route) => ({
    ...route,
    status: statusFor(route, expressInventory)
  }));
  const byStatus = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const byFamily = rows.reduce((acc, row) => {
    const item = acc[row.family] || { family: row.family, total: 0, get: 0, post: 0, candidate: 0, skeleton: 0, missing: 0 };
    item.total += 1;
    if (row.method === 'GET') item.get += 1;
    if (row.method === 'POST') item.post += 1;
    if (row.status.startsWith('candidate')) item.candidate += 1;
    if (row.status === 'skeleton') item.skeleton += 1;
    if (row.status === 'missing') item.missing += 1;
    acc[row.family] = item;
    return acc;
  }, {});

  const lines = [
    '# Laravel Accessible Route Inventory',
    '',
    'Last generated: 2026-07-05',
    '',
    'This generated inventory is preparation evidence only. It does not certify route parity, workflow parity, backend compatibility, or production readiness.',
    '',
    '## Summary',
    '',
    tableRow(['Metric', 'Count']),
    tableRow(['---', '---:']),
    tableRow(['Laravel accessible route declarations', rows.length]),
    tableRow(['ASP.NET static skeleton paths', expressInventory.staticSkeletonPaths.length]),
    tableRow(['Candidate route declarations and mounted families', expressInventory.exactPaths.size]),
    ...Object.entries(byStatus).sort().map(([status, count]) => tableRow([status, count])),
    '',
    '## Family Summary',
    '',
    tableRow(['Family', 'Total', 'GET', 'POST', 'Candidate', 'Skeleton', 'Missing']),
    tableRow(['---', '---:', '---:', '---:', '---:', '---:', '---:']),
    ...Object.values(byFamily)
      .sort((a, b) => a.family.localeCompare(b.family))
      .map((item) => tableRow([item.family, item.total, item.get, item.post, item.candidate, item.skeleton, item.missing])),
    '',
    '## Full Route Inventory',
    '',
    tableRow(['Method', 'Laravel path', 'Laravel shared-domain path', 'Laravel custom-domain path', 'Route name', 'Controller', 'Family', 'ASP.NET preparation status', 'Source']),
    tableRow(['---', '---', '---', '---', '---', '---', '---', '---', '---']),
    ...rows.map((route) => tableRow([
      route.method,
      route.path,
      laravelSharedDomainPath(route.path),
      laravelCustomDomainPath(route.path),
      route.name,
      route.controller,
      route.family,
      route.status,
      route.source
    ])),
    ''
  ];

  writeMarkdown('LARAVEL_ACCESSIBLE_ROUTE_INVENTORY.md', lines);
}

function writeViewInventory(bladeViews, nunjucksViews) {
  const rows = bladeViews.map((view) => {
    const exact = nunjucksViews.has(view.stem);
    const basename = view.stem.split('/').pop();
    const basenameMatch = [...nunjucksViews].some((candidate) => candidate === basename || candidate.endsWith(`/${basename}`));
    return {
      ...view,
      status: exact ? 'candidate-exact-view' : basenameMatch ? 'candidate-name-match' : 'missing-nunjucks-view'
    };
  });
  const byStatus = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const byFamily = rows.reduce((acc, row) => {
    const item = acc[row.family] || { family: row.family, total: 0, candidate: 0, missing: 0 };
    item.total += 1;
    if (row.status.startsWith('candidate')) item.candidate += 1;
    if (row.status === 'missing-nunjucks-view') item.missing += 1;
    acc[row.family] = item;
    return acc;
  }, {});

  const lines = [
    '# Blade View Inventory',
    '',
    'Last generated: 2026-07-05',
    '',
    'This generated inventory maps Laravel Blade accessible views to the current Nunjucks candidate by file name. It is preparation evidence only and does not prove rendered UI or workflow parity.',
    '',
    '## Summary',
    '',
    tableRow(['Metric', 'Count']),
    tableRow(['---', '---:']),
    tableRow(['Laravel Blade accessible views', rows.length]),
    tableRow(['ASP.NET Nunjucks views', nunjucksViews.size]),
    ...Object.entries(byStatus).sort().map(([status, count]) => tableRow([status, count])),
    '',
    '## Family Summary',
    '',
    tableRow(['Family', 'Blade views', 'Candidate matches', 'Missing Nunjucks views']),
    tableRow(['---', '---:', '---:', '---:']),
    ...Object.values(byFamily)
      .sort((a, b) => a.family.localeCompare(b.family))
      .map((item) => tableRow([item.family, item.total, item.candidate, item.missing])),
    '',
    '## Full View Inventory',
    '',
    tableRow(['Laravel Blade view', 'Family', 'ASP.NET preparation status']),
    tableRow(['---', '---', '---']),
    ...rows.map((view) => tableRow([view.relative, view.family, view.status])),
    ''
  ];

  writeMarkdown('BLADE_VIEW_INVENTORY.md', lines);
}

function writeBackendContractMatrix(routes) {
  const familyRows = Object.values(routes.reduce((acc, route) => {
    const item = acc[route.family] || {
      family: route.family,
      get: 0,
      post: 0,
      mutating: 0,
      auth: 'needs-audit',
      csrf: 'needs-audit',
      tenant: 'needs-audit',
      featureGate: 'needs-audit'
    };
    if (route.method === 'GET') item.get += 1;
    if (route.method === 'POST') item.post += 1;
    if (!['GET'].includes(route.method)) item.mutating += 1;
    acc[route.family] = item;
    return acc;
  }, {})).sort((a, b) => a.family.localeCompare(b.family));

  const lines = [
    '# Accessible Backend Contract Matrix',
    '',
    'Last generated: 2026-07-05',
    '',
    'This is a preparation matrix for future Laravel/ASP.NET accessible backend switching. It does not implement adapters and does not certify backend readiness.',
    '',
    '## Required Proof Per Family',
    '',
    '- Tenant resolution: shared slug paths and custom accessible domains.',
    '- Auth/session: login, logout, refresh, two-factor, redirects, signed-in state.',
    '- CSRF/forms: token fields, POST handlers, validation failures, replay handling.',
    '- Feature/module gates: hidden links, disabled pages, 403/404 behavior.',
    '- Request shape: query params, form fields, multipart names, route params.',
    '- Response/page data: lists, pagination, empty states, status codes, errors.',
    '- Uploads: avatar, listing images, resources, media constraints.',
    '- Localization: locale selection, RTL, translated labels, validation copy.',
    '',
    '## Family Matrix',
    '',
    tableRow(['Family', 'GET routes', 'POST routes', 'Mutating routes', 'Tenant', 'Auth', 'CSRF', 'Feature/module gates']),
    tableRow(['---', '---:', '---:', '---:', '---', '---', '---', '---']),
    ...familyRows.map((item) => tableRow([item.family, item.get, item.post, item.mutating, item.tenant, item.auth, item.csrf, item.featureGate])),
    '',
    '## Next Step',
    '',
    'Replace each `needs-audit` cell with a tested contract note during module-by-module parity work. ASP.NET should match Laravel behavior before `apps/web-uk` adds backend-specific branches.',
    ''
  ];

  writeMarkdown('ACCESSIBLE_BACKEND_CONTRACT_MATRIX.md', lines);
}

function extractFormBlocks(source) {
  return [...source.matchAll(/<form\b[\s\S]*?<\/form>/gi)].map((match) => match[0]);
}

function formRouteName(formBlock) {
  const routeMatch = formBlock.match(/route\(\s*['"]([^'"]+)['"]/);
  return routeMatch ? routeMatch[1] : '';
}

function formAction(formBlock) {
  const actionMatch = formBlock.match(/action=["']([^"']+)["']/i);
  return actionMatch ? actionMatch[1] : '';
}

function formFields(formBlock) {
  const fields = [];
  const fieldMatches = [
    ...formBlock.matchAll(/\bname=["']([^"']+)["']/gi),
    ...formBlock.matchAll(/\bname\s*:\s*["']([^"']+)["']/gi)
  ];

  for (const match of fieldMatches) {
    const name = match[1];
    if (name === '_csrf' || name === '_token') continue;
    if (!fields.includes(name)) fields.push(name);
  }
  return fields;
}

function findBladeForm(viewName, routeName) {
  const source = read(path.join(bladeViewsDir, viewName));
  return extractFormBlocks(source).find((formBlock) => formRouteName(formBlock) === routeName) || '';
}

function findLocalForm(viewName, action) {
  if (!viewName || !action) return '';
  const source = read(path.join(nunjucksViewsDir, viewName));
  return extractFormBlocks(source).find((formBlock) => formAction(formBlock) === action) || '';
}

function compareFields(laravelFields, localFields, baseNotes) {
  const laravelOnly = laravelFields.filter((field) => !localFields.includes(field));
  const localOnly = localFields.filter((field) => !laravelFields.includes(field));
  const parts = [];
  if (baseNotes) parts.push(baseNotes);
  if (laravelOnly.length) parts.push(`Laravel-only fields: ${laravelOnly.join(', ')}.`);
  if (localOnly.length) parts.push(`Local-only fields: ${localOnly.join(', ')}.`);
  return parts.join(' ');
}

function writeAuthFormContractMatrix() {
  const rows = authFormContracts.map((contract) => {
    const bladeForm = findBladeForm(contract.bladeView, contract.laravelRouteName);
    const localForm = findLocalForm(contract.localView, contract.localAction);
    const laravelFields = formFields(bladeForm);
    const localFields = formFields(localForm);
    return {
      ...contract,
      laravelFields,
      localFields,
      notes: compareFields(laravelFields, localFields, contract.notes)
    };
  });

  const lines = [
    '# Laravel Auth Form Contract Matrix',
    '',
    'Last generated: 2026-07-05',
    '',
    'This generated matrix compares Laravel Blade accessible auth web forms with current `apps/web-uk` Nunjucks forms. It is preparation evidence only and does not certify Laravel session, CSRF, redirect, or validation parity.',
    '',
    '## Auth Forms',
    '',
    tableRow(['Laravel Blade view', 'Laravel route name', 'Laravel fields', 'Local Nunjucks fields', 'Contract notes']),
    tableRow(['---', '---', '---', '---', '---']),
    ...rows.map((row) => tableRow([
      row.bladeView,
      row.laravelRouteName,
      row.laravelFields.join(', '),
      row.localFields.join(', '),
      row.notes
    ]))
  ];

  writeMarkdown('AUTH_FORM_CONTRACT_MATRIX.md', lines);
}

function main() {
  const routes = extractLaravelRoutes();
  const expressInventory = extractExpressInventory();
  const { bladeViews, nunjucksViews } = extractViews();

  writeRouteInventory(routes, expressInventory);
  writeViewInventory(bladeViews, nunjucksViews);
  writeBackendContractMatrix(routes);
  writeAuthFormContractMatrix();

  console.log(`Laravel accessible routes: ${routes.length}`);
  console.log(`Blade accessible views: ${bladeViews.length}`);
  console.log(`Static skeleton paths: ${expressInventory.staticSkeletonPaths.length}`);
}

main();

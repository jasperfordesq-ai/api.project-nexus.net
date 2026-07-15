#!/usr/bin/env node
// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');

const DEFAULT_SCREENSHOT_ROUTES = Object.freeze([
  { name: 'home', path: '/hour-timebank/accessible' },
  { name: 'login', path: '/hour-timebank/accessible/login' },
  { name: 'register', path: '/hour-timebank/accessible/register' },
  { name: 'contact', path: '/hour-timebank/accessible/contact' },
  { name: 'accessibility', path: '/hour-timebank/accessible/accessibility' },
  { name: 'legal', path: '/hour-timebank/accessible/legal' }
]);

const DEFAULT_SCREENSHOT_VIEWPORTS = Object.freeze([
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'reflow-320', width: 320, height: 800, requireNoOverflow: true }
]);

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function sanitizeSegment(value) {
  const sanitized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!sanitized) throw new Error('Screenshot artifact names must contain a safe character.');
  return sanitized;
}

function assertSafeBaseUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute HTTP(S) URL.`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${label} must use HTTP or HTTPS.`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${label} must not contain credentials.`);
  }
  if (/(^|\/)alpha(?:\/|$)/i.test(parsed.pathname)) {
    throw new Error(`${label} must not use the legacy /alpha mount.`);
  }
  return stripTrailingSlash(parsed.href);
}

function assertCanonicalRoute(route) {
  const routePath = String(route?.path || '');
  if (!/^\/hour-timebank\/accessible(?:\/|$)/.test(routePath)) {
    throw new Error(`Screenshot route must use /hour-timebank/accessible: ${routePath || '<empty>'}`);
  }
  if (/(^|\/)alpha(?:\/|$)/i.test(routePath)) {
    throw new Error(`Screenshot route must not use /alpha: ${routePath}`);
  }
  return {
    name: sanitizeSegment(route.name),
    path: routePath
  };
}

function joinUrl(baseUrl, routePath) {
  return `${stripTrailingSlash(baseUrl)}${routePath}`;
}

function resolveCaptureOptions(options = {}, env = process.env) {
  const laravelBaseUrl = options.laravelBaseUrl || env.LARAVEL_BLADE_BASE_URL;
  const webBaseUrl = options.webBaseUrl || env.WEB_UK_BASE_URL;
  if (!laravelBaseUrl || !webBaseUrl) {
    throw new Error('Set LARAVEL_BLADE_BASE_URL and WEB_UK_BASE_URL before capturing screenshots.');
  }
  const disposableLaravelConfirmed = options.disposableLaravelConfirmed
    ?? env.DISPOSABLE_LARAVEL_CONFIRMED === '1';
  if (!disposableLaravelConfirmed) {
    throw new Error('Set DISPOSABLE_LARAVEL_CONFIRMED=1 only after verifying the Laravel environment is disposable.');
  }

  const snapshotId = sanitizeSegment(
    options.snapshotId || env.VISUAL_SNAPSHOT_ID || new Date().toISOString()
  );
  const outputRoot = path.resolve(
    options.outputRoot || env.VISUAL_SCREENSHOT_OUTPUT || path.join(__dirname, '..', 'artifacts', 'visual-comparison')
  );
  const routes = (options.routes || DEFAULT_SCREENSHOT_ROUTES).map(assertCanonicalRoute);
  const viewports = (options.viewports || DEFAULT_SCREENSHOT_VIEWPORTS).map((viewport) => ({
    name: sanitizeSegment(viewport.name),
    width: Number(viewport.width),
    height: Number(viewport.height),
    requireNoOverflow: Boolean(viewport.requireNoOverflow)
  }));

  if (new Set(routes.map((route) => route.name)).size !== routes.length) {
    throw new Error('Screenshot route names must be unique.');
  }
  if (new Set(viewports.map((viewport) => viewport.name)).size !== viewports.length) {
    throw new Error('Screenshot viewport names must be unique.');
  }

  for (const viewport of viewports) {
    if (!Number.isInteger(viewport.width) || !Number.isInteger(viewport.height)
      || viewport.width < 1 || viewport.height < 1) {
      throw new Error(`Invalid screenshot viewport: ${viewport.name}`);
    }
  }

  const timeoutMs = Number(options.timeoutMs || env.VISUAL_SCREENSHOT_TIMEOUT_MS || 60000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error('VISUAL_SCREENSHOT_TIMEOUT_MS must be a positive integer.');
  }

  return {
    laravelBaseUrl: assertSafeBaseUrl(laravelBaseUrl, 'LARAVEL_BLADE_BASE_URL'),
    webBaseUrl: assertSafeBaseUrl(webBaseUrl, 'WEB_UK_BASE_URL'),
    snapshotId,
    outputRoot,
    outputDirectory: path.join(outputRoot, snapshotId),
    timeoutMs,
    routes,
    viewports
  };
}

async function captureSurface(browser, surface, options) {
  const results = [];
  for (const viewport of options.viewports) {
    const unsafeRequests = [];
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      locale: 'en-GB',
      colorScheme: 'light',
      reducedMotion: 'reduce',
      serviceWorkers: 'block'
    });

    await context.route('**/*', async (route) => {
      const method = route.request().method().toUpperCase();
      if (!['GET', 'HEAD'].includes(method)) {
        unsafeRequests.push(`${method} ${route.request().url()}`);
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });

    try {
      for (const route of options.routes) {
        const page = await context.newPage();
        const url = joinUrl(surface.baseUrl, route.path);
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: options.timeoutMs
        });
        await page.evaluate(() => globalThis.document.fonts?.ready);

        const state = await page.evaluate(() => ({
          href: globalThis.window.location.href,
          title: globalThis.document.title,
          h1Count: globalThis.document.querySelectorAll('h1').length,
          mainCount: globalThis.document.querySelectorAll('main').length,
          scrollWidth: globalThis.document.documentElement.scrollWidth,
          clientWidth: globalThis.document.documentElement.clientWidth
        }));
        const status = response?.status() || 0;
        const failures = [];
        if (status < 200 || status >= 400) failures.push(`HTTP ${status}`);
        if (state.h1Count !== 1) failures.push(`${state.h1Count} h1 elements`);
        if (state.mainCount !== 1) failures.push(`${state.mainCount} main elements`);
        if (/(^|\/)alpha(?:\/|$)/i.test(new URL(state.href).pathname)) {
          failures.push('redirected to legacy /alpha mount');
        }
        if (viewport.requireNoOverflow && state.scrollWidth > state.clientWidth + 1) {
          failures.push(`horizontal overflow ${state.scrollWidth}/${state.clientWidth}`);
        }

        const relativeFile = path.join(
          sanitizeSegment(surface.name),
          viewport.name,
          `${route.name}.png`
        );
        const outputFile = path.join(options.outputDirectory, relativeFile);
        await fs.mkdir(path.dirname(outputFile), { recursive: true });
        await page.screenshot({ path: outputFile, fullPage: true, animations: 'disabled' });
        await page.close();

        results.push({
          surface: surface.name,
          route: route.name,
          path: route.path,
          viewport: viewport.name,
          width: viewport.width,
          height: viewport.height,
          status,
          title: state.title,
          finalUrl: state.href,
          h1Count: state.h1Count,
          mainCount: state.mainCount,
          scrollWidth: state.scrollWidth,
          clientWidth: state.clientWidth,
          screenshot: relativeFile.replace(/\\/g, '/'),
          failures
        });
      }
    } finally {
      await context.close();
    }

    if (unsafeRequests.length > 0) {
      throw new Error(`Screenshot capture blocked unsafe requests:\n${unsafeRequests.join('\n')}`);
    }
  }
  return results;
}

async function runScreenshotCapture(rawOptions = {}, dependencies = {}) {
  const options = resolveCaptureOptions(rawOptions, dependencies.env || process.env);
  const chromium = dependencies.chromium || require('@playwright/test').chromium;
  const browser = await chromium.launch({ headless: true });
  let results;
  try {
    results = [
      ...await captureSurface(browser, { name: 'laravel-blade', baseUrl: options.laravelBaseUrl }, options),
      ...await captureSurface(browser, { name: 'web-uk', baseUrl: options.webBaseUrl }, options)
    ];
  } finally {
    await browser.close();
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    snapshotId: options.snapshotId,
    laravelBaseUrl: options.laravelBaseUrl,
    webBaseUrl: options.webBaseUrl,
    requestPolicy: 'GET_AND_HEAD_ONLY',
    routes: options.routes,
    viewports: options.viewports,
    ok: results.every((result) => result.failures.length === 0),
    results
  };
  await fs.mkdir(options.outputDirectory, { recursive: true });
  await fs.writeFile(
    path.join(options.outputDirectory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );
  return { ...manifest, outputDirectory: options.outputDirectory };
}

async function main() {
  const result = await runScreenshotCapture();
  console.log(`Screenshot manifest: ${path.join(result.outputDirectory, 'manifest.json')}`);
  console.log(`Captured ${result.results.length} images; structural result: ${result.ok ? 'PASS' : 'FAIL'}.`);
  if (!result.ok) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_SCREENSHOT_ROUTES,
  DEFAULT_SCREENSHOT_VIEWPORTS,
  assertCanonicalRoute,
  assertSafeBaseUrl,
  captureSurface,
  joinUrl,
  resolveCaptureOptions,
  runScreenshotCapture,
  sanitizeSegment
};

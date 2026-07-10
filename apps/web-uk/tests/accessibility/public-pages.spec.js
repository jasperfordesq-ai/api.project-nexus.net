// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('@playwright/test');
const { resolveOptions } = require('../../scripts/laravel-runtime-smoke');

const accessibilitySmoke = resolveOptions({}, process.env);
const tenantSlug = process.env.ACCESSIBILITY_TENANT_SLUG || accessibilitySmoke.tenant;
const mountPath = `/${encodeURIComponent(tenantSlug)}/accessible`;

const PUBLIC_ROUTES = [
  { name: 'tenant home', path: mountPath },
  { name: 'about', path: `${mountPath}/about` },
  { name: 'guide', path: `${mountPath}/guide` },
  { name: 'frequently asked questions', path: `${mountPath}/faq` },
  { name: 'sign in', path: `${mountPath}/login` },
  { name: 'register', path: `${mountPath}/register` },
  { name: 'contact', path: `${mountPath}/contact` },
  { name: 'legal hub', path: `${mountPath}/legal` },
  { name: 'accessibility statement', path: `${mountPath}/accessibility` },
  { name: 'feed shell', path: `${mountPath}/feed` },
  { name: 'members shell', path: `${mountPath}/members` },
  { name: 'events directory', path: `${mountPath}/events` },
  { name: 'listings directory', path: `${mountPath}/listings` }
];

const RTL_ROUTES = [
  { name: 'Arabic sign in', path: `${mountPath}/login?locale=ar` },
  { name: 'Arabic register', path: `${mountPath}/register?locale=ar` },
  { name: 'Arabic password reset request', path: `${mountPath}/login/forgot-password?locale=ar` }
];

const AUTHENTICATED_ROUTES = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'account hub', path: '/account' },
  { name: 'wallet', path: '/wallet' },
  { name: 'messages', path: '/messages' },
  { name: 'notifications', path: '/notifications' },
  { name: 'groups', path: '/groups' }
];

function seriousOrCritical(violations) {
  return violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
}

function formatViolations(violations) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    helpUrl: violation.helpUrl,
    targets: violation.nodes.map((node) => node.target)
  }));
}

test.describe('representative public-page accessibility gate', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} has a valid document structure and no high-impact axe violations`, async ({ page }, testInfo) => {
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });

      expect(response, `${route.path} did not return a document response`).not.toBeNull();
      expect(response.status(), `${route.path} returned HTTP ${response.status()}`).toBeLessThan(400);

      await expect(page.locator('main'), 'each page must have one main landmark').toHaveCount(1);
      await expect(page.locator('#main-content'), 'each page must have one main-content target').toHaveCount(1);
      await expect(page.locator('h1'), 'each representative public page must have one h1').toHaveCount(1);

      const duplicateIds = await page.locator('[id]').evaluateAll((elements) => {
        const counts = new Map();
        for (const element of elements) {
          counts.set(element.id, (counts.get(element.id) || 0) + 1);
        }
        return [...counts.entries()]
          .filter(([, count]) => count > 1)
          .map(([id, count]) => ({ id, count }));
      });
      expect(duplicateIds, `duplicate element IDs on ${route.path}`).toEqual([]);

      const axeResults = await new AxeBuilder({ page }).analyze();
      await testInfo.attach('axe-results', {
        body: Buffer.from(JSON.stringify({
          url: page.url(),
          violations: formatViolations(axeResults.violations),
          passes: axeResults.passes.map(({ id, impact }) => ({ id, impact })),
          incomplete: formatViolations(axeResults.incomplete)
        }, null, 2)),
        contentType: 'application/json'
      });

      const blockingViolations = seriousOrCritical(axeResults.violations);
      expect(
        formatViolations(blockingViolations),
        `serious or critical axe violations on ${route.path}`
      ).toEqual([]);
    });
  }
});

test.describe('Arabic RTL and narrow reflow gate', () => {
  for (const route of RTL_ROUTES) {
    test(`${route.name} has RTL semantics, reflows, and has no high-impact axe violations`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 320, height: 640 });
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });

      expect(response, `${route.path} did not return a document response`).not.toBeNull();
      expect(response.status(), `${route.path} returned HTTP ${response.status()}`).toBeLessThan(400);
      expect(response.headers()['content-language']).toBe('ar');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('#main-content')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);

      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      expect(
        overflow.scrollWidth,
        `${route.path} has horizontal overflow at a 320px CSS viewport`
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);

      const axeResults = await new AxeBuilder({ page }).analyze();
      await testInfo.attach('rtl-axe-results', {
        body: Buffer.from(JSON.stringify({
          url: page.url(),
          viewport: { width: 320, height: 640 },
          overflow,
          violations: formatViolations(axeResults.violations),
          incomplete: formatViolations(axeResults.incomplete)
        }, null, 2)),
        contentType: 'application/json'
      });

      expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
    });
  }
});

test.describe('representative authenticated-page accessibility gate', () => {
  test.describe.configure({ mode: 'serial' });

  let storageState;
  let authenticatedMountPath;

  test.beforeAll(async ({ browser, baseURL }) => {
    const smoke = accessibilitySmoke;
    authenticatedMountPath = `/${encodeURIComponent(smoke.tenant)}/accessible`;
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    await page.goto(`${authenticatedMountPath}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="email"]').fill(smoke.email);
    await page.locator('input[name="password"]').fill(smoke.password);
    await Promise.all([
      page.waitForURL((url) => url.pathname.endsWith('/dashboard')),
      page.locator('form:has(input[name="password"]) button[type="submit"]').click()
    ]);

    storageState = await context.storageState();
    await context.close();
  });

  for (const route of AUTHENTICATED_ROUTES) {
    test(`${route.name} has valid structure, reflow, and no high-impact axe violations`, async ({ browser, baseURL }, testInfo) => {
      const context = await browser.newContext({ baseURL, storageState });
      const page = await context.newPage();
      await page.setViewportSize({ width: 320, height: 640 });

      try {
        const path = `${authenticatedMountPath}${route.path}`;
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response, `${path} did not return a document response`).not.toBeNull();
        expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
        expect(page.url()).not.toContain('/login');
        await expect(page.locator('main')).toHaveCount(1);
        await expect(page.locator('#main-content')).toHaveCount(1);
        await expect(page.locator('h1')).toHaveCount(1);

        const duplicateIds = await page.locator('[id]').evaluateAll((elements) => {
          const counts = new Map();
          for (const element of elements) counts.set(element.id, (counts.get(element.id) || 0) + 1);
          return [...counts.entries()].filter(([, count]) => count > 1).map(([id, count]) => ({ id, count }));
        });
        expect(duplicateIds).toEqual([]);

        const overflow = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth
        }));
        expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

        const axeResults = await new AxeBuilder({ page }).analyze();
        await testInfo.attach('authenticated-axe-results', {
          body: Buffer.from(JSON.stringify({
            url: page.url(),
            viewport: { width: 320, height: 640 },
            overflow,
            violations: formatViolations(axeResults.violations),
            incomplete: formatViolations(axeResults.incomplete)
          }, null, 2)),
          contentType: 'application/json'
        });
        expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }
});

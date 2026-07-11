// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('@playwright/test');
const { resolveOptions } = require('../../scripts/laravel-runtime-smoke');
const { translate } = require('../../src/lib/localization');

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
  { name: 'profile summary', path: '/profile' },
  { name: 'profile settings', path: '/profile/settings' },
  { name: 'activity dashboard', path: '/activity' },
  { name: 'activity insights', path: '/activity/insights' },
  { name: 'achievements', path: '/achievements' },
  { name: 'XP shop', path: '/achievements/shop' },
  { name: 'badge collections', path: '/achievements/collections' },
  { name: 'badge showcase', path: '/achievements/showcase' },
  { name: 'engagement history', path: '/achievements/engagement' },
  { name: 'leaderboard', path: '/leaderboard' },
  { name: 'competitive leaderboard', path: '/leaderboard/competitive' },
  { name: 'leaderboard seasons', path: '/leaderboard/seasons' },
  { name: 'personal journey', path: '/leaderboard/journey' },
  { name: 'member spotlight', path: '/leaderboard/spotlight' },
  { name: 'NEXUS score', path: '/nexus-score' },
  { name: 'NEXUS tier ladder', path: '/nexus-score/tiers' },
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

async function hideCookieBanner(page, baseURL) {
  await page.context().addCookies([{
    name: 'nexus_accessible_cookie_consent',
    value: 'essential',
    url: new URL(baseURL).origin,
    sameSite: 'Lax'
  }]);
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

  test('Arabic Help Centre and Trust and Safety preserve Laravel catalog output with RTL reflow', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 640 });
    const routes = [
      {
        path: `${mountPath}/help?locale=ar`,
        title: translate('ar', 'help.title'),
        marker: translate('ar', 'help.search_button')
      },
      {
        path: `${mountPath}/trust-and-safety?locale=ar`,
        title: translate('ar', 'trust_safety.title'),
        marker: translate('ar', 'trust_safety.sections.how_exchanges.heading')
      }
    ];
    const evidence = [];

    for (const route of routes) {
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(response).not.toBeNull();
      expect(response.status()).toBeLessThan(400);
      expect(response.headers()['content-language']).toBe('ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('h1')).toHaveText(route.title);
      await expect(page.getByText(route.marker, { exact: true }).first()).toBeVisible();
      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
      const axeResults = await new AxeBuilder({ page }).analyze();
      expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
      evidence.push({ url: page.url(), overflow, violations: formatViolations(axeResults.violations) });
    }

    await testInfo.attach('arabic-support-family', {
      body: Buffer.from(JSON.stringify(evidence, null, 2)),
      contentType: 'application/json'
    });
  });

  test('Arabic About, Guide, Features, and FAQ preserve Laravel catalog output with RTL reflow', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 640 });
    const routes = [
      {
        path: `${mountPath}/about?locale=ar`,
        marker: translate('ar', 'about.how_it_works.title'),
        statsMarker: translate('ar', 'about.stats.title')
      },
      {
        path: `${mountPath}/guide?locale=ar`,
        marker: translate('ar', 'guide.title'),
        actionMarker: translate('ar', 'guide.browse_listings')
      },
      { path: `${mountPath}/features?locale=ar`, marker: translate('ar', 'features.items.find_help') },
      { path: `${mountPath}/faq?locale=ar`, marker: translate('ar', 'faq.q1') }
    ];
    const evidence = [];

    for (const route of routes) {
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(response).not.toBeNull();
      expect(response.status()).toBeLessThan(400);
      expect(response.headers()['content-language']).toBe('ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.getByText(route.marker, { exact: true }).first()).toBeVisible();
      if (route.statsMarker) {
        await expect(page.getByText(route.statsMarker, { exact: true }).first()).toBeVisible();
      }
      if (route.actionMarker) {
        await expect(page.getByText(route.actionMarker, { exact: true }).first()).toBeVisible();
      }
      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
      const axeResults = await new AxeBuilder({ page }).analyze();
      expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
      evidence.push({ url: page.url(), overflow, violations: formatViolations(axeResults.violations) });
    }

    await testInfo.attach('arabic-public-information-family', {
      body: Buffer.from(JSON.stringify(evidence, null, 2)),
      contentType: 'application/json'
    });
  });

  test('Arabic legal and accessibility pages preserve Laravel catalog shell output with RTL reflow', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 640 });
    const routes = [
      { path: `${mountPath}/legal?locale=ar`, marker: translate('ar', 'legal.hub_title') },
      { path: `${mountPath}/legal/privacy?locale=ar`, marker: translate('ar', 'legal.back_to_hub') },
      { path: `${mountPath}/accessibility?locale=ar`, marker: translate('ar', 'accessibility.title') }
    ];
    const evidence = [];

    for (const route of routes) {
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(response).not.toBeNull();
      expect(response.status()).toBeLessThan(400);
      expect(response.headers()['content-language']).toBe('ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.getByText(route.marker, { exact: true }).first()).toBeVisible();
      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
      const axeResults = await new AxeBuilder({ page }).analyze();
      expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
      evidence.push({ url: page.url(), overflow, violations: formatViolations(axeResults.violations) });
    }

    await testInfo.attach('arabic-legal-family', {
      body: Buffer.from(JSON.stringify(evidence, null, 2)),
      contentType: 'application/json'
    });
  });

  test('Arabic contact form preserves Laravel validation output with RTL reflow', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 640 });
    const response = await page.goto(`${mountPath}/contact?problem_url=/explore&locale=ar`, { waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(400);
    expect(response.headers()['content-language']).toBe('ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('h1')).toHaveText(translate('ar', 'contact.title'));
    await expect(page.locator('#message')).toContainText(translate('ar', 'report_problem.contact_prefill', { url: '/explore' }));

    await page.locator('#message').fill('');
    await page.locator('#email').fill('invalid');
    await Promise.all([
      page.waitForURL(/status=contact-validation/),
      page.locator('form:has(#name) button[type="submit"]').click()
    ]);
    await expect(page.locator('.govuk-error-summary')).toContainText(translate('ar', 'states.error_title'));
    await expect(page.locator('#name-error')).toContainText(translate('ar', 'contact.errors.name_required'));
    await expect(page.locator('#email-error')).toContainText(translate('ar', 'contact.errors.email_required'));
    await expect(page.locator('#message-error')).toContainText(translate('ar', 'contact.errors.message_required'));

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    const axeResults = await new AxeBuilder({ page }).analyze();
    await testInfo.attach('arabic-contact-validation', {
      body: Buffer.from(JSON.stringify({ url: page.url(), overflow, violations: formatViolations(axeResults.violations) }, null, 2)),
      contentType: 'application/json'
    });
    expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
  });

  test('Arabic cookie and email utility pages preserve Laravel catalog output with RTL reflow', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 640 });
    const routes = [
      { path: `${mountPath}/cookies?locale=ar`, marker: translate('ar', 'cookie_settings.analytics_legend') },
      { path: `${mountPath}/newsletter/unsubscribe?locale=ar`, marker: translate('ar', 'auth.unsubscribe_missing') },
      { path: `${mountPath}/verify-email?locale=ar`, marker: translate('ar', 'auth.verify_email_missing') }
    ];
    const evidence = [];

    for (const route of routes) {
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(response).not.toBeNull();
      expect(response.status()).toBeLessThan(400);
      expect(response.headers()['content-language']).toBe('ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.getByText(route.marker, { exact: true }).first()).toBeVisible();
      const overflow = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
      const axeResults = await new AxeBuilder({ page }).analyze();
      expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
      evidence.push({ url: page.url(), overflow, violations: formatViolations(axeResults.violations) });
    }

    await testInfo.attach('arabic-cookie-email-utilities', {
      body: Buffer.from(JSON.stringify(evidence, null, 2)),
      contentType: 'application/json'
    });
  });
});

test.describe('keyboard, focus, error, and forced-colour gate', () => {
  test('cookie controls and the skip link follow the visible document order', async ({ page }) => {
    const response = await page.goto(`${mountPath}/login`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);

    const acceptCookies = page.getByRole('button', { name: 'Accept analytics cookies' });
    const rejectCookies = page.getByRole('button', { name: 'Reject analytics cookies' });
    const cookieSettings = page.getByRole('link', { name: 'View cookies' });
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });

    await page.keyboard.press('Tab');
    await expect(acceptCookies).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(rejectCookies).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(cookieSettings).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('client validation focuses an actionable summary and connects every error to its field', async ({ page, baseURL }) => {
    await hideCookieBanner(page, baseURL);
    const response = await page.goto(`${mountPath}/login`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);

    const submit = page.getByRole('button', { name: 'Sign in', exact: true });
    await submit.focus();
    await page.keyboard.press('Enter');

    const summary = page.locator('form[data-validate-form] .govuk-error-summary');
    await expect(summary).toHaveCount(1);
    await expect(summary).toBeFocused();
    await expect(summary).toHaveAttribute('role', 'alert');

    const errorLinks = summary.locator('a');
    await expect(errorLinks).toHaveCount(2);
    expect(await errorLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([
      '#email',
      '#password'
    ]);

    const email = page.locator('#email');
    const password = page.locator('#password');
    await expect(email).toHaveAttribute('aria-describedby', /(^|\s)email-error(\s|$)/);
    await expect(password).toHaveAttribute('aria-describedby', /(^|\s)password-error(\s|$)/);
    await expect(page.locator('#email-error .govuk-visually-hidden')).toHaveText('Error:');
    await expect(page.locator('#password-error .govuk-visually-hidden')).toHaveText('Error:');

    await page.keyboard.press('Tab');
    await expect(page.locator('a[href="#email"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(email).toBeFocused();
  });

  test('client validation announcements use the active Arabic locale', async ({ page, baseURL }) => {
    await hideCookieBanner(page, baseURL);
    const response = await page.goto(`${mountPath}/login?locale=ar`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    const submit = page.locator('form[data-validate-form] button[type="submit"]');
    await expect(submit).toHaveCount(1);
    await submit.focus();
    await page.keyboard.press('Enter');

    const summary = page.locator('form[data-validate-form] .govuk-error-summary');
    await expect(summary).toBeFocused();
    const announcement = await summary.innerText();
    expect(announcement).not.toContain('There is a problem');
    expect(announcement).not.toContain('Enter a valid email address');
    expect(announcement).not.toContain('Enter the correct email address and password.');

    const prefixes = await page.locator('form[data-validate-form] .govuk-error-message .govuk-visually-hidden').allTextContents();
    expect(prefixes).toHaveLength(2);
    expect(prefixes).not.toContain('Error:');
  });

  test('forced colours preserve visible focus and 320px reflow in RTL', async ({ page, baseURL }, testInfo) => {
    await hideCookieBanner(page, baseURL);
    await page.emulateMedia({ colorScheme: 'dark', contrast: 'more', forcedColors: 'active' });
    await page.setViewportSize({ width: 320, height: 640 });
    const response = await page.goto(`${mountPath}/login?locale=ar`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);

    await page.keyboard.press('Tab');
    const skipLink = page.locator('.govuk-skip-link');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    const evidence = await page.evaluate(() => {
      const focused = document.activeElement;
      const style = focused ? getComputedStyle(focused) : null;
      return {
        activeElement: focused?.className || focused?.tagName || '',
        backgroundColor: style?.backgroundColor || '',
        boxShadow: style?.boxShadow || '',
        color: style?.color || '',
        outlineStyle: style?.outlineStyle || '',
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      };
    });
    expect(evidence.scrollWidth).toBeLessThanOrEqual(evidence.clientWidth + 1);
    expect(
      evidence.outlineStyle !== 'none'
        || evidence.boxShadow !== 'none'
        || evidence.backgroundColor !== 'rgba(0, 0, 0, 0)'
    ).toBe(true);

    const axeResults = await new AxeBuilder({ page }).analyze();
    await testInfo.attach('forced-colour-evidence', {
      body: Buffer.from(JSON.stringify({ evidence, violations: formatViolations(axeResults.violations) }, null, 2)),
      contentType: 'application/json'
    });
    expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
  });
});

test.describe('representative authenticated-page accessibility gate', () => {
  test.describe.configure({ mode: 'serial' });

  let storageState;
  let authenticatedMountPath;

  test.beforeAll(async ({ browser, baseURL }) => {
    test.setTimeout(180_000);
    const smoke = accessibilitySmoke;
    authenticatedMountPath = `/${encodeURIComponent(smoke.tenant)}/accessible`;
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    await page.goto(`${authenticatedMountPath}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="email"]').fill(smoke.email);
    await page.locator('input[name="password"]').fill(smoke.password);
    await Promise.all([
      page.waitForURL((url) => url.pathname.endsWith('/dashboard'), { timeout: 120_000 }),
      page.locator('form:has(input[name="password"]) button[type="submit"]').click()
    ]);

    storageState = await context.storageState();
    await context.close();
  });

  for (const route of AUTHENTICATED_ROUTES) {
    test(`${route.name} has valid structure, reflow, and no high-impact axe violations`, async ({ browser, baseURL }, testInfo) => {
      test.setTimeout(90_000);
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

  test('Arabic report-problem form preserves Laravel validation output with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });
    try {
      const response = await page.goto(`${authenticatedMountPath}/report-a-problem?return=/explore&locale=ar`, { waitUntil: 'domcontentloaded' });
      expect(response).not.toBeNull();
      expect(response.status()).toBeLessThan(400);
      expect(response.headers()['content-language']).toBe('ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('h1')).toHaveText(translate('ar', 'report_problem.title'));
      await expect(page.getByText(translate('ar', 'report_problem.impacts.blocked'), { exact: true })).toBeVisible();

      await page.locator('#summary').fill('No');
      await page.locator('#description').fill('Short');
      await Promise.all([
        page.waitForURL(/status=invalid/),
        page.locator('form:has(#summary) button[type="submit"]').click()
      ]);
      await expect(page.locator('#summary-error')).toContainText(translate('ar', 'report_problem.errors.summary'));
      await expect(page.locator('#description-error')).toContainText(translate('ar', 'report_problem.errors.description'));
      await expect(page.locator('#impact-error')).toContainText(translate('ar', 'report_problem.errors.impact'));
      const overflow = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
      const axeResults = await new AxeBuilder({ page }).analyze();
      await testInfo.attach('authenticated-arabic-report-problem', { body: Buffer.from(JSON.stringify({ url: page.url(), overflow, violations: formatViolations(axeResults.violations) }, null, 2)), contentType: 'application/json' });
      expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('Arabic dashboard localizes Laravel-owned labels and retains RTL reflow', async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });

    try {
      const path = `${authenticatedMountPath}/dashboard?locale=ar`;
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response, `${path} did not return a document response`).not.toBeNull();
      expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
      expect(response.headers()['content-language']).toBe('ar');
      expect(page.url()).not.toContain('/login');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('h1')).toHaveText(translate('ar', 'dashboard.title'));
      await expect(page.getByText(translate('ar', 'profile.hours_given_label'), { exact: true })).toHaveCount(1);

      const visibleText = await page.locator('body').innerText();
      for (const englishLabel of [
        'Welcome back',
        'Create a listing',
        'Hours given',
        'Hours received',
        'Active listings',
        'Quick links',
        'Recent feed',
        'Recent listings'
      ]) {
        expect(visibleText).not.toContain(englishLabel);
      }

      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

      const axeResults = await new AxeBuilder({ page }).analyze();
      await testInfo.attach('authenticated-arabic-dashboard', {
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

  test('Arabic account hub localizes its Laravel-owned actions with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });

    try {
      const path = `${authenticatedMountPath}/account?locale=ar`;
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response, `${path} did not return a document response`).not.toBeNull();
      expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
      expect(response.headers()['content-language']).toBe('ar');
      expect(page.url()).not.toContain('/login');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('h1')).toHaveText(translate('ar', 'account.title'));
      await expect(page.locator('main .govuk-caption-xl')).not.toBeEmpty();
      await expect(page.locator('main form[action$="/logout"] button')).toHaveText(translate('ar', 'account.sign_out'));
      expect(await page.locator('body').innerText()).not.toContain('Sign out');

      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

      const axeResults = await new AxeBuilder({ page }).analyze();
      await testInfo.attach('authenticated-arabic-account', {
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

  test('Arabic profile summary localizes Laravel sections with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });

    try {
      const path = `${authenticatedMountPath}/profile?locale=ar`;
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response, `${path} did not return a document response`).not.toBeNull();
      expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
      expect(response.headers()['content-language']).toBe('ar');
      expect(page.url()).not.toContain('/login');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('h1')).not.toBeEmpty();
      await expect(page.locator('main .govuk-caption-l')).toHaveText(translate('ar', 'profile.own_caption'));
      await expect(page.getByRole('link', { name: translate('ar', 'actions.edit_profile'), exact: true })).toHaveCount(1);
      await expect(page.getByRole('heading', { name: translate('ar', 'profile.activity_title'), exact: true })).toHaveCount(1);

      const visibleText = await page.locator('body').innerText();
      for (const englishLabel of ['Your profile', 'Edit profile', 'Hours given', 'Back to dashboard']) {
        expect(visibleText).not.toContain(englishLabel);
      }

      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

      const axeResults = await new AxeBuilder({ page }).analyze();
      await testInfo.attach('authenticated-arabic-profile', {
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

  test('Arabic profile settings localize Laravel form sections with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });

    try {
      const path = `${authenticatedMountPath}/profile/settings?locale=ar`;
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response, `${path} did not return a document response`).not.toBeNull();
      expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
      expect(response.headers()['content-language']).toBe('ar');
      expect(page.url()).not.toContain('/login');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('h1')).toHaveText(translate('ar', 'profile_settings.title'));
      await expect(page.getByRole('heading', { name: translate('ar', 'profile_settings.security_title'), exact: true })).toHaveCount(1);
      await expect(page.getByText(translate('ar', 'profile_settings.notifications.digest_label'), { exact: true })).toHaveCount(1);
      await expect(page.getByText(translate('ar', 'profile_settings.match.notify_hot'), { exact: true })).toHaveCount(1);
      await expect(page.getByText(translate('ar', 'profile_settings.personalisation.auto_translate_label'), { exact: true })).toHaveCount(1);

      const visibleText = await page.locator('main').innerText();
      for (const englishLabel of [
        'Profile photo',
        'Save notification preferences',
        'Tell me about high priority matches',
        'Automatically translate community posts'
      ]) {
        expect(visibleText).not.toContain(englishLabel);
      }

      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

      const axeResults = await new AxeBuilder({ page }).analyze();
      await testInfo.attach('authenticated-arabic-profile-settings', {
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

  test('Arabic activity pages preserve Laravel catalog output with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(150_000);
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });

    try {
      for (const route of [
        { path: '/activity?locale=ar', heading: translate('ar', 'activity.title') },
        { path: '/activity/insights?locale=ar', heading: translate('ar', 'govuk_alpha_activity.insights.heading') }
      ]) {
        const path = `${authenticatedMountPath}${route.path}`;
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response, `${path} did not return a document response`).not.toBeNull();
        expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
        expect(response.headers()['content-language']).toBe('ar');
        expect(page.url()).not.toContain('/login');
        await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('h1')).toHaveText(route.heading);

        const overflow = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth
        }));
        expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

        const axeResults = await new AxeBuilder({ page }).analyze();
        await testInfo.attach(`authenticated-arabic-${route.path.includes('insights') ? 'activity-insights' : 'activity'}`, {
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
      }
    } finally {
      await context.close();
    }
  });

  test('Arabic reviews pages preserve Laravel catalog output with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });
    try {
      for (const route of [
        { path: '/reviews?locale=ar', heading: translate('ar', 'reviews_page.title') },
        { path: '/reviews/list?locale=ar', heading: translate('ar', 'govuk_alpha_blogreviews.reviews_list.title') }
      ]) {
        const path = `${authenticatedMountPath}${route.path}`;
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response).not.toBeNull();
        expect(response.status()).toBeLessThan(400);
        expect(response.headers()['content-language']).toBe('ar');
        await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('h1')).toHaveText(route.heading);
        const overflow = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
        const axeResults = await new AxeBuilder({ page }).analyze();
        await testInfo.attach(`authenticated-arabic-reviews-${route.path.includes('list') ? 'list' : 'index'}`, { body: Buffer.from(JSON.stringify({ url: page.url(), overflow, violations: formatViolations(axeResults.violations) }, null, 2)), contentType: 'application/json' });
        expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
      }
    } finally {
      await context.close();
    }
  });

  test('Arabic knowledge base preserves Laravel catalog output with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });
    try {
      const indexPath = `${authenticatedMountPath}/kb?locale=ar`;
      const indexResponse = await page.goto(indexPath, { waitUntil: 'domcontentloaded' });
      expect(indexResponse).not.toBeNull();
      expect(indexResponse.status()).toBeLessThan(400);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('h1')).toHaveText(translate('ar', 'kb.title'));
      const firstArticle = page.locator('.nexus-alpha-card a').first();
      await expect(firstArticle).toBeVisible();
      const href = await firstArticle.getAttribute('href');
      expect(href).toBeTruthy();
      const detailResponse = await page.goto(`${href}${href.includes('?') ? '&' : '?'}locale=ar`, { waitUntil: 'domcontentloaded' });
      expect(detailResponse.status()).toBeLessThan(400);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('.govuk-back-link')).toHaveText(translate('ar', 'kb.back_to_kb'));
      const overflow = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
      const axeResults = await new AxeBuilder({ page }).analyze();
      await testInfo.attach('authenticated-arabic-kb', { body: Buffer.from(JSON.stringify({ url: page.url(), overflow, violations: formatViolations(axeResults.violations) }, null, 2)), contentType: 'application/json' });
      expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('Arabic notifications preserve Laravel catalog output with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });

    try {
      const path = `${authenticatedMountPath}/notifications?locale=ar`;
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response, `${path} did not return a document response`).not.toBeNull();
      expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
      expect(response.headers()['content-language']).toBe('ar');
      expect(page.url()).not.toContain('/login');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('h1')).toContainText(translate('ar', 'notifications.title'));
      await expect(page.locator('.govuk-body-l')).toHaveText(translate('ar', 'notifications.description'));

      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

      const axeResults = await new AxeBuilder({ page }).analyze();
      await testInfo.attach('authenticated-arabic-notifications', {
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

  test('Arabic messages preserve Laravel catalog output with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });

    try {
      const path = `${authenticatedMountPath}/messages?locale=ar`;
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response, `${path} did not return a document response`).not.toBeNull();
      expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
      expect(response.headers()['content-language']).toBe('ar');
      expect(page.url()).not.toContain('/login');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('h1')).toContainText(translate('ar', 'messages.title'));
      await expect(page.locator('.govuk-body-l')).toHaveText(translate('ar', 'messages.description'));

      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

      const axeResults = await new AxeBuilder({ page }).analyze();
      await testInfo.attach('authenticated-arabic-messages', {
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

  test('Arabic connections pages preserve Laravel catalog output with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });

    try {
      for (const route of [
        { path: '/connections?locale=ar', heading: 'connections.title', description: 'connections.description' },
        { path: '/connections/network?locale=ar', heading: 'govuk_alpha_connections.network.title', description: 'govuk_alpha_connections.network.description' }
      ]) {
        const path = `${authenticatedMountPath}${route.path}`;
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response, `${path} did not return a document response`).not.toBeNull();
        expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
        expect(response.headers()['content-language']).toBe('ar');
        expect(page.url()).not.toContain('/login');
        await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('h1')).toHaveText(translate('ar', route.heading));
        await expect(page.locator('.govuk-body-l')).toHaveText(translate('ar', route.description));

        const overflow = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth
        }));
        expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

        const axeResults = await new AxeBuilder({ page }).analyze();
        await testInfo.attach(`authenticated-arabic-${route.heading.replaceAll('.', '-')}`, {
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
      }
    } finally {
      await context.close();
    }
  });

  test('Arabic wallet pages preserve Laravel catalog output with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });

    try {
      for (const route of [
        { path: '/wallet?locale=ar', heading: 'wallet.title', description: 'wallet.description', warning: 'wallet_t1.donate_warning' },
        { path: '/wallet/manage?locale=ar', heading: 'govuk_alpha_wallet.manage.title', description: 'govuk_alpha_wallet.manage.description', warning: 'govuk_alpha_wallet.donate.warning' }
      ]) {
        const path = `${authenticatedMountPath}${route.path}`;
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response, `${path} did not return a document response`).not.toBeNull();
        expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
        expect(response.headers()['content-language']).toBe('ar');
        expect(page.url()).not.toContain('/login');
        await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('h1')).toHaveText(translate('ar', route.heading));
        await expect(page.locator('.govuk-body-l')).toHaveText(translate('ar', route.description));
        await expect(page.locator('#donate')).toContainText(translate('ar', route.warning));

        const overflow = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth
        }));
        expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

        const axeResults = await new AxeBuilder({ page }).analyze();
        await testInfo.attach(`authenticated-arabic-${route.heading.replaceAll('.', '-')}`, {
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
      }
    } finally {
      await context.close();
    }
  });

  test('Arabic member directory variants preserve Laravel catalog output with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });

    try {
      for (const route of [
        {
          path: '/members?locale=ar',
          heading: 'members.title',
          description: 'members.description'
        },
        {
          path: '/members/discover?locale=ar',
          heading: 'govuk_alpha_members.discover.heading',
          description: 'govuk_alpha_members.discover.description'
        },
        {
          path: '/members/nearby?locale=ar',
          heading: 'govuk_alpha_members.nearby.heading',
          description: 'govuk_alpha_members.nearby.description'
        },
        {
          path: '/members/77?locale=ar'
        },
        {
          path: '/members/77/insights?locale=ar',
          heading: 'govuk_alpha_members.insights.heading'
        }
      ]) {
        const path = `${authenticatedMountPath}${route.path}`;
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response, `${path} did not return a document response`).not.toBeNull();
        expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
        expect(response.headers()['content-language']).toBe('ar');
        expect(page.url()).not.toContain('/login');
        await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        if (route.heading) {
          await expect(page.locator('h1')).toHaveText(translate('ar', route.heading));
        } else {
          await expect(page.locator('h1')).toHaveCount(1);
          await expect(page.locator('h1')).not.toBeEmpty();
        }
        if (route.description) {
          await expect(page.locator('.govuk-body-l')).toHaveText(translate('ar', route.description));
        }

        const overflow = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth
        }));
        expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

        const axeResults = await new AxeBuilder({ page }).analyze();
        await testInfo.attach(`authenticated-arabic-${(route.heading || route.path).replaceAll(/[./?=]/g, '-')}`, {
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
      }
    } finally {
      await context.close();
    }
  });

  test('Arabic achievements pages preserve Laravel catalog output with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });

    try {
      for (const route of [
        { path: '/achievements?locale=ar', heading: translate('ar', 'achievements.title') },
        { path: '/achievements/shop?locale=ar', heading: translate('ar', 'govuk_alpha_gamification.shop.title') },
        { path: '/achievements/collections?locale=ar', heading: translate('ar', 'govuk_alpha_gamification.collections.title') },
        { path: '/achievements/showcase?locale=ar', heading: translate('ar', 'govuk_alpha_gamification.showcase.title') },
        { path: '/achievements/engagement?locale=ar', heading: translate('ar', 'govuk_alpha_gamification.engagement.title') }
      ]) {
        const path = `${authenticatedMountPath}${route.path}`;
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response, `${path} did not return a document response`).not.toBeNull();
        expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
        expect(response.headers()['content-language']).toBe('ar');
        expect(page.url()).not.toContain('/login');
        await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('h1')).toHaveText(route.heading);

        const overflow = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth
        }));
        expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

        const axeResults = await new AxeBuilder({ page }).analyze();
        expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
      }

      await testInfo.attach('authenticated-arabic-achievements-family', {
        body: Buffer.from(JSON.stringify({
          pages: 5,
          viewport: { width: 320, height: 640 },
          finalUrl: page.url()
        }, null, 2)),
        contentType: 'application/json'
      });
    } finally {
      await context.close();
    }
  });

  test('Arabic leaderboard and NEXUS score pages preserve Laravel catalog output with RTL reflow', async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(360_000);
    const context = await browser.newContext({ baseURL, storageState });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 640 });

    try {
      for (const route of [
        { path: '/leaderboard?locale=ar', heading: translate('ar', 'leaderboard.title') },
        { path: '/leaderboard/competitive?locale=ar', heading: translate('ar', 'govuk_alpha_gamification.competitive.title') },
        { path: '/leaderboard/seasons?locale=ar', heading: translate('ar', 'govuk_alpha_gamification.seasons.title') },
        { path: '/leaderboard/journey?locale=ar', heading: translate('ar', 'govuk_alpha_gamification.journey.title') },
        { path: '/leaderboard/spotlight?locale=ar', heading: translate('ar', 'govuk_alpha_gamification.spotlight.title') },
        { path: '/nexus-score?locale=ar', heading: translate('ar', 'nexus_score.title') },
        { path: '/nexus-score/tiers?locale=ar', heading: translate('ar', 'govuk_alpha_gamification.tiers.title') }
      ]) {
        const path = `${authenticatedMountPath}${route.path}`;
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response, `${path} did not return a document response`).not.toBeNull();
        expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(400);
        expect(response.headers()['content-language']).toBe('ar');
        expect(page.url()).not.toContain('/login');
        await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('h1')).toHaveText(route.heading);

        const overflow = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth
        }));
        expect(overflow.scrollWidth, `${path} has horizontal overflow at 320px`).toBeLessThanOrEqual(overflow.clientWidth + 1);

        const axeResults = await new AxeBuilder({ page }).analyze();
        expect(formatViolations(seriousOrCritical(axeResults.violations))).toEqual([]);
      }

      await testInfo.attach('authenticated-arabic-leaderboard-nexus-family', {
        body: Buffer.from(JSON.stringify({
          pages: 7,
          viewport: { width: 320, height: 640 },
          finalUrl: page.url()
        }, null, 2)),
        contentType: 'application/json'
      });
    } finally {
      await context.close();
    }
  });
});

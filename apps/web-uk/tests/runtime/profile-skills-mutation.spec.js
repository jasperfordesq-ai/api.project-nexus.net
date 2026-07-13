// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { resolveOptions } = require('../../scripts/laravel-runtime-smoke');
const { callUserSettingsApi, login } = require('../../src/lib/api');

const smoke = resolveOptions({}, process.env);
const mountPath = `/${encodeURIComponent(smoke.tenant)}/accessible`;

function rowsFrom(result) {
  const data = result?.data ?? result;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function matchPreferencesFrom(result) {
  const data = result?.data ?? result ?? {};
  return {
    notification_frequency: String(data.notification_frequency || 'monthly'),
    notify_hot_matches: Boolean(data.notify_hot_matches),
    notify_mutual_matches: Boolean(data.notify_mutual_matches)
  };
}

async function authenticate(page) {
  await page.goto(`${mountPath}/login`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
  await page.locator('input[name="email"]').fill(smoke.email);
  await page.locator('input[name="password"]').fill(smoke.password);
  const responsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/login'), { timeout: 300_000 });
  await page.locator('form:has(input[name="password"]) button[type="submit"]').click({ noWaitAfter: true });
  expect((await responsePromise).status()).toBe(302);
  await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
}

async function submit(page, pathnameSuffix, button) {
  const responsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(pathnameSuffix), { timeout: 300_000 });
  const navigationPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 300_000 });
  await button.click({ noWaitAfter: true });
  const response = await responsePromise;
  expect(response.status()).toBe(302);
  await navigationPromise;
}

async function expectAccessibleReflow(page) {
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  const duplicateIds = await page.locator('[id]').evaluateAll((elements) => {
    const ids = elements.map(element => element.id).filter(Boolean);
    return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  });
  expect(duplicateIds).toEqual([]);
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
}

test('adds and removes a disposable member skill through Web UK', async ({ page }) => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const skillName = `Accessible testing ${runId}`;
  const auth = await login(smoke.email, smoke.password, smoke.tenant);
  const token = auth.access_token;
  let skillId = null;
  let removed = false;

  expect(token).toBeTruthy();
  expect(rowsFrom(await callUserSettingsApi(token, 'GET', '/skills')).some(skill => skill?.skill_name === skillName)).toBe(false);
  console.log(`Disposable profile skill fixture: ${skillName}`);

  try {
    await page.setViewportSize({ width: 320, height: 640 });
    await authenticate(page);
    await page.goto(`${mountPath}/profile/settings`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await expect(page.locator('h1')).toHaveText('Edit your profile');
    await page.locator('#skill_name').fill(skillName);
    await page.locator('#is_offering').check();
    await page.locator('#is_requesting').check();

    await submit(page, '/profile/skills/add', page.locator(`form[action$="/profile/skills/add"] button`));
    await expect(page.getByText('Your skill has been added.', { exact: true })).toHaveCount(1);

    let skills = rowsFrom(await callUserSettingsApi(token, 'GET', '/skills'));
    const created = skills.find(skill => skill?.skill_name === skillName);
    expect(created).toBeTruthy();
    skillId = Number(created.id);
    expect(skillId).toBeGreaterThan(0);
    expect(Boolean(created.is_offering)).toBe(true);
    expect(Boolean(created.is_requesting)).toBe(true);

    const skillRow = page.locator('li', { hasText: skillName });
    await expect(skillRow).toHaveCount(1);
    await expect(skillRow).toContainText('Offering');
    await expect(skillRow).toContainText('Requesting');
    await expectAccessibleReflow(page);

    await submit(page, '/profile/skills/remove', skillRow.locator(`form[action$="/profile/skills/remove"] button`));
    await expect(page.getByText('Your skill has been removed.', { exact: true })).toHaveCount(1);
    skills = rowsFrom(await callUserSettingsApi(token, 'GET', '/skills'));
    expect(skills.some(skill => skill?.skill_name === skillName)).toBe(false);
    removed = true;
  } finally {
    if (!removed) {
      const existing = rowsFrom(await callUserSettingsApi(token, 'GET', '/skills')).find(skill => skill?.skill_name === skillName);
      if (existing?.id) await callUserSettingsApi(token, 'DELETE', `/skills/${existing.id}`);
    }
    expect(rowsFrom(await callUserSettingsApi(token, 'GET', '/skills')).some(skill => skill?.skill_name === skillName)).toBe(false);
  }
});

test('changes and restores match notification preferences through Web UK', async ({ page }) => {
  const auth = await login(smoke.email, smoke.password, smoke.tenant);
  const token = auth.access_token;
  const initial = matchPreferencesFrom(await callUserSettingsApi(token, 'GET', '/match-preferences'));
  const frequencies = ['daily', 'weekly', 'monthly', 'fortnightly', 'never'];
  const changed = {
    notification_frequency: frequencies.find(value => value !== initial.notification_frequency),
    notify_hot_matches: !initial.notify_hot_matches,
    notify_mutual_matches: !initial.notify_mutual_matches
  };
  let preferencesChanged = false;

  expect(token).toBeTruthy();
  expect(changed.notification_frequency).toBeTruthy();

  try {
    await page.setViewportSize({ width: 320, height: 640 });
    await authenticate(page);
    await page.goto(`${mountPath}/profile/settings`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await expect(page.locator('h1')).toHaveText('Edit your profile');

    await page.locator('#notification_frequency').selectOption(changed.notification_frequency);
    await page.locator('#notify_hot_matches').setChecked(changed.notify_hot_matches);
    await page.locator('#notify_mutual_matches').setChecked(changed.notify_mutual_matches);
    preferencesChanged = true;
    await submit(page, '/profile/match-preferences', page.locator(`form[action$="/profile/match-preferences"] button`));

    await expect(page.getByText('Your match notification settings have been saved.', { exact: true })).toHaveCount(1);
    await expect(page.locator('#notification_frequency')).toHaveValue(changed.notification_frequency);
    await expect(page.locator('#notify_hot_matches')).toBeChecked({ checked: changed.notify_hot_matches });
    await expect(page.locator('#notify_mutual_matches')).toBeChecked({ checked: changed.notify_mutual_matches });
    expect(matchPreferencesFrom(await callUserSettingsApi(token, 'GET', '/match-preferences'))).toEqual(changed);
    await expectAccessibleReflow(page);

    await page.locator('#notification_frequency').selectOption(initial.notification_frequency);
    await page.locator('#notify_hot_matches').setChecked(initial.notify_hot_matches);
    await page.locator('#notify_mutual_matches').setChecked(initial.notify_mutual_matches);
    await submit(page, '/profile/match-preferences', page.locator(`form[action$="/profile/match-preferences"] button`));
    expect(matchPreferencesFrom(await callUserSettingsApi(token, 'GET', '/match-preferences'))).toEqual(initial);
    preferencesChanged = false;
  } finally {
    if (preferencesChanged) {
      await callUserSettingsApi(token, 'PUT', '/match-preferences', initial);
    }
    expect(matchPreferencesFrom(await callUserSettingsApi(token, 'GET', '/match-preferences'))).toEqual(initial);
  }
});

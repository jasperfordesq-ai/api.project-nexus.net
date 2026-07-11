// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { resolveOptions } = require('../../scripts/laravel-runtime-smoke');
const { deleteGroup, getGroups, login } = require('../../src/lib/api');

const smoke = resolveOptions({}, process.env);
const mountPath = `/${encodeURIComponent(smoke.tenant)}/accessible`;

function rowsFrom(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

async function authenticate(page) {
  await page.goto(`${mountPath}/login`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
  await page.locator('input[name="email"]').fill(smoke.email);
  await page.locator('input[name="password"]').fill(smoke.password);
  const responsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/login'), { timeout: 300_000 });
  await page.locator('form:has(input[name="password"]) button[type="submit"]').click();
  expect((await responsePromise).status()).toBe(302);
  await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
}

async function submit(page, pathnameSuffix, button) {
  const responsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(pathnameSuffix), { timeout: 300_000 });
  await button.click();
  return responsePromise;
}

async function findByName(token, name) {
  const result = await getGroups(token, { q: name, per_page: 100 });
  return rowsFrom(result).find(group => group?.name === name) || null;
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

test('creates, updates, and deletes a disposable private group through Web UK', async ({ page }) => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const createdName = `Codex disposable group ${runId}`;
  const updatedName = `${createdName} updated`;
  const auth = await login(smoke.email, smoke.password, smoke.tenant);
  const token = auth.access_token;
  let groupId = null;
  let deleted = false;

  expect(token).toBeTruthy();
  console.log(`Disposable group fixture: ${createdName}`);

  try {
    await page.setViewportSize({ width: 320, height: 640 });
    await authenticate(page);
    await page.goto(`${mountPath}/groups/new`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await page.locator('#name').fill(createdName);
    await page.locator('#description').fill('Disposable Laravel group mutation fixture created by the Web UK runtime gate.');
    await page.locator('#location').fill('Disposable test location');
    await page.locator('input[name="visibility"][value="private"]').check();

    const createResponse = await submit(page, '/groups/new', page.locator('form:has(#name) button[type="submit"]'));
    expect(createResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });

    const created = await findByName(token, createdName);
    expect(created).toBeTruthy();
    groupId = Number(created.id);
    expect(groupId).toBeGreaterThan(0);
    expect(new URL(page.url()).pathname).toBe(`${mountPath}/groups/${groupId}`);
    await expect(page.locator('h1')).toContainText(createdName);
    await expectAccessibleReflow(page);

    await page.goto(`${mountPath}/groups/${groupId}/edit`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await expectAccessibleReflow(page);
    await page.locator('#name').fill(updatedName);
    const updateResponse = await submit(page, `/groups/${groupId}/edit`, page.locator('form:has(#name) button[type="submit"]'));
    expect(updateResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    await expect(page.locator('h1')).toContainText(updatedName);
    expect(await findByName(token, createdName)).toBeNull();
    expect(await findByName(token, updatedName)).toBeTruthy();

    await page.goto(`${mountPath}/groups/${groupId}/edit`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    const deleteForm = page.locator(`form[action$="/groups/${groupId}/delete"]`);
    await expect(deleteForm).toHaveCount(1);
    await deleteForm.locator('#confirm-delete').check();
    const deleteResponse = await submit(page, `/groups/${groupId}/delete`, deleteForm.locator('button[type="submit"]'));
    expect(deleteResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    expect(await findByName(token, updatedName)).toBeNull();
    deleted = true;
  } finally {
    if (!deleted) {
      const existing = await findByName(token, updatedName) || await findByName(token, createdName);
      if (existing) await deleteGroup(token, existing.id);
    }
  }
});

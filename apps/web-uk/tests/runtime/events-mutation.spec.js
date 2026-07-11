// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { resolveOptions } = require('../../scripts/laravel-runtime-smoke');
const { deleteEvent, getEvents, login } = require('../../src/lib/api');

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

function localDateTime(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

async function findByTitle(token, title) {
  const result = await getEvents(token, { search: title, when: 'all', per_page: 100 });
  return rowsFrom(result).find(event => event?.title === title) || null;
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

test('creates, updates, and deletes a disposable event through Web UK', async ({ page }) => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const createdTitle = `Codex disposable event ${runId}`;
  const updatedTitle = `${createdTitle} updated`;
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const auth = await login(smoke.email, smoke.password, smoke.tenant);
  const token = auth.access_token;
  let eventId = null;
  let deleted = false;

  expect(token).toBeTruthy();
  console.log(`Disposable event fixture: ${createdTitle}`);

  try {
    await page.setViewportSize({ width: 320, height: 640 });
    await authenticate(page);
    await page.goto(`${mountPath}/events/new`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await page.locator('#title').fill(createdTitle);
    await page.locator('#description').fill('Disposable Laravel event mutation fixture created by the Web UK runtime gate.');
    await page.locator('#location').fill('Disposable test location');
    await page.locator('#start_time').fill(localDateTime(start));
    await page.locator('#end_time').fill(localDateTime(end));

    const createResponse = await submit(page, '/events/new', page.locator('form:has(#title) button[type="submit"]').last());
    expect(createResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });

    const created = await findByTitle(token, createdTitle);
    expect(created).toBeTruthy();
    eventId = Number(created.id);
    expect(eventId).toBeGreaterThan(0);
    expect(new URL(page.url()).pathname).toBe(`${mountPath}/events/${eventId}`);
    await expect(page.locator('h1')).toContainText(createdTitle);
    await expect(page.locator('.govuk-caption-l')).toHaveText('Event details');
    await expect(page.getByRole('heading', { name: 'Description', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Event information', exact: true })).toBeVisible();
    await expect(page.locator('dt', { hasText: 'Starts' })).toHaveCount(1);
    await expect(page.locator('dt', { hasText: 'Going' })).toHaveCount(1);
    await expect(page.locator('dt', { hasText: 'Interested' })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'About this event', exact: true })).toHaveCount(0);
    await expectAccessibleReflow(page);

    await page.goto(`${mountPath}/events/${eventId}/edit`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await expectAccessibleReflow(page);
    await page.locator('#title').fill(updatedTitle);
    const updateResponse = await submit(page, `/events/${eventId}/edit`, page.locator('form:has(#title) button[type="submit"]').last());
    expect(updateResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    await expect(page.locator('h1')).toContainText(updatedTitle);
    expect(await findByTitle(token, createdTitle)).toBeNull();
    expect(await findByTitle(token, updatedTitle)).toBeTruthy();

    const deleteForm = page.locator(`form[action$="/events/${eventId}/delete"]`);
    await expect(deleteForm).toHaveCount(1);
    await page.getByText('Delete this event', { exact: true }).click();
    await expect(deleteForm.locator('button[type="submit"]')).toBeVisible();
    const deleteResponse = await submit(page, `/events/${eventId}/delete`, deleteForm.locator('button[type="submit"]'));
    expect(deleteResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    expect(await findByTitle(token, updatedTitle)).toBeNull();
    deleted = true;
  } finally {
    if (!deleted) {
      const existing = await findByTitle(token, updatedTitle) || await findByTitle(token, createdTitle);
      if (existing) await deleteEvent(token, existing.id);
    }
  }
});

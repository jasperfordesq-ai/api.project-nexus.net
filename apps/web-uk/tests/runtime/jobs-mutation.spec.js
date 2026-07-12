// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { resolveOptions } = require('../../scripts/laravel-runtime-smoke');
const { callJobApi, login } = require('../../src/lib/api');

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

function objectFrom(result) {
  const data = result?.data ?? result;
  return data?.job && typeof data.job === 'object' ? data.job : data;
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

async function submitWithoutConstraintValidation(page, pathnameSuffix, form) {
  const responsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(pathnameSuffix), { timeout: 300_000 });
  const navigationPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 300_000 });
  await form.evaluate(element => element.submit());
  const response = await responsePromise;
  await navigationPromise;
  return response;
}

async function findByTitle(token, title) {
  const result = await callJobApi(token, 'GET', '/my-postings?per_page=100');
  return rowsFrom(result).find(job => job?.title === title) || null;
}

async function findAlert(token, keywords) {
  const result = await callJobApi(token, 'GET', '/alerts');
  return rowsFrom(result).find(alert => alert?.keywords === keywords) || null;
}

async function expectAccessibleReflow(page) {
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  const duplicateIds = await page.locator('[id]').evaluateAll(elements => {
    const ids = elements.map(element => element.id).filter(Boolean);
    return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  });
  expect(duplicateIds).toEqual([]);
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
}

test('certifies a disposable job owner lifecycle through Web UK', async ({ page }) => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const createdTitle = `Codex disposable opportunity ${runId}`;
  const updatedTitle = `${createdTitle} updated`;
  const auth = await login(smoke.email, smoke.password, smoke.tenant);
  const token = auth.access_token;
  let jobId = null;
  let deleted = false;

  expect(token).toBeTruthy();
  console.log(`Disposable job fixture: ${createdTitle}`);

  try {
    await page.setViewportSize({ width: 320, height: 640 });
    await authenticate(page);
    await page.goto(`${mountPath}/jobs/create`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await expect(page.locator('h1')).toHaveText('Post an opportunity');
    await expect(page.locator('.govuk-caption-xl')).toContainText('Hour Timebank');
    await page.locator('#description').fill('Disposable Laravel job mutation fixture created by the Web UK runtime gate.');
    await page.locator('#type').selectOption('timebank');
    await page.locator('#commitment').selectOption('flexible');
    await page.locator('#location').fill('Preserved validation location');
    await page.locator('#status-draft').check();
    const createValidationResponse = await submitWithoutConstraintValidation(page, '/jobs', page.locator('form:has(#title)'));
    expect(createValidationResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    await expect(page.locator('.govuk-error-summary a[href="#title"]')).toHaveText('Enter a title for the opportunity.');
    await expect(page.locator('#description')).toHaveValue('Disposable Laravel job mutation fixture created by the Web UK runtime gate.');
    await expect(page.locator('#type')).toHaveValue('timebank');
    await expect(page.locator('#location')).toHaveValue('Preserved validation location');
    await expect(page.locator('#status-draft')).toBeChecked();

    await page.locator('#title').fill(createdTitle);
    await page.locator('#category').fill('Community support');
    await page.locator('#location').fill('Disposable test location');
    await page.locator('#is_remote').check();
    await page.locator('#skills_required').fill('testing, accessibility');
    await page.locator('#time_credits').fill('2');
    await page.locator('#status-draft').check();
    const createResponse = await submit(page, '/jobs', page.locator('form:has(#title) button[type="submit"]'));
    expect(createResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });

    const created = await findByTitle(token, createdTitle);
    expect(created).toBeTruthy();
    jobId = Number(created.id);
    expect(jobId).toBeGreaterThan(0);
    await expect(page.locator('h1')).toContainText(createdTitle);
    await expectAccessibleReflow(page);

    await page.goto(`${mountPath}/jobs/${jobId}/edit`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await page.locator('#title').fill('');
    await page.locator('#location').fill('Preserved invalid edit location');
    const editValidationResponse = await submitWithoutConstraintValidation(page, `/jobs/${jobId}/update`, page.locator('form:has(#title)'));
    expect(editValidationResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    await expect(page.locator('.govuk-error-summary a[href="#title"]')).toHaveText('Enter a title for the opportunity.');
    await expect(page.locator('#location')).toHaveValue('Preserved invalid edit location');

    await page.locator('#title').fill(updatedTitle);
    await page.locator('#commitment').selectOption('part_time');
    await page.locator('#location').fill('Updated disposable location');
    const editResponse = await submit(page, `/jobs/${jobId}/update`, page.locator('form:has(#title) button[type="submit"]'));
    expect(editResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    await expect(page.locator('h1')).toContainText(updatedTitle);
    const updated = objectFrom(await callJobApi(token, 'GET', `/${jobId}`));
    expect(updated.title).toBe(updatedTitle);
    expect(updated.commitment).toBe('part_time');
    expect(updated.location).toBe('Updated disposable location');
    await expectAccessibleReflow(page);

    await page.goto(`${mountPath}/jobs/mine`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    const card = page.locator('article', { hasText: updatedTitle });
    await expect(card).toHaveCount(1);
    const deleteResponse = await submit(page, `/jobs/${jobId}/delete`, card.locator('form[action$="/delete"] button[type="submit"]'));
    expect(deleteResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    expect(await findByTitle(token, updatedTitle)).toBeNull();
    deleted = true;
  } finally {
    if (!deleted && jobId) await callJobApi(token, 'DELETE', `/${jobId}`);
  }
});

test('certifies a disposable job alert lifecycle through Web UK', async ({ page }) => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const keywords = `Codex disposable alert ${runId}`;
  const auth = await login(smoke.email, smoke.password, smoke.tenant);
  const token = auth.access_token;
  let alertId = null;
  let deleted = false;

  expect(token).toBeTruthy();
  console.log(`Disposable job alert fixture: ${keywords}`);

  try {
    await page.setViewportSize({ width: 320, height: 640 });
    await authenticate(page);
    await page.goto(`${mountPath}/jobs/alerts`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await expect(page.locator('h1')).toHaveText('Job alerts');
    await expect(page.locator('.govuk-caption-xl')).toContainText('Hour Timebank');
    await page.locator('#keywords').fill(keywords);
    await page.locator('#categories').fill('Community support');
    await page.locator('#type').selectOption('timebank');
    await page.locator('#commitment').selectOption('flexible');
    await page.locator('#location').fill('Disposable test location');
    await page.locator('#is_remote_only').check();
    const createResponse = await submit(page, '/jobs/alerts', page.locator('form:has(#keywords) button[type="submit"]'));
    expect(createResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });

    let alert = await findAlert(token, keywords);
    expect(alert).toBeTruthy();
    alertId = Number(alert.id);
    expect(alertId).toBeGreaterThan(0);
    let card = page.locator('article', { hasText: keywords });
    await expect(card).toHaveCount(1);
    await expect(card.locator('.govuk-tag')).toHaveText('Active');
    await expectAccessibleReflow(page);

    const pauseResponse = await submit(page, `/jobs/alerts/${alertId}/pause`, card.locator('form[action$="/pause"] button'));
    expect(pauseResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    alert = await findAlert(token, keywords);
    expect(Boolean(alert.is_active ?? alert.isActive)).toBe(false);
    card = page.locator('article', { hasText: keywords });
    await expect(card.locator('.govuk-tag')).toHaveText('Paused');

    const resumeResponse = await submit(page, `/jobs/alerts/${alertId}/resume`, card.locator('form[action$="/resume"] button'));
    expect(resumeResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    alert = await findAlert(token, keywords);
    expect(Boolean(alert.is_active ?? alert.isActive)).toBe(true);
    card = page.locator('article', { hasText: keywords });
    const details = card.locator('details');
    await details.locator('summary').click();
    await expect(details).toContainText('Delete this alert?');
    const deleteResponse = await submit(page, `/jobs/alerts/${alertId}/delete`, details.locator('form[action$="/delete"] button'));
    expect(deleteResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    expect(await findAlert(token, keywords)).toBeNull();
    deleted = true;
  } finally {
    if (!deleted && alertId) await callJobApi(token, 'DELETE', `/alerts/${alertId}`);
  }
});

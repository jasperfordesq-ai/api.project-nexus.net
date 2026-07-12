// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { resolveOptions } = require('../../scripts/laravel-runtime-smoke');
const { deleteGroup, getGroup, getGroups, login } = require('../../src/lib/api');

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
  return data?.group && typeof data.group === 'object' ? data.group : data;
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

test('certifies a disposable private group and its owner-managed content through Web UK', async ({ page }) => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const createdName = `Codex disposable group ${runId}`;
  const updatedName = `${createdName} updated`;
  const fileName = `codex-disposable-${runId}.txt`;
  const fileBody = `Disposable group file ${runId}\n`;
  const announcementTitle = `Disposable announcement ${runId}`;
  const updatedAnnouncementTitle = `${announcementTitle} updated`;
  const discussionTitle = `Disposable discussion ${runId}`;
  const discussionReply = `Disposable discussion reply ${runId}`;
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
    await page.locator('#tags').fill('disposable, accessibility');
    await page.locator('input[name="visibility"][value="private"]').check();
    await page.locator('#cover').setInputFiles({
      name: 'disposable-group-cover.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ZQAAAABJRU5ErkJggg==', 'base64')
    });

    const createResponse = await submit(page, '/groups/new', page.locator('form:has(#name) button[type="submit"]'));
    expect(createResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });

    const created = await findByName(token, createdName);
    expect(created).toBeTruthy();
    groupId = Number(created.id);
    expect(groupId).toBeGreaterThan(0);
    expect(new URL(page.url()).pathname).toBe(`${mountPath}/groups/${groupId}`);
    await expect(page.locator('h1')).toContainText(createdName);
    await expect(page.locator('.govuk-caption-xl')).toContainText('Hour Timebank');
    await expect(page.locator('.govuk-summary-list')).toContainText('Visibility');
    await expect(page.locator(`a[href$="/groups/${groupId}/discussions"]`)).toHaveCount(1);
    await expect(page.locator(`a[href$="/groups/${groupId}/notifications"]`)).toHaveCount(1);
    await expect(page.locator(`a[href$="/groups/${groupId}/files"]`)).toHaveCount(1);
    await expect(page.locator(`a[href$="/groups/${groupId}/invite"]`)).toHaveCount(1);
    await expect(page.locator(`a[href$="/groups/${groupId}/image"]`)).toHaveCount(1);
    await expect(page.getByText('Created by', { exact: true })).toHaveCount(0);
    await expectAccessibleReflow(page);
    const createdDetail = objectFrom(await getGroup(token, groupId));
    expect(createdDetail.description).toContain('Tags (optional): disposable, accessibility');
    expect(createdDetail.cover_image_url || createdDetail.coverImageUrl || createdDetail.cover_image || createdDetail.cover_url).toBeTruthy();

    await page.goto(`${mountPath}/groups?q=${encodeURIComponent(createdName)}&filter=joined`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await expect(page.locator('h1')).toHaveText('Groups');
    await expect(page.locator(`a[href$="/groups/${groupId}"]`)).toContainText(createdName);
    await expect(page.locator('#filter')).toHaveValue('joined');
    await expectAccessibleReflow(page);

    await page.goto(`${mountPath}/groups/${groupId}/files`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await page.locator('#file-input').setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from(fileBody, 'utf8')
    });
    await page.locator('#file-folder').fill('Disposable fixtures');
    await page.locator('#file-description').fill('Temporary upload/download/delete certification fixture.');
    const fileUploadResponse = await submit(page, `/groups/${groupId}/files`, page.locator('form:has(#file-input) button[type="submit"]'));
    expect(fileUploadResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    const fileRow = page.locator('tr', { hasText: fileName });
    await expect(fileRow).toHaveCount(1);
    await expectAccessibleReflow(page);

    const downloadHref = await fileRow.locator('a[aria-label^="Download "]').getAttribute('href');
    expect(downloadHref).toBeTruthy();
    const downloadResponse = await page.context().request.get(downloadHref);
    expect(downloadResponse.status()).toBe(200);
    expect((await downloadResponse.body()).equals(Buffer.from(fileBody, 'utf8'))).toBe(true);

    const fileDeleteResponse = await submit(page, '/delete', fileRow.locator('form[action$="/delete"] button[type="submit"]'));
    expect(fileDeleteResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    await expect(page.getByText(fileName, { exact: true })).toHaveCount(0);

    await page.goto(`${mountPath}/groups/${groupId}/announcements`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await expect(page.locator('h1')).toHaveText('Announcements');
    await page.locator('#ann-title').fill(announcementTitle);
    await page.locator('#ann-content').fill('Disposable announcement content created through the Web UK owner workflow.');
    const announcementCreateResponse = await submit(page, `/groups/${groupId}/announcements`, page.locator('form:has(#ann-title) button[type="submit"]'));
    expect(announcementCreateResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    let announcementCard = page.locator('.govuk-summary-card', { hasText: announcementTitle });
    await expect(announcementCard).toHaveCount(1);
    await expect(announcementCard).toContainText('Disposable announcement content created through the Web UK owner workflow.');
    await expectAccessibleReflow(page);

    const announcementEditHref = await announcementCard.locator('a[href$="/edit"]').getAttribute('href');
    expect(announcementEditHref).toBeTruthy();
    const announcementId = Number(announcementEditHref.match(/\/announcements\/(\d+)\/edit$/)?.[1]);
    expect(announcementId).toBeGreaterThan(0);
    await page.goto(new URL(announcementEditHref, page.url()).toString(), { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await expect(page.locator('#edit-ann-title')).toHaveValue(announcementTitle);
    await page.locator('#edit-ann-title').fill(updatedAnnouncementTitle);
    await page.locator('#edit-ann-content').fill('Updated disposable announcement content.');
    const announcementUpdateResponse = await submit(page, `/groups/${groupId}/announcements/${announcementId}/edit`, page.locator('form:has(#edit-ann-title) button[type="submit"]'));
    expect(announcementUpdateResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    announcementCard = page.locator('.govuk-summary-card', { hasText: updatedAnnouncementTitle });
    await expect(announcementCard).toContainText('Updated disposable announcement content.');

    const announcementPinResponse = await submit(page, `/groups/${groupId}/announcements/${announcementId}/pin`, announcementCard.locator('form[action$="/pin"] button[type="submit"]'));
    expect(announcementPinResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    announcementCard = page.locator('.govuk-summary-card', { hasText: updatedAnnouncementTitle });
    await expect(announcementCard.locator('.govuk-tag')).toHaveText('Pinned');

    const announcementDeleteResponse = await submit(page, `/groups/${groupId}/announcements/${announcementId}/delete`, announcementCard.locator('form[action$="/delete"] button[type="submit"]'));
    expect(announcementDeleteResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    await expect(page.getByText(updatedAnnouncementTitle, { exact: true })).toHaveCount(0);

    await page.goto(`${mountPath}/groups/${groupId}/discussions/new`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await expect(page.locator('h1')).toHaveText('Start a discussion');
    await page.locator('#title').fill(discussionTitle);
    await page.locator('#content').fill('Disposable discussion content created through the Web UK member workflow.');
    const discussionCreateResponse = await submit(page, `/groups/${groupId}/discussions/new`, page.locator('form:has(#title) button'));
    expect(discussionCreateResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    const discussionId = Number(new URL(page.url()).pathname.match(/\/discussions\/(\d+)$/)?.[1]);
    expect(discussionId).toBeGreaterThan(0);
    await expect(page.locator('h1')).toHaveText(discussionTitle);
    await expect(page.getByText('Disposable discussion content created through the Web UK member workflow.', { exact: true })).toHaveCount(2);
    await expect(page.locator('#discussion-replies')).toHaveText('1 replies');
    await expectAccessibleReflow(page);

    await page.locator('#content').fill(discussionReply);
    const discussionReplyResponse = await submit(page, `/groups/${groupId}/discussions/${discussionId}/reply`, page.locator('form[action$="/reply"] button'));
    expect(discussionReplyResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    await expect(page.locator('#discussion-replies')).toHaveText('2 replies');
    await expect(page.getByText(discussionReply, { exact: true })).toHaveCount(1);

    await page.goto(`${mountPath}/groups/${groupId}/discussions`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    const discussionCard = page.locator('.nexus-alpha-card', { hasText: discussionTitle });
    await expect(discussionCard).toHaveCount(1);
    await expect(discussionCard).toContainText('2 replies');
    await expectAccessibleReflow(page);

    await page.goto(`${mountPath}/groups/${groupId}/notifications`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await expect(page.locator('h1')).toHaveText('Notification preferences');
    await page.locator('#frequency-digest').check();
    await page.locator('#email_enabled').uncheck();
    await page.locator('#push_enabled').check();
    const notificationResponse = await submit(page, `/groups/${groupId}/notifications`, page.locator('form:has(#frequency-instant) button'));
    expect(notificationResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });
    await expect(page.locator('#frequency-digest')).toBeChecked();
    await expect(page.locator('#email_enabled')).not.toBeChecked();
    await expect(page.locator('#push_enabled')).toBeChecked();
    await expectAccessibleReflow(page);

    await page.goto(`${mountPath}/groups/${groupId}/edit`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await expectAccessibleReflow(page);
    await page.locator('#name').fill(updatedName);
    await page.locator('#tags').fill('disposable, verified');
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

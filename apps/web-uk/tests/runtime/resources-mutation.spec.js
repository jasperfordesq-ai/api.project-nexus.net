// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const { test, expect } = require('@playwright/test');
const { resolveOptions } = require('../../scripts/laravel-runtime-smoke');
const {
  deleteResource,
  getResources,
  login
} = require('../../src/lib/api');

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

async function submitPost(page, button, pathnameSuffix) {
  const submission = await button.evaluate((element) => {
    const form = element.form;
    if (!form) throw new Error('Mutation button is not associated with a form.');
    return {
      action: form.action,
      fields: Object.fromEntries([...new FormData(form).entries()].filter(([, value]) => typeof value === 'string'))
    };
  });
  if (!new URL(submission.action).pathname.endsWith(pathnameSuffix)) {
    throw new Error(`Expected form action ending ${pathnameSuffix}, got ${submission.action}`);
  }
  return page.request.post(submission.action, {
    form: submission.fields,
    maxRedirects: 0,
    timeout: 300_000
  });
}

async function authenticate(page) {
  await page.goto(`${mountPath}/login`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
  await page.locator('input[name="email"]').fill(smoke.email);
  await page.locator('input[name="password"]').fill(smoke.password);
  const response = await submitPost(
    page,
    page.locator('form:has(input[name="password"]) button[type="submit"]'),
    '/login'
  );
  expect(response.status()).toBe(302);
}

async function findByTitle(token, title) {
  const result = await getResources(token, { search: title, per_page: 50 });
  return rowsFrom(result).find((resource) => resource?.title === title) || null;
}

test('uploads, downloads, and deletes a disposable resource through Web UK', async ({ page }) => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const title = `Codex disposable resource ${runId}`;
  const contents = `Disposable Laravel resource fixture ${runId}\n`;
  const auth = await login(smoke.email, smoke.password, smoke.tenant);
  const token = auth.access_token;
  let resourceId = null;
  let deleted = false;

  expect(token).toBeTruthy();
  console.log(`Disposable resource fixture: ${title}`);

  try {
    await authenticate(page);
    await page.goto(`${mountPath}/resources/upload`, {
      waitUntil: 'domcontentloaded',
      timeout: 300_000
    });
    await page.locator('#title').fill(title);
    await page.locator('#description').fill('Disposable upload, download, and delete smoke fixture.');
    await page.locator('#file').setInputFiles({
      name: `codex-resource-${runId}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from(contents)
    });

    const uploadResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'POST' && url.pathname.endsWith('/resources/upload');
    }, { timeout: 300_000 });
    await page.getByRole('button', { name: 'Upload resource', exact: true }).click();
    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.status()).toBe(302);
    await page.waitForLoadState('domcontentloaded', { timeout: 300_000 });

    const created = await findByTitle(token, title);
    expect(created).toBeTruthy();
    resourceId = Number(created.id);
    expect(resourceId).toBeGreaterThan(0);

    await page.goto(`${mountPath}/resources/library?q=${encodeURIComponent(title)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 300_000
    });
    const card = page.locator(`#resource-${resourceId}`);
    await expect(card.getByRole('heading', { name: title, exact: true })).toBeVisible();

    const downloadHref = await card.getByRole('link', { name: `Download ${title}`, exact: true }).getAttribute('href');
    expect(downloadHref).toBeTruthy();
    const downloadResponse = await page.request.get(new URL(downloadHref, page.url()).toString(), {
      timeout: 300_000
    });
    expect(downloadResponse.status()).toBe(200);
    expect(downloadResponse.headers()['content-disposition']).toContain('attachment');
    expect((await downloadResponse.body()).toString('utf8')).toBe(contents);

    await page.goto(`${mountPath}/resources/${resourceId}/delete`, {
      waitUntil: 'domcontentloaded',
      timeout: 300_000
    });
    await expect(page.locator('h1')).toContainText('Delete resource');
    const deleteResponse = await submitPost(
      page,
      page.getByRole('button', { name: 'Delete resource', exact: true }),
      `/resources/${resourceId}/delete`
    );
    expect(deleteResponse.status()).toBe(302);

    expect(await findByTitle(token, title)).toBeNull();
    deleted = true;
  } finally {
    if (!deleted) {
      const existing = await findByTitle(token, title);
      if (existing) await deleteResource(token, existing.id);
    }
  }
});

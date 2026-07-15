// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const path = require('node:path');
const {
  DEFAULT_SCREENSHOT_ROUTES,
  DEFAULT_SCREENSHOT_VIEWPORTS,
  assertCanonicalRoute,
  assertSafeBaseUrl,
  joinUrl,
  resolveCaptureOptions,
  sanitizeSegment
} = require('../scripts/capture-blade-web-screenshots');

describe('paired Laravel Blade and Web UK screenshot capture', () => {
  it('uses a bounded default-English representative route and viewport set', () => {
    expect(DEFAULT_SCREENSHOT_ROUTES).toEqual([
      { name: 'home', path: '/hour-timebank/accessible' },
      { name: 'login', path: '/hour-timebank/accessible/login' },
      { name: 'register', path: '/hour-timebank/accessible/register' },
      { name: 'contact', path: '/hour-timebank/accessible/contact' },
      { name: 'accessibility', path: '/hour-timebank/accessible/accessibility' },
      { name: 'legal', path: '/hour-timebank/accessible/legal' }
    ]);
    expect(DEFAULT_SCREENSHOT_VIEWPORTS).toEqual([
      { name: 'desktop', width: 1280, height: 800 },
      { name: 'reflow-320', width: 320, height: 800, requireNoOverflow: true }
    ]);
  });

  it('resolves distinct surface URLs and an ignored artifact directory', () => {
    const options = resolveCaptureOptions({
      laravelBaseUrl: 'http://127.0.0.1:8088/',
      webBaseUrl: 'http://127.0.0.1:5180/',
      snapshotId: 'laravel-sha__web-sha',
      disposableLaravelConfirmed: true
    }, {});

    expect(options.laravelBaseUrl).toBe('http://127.0.0.1:8088');
    expect(options.webBaseUrl).toBe('http://127.0.0.1:5180');
    expect(options.outputDirectory).toBe(path.resolve(
      __dirname,
      '../artifacts/visual-comparison/laravel-sha__web-sha'
    ));
    expect(options.routes).toHaveLength(6);
    expect(options.viewports).toHaveLength(2);
  });

  it('requires both explicit comparison surfaces', () => {
    expect(() => resolveCaptureOptions({}, {})).toThrow(
      'Set LARAVEL_BLADE_BASE_URL and WEB_UK_BASE_URL'
    );
  });

  it('fails closed until the operator confirms a disposable Laravel environment', () => {
    expect(() => resolveCaptureOptions({
      laravelBaseUrl: 'http://127.0.0.1:8088',
      webBaseUrl: 'http://127.0.0.1:5180'
    }, {})).toThrow('Set DISPOSABLE_LARAVEL_CONFIRMED=1');
  });

  it('rejects legacy alpha mounts, credentials, and non-canonical routes', () => {
    expect(() => assertSafeBaseUrl(
      'http://127.0.0.1:8088/hour-timebank/alpha',
      'LARAVEL_BLADE_BASE_URL'
    )).toThrow('must not use the legacy /alpha mount');
    expect(() => assertSafeBaseUrl('http://user:secret@example.test', 'WEB_UK_BASE_URL'))
      .toThrow('must not contain credentials');
    expect(() => assertCanonicalRoute({ name: 'wrong', path: '/hour-timebank/alpha' }))
      .toThrow('must use /hour-timebank/accessible');
  });

  it('builds canonical URLs and filesystem-safe artifact names', () => {
    expect(joinUrl(
      'http://127.0.0.1:5180/',
      '/hour-timebank/accessible/login'
    )).toBe('http://127.0.0.1:5180/hour-timebank/accessible/login');
    expect(sanitizeSegment('Laravel 903d / Web UK 2fb9')).toBe('Laravel-903d-Web-UK-2fb9');
  });

  it('rejects duplicate artifact names and invalid timeouts', () => {
    const baseOptions = {
      laravelBaseUrl: 'http://laravel.test',
      webBaseUrl: 'http://web.test',
      disposableLaravelConfirmed: true
    };
    expect(() => resolveCaptureOptions({
      ...baseOptions,
      routes: [
        { name: 'home', path: '/hour-timebank/accessible' },
        { name: 'home', path: '/hour-timebank/accessible/login' }
      ]
    }, {})).toThrow('Screenshot route names must be unique');
    expect(() => resolveCaptureOptions({ ...baseOptions, timeoutMs: -1 }, {}))
      .toThrow('VISUAL_SCREENSHOT_TIMEOUT_MS must be a positive integer');
  });
});

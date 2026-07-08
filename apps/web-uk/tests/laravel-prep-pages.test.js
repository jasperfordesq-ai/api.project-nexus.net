// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

describe('laravel prep pages route loader', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('fs');
  });

  it('does not crash the frontend when the generated route matrix is missing', () => {
    jest.doMock('fs', () => ({
      existsSync: jest.fn(() => false),
      readFileSync: jest.fn()
    }));

    expect(() => require('../src/routes/laravel-prep-pages')).not.toThrow();

    const prepRoutes = require('../src/routes/laravel-prep-pages');
    expect(prepRoutes.prepPages).toEqual([]);
  });
});

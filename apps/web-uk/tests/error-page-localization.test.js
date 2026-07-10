// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const fs = require('fs');
const nunjucks = require('nunjucks');
const path = require('path');

const {
  SUPPORTED_LOCALES,
  catalogFor,
  createTranslator,
  translate,
  valueInCatalog
} = require('../src/lib/localization');

const viewsDirectory = path.join(__dirname, '..', 'src', 'views');
const govukViewsDirectory = path.join(__dirname, '..', 'node_modules', 'govuk-frontend', 'dist');
const templateEnvironment = nunjucks.configure([viewsDirectory, govukViewsDirectory], {
  autoescape: true,
  noCache: true
});
const errorTemplates = [
  'errors/403.njk',
  'errors/404.njk',
  'errors/429.njk',
  'errors/500.njk',
  'errors/503.njk',
  'error.njk'
];

function templateSource(name) {
  return fs.readFileSync(path.join(viewsDirectory, name), 'utf8');
}

function renderErrorTemplate(name, locale, overrides = {}) {
  return templateEnvironment.render(name, {
    errorDetails: null,
    heading: 'Safe dynamic heading',
    htmlDirection: locale === 'ar' ? 'rtl' : 'ltr',
    htmlLang: locale,
    message: 'Safe dynamic message',
    retryAfter: null,
    serviceName: 'Project NEXUS',
    t: createTranslator(locale),
    title: 'Error',
    urlFor: (pathname) => `/acme/accessible${pathname === '/' ? '' : pathname}`,
    ...overrides
  });
}

describe('Laravel-first error-page localization', () => {
  it('delegates the generic home action to the authoritative Laravel key', () => {
    for (const templateName of errorTemplates) {
      const source = templateSource(templateName);
      expect(source).toContain('t("nav.home")');
      expect(source).not.toContain('>Go to the home page</a>');
    }
  });

  it('has a direct nav.home catalog value in all 11 Laravel locales', () => {
      const translationKey = 'nav.home';
      expect(SUPPORTED_LOCALES).toHaveLength(11);
      for (const locale of SUPPORTED_LOCALES) {
        const directValue = valueInCatalog(catalogFor(locale), translationKey);
        expect(typeof directValue).toBe('string');
        expect(directValue).not.toBe('');
        expect(translate(locale, translationKey)).toBe(directValue);
      }
  });

  it.each(['ga', 'ar', 'de'])(
    'renders the mapped Laravel copy for %s without changing error semantics',
    (locale) => {
      const t = createTranslator(locale);
      for (const templateName of errorTemplates) {
        const html = renderErrorTemplate(templateName, locale);

        expect(html).toContain(`<html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`);
        expect(html).toContain(`>${t('nav.home')}</a>`);
        expect((html.match(/<main\b/g) || [])).toHaveLength(1);
        expect((html.match(/id="main-content"/g) || [])).toHaveLength(1);
      }

      const serverErrorHtml = renderErrorTemplate('errors/500.njk', locale);
      expect(serverErrorHtml).toContain('<h1 class="govuk-heading-xl">Sorry, there is a problem with the service</h1>');
      expect(serverErrorHtml).toContain('Try again later.');
    }
  );

  it('preserves safe dynamic headings and messages verbatim', () => {
    const genericHtml = renderErrorTemplate('error.njk', 'ga', {
      heading: 'Account access paused',
      message: 'Contact your community administrator.'
    });
    const forbiddenHtml = renderErrorTemplate('errors/403.njk', 'ar', {
      message: 'Signed-in access is required.'
    });

    expect(genericHtml).toContain('Account access paused');
    expect(genericHtml).toContain('Contact your community administrator.');
    expect(forbiddenHtml).toContain('Signed-in access is required.');
  });
});

// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

'use strict';

const fs = require('fs');
const nunjucks = require('nunjucks');
const path = require('path');

const {
  createChoiceTranslator,
  createTranslator
} = require('../src/lib/localization');

const viewsDirectory = path.join(__dirname, '..', 'src', 'views');
const govukViewsDirectory = path.join(__dirname, '..', 'node_modules', 'govuk-frontend', 'dist');
const templateEnvironment = nunjucks.configure([viewsDirectory, govukViewsDirectory], {
  autoescape: true,
  noCache: true
});

templateEnvironment.addFilter('nl2br', (value) => value);
templateEnvironment.addFilter('string', String);
templateEnvironment.addFilter('urlencode', encodeURIComponent);

function templateSource(name) {
  return fs.readFileSync(path.join(viewsDirectory, name), 'utf8');
}

function baseContext(locale) {
  return {
    alphaFooterColumns: [],
    alphaNavItems: [],
    csrfToken: 'test-csrf',
    feedbackUrl: '#',
    isAuthenticated: false,
    serviceName: 'Project NEXUS',
    t: createTranslator(locale),
    tc: createChoiceTranslator(locale),
    tenantName: 'Test community',
    title: 'Test page',
    urlFor: (pathname) => pathname
  };
}

function renderAdvancedSearch(locale) {
  return templateEnvironment.render('search/advanced.njk', {
    ...baseContext(locale),
    activeFilterCount: 0,
    communityName: 'Test community',
    counts: {},
    filters: {
      category_id: '0',
      date_from: '',
      date_to: '',
      location: '',
      skills: '',
      sort: 'relevance',
      type: 'all'
    },
    grouped: { events: [], groups: [], listings: [], users: [] },
    hasSearched: false,
    savedSearches: [{ id: 7, name: 'Care & <support>', query: 'care' }],
    searchError: false,
    searchQuery: '',
    skillsList: [],
    status: ''
  });
}

function renderCollection(locale) {
  return templateEnvironment.render('saved-collections/detail.njk', {
    ...baseContext(locale),
    collection: {
      color: '#1d70b8',
      countLabel: '1 item',
      description: '',
      id: 4,
      isPublic: false,
      name: 'Care & <support>',
      visibilityLabel: 'Private'
    },
    currentPage: 1,
    errorMessage: 'Enter a collection name',
    isOwner: true,
    items: [{ id: 9, note: '', title: 'Tea & <chat>', typeLabel: 'Listing' }],
    lastPage: 2,
    status: 'collection-name-required',
    successMessage: '',
    tenant: { name: 'Test community' }
  });
}

function renderNetwork(locale) {
  const emptySection = { items: [] };
  return templateEnvironment.render('connections/network.njk', {
    ...baseContext(locale),
    activeTab: 'accepted',
    communityName: 'Test community',
    connSearch: '',
    counts: { received: 0, sent: 0, total_friends: 1 },
    hasSearch: false,
    loadMoreHrefs: { accepted: '/connections/network?cursor=next' },
    sections: {
      accepted: {
        items: [{ bio: 'Offers practical help', name: 'Amina', profileHref: '/members/1' }]
      },
      pending_received: emptySection,
      pending_sent: emptySection
    },
    status: '',
    tabHrefs: {
      accepted: '/connections/network?tab=accepted',
      pending_received: '/connections/network?tab=pending_received',
      pending_sent: '/connections/network?tab=pending_sent'
    }
  });
}

function renderCourse(locale) {
  return templateEnvironment.render('courses/learn.njk', {
    ...baseContext(locale),
    course: { id: 3, title: 'First aid' },
    currentLesson: null,
    isCompleted: false,
    progressPercent: 42,
    sections: [],
    status: null
  });
}

describe('localized accessible chrome', () => {
  it('delegates dynamic labels and hidden prefixes to exact Laravel keys', () => {
    const search = templateSource('search/advanced.njk');
    const collection = templateSource('saved-collections/detail.njk');
    const network = templateSource('connections/network.njk');
    const course = templateSource('courses/learn.njk');

    expect(search).toContain("t('govuk_alpha_search.saved.run_aria', { name: saved.name })");
    expect(search).toContain("t('govuk_alpha_search.saved.delete_aria', { name: saved.name })");
    expect(search).not.toContain('aria-label="Run saved search {{ saved.name }}"');

    expect(collection).toContain("t('govuk_alpha_saved.detail.remove_item_label', { title: item.title })");
    expect(collection).toContain("t('govuk_alpha_saved.pagination.page_of', { current: currentPage, last: lastPage })");
    expect(collection).toContain("t('govuk_alpha_saved.edit.delete_confirm_label', { name: collection.name })");
    expect(collection).not.toContain('There is a problem:</span>');

    expect(network).toContain('t("govuk_alpha_connections.network.about", { name: connection.name })');
    expect(network.match(/govuk_alpha_connections\.network\.load_more_sr/g)).toHaveLength(3);
    expect(network).not.toContain('>About {{ connection.name }}: </span>');

    expect(course.match(/govuk_alpha_commerce\.learn\.progress_label/g)).toHaveLength(2);
    expect(course).not.toContain('aria-label="Course progress: {{ progressPercent }}% complete"');
  });

  it.each(['ga', 'ar'])('renders safe interpolated labels and available native %s copy', (locale) => {
    const english = createTranslator('en');
    const t = createTranslator(locale);
    const search = renderAdvancedSearch(locale);
    const collection = renderCollection(locale);
    const network = renderNetwork(locale);
    const course = renderCourse(locale);

    for (const key of ['states.error_title', 'notifications.load_more']) {
      expect(t(key)).not.toBe(english(key));
    }

    expect(search).toContain('aria-label="Run saved search Care &amp; &lt;support&gt;"');
    expect(search).toContain('aria-label="Delete saved search Care &amp; &lt;support&gt;"');
    expect(collection).toContain('aria-label="Remove Tea &amp; &lt;chat&gt; from this collection"');
    expect(collection).toContain('aria-label="Delete the collection Care &amp; &lt;support&gt;"');
    expect(collection).toContain(`<span class="govuk-visually-hidden">${t('states.error_title')}:</span>`);
    expect(network).toContain(`${t('govuk_alpha_connections.network.about', { name: 'Amina' })}: </span>`);
    expect(network).toContain(t('notifications.load_more'));
    expect(course).toContain('aria-label="Course progress: 42% complete"');
    expect(search).not.toContain('<support>');
    expect(collection).not.toContain('<chat>');
  });
});

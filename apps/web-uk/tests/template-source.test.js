const fs = require('fs');
const path = require('path');

describe('tenant-aware template helper conversion', () => {
  it('keeps event detail local links and forms behind urlFor()', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'events', 'detail.njk'),
      'utf8'
    );

    expect(template).not.toMatch(/href=['"]\/(?:events|groups|members)\//);
    expect(template).not.toMatch(/action=['"]\/events\//);
    expect(template).not.toContain('href: "/events/"');
    expect(template).toContain('urlFor(');
  });

  it('keeps event index and form controls behind urlFor()', () => {
    const templates = [
      path.join('events', 'index.njk'),
      path.join('events', 'new.njk'),
      path.join('events', 'edit.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:events|groups)/);
      expect(template).not.toMatch(/action="\/events/);
      expect(template).not.toContain('href: "/events');
    }

    const source = templates.join('\n');
    expect(source).toMatch(/urlFor\(["']\/events/);
    expect(source).toMatch(/urlFor\(["']\/groups/);
  });

  it('keeps account hub links and logout form behind urlFor()', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'account.njk'),
      'utf8'
    );

    expect(template).toContain('href="{{ urlFor(item.href) }}"');
    expect(template).toContain('action="{{ urlFor(\'/logout\') }}"');
    expect(template).not.toContain('href="{{ item.href }}"');
    expect(template).not.toContain('action="/logout"');
  });

  it('keeps activity dashboard and insights links behind urlFor()', () => {
    const dashboardTemplate = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'activity', 'index.njk'),
      'utf8'
    );
    const insightsTemplate = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'activity', 'insights.njk'),
      'utf8'
    );

    expect(dashboardTemplate).toContain('href="{{ urlFor(\'/activity/insights\') }}"');
    expect(dashboardTemplate).not.toContain('href="/activity/insights"');
    expect(insightsTemplate).toContain('href="{{ urlFor(\'/activity\') }}"');
    expect(insightsTemplate).not.toContain('href="/activity"');
  });

  it('keeps achievements navigation and forms behind urlFor()', () => {
    const templates = [
      'index.njk',
      'shop.njk',
      'collections.njk',
      'engagement.njk',
      'showcase.njk',
      'badge.njk'
    ].map((file) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'achievements', file),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/achievements/);
      expect(template).not.toMatch(/action="\/achievements/);
    }

    expect(templates.join('\n')).toContain("urlFor('/achievements");
  });

  it('keeps leaderboard and NEXUS score links and forms behind urlFor()', () => {
    const leaderboardTemplates = [
      'index.njk',
      'competitive.njk',
      'seasons.njk',
      'journey.njk',
      'spotlight.njk'
    ].map((file) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'leaderboard', file),
      'utf8'
    ));
    const nexusScoreTemplates = [
      'index.njk',
      'tiers.njk'
    ].map((file) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'nexus-score', file),
      'utf8'
    ));
    const templates = [...leaderboardTemplates, ...nexusScoreTemplates];

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:leaderboard|nexus-score|members)/);
      expect(template).not.toMatch(/action="\/(?:leaderboard|nexus-score)/);
    }

    expect(templates.join('\n')).not.toContain('href="{{ row.href }}"');
    expect(templates.join('\n')).not.toContain('href="{{ member.href }}"');
    expect(templates.join('\n')).toContain("urlFor('/leaderboard");
    expect(templates.join('\n')).toContain("urlFor('/nexus-score");
  });

  it('keeps profile and settings links and forms behind urlFor()', () => {
    const profileTemplates = [
      'index.njk',
      'settings.njk',
      'two-factor.njk',
      'blocked.njk',
      'delete.njk'
    ].map((file) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'profile', file),
      'utf8'
    ));
    const settingsTemplates = [
      'appearance.njk',
      'availability.njk',
      'data-rights.njk',
      'insurance.njk',
      'linked-accounts.njk'
    ].map((file) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'settings', file),
      'utf8'
    ));
    const templates = [...profileTemplates, ...settingsTemplates];

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:profile|settings|account|dashboard|achievements|leaderboard)/);
      expect(template).not.toMatch(/action="\/(?:profile|settings|members)/);
      expect(template).not.toContain('href: "/profile');
    }

    expect(templates.join('\n')).not.toContain('href="{{ item.href }}"');
    expect(templates.join('\n')).toContain("urlFor('/profile");
    expect(templates.join('\n')).toContain("urlFor('/settings");
  });

  it('keeps group, listing, member detail, and report links behind urlFor()', () => {
    const templates = [
      path.join('groups', 'detail.njk'),
      path.join('listings', 'detail.njk'),
      path.join('members', 'profile.njk'),
      path.join('partials', 'report-link.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:groups|listings|members|events|messages|report-a-problem)/);
      expect(template).not.toMatch(/action="\/(?:groups|listings|members|connections)/);
      expect(template).not.toMatch(/href:\s*"\/(?:groups|listings|members)/);
      expect(template).not.toMatch(/returnTo\s*=\s*"\/(?:groups|listings|members)/);
      expect(template).not.toMatch(/value="\/members\//);
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/groups/);
    expect(templates.join('\n')).toMatch(/urlFor\(["']\/listings/);
    expect(templates.join('\n')).toMatch(/urlFor\(["']\/members/);
    expect(templates.join('\n')).toMatch(/urlFor\(["']\/report-a-problem/);
  });

  it('keeps group index and form controls behind urlFor()', () => {
    const templates = [
      path.join('groups', 'index.njk'),
      path.join('groups', 'new.njk'),
      path.join('groups', 'edit.njk'),
      path.join('groups', 'my.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/groups/);
      expect(template).not.toMatch(/action="\/groups/);
      expect(template).not.toContain('href: "/groups');
      expect(template).not.toContain('baseUrl: "/groups"');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/groups/);
  });

  it('keeps resource browse, library, upload, delete, and discussion controls behind urlFor()', () => {
    const templates = [
      path.join('resources', 'index.njk'),
      path.join('resources', 'library.njk'),
      path.join('resources', 'upload.njk'),
      path.join('resources', 'delete.njk'),
      path.join('resources', 'comments.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/resources/);
      expect(template).not.toMatch(/action="\/resources/);
      expect(template).not.toContain('href: "/resources');
      expect(template).not.toContain('baseUrl: "/resources');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/resources/);
  });

  it('keeps search forms, tabs, result links, and saved-search controls behind urlFor()', () => {
    const templates = [
      path.join('search', 'index.njk'),
      path.join('search', 'advanced.njk'),
      path.join('search', 'saved-delete.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:search|listings|members|events|groups)/);
      expect(template).not.toMatch(/action="\/search/);
      expect(template).not.toContain('href: "/search');
      expect(template).not.toContain('href: "/listings"');
      expect(template).not.toContain('baseUrl: "/search"');
      expect(template).not.toContain('href="{{ tabHrefs.');
    }

    const source = templates.join('\n');
    expect(source).toMatch(/urlFor\(["']\/search/);
    expect(source).toMatch(/urlFor\(["']\/listings/);
    expect(source).toMatch(/urlFor\(["']\/members/);
    expect(source).toMatch(/urlFor\(["']\/events/);
    expect(source).toMatch(/urlFor\(["']\/groups/);
  });

  it('keeps saved-item, collection, and appreciation controls behind urlFor()', () => {
    const templates = [
      path.join('saved', 'index.njk'),
      path.join('saved-collections', 'index.njk'),
      path.join('saved-collections', 'detail.njk'),
      path.join('saved-social', 'appreciations.njk'),
      path.join('saved-social', 'public-collections.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:saved|me\/collections|members|users)/);
      expect(template).not.toMatch(/action="\/(?:saved|me\/collections|users|appreciations)/);
      expect(template).not.toContain('href="{{ item.href }}"');
    }

    const source = templates.join('\n');
    expect(source).toMatch(/urlFor\(["']\/saved/);
    expect(source).toMatch(/urlFor\(["']\/me\/collections/);
    expect(source).toMatch(/urlFor\(["']\/members/);
    expect(source).toMatch(/urlFor\(["']\/users/);
    expect(source).toMatch(/urlFor\(["']\/appreciations/);
  });

  it('keeps listing index and form controls behind urlFor()', () => {
    const templates = [
      path.join('listings', 'index.njk'),
      path.join('listings', 'form.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/listings/);
      expect(template).not.toMatch(/action="\/listings/);
      expect(template).not.toContain('href: "/listings');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/listings/);
  });

  it('keeps marketplace offer and management controls behind urlFor()', () => {
    const templates = [
      path.join('marketplace', 'offers.njk'),
      path.join('marketplace', 'manage.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/marketplace/);
      expect(template).not.toMatch(/action="\/marketplace/);
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/marketplace/);
  });

  it('keeps marketplace browse, detail, and buyer action controls behind urlFor()', () => {
    const templates = [
      path.join('marketplace', '_listing-card.njk'),
      path.join('marketplace', '_nav.njk'),
      path.join('marketplace', 'buy.njk'),
      path.join('marketplace', 'detail.njk'),
      path.join('marketplace', 'form.njk'),
      path.join('marketplace', 'index.njk'),
      path.join('marketplace', 'listing-list.njk'),
      path.join('marketplace', 'offer.njk'),
      path.join('marketplace', 'onboarding.njk'),
      path.join('marketplace', 'report.njk'),
      path.join('marketplace', 'search.njk'),
      path.join('marketplace', 'seller.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/marketplace/);
      expect(template).not.toMatch(/action="\/marketplace/);
      expect(template).not.toContain('href="{{ item.href }}"');
      expect(template).not.toContain('href="{{ category.href }}"');
      expect(template).not.toContain('href="{{ backHref }}"');
      expect(template).not.toContain('action="{{ action }}"');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/marketplace/);
  });

  it('keeps marketplace coupons, orders, and pickup slots behind urlFor()', () => {
    const templates = [
      path.join('marketplace', '_slot-form.njk'),
      path.join('marketplace', 'coupon-form.njk'),
      path.join('marketplace', 'coupons.njk'),
      path.join('marketplace', 'orders.njk'),
      path.join('marketplace', 'slot-form.njk'),
      path.join('marketplace', 'slots.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/marketplace/);
      expect(template).not.toMatch(/action="\/marketplace/);
      expect(template).not.toContain('action="{{ action }}"');
      expect(template).not.toContain('href="{{ tabItem.href }}"');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/marketplace/);
  });

  it('keeps federation member navigation and actions behind urlFor()', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'federation', 'member.njk'),
      'utf8'
    );

    expect(template).not.toMatch(/href="\/federation/);
    expect(template).not.toMatch(/action="\/federation/);
    expect(template).toMatch(/urlFor\(["']\/federation/);
  });

  it('keeps connections navigation, member links, forms, and pagination behind urlFor()', () => {
    const templates = [
      path.join('connections', 'index.njk'),
      path.join('connections', 'network.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:connections|members)/);
      expect(template).not.toMatch(/action="\/connections/);
      expect(template).not.toContain('baseUrl: "/connections"');
    }

    expect(templates.join('\n')).not.toContain('href="{{ tabHrefs.accepted }}"');
    expect(templates.join('\n')).not.toContain('href="{{ connection.messageHref }}"');
    expect(templates.join('\n')).not.toContain('href="{{ connection.profileHref }}"');
    expect(templates.join('\n')).not.toContain('action="{{ connection.removeAction }}"');
    expect(templates.join('\n')).not.toContain('action="{{ connection.acceptAction }}"');
    expect(templates.join('\n')).not.toContain('action="{{ connection.declineAction }}"');
    expect(templates.join('\n')).toMatch(/urlFor\(["']\/connections/);
    expect(templates.join('\n')).toMatch(/urlFor\(["']\/members/);
  });

  it('keeps notifications filters, actions, redirects, and pagination behind urlFor()', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'notifications', 'index.njk'),
      'utf8'
    );

    expect(template).not.toMatch(/href="\/notifications/);
    expect(template).not.toMatch(/action="\/notifications/);
    expect(template).not.toContain('baseUrl: "/notifications"');
    expect(template).not.toContain('value="{{ notificationLink }}"');
    expect(template).not.toContain('href: "/notifications"');
    expect(template).toMatch(/urlFor\(["']\/notifications/);
    expect(template).toContain('value="{{ urlFor(notificationLink) }}"');
  });

  it('keeps group exchange tabs, links, and forms behind urlFor()', () => {
    const templates = [
      path.join('group-exchanges', 'index.njk'),
      path.join('group-exchanges', 'create.njk'),
      path.join('group-exchanges', 'detail.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/group-exchanges/);
      expect(template).not.toMatch(/action="\/group-exchanges/);
      expect(template).not.toContain('href: "/group-exchanges');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/group-exchanges/);
    expect(templates.join('\n')).not.toContain('href="{{ tab.href }}"');
  });

  it('keeps direct and group message links and forms behind urlFor()', () => {
    const templates = [
      path.join('messages', 'index.njk'),
      path.join('messages', 'conversation.njk'),
      path.join('messages', 'direct-conversation.njk'),
      path.join('messages', 'groups.njk'),
      path.join('messages', 'group-create.njk'),
      path.join('messages', 'group-conversation.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:messages|members|connections|listings)/);
      expect(template).not.toMatch(/action="\/messages/);
      expect(template).not.toMatch(/href:\s*"\/(?:members|connections|messages)/);
    }

    const source = templates.join('\n');
    expect(source).not.toContain('href="{{ olderHref }}"');
    expect(source).toMatch(/urlFor\(["']\/messages/);
    expect(source).toMatch(/urlFor\(["']\/members/);
    expect(source).toMatch(/urlFor\(["']\/connections/);
    expect(source).toMatch(/urlFor\(["']\/listings/);
  });

  it('keeps wallet links and forms behind urlFor()', () => {
    const templates = [
      path.join('wallet', 'index.njk'),
      path.join('wallet', 'manage.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/wallet/);
      expect(template).not.toMatch(/action="\/wallet/);
      expect(template).not.toContain('href: "/wallet');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/wallet/);
  });

  it('keeps public auth and support links and forms behind urlFor()', () => {
    const templates = [
      'contact.njk',
      'cookie-settings.njk',
      'forgot-password.njk',
      'login.njk',
      'register.njk',
      'report-problem.njk',
      'reset-password.njk'
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:contact|cookies|legal|login|password|register|report-a-problem)/);
      expect(template).not.toMatch(/action="\/(?:contact|cookie-consent|login|password|register|report-a-problem)/);
      expect(template).not.toContain('action="{{ formAction');
    }

    const source = templates.join('\n');
    expect(source).toMatch(/urlFor\(["']\/login/);
    expect(source).toMatch(/urlFor\(["']\/register/);
    expect(source).toMatch(/urlFor\(["']\/contact/);
    expect(source).toMatch(/urlFor\(["']\/report-a-problem/);
  });

  it('keeps organisation directory and application controls behind urlFor()', () => {
    const templates = [
      'organisation-detail.njk',
      'organisations.njk',
      'organisations-apply.njk',
      'organisations-browse.njk',
      'organisations-jobs.njk',
      'organisations-manage.njk',
      'organisations-register.njk'
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:organisations|volunteering|jobs|login)/);
      expect(template).not.toMatch(/action="\/(?:organisations|volunteering)/);
      expect(template).not.toContain('href="{{ loadMoreHref }}"');
    }

    const source = templates.join('\n');
    expect(source).toMatch(/urlFor\(["']\/organisations/);
    expect(source).toMatch(/urlFor\(["']\/volunteering/);
    expect(source).toMatch(/urlFor\(["']\/jobs/);
  });

  it('keeps jobs browse, saved, application, owner, and employer controls behind urlFor()', () => {
    const templates = [
      path.join('jobs', 'alerts.njk'),
      path.join('jobs', 'analytics.njk'),
      path.join('jobs', 'applicants.njk'),
      path.join('jobs', 'application-history.njk'),
      path.join('jobs', 'applications.njk'),
      path.join('jobs', 'bias-audit.njk'),
      path.join('jobs', 'detail.njk'),
      path.join('jobs', 'employer-brand.njk'),
      path.join('jobs', 'form.njk'),
      path.join('jobs', 'index.njk'),
      path.join('jobs', 'mine.njk'),
      path.join('jobs', 'onboarding.njk'),
      path.join('jobs', 'pipeline.njk'),
      path.join('jobs', 'qualification.njk'),
      path.join('jobs', 'responses.njk'),
      path.join('jobs', 'saved.njk'),
      path.join('jobs', 'talent-profile.njk'),
      path.join('jobs', 'talent-search.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/jobs/);
      expect(template).not.toMatch(/action="\/jobs/);
      expect(template).not.toContain('href="{{ nextHref }}"');
      expect(template).not.toContain('href="{{ meta.nextHref }}"');
      expect(template).not.toContain('action="{{ formAction }}"');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/jobs/);
  });

  it('keeps blog index, detail, comments, and reaction controls behind urlFor()', () => {
    const templates = [
      path.join('blog', 'index.njk'),
      path.join('blog', 'detail.njk'),
      path.join('blog', 'comments.njk'),
      path.join('blog', 'likers.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:blog|members)/);
      expect(template).not.toMatch(/action="\/blog/);
    }

    const source = templates.join('\n');
    expect(source).toMatch(/urlFor\(["']\/blog/);
    expect(source).toMatch(/urlFor\(["']\/members/);
  });

  it('keeps course browse, learner, and instructor controls behind urlFor()', () => {
    const templates = [
      path.join('courses', '_nav.njk'),
      path.join('courses', 'analytics.njk'),
      path.join('courses', 'detail.njk'),
      path.join('courses', 'form.njk'),
      path.join('courses', 'grading.njk'),
      path.join('courses', 'index.njk'),
      path.join('courses', 'instructor.njk'),
      path.join('courses', 'learn.njk'),
      path.join('courses', 'my-learning.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/courses/);
      expect(template).not.toMatch(/action="\/courses/);
      expect(template).not.toContain('action="{{ formAction }}"');
    }

    const source = templates.join('\n');
    expect(source).toMatch(/urlFor\(["']\/courses/);
  });
});

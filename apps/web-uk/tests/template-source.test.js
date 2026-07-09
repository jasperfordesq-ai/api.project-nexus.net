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

  it('keeps member dashboard links behind urlFor()', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'dashboard', 'index.njk'),
      'utf8'
    );

    expect(template).not.toMatch(/href="\/(?:onboarding|exchanges|listings|events|profile|feed|messages|members|volunteering)/);
    expect(template).toMatch(/urlFor\(["']\/listings/);
    expect(template).toMatch(/urlFor\(["']\/events/);
    expect(template).toMatch(/urlFor\(["']\/profile/);
  });

  it('keeps member onboarding route redirects behind the active tenant URL helper', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'onboarding-posts.js'),
      'utf8'
    );

    expect(route).not.toMatch(/res\.redirect\(['"`]\/(?:login|onboarding|dashboard)/);
    expect(route).not.toMatch(/res\.redirect\(`\/(?:login|onboarding|dashboard)/);
    expect(route).toContain('redirectTo(res,');
    expect(route).toContain('res.locals.urlFor');
  });

  it('keeps Explore live-content links behind urlFor()', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'explore.njk'),
      'utf8'
    );

    expect(template).not.toMatch(/href="\/(?:listings|events)/);
    expect(template).not.toContain('href="{{ listing.href }}"');
    expect(template).not.toContain('href="{{ event.href }}"');
    expect(template).toMatch(/urlFor\((?:listing|event)\.href\)/);
    expect(template).toMatch(/urlFor\(["']\/listings/);
    expect(template).toMatch(/urlFor\(["']\/events/);
  });

  it('keeps Explore route redirects behind the active tenant URL helper', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'explore.js'),
      'utf8'
    );

    expect(route).not.toMatch(/res\.redirect\(['"`]\/login/);
    expect(route).toContain('redirectTo(res,');
    expect(route).toContain('res.locals.urlFor');
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

  it('keeps achievements route redirects behind the active tenant URL helper', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'achievements.js'),
      'utf8'
    );

    expect(route).not.toMatch(/res\.redirect\(['"`]\/(?:login|achievements)/);
    expect(route).toContain('redirectTo(res,');
    expect(route).toContain('res.locals.urlFor');
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

  it('keeps member directory, discovery, nearby, and insights controls behind urlFor()', () => {
    const templates = [
      path.join('members', 'index.njk'),
      path.join('members', 'discover.njk'),
      path.join('members', 'nearby.njk'),
      path.join('members', 'insights.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:members|connections|profile)/);
      expect(template).not.toMatch(/action="\/members/);
      expect(template).not.toContain('href: "/members');
      expect(template).not.toContain('baseUrl: "/members"');
      expect(template).not.toContain('href="{{ nextHref }}"');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/members/);
  });

  it('keeps podcast browse, detail, studio, and management controls behind urlFor()', () => {
    const templates = [
      path.join('podcasts', 'detail.njk'),
      path.join('podcasts', 'episode.njk'),
      path.join('podcasts', 'form.njk'),
      path.join('podcasts', 'index.njk'),
      path.join('podcasts', 'manage.njk'),
      path.join('podcasts', 'studio.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/podcasts/);
      expect(template).not.toMatch(/action="\/podcasts/);
      expect(template).not.toContain('action="{{ action }}"');
      expect(template).not.toContain('action="{{ episodeStoreAction }}"');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/podcasts/);
  });

  it('keeps feed browse, hashtag, permalink, and engagement controls behind urlFor()', () => {
    const templates = [
      path.join('feed', 'hashtag.njk'),
      path.join('feed', 'hashtags.njk'),
      path.join('feed', 'index.njk'),
      path.join('feed', 'item.njk'),
      path.join('feed', 'post.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:feed|members|groups|login)/);
      expect(template).not.toMatch(/action="\/feed/);
      expect(template).not.toContain('href: "/feed');
      expect(template).not.toContain('href="{{ nextHref }}"');
      expect(template).not.toContain('href="{{ item.deepLink.href }}"');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/feed/);
  });

  it('keeps AI chat and matches links and forms behind urlFor()', () => {
    const templates = [
      path.join('ai-chat', 'index.njk'),
      path.join('matches', 'index.njk'),
      path.join('matches', 'board.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:chat|explore|matches|listings|groups|events)/);
      expect(template).not.toMatch(/action="\/(?:chat|matches)/);
    }

    const source = templates.join('\n');
    expect(source).toMatch(/urlFor\(["']\/chat/);
    expect(source).toMatch(/urlFor\(["']\/matches/);
    expect(source).toMatch(/urlFor\(["']\/listings/);
  });

  it('keeps AI chat route redirects behind the active tenant URL helper', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'ai-chat.js'),
      'utf8'
    );

    expect(route).not.toMatch(/res\.redirect\(['"`]\/(?:login|chat)/);
    expect(route).toContain('redirectTo(res,');
    expect(route).toContain('res.locals.urlFor');
  });

  it('keeps matches route redirects behind the active tenant URL helper', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'matches.js'),
      'utf8'
    );

    expect(route).not.toMatch(/res\.redirect\((?:['"`]\/matches|`\/matches)/);
    expect(route).toContain('redirectTo(res,');
    expect(route).toContain('res.locals.urlFor');
  });

  it('keeps auth route redirects behind the active tenant URL helper', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'auth.js'),
      'utf8'
    );

    expect(route).not.toMatch(/res\.redirect\(['"`]\/(?:login|dashboard|password)/);
    expect(route).toContain('redirectTo(res,');
    expect(route).toContain('res.locals.urlFor');
  });

  it('keeps server-level redirects behind the active tenant URL helper', () => {
    const server = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'server.js'),
      'utf8'
    );

    expect(server).not.toMatch(/res\.redirect\(['"`]\/(?:cookies|login|organisations)/);
    expect(server).not.toMatch(/res\.redirect\((?:invalidRedirect|failedRedirect)\)/);
    expect(server).toContain('redirectTo(res,');
    expect(server).toContain('res.locals.urlFor');
  });

  it('keeps contact and report route redirects behind the active tenant URL helper', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'contact-support.js'),
      'utf8'
    );

    expect(route).not.toMatch(/res\.redirect\(['"`]\/(?:contact|login|report-a-problem)/);
    expect(route).not.toContain("buildQuery('/contact'");
    expect(route).not.toContain("buildQuery('/report-a-problem'");
    expect(route).toContain('redirectTo(res,');
    expect(route).toContain('res.locals.urlFor');
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

  it('keeps resource route redirects behind the active tenant URL helper', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'resources.js'),
      'utf8'
    );

    expect(route).not.toMatch(/res\.redirect\(['"`]\/(?:login|resources)/);
    expect(route).not.toMatch(/res\.redirect\(`\/(?:login|resources)/);
    expect(route).toContain('redirectTo(res,');
    expect(route).toContain('res.locals.urlFor');
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

  it('keeps federation hub navigation and partner links behind urlFor()', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'federation', 'index.njk'),
      'utf8'
    );

    expect(template).not.toMatch(/href="\/federation/);
    expect(template).not.toContain('href="{{ partner.href }}"');
    expect(template).toMatch(/urlFor\(["']\/federation/);
    expect(template).toContain('href="{{ urlFor(partner.href) }}"');
  });

  it('keeps federation onboarding wizard links and forms behind urlFor()', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'federation', 'onboarding.njk'),
      'utf8'
    );

    expect(template).not.toMatch(/href="\/federation/);
    expect(template).not.toMatch(/action="\/federation/);
    expect(template).toMatch(/urlFor\(["']\/federation/);
  });

  it('keeps federation route redirects behind the active tenant URL helper', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'federation.js'),
      'utf8'
    );

    expect(route).not.toMatch(/res\.redirect\(['"`]\/(?:login|federation)/);
    expect(route).not.toMatch(/res\.redirect\(`\/(?:login|federation)/);
    expect(route).toContain('redirectTo(res,');
    expect(route).toContain('res.locals.urlFor');
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

  it('keeps connection route redirects behind the active tenant URL helper', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'connections.js'),
      'utf8'
    );

    expect(route).not.toMatch(/res\.redirect\(['"`]\/login/);
    expect(route).not.toMatch(/res\.redirect\(connectionActionUrl/);
    expect(route).toContain('res.locals.urlFor');
    expect(route).toContain('redirectTo(res,');
  });

  it('keeps clubs form and route redirects behind the active tenant URL helper', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'clubs', 'index.njk'),
      'utf8'
    );
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'clubs.js'),
      'utf8'
    );

    expect(template).not.toMatch(/action="\/clubs/);
    expect(template).toMatch(/urlFor\(["']\/clubs/);
    expect(route).not.toMatch(/res\.redirect\(['"`]\/login/);
    expect(route).toContain('res.locals.urlFor');
    expect(route).toContain('redirectTo(res,');
  });

  it('keeps skills links, form, and route redirects behind the active tenant URL helper', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'skills', 'index.njk'),
      'utf8'
    );
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'skills.js'),
      'utf8'
    );

    expect(template).not.toMatch(/href="\/(?:skills|members)/);
    expect(template).not.toMatch(/action="\/skills/);
    expect(template).toMatch(/urlFor\(["']\/skills/);
    expect(template).toMatch(/urlFor\(["']\/members/);
    expect(route).not.toMatch(/res\.redirect\(['"`]\/login/);
    expect(route).toContain('res.locals.urlFor');
    expect(route).toContain('redirectTo(res,');
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

  it('keeps public fallback home links behind urlFor()', () => {
    const templates = [
      path.join('public-info', 'newsletter-unsubscribe.njk'),
      'error.njk',
      path.join('errors', '403.njk'),
      path.join('errors', '404.njk'),
      path.join('errors', '429.njk'),
      path.join('errors', '500.njk'),
      path.join('errors', '503.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toContain('href="/"');
      expect(template).toContain("urlFor('/')");
    }
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

  it('keeps blog route redirects behind the active tenant URL helper', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'blog-posts.js'),
      'utf8'
    );

    expect(route).not.toMatch(/res\.redirect\(['"`]\/(?:login|blog|reviews)/);
    expect(route).toContain('res.locals.urlFor');
    expect(route).toContain('redirectTo(res,');
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

  it('keeps knowledge-base browse, pagination, and article links behind urlFor()', () => {
    const templates = [
      path.join('kb', 'index.njk'),
      path.join('kb', 'article.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/kb/);
      expect(template).not.toMatch(/action="\/kb/);
      expect(template).not.toContain('href="{{ nextHref }}"');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/kb/);
  });

  it('keeps legacy knowledge-base compatibility templates behind urlFor()', () => {
    const templates = [
      path.join('knowledge-base', 'index.njk'),
      path.join('knowledge-base', 'detail.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/knowledge-base/);
      expect(template).not.toContain('href: "/knowledge-base');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/knowledge-base/);
  });

  it('keeps goals browse, detail, progress, and social controls behind urlFor()', () => {
    const templates = [
      'buddy-actions.njk',
      'buddying.njk',
      'checkin.njk',
      'detail.njk',
      'discover.njk',
      'edit.njk',
      'history.njk',
      'index.njk',
      'insights.njk',
      'reminder.njk',
      'social.njk',
      'templates.njk'
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'goals', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/goals/);
      expect(template).not.toMatch(/action="\/goals/);
      expect(template).not.toContain('href: "/goals"');
      expect(template).not.toContain('href="{{ nextHref }}"');
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/goals/);
  });

  it('keeps exchange list and detail links and forms behind urlFor()', () => {
    const templates = [
      path.join('exchanges', 'index.njk'),
      path.join('exchanges', 'detail.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/(?:exchanges|listings|messages)/);
      expect(template).not.toMatch(/action="\/exchanges/);
    }

    const source = templates.join('\n');
    expect(source).toMatch(/urlFor\(["']\/exchanges/);
    expect(source).toMatch(/urlFor\(["']\/listings/);
    expect(source).toMatch(/urlFor\(["']\/messages/);
  });

  it('keeps exchange route redirects behind the active tenant URL helper', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'exchanges.js'),
      'utf8'
    );

    expect(route).not.toMatch(/res\.redirect\(['"`]\/exchanges/);
    expect(route).not.toMatch(/res\.redirect\(`\/exchanges/);
    expect(route).toContain('res.locals.urlFor');
    expect(route).toContain('redirectTo(res,');
  });

  it('keeps public coupon list and detail links behind urlFor()', () => {
    const templates = [
      path.join('coupons', 'index.njk'),
      path.join('coupons', 'detail.njk')
    ].map((templatePath) => fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', templatePath),
      'utf8'
    ));

    for (const template of templates) {
      expect(template).not.toMatch(/href="\/coupons/);
    }

    expect(templates.join('\n')).toMatch(/urlFor\(["']\/coupons/);
  });

  it('keeps the shared pagination partial default behind urlFor()', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'partials', 'pagination.njk'),
      'utf8'
    );

    expect(template).not.toContain('baseUrl: "/members"');
    expect(template).toContain("urlFor('/members')");
  });

  it('keeps shared empty-state and breadcrumb partial links behind urlFor()', () => {
    const emptyState = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'partials', 'empty-state.njk'),
      'utf8'
    );
    const breadcrumbs = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'partials', 'breadcrumbs.njk'),
      'utf8'
    );

    expect(emptyState).not.toContain('href: "/members"');
    expect(emptyState).not.toContain('href="{{ emptyState.action.href }}"');
    expect(emptyState).not.toContain('href="{{ emptyState.secondaryAction.href }}"');
    expect(emptyState).toContain('urlFor(emptyState.action.href)');
    expect(emptyState).toContain('urlFor(emptyState.secondaryAction.href)');

    expect(breadcrumbs).not.toContain('href: "/groups"');
    expect(breadcrumbs).not.toContain('href: "/groups/123"');
    expect(breadcrumbs).toContain("urlFor('/groups')");
  });
});

// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const http = require('http');

const { resolveOptions, runLaravelRuntimeSmoke } = require('../scripts/laravel-runtime-smoke');

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createLaravelServer(requests) {
  return http.createServer((req, res) => {
    requests.push({ surface: 'laravel', method: req.method, url: req.url });

    if (req.method === 'GET' && req.url === '/api/v2/groups?limit=1') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: [] }));
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('missing');
  });
}

function createWebServer(requests, { loginRedirect = '/dashboard', delayedPaths = {}, gatedRequiresFreshLogin = false } = {}) {
  let loginCount = 0;

  return http.createServer(async (req, res) => {
    requests.push({
      surface: 'web',
      method: req.method,
      url: req.url,
      cookie: req.headers.cookie || ''
    });

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'GET' && req.url === '/account') {
      if ((req.headers.cookie || '').includes('token=signed-token')) {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<h1>My account</h1>');
        return;
      }

      res.writeHead(302, { location: '/login' });
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/login') {
      res.writeHead(200, {
        'content-type': 'text/html',
        'set-cookie': 'nexus.csrf=csrf-cookie; Path=/; HttpOnly'
      });
      res.end('<form method="post"><input type="hidden" name="_csrf" value="csrf-token"></form>');
      return;
    }

    const signedPublicAuthPages = new Set([
      '/login/forgot-password',
      '/password/reset?token=reset-token',
      '/register'
    ]);
    if (req.method === 'GET' && signedPublicAuthPages.has(req.url)) {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<h1>${req.url}</h1>`);
      return;
    }

    if (req.method === 'POST' && req.url === '/login') {
      const body = await readBody(req);
      const params = new URLSearchParams(body);
      requests[requests.length - 1].body = body;
      const hasExpectedCsrf = params.get('_csrf') === 'csrf-token' && (req.headers.cookie || '').includes('nexus.csrf=csrf-cookie');
      if (hasExpectedCsrf && loginRedirect) {
        loginCount += 1;
        const token = gatedRequiresFreshLogin ? `signed-token-${loginCount}` : 'signed-token';
        res.writeHead(302, {
          location: loginRedirect,
          'set-cookie': [
            `token=${token}; Path=/; HttpOnly`,
            'refresh_token=signed-refresh; Path=/; HttpOnly'
          ]
        });
        res.end();
        return;
      }

      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<p>Email, password or tenant is incorrect</p>');
      return;
    }

    const bodyTextFixtures = new Map([
      ['/', 'Welcome to Project NEXUS Community'],
      ['/explore', 'Explore'],
      ['/chat', 'AI assistant'],
      ['/account', 'My account'],
      ['/wallet', 'Wallet'],
      ['/wallet/export.csv', 'Date,Type,Description'],
      ['/wallet/manage', 'Manage credits'],
      ['/wallet/recipients', 'results'],
      ['/messages', 'Messages'],
      ['/messages/groups', 'Group conversations'],
      ['/messages/groups/new', 'Start a group conversation'],
      ['/messages/77', 'Conversation'],
      ['/messages/new/77', 'Conversation with'],
      ['/connections', 'Connections'],
      ['/matches', 'Open the matches board'],
      ['/matches/board', 'Suggested matches'],
      ['/resources', 'Resources'],
      ['/resources/library', 'Resource library'],
      ['/resources/upload', 'Upload a resource'],
      ['/resources/10/comments', 'Comments'],
      ['/skills', 'Skills'],
      ['/goals', 'Goals'],
      ['/group-exchanges', 'Start a group exchange'],
      ['/group-exchanges/new', 'How are the hours shared out?'],
      ['/clubs', 'Clubs'],
      ['/saved', 'Saved items'],
      ['/members', 'Community members'],
      ['/members/discover', 'Recommended members'],
      ['/members/nearby', 'Members near me'],
      ['/members/77/insights', 'Reputation and recognition'],
      ['/about', 'About'],
      ['/guide', 'How timebanking works'],
      ['/features', 'Features'],
      ['/faq', 'Frequently asked questions'],
      ['/help', 'Help centre'],
      ['/kb', 'Knowledge base'],
      ['/trust-and-safety', 'Trust and safety'],
      ['/legal', 'Legal'],
      ['/accessibility', 'Accessibility statement'],
      ['/legal/terms', 'Terms of service'],
      ['/legal/privacy', 'Privacy policy'],
      ['/legal/cookies', 'Cookie policy'],
      ['/legal/community-guidelines', 'Community guidelines'],
      ['/legal/acceptable-use', 'Acceptable use policy'],
      ['/volunteering', 'Volunteering'],
      ['/volunteering/accessibility', 'Your accessibility needs'],
      ['/volunteering/certificates', 'Volunteer certificates'],
      ['/volunteering/opportunities/create', 'Post a volunteer opportunity'],
      ['/volunteering/credentials', 'My credentials'],
      ['/volunteering/hours', 'Volunteering hours'],
      ['/volunteering/wellbeing', 'My wellbeing'],
      ['/volunteering/donations', 'Donations and giving'],
      ['/volunteering/expenses', 'My expenses'],
      ['/volunteering/emergency-alerts', 'Urgent shift requests'],
      ['/volunteering/group-signups', 'Group sign-ups'],
      ['/volunteering/training', 'Safeguarding'],
      ['/volunteering/incidents', 'Safeguarding'],
      ['/volunteering/waitlist', 'Shift waitlist'],
      ['/volunteering/swaps', 'Shift swaps'],
      ['/volunteering/my-organisations', 'My organisations'],
      ['/volunteering/recommended-shifts', 'Recommended for you'],
      ['/volunteering/opportunities/307', 'Volunteering opportunity'],
      ['/volunteering/organisations/636/dashboard', 'Organisation dashboard'],
      ['/volunteering/organisations/636/manage', 'Manage your organisation'],
      ['/volunteering/organisations/636/settings', 'Organisation settings'],
      ['/volunteering/organisations/636/volunteers', 'Volunteers roster'],
      ['/volunteering/organisations/636/wallet', 'Organisation wallet'],
      ['/organisations', 'Organisations'],
      ['/organisations/browse', 'Browse organisations'],
      ['/organisations/manage', 'Manage my organisations'],
      ['/organisations/register', 'Register a volunteer organisation'],
      ['/organisations/636', 'About this organisation'],
      ['/organisations/636/jobs', 'Open roles posted by this organisation'],
      ['/organisations/opportunities/307/apply', 'Apply for this opportunity'],
      ['/events', 'Events'],
      ['/events/new', 'Create an event'],
      ['/events/browse', 'Browse events by category'],
      ['/events/6', 'Location'],
      ['/events/6/map', 'Event location'],
      ['/events/6/polls', 'Polls for this event'],
      ['/events/6/translate', 'Translate event description'],
      ['/events/14', 'Location'],
      ['/events/14/map', 'Event location'],
      ['/events/14/polls', 'Polls for this event'],
      ['/events/14/translate', 'Translate event description'],
      ['/listings', 'Listings'],
      ['/listings/new', 'Create listing'],
      ['/listings/90992/edit', 'Edit listing'],
      ['/listings/42/report', 'Report listing'],
      ['/listings/42/exchange-request', 'Request an exchange'],
      ['/listings/42/comments', 'Comments'],
      ['/listings/90967/report', 'Report listing'],
      ['/listings/90967/exchange-request', 'Request an exchange'],
      ['/listings/90967/comments', 'Comments'],
      ['/polls', 'Polls'],
      ['/polls/parity/create', 'Create a poll'],
      ['/polls/parity/manage', 'Manage my polls'],
      ['/polls/20', 'Polls at this community'],
      ['/polls/20/rank', 'Polls at this community'],
      ['/polls/8', 'Polls at this community'],
      ['/polls/4', 'Polls at this community'],
      ['/jobs', 'Jobs'],
      ['/jobs/90764', 'Apply for this opportunity'],
      ['/jobs/90764/qualified', 'Am I qualified?'],
      ['/jobs/saved', 'Saved opportunities'],
      ['/jobs/applications', 'My applications'],
      ['/jobs/mine', 'My postings'],
      ['/jobs/create', 'Post an opportunity'],
      ['/jobs/alerts', 'Job alerts'],
      ['/jobs/responses', 'Interviews and offers'],
      ['/jobs/employer-onboarding', 'Post an opportunity'],
      ['/jobs/employers/14', 'Open opportunities and reviews for this employer'],
      ['/courses', 'Courses'],
      ['/courses/mine', 'My learning'],
      ['/courses/instructor', 'Courses you teach'],
      ['/courses/instructor/new', 'Create a course'],
      ['/courses/1', 'Ratings and reviews'],
      ['/courses/2', 'Ratings and reviews'],
      ['/courses/instructor/1/edit', 'Edit your course'],
      ['/courses/instructor/2/edit', 'Edit your course'],
      ['/marketplace', 'Marketplace'],
      ['/marketplace/mine', 'My listings'],
      ['/marketplace/onboarding', 'Become a seller'],
      ['/marketplace/saved', 'Saved items'],
      ['/marketplace/free', 'Free items'],
      ['/marketplace/offers', 'My offers'],
      ['/marketplace/orders', 'My orders'],
      ['/marketplace/sales', 'Sales'],
      ['/marketplace/pickups', 'My collections'],
      ['/marketplace/slots', 'Pickup slots'],
      ['/marketplace/create', 'Create a listing'],
      ['/marketplace/search', 'Advanced search'],
      ['/marketplace/coupons/new', 'Create a coupon'],
      ['/marketplace/267', 'Description'],
      ['/marketplace/267/buy', 'Confirm your purchase'],
      ['/marketplace/267/offer', 'Make an offer'],
      ['/marketplace/267/report', 'Report a listing'],
      ['/marketplace/267/edit', 'Edit your listing'],
      ['/marketplace/6', 'Description'],
      ['/marketplace/6/buy', 'Confirm your purchase'],
      ['/marketplace/6/offer', 'Make an offer'],
      ['/marketplace/6/report', 'Report a listing'],
      ['/marketplace/6/edit', 'Edit your listing'],
      ['/marketplace/category/electronics', 'Search within this category'],
      ['/marketplace/category/home-garden', 'Search within this category'],
      ['/marketplace/category/free-items', 'Search within this category'],
      ['/marketplace/category/services', 'Search within this category'],
      ['/marketplace/seller/1', 'Items for sale'],
      ['/ideation', 'Ideas'],
      ['/ideation/campaigns', 'Campaigns'],
      ['/ideation/new', 'Create challenge'],
      ['/ideation/outcomes', 'Outcomes'],
      ['/ideation/tags', 'Browse by tag'],
      ['/ideation/23', 'Ideas'],
      ['/ideation/22', 'Ideas'],
      ['/ideation/2', 'Ideas'],
      ['/ideation/2/ideas/1', 'Idea details'],
      ['/ideation/23/edit', 'Edit challenge'],
      ['/ideation/23/manage', 'Manage challenge'],
      ['/ideation/23/drafts', 'Your draft ideas'],
      ['/ideation/23/outcome', 'Record challenge outcome'],
      ['/goals/buddying', 'Goals you buddy'],
      ['/goals/discover', 'Discover goals'],
      ['/goals/templates', 'Goal templates'],
      ['/goals/162', 'Back to goals'],
      ['/goals/162/edit', 'Edit your goal'],
      ['/goals/162/checkin', 'Log a check-in'],
      ['/goals/162/reminder', 'Reminder settings'],
      ['/goals/162/buddy-actions', 'Send buddy support'],
      ['/goals/162/insights', 'Goal insights'],
      ['/goals/162/history', 'Progress history'],
      ['/goals/162/social', 'Likes and comments'],
      ['/blog', 'Blog'],
      ['/feed', 'Feed'],
      ['/feed/hashtags', 'Hashtags'],
      ['/feed/hashtag/timebank', '#timebank'],
      ['/feed/item/listing/42', 'View listing'],
      ['/feed/posts/796', 'Post'],
      ['/feed/item/listing/90967', 'View listing'],
      ['/feed/item/listing/90966', 'View listing'],
      ['/feed/item/listing/90965', 'View listing'],
      ['/feed/item/listing/90964', 'View listing'],
      ['/feed/item/listing/90963', 'View listing'],
      ['/feed/item/listing/90962', 'View listing'],
      ['/blog/feed.xml', '<rss version="2.0">'],
      ['/blog/test-sitemap-blog-post/likers/like', 'Blog reactions'],
      ['/blog/timebank-ireland/likers/like', 'Blog reactions'],
      ['/blog/test-sitemap-blog-post', 'Back to the blog'],
      ['/blog/test-sitemap-blog-post/comments', 'Blog discussion'],
      ['/blog/timebank-ireland', 'Back to the blog'],
      ['/blog/timebank-ireland/comments', 'Blog discussion'],
      ['/podcasts', 'Podcasts'],
      ['/podcasts/studio', 'Podcast studio'],
      ['/podcasts/studio/new', 'Create a podcast'],
      ['/reviews', 'Reviews'],
      ['/search', 'Search'],
      ['/search/advanced', 'Advanced search'],
      ['/federation', 'Federation'],
      ['/notifications', 'Notifications'],
      ['/activity', 'My activity'],
      ['/achievements', 'Achievements'],
      ['/leaderboard', 'Leaderboard'],
      ['/nexus-score', 'NEXUS score'],
      ['/premium', 'Donate'],
      ['/profile/settings', 'Edit your profile'],
      ['/settings/appearance', 'Appearance'],
      ['/settings/data-rights', 'Your data rights'],
      ['/profile/delete-account', 'Delete your account'],
      ['/profile/two-factor', 'Authenticator app (two-step verification)'],
      ['/profile/blocked', 'Blocked members'],
      ['/settings/availability', 'Your availability'],
      ['/settings/linked-accounts', 'Linked accounts'],
      ['/settings/insurance', 'Insurance certificates'],
      ['/activity/insights', 'Activity insights'],
      ['/achievements/shop', 'XP shop'],
      ['/achievements/collections', 'Badge collections'],
      ['/achievements/engagement', 'Engagement history'],
      ['/achievements/showcase', 'Showcase badges'],
      ['/leaderboard/competitive', 'Competitive leaderboard'],
      ['/leaderboard/seasons', 'Leaderboard seasons'],
      ['/leaderboard/journey', 'My journey'],
      ['/leaderboard/spotlight', 'Member spotlight'],
      ['/nexus-score/tiers', 'NEXUS tier ladder'],
      ['/federation/partners', 'Federation partners'],
      ['/federation/partners/1', 'Federation partner'],
      ['/federation/partners/5', 'Federation partner'],
      ['/federation/members', 'Federated members'],
      ['/federation/members/353', 'Federation member'],
      ['/federation/members/353/transfer', 'Send time credits'],
      ['/federation/members/351', 'Federation member'],
      ['/federation/settings', 'Federation settings'],
      ['/federation/opt-in', 'Opt in to federation'],
      ['/federation/opt-out', 'Opt out of federation'],
      ['/federation/onboarding', 'Welcome to the community network'],
      ['/federation/groups', 'Groups from partner communities'],
      ['/federation/listings', 'Federated listings'],
      ['/federation/events', 'Federated events'],
      ['/federation/connections', 'Federated connections'],
      ['/federation/messages', 'Federated messages'],
      ['/groups', 'Groups'],
      ['/groups/new', 'Create a group'],
      ['/groups/484', 'Group events'],
      ['/groups/484/invite', 'Invite members'],
      ['/groups/484/notifications', 'Notification preferences'],
      ['/groups/484/image', 'Group images'],
      ['/groups/484/announcements', 'Announcements'],
      ['/groups/484/discussions', 'Discussions'],
      ['/groups/484/discussions/new', 'Start a discussion'],
      ['/groups/484/files', 'Group files'],
      ['/groups/484/manage', 'Manage group'],
      ['/groups/482', 'Group events'],
      ['/groups/482/announcements', 'Announcements'],
      ['/groups/482/discussions', 'Discussions'],
      ['/groups/482/discussions/new', 'Start a discussion'],
      ['/groups/482/files', 'Group files'],
      ['/groups/482/manage', 'Manage group'],
      ['/groups/482/invite', 'Invite members'],
      ['/groups/482/notifications', 'Notification preferences'],
      ['/groups/482/image', 'Group images']
    ]);

    const modulePages = new Set(['/volunteering', '/organisations', '/organisations/browse', '/kb', '/help']);
    if (req.method === 'GET' && modulePages.has(req.url)) {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<h1>${bodyTextFixtures.get(req.url) || req.url}</h1>`);
      return;
    }

    const signedModulePages = new Set([
      '/',
      '/explore',
      '/saved',
      '/notifications',
      '/members',
      '/members/discover',
      '/resources',
      '/skills',
      '/goals',
      '/clubs',
      '/wallet',
      '/messages',
      '/connections',
      '/connections/network',
      '/matches',
      '/matches/board',
      '/activity',
      '/achievements',
      '/leaderboard',
      '/nexus-score',
      '/profile/settings',
      '/settings/appearance',
      '/settings/data-rights',
      '/federation',
      '/courses',
      '/courses/mine',
      '/marketplace',
      '/marketplace/mine',
      '/events',
      '/events/new',
      '/listings',
      '/search/advanced',
      '/premium',
      '/podcasts',
      '/profile/delete-account',
      '/profile/two-factor',
      '/profile/blocked',
      '/settings/availability',
      '/settings/linked-accounts',
      '/settings/insurance',
      '/activity/insights',
      '/achievements/shop',
      '/achievements/collections',
      '/achievements/engagement',
      '/achievements/showcase',
      '/leaderboard/competitive',
      '/leaderboard/seasons',
      '/leaderboard/journey',
      '/leaderboard/spotlight',
      '/nexus-score/tiers',
      '/federation/partners',
      '/federation/members',
      '/federation/settings',
      '/federation/opt-in',
      '/federation/opt-out',
      '/federation/onboarding',
      '/federation/groups',
      '/federation/listings',
      '/federation/events',
      '/federation/connections',
      '/federation/messages',
      '/courses/instructor',
      '/courses/instructor/new',
      '/marketplace/saved',
      '/marketplace/free',
      '/marketplace/offers',
      '/marketplace/orders',
      '/marketplace/sales',
      '/marketplace/pickups',
      '/marketplace/onboarding',
      '/marketplace/slots',
      '/events/6',
      '/events/6/map',
      '/events/6/polls',
      '/events/6/translate',
      '/volunteering/opportunities/307',
      '/organisations/636',
      '/organisations/636/jobs',
      '/organisations/opportunities/307/apply',
      '/members/77/insights',
      '/listings/90992/edit',
      '/listings/42/report',
      '/listings/42/exchange-request',
      '/listings/42/comments',
      '/listings/90967/report',
      '/listings/90967/exchange-request',
      '/listings/90967/comments',
      '/feed/hashtag/timebank',
      '/feed/item/listing/42',
      '/messages/77',
      '/messages/new/77',
      '/jobs/90764',
      '/jobs/90764/qualified',
      '/groups/484',
      '/groups/484/invite',
      '/groups/484/notifications',
      '/groups/484/image',
      '/groups/484/announcements',
      '/groups/484/discussions',
      '/groups/484/discussions/new',
      '/groups/484/files',
      '/groups/484/manage',
      '/resources/10/comments',
      '/volunteering/organisations/636/dashboard',
      '/volunteering/organisations/636/manage',
      '/volunteering/organisations/636/settings',
      '/volunteering/organisations/636/volunteers',
      '/volunteering/organisations/636/wallet',
      '/courses/1',
      '/courses/2',
      '/courses/instructor/1/edit',
      '/courses/instructor/2/edit',
      '/federation/partners/1',
      '/federation/partners/5',
      '/federation/members/353',
      '/federation/members/353/transfer',
      '/federation/members/351',
      '/ideation/23',
      '/ideation/22',
      '/ideation/2',
      '/ideation/2/ideas/1',
      '/ideation/23/edit',
      '/ideation/23/manage',
      '/ideation/23/drafts',
      '/ideation/23/outcome',
      '/polls',
      '/polls/parity/create',
      '/polls/parity/manage',
      '/polls/20',
      '/polls/20/rank',
      '/marketplace/267',
      '/marketplace/267/buy',
      '/marketplace/267/offer',
      '/marketplace/267/report',
      '/marketplace/267/edit',
      '/blog/test-sitemap-blog-post/likers/like',
      '/events/14',
      '/events/14/map',
      '/events/14/polls',
      '/events/14/translate',
      '/groups/482',
      '/groups/482/announcements',
      '/groups/482/discussions',
      '/groups/482/discussions/new',
      '/groups/482/files',
      '/groups/482/manage',
      '/groups/482/invite',
      '/groups/482/notifications',
      '/groups/482/image',
      '/marketplace/6',
      '/marketplace/6/buy',
      '/marketplace/6/offer',
      '/marketplace/6/report',
      '/marketplace/6/edit',
      '/polls/8',
      '/polls/4',
      '/feed/posts/796',
      '/goals/162',
      '/goals/162/edit',
      '/goals/162/checkin',
      '/goals/162/reminder',
      '/goals/162/buddy-actions',
      '/goals/162/insights',
      '/goals/162/history',
      '/goals/162/social',
      '/feed/item/listing/90967',
      '/feed/item/listing/90966',
      '/feed/item/listing/90965',
      '/feed/item/listing/90964',
      '/feed/item/listing/90963',
      '/feed/item/listing/90962',
      '/users/14/appreciations',
      '/jobs/employers/14',
      '/blog/timebank-ireland/likers/like',
      '/blog/test-sitemap-blog-post',
      '/blog/test-sitemap-blog-post/comments',
      '/blog/timebank-ireland',
      '/blog/timebank-ireland/comments',
      '/kb/90001',
      '/achievements/badges/vol_1h',
      '/reviews/18/comments',
      '/marketplace/category/electronics',
      '/marketplace/category/home-garden',
      '/marketplace/category/free-items',
      '/marketplace/category/services',
      '/marketplace/seller/1',
      '/volunteering/accessibility',
      '/volunteering/certificates',
      '/volunteering/opportunities/create',
      '/volunteering/credentials',
      '/volunteering/hours',
      '/volunteering/wellbeing',
      '/volunteering/donations',
      '/volunteering/expenses',
      '/volunteering/emergency-alerts',
      '/volunteering/group-signups',
      '/volunteering/training',
      '/volunteering/incidents',
      '/volunteering/waitlist',
      '/volunteering/swaps',
      '/volunteering/my-organisations',
      '/volunteering/recommended-shifts',
      '/about',
      '/accessibility',
      '/blog',
      '/blog/feed.xml',
      '/chat',
      '/contact',
      '/cookies',
      '/dashboard',
      '/events/browse',
      '/exchanges',
      '/faq',
      '/features',
      '/feed',
      '/feed/hashtags',
      '/goals/buddying',
      '/goals/discover',
      '/goals/templates',
      '/group-exchanges',
      '/group-exchanges/new',
      '/groups',
      '/groups/new',
      '/guide',
      '/ideation',
      '/ideation/campaigns',
      '/ideation/new',
      '/ideation/outcomes',
      '/ideation/tags',
      '/jobs',
      '/jobs/alerts',
      '/jobs/applications',
      '/jobs/create',
      '/jobs/employer-onboarding',
      '/jobs/mine',
      '/jobs/responses',
      '/jobs/saved',
      '/legal',
      '/legal/acceptable-use',
      '/legal/community-guidelines',
      '/legal/cookies',
      '/legal/privacy',
      '/legal/terms',
      '/listings/new',
      '/marketplace/create',
      '/marketplace/search',
      '/marketplace/coupons/new',
      '/me/collections',
      '/members/nearby',
      '/messages/groups',
      '/messages/groups/new',
      '/newsletter/unsubscribe',
      '/organisations/manage',
      '/organisations/register',
      '/podcasts/studio',
      '/podcasts/studio/new',
      '/polls',
      '/polls/parity/create',
      '/polls/parity/manage',
      '/premium/return',
      '/profile',
      '/report-a-problem',
      '/resources/library',
      '/resources/upload',
      '/reviews',
      '/reviews/list',
      '/search',
      '/trust-and-safety',
      '/verify-email',
      '/wallet/export.csv',
      '/wallet/manage',
      '/wallet/recipients'
    ]);
    if (req.method === 'GET' && signedModulePages.has(req.url)) {
      if (delayedPaths[req.url]) {
        await delay(delayedPaths[req.url]);
      }

      if ((req.headers.cookie || '').includes('token=signed-token')) {
        if (req.url === '/blog/feed.xml') {
          res.writeHead(200, { 'content-type': 'application/rss+xml; charset=utf-8' });
          res.end('<rss version="2.0"></rss>');
          return;
        }

        if (req.url === '/wallet/export.csv') {
          res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8' });
          res.end('Date,Type,Description,Other Party,Debit,Credit,Status\n');
          return;
        }

        if (bodyTextFixtures.has(req.url)) {
          res.writeHead(200, { 'content-type': 'text/html' });
          res.end(`<h1>${bodyTextFixtures.get(req.url)}</h1>`);
          return;
        }

        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(`<h1>${req.url}</h1>`);
        return;
      }

      res.writeHead(302, { location: '/login?status=auth-required' });
      res.end();
      return;
    }

    const signedGatedPages = new Set([
      '/coupons',
      '/jobs/bias-audit',
      '/jobs/talent-search',
      '/events/6/edit',
      '/events/14/edit',
      '/groups/484/announcements/1/edit',
      '/jobs/90764/edit',
      '/jobs/90764/analytics',
      '/jobs/90764/pipeline',
      '/jobs/90764/applications',
      '/courses/instructor/1/analytics',
      '/courses/instructor/1/grading',
      '/listings/42/analytics',
      '/listings/90967/analytics',
      '/jobs/talent-search/77',
      '/group-exchanges/1',
      '/messages/groups/33',
      '/resources/10/delete',
      '/coupons/1',
      '/coupons/2',
      '/marketplace/coupons',
      '/marketplace/coupons/5/edit'
    ]);
    if (req.method === 'GET' && signedGatedPages.has(req.url)) {
      const expectedToken = gatedRequiresFreshLogin ? 'token=signed-token-2' : 'token=signed-token';
      if ((req.headers.cookie || '').includes(expectedToken)) {
        res.writeHead(403, { 'content-type': 'text/html' });
        res.end('<h1>Forbidden</h1>');
        return;
      }

      res.writeHead(302, { location: '/login?status=auth-required' });
      res.end();
      return;
    }

    const signedRedirectPages = new Map([
      ['/password/reset', '/login/forgot-password'],
      ['/login/two-factor', '/login?status=two-factor-expired'],
      ['/onboarding', '/dashboard'],
      ['/events/6/recurring-edit', '/events/6/edit'],
      ['/groups/484/edit', '/groups/484'],
      ['/courses/42/certificate', '/courses/42?status=certificate-failed'],
      ['/courses/1/certificate', '/courses/1?status=certificate-failed'],
      ['/federation/messages/conversation/77', '/federation/messages'],
      ['/jobs/90764/applications/export.csv', '/jobs/90764/applications?status=export-failed'],
      ['/courses/1/learn', '/courses/1?status=enrol-required'],
      ['/courses/2/learn', '/courses/2?status=enrol-required'],
      ['/federation/messages/conversation/353', '/federation/messages'],
      ['/onboarding/profile', '/dashboard'],
      ['/events/14/recurring-edit', '/events/14/edit'],
      ['/groups/482/edit', '/groups/482'],
      ['/courses/2/certificate', '/courses/2?status=certificate-failed'],
      ['/groups/484/files/1/download', '/groups/484/files?status=file-not-found'],
      ['/onboarding/interests', '/dashboard'],
      ['/onboarding/safeguarding', '/dashboard'],
      ['/onboarding/confirm', '/dashboard'],
      ['/premium/manage', '/premium?status=no-subscription']
    ]);
    if (req.method === 'GET' && signedRedirectPages.has(req.url)) {
      if ((req.headers.cookie || '').includes('token=signed-token')) {
        res.writeHead(302, { location: signedRedirectPages.get(req.url) });
        res.end();
        return;
      }

      res.writeHead(302, { location: '/login?status=auth-required' });
      res.end();
      return;
    }

    const unsignedAuthRequiredPages = new Set([
      '/federation/listings/1/1',
      '/federation/partners/1',
      '/ideation/1',
      '/ideation/campaigns/1',
      '/organisations/1',
      '/podcasts/1',
      '/podcasts/1/episodes/1',
      '/resources/1/download',
      '/users/1/collections',
      '/polls/1/export',
      '/marketplace/slots/1/edit',
      '/me/collections/1',
      '/search/saved/1/delete',
      '/volunteering/certificates/ABC123/download'
    ]);
    if (req.method === 'GET' && unsignedAuthRequiredPages.has(req.url)) {
      res.writeHead(302, { location: '/login?status=auth-required' });
      res.end();
      return;
    }

    const unsignedLoginRedirectPages = new Set([
      '/exchanges/1',
      '/jobs/applications/1/cv',
      '/jobs/applications/1/history'
    ]);
    if (req.method === 'GET' && unsignedLoginRedirectPages.has(req.url)) {
      res.writeHead(302, { location: '/login' });
      res.end();
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('missing');
  });
}

describe('Laravel runtime smoke harness', () => {
  const servers = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })));
  });

  it('uses a 60 second default request timeout for slower Laravel-backed pages', () => {
    expect(resolveOptions({}, {}).timeoutMs).toBe(60000);
  });

  it('allows CLI environment overrides for targeted smoke page groups', () => {
    const options = resolveOptions({}, {
      SMOKE_MODULE_PAGE_PATHS: '/login, /register',
      SMOKE_UNSIGNED_AUTH_REQUIRED_PAGE_PATHS: "/federation/partners/1\n/podcasts/1",
      SMOKE_UNSIGNED_LOGIN_REDIRECT_PAGE_PATHS: "/exchanges/1\n/jobs/applications/1/cv",
      SMOKE_GATED_PAGE_PATHS: '',
      SMOKE_REDIRECT_PAGE_PATHS: '',
      SMOKE_CONTENT_TYPE_PAGE_PATHS: '/blog/feed.xml=>application/rss+xml\n/wallet/export.csv=>text/csv',
      SMOKE_BODY_TEXT_PAGE_PATHS: '/explore=>Explore\n/chat=>AI assistant'
    });

    expect(options.modulePagePaths).toEqual(['/login', '/register']);
    expect(options.unsignedAuthRequiredPagePaths).toEqual(['/federation/partners/1', '/podcasts/1']);
    expect(options.unsignedLoginRedirectPagePaths).toEqual(['/exchanges/1', '/jobs/applications/1/cv']);
    expect(options.gatedPagePaths).toEqual([]);
    expect(options.redirectPagePaths).toEqual([]);
    expect(options.contentTypePagePaths).toEqual([
      { path: '/blog/feed.xml', contentType: 'application/rss+xml' },
      { path: '/wallet/export.csv', contentType: 'text/csv' }
    ]);
    expect(options.bodyTextPagePaths).toEqual([
      { path: '/explore', text: 'Explore' },
      { path: '/chat', text: 'AI assistant' }
    ]);
  });

  it('treats none as a portable CLI sentinel for disabled smoke page groups', () => {
    const options = resolveOptions({}, {
      SMOKE_MODULE_PAGE_PATHS: 'none',
      SMOKE_UNSIGNED_AUTH_REQUIRED_PAGE_PATHS: 'none',
      SMOKE_UNSIGNED_LOGIN_REDIRECT_PAGE_PATHS: 'none',
      SMOKE_GATED_PAGE_PATHS: 'none',
      SMOKE_REDIRECT_PAGE_PATHS: 'none',
      SMOKE_CONTENT_TYPE_PAGE_PATHS: 'none',
      SMOKE_BODY_TEXT_PAGE_PATHS: 'none'
    });

    expect(options.modulePagePaths).toEqual([]);
    expect(options.unsignedAuthRequiredPagePaths).toEqual([]);
    expect(options.unsignedLoginRedirectPagePaths).toEqual([]);
    expect(options.gatedPagePaths).toEqual([]);
    expect(options.redirectPagePaths).toEqual([]);
    expect(options.contentTypePagePaths).toEqual([]);
    expect(options.bodyTextPagePaths).toEqual([]);
  });

  it('allows CLI module page smoke runs to be split into deterministic chunks', () => {
    const options = resolveOptions({}, {
      SMOKE_MODULE_PAGE_PATHS: '/alpha,/bravo,/charlie,/delta,/echo,/foxtrot,/golf',
      SMOKE_MODULE_PAGE_CHUNK: '2/3'
    });

    expect(options.modulePagePaths).toEqual(['/bravo', '/echo']);
  });

  it('includes stable real-fixture parameterised pages in the default module smoke scope', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/events/6',
      '/events/6/map',
      '/events/6/polls',
      '/events/6/translate',
      '/volunteering/opportunities/307',
      '/organisations/636',
      '/organisations/636/jobs',
      '/organisations/opportunities/307/apply',
      '/jobs/90764',
      '/groups/484',
      '/groups/484/invite',
      '/groups/484/notifications',
      '/groups/484/image',
      '/groups/484/announcements',
      '/groups/484/discussions',
      '/groups/484/files',
      '/groups/484/manage',
      '/resources/10/comments'
    ]));
  });

  it('includes the stable achievement badge detail fixture outcome in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/achievements/badges/vol_1h'
    ]));
  });

  it('includes stable real-fixture secondary page outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/groups/484/discussions/new',
      '/jobs/90764/qualified'
    ]));
    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/jobs/90764/edit', status: 403 },
      { path: '/jobs/90764/analytics', status: 403 },
      { path: '/jobs/90764/pipeline', status: 403 },
      { path: '/jobs/90764/applications', status: 403 }
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/events/6/recurring-edit', location: '/events/6/edit' },
      { path: '/groups/484/edit', location: '/groups/484' }
    ]));
  });

  it('includes stable listing, member, feed, and course fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/members/77/insights',
      '/listings/90992/edit',
      '/listings/42/report',
      '/listings/42/exchange-request',
      '/listings/42/comments',
      '/feed/hashtag/timebank',
      '/feed/item/listing/42'
    ]));
    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/listings/42/analytics', status: 403 }
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/courses/42/certificate', location: '/courses/42?status=certificate-failed' }
    ]));
  });

  it('includes stable message and volunteering owner fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/messages/77',
      '/messages/new/77',
      '/volunteering/organisations/636/dashboard',
      '/volunteering/organisations/636/manage',
      '/volunteering/organisations/636/settings',
      '/volunteering/organisations/636/volunteers',
      '/volunteering/organisations/636/wallet'
    ]));
    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/group-exchanges/1', status: 403 },
      { path: '/messages/groups/33', status: 403 }
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/federation/messages/conversation/77', location: '/federation/messages' }
    ]));
  });

  it('includes stable course, federation, ideation, resource, and coupon fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/courses/1',
      '/courses/2',
      '/courses/instructor/1/edit',
      '/courses/instructor/2/edit',
      '/federation/partners/1',
      '/federation/partners/5',
      '/federation/members/353',
      '/federation/members/353/transfer',
      '/federation/members/351',
      '/ideation/23',
      '/ideation/22',
      '/ideation/2',
      '/ideation/23/edit',
      '/ideation/23/manage',
      '/ideation/23/drafts',
      '/ideation/23/outcome'
    ]));
    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/resources/10/delete', status: 403 },
      { path: '/coupons/1', status: 403 },
      { path: '/coupons/2', status: 403 }
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/courses/1/learn', location: '/courses/1?status=enrol-required' },
      { path: '/courses/2/learn', location: '/courses/2?status=enrol-required' },
      { path: '/federation/messages/conversation/353', location: '/federation/messages' }
    ]));
  });

  it('includes stable home, blog feed, wallet export, and coupon management outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/',
      '/blog/feed.xml',
      '/wallet/export.csv',
      '/wallet/recipients',
      '/marketplace/coupons/new'
    ]));
    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/coupons', status: 403 },
      { path: '/marketplace/coupons/5/edit', status: 403 }
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/password/reset', location: '/login/forgot-password' }
    ]));
  });

  it('includes stable account, poll, listing, course certificate, job export, and onboarding outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/account',
      '/polls/20',
      '/polls/20/rank',
      '/listings/90967/comments',
      '/listings/90967/report',
      '/listings/90967/exchange-request'
    ]));
    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/listings/90967/analytics', status: 403 },
      { path: '/jobs/talent-search/77', status: 403 }
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/courses/1/certificate', location: '/courses/1?status=certificate-failed' },
      { path: '/jobs/90764/applications/export.csv', location: '/jobs/90764/applications?status=export-failed' },
      { path: '/onboarding/profile', location: '/dashboard' }
    ]));
  });

  it('includes stable marketplace action and blog liker fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/marketplace/267',
      '/marketplace/267/buy',
      '/marketplace/267/offer',
      '/marketplace/267/report',
      '/marketplace/267/edit',
      '/blog/test-sitemap-blog-post/likers/like'
    ]));
  });

  it('includes stable secondary event, group, marketplace, poll, feed, blog, course, and onboarding outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/events/14',
      '/events/14/map',
      '/events/14/polls',
      '/events/14/translate',
      '/groups/482',
      '/groups/482/announcements',
      '/groups/482/discussions',
      '/groups/482/discussions/new',
      '/groups/482/files',
      '/groups/482/manage',
      '/groups/482/invite',
      '/groups/482/notifications',
      '/groups/482/image',
      '/marketplace/6',
      '/marketplace/6/buy',
      '/marketplace/6/offer',
      '/marketplace/6/report',
      '/marketplace/6/edit',
      '/polls/8',
      '/polls/4',
      '/feed/item/listing/90967',
      '/blog/timebank-ireland/likers/like'
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/events/14/recurring-edit', location: '/events/14/edit' },
      { path: '/groups/482/edit', location: '/groups/482' },
      { path: '/courses/2/certificate', location: '/courses/2?status=certificate-failed' },
      { path: '/onboarding/interests', location: '/dashboard' },
      { path: '/onboarding/safeguarding', location: '/dashboard' },
      { path: '/onboarding/confirm', location: '/dashboard' }
    ]));
  });

  it('includes stable marketplace category and seller fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/marketplace/category/electronics',
      '/marketplace/category/home-garden',
      '/marketplace/category/free-items',
      '/marketplace/category/services',
      '/marketplace/seller/1'
    ]));
  });

  it('includes stable blog and knowledge-base fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/blog/test-sitemap-blog-post',
      '/blog/test-sitemap-blog-post/comments',
      '/blog/timebank-ireland',
      '/blog/timebank-ireland/comments',
      '/kb/90001'
    ]));
  });

  it('includes stable feed item fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/feed/posts/796',
      '/feed/item/listing/90966',
      '/feed/item/listing/90965',
      '/feed/item/listing/90964',
      '/feed/item/listing/90963',
      '/feed/item/listing/90962'
    ]));
  });

  it('includes stable goal detail and review comment fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/goals/162',
      '/goals/162/edit',
      '/goals/162/checkin',
      '/goals/162/reminder',
      '/goals/162/buddy-actions',
      '/goals/162/insights',
      '/goals/162/history',
      '/goals/162/social',
      '/reviews/18/comments'
    ]));
  });

  it('includes stable unsigned auth-required owner route outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.unsignedAuthRequiredPagePaths).toEqual(expect.arrayContaining([
      '/ideation/campaigns/1',
      '/polls/1/export',
      '/marketplace/slots/1/edit',
      '/me/collections/1',
      '/search/saved/1/delete',
      '/volunteering/certificates/ABC123/download'
    ]));
  });

  it('includes stable unsigned login redirect route outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.unsignedLoginRedirectPagePaths).toEqual(expect.arrayContaining([
      '/exchanges/1',
      '/jobs/applications/1/cv',
      '/jobs/applications/1/history'
    ]));
  });

  it('includes stable user appreciation, employer brand, and group file fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/users/14/appreciations',
      '/jobs/employers/14'
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/groups/484/files/1/download', location: '/groups/484/files?status=file-not-found' }
    ]));
  });

  it('includes stable content-type route outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.contentTypePagePaths).toEqual(expect.arrayContaining([
      { path: '/blog/feed.xml', contentType: 'application/rss+xml' },
      { path: '/wallet/export.csv', contentType: 'text/csv' }
    ]));
  });

  it('includes stable body-text route outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.bodyTextPagePaths).toEqual(expect.arrayContaining([
      { path: '/explore', text: 'Explore' },
      { path: '/chat', text: 'AI assistant' },
      { path: '/account', text: 'My account' },
      { path: '/wallet', text: 'Wallet' },
      { path: '/wallet/export.csv', text: 'Date,Type,Description' },
      { path: '/wallet/manage', text: 'Manage credits' },
      { path: '/wallet/recipients', text: 'results' },
      { path: '/messages', text: 'Messages' },
      { path: '/messages/groups', text: 'Group conversations' },
      { path: '/messages/groups/new', text: 'Start a group conversation' },
      { path: '/messages/77', text: 'Conversation' },
      { path: '/messages/new/77', text: 'Conversation with' },
      { path: '/connections', text: 'Connections' },
      { path: '/matches', text: 'Open the matches board' },
      { path: '/matches/board', text: 'Suggested matches' },
      { path: '/resources', text: 'Resources' },
      { path: '/resources/library', text: 'Resource library' },
      { path: '/resources/upload', text: 'Upload a resource' },
      { path: '/resources/10/comments', text: 'Comments' },
      { path: '/skills', text: 'Skills' },
      { path: '/goals', text: 'Goals' },
      { path: '/group-exchanges', text: 'Start a group exchange' },
      { path: '/group-exchanges/new', text: 'How are the hours shared out?' },
      { path: '/clubs', text: 'Clubs' },
      { path: '/saved', text: 'Saved items' },
      { path: '/members', text: 'Community members' },
      { path: '/members/discover', text: 'Recommended members' },
      { path: '/members/nearby', text: 'Members near me' },
      { path: '/members/77/insights', text: 'Reputation and recognition' },
      { path: '/', text: 'Welcome to Project NEXUS Community' },
      { path: '/about', text: 'About' },
      { path: '/guide', text: 'How timebanking works' },
      { path: '/features', text: 'Features' },
      { path: '/faq', text: 'Frequently asked questions' },
      { path: '/help', text: 'Help centre' },
      { path: '/kb', text: 'Knowledge base' },
      { path: '/trust-and-safety', text: 'Trust and safety' },
      { path: '/legal', text: 'Legal' },
      { path: '/accessibility', text: 'Accessibility statement' },
      { path: '/legal/terms', text: 'Terms of service' },
      { path: '/legal/privacy', text: 'Privacy policy' },
      { path: '/legal/cookies', text: 'Cookie policy' },
      { path: '/legal/community-guidelines', text: 'Community guidelines' },
      { path: '/legal/acceptable-use', text: 'Acceptable use policy' },
      { path: '/volunteering', text: 'Volunteering' },
      { path: '/volunteering/accessibility', text: 'Your accessibility needs' },
      { path: '/volunteering/certificates', text: 'Volunteer certificates' },
      { path: '/volunteering/opportunities/create', text: 'Post a volunteer opportunity' },
      { path: '/volunteering/credentials', text: 'My credentials' },
      { path: '/volunteering/hours', text: 'Volunteering hours' },
      { path: '/volunteering/wellbeing', text: 'My wellbeing' },
      { path: '/volunteering/donations', text: 'Donations and giving' },
      { path: '/volunteering/expenses', text: 'My expenses' },
      { path: '/volunteering/emergency-alerts', text: 'Urgent shift requests' },
      { path: '/volunteering/group-signups', text: 'Group sign-ups' },
      { path: '/volunteering/training', text: 'Safeguarding' },
      { path: '/volunteering/incidents', text: 'Safeguarding' },
      { path: '/volunteering/waitlist', text: 'Shift waitlist' },
      { path: '/volunteering/swaps', text: 'Shift swaps' },
      { path: '/volunteering/my-organisations', text: 'My organisations' },
      { path: '/volunteering/recommended-shifts', text: 'Recommended for you' },
      { path: '/volunteering/opportunities/307', text: 'Volunteering opportunity' },
      { path: '/volunteering/organisations/636/dashboard', text: 'Organisation dashboard' },
      { path: '/volunteering/organisations/636/manage', text: 'Manage your organisation' },
      { path: '/volunteering/organisations/636/settings', text: 'Organisation settings' },
      { path: '/volunteering/organisations/636/volunteers', text: 'Volunteers roster' },
      { path: '/volunteering/organisations/636/wallet', text: 'Organisation wallet' },
      { path: '/organisations', text: 'Organisations' },
      { path: '/organisations/browse', text: 'Browse organisations' },
      { path: '/organisations/manage', text: 'Manage my organisations' },
      { path: '/organisations/register', text: 'Register a volunteer organisation' },
      { path: '/organisations/636', text: 'About this organisation' },
      { path: '/organisations/636/jobs', text: 'Open roles posted by this organisation' },
      { path: '/organisations/opportunities/307/apply', text: 'Apply for this opportunity' },
      { path: '/events', text: 'Events' },
      { path: '/events/new', text: 'Create an event' },
      { path: '/events/browse', text: 'Browse events by category' },
      { path: '/events/6', text: 'Location' },
      { path: '/events/6/map', text: 'Event location' },
      { path: '/events/6/polls', text: 'Polls for this event' },
      { path: '/events/6/translate', text: 'Translate event description' },
      { path: '/events/14', text: 'Location' },
      { path: '/events/14/map', text: 'Event location' },
      { path: '/events/14/polls', text: 'Polls for this event' },
      { path: '/events/14/translate', text: 'Translate event description' },
      { path: '/listings', text: 'Listings' },
      { path: '/listings/new', text: 'Create listing' },
      { path: '/listings/90992/edit', text: 'Edit listing' },
      { path: '/listings/42/report', text: 'Report listing' },
      { path: '/listings/42/exchange-request', text: 'Request an exchange' },
      { path: '/listings/42/comments', text: 'Comments' },
      { path: '/listings/90967/report', text: 'Report listing' },
      { path: '/listings/90967/exchange-request', text: 'Request an exchange' },
      { path: '/listings/90967/comments', text: 'Comments' },
      { path: '/polls', text: 'Polls' },
      { path: '/polls/parity/create', text: 'Create a poll' },
      { path: '/polls/parity/manage', text: 'Manage my polls' },
      { path: '/polls/20', text: 'Polls at this community' },
      { path: '/polls/20/rank', text: 'Polls at this community' },
      { path: '/polls/8', text: 'Polls at this community' },
      { path: '/polls/4', text: 'Polls at this community' },
      { path: '/jobs', text: 'Jobs' },
      { path: '/jobs/90764', text: 'Apply for this opportunity' },
      { path: '/jobs/90764/qualified', text: 'Am I qualified?' },
      { path: '/jobs/employers/14', text: 'Open opportunities and reviews for this employer' },
      { path: '/courses', text: 'Courses' },
      { path: '/courses/mine', text: 'My learning' },
      { path: '/marketplace', text: 'Marketplace' },
      { path: '/marketplace/mine', text: 'My listings' },
      { path: '/marketplace/onboarding', text: 'Become a seller' },
      { path: '/marketplace/saved', text: 'Saved items' },
      { path: '/marketplace/free', text: 'Free items' },
      { path: '/marketplace/offers', text: 'My offers' },
      { path: '/marketplace/orders', text: 'My orders' },
      { path: '/marketplace/sales', text: 'Sales' },
      { path: '/marketplace/pickups', text: 'My collections' },
      { path: '/marketplace/slots', text: 'Pickup slots' },
      { path: '/marketplace/create', text: 'Create a listing' },
      { path: '/marketplace/search', text: 'Advanced search' },
      { path: '/marketplace/coupons/new', text: 'Create a coupon' },
      { path: '/marketplace/267', text: 'Description' },
      { path: '/marketplace/267/buy', text: 'Confirm your purchase' },
      { path: '/marketplace/267/offer', text: 'Make an offer' },
      { path: '/marketplace/267/report', text: 'Report a listing' },
      { path: '/marketplace/267/edit', text: 'Edit your listing' },
      { path: '/marketplace/6', text: 'Description' },
      { path: '/marketplace/6/buy', text: 'Confirm your purchase' },
      { path: '/marketplace/6/offer', text: 'Make an offer' },
      { path: '/marketplace/6/report', text: 'Report a listing' },
      { path: '/marketplace/6/edit', text: 'Edit your listing' },
      { path: '/marketplace/category/electronics', text: 'Search within this category' },
      { path: '/marketplace/category/home-garden', text: 'Search within this category' },
      { path: '/marketplace/category/free-items', text: 'Search within this category' },
      { path: '/marketplace/category/services', text: 'Search within this category' },
      { path: '/marketplace/seller/1', text: 'Items for sale' },
      { path: '/ideation', text: 'Ideas' },
      { path: '/ideation/campaigns', text: 'Campaigns' },
      { path: '/ideation/new', text: 'Create challenge' },
      { path: '/ideation/outcomes', text: 'Outcomes' },
      { path: '/ideation/tags', text: 'Browse by tag' },
      { path: '/ideation/23', text: 'Ideas' },
      { path: '/ideation/22', text: 'Ideas' },
      { path: '/ideation/2', text: 'Ideas' },
      { path: '/ideation/2/ideas/1', text: 'Idea details' },
      { path: '/ideation/23/edit', text: 'Edit challenge' },
      { path: '/ideation/23/manage', text: 'Manage challenge' },
      { path: '/ideation/23/drafts', text: 'Your draft ideas' },
      { path: '/ideation/23/outcome', text: 'Record challenge outcome' },
      { path: '/goals/buddying', text: 'Goals you buddy' },
      { path: '/goals/discover', text: 'Discover goals' },
      { path: '/goals/templates', text: 'Goal templates' },
      { path: '/goals/162', text: 'Back to goals' },
      { path: '/goals/162/edit', text: 'Edit your goal' },
      { path: '/goals/162/checkin', text: 'Log a check-in' },
      { path: '/goals/162/reminder', text: 'Reminder settings' },
      { path: '/goals/162/buddy-actions', text: 'Send buddy support' },
      { path: '/goals/162/insights', text: 'Goal insights' },
      { path: '/goals/162/history', text: 'Progress history' },
      { path: '/goals/162/social', text: 'Likes and comments' },
      { path: '/blog', text: 'Blog' },
      { path: '/feed', text: 'Feed' },
      { path: '/feed/hashtags', text: 'Hashtags' },
      { path: '/feed/hashtag/timebank', text: '#timebank' },
      { path: '/feed/item/listing/42', text: 'View listing' },
      { path: '/feed/posts/796', text: 'Post' },
      { path: '/feed/item/listing/90967', text: 'View listing' },
      { path: '/feed/item/listing/90966', text: 'View listing' },
      { path: '/feed/item/listing/90965', text: 'View listing' },
      { path: '/feed/item/listing/90964', text: 'View listing' },
      { path: '/feed/item/listing/90963', text: 'View listing' },
      { path: '/feed/item/listing/90962', text: 'View listing' },
      { path: '/blog/feed.xml', text: '<rss version="2.0">' },
      { path: '/blog/test-sitemap-blog-post/likers/like', text: 'Blog reactions' },
      { path: '/blog/timebank-ireland/likers/like', text: 'Blog reactions' },
      { path: '/blog/test-sitemap-blog-post', text: 'Back to the blog' },
      { path: '/blog/test-sitemap-blog-post/comments', text: 'Blog discussion' },
      { path: '/blog/timebank-ireland', text: 'Back to the blog' },
      { path: '/blog/timebank-ireland/comments', text: 'Blog discussion' },
      { path: '/podcasts', text: 'Podcasts' },
      { path: '/podcasts/studio', text: 'Podcast studio' },
      { path: '/podcasts/studio/new', text: 'Create a podcast' },
      { path: '/reviews', text: 'Reviews' },
      { path: '/search', text: 'Search' },
      { path: '/search/advanced', text: 'Advanced search' },
      { path: '/federation', text: 'Federation' },
      { path: '/notifications', text: 'Notifications' },
      { path: '/activity', text: 'My activity' },
      { path: '/achievements', text: 'Achievements' },
      { path: '/leaderboard', text: 'Leaderboard' },
      { path: '/nexus-score', text: 'NEXUS score' },
      { path: '/premium', text: 'Donate' },
      { path: '/profile/settings', text: 'Edit your profile' },
      { path: '/settings/appearance', text: 'Appearance' },
      { path: '/settings/data-rights', text: 'Your data rights' },
      { path: '/profile/delete-account', text: 'Delete your account' },
      { path: '/profile/two-factor', text: 'Authenticator app (two-step verification)' },
      { path: '/profile/blocked', text: 'Blocked members' },
      { path: '/settings/availability', text: 'Your availability' },
      { path: '/settings/linked-accounts', text: 'Linked accounts' },
      { path: '/settings/insurance', text: 'Insurance certificates' },
      { path: '/activity/insights', text: 'Activity insights' },
      { path: '/achievements/shop', text: 'XP shop' },
      { path: '/achievements/collections', text: 'Badge collections' },
      { path: '/achievements/engagement', text: 'Engagement history' },
      { path: '/achievements/showcase', text: 'Showcase badges' },
      { path: '/leaderboard/competitive', text: 'Competitive leaderboard' },
      { path: '/leaderboard/seasons', text: 'Leaderboard seasons' },
      { path: '/leaderboard/journey', text: 'My journey' },
      { path: '/leaderboard/spotlight', text: 'Member spotlight' },
      { path: '/nexus-score/tiers', text: 'NEXUS tier ladder' },
      { path: '/federation/partners', text: 'Federation partners' },
      { path: '/federation/partners/1', text: 'Federation partner' },
      { path: '/federation/partners/5', text: 'Federation partner' },
      { path: '/federation/members', text: 'Federated members' },
      { path: '/federation/members/353', text: 'Federation member' },
      { path: '/federation/members/353/transfer', text: 'Send time credits' },
      { path: '/federation/members/351', text: 'Federation member' },
      { path: '/federation/settings', text: 'Federation settings' },
      { path: '/federation/opt-in', text: 'Opt in to federation' },
      { path: '/federation/opt-out', text: 'Opt out of federation' },
      { path: '/federation/onboarding', text: 'Welcome to the community network' },
      { path: '/federation/groups', text: 'Groups from partner communities' },
      { path: '/federation/listings', text: 'Federated listings' },
      { path: '/federation/events', text: 'Federated events' },
      { path: '/federation/connections', text: 'Federated connections' },
      { path: '/federation/messages', text: 'Federated messages' },
      { path: '/groups', text: 'Groups' },
      { path: '/groups/new', text: 'Create a group' },
      { path: '/groups/484', text: 'Group events' },
      { path: '/groups/484/invite', text: 'Invite members' },
      { path: '/groups/484/notifications', text: 'Notification preferences' },
      { path: '/groups/484/image', text: 'Group images' },
      { path: '/groups/484/announcements', text: 'Announcements' },
      { path: '/groups/484/discussions', text: 'Discussions' },
      { path: '/groups/484/discussions/new', text: 'Start a discussion' },
      { path: '/groups/484/files', text: 'Group files' },
      { path: '/groups/484/manage', text: 'Manage group' },
      { path: '/groups/482', text: 'Group events' },
      { path: '/groups/482/announcements', text: 'Announcements' },
      { path: '/groups/482/discussions', text: 'Discussions' },
      { path: '/groups/482/discussions/new', text: 'Start a discussion' },
      { path: '/groups/482/files', text: 'Group files' },
      { path: '/groups/482/manage', text: 'Manage group' },
      { path: '/groups/482/invite', text: 'Invite members' },
      { path: '/groups/482/notifications', text: 'Notification preferences' },
      { path: '/groups/482/image', text: 'Group images' }
    ]));
  });

  it('includes the stable ideation idea fixture outcome in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/ideation/2/ideas/1'
    ]));
  });

  it('includes stable course instructor gated fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/courses/instructor/1/analytics', status: 403 },
      { path: '/courses/instructor/1/grading', status: 403 }
    ]));
  });

  it('includes stable event edit gated fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/events/6/edit', status: 403 },
      { path: '/events/14/edit', status: 403 }
    ]));
  });

  it('includes the stable group announcement edit gated fixture outcome in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/groups/484/announcements/1/edit', status: 403 }
    ]));
  });

  it('proves the Laravel-backed login path with CSRF, cookies, redirects, and a signed account page', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({
      laravelBaseUrl,
      webBaseUrl,
      email: 'member@acme.test',
      password: 'Test123!',
      tenant: 'acme'
    });

    expect(result.ok).toBe(true);
    expect(result.checks.map((check) => [check.name, check.ok])).toEqual(expect.arrayContaining([
      ['laravel-api-reachable', true],
      ['web-health', true],
      ['protected-account-redirects-to-login', true],
      ['login-form-csrf', true],
      ['login-post-redirects-dashboard', true],
      ['signed-account-renders', true]
    ]));
    expect(requests.map((request) => `${request.surface} ${request.method} ${request.url}`)).toContain('laravel GET /api/v2/groups?limit=1');
    expect(requests.map((request) => `${request.surface} ${request.method} ${request.url}`)).toContain('web POST /login');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/account').at(-1).cookie).toContain('token=signed-token');
  });

  it('reports a failed login as an auth smoke failure instead of certifying the run', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests, { loginRedirect: null });
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({
      laravelBaseUrl,
      webBaseUrl,
      email: 'member@acme.test',
      password: 'wrong-password',
      tenant: 'acme'
    });

    const authCheck = result.checks.find((check) => check.name === 'login-post-redirects-dashboard');
    expect(result.ok).toBe(false);
    expect(authCheck.ok).toBe(false);
    expect(authCheck.detail).toContain('expected 302 redirect to /dashboard');
  });

  it('defaults to the Laravel E2E tenant fixture credentials', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({ laravelBaseUrl, webBaseUrl });

    const loginRequest = requests.find((request) => request.method === 'POST' && request.url === '/login');
    const body = new URLSearchParams(loginRequest.body);
    expect(result.ok).toBe(true);
    expect(body.get('email')).toBe('e2e.user.a@project-nexus.local');
    expect(body.get('password')).toBe('TestPassword123!');
    expect(body.get('tenant_slug')).toBe('hour-timebank');
  });

  it('smokes the default public Laravel-backed module pages', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({ laravelBaseUrl, webBaseUrl });
    const checks = Object.fromEntries(result.checks.map((check) => [check.name, check.ok]));

    expect(checks).toEqual(expect.objectContaining({
      'module-page-volunteering-renders': true,
      'module-page-organisations-renders': true,
      'module-page-organisations-browse-renders': true,
      'module-page-kb-renders': true,
      'module-page-help-renders': true
    }));
    expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual(expect.arrayContaining([
      'GET /volunteering',
      'GET /organisations',
      'GET /organisations/browse',
      'GET /kb',
      'GET /help'
    ]));
  });

  it('smokes the default signed Laravel-backed module pages after login', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({ laravelBaseUrl, webBaseUrl });
    const checks = Object.fromEntries(result.checks.map((check) => [check.name, check.ok]));
    const checkByName = Object.fromEntries(result.checks.map((check) => [check.name, check]));

    expect(checks).toEqual(expect.objectContaining({
      'module-page-home-renders': true,
      'module-page-login-renders': true,
      'module-page-login-forgot-password-renders': true,
      'module-page-password-reset-token-reset-token-renders': true,
      'module-page-register-renders': true,
      'module-page-explore-renders': true,
      'module-page-saved-renders': true,
      'module-page-notifications-renders': true,
      'module-page-members-renders': true,
      'module-page-members-discover-renders': true,
      'module-page-resources-renders': true,
      'module-page-skills-renders': true,
      'module-page-goals-renders': true,
      'module-page-clubs-renders': true,
      'module-page-wallet-renders': true,
      'module-page-messages-renders': true,
      'module-page-connections-renders': true,
      'module-page-connections-network-renders': true,
      'module-page-matches-renders': true,
      'module-page-matches-board-renders': true,
      'module-page-activity-renders': true,
      'module-page-achievements-renders': true,
      'module-page-leaderboard-renders': true,
      'module-page-nexus-score-renders': true,
      'module-page-profile-settings-renders': true,
      'module-page-settings-appearance-renders': true,
      'module-page-settings-data-rights-renders': true,
      'module-page-federation-renders': true,
      'module-page-courses-renders': true,
      'module-page-courses-mine-renders': true,
      'module-page-marketplace-renders': true,
      'module-page-marketplace-mine-renders': true,
      'module-page-events-renders': true,
      'module-page-events-new-renders': true,
      'module-page-listings-renders': true,
      'module-page-search-advanced-renders': true,
      'module-page-premium-renders': true,
      'module-page-podcasts-renders': true,
      'module-page-profile-delete-account-renders': true,
      'module-page-profile-two-factor-renders': true,
      'module-page-profile-blocked-renders': true,
      'module-page-settings-availability-renders': true,
      'module-page-settings-linked-accounts-renders': true,
      'module-page-settings-insurance-renders': true,
      'module-page-activity-insights-renders': true,
      'module-page-achievements-shop-renders': true,
      'module-page-achievements-collections-renders': true,
      'module-page-achievements-engagement-renders': true,
      'module-page-achievements-showcase-renders': true,
      'module-page-leaderboard-competitive-renders': true,
      'module-page-leaderboard-seasons-renders': true,
      'module-page-leaderboard-journey-renders': true,
      'module-page-leaderboard-spotlight-renders': true,
      'module-page-nexus-score-tiers-renders': true,
      'module-page-federation-partners-renders': true,
      'module-page-federation-members-renders': true,
      'module-page-federation-settings-renders': true,
      'module-page-federation-opt-in-renders': true,
      'module-page-federation-opt-out-renders': true,
      'module-page-federation-onboarding-renders': true,
      'module-page-federation-groups-renders': true,
      'module-page-federation-listings-renders': true,
      'module-page-federation-events-renders': true,
      'module-page-federation-connections-renders': true,
      'module-page-federation-messages-renders': true,
      'module-page-courses-instructor-renders': true,
      'module-page-courses-instructor-new-renders': true,
      'module-page-marketplace-saved-renders': true,
      'module-page-marketplace-free-renders': true,
      'module-page-marketplace-offers-renders': true,
      'module-page-marketplace-orders-renders': true,
      'module-page-marketplace-sales-renders': true,
      'module-page-marketplace-pickups-renders': true,
      'module-page-marketplace-onboarding-renders': true,
      'module-page-marketplace-slots-renders': true,
      'module-page-events-6-renders': true,
      'module-page-events-6-map-renders': true,
      'module-page-events-6-polls-renders': true,
      'module-page-events-6-translate-renders': true,
      'module-page-volunteering-opportunities-307-renders': true,
      'module-page-organisations-636-renders': true,
      'module-page-organisations-636-jobs-renders': true,
      'module-page-organisations-opportunities-307-apply-renders': true,
      'module-page-members-77-insights-renders': true,
      'module-page-listings-42-report-renders': true,
      'module-page-listings-42-exchange-request-renders': true,
      'module-page-listings-42-comments-renders': true,
      'module-page-feed-hashtag-timebank-renders': true,
      'module-page-feed-item-listing-42-renders': true,
      'module-page-messages-77-renders': true,
      'module-page-messages-new-77-renders': true,
      'module-page-jobs-90764-renders': true,
      'module-page-jobs-90764-qualified-renders': true,
      'module-page-groups-484-renders': true,
      'module-page-groups-484-invite-renders': true,
      'module-page-groups-484-notifications-renders': true,
      'module-page-groups-484-image-renders': true,
      'module-page-groups-484-announcements-renders': true,
      'module-page-groups-484-discussions-renders': true,
      'module-page-groups-484-discussions-new-renders': true,
      'module-page-groups-484-files-renders': true,
      'module-page-groups-484-manage-renders': true,
      'module-page-resources-10-comments-renders': true,
      'module-page-volunteering-organisations-636-dashboard-renders': true,
      'module-page-volunteering-organisations-636-manage-renders': true,
      'module-page-volunteering-organisations-636-settings-renders': true,
      'module-page-volunteering-organisations-636-volunteers-renders': true,
      'module-page-volunteering-organisations-636-wallet-renders': true,
      'module-page-courses-1-renders': true,
      'module-page-courses-2-renders': true,
      'module-page-courses-instructor-1-edit-renders': true,
      'module-page-courses-instructor-2-edit-renders': true,
      'module-page-federation-partners-1-renders': true,
      'module-page-federation-partners-5-renders': true,
      'module-page-federation-members-353-renders': true,
      'module-page-federation-members-353-transfer-renders': true,
      'module-page-federation-members-351-renders': true,
      'module-page-ideation-23-renders': true,
      'module-page-ideation-22-renders': true,
      'module-page-ideation-2-renders': true,
      'module-page-ideation-23-edit-renders': true,
      'module-page-ideation-23-manage-renders': true,
      'module-page-ideation-23-drafts-renders': true,
      'module-page-ideation-23-outcome-renders': true,
      'module-page-volunteering-accessibility-renders': true,
      'module-page-volunteering-certificates-renders': true,
      'module-page-volunteering-opportunities-create-renders': true,
      'module-page-volunteering-credentials-renders': true,
      'module-page-volunteering-hours-renders': true,
      'module-page-volunteering-wellbeing-renders': true,
      'module-page-volunteering-donations-renders': true,
      'module-page-volunteering-expenses-renders': true,
      'module-page-volunteering-emergency-alerts-renders': true,
      'module-page-volunteering-group-signups-renders': true,
      'module-page-volunteering-training-renders': true,
      'module-page-volunteering-incidents-renders': true,
      'module-page-volunteering-waitlist-renders': true,
      'module-page-volunteering-swaps-renders': true,
      'module-page-volunteering-my-organisations-renders': true,
      'module-page-volunteering-recommended-shifts-renders': true,
      'module-page-about-renders': true,
      'module-page-accessibility-renders': true,
      'module-page-blog-renders': true,
      'module-page-blog-feed-xml-renders': true,
      'module-page-chat-renders': true,
      'module-page-contact-renders': true,
      'module-page-cookies-renders': true,
      'module-page-dashboard-renders': true,
      'module-page-events-browse-renders': true,
      'module-page-exchanges-renders': true,
      'module-page-faq-renders': true,
      'module-page-features-renders': true,
      'module-page-feed-hashtags-renders': true,
      'module-page-feed-renders': true,
      'module-page-goals-buddying-renders': true,
      'module-page-goals-discover-renders': true,
      'module-page-goals-templates-renders': true,
      'module-page-group-exchanges-renders': true,
      'module-page-group-exchanges-new-renders': true,
      'module-page-groups-renders': true,
      'module-page-groups-new-renders': true,
      'module-page-guide-renders': true,
      'module-page-ideation-renders': true,
      'module-page-ideation-campaigns-renders': true,
      'module-page-ideation-new-renders': true,
      'module-page-ideation-outcomes-renders': true,
      'module-page-ideation-tags-renders': true,
      'module-page-jobs-renders': true,
      'module-page-jobs-alerts-renders': true,
      'module-page-jobs-applications-renders': true,
      'module-page-jobs-create-renders': true,
      'module-page-jobs-employer-onboarding-renders': true,
      'module-page-jobs-mine-renders': true,
      'module-page-jobs-responses-renders': true,
      'module-page-jobs-saved-renders': true,
      'gated-page-jobs-bias-audit-returns-403': true,
      'gated-page-jobs-talent-search-returns-403': true,
      'gated-page-jobs-90764-edit-returns-403': true,
      'gated-page-jobs-90764-analytics-returns-403': true,
      'gated-page-jobs-90764-pipeline-returns-403': true,
      'gated-page-jobs-90764-applications-returns-403': true,
      'gated-page-listings-42-analytics-returns-403': true,
      'gated-page-group-exchanges-1-returns-403': true,
      'gated-page-messages-groups-33-returns-403': true,
      'gated-page-resources-10-delete-returns-403': true,
      'gated-page-coupons-1-returns-403': true,
      'gated-page-coupons-2-returns-403': true,
      'module-page-legal-renders': true,
      'module-page-legal-acceptable-use-renders': true,
      'module-page-legal-community-guidelines-renders': true,
      'module-page-legal-cookies-renders': true,
      'module-page-legal-privacy-renders': true,
      'module-page-legal-terms-renders': true,
      'module-page-listings-new-renders': true,
      'module-page-marketplace-create-renders': true,
      'module-page-marketplace-search-renders': true,
      'module-page-marketplace-coupons-new-renders': true,
      'gated-page-coupons-returns-403': true,
      'gated-page-marketplace-coupons-returns-403': true,
      'gated-page-marketplace-coupons-5-edit-returns-403': true,
      'module-page-me-collections-renders': true,
      'module-page-members-nearby-renders': true,
      'module-page-messages-groups-renders': true,
      'module-page-messages-groups-new-renders': true,
      'module-page-newsletter-unsubscribe-renders': true,
      'module-page-organisations-manage-renders': true,
      'module-page-organisations-register-renders': true,
      'module-page-podcasts-studio-renders': true,
      'module-page-podcasts-studio-new-renders': true,
      'module-page-polls-renders': true,
      'module-page-polls-parity-create-renders': true,
      'module-page-polls-parity-manage-renders': true,
      'module-page-premium-return-renders': true,
      'module-page-profile-renders': true,
      'module-page-report-a-problem-renders': true,
      'redirect-page-password-reset-redirects-login-forgot-password': true,
      'redirect-page-login-two-factor-redirects-login-status-two-factor-expired': true,
      'redirect-page-onboarding-redirects-dashboard': true,
      'redirect-page-events-6-recurring-edit-redirects-events-6-edit': true,
      'redirect-page-groups-484-edit-redirects-groups-484': true,
      'redirect-page-courses-42-certificate-redirects-courses-42-status-certificate-failed': true,
      'redirect-page-federation-messages-conversation-77-redirects-federation-messages': true,
      'redirect-page-courses-1-learn-redirects-courses-1-status-enrol-required': true,
      'redirect-page-courses-2-learn-redirects-courses-2-status-enrol-required': true,
      'redirect-page-federation-messages-conversation-353-redirects-federation-messages': true,
      'redirect-page-premium-manage-redirects-premium-status-no-subscription': true,
      'module-page-resources-library-renders': true,
      'module-page-resources-upload-renders': true,
      'module-page-reviews-renders': true,
      'module-page-reviews-list-renders': true,
      'module-page-search-renders': true,
      'module-page-trust-and-safety-renders': true,
      'module-page-verify-email-renders': true,
      'module-page-wallet-export-csv-renders': true,
      'module-page-wallet-manage-renders': true,
      'module-page-wallet-recipients-renders': true
    }));
    expect(checkByName['gated-page-coupons-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-bias-audit-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-talent-search-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-90764-edit-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-90764-analytics-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-90764-pipeline-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-90764-applications-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-listings-42-analytics-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-group-exchanges-1-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-messages-groups-33-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-resources-10-delete-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-coupons-1-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-coupons-2-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-marketplace-coupons-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-marketplace-coupons-5-edit-returns-403'].status).toBe(403);
    expect(checkByName['redirect-page-password-reset-redirects-login-forgot-password'].location).toBe('/login/forgot-password');
    expect(checkByName['redirect-page-events-6-recurring-edit-redirects-events-6-edit'].location).toBe('/events/6/edit');
    expect(checkByName['redirect-page-groups-484-edit-redirects-groups-484'].location).toBe('/groups/484');
    expect(checkByName['redirect-page-courses-42-certificate-redirects-courses-42-status-certificate-failed'].location).toBe('/courses/42?status=certificate-failed');
    expect(checkByName['redirect-page-federation-messages-conversation-77-redirects-federation-messages'].location).toBe('/federation/messages');
    expect(checkByName['redirect-page-courses-1-learn-redirects-courses-1-status-enrol-required'].location).toBe('/courses/1?status=enrol-required');
    expect(checkByName['redirect-page-courses-2-learn-redirects-courses-2-status-enrol-required'].location).toBe('/courses/2?status=enrol-required');
    expect(checkByName['redirect-page-federation-messages-conversation-353-redirects-federation-messages'].location).toBe('/federation/messages');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/explore').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/wallet').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/messages').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/listings').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/events/6').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/groups/484').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/jobs/90764/qualified').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/groups/484/discussions/new').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/members/77/insights').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/feed/item/listing/42').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/messages/77').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/volunteering/organisations/636/manage').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/courses/1').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/federation/members/353').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/ideation/23').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/wallet/export.csv').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/marketplace/coupons/new').at(-1).cookie).toContain('token=signed-token');
  });

  it('smokes unsigned redirects for auth-required parameterised Laravel routes', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({ laravelBaseUrl, webBaseUrl });
    const checks = Object.fromEntries(result.checks.map((check) => [check.name, check.ok]));
    const checkByName = Object.fromEntries(result.checks.map((check) => [check.name, check]));

    expect(checks).toEqual(expect.objectContaining({
      'auth-required-page-federation-listings-1-1-redirects-login-status-auth-required': true,
      'auth-required-page-federation-partners-1-redirects-login-status-auth-required': true,
      'auth-required-page-ideation-1-redirects-login-status-auth-required': true,
      'auth-required-page-organisations-1-redirects-login-status-auth-required': true,
      'auth-required-page-podcasts-1-redirects-login-status-auth-required': true,
      'auth-required-page-podcasts-1-episodes-1-redirects-login-status-auth-required': true,
      'auth-required-page-resources-1-download-redirects-login-status-auth-required': true,
      'auth-required-page-users-1-collections-redirects-login-status-auth-required': true
    }));
    expect(checkByName['auth-required-page-federation-partners-1-redirects-login-status-auth-required'].location).toBe('/login?status=auth-required');
    expect(requests.find((request) => request.method === 'GET' && request.url === '/federation/partners/1').cookie).not.toContain('token=signed-token');
  });

  it('smokes unsigned redirects for login-only parameterised Laravel routes', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({ laravelBaseUrl, webBaseUrl });
    const checks = Object.fromEntries(result.checks.map((check) => [check.name, check.ok]));
    const checkByName = Object.fromEntries(result.checks.map((check) => [check.name, check]));

    expect(checks).toEqual(expect.objectContaining({
      'unsigned-login-page-exchanges-1-redirects-login': true,
      'unsigned-login-page-jobs-applications-1-cv-redirects-login': true,
      'unsigned-login-page-jobs-applications-1-history-redirects-login': true
    }));
    expect(checkByName['unsigned-login-page-exchanges-1-redirects-login'].location).toBe('/login');
    expect(requests.find((request) => request.method === 'GET' && request.url === '/exchanges/1').cookie).not.toContain('token=signed-token');
  });

  it('smokes content-type contracts for export and feed routes', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({ laravelBaseUrl, webBaseUrl });
    const checks = Object.fromEntries(result.checks.map((check) => [check.name, check.ok]));
    const checkByName = Object.fromEntries(result.checks.map((check) => [check.name, check]));

    expect(checks).toEqual(expect.objectContaining({
      'content-type-page-blog-feed-xml-returns-application-rss-xml': true,
      'content-type-page-wallet-export-csv-returns-text-csv': true
    }));
    expect(checkByName['content-type-page-blog-feed-xml-returns-application-rss-xml'].contentType).toContain('application/rss+xml');
    expect(checkByName['content-type-page-wallet-export-csv-returns-text-csv'].contentType).toContain('text/csv');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/wallet/export.csv').at(-1).cookie).toContain('token=signed-token');
  });

  it('smokes body-text markers for canonical signed pages', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({ laravelBaseUrl, webBaseUrl });
    const checks = Object.fromEntries(result.checks.map((check) => [check.name, check.ok]));
    const checkByName = Object.fromEntries(result.checks.map((check) => [check.name, check]));

    expect(checks).toEqual(expect.objectContaining({
      'body-text-page-explore-contains-explore': true,
      'body-text-page-chat-contains-ai-assistant': true,
      'body-text-page-account-contains-my-account': true,
      'body-text-page-wallet-contains-wallet': true,
      'body-text-page-wallet-export-csv-contains-date-type-description': true,
      'body-text-page-wallet-manage-contains-manage-credits': true,
      'body-text-page-wallet-recipients-contains-results': true,
      'body-text-page-messages-contains-messages': true,
      'body-text-page-messages-groups-contains-group-conversations': true,
      'body-text-page-messages-groups-new-contains-start-a-group-conversation': true,
      'body-text-page-messages-77-contains-conversation': true,
      'body-text-page-messages-new-77-contains-conversation-with': true,
      'body-text-page-connections-contains-connections': true,
      'body-text-page-matches-contains-open-the-matches-board': true,
      'body-text-page-matches-board-contains-suggested-matches': true,
      'body-text-page-resources-contains-resources': true,
      'body-text-page-resources-library-contains-resource-library': true,
      'body-text-page-resources-upload-contains-upload-a-resource': true,
      'body-text-page-resources-10-comments-contains-comments': true,
      'body-text-page-skills-contains-skills': true,
      'body-text-page-goals-contains-goals': true,
      'body-text-page-group-exchanges-contains-start-a-group-exchange': true,
      'body-text-page-group-exchanges-new-contains-how-are-the-hours-shared-out': true,
      'body-text-page-clubs-contains-clubs': true,
      'body-text-page-saved-contains-saved-items': true,
      'body-text-page-members-contains-community-members': true,
      'body-text-page-members-discover-contains-recommended-members': true,
      'body-text-page-members-nearby-contains-members-near-me': true,
      'body-text-page-members-77-insights-contains-reputation-and-recognition': true,
      'body-text-page-home-contains-welcome-to-project-nexus-community': true,
      'body-text-page-about-contains-about': true,
      'body-text-page-guide-contains-how-timebanking-works': true,
      'body-text-page-features-contains-features': true,
      'body-text-page-faq-contains-frequently-asked-questions': true,
      'body-text-page-help-contains-help-centre': true,
      'body-text-page-kb-contains-knowledge-base': true,
      'body-text-page-trust-and-safety-contains-trust-and-safety': true,
      'body-text-page-legal-contains-legal': true,
      'body-text-page-accessibility-contains-accessibility-statement': true,
      'body-text-page-legal-terms-contains-terms-of-service': true,
      'body-text-page-legal-privacy-contains-privacy-policy': true,
      'body-text-page-legal-cookies-contains-cookie-policy': true,
      'body-text-page-legal-community-guidelines-contains-community-guidelines': true,
      'body-text-page-legal-acceptable-use-contains-acceptable-use-policy': true,
      'body-text-page-volunteering-contains-volunteering': true,
      'body-text-page-volunteering-accessibility-contains-your-accessibility-needs': true,
      'body-text-page-volunteering-certificates-contains-volunteer-certificates': true,
      'body-text-page-volunteering-opportunities-create-contains-post-a-volunteer-opportunity': true,
      'body-text-page-volunteering-credentials-contains-my-credentials': true,
      'body-text-page-volunteering-hours-contains-volunteering-hours': true,
      'body-text-page-volunteering-wellbeing-contains-my-wellbeing': true,
      'body-text-page-volunteering-donations-contains-donations-and-giving': true,
      'body-text-page-volunteering-expenses-contains-my-expenses': true,
      'body-text-page-volunteering-emergency-alerts-contains-urgent-shift-requests': true,
      'body-text-page-volunteering-group-signups-contains-group-sign-ups': true,
      'body-text-page-volunteering-training-contains-safeguarding': true,
      'body-text-page-volunteering-incidents-contains-safeguarding': true,
      'body-text-page-volunteering-waitlist-contains-shift-waitlist': true,
      'body-text-page-volunteering-swaps-contains-shift-swaps': true,
      'body-text-page-volunteering-my-organisations-contains-my-organisations': true,
      'body-text-page-volunteering-recommended-shifts-contains-recommended-for-you': true,
      'body-text-page-volunteering-opportunities-307-contains-volunteering-opportunity': true,
      'body-text-page-volunteering-organisations-636-dashboard-contains-organisation-dashboard': true,
      'body-text-page-volunteering-organisations-636-manage-contains-manage-your-organisation': true,
      'body-text-page-volunteering-organisations-636-settings-contains-organisation-settings': true,
      'body-text-page-volunteering-organisations-636-volunteers-contains-volunteers-roster': true,
      'body-text-page-volunteering-organisations-636-wallet-contains-organisation-wallet': true,
      'body-text-page-organisations-contains-organisations': true,
      'body-text-page-organisations-browse-contains-browse-organisations': true,
      'body-text-page-organisations-manage-contains-manage-my-organisations': true,
      'body-text-page-organisations-register-contains-register-a-volunteer-organisation': true,
      'body-text-page-organisations-636-contains-about-this-organisation': true,
      'body-text-page-organisations-636-jobs-contains-open-roles-posted-by-this-organisation': true,
      'body-text-page-organisations-opportunities-307-apply-contains-apply-for-this-opportunity': true,
      'body-text-page-events-contains-events': true,
      'body-text-page-events-new-contains-create-an-event': true,
      'body-text-page-events-browse-contains-browse-events-by-category': true,
      'body-text-page-events-6-contains-location': true,
      'body-text-page-events-6-map-contains-event-location': true,
      'body-text-page-events-6-polls-contains-polls-for-this-event': true,
      'body-text-page-events-6-translate-contains-translate-event-description': true,
      'body-text-page-events-14-contains-location': true,
      'body-text-page-events-14-map-contains-event-location': true,
      'body-text-page-events-14-polls-contains-polls-for-this-event': true,
      'body-text-page-events-14-translate-contains-translate-event-description': true,
      'body-text-page-listings-contains-listings': true,
      'body-text-page-listings-new-contains-create-listing': true,
      'body-text-page-listings-90992-edit-contains-edit-listing': true,
      'body-text-page-listings-42-report-contains-report-listing': true,
      'body-text-page-listings-42-exchange-request-contains-request-an-exchange': true,
      'body-text-page-listings-42-comments-contains-comments': true,
      'body-text-page-listings-90967-report-contains-report-listing': true,
      'body-text-page-listings-90967-exchange-request-contains-request-an-exchange': true,
      'body-text-page-listings-90967-comments-contains-comments': true,
      'body-text-page-polls-contains-polls': true,
      'body-text-page-polls-parity-create-contains-create-a-poll': true,
      'body-text-page-polls-parity-manage-contains-manage-my-polls': true,
      'body-text-page-polls-20-contains-polls-at-this-community': true,
      'body-text-page-polls-20-rank-contains-polls-at-this-community': true,
      'body-text-page-polls-8-contains-polls-at-this-community': true,
      'body-text-page-polls-4-contains-polls-at-this-community': true,
      'body-text-page-jobs-contains-jobs': true,
      'body-text-page-jobs-90764-contains-apply-for-this-opportunity': true,
      'body-text-page-jobs-90764-qualified-contains-am-i-qualified': true,
      'body-text-page-jobs-saved-contains-saved-opportunities': true,
      'body-text-page-jobs-applications-contains-my-applications': true,
      'body-text-page-jobs-mine-contains-my-postings': true,
      'body-text-page-jobs-create-contains-post-an-opportunity': true,
      'body-text-page-jobs-alerts-contains-job-alerts': true,
      'body-text-page-jobs-responses-contains-interviews-and-offers': true,
      'body-text-page-jobs-employer-onboarding-contains-post-an-opportunity': true,
      'body-text-page-jobs-employers-14-contains-open-opportunities-and-reviews-for-this-employer': true,
      'body-text-page-courses-contains-courses': true,
      'body-text-page-courses-mine-contains-my-learning': true,
      'body-text-page-courses-instructor-contains-courses-you-teach': true,
      'body-text-page-courses-instructor-new-contains-create-a-course': true,
      'body-text-page-courses-1-contains-ratings-and-reviews': true,
      'body-text-page-courses-2-contains-ratings-and-reviews': true,
      'body-text-page-courses-instructor-1-edit-contains-edit-your-course': true,
      'body-text-page-courses-instructor-2-edit-contains-edit-your-course': true,
      'body-text-page-marketplace-contains-marketplace': true,
      'body-text-page-marketplace-mine-contains-my-listings': true,
      'body-text-page-marketplace-onboarding-contains-become-a-seller': true,
      'body-text-page-marketplace-saved-contains-saved-items': true,
      'body-text-page-marketplace-free-contains-free-items': true,
      'body-text-page-marketplace-offers-contains-my-offers': true,
      'body-text-page-marketplace-orders-contains-my-orders': true,
      'body-text-page-marketplace-sales-contains-sales': true,
      'body-text-page-marketplace-pickups-contains-my-collections': true,
      'body-text-page-marketplace-slots-contains-pickup-slots': true,
      'body-text-page-marketplace-create-contains-create-a-listing': true,
      'body-text-page-marketplace-search-contains-advanced-search': true,
      'body-text-page-marketplace-coupons-new-contains-create-a-coupon': true,
      'body-text-page-marketplace-267-contains-description': true,
      'body-text-page-marketplace-267-buy-contains-confirm-your-purchase': true,
      'body-text-page-marketplace-267-offer-contains-make-an-offer': true,
      'body-text-page-marketplace-267-report-contains-report-a-listing': true,
      'body-text-page-marketplace-267-edit-contains-edit-your-listing': true,
      'body-text-page-marketplace-6-contains-description': true,
      'body-text-page-marketplace-6-buy-contains-confirm-your-purchase': true,
      'body-text-page-marketplace-6-offer-contains-make-an-offer': true,
      'body-text-page-marketplace-6-report-contains-report-a-listing': true,
      'body-text-page-marketplace-6-edit-contains-edit-your-listing': true,
      'body-text-page-marketplace-category-electronics-contains-search-within-this-category': true,
      'body-text-page-marketplace-category-home-garden-contains-search-within-this-category': true,
      'body-text-page-marketplace-category-free-items-contains-search-within-this-category': true,
      'body-text-page-marketplace-category-services-contains-search-within-this-category': true,
      'body-text-page-marketplace-seller-1-contains-items-for-sale': true,
      'body-text-page-ideation-contains-ideas': true,
      'body-text-page-ideation-campaigns-contains-campaigns': true,
      'body-text-page-ideation-new-contains-create-challenge': true,
      'body-text-page-ideation-outcomes-contains-outcomes': true,
      'body-text-page-ideation-tags-contains-browse-by-tag': true,
      'body-text-page-ideation-23-contains-ideas': true,
      'body-text-page-ideation-22-contains-ideas': true,
      'body-text-page-ideation-2-contains-ideas': true,
      'body-text-page-ideation-2-ideas-1-contains-idea-details': true,
      'body-text-page-ideation-23-edit-contains-edit-challenge': true,
      'body-text-page-ideation-23-manage-contains-manage-challenge': true,
      'body-text-page-ideation-23-drafts-contains-your-draft-ideas': true,
      'body-text-page-ideation-23-outcome-contains-record-challenge-outcome': true,
      'body-text-page-goals-buddying-contains-goals-you-buddy': true,
      'body-text-page-goals-discover-contains-discover-goals': true,
      'body-text-page-goals-templates-contains-goal-templates': true,
      'body-text-page-goals-162-contains-back-to-goals': true,
      'body-text-page-goals-162-edit-contains-edit-your-goal': true,
      'body-text-page-goals-162-checkin-contains-log-a-check-in': true,
      'body-text-page-goals-162-reminder-contains-reminder-settings': true,
      'body-text-page-goals-162-buddy-actions-contains-send-buddy-support': true,
      'body-text-page-goals-162-insights-contains-goal-insights': true,
      'body-text-page-goals-162-history-contains-progress-history': true,
      'body-text-page-goals-162-social-contains-likes-and-comments': true,
      'body-text-page-blog-contains-blog': true,
      'body-text-page-feed-contains-feed': true,
      'body-text-page-feed-hashtags-contains-hashtags': true,
      'body-text-page-feed-hashtag-timebank-contains-timebank': true,
      'body-text-page-feed-item-listing-42-contains-view-listing': true,
      'body-text-page-feed-posts-796-contains-post': true,
      'body-text-page-feed-item-listing-90967-contains-view-listing': true,
      'body-text-page-feed-item-listing-90966-contains-view-listing': true,
      'body-text-page-feed-item-listing-90965-contains-view-listing': true,
      'body-text-page-feed-item-listing-90964-contains-view-listing': true,
      'body-text-page-feed-item-listing-90963-contains-view-listing': true,
      'body-text-page-feed-item-listing-90962-contains-view-listing': true,
      'body-text-page-blog-feed-xml-contains-rss-version-2-0': true,
      'body-text-page-blog-test-sitemap-blog-post-likers-like-contains-blog-reactions': true,
      'body-text-page-blog-timebank-ireland-likers-like-contains-blog-reactions': true,
      'body-text-page-blog-test-sitemap-blog-post-contains-back-to-the-blog': true,
      'body-text-page-blog-test-sitemap-blog-post-comments-contains-blog-discussion': true,
      'body-text-page-blog-timebank-ireland-contains-back-to-the-blog': true,
      'body-text-page-blog-timebank-ireland-comments-contains-blog-discussion': true,
      'body-text-page-podcasts-contains-podcasts': true,
      'body-text-page-podcasts-studio-contains-podcast-studio': true,
      'body-text-page-podcasts-studio-new-contains-create-a-podcast': true,
      'body-text-page-reviews-contains-reviews': true,
      'body-text-page-search-contains-search': true,
      'body-text-page-search-advanced-contains-advanced-search': true,
      'body-text-page-federation-contains-federation': true,
      'body-text-page-notifications-contains-notifications': true,
      'body-text-page-activity-contains-my-activity': true,
      'body-text-page-achievements-contains-achievements': true,
      'body-text-page-leaderboard-contains-leaderboard': true,
      'body-text-page-nexus-score-contains-nexus-score': true,
      'body-text-page-premium-contains-donate': true,
      'body-text-page-profile-settings-contains-edit-your-profile': true,
      'body-text-page-settings-appearance-contains-appearance': true,
      'body-text-page-settings-data-rights-contains-your-data-rights': true,
      'body-text-page-profile-delete-account-contains-delete-your-account': true,
      'body-text-page-profile-two-factor-contains-authenticator-app-two-step-verification': true,
      'body-text-page-profile-blocked-contains-blocked-members': true,
      'body-text-page-settings-availability-contains-your-availability': true,
      'body-text-page-settings-linked-accounts-contains-linked-accounts': true,
      'body-text-page-settings-insurance-contains-insurance-certificates': true,
      'body-text-page-activity-insights-contains-activity-insights': true,
      'body-text-page-achievements-shop-contains-xp-shop': true,
      'body-text-page-achievements-collections-contains-badge-collections': true,
      'body-text-page-achievements-engagement-contains-engagement-history': true,
      'body-text-page-achievements-showcase-contains-showcase-badges': true,
      'body-text-page-leaderboard-competitive-contains-competitive-leaderboard': true,
      'body-text-page-leaderboard-seasons-contains-leaderboard-seasons': true,
      'body-text-page-leaderboard-journey-contains-my-journey': true,
      'body-text-page-leaderboard-spotlight-contains-member-spotlight': true,
      'body-text-page-nexus-score-tiers-contains-nexus-tier-ladder': true,
      'body-text-page-federation-partners-contains-federation-partners': true,
      'body-text-page-federation-partners-1-contains-federation-partner': true,
      'body-text-page-federation-partners-5-contains-federation-partner': true,
      'body-text-page-federation-members-contains-federated-members': true,
      'body-text-page-federation-members-353-contains-federation-member': true,
      'body-text-page-federation-members-353-transfer-contains-send-time-credits': true,
      'body-text-page-federation-members-351-contains-federation-member': true,
      'body-text-page-federation-settings-contains-federation-settings': true,
      'body-text-page-federation-opt-in-contains-opt-in-to-federation': true,
      'body-text-page-federation-opt-out-contains-opt-out-of-federation': true,
      'body-text-page-federation-onboarding-contains-welcome-to-the-community-network': true,
      'body-text-page-federation-groups-contains-groups-from-partner-communities': true,
      'body-text-page-federation-listings-contains-federated-listings': true,
      'body-text-page-federation-events-contains-federated-events': true,
      'body-text-page-federation-connections-contains-federated-connections': true,
      'body-text-page-federation-messages-contains-federated-messages': true,
      'body-text-page-groups-contains-groups': true,
      'body-text-page-groups-new-contains-create-a-group': true,
      'body-text-page-groups-484-contains-group-events': true,
      'body-text-page-groups-484-invite-contains-invite-members': true,
      'body-text-page-groups-484-notifications-contains-notification-preferences': true,
      'body-text-page-groups-484-image-contains-group-images': true,
      'body-text-page-groups-484-announcements-contains-announcements': true,
      'body-text-page-groups-484-discussions-contains-discussions': true,
      'body-text-page-groups-484-discussions-new-contains-start-a-discussion': true,
      'body-text-page-groups-484-files-contains-group-files': true,
      'body-text-page-groups-484-manage-contains-manage-group': true,
      'body-text-page-groups-482-contains-group-events': true,
      'body-text-page-groups-482-announcements-contains-announcements': true,
      'body-text-page-groups-482-discussions-contains-discussions': true,
      'body-text-page-groups-482-discussions-new-contains-start-a-discussion': true,
      'body-text-page-groups-482-files-contains-group-files': true,
      'body-text-page-groups-482-manage-contains-manage-group': true,
      'body-text-page-groups-482-invite-contains-invite-members': true,
      'body-text-page-groups-482-notifications-contains-notification-preferences': true,
      'body-text-page-groups-482-image-contains-group-images': true
    }));
    expect(checkByName['body-text-page-chat-contains-ai-assistant'].text).toBe('AI assistant');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/chat').at(-1).cookie).toContain('token=signed-token');
  });

  it('refreshes the signed session before gated checks after long module-page batches', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests, { gatedRequiresFreshLogin: true });
    servers.push(laravel, web);

    const laravelBaseUrl = await listen(laravel);
    const webBaseUrl = await listen(web);
    const result = await runLaravelRuntimeSmoke({
      laravelBaseUrl,
      webBaseUrl,
      modulePagePaths: ['/explore'],
      unsignedAuthRequiredPagePaths: [],
      gatedPagePaths: [{ path: '/jobs/bias-audit', status: 403 }],
      redirectPagePaths: []
    });

    const checkByName = Object.fromEntries(result.checks.map((check) => [check.name, check]));
    expect(checkByName['gated-page-jobs-bias-audit-returns-403'].ok).toBe(true);
    expect(requests.filter((request) => request.method === 'POST' && request.url === '/login')).toHaveLength(2);
  });

  it('allows slower signed module pages in the default smoke timeout budget', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests, {
      delayedPaths: {
        '/profile/settings': 8500
      }
    });
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({
      laravelBaseUrl,
      webBaseUrl,
      modulePagePaths: ['/profile/settings'],
      bodyTextPagePaths: []
    });
    const profileSettingsCheck = result.checks.find((check) => check.name === 'module-page-profile-settings-renders');

    expect(result.ok).toBe(true);
    expect(profileSettingsCheck).toEqual(expect.objectContaining({
      ok: true,
      status: 200
    }));
  }, 15000);
});

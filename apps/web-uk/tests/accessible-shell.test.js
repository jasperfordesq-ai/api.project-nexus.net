const {
  buildFooterColumns,
  buildNavItems,
  buildShellLocals,
  prefixLocalPath
} = require('../src/lib/accessible-shell');

describe('accessible shell tenant gating', () => {
  const tenant = {
    name: 'Acme Timebank',
    slug: 'acme',
    modules: {
      dashboard: false,
      feed: false,
      listings: true
    },
    features: {
      connections: false,
      events: false,
      volunteering: true,
      blog: false
    }
  };

  it('matches Laravel Blade service navigation module and feature gates', () => {
    expect(buildNavItems({ isAuthenticated: false, tenant }).map((item) => item.key))
      .toEqual(['home', 'listings', 'volunteering']);

    expect(buildNavItems({ isAuthenticated: true, tenant }).map((item) => item.key))
      .toEqual(['listings', 'volunteering', 'explore']);
  });

  it('matches Laravel Blade footer platform link gates', () => {
    const columns = buildFooterColumns({ tenant });

    expect(columns.map((column) => column.key)).toEqual(['platform', 'support', 'legal']);
    expect(columns.find((column) => column.key === 'platform').links.map((link) => link.key))
      .toEqual(['listings', 'volunteering']);
  });

  it('prefixes only enabled tenant links in shell locals', () => {
    const locals = buildShellLocals({
      query: {},
      path: '/events',
      originalUrl: '/acme/accessible/events',
      accessibleRouting: {
        tenant,
        tenantSlug: 'acme',
        prefix: '/acme/accessible'
      }
    }, false);

    expect(locals.alphaNavItems.map((item) => [item.key, item.href])).toEqual([
      ['home', '/acme/accessible'],
      ['listings', '/acme/accessible/listings'],
      ['volunteering', '/acme/accessible/volunteering']
    ]);
    expect(locals.alphaFooterColumns.find((column) => column.key === 'platform').links.map((link) => link.href))
      .toEqual(['/acme/accessible/listings', '/acme/accessible/volunteering']);
  });

  it('does not double-prefix paths that are already inside the active tenant mount', () => {
    const prefix = '/acme/accessible';

    expect(prefixLocalPath('/cookies', prefix)).toBe('/acme/accessible/cookies');
    expect(prefixLocalPath('/acme/accessible', prefix)).toBe('/acme/accessible');
    expect(prefixLocalPath('/acme/accessible/cookies?status=saved', prefix))
      .toBe('/acme/accessible/cookies?status=saved');
    expect(prefixLocalPath('/acme/accessible?locale=ar', prefix))
      .toBe('/acme/accessible?locale=ar');
  });

  it('matches Laravel Blade Explore card feature gates from tenant bootstrap', () => {
    const locals = buildShellLocals({
      query: {},
      path: '/explore',
      originalUrl: '/acme/accessible/explore',
      accessibleRouting: {
        tenant: {
          ...tenant,
          modules: {
            ...tenant.modules,
            listings: false
          },
          features: {
            ...tenant.features,
            ai_chat: false,
            polls: true,
            search: false,
            groups: false,
            goals: false,
            resources: true,
            marketplace: false,
            job_vacancies: false,
            courses: true,
            podcasts: false,
            merchant_coupons: false,
            member_premium: false,
            ideation_challenges: true,
            federation: false
          }
        },
        tenantSlug: 'acme',
        prefix: '/acme/accessible'
      }
    }, true);

    expect(locals.alphaExploreLinks.map((item) => item.title)).toEqual([
      'Polls',
      'Search',
      'Skills',
      'Organisations',
      'Resources',
      'Courses',
      'Ideation'
    ]);
    expect(locals.alphaExploreLinks.map((item) => item.href)).toEqual([
      '/acme/accessible/polls',
      '/acme/accessible/search',
      '/acme/accessible/skills',
      '/acme/accessible/organisations',
      '/acme/accessible/resources',
      '/acme/accessible/courses',
      '/acme/accessible/ideation'
    ]);
  });
});

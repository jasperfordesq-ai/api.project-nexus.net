const {
  buildFooterColumns,
  buildNavItems,
  buildShellLocals
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
});

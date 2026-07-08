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
});

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
});

// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Shared accessible frontend preparation tests.
 *
 * These pin the future shared accessible shell against the Laravel Blade
 * accessible frontend's visual contract without claiming full workflow parity.
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');

jest.mock('../src/lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  },
  ApiOfflineError: class ApiOfflineError extends Error {
    constructor(message = 'Unable to connect') {
      super(message);
      this.name = 'ApiOfflineError';
      this.status = 503;
    }
  },
  login: jest.fn(),
  register: jest.fn(),
  validateToken: jest.fn(),
  getProfile: jest.fn(),
  getListings: jest.fn(),
  getBlogPosts: jest.fn(),
  getBlogPost: jest.fn(),
  getGoals: jest.fn(),
  getGoal: jest.fn(),
  getJobs: jest.fn(),
  getJob: jest.fn(),
  applyForJob: jest.fn(),
  getPolls: jest.fn(),
  getPoll: jest.fn(),
  votePoll: jest.fn(),
  getBalance: jest.fn(),
  getUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
  getNotificationUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
  getTransactions: jest.fn(),
  getVolunteerOrganisations: jest.fn().mockResolvedValue({ data: [] }),
  getVolunteerOrganisation: jest.fn(),
  getMyVolunteerOrganisations: jest.fn(),
  getVolunteerOpportunity: jest.fn(),
  getOrganisationOpportunities: jest.fn(),
  getOrganisationReviews: jest.fn(),
  getOrganisationJobs: jest.fn()
}));

process.env.COOKIE_SECRET = 'test-secret-at-least-32-characters';
process.env.SESSION_SECRET = 'test-session-secret-32-chars!!';
process.env.NODE_ENV = 'test';

describe('shared accessible frontend shell', () => {
  let app;

  beforeAll(() => {
    app = require('../src/server');
  });

  it('renders the Laravel-style accessible shell on the home page', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('class="nexus-alpha-header"');
    expect(response.text).toContain('Project NEXUS Accessible');
    expect(response.text).toContain('class="govuk-service-navigation"');
    expect(response.text).toContain('Beta');
    expect(response.text).toContain('Give feedback');
    expect(response.text).toContain('href="/volunteering"');
    expect(response.text).toContain('class="govuk-footer__navigation"');
    expect(response.text).toContain('Help centre');
    expect(response.text).toContain('Knowledge base');
    expect(response.text).toContain('Trust and safety');
    expect(response.text).toContain('Terms of service');
    expect(response.text).toContain('Privacy policy');
    expect(response.text).toContain('Community guidelines');
    expect(response.text).toContain('Acceptable use');
    expect(response.text).toContain('Cookie policy');
    expect(response.text).toContain('Accessibility statement');
    expect(response.text).toContain('Report a problem with this page');
    expect(response.text).toContain('href="/cookies"');
    expect(response.text).toContain('Project NEXUS is free software licensed under AGPL-3.0-or-later.');
    expect(response.text).toContain('View the source code on GitHub');
    expect(response.text).toContain('https://github.com/jasperfordesq-ai/nexus-v1');
  });

  it('renders the shared Explore skeleton from the Laravel accessible IA', async () => {
    const response = await request(app).get('/explore');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Explore');
    expect(response.text).toContain('class="nexus-alpha-card-list');
    expect(response.text).toContain('Exchanges');
    expect(response.text).toContain('AI assistant');
    expect(response.text).toContain('Polls');
    expect(response.text).toContain('Marketplace');
    expect(response.text).toContain('Federation');
    expect(response.text).toContain('Recent listings');
    expect(response.text).toContain('Upcoming events');
    expect(response.text).toContain('This page is a shared-accessible-frontend preparation skeleton');
  });

  it('serves preparation skeletons for Blade footer destinations that are not certified yet', async () => {
    const response = await request(app).get('/legal/community-guidelines');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Community guidelines');
    expect(response.text).toContain('shared accessible frontend preparation page');
    expect(response.text).toContain('does not certify ASP.NET route or workflow');
  });

  it('renders the Blade-style organisations directory and registration form as a local candidate', async () => {
    const staticPageRoutes = require('../src/routes/static-pages');
    const api = require('../src/lib/api');
    api.getVolunteerOrganisations.mockResolvedValueOnce({
      data: [
        {
          id: 42,
          name: 'Community Club',
          description: 'A volunteer organisation supporting local residents with practical help and events.'
        }
      ],
      meta: { per_page: 30, has_more: false }
    });

    const response = await request(app).get('/organisations?q=club');

    expect(staticPageRoutes.pages['/organisations']).toBeUndefined();
    expect(api.getVolunteerOrganisations).toHaveBeenCalledWith({ search: 'club', per_page: 30 });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Organisations');
    expect(response.text).toContain('Community and partner organisations.');
    expect(response.text).toContain('href="/organisations/browse"');
    expect(response.text).toContain('Browse all organisations');
    expect(response.text).toContain('href="/organisations/register"');
    expect(response.text).toContain('Register an organisation');
    expect(response.text).toContain('href="/organisations/manage"');
    expect(response.text).toContain('Manage my organisations');
    expect(response.text).toContain('action="/organisations"');
    expect(response.text).toContain('Find an organisation');
    expect(response.text).toContain('value="club"');
    expect(response.text).toContain('href="/organisations/42"');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('A volunteer organisation supporting local residents');
    expect(response.text).not.toContain('There are no organisations listed yet.');
    expect(response.text).toContain('New organisations are reviewed before they appear.');
    expect(response.text).toContain('Organisation registration terms');
    expect(response.text).toContain('I have read and agree to the organisation registration terms above.');
    expect(response.text).toContain('Submit for approval');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('keeps the organisations page usable when the Laravel organisations API is unavailable', async () => {
    const api = require('../src/lib/api');
    api.getVolunteerOrganisations.mockRejectedValueOnce(new api.ApiOfflineError());

    const response = await request(app).get('/organisations');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Organisations');
    expect(response.text).toContain('Organisation listings are temporarily unavailable.');
    expect(response.text).toContain('There are no organisations listed yet.');
  });

  it('renders the Blade-style paginated organisations browse page from Laravel data', async () => {
    const api = require('../src/lib/api');
    api.getVolunteerOrganisations.mockResolvedValueOnce({
      data: [
        {
          id: 42,
          name: 'Community Club',
          description: 'A volunteer organisation supporting local residents with practical help and events.',
          website: 'https://example.test',
          public_contract: {
            stats: {
              opportunity_count: 2,
              volunteer_count: 5,
              total_hours: 17.5,
              average_rating: 4.5
            }
          }
        }
      ],
      meta: { cursor: 'next-cursor', per_page: 20, has_more: true }
    });

    const response = await request(app).get('/organisations/browse?q=club&cursor=abc');

    expect(api.getVolunteerOrganisations).toHaveBeenCalledWith({ search: 'club', per_page: 20, cursor: 'abc' });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Organisations in Project NEXUS Accessible');
    expect(response.text).toContain('Browse organisations');
    expect(response.text).toContain('Find volunteer organisations in your community and the opportunities they offer.');
    expect(response.text).toContain('href="/organisations/register"');
    expect(response.text).toContain('Register an organisation');
    expect(response.text).toContain('action="/organisations/browse"');
    expect(response.text).toContain('Search organisations');
    expect(response.text).toContain('value="club"');
    expect(response.text).toContain('1 organisation');
    expect(response.text).toContain('href="/organisations/42"');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('2 opportunities');
    expect(response.text).toContain('5 volunteers');
    expect(response.text).toContain('17.5 hours logged');
    expect(response.text).toContain('Has a website');
    expect(response.text).toContain('href="/organisations/browse?q=club&amp;cursor=next-cursor"');
    expect(response.text).toContain('Load more organisations');
  });

  it('renders the Blade-style organisation register form as a non-persistent preparation page', async () => {
    const response = await request(app).get('/organisations/register?status=org-email-invalid');

    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/organisations/browse"');
    expect(response.text).toContain('Back to organisations');
    expect(response.text).toContain('Organisations in Project NEXUS Accessible');
    expect(response.text).toContain('Register a volunteer organisation');
    expect(response.text).toContain('List your organisation so volunteers can find your opportunities.');
    expect(response.text).toContain('There is a problem');
    expect(response.text).toContain('href="#email"');
    expect(response.text).toContain('Enter a valid contact email address');
    expect(response.text).toContain('method="post" action="/organisations/register"');
    expect(response.text).toContain('name="_csrf"');
    expect(response.text).toContain('Organisation name');
    expect(response.text).toContain('Use the full, recognised name of your organisation.');
    expect(response.text).toContain('Contact email address');
    expect(response.text).toContain('Volunteers and administrators will use this to contact you.');
    expect(response.text).toContain('Before you register');
    expect(response.text).toContain('I confirm the above and agree to the community guidelines.');
    expect(response.text).toContain('Register organisation');
    expect(response.text).toContain('Cancel');
    expect(response.text).toContain('Your organisation will be reviewed by an administrator before it is listed.');
  });

  it('renders the Blade-style manage organisations page as a local preparation page', async () => {
    const api = require('../src/lib/api');

    const response = await request(app).get('/organisations/manage');

    expect(api.getMyVolunteerOrganisations).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/organisations/browse"');
    expect(response.text).toContain('Back to organisations');
    expect(response.text).toContain('Organisations in Project NEXUS Accessible');
    expect(response.text).toContain('Manage my organisations');
    expect(response.text).toContain('Organisations you own or help administer.');
    expect(response.text).toContain('You do not manage any organisations');
    expect(response.text).toContain('When you own or administer an organisation, it will appear here.');
    expect(response.text).toContain('href="/organisations/register"');
    expect(response.text).toContain('Register an organisation');
    expect(response.text).toContain('Sign in to load your Laravel-backed organisations.');
  });

  it('renders manageable and pending organisation rows from the Laravel my-organisations contract', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getMyVolunteerOrganisations.mockResolvedValueOnce({
      items: [
        {
          id: 42,
          name: 'Community Club',
          status: 'approved',
          member_role: 'owner'
        },
        {
          id: 99,
          name: 'New Mutual Aid Group',
          status: 'pending',
          member_role: 'owner'
        }
      ]
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/organisations/manage')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getMyVolunteerOrganisations).toHaveBeenCalledWith('test-token', { per_page: 50 });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('Your role');
    expect(response.text).toContain('Owner');
    expect(response.text).toContain('href="/volunteering/organisations/42/manage"');
    expect(response.text).toContain('Open dashboard');
    expect(response.text).toContain('href="/organisations/42"');
    expect(response.text).toContain('View organisation');
    expect(response.text).toContain('Awaiting approval');
    expect(response.text).toContain('New Mutual Aid Group');
    expect(response.text).toContain('This organisation is awaiting administrator approval.');
  });

  it('renders the Blade-style organisation detail page from the Laravel public organisation contract', async () => {
    const api = require('../src/lib/api');
    api.getVolunteerOrganisation.mockResolvedValueOnce({
      data: {
        id: 42,
        name: 'Community Club',
        description: 'A volunteer organisation supporting local residents with practical help and events.',
        contact_email: 'hello@example.test',
        website: 'https://example.test',
        public_contract: {
          id: 42,
          name: 'Community Club',
          description: 'A volunteer organisation supporting local residents with practical help and events.',
          contact_email: 'hello@example.test',
          website: 'https://example.test',
          stats: {
            opportunity_count: 2,
            volunteer_count: 5,
            total_hours: 17.5,
            review_count: 1,
            average_rating: 4.5
          }
        }
      }
    });
    api.getOrganisationOpportunities.mockResolvedValueOnce({
      data: [
        {
          id: 77,
          title: 'Community Kitchen Helper',
          description: 'Help prepare meals and welcome visitors at a weekly community kitchen.',
          is_remote: true
        }
      ],
      meta: { per_page: 10, has_more: false }
    });
    api.getOrganisationReviews.mockResolvedValueOnce({
      data: {
        reviews: [
          {
            id: 12,
            rating: 5,
            comment: 'Helpful and welcoming.',
            author: { name: 'Aisha Khan' }
          }
        ]
      }
    });

    const response = await request(app).get('/organisations/42');

    expect(api.getVolunteerOrganisation).toHaveBeenCalledWith('42');
    expect(api.getOrganisationOpportunities).toHaveBeenCalledWith('42', { per_page: 10 });
    expect(api.getOrganisationReviews).toHaveBeenCalledWith('42');
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/organisations"');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('A volunteer organisation supporting local residents');
    expect(response.text).toContain('href="mailto:hello@example.test"');
    expect(response.text).toContain('href="https://example.test"');
    expect(response.text).toContain('href="/organisations/42/jobs"');
    expect(response.text).toContain('View job openings');
    expect(response.text).toContain('About this organisation');
    expect(response.text).toContain('Open opportunities');
    expect(response.text).toContain('2');
    expect(response.text).toContain('Volunteers');
    expect(response.text).toContain('5');
    expect(response.text).toContain('Hours contributed');
    expect(response.text).toContain('17.5');
    expect(response.text).toContain('Volunteer reviews');
    expect(response.text).toContain('Open volunteering opportunities posted by Community Club.');
    expect(response.text).toContain('href="/volunteering/opportunities/77"');
    expect(response.text).toContain('Community Kitchen Helper');
    expect(response.text).toContain('Remote');
    expect(response.text).toContain('View opportunity');
    expect(response.text).toContain('href="/organisations/opportunities/77/apply"');
    expect(response.text).toContain('Apply to volunteer');
    expect(response.text).toContain('Aisha Khan');
    expect(response.text).toContain('5 out of 5');
    expect(response.text).toContain('Helpful and welcoming.');
    expect(response.text).not.toContain('There are no current volunteering opportunities at this organisation.');
    expect(response.text).not.toContain('This organisation has no reviews yet.');
  });

  it('renders the Blade-style organisation jobs page from the Laravel jobs contract', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getVolunteerOrganisation.mockResolvedValueOnce({
      data: {
        id: 42,
        name: 'Community Club',
        description: 'A volunteer organisation supporting local residents.',
        public_contract: {
          id: 42,
          name: 'Community Club',
          description: 'A volunteer organisation supporting local residents.'
        }
      }
    });
    api.getOrganisationJobs.mockResolvedValueOnce({
      items: [
        {
          id: 501,
          title: 'Volunteer Coordinator',
          type: 'volunteer',
          is_remote: true,
          deadline: '2026-08-01'
        },
        {
          id: 502,
          title: 'Paid Outreach Lead',
          type: 'paid',
          location: 'Cork'
        }
      ],
      meta: { limit: 20 }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/organisations/42/jobs')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getVolunteerOrganisation).toHaveBeenCalledWith('42');
    expect(api.getOrganisationJobs).toHaveBeenCalledWith('42', 'test-token', { limit: 20 });
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/organisations/42"');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('Organisations in Project NEXUS Accessible');
    expect(response.text).toContain('Job openings at Community Club');
    expect(response.text).toContain('Open roles posted by this organisation.');
    expect(response.text).toContain('2 openings');
    expect(response.text).toContain('href="/jobs/501"');
    expect(response.text).toContain('Volunteer Coordinator');
    expect(response.text).toContain('Volunteer');
    expect(response.text).toContain('Remote');
    expect(response.text).toContain('Closes');
    expect(response.text).toContain('Paid Outreach Lead');
    expect(response.text).toContain('Paid');
    expect(response.text).toContain('Cork');
    expect(response.text).toContain('View role');
  });

  it('renders the organisation jobs page as a local preparation page when unsigned', async () => {
    const api = require('../src/lib/api');
    api.getOrganisationJobs.mockClear();
    api.getVolunteerOrganisation.mockResolvedValueOnce({
      data: {
        id: 42,
        name: 'Community Club',
        public_contract: {
          id: 42,
          name: 'Community Club'
        }
      }
    });

    const response = await request(app).get('/organisations/42/jobs');

    expect(api.getVolunteerOrganisation).toHaveBeenCalledWith('42');
    expect(api.getOrganisationJobs).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Job openings at Community Club');
    expect(response.text).toContain('This organisation has no open job openings at the moment.');
    expect(response.text).toContain('Sign in to load Laravel-backed job openings.');
  });

  it('renders the Blade-style organisation opportunity apply page from the Laravel volunteering contract', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getVolunteerOpportunity.mockResolvedValueOnce({
      data: {
        id: 77,
        title: 'Community Kitchen Helper',
        organization_id: 42,
        org_name: 'Community Club',
        has_applied: false
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/organisations/opportunities/77/apply')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getVolunteerOpportunity).toHaveBeenCalledWith('77', 'test-token');
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/organisations/42"');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('Organisations in Project NEXUS Accessible');
    expect(response.text).toContain('Apply for this opportunity');
    expect(response.text).toContain('Opportunity');
    expect(response.text).toContain('href="/volunteering/opportunities/77"');
    expect(response.text).toContain('Community Kitchen Helper');
    expect(response.text).toContain('Organisation');
    expect(response.text).toContain('method="post" action="/volunteering/opportunities/77/apply"');
    expect(response.text).toContain('name="_csrf"');
    expect(response.text).toContain('Message to the organiser (optional)');
    expect(response.text).toContain('Tell the organiser why you would like to help. You can leave this blank.');
    expect(response.text).toContain('The organiser will be notified of your application and will review it.');
    expect(response.text).toContain('Send application');
    expect(response.text).toContain('Cancel');
  });

  it('renders the organisation opportunity apply page as a local preparation page when unsigned', async () => {
    const api = require('../src/lib/api');
    api.getVolunteerOpportunity.mockResolvedValueOnce({
      data: {
        id: 77,
        title: 'Community Kitchen Helper',
        organization_id: 42,
        org_name: 'Community Club',
        has_applied: false
      }
    });

    const response = await request(app).get('/organisations/opportunities/77/apply');

    expect(api.getVolunteerOpportunity).toHaveBeenCalledWith('77', '');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Apply for this opportunity');
    expect(response.text).toContain('Community Kitchen Helper');
    expect(response.text).toContain('Sign in to send a Laravel-backed volunteer application.');
    expect(response.text).not.toContain('method="post" action="/volunteering/opportunities/77/apply"');
  });

  it('keeps the rendered footer clear of official government identity claims', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).not.toContain('© Crown copyright');
    expect(response.text).not.toContain('Open Government Licence');
    expect(response.text).not.toContain('GOV.UK service');
  });

  it('documents official GOV.UK upstream repositories and shared-frontend status', () => {
    const docsPath = path.join(__dirname, '..', 'docs', 'ACCESSIBLE_SHARED_FRONTEND.md');
    const docs = fs.readFileSync(docsPath, 'utf8');

    expect(docs).toContain('alphagov/govuk-frontend');
    expect(docs).toContain('alphagov/govuk-design-system');
    expect(docs).toContain('future shared accessible frontend candidate');
    expect(docs).toContain('does not certify production readiness');
    expect(docs).toContain('LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md');
    expect(docs).toContain('BLADE_COMPONENT_PORT_AUDIT.md');
    expect(docs).toContain('BACKEND_SWITCHING_CONTRACT.md');
  });

  it('documents route matrix and backend-switching preparation without readiness claims', () => {
    const matrix = fs.readFileSync(path.join(__dirname, '..', 'docs', 'LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md'), 'utf8');
    const contract = fs.readFileSync(path.join(__dirname, '..', 'docs', 'BACKEND_SWITCHING_CONTRACT.md'), 'utf8');

    expect(matrix).toContain('Laravel `govuk-alpha*`');
    expect(matrix).toContain('| Organisations | `/organisations`, `/organisations/browse`, `/organisations/register`, `/organisations/manage`, `/organisations/{id}`, `/organisations/{id}/jobs`, `/organisations/opportunities/{id}/apply` | `/organisations`, `/organisations/browse`, `/organisations/register`, `/organisations/manage`, `/organisations/:id`, `/organisations/:id/jobs`, `/organisations/opportunities/:id/apply` | Partial Laravel-backed candidate: directory/search and browse render `/api/v2/volunteering/organisations`; register and manage GET render Blade-style forms/pages; manage calls `/api/v2/volunteering/my-organisations` when signed in; detail renders `/api/v2/volunteering/organisations/{id}?include=public_contract`, `/api/v2/volunteering/opportunities?organization_id={id}`, and `/api/v2/volunteering/reviews/organization/{id}`; jobs reads `/api/v2/jobs?organization_id={id}&status=open` when signed in; apply GET reads `/api/v2/volunteering/opportunities/{id}`; auth/tenant gates not certified. |');
    expect(matrix).toContain('It does not certify route parity');
    expect(contract).toContain('Its default backend contract is now Laravel-first');
    expect(contract).toContain('| `ACCESSIBLE_BACKEND_TARGET` | `laravel` | Laravel is the default backend contract target. |');
    expect(contract).toContain('ASP.NET must become');
  });
});

// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  generateApiConsumerLedger,
  normalizePath,
  parseJavaScript,
  staticValue
} = require('../scripts/generate-api-consumer-ledger');

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

describe('frontend API consumer ledger generator', () => {
  let root;
  let webUkRoot;
  let laravelRoot;
  let outDir;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'web-uk-api-ledger-'));
    webUkRoot = path.join(root, 'web-uk');
    laravelRoot = path.join(root, 'laravel');
    outDir = path.join(root, 'generated');

    writeFile(path.join(webUkRoot, 'src', 'lib', 'api.js'), `
async function request() {}
async function getEvent(token, id) {
  return request(\`/api/v2/events/\${encodeURIComponent(id)}\`, {
    headers: { Authorization: \`Bearer \${token}\` }
  });
}
async function callEventApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : \`/\${path}\`) : '';
  const options = { method, headers: { Authorization: \`Bearer \${token}\` } };
  if (data !== undefined) options.body = JSON.stringify(data);
  return request(\`/api/v2/events\${normalizedPath}\`, options);
}
module.exports = { getEvent, callEventApi };
`);

    writeFile(path.join(webUkRoot, 'src', 'routes', 'events.js'), `
const { URLSearchParams } = require('url');
const { getEvent, callEventApi } = require('../lib/api');
async function show(token, id) { return getEvent(token, id); }
async function eventApi(token, method, path, data = undefined) {
  return data === undefined
    ? callEventApi(token, method, path)
    : callEventApi(token, method, path, data);
}
async function publish(token, id) {
  return eventApi(token, 'POST', \`/\${id}/publish\`, { confirmation: 'publish' });
}
module.exports = { show, publish };
`);

    writeFile(path.join(webUkRoot, 'tests', 'events.test.js'), `
describe('events contract', () => {
  it('uses getEvent and callEventApi', () => {
    expect('/api/v2/events/42/publish').toContain('/publish');
  });
});
`);

    writeFile(path.join(laravelRoot, 'openapi.json'), JSON.stringify({
      openapi: '3.0.3',
      paths: {
        '/api/v2/events/{id}': {
          get: {
            operationId: 'Events_show',
            'x-controller-action': 'App\\Http\\Controllers\\Api\\EventsController@show',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true }],
            responses: { 200: { description: 'ok' }, 404: { description: 'missing' } }
          }
        },
        '/api/v2/events/{id}/publish': {
          post: {
            operationId: 'Events_publish',
            'x-controller-action': 'App\\Http\\Controllers\\Api\\EventsController@publish',
            security: [{ bearerAuth: [] }],
            requestBody: {
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/EventPublishRequest' } }
              }
            },
            responses: { 200: { description: 'ok' }, 422: { description: 'invalid' } }
          }
        }
      }
    }, null, 2));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('normalizes endpoint placeholders without discarding method identity', () => {
    const ast = parseJavaScript('const value = `/api/v2/events/${encodeURIComponent(id)}`;');
    const template = ast.body[0].declarations[0].init;
    expect(staticValue(template)).toBe('/api/v2/events/{id}');
    expect(normalizePath('/api/v2/events/{eventId}?include=people')).toBe('/api/v2/events/{param}');
  });

  it('matches direct and wrapper callsites to Laravel and records safety evidence', () => {
    const report = generateApiConsumerLedger({ webUkRoot, laravelRoot, outDir });
    const getRow = report.rows.find((row) => row.method === 'GET' && row.path === '/api/v2/events/{param}');
    const publishRow = report.rows.find((row) => row.method === 'POST' && row.path === '/api/v2/events/{param}/publish');

    expect(report.summary.contracts).toBe(2);
    expect(report.summary.matchedOpenApi).toBe(2);
    expect(getRow).toEqual(expect.objectContaining({
      apiHelper: 'getEvent',
      sideEffects: 'read-only by HTTP method',
      cleanup: 'not applicable'
    }));
    expect(getRow.laravel).toEqual(expect.objectContaining({
      operationId: 'Events_show',
      controllerAction: 'App\\Http\\Controllers\\Api\\EventsController@show'
    }));
    expect(getRow.frontendConsumers).toEqual(['src/routes/events.js']);
    expect(getRow.tests).toEqual(['tests/events.test.js']);

    expect(publishRow).toEqual(expect.objectContaining({
      apiHelper: 'callEventApi',
      sideEffects: 'state-changing; disposable-environment runtime proof required',
      cleanup: 'fixture-specific cleanup and final absence/equality proof required',
      requestShape: 'application/json schema:EventPublishRequest'
    }));
    expect(publishRow.statusCodes).toEqual(['200', '422']);
    expect(fs.existsSync(path.join(outDir, 'frontend-api-consumer-ledger.json'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'frontend-api-consumer-ledger.md'))).toBe(true);
  });
});

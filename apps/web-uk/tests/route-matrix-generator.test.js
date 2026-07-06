// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  generateAccessibleRouteMatrix
} = require('../scripts/generate-accessible-route-matrix');

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

describe('accessible route matrix generator', () => {
  let fixtureRoot;
  let sourceRoot;
  let targetRoot;
  let outDir;

  beforeEach(() => {
    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'web-uk-route-matrix-'));
    sourceRoot = path.join(fixtureRoot, 'laravel');
    targetRoot = path.join(fixtureRoot, 'aspnet');
    outDir = path.join(fixtureRoot, 'out');

    writeFile(path.join(sourceRoot, 'routes', 'govuk-alpha.php'), `
<?php
use App\\Http\\Controllers\\GovukAlpha\\AlphaController;
use Illuminate\\Support\\Facades\\Route;

Route::get('/dashboard', [AlphaController::class, 'dashboard'])->name('dashboard');
Route::get('/onboarding', [AlphaController::class, 'onboarding'])->name('onboarding');
Route::post('/report-a-problem', [AlphaController::class, 'storeReportProblem'])
    ->middleware('throttle:10,1')
    ->name('report-problem.store');
`);

    writeFile(path.join(sourceRoot, 'routes', 'govuk-alpha-parity', 'resources.php'), `
<?php
Route::get('/resources', [AlphaController::class, 'resourcesLibrary'])
    ->name('resources.index');
`);

    writeFile(path.join(sourceRoot, 'app', 'Http', 'Controllers', 'GovukAlpha', 'AlphaController.php'), `
<?php
class AlphaController
{
    public function dashboard(Request $request, string $tenantSlug): Response|RedirectResponse
    {
        $this->assertTenantSlug($tenantSlug);
        abort_unless(TenantContext::hasFeature('dashboard'), 403);
        if ($this->currentUserId() === null) {
            return redirect()->route('govuk-alpha.login', ['tenantSlug' => $tenantSlug]);
        }

        return $this->view('accessible-frontend::dashboard', [
            'title' => 'Dashboard',
        ]);
    }

    public function onboarding(Request $request, string $tenantSlug): Response
    {
        $this->assertTenantSlug($tenantSlug);

        return $this->view('accessible-frontend::onboarding', [
            'title' => 'Onboarding',
        ]);
    }

    public function storeReportProblem(Request $request, string $tenantSlug): RedirectResponse
    {
        $this->assertTenantSlug($tenantSlug);
        return redirect()->route('govuk-alpha.home', ['tenantSlug' => $tenantSlug]);
    }
}
`);

    writeFile(path.join(sourceRoot, 'app', 'Http', 'Controllers', 'GovukAlpha', 'Concerns', 'ResourcesParity.php'), `
<?php
trait ResourcesParity
{
    public function resourcesLibrary(Request $request, string $tenantSlug): Response
    {
        $this->assertTenantSlug($tenantSlug);
        abort_unless(TenantContext::hasModule('resources'), 403);

        return $this->view('accessible-frontend::resources-library', [
            'title' => 'Resources',
        ]);
    }
}
`);

    writeFile(path.join(targetRoot, 'apps', 'web-uk', 'src', 'server.js'), `
const express = require('express');
const dashboardRoutes = require('./routes/dashboard');
const staticPageRoutes = require('./routes/static-pages');
const app = express();

app.post('/report-a-problem', (req, res) => res.redirect('/'));
app.use('/dashboard', dashboardRoutes);
app.use(staticPageRoutes);
`);

    writeFile(path.join(targetRoot, 'apps', 'web-uk', 'src', 'routes', 'dashboard.js'), `
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('dashboard/index', { title: 'Dashboard' });
});

module.exports = router;
`);

    writeFile(path.join(targetRoot, 'apps', 'web-uk', 'src', 'routes', 'static-pages.js'), `
const express = require('express');
const router = express.Router();

const pages = {
  '/resources': {
    title: 'Resources'
  }
};

router.get(Object.keys(pages), (req, res) => {
  res.render('static-page', pages[req.path]);
});

module.exports = router;
`);
  });

  afterEach(() => {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('maps Laravel routes to Blade views and Express equivalents', () => {
    const report = generateAccessibleRouteMatrix({ sourceRoot, targetRoot, outDir });
    const route = (method, routePath) => report.matrix.find(
      (row) => row.method === method && row.path === routePath
    );

    expect(report.summary.laravelRoutes).toBe(4);
    expect(report.summary.webUkRoutes).toBe(3);
    expect(report.summary.matchedRoutes).toBe(3);
    expect(report.summary.missingRoutes).toBe(1);

    expect(route('GET', '/dashboard')).toEqual(expect.objectContaining({
      status: 'matched',
      laravelHandler: 'dashboard',
      laravelView: 'dashboard',
      webUkView: 'dashboard/index',
      auth: 'auth-required',
      gates: 'feature:dashboard'
    }));

    expect(route('GET', '/resources')).toEqual(expect.objectContaining({
      status: 'matched',
      laravelHandler: 'resourcesLibrary',
      laravelView: 'resources-library',
      webUkView: 'static-page',
      gates: 'module:resources'
    }));

    expect(route('GET', '/onboarding')).toEqual(expect.objectContaining({
      status: 'missing',
      laravelHandler: 'onboarding',
      laravelView: 'onboarding'
    }));

    expect(fs.existsSync(path.join(outDir, 'accessible-route-matrix.json'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'accessible-route-matrix.csv'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'accessible-route-matrix.md'))).toBe(true);
  });
});

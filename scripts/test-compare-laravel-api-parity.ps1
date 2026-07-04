# Copyright 2024-2026 Jasper Ford
# SPDX-License-Identifier: AGPL-3.0-or-later
# Author: Jasper Ford
# See NOTICE file for attribution and acknowledgements.

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$scriptPath = Join-Path $repoRoot 'scripts\compare-laravel-api-parity.ps1'

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

$fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("nexus-api-parity-fixture-" + [Guid]::NewGuid().ToString('N'))
$sourceRoot = Join-Path $fixtureRoot 'laravel'
$targetRoot = Join-Path $fixtureRoot 'aspnet'
$outDir = Join-Path $fixtureRoot 'out'

try {
    New-Item -ItemType Directory -Force -Path $sourceRoot, $targetRoot, $outDir | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $sourceRoot 'routes') | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $targetRoot 'src\Nexus.Api\Controllers') | Out-Null

    @'
{
  "openapi": "3.0.1",
  "info": { "title": "Fixture API", "version": "1.0.0" },
  "paths": {
    "/api/v2/listings": {
      "get": {},
      "post": {}
    },
    "/api/v2/listings/{id}": {
      "get": {},
      "delete": {}
    },
    "/api/v2/missing-feature": {
      "post": {}
    }
  }
}
'@ | Set-Content -LiteralPath (Join-Path $sourceRoot 'openapi.json')

    @'
Route::post('/v2/supplemental/{id}', [SupplementalController::class, 'store']);
'@ | Set-Content -LiteralPath (Join-Path $sourceRoot 'routes\supplemental-routes.txt')

    @'
<?php

use Illuminate\Support\Facades\Route;

Route::post('/v2/supplemental/{id}', [SupplementalController::class, 'storeFromApi']);
'@ | Set-Content -LiteralPath (Join-Path $sourceRoot 'routes\api.php')

    New-Item -ItemType Directory -Force -Path (Join-Path $sourceRoot 'routes\govuk-alpha-parity') | Out-Null

    @'
<?php

use Illuminate\Support\Facades\Route;

Route::get('/about', [AccessiblePageController::class, 'about']);
'@ | Set-Content -LiteralPath (Join-Path $sourceRoot 'routes\govuk-alpha.php')

    @'
<?php

use Illuminate\Support\Facades\Route;

Route::get('/jobs/{id}', [AccessibleJobsController::class, 'show']);
'@ | Set-Content -LiteralPath (Join-Path $sourceRoot 'routes\govuk-alpha-parity\jobs.php')

    @'
using Microsoft.AspNetCore.Mvc;

namespace Fixture.Controllers;

[ApiController]
[Route("api/listings")]
public sealed class ListingsController : ControllerBase
{
    [HttpGet]
    public IActionResult Index() => Ok();

    [HttpPost]
    public IActionResult Store() => Ok();

    [HttpGet("{id:int}")]
    public IActionResult Show(int id) => Ok();
}

[ApiController]
[Route("api/supplemental")]
public sealed class SupplementalController : ControllerBase
{
    [HttpPost("{id:guid}")]
    public IActionResult Store(Guid id) => Ok();
}
'@ | Set-Content -LiteralPath (Join-Path $targetRoot 'src\Nexus.Api\Controllers\ListingsController.cs')

    & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath -TargetRoot $targetRoot -SourceRoot $sourceRoot -OutDir $outDir
    if ($LASTEXITCODE -ne 0) {
        throw "compare-laravel-api-parity.ps1 exited with $LASTEXITCODE"
    }

    $jsonPath = Join-Path $outDir 'api-parity.json'
    $markdownPath = Join-Path $outDir 'api-parity.md'
    Assert-True (Test-Path -LiteralPath $jsonPath) 'Expected api-parity.json to be written.'
    Assert-True (Test-Path -LiteralPath $markdownPath) 'Expected api-parity.md to be written.'

    $report = Get-Content -Raw -LiteralPath $jsonPath | ConvertFrom-Json
    $matrix = @($report.matrix)

    Assert-True ($report.summary.aspnet_operations -eq 4) 'Expected four ASP.NET operations.'
    Assert-True ($report.summary.laravel_openapi_operations -eq 5) 'Expected five Laravel OpenAPI operations.'
    Assert-True ($report.summary.supplemental_route_operations -eq 1) 'Expected one supplemental route operation.'
    Assert-True ($report.summary.matched_operations -eq 4) 'Expected four matched operations.'
    Assert-True ($report.summary.missing_operations -eq 2) 'Expected two missing operations.'

    Assert-True (@($matrix | Where-Object { $_.source -eq 'openapi' -and $_.method -eq 'GET' -and $_.normalized_path -eq '/api/listings' -and $_.status -eq 'matched' }).Count -eq 1) 'Expected GET /api/listings to match.'
    Assert-True (@($matrix | Where-Object { $_.source -eq 'supplemental-route' -and $_.method -eq 'POST' -and $_.normalized_path -eq '/api/supplemental/{id}' -and $_.status -eq 'matched' }).Count -eq 1) 'Expected supplemental route to match by shape.'
    $supplementalRow = @($matrix | Where-Object { $_.source -eq 'supplemental-route' -and $_.method -eq 'POST' -and $_.normalized_path -eq '/api/supplemental/{id}' })[0]
    Assert-True ($supplementalRow.source_file.Contains('api.php')) 'Expected duplicate supplemental source evidence to include api.php.'
    Assert-True ($supplementalRow.source_file.Contains('supplemental-routes.txt')) 'Expected duplicate supplemental source evidence to include supplemental-routes.txt.'
    Assert-True (@($matrix | Where-Object { $_.source -eq 'openapi' -and $_.method -eq 'DELETE' -and $_.normalized_path -eq '/api/listings/{id}' -and $_.status -eq 'missing' }).Count -eq 1) 'Expected DELETE /api/listings/{id} to be missing.'

    $markdown = Get-Content -Raw -LiteralPath $markdownPath
    Assert-True ($markdown.Contains('/api/missing-feature')) 'Expected markdown report to include missing-feature gap.'

    Write-Host 'compare-laravel-api-parity tests passed.'
} finally {
    if (Test-Path -LiteralPath $fixtureRoot) {
        Remove-Item -LiteralPath $fixtureRoot -Recurse -Force
    }
}

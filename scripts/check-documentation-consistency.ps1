# Copyright (c) 2024-2026 Jasper Ford
# SPDX-License-Identifier: AGPL-3.0-or-later
# Author: Jasper Ford

[CmdletBinding()]
param(
    [Parameter()]
    [string]$RepositoryRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
    $RepositoryRoot = Split-Path -Parent $PSScriptRoot
}

$root = [System.IO.Path]::GetFullPath($RepositoryRoot)
$failures = [System.Collections.Generic.List[string]]::new()

function Add-Failure {
    param([Parameter(Mandatory)][string]$Message)
    $script:failures.Add($Message)
}

function Get-DocumentText {
    param([Parameter(Mandatory)][string]$RelativePath)

    $path = Join-Path $root $RelativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        Add-Failure "Missing required documentation file: $RelativePath"
        return $null
    }

    return [System.IO.File]::ReadAllText($path)
}

function Assert-Contains {
    param(
        [Parameter(Mandatory)][string]$RelativePath,
        [Parameter(Mandatory)][AllowEmptyString()][string]$Text,
        [Parameter(Mandatory)][string]$Pattern,
        [Parameter(Mandatory)][string]$Description
    )

    if ($Text -notmatch $Pattern) {
        Add-Failure "${RelativePath}: $Description"
    }
}

function Assert-NotContains {
    param(
        [Parameter(Mandatory)][string]$RelativePath,
        [Parameter(Mandatory)][AllowEmptyString()][string]$Text,
        [Parameter(Mandatory)][string]$Pattern,
        [Parameter(Mandatory)][string]$Description
    )

    if ($Text -match $Pattern) {
        Add-Failure "${RelativePath}: $Description"
    }
}

function Get-NonHistoricalRegion {
    param([Parameter(Mandatory)][string]$Text)

    if ($Text -match '(?im)^(?:>\s*)?Status:\s*\*{0,2}Historical (?:checkpoint|archive)') {
        return $null
    }

    $builder = [System.Text.StringBuilder]::new()
    $includeSection = $true
    foreach ($line in [regex]::Split($Text, "`r?`n")) {
        if ($line -match '^##\s+') {
            $includeSection = $line -notmatch '(?i)^##\s+Historical\b'
        }
        if ($includeSection) {
            [void]$builder.AppendLine($line)
        }
    }

    return $builder.ToString()
}

function Get-OpeningRegion {
    param(
        [Parameter(Mandatory)][string]$Text,
        [int]$LineCount = 20
    )

    return (([regex]::Split($Text, "`r?`n") | Select-Object -First $LineCount) -join "`n")
}

$entryPointPaths = @(
    'AGENTS.md',
    'README.md',
    'CLAUDE.md',
    'docs/README.md',
    'apps/web-uk/AGENTS.md',
    'apps/web-uk/CLAUDE.md',
    'apps/web-uk/README.md'
)

foreach ($relativePath in $entryPointPaths) {
    $text = Get-DocumentText $relativePath
    if ($null -eq $text) { continue }

    Assert-Contains $relativePath $text 'CURRENT_ASPNET_CONTRACT_STATUS\.md' `
        'must link the canonical ASP.NET contract status.'
    Assert-Contains $relativePath $text 'CURRENT_LARAVEL_FIRST_PARITY_STATUS\.md' `
        'must link the canonical Web UK status.'
}

$statusLikeDocuments = @(
    'PHASE63_73_DEPLOY_NOTES.md',
    'apps/admin/README.md',
    'docs/CURRENT_ASPNET_CONTRACT_STATUS.md',
    'docs/BACKEND_LOCALIZATION_CONTRACT.md',
    'docs/DOCUMENTATION_HEALTH_REPORT.md',
    'docs/FULL_PARITY_REMEDIATION_RUNBOOK.md',
    'docs/ARCHITECTURE.md',
    'docs/API_PARITY.md',
    'docs/SCHEMA_PARITY.md',
    'docs/FRONTEND_PARITY.md',
    'docs/LOCALIZATION_PARITY.md',
    'docs/LARAVEL_PARITY_MAP.md',
    'docs/PARITY_BACKLOG.md',
    'docs/MODULES.md',
    'docs/REACT_FRONTEND_RETIREMENT.md',
    'docs/ACCESSIBLE_SHARED_FRONTEND.md',
    'docs/database-migrations.md',
    'docs/REGISTRATION_POLICY_ENGINE.md',
    'docs/CURRENT_LARAVEL_PARITY_HANDOFF.md',
    'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md',
    'apps/web-uk/docs/CURRENT_WEB_UK_HANDOFF.md',
    'apps/web-uk/docs/ACCESSIBILITY_CERTIFICATION.md',
    'apps/web-uk/docs/ACCESSIBLE_SHARED_FRONTEND.md',
    'apps/web-uk/docs/BACKEND_SWITCHING_CONTRACT.md',
    'apps/web-uk/docs/BLADE_COMPONENT_PORT_AUDIT.md',
    'apps/web-uk/docs/LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md',
    'apps/web-uk/docs/MANUAL_ACCESSIBILITY_EVIDENCE.md',
    'apps/web-uk/docs/TENANT_ROUTING_PARITY.md',
    'apps/web-uk/docs/FRONTEND_AUDIT_REPORT.md',
    'apps/web-uk/docs/FRONTEND_BUILD_LOG.md',
    'apps/web-uk/docs/generated/accessible-route-matrix.md',
    'apps/web-uk/docs/generated/frontend-api-consumer-ledger.md'
)

foreach ($relativePath in $statusLikeDocuments) {
    $text = Get-DocumentText $relativePath
    if ($null -eq $text) { continue }

    $opening = Get-OpeningRegion $text 16
    Assert-Contains $relativePath $opening `
        '(?im)^Status:\s*\*\*(?:Canonical current|Maintained reference|Generated snapshot|Historical (?:checkpoint|archive))\b' `
        'must expose an approved documentation-state label within its first 16 lines.'
}

$claude = Get-DocumentText 'CLAUDE.md'
if ($null -ne $claude) {
    Assert-NotContains 'CLAUDE.md' $claude `
        '(?is)\b(?:(?:start|begin)\s+(?:by\s+)?(?:with\s+)?|resume\s+(?:from|with|at)\s+)`?(?:apps/web-uk/docs/)?CURRENT_WEB_UK_HANDOFF\.md' `
        'must not direct resumed Web UK work to the historical handoff.'
}

$docsIndex = Get-DocumentText 'docs/README.md'
if ($null -ne $docsIndex) {
    $oldHandoffRows = $docsIndex -split "`r?`n" |
        Where-Object { $_ -match 'CURRENT_WEB_UK_HANDOFF\.md' }
    foreach ($row in $oldHandoffRows) {
        if ($row -notmatch '(?i)historical|archive|superseded') {
            Add-Failure 'docs/README.md: CURRENT_WEB_UK_HANDOFF.md must be labelled historical or archived in the index.'
        }
    }
}

$maintainedSafetyDocuments = @(
    'AGENTS.md',
    'CLAUDE.md',
    'README.md',
    'docs/README.md',
    'docs/CURRENT_ASPNET_CONTRACT_STATUS.md',
    'docs/DOCUMENTATION_GOVERNANCE.md',
    'docs/FULL_PARITY_REMEDIATION_RUNBOOK.md',
    'docs/ARCHITECTURE.md',
    'docs/ACCESSIBLE_SHARED_FRONTEND.md',
    'docs/FRONTEND_PARITY.md',
    'docs/REACT_FRONTEND_RETIREMENT.md',
    'apps/web-uk/AGENTS.md',
    'apps/web-uk/CLAUDE.md',
    'apps/web-uk/README.md',
    'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md',
    'apps/web-uk/docs/BACKEND_SWITCHING_CONTRACT.md',
    'apps/web-uk/docs/ACCESSIBILITY_CERTIFICATION.md'
)

$ordinaryDatabaseExceptionPatterns = @(
    '(?is)explicit\s+authori[sz]ation\s+with\s+(?:verified\s+)?cleanup',
    '(?is)(?:disposable|dedicated)\s+(?:Laravel\s+)?environment.{0,100}\bor\b.{0,100}explicit\s+authori[sz]ation.{0,120}cleanup',
    '(?is)(?:ordinary|production-derived).{0,160}(?:database|snapshot).{0,220}\bor\b.{0,100}(?:authori[sz](?:ation|ed)).{0,120}cleanup'
)

foreach ($relativePath in $maintainedSafetyDocuments) {
    $text = Get-DocumentText $relativePath
    if ($null -eq $text) { continue }

    $currentSafetyText = Get-NonHistoricalRegion $text
    if ($null -eq $currentSafetyText) { continue }

    foreach ($pattern in $ordinaryDatabaseExceptionPatterns) {
        Assert-NotContains $relativePath $currentSafetyText $pattern `
            'must not offer authorization plus cleanup as an exception for ordinary Laravel database testing.'
    }
}

$architecture = Get-DocumentText 'docs/ARCHITECTURE.md'
if ($null -ne $architecture) {
    Assert-Contains 'docs/ARCHITECTURE.md' $architecture `
        '(?i)two-frontends-by-two-backends' `
        'must explicitly define the two-frontends-by-two-backends model.'
    Assert-Contains 'docs/ARCHITECTURE.md' $architecture `
        '(?i)Laravel backend' `
        'must include the Laravel backend in the current architecture.'
    Assert-Contains 'docs/ARCHITECTURE.md' $architecture `
        '(?i)ASP\.NET backend' `
        'must include the ASP.NET backend in the current architecture.'
    Assert-Contains 'docs/ARCHITECTURE.md' $architecture `
        '(?i)canonical React' `
        'must include the unchanged canonical React client.'
    Assert-Contains 'docs/ARCHITECTURE.md' $architecture `
        '(?i)(?:accessible Web UK|Web UK accessible)' `
        'must include the unchanged accessible Web UK client.'
}

$status = Get-DocumentText 'docs/CURRENT_ASPNET_CONTRACT_STATUS.md'
if ($null -ne $status) {
    Assert-Contains 'docs/CURRENT_ASPNET_CONTRACT_STATUS.md' $status `
        '<!--\s*doc-consistency:\s*ASPNET_CURRENT_BANKED_SCORE=712/1000\s*-->' `
        'must expose the canonical 712/1000 banked-score marker.'
    Assert-Contains 'docs/CURRENT_ASPNET_CONTRACT_STATUS.md' $status `
        '(?i)current banked score is\s+\*{0,2}712/1000' `
        'must state the current banked score as 712/1000.'
    Assert-Contains 'docs/CURRENT_ASPNET_CONTRACT_STATUS.md' $status `
        '2,601/2,601' `
        'must preserve the current active route-representation result.'
}

$webUkStatus = Get-DocumentText 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md'
if ($null -ne $webUkStatus) {
    Assert-Contains 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md' $webUkStatus `
        '<!--\s*doc-consistency:\s*WEBUK_CURRENT_BANKED_SCORE=622/1000\s*-->' `
        'must expose the canonical 622/1000 banked-score marker.'
    Assert-Contains 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md' $webUkStatus `
        '(?i)Laravel-first banked score[^\r\n]*622/1000' `
        'must state the Web UK banked score as 622/1000.'
    Assert-Contains 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md' $webUkStatus `
        '688/689' `
        'must preserve the canonical generated route summary.'
    Assert-Contains 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md' $webUkStatus `
        '663 contracts:\s*448 OpenAPI matches,\s*215 unmatched,\s*0 dynamic' `
        'must preserve the canonical frontend-consumer ledger summary.'
    foreach ($boundary in @('Banked baseline', 'Published but unscored', 'Dirty and uncommitted')) {
        $boundaryPattern = [regex]::Escape($boundary)
        Assert-Contains 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md' $webUkStatus `
            $boundaryPattern `
            "must retain the '$boundary' repository-state boundary."
    }
}

$generatedArtifactPaths = @(
    'apps/web-uk/docs/generated/accessible-route-matrix.json',
    'apps/web-uk/docs/generated/accessible-route-matrix.md',
    'apps/web-uk/docs/generated/frontend-api-consumer-ledger.json',
    'apps/web-uk/docs/generated/frontend-api-consumer-ledger.md'
)
foreach ($relativePath in $generatedArtifactPaths) {
    $text = Get-DocumentText $relativePath
    if ($null -eq $text) { continue }
    Assert-Contains $relativePath $text `
        '(?i)(?:"generatedAt"\s*:|Generated(?: at)?\s*:)' `
        'must record a generation timestamp.'
    Assert-Contains $relativePath $text `
        '(?i)(?:"laravelCommitSha"\s*:\s*"|Laravel commit SHA:\s*`)[0-9a-f]{40}' `
        'must record the exact Laravel commit SHA.'
    Assert-Contains $relativePath $text `
        '(?i)(?:"webUkRepositoryCommitSha"\s*:\s*"|Web UK repository commit SHA:\s*`)[0-9a-f]{40}' `
        'must record the exact Web UK repository commit SHA.'
    Assert-Contains $relativePath $text `
        '(?i)(?:"(?:laravelWorkingTreeDirty|webUkRepositoryWorkingTreeDirty)"\s*:|working tree dirty:)' `
        'must disclose source working-tree state.'
    Assert-Contains $relativePath $text `
        '(?i)(?:"caveat"\s*:|Provenance caveat:)' `
        'must include an explicit provenance caveat.'
}

$routeMatrixJson = Get-DocumentText 'apps/web-uk/docs/generated/accessible-route-matrix.json'
if ($null -ne $routeMatrixJson) {
    Assert-Contains 'apps/web-uk/docs/generated/accessible-route-matrix.json' $routeMatrixJson `
        '"laravelRoutes"\s*:\s*689' `
        'must preserve the canonical Laravel accessible-route count.'
    Assert-Contains 'apps/web-uk/docs/generated/accessible-route-matrix.json' $routeMatrixJson `
        '"matchedRoutes"\s*:\s*688' `
        'must preserve the canonical matched-route count.'
    Assert-Contains 'apps/web-uk/docs/generated/accessible-route-matrix.json' $routeMatrixJson `
        '"missingRoutes"\s*:\s*1' `
        'must preserve the canonical missing-route count.'
}

$consumerLedgerJson = Get-DocumentText 'apps/web-uk/docs/generated/frontend-api-consumer-ledger.json'
if ($null -ne $consumerLedgerJson) {
    foreach ($expectation in @(
        @{ Pattern = '"contracts"\s*:\s*663'; Description = 'must preserve the canonical contract count.' },
        @{ Pattern = '"matchedOpenApi"\s*:\s*448'; Description = 'must preserve the canonical OpenAPI-match count.' },
        @{ Pattern = '"missingOpenApi"\s*:\s*215'; Description = 'must preserve the canonical unmatched count.' },
        @{ Pattern = '"dynamicUnresolved"\s*:\s*0'; Description = 'must preserve the zero-dynamic-callsite result.' }
    )) {
        Assert-Contains 'apps/web-uk/docs/generated/frontend-api-consumer-ledger.json' $consumerLedgerJson `
            $expectation.Pattern $expectation.Description
    }
    Assert-NotContains 'apps/web-uk/docs/generated/frontend-api-consumer-ledger.json' $consumerLedgerJson `
        '\?\?\{param\}|limit=\{param\}1' `
        'must not contain malformed displayed query shapes.'
}

$webUkDependentStatusDocuments = @(
    'apps/web-uk/docs/BACKEND_SWITCHING_CONTRACT.md',
    'apps/web-uk/docs/BLADE_COMPONENT_PORT_AUDIT.md',
    'apps/web-uk/docs/ACCESSIBLE_SHARED_FRONTEND.md',
    'apps/web-uk/docs/TENANT_ROUTING_PARITY.md',
    'apps/web-uk/docs/CURRENT_WEB_UK_HANDOFF.md'
)

foreach ($relativePath in $webUkDependentStatusDocuments) {
    $text = Get-DocumentText $relativePath
    if ($null -eq $text) { continue }

    $opening = Get-OpeningRegion $text 80
    Assert-NotContains $relativePath $opening `
        '(?i)\b(?:622/1000|688/689|1,661/1,661)\b|663\s+contracts' `
        'must link the canonical Web UK status instead of mirroring live score/count/test totals near its title.'
}

$governance = Get-DocumentText 'docs/DOCUMENTATION_GOVERNANCE.md'
if ($null -ne $governance) {
    Assert-Contains 'docs/DOCUMENTATION_GOVERNANCE.md' $governance `
        'CURRENT_ASPNET_CONTRACT_STATUS\.md' `
        'must name the canonical ASP.NET status.'
    Assert-Contains 'docs/DOCUMENTATION_GOVERNANCE.md' $governance `
        'CURRENT_LARAVEL_FIRST_PARITY_STATUS\.md' `
        'must name the canonical Web UK status.'
    Assert-Contains 'docs/DOCUMENTATION_GOVERNANCE.md' $governance `
        '(?i)Operational Inventory Is Not Product Authority' `
        'must distinguish deployment inventory from product authority.'
    Assert-Contains 'docs/DOCUMENTATION_GOVERNANCE.md' $governance `
        '\.claude/production-containers\.md' `
        'must name the authoritative operational container inventory.'
}

$documentationHealth = Get-DocumentText 'docs/DOCUMENTATION_HEALTH_REPORT.md'
if ($null -ne $documentationHealth) {
    Assert-Contains 'docs/DOCUMENTATION_HEALTH_REPORT.md' $documentationHealth `
        '<!--\s*doc-consistency:\s*DOCUMENTATION_HEALTH_SCORE=100/100\s*-->' `
        'must expose the fixed Baseline D1 health-score marker.'
    Assert-Contains 'docs/DOCUMENTATION_HEALTH_REPORT.md' $documentationHealth `
        'CURRENT_ASPNET_CONTRACT_STATUS\.md' `
        'must link the canonical ASP.NET product score.'
    Assert-Contains 'docs/DOCUMENTATION_HEALTH_REPORT.md' $documentationHealth `
        'CURRENT_LARAVEL_FIRST_PARITY_STATUS\.md' `
        'must link the canonical Web UK product score.'
    Assert-NotContains 'docs/DOCUMENTATION_HEALTH_REPORT.md' $documentationHealth `
        '(?i)\b(?:645|622)/1000\b' `
        'must not mirror either live product score.'
}

$productionServer = Get-DocumentText '.claude/production-server.md'
if ($null -ne $productionServer) {
    Assert-Contains '.claude/production-server.md' $productionServer `
        'production-containers\.md' `
        'must point operators to the authoritative production container map.'
    Assert-Contains '.claude/production-server.md' $productionServer `
        '(?is)Apache.{0,80}not\s+nginx' `
        'must state that the production reverse proxy is Apache, not nginx.'
    Assert-Contains '.claude/production-server.md' $productionServer `
        '(?is)no\s+safe\s+blanket.{0,120}docker\s+compose\s+build.{0,40}docker\s+compose\s+up' `
        'must reject a blanket Docker Compose production procedure.'
    Assert-NotContains '.claude/production-server.md' $productionServer `
        '(?im)^\s*(?:sudo\s+)?docker\s+compose\s+(?:build|up|down)\b' `
        'must not advertise blanket Docker Compose build, up, or down commands.'
}

$productionCompose = Get-DocumentText 'compose.prod.yml'
if ($null -ne $productionCompose) {
    Assert-Contains 'compose.prod.yml' $productionCompose `
        '(?is)DEPLOYMENT HOLD.{0,500}web-uk\s*:.{0,900}API_BASE_URL=http://api:8080' `
        'must retain the deployment hold beside the uncertified Web UK ASP.NET override.'
    Assert-Contains 'compose.prod.yml' $productionCompose `
        '(?i)operator reference only' `
        'must identify the profile as operator reference rather than a production procedure.'
    Assert-NotContains 'compose.prod.yml' $productionCompose `
        '(?im)^#\s*(?:cp\s+compose\.prod|docker\s+compose\s+(?:up|build|down))\b' `
        'must not publish an executable blanket Compose usage recipe.'
}

$webUkCompose = Get-DocumentText 'apps/web-uk/compose.yml'
if ($null -ne $webUkCompose) {
    Assert-Contains 'apps/web-uk/compose.yml' $webUkCompose `
        '(?i)local production-image (?:mode|service)' `
        'must label the prod profile as local production-image testing.'
    Assert-NotContains 'apps/web-uk/compose.yml' $webUkCompose `
        '(?im)^\s*#.*\bProduction (?:mode|service)\b' `
        'must not describe the local profile as a production deployment mode or service.'
}

$adminCompose = Get-DocumentText 'apps/admin/compose.yml'
if ($null -ne $adminCompose) {
    Assert-Contains 'apps/admin/compose.yml' $adminCompose `
        '(?i)local production-image' `
        'must label the production profile as local image testing.'
    Assert-NotContains 'apps/admin/compose.yml' $adminCompose `
        '(?im)^\s*#.*\bProd(?:uction)?\s*(?:\(|:)' `
        'must not present the local profile as a production deployment recipe.'
}

$historicalDeployNotes = Get-DocumentText 'PHASE63_73_DEPLOY_NOTES.md'
if ($null -ne $historicalDeployNotes) {
    Assert-Contains 'PHASE63_73_DEPLOY_NOTES.md' (Get-OpeningRegion $historicalDeployNotes 16) `
        '(?i)Historical checkpoint.{0,80}do not execute' `
        'must remain quarantined as a non-executable historical checkpoint.'
    Assert-NotContains 'PHASE63_73_DEPLOY_NOTES.md' $historicalDeployNotes `
        '(?im)^\s*(?:sudo\s+)?(?:docker\s+compose|git\s+checkout|dotnet\s+ef)\b' `
        'must not contain executable production, rollback, or migration commands.'
}

$migrationGuide = Get-DocumentText 'docs/database-migrations.md'
if ($null -ne $migrationGuide) {
    Assert-Contains 'docs/database-migrations.md' $migrationGuide `
        '(?is)make migrate-prod.{0,160}unapproved and unverified|unapproved and unverified.{0,160}make migrate-prod' `
        'must mark the production Make target unapproved and unverified.'
    Assert-Contains 'docs/database-migrations.md' $migrationGuide `
        '(?is)nexus_prod.{0,220}nexus_dev' `
        'must disclose the known Makefile/Compose production database-name mismatch.'
    Assert-Contains 'docs/database-migrations.md' $migrationGuide `
        '(?is)no executable\s+production migration or restore command' `
        'must fail closed instead of publishing a generic production migration/restore sequence.'
}

$runbook = Get-DocumentText 'docs/FULL_PARITY_REMEDIATION_RUNBOOK.md'
if ($null -ne $runbook) {
    $runbookOpening = ($runbook -split '(?m)^## Historical Published Evidence\s*$')[0]
    Assert-NotContains 'docs/FULL_PARITY_REMEDIATION_RUNBOOK.md' $runbookOpening `
        '\b712/1000\b' `
        'must link the canonical ASP.NET status rather than mirror its live score in maintained opening text.'
    Assert-Contains 'docs/FULL_PARITY_REMEDIATION_RUNBOOK.md' $runbook `
        '(?m)^## Current Remediation Queue\s*$' `
        'must point readers to the canonical per-workstream queues.'
    Assert-NotContains 'docs/FULL_PARITY_REMEDIATION_RUNBOOK.md' $runbook `
        '(?m)^## Workstream [AB]:' `
        'must not expose the stale Workstream A/B snapshots as current top-level queues.'
    Assert-NotContains 'docs/FULL_PARITY_REMEDIATION_RUNBOOK.md' $runbook `
        '(?i)implementation score and certification-confidence score' `
        'must not request competing overall implementation and certification scores.'
    Assert-NotContains 'docs/FULL_PARITY_REMEDIATION_RUNBOOK.md' $runbook `
        '(?i)Current provisional global scores' `
        'must not describe retired checkpoint scores as current.'
}

if ($null -ne $status) {
    Assert-Contains 'docs/CURRENT_ASPNET_CONTRACT_STATUS.md' $status `
        '(?m)^## Finite Ordered Backend Queue\s*$' `
        'must own the live finite backend queue.'
    Assert-Contains 'docs/CURRENT_ASPNET_CONTRACT_STATUS.md' $status `
        '(?m)^8\. \*\*Certify both unchanged clients\.\*\*' `
        'must retain the complete ordered backend queue through package 8.'
}

foreach ($relativePath in @('CLAUDE.md', 'docs/README.md', 'docs/CURRENT_ASPNET_CONTRACT_STATUS.md')) {
    $text = Get-DocumentText $relativePath
    if ($null -eq $text) { continue }
    Assert-NotContains $relativePath $text `
        '(?is)FULL_PARITY_REMEDIATION_RUNBOOK\.md.{0,160}(?:prioritized|ordered)\s+(?:autonomous\s+)?(?:remediation\s+)?(?:work|queue)' `
        'must not assign the live queue to the shared rubric/runbook.'
}

$historicalOpenings = @(
    'docs/CURRENT_LARAVEL_PARITY_HANDOFF.md',
    'apps/web-uk/docs/CURRENT_WEB_UK_HANDOFF.md'
)
foreach ($relativePath in $historicalOpenings) {
    $text = Get-DocumentText $relativePath
    if ($null -eq $text) { continue }
    $opening = Get-OpeningRegion $text 60
    Assert-NotContains $relativePath $opening `
        '(?i)\b(?:712/1000|710/1000|708/1000|701/1000|698/1000|684/1000|680/1000|622/1000|688/689|1,661/1,661)\b|663\s+contracts' `
        'must not copy live workstream scores or generated totals into its archive banner.'
}

$provenanceReferences = @(
    'docs/API_PARITY.md',
    'docs/SCHEMA_PARITY.md',
    'docs/FRONTEND_PARITY.md',
    'docs/LOCALIZATION_PARITY.md',
    'docs/LARAVEL_PARITY_MAP.md'
)
foreach ($relativePath in $provenanceReferences) {
    $text = Get-DocumentText $relativePath
    if ($null -eq $text) { continue }
    $opening = Get-OpeningRegion $text 24
    Assert-Contains $relativePath $opening `
        '903d03d3db78bbf87129ad35728be3b72819acaf' `
        'must identify the exact Laravel source commit for maintained evidence.'
    Assert-Contains $relativePath $opening `
        '(?i)provenance-incomplete' `
        'must quarantine older unprovenanced counts as historical.'
}

$currentScoreDocuments = @(
    'README.md',
    'CLAUDE.md',
    'docs/README.md',
    'docs/ARCHITECTURE.md',
    'docs/CURRENT_ASPNET_CONTRACT_STATUS.md',
    'docs/FULL_PARITY_REMEDIATION_RUNBOOK.md',
    'docs/CURRENT_LARAVEL_PARITY_HANDOFF.md',
    'docs/LARAVEL_PARITY_MAP.md'
)

foreach ($relativePath in $currentScoreDocuments) {
    $text = Get-DocumentText $relativePath
    if ($null -eq $text) { continue }

    $currentRegion = Get-NonHistoricalRegion $text
    if ($null -eq $currentRegion) { continue }

    $currentScoreClaims = [regex]::Matches(
        $currentRegion,
        '(?i)\b(?:current|latest)\s+(?:(?:overall|published|ASP\.NET|fixed-rubric|banked)\s+){0,5}(?:score|bank)\s+(?:is|:)\s+\*{0,2}(?<points>\d{1,4})/1000'
    )
    foreach ($claim in $currentScoreClaims) {
        if ([int]$claim.Groups['points'].Value -ne 712) {
            Add-Failure "${relativePath}: contains a current overall score that contradicts 712/1000."
        }
    }
    Assert-NotContains $relativePath $currentRegion `
        '(?i)Implementation remains\s+\*\*875/1000\*\*' `
        'contains a retired implementation score outside a historical-checkpoint section.'
    Assert-NotContains $relativePath $currentRegion `
        '(?i)Certification confidence (?:advances|remains) to\s+\*\*755/1000\*\*' `
        'contains a retired certification score outside a historical-checkpoint section.'
    Assert-NotContains $relativePath $currentRegion `
        '(?i)combined finish-line estimate is\s+\*\*80%' `
        'contains a retired combined estimate outside a historical-checkpoint section.'
}

if ($failures.Count -gt 0) {
    Write-Host "Documentation consistency check failed ($($failures.Count) issue(s)):" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host 'Documentation consistency check passed.' -ForegroundColor Green
Write-Host 'Validated canonical links and scores, state labels, 2x2 architecture, generated provenance, Web UK resume authority, Laravel database safety, and production documentation holds.'

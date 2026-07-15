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

$audienceDocumentationPaths = @(
    'docs/user/README.md',
    'docs/user/GETTING_STARTED.md',
    'docs/user/COMMUNITY_FEATURES.md',
    'docs/user/ACCOUNT_SECURITY_PRIVACY.md',
    'docs/user/ACCESSIBILITY_LANGUAGE_SUPPORT.md',
    'docs/admin/README.md',
    'docs/api/README.md',
    'docs/system/README.md',
    'docs/system/LOCAL_DEVELOPMENT.md',
    'docs/system/CONFIGURATION.md',
    'docs/system/TESTING.md',
    'docs/system/SECURITY_AND_TENANCY.md',
    'docs/system/OPERATIONS.md',
    'docs/system/INCIDENT_RESPONSE.md',
    'SUPPORT.md',
    'SECURITY.md'
)

foreach ($relativePath in $audienceDocumentationPaths) {
    [void](Get-DocumentText $relativePath)
}

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
    'apps/web-uk/docs/generated/frontend-api-consumer-ledger.md',
    'apps/web-uk/DOCKER_CONTRACT.md',
    'apps/web-uk/docs/PRODUCTION_RELEASE_RUNBOOK.md',
    'docs/DOCUMENTATION_GOVERNANCE.md'
)
$statusLikeDocuments += $audienceDocumentationPaths

foreach ($relativePath in $statusLikeDocuments) {
    $text = Get-DocumentText $relativePath
    if ($null -eq $text) { continue }

    $opening = Get-OpeningRegion $text 16
    Assert-Contains $relativePath $opening `
        '(?im)^Status:\s*\*\*(?:Canonical current|Maintained(?: [A-Za-z-]+){0,3} (?:reference|index)|Generated snapshot|Historical (?:checkpoint|archive))\b' `
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
    foreach ($entry in @('user/README.md', 'admin/README.md', 'api/README.md', 'system/README.md', '../SUPPORT.md', '../SECURITY.md')) {
        Assert-Contains 'docs/README.md' $docsIndex ([regex]::Escape($entry)) `
            "must link the system-wide audience entry point '$entry'."
    }
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
    Assert-Contains 'docs/CURRENT_ASPNET_CONTRACT_STATUS.md' $status `
        '(?i)eleven backend commits|All eleven contribute' `
        'must disclose the published-but-unscored post-scorecard backend delta.'
    Assert-Contains 'docs/CURRENT_ASPNET_CONTRACT_STATUS.md' $status `
        '97b8a4a004362aef8356e8d76333f1efc9d44b36' `
        'must identify the isolated unbanked schema candidate exactly.'
}

$webUkStatus = Get-DocumentText 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md'
if ($null -ne $webUkStatus) {
    Assert-Contains 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md' $webUkStatus `
        '<!--\s*doc-consistency:\s*WEBUK_CURRENT_BANKED_SCORE=663/1000\s*-->' `
        'must expose the canonical 663/1000 banked-score marker.'
    Assert-Contains 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md' $webUkStatus `
        '(?i)Laravel-first banked score[^\r\n]*663/1000' `
        'must state the Web UK banked score as 663/1000.'
    Assert-Contains 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md' $webUkStatus `
        '688/689' `
        'must preserve the canonical generated route summary.'
    Assert-Contains 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md' $webUkStatus `
        '668 contracts:\s*451 OpenAPI matches,\s*217 unmatched,\s*0 dynamic' `
        'must preserve the canonical frontend-consumer ledger summary.'
    foreach ($boundary in @('Banked baseline', 'Published but unscored', 'Current repository boundary')) {
        $boundaryPattern = [regex]::Escape($boundary)
        Assert-Contains 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md' $webUkStatus `
            $boundaryPattern `
            "must retain the '$boundary' repository-state boundary."
    }
    Assert-Contains 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md' $webUkStatus `
        '(?i)W2 has no percentage|W2 percentage `not assigned`' `
        'must not reuse the W1 bank as the corrected Goal W2 percentage.'
    Assert-Contains 'apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md' $webUkStatus `
        '38 later Web UK commits' `
        'must retain the published-but-unscored post-W1 Web UK boundary.'
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
        @{ Pattern = '"contracts"\s*:\s*668'; Description = 'must preserve the canonical contract count.' },
        @{ Pattern = '"matchedOpenApi"\s*:\s*451'; Description = 'must preserve the canonical OpenAPI-match count.' },
        @{ Pattern = '"missingOpenApi"\s*:\s*217'; Description = 'must preserve the canonical unmatched count.' },
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
        '(?i)\b(?:663/1000|660/1000|622/1000|688/689|1,709/1,709|1,706/1,706|1,661/1,661)\b|(?:668|663)\s+contracts' `
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
        '<!--\s*doc-consistency:\s*DOCUMENTATION_HEALTH_BASELINE=D2\s*-->' `
        'must expose the system-wide Baseline D2 marker.'
    Assert-Contains 'docs/DOCUMENTATION_HEALTH_REPORT.md' $documentationHealth `
        '<!--\s*doc-consistency:\s*DOCUMENTATION_HEALTH_SCORE=100/100\s*-->' `
        'must expose the fixed Baseline D2 health-score marker.'
    foreach ($baseline in @('Baseline U1', 'Baseline S1', 'Baseline D2')) {
        Assert-Contains 'docs/DOCUMENTATION_HEALTH_REPORT.md' $documentationHealth ([regex]::Escape($baseline)) `
            "must preserve the named audit baseline '$baseline'."
    }
    Assert-Contains 'docs/DOCUMENTATION_HEALTH_REPORT.md' $documentationHealth `
        '(?i)documentation health only' `
        'must keep documentation health separate from product readiness.'
}

$restartIncident = Get-DocumentText 'docs/RESTART_INCIDENT_2026-07-15.md'
if ($null -ne $restartIncident) {
    foreach ($expectation in @(
        @{ Pattern = '02:44:42\.746'; Description = 'must preserve the exact first planned-restart time.' },
        @{ Pattern = '02:49:14\.500'; Description = 'must preserve the exact final operating-system start.' },
        @{ Pattern = 'KB5101650'; Description = 'must identify the installed Windows security update.' },
        @{ Pattern = 'KB5100998'; Description = 'must identify the installed .NET Framework update.' },
        @{ Pattern = '(?i)no Kernel-Power event\s+41'; Description = 'must distinguish the planned sequence from an unexpected power loss.' },
        @{ Pattern = '(?i)zero banked points'; Description = 'must retain the interrupted-work scoring boundary.' }
    )) {
        Assert-Contains 'docs/RESTART_INCIDENT_2026-07-15.md' $restartIncident `
            $expectation.Pattern $expectation.Description
    }
}

$rootReadme = Get-DocumentText 'README.md'
if ($null -ne $rootReadme) {
    foreach ($entry in @('docs/user/README.md', 'docs/admin/README.md', 'docs/api/README.md', 'docs/system/README.md', 'SUPPORT.md', 'SECURITY.md')) {
        Assert-Contains 'README.md' $rootReadme ([regex]::Escape($entry)) `
            "must link the system-wide audience entry point '$entry'."
    }
}

if ($null -ne $claude) {
    Assert-Contains 'CLAUDE.md' $claude 'NexusV2!Demo#2026' `
        'must document the current fictitious Development seed password.'
    Assert-Contains 'CLAUDE.md' $claude '127\.0\.0\.1:5273' `
        'must document the current root-Compose frozen React port.'
    Assert-NotContains 'CLAUDE.md' $claude 'Test123!' `
        'must not retain the obsolete development seed password.'
}

$webUkReadme = Get-DocumentText 'apps/web-uk/README.md'
if ($null -ne $webUkReadme) {
    Assert-NotContains 'apps/web-uk/README.md' $webUkReadme `
        '(?im)^## Test Credentials|/components\b|/connections/pending\b|GET\s+/logout\b|GET\s+/listings/:id/delete\b|POST\s+/members/:id/connect\b' `
        'must not restore the stale hand-maintained route/credentials section.'
    Assert-Contains 'apps/web-uk/README.md' $webUkReadme `
        '(?i)Generate the current inventories' `
        'must direct route/API readers to generated inventories.'
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

$productionEnvironmentExample = Get-DocumentText '.env.production.example'
if ($null -ne $productionEnvironmentExample) {
    foreach ($key in @('Meilisearch__BaseUrl', 'RabbitMq__Host', 'RabbitMq__Port', 'RabbitMq__Username', 'RabbitMq__Password', 'RabbitMq__VirtualHost', 'RabbitMq__ExchangeName', 'SendGrid__Enabled', 'Gmail__Enabled', 'Gmail__SenderEmail', 'RABBITMQ_PASS')) {
        Assert-Contains '.env.production.example' $productionEnvironmentExample ([regex]::Escape($key)) `
            "must contain current configuration key '$key'."
    }
    Assert-NotContains '.env.production.example' $productionEnvironmentExample `
        'PHASE63_73_DEPLOY_NOTES|Meilisearch__Host|RabbitMq__Uri|RABBITMQ_PASSWORD' `
        'must not retain obsolete deployment references or configuration keys.'
}

$deployWorkflow = Get-DocumentText '.github/workflows/deploy.yml'
if ($null -ne $deployWorkflow) {
    Assert-NotContains '.github/workflows/deploy.yml' $deployWorkflow `
        '(?m)^\s*workflow_run\s*:' `
        'must not automatically deploy after a main/CI workflow run.'
    Assert-Contains '.github/workflows/deploy.yml' $deployWorkflow `
        '(?m)^\s*confirm_production\s*:' `
        'must require an explicit production-confirmation input.'
    Assert-Contains '.github/workflows/deploy.yml' $deployWorkflow `
        '\^\[0-9a-fA-F\]\{40\}\$' `
        'must reject anything other than an exact full commit SHA.'
}

$healthWorkflow = Get-DocumentText '.github/workflows/health-check.yml'
if ($null -ne $healthWorkflow) {
    Assert-Contains '.github/workflows/health-check.yml' $healthWorkflow `
        'docs/system/INCIDENT_RESPONSE\.md' `
        'must point alerts to maintained read-only incident guidance.'
    Assert-NotContains '.github/workflows/health-check.yml' $healthWorkflow `
        'docker compose restart|RECOVERY_GUIDE\.md' `
        'must not tell an alert recipient to restart production or consult a missing guide.'
}

$publicAccessibility = Get-DocumentText 'apps/web-uk/src/views/legal/accessibility.njk'
if ($null -ne $publicAccessibility) {
    Assert-Contains 'apps/web-uk/src/views/legal/accessibility.njk' $publicAccessibility `
        'accessibility\.limitations_body' `
        'must keep translated limitations visible.'
    Assert-NotContains 'apps/web-uk/src/views/legal/accessibility.njk' $publicAccessibility `
        'accessibility\.features_title|accessibility\.testing_body' `
        'must not publish unsupported feature or manual-testing assurances.'
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
        '(?is)runtime-only.{0,180}no \.NET SDK|no \.NET SDK.{0,180}runtime-only' `
        'must explain why container EF commands are unsupported.'
    Assert-Contains 'docs/database-migrations.md' $migrationGuide `
        '(?i)verified disposable PostgreSQL' `
        'must require a verified disposable PostgreSQL target for host EF work.'
    Assert-Contains 'docs/database-migrations.md' $migrationGuide `
        '(?is)no executable\s+production migration or restore command' `
        'must fail closed instead of publishing a generic production migration/restore sequence.'
    Assert-NotContains 'docs/database-migrations.md' $migrationGuide `
        '(?im)^\s*(?:make migrate(?:\s|$)|docker compose exec api dotnet ef)' `
        'must not advertise the unsupported Make/container EF workflow.'
}

$quarantinedProductionCompose = Get-DocumentText 'compose.production.yml'
if ($null -ne $quarantinedProductionCompose) {
    Assert-Contains 'compose.production.yml' $quarantinedProductionCompose `
        '(?i)QUARANTINED HISTORICAL INTEGRATION TOPOLOGY' `
        'must clearly quarantine the obsolete whole-stack topology.'
    $profileCount = [regex]::Matches($quarantinedProductionCompose, 'profiles:\s*\["quarantined-do-not-run"\]').Count
    if ($profileCount -ne 6) {
        Add-Failure "compose.production.yml: every one of its 6 services must require the quarantine profile (found $profileCount)."
    }
}

$quarantinedFullStackCompose = Get-DocumentText 'compose.fullstack.yml'
if ($null -ne $quarantinedFullStackCompose) {
    Assert-Contains 'compose.fullstack.yml' $quarantinedFullStackCompose `
        '(?i)QUARANTINED LEGACY FULL-STACK LOCAL TOPOLOGY' `
        'must clearly quarantine the obsolete duplicate local topology.'
    $profileCount = [regex]::Matches($quarantinedFullStackCompose, 'profiles:\s*\["legacy-fullstack-do-not-run"\]').Count
    if ($profileCount -ne 6) {
        Add-Failure "compose.fullstack.yml: every one of its 6 services must require the legacy quarantine profile (found $profileCount)."
    }
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
        '(?i)\b(?:712/1000|710/1000|708/1000|701/1000|698/1000|684/1000|680/1000|663/1000|660/1000|622/1000|688/689|1,709/1,709|1,706/1,706|1,661/1,661)\b|(?:668|663)\s+contracts' `
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

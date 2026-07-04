# Copyright 2024-2026 Jasper Ford
# SPDX-License-Identifier: AGPL-3.0-or-later
# Author: Jasper Ford
# See NOTICE file for attribution and acknowledgements.

[CmdletBinding()]
param(
    [string]$TargetRoot,
    [string]$SourceRoot = 'C:\platforms\htdocs\staging',
    [string]$OutDir
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($TargetRoot)) {
    $TargetRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

if ([string]::IsNullOrWhiteSpace($OutDir)) {
    $OutDir = Join-Path $TargetRoot 'artifacts\parity\api'
}

function Ensure-Directory {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
    }
}

function Normalize-RoutePath {
    param([AllowNull()][string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return '/'
    }

    $normalized = $Path.Trim().Trim('"', "'")
    $normalized = $normalized -replace '\\', '/'
    $normalized = $normalized -replace '\?.*$', ''
    $normalized = $normalized -replace '^/?api/v2/?', '/api/'
    $normalized = $normalized -replace '^/?v2/?', '/api/'
    $normalized = $normalized -replace '\[controller\]', 'controller'
    $normalized = $normalized -replace '\{([A-Za-z0-9_]+)(:[^}]+)?\}', '{$1}'
    $normalized = $normalized -replace '/+', '/'
    $normalized = $normalized.TrimEnd('/')

    if ($normalized.Length -eq 0) {
        return '/'
    }

    if (-not $normalized.StartsWith('/')) {
        $normalized = "/$normalized"
    }

    return $normalized.ToLowerInvariant()
}

function Convert-ToRouteShape {
    param([string]$Path)

    return (Normalize-RoutePath $Path) -replace '\{[^/]+\}', '{}'
}

function Join-RoutePath {
    param(
        [string]$Prefix,
        [string]$Child
    )

    if (-not [string]::IsNullOrWhiteSpace($Child) -and $Child.Trim().StartsWith('/')) {
        return Normalize-RoutePath $Child
    }

    $combined = (($Prefix.Trim('/'), $Child.Trim('/')) | Where-Object { $_ }) -join '/'
    return Normalize-RoutePath $combined
}

function Get-AspNetRoutes {
    param([string]$Root)

    $controllerRoot = Join-Path $Root 'src\Nexus.Api\Controllers'
    if (-not (Test-Path -LiteralPath $controllerRoot)) {
        throw "ASP.NET controller root not found: $controllerRoot"
    }

    $httpMap = @{
        HttpGet = 'GET'
        HttpPost = 'POST'
        HttpPut = 'PUT'
        HttpPatch = 'PATCH'
        HttpDelete = 'DELETE'
        HttpHead = 'HEAD'
        HttpOptions = 'OPTIONS'
    }

    $rows = New-Object System.Collections.Generic.List[object]

    Get-ChildItem -LiteralPath $controllerRoot -Recurse -Filter '*.cs' |
        Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' } |
        ForEach-Object {
            $file = $_
            $text = Get-Content -Raw -LiteralPath $file.FullName
            $classMatches = [regex]::Matches($text, '(?m)^\s*(?:public\s+)?(?:sealed\s+)?(?:partial\s+)?class\s+([A-Za-z0-9_]+)\b')
            if ($classMatches.Count -eq 0) {
                return
            }

            for ($classIndex = 0; $classIndex -lt $classMatches.Count; $classIndex++) {
                $classMatch = $classMatches[$classIndex]
                $className = $classMatch.Groups[1].Value
                $controllerName = $className -replace 'Controller$', ''
                $classStart = $classMatch.Index
                $classEnd = if (($classIndex + 1) -lt $classMatches.Count) {
                    $classMatches[$classIndex + 1].Index
                } else {
                    $text.Length
                }
                $segment = $text.Substring($classStart, $classEnd - $classStart)

                $beforeClass = $text.Substring(0, $classStart)
                $beforeLines = $beforeClass -split "`r?`n"
                $attributeLines = New-Object System.Collections.Generic.List[string]
                for ($lineIndex = $beforeLines.Count - 1; $lineIndex -ge 0; $lineIndex--) {
                    $trimmedLine = $beforeLines[$lineIndex].Trim()
                    if ($trimmedLine.Length -eq 0) {
                        if ($attributeLines.Count -eq 0) {
                            continue
                        }
                        break
                    }
                    if ($trimmedLine.StartsWith('[')) {
                        $attributeLines.Insert(0, $beforeLines[$lineIndex])
                        continue
                    }
                    break
                }
                $attributeWindow = $attributeLines -join "`n"
                $prefixes = New-Object System.Collections.Generic.List[string]
                foreach ($routeMatch in [regex]::Matches($attributeWindow, '\[Route\("([^"]*)"\)\]')) {
                    $prefixes.Add(($routeMatch.Groups[1].Value -replace '\[controller\]', $controllerName))
                }
                if ($prefixes.Count -eq 0) {
                    $prefixes.Add('')
                }

                $lines = $segment -split "`r?`n"
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    $line = $lines[$i]
                    $httpMatch = [regex]::Match($line, '\[(HttpGet|HttpPost|HttpPut|HttpPatch|HttpDelete|HttpHead|HttpOptions)(?:\("([^"]*)"\))?')
                    if (-not $httpMatch.Success) {
                        continue
                    }

                    $method = $httpMap[$httpMatch.Groups[1].Value]
                    $child = $httpMatch.Groups[2].Value
                    $action = ''
                    $lookAheadEnd = [Math]::Min($i + 10, $lines.Count - 1)
                    for ($j = $i; $j -le $lookAheadEnd; $j++) {
                        $actionMatch = [regex]::Match($lines[$j], '\b(?:async\s+)?(?:Task(?:<[^>]+>)?|IActionResult|ActionResult(?:<[^>]+>)?|[A-Za-z0-9_<>,\?\[\]]+)\s+([A-Za-z0-9_]+)\s*\(')
                        if ($actionMatch.Success) {
                            $action = $actionMatch.Groups[1].Value
                            break
                        }
                    }

                    foreach ($prefix in $prefixes) {
                        $path = Join-RoutePath $prefix $child
                        $rows.Add([pscustomobject]@{
                            method = $method
                            path = $path
                            shape = Convert-ToRouteShape $path
                            controller = $controllerName
                            action = $action
                            file = $file.FullName
                        })
                    }
                }

                for ($i = 0; $i -lt $lines.Count; $i++) {
                    $line = $lines[$i]
                    $inlineMatches = [regex]::Matches($line, '\[(HttpGet|HttpPost|HttpPut|HttpPatch|HttpDelete|HttpHead|HttpOptions)(?:\("([^"]*)"\))?')
                    if ($inlineMatches.Count -le 1) {
                        continue
                    }

                    foreach ($httpMatch in $inlineMatches | Select-Object -Skip 1) {
                        $method = $httpMap[$httpMatch.Groups[1].Value]
                        $child = $httpMatch.Groups[2].Value
                        $actionMatch = [regex]::Match($line, '\b(?:async\s+)?(?:Task(?:<[^>]+>)?|IActionResult|ActionResult(?:<[^>]+>)?|[A-Za-z0-9_<>,\?\[\]]+)\s+([A-Za-z0-9_]+)\s*\(')
                        $action = if ($actionMatch.Success) { $actionMatch.Groups[1].Value } else { '' }
                        foreach ($prefix in $prefixes) {
                            $path = Join-RoutePath $prefix $child
                            $rows.Add([pscustomobject]@{
                                method = $method
                                path = $path
                                shape = Convert-ToRouteShape $path
                                controller = $controllerName
                                action = $action
                                file = $file.FullName
                            })
                        }
                    }
                }
            }
        }

    return @($rows | Sort-Object method, path, controller, action)
}

function Get-LaravelOpenApiOperations {
    param([string]$Root)

    $openApiPath = Join-Path $Root 'openapi.json'
    if (-not (Test-Path -LiteralPath $openApiPath)) {
        throw "Laravel openapi.json not found: $openApiPath"
    }

    $document = Get-Content -Raw -LiteralPath $openApiPath | ConvertFrom-Json
    $rows = New-Object System.Collections.Generic.List[object]

    foreach ($pathProperty in $document.paths.PSObject.Properties) {
        foreach ($operationProperty in $pathProperty.Value.PSObject.Properties) {
            $method = $operationProperty.Name.ToUpperInvariant()
            if (@('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD') -notcontains $method) {
                continue
            }

            $normalized = Normalize-RoutePath $pathProperty.Name
            $rows.Add([pscustomobject]@{
                source = 'openapi'
                method = $method
                path = $normalized
                shape = Convert-ToRouteShape $normalized
                source_file = $openApiPath
                handler = ''
            })
        }
    }

    return @($rows | Sort-Object method, path)
}

function Get-LaravelSupplementalRoutes {
    param(
        [string]$Root,
        [object[]]$OpenApiOperations
    )

    $routeRoot = Join-Path $Root 'routes'
    if (-not (Test-Path -LiteralPath $routeRoot)) {
        return @()
    }

    $openApiKeys = @{}
    foreach ($operation in $OpenApiOperations) {
        $openApiKeys["$($operation.method) $($operation.path)"] = $true
    }

    $rows = New-Object System.Collections.Generic.List[object]
    $routePattern = 'Route::(get|post|put|patch|delete|options|head)\s*\(\s*[''"]([^''"]+)[''"]\s*,\s*([^)]+)\)'
    $govukAlphaRoot = Join-Path $routeRoot 'govuk-alpha-parity'

    Get-ChildItem -LiteralPath $routeRoot -Recurse -Include '*.php','*.txt' -File |
        Where-Object {
            $_.FullName -ne (Join-Path $routeRoot 'govuk-alpha.php') -and
            $_.FullName -notlike "$govukAlphaRoot*"
        } |
        ForEach-Object {
            $file = $_
            $text = Get-Content -Raw -LiteralPath $file.FullName
            foreach ($match in [regex]::Matches($text, $routePattern, 'IgnoreCase')) {
                $method = $match.Groups[1].Value.ToUpperInvariant()
                $normalized = Normalize-RoutePath $match.Groups[2].Value
                if ($normalized -notmatch '^/api(/|$)') {
                    $normalized = Normalize-RoutePath "/api/$($match.Groups[2].Value)"
                }

                $key = "$method $normalized"
                if ($openApiKeys.ContainsKey($key)) {
                    continue
                }

                $rows.Add([pscustomobject]@{
                    source = 'supplemental-route'
                    method = $method
                    path = $normalized
                    shape = Convert-ToRouteShape $normalized
                    source_file = $file.FullName
                    handler = ($match.Groups[3].Value -replace '\s+', ' ').Trim()
                })
            }
        }

    $groups = @($rows | Group-Object method, path)
    $compressed = New-Object System.Collections.Generic.List[object]
    foreach ($group in $groups) {
        $items = @($group.Group)
        if ($items.Count -eq 0) {
            continue
        }

        $first = $items[0]
        $compressed.Add([pscustomobject]@{
            source = 'supplemental-route'
            method = $first.method
            path = $first.path
            shape = $first.shape
            source_file = (($items | ForEach-Object { $_.source_file } | Sort-Object -Unique) -join ';')
            handler = (($items | ForEach-Object { $_.handler } | Sort-Object -Unique) -join ';')
        })
    }

    return @($compressed | Sort-Object method, path)
}

function New-AspNetRouteIndex {
    param([object[]]$Routes)

    $byMethodPath = @{}
    $byMethodShape = @{}

    foreach ($route in $Routes) {
        $pathKey = "$($route.method) $($route.path)"
        $shapeKey = "$($route.method) $($route.shape)"

        if (-not $byMethodPath.ContainsKey($pathKey)) {
            $byMethodPath[$pathKey] = New-Object System.Collections.Generic.List[object]
        }
        $byMethodPath[$pathKey].Add($route)

        if (-not $byMethodShape.ContainsKey($shapeKey)) {
            $byMethodShape[$shapeKey] = New-Object System.Collections.Generic.List[object]
        }
        $byMethodShape[$shapeKey].Add($route)
    }

    return @{
        ByMethodPath = $byMethodPath
        ByMethodShape = $byMethodShape
    }
}

function Get-IndexMatches {
    param(
        [hashtable]$Index,
        [string]$Bucket,
        [string]$Key
    )

    $bucketIndex = $Index[$Bucket]
    if (-not $bucketIndex.ContainsKey($Key)) {
        return @()
    }

    return @($bucketIndex[$Key].ToArray())
}

function Compare-Operations {
    param(
        [object[]]$SourceOperations,
        [hashtable]$AspNetIndex
    )

    $rows = New-Object System.Collections.Generic.List[object]

    foreach ($operation in $SourceOperations) {
        $pathKey = "$($operation.method) $($operation.path)"
        $shapeKey = "$($operation.method) $($operation.shape)"
        $matches = @()
        $status = 'missing'

        if ($AspNetIndex.ByMethodPath.ContainsKey($pathKey)) {
            $matches = Get-IndexMatches $AspNetIndex 'ByMethodPath' $pathKey
            $status = 'matched'
        } elseif ($AspNetIndex.ByMethodShape.ContainsKey($shapeKey)) {
            $matches = Get-IndexMatches $AspNetIndex 'ByMethodShape' $shapeKey
            $status = 'matched'
        }

        $rows.Add([pscustomobject]@{
            source = $operation.source
            method = $operation.method
            normalized_path = $operation.path
            route_shape = $operation.shape
            status = $status
            aspnet_controllers = (($matches | ForEach-Object { $_.controller } | Sort-Object -Unique) -join ';')
            aspnet_actions = (($matches | ForEach-Object { $_.action } | Sort-Object -Unique) -join ';')
            source_file = $operation.source_file
            source_handler = $operation.handler
        })
    }

    return @($rows | Sort-Object status, source, method, normalized_path)
}

function Write-MarkdownReport {
    param(
        [object]$Summary,
        [object[]]$Matrix,
        [string]$Path
    )

    $missing = @($Matrix | Where-Object { $_.status -eq 'missing' })
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('# API Parity Report')
    $lines.Add('')
    $lines.Add("Generated: $($Summary.generated_at)")
    $lines.Add('')
    $lines.Add('| Metric | Count |')
    $lines.Add('| --- | ---: |')
    $lines.Add("| ASP.NET operations | $($Summary.aspnet_operations) |")
    $lines.Add("| Laravel OpenAPI operations | $($Summary.laravel_openapi_operations) |")
    $lines.Add("| Supplemental route operations | $($Summary.supplemental_route_operations) |")
    $lines.Add("| Matched operations | $($Summary.matched_operations) |")
    $lines.Add("| Missing operations | $($Summary.missing_operations) |")
    $lines.Add('')
    $lines.Add('## Missing Operations')
    $lines.Add('')

    if ($missing.Count -eq 0) {
        $lines.Add('No missing operations found by this static comparison.')
    } else {
        $lines.Add('| Source | Method | Path | Source file |')
        $lines.Add('| --- | --- | --- | --- |')
        foreach ($row in $missing) {
            $routePath = [string]$row.normalized_path
            $sourceFile = [string]$row.source_file
            $lines.Add("| $($row.source) | $($row.method) | ``$routePath`` | ``$sourceFile`` |")
        }
    }

    $lines | Set-Content -LiteralPath $Path
}

try {
    Ensure-Directory $OutDir

    $aspNetRoutes = @(Get-AspNetRoutes $TargetRoot)
    $openApiOperations = @(Get-LaravelOpenApiOperations $SourceRoot)
    $supplementalOperations = @(Get-LaravelSupplementalRoutes $SourceRoot $openApiOperations)
    $sourceOperations = @($openApiOperations + $supplementalOperations)
    $aspNetIndex = New-AspNetRouteIndex $aspNetRoutes
    $matrix = Compare-Operations $sourceOperations $aspNetIndex

    $summary = [pscustomobject]@{
        generated_at = (Get-Date).ToString('o')
        target_root = $TargetRoot
        source_root = $SourceRoot
        aspnet_operations = $aspNetRoutes.Count
        laravel_openapi_operations = $openApiOperations.Count
        supplemental_route_operations = $supplementalOperations.Count
        total_source_operations = $sourceOperations.Count
        matched_operations = @($matrix | Where-Object { $_.status -eq 'matched' }).Count
        missing_operations = @($matrix | Where-Object { $_.status -eq 'missing' }).Count
    }

    $report = [pscustomobject]@{
        summary = $summary
        matrix = $matrix
    }

    $jsonPath = Join-Path $OutDir 'api-parity.json'
    $markdownPath = Join-Path $OutDir 'api-parity.md'
    $csvPath = Join-Path $OutDir 'api-parity.csv'

    $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath
    $matrix | Export-Csv -LiteralPath $csvPath -NoTypeInformation
    Write-MarkdownReport $summary $matrix $markdownPath

    $summary | Format-List
    Write-Host "API parity report written to $jsonPath"
    Write-Host "API parity markdown written to $markdownPath"
} catch {
    Write-Error "API parity comparison failed at line $($_.InvocationInfo.ScriptLineNumber): $($_.Exception.Message)"
    throw
}

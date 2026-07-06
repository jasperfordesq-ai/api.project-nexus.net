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
    $scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
    $TargetRoot = (Resolve-Path (Join-Path $scriptRoot '..')).Path
}

if ([string]::IsNullOrWhiteSpace($OutDir)) {
    $OutDir = Join-Path $TargetRoot 'artifacts\parity-audit'
}

function Ensure-Directory {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
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
    $normalized = $normalized -replace '\[controller\]', 'controller'
    $normalized = $normalized -replace '\{([A-Za-z0-9_]+)(:[^}]+)?\}', '{$1}'
    $normalized = $normalized -replace ':([A-Za-z0-9_]+)', '{$1}'
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

function Normalize-FrontendApiPath {
    param([string]$Path)

    $normalized = $Path -replace '^/v2/', '/api/'
    $normalized = $normalized -replace '\$\{?buildQuery.*$', ''
    $normalized = $normalized -replace '(?<!/)\$\{.*$', ''
    $normalized = $normalized -replace '\$\{[^}/]+}', '{id}'
    $normalized = $normalized -replace '\$\{[^/]+$', '{id}'
    $normalized = $normalized -replace '\$\([^)]+\)', '{id}'
    $normalized = $normalized -replace '\$\w+', '{id}'
    return Normalize-RoutePath $normalized
}

function Get-FrontendMethodHint {
    param([string]$Line, [int]$MatchIndex)

    $prefix = if ($MatchIndex -gt 0) { $Line.Substring(0, $MatchIndex) } else { '' }
    $methodMatches = [regex]::Matches($prefix, '(?i)(?:\.|\b)(get|post|put|patch|delete)\s*(?:<[^>]+>)?\s*\(\s*[''"]?`?$')
    if ($methodMatches.Count -gt 0) {
        return $methodMatches[$methodMatches.Count - 1].Groups[1].Value.ToUpperInvariant()
    }

    $methodMatches = [regex]::Matches($prefix, '(?i)(?:method\s*:\s*[''"]|method\s*=\s*[''"])(get|post|put|patch|delete)')
    if ($methodMatches.Count -gt 0) {
        return $methodMatches[$methodMatches.Count - 1].Groups[1].Value.ToUpperInvariant()
    }

    return ''
}

function Join-RoutePath {
    param([string]$Prefix, [string]$Child)

    if (-not [string]::IsNullOrWhiteSpace($Child) -and $Child.Trim().StartsWith('/')) {
        return Normalize-RoutePath $Child
    }

    $combined = (($Prefix.Trim('/'), $Child.Trim('/')) | Where-Object { $_ }) -join '/'
    return Normalize-RoutePath $combined
}

function Get-AspNetV2AdminAlias {
    param([string]$Prefix)

    $normalized = Normalize-RoutePath $Prefix
    $aliasedPrefixes = @(
        '/api/admin/caring-community',
        '/api/admin/safeguarding',
        '/api/users',
        '/api/groups',
        '/api/jobs',
        '/api/federation',
        '/api/goals'
    )

    foreach ($aliasedPrefix in $aliasedPrefixes) {
        if ($normalized -eq $aliasedPrefix -or $normalized.StartsWith("$aliasedPrefix/")) {
            if ($aliasedPrefix -eq '/api/users') {
                return $normalized -replace '^/api/users', '/api/v2/users'
            }

            if ($aliasedPrefix -eq '/api/groups') {
                return $normalized -replace '^/api/groups', '/api/v2/groups'
            }

            if ($aliasedPrefix -eq '/api/jobs') {
                return $normalized -replace '^/api/jobs', '/api/v2/jobs'
            }

            if ($aliasedPrefix -eq '/api/federation') {
                return $normalized -replace '^/api/federation', '/api/v2/federation'
            }

            if ($aliasedPrefix -eq '/api/goals') {
                return $normalized -replace '^/api/goals', '/api/v2/goals'
            }

            return $normalized -replace '^/api/admin/', '/api/v2/admin/'
        }
    }

    return ''
}

function Get-AspNetV2RouteAlias {
    param([string]$Path)

    $normalized = Normalize-RoutePath $Path
    if ($normalized -eq '/api/users/me' -or $normalized.StartsWith('/api/users/me/')) {
        return $normalized -replace '^/api/users/me', '/api/v2/users/me'
    }

    if ($normalized -eq '/api/groups' -or $normalized.StartsWith('/api/groups/')) {
        return $normalized -replace '^/api/groups', '/api/v2/groups'
    }

    if ($normalized -eq '/api/jobs' -or $normalized.StartsWith('/api/jobs/')) {
        return $normalized -replace '^/api/jobs', '/api/v2/jobs'
    }

    if ($normalized -eq '/api/federation' -or $normalized.StartsWith('/api/federation/')) {
        return $normalized -replace '^/api/federation', '/api/v2/federation'
    }

    if ($normalized -eq '/api/goals' -or $normalized.StartsWith('/api/goals/')) {
        return $normalized -replace '^/api/goals', '/api/v2/goals'
    }

    return ''
}

function Export-AspNetRoutes {
    param([string]$Root, [string]$Destination)

    $controllerRoot = Join-Path $Root 'src\Nexus.Api\Controllers'
    if (-not (Test-Path -LiteralPath $controllerRoot)) {
        Write-Warning "ASP.NET controller root not found: $controllerRoot"
        return @()
    }

    $rows = New-Object System.Collections.Generic.List[object]
    $httpMap = @{
        HttpGet = 'GET'
        HttpPost = 'POST'
        HttpPut = 'PUT'
        HttpPatch = 'PATCH'
        HttpDelete = 'DELETE'
        HttpHead = 'HEAD'
        HttpOptions = 'OPTIONS'
    }

    Get-ChildItem -LiteralPath $controllerRoot -Recurse -Filter '*.cs' |
        Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' } |
        ForEach-Object {
            $file = $_
            $text = Get-Content -LiteralPath $file.FullName -Raw
            $classMatches = [regex]::Matches($text, '(?m)^\s*(?:(?:public|internal)\s+)?(?:(?:sealed|abstract|partial|static)\s+)*class\s+([A-Za-z0-9_]+)\b')
            if ($classMatches.Count -eq 0) {
                $classMatches = @([pscustomobject]@{ Index = 0; Groups = @(@{ Value = $file.BaseName }) })
            }

            for ($classIdx = 0; $classIdx -lt $classMatches.Count; $classIdx++) {
                $classMatch = $classMatches[$classIdx]
                $className = $classMatch.Groups[1].Value
                $controllerName = $className -replace 'Controller$', ''
                $segmentStart = $classMatch.Index
                $segmentEnd = if ($classIdx + 1 -lt $classMatches.Count) { $classMatches[$classIdx + 1].Index } else { $text.Length }
                $segment = $text.Substring($segmentStart, $segmentEnd - $segmentStart)

                $attributeWindowStart = [Math]::Max(0, $segmentStart - 1500)
                $attributeWindow = $text.Substring($attributeWindowStart, $segmentStart - $attributeWindowStart)
                $routeMatches = [regex]::Matches($attributeWindow, '\[Route\("([^"]+)"\)\]')
                $prefixes = New-Object System.Collections.Generic.List[string]
                foreach ($routeMatch in $routeMatches) {
                    $prefix = $routeMatch.Groups[1].Value -replace '\[controller\]', $controllerName
                    $prefixes.Add($prefix)
                    $alias = Get-AspNetV2AdminAlias $prefix
                    if (-not [string]::IsNullOrWhiteSpace($alias) -and -not $prefixes.Contains($alias.TrimStart('/'))) {
                        $prefixes.Add($alias.TrimStart('/'))
                    }
                }
                if ($prefixes.Count -eq 0) {
                    $prefixes.Add('')
                }

                $lines = $segment -split "`r?`n"
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    $line = $lines[$i]
                    $match = [regex]::Match($line, '\[(HttpGet|HttpPost|HttpPut|HttpPatch|HttpDelete|HttpHead|HttpOptions)(?:\("([^"]*)"\))?')
                    if (-not $match.Success) { continue }

                    $verb = $httpMap[$match.Groups[1].Value]
                    $child = $match.Groups[2].Value
                    $action = ''
                    $lookAheadEnd = [Math]::Min($i + 10, $lines.Count - 1)
                    for ($j = $i; $j -le $lookAheadEnd; $j++) {
                        $actionMatch = [regex]::Match($lines[$j], '\b(?:async\s+)?(?:Task(?:<[^>]+>)?|IActionResult|ActionResult(?:<[^>]+>)?|[A-Za-z0-9_<>,\?\[\]]+)\s+([A-Za-z0-9_]+)\s*\(')
                        if ($actionMatch.Success) {
                            $action = $actionMatch.Groups[1].Value
                            break
                        }
                    }

                    $authNotes = @()
                    $nearbyStart = [Math]::Max(0, $i - 8)
                    $nearby = ($lines[$nearbyStart..$i] -join "`n")
                    if ($segment -match '\[Authorize' -or $nearby -match '\[Authorize') { $authNotes += 'authorize' }
                    if ($nearby -match '\[AllowAnonymous') { $authNotes += 'allow-anonymous' }

                    foreach ($prefix in $prefixes) {
                        $path = Join-RoutePath $prefix $child
                        $rows.Add([pscustomobject]@{
                            method = $verb
                            path = $path
                            controller = $controllerName
                            action = $action
                            file = $file.FullName
                            auth_notes = ($authNotes -join ';')
                        })

                        $aliasPath = Get-AspNetV2RouteAlias $path
                        if (-not [string]::IsNullOrWhiteSpace($aliasPath)) {
                            $rows.Add([pscustomobject]@{
                                method = $verb
                                path = $aliasPath
                                controller = $controllerName
                                action = $action
                                file = $file.FullName
                                auth_notes = ($authNotes -join ';')
                            })
                        }
                    }
                }
            }
        }

    $uniqueRows = $rows | Sort-Object method, path, controller, action -Unique
    $uniqueRows | Export-Csv -LiteralPath $Destination -NoTypeInformation
    return $uniqueRows
}

function Export-LaravelRoutes {
    param([string]$SourceRoot, [string]$Destination)

    $apiFile = Join-Path $SourceRoot 'routes\api.php'
    if (-not (Test-Path -LiteralPath $apiFile)) {
        Write-Warning "Laravel routes file not found: $apiFile"
        return @()
    }

    $rows = New-Object System.Collections.Generic.List[object]
    $text = Get-Content -LiteralPath $apiFile -Raw
    $matches = [regex]::Matches($text, 'Route::(get|post|put|patch|delete|options|any)\s*\(\s*[''"]([^''"]+)[''"]\s*,\s*([^)]+)\)', 'IgnoreCase')

    foreach ($match in $matches) {
        $handler = ($match.Groups[3].Value -replace '\s+', ' ').Trim()
        $routePath = Normalize-RoutePath $match.Groups[2].Value
        if (-not $routePath.StartsWith('/api/')) {
            $routePath = Normalize-RoutePath "/api/$($match.Groups[2].Value)"
        }
        $rows.Add([pscustomobject]@{
            method = $match.Groups[1].Value.ToUpperInvariant()
            path = $routePath
            handler = $handler
            file = $apiFile
        })
    }

    $rows | Sort-Object method, path, handler | Export-Csv -LiteralPath $Destination -NoTypeInformation
    return $rows
}

function Export-ReactRoutes {
    param([string]$AppFile, [string]$Destination, [string]$Label)

    if (-not (Test-Path -LiteralPath $AppFile)) {
        Write-Warning "$Label App.tsx not found: $AppFile"
        return @()
    }

    $text = Get-Content -LiteralPath $AppFile -Raw
    $rows = [regex]::Matches($text, '<Route\s+[^>]*path=\{?["'']([^"''}]+)["'']\}?', 'IgnoreCase') |
        ForEach-Object {
            [pscustomobject]@{
                app = $Label
                route = Normalize-RoutePath $_.Groups[1].Value
                file = $AppFile
            }
        } |
        Sort-Object route -Unique

    $rows | Export-Csv -LiteralPath $Destination -NoTypeInformation
    return $rows
}

function Convert-NextFileToRoute {
    param([string]$AppRoot, [string]$File)

    $rootUri = [Uri]((Resolve-Path -LiteralPath $AppRoot).Path.TrimEnd('\') + '\')
    $fileUri = [Uri](Resolve-Path -LiteralPath $File).Path
    $relative = [Uri]::UnescapeDataString($rootUri.MakeRelativeUri($fileUri).ToString()) -replace '\\', '/'
    $route = $relative -replace '/(page|route)\.(tsx|ts|jsx|js)$', ''
    $route = $route -replace '\([^)]+\)/?', ''
    $route = $route -replace '\[([^\]]+)\]', '{$1}'
    return Normalize-RoutePath $route
}

function Export-FrontendApiStrings {
    param([string]$Root, [string]$Destination)

    $appSrcs = @(
        'apps\react-frontend\src',
        'apps\admin\src',
        'apps\web-uk\src'
    )

    $pattern = '(?i)(?:/api|/v2)/[A-Za-z0-9_\-./:{}\[\]$?=&%]+'
    $rows = New-Object System.Collections.Generic.List[object]

    foreach ($relative in $appSrcs) {
        $src = Join-Path $Root $relative
        if (-not (Test-Path -LiteralPath $src)) { continue }
        $app = ($relative -split '\\')[1]

        Get-ChildItem -LiteralPath $src -Recurse -Include '*.ts','*.tsx','*.js','*.jsx' -File |
            Where-Object {
                $_.FullName -notmatch '\\(node_modules|dist|build|\.next|coverage|\.claude|__tests__|__mocks__)\\' -and
                $_.Name -notmatch '\.(test|spec)\.(ts|tsx|js|jsx)$'
            } |
            ForEach-Object {
                $file = $_
                $lineNo = 0
                Get-Content -LiteralPath $file.FullName | ForEach-Object {
                    $lineNo++
                    $trimmed = $_.TrimStart()
                    if (-not ($trimmed.StartsWith('//') -or $trimmed.StartsWith('*') -or $trimmed.StartsWith('{/*'))) {
                        $commentIndex = $_.IndexOf('//')
                        foreach ($match in [regex]::Matches($_, $pattern)) {
                            $skip = $false
                            if ($commentIndex -ge 0 -and $match.Index -gt $commentIndex) {
                                $skip = $true
                            }
                            if ($match.Index -gt 0) {
                                $previous = $_[$match.Index - 1]
                                if ($previous -match '[A-Za-z0-9_.@-]') {
                                    $skip = $true
                                }
                            }
                            if (-not $skip) {
                                $raw = $match.Value.TrimEnd("'", '"', '`', ',', '.', ')')
                                $normalizedPath = Normalize-FrontendApiPath $raw
                                $suffix = $_.Substring($match.Index + $match.Length)
                                if ($normalizedPath.EndsWith('/') -or $raw.EndsWith('/')) {
                                    if ($suffix -match '^\s*[''"]?\s*\+\s*[A-Za-z_][A-Za-z0-9_]*') {
                                        $normalizedPath = Normalize-RoutePath "$normalizedPath/{id}"
                                    }
                                }
                                $rows.Add([pscustomobject]@{
                                    app = $app
                                    method_hint = Get-FrontendMethodHint $_ $match.Index
                                    raw = $raw
                                    normalized = $normalizedPath
                                    file = $file.FullName
                                    line = $lineNo
                                })
                            }
                        }
                    }
                }
            }
    }

    $rows | Sort-Object app, normalized, file, line | Export-Csv -LiteralPath $Destination -NoTypeInformation
    return $rows
}

function New-RouteIndex {
    param([object[]]$Routes)

    $byPath = @{}
    $byMethodPath = @{}
    $byShape = @{}
    $byMethodShape = @{}

    foreach ($route in $Routes) {
        $path = Normalize-RoutePath $route.path
        $shape = Convert-ToRouteShape $path
        $method = ([string]$route.method).ToUpperInvariant()
        if (-not $byPath.ContainsKey($path)) {
            $byPath[$path] = New-Object System.Collections.Generic.List[object]
        }
        $byPath[$path].Add($route)

        if (-not $byShape.ContainsKey($shape)) {
            $byShape[$shape] = New-Object System.Collections.Generic.List[object]
        }
        $byShape[$shape].Add($route)

        $key = "$method $path"
        if (-not $byMethodPath.ContainsKey($key)) {
            $byMethodPath[$key] = New-Object System.Collections.Generic.List[object]
        }
        $byMethodPath[$key].Add($route)

        $shapeKey = "$method $shape"
        if (-not $byMethodShape.ContainsKey($shapeKey)) {
            $byMethodShape[$shapeKey] = New-Object System.Collections.Generic.List[object]
        }
        $byMethodShape[$shapeKey].Add($route)
    }

    return @{
        ByPath = $byPath
        ByShape = $byShape
        ByMethodPath = $byMethodPath
        ByMethodShape = $byMethodShape
    }
}

function Test-UnresolvedTemplate {
    param([string]$Path)
    return $Path -match '\$\{|\$\(|\+|`'
}

function Get-RouteIndexMatches {
    param([hashtable]$Index, [string]$Bucket, [string]$Key)

    if (-not $Index[$Bucket].ContainsKey($Key)) {
        return @()
    }

    $items = New-Object System.Collections.Generic.List[object]
    foreach ($item in $Index[$Bucket][$Key]) {
        $items.Add($item)
    }
    return $items.ToArray()
}

function Export-FrontendApiMatrix {
    param([object[]]$ApiStrings, [hashtable]$AspNetIndex, [string]$Destination)

    $rows = New-Object System.Collections.Generic.List[object]

    foreach ($apiString in $ApiStrings) {
        $path = Normalize-RoutePath $apiString.normalized
        $methodHint = ([string]$apiString.method_hint).ToUpperInvariant()
        $matches = @()
        $status = 'missing'
        $methodKey = "$methodHint $path"
        $methodShapeKey = "$methodHint $(Convert-ToRouteShape $path)"

        if (Test-UnresolvedTemplate $path) {
            $status = 'dynamic-unresolved'
        } elseif ($methodHint -and $AspNetIndex.ByMethodPath.ContainsKey($methodKey)) {
            $matches = Get-RouteIndexMatches $AspNetIndex 'ByMethodPath' $methodKey
            $controllers = ($matches | ForEach-Object { $_.controller } | Sort-Object -Unique) -join ';'
            if ($controllers -match 'Compatibility') {
                $status = 'exists-compatibility'
            } else {
                $status = 'exists'
            }
        } elseif ($methodHint -and $AspNetIndex.ByMethodShape.ContainsKey($methodShapeKey)) {
            $matches = Get-RouteIndexMatches $AspNetIndex 'ByMethodShape' $methodShapeKey
            $controllers = ($matches | ForEach-Object { $_.controller } | Sort-Object -Unique) -join ';'
            if ($controllers -match 'Compatibility') {
                $status = 'exists-compatibility'
            } else {
                $status = 'exists'
            }
        } elseif ($AspNetIndex.ByPath.ContainsKey($path)) {
            $matches = Get-RouteIndexMatches $AspNetIndex 'ByPath' $path
            $controllers = ($matches | ForEach-Object { $_.controller } | Sort-Object -Unique) -join ';'
            if ($controllers -match 'Compatibility') {
                $status = 'exists-compatibility'
            } else {
                $status = if ($methodHint) { 'method-mismatch' } else { 'exists-any-method' }
            }
        } elseif ($AspNetIndex.ByShape.ContainsKey((Convert-ToRouteShape $path))) {
            $matches = Get-RouteIndexMatches $AspNetIndex 'ByShape' (Convert-ToRouteShape $path)
            $controllers = ($matches | ForEach-Object { $_.controller } | Sort-Object -Unique) -join ';'
            if ($controllers -match 'Compatibility') {
                $status = 'exists-compatibility'
            } else {
                $status = if ($methodHint) { 'method-mismatch' } else { 'exists-any-method' }
            }
        }

        $rows.Add([pscustomobject]@{
            app = $apiString.app
            raw = $apiString.raw
            normalized = $path
            status = $status
            aspnet_methods = (($matches | ForEach-Object { $_.method } | Sort-Object -Unique) -join ';')
            aspnet_controllers = (($matches | ForEach-Object { $_.controller } | Sort-Object -Unique) -join ';')
            frontend_file = $apiString.file
            frontend_line = $apiString.line
        })
    }

    $rows | Sort-Object app, status, normalized, frontend_file, frontend_line | Export-Csv -LiteralPath $Destination -NoTypeInformation
    return $rows
}

function Export-LaravelToAspNetMatrix {
    param([object[]]$LaravelRoutes, [hashtable]$AspNetIndex, [string]$Destination)

    $rows = New-Object System.Collections.Generic.List[object]

    foreach ($route in $LaravelRoutes) {
        $path = Normalize-RoutePath $route.path
        $method = ([string]$route.method).ToUpperInvariant()
        $methodKey = "$method $path"
        $methodShapeKey = "$method $(Convert-ToRouteShape $path)"
        $matches = @()
        $status = 'missing'

        if ($AspNetIndex.ByMethodPath.ContainsKey($methodKey)) {
            $matches = Get-RouteIndexMatches $AspNetIndex 'ByMethodPath' $methodKey
            $controllers = ($matches | ForEach-Object { $_.controller } | Sort-Object -Unique) -join ';'
            $status = if ($controllers -match 'Compatibility') { 'method-path-compatibility' } else { 'method-path-exact' }
        } elseif ($AspNetIndex.ByMethodShape.ContainsKey($methodShapeKey)) {
            $matches = Get-RouteIndexMatches $AspNetIndex 'ByMethodShape' $methodShapeKey
            $controllers = ($matches | ForEach-Object { $_.controller } | Sort-Object -Unique) -join ';'
            $status = if ($controllers -match 'Compatibility') { 'method-path-compatibility' } else { 'method-path-exact' }
        } elseif ($AspNetIndex.ByPath.ContainsKey($path)) {
            $matches = Get-RouteIndexMatches $AspNetIndex 'ByPath' $path
            $status = 'path-exists-method-mismatch'
        }

        $rows.Add([pscustomobject]@{
            v15_method = $method
            v15_path = $path
            v15_handler = $route.handler
            status = $status
            aspnet_methods = (($matches | ForEach-Object { $_.method } | Sort-Object -Unique) -join ';')
            aspnet_controllers = (($matches | ForEach-Object { $_.controller } | Sort-Object -Unique) -join ';')
            aspnet_actions = (($matches | ForEach-Object { $_.action } | Sort-Object -Unique) -join ';')
        })
    }

    $rows | Sort-Object status, v15_method, v15_path | Export-Csv -LiteralPath $Destination -NoTypeInformation
    return $rows
}

function Export-FrontendRouteParityMatrix {
    param([object[]]$V15Routes, [object[]]$CurrentReactRoutes, [string]$Destination)

    $currentSet = @{}
    foreach ($route in $CurrentReactRoutes) {
        $currentSet[(Normalize-RoutePath $route.route)] = $true
    }

    $rows = New-Object System.Collections.Generic.List[object]
    foreach ($route in $V15Routes) {
        $path = Normalize-RoutePath $route.route
        $hasCurrent = $currentSet.ContainsKey($path)
        $status = if ($hasCurrent) {
            'current-react-exact'
        } else {
            'missing'
        }

        $rows.Add([pscustomobject]@{
            v15_route = $path
            current_react_route = if ($hasCurrent) { $path } else { '' }
            status = $status
        })
    }

    $rows | Sort-Object status, v15_route | Export-Csv -LiteralPath $Destination -NoTypeInformation
    return $rows
}

Ensure-Directory $OutDir

$aspNetRoutes = Export-AspNetRoutes $TargetRoot (Join-Path $OutDir 'aspnet-routes.csv')
$laravelRoutes = Export-LaravelRoutes $SourceRoot (Join-Path $OutDir 'v15-laravel-routes.csv')
$currentReactRoutes = Export-ReactRoutes (Join-Path $TargetRoot 'apps\react-frontend\src\App.tsx') (Join-Path $OutDir 'react-routes-current.csv') 'react-frontend-current'
$v15ReactRoutes = Export-ReactRoutes (Join-Path $SourceRoot 'react-frontend\src\App.tsx') (Join-Path $OutDir 'react-routes-v15.csv') 'react-frontend-v15'
$frontendApiStrings = Export-FrontendApiStrings $TargetRoot (Join-Path $OutDir 'frontend-api-strings.csv')
$aspNetIndex = New-RouteIndex $aspNetRoutes
$frontendApiMatrix = Export-FrontendApiMatrix $frontendApiStrings $aspNetIndex (Join-Path $OutDir 'frontend-api-to-aspnet-matrix.csv')
$laravelMatrix = Export-LaravelToAspNetMatrix $laravelRoutes $aspNetIndex (Join-Path $OutDir 'v15-laravel-to-aspnet-matrix.csv')
$routeParityMatrix = Export-FrontendRouteParityMatrix $v15ReactRoutes $currentReactRoutes (Join-Path $OutDir 'frontend-route-parity-matrix.csv')

$summary = [pscustomobject]@{
    generated_at = (Get-Date).ToString('o')
    target_root = $TargetRoot
    source_root = $SourceRoot
    aspnet_routes = $aspNetRoutes.Count
    v15_laravel_routes = $laravelRoutes.Count
    current_react_routes = $currentReactRoutes.Count
    v15_react_routes = $v15ReactRoutes.Count
    frontend_api_strings = $frontendApiStrings.Count
    frontend_api_missing = @($frontendApiMatrix | Where-Object { $_.status -eq 'missing' }).Count
    frontend_api_dynamic_unresolved = @($frontendApiMatrix | Where-Object { $_.status -eq 'dynamic-unresolved' }).Count
    v15_laravel_missing = @($laravelMatrix | Where-Object { $_.status -eq 'missing' }).Count
    v15_routes_missing = @($routeParityMatrix | Where-Object { $_.status -eq 'missing' }).Count
}

$summary | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $OutDir 'summary.json')
$summary | Format-List

Write-Host "Parity audit artifacts written to $OutDir"

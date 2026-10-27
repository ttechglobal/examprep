$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$outputRoot = Join-Path $projectRoot 'handoff-output'
$buildName = 'examprep-flutter-handoff-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff')
$packageRoot = Join-Path $outputRoot $buildName
$sourceRoot = Join-Path $packageRoot 'reference/pwa-source'
New-Item -ItemType Directory -Path $sourceRoot -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot 'docs') -Force | Out-Null

# Explicit allowlist: never copy environment files, .git, build output or dependencies.
foreach ($directory in @('src', 'public', 'tests', 'scripts')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $directory) -Destination $sourceRoot -Recurse
}
foreach ($file in @('package.json', 'package-lock.json', 'README.md', 'next.config.mjs', 'jsconfig.json', 'eslint.config.mjs', 'postcss.config.mjs')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $sourceRoot
}
$referenceDocs = Join-Path $sourceRoot 'docs'
New-Item -ItemType Directory -Path $referenceDocs -Force | Out-Null
Get-ChildItem -LiteralPath (Join-Path $projectRoot 'docs') -File -Filter '*.md' | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $referenceDocs
}

$handoffDocs = Join-Path $projectRoot 'docs/flutter-handoff'
foreach ($name in @('README.md', 'AGENTS.md', 'START-HERE-PROMPT.md')) {
    Copy-Item -LiteralPath (Join-Path $handoffDocs $name) -Destination $packageRoot
}
foreach ($name in @('architecture.md', 'visual-parity.md', 'backend-contracts.md', 'question-rendering-update-2026-10-26.md', 'question-rendering-examples-2026-10-26.json')) {
    Copy-Item -LiteralPath (Join-Path $handoffDocs $name) -Destination (Join-Path $packageRoot 'docs')
}
Copy-Item -LiteralPath (Join-Path $projectRoot 'docs/flutter-product-prd.md') -Destination (Join-Path $packageRoot 'docs/product-prd.md')

$appRoot = Join-Path $sourceRoot 'src/app'
Get-ChildItem -LiteralPath $appRoot -Recurse -File -Filter 'page.js' | Where-Object {
    $relative = $_.FullName.Substring($appRoot.Length).Replace('\', '/')
    $relative.StartsWith('/student/') -or $relative -eq '/onboarding/page.js'
} | ForEach-Object {
    $relative = $_.FullName.Substring($appRoot.Length).Replace('\', '/')
    $route = $relative -replace '/page.js$', ''
    $disposition = 'Reproduce; inventory nested sheets/states before claiming parity'
    if ($route -eq '/student/learn/world') { $disposition = 'EXCLUDED: Learning World' }
    if ($route -eq '/student/subjects') { $disposition = 'Legacy redirect to profile setup' }
    [pscustomobject]@{route=$route; source=('src/app' + $relative); disposition=$disposition; visual_capture='Pending'; flutter_status='Not started'}
} | Sort-Object route | Export-Csv -LiteralPath (Join-Path $packageRoot 'reference/screen-inventory.csv') -NoTypeInformation -Encoding UTF8

Get-ChildItem -LiteralPath (Join-Path $appRoot 'api') -Recurse -File -Filter 'route.js' | ForEach-Object {
    $relative = $_.FullName.Substring($appRoot.Length).Replace('\', '/')
    [pscustomobject]@{route=($relative -replace '/route.js$', ''); source=('src/app' + $relative); note='Existing web implementation; verify native auth and contract'}
} | Sort-Object route | Export-Csv -LiteralPath (Join-Path $packageRoot 'reference/api-inventory.csv') -NoTypeInformation -Encoding UTF8

$publicRoot = Join-Path $sourceRoot 'public'
Get-ChildItem -LiteralPath $publicRoot -Recurse -File | ForEach-Object {
    [pscustomobject]@{path=('public' + $_.FullName.Substring($publicRoot.Length).Replace('\', '/')); bytes=$_.Length; sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
} | Export-Csv -LiteralPath (Join-Path $packageRoot 'reference/assets.csv') -NoTypeInformation -Encoding UTF8

$revision = & git -C $projectRoot rev-parse HEAD
$status = & git -C $projectRoot status --short
@("Source: $projectRoot", "Base Git revision: $revision", 'Snapshot includes current working-tree files, not only committed files.', 'Working-tree status:', $status) | Set-Content -LiteralPath (Join-Path $packageRoot 'reference/source-baseline.txt') -Encoding UTF8

$forbidden = Get-ChildItem -LiteralPath $packageRoot -Recurse -File | Where-Object { $_.Name -like '.env*' -or $_.Extension -in @('.pem', '.key', '.pfx', '.p12', '.jks', '.keystore') }
if ($forbidden) { throw 'Forbidden configuration/key files found; package not archived.' }

$manifestFiles = @(Get-ChildItem -LiteralPath $packageRoot -Recurse -File | Where-Object { $_.Name -ne 'manifest.csv' })
$manifestFiles | ForEach-Object {
    [pscustomobject]@{path=$_.FullName.Substring($packageRoot.Length + 1).Replace('\', '/'); bytes=$_.Length; sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
} | Export-Csv -LiteralPath (Join-Path $packageRoot 'manifest.csv') -NoTypeInformation -Encoding UTF8

$archive = Join-Path $outputRoot ($buildName + '.zip')
Compress-Archive -Path (Join-Path $packageRoot '*') -DestinationPath $archive -CompressionLevel Optimal
[pscustomobject]@{package=$packageRoot; archive=$archive; files=(Get-ChildItem -LiteralPath $packageRoot -Recurse -File).Count; archiveBytes=(Get-Item -LiteralPath $archive).Length} | ConvertTo-Json

# MyThing dev launcher — sets Cargo PATH and starts Tauri dev server.
$ErrorActionPreference = 'Stop'

$ProjectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$CargoBin = Join-Path $env:USERPROFILE '.cargo\bin'

if (Test-Path $CargoBin) {
    if ($env:Path -notlike "*$CargoBin*") {
        $env:Path = "$CargoBin;$env:Path"
        Write-Host "Added Cargo to PATH: $CargoBin"
    }
} else {
    Write-Warning "Cargo not found at $CargoBin — install Rust from https://rustup.rs"
}

Set-Location $ProjectRoot
Write-Host "Starting MyThing from $ProjectRoot`n"

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command 'node')) {
    Write-Error 'Node.js not found. Install Node 18+ and reopen this launcher.'
}
if (-not (Test-Command 'npm')) {
    Write-Error 'npm not found. Install Node.js and reopen this launcher.'
}
if (-not (Test-Command 'cargo')) {
    Write-Error "cargo not found. Install Rust, or ensure $CargoBin is on PATH."
}

if (-not (Test-Path (Join-Path $ProjectRoot 'node_modules'))) {
    Write-Host 'Installing npm dependencies…'
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
}

npm run tauri:dev
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Host "`nMyThing exited with code $exitCode."
    Read-Host 'Press Enter to close'
    exit $exitCode
}

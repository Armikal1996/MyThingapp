# MyThing dev launcher — sets Cargo PATH and starts Tauri dev server.
$ErrorActionPreference = 'Stop'

$ProjectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

# Double-click / Explorer launches get a shorter PATH than your terminal.
$machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$env:Path = "$machinePath;$userPath"

$CargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
if (Test-Path $CargoBin) {
    if ($env:Path -notlike "*$CargoBin*") {
        $env:Path = "$CargoBin;$env:Path"
        Write-Host "Added Cargo to PATH: $CargoBin"
    }
}

$nodeCandidates = @(
    (Join-Path ${env:ProgramFiles} 'nodejs'),
    (Join-Path ${env:'ProgramFiles(x86)'} 'nodejs'),
    (Join-Path $env:APPDATA 'npm'),
    (Join-Path $env:LOCALAPPDATA 'Programs\nodejs')
)
if ($env:NVM_HOME) { $nodeCandidates += $env:NVM_HOME }
if ($env:NVM_SYMLINK) { $nodeCandidates += $env:NVM_SYMLINK }

foreach ($dir in $nodeCandidates) {
    if ($dir -and (Test-Path $dir) -and $env:Path -notlike "*$dir*") {
        $env:Path = "$dir;$env:Path"
        Write-Host "Added Node to PATH: $dir"
    }
}

Set-Location $ProjectRoot
Write-Host "Starting MyThing from $ProjectRoot`n"

$releaseExe = Join-Path $ProjectRoot 'src-tauri\target\release\mything.exe'
$releaseExeAlt = Join-Path $ProjectRoot 'src-tauri\target\release\MyThing.exe'
$debugExe = Join-Path $ProjectRoot 'src-tauri\target\debug\mything.exe'

foreach ($exe in @($releaseExe, $releaseExeAlt, $debugExe)) {
    if (Test-Path $exe) {
        Write-Host "Launching desktop app: $exe"
        Start-Process -FilePath $exe
        exit 0
    }
}

Write-Host 'No built desktop app found — starting dev mode (tauri:dev).'

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command 'node')) {
    Write-Error 'Node.js not found. Install Node 18+ from https://nodejs.org and reopen this launcher.'
}
if (-not (Test-Command 'npm')) {
    Write-Error 'npm not found. Reinstall Node.js or add it to your user PATH.'
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

# Restore database from dump (backups/jobsmato_db_backup_20251220_234430.sql)
# Uses .env for DB connection, or Docker postgres if available.

$ErrorActionPreference = "Stop"
$BackupFile = Join-Path $PSScriptRoot "backups\jobsmato_db_backup_20251220_234430.sql"

function Write-Step { param($msg) Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

Write-Host "`nRestore database from dump" -ForegroundColor Cyan
Write-Host "==========================`n" -ForegroundColor Cyan

if (-not (Test-Path $BackupFile)) {
    Write-Err "Dump file not found: $BackupFile"
    exit 1
}

# Load .env if present
$envPath = Join-Path $PSScriptRoot ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim().Trim('"')
            [Environment]::SetEnvironmentVariable($key, $val, "Process")
        }
    }
}

$dbHost = $env:DB_HOST ?? "localhost"
$dbPort = $env:DB_PORT ?? "5432"
$dbUser = $env:DB_USERNAME ?? "jobsmato_user"
$dbPass = $env:DB_PASSWORD ?? "jobsmato_password"
$dbName = $env:DB_NAME ?? "jobsmato_db"
$databaseUrl = $env:DATABASE_URL

# Option 1: Restore via Docker postgres (local)
$useDocker = $false
if ($dbHost -eq "localhost" -or $dbHost -eq "127.0.0.1") {
    try {
        $null = docker ps --filter "name=jobsmato_postgres" --format "{{.Names}}" 2>$null
        if ($LASTEXITCODE -eq 0) {
            $name = docker ps --filter "name=jobsmato_postgres" --format "{{.Names}}" 2>$null
            if ($name -match "jobsmato_postgres") {
                $useDocker = $true
            }
        }
    }
    catch {}
}

if ($useDocker) {
    Write-Step "Restoring via Docker (jobsmato_postgres)..."
    Get-Content $BackupFile -Raw | docker exec -i jobsmato_postgres psql -U $dbUser -d $dbName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Restore completed."
    }
    else {
        Write-Err "Restore had errors. Check output above."
        exit 1
    }
    exit 0
}

# Option 2: Restore via psql (direct connection)
Write-Step "Restoring via psql to $dbHost`:$dbPort/$dbName ..."
$env:PGPASSWORD = $dbPass
try {
    psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $BackupFile 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Restore completed."
    }
    else {
        Write-Warn "psql exited with code $LASTEXITCODE. Check output above."
    }
}
catch {
    Write-Err "psql not found or restore failed. Install PostgreSQL client or use Docker."
    Write-Host "  You can also restore manually:"
    Write-Host "  psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f `"$BackupFile`""
    exit 1
}

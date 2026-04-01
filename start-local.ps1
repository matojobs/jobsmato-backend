# Kill anything on port 5000, start Postgres (docker-compose.local), then run backend.
# Uses DB credentials that match docker-compose.local.yml (postgres/password).

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# 1. Free port 5000
$conn = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($conn) {
  $conn | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
}

# 2. Start Postgres (matches docker-compose.local.yml)
docker compose -f docker-compose.local.yml up -d postgres 2>&1 | Out-Null
Start-Sleep -Seconds 5

# 3. DB credentials that match docker-compose.local.yml (POSTGRES_USER/POSTGRES_PASSWORD)
$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "password"
$env:DB_NAME = "jobsmato_db"

# 4. Run backend
npm run start:dev

# Deployment Verification Script
# Verifies that deployment was successful by testing critical endpoints

$SSH_KEY = "E:\git ssh key\id_ed25519_github"
$SSH_USER = "jobsmato"
$SSH_HOST = "localhost"
$SSH_PORT = 2222
$CLOUDFLARED_PATH = "$env:USERPROFILE"
$API_URL = "https://api.jobsmato.com"

# Colors for output
function Write-Step { param($msg) Write-Host "`n🔵 $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Blue }

Write-Host "`n🔍 Deployment Verification Script" -ForegroundColor Cyan
Write-Host "==================================`n" -ForegroundColor Cyan

# Start cloudflared proxy in background
Write-Step "Starting Cloudflare Tunnel proxy..."
$cloudflaredJob = Start-Job -ScriptBlock {
    param($path)
    $env:Path += ";$path"
    cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222
} -ArgumentList $CLOUDFLARED_PATH

Start-Sleep -Seconds 5
Write-Success "Cloudflare Tunnel proxy started"

# Function to run SSH commands
function Invoke-SSH {
    param([string]$Command)
    $sshCommand = "ssh -i `"$SSH_KEY`" -p $SSH_PORT -o StrictHostKeyChecking=no -o ConnectTimeout=10 $SSH_USER@$SSH_HOST `"$Command`""
    Invoke-Expression $sshCommand
}

# Test 1: Container Status
Write-Step "Test 1: Checking container status..."
$containerCheck = Invoke-SSH "docker-compose ps"
Write-Host $containerCheck

if ($containerCheck -match "Up") {
    Write-Success "Containers are running"
} else {
    Write-Error "Some containers are not running"
}

# Test 2: Health Check (Local)
Write-Step "Test 2: Health check (local)..."
$healthCheck = Invoke-SSH "curl -s http://localhost:5000/api/health | head -20"
Write-Host $healthCheck

if ($healthCheck -match "healthy") {
    Write-Success "Health check passed"
} else {
    Write-Error "Health check failed"
}

# Test 3: Database Connection
Write-Step "Test 3: Database connection..."
$dbCheck = Invoke-SSH "docker exec jobsmato_postgres pg_isready -U jobsmato_user -d jobsmato_db"
Write-Host $dbCheck

if ($dbCheck -match "accepting connections") {
    Write-Success "Database is accepting connections"
} else {
    Write-Error "Database connection failed"
}

# Test 4: Redis Connection
Write-Step "Test 4: Redis connection..."
$redisCheck = Invoke-SSH "docker exec jobsmato_redis redis-cli ping"
Write-Host $redisCheck

if ($redisCheck -match "PONG") {
    Write-Success "Redis is responding"
} else {
    Write-Warning "Redis might not be configured or not responding"
}

# Test 5: API Endpoints (via SSH tunnel)
Write-Step "Test 5: Testing API endpoints..."

$endpoints = @(
    @{ Path = "/api/health"; Method = "GET"; Expected = "healthy" },
    @{ Path = "/api/jobs"; Method = "GET"; Expected = "jobs" }
)

foreach ($endpoint in $endpoints) {
    Write-Info "Testing: $($endpoint.Method) $($endpoint.Path)"
    $testResult = Invoke-SSH "curl -s -X $($endpoint.Method) http://localhost:5000$($endpoint.Path) | head -5"
    
    if ($testResult -match $endpoint.Expected -or $testResult -match "200") {
        Write-Success "$($endpoint.Path) - OK"
    } else {
        Write-Warning "$($endpoint.Path) - Response: $testResult"
    }
}

# Test 6: Container Logs (Error Check)
Write-Step "Test 6: Checking for errors in logs..."
$errorCheck = Invoke-SSH "docker logs jobsmato_api --tail 50 2>&1 | grep -i error | head -5"
if ($errorCheck -and $errorCheck -notmatch "No such file") {
    Write-Warning "Errors found in logs:"
    Write-Host $errorCheck
} else {
    Write-Success "No recent errors in logs"
}

# Test 7: Resource Usage
Write-Step "Test 7: Checking resource usage..."
$resourceCheck = Invoke-SSH "docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}' | head -5"
Write-Host $resourceCheck

# Test 8: Network Connectivity
Write-Step "Test 8: Checking network connectivity..."
$networkCheck = Invoke-SSH "docker network inspect jobsmato_network --format '{{.Name}}: {{len .Containers}} containers' 2>&1"
Write-Host $networkCheck

if ($networkCheck -match "containers") {
    Write-Success "Docker network is configured"
} else {
    Write-Warning "Network check inconclusive"
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan

$allTests = @(
    @{ Name = "Containers Running"; Status = $containerCheck -match "Up" },
    @{ Name = "Health Check"; Status = $healthCheck -match "healthy" },
    @{ Name = "Database Connection"; Status = $dbCheck -match "accepting" },
    @{ Name = "Redis Connection"; Status = $redisCheck -match "PONG" }
)

foreach ($test in $allTests) {
    if ($test.Status) {
        Write-Host "✅ $($test.Name)" -ForegroundColor Green
    } else {
        Write-Host "❌ $($test.Name)" -ForegroundColor Red
    }
}

# Cleanup
Stop-Job $cloudflaredJob
Remove-Job $cloudflaredJob
Write-Success "Cloudflare Tunnel proxy stopped"

Write-Host "`n" -NoNewline
Write-Success "🎉 Verification completed!`n"

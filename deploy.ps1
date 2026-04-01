# Jobsmato Backend Deployment Script
# Deploys to server via Cloudflare Tunnel (ssh.jobsmato.com)

param(
    [switch]$SkipBuild,
    [switch]$UseExistingTunnel,  # Use when cloudflared is already running
    [switch]$SkipMigration,
    [string]$Feature = "general"
)

$ErrorActionPreference = "Stop"

# Configuration
$SSH_USER = "jobsmato"
$SSH_KEY = if (Test-Path "E:\git ssh key\id_ed25519_github") { "E:\git ssh key\id_ed25519_github" } else { "$PSScriptRoot\ssh-keys\id_ed25519_github" }
$SSH_HOST = "127.0.0.1"
$SSH_PORT = 2222
$IMAGE_FILE = "jobsmato-backend.tar"
$COMPOSE_FILE = "docker-compose.yml"
$CLOUDFLARED_PATH = "$env:USERPROFILE"

# Colors for output
function Write-Step { param($msg) Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Blue }

# Check prerequisites
Write-Step "Checking prerequisites..."

if (-not (Test-Path $SSH_KEY)) {
    Write-Err "SSH key not found: $SSH_KEY"
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Err "Docker not found. Please install Docker Desktop."
    exit 1
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    if (-not (Test-Path "$env:USERPROFILE\cloudflared.exe")) {
        Write-Err "cloudflared not found. Please install cloudflared."
        exit 1
    }
}

Write-Success "Prerequisites check passed"

# Start cloudflared proxy in background (unless using existing tunnel)
$cloudflaredJob = $null
if (-not $UseExistingTunnel) {
    Write-Step "Starting Cloudflare Tunnel proxy..."
    $cloudflaredJob = Start-Job -ScriptBlock {
        param($path)
        $env:Path += ";$path"
        cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222
    } -ArgumentList $CLOUDFLARED_PATH
    Write-Info "Waiting for Cloudflare Tunnel to establish connection..."
    Start-Sleep -Seconds 10
    Write-Success "Cloudflare Tunnel proxy started"
} else {
    Write-Step "Using existing Cloudflare Tunnel (start cloudflared in another terminal first)"
    Start-Sleep -Seconds 2
}

function Invoke-SSH {
    param([string]$Command)
    & ssh -i $SSH_KEY -p $SSH_PORT -o StrictHostKeyChecking=no -o ConnectTimeout=15 -o ServerAliveInterval=30 -o ServerAliveCountMax=10 "$SSH_USER@$SSH_HOST" $Command
}

function Invoke-SCP {
    param([string]$LocalPath, [string]$RemotePath)
    & scp -i $SSH_KEY -P $SSH_PORT -o StrictHostKeyChecking=no -o ConnectTimeout=60 -o ServerAliveInterval=20 -o ServerAliveCountMax=15 $LocalPath "${SSH_USER}@${SSH_HOST}:$RemotePath"
}

# Test SSH connection
Write-Step "Testing SSH connection..."
$maxRetries = 3
$retryCount = 0
$connected = $false

while ($retryCount -lt $maxRetries -and -not $connected) {
    try {
        Write-Info "Attempt $($retryCount + 1) of $maxRetries..."
        Start-Sleep -Seconds 3
        $testResult = Invoke-SSH "echo OK" 2>&1
        if ($testResult -match "OK") {
            $connected = $true
        } else {
            $retryCount++
            if ($retryCount -lt $maxRetries) { Write-Warning "Connection attempt failed, retrying..." }
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Warning "Connection attempt failed: $_, retrying..."
            Start-Sleep -Seconds 5
        }
    }
}

if (-not $connected) {
    Write-Err "SSH connection test failed after $maxRetries attempts"
    Write-Warning "Please verify:"
    Write-Warning "  1. Cloudflare Tunnel is running on the server"
    Write-Warning "  2. SSH service is running on the server"
    Write-Warning "  3. The tunnel is configured for ssh.jobsmato.com"
    Write-Warning "  4. Try connecting manually: .\ssh-connect.ps1"
    if ($cloudflaredJob) { Stop-Job $cloudflaredJob -ErrorAction SilentlyContinue; Remove-Job $cloudflaredJob -ErrorAction SilentlyContinue }
    exit 1
}

Write-Success "SSH connection OK"

# Build Docker image
if (-not $SkipBuild) {
    Write-Step "Building Docker image..."
    docker build --platform linux/amd64 -t jobsmato-backend:latest .
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Docker build failed"
        if ($cloudflaredJob) { Stop-Job $cloudflaredJob -ErrorAction SilentlyContinue; Remove-Job $cloudflaredJob -ErrorAction SilentlyContinue }
        exit 1
    }
    Write-Success "Docker image built"

    Write-Step "Saving Docker image..."
    docker save -o $IMAGE_FILE jobsmato-backend:latest
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Failed to save Docker image"
        if ($cloudflaredJob) { Stop-Job $cloudflaredJob -ErrorAction SilentlyContinue; Remove-Job $cloudflaredJob -ErrorAction SilentlyContinue }
        exit 1
    }
    $imageSize = (Get-Item $IMAGE_FILE).Length / 1MB
    Write-Success "Docker image saved: $IMAGE_FILE ($([math]::Round($imageSize, 2)) MB)"
} else {
    if (-not (Test-Path $IMAGE_FILE)) {
        Write-Err "Image file not found: $IMAGE_FILE. Run without -SkipBuild flag."
        if ($cloudflaredJob) { Stop-Job $cloudflaredJob -ErrorAction SilentlyContinue; Remove-Job $cloudflaredJob -ErrorAction SilentlyContinue }
        exit 1
    }
    Write-Warning "Skipping build step"
}

# Upload Docker image
Write-Step "Uploading Docker image to server..."
try {
    Invoke-SCP $IMAGE_FILE "/home/$SSH_USER/"
    if ($LASTEXITCODE -ne 0) { throw "SCP exited with $LASTEXITCODE" }
    Write-Success "Docker image uploaded"
} catch {
    Write-Err "Failed to upload Docker image: $_"
    if ($cloudflaredJob) { Stop-Job $cloudflaredJob -ErrorAction SilentlyContinue; Remove-Job $cloudflaredJob -ErrorAction SilentlyContinue }
    exit 1
}

# Upload docker-compose.yml
Write-Step "Uploading docker-compose.yml..."
try {
    Invoke-SCP $COMPOSE_FILE "/home/$SSH_USER/"
    if ($LASTEXITCODE -ne 0) { throw "SCP exited with $LASTEXITCODE" }
    Write-Success "docker-compose.yml uploaded"
} catch {
    Write-Err "Failed to upload docker-compose.yml: $_"
    if ($cloudflaredJob) { Stop-Job $cloudflaredJob -ErrorAction SilentlyContinue; Remove-Job $cloudflaredJob -ErrorAction SilentlyContinue }
    exit 1
}

# Upload .env (credentials: Google OAuth, DB, JWT, etc.) so docker compose up picks them up
$EnvFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $EnvFile) {
    Write-Step "Uploading .env (credentials)..."
    try {
        Invoke-SCP $EnvFile "/home/$SSH_USER/.env"
        if ($LASTEXITCODE -ne 0) { throw "SCP exited with $LASTEXITCODE" }
        Write-Success ".env uploaded"
    } catch {
        Write-Err "Failed to upload .env: $_"
        if ($cloudflaredJob) { Stop-Job $cloudflaredJob -ErrorAction SilentlyContinue; Remove-Job $cloudflaredJob -ErrorAction SilentlyContinue }
        exit 1
    }
} else {
    Write-Warning ".env not found; ensure server has .env with GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL and other credentials or API may fail to start."
}

# Deploy on server
Write-Step "Deploying on server..."
$deployScript = @"
echo "Loading Docker image..."
docker load -i $IMAGE_FILE
CURRENT_IMAGE=`$(docker images jobsmato-backend:latest --format "{{.ID}}" | head -1)
if [ ! -z "`$CURRENT_IMAGE" ]; then
    docker tag jobsmato-backend:latest jobsmato-backend:previous
    echo "[OK] Current image tagged as previous for rollback"
fi
NEW_IMAGE=`$(docker images jobsmato-backend:latest --format "{{.ID}}" | head -1)
if [ ! -z "`$NEW_IMAGE" ]; then echo "New image loaded: `$NEW_IMAGE"; fi
echo "Stopping existing containers..."
docker compose -f $COMPOSE_FILE down || true
echo "Starting services..."
docker compose -f $COMPOSE_FILE up -d
echo "Waiting for services to be healthy..."
sleep 10
echo "Running database migrations..."
docker exec jobsmato_api node scripts/run-migrations.js || true
echo 'Ensuring sourcing schema on prod - no-op if already present...'
docker exec jobsmato_api node scripts/fix-prod-sourcing-migrations.js || true
echo "Checking container status..."
docker compose -f $COMPOSE_FILE ps
echo "Cleaning up old images to free memory..."
docker rmi jobsmato-backend:previous 2>/dev/null || true
docker image prune -f
echo "[OK] Cleanup done"
"@

try {
    Invoke-SSH $deployScript
    if ($LASTEXITCODE -ne 0) { throw "Deploy script exited with $LASTEXITCODE" }
    Write-Success "Deployment completed"
} catch {
    Write-Err "Deployment failed: $_"
    if ($cloudflaredJob) { Stop-Job $cloudflaredJob -ErrorAction SilentlyContinue; Remove-Job $cloudflaredJob -ErrorAction SilentlyContinue }
    exit 1
}

# Verify deployment
Write-Step "Verifying deployment..."
$verifyScript = @"
echo 'Checking API health...'
curl -sf http://localhost:5004/api/health && echo ' OK' || echo 'Health check failed'
echo 'Container logs (tail):'
docker logs jobsmato_api --tail 30
"@

try {
    Invoke-SSH $verifyScript
    Write-Success "Deployment verification completed"
} catch {
    Write-Warning "Verification encountered issues; deployment may still be successful"
}

# Cleanup (only if we started cloudflared)
if ($cloudflaredJob) {
    Write-Step "Cleaning up..."
    Stop-Job $cloudflaredJob -ErrorAction SilentlyContinue
    Remove-Job $cloudflaredJob -ErrorAction SilentlyContinue
    Write-Success "Cloudflare Tunnel proxy stopped"
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test the API: https://api.jobsmato.com/api/health"
Write-Host "  2. Check Swagger docs: https://api.jobsmato.com/api/docs"
Write-Host "  3. Monitor logs: Use .\ssh-connect.ps1 then run 'docker logs -f jobsmato_api'"

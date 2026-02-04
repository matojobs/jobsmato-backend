# Jobsmato Backend Deployment Script
# Deploys to server via Cloudflare Tunnel (ssh.jobsmato.com)

param(
    [switch]$SkipBuild,
    [switch]$SkipMigration,
    [string]$Feature = "general"
)

$ErrorActionPreference = "Stop"

# Configuration
$SSH_KEY = "$PSScriptRoot\ssh-keys\id_ed25519_github"
$SSH_USER = "jobsmato"
$SSH_HOST = "localhost"
$SSH_PORT = 2222
$SSH_DOMAIN = "ssh.jobsmato.com"
$IMAGE_FILE = "jobsmato-backend.tar.gz"
$COMPOSE_FILE = "docker-compose.yml"
$CLOUDFLARED_PATH = "$env:USERPROFILE"

# Colors for output
function Write-Step { param($msg) Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Blue }

# Check prerequisites
Write-Step "Checking prerequisites..."

if (-not (Test-Path $SSH_KEY)) {
    Write-Error "SSH key not found: $SSH_KEY"
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker not found. Please install Docker Desktop."
    exit 1
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    # Check if cloudflared exists in user profile
    if (-not (Test-Path "$env:USERPROFILE\cloudflared.exe")) {
        Write-Error "cloudflared not found. Please install cloudflared."
        exit 1
    }
}

Write-Success "Prerequisites check passed"

# Start cloudflared proxy in background
Write-Step "Starting Cloudflare Tunnel proxy..."
$cloudflaredJob = Start-Job -ScriptBlock {
    param($path)
    $env:Path += ";$path"
    cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222
} -ArgumentList $CLOUDFLARED_PATH

# Wait for proxy to be ready
Write-Info "Waiting for Cloudflare Tunnel to establish connection..."
Start-Sleep -Seconds 10
Write-Success "Cloudflare Tunnel proxy started"

# Function to run SSH commands
function Invoke-SSH {
    param([string]$Command)
    
    $sshCommand = "ssh -i `"$SSH_KEY`" -p $SSH_PORT -o StrictHostKeyChecking=no -o ConnectTimeout=10 $SSH_USER@$SSH_HOST `"$Command`""
    Invoke-Expression $sshCommand
}

# Function to run SCP
function Invoke-SCP {
    param(
        [string]$LocalPath,
        [string]$RemotePath
    )
    
    $scpCommand = "scp -i `"$SSH_KEY`" -P $SSH_PORT -o StrictHostKeyChecking=no -o ConnectTimeout=10 $LocalPath $SSH_USER@$SSH_HOST`:$RemotePath"
    Invoke-Expression $scpCommand
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
        $testResult = Invoke-SSH "echo 'Connection successful'" 2>&1
        if ($testResult -match "Connection successful") {
            Write-Success "SSH connection established"
            $connected = $true
        } else {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Write-Warning "Connection attempt failed, retrying..."
            }
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
    Write-Error "SSH connection test failed after $maxRetries attempts"
    Write-Warning "Please verify:"
    Write-Warning "  1. Cloudflare Tunnel is running on the server"
    Write-Warning "  2. SSH service is running on the server"
    Write-Warning "  3. The tunnel is configured for ssh.jobsmato.com"
    Write-Warning "  4. Try connecting manually: .\ssh-connect.ps1"
    Stop-Job $cloudflaredJob
    Remove-Job $cloudflaredJob
    exit 1
}

# Build Docker image
if (-not $SkipBuild) {
    Write-Step "Building Docker image..."
    docker build --platform linux/amd64 -t jobsmato-backend:latest .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed"
        Stop-Job $cloudflaredJob
        Remove-Job $cloudflaredJob
        exit 1
    }
    Write-Success "Docker image built"
    
    Write-Step "Saving Docker image..."
    docker save jobsmato-backend:latest | gzip > $IMAGE_FILE
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to save Docker image"
        Stop-Job $cloudflaredJob
        Remove-Job $cloudflaredJob
        exit 1
    }
    $imageSize = (Get-Item $IMAGE_FILE).Length / 1MB
    $imageSizeRounded = [math]::Round($imageSize, 2)
    Write-Success "Docker image saved: $IMAGE_FILE ($imageSizeRounded MB)"
} else {
    Write-Warning "Skipping build step"
    if (-not (Test-Path $IMAGE_FILE)) {
        Write-Error "Image file not found: $IMAGE_FILE. Run without -SkipBuild flag."
        Stop-Job $cloudflaredJob
        Remove-Job $cloudflaredJob
        exit 1
    }
}

# Upload Docker image
Write-Step "Uploading Docker image to server..."
try {
    Invoke-SCP $IMAGE_FILE "/home/$SSH_USER/"
    Write-Success "Docker image uploaded"
} catch {
    Write-Error "Failed to upload Docker image: $_"
    Stop-Job $cloudflaredJob
    Remove-Job $cloudflaredJob
    exit 1
}

# Upload docker-compose.yml
Write-Step "Uploading docker-compose.yml..."
try {
    Invoke-SCP $COMPOSE_FILE "/home/$SSH_USER/"
    Write-Success "docker-compose.yml uploaded"
} catch {
    Write-Error "Failed to upload docker-compose.yml: $_"
    Stop-Job $cloudflaredJob
    Remove-Job $cloudflaredJob
    exit 1
}

# Deploy on server
Write-Step "Deploying on server..."
$deployScript = @"
echo "Loading Docker image..."
docker load < $IMAGE_FILE

# Tag current image as previous (for rollback)
CURRENT_IMAGE=`$(docker images jobsmato-backend:latest --format "{{.ID}}" | head -1)
if [ ! -z "`$CURRENT_IMAGE" ]; then
    docker tag jobsmato-backend:latest jobsmato-backend:previous
    echo "[OK] Current image tagged as 'previous' for rollback"
fi

# Tag new image as latest
NEW_IMAGE=`$(docker images jobsmato-backend:latest --format "{{.ID}}" | head -1)
if [ ! -z "`$NEW_IMAGE" ]; then
    echo "✅ New image loaded: `$NEW_IMAGE"
fi

echo "Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down || true

echo "Starting services..."
docker-compose -f $COMPOSE_FILE up -d

echo "Waiting for services to be healthy..."
sleep 10

echo "Checking container status..."
docker-compose -f $COMPOSE_FILE ps
"@

try {
    Invoke-SSH $deployScript
    Write-Success "Deployment completed"
} catch {
    Write-Error "Deployment failed: $_"
    Stop-Job $cloudflaredJob
    Remove-Job $cloudflaredJob
    exit 1
}

# Verify deployment
Write-Step "Verifying deployment..."
$verifyScript = @"
echo "Checking API health..."
curl -f http://localhost:5000/health && echo "" || echo "⚠️  Health check failed"

echo ""
echo "Checking container logs..."
docker logs jobsmato_api --tail 30
"@

try {
    Invoke-SSH $verifyScript
    Write-Success "Deployment verification completed"
} catch {
    Write-Warning "Verification encountered issues, but deployment may still be successful"
}

# Cleanup
Write-Step "Cleaning up..."
Stop-Job $cloudflaredJob
Remove-Job $cloudflaredJob
Write-Success "Cloudflare Tunnel proxy stopped"

Write-Host ""
Write-Success "Deployment process completed successfully!"
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test the API: https://api.jobsmato.com/api/health"
Write-Host "  2. Check Swagger docs: https://api.jobsmato.com/api/docs"
Write-Host "  3. Monitor logs: Use .\ssh-connect.ps1 then run 'docker logs -f jobsmato_api'"

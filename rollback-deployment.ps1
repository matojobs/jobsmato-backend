# Rollback Deployment Script
# Rolls back to the previous Docker image version

$SSH_KEY = "E:\git ssh key\id_ed25519_github"
$SSH_USER = "jobsmato"
$SSH_HOST = "localhost"
$SSH_PORT = 2222
$CLOUDFLARED_PATH = "$env:USERPROFILE"
$COMPOSE_FILE = "docker-compose.yml"

# Colors for output
function Write-Step { param($msg) Write-Host "`n🔵 $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Blue }

Write-Host "`n⏪ Rollback Deployment Script" -ForegroundColor Cyan
Write-Host "============================`n" -ForegroundColor Cyan

# Confirmation
$confirmation = Read-Host "Are you sure you want to rollback? This will revert to the previous deployment. (yes/no)"
if ($confirmation -ne "yes") {
    Write-Info "Rollback cancelled"
    exit 0
}

# Start cloudflared proxy
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

# Check for previous image
Write-Step "Checking for previous Docker image..."
$checkScript = @"
# List available images
echo "Available Docker images:"
docker images jobsmato-backend --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}" | head -5

# Check if there's a backup image
if docker images jobsmato-backend:previous --format "{{.ID}}" | grep -q .; then
    echo "✅ Previous image found: jobsmato-backend:previous"
    echo "PREVIOUS_EXISTS=yes"
else
    echo "⚠️  No previous image found"
    echo "PREVIOUS_EXISTS=no"
fi
"@

$checkResult = Invoke-SSH $checkScript
Write-Host $checkResult

if ($checkResult -notmatch "PREVIOUS_EXISTS=yes") {
    Write-Error "No previous image found. Cannot rollback."
    Write-Info "Tip: The deploy script should tag the current image as 'previous' before deploying new version"
    Stop-Job $cloudflaredJob
    Remove-Job $cloudflaredJob
    exit 1
}

# Health check before rollback
Write-Step "Checking current deployment health..."
$healthCheck = Invoke-SSH "curl -f http://localhost:5000/api/health 2>&1"
if ($healthCheck -match "healthy") {
    Write-Warning "Current deployment appears healthy. Are you sure you want to rollback?"
    $confirm = Read-Host "Continue with rollback? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Info "Rollback cancelled"
        Stop-Job $cloudflaredJob
        Remove-Job $cloudflaredJob
        exit 0
    }
}

# Perform rollback
Write-Step "Performing rollback..."
$rollbackScript = @"
# Tag current image as 'failed'
CURRENT_IMAGE=`$(docker images jobsmato-backend:latest --format "{{.ID}}")
if [ ! -z "`$CURRENT_IMAGE" ]; then
    docker tag jobsmato-backend:latest jobsmato-backend:failed-`$(date +%Y%m%d_%H%M%S)
    echo "✅ Current image tagged as failed"
fi

# Tag previous image as latest
docker tag jobsmato-backend:previous jobsmato-backend:latest
echo "✅ Previous image tagged as latest"

# Restart containers
echo "Stopping containers..."
docker-compose -f $COMPOSE_FILE down

echo "Starting containers with previous image..."
docker-compose -f $COMPOSE_FILE up -d

echo "Waiting for services to be healthy..."
sleep 10

echo "Checking container status..."
docker-compose -f $COMPOSE_FILE ps
"@

try {
    $result = Invoke-SSH $rollbackScript
    Write-Host $result
    Write-Success "Rollback completed"
} catch {
    Write-Error "Rollback failed: $_"
    Stop-Job $cloudflaredJob
    Remove-Job $cloudflaredJob
    exit 1
}

# Verify rollback
Write-Step "Verifying rollback..."
$verifyScript = @"
echo "Checking API health..."
curl -f http://localhost:5000/api/health && echo "" || echo "⚠️  Health check failed"

echo ""
echo "Checking container logs..."
docker logs jobsmato_api --tail 20
"@

try {
    $result = Invoke-SSH $verifyScript
    Write-Host $result
    Write-Success "Rollback verification completed"
} catch {
    Write-Warning "Verification encountered issues"
}

# Cleanup
Stop-Job $cloudflaredJob
Remove-Job $cloudflaredJob
Write-Success "Cloudflare Tunnel proxy stopped"

Write-Success "`n🎉 Rollback completed successfully!`n"
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test the API: https://api.jobsmato.com/api/health" -ForegroundColor White
Write-Host "  2. Monitor logs: .\ssh-connect.ps1 then 'docker logs -f jobsmato_api'" -ForegroundColor White
Write-Host "  3. If issues persist, check the failed image tag" -ForegroundColor White

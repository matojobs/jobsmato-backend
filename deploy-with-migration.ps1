# Jobsmato Backend Deployment Script with Database Migration
# Deploys to server via Cloudflare Tunnel and runs database migrations

param(
    [switch]$SkipBuild,
    [string]$MigrationName = ""
)

$ErrorActionPreference = "Stop"

# Configuration
$SSH_KEY = "E:\git ssh key\id_ed25519_github"
$SSH_USER = "jobsmato"
$SSH_HOST = "localhost"
$SSH_PORT = 2222
$SSH_DOMAIN = "ssh.jobsmato.com"
$IMAGE_FILE = "jobsmato-backend.tar.gz"
$COMPOSE_FILE = "docker-compose.yml"
$CLOUDFLARED_PATH = "$env:USERPROFILE"

# Colors for output
function Write-Step { param($msg) Write-Host "`n🔵 $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

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
    Write-Error "cloudflared not found. Please install cloudflared."
    exit 1
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
Start-Sleep -Seconds 5
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
try {
    $testResult = Invoke-SSH "echo 'Connection successful'"
    if ($testResult -match "Connection successful") {
        Write-Success "SSH connection established"
    } else {
        Write-Error "SSH connection test failed"
        Stop-Job $cloudflaredJob
        Remove-Job $cloudflaredJob
        exit 1
    }
} catch {
    Write-Error "Failed to connect via SSH: $_"
    Write-Warning "Make sure cloudflared proxy is running and accessible"
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
    Write-Success "Docker image saved: $IMAGE_FILE ($([math]::Round($imageSize, 2)) MB)"
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

# Run database migrations
Write-Step "Running database migrations..."
$migrationScript = @"
echo "Checking for pending migrations..."
docker exec jobsmato_api sh -c 'cd /app && npm run migration:run' || {
    echo "⚠️  Migration command not found, checking TypeORM migrations..."
    docker exec jobsmato_api sh -c 'cd /app && node -e "
        const { DataSource } = require(\"typeorm\");
        const AppDataSource = new DataSource({
          type: \"postgres\",
          host: process.env.DB_HOST || \"postgres\",
          port: parseInt(process.env.DB_PORT || \"5432\"),
          username: process.env.DB_USERNAME || \"jobsmato_user\",
          password: process.env.DB_PASSWORD || \"jobsmato_password\",
          database: process.env.DB_NAME || \"jobsmato_db\",
          synchronize: false,
          logging: true,
        });
        (async () => {
          try {
            await AppDataSource.initialize();
            console.log(\"✅ Connected to database\");
            const migrations = await AppDataSource.runMigrations();
            if (migrations.length > 0) {
              console.log(\"✅ Migrations executed:\", migrations.map(m => m.name).join(\", \"));
            } else {
              console.log(\"ℹ️  No pending migrations\");
            }
            await AppDataSource.destroy();
          } catch (e) {
            console.error(\"❌ Migration failed:\", e.message);
            process.exit(1);
          }
        })();
    "'
}
"@

try {
    Invoke-SSH $migrationScript
    Write-Success "Database migrations completed"
} catch {
    Write-Warning "Migration encountered issues, but deployment may still be successful"
    Write-Warning "You may need to run migrations manually"
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

Write-Success "`n🎉 Deployment process completed successfully!`n"

Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test the API: https://api.jobsmato.com/api/health"
Write-Host "  2. Check Swagger docs: https://api.jobsmato.com/api/docs"
Write-Host "  3. Monitor logs: ssh ssh.jobsmato.com 'docker logs -f jobsmato_api'"
Write-Host "  4. Verify database migrations were applied correctly"

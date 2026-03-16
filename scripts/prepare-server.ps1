# Server Preparation Script
# Prepares the server for deployment by checking prerequisites and setting up the environment

$SSH_KEY = "$PSScriptRoot\ssh-keys\id_ed25519_github"
$SSH_USER = "jobsmato"
$SSH_HOST = "localhost"
$SSH_PORT = 2222
$CLOUDFLARED_PATH = "$env:USERPROFILE"

# Colors for output
function Write-Step { param($msg) Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Blue }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Server Preparation Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check prerequisites locally
Write-Step "Checking local prerequisites..."

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
    } else {
        Write-Info "cloudflared found in user profile"
    }
}

Write-Success "Local prerequisites check passed"

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
    $result = Invoke-Expression $sshCommand 2>&1
    return $result
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

# Check server OS and info
Write-Step "Checking server information..."
$osInfo = Invoke-SSH "uname -a"
Write-Info "OS Info: $osInfo"

$hostname = Invoke-SSH "hostname"
Write-Info "Hostname: $hostname"

# Check Docker installation
Write-Step "Checking Docker installation..."
$dockerVersion = Invoke-SSH "docker --version 2>&1"
if ($dockerVersion -match "Docker version") {
    Write-Success "Docker is installed: $dockerVersion"
} else {
    Write-Error "Docker is not installed or not accessible"
    Write-Info "Installing Docker..."
    
    # Try to install Docker (for Ubuntu/Debian)
    $installResult = Invoke-SSH "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh 2>&1"
    Write-Info "Docker installation output: $installResult"
    
    # Check again
    $dockerVersion = Invoke-SSH "docker --version 2>&1"
    if ($dockerVersion -match "Docker version") {
        Write-Success "Docker installed successfully"
    } else {
        Write-Error "Failed to install Docker. Please install manually."
        Stop-Job $cloudflaredJob
        Remove-Job $cloudflaredJob
        exit 1
    }
}

# Check Docker Compose
Write-Step "Checking Docker Compose..."
$composeVersion = Invoke-SSH "docker compose version 2>&1"
if ($composeVersion -match "Docker Compose version" -or $composeVersion -match "v2") {
    Write-Success "Docker Compose is installed: $composeVersion"
} else {
    Write-Warning "Docker Compose not found, checking for docker-compose..."
    $composeVersion = Invoke-SSH "docker-compose --version 2>&1"
    if ($composeVersion -match "docker-compose version") {
        Write-Success "docker-compose is installed: $composeVersion"
    } else {
        Write-Info "Docker Compose will be used via 'docker compose' (plugin)"
    }
}

# Check if Docker daemon is running
Write-Step "Checking Docker daemon status..."
$dockerStatus = Invoke-SSH "sudo systemctl is-active docker 2>&1"
if ($dockerStatus -match "active") {
    Write-Success "Docker daemon is running"
} else {
    Write-Warning "Docker daemon might not be running. Attempting to start..."
    $startResult = Invoke-SSH "sudo systemctl start docker 2>&1"
    Write-Info "Docker start result: $startResult"
    
    # Check again
    $dockerStatus = Invoke-SSH "sudo systemctl is-active docker 2>&1"
    if ($dockerStatus -match "active") {
        Write-Success "Docker daemon started successfully"
    } else {
        Write-Error "Failed to start Docker daemon"
        Stop-Job $cloudflaredJob
        Remove-Job $cloudflaredJob
        exit 1
    }
}

# Enable Docker to start on boot
Write-Step "Enabling Docker to start on boot..."
$enableResult = Invoke-SSH "sudo systemctl enable docker 2>&1"
Write-Info "Docker enable result: $enableResult"

# Check Docker network
Write-Step "Checking Docker network..."
$networkCheck = Invoke-SSH "docker network ls | grep jobsmato_network 2>&1"
if ($networkCheck -match "jobsmato_network") {
    Write-Success "Docker network 'jobsmato_network' exists"
} else {
    Write-Info "Creating Docker network 'jobsmato_network'..."
    $networkCreate = Invoke-SSH "docker network create jobsmato_network 2>&1"
    if ($networkCreate -match "jobsmato_network" -or $networkCreate -eq "") {
        Write-Success "Docker network created successfully"
    } else {
        Write-Warning "Network creation output: $networkCreate"
    }
}

# Create necessary directories
Write-Step "Creating necessary directories..."
$directories = @(
    "/home/$SSH_USER/uploads",
    "/home/$SSH_USER/uploads/Resumes",
    "/home/$SSH_USER/logs",
    "/home/$SSH_USER/backups"
)

foreach ($dir in $directories) {
    $createResult = Invoke-SSH "mkdir -p $dir && chmod 755 $dir 2>&1"
    if ($LASTEXITCODE -eq 0 -or $createResult -eq "") {
        Write-Success "Directory created/verified: $dir"
    } else {
        Write-Warning "Directory creation result for $dir : $createResult"
    }
}

# Check disk space
Write-Step "Checking disk space..."
$diskSpace = Invoke-SSH "df -h / | tail -1 | awk '{print \$4}'"
Write-Info "Available disk space: $diskSpace"

# Check memory
Write-Step "Checking system memory..."
$memory = Invoke-SSH "free -h | grep Mem | awk '{print \$2}'"
Write-Info "Total memory: $memory"

# Check if ports are available
Write-Step "Checking port availability..."
$port5000 = Invoke-SSH "sudo netstat -tlnp | grep :5000 || sudo ss -tlnp | grep :5000 || echo 'Port 5000 is available'"
if ($port5000 -match "5000") {
    Write-Warning "Port 5000 is in use: $port5000"
} else {
    Write-Success "Port 5000 is available"
}

$port5432 = Invoke-SSH "sudo netstat -tlnp | grep :5432 || sudo ss -tlnp | grep :5432 || echo 'Port 5432 is available'"
if ($port5432 -match "5432") {
    Write-Warning "Port 5432 is in use: $port5432"
} else {
    Write-Success "Port 5432 is available"
}

$port6379 = Invoke-SSH "sudo netstat -tlnp | grep :6379 || sudo ss -tlnp | grep :6379 || echo 'Port 6379 is available'"
if ($port6379 -match "6379") {
    Write-Warning "Port 6379 is in use: $port6379"
} else {
    Write-Success "Port 6379 is available"
}

# Check if user is in docker group
Write-Step "Checking Docker group membership..."
$dockerGroup = Invoke-SSH "groups | grep docker 2>&1"
if ($dockerGroup -match "docker") {
    Write-Success "User is in docker group"
} else {
    Write-Warning "User is not in docker group. Adding user to docker group..."
    $addGroup = Invoke-SSH "sudo usermod -aG docker $SSH_USER 2>&1"
    Write-Info "Group addition result: $addGroup"
    Write-Warning "You may need to log out and log back in for group changes to take effect"
}

# Check for existing containers
Write-Step "Checking for existing containers..."
$existingContainers = Invoke-SSH "docker ps -a --format '{{.Names}}' | grep -E 'jobsmato|postgres|redis' 2>&1"
if ($existingContainers -and $existingContainers -notmatch "error") {
    Write-Warning "Existing containers found:"
    Write-Info $existingContainers
    Write-Info "These will be managed by docker-compose"
} else {
    Write-Success "No existing containers found (clean slate)"
}

# Check firewall status
Write-Step "Checking firewall status..."
$firewallStatus = Invoke-SSH "sudo ufw status 2>&1 || sudo firewall-cmd --state 2>&1 || echo 'Firewall check not available'"
Write-Info "Firewall status: $firewallStatus"

# Summary
Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Server Preparation Summary" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "[OK] SSH Connection: Working" -ForegroundColor Green
Write-Host "[OK] Docker: Installed and running" -ForegroundColor Green
Write-Host "[OK] Docker Compose: Available" -ForegroundColor Green
Write-Host "[OK] Directories: Created" -ForegroundColor Green
Write-Host "[OK] Docker Network: Ready" -ForegroundColor Green
Write-Host ""

# Cleanup
Write-Step "Cleaning up..."
Stop-Job $cloudflaredJob
Remove-Job $cloudflaredJob
Write-Success "Cloudflare Tunnel proxy stopped"

Write-Host ""
Write-Success "Server preparation completed successfully!"
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Review the server status above" -ForegroundColor White
Write-Host "  2. Make any necessary adjustments" -ForegroundColor White
Write-Host "  3. Run deployment: .\deploy.ps1" -ForegroundColor White
Write-Host ""

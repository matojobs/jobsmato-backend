# Database Backup Script
# Creates a backup of the PostgreSQL database

$SSH_KEY = "E:\git ssh key\id_ed25519_github"
$SSH_USER = "jobsmato"
$SSH_HOST = "localhost"
$SSH_PORT = 2222
$CLOUDFLARED_PATH = "$env:USERPROFILE"
$BACKUP_RETENTION_DAYS = 7

# Colors for output
function Write-Step { param($msg) Write-Host "`n🔵 $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Blue }

Write-Host "`n💾 Database Backup Script" -ForegroundColor Cyan
Write-Host "==========================`n" -ForegroundColor Cyan

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

# Create backup
Write-Step "Creating database backup..."
$backupDate = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "jobsmato_backup_$backupDate.sql"
$backupPath = "/home/$SSH_USER/backups/$backupFileName"

$backupScript = @"
echo "Creating database backup: $backupFileName"
docker exec jobsmato_postgres pg_dump -U jobsmato_user jobsmato_db > $backupPath
if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $backupFileName"
    ls -lh $backupPath
else
    echo "❌ Backup failed"
    exit 1
fi
"@

try {
    $result = Invoke-SSH $backupScript
    Write-Host $result
    Write-Success "Database backup created: $backupFileName"
} catch {
    Write-Error "Backup failed: $_"
    Stop-Job $cloudflaredJob
    Remove-Job $cloudflaredJob
    exit 1
}

# Compress backup
Write-Step "Compressing backup..."
$compressScript = @"
gzip -f $backupPath
if [ $? -eq 0 ]; then
    echo "✅ Backup compressed: ${backupFileName}.gz"
    ls -lh ${backupPath}.gz
else
    echo "⚠️  Compression failed, but backup exists"
fi
"@

try {
    $result = Invoke-SSH $compressScript
    Write-Host $result
    Write-Success "Backup compressed"
} catch {
    Write-Warning "Compression failed, but backup exists"
}

# Cleanup old backups
Write-Step "Cleaning up old backups (older than $BACKUP_RETENTION_DAYS days)..."
$cleanupScript = @"
find /home/$SSH_USER/backups -name "jobsmato_backup_*.sql.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
BACKUP_COUNT=`$(find /home/$SSH_USER/backups -name "jobsmato_backup_*.sql.gz" -type f | wc -l)
echo "Remaining backups: `$BACKUP_COUNT"
"@

try {
    $result = Invoke-SSH $cleanupScript
    Write-Host $result
    Write-Success "Old backups cleaned up"
} catch {
    Write-Warning "Cleanup encountered issues"
}

# List backups
Write-Step "Listing available backups..."
$listScript = @"
echo "Available backups:"
ls -lh /home/$SSH_USER/backups/jobsmato_backup_*.sql.gz 2>/dev/null | tail -5
"@

$result = Invoke-SSH $listScript
Write-Host $result

# Cleanup
Stop-Job $cloudflaredJob
Remove-Job $cloudflaredJob
Write-Success "Cloudflare Tunnel proxy stopped"

Write-Success "`n🎉 Backup completed successfully!`n"
Write-Host "📝 Backup location: /home/$SSH_USER/backups/$backupFileName.gz" -ForegroundColor Cyan

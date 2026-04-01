# Quick SSH Connection Script
# Connects to ssh.jobsmato.com via Cloudflare Tunnel

$SSH_KEY = "$PSScriptRoot\ssh-keys\id_ed25519_github"
$SSH_USER = "jobsmato"
$SSH_HOST = "localhost"
$SSH_PORT = 2222
$CLOUDFLARED_PATH = "$env:USERPROFILE"

Write-Host "🚀 Connecting to ssh.jobsmato.com..." -ForegroundColor Cyan

# Check if cloudflared is available
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "❌ cloudflared not found. Please install cloudflared." -ForegroundColor Red
    exit 1
}

# Check if SSH key exists
if (-not (Test-Path $SSH_KEY)) {
    Write-Host "❌ SSH key not found: $SSH_KEY" -ForegroundColor Red
    exit 1
}

# Start cloudflared proxy in background
Write-Host "Starting Cloudflare Tunnel proxy..." -ForegroundColor Yellow
$cloudflaredJob = Start-Job -ScriptBlock {
    param($path)
    $env:Path += ";$path"
    cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222
} -ArgumentList $CLOUDFLARED_PATH

# Wait for proxy to be ready
Start-Sleep -Seconds 3
Write-Host "✅ Tunnel proxy started" -ForegroundColor Green
Write-Host ""

# Connect via SSH
Write-Host "Connecting via SSH..." -ForegroundColor Cyan
cd "E:\git ssh key"
ssh -i ".\id_ed25519_github" -p 2222 jobsmato@localhost

# Cleanup when SSH session ends
Write-Host "`nCleaning up tunnel proxy..." -ForegroundColor Yellow
Stop-Job $cloudflaredJob
Remove-Job $cloudflaredJob
Write-Host "✅ Disconnected" -ForegroundColor Green

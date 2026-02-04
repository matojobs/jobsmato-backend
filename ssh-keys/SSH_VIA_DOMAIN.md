# SSH via Domain (ssh.jobsmato.com)

## Setup Complete ✅

Your server is now accessible via SSH through the domain `ssh.jobsmato.com` using Cloudflare Tunnel.

## How to Connect

### Method 1: Using cloudflared proxy (Recommended)

1. **Start the cloudflared proxy** (in a separate terminal or background):
   ```powershell
   cd "E:\git ssh key"
   $env:Path += ";$env:USERPROFILE"
   cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222
   ```
   Keep this running in the background.

2. **In another terminal, connect via SSH**:
   ```powershell
   cd "E:\git ssh key"
   ssh -i ".\id_ed25519_github" -p 2222 jobsmato@localhost
   ```

### Method 2: One-liner (Background job)

```powershell
cd "E:\git ssh key"
$env:Path += ";$env:USERPROFILE"
Start-Job -ScriptBlock { param($path) $env:Path += ";$path"; cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222 } -ArgumentList $env:USERPROFILE
Start-Sleep -Seconds 3
ssh -i ".\id_ed25519_github" -p 2222 jobsmato@localhost
```

### Method 3: SSH Config (Easier)

Add this to your `~/.ssh/config` (or `C:\Users\YourUsername\.ssh\config`):

```
Host ssh.jobsmato.com
    HostName localhost
    Port 2222
    User jobsmato
    IdentityFile E:\git ssh key\id_ed25519_github
    ProxyCommand cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://%h:%p
```

Then you can simply run:
```powershell
ssh ssh.jobsmato.com
```

**Note**: You'll need to start the cloudflared proxy first, or use a wrapper script.

## Quick Start Script

Create a file `ssh-connect.ps1`:

```powershell
# Start cloudflared proxy in background
$job = Start-Job -ScriptBlock {
    $env:Path += ";$env:USERPROFILE"
    cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222
}

# Wait for proxy to start
Start-Sleep -Seconds 3

# Connect via SSH
cd "E:\git ssh key"
ssh -i ".\id_ed25519_github" -p 2222 jobsmato@localhost

# Clean up background job when done
Stop-Job $job
Remove-Job $job
```

## Troubleshooting

- **Connection refused**: Make sure the cloudflared proxy is running
- **Port 2222 in use**: Change the local port in the `--url` parameter
- **DNS not resolving**: Wait a few minutes for DNS propagation

## Current Configuration

- **Domain**: `ssh.jobsmato.com`
- **Tunnel**: `home-server` (ID: 87b4dc67-d8d8-4ffa-bef7-8851e2e1d1da)
- **Local Proxy Port**: 2222
- **Server SSH Port**: 22

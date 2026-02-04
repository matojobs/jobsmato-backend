# Activity Log

## 2026-01-20

### SSH Key Generation for GitHub
- **Created**: SSH key pair for GitHub authentication
- **Key Type**: ED25519 (modern, secure algorithm)
- **Files Created**:
  - `id_ed25519_github` (private key - keep secure!)
  - `id_ed25519_github.pub` (public key - add to GitHub)
- **Purpose**: For use with GitHub and Ubuntu Server
- **Documentation**: Created `GITHUB_SSH_SETUP.md` with complete setup instructions
- **Permission Fix**: Fixed Windows file permissions on private key (restricted to current user only)
- **Connection Test**: Successfully tested SSH connection to GitHub - authentication working correctly

### Cloudflare Tunnel Setup (Guide)
- **Goal**: Expose home server services publicly (works behind CGNAT) using Cloudflare Tunnel
- **Domain**: `jobsmato.com` (root domain + www)
- **Initial Port**: 8080 (for combined frontend/backend setup)
- **Future Plan**: Separate hostnames for frontend (`app.jobsmato.com`) and backend (`api.jobsmato.com`)
- **Documentation**: Created `CLOUDFLARE_TUNNEL_SETUP.md` with install + config + service steps

### Cloudflare Tunnel Setup (Completed)
- **Installed**: cloudflared version 2026.1.1 on Ubuntu Server
- **Authenticated**: Cloudflare login completed, certificate installed
- **Tunnel Created**: `home-server` (ID: 87b4dc67-d8d8-4ffa-bef7-8851e2e1d1da)
- **Config Created**: `/etc/cloudflared/config.yml` mapping `api.jobsmato.com` → `localhost:8080`
- **Config Updated**: Changed from `jobsmato.com`/`www.jobsmato.com` to `api.jobsmato.com` as requested
- **Service Status**: Running and enabled (systemd service active)
- **DNS**: Existing DNS records detected (may need manual update in Cloudflare dashboard to point to tunnel)
- **Connection**: Multiple tunnel connections registered and active
- **SSH via Domain**: Added SSH support through `ssh.jobsmato.com` using TCP forwarding
- **cloudflared Client**: Installed cloudflared on Windows for SSH proxy access
- **SSH Test**: Successfully tested SSH connection via domain using cloudflared proxy
- **Documentation**: Created `SSH_VIA_DOMAIN.md` with connection instructions
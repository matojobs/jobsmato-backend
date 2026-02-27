# Multi-Domain Backend Setup on One Server

This guide explains how to run **another domain’s backend** on the same server as Jobsmato, and how to connect it to **Cloudflare** and **Nginx**.

**To connect to the server (e.g. for another Cursor to complete this setup):** Use Option 1 — run the SSH script at **`E:\jobsmato-backend\ssh-connect.ps1`** (or `./ssh-connect.ps1` from the project root). See [Connect to the server via SSH (Option 1)](#connect-to-the-server-via-ssh-option-1).

---

## Table of Contents

1. [Connect to the server via SSH (Option 1)](#connect-to-the-server-via-ssh-option-1)
2. [Best way to run another domain backend](#best-way-to-run-another-domain-backend)
3. [Architecture overview](#architecture-overview)
4. [Prerequisites](#prerequisites)
5. [Step 1: Add the new domain in Cloudflare](#step-1-add-the-new-domain-in-cloudflare)
6. [Step 2: Run the second backend on the server](#step-2-run-the-second-backend-on-the-server)
7. [Step 3: Configure Nginx (host-based routing)](#step-3-configure-nginx-host-based-routing)
8. [Step 4: Add the new hostname to the Cloudflare tunnel](#step-4-add-the-new-hostname-to-the-cloudflare-tunnel)
9. [Step 5: DNS and verify](#step-5-dns-and-verify)
10. [Summary checklist](#summary-checklist)
11. [Troubleshooting](#troubleshooting)

---

## Connect to the server via SSH (Option 1)

Use this to get a shell on the server so you (or another Cursor session/agent) can complete the multi-domain setup (Steps 2–5 below). The script starts the Cloudflare tunnel and opens SSH in one go.

### Script location

| Context | Path |
|--------|------|
| **Project root** | `jobsmato-backend` (this repo) |
| **SSH connect script** | `ssh-connect.ps1` in the project root |
| **Absolute path (Windows)** | `E:\jobsmato-backend\ssh-connect.ps1` |

So the script file is:

- **Relative:** `<project-root>/ssh-connect.ps1`
- **Absolute (example):** `E:\jobsmato-backend\ssh-connect.ps1`

### How to run it

From a **PowerShell** terminal:

```powershell
cd E:\jobsmato-backend
.\ssh-connect.ps1
```

If execution policy blocks scripts:

```powershell
cd E:\jobsmato-backend
powershell -ExecutionPolicy Bypass -File .\ssh-connect.ps1
```

The script will:

1. Start the Cloudflare Tunnel proxy (ssh.jobsmato.com → localhost:2222).
2. Open an SSH session to `jobsmato@localhost` on port `2222` using the key at `E:\git ssh key\id_ed25519_github` (the script changes to that directory before running `ssh`).
3. When you type `exit` in the SSH session, it stops the tunnel proxy.

### For another Cursor / agent

To complete the multi-domain setup on the server:

1. **Connect:** Run the script above (from the repo root). Use the script path `E:\jobsmato-backend\ssh-connect.ps1` or `./ssh-connect.ps1` when already in `E:\jobsmato-backend`.
2. **Once logged in via SSH:** Follow [Step 2](#step-2-run-the-second-backend-on-the-server) through [Step 5](#step-5-dns-and-verify) in this document. All commands in those steps are run on the server.
3. **Requirements:** `cloudflared` must be in PATH (or under `%USERPROFILE%` on Windows). SSH key must exist at `E:\git ssh key\id_ed25519_github`; if the key lives in the repo, use the [manual two-terminal method](#manual-ssh-two-terminals) and point `-i` to `E:\jobsmato-backend\ssh-keys\id_ed25519_github`.

### Manual SSH (two terminals)

If you prefer not to use the script, or the script’s key path doesn’t match your machine:

**Terminal 1 (leave running):**
```powershell
cd "E:\git ssh key"
$env:Path += ";$env:USERPROFILE"
cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222
```

**Terminal 2:**
```powershell
ssh -i "E:\git ssh key\id_ed25519_github" -p 2222 jobsmato@localhost
```

Key in repo instead:
```powershell
ssh -i "E:\jobsmato-backend\ssh-keys\id_ed25519_github" -p 2222 jobsmato@localhost
```

---

## Best way to run another domain backend

| Approach | Recommendation |
|----------|----------------|
| **One server, one Nginx, one Cloudflare tunnel** | ✅ **Recommended.** One tunnel sends traffic to Nginx; Nginx routes by `Host` (e.g. `api.jobsmato.com` → port 5004, `api.other.com` → port 5005). Simple, one place to manage. |
| **Separate Docker Compose per app** | ✅ **Recommended.** Each backend in its own folder with its own `docker-compose.yml`, different container names and ports. No shared DB/Redis unless you choose to. |
| **Multiple tunnels (one per domain)** | Optional. Use only if you need strict isolation or different Cloudflare accounts. More to maintain. |
| **Same Compose file, multiple API services** | Possible but messier. Prefer separate Compose projects per domain/app. |

**Best practice:** One Cloudflare tunnel → one Nginx (single entry point) → Nginx routes by domain to different backend ports. Each backend runs in its own Docker Compose project on a different port.

---

## Architecture overview

```
Internet
    │
    ▼
Cloudflare (DNS + proxy)
    │
    ▼
Cloudflare Tunnel (cloudflared on server)
    │  api.jobsmato.com    → http://localhost:8080
    │  api.otherdomain.com → http://localhost:8080
    ▼
Nginx (listens on 8080)
    │  server_name api.jobsmato.com    → proxy_pass http://localhost:5004
    │  server_name api.otherdomain.com → proxy_pass http://localhost:5005
    ▼
Docker backends
    │  jobsmato_api (port 5004)
    │  otherdomain_api (port 5005)
```

- **One tunnel, one port (8080):** All hostnames go to Nginx. Nginx decides which backend to use by `Host` header.
- **One Nginx config file per app** (or one file with multiple `server` blocks) keeps things clear.

---

## Prerequisites

- Same Ubuntu server where Jobsmato already runs.
- SSH access (e.g. via `ssh-connect.ps1` or Cloudflare Tunnel for SSH).
- Nginx already installed and used for Jobsmato (e.g. listening on 8080 for the tunnel).
- Cloudflare tunnel already set up for `api.jobsmato.com` (see `ssh-keys/CLOUDFLARE_TUNNEL_SETUP.md`).
- The **new domain** (e.g. `otherdomain.com`) added to your Cloudflare account and using Cloudflare nameservers (or a subdomain of an existing Cloudflare domain).

---

## Step 1: Add the new domain in Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com).
2. **If the domain is new:** Click **Add a site** and add `otherdomain.com` (or your second domain). Follow the steps and set nameservers at your registrar to Cloudflare’s.
3. **If using a subdomain of an existing domain:** No new site needed; you’ll add a CNAME in Step 5.
4. Note the domain; you’ll use e.g. **api.otherdomain.com** for the backend.

---

## Step 2: Run the second backend on the server

Each backend should run in its **own directory** with its **own Docker Compose** and a **unique port**.

### 2.1 Create a directory for the second app

```bash
# On the server (via SSH)
mkdir -p /home/jobsmato/otherdomain-backend
cd /home/jobsmato/otherdomain-backend
```

### 2.2 Add the second app’s Docker setup

- Copy or create a `docker-compose.yml` for the second backend (Node/NestJS, etc.).
- Expose the API on a **different host port**, e.g. **5005** (Jobsmato uses 5004):

```yaml
# Example: otherdomain-backend/docker-compose.yml
services:
  api:
    image: otherdomain-backend:latest
    container_name: otherdomain_api
    ports:
      - "5005:5000"   # Host 5005 → container 5000
    # ... rest of config (env, DB if needed, etc.)
```

- Use **different container names** (e.g. `otherdomain_api`, `otherdomain_postgres`) and **different volume/network names** so they don’t clash with Jobsmato.

### 2.3 Run the second backend

```bash
cd /home/jobsmato/otherdomain-backend
docker compose up -d
docker compose ps
curl -s http://localhost:5005/api/health   # or whatever health path it has
```

Leave this backend running; Nginx will send traffic to port 5005 for the new domain.

---

## Step 3: Configure Nginx (host-based routing)

Nginx must route **api.otherdomain.com** to the new backend (e.g. 5005), and keep **api.jobsmato.com** on 5004.

### 3.1 Find Nginx config location

On the server, Nginx is often configured under:

- `/etc/nginx/sites-available/` and `sites-enabled/`, or  
- `/etc/nginx/conf.d/`

Your Jobsmato API might be in something like `nginx-router.conf` (listen 8080) or `nginx-api-jobsmato.conf` (listen 80). Use the **same listen port** the Cloudflare tunnel uses (e.g. 8080).

### 3.2 Add a server block for the new domain

Create a new file (e.g. `/etc/nginx/sites-available/api-otherdomain.conf` or under `conf.d/`):

```nginx
# API for second domain (e.g. api.otherdomain.com)
server {
    listen 8080;              # Match the port your tunnel uses (8080 or 80)
    listen [::]:8080;
    server_name api.otherdomain.com;

    location /api/ {
        proxy_pass http://localhost:5005/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /health {
        proxy_pass http://localhost:5005/api/health;   # adjust path if different
        proxy_set_header Host $host;
    }

    location / {
        return 404;
    }
}
```

- If your tunnel points to **port 80** instead of 8080, use `listen 80;` and `listen [::]:80;`.
- If the second app uses a different path (e.g. no `/api` prefix), change `location` and `proxy_pass` to match.

### 3.3 Ensure Jobsmato server block is present

You should already have a block for Jobsmato, e.g.:

```nginx
server {
    listen 8080;
    listen [::]:8080;
    server_name api.jobsmato.com;
    location /api/ {
        proxy_pass http://localhost:5004/api/;
        # ... same headers as above
    }
    # ...
}
```

So:

- **api.jobsmato.com** → `localhost:5004`
- **api.otherdomain.com** → `localhost:5005`

### 3.4 Enable and test Nginx

```bash
# If using sites-available/sites-enabled
sudo ln -s /etc/nginx/sites-available/api-otherdomain.conf /etc/nginx/sites-enabled/

# Test config and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 4: Add the new hostname to the Cloudflare tunnel

The tunnel’s config must list **api.otherdomain.com** and send it to the same Nginx port (e.g. 8080).

### 4.1 Edit tunnel config on the server

```bash
sudo nano /etc/cloudflared/config.yml
```

### 4.2 Add an ingress entry for the new hostname

Keep existing hostnames; add one for the new API:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /home/jobsmato/.cloudflared/<TUNNEL-UUID>.json

ingress:
  - hostname: api.jobsmato.com
    service: http://localhost:8080
  - hostname: api.otherdomain.com
    service: http://localhost:8080
  - service: http_status:404
```

- Use your real **TUNNEL-UUID** and correct **credentials-file** path.
- Use the port Nginx actually listens on (8080 or 80). **Order matters:** more specific hostnames first; `http_status:404` must be last.

### 4.3 Restart cloudflared

```bash
sudo systemctl restart cloudflared
sudo systemctl status cloudflared --no-pager
```

---

## Step 5: DNS and verify

### 5.1 Create DNS record for the new API hostname

Either let Cloudflare create it via the tunnel:

```bash
cloudflared tunnel route dns <TUNNEL-NAME> api.otherdomain.com
```

Or in Cloudflare Dashboard:

1. **DNS** → **Records** for the zone (e.g. otherdomain.com).
2. Add:
   - Type: **CNAME**
   - Name: **api** (or the subdomain you use)
   - Target: **\<TUNNEL-UUID>.cfargotunnel.com** (or the tunnel FQDN shown in the dashboard).
   - Proxy: **Proxied (orange cloud)**.

### 5.2 Verify

- From your machine:
  - `curl -s https://api.otherdomain.com/api/health`
  - `curl -s https://api.jobsmato.com/api/health`
- On the server:
  - `curl -s http://localhost:5005/api/health`
  - `curl -s -H "Host: api.otherdomain.com" http://localhost:8080/api/health`

If both domains respond correctly, the multi-domain backend setup is done.

---

## Summary checklist

- [ ] New domain (or subdomain) in Cloudflare, nameservers set.
- [ ] Second backend in its own directory, own Docker Compose, **unique port** (e.g. 5005).
- [ ] Nginx server block for **api.otherdomain.com** → `http://localhost:5005`.
- [ ] Nginx listening on the same port the tunnel uses (e.g. 8080).
- [ ] Tunnel config: **api.otherdomain.com** → `http://localhost:8080` (or 80).
- [ ] `cloudflared` restarted after config change.
- [ ] DNS: CNAME **api.otherdomain.com** → tunnel (or created via `cloudflared tunnel route dns`).
- [ ] HTTPS works (Cloudflare terminates SSL when proxied).

---

## Troubleshooting

| Issue | What to check |
|------|-------------------------------|
| 404 or “connection refused” for new domain | Nginx: correct `server_name`, correct `proxy_pass` port (5005). Reload Nginx. |
| Tunnel not reaching Nginx | `ingress` port (8080/80) must match Nginx `listen`. Restart cloudflared. |
| DNS not resolving | CNAME target = tunnel hostname (*.cfargotunnel.com). Record proxied (orange). |
| Wrong backend answering | Nginx: only one `server` block should match the host; check `server_name` and include files. |
| 502 Bad Gateway | Backend not running: `docker compose ps` in second app dir; `curl http://localhost:5005/...`. |

### Useful commands on the server

```bash
# Nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Tunnel
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f

# Backends
docker compose ps
curl -s http://localhost:5004/api/health
curl -s http://localhost:5005/api/health
```

---

## References

- **Jobsmato tunnel/SSH:** `ssh-keys/CLOUDFLARE_TUNNEL_SETUP.md`
- **Jobsmato deployment:** `DEPLOYMENT-GUIDE.md`, `QUICK-DEPLOY.md`
- **Cloudflare Tunnel docs:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

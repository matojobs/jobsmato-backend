# Server Details and Connection Guide

This document is a single reference for:
- current server architecture,
- how to connect (SSH via Cloudflare Tunnel),
- how deployments work,
- and where credentials/keys are stored.

---

## 1) Current server architecture

- **Public API domain:** `https://api.jobsmato.com`
- **SSH domain (Cloudflare Tunnel):** `ssh.jobsmato.com`
- **Server user:** `jobsmato`
- **Reverse proxy:** Nginx
- **Runtime:** Docker Compose
- **Main containers:**
  - `jobsmato_api` (NestJS backend)
  - `jobsmato_postgres` (PostgreSQL)
  - `jobsmato_redis` (Redis)

### Traffic flow

Internet -> Cloudflare -> Cloudflare Tunnel -> Nginx -> backend container

Typical routing in docs:
- `api.jobsmato.com` -> Nginx (usually `localhost:8080`) -> backend (`localhost:5004` or container port mapping from compose).

---

## 2) How to connect to server (SSH)

SSH is done through a local TCP proxy created by `cloudflared`.

### Method A (manual, most reliable)

Terminal 1 (keep running):

```powershell
cd "E:\git ssh key"
$env:Path += ";$env:USERPROFILE"
cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222
```

Terminal 2:

```powershell
ssh -i "E:\git ssh key\id_ed25519_github" -p 2222 jobsmato@localhost
```

### Method B (repo helper script)

```powershell
cd E:\jobsmato-backend
.\scripts\ssh-connect.ps1
```

Note: the helper script currently changes directory to `E:\git ssh key` and uses key `id_ed25519_github` from there.

---

## 3) How deployment works on this server

Primary deployment script:

```powershell
.\deploy.ps1
```

What it does:
1. Starts Cloudflare SSH tunnel proxy (unless `-UseExistingTunnel`).
2. Builds Docker image locally.
3. Uploads image + `docker-compose.yml` + `.env` to `/home/jobsmato/`.
4. On server: `docker compose down` then `docker compose up -d`.
5. Runs migration helper scripts in container.
6. Verifies health/logs.

Useful variants:

```powershell
.\deploy.ps1 -UseExistingTunnel
.\deploy.ps1 -UseExistingTunnel -SkipBuild
.\deploy-with-migration.ps1
```

---

## 4) Where server credentials are stored

This section answers: "where are credentials stored?"

### A) SSH private key (local machine)

- Primary location used by docs/scripts: `E:\git ssh key\id_ed25519_github`
- Fallback location used by `deploy.ps1`: `E:\jobsmato-backend\ssh-keys\id_ed25519_github` (inside repo)

Keep this file private. Do not share or commit new private keys.

### B) App runtime secrets (.env)

- Local source used by deployment: `E:\jobsmato-backend\.env`
- Uploaded destination on server: `/home/jobsmato/.env`

This includes sensitive values like:
- DB credentials
- JWT secrets
- Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`)
- Redis and SMTP settings

### C) Cloudflare tunnel credentials (server side)

- Cloudflared config: `/etc/cloudflared/config.yml`
- Tunnel credentials file: `/home/jobsmato/.cloudflared/<TUNNEL-UUID>.json`

### D) GitHub/SSH setup docs (reference)

- `ssh-keys/GITHUB_SSH_SETUP.md`
- `ssh-keys/SSH_VIA_DOMAIN.md`
- `ssh-keys/CLOUDFLARE_TUNNEL_SETUP.md`

### E) Non-secret env template

- `env.example` contains placeholders only (safe to commit).
- Real values must remain in `.env` (local + server) and secret stores.

---

## 5) Quick verification commands

After SSH:

```bash
docker compose -f /home/jobsmato/docker-compose.yml ps
docker logs --tail 100 jobsmato_api
curl -s http://localhost:5004/api/health
```

From local machine:

```powershell
curl https://api.jobsmato.com/api/health
```

---

## 6) Deploy another project on same server (brief)

Recommended pattern from multi-domain docs:
- Keep one tunnel and one Nginx entrypoint.
- Add new host-based Nginx route:
  - `api.jobsmato.com` -> backend A port
  - `api.otherdomain.com` -> backend B port
- Run each project in separate Docker Compose directory with unique ports/container names.

Reference: `docs/MULTI-DOMAIN-BACKEND-SETUP.md`.

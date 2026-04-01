# Backend Deployment — Claude Reference

> This doc is written for Claude to follow exactly when deploying the backend.
> Read this before every deploy. Do not skip steps.

---

## Server Layout

| Path | Purpose |
|------|---------|
| `/home/jobsmato/` | **Home dir** — `docker-compose.yml`, `.env`, image tar |
| `/home/jobsmato/.env` | All production secrets (Google OAuth, SMTP, etc.) |
| `/tmp/backend-build/` | Git clone of backend repo (source + Dockerfile) |
| Docker project name | `jobsmato` |
| API container | `jobsmato_api` (port 5004→5000) |
| DB container | `jobsmato_postgres` |
| Redis container | `jobsmato_redis` |
| Network | `jobsmato_jobsmato_network` |

**CRITICAL RULE:** Always run `docker compose` from `/home/jobsmato/` — this is the only place that picks up `.env` automatically. Never run it from `/tmp/backend-build/` or any other path.

---

## SSH Setup

```bash
# Step 1 — Start cloudflared tunnel (keep running in background)
/c/Users/sak47/cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222

# Step 2 — SSH into server
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -p 2222 \
  -i "E:/git ssh key/id_ed25519_github" jobsmato@localhost
```

- SSH key: `E:/git ssh key/id_ed25519_github`
- User: `jobsmato`
- Port: `2222` (cloudflared tunnel → server port 22)

---

## Standard Deploy (code changes only)

Run these commands in sequence via SSH:

```bash
# 1. Pull latest code on server
cd /tmp/backend-build
git pull origin feature/sourcing-datalake

# 2. Build new Docker image on server
docker build -t jobsmato-backend:latest .

# 3. Restart ONLY the api container (from home dir — picks up .env)
cd /home/jobsmato
docker compose -p jobsmato up -d --no-deps api

# 4. Wait ~10s then verify
sleep 10
docker ps | grep jobsmato_api
curl -sf http://localhost:5004/api/health
```

Combined one-liner for SSH:
```bash
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -p 2222 \
  -i "E:/git ssh key/id_ed25519_github" jobsmato@localhost \
  "cd /tmp/backend-build && git pull origin feature/sourcing-datalake && docker build -t jobsmato-backend:latest . && docker stop jobsmato_api && docker rm jobsmato_api && cd /home/jobsmato && docker compose -p jobsmato up -d --no-deps api && sleep 12 && docker ps | grep jobsmato_api && curl -sf http://localhost:5004/api/health"
```

---

## Health Check

```bash
curl -sf http://localhost:5004/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"...","uptime":...,"version":"1.0.0","services":{"database":{"status":"healthy"},"redis":{"status":"healthy"}}}
```

---

## Checking Logs

```bash
docker logs jobsmato_api --tail 30
docker logs -f jobsmato_api   # follow live
```

---

## What NOT to do

| Wrong | Right |
|-------|-------|
| `docker run ... -e GOOGLE_CLIENT_ID=...` with manual env vars | Use `docker compose` from `/home/jobsmato/` |
| `cd /tmp/backend-build && docker compose up` | `cd /home/jobsmato && docker compose -p jobsmato up` |
| `docker compose up` (starts postgres + redis too) | `docker compose up -d --no-deps api` |
| Build image locally and scp tar | Build directly on server via `docker build` in `/tmp/backend-build/` |

---

## If Container Fails to Start

```bash
# Check what's wrong
docker logs jobsmato_api --tail 50

# Common causes:
# - Wrong working dir for compose → .env not loaded → empty credentials
# - Port conflict → check docker ps -a
# - Image not built yet → run docker build step again
```

---

## DB Migration (if schema changed)

Run AFTER the container is healthy:

```bash
ssh -o StrictHostKeyChecking=no -p 2222 -i "E:/git ssh key/id_ed25519_github" jobsmato@localhost \
  "docker exec jobsmato_postgres psql -U jobsmato_user -d jobsmato_db -c \"<YOUR SQL HERE>\""
```

---

## Frontend Deploy

Frontend auto-deploys to Vercel on push to `main`. No manual steps needed.

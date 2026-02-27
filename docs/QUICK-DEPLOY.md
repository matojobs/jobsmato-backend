# 🚀 Quick Deployment Reference

## Deploy – same as Jan 20 (Bash)

**Step 1:** Start cloudflared in a separate terminal (keep it running):
```bash
cloudflared access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222
```

**Step 2:** In another terminal (Git Bash or WSL), run:
```bash
cd /e/jobsmato-backend   # or cd E:\jobsmato-backend in Git Bash
./deploy.sh
```

Skip build (use existing image): `SKIP_BUILD=1 ./deploy.sh`

---

## Deploy (PowerShell)

**Step 1:** Start cloudflared in a separate terminal (keep it running):
```powershell
cd "E:\git ssh key"
$env:Path += ";$env:USERPROFILE"
cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222
```

**Step 2:** In another terminal, run deploy:
```powershell
cd E:\jobsmato-backend
.\deploy.ps1 -UseExistingTunnel
```

That's it. Image upload (~85MB) may take 2–5 minutes.

## What Gets Deployed

1. ✅ Docker image built locally
2. ✅ Image uploaded to server via Cloudflare Tunnel
3. ✅ Docker Compose services restarted
4. ✅ Health checks verified
5. ✅ Container logs displayed

## Common Commands

### Deploy with Migrations
```powershell
.\deploy-with-migration.ps1
```

### Use Existing Tunnel (cloudflared already running)
```powershell
.\deploy.ps1 -UseExistingTunnel
```

### Skip Build (use existing image file)
```powershell
.\deploy.ps1 -UseExistingTunnel -SkipBuild
```

### Quick SSH Access
```powershell
.\ssh-connect.ps1
```

### Check Server Status (via SSH)
```powershell
ssh -i "E:\git ssh key\id_ed25519_github" -p 2222 jobsmato@localhost "docker-compose ps"
```

### View Logs (via SSH)
```powershell
ssh -i "E:\git ssh key\id_ed25519_github" -p 2222 jobsmato@localhost "docker logs -f jobsmato_api"
```

## Troubleshooting

**Connection fails?**
- Start cloudflared first in a separate terminal (Step 1 above)
- Then run deploy with `-UseExistingTunnel`

**Build fails?**
- Make sure Docker Desktop is running
- Check disk space: `docker system df`

**Deployment fails?**
- Check logs: `docker logs jobsmato_api`
- Verify environment variables in `docker-compose.yml`

## Full Documentation

- **Setup Guide**: [DEPLOYMENT-SETUP-NEW-SERVER.md](./DEPLOYMENT-SETUP-NEW-SERVER.md)
- **Complete Guide**: [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

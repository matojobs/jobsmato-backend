# 🚀 Quick Deployment Reference

## One-Line Deployment

```powershell
.\deploy.ps1
```

That's it! The script handles everything automatically.

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

### Skip Build (Use Existing Image)
```powershell
.\deploy.ps1 -SkipBuild
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
- Make sure cloudflared is installed: `cloudflared --version`
- Check Cloudflare Tunnel is active

**Build fails?**
- Make sure Docker Desktop is running
- Check disk space: `docker system df`

**Deployment fails?**
- Check logs: `docker logs jobsmato_api`
- Verify environment variables in `docker-compose.yml`

## Full Documentation

- **Setup Guide**: [DEPLOYMENT-SETUP-NEW-SERVER.md](./DEPLOYMENT-SETUP-NEW-SERVER.md)
- **Complete Guide**: [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

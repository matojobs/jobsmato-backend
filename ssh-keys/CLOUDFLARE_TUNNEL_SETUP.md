# Cloudflare Tunnel setup for `jobsmato.com` (Ubuntu 22.04)

This exposes services on your home server publicly **without port-forwarding** (works with Airtel CGNAT).

## Prereqs (one-time)

- Your domain **`jobsmato.com` must be added to Cloudflare** and using Cloudflare nameservers.
- Current setup:
  - `api.jobsmato.com` → `http://localhost:8080`
  - **Note**: Later you can add `app.jobsmato.com` (frontend) and keep `api.jobsmato.com` (backend)

## Security note

- **Do not share passwords** (sudo/SSH/GitHub). If you shared one, **change it now**.

## On the Ubuntu server (interactive SSH)

### 1) Install `cloudflared`

Run:

```bash
sudo mkdir -p /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update
sudo apt install -y cloudflared
cloudflared --version
```

### 2) Authenticate Cloudflare (creates cert)

Run:

```bash
cloudflared tunnel login
```

It prints a URL. Open it in your browser (any device), login, select **`jobsmato.com`**, approve.

### 3) Create the tunnel

Pick a tunnel name (example: `home-server`):

```bash
cloudflared tunnel create home-server
```

This prints a **Tunnel UUID** and creates a credentials JSON under `~/.cloudflared/`.

### 4) Create tunnel config

Create the config folder and file:

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Paste (edit **TUNNEL-UUID** and **PORT**):

```yaml
tunnel: TUNNEL-UUID
credentials-file: /home/jobsmato/.cloudflared/TUNNEL-UUID.json

ingress:
  - hostname: api.jobsmato.com
    service: http://localhost:8080
  - service: http_status:404
```

**Important**: Replace `TUNNEL-UUID` with the actual UUID from step 3.

**Notes**:
- Currently configured for port **8080** (where your frontend/backend will run)
- To add separate frontend/backend later, add more hostname blocks:
  ```yaml
  - hostname: app.jobsmato.com
    service: http://localhost:3000
  - hostname: api.jobsmato.com
    service: http://localhost:5000
  ```

### 5) Create DNS record automatically

```bash
cloudflared tunnel route dns home-server api.jobsmato.com
```

### 6) Run as a system service

Install service + start + enable:

```bash
sudo cloudflared service install
sudo systemctl restart cloudflared
sudo systemctl enable cloudflared
sudo systemctl status cloudflared --no-pager
```

### 7) Troubleshooting / logs

```bash
sudo journalctl -u cloudflared -f
```

Common issues:
- **Wrong credentials path** in `config.yml`: ensure the JSON path exists and matches your tunnel UUID.
- **Local service not running**: `curl -v http://localhost:8080` should work on the server.
- **Cloudflare DNS not on Cloudflare**: your domain must use Cloudflare nameservers for `route dns` to work.

## Future: Separate Frontend/Backend Hostnames

When you're ready to split frontend and backend, you can add to the config:

```yaml
ingress:
  - hostname: app.jobsmato.com
    service: http://localhost:3000  # Frontend
  - hostname: api.jobsmato.com
    service: http://localhost:5000   # Backend API
  - service: http_status:404
```

Then run:
```bash
cloudflared tunnel route dns home-server app.jobsmato.com
cloudflared tunnel route dns home-server api.jobsmato.com
sudo systemctl restart cloudflared
```


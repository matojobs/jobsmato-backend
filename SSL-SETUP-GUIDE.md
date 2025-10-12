# 🔒 SSL Certificate Setup Guide

This guide provides multiple options for setting up a proper SSL certificate for your Jobsmato backend API.

## 🎯 **Current Situation**
- **Server IP**: 15.134.85.184
- **Current SSL**: Self-signed certificate (browser warnings)
- **Goal**: Valid SSL certificate from Let's Encrypt

## 🚀 **Option 1: Free Domain + Let's Encrypt (Recommended)**

### Step 1: Get a Free Domain

#### **A. DuckDNS (Easiest)**
1. Visit: https://www.duckdns.org/
2. Sign up with Google/GitHub
3. Create a subdomain: `jobsmato-api`
4. Your domain will be: `https://jobsmato-api.duckdns.org`
5. Add your IP: `15.134.85.184`

#### **B. Freenom (Free .tk/.ml/.ga domains)**
1. Visit: https://www.freenom.com/
2. Search for available domains
3. Register a free domain (e.g., `jobsmato-api.tk`)
4. Point DNS to: `15.134.85.184`

#### **C. No-IP (Free subdomain)**
1. Visit: https://www.noip.com/
2. Create free account
3. Choose subdomain: `jobsmato-api.ddns.net`
4. Point to: `15.134.85.184`

### Step 2: Configure DNS
```bash
# For any domain service, create these DNS records:
A Record: @ -> 15.134.85.184
A Record: www -> 15.134.85.184
CNAME: api -> your-domain.com
```

### Step 3: Get Let's Encrypt Certificate
```bash
# SSH into your server
ssh -i jobsmato_backend.pem ec2-user@15.134.85.184

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## 🌐 **Option 2: Cloudflare (Alternative)**

### Benefits:
- ✅ Free SSL certificate
- ✅ CDN and DDoS protection
- ✅ Automatic HTTPS redirect
- ✅ Better performance
- ✅ No server configuration needed

### Setup:
1. Sign up at: https://cloudflare.com
2. Add your domain
3. Point DNS to: `15.134.85.184`
4. Enable SSL/TLS encryption mode: **Full**
5. Enable **Always Use HTTPS**

### Cloudflare Configuration:
```
SSL/TLS Mode: Full
Always Use HTTPS: ON
Automatic HTTPS Rewrites: ON
HSTS: ON
```

## 🔧 **Option 3: AWS Route 53 + Let's Encrypt**

### If you have a domain:
1. Create hosted zone in Route 53
2. Point domain to your EC2 instance
3. Use Let's Encrypt with Route 53 plugin

```bash
# Install Route 53 plugin
sudo dnf install -y python3-boto3

# Get certificate with Route 53 validation
sudo certbot certonly --dns-route53 -d your-domain.com
```

## 🛠️ **Implementation Steps**

### Step 1: Choose Your Domain
Pick one of the free domain options above. **DuckDNS is recommended** for simplicity.

### Step 2: Update Nginx Configuration
```bash
# SSH into server
ssh -i jobsmato_backend.pem ec2-user@15.134.85.184

# Update Nginx config for your domain
sudo nano /etc/nginx/conf.d/jobsmato.conf
```

**New Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # Let's Encrypt certificates (will be created by certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    
    location /api/ {
        proxy_pass http://localhost:5004/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, Accept, Origin, X-Requested-With" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        # Handle preflight requests
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, Accept, Origin, X-Requested-With" always;
            add_header Access-Control-Allow-Credentials "true" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
}
```

### Step 3: Get SSL Certificate
```bash
# Test Nginx configuration
sudo nginx -t

# Get Let's Encrypt certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### Step 4: Set Up Auto-Renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🧪 **Testing Your SSL Certificate**

### Test SSL Configuration:
```bash
# Test SSL grade
curl -I https://your-domain.com/api/jobs

# Test with SSL Labs (online)
# Visit: https://www.ssllabs.com/ssltest/
# Enter your domain
```

### Expected Results:
- ✅ **SSL Grade**: A or A+
- ✅ **No Browser Warnings**
- ✅ **Valid Certificate**
- ✅ **HTTPS Redirect Working**

## 📋 **Quick Setup Commands**

### For DuckDNS:
```bash
# 1. Get domain from DuckDNS
# 2. Update Nginx config
sudo nano /etc/nginx/conf.d/jobsmato.conf
# Replace 'your-domain.com' with your DuckDNS domain

# 3. Test and get certificate
sudo nginx -t
sudo certbot --nginx -d your-subdomain.duckdns.org

# 4. Test
curl -I https://your-subdomain.duckdns.org/api/jobs
```

## 🔄 **Migration Steps**

### After Getting Valid SSL:

1. **Update Frontend Configuration:**
```typescript
// Update your frontend API URL
const API_BASE_URL = 'https://your-domain.com/api';
```

2. **Update Documentation:**
```bash
# Update README.md with new domain
# Update deployment scripts
# Update environment variables
```

3. **Test Everything:**
```bash
# Test API endpoints
curl https://your-domain.com/api/jobs
curl https://your-domain.com/api/health

# Test CORS
curl -X OPTIONS https://your-domain.com/api/jobs \
  -H "Origin: https://your-frontend.com" \
  -I
```

## 🚨 **Important Notes**

### Security Considerations:
- ✅ **Always Use HTTPS**: Redirect HTTP to HTTPS
- ✅ **HSTS Headers**: Enable HTTP Strict Transport Security
- ✅ **Certificate Renewal**: Set up automatic renewal
- ✅ **Security Headers**: Add proper security headers

### Backup Plan:
- Keep the self-signed certificate as backup
- Document the fallback process
- Test both configurations

## 📞 **Support**

If you encounter issues:
1. Check DNS propagation: https://dnschecker.org/
2. Verify certificate: https://www.ssllabs.com/ssltest/
3. Check Nginx logs: `sudo journalctl -u nginx -f`
4. Check Certbot logs: `sudo journalctl -u certbot -f`

---

**Recommended Next Step**: Choose DuckDNS for the easiest setup, then follow the implementation steps above.

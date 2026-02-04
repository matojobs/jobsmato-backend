# GitHub SSH Key Setup Guide

## SSH Key Generated Successfully! ✅

Your SSH key pair has been created:
- **Private Key**: `id_ed25519_github` (keep this secure and never share it!)
- **Public Key**: `id_ed25519_github.pub` (this is what you'll add to GitHub)

## Your Public Key

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBZgY78HL/SOHJJuJeWeUz6/d/Tb1tKpxPbP6lf2U3iK github-ubuntu-server
```

## Steps to Add SSH Key to GitHub

### 1. Copy Your Public Key
The public key content is shown above. You can also view it by running:
```powershell
Get-Content id_ed25519_github.pub
```

### 2. Add to GitHub
1. Go to GitHub.com and sign in
2. Click your profile picture (top right) → **Settings**
3. In the left sidebar, click **SSH and GPG keys**
4. Click **New SSH key** button
5. Fill in the form:
   - **Title**: Give it a descriptive name (e.g., "Ubuntu Server" or "My Development Machine")
   - **Key type**: Select **Authentication Key**
   - **Key**: Paste the entire public key content (the long string starting with `ssh-ed25519`)
6. Click **Add SSH key**
7. You may be prompted to enter your GitHub password

### 3. Test the Connection
After adding the key, test it with:
```powershell
ssh -T git@github.com -i id_ed25519_github
```

You should see a message like: `Hi [username]! You've successfully authenticated...`

## Using the Key on Ubuntu Server

### Transfer the Keys to Ubuntu Server

**Option 1: Using SCP (from Windows)**
```powershell
scp id_ed25519_github id_ed25519_github.pub user@your-ubuntu-server:/home/user/.ssh/
```

**Option 2: Manual Copy**
1. Copy both files to your Ubuntu Server
2. Place them in `~/.ssh/` directory
3. Set proper permissions:
   ```bash
   chmod 600 ~/.ssh/id_ed25519_github
   chmod 644 ~/.ssh/id_ed25519_github.pub
   ```

### Configure SSH on Ubuntu Server

1. Create or edit `~/.ssh/config`:
   ```bash
   nano ~/.ssh/config
   ```

2. Add the following configuration:
   ```
   Host github.com
       HostName github.com
       User git
       IdentityFile ~/.ssh/id_ed25519_github
       IdentitiesOnly yes
   ```

3. Test the connection from Ubuntu:
   ```bash
   ssh -T git@github.com
   ```

## Security Notes

⚠️ **Important Security Reminders:**
- **Never share your private key** (`id_ed25519_github`) with anyone
- Keep the private key file secure (600 permissions)
- Don't commit the private key to any repository
- The public key is safe to share (that's why it's called "public")

## Troubleshooting

If you encounter issues:
- Make sure the public key was copied completely (including `ssh-ed25519` at the start)
- Verify file permissions on Ubuntu Server (private key should be 600)
- Check that the key was added correctly in GitHub settings
- Try using `ssh -vT git@github.com` for verbose debugging output

# Jobsmato Backend

NestJS API for the Jobsmato job portal (admin panel, recruiter portal, job applications, sourcing).

## Quick start

```bash
cp env.example .env
npm install
npm run start:dev
```

API base: `http://localhost:5000/api`

## Project structure

- **src/** – Application source (NestJS modules, entities)
- **config/** – Nginx configs, `jobsmato-folder-config.json`
- **docs/** – All documentation (.md and reports)
- **scripts/** – DB, deploy, seed, and utility scripts (run from repo root)
- **postman/** – Postman collections and environments
- **deploy.ps1 / deploy.sh** – Main deployment (run from repo root)

## Docs

- Admin API: `docs/ADMIN-PANEL-API-DOCUMENTATION.md`
- Admin CRUD (frontend): `docs/ADMIN-PANEL-FRONTEND-CRUD-API.md`
- Recruiter API: `docs/RECRUITER-PORTAL-API-DOCUMENTATION.md`
- Deployment: `docs/DEPLOYMENT-GUIDE.md`, `docs/QUICK-DEPLOY.md`
- Full list: `docs/README.md`

## Deployment

From repo root: `.\deploy.ps1` (Windows) or `./deploy.sh` (Linux/macOS).

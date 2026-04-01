# Scripts

Run from **repository root**: e.g. `node scripts/run-migrations.js`.

**DB:** run-migrations.js, run-sourcing-migrations.js, backup-database.ps1, restore-database.ps1, backup-and-fix-db.sh, init.sql

**Seeds / setup:** seed-data.js, seed-data-fixed.js, seed-recruiter-companies.js, setup-google-drive-credentials.js, setup-recruiter-user.js, create-jobsmato-folder.js, create-sourcing-schema.js, add-recruiter-role-enum.js, **create-admin-user.js** (create/upgrade admin on prod: `node scripts/create-admin-user.js --email admin@jobsmato.com --password "YourPass"`)

**Deploy helpers:** deploy-with-migration.ps1, prepare-server.ps1, rollback-deployment.ps1, verify-deployment.ps1, deploy-*.sh, server-setup.sh, ssh-connect.ps1

**Checks / tests:** check-*.js, test-*.js, test-resume-download.sh, verify-*.js, validate-sourcing-datalake.js, fix-*.js, create-*.js

**Main deploy:** from repo root run `.\deploy.ps1` or `./deploy.sh`. See docs/DEPLOYMENT-GUIDE.md.

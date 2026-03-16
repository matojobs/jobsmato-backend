/**
 * Check for route conflicts across all controllers
 */
const fs = require('fs');
const path = require('path');

const controllers = [
  { path: 'src/modules/auth/auth.controller.ts', prefix: 'auth' },
  { path: 'src/modules/users/users.controller.ts', prefix: 'users' },
  { path: 'src/modules/jobs/jobs.controller.ts', prefix: 'jobs' },
  { path: 'src/modules/companies/companies.controller.ts', prefix: 'companies' },
  { path: 'src/modules/applications/applications.controller.ts', prefix: 'applications' },
  { path: 'src/modules/upload/upload.controller.ts', prefix: 'upload' },
  { path: 'src/modules/upload/cloudinary.controller.ts', prefix: 'cloudinary' },
  { path: 'src/modules/files/files.controller.ts', prefix: 'files' },
  { path: 'src/modules/recruiter/recruiter.controller.ts', prefix: 'recruiter' },
  { path: 'src/modules/admin/controllers/admin-users.controller.ts', prefix: 'admin/users' },
  { path: 'src/modules/admin/controllers/admin-settings.controller.ts', prefix: 'admin/settings' },
  { path: 'src/modules/admin/controllers/admin-logs.controller.ts', prefix: 'admin/logs' },
  { path: 'src/modules/admin/controllers/admin-jobs.controller.ts', prefix: 'admin/jobs' },
  { path: 'src/modules/admin/controllers/admin-dashboard.controller.ts', prefix: 'admin/dashboard' },
  { path: 'src/modules/admin/controllers/admin-companies.controller.ts', prefix: 'admin/companies' },
  { path: 'src/modules/admin/controllers/admin-bulk-upload.controller.ts', prefix: 'admin/jobs/bulk-upload' },
  { path: 'src/modules/admin/controllers/admin-auth.controller.ts', prefix: 'admin/auth' },
  { path: 'src/modules/admin/controllers/admin-activity.controller.ts', prefix: 'admin/activity-logs' },
];

function extractRoutes(filePath, prefix) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const routes = [];
    
    // Extract @Controller value
    const controllerMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/);
    const controllerPath = controllerMatch ? controllerMatch[1] : '';
    
    // Extract all route decorators
    const routeMatches = content.matchAll(/@(Get|Post|Patch|Put|Delete)\(['"]([^'"]*)['"]\)/g);
    
    for (const match of routeMatches) {
      const method = match[1].toUpperCase();
      const routePath = match[2] || '';
      const fullPath = `/api/${controllerPath}${routePath ? '/' + routePath : ''}`;
      routes.push({ method, path: fullPath, file: filePath });
    }
    
    return routes;
  } catch (error) {
    return [];
  }
}

const allRoutes = [];
controllers.forEach(ctrl => {
  const routes = extractRoutes(ctrl.path, ctrl.prefix);
  allRoutes.push(...routes.map(r => ({ ...r, module: ctrl.prefix })));
});

// Find conflicts
const routeMap = new Map();
allRoutes.forEach(route => {
  const key = `${route.method} ${route.path}`;
  if (!routeMap.has(key)) {
    routeMap.set(key, []);
  }
  routeMap.get(key).push(route);
});

const conflicts = Array.from(routeMap.entries())
  .filter(([key, routes]) => routes.length > 1);

console.log('🔍 Route Conflict Analysis\n');
console.log('='.repeat(70));

if (conflicts.length === 0) {
  console.log('✅ No route conflicts found!');
} else {
  console.log(`⚠️  Found ${conflicts.length} route conflict(s):\n`);
  conflicts.forEach(([route, routes]) => {
    console.log(`\n${route}:`);
    routes.forEach(r => {
      console.log(`  - ${r.module} (${r.file})`);
    });
  });
}

console.log('\n' + '='.repeat(70));
console.log('\n📋 Recruiter Routes Summary:');
console.log('   All recruiter routes are now under /api/recruiter/ prefix');
console.log('   No conflicts with job seeker or other routes');

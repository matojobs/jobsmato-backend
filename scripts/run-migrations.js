const { DataSource } = require('typeorm');

const config = {
  type: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'jobsmato_user',
  password: process.env.DB_PASSWORD || 'jobsmato_password',
  database: process.env.DB_NAME || 'jobsmato_db',
  entities: ['dist/src/entities/*.entity.js'],
  migrations: ['dist/src/migrations/*.js'],
  synchronize: false,
  logging: true,
};

(async () => {
  try {
    // First, check if tables exist by trying to synchronize
    const syncDs = new DataSource({ ...config, synchronize: true });
    await syncDs.initialize();
    console.log('✅ Connected to database');
    
    // Check if migrations table exists
    const result = await syncDs.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'migrations')");
    const hasMigrationsTable = result[0].exists;
    
    if (!hasMigrationsTable) {
      console.log('📋 No migrations table found. Creating initial schema...');
      // Synchronize will create all tables
      await syncDs.synchronize();
      console.log('✅ Initial schema created');
    }
    
    await syncDs.destroy();
    
    // Now run migrations
    const migrationDs = new DataSource(config);
    await migrationDs.initialize();
    const migrations = await migrationDs.runMigrations();
    
    if (migrations.length > 0) {
      console.log(`✅ Executed ${migrations.length} migration(s):`);
      migrations.forEach(m => console.log(`   - ${m.name}`));
    } else {
      console.log('ℹ️  No pending migrations');
    }
    
    await migrationDs.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
})();

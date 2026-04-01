/**
 * Create sourcing schema manually for testing
 */
const { DataSource } = require('typeorm');

const config = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'jobsmato_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'jobsmato_db',
  logging: false,
};

async function createSchema() {
  const dataSource = new DataSource(config);
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    // Check if schema exists
    const exists = await queryRunner.query(`
      SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'sourcing') as exists;
    `);

    if (exists[0].exists) {
      console.log('✅ Sourcing schema already exists');
      await queryRunner.release();
      await dataSource.destroy();
      return;
    }

    console.log('Creating sourcing schema...');
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS sourcing;`);
    console.log('✅ Sourcing schema created');
    
    await queryRunner.release();
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Failed:', error.message);
    await queryRunner.release();
    await dataSource.destroy();
    process.exit(1);
  }
}

createSchema();

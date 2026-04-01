/**
 * Fix sourcing.detect_table_bloat() - use relname (pg_stat_user_tables) not tablename
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

const fixSql = `
  CREATE OR REPLACE FUNCTION sourcing.detect_table_bloat()
  RETURNS TABLE (
    schemaname TEXT,
    tablename TEXT,
    dead_tuple_percent NUMERIC,
    n_dead_tup BIGINT,
    n_live_tup BIGINT
  ) AS $$
  BEGIN
    RETURN QUERY
    SELECT
      s.schemaname::TEXT,
      s.relname::TEXT,
      CASE
        WHEN s.n_live_tup > 0
        THEN ROUND(100.0 * s.n_dead_tup / NULLIF(s.n_live_tup, 0), 2)
        ELSE 0
      END,
      s.n_dead_tup,
      s.n_live_tup
    FROM pg_stat_user_tables s
    WHERE s.schemaname = 'sourcing'
      AND s.n_live_tup > 1000
    ORDER BY 3 DESC;
  END;
  $$ LANGUAGE plpgsql;
`;

async function main() {
  const ds = new DataSource(config);
  try {
    await ds.initialize();
    await ds.query(fixSql);
    console.log('✅ sourcing.detect_table_bloat() updated (using relname).');
    const rows = await ds.query('SELECT * FROM sourcing.detect_table_bloat() LIMIT 3');
    console.log('   Sample:', rows.length, 'rows');
    await ds.destroy();
    process.exit(0);
  } catch (e) {
    console.error('❌', e.message);
    await ds.destroy();
    process.exit(1);
  }
}

main();

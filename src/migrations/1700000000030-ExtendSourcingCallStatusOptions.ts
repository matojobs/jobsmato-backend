import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extend sourcing.applications call_status to allow values 6-9:
 * 6 = Incoming Off, 7 = Call Back, 8 = Invalid, 9 = Out of network
 * Also updates all existing partitions (e.g. applications_2026_02) which have their own check.
 */
export class ExtendSourcingCallStatusOptions1700000000030 implements MigrationInterface {
  name = 'ExtendSourcingCallStatusOptions1700000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get partition names and bounds before detach (bounds are lost after detach)
    const partitions = await queryRunner.query(`
      SELECT child_ns.nspname AS schema_name, c.relname AS partition_name,
             pg_get_expr(c.relpartbound, c.oid) AS bounds_expr
      FROM pg_inherits i
      JOIN pg_class p ON p.oid = i.inhparent
      JOIN pg_namespace pn ON pn.oid = p.relnamespace
      JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_namespace child_ns ON child_ns.oid = c.relnamespace
      WHERE p.relname = 'applications' AND pn.nspname = 'sourcing'
    `);
    const boundsList: { schema_name: string; partition_name: string; from_val: string; to_val: string }[] = [];
    for (const r of partitions) {
      const expr = (r.bounds_expr || '').toString();
      const match = expr.match(/FROM\s*\((.+?)\)\s*TO\s*\((.+?)\)/s);
      if (match) boundsList.push({ schema_name: r.schema_name, partition_name: r.partition_name, from_val: match[1].trim(), to_val: match[2].trim() });
    }
    for (const r of partitions) {
      await queryRunner.query(
        `ALTER TABLE sourcing.applications DETACH PARTITION sourcing.${r.partition_name}`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE sourcing.applications DROP CONSTRAINT IF EXISTS applications_call_status_check CASCADE`,
    );
    await queryRunner.query(`
      ALTER TABLE sourcing.applications ADD CONSTRAINT applications_call_status_check
      CHECK (call_status IS NULL OR call_status BETWEEN 1 AND 9)
    `);
    // Update each detached partition to same check (1-9) so ATTACH succeeds
    for (const b of boundsList) {
      await queryRunner.query(
        `ALTER TABLE sourcing.${b.partition_name} DROP CONSTRAINT IF EXISTS applications_call_status_check`,
      );
      await queryRunner.query(
        `ALTER TABLE sourcing.${b.partition_name} ADD CONSTRAINT applications_call_status_check CHECK (call_status IS NULL OR call_status BETWEEN 1 AND 9)`,
      );
    }
    for (const b of boundsList) {
      await queryRunner.query(
        `ALTER TABLE sourcing.applications ATTACH PARTITION sourcing.${b.partition_name} FOR VALUES FROM (${b.from_val}) TO (${b.to_val})`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Partitions first (restore 1-5)
    await queryRunner.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT child_ns.nspname AS schema_name, c.relname AS partition_name
          FROM pg_inherits i
          JOIN pg_class p ON p.oid = i.inhparent
          JOIN pg_namespace pn ON pn.oid = p.relnamespace
          JOIN pg_class c ON c.oid = i.inhrelid
          JOIN pg_namespace child_ns ON child_ns.oid = c.relnamespace
          WHERE p.relname = 'applications' AND pn.nspname = 'sourcing'
        LOOP
          EXECUTE format(
            'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS applications_call_status_check',
            r.schema_name,
            r.partition_name
          );
          EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT applications_call_status_check CHECK (call_status IS NULL OR call_status BETWEEN 1 AND 5)',
            r.schema_name,
            r.partition_name
          );
        END LOOP;
      END;
      $$
    `);
    // Parent
    await queryRunner.query(
      `ALTER TABLE sourcing.applications DROP CONSTRAINT IF EXISTS applications_call_status_check`,
    );
    await queryRunner.query(`
      ALTER TABLE sourcing.applications ADD CONSTRAINT applications_call_status_check
      CHECK (call_status IS NULL OR call_status BETWEEN 1 AND 5)
    `);
  }
}

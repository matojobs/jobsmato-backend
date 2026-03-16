import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * No-op migration. Call status 1-9 is applied by 0030 (which updates detached partitions before re-attach).
 * This migration was originally for fixing partitions when 0030 had run without that fix; 0030 now does the full fix.
 * Kept so migration history stays consistent; up/down do nothing.
 */
export class FixSourcingPartitionsCallStatusCheck1700000000031 implements MigrationInterface {
  name = 'FixSourcingPartitionsCallStatusCheck1700000000031';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op: 0030 already updates partition constraint before ATTACH.
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op.
  }
}

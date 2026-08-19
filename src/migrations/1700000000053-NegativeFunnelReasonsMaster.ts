import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin-managed reference list for "not interested" reasons, replacing
 * freeform not_interested_remark text with a fixed set recruiters pick
 * from. Mirrors the sourcing.cities master-data table.
 */
export class NegativeFunnelReasonsMaster1700000000053 implements MigrationInterface {
  name = 'NegativeFunnelReasonsMaster1700000000053';

  private readonly reasons = [
    'Currently Employed',
    'Recently Joined',
    'Accounts & Finance Profile',
    'Taxation / Audit Profile',
    'HR Executive Profile',
    'Digital Marketing Profile',
    'Field Sales Profile',
    'Not Interested in Sales',
    'Not Interested in Telesales',
    'Not Interested in CST / Customer Support',
    'Work From Home Required',
    'Location Constraint',
    'Location Too Far',
    'English Communication Issue',
    'Technical Background',
    'Pursuing Graduation',
    'Other Industry',
    'Self-Employed / Own Business',
    'Temporarily Unavailable',
    'Call Disconnected',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS sourcing`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sourcing.negative_funnel_reasons (
        id SERIAL PRIMARY KEY,
        reason VARCHAR(200) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_sourcing_negative_funnel_reasons_reason
      ON sourcing.negative_funnel_reasons (LOWER(reason))
    `);

    for (const reason of this.reasons) {
      await queryRunner.query(
        `INSERT INTO sourcing.negative_funnel_reasons (reason) VALUES ($1) ON CONFLICT DO NOTHING`,
        [reason],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sourcing.negative_funnel_reasons`);
  }
}

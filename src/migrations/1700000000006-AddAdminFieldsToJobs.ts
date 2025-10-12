import { MigrationInterface, QueryRunner, TableColumn, Index } from 'typeorm';

export class AddAdminFieldsToJobs1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add admin management fields to jobs table
    await queryRunner.addColumn('jobs', new TableColumn({
      name: 'admin_notes',
      type: 'text',
      isNullable: true,
    }));

    await queryRunner.addColumn('jobs', new TableColumn({
      name: 'admin_status',
      type: 'varchar',
      length: '20',
      default: "'approved'",
    }));

    await queryRunner.addColumn('jobs', new TableColumn({
      name: 'admin_reviewed_at',
      type: 'timestamp',
      isNullable: true,
    }));

    await queryRunner.addColumn('jobs', new TableColumn({
      name: 'admin_reviewed_by',
      type: 'int',
      isNullable: true,
    }));

    // Add foreign key constraint for admin_reviewed_by
    await queryRunner.query(`
      ALTER TABLE jobs 
      ADD CONSTRAINT fk_jobs_admin_reviewed_by 
      FOREIGN KEY (admin_reviewed_by) 
      REFERENCES users(id) 
      ON DELETE SET NULL
    `);

    // Add performance indexes
    await queryRunner.query('CREATE INDEX idx_jobs_admin_status ON jobs(admin_status)');
    await queryRunner.query('CREATE INDEX idx_jobs_admin_reviewed_by ON jobs(admin_reviewed_by)');
    await queryRunner.query('CREATE INDEX idx_jobs_created_at_status ON jobs(created_at, status)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('jobs', 'idx_jobs_created_at_status');
    await queryRunner.dropIndex('jobs', 'idx_jobs_admin_reviewed_by');
    await queryRunner.dropIndex('jobs', 'idx_jobs_admin_status');
    
    // Drop foreign key constraint
    await queryRunner.query('ALTER TABLE jobs DROP CONSTRAINT fk_jobs_admin_reviewed_by');
    
    // Drop columns
    await queryRunner.dropColumn('jobs', 'admin_reviewed_by');
    await queryRunner.dropColumn('jobs', 'admin_reviewed_at');
    await queryRunner.dropColumn('jobs', 'admin_status');
    await queryRunner.dropColumn('jobs', 'admin_notes');
  }
}

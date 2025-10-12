import { MigrationInterface, QueryRunner, TableColumn, Index } from 'typeorm';

export class AddAdminFieldsToCompanies1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add admin management fields to companies table
    await queryRunner.addColumn('companies', new TableColumn({
      name: 'admin_notes',
      type: 'text',
      isNullable: true,
    }));

    await queryRunner.addColumn('companies', new TableColumn({
      name: 'admin_status',
      type: 'varchar',
      length: '20',
      default: "'pending'",
    }));

    await queryRunner.addColumn('companies', new TableColumn({
      name: 'admin_reviewed_at',
      type: 'timestamp',
      isNullable: true,
    }));

    await queryRunner.addColumn('companies', new TableColumn({
      name: 'admin_reviewed_by',
      type: 'int',
      isNullable: true,
    }));

    await queryRunner.addColumn('companies', new TableColumn({
      name: 'admin_verified',
      type: 'boolean',
      default: false,
    }));

    // Add foreign key constraint for admin_reviewed_by
    await queryRunner.query(`
      ALTER TABLE companies 
      ADD CONSTRAINT fk_companies_admin_reviewed_by 
      FOREIGN KEY (admin_reviewed_by) 
      REFERENCES users(id) 
      ON DELETE SET NULL
    `);

    // Add performance indexes
    await queryRunner.query('CREATE INDEX idx_companies_admin_status ON companies(admin_status)');
    await queryRunner.query('CREATE INDEX idx_companies_admin_verified ON companies(admin_verified)');
    await queryRunner.query('CREATE INDEX idx_companies_created_at_status ON companies(created_at, admin_status)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('companies', 'idx_companies_created_at_status');
    await queryRunner.dropIndex('companies', 'idx_companies_admin_verified');
    await queryRunner.dropIndex('companies', 'idx_companies_admin_status');
    
    // Drop foreign key constraint
    await queryRunner.query('ALTER TABLE companies DROP CONSTRAINT fk_companies_admin_reviewed_by');
    
    // Drop columns
    await queryRunner.dropColumn('companies', 'admin_verified');
    await queryRunner.dropColumn('companies', 'admin_reviewed_by');
    await queryRunner.dropColumn('companies', 'admin_reviewed_at');
    await queryRunner.dropColumn('companies', 'admin_status');
    await queryRunner.dropColumn('companies', 'admin_notes');
  }
}

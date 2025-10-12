import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateAdminTables1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin_actions_log table
    await queryRunner.createTable(new Table({
      name: 'admin_actions_log',
      columns: [
        {
          name: 'id',
          type: 'serial',
          isPrimary: true,
        },
        {
          name: 'admin_id',
          type: 'int',
        },
        {
          name: 'action_type',
          type: 'varchar',
          length: '50',
        },
        {
          name: 'target_type',
          type: 'varchar',
          length: '50',
        },
        {
          name: 'target_id',
          type: 'int',
          isNullable: true,
        },
        {
          name: 'description',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'metadata',
          type: 'jsonb',
          isNullable: true,
        },
        {
          name: 'ip_address',
          type: 'inet',
          isNullable: true,
        },
        {
          name: 'user_agent',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        },
      ],
    }), true);

    // Add foreign key constraint for admin_actions_log
    await queryRunner.query(`
      ALTER TABLE admin_actions_log 
      ADD CONSTRAINT fk_admin_actions_admin_id 
      FOREIGN KEY (admin_id) 
      REFERENCES users(id) 
      ON DELETE CASCADE
    `);

    // Create indexes for admin_actions_log
    await queryRunner.query('CREATE INDEX idx_admin_actions_admin_id ON admin_actions_log(admin_id)');
    await queryRunner.query('CREATE INDEX idx_admin_actions_type ON admin_actions_log(action_type)');
    await queryRunner.query('CREATE INDEX idx_admin_actions_created_at ON admin_actions_log(created_at)');
    await queryRunner.query('CREATE INDEX idx_admin_actions_target ON admin_actions_log(target_type, target_id)');

    // Create bulk_uploads table
    await queryRunner.createTable(new Table({
      name: 'bulk_uploads',
      columns: [
        {
          name: 'id',
          type: 'serial',
          isPrimary: true,
        },
        {
          name: 'admin_id',
          type: 'int',
        },
        {
          name: 'filename',
          type: 'varchar',
          length: '255',
        },
        {
          name: 'file_size',
          type: 'int',
          isNullable: true,
        },
        {
          name: 'total_records',
          type: 'int',
          isNullable: true,
        },
        {
          name: 'successful_records',
          type: 'int',
          isNullable: true,
        },
        {
          name: 'failed_records',
          type: 'int',
          isNullable: true,
        },
        {
          name: 'status',
          type: 'varchar',
          length: '20',
          default: "'processing'",
        },
        {
          name: 'error_log',
          type: 'jsonb',
          isNullable: true,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        },
        {
          name: 'completed_at',
          type: 'timestamp',
          isNullable: true,
        },
      ],
    }), true);

    // Add foreign key constraint for bulk_uploads
    await queryRunner.query(`
      ALTER TABLE bulk_uploads 
      ADD CONSTRAINT fk_bulk_uploads_admin_id 
      FOREIGN KEY (admin_id) 
      REFERENCES users(id) 
      ON DELETE CASCADE
    `);

    // Create indexes for bulk_uploads
    await queryRunner.query('CREATE INDEX idx_bulk_uploads_admin_id ON bulk_uploads(admin_id)');
    await queryRunner.query('CREATE INDEX idx_bulk_uploads_status ON bulk_uploads(status)');
    await queryRunner.query('CREATE INDEX idx_bulk_uploads_created_at ON bulk_uploads(created_at)');

    // Create system_settings table
    await queryRunner.createTable(new Table({
      name: 'system_settings',
      columns: [
        {
          name: 'id',
          type: 'serial',
          isPrimary: true,
        },
        {
          name: 'setting_key',
          type: 'varchar',
          length: '100',
          isUnique: true,
        },
        {
          name: 'setting_value',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'setting_type',
          type: 'varchar',
          length: '20',
          default: "'string'",
        },
        {
          name: 'description',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'is_public',
          type: 'boolean',
          default: false,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        },
      ],
    }), true);

    // Create indexes for system_settings
    await queryRunner.query('CREATE INDEX idx_system_settings_key ON system_settings(setting_key)');
    await queryRunner.query('CREATE INDEX idx_system_settings_public ON system_settings(is_public)');

    // Insert default system settings
    await queryRunner.query(`
      INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
      ('site_name', 'Jobsmato', 'string', 'Website name', true),
      ('site_description', 'Find your dream job', 'string', 'Website description', true),
      ('max_job_applications_per_user', '50', 'number', 'Maximum job applications per user', false),
      ('job_auto_approve', 'false', 'boolean', 'Auto approve new job postings', false),
      ('company_auto_verify', 'false', 'boolean', 'Auto verify new company registrations', false),
      ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', false)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('system_settings');
    await queryRunner.dropTable('bulk_uploads');
    await queryRunner.dropTable('admin_actions_log');
  }
}

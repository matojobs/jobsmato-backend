import { MigrationInterface, QueryRunner, TableColumn, Index } from 'typeorm';

export class AddAdminFieldsToUsers1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add admin-specific fields to users table
    await queryRunner.addColumn('users', new TableColumn({
      name: 'last_login_at',
      type: 'timestamp',
      isNullable: true,
    }));

    await queryRunner.addColumn('users', new TableColumn({
      name: 'login_count',
      type: 'int',
      default: 0,
    }));

    await queryRunner.addColumn('users', new TableColumn({
      name: 'is_active',
      type: 'boolean',
      default: true,
    }));

    await queryRunner.addColumn('users', new TableColumn({
      name: 'is_verified',
      type: 'boolean',
      default: false,
    }));

    await queryRunner.addColumn('users', new TableColumn({
      name: 'verification_token',
      type: 'varchar',
      length: '255',
      isNullable: true,
    }));

    await queryRunner.addColumn('users', new TableColumn({
      name: 'verification_expires_at',
      type: 'timestamp',
      isNullable: true,
    }));

    // Add performance indexes
    await queryRunner.query('CREATE INDEX idx_users_role ON users(role)');
    await queryRunner.query('CREATE INDEX idx_users_is_active ON users(is_active)');
    await queryRunner.query('CREATE INDEX idx_users_created_at ON users(created_at)');
    await queryRunner.query('CREATE INDEX idx_users_role_created_at ON users(role, created_at)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('users', 'idx_users_role_created_at');
    await queryRunner.dropIndex('users', 'idx_users_created_at');
    await queryRunner.dropIndex('users', 'idx_users_is_active');
    await queryRunner.dropIndex('users', 'idx_users_role');
    
    // Drop columns
    await queryRunner.dropColumn('users', 'verification_expires_at');
    await queryRunner.dropColumn('users', 'verification_token');
    await queryRunner.dropColumn('users', 'is_verified');
    await queryRunner.dropColumn('users', 'is_active');
    await queryRunner.dropColumn('users', 'login_count');
    await queryRunner.dropColumn('users', 'last_login_at');
  }
}

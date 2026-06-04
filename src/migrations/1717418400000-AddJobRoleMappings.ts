import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddJobRoleMappings1717418400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'job_role_mappings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'jobTitle',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'trainingRoles',
            type: 'text[]',
            default: `'{}'::text[]`,
            isNullable: false,
          },
          {
            name: 'matchStrategy',
            type: 'varchar',
            default: `'keyword'`,
            isNullable: false,
          },
          {
            name: 'candidateCount',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'createdBy',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'job_role_mappings',
      new TableForeignKey({
        columnNames: ['createdBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('job_role_mappings');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        fk => fk.columnNames.indexOf('createdBy') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('job_role_mappings', foreignKey);
      }
      await queryRunner.dropTable('job_role_mappings');
    }
  }
}

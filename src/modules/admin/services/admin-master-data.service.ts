import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface MasterDataQuery {
  search?: string;
  companyId?: number;
  isActive?: boolean;
}

export interface CreateAdminJobRoleDto {
  companyId: number;
  roleName: string;
  department?: string;
}

export interface UpdateAdminJobRoleDto {
  companyId?: number;
  roleName?: string;
  department?: string | null;
  isActive?: boolean;
}

export interface CreateCityDto {
  name: string;
  state?: string;
}

export interface UpdateCityDto {
  name?: string;
  state?: string | null;
  isActive?: boolean;
}

@Injectable()
export class AdminMasterDataService {
  constructor(private readonly dataSource: DataSource) {}

  private cleanText(value: string | undefined | null): string {
    return (value || '').trim().replace(/\s+/g, ' ');
  }

  private async ensureCitiesTable() {
    await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS sourcing`);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS sourcing.cities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        state VARCHAR(120),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_sourcing_cities_name_state
      ON sourcing.cities (LOWER(name), LOWER(COALESCE(state, '')))
    `);
  }

  async getJobRoles(query: MasterDataQuery = {}) {
    const params: any[] = [];
    const where: string[] = [];

    if (query.search) {
      params.push(`%${query.search.trim()}%`);
      where.push(`(jr.role_name ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
    }
    if (query.companyId) {
      params.push(query.companyId);
      where.push(`jr.company_id = $${params.length}`);
    }
    if (query.isActive !== undefined) {
      params.push(query.isActive);
      where.push(`jr.is_active = $${params.length}`);
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        jr.id,
        jr.company_id AS "companyId",
        c.name AS "companyName",
        jr.role_name AS "roleName",
        jr.department,
        jr.is_active AS "isActive",
        jr.created_at AS "createdAt",
        jr.updated_at AS "updatedAt"
      FROM sourcing.job_roles jr
      JOIN companies c ON c.id = jr.company_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY c.name ASC, jr.role_name ASC
      LIMIT 500
      `,
      params,
    );

    return { jobRoles: rows };
  }

  async createJobRole(dto: CreateAdminJobRoleDto) {
    const roleName = this.cleanText(dto.roleName);
    const department = this.cleanText(dto.department) || null;

    if (!dto.companyId || !roleName) {
      throw new BadRequestException('Company and job role name are required');
    }

    const company = await this.dataSource.query(`SELECT id FROM companies WHERE id = $1`, [dto.companyId]);
    if (!company.length) throw new NotFoundException('Company not found');

    const existing = await this.dataSource.query(
      `SELECT id FROM sourcing.job_roles WHERE company_id = $1 AND LOWER(role_name) = LOWER($2)`,
      [dto.companyId, roleName],
    );
    if (existing.length) {
      throw new BadRequestException('This job role already exists for the selected company');
    }

    const [row] = await this.dataSource.query(
      `
      INSERT INTO sourcing.job_roles (company_id, role_name, department, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, company_id AS "companyId", role_name AS "roleName", department, is_active AS "isActive"
      `,
      [dto.companyId, roleName, department],
    );

    return { success: true, jobRole: row };
  }

  async updateJobRole(id: number, dto: UpdateAdminJobRoleDto) {
    const currentRows = await this.dataSource.query(`SELECT * FROM sourcing.job_roles WHERE id = $1`, [id]);
    if (!currentRows.length) throw new NotFoundException('Job role not found');

    const current = currentRows[0];
    const companyId = dto.companyId ?? current.company_id;
    const roleName = dto.roleName !== undefined ? this.cleanText(dto.roleName) : current.role_name;
    const department =
      dto.department !== undefined ? this.cleanText(dto.department) || null : current.department;
    const isActive = dto.isActive !== undefined ? dto.isActive : current.is_active;

    if (!companyId || !roleName) {
      throw new BadRequestException('Company and job role name are required');
    }

    const company = await this.dataSource.query(`SELECT id FROM companies WHERE id = $1`, [companyId]);
    if (!company.length) throw new NotFoundException('Company not found');

    const duplicate = await this.dataSource.query(
      `SELECT id FROM sourcing.job_roles WHERE company_id = $1 AND LOWER(role_name) = LOWER($2) AND id <> $3`,
      [companyId, roleName, id],
    );
    if (duplicate.length) {
      throw new BadRequestException('This job role already exists for the selected company');
    }

    const [row] = await this.dataSource.query(
      `
      UPDATE sourcing.job_roles
      SET company_id = $1, role_name = $2, department = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, company_id AS "companyId", role_name AS "roleName", department, is_active AS "isActive"
      `,
      [companyId, roleName, department, isActive, id],
    );

    return { success: true, jobRole: row };
  }

  async getCities(query: MasterDataQuery = {}) {
    await this.ensureCitiesTable();

    const params: any[] = [];
    const where: string[] = [];

    if (query.search) {
      params.push(`%${query.search.trim()}%`);
      where.push(`(name ILIKE $${params.length} OR state ILIKE $${params.length})`);
    }
    if (query.isActive !== undefined) {
      params.push(query.isActive);
      where.push(`is_active = $${params.length}`);
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        id,
        name,
        state,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM sourcing.cities
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY name ASC, state ASC
      LIMIT 1000
      `,
      params,
    );

    return { cities: rows };
  }

  async createCity(dto: CreateCityDto) {
    await this.ensureCitiesTable();

    const name = this.cleanText(dto.name);
    const state = this.cleanText(dto.state) || null;
    if (!name) throw new BadRequestException('City name is required');

    const duplicate = await this.dataSource.query(
      `SELECT id FROM sourcing.cities WHERE LOWER(name) = LOWER($1) AND LOWER(COALESCE(state, '')) = LOWER(COALESCE($2, ''))`,
      [name, state],
    );
    if (duplicate.length) throw new BadRequestException('This city already exists');

    const [row] = await this.dataSource.query(
      `
      INSERT INTO sourcing.cities (name, state, is_active, created_at, updated_at)
      VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, name, state, is_active AS "isActive"
      `,
      [name, state],
    );

    return { success: true, city: row };
  }

  async updateCity(id: number, dto: UpdateCityDto) {
    await this.ensureCitiesTable();

    const currentRows = await this.dataSource.query(`SELECT * FROM sourcing.cities WHERE id = $1`, [id]);
    if (!currentRows.length) throw new NotFoundException('City not found');

    const current = currentRows[0];
    const name = dto.name !== undefined ? this.cleanText(dto.name) : current.name;
    const state = dto.state !== undefined ? this.cleanText(dto.state) || null : current.state;
    const isActive = dto.isActive !== undefined ? dto.isActive : current.is_active;

    if (!name) throw new BadRequestException('City name is required');

    const duplicate = await this.dataSource.query(
      `SELECT id FROM sourcing.cities WHERE LOWER(name) = LOWER($1) AND LOWER(COALESCE(state, '')) = LOWER(COALESCE($2, '')) AND id <> $3`,
      [name, state, id],
    );
    if (duplicate.length) throw new BadRequestException('This city already exists');

    const [row] = await this.dataSource.query(
      `
      UPDATE sourcing.cities
      SET name = $1, state = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, name, state, is_active AS "isActive"
      `,
      [name, state, isActive, id],
    );

    return { success: true, city: row };
  }
}

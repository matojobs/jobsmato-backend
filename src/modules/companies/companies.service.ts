import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../entities/company.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto, userId: number): Promise<Company> {
    // Generate slug from name
    const slug = createCompanyDto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const company = this.companyRepository.create({
      ...createCompanyDto,
      slug,
      userId,
    });

    return await this.companyRepository.save(company);
  }

  async findAll(): Promise<Company[]> {
    return await this.companyRepository.find({
      relations: ['user', 'jobs'],
    });
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['user', 'jobs'],
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto, userId: number): Promise<Company> {
    const company = await this.findOne(id);

    // Check if user owns the company or is admin
    if (company.userId !== userId) {
      throw new ForbiddenException('You can only update your own company');
    }

    Object.assign(company, updateCompanyDto);
    return await this.companyRepository.save(company);
  }

  async remove(id: number, userId: number): Promise<void> {
    const company = await this.findOne(id);

    // Check if user owns the company or is admin
    if (company.userId !== userId) {
      throw new ForbiddenException('You can only delete your own company');
    }

    await this.companyRepository.remove(company);
  }
}

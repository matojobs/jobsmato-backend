import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { CompanyMemberRole } from '../../../entities/company-member.entity';

export class AddCompanyMemberDto {
  @ApiPropertyOptional({ description: 'User ID to add (use when inviting by ID)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({ description: 'Email to invite (user must already exist)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Role in the company', enum: CompanyMemberRole })
  @IsEnum(CompanyMemberRole)
  role: CompanyMemberRole;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Company } from './company.entity';
import { User } from './user.entity';

export enum CompanyMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('company_members')
@Unique(['companyId', 'userId'])
export class CompanyMember {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column()
  companyId: number;

  @ApiProperty({ example: 1 })
  @Column()
  userId: number;

  @ApiProperty({ example: CompanyMemberRole.MEMBER, enum: CompanyMemberRole })
  @Column({
    type: 'enum',
    enum: CompanyMemberRole,
    default: CompanyMemberRole.MEMBER,
  })
  role: CompanyMemberRole;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('Company', 'companyMembers')
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne('User', 'companyMembers')
  @JoinColumn({ name: 'userId' })
  user: User;
}

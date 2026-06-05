import { IsOptional, IsString, IsInt, IsIn, Matches } from 'class-validator';
import { Type } from 'class-transformer';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class FunnelQueryDto {
  @IsString()
  @Matches(DATE_RE, { message: 'from must be YYYY-MM-DD' })
  from!: string;

  @IsString()
  @Matches(DATE_RE, { message: 'to must be YYYY-MM-DD' })
  to!: string;

  @IsOptional()
  @IsIn(['none', 'day', 'month'])
  granularity?: 'none' | 'day' | 'month';

  // Admin-only filters (ignored on the recruiter-scoped endpoint)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  recruiter_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  company_id?: number;

  @IsOptional()
  @IsString()
  portal?: string;
}

export class ScorecardQueryDto {
  @IsString()
  @Matches(DATE_RE, { message: 'from must be YYYY-MM-DD' })
  from!: string;

  @IsString()
  @Matches(DATE_RE, { message: 'to must be YYYY-MM-DD' })
  to!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  company_id?: number;

  @IsOptional()
  @IsString()
  portal?: string;
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternshipEnrollment } from '../../entities/internship-enrollment.entity';
import { Batch } from '../../entities/batch.entity';
import { InternshipsController } from './internships.controller';
import { InternshipsService } from './internships.service';

@Module({
  imports: [TypeOrmModule.forFeature([InternshipEnrollment, Batch])],
  controllers: [InternshipsController],
  providers: [InternshipsService],
  exports: [InternshipsService],
})
export class InternshipsModule {}

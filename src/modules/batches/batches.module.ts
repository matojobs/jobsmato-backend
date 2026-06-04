import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Batch } from '../../entities/batch.entity';
import { InternshipEnrollment } from '../../entities/internship-enrollment.entity';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';

@Module({
  imports: [TypeOrmModule.forFeature([Batch, InternshipEnrollment])],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}

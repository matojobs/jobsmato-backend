import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternActivityLog } from '../../entities/intern-activity-log.entity';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [TypeOrmModule.forFeature([InternActivityLog])],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}

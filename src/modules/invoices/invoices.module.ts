import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { AgingScheduler } from './aging.scheduler';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, AgingScheduler],
  exports: [InvoicesService],
})
export class InvoicesModule {}

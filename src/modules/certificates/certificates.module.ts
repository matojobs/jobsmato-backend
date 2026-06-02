import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from '../../entities/certificate.entity';
import { InternshipEnrollment } from '../../entities/internship-enrollment.entity';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate, InternshipEnrollment])],
  controllers: [CertificatesController],
  providers: [CertificatesService],
})
export class CertificatesModule {}

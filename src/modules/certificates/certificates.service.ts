import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate, CertificateType } from '../../entities/certificate.entity';
import { InternshipEnrollment } from '../../entities/internship-enrollment.entity';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private certRepo: Repository<Certificate>,
    @InjectRepository(InternshipEnrollment)
    private enrollmentRepo: Repository<InternshipEnrollment>,
  ) {}

  private generateCertNumber(): string {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `JM-${year}-${rand}`;
  }

  getMy(userId: number) {
    return this.certRepo.find({
      where: { userId },
      relations: ['enrollment', 'enrollment.batch'],
      order: { createdAt: 'DESC' },
    });
  }

  async verify(certNumber: string) {
    const cert = await this.certRepo.findOne({
      where: { certNumber },
      relations: ['user', 'enrollment', 'enrollment.batch'],
    });
    if (!cert) throw new NotFoundException('Certificate not found');

    const domainLabels: Record<string, string> = {
      hr: 'Human Resources',
      sales: 'Sales',
      tech: 'Technology',
      digital_marketing: 'Digital Marketing',
    };

    return {
      isValid: true,
      isRevoked: false,
      certificateNumber: cert.certNumber,
      certType: cert.certType,
      issuedAt: cert.issuedDate,
      performanceScore: cert.finalScore,
      grade: cert.finalGrade,
      pdfUrl: cert.pdfUrl,
      intern: cert.user
        ? { firstName: cert.user.firstName, lastName: cert.user.lastName, email: cert.user.email }
        : null,
      domainLabel: cert.enrollment?.domain ? domainLabels[cert.enrollment.domain] : null,
      batchStart: cert.enrollment?.batch?.startDate ?? null,
      batchEnd: cert.enrollment?.batch?.endDate ?? null,
      durationDays: cert.enrollment?.batch?.startDate && cert.enrollment?.batch?.endDate
        ? Math.round((new Date(cert.enrollment.batch.endDate).getTime() - new Date(cert.enrollment.batch.startDate).getTime()) / 86400000)
        : null,
    };
  }

  async generate(enrollmentId: string, certType: string) {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId },
      relations: ['user'],
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const cert = this.certRepo.create({
      userId: enrollment.userId,
      enrollmentId,
      certType: certType as CertificateType,
      certNumber: this.generateCertNumber(),
      issuedDate: new Date().toISOString().split('T')[0],
      finalScore: enrollment.finalScore,
      finalGrade: enrollment.finalGrade,
    });
    return this.certRepo.save(cert);
  }

  listAdmin(page = 1) {
    const take = 20;
    return this.certRepo.findAndCount({
      relations: ['user', 'enrollment', 'enrollment.batch'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
  }
}

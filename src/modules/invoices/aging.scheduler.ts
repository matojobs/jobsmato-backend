import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { EmailService } from '../email/email.service';
import { InvoicesService } from './invoices.service';

/**
 * Aging scheduler — runs daily at 9am.
 * Checks candidates with pipeline_stage = 'joined' and:
 *  - 45 days after joining_date → advance to 'aging_45', notify recruiter
 *  - 60 days after joining_date → advance to 'aging_60', notify recruiter
 *  - 90 days after joining_date → advance to 'aging_90', notify recruiter + mark billing_eligible pending
 */
@Injectable()
export class AgingScheduler {
  private readonly logger = new Logger(AgingScheduler.name);

  constructor(
    private dataSource: DataSource,
    private emailService: EmailService,
    private invoicesService: InvoicesService,
  ) {}

  @Cron('0 9 * * *') // every day at 9:00am
  async runAgingCheck() {
    this.logger.log('Running daily aging check…');
    try {
      await Promise.all([
        this.checkMilestone(45, 'aging_45', 'aging_45_at', 'aging_notified_45'),
        this.checkMilestone(60, 'aging_60', 'aging_60_at', 'aging_notified_60'),
        this.checkMilestone(90, 'aging_90', 'aging_90_at', 'aging_notified_90'),
        this.checkLockingPeriodCompletion(),
      ]);
      // Re-evaluate criteria eligibility after aging updates
      const result = await this.invoicesService.evaluateAllEligibility();
      this.logger.log(`Criteria evaluation: ${result.evaluated} candidates checked, ${result.advanced} advanced to billing_eligible`);
    } catch (err) {
      this.logger.error('Aging check failed', err);
    }
  }

  /**
   * Check if locking period has ended for joined candidates.
   * If candidate_active_status = 'active' → advance to billing_eligible.
   * If 'unknown' → send reminder to recruiter to update status.
   * If 'left' → already handled by dropout flow.
   */
  private async checkLockingPeriodCompletion() {
    const rows = await this.dataSource.query(`
      SELECT
        a.id, a.locking_end_date, a.candidate_active_status,
        c.name  AS candidate_name,
        jr.company_name, jr.title AS position,
        r.email AS recruiter_email,
        r.name  AS recruiter_name
      FROM sourcing.applications a
      JOIN sourcing.candidates   c  ON c.id  = a.candidate_id
      JOIN sourcing.job_roles    jr ON jr.id = a.job_role_id
      LEFT JOIN sourcing.recruiters r ON r.id = a.recruiter_id
      WHERE a.pipeline_stage IN ('joined','aging_45','aging_60','aging_90')
        AND a.locking_end_date IS NOT NULL
        AND a.locking_end_date <= CURRENT_DATE
        AND a.candidate_active_status != 'left'
    `);

    for (const row of rows) {
      if (row.candidate_active_status === 'active') {
        // Auto-advance to billing_eligible
        await this.dataSource.query(
          `UPDATE sourcing.applications
           SET pipeline_stage = 'billing_eligible', updated_at = NOW()
           WHERE id = $1`,
          [row.id],
        );
        this.logger.log(`Auto-advanced app ${row.id} to billing_eligible`);
      } else if (row.candidate_active_status === 'unknown') {
        // Send reminder to recruiter to confirm active status
        if (row.recruiter_email) {
          await this.emailService.sendMail({
            to: row.recruiter_email,
            subject: `⚠️ Action Required: Confirm ${row.candidate_name}'s Employment Status`,
            html: `
              <div style="font-family:sans-serif;max-width:600px">
                <h2 style="color:#f59e0b">Locking Period Completed — Status Confirmation Required</h2>
                <p>Hi ${row.recruiter_name || 'Recruiter'},</p>
                <p>
                  The locking period for <strong>${row.candidate_name}</strong> at
                  <strong>${row.company_name}</strong> (${row.position}) has completed.
                </p>
                <p>
                  <strong>Please confirm whether the candidate is still actively working.</strong>
                  This is required to mark the candidate as <em>Billing Eligible</em>.
                </p>
                <p>Log in to HRMS and update the candidate's active status.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3100'}"
                   style="display:inline-block;background:#f59e0b;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">
                  Update Status in HRMS →
                </a>
              </div>
            `,
          }).catch(e => this.logger.warn(`Email failed: ${e.message}`));
        }
      }
    }
  }

  private async checkMilestone(
    days: number,
    newStage: string,
    atCol: string,
    notifiedCol: string,
  ) {
    const prevStages =
      days === 45 ? "('joined')" :
      days === 60 ? "('joined','aging_45')" :
      "('joined','aging_45','aging_60')";

    // Find all candidates who hit this milestone today and haven't been notified
    const rows = await this.dataSource.query(`
      SELECT
        a.id, a.joining_date, a.pipeline_stage,
        c.name  AS candidate_name,
        c.phone AS candidate_phone,
        jr.title AS position,
        jr.company_name,
        r.email AS recruiter_email,
        r.name  AS recruiter_name
      FROM sourcing.applications a
      JOIN sourcing.candidates   c  ON c.id  = a.candidate_id
      JOIN sourcing.job_roles    jr ON jr.id = a.job_role_id
      LEFT JOIN sourcing.recruiters r ON r.id = a.recruiter_id
      WHERE a.pipeline_stage IN ${prevStages}
        AND a.joining_date IS NOT NULL
        AND (CURRENT_DATE - a.joining_date::date) >= $1
        AND ${notifiedCol} = FALSE
    `, [days]);

    if (!rows.length) {
      this.logger.log(`Aging ${days}d: 0 candidates`);
      return;
    }

    this.logger.log(`Aging ${days}d: ${rows.length} candidates to process`);

    for (const row of rows) {
      try {
        // Advance pipeline stage
        await this.dataSource.query(`
          UPDATE sourcing.applications
          SET pipeline_stage = $1,
              ${atCol} = CURRENT_DATE,
              ${notifiedCol} = TRUE,
              updated_at = NOW()
          WHERE id = $2
        `, [newStage, row.id]);

        // Send email notification to recruiter
        if (row.recruiter_email) {
          await this.emailService.sendMail({
            to: row.recruiter_email,
            subject: `⏰ ${days}-Day Follow-up Required — ${row.candidate_name}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px">
                <h2 style="color:#3456F3">Action Required: ${days}-Day Aging Verification</h2>
                <p>Hi ${row.recruiter_name || 'Recruiter'},</p>
                <p>
                  <strong>${row.candidate_name}</strong> joined at <strong>${row.company_name}</strong>
                  (${row.position}) and has now completed <strong>${days} days</strong>.
                </p>
                <table style="border-collapse:collapse;width:100%;margin:16px 0">
                  <tr style="background:#f8f9ff">
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Candidate</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0">${row.candidate_name} · ${row.candidate_phone || '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Company</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0">${row.company_name}</td>
                  </tr>
                  <tr style="background:#f8f9ff">
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Position</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0">${row.position}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Joining Date</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0">${row.joining_date}</td>
                  </tr>
                  <tr style="background:#f8f9ff">
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Milestone</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0"><strong>${days} Days ✓</strong></td>
                  </tr>
                </table>
                <p>Please verify the candidate is still working and update the status in the HRMS.</p>
                ${days === 90 ? `<p style="color:#16a34a"><strong>🎯 This candidate is now eligible for billing. Please confirm with your Team Lead.</strong></p>` : ''}
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3100'}"
                   style="display:inline-block;background:#3456F3;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:8px">
                  Open HRMS →
                </a>
              </div>
            `,
          }).catch(e => this.logger.warn(`Email failed for ${row.recruiter_email}: ${e.message}`));
        }
      } catch (err) {
        this.logger.error(`Failed to process aging for application ${row.id}`, err);
      }
    }
  }
}

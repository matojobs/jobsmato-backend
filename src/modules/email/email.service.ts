import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export interface EmailTemplateData {
  [key: string]: any;
}

export enum EmailType {
  PASSWORD_RESET = 'password_reset',
  APPLICATION_SELECTED = 'application_selected',
  APPLICATION_REJECTED = 'application_rejected',
  // Add more email types here as needed
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP configuration incomplete. Email service will use console logging.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.logger.log('Email service initialized with SMTP configuration');
  }

  /**
   * Generic method to send emails using templates
   * This makes the email service scalable for future email types
   */
  async sendEmailByType(
    emailType: EmailType,
    recipientEmail: string,
    data: EmailTemplateData,
  ): Promise<void> {
    const template = this.getEmailTemplate(emailType, data);
    
    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM', 'noreply@jobsmato.com'),
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
    };

    await this.sendEmail(mailOptions);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://jobsmato.com');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.sendEmailByType(EmailType.PASSWORD_RESET, email, { resetUrl });
  }

  /**
   * Send application selected/accepted email to candidate
   */
  async sendApplicationSelectedEmail(
    candidateEmail: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
  ): Promise<void> {
    await this.sendEmailByType(EmailType.APPLICATION_SELECTED, candidateEmail, {
      candidateName,
      jobTitle,
      companyName,
    });
  }

  /**
   * Send application rejected email to candidate
   */
  async sendApplicationRejectedEmail(
    candidateEmail: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
  ): Promise<void> {
    await this.sendEmailByType(EmailType.APPLICATION_REJECTED, candidateEmail, {
      candidateName,
      jobTitle,
      companyName,
    });
  }

  private async sendEmail(mailOptions: any): Promise<void> {
    if (!this.transporter) {
      this.logger.log('Email service not configured. Logging email instead:');
      this.logger.log(`To: ${mailOptions.to}`);
      this.logger.log(`Subject: ${mailOptions.subject}`);
      this.logger.log(`Content: ${mailOptions.html}`);
      return;
    }

    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully. Message ID: ${result.messageId}`);
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Get email template based on type
   * This centralizes template logic and makes it easy to add new email types
   */
  private getEmailTemplate(emailType: EmailType, data: EmailTemplateData): { subject: string; html: string } {
    switch (emailType) {
      case EmailType.PASSWORD_RESET:
        return {
          subject: 'Reset Your Jobsmato Password',
          html: this.getPasswordResetEmailTemplate(data.resetUrl),
        };
      case EmailType.APPLICATION_SELECTED:
        return {
          subject: `Congratulations! You've been selected for ${data.jobTitle}`,
          html: this.getApplicationSelectedEmailTemplate(
            data.candidateName,
            data.jobTitle,
            data.companyName,
          ),
        };
      case EmailType.APPLICATION_REJECTED:
        return {
          subject: `Update on your application for ${data.jobTitle}`,
          html: this.getApplicationRejectedEmailTemplate(
            data.candidateName,
            data.jobTitle,
            data.companyName,
          ),
        };
      default:
        throw new Error(`Email template not found for type: ${emailType}`);
    }
  }

  private getPasswordResetEmailTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Jobsmato</h1>
            <h2>Password Reset Request</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your Jobsmato account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email.
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>© 2024 Jobsmato. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getApplicationSelectedEmailTemplate(
    candidateName: string,
    jobTitle: string,
    companyName: string,
  ): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://jobsmato.com');
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Selected</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          .success-box { background: #d1fae5; border: 2px solid #059669; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #059669; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations!</h1>
            <h2>Your Application Has Been Selected</h2>
          </div>
          <div class="content">
            <p>Hello ${candidateName},</p>
            
            <div class="success-box">
              <h3 style="margin-top: 0; color: #059669;">Great News!</h3>
              <p style="font-size: 18px; margin-bottom: 0;">We're excited to inform you that your application for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been selected!</p>
            </div>

            <div class="info-box">
              <p><strong>Job Position:</strong> ${jobTitle}</p>
              <p><strong>Company:</strong> ${companyName}</p>
            </div>

            <p>The hiring team at ${companyName} was impressed with your qualifications and experience. They will be in touch with you shortly to discuss the next steps in the hiring process.</p>

            <p style="text-align: center;">
              <a href="${frontendUrl}" class="button">View My Applications</a>
            </p>

            <p>What's Next?</p>
            <ul>
              <li>Keep an eye on your email for further communication from ${companyName}</li>
              <li>Prepare for potential interviews or next steps</li>
              <li>Continue exploring other opportunities on Jobsmato</li>
            </ul>

            <p>We wish you the best of luck in this exciting opportunity!</p>
            <p>Best regards,<br>The Jobsmato Team</p>
          </div>
          <div class="footer">
            <p>© 2024 Jobsmato. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getApplicationRejectedEmailTemplate(
    candidateName: string,
    jobTitle: string,
    companyName: string,
  ): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://jobsmato.com');
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #64748b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #64748b; }
          .encouragement { background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Update</h1>
          </div>
          <div class="content">
            <p>Hello ${candidateName},</p>
            
            <p>Thank you for your interest in the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>

            <div class="info-box">
              <p><strong>Job Position:</strong> ${jobTitle}</p>
              <p><strong>Company:</strong> ${companyName}</p>
              <p><strong>Status:</strong> Not Selected</p>
            </div>

            <p>After careful consideration, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current needs.</p>

            <div class="encouragement">
              <p style="margin-top: 0;"><strong>💪 Keep Going!</strong></p>
              <p style="margin-bottom: 0;">This decision doesn't reflect on your abilities or potential. We encourage you to continue applying to other opportunities that match your skills and interests.</p>
            </div>

            <p style="text-align: center;">
              <a href="${frontendUrl}" class="button">Explore More Jobs</a>
            </p>

            <p>We appreciate the time you took to apply and wish you the best in your job search journey.</p>

            <p>Best regards,<br>The Jobsmato Team</p>
          </div>
          <div class="footer">
            <p>© 2024 Jobsmato. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
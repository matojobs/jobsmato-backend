import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

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

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const htmlContent = this.getPasswordResetEmailTemplate(resetUrl);

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM', 'noreply@jobsmato.com'),
      to: email,
      subject: 'Reset Your Jobsmato Password',
      html: htmlContent,
    };

    await this.sendEmail(mailOptions);
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const htmlContent = this.getWelcomeEmailTemplate(firstName);

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM', 'noreply@jobsmato.com'),
      to: email,
      subject: 'Welcome to Jobsmato!',
      html: htmlContent,
    };

    await this.sendEmail(mailOptions);
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

  private getWelcomeEmailTemplate(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Jobsmato</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          .feature { margin: 15px 0; padding: 15px; background: white; border-radius: 6px; border-left: 4px solid #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Jobsmato!</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Welcome to Jobsmato! We're excited to have you join our community of job seekers and employers.</p>
            
            <h3>What you can do on Jobsmato:</h3>
            <div class="feature">
              <strong>🔍 Find Jobs:</strong> Browse thousands of job opportunities from top companies
            </div>
            <div class="feature">
              <strong>📝 Create Profile:</strong> Build a professional profile to stand out to employers
            </div>
            <div class="feature">
              <strong>💼 Apply Easily:</strong> Apply to jobs with just a few clicks
            </div>
            <div class="feature">
              <strong>🔔 Get Alerts:</strong> Set up job alerts to never miss opportunities
            </div>
            
            <p style="text-align: center;">
              <a href="${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}" class="button">Get Started</a>
            </p>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Happy job hunting!</p>
            <p>The Jobsmato Team</p>
          </div>
          <div class="footer">
            <p>© 2024 Jobsmato. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
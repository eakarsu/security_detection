import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    const subject = 'Verify your NodeGuard AI account';
    const html = `
      <h2>Welcome to NodeGuard AI Security Platform</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>Or copy this link: ${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
    `;
    await this.sendMail(email, subject, html);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/password-reset?token=${token}`;
    const subject = 'Reset your NodeGuard AI password';
    const html = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
    `;
    await this.sendMail(email, subject, html);
  }

  private async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@nodeguard.ai',
          to,
          subject,
          html,
        });
        this.logger.log(`Email sent to ${to}: ${subject}`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${to}`, error);
      }
    } else {
      this.logger.log(`[DEV] Email to ${to}`);
      this.logger.log(`[DEV] Subject: ${subject}`);
      this.logger.log(`[DEV] Body: ${html}`);
    }
  }
}

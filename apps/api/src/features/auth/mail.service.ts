import { Injectable } from '@nestjs/common';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {}

  async sendEmail(mailOptions: ISendMailOptions): Promise<void> {
    await this.mailerService.sendMail({
      from: `♻️ Turborepo ⚡ <${this.config.get('MAIL_USERNAME')}>`,
      ...mailOptions,
    });
  }

  async sendRegisterCode(email: string, code: string) {
    await this.sendEmail({
      to: [email],
      subject: 'Register Verification Code',
      html: `Your register verification code is: ${code}, valid for 10 minutes.`,
    });
  }

  async sendResetPasswordCode(email: string, code: string) {
    await this.sendEmail({
      to: [email],
      subject: 'Reset Password Verification Code',
      html: `Your reset password verification code is: ${code}, valid for 10 minutes.`,
    });
  }

  async sendHighMatchAlert(
    email: string,
    totalMatches: number,
    sampleMatches: Array<{ title: string; company: string; score: number }>,
  ) {
    const listHtml = sampleMatches
      .map((m) => `<li><strong>${m.title}</strong> at ${m.company} (Score: ${m.score})</li>`)
      .join('');
    await this.sendEmail({
      to: [email],
      subject: 'New High-Quality Job Matches Found!',
      html: `
        <p>Good news! Our latest scrape found <strong>${totalMatches}</strong> jobs matching your profile with a score over 85%.</p>
        <p>Here are some of the top matches:</p>
        <ul>${listHtml}</ul>
        <p>Log in to your JobSeeker dashboard to review them.</p>
      `,
    });
  }
}

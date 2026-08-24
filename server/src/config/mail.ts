import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let transporter: Transporter | null = null;
let configured = false;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export function mailConfigured(): boolean {
  return Boolean(env.SMTP_HOST);
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(input: MailInput): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(`[mail:smtp-off] → ${input.to} | ${input.subject}`);
    return;
  }
  configured = true;
  await t.sendMail({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}

export function mailerActive(): boolean {
  return configured;
}

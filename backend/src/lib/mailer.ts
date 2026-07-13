// Email delivery over SMTP.
//
// Email is entirely optional: if SMTP_* env vars aren't set, sendMail() logs and
// returns false instead of throwing. That keeps local dev and any deployment
// without mail credentials working normally — notifications still land in-app.
//
// To enable with Gmail: create an App Password (not your account password) at
// https://myaccount.google.com/apppasswords and set:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_USER=you@gmail.com
//   SMTP_PASS=<16-char app password>
//   SMTP_FROM="Finance Tracker <you@gmail.com>"

import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;
let initialized = false;

function getTransporter(): Transporter | null {
  if (initialized) return transporter;
  initialized = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log("📭 SMTP not configured — emails will be skipped (in-app notifications still work).");
    return null;
  }

  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 is implicit TLS; 587 upgrades via STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  console.log(`📮 SMTP configured (${SMTP_HOST}:${port})`);
  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
}

/** Sends an email. Returns false (without throwing) if SMTP isn't configured. */
export async function sendMail({ to, subject, html }: MailInput): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) return false;

  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    // A mail failure must never break the request that triggered it.
    console.error(`✉️  Failed to send email to ${to}:`, (err as Error).message);
    return false;
  }
}

/** Wraps body content in a simple, email-client-safe HTML shell. */
export function emailLayout(heading: string, bodyHtml: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f6f8;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e6e6ea">
      <h1 style="margin:0 0 16px;font-size:18px;color:#1a1a1e">${heading}</h1>
      <div style="font-size:14px;line-height:1.6;color:#3c3c43">${bodyHtml}</div>
      <p style="margin:24px 0 0;font-size:12px;color:#9494a0">Sent by your Personal Finance Tracker.</p>
    </div>
  </div>`;
}

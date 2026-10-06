import nodemailer from 'nodemailer'
import { config } from '../config'

/**
 * Outgoing email through SMTP.
 *
 * Works with a cloud mail service (host + port + user/password), with a corporate relay that needs no login (leave
 * SMTP_USER / SMTP_PASS empty) and with implicit TLS (port 465, or SMTP_SECURE=true). With no SMTP_HOST at all, sending
 * is refused with a clear message; callers already treat a mail failure as non-fatal (the invitation or reset exists
 * and can be re-sent).
 */
interface EmailSettings { host?: string; port: number; user?: string; pass?: string; secure?: boolean }

export function buildTransportOptions(e: EmailSettings) {
  const authenticated = !!(e.user && e.pass)
  return {
    host: e.host,
    port: e.port,
    // Implicit TLS on 465 unless told otherwise; on other ports the connection upgrades with STARTTLS when offered.
    secure: e.secure ?? e.port === 465,
    ...(authenticated ? { auth: { user: e.user, pass: e.pass } } : {}),
    // A hung mail server must not hold a request open for minutes.
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  }
}

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined
function getTransporter() {
  if (!config.email.host) throw new Error('Email is not configured on this server (SMTP_HOST is not set).')
  if (!transporter) transporter = nodemailer.createTransport(buildTransportOptions(config.email))
  return transporter
}

function from(): string {
  return `"${config.email.fromName}" <${config.email.fromEmail}>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export async function sendTeamInviteEmail(params: {
  toEmail: string
  toName: string
  orgName: string
  inviterName: string
  role: string
  inviteToken: string
}): Promise<void> {
  const inviteUrl = `${config.platform.tenantAppUrl}/invite/${params.inviteToken}`

  // Names and the organisation come from users: escaped, so a crafted name cannot put markup or links in the email.
  await getTransporter().sendMail({
    from: from(),
    to: params.toEmail,
    subject: `You've been invited to join ${params.orgName.replace(/[\r\n]+/g, ' ')} on DPDP CMS`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited</h2>
        <p>Hi ${escapeHtml(params.toName)},</p>
        <p><strong>${escapeHtml(params.inviterName)}</strong> has invited you to join
        <strong>${escapeHtml(params.orgName)}</strong> on DPDP CMS as
        <strong>${escapeHtml(params.role)}</strong>.</p>
        <a href="${inviteUrl}"
           style="display:inline-block;padding:12px 24px;
           background:#1e293b;color:#fff;text-decoration:none;
           border-radius:6px;font-weight:600;">
          Accept Invitation
        </a>
        <p style="color:#64748b;font-size:13px;margin-top:16px;">
          Link expires in 48 hours.
        </p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(params: {
  toEmail: string
  toName: string
  orgName: string
  resetToken: string
}): Promise<void> {
  const resetUrl = `${config.platform.tenantAppUrl}/reset-password/${params.resetToken}`
  const org = params.orgName ? ` for <strong>${escapeHtml(params.orgName)}</strong>` : ''

  await getTransporter().sendMail({
    from: from(),
    to: params.toEmail,
    subject: 'Reset your NiyamSaathi password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Hi ${escapeHtml(params.toName)},</p>
        <p>We received a request to reset the password of your account${org}.</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;
           background:#1e293b;color:#fff;text-decoration:none;
           border-radius:6px;font-weight:600;">
          Choose a new password
        </a>
        <p style="color:#64748b;font-size:13px;margin-top:16px;">
          This link works once and expires in 60 minutes. If you did not ask for this, you can ignore this email -
          your password has not been changed.
        </p>
      </div>
    `,
  })
}

import nodemailer from 'nodemailer'
import { config } from '../config'

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
})

export async function sendTeamInviteEmail(params: {
  toEmail: string
  toName: string
  orgName: string
  inviterName: string
  role: string
  inviteToken: string
}): Promise<void> {
  const inviteUrl = `${config.platform.tenantAppUrl}/invite/${params.inviteToken}`

  await transporter.sendMail({
    from: `"${config.email.fromName}" <${config.email.fromEmail}>`,
    to: params.toEmail,
    subject: `You've been invited to join ${params.orgName} on DPDP CMS`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited</h2>
        <p>Hi ${params.toName},</p>
        <p><strong>${params.inviterName}</strong> has invited you to join
        <strong>${params.orgName}</strong> on DPDP CMS as
        <strong>${params.role}</strong>.</p>
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
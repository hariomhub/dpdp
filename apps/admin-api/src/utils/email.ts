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

export async function sendOrgInvitationEmail(params: {
  toEmail: string
  toName: string
  orgName: string
  inviteToken: string
}): Promise<void> {
  const inviteUrl = `${config.platform.tenantAppUrl}/invite/${params.inviteToken}`

  await transporter.sendMail({
    from: `"${config.email.fromName}" <${config.email.fromEmail}>`,
    to: params.toEmail,
    subject: `You have been invited to set up ${params.orgName} on ${config.platform.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ${config.platform.name}</h2>
        <p>Hi ${params.toName},</p>
        <p>You have been invited to set up <strong>${params.orgName}</strong> 
        on ${config.platform.name}.</p>
        <p>Click the button below to create your account and begin 
        the organization setup:</p>
        <a href="${inviteUrl}" 
           style="display:inline-block;padding:12px 24px;
           background:#1e293b;color:#fff;text-decoration:none;
           border-radius:6px;font-weight:600;">
          Accept Invitation
        </a>
        <p style="margin-top:16px;color:#64748b;font-size:13px;">
          This link expires in ${config.platform.inviteTokenExpiryHours} hours.
          If you did not expect this invitation, please ignore this email.
        </p>
      </div>
    `,
  })
}
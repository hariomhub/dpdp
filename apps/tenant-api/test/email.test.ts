import { beforeEach, describe, expect, it, vi } from 'vitest'

// Capture what would be sent, instead of opening an SMTP connection.
const mail = vi.hoisted(() => ({ sendMail: vi.fn(async (_m: any) => undefined) }))
vi.mock('nodemailer', () => ({ default: { createTransport: () => mail } }))

import { sendPasswordResetEmail, sendTeamInviteEmail } from '../src/utils/email'

beforeEach(() => mail.sendMail.mockClear())

describe('sendPasswordResetEmail', () => {
  it('links to the reset page with the token, and says it is single-use and expires', async () => {
    await sendPasswordResetEmail({ toEmail: 'a@b.test', toName: 'Asha', orgName: 'Acme', resetToken: 'tok_123' })
    const sent = mail.sendMail.mock.calls[0][0]
    expect(sent.to).toBe('a@b.test')
    expect(sent.html).toMatch(/\/reset-password\/tok_123"/)
    expect(sent.html).toMatch(/works once/i)
    expect(sent.html).toMatch(/60 minutes/)
  })

  it('escapes HTML in the name and organisation so a crafted name cannot inject markup', async () => {
    await sendPasswordResetEmail({
      toEmail: 'a@b.test', toName: '<img src=x onerror=alert(1)>', orgName: '"><script>x</script>', resetToken: 't',
    })
    const html: string = mail.sendMail.mock.calls[0][0].html
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})


describe('sendTeamInviteEmail', () => {
  it('escapes the organisation, inviter, name and role (they are user-supplied) and keeps the subject on one line', async () => {
    await sendTeamInviteEmail({
      toEmail: 'a@b.test', toName: '<b>x</b>', orgName: 'Acme\r\nBcc: attacker@evil.test', inviterName: '"><script>1</script>', role: 'IT <i>Admin</i>', inviteToken: 'tok',
    })
    const sent = mail.sendMail.mock.calls[0][0]
    expect(sent.subject).not.toMatch(/[\r\n]/)
    expect(sent.html).not.toContain('<script>')
    expect(sent.html).not.toContain('<b>x</b>')
    expect(sent.html).not.toContain('<i>Admin</i>')
    expect(sent.html).toMatch(/\/invite\/tok"/)
  })
})

describe('when email is not configured', () => {
  it('refuses with a clear message instead of trying to reach a mail server', async () => {
    vi.resetModules()
    const saved = process.env.SMTP_HOST
    delete process.env.SMTP_HOST
    try {
      const mod = await import('../src/utils/email')
      await expect(mod.sendPasswordResetEmail({ toEmail: 'a@b.test', toName: 'A', orgName: '', resetToken: 't' })).rejects.toThrow(/SMTP_HOST is not set/)
      expect(mail.sendMail).not.toHaveBeenCalled()
    } finally {
      process.env.SMTP_HOST = saved
    }
  })
})

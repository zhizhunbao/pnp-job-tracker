// 发信(E5-03):Resend 一个 HTTP 调用,不引 SDK(Ponytail)。
// RESEND_API_KEY 未设 → dry-run(返回 false,调用方不回写游标,便于无密钥端到端演练)。
// 域名未定期间 from 用 onboarding@resend.dev(Resend 测试模式:只能发给账户本人邮箱)——正式域名后换 RESEND_FROM。

export const MAIL_ENABLED = !!process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM || 'PNP Job Tracker <onboarding@resend.dev>'

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!MAIL_ENABLED) return false
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    })
    if (!r.ok) console.error('[mailer] resend', r.status, (await r.text()).slice(0, 200))
    return r.ok
  } catch (e) {
    console.error('[mailer]', e instanceof Error ? e.message : e)
    return false
  }
}

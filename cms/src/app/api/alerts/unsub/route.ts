// 周报一键退订(E9-02b):CASL 要求退订免登录一键可达——邮件 footer 链接直达本端点。
// token = HMAC(PAYLOAD_SECRET, 'unsub:'+userId) 截 16 hex(lib/mailer.unsubToken 同源),无新密钥无新表。
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import crypto from 'crypto'
import { unsubToken } from '@/lib/mailer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const page = (body: string) =>
  new NextResponse(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;color:#1f2937;max-width:480px;margin:80px auto;text-align:center"><p style="font-size:28px">🍁</p>${body}</body>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u') || ''
  const t = req.nextUrl.searchParams.get('t') || ''
  const want = unsubToken(u)
  const ok = t.length === want.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(want))
  if (!u || !ok) return page('<p>链接无效。<br/>Invalid link.</p>')
  try {
    const payload = await getPayload({ config: await config })
    await payload.update({ collection: 'users', id: u, overrideAccess: true, data: { weeklyOptOut: true } })
    return page('<p><strong>已退订每周摘要。</strong><br/>You have been unsubscribed from the weekly digest.</p><p style="font-size:13px;color:#9ca3af">可在账户页随时重新开启 / Re-enable anytime on your account page.</p>')
  } catch {
    return page('<p>操作失败,请稍后再试。<br/>Something went wrong, please try again later.</p>')
  }
}

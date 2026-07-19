// E11-03 Google 登录 · 第 2 跳(回调):code 换 token → userinfo → 按已验证邮箱查找/创建用户 →
// 写会话条目 + 签 payload-token(与 Payload 3.85 login 同形:getFieldsToSign+sid+jwtSign,官方根导出)→ 302 回首页。
// 红线:只认 email_verified=true;已存在的邮箱账号按邮箱关联登录,**不动其密码**(不用改密来借道 login);
// 新用户 loginProvider=google + 随机密码(用户不持有,走 Google 或忘记密码自设)。任何失败 → /?login=1&oauth=fail。
import { getFieldsToSign, getPayload, jwtSign } from 'payload'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
const SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const secure = SITE.startsWith('https') ? '; Secure' : ''
const CLEAR_STATE = `g_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`

const fail = (why: string): Response => {
  console.error('[google-oauth] fail:', why)
  return new Response(null, { status: 302, headers: { Location: `${SITE}/?login=1&oauth=fail`, 'Set-Cookie': CLEAR_STATE } })
}

export async function GET(req: Request): Promise<Response> {
  if (!CLIENT_ID || !SECRET) return fail('env missing')
  const sp = new URL(req.url).searchParams
  const code = sp.get('code')
  if (sp.get('error') || !code) return fail('consent error: ' + (sp.get('error') || 'no code'))
  // state 防 CSRF:必须与第 1 跳种的 cookie 一致
  const cookieState = /(?:^|;\s*)g_oauth_state=([^;]+)/.exec(req.headers.get('cookie') || '')?.[1]
  if (!cookieState || sp.get('state') !== cookieState) return fail('state mismatch')

  // code → access_token
  const tokRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: CLIENT_ID, client_secret: SECRET,
      redirect_uri: `${SITE}/api/auth/google/callback`, grant_type: 'authorization_code',
    }),
  }).catch(() => null)
  const tok = tokRes && tokRes.ok ? await tokRes.json().catch(() => null) : null
  if (!tok?.access_token) return fail(`token exchange ${tokRes?.status}`)

  // userinfo(openid 标准端点):email 必须已验证
  const uiRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  }).catch(() => null)
  const ui = uiRes && uiRes.ok ? await uiRes.json().catch(() => null) : null
  const email = (ui?.email || '').toLowerCase()
  if (!email || ui.email_verified !== true) return fail('email missing/unverified')

  const payload = await getPayload({ config })
  // 查找(带隐藏字段拿 sessions)/ 创建
  const found = await payload.find({
    collection: 'users', where: { email: { equals: email } }, limit: 1,
    overrideAccess: true, showHiddenFields: true,
  })
  let user = found.docs[0] as any
  const backfill: Record<string, unknown> = {}
  if (!user) {
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('')
    user = await payload.create({
      collection: 'users', overrideAccess: true,
      data: {
        email, password: rand, loginProvider: 'google',
        ...(ui.name ? { displayName: String(ui.name).slice(0, 40) } : {}),
        ...(ui.picture ? { avatar: String(ui.picture) } : {}),
      },
    }) as any
  } else {
    // 关联登录:补空头像/昵称(不覆盖用户已设的),不动密码/来路
    if (!user.avatar && ui.picture) backfill.avatar = String(ui.picture)
    if (!user.displayName && ui.name) backfill.displayName = String(ui.name).slice(0, 40)
  }

  // 会话条目 + JWT(镜像 login op;useSessions 默认开,无 sid 的 token 会被 jwt 策略拒收)
  const collectionConfig = payload.collections.users.config
  const tokenExpiration = collectionConfig.auth.tokenExpiration || 7200
  const now = new Date()
  const sid = crypto.randomUUID()
  const keep = (user.sessions || []).filter((s: { expiresAt: string }) => new Date(s.expiresAt) > now)
  await payload.update({
    collection: 'users', id: user.id, overrideAccess: true,
    data: { ...backfill, sessions: [...keep, { id: sid, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + tokenExpiration * 1000).toISOString() }] },
  })
  const fieldsToSign = getFieldsToSign({ collectionConfig, email, sid, user: { ...user, collection: 'users' } })
  const { token } = await jwtSign({ fieldsToSign, secret: payload.secret, tokenExpiration })
  const cookiePrefix = (payload.config as { cookiePrefix?: string }).cookiePrefix || 'payload'
  return new Response(null, {
    status: 302,
    headers: [
      ['Location', `${SITE}/`],
      ['Set-Cookie', `${cookiePrefix}-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${tokenExpiration}${secure}`],
      ['Set-Cookie', CLEAR_STATE],
    ],
  })
}

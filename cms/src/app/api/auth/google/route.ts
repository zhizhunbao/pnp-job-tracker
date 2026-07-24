// E11-03 Google 登录 · 第 1 跳(#54 后端):302 到 Google 同意屏。
// env 未配 = 404(前端钮同门控不渲染,本路由只是兜底);state cookie 防 CSRF(回调核对)。
// redirect_uri 显式取 NEXT_PUBLIC_SITE_URL(老坑:上生产的回跳/绝对 URL 永远显式配,别信 origin 回退)。
export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

export async function GET(req: Request): Promise<Response> {
  if (!CLIENT_ID) return new Response('Google login not configured', { status: 404 })
  const state = crypto.randomUUID()
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('redirect_uri', `${SITE}/api/auth/google/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('prompt', 'select_account')
  const secure = SITE.startsWith('https') ? '; Secure' : ''
  // E9-04b(Frank 报障「登录后跳到首页,之前那个页面没了」):回跳目标随行——只收站内路径
  // (以 / 开头且非 //,防 open redirect),cookie 携带,回调核对后落地;不合法=忽略照旧回首页
  const rt = new URL(req.url).searchParams.get('returnTo') || ''
  const rtOk = /^\/(?!\/)[\x21-\x7e]{0,200}$/.test(rt)
  const headers: [string, string][] = [
    ['Location', url.toString()],
    ['Set-Cookie', `g_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`],
  ]
  if (rtOk) headers.push(['Set-Cookie', `g_oauth_return=${encodeURIComponent(rt)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`])
  return new Response(null, { status: 302, headers })
}

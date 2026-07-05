import { NextRequest, NextResponse } from 'next/server'

// 旧域 pnp-cms.onrender.com → 正式域 offer2pr.com 的 301(2026-07-05 域名切换,SEO 权重随 301 转移)。
// 排除(见 matcher):/api(Stripe webhook 端点在旧域,POST 不跟 301 会丢单)、/seed(auto_update 的 curl 同理)、
// /admin(过渡期保留旧域后台直达)、/_next(静态资源)。NEXT_PUBLIC_SITE_URL 未设时不启用(本地 dev 不受影响)。
const CANONICAL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase()
  if (CANONICAL && host.endsWith('.onrender.com')) {
    return NextResponse.redirect(new URL(req.nextUrl.pathname + req.nextUrl.search, CANONICAL), 301)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|seed|admin|_next).*)'],
}

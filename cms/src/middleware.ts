import { NextRequest, NextResponse } from 'next/server'

// 旧域 pnp-cms.onrender.com → 正式域 offer2pr.com 的 301(2026-07-05 域名切换,SEO 权重随 301 转移)。
// 排除(见 matcher):/api(Stripe webhook 端点在旧域,POST 不跟 301 会丢单)、/seed(auto_update 的 curl 同理)、
// /admin(过渡期保留旧域后台直达)、/_next(静态资源)。NEXT_PUBLIC_SITE_URL 未设时不启用(本地 dev 不受影响)。
const CANONICAL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')

// E3-07:forgot-password 频控(同 IP 5 次/小时)——防拿别人邮箱轰炸。进程内计数,单实例(Render Starter)够用。
const fpBuckets = new Map<string, { h: string; n: number }>()

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/api/users/forgot-password' && req.method === 'POST') {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local'
    const h = new Date().toISOString().slice(0, 13)  // 小时粒度
    const b = fpBuckets.get(ip)
    const n = b && b.h === h ? b.n : 0
    if (n >= 5) return new NextResponse('too many requests', { status: 429 })
    fpBuckets.set(ip, { h, n: n + 1 })
    return NextResponse.next()
  }
  const host = (req.headers.get('host') || '').toLowerCase()
  if (CANONICAL && host.endsWith('.onrender.com')) {
    return NextResponse.redirect(new URL(req.nextUrl.pathname + req.nextUrl.search, CANONICAL), 301)
  }
  return NextResponse.next()
}

export const config = {
  // /api 整体不走 301(webhook/seed POST 不能跟跳),唯 forgot-password 单列进来做频控
  matcher: ['/((?!api|seed|admin|_next).*)', '/api/users/forgot-password'],
}

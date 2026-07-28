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
  // 根域直出(2026-07-17 用户拍板「不需要 /jobs 后缀」):职位板搬到 /,旧 /jobs 301 回根(查询串保留:
  // ?view=match、?reset=<token>、榜单/统计回流 ?prov= 等都不能丢);旧域请求上面已 301 到新域,不叠跳
  if (req.nextUrl.pathname === '/jobs') {
    return NextResponse.redirect(new URL('/' + req.nextUrl.search, req.nextUrl.origin), 301)
  }
  // bfcache 放行(2026-07-28 Frank 真机实测:后退要等 1-2 秒 = 页面被整个重拉,浏览器的「后退秒回」没生效)。
  // Next 给动态页默认发 `private, no-cache, no-store, must-revalidate` —— 其中 **no-store 会让 Chrome
  // 直接拒绝把页面放进 bfcache**。去掉 no-store 留 no-cache:语义仍是「每次用之前必须回源确认」,
  // 而我们没发 ETag/Last-Modified,所以浏览器照样每次真取 —— **不会看到别人的或过期的页面**,
  // 唯一的变化就是后退时允许原样恢复。private 保证任何中间缓存(CDN/代理)都不存。
  // 只对**文档请求**动手:图片/静态资源走各自的长缓存,别被这条降级(matcher 里 /img 也会进来)。
  const res = NextResponse.next()
  if (req.headers.get('sec-fetch-dest') === 'document' || (req.headers.get('accept') || '').includes('text/html')) {
    res.headers.set('Cache-Control', 'private, no-cache, must-revalidate')
  }
  return res
}

export const config = {
  // /api 整体不走 301(webhook/seed POST 不能跟跳),唯 forgot-password 单列进来做频控
  matcher: ['/((?!api|seed|admin|_next).*)', '/api/users/forgot-password'],
}

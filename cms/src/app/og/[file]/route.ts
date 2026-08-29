/**
 * GET /og/[file] —— 两张分享图的唯一壳(2026-08-30 og 归目录批,与 app/sitemaps 同款)。
 * 芯 ogFileResponse 在 components/og(首例:HTTP 芯住组件桶 —— ImageResponse 版式即
 * JSX,lib 装不下;详见芯的文件头);壳只做 getDb 注入与 404 收场。
 * 旧约定件(两个 opengraph-image.tsx)同批退役,og:image 标签改由 metadata 显式指图。
 *
 * @author Frank
 * @time 2026-08-30 00:30:00
 */
import { ogFileResponse } from '@/components/og'
import { getDb } from '@/lib/db/server'

export const dynamic = 'force-dynamic'

/**
 * 出图:注入连接调芯;件名不合形 404。
 *
 * @param req 触发请求。
 * @returns 图响应或 404。
 */
export async function GET(req: Request): Promise<Response> {
  const out = await ogFileResponse({ url: req.url, db: await getDb() })
  if (out == null) {
    return new Response(null, { status: 404 })
  }
  return out
}

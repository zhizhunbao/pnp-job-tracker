/**
 * og 域的 HTTP 芯:GET /api/og/[file] —— 两张分享图一个出口(2026-08-30 三族进 api 批,
 * Frank「三个都搬」)。按件名分发:site.png 裹站点卡,job-N.png 取数裹职位卡,
 * 不合形 404。本件是 og 域的 routes 抽屉类比(域内唯一许 getDb 的文件,api 壳只做
 * 一行转发 —— 壳闸 route-shell-only 只认「*Route 改名成 HTTP 方法」的形)。
 * 🔴 首例形制(Frank 点头):HTTP 芯住组件桶 —— ImageResponse 的版式就是 JSX,
 * lib(.ts)物理装不下;与画图零件同宿主才不拆家。本件只从 ./server 门出。
 *
 * @author Frank
 * @time 2026-08-30 00:30:00
 */
import { ImageResponse } from 'next/og'
import { getDb } from '@/lib/db/server'
import { loadJobOg } from '@/lib/jobs/server'
import { JobOgCard } from './jobogcard'
import { SiteOgCard } from './siteogcard'
import { OG_FILE_SITE, OG_JOB_FILE_RE, OG_NOT_FOUND, OG_PATH_SEP, OG_SIZE } from './constants'

/**
 * 按件名出一张分享图;件名不合形 404。
 *
 * @param req 触发请求(读路径末段当件名)。
 * @returns 图响应或 404。
 */
export async function ogFileRoute(req: Request): Promise<Response> {
  const file = new URL(req.url).pathname.split(OG_PATH_SEP).pop()
  if (file === OG_FILE_SITE) {
    return new ImageResponse(<SiteOgCard />, OG_SIZE)
  }
  if (file == null) {
    return new Response(null, { status: OG_NOT_FOUND })
  }
  const m = OG_JOB_FILE_RE.exec(file)
  if (m == null || m.groups == null || m.groups.n == null) {
    return new Response(null, { status: OG_NOT_FOUND })
  }
  const id = m.groups.n
  const og = await loadJobOg({ db: await getDb(), id })
  return new ImageResponse(<JobOgCard og={og} id={id} />, OG_SIZE)
}

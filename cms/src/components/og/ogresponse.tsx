/**
 * og 域的 HTTP 芯:GET /og/[file] —— 两张分享图一个出口(2026-08-30 og 归目录批,
 * Frank 拍板与 sitemap 同款)。按件名分发:site.png 裹站点卡,job-N.png 取数裹职位卡,
 * 不合形给 null(壳按 404 收场)。
 * 🔴 首例形制(Frank 点头):HTTP 芯住组件桶 —— 因为 ImageResponse 的版式就是 JSX,
 * lib(.ts)物理装不下;与画图零件同宿主才不拆家。本件与本桶因此**只许路由壳消费**
 * (取数链沾 payload,client 组件 import 本桶即 build 炸,server-only 毒丸会点名)。
 * ImageResponse 在这儿裹(约定件退役后「归壳」改「归芯」,壳只剩 getDb 注入一行)。
 *
 * @author Frank
 * @time 2026-08-30 00:30:00
 */
import { ImageResponse } from 'next/og'
import { loadJobOg } from '@/lib/jobs/server'
import { JobOgCard } from './jobogcard'
import { SiteOgCard } from './siteogcard'
import { OG_FILE_SITE, OG_JOB_FILE_RE, OG_PATH_SEP, OG_SIZE } from './constants'
import type { MaybeOgResponse, OgFileIn } from './types'

/**
 * 按件名出一张分享图。
 *
 * @param x 请求 URL 与连接(见 OgFileIn 逐格注释)。
 * @returns 图响应;件名不合形 null。
 */
export async function ogFileResponse(x: OgFileIn): Promise<MaybeOgResponse> {
  const file = new URL(x.url).pathname.split(OG_PATH_SEP).pop()
  if (file === OG_FILE_SITE) {
    return new ImageResponse(<SiteOgCard />, OG_SIZE)
  }
  if (file == null) {
    return null
  }
  const m = OG_JOB_FILE_RE.exec(file)
  if (m == null || m.groups == null) {
    return null
  }
  const id = m.groups.n
  if (id == null) {
    return null
  }
  const og = await loadJobOg({ db: x.db, id })
  return new ImageResponse(<JobOgCard og={og} id={id} />, OG_SIZE)
}

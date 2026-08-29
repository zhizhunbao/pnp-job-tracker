/**
 * 政策时间线页(C6-01)的门:SSR 三查合并(照 rankings 模式)→ 拼组件;SEO 走 generateMetadata。
 * 2026-08-28 换装批:壳件拼装收进门里(Frank「组装只许在 (frontend) 页面门里」,样张 companies)
 * —— 整页外框走 shell 桶的通用件 Frame,顶栏与页脚在这里拼,Timeline 只出 Shell 轨往下的视图。
 * 2026-08-29 页面门清闸批:上面那句「SEO 走 generateMetadata」的形已改 —— 那个
 * generateMetadata 无参、返回死值,收成 components/timeline 的 TIMELINE_META 常量,
 * 门里只 `export const metadata = TIMELINE_META` 一行转发(渲染值一个字没变)。
 *
 * @author Frank
 * @time 2026-07-19 12:42:23
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'
import { TIMELINE_META, Timeline } from '@/components/timeline'
import { dbOf } from '@/lib/db/server'
import { fetchTimeline } from '@/lib/plan/server'

export const dynamic = 'force-dynamic'

/**
 * 这页的 SEO 头(内容住桶 constants 的 TIMELINE_META,门里只一行转发 ——
 * 2026-08-29 Frank「框架导出的内容也一律来自桶」;原先是个无参、返回死值的
 * generateMetadata,同批改成常量形。导出名是框架定的,必须留在本文件)。
 */
export const metadata = TIMELINE_META

/**
 * 时间线页的门:一次取数(三查合并在 lib/plan 里)+ 大写组件的拼装,没有别的。
 *
 * @returns 整页。
 */
export default async function TimelinePage() {
  const payload = await getPayload({ config: await config })
  const data = await fetchTimeline(dbOf(payload))
  return (
    <Frame>
      <Header />
      <Timeline events={data.events} cadence={data.cadence} eeCadence={data.eeCadence} />
      <Footer />
    </Frame>
  )
}

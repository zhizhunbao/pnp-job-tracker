/**
 * 紧缺职业清单页(B4-01)的门:SSR 直查 pnp_occupations(183 行,一页展示);
 * SEO 主体 = generateMetadata。2026-08-28 换装批:壳件(整页外框 / 顶栏 / 页脚)
 * 拼装收回本门(Frank「组装只许在 (frontend) 页面门里」,样张 companies),
 * Occupations 只出 Shell 轨往下的正文。
 * 2026-08-29 页面门清闸批:上面那句「SEO 主体 = generateMetadata」的形已改 —— 那个
 * generateMetadata 无参、返回死值,收成 components/occupations 的 OCC_META 常量,
 * 门里只 `export const metadata = OCC_META` 一行转发(渲染值一个字没变)。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { OCC_META, Occupations } from '@/components/occupations'
import { Frame } from '@/components/shell'
import { loadOccupations } from '@/lib/employers/server'
import { dbOf } from '@/lib/db/server'

export const dynamic = 'force-dynamic'

/**
 * 本页的 SEO 头(内容住桶 constants 的 OCC_META,门里只一行转发 ——
 * 2026-08-29 Frank「框架导出的内容也一律来自桶」;原先是个无参、返回死值的
 * generateMetadata,同批改成常量形。导出名是框架定的,必须留在本文件)。
 */
export const metadata = OCC_META

/**
 * 清单页的门:取库 → 拼壳与正文。
 *
 * @returns 整页。
 */
export default async function OccupationsPage() {
  const payload = await getPayload({ config: await config })
  const rows = await loadOccupations(dbOf(payload))
  return (
    <Frame>
      <Header />
      <Occupations rows={rows} />
      <Footer />
    </Frame>
  )
}

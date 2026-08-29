/**
 * 官方资源导航页(E4-05)的门:SEO 落地页 + 把散落全站的官方链接归拢一页。
 * 纯静态 curated —— 不取参、不连库,门里只有拼装。
 * 2026-08-28 换装批:壳件拼装收进门里(Frank「组装只许在 (frontend) 页面门里」,
 * 样张 companies)—— 整页外框走 shell 桶的通用件 Frame,顶栏与页脚在这里拼,
 * Resources 只出 Shell 轨往下的视图;ItemList 串由本域 resItemListJsonOf 拼、壳走通用件 JsonLd(08-29 收拢)
 * (门里不许有裸标签,值的单一来源仍是 lib/official 的 RES)。
 *
 * @author Frank
 * @time 2026-08-28 12:39:03
 */
import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { RES_META_DESC, RES_META_TITLE, Resources, resItemListJsonOf } from '@/components/resources'
import { JsonLd } from '@/components/jsonld'
import { Frame } from '@/components/shell'

/**
 * 页面元信息(两句话的值在 components/resources 的 constants.ts 挂注释)。
 */
export const metadata: Metadata = { title: RES_META_TITLE, description: RES_META_DESC }

/**
 * 官方资源导航页的门:结构化数据 + 顶栏 / 正文 / 页脚三段。
 *
 * @returns 整页。
 */
export default function ResourcesPage() {
  return (
    <>
      <JsonLd json={resItemListJsonOf()} />
      <Frame>
        <Header />
        <Resources />
        <Footer />
      </Frame>
    </>
  )
}

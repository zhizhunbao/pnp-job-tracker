/**
 * 资讯 →「通道与门槛」页的门(2026-09-30 通道与门槛批 2;Frank「各省门槛 我觉得 应该放到资讯下面」「盘点各种通道,各种门槛」;
 * 设计 docs/design/通道与门槛-20260930.md):壳件拼装 + 视图。门槛整表在视图里懒取(同省提名弹框那一份),门里没有取数。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'
import { STREAMS_META, Streams } from '@/components/streams'

/**
 * 这页的 SEO 头(内容住桶 constants 的 STREAMS_META,门里只一行转发;导出名是框架定的,必须留在本文件)。
 */
export const metadata = STREAMS_META

/**
 * 「通道与门槛」页的门:壳件与视图的拼装,没有别的。
 *
 * @returns 整页。
 */
export default function StreamsPage() {
  return (
    <Frame>
      <Header />
      <Streams />
      <Footer />
    </Frame>
  )
}

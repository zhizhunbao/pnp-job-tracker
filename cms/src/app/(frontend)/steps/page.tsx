/**
 * 资讯 →「申请步骤」页的门(2026-10-03 资讯页签四分,Frank「申请步骤应该是另一个选项卡吧」→ 提案「可以,做吧」;形照 /streams 的门):
 * 壳件拼装 + 视图。步骤整表在视图里懒取(同省提名弹框那一份),门里没有取数。
 *
 * @author Frank
 * @time 2026-10-03 23:44:58
 */
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'
import { STEPS_META, Steps } from '@/components/streams'

/**
 * 这页的 SEO 头(内容住桶 constants 的 STEPS_META,门里只一行转发;导出名是框架定的,必须留在本文件)。
 */
export const metadata = STEPS_META

/**
 * 「申请步骤」页的门:壳件与视图的拼装,没有别的。
 *
 * @returns 整页。
 */
export default function StepsPage() {
  return (
    <Frame>
      <Header />
      <Steps />
      <Footer />
    </Frame>
  )
}

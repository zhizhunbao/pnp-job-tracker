/**
 * 常见案例索引(SEO 落地页)的门:16 个真实处境一页列全,做了事实层的带完整案例
 * 链接。内链职责从 /plan/pr 挪来(2026-08-13):处境详情页要被爬到,靠这一页 +
 * 顶栏资料库入口。2026-08-27 cases 样张单:壳件(Header/Footer)拼装收回本门
 * (Frank 新令「组装只许在 (frontend) 页面门里」;Header/Footer 语言自理,
 * 服务端门直接拼)。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { CASES_META, Cases, casesJsonLd } from '@/components/cases'
import { JsonLd } from '@/components/jsonld'
import { Frame } from '@/components/shell'

/**
 * 本页的 SEO 头(内容住桶 constants 的 CASES_META,门里只一行转发 ——
 * 2026-08-29 Frank「统一放到桶里」;导出名是框架定的,必须留在本文件)。
 */
export const metadata = CASES_META

/**
 * 索引页的门:JSON-LD + 外框里拼壳与正文。JSON-LD 串由 cases 桶的 casesJsonLd 拼,
 * 壳走通用件 JsonLd(2026-08-29 收拢:script 壳五份克隆归一,通用形态单一出口);外框 2026-08-29
 * CasesShell 退役换全站 Frame(体是 Frame 逐字翻版,克隆壳违「通用形态单一出口」)。
 *
 * @returns 整页。
 */
export default function CasesIndexPage() {
  return <>
    <JsonLd json={casesJsonLd()} />
    <Frame>
      <Header />
      <Cases />
      <Footer />
    </Frame>
  </>
}

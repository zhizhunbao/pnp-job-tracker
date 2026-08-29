/**
 * 处境页(SEO 落地页,样板 C01)的门。设计:docs/design/案例库-问题与结果先行-20260803.md §1。
 * 只给**有事实层**的处境出页(casePages 白名单)—— 剩下的只有问题、没有事实,
 * 出成页就是空壳,被索引反而拉低整站质量。有一条算一条。
 * 2026-08-27 cases 样张单(服务端页形态照 employers):门 = 取参 + 一行 lib 装配
 * (loadCasePage,db 注入)+ 拼组件;壳件拼装收回本门。
 *
 * 🔴 **不要加回 generateStaticParams**(2026-08-11 实撞):它与 force-dynamic 同时
 * 存在时,这一页会在**构建期**被预渲染,之后无论库里怎么变、页面都停在部署那一刻 ——
 * 实证:库里 MPNP 提名已是 2,673,生产页仍渲 2,670,而响应头是 no-store(不是 CDN
 * 缓存)。这一页的每个数字都来自库(提名量、名额、在招岗数、判定核),冻住 =
 * 对用户撒谎。处境页总共就几条,没有预渲染的必要;SEO 靠 SSR 一样吃得到。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Case } from '@/components/cases'
import { Frame } from '@/components/shell'
import { getDb } from '@/lib/db/server'
import { ssrLang } from '@/lib/i18n/server'
import { caseMeta, loadCasePage } from '@/lib/ruling/server'

export const dynamic = 'force-dynamic'

/**
 * 处境页的 metadata:取参、读语言,拼装在 lib/ruling 的 caseMeta 里。
 *
 * @param x Next 递来的路由参数。
 * @returns 标题与描述;查无此页给空对象。
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return caseMeta({ slug, lang: await ssrLang() })
}

/**
 * 处境页的门:取参 + 一行装配 + 拼壳与正文。结论全部来自判定核;
 * 算不出来就不出页(空壳页不该被索引)。
 *
 * @param x Next 递来的路由参数。
 * @returns 整页;查无此页 404。
 */
export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const props = await loadCasePage({ slug, db: await getDb() })
  if (props == null) {
    notFound()
  }
  return (
    <Frame>
      <Header active="pathways" />
      <Case caseId={props.caseId} answer={props.answer} />
      <Footer />
    </Frame>
  )
}

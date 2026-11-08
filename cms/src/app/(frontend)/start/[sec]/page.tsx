/**
 * 就业把脉子页的门(2026-11-07 Frank「是不是改成多个页面好一些」→「直接拆」:七个分区各一页,
 * /start 是职业,本门承载其余六页 /start/employers、provinces、cities、pr、draws、news;表外末段 404)。
 * 取数、顶栏、页脚、banner、侧栏都在 `../layout.tsx`(同日 Frank「切换的时候不要刷页面」),本门只给这一段;
 * 本页分区挂载后自己拉 /api/stats/pulse 那一份。
 *
 * @author Frank
 * @time 2026-11-07 23:20:00
 */
import { notFound } from 'next/navigation'

import { Pulse, secIdOf, secMetaOf } from '@/components/start'

/**
 * 每次请求现取(与 /start 同)。
 */
export const dynamic = 'force-dynamic'

/**
 * 子页的 SEO 头。
 *
 * @param props 路由参数(Next 规定的形)。
 * @returns 标题与摘要。
 */
export async function generateMetadata({ params }: { params: Promise<{ sec: string }> }) {
  const { sec } = await params
  return secMetaOf(sec)
}

/**
 * 就业把脉子页。
 *
 * @param props 路由参数(Next 规定的形)。
 * @returns 整页。
 */
export default async function PulseSecPage({ params }: { params: Promise<{ sec: string }> }) {
  const { sec } = await params
  const id = secIdOf(sec)
  if (id == null) {
    notFound()
  }
  return <Pulse sec={id} />
}

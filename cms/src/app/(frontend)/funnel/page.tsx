/**
 * 漏斗五个数(主线 M2 / E7-05)的门:详情页 → 报告 → 锁区曝光 → pricing → 付费。
 * **只有 role=admin 看得见**;其余一律 notFound() —— 不是隐藏,是不存在(转化数据不该对外)。
 * 数据来源:第一方 funnel_events(按天计数,见 `docs/sql/m2-funnel.sql`);
 * 「真实付费」不数事件数 users —— 点击不是钱,proUntil 才是唯一付费真相。
 * 两条查询都走 `queryRowsOrEmpty`:表还没建 → 空页面照常渲染(说「还没有任何计数」),
 * 不 500,且失败在 lib/log 留痕(不静默降级)。
 *
 * 2026-08-27 换装批:页面改造成「纯拼装门」(闸 local/page-compose-only + page-no-logic)
 * —— 排版与算法全部下沉进 components/funnel/,门里只剩鉴权、两条取数与大写组件的拼装;
 * 壳件(整页外框 Frame / 顶栏 / 页脚)拼装收回本门(Frank「组装只许在 (frontend) 页面门里」,
 * 样张 account/companies/cases)。
 *
 * @author Frank
 * @time 2026-08-27 03:00:00
 */
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { SQL, queryRowsOrEmpty } from '@/lib/db'
import { dbOf } from '@/lib/db/server'
import { checkedAt } from '@/lib/jobs/server'
import { getUserOrNull } from '@/lib/quota/server'
import { Funnel, ROLE_ADMIN, toFunnelBoard, toFunnelEventFact, toFunnelPayFact } from '@/components/funnel'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'

export const dynamic = 'force-dynamic'

/**
 * 漏斗看板的门:鉴权 + 两条取数 + 拼装,没有别的。
 *
 * @returns 整页;非 admin 走 notFound()。
 */
export default async function FunnelPage() {
  const user = await getUserOrNull(await headers())
  if (user == null || user.role !== ROLE_ADMIN) {
    notFound()
  }
  const db = dbOf(await getPayload({ config: await config }))
  const events = await queryRowsOrEmpty({ db, sql: SQL.FUNNEL_EVENTS, params: [], map: toFunnelEventFact })
  const pays = await queryRowsOrEmpty({ db, sql: SQL.FUNNEL_USERS, params: [], map: toFunnelPayFact })
  const updatedAt = await checkedAt(db)
  return (
    <Frame>
      <Header />
      <Funnel board={toFunnelBoard({ events, pays })} updatedAt={updatedAt} />
      <Footer />
    </Frame>
  )
}

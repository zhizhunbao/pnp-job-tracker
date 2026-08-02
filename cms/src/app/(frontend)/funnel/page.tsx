// 漏斗五个数(主线 M2 / E7-05):详情页 → 报告 → 锁区曝光 → pricing → 付费。
// **只有 role=admin 看得见**;其余一律 notFound() —— 不是隐藏,是不存在(转化数据不该对外)。
// 数据来源:第一方 funnel_events(按天计数,见 docs/sql/m2-funnel.sql);
// 「真实付费」不数事件数 users —— 点击不是钱,proUntil 才是唯一付费真相。
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/entitlement'
import { FUNNEL_STEPS, stepRates } from '@/lib/funnel'
import { FunnelView, type FunnelRow } from './FunnelView'

export const dynamic = 'force-dynamic'

const LABEL: Record<string, string> = {
  'jd-open': '① 打开职位详情',
  'report-open': '② 出报告',
  'lock-seen': '③ 锁区被看到',
  'pricing-open': '④ 打开定价',
  'pay-click': '⑤ 点了付费',
}

export default async function FunnelPage() {
  const user = await getUser(await headers()).catch(() => null)
  if (user?.role !== 'admin') notFound()

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const raw: { event: string; prop: string; d30: number; d7: number; d1: number }[] = await pool
    .query(
      `SELECT event, prop,
              COALESCE(sum(n) FILTER (WHERE day > CURRENT_DATE - 30), 0)::int d30,
              COALESCE(sum(n) FILTER (WHERE day > CURRENT_DATE - 7),  0)::int d7,
              COALESCE(sum(n) FILTER (WHERE day = CURRENT_DATE - 1),  0)::int d1
       FROM funnel_events GROUP BY event, prop`,
    )
    .then((r: any) => r.rows.map((x: any) => ({ event: x.event, prop: x.prop ?? '', d30: Number(x.d30 ?? 0), d7: Number(x.d7 ?? 0), d1: Number(x.d1 ?? 0) })))
    .catch(() => [])   // 表还没建 → 空页面照常渲染(说「还没有任何计数」),不 500

  const sum = (step: string, k: 'd30' | 'd7' | 'd1') => raw.filter((r) => r.event === step).reduce((a, r) => a + r[k], 0)
  const rates = stepRates(Object.fromEntries(FUNNEL_STEPS.map((s) => [s, sum(s, 'd30')])))
  // ② 不给「比上一步」(2026-08-03 第一次读这张表就撞到:① 8 次、② 16 次 = 200%)。
  // 职位详情页**不是**报告的唯一来路 —— 首页 CTA 直接进 /plan/pr 的占了绝大多数(实测 16 里 12 条是 pr 卡),
  // 拿 ① 当 ② 的分母算出来的百分比没有意义。③④⑤ 是真父子关系,照旧给。
  const rows: FunnelRow[] = FUNNEL_STEPS.map((s, i) => ({
    step: s, label: LABEL[s], d30: sum(s, 'd30'), d7: sum(s, 'd7'), d1: sum(s, 'd1'),
    rate: i === 0 || s === 'report-open' ? null : rates[i - 1],
  }))
  const group = (event: string) =>
    raw.filter((r) => r.event === event && r.prop).sort((a, b) => b.d30 - a.d30).map((r) => ({ prop: r.prop, n: r.d30 }))
  const byEntry = group('lock-seen')
  const byPricing = group('pricing-open')

  // 真实付费两个数分开摆:proUntil 有值的(含人工赠送)与真走过 Checkout 的 —— 手工开的 Pro 不能冒充收款。
  // 信号用 stripe_sessions(webhook 拨 proUntil 时写的 session id),**不用 stripe_customer_id**:
  // 2026-08-01 实核 92 个用户里那一列一个都没有,拿它当付费信号会永远显示 0 = 假数。
  const { pro, stripe } = await pool
    .query(`SELECT count(pro_until)::int pro,
                   count(*) FILTER (WHERE stripe_sessions IS NOT NULL AND stripe_sessions::text NOT IN ('[]','null','""'))::int stripe
            FROM users`)
    .then((r: any) => ({ pro: Number(r.rows[0]?.pro ?? 0), stripe: Number(r.rows[0]?.stripe ?? 0) }))
    .catch(() => ({ pro: 0, stripe: 0 }))

  return <FunnelView rows={rows} pro={pro} stripe={stripe} byEntry={byEntry} byPricing={byPricing} />
}

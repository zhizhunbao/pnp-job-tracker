/**
 * 管理员队列页的门(2026-11-05 Frank「我这个账号是管理员,我需要在 header 加一项,我能看到所有在排队的任务」
 * 「其他账号看不到」):ETL 调度单元、投递待发、公司官网抓取、雇主译名翻译四种排队一页看清。
 * **只有 role=admin 看得见**;其余一律 notFound() —— 不是隐藏,是不存在(同 /funnel)。
 * 五条查询都走 `queryRowsOrEmpty`:表还没建(etl_units)→ 那张卡空着照常渲染,失败在 lib/log 留痕。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { SQL, queryRowsOrEmpty } from '@/lib/db'
import { dbOf } from '@/lib/db/server'
import { getUserOrNull } from '@/lib/quota/server'
import {
  Queue, QUEUE_ROWS, ROLE_ADMIN, toAliasFact, toApplyFact, toNowIso, toQueueBoard, toSiteFact, toUnitFact,
} from '@/components/queue'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'

export const dynamic = 'force-dynamic'

/**
 * 队列页的门:鉴权 + 五条取数 + 拼装,没有别的。
 *
 * @returns 整页;非 admin 走 notFound()。
 */
export default async function QueuePage() {
  const user = await getUserOrNull(await headers())
  if (user == null || user.role !== ROLE_ADMIN) {
    notFound()
  }
  const db = dbOf(await getPayload({ config: await config }))
  const units = await queryRowsOrEmpty({ db, sql: SQL.QUEUE_UNITS, params: [], map: toUnitFact })
  const apply = await queryRowsOrEmpty({ db, sql: SQL.QUEUE_APPLY, params: [QUEUE_ROWS], map: toApplyFact })
  const sites = await queryRowsOrEmpty({ db, sql: SQL.QUEUE_SITES, params: [QUEUE_ROWS], map: toSiteFact })
  const alias = await queryRowsOrEmpty({ db, sql: SQL.QUEUE_ALIAS, params: [QUEUE_ROWS], map: toAliasFact })
  const now = await queryRowsOrEmpty({ db, sql: SQL.QUEUE_NOW, params: [], map: toNowIso })
  return (
    <Frame>
      <Header />
      <Queue board={toQueueBoard({ units, apply, sites, alias, now })} />
      <Footer />
    </Frame>
  )
}

/**
 * 运维页子页的门:一个门承载全部页面,加观察维度不用新建路由。**只有 role=admin 看得见**;表外末段 404。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { OpsView } from '@/components/ops'
import { dbOf } from '@/lib/db/server'
import { ROLE_ADMIN, SECS, loadOpsBoard } from '@/lib/ops'
import { getUserOrNull } from '@/lib/quota/server'

/**
 * 每次请求现取。
 */
export const dynamic = 'force-dynamic'

/**
 * 运维页子页。
 *
 * @param props 路由参数(Next 规定的形)。
 * @returns 这一页的四格和表;非 admin 或表外页面走 notFound()。
 */
export default async function OpsSecPage({ params }: { params: Promise<{ sec: string }> }) {
  const { sec } = await params
  const user = await getUserOrNull(await headers())
  if (user == null || user.role !== ROLE_ADMIN || SECS.includes(sec) === false) {
    notFound()
  }
  const db = dbOf(await getPayload({ config: await config }))
  return <OpsView key={sec} board={await loadOpsBoard({ db, sec })} />
}

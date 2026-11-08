/**
 * 运维页默认页的门(总览)。**只有 role=admin 看得见**。
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
import { ROLE_ADMIN, SEC_DEFAULT, loadOpsBoard } from '@/lib/ops'
import { getUserOrNull } from '@/lib/quota/server'

/**
 * 每次请求现取。
 */
export const dynamic = 'force-dynamic'

/**
 * 运维页默认页。
 *
 * @returns 这一页的四格和表;非 admin 走 notFound()。
 */
export default async function OpsPage() {
  const user = await getUserOrNull(await headers())
  if (user == null || user.role !== ROLE_ADMIN) {
    notFound()
  }
  const db = dbOf(await getPayload({ config: await config }))
  return <OpsView board={await loadOpsBoard({ db, sec: SEC_DEFAULT })} />
}

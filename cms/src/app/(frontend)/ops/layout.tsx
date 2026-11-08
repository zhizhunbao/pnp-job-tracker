/**
 * 运维页共用的布局门(2026-11-08 Frank「把管理员队列页重构成运维页」):全站外框、顶栏、运维外框(侧栏与 banner)、页脚住这里,切页不卸载。
 * **只有 role=admin 看得见**;其余一律 notFound()。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { OpsShell } from '@/components/ops'
import { Frame } from '@/components/shell'
import { ROLE_ADMIN } from '@/lib/ops'
import { getUserOrNull } from '@/lib/quota/server'

/**
 * 每次请求现取。
 */
export const dynamic = 'force-dynamic'

/**
 * 运维页布局。
 *
 * @param props 这一页的内容(Next 规定的形)。
 * @returns 整页外框;非 admin 走 notFound()。
 */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserOrNull(await headers())
  if (user == null || user.role !== ROLE_ADMIN) {
    notFound()
  }
  return (
    <Frame>
      <Header />
      <OpsShell>{children}</OpsShell>
      <Footer />
    </Frame>
  )
}

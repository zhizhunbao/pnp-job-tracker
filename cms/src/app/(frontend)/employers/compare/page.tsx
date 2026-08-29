/**
 * 多雇主对比页(D3 / E5-06)的门:SSR gate——Pro 才聚合真值;免费/匿名=示例模糊态
 * (真数据不出服务端)。入口=名录行/公司弹框「+ 对比」(localStorage 选择,
 * URL `?names=a|b|c` 落地);sitemap 不收录(Pro 页无 SEO 价值)。
 *
 * @author Frank
 * @time 2026-07-20 12:21:35
 */
import { headers } from 'next/headers'
import { getUser, isPro } from '@/lib/quota/server'
import { loadMatchDims } from '@/lib/jobs/server'
import type { CompareRow } from '@/lib/employers'
import { compareEmployers } from '@/lib/employers/server'
import { getDb } from '@/lib/db/server'
import { hasProfile, normalizeProfile, type ProfileJson } from '@/lib/jobs'
import { Compare, COMPARE_META, COMPARE_MIN_ROWS, compareNamesOf, noDimsOf } from '@/components/employers'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'

export const dynamic = 'force-dynamic'

/**
 * 本页的 SEO 头(内容住桶 constants 的 COMPARE_META,门里只一行转发 ——
 * 2026-08-29 Frank「框架导出的内容也一律来自桶」;导出名是框架定的,必须留在本文件)。
 */
export const metadata = COMPARE_META

/**
 * 对比页的门:取参 + 身份判定 + 一行装配 + 拼壳与正文。真值只在 Pro 且选够两家时才聚合,
 * 其余一律走示例模糊态(免费/匿名看得到形态、看不到数)。
 *
 * 跨域形状接缝(2026-08-29 形制批自 `normalizeProfile` 那一行上方原样上提,一句未删):
 * quota 域声明的 users.profile 允许嵌套对象,jobs 域的 ProfileJson 只到扁平格
 * (两域各自声明自己的形状,不互相取 —— 宪法)。断言只住这一处,收窄由 normalizeProfile 逐格做。
 *
 * @param x Next 递来的查询参数。
 * @returns 整页。
 */
export default async function CompareEmployersPage({ searchParams }: { searchParams: Promise<{ names?: string }> }) {
  const sp = await searchParams
  const names = compareNamesOf({ names: sp?.names })
  const user = await getUser(await headers())
  const pro = isPro(user)
  let rows: CompareRow[] = []
  if (pro && names.length >= COMPARE_MIN_ROWS) {
    const dims = await loadMatchDims(await getDb()).catch(noDimsOf)
    const p = normalizeProfile(user?.profile as ProfileJson | null)
    rows = await compareEmployers({ db: await getDb(), names, profile: hasProfile(p) ? p : null, dims })
  }
  return (
    <Frame>
      <Header />
      <Compare rows={rows} pro={pro} loggedIn={!!user} />
      <Footer />
    </Frame>
  )
}

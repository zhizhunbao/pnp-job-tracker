/**
 * 指定雇主名录入口的门(2026-08-16 重做:与 `/employers/hiring` 合并成同一块**雇主板**,
 * 口径作筛选项之一)。入口契约不变:`/employers/designated?program=AIP&prov=NS` 仍直达
 * 并预置筛选(初评表「查雇主」的落点)。
 *
 * @author Frank
 * @time 2026-08-16 01:23:23
 */
import { employersBoardProps } from '@/lib/employers/server'
import { getDb } from '@/lib/db/server'
import { Employers, MODE_DESIGNATED, designatedMetaOf } from '@/components/employers'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'

export const dynamic = 'force-dynamic'

/**
 * 名录页的 metadata:标题按「省 + 口径」加范围前缀,直达链接进来时标题就说清看的是哪一档。
 * 拼装在 components/employers 的 designatedMetaOf 里(2026-08-29 Frank
 * 「generateMetadata 体内只许一行 return 调桶的函数」),门里只剩取参。
 *
 * @param x Next 递来的路由参数。
 * @returns 标题与描述。
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ program?: string; prov?: string }> }) {
  const sp = await searchParams
  return designatedMetaOf(sp)
}

/**
 * 名录页的门:一行装配(employersBoardProps,db 注入)+ 拼壳与正文;
 * 雇主板视图与 `/employers/hiring` 同一件,靠 mode 分口径。
 *
 * @param x Next 递来的查询参数。
 * @returns 整页。
 */
export default async function DesignatedEmployersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const props = await employersBoardProps({ sp: await searchParams, mode: MODE_DESIGNATED, db: await getDb() })
  return (
    <Frame>
      <Header />
      <Employers {...props} />
      <Footer />
    </Frame>
  )
}

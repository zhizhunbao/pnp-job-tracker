// 在招雇主入口(2026-08-16 重做:与 /employers/designated 合并成同一块**雇主板**,口径作筛选项之一)。
// 入口契约不变:/employers/hiring?prov=SK&noc=72310 仍直达并预置筛选(初评表「查雇主」的落点)。
// 口径:该省该职业正在招人的雇主,来自本站每日职位库(不是官方名录)。
import { employersBoardProps } from '../board'
import { Employers } from '../Employers'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ prov?: string }> }) {
  const sp = await searchParams
  const prov = /^[A-Z]{2}$/.test(String(sp.prov ?? '')) ? String(sp.prov) : ''
  return {
    title: `${prov ? prov + ' ' : ''}Employers hiring now | Offer2PR`,
    description: 'Employers with open postings for this occupation in this province, from our daily job crawl. 该省该职业正在招人的雇主,来自本站每日抓取的职位库。',
  }
}

export default async function HiringEmployersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const props = await employersBoardProps(await searchParams, 'hiring')
  return <Employers {...props} />
}

// 指定雇主名录入口(2026-08-16 重做:与 /employers/hiring 合并成同一块**雇主板**,口径作筛选项之一)。
// 入口契约不变:/employers/designated?program=AIP&prov=NS 仍直达并预置筛选(初评表「查雇主」的落点)。
import { employersBoardProps } from '../board'
import { Employers } from '../Employers'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ program?: string; prov?: string }> }) {
  const sp = await searchParams
  const program = ['AIP', 'RCIP', 'FCIP'].includes(String(sp.program ?? '')) ? String(sp.program) : ''
  const prov = /^[A-Z]{2}$/.test(String(sp.prov ?? '')) ? String(sp.prov) : ''
  const scope = [prov, program].filter(Boolean).join(' ')
  return {
    title: `${scope ? scope + ' ' : ''}Designated employers | Offer2PR`,
    description: 'Employers designated under AIP / RCIP / FCIP, from official community and provincial lists. Being designated does not mean the employer is hiring — check open jobs. 指定雇主名录(AIP/RCIP/FCIP),官方名录周更;被指定不等于在招。',
  }
}

export default async function DesignatedEmployersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const props = await employersBoardProps(await searchParams, 'designated')
  return <Employers {...props} />
}

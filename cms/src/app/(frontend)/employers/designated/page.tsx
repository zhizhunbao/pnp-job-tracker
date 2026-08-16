// 指定雇主名录页(2026-08-16):初评表「查雇主」在 AIP/RCIP/FCIP 行的落点。
// SSR 直查 designated_employers(库里 6,680 行),按 ?program=AIP|RCIP|FCIP & ?prov=XX 过滤。
// /employers 本身 308 到把脉页(08-08 货架页下架),本页是它下面的独立名录路由,不受影响。
import { getPayload } from 'payload'

import config from '@/payload.config'
import { fetchDesignatedEmployers } from '@/lib/designatedEmployers'
import { ssrLang } from '@/lib/lang.server'
import { makeT } from '../../jobs/i18n'
import { DesignatedEmployersView } from './DesignatedEmployersView'

export const dynamic = 'force-dynamic'

const PROGRAMS = new Set(['AIP', 'RCIP', 'FCIP'])

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ program?: string; prov?: string }> }) {
  const sp = await searchParams
  const program = PROGRAMS.has(String(sp.program ?? '')) ? String(sp.program) : ''
  const prov = /^[A-Z]{2}$/.test(String(sp.prov ?? '')) ? String(sp.prov) : ''
  const scope = [prov, program].filter(Boolean).join(' ')
  return {
    title: `${scope ? scope + ' ' : ''}Designated employers | Offer2PR`,
    description: 'Employers designated under AIP / RCIP / FCIP, from official community and provincial lists. Being designated does not mean the employer is hiring — check open jobs. 指定雇主名录(AIP/RCIP/FCIP),官方名录周更;被指定不等于在招。',
  }
}

export default async function DesignatedEmployersPage({ searchParams }: {
  searchParams: Promise<{ program?: string; prov?: string }>
}) {
  const sp = await searchParams
  const program = PROGRAMS.has(String(sp.program ?? '')) ? String(sp.program) : ''
  const province = /^[A-Z]{2}$/.test(String(sp.prov ?? '')) ? String(sp.prov) : ''
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as { pool?: Parameters<typeof fetchDesignatedEmployers>[0] }).pool
  const rows = pool ? await fetchDesignatedEmployers(pool, { program, province }) : []
  const t = makeT(await ssrLang())
  const title = [province ? t('pr.' + province) : '', program, t('de.title')].filter(Boolean).join(' ')
  return (
    <DesignatedEmployersView
      rows={rows.map((r) => ({ name: r.name, where: r.location || (province ? t('pr.' + province) : ''), tag: r.source }))}
      title={title} colTag={t('de.colProgram')} empty={t('de.empty')}
      fetched={rows.find((r) => r.fetched)?.fetched ?? ''} backHref="/plan/pr" />
  )
}

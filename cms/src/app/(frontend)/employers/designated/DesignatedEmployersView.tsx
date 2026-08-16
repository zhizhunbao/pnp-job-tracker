'use client'
// 指定雇主名录视图(2026-08-16 Frank「这个怎么没有查雇主按钮」):AIP/RCIP/FCIP 三个制度都要求
// offer 出自被指定的雇主 —— 初评表的「查雇主」落到这里,按 制度 × 省 过滤。
// 骨架照职位详情页那套(PageShell 轨 + 右上返回 + H1 + 白卡),表格用公共 DataTable。
import { useLang } from '../../LangProvider'
import { SiteHeader } from '../../SiteHeader'
import { SiteFooter } from '../../SiteFooter'
import { BackLink } from '../../BackLink'
import { PageShell, UI } from '../../ui/primitives'
import { DataTable } from '../../ui/DataTable'
import type { DesignatedEmployerRow } from '@/lib/designatedEmployers'

export function DesignatedEmployersView({ rows, program, province, backHref }: {
  rows: DesignatedEmployerRow[]
  program: string
  province: string
  backHref: string
}) {
  const [lang, setLangSaved, t] = useLang()
  const provName = /^[A-Z]{2}$/.test(province) ? t('pr.' + province) : ''
  // 标题只说这一页是什么:制度 + 省(两者都可能没有 → 少一段就不写,不留空括号)
  const title = [provName, program, t('de.title')].filter(Boolean).join(' ')
  const fetched = rows.find((r) => r.fetched)?.fetched ?? ''

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="employers" />
      <div style={{ flex: '1 0 auto' }}>
        <PageShell pad="1rem 1.25rem 40px">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, margin: '0 0 12px' }}>
            <h1 style={{ flex: 1, minWidth: 0, fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.45 }}>{title}</h1>
            <BackLink href={backHref} label={t('de.back')} />
          </div>
          <div style={{ background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '14px 16px' }}>
            {rows.length === 0 ? (
              <div style={{ fontSize: 13, color: UI.text2, lineHeight: 1.7 }}>{t('de.empty')}</div>
            ) : (
              <DataTable<DesignatedEmployerRow> rows={rows} rowKey={(r) => `${r.source}:${r.location}:${r.name}`} header={
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', padding: '10px 12px 6px' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t('de.count', { n: rows.length })}</span>
                  {fetched ? <span style={{ marginLeft: 'auto', fontSize: 11.5, color: UI.text3 }}>{t('dir.occ.fetched', { d: fetched })}</span> : null}
                </div>
              } cols={[
                { key: 'name', label: t('de.colName'), sort: (r) => r.name, render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
                { key: 'where', label: t('de.colWhere'), sort: (r) => r.location || r.province, render: (r) => <span>{r.location || (/^[A-Z]{2}$/.test(r.province) ? t('pr.' + r.province) : '—')}</span> },
                { key: 'program', label: t('de.colProgram'), nowrap: true, sort: (r) => r.source, render: (r) => <span style={{ color: UI.text2 }}>{r.source || '—'}</span> },
                // 「被指定」≠「在招」:在招一律以职位库为准,所以每行给一条直达
                { key: 'jobs', label: '', nowrap: true, align: 'right',
                  render: (r) => <a href={`/jobs?q=${encodeURIComponent(r.name)}`} style={{ color: UI.primary, textDecoration: 'none', fontSize: 12.5 }}>{t('rank.viewJobs')}</a> },
              ]} />
            )}
          </div>
        </PageShell>
      </div>
      <SiteFooter t={t} />
    </div>
  )
}

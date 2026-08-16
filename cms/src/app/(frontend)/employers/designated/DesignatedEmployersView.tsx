'use client'
// 雇主名录视图(2026-08-16 Frank「这个怎么没有查雇主按钮」「其他的查雇主按钮呢?」):初评表「查雇主」的落点,
// 两种口径共用一套版式 —— 制度要求指定雇主的(AIP/RCIP/FCIP)看**指定名录**,
// 普通省提名没有指定雇主这回事,看**该省该职业的在招雇主**(本站职位库)。
// 骨架照职位详情页那套(PageShell 轨 + 右上返回 + H1 + 白卡),表格用公共 DataTable。
import { useLang } from '../../LangProvider'
import { SiteHeader } from '../../SiteHeader'
import { SiteFooter } from '../../SiteFooter'
import { BackLink } from '../../BackLink'
import { PageShell, UI } from '../../ui/primitives'
import { DataTable } from '../../ui/DataTable'

/** 两种口径归一成一行(第三列 tag=制度 或 在招岗数,列名随口径换) */
export type EmployerListRow = {
  name: string
  where: string
  /** 指定名录=制度(AIP/RCIP/FCIP);在招=岗位数 */
  tag: string
}

export function DesignatedEmployersView({ rows, title, colTag, empty, fetched, backHref }: {
  rows: EmployerListRow[]
  title: string
  colTag: string
  empty: string
  fetched?: string
  backHref: string
}) {
  const [lang, setLangSaved, t] = useLang()

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
              <div style={{ fontSize: 13, color: UI.text2, lineHeight: 1.7 }}>{empty}</div>
            ) : (
              <DataTable<EmployerListRow> rows={rows} rowKey={(r) => `${r.where}:${r.name}`} header={
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', padding: '10px 12px 6px' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t('de.count', { n: rows.length })}</span>
                  {fetched ? <span style={{ marginLeft: 'auto', fontSize: 11.5, color: UI.text3 }}>{t('dir.occ.fetched', { d: fetched })}</span> : null}
                </div>
              } cols={[
                { key: 'name', label: t('de.colName'), sort: (r) => r.name, render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
                { key: 'where', label: t('de.colWhere'), sort: (r) => r.where, render: (r) => <span>{r.where || '—'}</span> },
                { key: 'tag', label: colTag, nowrap: true, align: 'right', sort: (r) => r.tag, render: (r) => <span style={{ color: UI.text2 }}>{r.tag || '—'}</span> },
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

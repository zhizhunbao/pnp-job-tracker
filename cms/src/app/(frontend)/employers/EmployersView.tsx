'use client'
// 雇主名录视图(B4-01):纯渲染,数据 SSR 传入;筛选/搜索/翻页=URL 参数刷新(SEO 可抓每一页)。
// 付费透镜:名录免费=C7 头号痛点(哪个雇主真的担保)的 browse 面;转化钩=每行「查在招 →」深链 /?q=。
// 语义红线循 E6-02:LMIA=雇过外国人的历史事实 ≠ 能担保;AIP 指定 ≠ 有配额(口径行写死,见 dir.note.*)。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, type Lang, type TFn } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { PageBanner, PageShell, Tag, UI, chipStyle } from '../ui/primitives'
import { IconUsers } from '../Icons'
import { DIR_PAGE_SIZE, type AipRow, type LmiaRow } from '@/lib/directory'

const th: React.CSSProperties = { textAlign: 'left', padding: '9px 12px', fontSize: 12.5, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb' }
const td: React.CSSProperties = { padding: '9px 12px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' }

function href(type: string, q: string, prov: string, page: number) {
  const sp = new URLSearchParams()
  if (type !== 'lmia') sp.set('type', type)
  if (q) sp.set('q', q)
  if (prov) sp.set('prov', prov)
  if (page > 0) sp.set('page', String(page))
  const s = sp.toString()
  return '/employers' + (s ? `?${s}` : '')
}

function Pager({ t, total, page, mk }: { t: TFn; total: number; page: number; mk: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / DIR_PAGE_SIZE))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '12px 0', fontSize: 12.5, color: '#6b7280', flexWrap: 'wrap' }}>
      <span>{t('dir.total', { n: total })} · {t('dir.page', { p: page + 1, m: pages })}</span>
      {page > 0 && <a href={mk(page - 1)} style={{ color: UI.primary, textDecoration: 'none' }}>{t('dir.prev')}</a>}
      {page + 1 < pages && <a href={mk(page + 1)} style={{ color: UI.primary, textDecoration: 'none' }}>{t('dir.next')}</a>}
    </div>
  )
}

export function EmployersView({ type, q, prov, page, aip, lmia, counts }: {
  type: 'lmia' | 'aip'; q: string; prov: string; page: number
  aip: AipRow[] | null; lmia: LmiaRow[] | null
  counts: { aip: number; lmia: number; pageTotal: number }
}) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)
  const [qInput, setQInput] = useState(q)
  const mk = (p: number) => href(type, q, prov, p)

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="employers" />
      <PageShell pad="2rem 1.25rem 32px">
        {/* 页头浅色带(B 模块蓝,循 #65 收口不发明新色;banner 图版留后续凑手) */}
        <PageBanner module="jobs" icon={<IconUsers />} title={t('dir.title')} sub={t('dir.sub')} />

        {/* tab 二分 + 搜索(表单 GET 刷新=每个结果页都有 URL,SEO 可抓) */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '0 0 12px' }}>
          <a href={href('lmia', '', '', 0)} style={{ ...chipStyle(type === 'lmia'), textDecoration: 'none', display: 'inline-block' }}>{t('dir.tab.lmia')} · {counts.lmia}</a>
          <a href={href('aip', '', '', 0)} style={{ ...chipStyle(type === 'aip'), textDecoration: 'none', display: 'inline-block' }}>{t('dir.tab.aip')} · {counts.aip}</a>
          <form action="/employers" method="get" style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {type !== 'lmia' && <input type="hidden" name="type" value={type} />}
            {prov && <input type="hidden" name="prov" value={prov} />}
            <input name="q" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder={t('dir.search')}
              style={{ border: `1px solid ${UI.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 13, minWidth: 180 }} />
            <button type="submit" style={{ border: 'none', background: UI.primary, color: '#fff', borderRadius: 8, padding: '5px 14px', fontSize: 13, cursor: 'pointer' }}>{t('dir.searchBtn')}</button>
          </form>
        </div>
        {/* AIP 省筛(名单只覆盖 NS/NB/NL) */}
        {type === 'aip' && (
          <div style={{ display: 'flex', gap: 6, margin: '0 0 12px', flexWrap: 'wrap' }}>
            {['', 'NS', 'NB', 'NL'].map((p) => (
              <a key={p || 'all'} href={href('aip', q, p, 0)} style={{ ...chipStyle(prov === p), textDecoration: 'none', display: 'inline-block' }}>{p ? t('pr.' + p) : t('all.prov')}</a>
            ))}
          </div>
        )}

        {/* 口径红线行(E6-02 语义:历史事实 ≠ 担保承诺) */}
        <div style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 12px', lineHeight: 1.6 }}>{t(type === 'lmia' ? 'dir.note.lmia' : 'dir.note.aip')}</div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            {type === 'lmia' ? (
              <>
                <thead><tr><th style={th}>{t('dir.col.employer')}</th><th style={th}>{t('dir.col.region')}</th><th style={{ ...th, cursor: 'help', textDecoration: 'underline dotted #d1d5db' }} title={t('dir.col.skilled.tip')}>{t('dir.col.skilled')}</th><th style={th}>{t('rank.col.lmia')}</th><th style={th}>{t('dir.col.streams')}</th><th style={th}>{t('dir.col.quarter')}</th><th style={th}></th></tr></thead>
                <tbody>
                  {(lmia || []).map((r) => (
                    <tr key={r.name}>
                      <td style={{ ...td, fontWeight: 600 }}>{r.website ? <a href={r.website} target="_blank" rel="noreferrer" style={{ color: UI.primary, textDecoration: 'none' }}>{r.name} ↗</a> : r.name}</td>
                      <td style={r.region ? td : { ...td, color: '#9ca3af' }}>{r.region || '—'}</td>
                      {/* B4-02:技能股列(High Wage/GTS)——「有 LMIA」≠「技能类担保信号」,0 显灰杠 */}
                      <td style={{ ...td, fontWeight: 600, color: r.lmiaPositionsSkilled ? UI.ok : '#9ca3af' }}>{r.lmiaPositionsSkilled ?? '—'}</td>
                      <td style={{ ...td, color: '#374151' }}>{r.lmiaPositions}</td>
                      <td style={{ ...td, fontSize: 12, maxWidth: 260 }}>{r.lmiaStreams || '—'}</td>
                      <td style={{ ...td, color: '#9ca3af' }}>{r.lmiaLastQuarter || '—'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}><a href={`/?q=${encodeURIComponent(r.name)}`} style={{ color: UI.primary, textDecoration: 'none', fontSize: 12.5 }}>{t('rank.viewJobs')}</a></td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead><tr><th style={th}>{t('dir.col.employer')}</th><th style={th}>{t('col.province')}</th><th style={th}>{t('col.city')}</th><th style={th}></th></tr></thead>
                <tbody>
                  {(aip || []).map((r, i) => (
                    <tr key={r.name + i}>
                      <td style={{ ...td, fontWeight: 600 }}>{r.name}{r.isTech && <> <Tag variant="region">{t('dir.tech')}</Tag></>}</td>
                      <td style={td}>{t('pr.' + r.province)}</td>
                      <td style={r.location ? td : { ...td, color: '#9ca3af' }}>{r.location || '—'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}><a href={`/?q=${encodeURIComponent(r.name)}`} style={{ color: UI.primary, textDecoration: 'none', fontSize: 12.5 }}>{t('rank.viewJobs')}</a></td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
          {counts.pageTotal === 0 && <div style={{ padding: '24px 16px', color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>{t('dir.empty')}</div>}
        </div>
        <Pager t={t} total={counts.pageTotal} page={page} mk={mk} />
      </PageShell>
      <SiteFooter t={t} />
    </div>
  )
}

'use client'
// 雇主名录视图(B4-01):纯渲染,数据 SSR 传入;筛选/搜索/翻页=URL 参数刷新(SEO 可抓每一页)。
// 付费透镜:名录免费=C7 头号痛点(哪个雇主真的担保)的 browse 面;转化钩=每行「查在招 →」深链 /?q=。
// 语义红线循 E6-02:LMIA=雇过外国人的历史事实 ≠ 能担保;AIP 指定 ≠ 有配额(口径行写死,见 dir.note.*)。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, type Lang, type TFn } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { Button, Card, CardAction, CardKV, PageBanner, PageShell, Tag, UI, chipStyle } from '../ui/primitives'
import { DataTable } from '../ui/DataTable'
import { IconUsers } from '../Icons'
import { DIR_PAGE_SIZE, type AipRow, type LmiaRow } from '@/lib/directory'
import { CMP_KEY, CMP_MAX } from '@/lib/employerCompareShared'

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

// ── E8-08 #121 手机域卡(Frank「按逻辑拆」:每域自己的卡组件,积木拼装;字段与桌面表同源)──
function EmployerLmiaCard({ r, lang, t, inCmp, onCmp }: { r: LmiaRow; lang: Lang; t: TFn; inCmp: boolean; onCmp: () => void }) {
  const alias = lang === 'zh' ? r.aliasZh : lang === 'ko' ? r.aliasKo : ''
  return (
    <Card>
      <button onClick={onCmp} style={{ position: 'absolute', right: 10, top: 10, border: '1px solid ' + (inCmp ? UI.primary : UI.border), background: inCmp ? '#eff6ff' : '#fff', color: inCmp ? UI.primary : '#6b7280', borderRadius: 999, padding: '2px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{inCmp ? t('ce.added') : t('ce.add')}</button>
      <div style={{ fontSize: 14.5, fontWeight: 600, paddingRight: 78 }}>
        {r.website ? <a href={r.website} target="_blank" rel="noreferrer" style={{ color: UI.primary, textDecoration: 'none' }}>{r.name} ↗</a> : r.name}
        {/* E12-08:裸「知名」Tag 退役(Frank「只显示知名不清楚」)——担保档药丸承接;无记录不显 */}
        {r.sponsorGrade != null && <span title={t('gr.sponsorTip')} style={{ marginLeft: 6, fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('gr.sponsorPill', { g: r.sponsorGrade })}</span>}
      </div>
      {(alias || r.industry) ? (
        <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 2 }}>
          {alias}{r.industry ? <span style={{ marginLeft: alias ? 6 : 0 }}><Tag variant="region">{t('broad.' + r.industry)}</Tag></span> : null}
        </div>
      ) : null}
      <CardKV items={[
        { k: t('dir.col.skilled'), v: <span style={{ fontWeight: 600, color: r.lmiaPositionsSkilled ? UI.ok : '#9ca3af' }}>{r.lmiaPositionsSkilled ?? '—'}</span> },
        { k: t('rank.col.lmia'), v: r.lmiaPositions },
        { k: t('dir.col.quarter'), v: <span style={{ color: '#9ca3af' }}>{r.lmiaLastQuarter || '—'}</span> },
      ]} />
      <CardAction><a href={`/?q=${encodeURIComponent(r.name)}`} style={{ color: UI.primary, textDecoration: 'none' }}>{t('rank.viewJobs')}</a></CardAction>
    </Card>
  )
}
function EmployerAipCard({ r, t }: { r: AipRow; t: TFn }) {
  return (
    <Card>
      <div style={{ fontSize: 14.5, fontWeight: 600 }}>{r.name}{r.isTech && <> <Tag variant="region">{t('dir.tech')}</Tag></>}</div>
      <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{t('pr.' + r.province)}</div>
      {r.location ? <CardKV items={[{ k: t('col.city'), v: r.location }]} /> : null}
      <CardAction><a href={`/?q=${encodeURIComponent(r.name)}`} style={{ color: UI.primary, textDecoration: 'none' }}>{t('rank.viewJobs')}</a></CardAction>
    </Card>
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
  // D3 对比选择篮(localStorage,与公司弹框共写;LMIA tab 行=companies 行才可比,AIP tab 不挂)
  const [cmp, setCmp] = useState<string[]>([])
  useEffect(() => { try { setCmp(JSON.parse(localStorage.getItem(CMP_KEY) || '[]')) } catch { /* ignore */ } }, [])
  const toggleCmp = (name: string) => setCmp((cur) => {
    const next = cur.includes(name) ? cur.filter((x) => x !== name) : cur.length >= CMP_MAX ? cur : [...cur, name]
    try { localStorage.setItem(CMP_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    return next
  })
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
            <Button sm style={{ fontSize: 13, padding: '5px 14px' }}>{t('dir.searchBtn')}</Button>
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

        {/* 组件统一 P2(2026-07-19 Frank「所有页面用同一个 table」):两张表换装公共 DataTable(排序/拖宽同 jobs 观感);
            排序=当前页内客户端排序(全量序仍由 URL 翻页的服务端默认序保证)。
            E8-08 #121:表卡双形态——桌面表(tcTableWrap),≤640 域卡(tcCards,CSS 双渲染) */}
        <div className="tcCards">
          {type === 'lmia'
            ? (lmia || []).map((r) => <EmployerLmiaCard key={r.name} r={r} lang={lang} t={t} inCmp={cmp.includes(r.name)} onCmp={() => toggleCmp(r.name)} />)
            : (aip || []).map((r, i) => <EmployerAipCard key={r.name + i} r={r} t={t} />)}
          {((type === 'lmia' ? lmia : aip) || []).length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>{t('dir.empty')}</div>}
        </div>
        <div className="tcTableWrap">
        {type === 'lmia' ? (
          <DataTable<LmiaRow> rows={lmia || []} rowKey={(r) => r.name} empty={t('dir.empty')} cols={[
            { key: 'name', label: t('dir.col.employer'), sort: (r) => r.name.toLowerCase(), render: (r) => {
              // 雇主 D:别名灰字随界面语言(Wikidata 官方标签不机翻)。
              // E12-08:裸「知名」Tag 退役——担保档药丸承接(Frank「能给各维度打分就好」);wiki 依据降级进公司分知名度维
              const alias = lang === 'zh' ? r.aliasZh : lang === 'ko' ? r.aliasKo : ''
              return <span style={{ fontWeight: 600 }}>
                {r.website ? <a href={r.website} target="_blank" rel="noreferrer" style={{ color: UI.primary, textDecoration: 'none' }}>{r.name} ↗</a> : r.name}
                {alias ? <span style={{ marginLeft: 6, color: '#9ca3af', fontWeight: 400, fontSize: 12 }}>{alias}</span> : null}
                {r.sponsorGrade != null && <span title={t('gr.sponsorTip')} style={{ marginLeft: 6, fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', whiteSpace: 'nowrap' }}>{t('gr.sponsorPill', { g: r.sponsorGrade })}</span>}
              </span> } },
            { key: 'industry', label: t('fact.coSectors'), sort: (r) => r.industry || null, render: (r) => r.industry ? <Tag variant="region">{t('broad.' + r.industry)}</Tag> : <span style={{ color: '#9ca3af' }}>—</span> },
            { key: 'region', label: t('dir.col.region'), render: (r) => r.region || <span style={{ color: '#9ca3af' }}>—</span> },
            { key: 'skilled', label: t('dir.col.skilled'), thTip: t('dir.col.skilled.tip'), nowrap: true, sort: (r) => r.lmiaPositionsSkilled ?? null, render: (r) => <span style={{ fontWeight: 600, color: r.lmiaPositionsSkilled ? UI.ok : '#9ca3af' }}>{r.lmiaPositionsSkilled ?? '—'}</span> },
            { key: 'lmia', label: t('rank.col.lmia'), nowrap: true, sort: (r) => r.lmiaPositions, render: (r) => <>{r.lmiaPositions}</> },
            { key: 'streams', label: t('dir.col.streams'), render: (r) => <span style={{ fontSize: 12, display: 'inline-block', maxWidth: 260 }}>{r.lmiaStreams || '—'}</span> },
            { key: 'quarter', label: t('dir.col.quarter'), nowrap: true, sort: (r) => r.lmiaLastQuarter || null, render: (r) => <span style={{ color: '#9ca3af' }}>{r.lmiaLastQuarter || '—'}</span> },
            { key: 'go', label: '', nowrap: true, render: (r) => <a href={`/?q=${encodeURIComponent(r.name)}`} style={{ color: UI.primary, textDecoration: 'none', fontSize: 12.5 }}>{t('rank.viewJobs')}</a> },
            // D3(E5-06):对比选择钮——免费可点(FOMO 引流,Pro 闸在对比页)
            { key: 'cmp', label: '', nowrap: true, render: (r) => (
              <button onClick={() => toggleCmp(r.name)} style={{ border: '1px solid ' + (cmp.includes(r.name) ? UI.primary : UI.border), background: cmp.includes(r.name) ? '#eff6ff' : '#fff', color: cmp.includes(r.name) ? UI.primary : '#6b7280', borderRadius: 999, padding: '2px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {cmp.includes(r.name) ? t('ce.added') : t('ce.add')}
              </button>
            ) },
          ]} />
        ) : (
          <DataTable<AipRow> rows={aip || []} rowKey={(r, i) => r.name + i} empty={t('dir.empty')} cols={[
            { key: 'name', label: t('dir.col.employer'), sort: (r) => r.name.toLowerCase(), render: (r) => <span style={{ fontWeight: 600 }}>{r.name}{r.isTech && <> <Tag variant="region">{t('dir.tech')}</Tag></>}</span> },
            { key: 'prov', label: t('col.province'), nowrap: true, sort: (r) => r.province, render: (r) => <>{t('pr.' + r.province)}</> },
            { key: 'city', label: t('col.city'), sort: (r) => r.location || null, render: (r) => r.location || <span style={{ color: '#9ca3af' }}>—</span> },
            { key: 'go', label: '', nowrap: true, render: (r) => <a href={`/?q=${encodeURIComponent(r.name)}`} style={{ color: UI.primary, textDecoration: 'none', fontSize: 12.5 }}>{t('rank.viewJobs')}</a> },
          ]} />
        )}
        </div>
        <Pager t={t} total={counts.pageTotal} page={page} mk={mk} />
        {/* D3 对比浮条:选 ≥1 家出现;≥2 家可去对比 */}
        {cmp.length > 0 && (
          <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 18, zIndex: 40, background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 999, boxShadow: '0 10px 30px rgba(0,0,0,.12)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
            <span style={{ color: '#374151', fontWeight: 600 }}>{t('ce.bar', { n: cmp.length })}</span>
            {cmp.length >= 2 && <a href={`/employers/compare?names=${encodeURIComponent(cmp.join('|'))}`} style={{ color: UI.primary, fontWeight: 600, textDecoration: 'none' }}>{t('ce.go')}</a>}
            <button onClick={() => { try { localStorage.removeItem(CMP_KEY) } catch { /* ignore */ } ; setCmp([]) }} style={{ border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, fontSize: 12.5 }}>{t('ce.clear')}</button>
          </div>
        )}
      </PageShell>
      <SiteFooter t={t} />
    </div>
  )
}

'use client'
// 雇主板(2026-08-16 Frank「这个雇主页面是不是应该参考 jobtables 页面整体创建。要加上筛选条件」)。
// 站规 jobtable-is-the-standard:形态一律照职位板 —— 常用一行(搜索/口径/省/制度)+「更多筛选」折叠、
// 桌面 Table / ≤640 JobCard 卡片流(全站唯一卡片件)、Pager 翻页。两个入口合并成本组件一套版式。
//
// 🔴 性能(#313 同款):名录 6,680 行不进 SSR payload —— SSR 只给第一页 + total,
//    换筛选/翻页打 /api/employers 懒取;失败保底继续显示手上这一页,不白屏。
// 🔴 口径:被指定 ≠ 在招;在招数是本站职位库口径。雇主名本身就是「看该雇主在招」的直达(/jobs?q=名)——
//    再单开一列同一个落点是 08-10 拍过的重复入口,不做。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  EMP_PROGRAMS, type EmployerFilters, type EmployerPage, type EmployerRow,
} from '@/lib/designatedEmployers'
import { pickName } from '@/lib/occName'
import { BackLink } from '../BackLink'
import { useLang } from '../LangProvider'
import { Footer } from '../Footer'
import { Header } from '../Header'
import { Table, Pager, type Col } from '../ui'
import { JobCard } from '../ui'
import { Button, Shell, UI } from '../ui'
import type { Lang, TFn } from '../jobs/i18n'

// 下拉:职位板 Sel 同规格(高 38、圆角 6、镜像文本贴宽不留空白);className=sbCtl 拿到既有的
// 手机断点 min-height:44 触控靶(main.css #276),不新造一套 CSS
const ctrl: React.CSSProperties = { height: 38, boxSizing: 'border-box', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#1f2937', background: '#fff', fontFamily: 'inherit' }
const filtRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
const filtLabel: React.CSSProperties = { fontSize: 12, color: UI.text3, minWidth: 28, whiteSpace: 'nowrap' }

function Sel({ value, onChange, opts, all, labelOf }: {
  value: string; onChange: (v: string) => void; opts: string[]; all: string; labelOf?: (v: string) => string
}) {
  const list = value && !opts.includes(value) ? [value, ...opts] : opts
  const shown = value ? (labelOf ? labelOf(value) : value) : all
  return (
    <span style={{ position: 'relative', display: 'inline-block', maxWidth: 170 }}>
      <span aria-hidden style={{ ...ctrl, display: 'block', visibility: 'hidden', paddingRight: 38, whiteSpace: 'nowrap', overflow: 'hidden', border: '1px solid transparent' }}>{shown}</span>
      <select className="sbCtl" value={value} onChange={(e) => onChange(e.target.value)} style={{ ...ctrl, position: 'absolute', inset: 0, width: '100%' }}>
        <option value="">{all}</option>
        {list.map((o) => <option key={o} value={o}>{labelOf ? labelOf(o) : o}</option>)}
      </select>
    </span>
  )
}

const provName = (t: TFn, code: string) => {
  const v = t('pr.' + code)
  return v && v !== 'pr.' + code ? v : code
}

/** 职业显示:人话名主文案 + 5 位码灰注(站规 ui-plain-language);字典缺名的码原样显示码 */
function nocLabel(noc: string, titles: EmployerPage['nocTitles'], lang: Lang): string {
  const r = titles[noc]
  return pickName(r ? { title: r.en, titleZh: r.zh, titleKo: r.ko } : null, lang) || noc
}

/** 一行的职业格:选了职业就只显那条;名录没写职业 → 未列明(灰),**不是**「不招」 */
function nocCell(r: EmployerRow, f: EmployerFilters, titles: EmployerPage['nocTitles'], lang: Lang, t: TFn) {
  if (r.nocs.length === 0) return <span style={{ color: UI.text3 }}>{t('de.nocNone')}</span>
  const picked = f.noc && r.nocs.includes(f.noc) ? [f.noc] : r.nocs.slice(0, 2)
  const rest = r.nocs.length - picked.length
  const names = picked.map((n) => nocLabel(n, titles, lang)).join(t('de.sep'))
  const codes = picked.join(t('de.sep'))
  return (
    <>
      <span>{names}</span>
      {rest > 0 ? <span style={{ color: UI.text3 }}>{t('de.nocMore', { n: rest })}</span> : null}
      {/* 代码灰注(站规 ui-plain-language);字典没这个码时主文案已经是码本身,不再重复一遍 */}
      {names !== codes ? <div style={{ color: UI.text3, fontSize: 11.5, marginTop: 1 }}>{codes}</div> : null}
    </>
  )
}

const jobsHref = (name: string) => `/jobs?q=${encodeURIComponent(name)}`

export function Employers({ initial, initialFilters }: { initial: EmployerPage; initialFilters: EmployerFilters }) {
  const [lang, setLangSaved, t] = useLang()
  const [f, setF] = useState<EmployerFilters>(initialFilters)
  const [data, setData] = useState<EmployerPage>(initial)
  const [loading, setLoading] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [qDraft, setQDraft] = useState(initialFilters.q)
  const first = useRef(true)

  // 搜索框防抖 300ms 才进筛选(每敲一个字打一次 API 是拿生产池当草稿纸)
  useEffect(() => {
    if (qDraft === f.q) return
    const id = setTimeout(() => setF((p) => ({ ...p, q: qDraft, page: 0 })), 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (f.program) p.set('program', f.program)
    if (f.prov) p.set('prov', f.prov)
    if (f.city) p.set('city', f.city)
    if (f.noc) p.set('noc', f.noc)
    if (f.q) p.set('q', f.q)
    if (f.page > 0) p.set('page', String(f.page))
    return p.toString()
  }, [f])

  // 筛选状态进 URL(深链可分享,同职位板惯例):口径走路径段,其余走 query。
  // replaceState 而非跳转 —— 换筛选不该在历史里堆一串条目,也不该整页重载。
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const url = `/employers/${f.mode}${qs ? '?' + qs : ''}`
    window.history.replaceState(null, '', url)
    const ctl = new AbortController()
    setLoading(true)
    fetch(`/api/employers?mode=${f.mode}${qs ? '&' + qs : ''}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: EmployerPage | null) => { if (j) setData(j) })   // 挂了保留手上这一页,不白屏
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctl.abort()
  }, [f.mode, qs])

  const set = useCallback((patch: Partial<EmployerFilters>) => setF((p) => ({ ...p, ...patch, page: 0 })), [])
  const designated = f.mode === 'designated'
  const anyFilter = !!(f.program || f.prov || f.city || f.noc || f.q)
  const foldActive = (f.city ? 1 : 0) + (f.noc ? 1 : 0)
  const titles = data.nocTitles

  // 标题=口径名,范围不进 H1(职位板同款:H1 只说这是什么板,省/制度就在下面那行筛选里摆着)。
  // 375 实测:「新斯科舍 AIP 指定雇主名录」折两行 —— 站规「一行放下不折行」,删到一行
  const title = designated ? t('de.title') : t('de.hiringTitle')

  // 名录出处列:本批一行都没有 url 就整列不出(容缺先例同 hasVerdictSignal —— 不渲染一列全「—」)
  const hasList = data.rows.some((r) => r.url)
  const cols: Col<EmployerRow>[] = designated
    ? [
        { key: 'name', label: t('de.colName'), width: hasList ? '34%' : '37%', sort: (r) => r.name.toLowerCase(), render: (r) => <a href={jobsHref(r.name)} title={t('rank.viewJobs')} style={{ color: UI.primary, textDecoration: 'none', fontWeight: 600 }}>{r.name}</a> },
        { key: 'where', label: t('de.colWhere'), width: hasList ? '22%' : '24%', sort: (r) => r.where || provName(t, r.province), render: (r) => <>{r.where || provName(t, r.province)}</> },
        { key: 'program', label: t('de.colProgram'), width: hasList ? '13%' : '14%', nowrap: true, sort: (r) => r.program, render: (r) => <>{r.program || '—'}</> },
        { key: 'noc', label: t('de.colNoc'), width: hasList ? '23%' : '25%', sort: (r) => r.nocs.length, render: (r) => nocCell(r, f, titles, lang, t) },
        ...(hasList ? [{ key: 'list', label: t('de.colList'), width: '8%', nowrap: true, render: (r: EmployerRow) => (r.url ? <a href={r.url} target="_blank" rel="noreferrer" style={{ color: UI.primary, textDecoration: 'none', fontSize: 12.5 }}>{t('de.list')}</a> : <span style={{ color: UI.text3 }}>—</span>) }] : []),
      ]
    : [
        { key: 'name', label: t('de.colName'), width: '46%', sort: (r) => r.name.toLowerCase(), render: (r) => <a href={jobsHref(r.name)} title={t('rank.viewJobs')} style={{ color: UI.primary, textDecoration: 'none', fontWeight: 600 }}>{r.name}</a> },
        { key: 'where', label: t('de.colWhere'), width: '32%', sort: (r) => r.where || provName(t, r.province), render: (r) => <>{r.where || provName(t, r.province)}</> },
        { key: 'open', label: t('dp.planOpen'), width: '22%', nowrap: true, align: 'right', sort: (r) => r.openJobs ?? 0, render: (r) => <span style={{ fontWeight: 700 }}>{r.openJobs ?? 0}</span> },
      ]

  const maxPage = Math.max(1, Math.ceil(data.total / (data.pageSize || 50)))
  // 空态说清是哪一种:没筛选还空 = 本站没这份数据;筛过了才空 = 查无匹配(改筛选再试);
  // 在招口径连省或职业都还没选 —— 那不是「0 家」,是还没圈定范围,连计数都不该报
  const needScope = !designated && !(f.prov && f.noc)
  const note = needScope ? '' : anyFilter ? t('de.hits', { n: data.total }) : t('de.count', { n: data.total })
  const empty = needScope ? t('de.hiringNeed')
    : anyFilter ? t('de.emptyFiltered')
      : designated ? t('de.empty') : t('de.hiringEmpty')

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <Header lang={lang} setLang={setLangSaved} t={t} active="employers" />
      <div style={{ flex: '1 0 auto' }}>
        <Shell pad="1rem 1.25rem 40px">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, margin: '0 0 12px' }}>
            <h1 style={{ flex: 1, minWidth: 0, fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.45 }}>{title}</h1>
            <BackLink href="/plan/pr" label={t('de.back')} />
          </div>

          <div style={{ background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '14px 16px' }}>
            {/* 常用一行:搜索 / 口径 / 省 / 制度 + 更多筛选折叠(激活计数徽标)——职位板同一套 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <div style={filtRow}>
                <input className="sbCtl" placeholder={t('de.qPh')} value={qDraft} onChange={(e) => setQDraft(e.target.value)} enterKeyHint="search"
                  style={{ ...ctrl, flex: '0 1 240px', minWidth: 150 }} />
                <Sel value={f.mode} onChange={(v) => set({ mode: (v || 'designated') as EmployerFilters['mode'], program: v === 'hiring' ? '' : f.program, city: '' })}
                  opts={['designated', 'hiring']} all={t('de.mode')} labelOf={(v) => t('de.mode.' + v)} />
                <Sel value={f.prov} onChange={(v) => set({ prov: v, city: '' })} opts={data.facets.provs} all={t('all.prov')} labelOf={(c) => provName(t, c)} />
                {designated && <Sel value={f.program} onChange={(v) => set({ program: v, city: '' })} opts={[...EMP_PROGRAMS]} all={t('de.allProgram')} />}
                <Button kind="secondary" className="sbCtl" onClick={() => setDrawer((o) => !o)}
                  style={{ height: 38, display: 'inline-flex', alignItems: 'center', gap: 5, color: '#374151', ...(drawer || foldActive ? { background: '#eff6ff', borderColor: UI.primary, color: '#1d4ed8' } : {}) }}>
                  {t('filter.more')}
                  {foldActive > 0 && <span style={{ background: UI.primary, color: '#fff', borderRadius: 999, fontSize: 10.5, padding: '0 6px', lineHeight: '15px' }}>{foldActive}</span>}
                  <span style={{ fontSize: 10, color: UI.text3 }}>{drawer ? '▲' : '▼'}</span>
                </Button>
                {anyFilter && (
                  <Button kind="secondary" className="sbCtl" onClick={() => { setQDraft(''); setF({ mode: f.mode, program: '', prov: '', city: '', noc: '', q: '', page: 0 }) }}
                    style={{ height: 38, color: '#b91c1c' }}>{t('clear')}</Button>
                )}
                {data.fetched ? <span style={{ marginLeft: 'auto', fontSize: 11.5, color: UI.text3, whiteSpace: 'nowrap' }}>{t('dir.occ.fetched', { d: data.fetched })}</span> : null}
              </div>
              {drawer && (
                <div style={{ border: '1px dashed #d1d5db', borderRadius: 8, padding: '10px 12px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={filtRow}>
                    <span style={filtLabel}>{t('de.fGeo')}</span>
                    <Sel value={f.city} onChange={(v) => set({ city: v })} opts={data.facets.cities} all={t('de.allCity')} />
                  </div>
                  <div style={filtRow}>
                    <span style={filtLabel}>{t('de.fOcc')}</span>
                    <Sel value={f.noc} onChange={(v) => set({ noc: v })} opts={data.facets.nocs} all={t('de.allNoc')} labelOf={(n) => nocLabel(n, titles, lang)} />
                  </div>
                </div>
              )}
            </div>

            {/* 加载条占位:高度常驻,数据在换时表格半透明 —— 不出现「行没了又回来」的跳动 */}
            <div style={{ height: 18, fontSize: 12.5, color: UI.primary, display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && (<>
                <span style={{ width: 10, height: 10, border: `2px solid #bfdbfe`, borderTopColor: UI.primary, borderRadius: '50%', display: 'inline-block', animation: 'empspin .7s linear infinite' }} />
                {t('loading')}
                <style>{`@keyframes empspin{to{transform:rotate(360deg)}}`}</style>
              </>)}
            </div>

            <div style={{ minHeight: 220, ...(loading ? { opacity: 0.45, pointerEvents: 'none', transition: 'opacity .2s' } : {}) }}>
              {/* 桌面表格 / 手机卡片,两套 DOM 各渲各的(站规:电脑用表格、手机用卡片) */}
              <div className="empTable">
                <Table<EmployerRow> rows={data.rows} cols={cols} rowKey={(r) => `${r.where}:${r.name}`} empty={empty} bare
                  header={<div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '2px 2px 8px' }}><span style={{ fontSize: 13.5, fontWeight: 700 }}>{note}</span></div>} />
              </div>
              <div className="empCards">
                <div style={{ fontSize: 13.5, fontWeight: 700, padding: '2px 2px 8px' }}>{note}</div>
                {data.rows.map((r) => (
                  <JobCard key={`${r.where}:${r.name}`}
                    href={jobsHref(r.name)}
                    // 手机触控靶:卡内标题链只有 23px 高 —— 整张卡都可点(卡本身 ≥70px),
                    // 点在标题上时交给 <a> 自己走,不重复导航
                    onCardClick={(e) => { if (!(e.target as HTMLElement).closest('a')) window.location.href = jobsHref(r.name) }}
                    title={{ text: r.name, href: jobsHref(r.name), title: t('rank.viewJobs') }}
                    // 卡上没有列名撑着,「未列明」单摆会被读成「不知道这家招什么」——带上列名才说得清是名录没写
                    note={designated ? (r.nocs.length === 0 ? `${t('de.colNoc')} ${t('de.nocNone')}` : r.nocs.slice(0, 2).map((n) => nocLabel(n, titles, lang)).join(t('de.sep'))) : undefined}
                    location={r.where || provName(t, r.province)}
                    salary={designated ? undefined : t('dp.planJobsN', { n: r.openJobs ?? 0 })}
                    chips={designated && r.program ? <span style={{ background: '#eef2ff', color: '#3730a3', borderRadius: 6, padding: '1px 7px', fontSize: 11.5, fontWeight: 600 }}>{r.program}</span> : undefined}
                  />
                ))}
                {data.rows.length === 0 && <div style={{ padding: '24px 12px', color: UI.text3, fontSize: 13, textAlign: 'center' }}>{empty}</div>}
              </div>
              {data.total > 0 && (
                <div style={{ padding: '10px 2px 0', borderTop: `1px solid ${UI.hairline}`, marginTop: 8 }}>
                  <Pager page={Math.min(f.page, maxPage - 1)} max={maxPage} onPage={(p) => setF((prev) => ({ ...prev, page: p }))} />
                </div>
              )}
            </div>

            {/* 口径注(保留类文案,一句):被指定 ≠ 在招 */}
            <div style={{ marginTop: 10, fontSize: 12, color: UI.text3, lineHeight: 1.6 }}>{t('de.note')}</div>
          </div>
        </Shell>
      </div>
      <Footer t={t} />
      <style>{`
        .empTable{display:none}
        .empCards{display:flex;flex-direction:column;gap:8px}
        @media (min-width:641px){
          .empTable{display:block}
          .empCards{display:none}
        }
      `}</style>
    </div>
  )
}

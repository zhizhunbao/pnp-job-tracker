'use client'
// 地区统计弹窗(E8-02,2026-07-06 拍板「所有都弹窗」):内容组件与 /stats/* 页面同一份(views.tsx *Content);
// 页面里的 <a href="/stats/..."> 在这里被点击拦截转为弹窗内 state 导航(总览⇄省⇄大类⇄对比),
// 「看职位」(/jobs?prov=&broad=)则关弹窗并把筛选直接应用到列表 —— 全程不跳页。/stats/* 页保留给 SEO。
import { useEffect, useState } from 'react'
import type { TFn } from './i18n'
import { Modal } from './Modal'
import { StatsIndexContent, StatsProvContent, StatsCatContent, CompareContent } from '../stats/views'
import { PROV_NAME, slugToBroad, type StatRow, type SrcRow } from '../stats/shared'

type Data = { rows: StatRow[]; srcs: SrcRow[]; isPro: boolean; loggedIn: boolean; myNocs: string[] }
type Nav = { view: 'index' } | { view: 'prov'; prov: string } | { view: 'cat'; prov: string; broad: string } | { view: 'compare' }

export function StatsModal({ t, onClose, onApplyFilters }: { t: TFn; onClose: () => void; onApplyFilters: (prov: string, broad: string) => void }) {
  const [data, setData] = useState<Data | null>(null)
  const [nav, setNav] = useState<Nav>({ view: 'index' })
  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const r = await fetch('/api/stats-data', { credentials: 'include' })
        if (!r.ok) return
        const d = await r.json()
        if (!dead) setData(d)
      } catch { /* 网络失败留加载态,重开可重试 */ }
    })()
    return () => { dead = true }
  }, [])

  // 内容组件里的原生 <a> 统一在此拦截:/stats* → 弹窗内导航;/jobs?… → 应用筛选并关弹窗
  const intercept = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a')
    if (!a) return
    const href = a.getAttribute('href') || ''
    if (href.startsWith('/jobs?')) {
      e.preventDefault()
      const sp = new URLSearchParams(href.slice('/jobs'.length))
      onApplyFilters(sp.get('prov') || '', sp.get('broad') || '')
      onClose()
      return
    }
    if (!href.startsWith('/stats')) return  // 外链(citation 等)原样放行
    e.preventDefault()
    const seg = href.split('?')[0].split('/').filter(Boolean).slice(1)  // ['on','tech'] | ['compare'] | []
    if (!seg.length) { setNav({ view: 'index' }); return }
    if (seg[0] === 'compare') { setNav({ view: 'compare' }); return }
    const prov = seg[0].toUpperCase()
    if (!PROV_NAME[prov]) return
    if (seg.length === 1) { setNav({ view: 'prov', prov }); return }
    const broad = slugToBroad(seg[1])
    if (broad) setNav({ view: 'cat', prov, broad })
  }

  let body: React.ReactNode = <p style={{ margin: '14px 0', fontSize: 13.5, color: '#9ca3af' }}>{t('act.loadingText')}</p>
  if (data) {
    if (nav.view === 'index') body = <StatsIndexContent rows={data.rows} srcs={data.srcs} t={t} />  // E8-06:图表要全量行,省卡组件内自 filter
    else if (nav.view === 'prov') body = <StatsProvContent prov={nav.prov} rows={data.rows.filter((r) => r.province === nav.prov)} srcs={data.srcs} t={t} />
    else if (nav.view === 'cat') {
      const row = data.rows.find((r) => r.province === nav.prov && r.broad === nav.broad)
      body = row ? <StatsCatContent prov={nav.prov} row={row} srcs={data.srcs} t={t} /> : null
    } else body = <CompareContent rows={data.rows} srcs={data.srcs} isPro={data.isPro} loggedIn={data.loggedIn} myNocs={data.myNocs} t={t} />
  }
  return (
    <Modal onClose={onClose} size="lg">
      <div onClickCapture={intercept} style={{ paddingRight: 30 }}>{body}</div>
    </Modal>
  )
}

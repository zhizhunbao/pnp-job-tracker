'use client'
// 刀 1 · 职位详情页的报告入口(设计:docs/design/流量落点与决策入口下沉-20260731.md §4)。
//
// 为什么在这:近 30 天数据里,超过一半访客从 Google 落在**某一张职位详情页**,进哪页就从哪页走
// (入口页与出口页几乎是同一张表),而决策入口全挂在 /start —— 人和门不在一个地方。
//
// 硬约束(别放宽):
//   ① **自包含**:本组件自己取数、自己决定渲不渲;详情页只多一行挂载,老结构一个字不动(Frank 拍板);
//   ② 不新写 SQL、不新开端点 —— 复用 `/api/quiz?noc=`(三问结果同源),滚动到可见才请求
//      (这是全站流量最大的页,不能每个 PV 都白打一次接口);
//   ③ 数字全是库里的真数,并且**标清口径**:前两行是本省,第三行是全国帖面中位(混着说就是骗人);
//   ④ 拿不到数 / 本省零在招 → 整卡不渲,不出空壳。
import { useEffect, useRef, useState } from 'react'

import { UI } from '../../ui/primitives'
import { track } from '@/lib/track'
import type { TFn } from '../i18n'

type Facts = {
  open: number; eligible: number; named: number; medianSalary: number | null
  byProv: { province: string; n: number; eligible: number }[]
}

// 标题里用省码(BC/ON):provName 的全称是「British Columbia(不列颠哥伦比亚省)」,
// 放进卡头会把一行标题撑成两行,而这页正文早就说清是哪个省了
export function OccReportCard({ noc, province, t }: { noc: string; province: string; t: TFn }) {
  const box = useRef<HTMLDivElement | null>(null)
  const [facts, setFacts] = useState<Facts | null>(null)

  // 懒取:进视口才拉(IntersectionObserver 是平台自带的,不引库)
  useEffect(() => {
    if (!/^\d{5}$/.test(noc) || !box.current) return
    let dead = false
    const el = box.current
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      fetch(`/api/quiz?noc=${encodeURIComponent(noc)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!dead) setFacts(d?.facts ?? null) })
        .catch(() => { /* 拿不到就不渲,不打扰 */ })
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => { dead = true; io.disconnect() }
  }, [noc])

  const here = facts?.byProv.find((r) => r.province === province)
  const show = Boolean(facts && here && here.n > 0)

  return (
    <div ref={box}>
      {show && here && facts && (
        <div style={{ background: '#f8fbff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 16px', margin: '12px 0 0' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: UI.primaryDeep, marginBottom: 10 }}>{t('jd.rep.t', { prov: province })}</div>
          <Row k={t('jd.rep.open')} v={String(here.n)} />
          <Row k={t('jd.rep.elig')} v={String(here.eligible)} />
          {facts.medianSalary != null && <Row k={t('jd.rep.med')} v={`$${Math.round(facts.medianSalary / 1000)}K`} />}
          {/* 直接落报告态:卡上写的是「看报告」,落地却是两道题=说话不算数。
              引擎不给目标省也算得出(按在招量取前两个省),缺的两题在报告里作缺口行请他补 */}
          <a href={`/plan/job?noc=${encodeURIComponent(noc)}&view=report`} onClick={() => track('jd-report-open', { noc })}
            style={{ display: 'inline-block', marginTop: 10, color: UI.primary, fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>
            {t('jd.rep.go')} →
          </a>
        </div>
      )}
    </div>
  )
}

// 一行=一个口径,左名右数(全站表格同款右对齐数字)
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '6px 0', borderBottom: '1px solid #e6eefc', fontSize: 13.5 }}>
      <span style={{ color: UI.text2, minWidth: 0 }}>{k}</span>
      <b style={{ fontSize: 15, flexShrink: 0 }}>{v}</b>
    </div>
  )
}

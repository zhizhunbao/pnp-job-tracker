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
import type { TFn } from '../i18n'

type Facts = {
  open: number; eligible: number; named: number; medianSalary: number | null
  byProv: { province: string; n: number; eligible: number }[]
  sponsors: number
}

// M1(主线,2026-08-01):**锁区铺到人真正落地的地方**。
// 30 天数据:入口=出口=职位详情页、67.5% 只看一页、/pricing 30 天只被打开 1 次 ——
// 锁区一直挂在报告页里,而人根本走不到那儿。这里直接把锁行摆在他眼前(只摆标题与家数,名单仍在服务端锁着)。
// 两条不能破:①**有货才挂**(sponsors=0 就不出锁行,不卖不存在的东西);
//            ②免费的那半必须先给足(在招/可提名/中位薪资/本岗 vs 中位)——aha 在掏钱之前。
// 埋点是 M2 的原料:lock-seen(曝光,进视口才算,一次)/ lock-click(点了)。
//
// 标题里用省码(BC/ON):provName 的全称是「British Columbia(不列颠哥伦比亚省)」,
// 放进卡头会把一行标题撑成两行,而这页正文早就说清是哪个省了
export function OccReportCard({ noc, province, salaryAnnual, t }: { noc: string; province: string; salaryAnnual: number | null; t: TFn }) {
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
  // 本岗年薪 vs 该职业全国帖面中位:差 5% 以内不说话(噪音),两边有一个没有也不说
  const med = facts?.medianSalary ?? null
  const raw = salaryAnnual != null && med != null && med > 0 ? Math.round(((salaryAnnual - med) / med) * 100) : null
  const pct = raw != null && Math.abs(raw) >= 5 ? raw : null

  return (
    <div ref={box}>
      {show && here && facts && (
        <div style={{ background: '#f8fbff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 16px', margin: '12px 0 0' }}>
          {/* 标题删了(2026-07-31 Frank「上面导航本来就有显示省份,多此一举」):口径写进每行标签即可。
              第一行改成**对眼前这个岗的判断**——用户正在看它,「这个岗比同职业中位高/低多少」
              比三行统计更有点开的理由(数都是库里的:本岗年薪 vs 该职业全国帖面中位)。 */}
          {pct != null && (
            <div style={{ fontSize: 14.5, fontWeight: 700, color: pct >= 0 ? '#047857' : '#b45309', lineHeight: 1.5, marginBottom: 10 }}>
              {t(pct >= 0 ? 'jd.rep.vsHi' : 'jd.rep.vsLo', { pct: Math.abs(pct) })}
            </div>
          )}
          <Row k={t('jd.rep.open', { prov: province })} v={String(here.n)} />
          <Row k={t('jd.rep.elig')} v={String(here.eligible)} />
          {facts.medianSalary != null && <Row k={t('jd.rep.med')} v={`$${Math.round(facts.medianSalary / 1000)}K`} />}
          {/* 锁行删了(2026-08-03 Frank「没有必要了」):与报告按钮同链接纯重复,
              且「N 家雇主」是全国口径贴在本省数字旁读着打架。
              jd-lock-seen/click 随之退役,漏斗第 3 步只剩 rpt-lock-seen 一条真口径 */}
          {/* 「看报告」按钮(→ /plan/job?view=report,埋点 jd-report-open)2026-08-04 摘除:
              答题卡功能摘入口、保留路由。这张卡剩下的是本岗行情事实(vs 中位 / 本省在招 / 可提名 /
              全国中位年薪),自己就成立,所以卡本身保留 —— 只是不再往站外功能送人 */}
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

'use client'
// C6 · 职位详情页通道卡(卡位=已摘的 OccReportCard;设计 docs/design/对话选项卡与图片上传-20260806.md §五)。
//
// v1 = **无档案通用态**:13 条通道按工作经验门槛从低到高铺名单(/api/ruling/pathways 纯查表),
// 清单排除的划线沉底;CTA 拉起对话挂件并预填路径问句(个性化态等档案存续拍板,设计 §五「双态」)。
//
// 硬约束(照 OccReportCard 原样):
//   ① 自包含:自己取数、自己决定渲不渲,详情页只多一行挂载;
//   ② 进视口才请求(全站流量最大的页,不白打接口;服务端另有 10 分钟数据缓存);
//   ③ 拿不到数 / 名单为空 → 整卡不渲,不出空壳;
//   ④ 文案铁律:零逗号、省名不裸码、禁口语腔(通道名全走 i18n jpw.p.* 人话名)。
import { useEffect, useRef, useState } from 'react'

import { UI } from '@/components/colors'
import type { TFn } from '@/lib/i18n'
import { track } from '@/lib/track'

type Row = {
  key: string
  months: number | null
  tenure: boolean
  listedIn: boolean
  excludedByList: boolean
  availability: string
}

export function PathwaysCard({ noc, teer, prefill, t }: { noc: string; teer: number | null; prefill: string; t: TFn }) {
  const box = useRef<HTMLDivElement | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    if (!/^\d{5}$/.test(noc) || !box.current) return
    let dead = false
    const el = box.current
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      track('pw-seen')
      fetch(`/api/ruling/pathways?noc=${encodeURIComponent(noc)}${teer != null ? `&teer=${teer}` : ''}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!dead) setRows(Array.isArray(d?.rows) ? d.rows : null) })
        .catch(() => { /* 拿不到就不渲,不打扰 */ })
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => { dead = true; io.disconnect() }
  }, [noc, teer])

  // 行尾灰注:一行只说一件事 —— 排除 > 未收录 > 月数(排序键必须行行可见,清单点名信号留给对话层;
  //   生产实测 NS/BC/MB 四条都有清单命中,拿它盖掉月数会让「按经验门槛排列」这句小注失去对照物)
  const note = (r: Row): string => {
    if (r.excludedByList) return t('jpw.n.ex')
    if (r.availability !== 'ok' || r.months == null) return t('jpw.n.na')
    if (r.months === 0) return t('jpw.n.none')
    return t(r.tenure ? 'jpw.n.tenure' : 'jpw.n.m', { n: r.months })
  }

  const openChat = () => {
    track('pw-cta')
    window.dispatchEvent(new CustomEvent('o2p:chat-open', { detail: { prefill } }))
  }

  return (
    <div ref={box}>
      {rows && rows.length > 0 && (
        <div style={{ background: '#f8fbff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 16px', margin: '12px 0 0' }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#111827', lineHeight: 1.5 }}>{t('jpw.title')}</div>
          <div style={{ fontSize: 12, color: UI.text2, lineHeight: 1.5, margin: '1px 0 4px' }}>{t('jpw.sub')}</div>
          {rows.map((r) => (
            <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: '1px solid #e6eefc', fontSize: 13.5 }}>
              <span style={{
                minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                color: r.excludedByList ? UI.text3 : UI.text,
                textDecoration: r.excludedByList ? 'line-through' : 'none',
              }}>{t(`jpw.p.${r.key}`)}</span>
              <i style={{
                fontStyle: 'normal', fontSize: 12, flexShrink: 0, whiteSpace: 'nowrap',
                color: r.excludedByList ? UI.warn : r.months === 0 && !r.listedIn && r.availability === 'ok' ? UI.ok : UI.text2,
                fontWeight: r.months === 0 && !r.excludedByList && r.availability === 'ok' ? 700 : 400,
              }}>{note(r)}</i>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={openChat} style={{ background: UI.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>
              {t('jpw.cta')}
            </button>
            <div style={{ fontSize: 11.5, color: UI.text3, lineHeight: 1.5 }}>{t('jpw.foot')}</div>
          </div>
        </div>
      )}
    </div>
  )
}

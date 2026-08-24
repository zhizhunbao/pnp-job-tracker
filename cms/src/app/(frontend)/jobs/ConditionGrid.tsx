'use client'
// 申请人条件格子(2026-08-13 Frank:「按不同的省份划分不同的问题,改成 tab 切换」)。
// 共用题(基础 8 项 + 学历/经验/语言/年龄等全省通用的分值题)平铺在上;
// 省专属题按省分组进真选项卡(ui/Tabs,badge=该省还没答几题)。
// 摘要卡与带岗态判定卡②共用本组件 —— 同一种东西一个长相。
import { useState } from 'react'
import { Tabs, TabPanel } from '@/components/ui'

export type ConditionRow = {
  key: string; prov: string; label: string; value: string; filled: boolean
  /** 小类别(2026-08-16):十几个格子平铺看不出结构。同组的挨在一起,组序=下面 GROUPS 的顺序 */
  group?: string
  /** 与当前岗位不匹配的小标(2026-08-14 Frank「加个图标标一下」):琥珀 ⚠ 胶囊,不带长句 */
  warn?: string
}

export function ConditionGrid({ rows, provLabel, onTile, ariaLabel, idPrefix, only, province, flat }: {
  rows: ConditionRow[]
  provLabel: (code: string) => string
  /** 点哪格进哪题(带 key 直达) */
  onTile: (key: string) => void
  ariaLabel: string
  idPrefix: string
  /** 只渲哪半张(2026-08-16 Frank「这两部分应该合到一个 section」):省专属题就是估分题,
   *  它该跟估分结论同处一卡,而不是留在「申请人条件」里 —— 于是这里能按 shared/prov 切开。 */
  only?: 'shared' | 'prov'
  /** 指定省时不出自己的省页签(调用方已经有一排了,嵌两层 tabs 是重) */
  province?: string
  /** 平铺:给什么就渲什么,一个网格到底(2026-08-16 Frank「布局也不对」——
   *  共用题与省专属题先前各起一个网格,两段之间断行、列也对不齐) */
  flat?: boolean
}) {
  const shared = rows.filter((r) => !r.prov)
  const provs = Array.from(new Set(rows.filter((r) => r.prov).map((r) => r.prov)))
  const [tab, setTab] = useState('')
  const active = provs.includes(tab) ? tab : provs[0] ?? ''

  const tile = (r: ConditionRow) => (
    <button key={r.key} onClick={() => onTile(r.key)} style={{
      minWidth: 0,
      textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
      background: r.filled ? '#f8fafc' : '#fafafa',
      border: `1px ${r.filled ? 'solid' : 'dashed'} ${r.filled ? '#eef2f7' : '#cbd5e1'}`,
      borderRadius: 9,
      padding: '8px 10px',
    }}>
      <div style={{ color: '#9ca3af', fontSize: 11.5, lineHeight: 1.35, marginBottom: 2 }}>
        {r.label}
        {r.warn ? <span style={{ background: '#fffbeb', color: '#92400e', borderRadius: 999, padding: '1px 7px', fontSize: 10.5, fontWeight: 600, marginLeft: 6, whiteSpace: 'nowrap' }}>⚠ {r.warn}</span> : null}
      </div>
      <div className="cgVal" title={r.value} style={{
        color: r.filled ? '#1f2937' : '#94a3b8',
        fontSize: 13,
        fontWeight: r.filled ? 600 : 400,
        lineHeight: 1.45,
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      }}>
        {r.value}
      </div>
    </button>
  )

  const GRID_CSS = '.cgGrid{display:grid;gap:8px;grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:640px){.cgGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}'

  if (flat) {
    if (!rows.length) return null
    return <><style>{GRID_CSS}</style><div className="cgGrid">{rows.map(tile)}</div></>
  }

  // 分组渲染:组序固定(调用方按 GROUPS 顺序给),组内保持题序 —— 两者都不许随答案变动而跳
  const groups = only !== 'prov' ? Array.from(new Set(shared.map((r) => r.group).filter(Boolean))) as string[] : []
  if (groups.length) {
    return (
      <>
        <style>{GRID_CSS}</style>
        {groups.map((g, i) => (
          <div key={g} style={{ marginTop: i ? 14 : 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>{g}</div>
            <div className="cgGrid">{shared.filter((r) => r.group === g).map(tile)}</div>
          </div>
        ))}
        {only === 'shared' || !provs.length ? null : (
          <>
            <div style={{ margin: '12px 0 10px' }}>
              <Tabs ariaLabel={ariaLabel} idPrefix={idPrefix} value={active} onChange={setTab}
                items={provs.map((p) => ({ key: p, label: provLabel(p), badge: rows.filter((r) => r.prov === p && !r.filled).length || undefined }))} />
            </div>
            {provs.map((p) => (
              <TabPanel key={p} tabKey={p} active={p === active} idPrefix={idPrefix}>
                <div className="cgGrid">{rows.filter((r) => r.prov === p).map(tile)}</div>
              </TabPanel>
            ))}
          </>
        )}
      </>
    )
  }

  // 调用方自己有省页签:只渲该省的格子,不再嵌一层 tabs
  if (province) {
    const mine = rows.filter((r) => r.prov === province)
    if (!mine.length) return null
    return <><style>{GRID_CSS}</style><div className="cgGrid">{mine.map(tile)}</div></>
  }

  return (
    <>
      <style>{GRID_CSS}</style>
      {only !== 'prov' ? <div className="cgGrid">{shared.map(tile)}</div> : null}
      {only !== 'shared' && provs.length > 0 && (
        <>
          <div style={{ margin: '12px 0 10px' }}>
            <Tabs ariaLabel={ariaLabel} idPrefix={idPrefix} value={active} onChange={setTab}
              items={provs.map((p) => ({
                key: p, label: provLabel(p),
                badge: rows.filter((r) => r.prov === p && !r.filled).length || undefined,
              }))} />
          </div>
          {provs.map((p) => (
            <TabPanel key={p} tabKey={p} active={p === active} idPrefix={idPrefix}>
              <div className="cgGrid">{rows.filter((r) => r.prov === p).map(tile)}</div>
            </TabPanel>
          ))}
        </>
      )}
    </>
  )
}

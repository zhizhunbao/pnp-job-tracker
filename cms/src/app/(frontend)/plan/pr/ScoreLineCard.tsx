'use client'
// 「估分与抽选线」独立 section(2026-08-16 Frank:「估分的答题和结论 放到单独一个 section,
// 不要和基础题放一块」)。与 08-13 那次「合并成 17 项」不矛盾 —— 那时估分只是多问九道题,
// 现在它要出的是一个**独立结论**:你这分够不够被捞。结论独立,容器就该独立。
//
// 三层内容(顺序即优先级):
//   ① 最近 N 轮抽选线 —— **未答题也给看**。官方事实,免费(收费原则:简化操作的才收费)。
//      它同时是这张卡的空态:比一句「请先答题」有说服力得多。
//   ② 你的估分 —— 下界/上界两个数,来自服务端与排序同源的 row.score(客户端不算分)。
//   ③ 一行结论 —— 走 lib/scoreLine 的三态:够得着 / 够不着 / 取决于加分项。
//      **只到「够不够线」为止**:不许延伸成「多久能被捞」「概率多大」(禁概率红线)。
import { useState } from 'react'

import { UI } from '../../ui/primitives'
import { lineStateOf, type LineState } from '@/lib/scoreLine'
import type { DrawRow } from '@/lib/pnpSelfScore'

const N_DRAWS = 6

export type ScoreRow = {
  province: string
  score?: { value: number; ceiling: number | null; refLine: number | null; partial?: boolean } | null
}

const CARD: React.CSSProperties = { background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '14px 16px', margin: '0 0 10px' }
const H2: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }
const PILL: React.CSSProperties = { borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }
const TAB = (active: boolean): React.CSSProperties => ({
  border: `1px solid ${active ? UI.primary : UI.border}`, background: active ? UI.primary : '#fff',
  color: active ? '#fff' : UI.text2, borderRadius: 999, padding: '5px 14px', fontSize: 12.5,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
})
const TH: React.CSSProperties = { padding: '0 0 6px', fontSize: 11.5, fontWeight: 600, color: UI.text3, whiteSpace: 'nowrap' }
const TD: React.CSSProperties = { padding: '7px 0', fontSize: 12.5, color: UI.text2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

/** 该省近 N 轮有分数的抽选(倒序);没有分数的轮次不进 —— 拿它当 0 比就是编 */
export const recentDraws = (draws: DrawRow[], province: string): DrawRow[] =>
  draws.filter((d) => d.province === province && typeof d.score === 'number' && d.kind !== 'notice')
    .sort((a, b) => String(b.drawDate).localeCompare(String(a.drawDate)))
    .slice(0, N_DRAWS)

export function ScoreLineCard({
  t, rows, draws, provinces, provDisp, done, total, onEdit, children,
}: {
  t: (k: string, p?: Record<string, string | number>) => string
  /** 服务端下发的通道行(每省取分最高的一行代表);客户端不算分 */
  rows: ScoreRow[]
  draws: DrawRow[]
  /** 页签省序:用户所选省,有分的在前 */
  provinces: string[]
  provDisp: (p: string) => string
  /** 估分段的进度(与基础卷各算各的,两边卡在哪一步第一次能分开读) */
  done: number
  total: number
  onEdit: () => void
  /** 问卷弹框壳 + 分值卡实例(常驻,不搬树 —— 搬容器 = 重挂 = 答案清零) */
  children?: React.ReactNode
}) {
  const [active, setActive] = useState(provinces[0] ?? '')
  const prov = provinces.includes(active) ? active : provinces[0] ?? ''

  const row = prov ? rows.find((r) => r.province === prov && r.score) ?? null : null
  const score = row?.score ?? null
  const list = prov ? recentDraws(draws, prov) : []
  const state: LineState = lineStateOf(score)
  const answered = total > 0 && done >= total

  // 结论行:三态各说各的,**不混着说**。没分(没答完 / 该省无表)只出引导,不出结论。
  const clears = score?.value != null ? list.filter((d) => (d.score as number) <= (score.value as number)).length : 0
  const banner = !prov ? (
    <Box tone="muted">{t('sl.needProv')}</Box>
  ) : !score ? (
    <Box tone="muted">{t(total > 0 ? 'sl.empty' : 'sl.noTable', { n: total })}</Box>
  ) : state === 'above' ? (
    <Box tone="ok">
      <b style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>{t('sl.yours', { prov: provDisp(prov), v: score.value })}</b>
      <div style={{ fontSize: 12.5, color: '#166534', marginTop: 3, lineHeight: 1.45 }}>
        {t('sl.aboveSub', { k: clears, n: list.length })}
      </div>
    </Box>
  ) : state === 'below' ? (
    <Box tone="muted">
      <b style={{ fontSize: 14, fontWeight: 700, color: UI.text }}>{t('sl.yours', { prov: provDisp(prov), v: score.value })}</b>
      <div style={{ fontSize: 12.5, color: UI.text2, marginTop: 3, lineHeight: 1.45 }}>
        {t('sl.belowSub', { gap: Math.max(0, (score.refLine ?? 0) - (score.ceiling ?? score.value)) })}
      </div>
    </Box>
  ) : (
    <Box tone="muted">
      <b style={{ fontSize: 14, fontWeight: 700, color: UI.text }}>{t('sl.yours', { prov: provDisp(prov), v: score.value })}</b>
      <div style={{ fontSize: 12.5, color: UI.text2, marginTop: 3, lineHeight: 1.45 }}>
        {t(score.ceiling != null ? 'sl.dependsSub' : 'sl.noLineSub', { top: score.ceiling ?? 0 })}
      </div>
    </Box>
  )

  const gapCell = (cut: number) => {
    if (score?.value == null) return <span style={{ fontSize: 13, color: UI.border }}>—</span>
    const gap = score.value - cut
    return (
      <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: gap >= 0 ? '#15803d' : UI.text3 }}>
        {gap >= 0 ? '+' : '−'}{Math.abs(gap)}
      </span>
    )
  }

  return (
    <div style={CARD}>
      <style>{`@media(max-width:640px){.slTbl{display:none}}@media(min-width:641px){.slCards{display:none}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ ...H2, whiteSpace: 'nowrap' }}>{t('sl.title')}</h2>
            {total > 0 ? (
              <span style={{ ...PILL, background: answered ? '#eff6ff' : UI.bg, color: answered ? UI.primary : UI.text3 }}>
                {t('dp.basicCount', { done, total })}
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: 12.5, color: UI.text3, marginTop: 4, lineHeight: 1.4 }}>{t('sl.sub')}</div>
        </div>
        {total > 0 ? (
          <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <button onClick={onEdit} style={{
              border: `1px solid ${answered ? UI.border : UI.primary}`, background: answered ? '#fff' : UI.primary,
              color: answered ? UI.text : '#fff', borderRadius: 8, padding: '6px 16px', fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', fontWeight: 600,
            }}>{t(answered ? 'sl.edit' : 'sl.check')}</button>
          </span>
        ) : null}
      </div>

      {provinces.length > 1 ? (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${UI.hairline}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {provinces.map((p) => (
            <button key={p} onClick={() => setActive(p)} style={TAB(p === prov)}>{provDisp(p)}</button>
          ))}
        </div>
      ) : null}

      {banner}

      {list.length > 0 ? (
        <>
          {/* 手机=卡片行,桌面=表格(与页尾抽选表同款二选一渲染);375 上四列会挤成两行 */}
          <div className="slCards" style={{ marginTop: 10 }}>
            {list.map((d, i) => (
              <div key={`${d.drawDate}:${i}`} style={{ borderTop: `1px solid ${UI.hairline}`, padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <b style={{ fontSize: 13.5, color: '#111827', minWidth: 0, overflowWrap: 'anywhere' }}>{d.stream}</b>
                  <span style={{ marginLeft: 'auto' }}>{gapCell(d.score as number)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: UI.text3, marginTop: 2 }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{d.drawDate}</span>
                  <span style={{ marginLeft: 'auto', color: UI.text2, fontVariantNumeric: 'tabular-nums' }}>
                    {t('sl.cutoffN', { n: d.score as number })}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <table className="slTbl" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ ...TH, textAlign: 'left' }}>{t('sl.date')}</th>
                <th style={{ ...TH, textAlign: 'left', padding: '0 10px 6px' }}>{t('sl.stream')}</th>
                <th style={{ ...TH, textAlign: 'right' }}>{t('sl.cutoff')}</th>
                <th style={{ ...TH, textAlign: 'right' }}>{t('sl.you')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d, i) => (
                <tr key={`${d.drawDate}:${i}`} style={{ borderTop: `1px solid ${UI.hairline}` }}>
                  <td style={{ ...TD, textAlign: 'left' }}>{d.drawDate}</td>
                  <td style={{ ...TD, padding: '7px 10px', color: '#111827', whiteSpace: 'normal' }}>{d.stream}</td>
                  <td style={{ ...TD, textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{d.score}</td>
                  <td style={{ ...TD, textAlign: 'right' }}>{gapCell(d.score as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : prov ? (
        <Box tone="muted">{t('sl.noDraws', { prov: provDisp(prov) })}</Box>
      ) : null}

      {children}
    </div>
  )
}

const Box = ({ tone, children }: { tone: 'ok' | 'muted'; children: React.ReactNode }) => (
  <div style={{
    background: tone === 'ok' ? '#f0fdf4' : UI.bg,
    border: tone === 'ok' ? '1px solid #bbf7d0' : `1px dashed ${UI.border}`,
    borderRadius: 9, padding: '10px 12px', margin: '12px 0 0',
    fontSize: 13, color: UI.text2, lineHeight: 1.45,
  }}>{children}</div>
)

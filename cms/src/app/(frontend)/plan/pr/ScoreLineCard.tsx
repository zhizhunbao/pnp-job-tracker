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
import { useEffect, useState } from 'react'

import { DataTable } from '../../ui/DataTable'
import { Tabs } from '../../ui/Tabs'
import { UI } from '../../ui/primitives'
import { lineStateOf, type LineState } from '@/lib/scoreLine'
import type { DrawRow } from '@/lib/pnpSelfScore'

const N_DRAWS = 6

export type ScoreRow = {
  province: string
  score?: { value: number; ceiling: number | null; refLine: number | null; refStream?: string | null; partial?: boolean } | null
}

const CARD: React.CSSProperties = { background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '14px 16px', margin: '0 0 10px' }
const H2: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }
const PILL: React.CSSProperties = { borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }

/** 该省近 N 轮有分数的抽选(倒序);没有分数的轮次不进 —— 拿它当 0 比就是编 */
export const recentDraws = (draws: DrawRow[], province: string): DrawRow[] =>
  draws.filter((d) => d.province === province && typeof d.score === 'number' && d.kind !== 'notice')
    .sort((a, b) => String(b.drawDate).localeCompare(String(a.drawDate)))
    .slice(0, N_DRAWS)

export function ScoreLineCard({
  t, lang, rows, draws, provinces, provDisp, done, total, onEdit, onPickProv, gridProvinces, tiles, pendingOf, noGridNote, onProv, children,
}: {
  t: (k: string, p?: Record<string, string | number>) => string
  /** 通道名的中文灰注只在 zh 界面出(官方原名是事实,译名是辅助,不许盖掉原名) */
  lang: string
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
  /** 选目标省(2026-08-16 Frank「这个部分加一个按钮,选省份吧?可以多选」)——
   *  落的是基础卷同一道省份题(字段单一来源),不新开一份省份答案 */
  onPickProv: () => void
  /** 分值表状态:null=还没取到(基础卷没答满时压根不取)。
   *  没有它就分不清「本站没有这个省的表」和「你还没答完基础卷」—— 两句话在用户那儿意思相反 */
  gridProvinces: string[] | null
  /** 该省估分题的格子(2026-08-16 合卡):由父组件按当前页签省渲染 —— 它们就是这一段的答案面,
   *  先前留在「申请人条件」卡里,与结论隔着一张卡 */
  tiles?: (province: string) => React.ReactNode
  /** 该省还欠几道估分题(页签角标) */
  pendingOf?: (province: string) => number
  /** 当前页签省上报:估分弹框只出这个省的题(先前分值卡按所有有表的省出题,BC 答完接着弹 MB) */
  onProv?: (province: string) => void
  /** 该省没有分值表时的说明(举证口径:官方不打分 vs 本站未收录,两句意思相反)。
   *  2026-08-16 从「申请人条件」卡搬来 —— 省的语境在这张卡,说明就该在这儿 */
  noGridNote?: (province: string) => React.ReactNode
  /** 问卷弹框壳 + 分值卡实例(常驻,不搬树 —— 搬容器 = 重挂 = 答案清零) */
  children?: React.ReactNode
}) {
  const [active, setActive] = useState(provinces[0] ?? '')
  const prov = provinces.includes(active) ? active : provinces[0] ?? ''
  useEffect(() => { if (prov) onProv?.(prov) }, [prov, onProv])

  const row = prov ? rows.find((r) => r.province === prov && r.score) ?? null : null
  const score = row?.score ?? null
  // 只列**对得上的那条通道**(2026-08-16 Frank「我的职业是 it 有必要 对比 其他通道的 分数吗」):
  // BC 现行按通道分别设线,一个 IT 的分对着 Care: Childcare 的 102 比就是错的对照。
  // 判定层挑对照线时早就按通道匹配过(refDraw),这里跟它同一条:同通道的轮次才进表。
  // 拿不到通道名(该省不按通道设线,如 AB)→ 照旧全列。
  const all = prov ? recentDraws(draws, prov) : []
  const sameStream = score?.refStream ? all.filter((d) => d.stream === score.refStream) : []
  const list = sameStream.length ? sameStream : all
  const state: LineState = lineStateOf(score)
  const answered = total > 0 && done >= total

  // 结论行:三态各说各的,**不混着说**。没分(没答完 / 该省无表)只出引导,不出结论。
  const clears = score?.value != null ? list.filter((d) => (d.score as number) <= (score.value as number)
    && (!score.refStream || d.stream === score.refStream)).length : 0
  const banner = !prov ? null : !score ? (
    // 估分题还有欠账 → 不出提示:没填的格子就在下面摆着,右上角还有「算我的分」,再写一句是废话
    // (2026-08-16 Frank 圈了「答完 7 道估分题看你够不够线」)。留下的两句说的是**别的事**:
    // 表还没取到(得先答完基础卷)/ 本站真没这个省的表 —— 后者是举证口径,不能省。
    total > 0 || gridProvinces?.includes(prov) ? null
      : gridProvinces === null ? <Box tone="muted">{t('sl.needBasic')}</Box>
        : <Box tone="muted">{noGridNote?.(prov) ?? t('sl.noTable')}</Box>
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

  const gapCell = (cut: number, stream?: string) => {
    // 通道对不上不给差值:线是事实照摆,但「你」那一栏留空 —— 拿别的通道的线比你的分是错的对照
    if (score?.value == null || (score.refStream && stream && stream !== score.refStream))
      return <span style={{ fontSize: 13, color: UI.border }}>—</span>
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
        </div>
        {/* 右上角动作区:次要在左、主要在右。主钮随态走 —— 没选省先选省 → 选了省先算分 → 答满了改答案。
            「改省份」2026-08-16 从页签末位挪上来(Frank「也应该放到右上角」):页签只管切省,不混动作 */}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
          {prov ? (
            <button onClick={onPickProv} style={{
              border: `1px solid ${UI.border}`, background: '#fff', color: UI.text, borderRadius: 8,
              padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', fontWeight: 600,
            }}>{t('sl.editProv')}</button>
          ) : null}
          <button onClick={!prov ? onPickProv : onEdit} style={{
            border: `1px solid ${prov && answered ? UI.border : UI.primary}`,
            background: prov && answered ? '#fff' : UI.primary,
            color: prov && answered ? UI.text : '#fff', borderRadius: 8, padding: '6px 16px', fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', fontWeight: 600,
          }}>{t(!prov ? 'sl.pickProv' : answered ? 'sl.edit' : 'sl.check')}</button>
        </span>
      </div>

      {/* 页签走**站内通用选项卡**(ui/Tabs,与条件格那排同一个组件):真 tablist —— 键盘 ←→、
          读屏报「第 n 项共 m 项」、窄屏横滚不换行。先前这里自造了一排胶囊按钮,
          与全站的筛选胶囊撞脸,而且语义是「点了发生一件事」而不是「当前在哪一面」
          (2026-08-16 Frank「我不是有专门的 tabs 组件吗」) */}
      {provinces.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <Tabs ariaLabel={t('dp.prov')} idPrefix="slProv" value={prov} onChange={setActive}
            items={provinces.map((p) => ({ key: p, label: provDisp(p), badge: pendingOf?.(p) || undefined }))} />
        </div>
      ) : null}

      {banner}

      {/* 该省估分题的格子:每格可点直达那道题(与「申请人条件」里的格子同一种东西同一个长相) */}
      {prov && tiles ? <div style={{ marginTop: 12 }}>{tiles(prov)}</div> : null}

      {list.length > 0 ? (
        <>
          {/* 边界(2026-08-16 Frank「虽然在一个 section,但是也应该有一个明显的边界吧」):
              上半是**你要动手的**(结论 + 估分题),下半是**不用动手的参照**(官方抽选线)。
              动作在前、参照在后;一条实线加一个小标题,不靠留白硬分。 */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${UI.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: UI.text, marginBottom: 2 }}>{t('sl.drawsTitle')}</div>
          </div>
          {/* 手机=卡片行,桌面=表格(与页尾抽选表同款二选一渲染);375 上四列会挤成两行 */}
          <div className="slCards" style={{ marginTop: 10 }}>
            {list.map((d, i) => (
              <div key={`${d.drawDate}:${i}`} style={{ borderTop: `1px solid ${UI.hairline}`, padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <b style={{ fontSize: 13.5, color: '#111827', minWidth: 0, overflowWrap: 'anywhere' }}>
                    {d.stream}
                    {lang === 'zh' && d.streamZh
                      ? <span style={{ display: 'block', color: UI.text3, fontSize: 11.5, fontWeight: 400, marginTop: 1 }}>{d.streamZh}</span> : null}
                  </b>
                  <span style={{ marginLeft: 'auto' }}>{gapCell(d.score as number, d.stream)}</span>
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
          <div className="slTbl">
            <DataTable<DrawRow> rows={list} rowKey={(d, i) => `${d.drawDate}:${i}`} bare
              cols={[
                { key: 'date', label: t('sl.date'), width: '18%', nowrap: true, sort: (d) => d.drawDate,
                  render: (d) => <span style={{ fontVariantNumeric: 'tabular-nums', color: UI.text2, fontSize: 12.5 }}>{d.drawDate}</span> },
                // 官方通道名不截断(走查 #297 同一条:我们没有权力给官方原名编个短名),放不下就换行
                { key: 'stream', label: t('sl.stream'), width: '52%', render: (d) => (
                  <span style={{ display: 'block', color: '#111827', overflowWrap: 'anywhere' }}>
                    {d.stream}
                    {lang === 'zh' && d.streamZh
                      ? <span style={{ display: 'block', color: UI.text3, fontSize: 11.5, marginTop: 1 }}>{d.streamZh}</span> : null}
                  </span>
                ) },
                { key: 'cut', label: t('sl.cutoff'), width: '15%', align: 'right', nowrap: true, sort: (d) => d.score,
                  render: (d) => <span style={{ fontWeight: 600, color: '#111827' }}>{d.score}</span> },
                { key: 'you', label: t('sl.you'), width: '15%', align: 'right', nowrap: true,
                  sort: (d) => (score?.value == null ? null : score.value - (d.score as number)),
                  render: (d) => gapCell(d.score as number, d.stream) },
              ]} />
          </div>
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

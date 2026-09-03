'use client'
/**
 * 域内小件:筛选药丸行 —— 省组(全部 / 联邦 / 本页真出现过的省)与类型组
 * (全部 / 抽选 / 政策),中间一条竖细线分开;节奏卡带进来的流筛在行末,
 * 带一枚撤销记号。手动切省或切类型时会清掉流筛,避免筛出空结果(那条流只属于原来那个省)。
 * 2026-08-28 换装批自 Timeline.tsx 的筛选区提出成文件。
 * 2026-09-03 Frank「所有的 table 右上角都应该有一个更新时间」:本行是时间轴正上方那一行,
 * 更新时间挂在它的右端(time 桶的 Updated 是全站唯一形)。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { Chip } from '@/components/chip'
import { Updated } from '@/components/time'
import { CHIP_CLEAR, KIND_DRAW, KIND_POLICY, PROV_FED, TEXT_NONE } from './constants'
import { provLabelOf } from './functions'
import type { FilterChipsIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染筛选药丸行。
 *
 * @param props 取词函数、可选省清单、三个筛选的现值与它们的手柄、更新时刻。
 * @returns 药丸行。
 */
export function FilterChips({
  t, provs, updatedAt, prov, kind, stream, provPickOf, onKindAll, onKindDraw, onKindPolicy, onStreamClear,
}: FilterChipsIn) {
  const provChips = []
  for (const code of provs) {
    provChips.push(
      <Chip key={code} onClick={provPickOf(code)} active={prov === code}>{provLabelOf({ t, code })}</Chip>,
    )
  }
  return (
    <div className={css.chips}>
      <Chip onClick={provPickOf(TEXT_NONE)} active={prov === TEXT_NONE}>{t('all.prov')}</Chip>
      <Chip onClick={provPickOf(PROV_FED)} active={prov === PROV_FED}>{t('tl.fed')}</Chip>
      {provChips}
      <span className={css.sep} />
      <Chip onClick={onKindAll} active={kind === TEXT_NONE}>{t('tl.kindAll')}</Chip>
      <Chip onClick={onKindDraw} active={kind === KIND_DRAW}>{t('tl.kindDraw')}</Chip>
      <Chip onClick={onKindPolicy} active={kind === KIND_POLICY}>{t('tl.kindPolicy')}</Chip>
      {stream !== TEXT_NONE && <Chip onClick={onStreamClear} active>{stream}{CHIP_CLEAR}</Chip>}
      <Updated iso={updatedAt} t={t} />
    </div>
  )
}

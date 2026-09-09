'use client'
/**
 * 域内小件:省份段 —— 宏观统计(含联邦)。段标题一枚,下面全国 + 十省各一个地区子块(按年表)+ 一张招聘对比横表,
 * 子块标题与间距照职业段的行业表(Sec sub + boardGap;Frank 2026-09-06「title 大小、表格之间的距离应该保持一致」)。
 * 2026-09-06 Frank 十一轮拍板重做(设计稿 docs/design/把脉页省份段-20260906.md):原七列混表
 * (在招 / 紧缺岗 / 2024 存量 / 2025 PR 揉一张)、省卡、切省下拉与 chips、省内职业榜全部撤;
 * 「省份主要是一个宏观的统计包括联邦」「省份的就没必要细分到职位了」。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件(旧形留 git)。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Chip } from '@/components/chip'
import { Updated } from '@/components/time'
import { ID_PROV, MACRO_VIEW_GEO, MACRO_VIEW_IND } from './constants'
import { macroViewGeosOf } from './functions'
import { Band } from './band'
import { JobsSection } from './jobssection'
import { MacroBlock } from './macroblock'
import { Sec } from './sec'
import type { MacroSectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染省份段。
 *
 * @param props 取词函数、更新时刻、地区块与招聘对比行。
 * @returns 一条色带;一个地区块都没有且招聘表也空时给 null。
 */
export function ProvSection({ t, updatedAt, geos, indGeos, view, viewPickOf, jobsLoading, jobsRows }: MacroSectionIn) {
  if (geos.length === 0 && jobsLoading === false && jobsRows.length === 0) {
    return null
  }
  const blocks = []
  let gap = false
  for (const g of macroViewGeosOf({ view, geos, indGeos })) {
    blocks.push(<MacroBlock key={g.code} t={t} geo={g} gap={gap} />)
    gap = true
  }
  const right = (
    <span className={css.viewRow}>
      <Chip active={view === MACRO_VIEW_IND} onClick={viewPickOf(MACRO_VIEW_IND)}>{t('pulse.s4.byInd')}</Chip>
      <Chip active={view === MACRO_VIEW_GEO} onClick={viewPickOf(MACRO_VIEW_GEO)}>{t('pulse.s4.byGeo')}</Chip>
      <Updated iso={updatedAt} t={t} />
    </span>
  )
  return (
    <Band id={ID_PROV}>
      <Sec title={t('pulse.s4')} right={right}>
        {blocks}
        <JobsSection t={t} loading={jobsLoading} rows={jobsRows} gap={gap} />
      </Sec>
    </Band>
  )
}

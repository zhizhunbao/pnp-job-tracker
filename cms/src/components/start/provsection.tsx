'use client'
/**
 * 域内小件:省份段 —— 宏观统计(含联邦)。段标题一枚(右侧更新时间,2026-09-10 评估批收回一枚:
 * 值全段相同,每表一枚重复十几次;2026-09-11 Frank「这个更新时间要紧贴在表格上面,说了多少遍」——
 * 收回是错改,时间退回每表标题行右侧,段首不挂;
 * 2026-11-05 Frank「把脉页面 把所有的 更新时间,都放到 banner 右下角吧」:段内一枚不挂,整页一枚在 banner 右下角),
 * 下面**一指标一张表**(行 = 全国 + 九省,2026-09-09 重排)+ 一张招聘对比横表,
 * 子块标题与间距照职业段的行业表(Sec sub + boardGap;Frank 2026-09-06「title 大小、表格之间的距离应该保持一致」)。
 * 2026-09-06 Frank 十一轮拍板重做(设计稿 docs/design/把脉页省份段-20260906.md):原七列混表
 * (在招 / 紧缺岗 / 2024 存量 / 2025 PR 揉一张)、省卡、切省下拉与 chips、省内职业榜全部撤;
 * 「省份主要是一个宏观的统计包括联邦」「省份的就没必要细分到职位了」。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件(旧形留 git)。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { ID_PROV, K_LOADING, PH_LAZY } from './constants'
import { Band } from './band'
import { JobsSection } from './jobssection'
import { MacroBlock } from './macroblock'
import { Placeholder } from './placeholder'
import type { MacroSectionIn } from './types'

/**
 * 渲染省份段。
 *
 * @param props 取词函数、地区块与招聘对比行。
 * @returns 一条色带;一个地区块都没有且招聘表也空时给 null。
 */
export function ProvSection({ t, indGeos, indLoading, jobsLoading, jobsRows }: MacroSectionIn) {
  if (indGeos.length === 0 && indLoading === false && jobsLoading === false && jobsRows.length === 0) {
    return null
  }
  const blocks = []
  let gap = false
  for (const g of indGeos) {
    blocks.push(<MacroBlock key={g.code} t={t} geo={g} gap={gap} />)
    gap = true
  }
  return (
    <Band id={ID_PROV}>
      <div>
        {indLoading && <Placeholder size={PH_LAZY} text={t(K_LOADING)} />}
        {blocks}
        <JobsSection t={t} loading={jobsLoading} rows={jobsRows} gap={gap} />
      </div>
    </Band>
  )
}

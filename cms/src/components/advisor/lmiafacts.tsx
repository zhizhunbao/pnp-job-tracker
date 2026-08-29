'use client'
/**
 * 公司级 LMIA 的事实块。E6-02:ESDC 近 8 季获批史,纯事实,股别/季度语境必带。
 * E8-04 把「历史记录」升级为「今天这条路通不通」—— 按本岗高/低薪 + 豁免行业判
 * 前瞻可行性(数据在 lib/lmia);缺工资或够不着门槛时不出这一行(不猜)。
 * #106:LMIA 官方来源外链撤(归拢到 /resources)。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位(两枚色值内联迁 .lmiaOk / .lmiaWarn)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { FactsBox } from './factsbox'
import { lmiaCountTextOf, lmiaFeasibleOf } from './functions'
import type { AdvisorFactsIn } from './types'

/**
 * 渲染 LMIA 事实块。
 *
 * @param props 取数包。
 * @returns 获批史三行 + 前瞻判词行。
 */
export function LmiaFacts({ f }: AdvisorFactsIn) {
  const t = makeT(f.lang)
  const feasible = lmiaFeasibleOf({ t, job: f.job })
  return (
    <FactsBox note={t('fact.lmiaNote')}>
      <Row k={t('col.lmia')}>{lmiaCountTextOf({ t, job: f.job })}</Row>
      <Row k={t('fact.lmiaStreams')}>{f.job.lmiaStreams}</Row>
      <Row k={t('col.company')}>{f.job.company}</Row>
      {feasible != null && (
        <Row k={t('lmia.route')}><span className={feasible.cls}>{feasible.text}</span></Row>
      )}
    </FactsBox>
  )
}

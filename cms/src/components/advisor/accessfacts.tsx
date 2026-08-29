'use client'
/**
 * 无障碍的事实块。未知时显式写「未知(帖内未写)」——「—」会被事实行的空值守卫隐藏,
 * 那样弹框里只剩孤零零一句口径注(文案审计抓到过)。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { FactsBox } from './factsbox'
import { accTextOf } from './functions'
import type { AdvisorFactsIn } from './types'

/**
 * 渲染无障碍事实块。
 *
 * @param props 取数包。
 * @returns 无障碍行。
 */
export function AccessFacts({ f }: AdvisorFactsIn) {
  const t = makeT(f.lang)
  return (
    <FactsBox note={t('fact.accNote')}>
      <Row k={t('col.accessibility')}>{accTextOf({ t, job: f.job })}</Row>
    </FactsBox>
  )
}

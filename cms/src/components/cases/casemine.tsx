'use client'
/**
 * ⑤ 「测测我自己的」CTA 卡:处境页是别人的答案,这一卡把看客导去决策页
 * 拿自己的(埋点带案例编号,看哪条处境导流最多)。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { URL_QUIZ } from './constants'
import { makeTrackQuiz } from './functions'
import { CaseLead } from './caselead'
import type { CaseMineIn } from './types'
import css from './cases.module.css'

/**
 * CTA 卡。
 *
 * @param props 案例编号与取词函数(见 CaseMineIn 逐格注释)。
 * @returns CTA 卡。
 */
export function CaseMine({ caseId, t }: CaseMineIn) {
  return (
    <div className={css.card}>
      <h2 className={css.h2}>{t('case.mineTitle')}</h2>
      <CaseLead lines={[t('case.mineLead')]} />
      <LinkButton href={URL_QUIZ} onClick={makeTrackQuiz({ id: caseId })} className={cssOf(css.cta)}>
        {t('case.mineCta')}
      </LinkButton>
    </div>
  )
}

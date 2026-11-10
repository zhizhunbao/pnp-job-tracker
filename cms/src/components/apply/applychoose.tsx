'use client'
/**
 * 投递框第一屏(免费用户有额度时;2026-11-09 Frank):两个选择 ——「按这个职位改写(用 1 个额度,还剩 N 个)」和
 * 「直接投基础简历」。点了改写才生成并扣额度。
 *
 * @author Frank
 * @time 2026-11-09 23:30:00
 */
import { Button } from '@/components/button'
import { BTN_GHOST, CARD_HEAD_CLS, CARD_MD_CLS } from './constants'
import type { ApplyStepIn } from './types'
import css from './apply.module.css'

/**
 * 两个选择。
 *
 * @param props 整机面板。
 * @returns 一张分区卡,里面两张选择卡。
 */
export function ApplyChoose({ p }: ApplyStepIn) {
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{p.t('ap.chHead')}</div>
      <div className={css.choices}>
        <Button kind={BTN_GHOST} className={`${css.choice} ${css.choiceMain}`} onClick={p.onTailor}>
          <span className={css.choiceName}>{p.t('ap.chTailor')}</span>
          <span className={css.choiceSub}>{p.t('ap.chTailorSub', { n: p.creditLeft })}</span>
        </Button>
        <Button kind={BTN_GHOST} className={css.choice} onClick={p.onBase}>
          <span className={css.choiceName}>{p.t('ap.chBase')}</span>
          <span className={css.choiceSub}>{p.t('ap.chBaseSub')}</span>
        </Button>
      </div>
    </div>
  )
}

'use client'
/**
 * apply 桶子桶 review 的分块:分数卡。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST, CLS_CARD_MD, ONE_SPACE, TEXT_NONE, TYPE_BUTTON } from './constants'
import { clsIf, colorOf, isCovered } from './functions'
import type { ReviewScoreIn } from './types'
import css from './review.module.css'

/**
 * 分数与要求胶囊。
 * 2026-11-09 Frank「红叉别点了,就加一个 按钮」:没覆盖的胶囊只是状态、不可点;分数旁一颗钮开「补充经历」右侧栏,一次补完全部。
 *
 * @param props 面板、结果与取词。
 * @returns 分数卡。
 */
export function ReviewScore({ p, review, t }: ReviewScoreIn) {
  const chips = []
  let missing = 0
  for (const r of review.reqs) {
    if (isCovered(r)) {
      const on = clsIf({ on: p.active === r.id, cls: cssOf(css.reqOn) })
      chips.push(
        <Button key={r.id}
          kind={BTN_GHOST}
          type={TYPE_BUTTON}
          className={[cssOf(css.req), colorOf(r.id), on].join(ONE_SPACE)}
          onClick={p.pickOf(r.id)}>
          <b className={cssOf(css.num)}>{r.id}</b>{r.label}
        </Button>,
      )
    } else {
      missing += 1
      chips.push(<span key={r.id} className={cssOf(css.reqMiss)}>{r.label}</span>)
    }
  }
  return (
    <div className={CLS_CARD_MD + ONE_SPACE + cssOf(css.score)}>
      <div className={cssOf(css.big)}>{review.score}<span className={cssOf(css.of)}>{t('tr.of100')}</span></div>
      <div className={cssOf(css.scoreText)}>
        <div className={cssOf(css.scoreName)}>{t('tr.score')}</div>
      </div>
      {missing > 0 && (
        <Button sm className={cssOf(css.fillAll)} onClick={p.onFillOpen} disabled={p.stage !== TEXT_NONE}>
          {t('tr.fillAll', { n: missing })}
        </Button>
      )}
      <div className={cssOf(css.strip)}>{chips}</div>
    </div>
  )
}

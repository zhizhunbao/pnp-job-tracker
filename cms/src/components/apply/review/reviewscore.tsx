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
import { clsIf, colorOf, isCovered, missingReqsOf, needKeyOf } from './functions'
import type { ReviewScoreIn } from './types'
import css from './review.module.css'

/**
 * 分数与要求胶囊。
 * 2026-11-09 Frank「红叉别点了,就加一个 按钮」:没覆盖的胶囊只是状态、不可点;分数旁一颗钮开「补充经历」右侧栏,一次补完全部。
 *
 * 2026-11-10 任务书第 34 条:胶囊三态 —— 两份都写到是彩色对勾;有依据但有一份没写到是黄色并注明缺哪份(重新生成那一份能修);
 * 没有依据是红叉(只有补充经历能修)。同日 Frank「为什么缺 1 号」:三态都带序号,编号不断档。分数旁一行「已覆盖几条 / 共几条」;「补充经历」钮只数红叉。
 *
 * @param props 面板、结果与取词。
 * @returns 分数卡。
 */
export function ReviewScore({ p, review, t }: ReviewScoreIn) {
  const chips = []
  const missing = missingReqsOf(review.reqs).length
  let covered = 0
  for (const r of review.reqs) {
    if (isCovered(r)) {
      covered += 1
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
    } else if (r.basis) {
      chips.push(
        <span key={r.id} className={cssOf(css.reqHalf)}>
          <b className={cssOf(css.num)}>{r.id}</b>{r.label}<small className={cssOf(css.need)}>{t(needKeyOf(r))}</small>
        </span>,
      )
    } else {
      chips.push(
        <span key={r.id} className={cssOf(css.reqMiss)}><b className={cssOf(css.num)}>{r.id}</b>{r.label}</span>,
      )
    }
  }
  return (
    <div className={CLS_CARD_MD + ONE_SPACE + cssOf(css.score)}>
      <div className={cssOf(css.big)}>{review.score}<span className={cssOf(css.of)}>{t('tr.of100')}</span></div>
      <div className={cssOf(css.scoreText)}>
        <div className={cssOf(css.scoreName)}>{t('tr.score')}</div>
        <div className={cssOf(css.scoreSub)}>{t('tr.covered', { a: covered, b: review.reqs.length })}</div>
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

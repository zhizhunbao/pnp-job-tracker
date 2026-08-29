'use client'
/**
 * 移民组的顾问长文卡。#174:AI 解读收进自己的卡(每卡必有 title)——
 * 只有移民组会请求 AI,职位/公司组状态直置「出完了」、正文空,所以不渲,
 * 免得出一张空卡孤儿标题。
 * #175:429 黄条退役 → 打码 + 锁行(转化靠失去感,不靠警示框)。
 * 2026-07-25 用户:解析失败要能重试 —— 失败态文案后挂重试钮。
 * 2026-08-28 换装批自 Advisor.tsx 的 AdvisorModal AI 段提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconCompass } from '@/components/icons'
import { renderAI } from '@/components/jobs/renderai'
import { LockedText } from '@/components/pricing'
import {
  ADV_DONE, ADV_ERROR, ADV_LIMITED, ADV_LOADING, ADV_STREAMING, ADV_UPGRADE, BTN_GHOST, CARD_HEAD_CLS,
  CARD_MD_CLS, CARET_BAR, SPACE,
} from './constants'
import { limitCtaTextOf } from './functions'
import type { AdvisorAiCardIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染顾问长文卡。
 *
 * @param props 取词函数、登录态、状态档、正文与重试。
 * @returns 长文卡。
 */
export function AdvisorAiCard({ t, loggedIn, status, text, onRetry }: AdvisorAiCardIn) {
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}><IconCompass />{SPACE}{t('advisor.tag')}</div>
      {status === ADV_UPGRADE && <LockedText t={t} loggedIn={loggedIn} />}
      {status === ADV_LIMITED && (
        <LockedText t={t} loggedIn={loggedIn} msg={t('advisor.limit429')} ctaLabel={limitCtaTextOf({ t, loggedIn })} />
      )}
      {status === ADV_LOADING && <p className={cssOf(css.modalNote)}>{t('advisor.loading')}</p>}
      {status === ADV_ERROR && (
        <p className={cssOf(css.modalNote)}>
          {text}
          <Button kind={BTN_GHOST} onClick={onRetry} className={cssOf(css.modalRetry)}>{t('ai.retry')}</Button>
        </p>
      )}
      {(status === ADV_STREAMING || status === ADV_DONE) && (
        <div className={cssOf(css.aiText)}>
          {renderAI(text)}
          {status === ADV_STREAMING && <span className={cssOf(css.caret)}>{CARET_BAR}</span>}
        </div>
      )}
    </div>
  )
}

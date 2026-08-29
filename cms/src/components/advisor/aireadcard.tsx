'use client'
/**
 * 点了才出的 AI 速读卡(分类弹框与地点弹框共用一件:原先两处逐字重复)。
 * 置顶 = 点完不用往下翻;#183 常驻开关收起时隐藏不清 state,收起再开不重烧。
 * 额度闸照走:402 → 升级卡,429 → 打码 + 锁行(#175 黄条退役,转化靠失去感)。
 * 尾行建议问题不在这类速读区展示(追问在完整弹框),所以正文先摘掉它。
 * 2026-08-28 换装批自 Advisor.tsx 的 CategoryPanel / LocationPanel 两处 AI 卡合成一件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { IconCompass } from '@/components/icons'
import { renderAI } from '@/components/jobs/renderai'
import { LockedText } from '@/components/pricing'
import {
  ADV_DONE, ADV_ERROR, ADV_LIMITED, ADV_LOADING, ADV_STREAMING, ADV_UPGRADE, CARD_HEAD_CLS, CARD_MD_CLS,
  CARET_BAR, CLS_SEP, SPACE,
} from './constants'
import { cutSugOf, limitCtaTextOf } from './functions'
import type { AiReadCardIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染 AI 速读卡。
 *
 * @param props 取词函数、登录态与 AI 段面板。
 * @returns 速读卡。
 */
export function AiReadCard({ t, loggedIn, ai }: AiReadCardIn) {
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}><IconCompass />{SPACE}{t('cat.aiRead')}</div>
      {ai.status === ADV_UPGRADE && <LockedText t={t} loggedIn={loggedIn} />}
      {ai.status === ADV_LIMITED && (
        <LockedText t={t} loggedIn={loggedIn} msg={t('advisor.limit429')} ctaLabel={limitCtaTextOf({ t, loggedIn })} />
      )}
      {ai.status === ADV_ERROR && (
        <p className={cssOf(css.modalNote) + CLS_SEP + cssOf(css.modalNoteSm)}>{t('cat.aiErr')}</p>
      )}
      {ai.status === ADV_LOADING && <p className={cssOf(css.modalNote)}>{t('advisor.loading')}</p>}
      {(ai.status === ADV_STREAMING || ai.status === ADV_DONE) && (
        <div className={cssOf(css.aiText)}>
          {renderAI(cutSugOf(ai.text))}
          {ai.status === ADV_STREAMING && <span className={cssOf(css.caret)}>{CARET_BAR}</span>}
        </div>
      )}
    </div>
  )
}

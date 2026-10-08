'use client'
/**
 * 第 2 步:求职信 —— 进来就按这一岗的 JD 与选用的简历写好一封(写的时候摆进度),直接在多行框里改;
 * 写不进 PDF 的字在框下列出来;「按职位重写」再写一封。
 * 2026-10-07 二改(Frank「得根据 jd 写啊」):原「按我的模板填好职位名、公司名与署名」撤,信由模型按 JD 写。
 * 同日批 C:免费档 AI 写信一辈子试用 3 个职位 —— 标题行出「AI 试用还剩 N 次」;用完了信框上出黄条(这封是通用模板)
 * 与升级钮,「按职位重写」改成开升级框,付完回到本岗。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { Button } from '@/components/button'
import { Loading } from '@/components/loading'
import { Notice } from '@/components/notice'
import { UpgradeModal } from '@/components/pricing'
import { LETTER_TRIAL_MAX } from '@/lib/quota'
import {
  BTN_GHOST, CHAR_SEP, LOADING_KEY, NOTICE_WARN, REWRITE_KEY, TRIAL_LEFT_KEY, TRIAL_OUT_KEY, TRIAL_REASON_KEY,
  UPGRADE_KEY, WRITING_KEY,
} from './constants'
import type { ApplyStepIn } from './types'
import css from './apply.module.css'

/**
 * 第 2 步。
 *
 * @param props 整机面板。
 * @returns 标题行(带试用余量与重写钮)、试用用完的黄条、信框或写信进度、坏字一行、升级框。
 */
export function ApplyLetter({ p }: ApplyStepIn) {
  return (
    <>
      <div className={css.h2Row}>
        <div className={css.h2}>{p.t('ap.letter')}</div>
        <span className={css.h2Acts}>
          {p.trial.left !== null && p.trial.locked === false && (
            <span className={css.trialLeft}>{p.t(TRIAL_LEFT_KEY, { n: p.trial.left })}</span>
          )}
          <Button kind={BTN_GHOST} sm onClick={p.onRewrite} disabled={p.writing}>{p.t(REWRITE_KEY)}</Button>
        </span>
      </div>
      {p.trial.locked && (
        <Notice kind={NOTICE_WARN} className={css.locked}
          action={<Button sm onClick={p.trial.onUpsell}>{p.t(UPGRADE_KEY)}</Button>}>
          {p.t(TRIAL_OUT_KEY, { n: LETTER_TRIAL_MAX })}
        </Notice>
      )}
      {p.writing && (
        <div className={css.writing}>
          <Loading text={p.t(LOADING_KEY)} />
          <div className={css.pickNote}>{p.t(WRITING_KEY)}</div>
        </div>
      )}
      {p.writing === false && (
        <textarea className={css.letter} value={p.letter} onChange={p.onLetter} onBlur={p.onLetterBlur}
          aria-label={p.t('ap.letter')} spellCheck />
      )}
      {p.badChars.length > 0 && <div className={css.bad}>{p.t('ap.badChars')} {p.badChars.join(CHAR_SEP)}</div>}
      {p.trial.upsell && (
        <UpgradeModal t={p.t} onClose={p.trial.onUpsellClose} reason={p.t(TRIAL_REASON_KEY)} back={p.trial.back} />
      )}
    </>
  )
}

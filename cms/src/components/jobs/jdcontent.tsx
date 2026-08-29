'use client'
/**
 * JD 正文区:按取数态分四档 —— 在途 / 被防滥用闸挡下(#201:JD 已免费,429 偶发,
 * 素文案不引流 Pro)/ 这一岗没正文(空态自己解释)/ 拿到了。
 * 拿到了那一档:整理版状态行 + 正文轨 —— J3 整理版默认在上、原文一键切换;
 * 生成中或没有整理版就照旧渲原文。
 * 2026-08-28 换装批自 Jd.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { blockedSrc } from '@/lib/jobs'
import { JD_DONE, JD_EMPTY, JD_LIMITED, JD_LOADING, JD_MAX_LEN } from './constants'
import { fallbackPayOf, noTextOf, showFormattedOf, transShownOf } from './functions'
import { JdAiNote } from './jdainote'
import { JdEmpty } from './jdempty'
import { JdFormattedView } from './jdformattedview'
import { JdTextView } from './jdtextview'
import type { JdContentIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染 JD 正文区。
 *
 * @param props JD 身体状态机、本岗、是不是紧跟大标题与登录态。
 * @returns 按取数态渲的正文区。
 */
export function JdContent({ d, job, underTitle, loggedIn }: JdContentIn) {
  return (
    <>
      {d.status === JD_LOADING && <p className={cssOf(css.mutedNote)}>{d.t('act.loadingText')}</p>}
      {d.status === JD_LIMITED && (
        <p className={`${cssOf(css.mutedNote)} ${cssOf(css.mutedM4)}`}>{d.t('jd.busy')}</p>
      )}
      {d.status === JD_EMPTY && (
        <JdEmpty note={noTextOf({ t: d.t, src: blockedSrc(job) })} url={job.applyUrl}
          label={d.t('act.seeOfficial')} />
      )}
      {d.status === JD_DONE && (
        <>
          <JdAiNote d={d} anon={loggedIn === false} />
          {showFormattedOf({ fmt: d.fmt, showOrig: d.showOrig }) && (
            <JdFormattedView text={String(d.fmt)}
              t={d.t}
              fallbackPay={fallbackPayOf(job)}
              applyUrl={job.applyUrl}
              applyEmail={d.applyEmail}
              underTitle={underTitle}
              trans={transShownOf({ shown: d.showTrans, trans: d.trans })} />
          )}
          {showFormattedOf({ fmt: d.fmt, showOrig: d.showOrig }) === false && (
            <JdTextView text={d.text} max={JD_MAX_LEN} />
          )}
        </>
      )}
    </>
  )
}

'use client'
/**
 * JD 正文区:按取数态分四档 —— 在途 / 被防滥用闸挡下(#201:JD 已免费,429 偶发,
 * 素文案不引流 Pro)/ 这一岗没正文(空态自己解释)/ 拿到了。
 * 拿到了那一档:整理版状态行 + 正文轨 —— J3 整理版默认在上、原文一键切换;
 * 生成中或没有整理版就照旧渲原文。
 * 2026-08-28 换装批自 Jd.tsx 提出成文件。
 * 2026-09-14 Frank「不要显示原文,直接显示整理之后的」「这种不行」「加一个 loading 如果没有翻译完」:整理在途(fmt 还没回)
 * 与对照在途(中 / 韩界面翻译中)都出转圈行,不铺原文也不先铺英文整理版;整理失败 / 额度用完(fmt = null)仍退原文,
 * 不能让人看不到正文。取数 / 整理 / 翻译三段在途共用**同一个**转圈元素(jdWaitingOf 一次判完;Frank「加载途中为什么会闪一下」:
 * 原是两处各渲一条,取数变整理那一瞬卸一条挂一条就闪)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { blockedSrc } from '@/lib/jobs'
import { JD_DONE, JD_EMPTY, JD_LIMITED, JD_MAX_LEN } from './constants'
import {
  fallbackPayOf, jdBusyOf, jdLocationOf, jdLocationZhOf, jdWaitingOf, noTextOf, showFormattedOf, transShownOf,
} from './functions'
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
export function JdContent({ d, job, underTitle, loggedIn, lang }: JdContentIn) {
  return (
    <>
      {jdWaitingOf({ status: d.status, fmt: d.fmt, transStatus: d.transStatus, lang, trans: d.trans }) && (
        <div className={cssOf(css.loading)}>
          <span className={cssOf(css.spin)} />
          {d.t('act.loadingText')}
        </div>
      )}
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
          {showFormattedOf({ fmt: d.fmt, showOrig: d.showOrig })
            && jdBusyOf({ fmt: d.fmt, transStatus: d.transStatus, lang, trans: d.trans }) === false && (
            <JdFormattedView text={String(d.fmt)}
              t={d.t}
              fallbackPay={fallbackPayOf(job)}
              location={jdLocationOf(job)}
              locationZh={jdLocationZhOf({ t: d.t, job, lang })}
              applyUrl={job.applyUrl}
              applyEmail={d.applyEmail}
              underTitle={underTitle}
              trans={transShownOf({ shown: d.showTrans, trans: d.trans })} />
          )}
          {showFormattedOf({ fmt: d.fmt, showOrig: d.showOrig }) === false && d.fmt !== undefined && (
            <JdTextView text={d.text} max={JD_MAX_LEN} />
          )}
        </>
      )}
    </>
  )
}

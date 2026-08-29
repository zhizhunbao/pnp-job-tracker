'use client'
/**
 * 职位描述(JD)的**身体**:详情页整页与 JD 弹框渲的是同一棵树(E8-11 B2,Frank
 * 「以弹框为准,job 只留 job 相关」)。正文一律懒取(带同岗会话缓存),原站拦抓取的走空态
 * 说事实,不绕过访问控制。
 * 内容 = 已下架横幅 + 三钮行(中文对照 / AI 速读 / 完整页-仅弹框)+ AI 速读卡 +
 * AI 整理五节或看原文 + 兜底来源行 + 投递栏。
 * AI 速读卡置顶(点完不用往下翻,与分类弹框同规范;jdRead = 纯 JD 速读不带移民解读)。
 * 投递栏在整理进行中先藏(2026-07-25 用户「AI 整理的时候不要显示这个按钮,等整理完了再显示」)——
 * 有结果(整理版 / 失败 / 空态)才出,fmt 各路径都会落定,不会永久不显。
 * 2026-08-28 换装批自 Jd.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { JdAdvisorSection } from '@/components/advisor/jdadvisorsection'
import { ADVISOR_FIELD_JD_READ, CARD_MD_CLS, STATUS_CLOSED, UNDER_TITLE } from './constants'
import { fullHrefOf, hostOf, showSourceOf } from './functions'
import { useJobBody } from './hooks'
import { ApplyBar } from './applybar'
import { JdActs } from './jdacts'
import { JdClosed } from './jdclosed'
import { JdContent } from './jdcontent'
import { JdSource } from './jdsource'
import type { JobBodyIn } from './types'

/**
 * 渲染 JD 身体。
 *
 * @param props 本岗、界面语言、分层态、在不在弹框里与额度回传。
 * @returns 整副身体。
 */
export function JobBody({ job, lang, plan, inModal = false, onFreeLeft }: JobBodyIn) {
  const d = useJobBody({ job, lang, plan, inModal, onFreeLeft })
  return (
    <>
      {job.status === STATUS_CLOSED && <JdClosed text={d.t('detail.closedNote')} />}
      <JdActs d={d} lang={lang} fullHref={fullHrefOf({ inModal, id: job.id })} />
      {d.aiOn && (
        <div className={CARD_MD_CLS}>
          <JdAdvisorSection job={job} lang={lang} plan={plan} title={d.t('cat.aiRead')}
            field={ADVISOR_FIELD_JD_READ} />
        </div>
      )}
      <JdContent d={d} job={job} underTitle={UNDER_TITLE} loggedIn={plan.loggedIn} />
      {showSourceOf({ applyUrl: job.applyUrl, status: d.status, fmt: d.fmt, showOrig: d.showOrig }) && (
        <JdSource label={d.t('src.label')} url={job.applyUrl} host={hostOf(job.applyUrl)} />
      )}
      {d.fmt !== undefined && (
        <ApplyBar job={job} email={d.applyEmail} emailDone={d.applyDone} t={d.t} plan={plan}
          onPage={inModal === false} />
      )}
    </>
  )
}

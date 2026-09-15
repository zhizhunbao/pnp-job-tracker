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
 * 2026-09-14 Frank「这个也去掉」:底部「来源: 域名」行撤(JdSource 件随撤);「打开完整页」钮同日撤。
 * 2026-09-14 Frank「删掉。默认就自带中文对照」:钮行整个退役,换成 JdAutoTrans(中 / 韩界面自动加载对照)。
 * 2026-09-14 Frank「职位描述里也应该显示工作地点吧」「这个工作地址不应该放在这里吧」:地点进「工时地点」节首行(JdContent 递),不在顶上另出。
 * 2026-09-14 Frank「没加载完不要显示前往投递」:投递栏只在正文取到且整理 / 翻译都不在途时出。
 * 2026-09-14 Frank「加」:管理员在标题下有一颗「重译」胶囊 —— 清掉这一岗的译文版本后整页刷新,开框重翻。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { JD_DONE, STATUS_CLOSED, UNDER_TITLE } from './constants'
import { jdBusyOf } from './functions'
import { useJobBody } from './hooks'
import { ApplyBar } from './applybar'
import { JdAutoTrans } from './jdautotrans'
import { JdClosed } from './jdclosed'
import { JdContent } from './jdcontent'
import type { JobBodyIn } from './types'

/**
 * 渲染 JD 身体。
 *
 * @param props 本岗、界面语言、分层态、在不在弹框里与额度回传。
 * @returns 整副身体。
 */
export function JobBody({ job, lang, plan, inModal = false, onFreeLeft, jdText }: JobBodyIn) {
  const d = useJobBody({ job, lang, plan, inModal, onFreeLeft, jdText })
  return (
    <>
      {job.status === STATUS_CLOSED && <JdClosed text={d.t('detail.closedNote')} />}
      <JdAutoTrans d={d} lang={lang} />
      <JdContent d={d} job={job} underTitle={UNDER_TITLE} loggedIn={plan.loggedIn} lang={lang} />
      {d.status === JD_DONE && jdBusyOf({ fmt: d.fmt, transStatus: d.transStatus, lang, trans: d.trans }) === false && (
        <ApplyBar job={job} email={d.applyEmail} emailDone={d.applyDone} t={d.t} plan={plan}
          onPage={inModal === false} />
      )}
    </>
  )
}

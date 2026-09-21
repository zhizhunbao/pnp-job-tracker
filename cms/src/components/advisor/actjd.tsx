'use client'
/**
 * 职位描述弹框的内层:起 JD 身体状态机,页眉译名行挂切换控件、正文挂 JobBody,两处读同一份。
 * 2026-09-16 Frank「右边的按钮部分和左边的中文翻译放到一行」「可以」:切换控件上提到页眉,状态机随之从 JobBody 提到这里;
 * 外层 ActModal 以重译代数作 key 重挂本件(原先 key 挂在 JobBody 上,重译时正文重取的口径不变)。
 * 2026-09-21 Frank「参考一下公司弹框」「是不是把公司信息放到一个框里,单独放到下面」:正文下面(投递栏之上)接公司信息卡
 * 与相关职位卡(jobs 桶 JobModalCards,点文件不走桶 —— 同上两件的理由);点公司名 / 相关职位经宿主注的两个回调往弹框栈上叠。
 *
 * @author Frank
 * @time 2026-09-16 21:30:00
 */
import { useJobBody } from '@/components/jobs/hooks'
import { JdOrigLink } from '@/components/jobs/jdoriglink'
import { JobBody } from '@/components/jobs/jobbody'
import { JobModalCards } from '@/components/jobs/jobmodalcards'
import { makeT } from '@/lib/i18n'
import { TEXT_NONE, URL_JOB_HEAD } from './constants'
import { ActHead } from './acthead'
import { FloatPanel } from './floatpanel'
import { firstTextOf, jobRefreshOf } from './functions'
import type { ActJdIn } from './types'

/**
 * 渲染职位描述弹框的内层。
 *
 * @param props 这一岗、界面语言、分层态、关闭回调、浮层机器、标题译名、外层面板与点公司名 / 相关职位的两个回调。
 * @returns 浮层。
 */
export function ActJd({ job, lang, plan, onClose, panel, sub, a, onOpenJob, onOpenCompany }: ActJdIn) {
  const t = makeT(lang)
  const d = useJobBody({
    job, lang, plan, inModal: true, onFreeLeft: a.onFreeLeft, jdText: TEXT_NONE, jdFormatted: null,
  })
  const head = (
    <ActHead t={t} title={firstTextOf({ list: [job.title] })}
      sub={sub}
      freeLeft={a.freeLeft}
      ctl={<JdOrigLink d={d} />} />
  )
  return (
    <FloatPanel panel={panel} head={head} onClose={onClose} t={t} tight jdBody actsStopDrag
      onRefresh={jobRefreshOf({ plan, job, onDone: a.onRetranslated })}
      pageHref={URL_JOB_HEAD + String(job.id)}>
      <JobBody job={job} lang={lang} plan={plan} inModal d={d}
        tail={<JobModalCards job={job} lang={lang} onOpenJob={onOpenJob} onOpenCompany={onOpenCompany} />} />
    </FloatPanel>
  )
}

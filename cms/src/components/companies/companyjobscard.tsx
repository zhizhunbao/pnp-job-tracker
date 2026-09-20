'use client'
/**
 * 在招职位卡(富行 = NOC 对照 + 薪资 + 城市,#184 口径;弹框内点职位叠开 JD 弹框)。
 * #198(Frank「这个展开不要跳转」):原「展开其余 N 个」跳搜索页退役 → 原地展开
 * 已载入职位;载入上限 50,超出部分(极少)才回退跳板搜索全部。
 * #200(Frank「岗位名称中文翻译默认都加上」):岗名下的 NOC 译名默认显示
 * (短、就是职业名、一直有用);简介/JD 正文的翻译仍留给「显示中文对照」。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位(展开态就近落在这一件里)。
 * 2026-09-03 Frank「所有的 table 和可以更新数据的地方,右上角都应该有一个更新时间」:
 * 卡标题行右端挂 time 桶的 Updated(心跳由页面门 SSR 取好递进来;弹框没有,空串自己不渲)。
 * 2026-09-14 Frank「这个去掉」「在招职位那部分加一个收起的功能就行」:「在职位板查看其余 N 个」链撤;
 * 展开钮改成展开 / 收起来回切。
 * 2026-09-14 Frank「这个翻译老是翻译不全啊」:没 NOC 译名的行一次批量懒翻标题当副题(useTitleMap)。
 * 2026-09-19 Frank「这种里面的链接都改成弹框显示」:给了 onOpenJob 的每一行都开弹框 —— 已载入的整行直接交,
 * 没载入的由行自己现取(原先只有已载入的能开,其余跳页)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { useState } from 'react'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Updated } from '@/components/time'
import { JobMiniRow } from './jobminirow'
import {
  CARD_HEAD_CLS, CARD_MD_CLS, CLS_SEP, JOBS_FIRST_N, LANG_EN, PAREN_CLOSE, PAREN_OPEN, PLAIN_BTN_KIND,
} from './constants'
import {
  jobsMoreLabelOf, jobsShownOf, jobSubOf, makeJobsMore, makeJobsReset, subOrTitleOf, untitledOf, zhShownOf,
} from './functions'
import { useTitleMap } from './hooks'
import type { CompanyJobFact, CompanyJobsCardIn } from './types'
import css from './companies.module.css'

/**
 * 在招职位卡。
 *
 * @param props 公司档案、取词函数、界面语言、更新时刻与两个回调(逐格注释见 CompanyJobsCardIn)。
 * @returns 一张卡;一个在招岗都没有时整卡不渲。
 */
export function CompanyJobsCard({
  company, t, lang, updatedAt, onOpenJob, resolveJob, newTab, showTrans,
}: CompanyJobsCardIn) {
  const [shownN, setShownN] = useState(JOBS_FIRST_N)
  const shown = jobsShownOf({ jobs: company.jobs, n: shownN })
  const hidden = company.jobs.length - shown.length
  const titleMap = useTitleMap({ titles: untitledOf({ jobs: shown, lang }), lang })
  if (company.jobs.length === 0) {
    return null
  }
  const rows = []
  for (const job of shown) {
    let row: CompanyJobFact | null = null
    if (resolveJob != null) {
      row = resolveJob(job.id)
    }
    const sub = subOrTitleOf({ sub: jobSubOf({ job, lang }), title: job.title, map: titleMap })
    rows.push(
      <JobMiniRow key={job.id}
        id={job.id}
        title={job.title}
        sub={zhShownOf({ show: showTrans || lang === LANG_EN, text: sub })}
        salaryText={job.salaryText}
        city={job.city}
        onOpenJob={onOpenJob}
        row={row}
        newTab={newTab} />,
    )
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS + CLS_SEP + cssOf(css.jobsHead)}>
        {t('co.openJobs')} {PAREN_OPEN}{company.openCount}{PAREN_CLOSE}
        <Updated iso={updatedAt} t={t} />
      </div>
      <div>
        {rows}
        {hidden > 0 && (
          <Button kind={PLAIN_BTN_KIND} onClick={makeJobsMore({ n: shownN, set: setShownN })}
            className={cssOf(css.showAll)}>
            {jobsMoreLabelOf({ t, hidden })}
          </Button>
        )}
        {shownN > JOBS_FIRST_N && (
          <Button kind={PLAIN_BTN_KIND} onClick={makeJobsReset({ set: setShownN })}
            className={cssOf(css.showAll)}>
            {t('act.collapse')}
          </Button>
        )}
      </div>
    </div>
  )
}

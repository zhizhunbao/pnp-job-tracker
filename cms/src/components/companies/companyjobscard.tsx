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
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { useState } from 'react'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Updated } from '@/components/time'
import { CompanyLink } from './companylink'
import { JobMiniRow } from './jobminirow'
import {
  CARD_HEAD_CLS, CARD_MD_CLS, CLS_SEP, JOBS_FIRST_N, LINK_CLS, PAREN_CLOSE, PAREN_OPEN, PLAIN_BTN_KIND,
  URL_BOARD_QUERY_HEAD,
} from './constants'
import { jobSubOf, jobsShownOf, makeOpenJob, makeShowAll } from './functions'
import type { CompanyJobsCardIn, GoBackFn } from './types'
import css from './companies.module.css'

/**
 * 在招职位卡。
 *
 * @param props 公司档案、取词函数、界面语言、更新时刻与两个回调(逐格注释见 CompanyJobsCardIn)。
 * @returns 一张卡;一个在招岗都没有时整卡不渲。
 */
export function CompanyJobsCard({
  company, t, lang, updatedAt, onOpenJob, resolveJob, newTab,
}: CompanyJobsCardIn) {
  const [allJobs, setAllJobs] = useState(false)
  if (company.jobs.length === 0) {
    return null
  }
  const rows = []
  for (const job of jobsShownOf({ jobs: company.jobs, all: allJobs })) {
    let onOpen: GoBackFn | null = null
    if (resolveJob != null && onOpenJob != null) {
      const hit = resolveJob(job.id)
      if (hit != null) {
        onOpen = makeOpenJob({ job: hit, onOpenJob })
      }
    }
    rows.push(
      <JobMiniRow key={job.id}
        id={job.id}
        title={job.title}
        sub={jobSubOf({ job, lang })}
        salaryText={job.salaryText}
        city={job.city}
        onOpen={onOpen}
        newTab={newTab} />,
    )
  }
  const restN = company.openCount - company.jobs.length
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS + CLS_SEP + cssOf(css.jobsHead)}>
        {t('co.openJobs')} {PAREN_OPEN}{company.openCount}{PAREN_CLOSE}
        <Updated iso={updatedAt} t={t} />
      </div>
      <div>
        {rows}
        {allJobs === false && company.jobs.length > JOBS_FIRST_N && (
          <Button kind={PLAIN_BTN_KIND} onClick={makeShowAll({ set: setAllJobs })} className={cssOf(css.showAll)}>
            {t('act.showAll', { n: company.jobs.length - JOBS_FIRST_N })}
          </Button>
        )}
        {allJobs && restN > 0 && (
          <div className={css.showAllBoard}>
            <CompanyLink href={URL_BOARD_QUERY_HEAD + encodeURIComponent(company.name)}
              newTab={newTab}
              className={cssOf(css.link12) + CLS_SEP + LINK_CLS}>
              {t('act.showAllBoard', { n: restN })}
            </CompanyLink>
          </div>
        )}
      </div>
    </div>
  )
}

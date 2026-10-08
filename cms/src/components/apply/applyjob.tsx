'use client'
/**
 * 投递页顶上的本岗职位卡(card 桶 JobCard):职位名链回职位页、公司、城市与省码;已投递时右上挂绿色「已投递」。
 * 2026-10-07 投递并进「我的求职」:发出后投递区收起、记录进下面的表,绿标随之撤。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { JobCard } from '@/components/card'
import { LOC_SEP, URL_JOB_HEAD } from './constants'
import { locationOf } from './functions'
import type { ApplyJobIn } from './types'
import css from './apply.module.css'

/**
 * 本岗职位卡。
 *
 * @param props 本岗。
 * @returns 职位卡。
 */
export function ApplyJob({ job }: ApplyJobIn) {
  return (
    <div className={css.job}>
      <JobCard title={{ text: job.title, href: URL_JOB_HEAD + job.id }}
        company={{ text: job.company }}
        location={locationOf({ city: job.city, province: job.province, sep: LOC_SEP })} />
    </div>
  )
}

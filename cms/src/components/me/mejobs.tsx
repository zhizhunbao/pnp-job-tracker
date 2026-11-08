'use client'
/**
 * me 域的结构:「我的求职」一整页 = 页标题 + 子桶 jobs 的正文(今日推荐 / 我的收藏 / 我的投递三个页签)
 * (2026-11-07 照效果图在新域重写,docs/design/我的/我的框架-20261107.md 2.1)。分层态在这里按当前用户拼好交下去;
 * 「打开」投递记录框的函数取兄弟子桶 apps 的,由本件注入(子桶之间不互取)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { openAppView } from './apps'
import { SEC_SJOBS } from './constants'
import { planOf } from './functions'
import { JobsBody } from './jobs'
import { MeHead } from './mehead'
import type { MeJobsPageIn } from './types'

/**
 * 我的求职一页。
 *
 * @param props 框架三格、当前用户、Pro 否与两个代数。
 * @returns 页标题 + 正文。
 */
export function MeJobs({ t, narrow, open, onOpen, me, pro, gen, asked, onFill }: MeJobsPageIn) {
  return (
    <>
      <MeHead sec={SEC_SJOBS} t={t} narrow={narrow} open={open} onOpen={onOpen} />
      <JobsBody t={t} pro={pro} plan={planOf(me)} gen={gen} asked={asked} onFill={onFill} openApp={openAppView} />
    </>
  )
}

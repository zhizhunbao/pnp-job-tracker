'use client'
/**
 * me 域的结构:「我的简历」一整页 = 页标题(右边「生成简历」+「上传简历」)+ 子桶 resume 的正文
 * (2026-11-07 照效果图在新域重写,docs/design/我的/我的框架-20261107.md 2.3)。
 *
 * @author Frank
 * @time 2026-11-07 17:30:00
 */
import { SEC_RESUME } from './constants'
import { MeHead } from './mehead'
import { ResumeActs, ResumeBody, useResume } from './resume'
import type { MeSecPageIn } from './types'

/**
 * 我的简历一页。
 *
 * @param props 取词、窄屏否、导航抽屉开没开与拉开抽屉。
 * @returns 页标题 + 正文。
 */
export function MeResume({ t, narrow, open, onOpen }: MeSecPageIn) {
  const r = useResume({ t })
  return (
    <>
      <MeHead sec={SEC_RESUME} t={t} narrow={narrow} open={open} onOpen={onOpen} acts={<ResumeActs r={r} t={t} />} />
      <ResumeBody r={r} t={t} />
    </>
  )
}

'use client'
/**
 * me 桶子桶 profile 的结构:「教育经历」那一格(2026-10-13 档案加题):一段一行,院校所在地 / 公立私立 / 课程时长三个词并排(不拼中点),
 * 选项字与弹框里的下拉同一套(gate 桶 makeEduLabel)。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { cssOf } from '@/components/css'
import { eduPicksOf, makeEduLabel } from '@/components/gate'
import { EDU_F_KIND, EDU_F_LEN, EDU_F_PROV } from './constants'
import type { PfEduIn } from './types'
import css from './profile.module.css'

/**
 * 教育经历几行。
 *
 * @param props 教育经历串与取词函数。
 * @returns 一段一行。
 */
export function ProfileEdu({ edu, t }: PfEduIn) {
  const prov = makeEduLabel({ t, f: EDU_F_PROV })
  const kind = makeEduLabel({ t, f: EDU_F_KIND })
  const len = makeEduLabel({ t, f: EDU_F_LEN })
  const lines = []
  for (const [i, r] of eduPicksOf(edu).entries()) {
    lines.push(
      <span key={i} className={cssOf(css.eduLine)}>
        <span>{prov(r.prov)}</span>
        <span>{kind(r.kind)}</span>
        <span>{len(r.len)}</span>
      </span>,
    )
  }
  return <div className={cssOf(css.edu)}>{lines}</div>
}

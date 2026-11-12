'use client'
/**
 * me 桶子桶 profile 的结构:「教育经历」那一格(2026-10-13 档案加题):一段一行,院校所在地 / 公立私立 / 课程时长三个词并排(不拼中点),
 * 选项字与弹框里的下拉同一套(gate 桶 makeEduLabel)。
 * 2026-11-12 Frank「这部分不能直接显示具体的年份和学历 证书吗?」:一条两行 —— 第一行年份与证书或学历名称,第二行灰字学校与
 * 原先那三个词(逗号连);年份和名称都没填的老档案,第一行退回原先那一句。两行怎么拼在 functions 的 pfEduLinesOf。
 * 2026-11-12 Frank「有年份 还需要时长吗」「简历里能抽出来吧」:有年份的那一条,第二行不再出课程时长(只剩学校、所在地、公立私立);
 * 没有年份的照旧带时长。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import { pfEduLinesOf } from './functions'
import type { PfEduIn } from './types'
import css from './profile.module.css'

/**
 * 教育经历几行。
 *
 * @param props 教育经历明细与取词函数。
 * @returns 一条两行。
 */
export function ProfileEdu({ list, t }: PfEduIn) {
  const lines = []
  for (const [i, r] of pfEduLinesOf({ list, t }).entries()) {
    const words = []
    for (const [j, w] of r.main.entries()) {
      words.push(<span key={j}>{w}</span>)
    }
    lines.push(
      <div key={i} className={cssOf(css.eduItem)}>
        <span className={cssOf(css.eduLine)}>{words}</span>
        {r.sub !== TEXT_NONE && <span className={cssOf(css.eduSub)}>{r.sub}</span>}
      </div>,
    )
  }
  return <div className={cssOf(css.edu)}>{lines}</div>
}

'use client'
/**
 * 「我的简历」这一节(2026-10-05 立;10-06 改一人多份,最多 5 份、一份默认,预览改本页弹框):
 * 隐藏文件框 + 三种状态 —— 清单没回来先占位、一份都没有出上传区、有了出一张张卡片加「添加简历」一行;
 * 下面一行报错;点「预览」开弹框。节标题不另出:横排页签上已经写着「我的简历」。
 * 2026-10-08 照 AIApply 重设计:「添加简历」那一行挪到卡片上方,卡片改成网格(电脑一行三张)。
 *
 * @author Frank
 * @time 2026-10-06 12:18:31
 */
import { RF_ERR_NONE } from './constants'
import { thumbSrcOf } from './functions'
import { useResumeFile } from './hooks'
import { ResumeAdd } from './resumeadd'
import { ResumeCards } from './resumecards'
import { ResumeDrop } from './resumedrop'
import { ResumeInput } from './resumeinput'
import { ResumePreview } from './resumepreview'
import type { ResumeFileIn } from './types'
import css from './account.module.css'

/**
 * 渲染「我的简历」一节。
 *
 * @param props 取词函数。
 * @returns 上传区或卡片清单、报错行、预览弹框。
 */
export function ResumeFile({ t }: ResumeFileIn) {
  const p = useResumeFile()
  return (
    <div>
      <ResumeInput onMount={p.onInputMount} onPick={p.onPick} />
      {p.checked === false && <div className={css.rfSkel} />}
      {p.checked && p.items.length === 0 && <ResumeDrop p={p} t={t} />}
      {p.checked && p.items.length > 0 && <ResumeAdd p={p} t={t} />}
      {p.checked && p.items.length > 0 && <ResumeCards p={p} t={t} />}
      {p.err !== RF_ERR_NONE && <div className={css.rfErr}>{t(p.err)}</div>}
      {p.preview != null && (
        <ResumePreview src={thumbSrcOf(p.preview)} title={p.preview.fileName} onClose={p.onPreviewClose} t={t} />
      )}
    </div>
  )
}

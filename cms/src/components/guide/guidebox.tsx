'use client'
/**
 * 站内向导对话框:开场白 + 胶囊在线程最上方(随线程一起滚,从头到尾只有一份),轮次在下,composer 钉底。
 * 只渲染不判断:类别、目的地、URL 全由服务端给。compact 档卸掉卡壳嵌进挂件面板。
 *
 * @author Frank
 * @time 2026-09-05 16:00:00
 */
import { TEXT_NONE } from './constants'
import { useGuideBox } from './hooks'
import { GuideComposer } from './guidecomposer'
import { GuideHello } from './guidehello'
import { GuideTurn } from './guideturn'
import type { GuideBoxIn } from './types'
import css from './guide.module.css'

/**
 * 对话框(独立卡壳;compact 档卸壳嵌进挂件面板)。
 *
 * @param props compact / autoFocus / prefill(见 GuideBoxIn)。
 * @returns 对话框整块。
 */
export function GuideBox({ compact = false, autoFocus = false, prefill = TEXT_NONE }: GuideBoxIn) {
  const { p, threadEl, taEl } = useGuideBox({ prefill, autoFocus })
  const turns = []
  for (const [i, turn] of p.turns.entries()) {
    turns.push(<GuideTurn key={i} p={p} turn={turn} i={i} />)
  }
  const card = (
    <div className={css.cbCard}>
      <div ref={threadEl} className={css.cbThread} onScroll={p.onScroll}>
        <GuideHello p={p} />
        {turns}
      </div>
      <GuideComposer p={p} taEl={taEl} />
    </div>
  )
  if (compact) {
    return <div className={css.cbFill}>{card}</div>
  }
  return <div>{card}</div>
}

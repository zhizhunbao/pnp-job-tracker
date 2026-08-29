'use client'
/**
 * 域内小件:分区标题 + 内容。2026-08-10 Frank「所有的展开和关闭按钮都删了」:
 * 折叠开关连同 localStorage 记忆一并撤,分区恒展开。
 * 右槽放标题行右侧的控件(TopN 下拉 / 外链 / 对话导流钮);sub 档是伞标题下的子标题
 * (2026-08-08 二次拍板「二级导航和下面对不上」,字号降一档,与「政策动态」既有 h3 同 precedent)。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { secHeadClsOf } from './functions'
import type { SecIn } from './types'
import css from './start.module.css'

/**
 * 渲染一个分区。
 *
 * @param props 标题、右槽、子标题档与内容。
 * @returns 分区。
 */
export function Sec({ title, right, sub = false, children }: SecIn) {
  return (
    <div>
      <h2 className={secHeadClsOf({ sub })}>
        {title}
        {right != null && <span className={css.headRight}>{right}</span>}
      </h2>
      {children}
    </div>
  )
}

'use client'
/**
 * 职位主表(全站卡片与表格的形态基准)。列宽全部来自列宽机器(表头宽优先 → 内容宽其次 →
 * 和恒等于容器宽);还没量到时不下 colgroup,让浏览器 auto 布局顶一帧,量完(绘制前)即换像素。
 * #35 已整轮回滚(2026-07-11 用户三轮拍板互斥后收敛:宽度不变 + 可滑动 + 无小注 = 原状):
 * v1 整列隐藏 + 小注 → 用户否;v2 容器收口到整列边界 → 用户否(表格变窄)。维持全宽横滚,
 * 末列在视口边缘被切属滚动常态,不再干预。此教训记档:改表格布局前先给用户看效果图。
 * 🔴 不并进通用 table 桶:那个是「简单表统一壳」(客户端排序、配置式列声明);职位主表是
 * 另一套机器(服务端排序、冻结列、字段面板、列宽落 cookie)。硬并会把共享组件撑成怪物 ——
 * 旧拍板,2026-08-28 换装批复核仍成立(两边零行为重复)。
 * 2026-08-28 换装批自 Jobs.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { SKELETON_ROWS } from './constants'
import { headCellsOf, isAltRow, tableClsOf, wrapClsOf } from './functions'
import { BoardRow } from './boardrow'
import { ColGroup } from './colgroup'
import { EmptyNote } from './emptynote'
import { HeadCell } from './headcell'
import { SkeletonRow } from './skeletonrow'
import type { BoardTableIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染职位主表。
 *
 * @param props 职位板整台状态机与表头锚点。
 * @returns 表格(换血中出骨架行,一行都没有出空态)。
 */
export function BoardTable({ b, headRowRef }: BoardTableIn) {
  const heads = []
  for (const h of headCellsOf(b)) {
    heads.push(<HeadCell key={h.k} h={h} />)
  }
  const body = []
  if (b.matchView && b.data.swapping) {
    for (let i = 0; i < SKELETON_ROWS; i = i + 1) {
      body.push(<SkeletonRow key={i} cols={b.cols.shown} />)
    }
  } else {
    let i = 0
    for (const j of b.data.rows) {
      body.push(<BoardRow key={j.id} b={b} job={j} alt={isAltRow(i)} />)
      i = i + 1
    }
  }
  return (
    <div className={wrapClsOf(b.data.swapping)}>
      {/* eslint-disable-next-line react/forbid-dom-props -- 表宽是列宽机器算出来的像素(溢出时),不是排版 */}
      <table className={tableClsOf(b.cols.cw.ready)} style={{ width: b.cols.cw.tableWidth }}>
        {b.cols.cw.ready && <ColGroup b={b} />}
        <thead>
          <tr ref={headRowRef} className={cssOf(css.headRow)}>{heads}</tr>
        </thead>
        <tbody>
          {body}
          {b.data.rows.length === 0 && (
            <tr>
              <td colSpan={b.cols.shown.length} className={cssOf(css.empty)}>
                <EmptyNote text={b.emptyText} link={b.emptyLink} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

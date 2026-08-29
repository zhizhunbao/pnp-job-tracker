'use client'
/**
 * 域内小件:表格的列宽声明。量到了给像素,只有 cookie 种子时给百分比 —— 服务端渲染就能定版式,
 * 水合不再抻一下(原来首屏走浏览器自动布局,量完再换固定布局,表格明显抻一下,实测 CLS 0.087)。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import type { BoardPanelIn } from './types'

/**
 * 渲染列宽声明。
 *
 * @param props 职位板整台状态机。
 * @returns 一组 col(必须裹在 <colgroup> 里 —— <col> 不许直接当 <table> 的子节点,
 *   2026-08-29 实拍水合报错抓回:换装时这层包装丢了)。
 */
export function ColGroup({ b }: BoardPanelIn) {
  const cols = []
  for (const c of b.cols.shown) {
    // eslint-disable-next-line react/forbid-dom-props -- 列宽是列宽机器量出来的运行时数据,不是排版
    cols.push(<col key={c.key} style={{ width: b.cols.cw.width(c.key) }} />)
  }
  return (
    <colgroup>{cols}</colgroup>
  )
}

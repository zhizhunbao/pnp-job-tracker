'use client'
/**
 * 表格一格。一格三件:显示什么、格子什么色、点了去哪 —— 前两件由 functions 的 cellViewOf
 * 算成展示行(那条链是「本站怎么解读一条岗位」的全部:薪资绿不绿看清洗产物不看原文、
 * PNP 三档强弱、EE 休眠、AIP 被官方清单挡下……),这里只按档渲。
 * #175:hover 高亮只随可点格(可点必有态,不可点必无);裁剪与断词只给数据格,
 * 操作列不挂 —— 它装的是按钮,给了会把钮裁掉。
 * 2026-08-28 换装批自 Jobs.tsx 与 Table.tsx 重写落位。
 * 2026-08-29:格内链接补回 `.link`(换装时漏挂,于是走了 <a> 的浏览器默认 = 继承色 + 下划线;
 * LinkButton 只管标签语义不带样式基座,长相全靠调用域给的这个类)。
 * 2026-09-19 Frank「那把点背景给去掉呢」→「按建议做,省市保留空白」:可点格只有字本身能点(.hit),格子空白处不再响应;
 * 省 / 市 / 地址的字是地图外链,它们的说明弹框仍靠点整格开(bgClick)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { BoardCellBody } from './boardcellbody'
import { boardCellViewOf, cellClsOf, cellStyleOf, clickOrNone, hitClickOf, tdClickOf, titleOrNone } from './functions'
import type { BoardCellIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染表格一格。
 *
 * @param props 整台状态机、这一行、列键与斑马纹档。
 * @returns 一格。
 */
export function BoardCell({ b, job, k, alt }: BoardCellIn) {
  const c = boardCellViewOf({ b, job, k, alt })
  const hit = clickOrNone(hitClickOf(c))
  return (
    <td onClick={clickOrNone(tdClickOf(c))}
      title={titleOrNone(c.title)}
      className={cellClsOf(c)}
      // eslint-disable-next-line react/forbid-dom-props -- 冻结列的 sticky 偏移与大分类的逐类色都是运行时数据,不是排版
      style={cellStyleOf(c)}>
      {hit == null && <BoardCellBody b={b} c={c} />}
      {hit != null && <span className={cssOf(css.hit)} onClick={hit}><BoardCellBody b={b} c={c} /></span>}
    </td>
  )
}

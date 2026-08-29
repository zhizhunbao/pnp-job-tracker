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
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { KIND, TARGET_BLANK, TEXT_NONE } from './constants'
import { boardCellViewOf, cellClsOf, cellStyleOf, clickOrNone, titleOrNone } from './functions'
import { ActionsCell } from './actionscell'
import { LockCell } from './lockcell'
import { MatchCell } from './matchcell'
import { NeedProfileCell } from './needprofilecell'
import { StreamCell } from './streamcell'
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
  return (
    // eslint-disable-next-line react/forbid-dom-props -- 冻结列的 sticky 偏移与大分类的逐类色都是运行时数据,不是排版
    <td onClick={clickOrNone(c.onClick)} title={titleOrNone(c.title)} className={cellClsOf(c)} style={cellStyleOf(c)}>
      {c.view.kind === KIND.actions && (
        <ActionsCell label={c.saveLabel} on={c.saved} onToggle={c.onSave} />
      )}
      {c.view.kind === KIND.lock && (
        <LockCell mask={c.view.text} title={c.view.title} onUpsell={b.onUpsellLock} />
      )}
      {c.view.kind === KIND.match && (
        <MatchCell text={c.view.text} level={c.view.level} title={c.view.title} />
      )}
      {c.view.kind === KIND.needProfile && <NeedProfileCell text={c.view.text} />}
      {c.view.kind === KIND.stream && <StreamCell text={c.view.text} />}
      {c.view.kind === KIND.text && c.view.href === TEXT_NONE && c.view.text}
      {c.view.kind === KIND.text && c.view.href !== TEXT_NONE && (
        <LinkButton href={c.view.href} target={TARGET_BLANK} onClick={c.onLink}
          className={cssOf(css.link)}>{c.view.text}</LinkButton>
      )}
    </td>
  )
}

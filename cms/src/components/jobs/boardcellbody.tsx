'use client'
/**
 * 表格一格里的内容:按展示行的档渲(收藏钮 / 锁格 / 匹配度 / 待建档 / 抽选流 / 文字 / 外链)。
 * 2026-09-19 自 boardcell.tsx 拆出:可点格改成「只有字能点」后,同一份内容要在「直接放进格子」与「包一层可点的字」
 * 两处用(Frank「那把点背景给去掉呢」)。格内链接的 `.link` 类是 2026-08-29 补回的(LinkButton 不带样式基座)。
 * 2026-09-23「我的匹配」整拆:匹配度与待建档两档随匹配列一起撤。
 *
 * @author Frank
 * @time 2026-09-19 03:00:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { KIND, TARGET_BLANK, TEXT_NONE } from './constants'
import { ActionsCell } from './actionscell'
import { LockCell } from './lockcell'
import { StreamCell } from './streamcell'
import type { BoardCellBodyIn } from './types'
import css from './jobs.module.css'

/**
 * 一格里的内容(按展示行的档渲;整格 / 字上两种点法共用这一份)。
 *
 * @param props 整台状态机与这一格的展示行。
 * @returns 格内内容。
 */
export function BoardCellBody({ b, c }: BoardCellBodyIn) {
  return (
    <>
      {c.view.kind === KIND.actions && (
        <ActionsCell label={c.saveLabel} on={c.saved} onToggle={c.onSave} />
      )}
      {c.view.kind === KIND.lock && (
        <LockCell mask={c.view.text} title={c.view.title} onUpsell={b.onUpsellLock} />
      )}
      {c.view.kind === KIND.stream && <StreamCell text={c.view.text} />}
      {c.view.kind === KIND.text && c.view.href === TEXT_NONE && c.view.text}
      {c.view.kind === KIND.text && c.view.href !== TEXT_NONE && (
        <LinkButton href={c.view.href} target={TARGET_BLANK} onClick={c.onLink}
          className={cssOf(css.link)}>{c.view.text}</LinkButton>
      )}
    </>
  )
}

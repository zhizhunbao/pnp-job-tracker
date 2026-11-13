'use client'
/**
 * me 域的结构:收件箱一整页 = 页标题(右边转发开关)+ 子桶 inbox 的正文
 * (2026-11-07 照效果图在新域重写,docs/design/我的/我的框架-20261107.md 2.2)。
 * 2026-11-13 Frank「这个是不是不保留」「照这个做」:页标题右边的转发开关撤(固定都转)。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { SEC_INBOX } from './constants'
import { InboxBody, useInbox } from './inbox'
import { MeHead } from './mehead'
import type { MeInboxPageIn } from './types'

/**
 * 收件箱一页。
 *
 * @param props 取词、导航抽屉开没开、拉开抽屉与打开投递记录框。
 * @returns 页标题 + 正文。
 */
export function MeInbox({ t, open, onOpen, openApp }: MeInboxPageIn) {
  const p = useInbox({ t, openApp })
  return (
    <>
      <MeHead sec={SEC_INBOX} t={t} narrow={p.narrow} open={open} onOpen={onOpen} acts={null} />
      <InboxBody p={p} t={t} />
    </>
  )
}

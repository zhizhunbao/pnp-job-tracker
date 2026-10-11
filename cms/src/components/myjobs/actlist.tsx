'use client'
/**
 * 一排钮(2026-10-10 批 2):有手柄的是按钮(主钮蓝底 / 次钮带框),只有链接的:附件(简历 / 求职信)是新标签开的链接钮,
 * 「打开」是同页去职位页的带框钮。表格「操作」格与手机卡底行共用。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import { Button, LinkButton } from '@/components/button'
import { ACT_COVER, ACT_RESUME, TARGET_BLANK } from './constants'
import type { ActListIn } from './types'
import css from './myjobs.module.css'

/**
 * 一排钮。
 *
 * @param props 钮。
 * @returns 一排;没有钮不渲。
 */
export function ActList({ acts }: ActListIn) {
  const out = []
  for (const a of acts) {
    if (a.onClick != null) {
      out.push(<Button key={a.key} kind={a.kind} sm onClick={a.onClick}>{a.text}</Button>)
    } else if (a.key === ACT_RESUME || a.key === ACT_COVER) {
      out.push(<LinkButton key={a.key} href={a.href} target={TARGET_BLANK}>{a.text}</LinkButton>)
    } else {
      out.push(<Button key={a.key} kind={a.kind} sm href={a.href}>{a.text}</Button>)
    }
  }
  if (out.length === 0) {
    return null
  }
  return <span className={css.actList}>{out}</span>
}

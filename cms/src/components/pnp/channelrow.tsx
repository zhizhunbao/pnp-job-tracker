'use client'
/**
 * 域内小件:「本岗能走的通道」卡里的一条(官方英文原名 + 界面语言直白名灰字 + 条件标签;2026-09-30 通道补全批二自 PnpChannelCard
 * 拆出,上下两段共用)。标签胶囊的类名取通用 tag 桶(条件 gray、状态 warn),不另造。
 *
 * @author Frank
 * @time 2026-09-30 17:10:00
 */
import { TEXT_NONE } from './constants'
import { channelClsOf } from './functions'
import type { ChannelRowIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一条通道。
 *
 * @param props 这一条。
 * @returns 条目。
 */
export function ChannelRow({ c }: ChannelRowIn) {
  const tags = []
  for (const g of c.tags) {
    tags.push(<span key={g.key} className={g.cls}>{g.text}</span>)
  }
  return (
    <div className={channelClsOf()}>
      {c.name}
      {c.sub !== TEXT_NONE && <span className={css.zh}>{c.sub}</span>}
      {tags.length > 0 && <div className={css.chanTags}>{tags}</div>}
    </div>
  )
}

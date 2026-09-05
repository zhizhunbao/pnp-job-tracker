'use client'
/**
 * 站内地图:主要页面各一张卡,点一个过去。闲聊类(打招呼、「有什么功能」「怎么使用」)的答复
 * (2026-09-05 Frank「???? 这是回答了什么」:模型那句自我介绍等于没答,站上有什么得真列出来)。
 *
 * @author Frank
 * @time 2026-09-05 19:30:00
 */
import { LinkButton, btnClsOf } from '@/components/button'
import { cssOf } from '@/components/css'
import { MAP_DESTS, PLAIN_BTN_KIND } from './constants'
import { destLabelOf, makeMapClick, mapHrefOf } from './functions'
import type { GuideHelloIn } from './types'
import css from './guide.module.css'

/**
 * 站内地图卡。
 *
 * @param props 面板。
 * @returns 卡组。
 */
export function GuideMap({ p }: GuideHelloIn) {
  const cardCls = btnClsOf({ kind: PLAIN_BTN_KIND, sm: false, lg: false, active: false, className: cssOf(css.cbOpt) })
  const cards = []
  for (const dest of MAP_DESTS) {
    cards.push(
      <LinkButton key={dest} href={mapHrefOf(dest)} className={cardCls} onClick={makeMapClick(dest)}>
        <span className={css.cbOptMain}><span className={css.cbOptLabel}>{destLabelOf({ t: p.t, dest })}</span></span>
      </LinkButton>,
    )
  }
  return <div className={css.cbOpts}>{cards}</div>
}

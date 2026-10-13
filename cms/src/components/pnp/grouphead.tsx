'use client'
/**
 * 域内小件:资讯「申请门槛」「申请步骤」两页的组头 —— 黑字一行,有译名时下面一行灰字(名字一律英文在上、译名灰字在下)。
 * 2026-10-12 Frank 选「照搬各省官方分类」:各省组头是官网英文原名,中 / 韩界面下面灰字译名;联邦四组只有黑字一行。
 *
 * @author Frank
 * @time 2026-10-12 22:40:00
 */
import type { GroupHeadIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一行组头。
 *
 * @param props 组头黑字与灰字。
 * @returns 组头。
 */
export function GroupHead({ head, sub }: GroupHeadIn) {
  return (
    <div className={css.groupHead}>
      {head}
      {sub !== '' && <span className={css.groupSub}>{sub}</span>}
    </div>
  )
}

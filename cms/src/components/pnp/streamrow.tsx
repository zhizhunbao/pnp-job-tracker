'use client'
/**
 * 域内小件:省清单里的一行职业(职业码 + 职业名 + 译名灰注 + 两个小标)。
 * 命中本岗那一行琥珀高亮,并把自己登记进 ref 盒 —— 高亮行要就近滚进视野。
 * 2026-08-28 换装批自 Pnp.tsx 的 PnpListSection 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { TEXT_NONE } from './constants'
import { makeHitRef, rowClsOf, tagClsOf } from './functions'
import type { StreamRowIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染省清单的一行。
 *
 * @param props 洗好的这一行与命中行的 ref 盒。
 * @returns 清单行。
 */
export function StreamRow({ r, matchRef }: StreamRowIn) {
  return (
    <div ref={makeHitRef({ hit: r.hit, ref: matchRef })} className={rowClsOf({ hit: r.hit })}>
      <span className={css.noc}>{r.noc}</span>
      <span className={css.flex1}>
        {r.name}
        {r.zh !== TEXT_NONE && <span className={css.zh}>{r.zh}</span>}
      </span>
      {r.yourTag !== TEXT_NONE && <span className={tagClsOf({ muted: false })}>{r.yourTag}</span>}
      {r.gtaTag !== TEXT_NONE && <span className={tagClsOf({ muted: true })}>{r.gtaTag}</span>}
    </div>
  )
}

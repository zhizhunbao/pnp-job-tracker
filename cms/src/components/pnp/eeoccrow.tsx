'use client'
/**
 * 域内小件:EE 类别清单里的一行职业(职业码 + 职业名 + 译名灰注 + 技能层级 + 命中标)。
 * 命中本岗那一行浅蓝高亮(与省清单的琥珀分开 —— 两套清单不是一回事),并把自己登记进 ref 盒。
 * 2026-08-28 换装批自 Pnp.tsx 的 EeCategorySection 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { TEXT_NONE } from './constants'
import { makeHitRef, occRowClsOf } from './functions'
import type { EeOccRowIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染 EE 类别清单的一行。
 *
 * @param props 洗好的这一行与命中行的 ref 盒。
 * @returns 清单行。
 */
export function EeOccRow({ r, matchRef }: EeOccRowIn) {
  return (
    <div ref={makeHitRef({ hit: r.hit, ref: matchRef })} className={occRowClsOf({ hit: r.hit })}>
      <span className={css.occNoc}>{r.noc}</span>
      <span className={css.flex1}>
        {r.title}
        {r.zh !== TEXT_NONE && <span className={css.zh}>{r.zh}</span>}
      </span>
      {r.teer !== TEXT_NONE && <span className={css.teer}>{r.teer}</span>}
      {r.yourTag !== TEXT_NONE && <span className={css.tagS}>{r.yourTag}</span>}
    </div>
  )
}

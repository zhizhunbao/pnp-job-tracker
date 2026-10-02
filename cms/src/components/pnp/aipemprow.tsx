'use client'
/**
 * 域内小件:AIP 指定雇主清单的一行(雇主名 + 所在地灰字;形照职业清单行 StreamRow)。
 * 本岗雇主那一行高亮,并把自己登记进 ref 盒 —— 高亮行要就近滚进视野(2026-10-01 Frank「这个弹框需要列表,然后高亮雇主」)。
 *
 * 2026-10-02 三弹框统一第 3 步(Frank「这是不是 拆成人能看懂表格比较好」「不需要一次查询 1574 家吧」「可以,做吧」):一行写招牌(主文案)、门店与法人两行灰字(法人与招牌同字不写);手机 375
 * 宽三列放不下长法人名,改两行。
 *
 * @author Frank
 * @time 2026-10-01 14:13:21
 */
import { TEXT_NONE } from './constants'
import { makeHitRef, rowClsOf } from './functions'
import type { AipEmpRowIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染清单的一行。
 *
 * @param props 洗好的这一行与命中行的 ref 盒。
 * @returns 清单行。
 */
export function AipEmpRow({ r, matchRef }: AipEmpRowIn) {
  return (
    <div ref={makeHitRef({ hit: r.hit, ref: matchRef })} className={rowClsOf({ hit: r.hit })}>
      <span className={css.flex1}>
        {r.trade}
        {r.store !== TEXT_NONE && <span className={css.zh}>{r.store}</span>}
        {r.legal !== TEXT_NONE && <span className={css.zh}>{r.legal}</span>}
      </span>
    </div>
  )
}

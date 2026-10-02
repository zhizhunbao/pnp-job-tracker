'use client'
/**
 * 域内小件:AIP 指定雇主清单的一行(雇主名 + 所在地灰字;形照职业清单行 StreamRow)。
 * 本岗雇主那一行高亮,并把自己登记进 ref 盒 —— 高亮行要就近滚进视野(2026-10-01 Frank「这个弹框需要列表,然后高亮雇主」)。
 *
 * 2026-10-02 三弹框统一第 3 步(Frank「这是不是 拆成人能看懂表格比较好」「不需要一次查询 1574 家吧」「可以,做吧」):一行写招牌(主文案)、门店与法人两行灰字(法人与招牌同字不写);手机 375
 * 宽三列放不下长法人名,改两行。

 * 2026-10-02 Frank「这个怎么改成跳转了啊」「之前设计的 表格呢?」「不是展开收起吗?」「展开如果太多就一次展开 20 个」:回到三列表的一行(招牌 / 门店 / 法人,同表头三格对齐)。
 * 2026-10-02 Frank「这个也要加灰字 和 点击吧」:招牌下出界面语言译名灰字(英文界面不出);招牌对上雇主池的成蓝字,点了叠开公司弹框
 * (雇主池键当 slug 递,同雇主板);对不上的照旧黑字不可点。
 *
 * @author Frank
 * @time 2026-10-01 14:13:21
 */
import { LINK_CLS, TEXT_NONE } from './constants'
import { aipEmpAliasOf, aipEmpRowClsOf, makeHitRef, makeOpenAipCo } from './functions'
import type { AipEmpRowIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染清单的一行。
 *
 * @param props 洗好的这一行、命中行的 ref 盒、界面语言与点招牌的去处。
 * @returns 清单行。
 */
export function AipEmpRow({ r, matchRef, lang, onOpenCompany }: AipEmpRowIn) {
  const alias = aipEmpAliasOf({ r, lang })
  return (
    <div ref={makeHitRef({ hit: r.hit, ref: matchRef })} className={aipEmpRowClsOf({ hit: r.hit })}>
      <span>
        {onOpenCompany != null && r.poolKey !== TEXT_NONE && (
          <span className={LINK_CLS} onClick={makeOpenAipCo({ onOpenCompany, r })}>{r.trade}</span>
        )}
        {(onOpenCompany == null || r.poolKey === TEXT_NONE) && r.trade}
        {alias !== TEXT_NONE && <span className={css.empAlias}>{alias}</span>}
      </span>
      <span>{r.store}</span>
      <span className={css.empLegal}>{r.legal}</span>
    </div>
  )
}

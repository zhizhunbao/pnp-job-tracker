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
 * 2026-10-09 N6 批(Frank「职位名、公司名、地点同形」「点击默认弹框」「弹框里再点叠一层,关只关顶层」):招牌格换全站名字组件
 * name 桶 CompanyName —— 英文招牌在上、界面语译名灰字在下,点了经弹框总线叠开公司弹框(Ctrl 点新标签开公司页),上面这条的形不变,
 * 只是取名与点击的行为全站只住那一处。宿主递下来的点招牌回调(onOpenCompany 一路自 advisor 的事实件递来)随之退役,
 * 连同本桶的 makeOpenAipCo、aipEmpAliasOf(译名挑语种归 name 桶 subOf)、只为它俩活着的常量 LINK_CLS / LANG_ZH 与 .empAlias 灰字类
 * (10-02「这个也要加灰字 和 点击吧」那条拍板见上,形照旧)。
 *
 * @author Frank
 * @time 2026-10-01 14:13:21
 */
import { CompanyName } from '@/components/name'
import { aipEmpRowClsOf, makeHitRef } from './functions'
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
    <div ref={makeHitRef({ hit: r.hit, ref: matchRef })} className={aipEmpRowClsOf({ hit: r.hit })}>
      <span>
        <CompanyName name={r.trade} slug={r.poolKey} zh={r.aliasZh} ko={r.aliasKo} />
      </span>
      <span>{r.store}</span>
      <span className={css.empLegal}>{r.legal}</span>
    </div>
  )
}

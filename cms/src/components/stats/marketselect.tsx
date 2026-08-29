'use client'
/**
 * stats 域的结构:带灰字标签的原生下拉。控件区重设计(Frank 2026-07-28「这个地方是不是
 * 需要重新设计一下,并且加一些搜索和过滤条件」)定的形:四组都是单选,药丸横铺白占竖向空间,
 * 所以用原生 select 不用药丸(效果图 Frank 过目后实施)。
 * 通用件 select 域那份不复用 —— 它有量宽镜像、恒插一个空值档,且没有整只禁用与逐项置灰
 * (退化组合要置灰、通道与三级分类在非职业轴要整只禁用),两条都是本图的硬要求。
 * 2026-08-28 换装批立件,收拢本图七处逐字双胞胎。
 *
 * @author Frank
 * @time 2026-08-28 12:43:43
 */
import { selClsOf } from './functions'
import type { MarketSelectIn } from './types'
import css from './stats.module.css'

/**
 * 带标签的原生下拉。
 *
 * @param props 标签 / 值 / 选项 / 手柄 / 禁用(见 MarketSelectIn 逐格注释)。
 * @returns 标签 + 下拉。
 */
export function MarketSelect({ label, value, opts, onChange, disabled = false }: MarketSelectIn) {
  const items = []
  for (const o of opts) {
    items.push(<option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)
  }
  return (
    <>
      <span className={css.ctlLabel}>{label}</span>
      <select className={selClsOf()} value={value} onChange={onChange} disabled={disabled}>
        {items}
      </select>
    </>
  )
}

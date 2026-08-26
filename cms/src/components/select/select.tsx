'use client'
/**
 * select 域的量宽自适应下拉(2026-08-24 收拢三份逐字双胞胎:职位板 Sel /
 * 雇主板 Sel / 就业把脉 SbSel —— 把脉那份当初注释着「不 import Jobs.Sel
 * 免把整个职位板拖进本页包」,独立域正是那句话欠的解)。
 *
 * 量宽机制(2026-07-17 用户拍板「不要有空白」;沿革:07-07 曾统一封顶 150 治
 * 「按最长选项撑宽」,但短值仍剩大段空白):select 的内在宽度 = 最长选项,
 * 放流内怎么都会撑满上限 → 镜像文本按**当前选中值**在流内占宽,select 绝对
 * 铺满其上 —— 选短值不留空白,选长值自动变宽仍封顶(下拉展开始终显示全文);
 * 代价 = 切换选中值时同行控件轻微挪位(拍板已认)。
 * 把脉那份的箭头留白还是旧 30px,收拢时统一到 08-16 拍板的 38(末字不再被压)。
 *
 * @author Frank
 * @time 2026-08-24 10:00:00
 */
import { cssOf } from '@/components/css'
import { inputClsOf, SIZE_DEFAULT } from '@/components/input'
import { BOX_SIZE_DEFAULT } from './constants'
import { listOf, makeSelectChange, optionLabelOf, shownOf } from './functions'
import type { SelectIn, SelectSize } from './types'
import css from './select.module.css'

/**
 * 量宽下拉。
 * 镜像与真 select 吃同一份输入件基座(算一次两处共用 —— 分开算迟早走散)。
 *
 * @param props 值/选项/文案/宽档(见 SelectIn 逐格注释)。
 * @returns 下拉。
 */
export function Select({ value, onChange, opts, all, labelOf, size = BOX_SIZE_DEFAULT, tap = false }: SelectIn) {
  let labelIn = null
  if (labelOf != null) {
    labelIn = labelOf
  }
  const shown = shownOf({ value, all, labelOf: labelIn })
  const list = listOf({ value, opts })
  const sizeCls: Record<SelectSize, string> = {
    sm: cssOf(css.box),
    md: `${css.box} ${css.md}`,
    lg: `${css.box} ${css.lg}`,
  }
  const boxCls = sizeCls[size]
  const base = inputClsOf({ size: SIZE_DEFAULT, search: false, extra: null })
  let selCls = `${base} ${css.overlay}`
  if (tap) {
    selCls = `${selCls} ${css.tap}`
  }
  const opels = []
  for (const o of list) {
    opels.push(<option key={o} value={o}>{optionLabelOf({ labelOf: labelIn, o })}</option>)
  }
  return (
    <span className={boxCls}>
      <span aria-hidden className={`${base} ${css.measure}`}>{shown}</span>
      <select value={value} onChange={makeSelectChange(onChange)} className={selCls}>
        <option value="">{all}</option>
        {opels}
      </select>
    </span>
  )
}

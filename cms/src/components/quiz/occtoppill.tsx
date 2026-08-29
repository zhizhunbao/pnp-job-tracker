'use client'
/**
 * quiz 域的结构:热门/分类那一屏的一颗职业胶囊。右边最多两格灰字小注:重名时的官方
 * 英文名(库里同名不同码 —— 中文都叫「厨师」= 63200 Cooks 与 62200 Chefs)与在招数;
 * 多值拆列不拿「·」杂糅。名字砍尾但**不许截断**(走查 #296)。
 * 2026-08-28 换装批自 OccPicker.tsx 的热门列表循环体提出成件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { Button } from '@/components/button'
import {
  BTN_TYPE, CLS_OCC_PILL_CHECK, CLS_OCC_PILL_META, CLS_OCC_PILL_NAME, PLAIN_BTN_KIND, TEXT_NONE,
} from './constants'
import { IconCheck } from '@/components/icons'
import { pillClsOf, shortOcc } from './functions'
import type { OccTopPillIn } from './types'

/**
 * 渲染一颗热门/分类胶囊。
 *
 * @param props 显示名、重名小注、在招数文案、选中态与点击手柄。
 * @returns 一颗胶囊。
 */
export function OccTopPill({ label, hint, openText, on, onPick }: OccTopPillIn) {
  return (
    <Button kind={PLAIN_BTN_KIND}
      type={BTN_TYPE}
      className={pillClsOf({ on })}
      title={label}
      pressed={on}
      onClick={onPick}>
      {on && <span className={CLS_OCC_PILL_CHECK}><IconCheck /></span>}
      <span className={CLS_OCC_PILL_NAME}>{shortOcc(label)}</span>
      {hint !== TEXT_NONE && <span className={CLS_OCC_PILL_META}>{hint}</span>}
      {openText !== TEXT_NONE && <span className={CLS_OCC_PILL_META}>{openText}</span>}
    </Button>
  )
}

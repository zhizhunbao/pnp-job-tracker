'use client'
/**
 * quiz 域的结构:搜索结果里的一颗职业胶囊。名字砍尾只砍分类学尾巴,**不许截断**
 * (走查 #296:「Restaurant and food service m…」——名字是用户找自己那一行的唯一线索,
 * 截了他就认不出);右边那格灰字给五位码,让重名的两行分得开。
 * 2026-08-28 换装批自 OccPicker.tsx 的搜索结果循环体提出成件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { IconCheck } from '@/components/icons'
import { BTN_TYPE, CLS_OCC_PILL_CHECK, CLS_OCC_PILL_META, CLS_OCC_PILL_NAME, PLAIN_BTN_KIND } from './constants'
import { pillClsOf, shortOcc } from './functions'
import { Button } from '@/components/button'
import type { OccCandPillIn } from './types'

/**
 * 渲染一颗搜索结果胶囊。
 *
 * @param props 五位码、显示名、选中态与点击手柄。
 * @returns 一颗胶囊。
 */
export function OccCandPill({ noc, label, on, onPick }: OccCandPillIn) {
  return (
    <Button kind={PLAIN_BTN_KIND} type={BTN_TYPE} className={pillClsOf({ on })} pressed={on} onClick={onPick}>
      {on && <span className={CLS_OCC_PILL_CHECK}><IconCheck /></span>}
      <span className={CLS_OCC_PILL_NAME}>{shortOcc(label)}</span>
      <span className={CLS_OCC_PILL_META}>{noc}</span>
    </Button>
  )
}

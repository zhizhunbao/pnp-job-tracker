'use client'
/**
 * quiz 域的结构:底部汇总里的一颗已选职业胶囊(点一下取消选中)。名字还没拉回来时
 * 出一条与文字同高的占位条 —— 避免拿到名字时行高跳一下,也不在 chip 上甩一个「31301」
 * (代码不裸奔,2026-08-01 翻页改回来后实拍撞到)。
 * 2026-08-28 换装批自 OccPicker.tsx 的已选汇总循环体提出成件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { Button } from '@/components/button'
import { BTN_TYPE, CLS_OCC_CHIP, PLAIN_BTN_KIND, TEXT_NONE } from './constants'
import { IconX } from '@/components/icons'
import type { OccChipIn } from './types'
import css from './quiz.module.css'

/**
 * 渲染一颗已选职业胶囊。
 *
 * @param props 显示名(空串 = 还没拉到)与点击手柄。
 * @returns 一颗胶囊。
 */
export function OccChip({ name, onPick }: OccChipIn) {
  return (
    <Button kind={PLAIN_BTN_KIND} type={BTN_TYPE} className={CLS_OCC_CHIP} onClick={onPick}>
      {name !== TEXT_NONE && name}
      {name === TEXT_NONE && <span aria-hidden className={css.nameSkeleton} />}
      <IconX aria-hidden />
    </Button>
  )
}

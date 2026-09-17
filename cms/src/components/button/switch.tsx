'use client'
/**
 * button 族的开关件 Switch:字在左、轨道在右的二态钮(经 Button 的 switch 档渲,aria-pressed 报开 / 关;裸 <button> 仍只 button.tsx 一处)。
 * 2026-09-16 Frank 拍板职位正文「中文对照」开关时立件(效果图点头「可以,就这样做」);
 * 全站开关只许这一个实现,业务桶只消费。
 *
 * @author Frank
 * @time 2026-09-16 20:30:00
 */
import { cssOf } from '@/components/css'
import { Button } from './button'
import { BTN_TYPE, KIND_SWITCH } from './constants'
import { trackClsOf } from './functions'
import type { SwitchIn } from './types'
import css from './button.module.css'

/**
 * 开关。
 *
 * @param props 开没开、字、在途禁用与点击回调。
 * @returns 二态钮。
 */
export function Switch({ on, label, disabled, onClick }: SwitchIn) {
  return (
    <Button kind={KIND_SWITCH} type={BTN_TYPE} pressed={on} disabled={disabled} onClick={onClick}>
      {label}
      <span className={trackClsOf(on)}><span className={cssOf(css.knob)} /></span>
    </Button>
  )
}

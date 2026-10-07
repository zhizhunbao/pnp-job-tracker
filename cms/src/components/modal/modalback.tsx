'use client'
/**
 * 普通弹框左上角的返回钮位:与右上角的关闭钮同一颗 ModalBtn、同距顶同距边,左右对称;整格不起拖动(data-nodrag,与钮排同)。
 * 2026-10-05 Frank「左边那个按钮 和 右边的 关闭 按钮不对称啊」立:访客向导的返回钮原是向导顶行里自己画的 ghost 钮,收进壳来。
 *
 * @author Frank
 * @time 2026-10-05 15:20:00
 */
import { cssOf } from '@/components/css'
import { IconChevronLeft } from '@/components/icons'
import { stopClick } from './functions'
import { ModalBtn } from './modalbtn'
import type { ModalBackIn } from './types'
import css from './modal.module.css'

/**
 * 渲染返回钮位。
 *
 * @param props 读屏名与点击动作。
 * @returns 钮位。
 */
export function ModalBack({ aria, onClick }: ModalBackIn) {
  return (
    <div className={cssOf(css.lead)} onClick={stopClick} data-nodrag>
      <ModalBtn aria={aria} onClick={onClick}><IconChevronLeft /></ModalBtn>
    </div>
  )
}

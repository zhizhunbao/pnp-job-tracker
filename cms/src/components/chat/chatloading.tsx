'use client'
/**
 * 懒加载对话框的等待帧。loading 不是装饰:弱网上那个 chunk 要几秒,
 * 没它就是一张全屏白纸(手机上面板是全屏接管)。
 * 取件函数(loadChatBox/pickChatBox)住 functions.ts —— 一个 tsx 只住一个渲染
 * function(2026-08-27 Frank 立,闸 one-function-per-tsx)。
 *
 * @author Frank
 * @time 2026-08-27 03:30:00
 */
import css from './chat.module.css'

/**
 * 懒加载等待帧(三点呼吸)。
 *
 * @returns 等待帧。
 */
export function ChatLoading() {
  return <div className={css.clLoad} aria-hidden><i /><i /><i /></div>
}

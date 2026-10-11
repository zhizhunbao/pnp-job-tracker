'use client'
/**
 * 右上角提示的全站宿主(2026-10-11 批 5「提示统一 + 顶栏铃铛」):挂在全站骨架上(ApplyHost、PeekHost 旁),
 * 全站只有它一处画提示;各处操作结果调本桶的 toast() 发到总线。
 * 网页端贴右上、窄屏贴顶左右各留 16;卡最多叠 3 张,5 秒自己收。读屏:状态区、等手上的读完再报。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { cssOf } from '@/components/css'
import { ARIA_POLITE, ROLE_STATUS } from './constants'
import { useToastHost } from './hooks'
import { ToastCard } from './toastcard'
import css from './toast.module.css'

/**
 * 宿主:一个播报区,里面一张张卡(一张都没有时区还在,读屏才能听到第一张)。
 *
 * @returns 播报区。
 */
export function ToastHost() {
  const h = useToastHost()
  const cards = []
  for (const it of h.items) {
    cards.push(<ToastCard key={it.id} item={it} close={h.close} />)
  }
  return (
    <div className={cssOf(css.host)} role={ROLE_STATUS} aria-live={ARIA_POLITE}>
      {cards}
    </div>
  )
}

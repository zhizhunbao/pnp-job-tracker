/**
 * nav 域的结构:左导航 + 右内容的两栏外框(照 Fluent 2 Nav:导航 260 宽贴在内容左边;窄屏左栏不出)。
 * 整块铺满窗口宽,左栏贴窗口左边(照 Azure 门户;2026-11-07 Frank「左边是不是别留这么大空隙」)。
 * 右边内容用普通块,不再套 <main>:全站外框 shell 桶 Frame 已有一个 main 地标,一页只许一个(同日截图验收查出两个)。
 *
 * @author Frank
 * @time 2026-11-07 15:10:00
 */
import { cssOf } from '@/components/css'
import type { NavFrameIn } from './types'
import css from './nav.module.css'

/**
 * 两栏外框。
 *
 * @param props 左栏与内容。
 * @returns 两栏。
 */
export function NavFrame({ nav, children }: NavFrameIn) {
  return (
    <div className={cssOf(css.frame)}>
      <div className={cssOf(css.side)}>
        <div className={cssOf(css.sideIn)}>{nav}</div>
      </div>
      <div className={cssOf(css.main)}>{children}</div>
    </div>
  )
}

'use client'
/**
 * nav 域的结构:左导航 + 右内容的两栏外框(照 Fluent 2 Nav:导航 260 宽贴在内容左边;窄屏左栏不出)。
 * 整块铺满窗口宽,左栏贴窗口左边(照 Azure 门户;2026-11-07 Frank「左边是不是别留这么大空隙」)。
 * 右边内容用普通块,不再套 <main>:全站外框 shell 桶 Frame 已有一个 main 地标,一页只许一个(同日截图验收查出两个)。
 * 2026-11-07 Frank 拿 Microsoft Learn 目录的 « 问「这种吗」:左栏右上角 « 收起,收起后窄边上 » 展开
 * (CLAUDE.md 展示约定「侧栏一律可收起、宽度固定」;宽度不许拖)。
 * 同日实拍后 Frank「这两行能不能合成一行」→ 骑边线的小圆钮又被嫌「缩进的按钮跑出去了」→ 选「放到侧栏最底下」
 * (照 Azure DevOps 左侧导航)→ 同日「还是放上面吧」「改成和 learn 那种」:« 回到导航顶上单占一行靠右;
 * 收起后窄边顶上只剩 »。
 *
 * @author Frank
 * @time 2026-11-07 15:10:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconChevronsLeft, IconChevronsRight } from '@/components/icons'
import { PLAIN_BTN_KIND } from './constants'
import { collapseAriaOf, navMainClsOf, navSideClsOf } from './functions'
import { useNavCollapse } from './hooks'
import type { NavFrameIn } from './types'
import css from './nav.module.css'

/**
 * 两栏外框。
 *
 * @param props 左栏、内容要不要内衬与内容。
 * @returns 两栏。
 */
export function NavFrame({ nav, bare = false, children }: NavFrameIn) {
  const c = useNavCollapse()
  const tip = collapseAriaOf(c.collapsed)
  return (
    <div className={cssOf(css.frame)}>
      <div className={navSideClsOf(c.collapsed)}>
        <div className={cssOf(css.sideIn)}>
          <div className={cssOf(css.sideFoot)}>
            <Button kind={PLAIN_BTN_KIND} onClick={c.onFlip} ariaLabel={tip} title={tip}
              expanded={c.collapsed === false} className={cssOf(css.collapse)}>
              {c.collapsed && <IconChevronsRight />}
              {c.collapsed === false && <IconChevronsLeft />}
            </Button>
          </div>
          {c.collapsed === false && nav}
        </div>
      </div>
      <div className={navMainClsOf(bare)}>{children}</div>
    </div>
  )
}

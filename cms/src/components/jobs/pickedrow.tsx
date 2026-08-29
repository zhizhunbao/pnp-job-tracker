'use client'
/**
 * 「已选」行(2026-08-16 效果图过目后 Frank「可以」)。上面那行是**输入区**(我要找什么),
 * 这一行是**状态区**(现在框住了什么)+ 对这套条件的操作。先前混在一行:条件名一长就把行顶爆
 * (「木匠」还行,「信息系统专家」直接换行,Frank 实拍)。
 * 规矩:**只放没有自己控件的条件** —— 省/大类的当前值在各自下拉上写着,不在这儿复读一遍
 * (同屏说两遍「安大略省」是噪音)。今天归这行的只有职业(NOC)一种,将来的隐形筛选也进这里。
 * 「保存此筛选」2026-08-16 Frank「保存此筛选没有必要吧」→ 留:它是「简化操作才收费」那条
 * 定价原则的落点(下次一键回到这套条件),但它是对**条件**的操作,归这一行,不再占输入行的地方。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 * 「清除筛选」2026-08-29 Frank 实拍搬回筛选行(见 filterrow.tsx 头注):没选职业时这一行原本
 * 只剩它一颗孤钮。它一走,本行就可能一件都不剩(匿名 + 非职业筛选)—— 空 div 照样吃 .filters
 * 那 8px 的 gap,所以渲不渲改由 `filters.showPicked` 说了算,不再只看 anyFilter。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST, CROSS, SPACE, TEXT_NONE } from './constants'
import { IconSave } from '@/components/icons'
import type { BoardPanelIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染「已选」行。
 *
 * @param props 职位板整台状态机。
 * @returns 职业胶囊 + 两颗操作钮。
 */
export function PickedRow({ b }: BoardPanelIn) {
  const f = b.filters
  return (
    <div className={cssOf(css.ctl)}>
      {f.nocLabel !== TEXT_NONE && <span className={cssOf(css.filtLabel)}>{b.t('filter.picked')}</span>}
      {f.nocLabel !== TEXT_NONE && (
        <span className={cssOf(css.nocPill)}>
          {f.nocLabel}
          <Button kind={BTN_GHOST} ariaLabel={b.t('clear')} onClick={f.onNocClear} className={cssOf(css.nocX)}>
            {CROSS}
          </Button>
        </span>
      )}
      <span className={cssOf(css.pickedAct)}>
        {b.plan.loggedIn && (
          <Button kind={BTN_GHOST} onClick={f.onSaveSearch}
            className={`${cssOf(css.picked)} ${cssOf(css.pickedSave)}`}>
            <IconSave />{SPACE}{b.t('ss.save')}
          </Button>
        )}
      </span>
    </div>
  )
}

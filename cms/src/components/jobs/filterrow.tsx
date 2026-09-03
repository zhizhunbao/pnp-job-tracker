'use client'
/**
 * 常用筛选一行(#59 筛选区重设计,2026-07-18 效果图过目后 Frank「可以」):5 行 label + 下拉
 * 收成「常用一行(搜索/省/大类;PNP/年薪 08-16 下沉)+ 更多筛选折叠(激活计数徽标)」;
 * 07-07 行序拍板与窄屏抽屉一并退役 —— 一行 + 折叠对窄屏同样成立,靠换行自然折。
 * 右端 = 更新时间 + 字段钮(#56 拍板延续)。市/区、中/小类仍是省/大类的联动下级,只在折叠区出现。
 * 「我的匹配」(2026-08-16 顶栏改「职位」后):切换落回板内 —— 它是这块板的一个视图,不是一个页面;
 * 桌面在这条筛选行,手机走窄屏入口条,两处不同时出现。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 * 「清除筛选」2026-08-29 Frank 实拍归位到本行(「我的匹配」之后):2026-08-16 它随「保存此筛选」
 * 一起下到「已选」行,可没选职业时那一行就只剩它一颗,孤零零挂在右侧第二行 —— 一颗钮撑不起一行。
 * 显隐条件不动(anyFilter,有筛选才出);「保存此筛选」照旧留在「已选」行(它是对条件的操作,
 * 且只对登录用户出)。样式换 .clearFilt:形照旧,高度对齐本行的 38(理由在那条 CSS 注释里)。
 * 2026-09-03 Frank「所有的 table 和可以更新数据的地方,右上角都应该有一个更新时间」:
 * 右端那句更新时间改用 time 桶的 Updated(全站唯一一件,空串自己不渲),本域不再自绘。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Search } from '@/components/search'
import { Select } from '@/components/select'
import { Updated } from '@/components/time'
import { BTN_GHOST, BTN_SECONDARY, FK, SELECT_SM } from './constants'
import {
  foldBtnClsOf, foldCaretOf, makeBroadChange, makeCatLabel, makeProvChange, makeProvLabel, matchBtnClsOf,
  matchLabelOf, slotOf,
} from './functions'
import { ColFields } from './colfields'
import type { BoardBoxIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染常用筛选一行。
 *
 * @param props 职位板整台状态机与字段浮层外框(只过路,末端是 ColFields)。
 * @returns 一行控件。
 */
export function FilterRow({ b, boxRef }: BoardBoxIn) {
  const f = b.filters
  return (
    <div className={cssOf(css.ctl)}>
      <span className={cssOf(css.search)}>
        <Search value={b.q} onChange={b.onQ} placeholder={b.t('search.placeholder')} size={SELECT_SM} />
      </span>
      <Select value={slotOf({ fState: f.fState, k: FK.prov })}
        onChange={makeProvChange(f.fState)}
        opts={f.opts.prov}
        all={b.t('all.prov')}
        labelOf={makeProvLabel(b.t)} />
      <Select value={slotOf({ fState: f.fState, k: FK.broad })}
        onChange={makeBroadChange(f.fState)}
        opts={f.opts.broad}
        all={b.t('all.broad')}
        labelOf={makeCatLabel(b.t)} />
      <Button kind={BTN_SECONDARY} onClick={f.onFold}
        className={foldBtnClsOf({ fold: f.fold, foldActive: f.foldActive })}>
        {b.t('filter.more')}
        {f.foldActive > 0 && <span className={cssOf(css.foldN)}>{f.foldActive}</span>}
        <span className={cssOf(css.foldCaret)}>{foldCaretOf(f.fold)}</span>
      </Button>
      <Button kind={BTN_SECONDARY} onClick={b.gate.onToggle} className={matchBtnClsOf(b.matchView)}>
        {matchLabelOf({ t: b.t, matchView: b.matchView })}
      </Button>
      {f.anyFilter && (
        <Button kind={BTN_GHOST} onClick={f.onClear} className={cssOf(css.clearFilt)}>
          {b.t('clear')}
        </Button>
      )}
      <Updated iso={b.data.updatedAt} t={b.t} />
      <ColFields b={b} boxRef={boxRef} />
    </div>
  )
}

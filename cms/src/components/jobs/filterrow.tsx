'use client'
/**
 * 常用筛选一行(#59 筛选区重设计,2026-07-18 效果图过目后 Frank「可以」):5 行 label + 下拉
 * 收成「常用一行(搜索/省/大类;PNP/年薪 08-16 下沉)+ 更多筛选折叠(激活计数徽标)」;
 * 07-07 行序拍板与窄屏抽屉一并退役 —— 一行 + 折叠对窄屏同样成立,靠换行自然折。
 * 右端 = 更新时间 + 字段钮(#56 拍板延续)。市/区、中/小类仍是省/大类的联动下级,只在折叠区出现
 * (2026-09-14 Frank「全部市提到全部省后面吧」:市升到本行紧挨省;区、中/小类仍在折叠区)。
 * 「我的匹配」(2026-08-16 顶栏改「职位」后):切换落回板内 —— 它是这块板的一个视图,不是一个页面;
 * 桌面在这条筛选行,手机走窄屏入口条,两处不同时出现。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 * 「清除筛选」2026-08-29 Frank 实拍归位到本行(「我的匹配」之后):2026-08-16 它随「保存此筛选」
 * 一起下到「已选」行,可没选职业时那一行就只剩它一颗,孤零零挂在右侧第二行 —— 一颗钮撑不起一行。
 * 显隐条件不动(anyFilter,有筛选才出);「保存此筛选」照旧留在「已选」行(它是对条件的操作,
 * 且只对登录用户出)。样式换 .clearFilt:形照旧,高度对齐本行的 38(理由在那条 CSS 注释里)。
 * 2026-09-03 Frank「所有的 table 和可以更新数据的地方,右上角都应该有一个更新时间」:
 * 右端那句更新时间改用 time 桶的 Updated(全站唯一一件,空串自己不渲),本域不再自绘。
 * 2026-09-14 Frank「加个筛选放在大类前面」:EE 类别下拉进本行,紧挨大类之前(不联动,值 = 数据层 label,
 * 显示名过 eeDisplay 换界面语言;选项来自 ee_categories 维表)。同日「这个应该需要联动吧」:选了类别,
 * 大类下拉只剩该类别在招岗落到的大类(维度包里的 EE→大类桥),换类别清大/中/小类。
 * 2026-09-15 Frank「可以放下来吧,如果选择市 用户可以在 input 里面输入 更方便一些。现在市太多了」:
 * 市下拉退回折叠区地理行(撤回 09-14「全部市提到全部省后面吧」)—— 全国 2,681 个市、安大略一省 632 个,
 * 下拉里翻不动;搜索框本就匹配城市字段(SEARCH_COLS 含 j.city),打字更快。本行只剩 搜索 / 省 / EE 类别 / 大类。
 * 2026-09-23「我的匹配」整拆(Frank「我觉得 我的匹配 功能也可以去掉。让用户自己筛 职位 直接 收藏」):本行的匹配钮撤。
 *
 * 2026-09-23 职业分类改两级:「职业」下拉挪进本行紧跟大类(Frank「职业分类筛选,是不是放到全部大类后面比较好」);
 * 按最长选项定宽(Frank「这个下拉跑偏了」)。
 *
 * 2026-09-26 /fe Frank:地址栏的关键词改成停手才写(见 hooks 的 useBoardUrlSync),搜索框外那层 span
 * 接住从输入框冒上来的回车 / 失焦,当场写回;通用 Search 件一个字没动。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Search } from '@/components/search'
import { Select } from '@/components/select'
import { BTN_GHOST, BTN_SECONDARY, FK, SELECT_LG, SELECT_SM } from './constants'
import {
  foldBtnClsOf, foldCaretOf, makeBroadChange, makeCatLabel, makeEeChange, makeEeLabel, makeProvChange, makeProvLabel,
  makeSlotChange, slotOf,
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
      <span className={cssOf(css.search)} onKeyDown={b.onQKey} onBlur={b.onQCommit}>
        <Search value={b.q} onChange={b.onQ} placeholder={b.t('search.placeholder')} size={SELECT_SM} />
      </span>
      <Select value={slotOf({ fState: f.fState, k: FK.prov })}
        onChange={makeProvChange(f.fState)}
        opts={f.opts.prov}
        all={b.t('all.prov')}
        labelOf={makeProvLabel(b.t)} />
      <Select value={slotOf({ fState: f.fState, k: FK.ee })}
        onChange={makeEeChange(f.fState)}
        opts={f.opts.ee}
        all={b.t('all.ee')}
        labelOf={makeEeLabel(b.t)} />
      <Select value={slotOf({ fState: f.fState, k: FK.broad })}
        onChange={makeBroadChange(f.fState)}
        opts={f.opts.broad}
        all={b.t('all.broad')}
        labelOf={makeCatLabel(b.t)} />
      <Select value={f.occValue}
        onChange={makeSlotChange({ fState: f.fState, k: FK.noc })}
        opts={f.opts.occ}
        all={b.t('all.occ')}
        labelOf={f.occName}
        size={SELECT_LG} />
      <Button kind={BTN_SECONDARY} onClick={f.onFold}
        className={foldBtnClsOf({ fold: f.fold, foldActive: f.foldActive })}>
        {b.t('filter.more')}
        {f.foldActive > 0 && <span className={cssOf(css.foldN)}>{f.foldActive}</span>}
        <span className={cssOf(css.foldCaret)}>{foldCaretOf(f.fold)}</span>
      </Button>
      {f.anyFilter && (
        <Button kind={BTN_GHOST} onClick={f.onClear} className={cssOf(css.clearFilt)}>
          {b.t('clear')}
        </Button>
      )}
      <ColFields b={b} boxRef={boxRef} />
    </div>
  )
}

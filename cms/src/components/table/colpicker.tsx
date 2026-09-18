'use client'
/**
 * 字段钮 + 勾选面板(2026-09-18 Frank「应该加一个字段按钮,可以自定义字段,类似于 job 页面」「做成公用件」)。
 * 形照职位板字段面板:齿轮钮带计数,面板顶上「主要 / 全选 / 反选」三颗快捷钮,下面一列一行勾选框,
 * 固定列灰着不可取消。状态机在 hooks 的 useColPick,本件只渲。≤640 手机不出(手机是卡片流,没有列)。
 * 钮放在哪由调用方定(雇主板放筛选行尾),所以它不长在 Table 里面。
 *
 * @author Frank
 * @time 2026-09-18 16:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconSettings } from '@/components/icons'
import { ColPickOption } from './colpickoption'
import { PICK_BTN_KIND, PICK_GAP, PICK_QUICK_KIND } from './constants'
import { cls } from './functions'
import type { ColPickerIn } from './types'
import css from './table.module.css'

/**
 * 渲染字段钮与面板。
 *
 * @param props 视图态与钮上的字(见 ColPickerIn 逐格注释)。
 * @returns 字段钮(展开时带面板)。
 */
export function ColPicker({ pick, boxRef, words }: ColPickerIn) {
  const rows = []
  for (const r of pick.rows) {
    rows.push(<ColPickOption key={r.key} row={r} fixedNote={words.fixed} />)
  }
  return (
    <div ref={boxRef} className={cssOf(css.pickWrap)}>
      <Button kind={PICK_BTN_KIND} onClick={pick.onOpen} className={cssOf(css.pickBtn)}>
        <IconSettings />{PICK_GAP}{words.fields}
      </Button>
      {pick.open && (
        <div className={cssOf(css.pickPanel)}>
          <div className={cssOf(css.pickHead)}>
            <Button kind={PICK_QUICK_KIND} onClick={pick.onMain}
              className={cls(cssOf(css.pickQuick), css.pickQuickMain)}>
              {words.main}
            </Button>
            <Button kind={PICK_QUICK_KIND} onClick={pick.onAll} className={cssOf(css.pickQuick)}>{words.all}</Button>
            <Button kind={PICK_QUICK_KIND} onClick={pick.onInvert} className={cssOf(css.pickQuick)}>
              {words.invert}
            </Button>
          </div>
          {rows}
        </div>
      )}
    </div>
  )
}

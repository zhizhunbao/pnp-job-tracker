'use client'
/**
 * 第 1 步里一份简历一行:单选框、文件名、默认小标、上传日期(2026-10-07 按岗选简历)。
 * 2026-10-10 投递框三步:求职信页同形(Frank「求职信也这么写」)—— 改成通用单选一行:文件名在上、灰字小注在下,
 * 选中那一行描蓝边;简历与求职信各一个单选组。长文件名照附件胶囊只在下划线后折行(ApplyChip)。
 *
 * @author Frank
 * @time 2026-10-07 07:00:00
 */
import { ApplyChip } from './applychip'
import { INPUT_RADIO, TEXT_NONE } from './constants'
import type { ApplyPickIn } from './types'
import css from './apply.module.css'

/**
 * 单选一行。
 *
 * @param props 单选组、文件名、小注、默认小标、选中没有与选用手柄。
 * @returns 一行。
 */
export function ApplyPick({ group, label, sub, tag, checked, onPick }: ApplyPickIn) {
  let cls = css.pick
  if (checked) {
    cls = `${css.pick} ${css.pickOn}`
  }
  return (
    <label className={cls}>
      <input type={INPUT_RADIO} name={group} checked={checked} onChange={onPick} />
      <span className={css.pickText}>
        <span className={css.pickName}>
          <ApplyChip name={label} />
          {tag !== TEXT_NONE && <span className={css.pickTag}>{tag}</span>}
        </span>
        {sub !== TEXT_NONE && <span className={css.pickNote}>{sub}</span>}
      </span>
    </label>
  )
}

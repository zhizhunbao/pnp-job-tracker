'use client'
/**
 * 域内哑单元格:雇主板「雇主」列 —— 英文名主文案 + 行业灰注(形照把脉页 EmpNameCell)。
 * 2026-09-13 Frank「后面已经有操作列,没必要加 link。而且要加中文名」:名字不成链,落点归操作列。
 * 2026-09-13 晚 /fe 雇主页 Frank 拍板砍中文别名:companies.alias_zh 是机翻且有硬错(National Bank → 中央银行、
 * VON Canada → 冯公司),池行覆盖仅 7.9%;城市译名已立「人工核定表禁模型」,公司名核定表立起来前只显英文名。
 * 2026-09-18 Frank「雇主弹框也加上,类似于 job 页面」「可以和 job 的公司弹框保持一致吗」**改判** 09-13 那条:
 * 那条管的是「名字成链跳走」,这次是「名字开框不离开板」,职位板的公司格就是这个行为。有公司页的名字可点 ——
 * 普通点击开公司弹框(与职位板同一个),按着 Ctrl / ⌘ 或中键照链接去公司页;没有公司页的照旧纯文字。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染雇主板「雇主」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 名(有公司页 = 可点开弹框)+ 行业灰注(没有的不占行)。
 */
export function NameCell(r: EmployerCellRow) {
  return (
    <div>
      {r.companyHref === TEXT_NONE && <span className={css.name}>{r.name}</span>}
      {r.companyHref !== TEXT_NONE && (
        <LinkButton href={r.companyHref} onClick={r.onName} className={cssOf(css.nameLink)}>{r.name}</LinkButton>
      )}
      {r.industry !== TEXT_NONE && <span className={css.sub}>{r.industry}</span>}
    </div>
  )
}

'use client'
/**
 * 担保雇主表「雇主名」列的单元格:渲染蓝色半粗的雇主名链接(指向首页按名搜),
 * 名字下面挂一行灰色别名。
 * 中文名不再独立成列(Frank 2026-08-08 晚拍板,替代早间「弄两列」):方案 A 不生造
 * 红线下仅约 4% 雇主有公认中文名,一列 96% 都是横杠;改挂在雇主名下做灰注
 * (与抽选流名灰注同形态),没有别名就不占位。
 * 2026-08-27 换装批自 Sponsors.tsx 的 name 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { SponsorCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染担保雇主表「雇主名」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 雇主名链接,以及有别名时的灰色别名行。
 */
export function SponsorNameCell(r: SponsorCellRow) {
  return (
    <>
      <LinkButton href={r.href} onClick={r.onView} className={cssOf(css.nameLink)}>
        {r.name}
      </LinkButton>
      {r.alias !== TEXT_NONE && <div className={css.alias}>{r.alias}</div>}
    </>
  )
}

'use client'
/**
 * 手机端一岗一张卡(2026-10-10 批 2,照效果图 手机端-改之后-1 / -2):职位(右上日期:推荐 = 发布日期、收藏 = 收藏日期、
 * 已投 = 投递日期)、公司、地址一行 + 灰字、薪资(绿)、下一行工时与雇佣期并排两名;最后一行左边胶囊(推荐 = 理由、投递 = 状态)、
 * 右边钮。手机卡不出发布 / 截止日期行(Frank「卡片不要显示这个时间」)。各格就是网页端表格的哑单元格。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import { ActList } from './actlist'
import { AddrCell } from './addrcell'
import { CompanyCell } from './companycell'
import { HoursCell } from './hourscell'
import { PayCell } from './paycell'
import { TagList } from './taglist'
import { TermCell } from './termcell'
import { TitleCell } from './titlecell'
import type { MjCardIn } from './types'
import css from './myjobs.module.css'

/**
 * 一张手机卡。
 *
 * @param props 展示行。
 * @returns 卡。
 */
export function MjCard({ r }: MjCardIn) {
  return (
    <div className={css.card} data-row={r.key}>
      <div className={css.cardTop}>
        <div className={css.rowTitle}>{TitleCell(r)}</div>
        <div className={css.cardDate}>{r.cornerDate}</div>
      </div>
      <div className={css.co}>{CompanyCell(r)}</div>
      <div className={css.addr}>{AddrCell(r)}</div>
      <div>{PayCell(r)}</div>
      <div className={css.kinds}>
        {HoursCell(r)}
        {TermCell(r)}
      </div>
      <div className={css.cardFoot}>
        <TagList tags={r.tags} />
        <span className={css.cardActs}>
          <ActList acts={r.files} />
          <ActList acts={r.acts} />
        </span>
      </div>
    </div>
  )
}

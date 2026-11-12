'use client'
/**
 * me 桶子桶 jobs 的手机一条(2026-11-07 照效果图 手机端-改之后-1-我的求职):职位(蓝字 + 译名灰字)、
 * 公司在左薪资在右、(收藏 / 投递的状态胶囊)、底行左边「市, 省码」+「截止 月-日」灰字、右边唯一那颗钮;条与条之间一道细线。
 * 原 myjobs 桶手机卡(右上日期、工时 / 雇佣期、通道一行)按效果图收成这一形。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { ActCell } from './actcell'
import { CompanyCell } from './companycell'
import { FitBullets } from './fitbullets'
import { FitTag } from './fittag'
import { TEXT_NONE } from './constants'
import { PayCell } from './paycell'
import { TagList } from './taglist'
import { TitleCell } from './titlecell'
import type { JobCardIn } from './types'
import css from './jobs.module.css'

/**
 * 手机一条。
 *
 * @param props 展示行。
 * @returns 一条。
 */
export function JobCard({ r }: JobCardIn) {
  return (
    <div className={cssOf(css.item)} data-row={r.key}>
      <div className={cssOf(css.itemTitle)}>
        {TitleCell(r)}
        {FitTag(r)}
      </div>
      <div className={cssOf(css.itemMid)}>
        <span className={cssOf(css.itemCo)}>{CompanyCell(r)}</span>
        {PayCell(r)}
      </div>
      {FitBullets(r)}
      <TagList tags={r.cardTags} />
      <div className={cssOf(css.itemFoot)}>
        <span className={cssOf(css.itemMeta)}>
          {r.place !== TEXT_NONE && <span className={cssOf(css.itemPlace)}>{r.place}</span>}
          {r.due !== TEXT_NONE && <span>{r.due}</span>}
        </span>
        {ActCell(r)}
      </div>
    </div>
  )
}

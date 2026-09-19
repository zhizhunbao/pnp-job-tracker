'use client'
/**
 * 域内哑单元格:雇主板「操作」格 —— 看岗位(职位板按雇主名搜)/ 看公司(公司详情页)两只 mini 钮,
 * 形照把脉页雇主表的 EmpActCell(2026-09-04 Frank「需要一个操作列可以跳过去查对应的岗位,
 * 或者跳过去查对应的公司信息」);没有公司页的雇主只出「看岗位」。钮的类随行带来(actBtnCls),哑单元格不 import functions。
 * 2026-09-13 晚 /fe 雇主页 Frank 拍板:无在招不渲「看岗位」(池里 50.8% 雇主无在招,点进去是「0 个职位」空表)——
 * 两只钮各看各的落点,都没有就是空格。
 * 2026-09-18 Frank「这个弹一个新窗口出来吧」:两只钮都开新标签 —— 板上筛到一半、「显示更多」接出来的行不因为点出去而丢。
 * 2026-09-19 Frank「在操作列加一个按钮官网,如果有的话」:加「官网」钮(新标签;没有官网不出),雇主名不再去官网;
 * 同日「这时候看公司就可以去掉了吧」:「看公司」钮撤 —— 点雇主名就开公司弹框,两个入口重复。现在是 看岗位 / 官网 两只。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */
import { LinkButton } from '@/components/button'
import { TARGET_BLANK, TEXT_NONE } from './constants'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染操作格。
 *
 * @param r 这一行的展示行。
 * @returns 零到两只钮。
 */
export function ActCell(r: EmployerCellRow) {
  return (
    <span className={css.acts}>
      {r.jobsHref !== TEXT_NONE && (
        <LinkButton href={r.jobsHref} target={TARGET_BLANK} onClick={r.onView} className={r.actBtnCls}>
          {r.actJobsText}
        </LinkButton>
      )}
      {r.siteHref !== TEXT_NONE && (
        <LinkButton href={r.siteHref} target={TARGET_BLANK} onClick={r.onView} className={r.actBtnCls}>
          {r.actSiteText}
        </LinkButton>
      )}
    </span>
  )
}

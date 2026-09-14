/**
 * coop 组件域的函数:SSR 行洗成展示行 → 列声明 → 副题 / 行键。
 * 顶层只有 function;常量归 constants,形状归 types。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */
import { btnClsOf } from '@/components/button'
import { cssOf } from '@/components/css'
import type { Col } from '@/components/table'
import {
  BOARD_NAME, CITY_SEP, COL_ACTS, COL_CITY, COL_COMPANY, COL_DATE, COL_HOURS, COL_TITLE, DETAIL_PATH, K_EMP,
  MINI_BTN_KIND, SCHOOL_NAME, TEXT_NONE,
} from './constants'
import { CoopActsCell } from './coopactscell'
import { CoopTitleCell } from './cooptitlecell'
import type { CoopCellRow, CoopCellRowsIn, CoopColsIn, CoopJobRow, CoopSubIn, HoursTextIn } from './types'
import css from './coop.module.css'


/**
 * SSR 行 → 展示行(城市文案、工时译文、详情去处都在这算完)。
 *
 * @param x SSR 行与取词函数。
 * @returns 展示行。
 */
export function toCoopCellRows(x: CoopCellRowsIn): CoopCellRow[] {
  const out: CoopCellRow[] = []
  const actBtnCls = actBtnClsOf()
  const actText = x.t('coop.view')
  for (const r of x.rows) {
    out.push({
      key: String(r.id),
      href: DETAIL_PATH + String(r.id),
      title: r.title,
      company: r.company,
      cityText: cityTextOf(r),
      hoursText: hoursTextOf({ t: x.t, row: r }),
      dateText: r.datePosted,
      actBtnCls,
      actText,
    })
  }
  return out
}

/**
 * 操作钮的类串(button 桶 mini 档,与雇主板操作列同一颗钮)。
 *
 * @returns 类串。
 */
function actBtnClsOf(): string {
  return btnClsOf({ kind: MINI_BTN_KIND, sm: false, lg: false, active: false, className: null })
}

/**
 * 城市文案:城市 + 空格 + 省码(紧凑格约定:城市当行主体时才双行,这里是列格)。
 *
 * @param r SSR 行。
 * @returns 文案;都没有给空串。
 */
function cityTextOf(r: CoopJobRow): string {
  if (r.city === TEXT_NONE) {
    return r.province
  }
  if (r.province === TEXT_NONE) {
    return r.city
  }
  return r.city + CITY_SEP + r.province
}

/**
 * 工时译文(职位板同一份词条 emp.full / emp.part)。
 *
 * @param x 取词函数与行。
 * @returns 译文;没有工时词给空串。
 */
function hoursTextOf(x: HoursTextIn): string {
  if (x.row.empHours === TEXT_NONE) {
    return TEXT_NONE
  }
  return x.t(K_EMP + x.row.empHours)
}


/**
 * 校内板的列。
 *
 * @param x 取词函数。
 * @returns 列声明。
 */
export function coopColsOf(x: CoopColsIn): Col<CoopCellRow>[] {
  return [
    {
      key: COL_DATE,
label: x.t('col.datePosted'),
nowrap: true,
sort: dateSortOf,
render: dateTextOf,
      className: cssOf(css.wide),
    },
    { key: COL_COMPANY, label: x.t('col.company'), sort: companySortOf, render: companyTextOf },
    { key: COL_TITLE, label: x.t('col.title'), sort: titleSortOf, render: CoopTitleCell },
    { key: COL_CITY, label: x.t('col.city'), nowrap: true, sort: citySortOf, render: cityCellOf },
    {
      key: COL_HOURS,
label: x.t('col.empHours'),
nowrap: true,
sort: hoursSortOf,
render: hoursCellOf,
      className: cssOf(css.wide),
    },
    { key: COL_ACTS, label: x.t('col.actions'), nowrap: true, render: CoopActsCell, className: cssOf(css.wide) },
  ]
}

/**
 * 发布时间排序键。
 *
 * @param r 一行。
 * @returns YYYY-MM-DD 串。
 */
function dateSortOf(r: CoopCellRow): string {
  return r.dateText
}

/**
 * 发布时间格。
 *
 * @param r 一行。
 * @returns 文案。
 */
function dateTextOf(r: CoopCellRow): string {
  return r.dateText
}

/**
 * 雇主排序键。
 *
 * @param r 一行。
 * @returns 雇主名。
 */
function companySortOf(r: CoopCellRow): string {
  return r.company
}

/**
 * 雇主格。
 *
 * @param r 一行。
 * @returns 雇主名。
 */
function companyTextOf(r: CoopCellRow): string {
  return r.company
}

/**
 * 职位排序键。
 *
 * @param r 一行。
 * @returns 标题。
 */
function titleSortOf(r: CoopCellRow): string {
  return r.title
}

/**
 * 市排序键。
 *
 * @param r 一行。
 * @returns 城市文案。
 */
function citySortOf(r: CoopCellRow): string {
  return r.cityText
}

/**
 * 市格。
 *
 * @param r 一行。
 * @returns 城市文案。
 */
function cityCellOf(r: CoopCellRow): string {
  return r.cityText
}

/**
 * 工时排序键。
 *
 * @param r 一行。
 * @returns 工时文案。
 */
function hoursSortOf(r: CoopCellRow): string {
  return r.hoursText
}

/**
 * 工时格。
 *
 * @param r 一行。
 * @returns 工时文案。
 */
function hoursCellOf(r: CoopCellRow): string {
  return r.hoursText
}


/**
 * 表的行身份。
 *
 * @param r 一行。
 * @returns jobs.id 串。
 */
export function coopRowKeyOf(r: CoopCellRow): string {
  return r.key
}

/**
 * 图版副题:学校 + 系统 + 在招数(词条 coop.sub)。
 *
 * @param x 取词函数与在招数。
 * @returns 副题。
 */
export function coopSubOf(x: CoopSubIn): string {
  return x.t('coop.sub', { school: SCHOOL_NAME, board: BOARD_NAME, n: x.n })
}

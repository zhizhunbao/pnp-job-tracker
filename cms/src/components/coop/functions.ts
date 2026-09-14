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
import { provName } from '@/lib/location'
import {
  BOARD_NAME, COL_ACTS, COL_CITY, COL_COMPANY, COL_DATE, COL_KIND, COL_PROV, COL_TITLE, DETAIL_PATH, K_EMP, K_TERM,
  LOC_SEP, MINI_BTN_KIND, SCHOOL_NAME, TEXT_NONE,
} from './constants'
import { CoopActsCell } from './coopactscell'
import { CoopTitleCell } from './cooptitlecell'
import type { CoopCellRow, CoopCellRowsIn, CoopColsIn, CoopSubIn, RowTextIn } from './types'
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
      provText: provTextOf({ t: x.t, row: r }),
      cityText: r.city,
      locText: locTextOf({ t: x.t, row: r }),
      kindText: kindTextOf({ t: x.t, row: r }),
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
 * 省名(界面语言;lib/location 同一把尺子,与职位板省列同形)。
 *
 * @param x 取词函数与行。
 * @returns 省名;没有省码给空串。
 */
function provTextOf(x: RowTextIn): string {
  if (x.row.province === TEXT_NONE) {
    return TEXT_NONE
  }
  return provName({ t: x.t, code: x.row.province, localeOnly: true })
}

/**
 * 手机卡地点:城市 + 「, 」+ 省名(缺哪段省哪段)。
 *
 * @param x 取词函数与行。
 * @returns 地点文案。
 */
function locTextOf(x: RowTextIn): string {
  const prov = provTextOf(x)
  if (x.row.city === TEXT_NONE) {
    return prov
  }
  if (prov === TEXT_NONE) {
    return x.row.city
  }
  return x.row.city + LOC_SEP + prov
}

/**
 * 类型:工时词优先(全职 / 兼职),没有再看雇佣期限词(合同 / 季节;职位板同一份词条)。
 *
 * @param x 取词函数与行。
 * @returns 译文;两个词都没有给空串。
 */
function kindTextOf(x: RowTextIn): string {
  if (x.row.empHours !== TEXT_NONE) {
    return x.t(K_EMP + x.row.empHours)
  }
  if (x.row.empTerm !== TEXT_NONE) {
    return x.t(K_TERM + x.row.empTerm)
  }
  return TEXT_NONE
}

/**
 * 校内板的列(2026-09-13 Frank「第一列应该还是日期」「省 市 要分开」:发布时间 / 职位 / 公司 / 省 / 市 / 类型 / 操作;
 * 板上不给发布日,日期列是本站首次收录日 —— 日抓之后与发布日只差一天,列名照职位板叫发布时间)。
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
    { key: COL_TITLE, label: x.t('col.title'), sort: titleSortOf, render: CoopTitleCell },
    { key: COL_COMPANY, label: x.t('col.company'), sort: companySortOf, render: companyTextOf },
    { key: COL_PROV, label: x.t('col.province'), nowrap: true, sort: provSortOf, render: provCellOf },
    { key: COL_CITY, label: x.t('col.city'), nowrap: true, sort: citySortOf, render: cityCellOf },
    {
      key: COL_KIND,
label: x.t('coop.kind'),
nowrap: true,
sort: kindSortOf,
render: kindCellOf,
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
 * 省排序键。
 *
 * @param r 一行。
 * @returns 省名。
 */
function provSortOf(r: CoopCellRow): string {
  return r.provText
}

/**
 * 省格。
 *
 * @param r 一行。
 * @returns 省名。
 */
function provCellOf(r: CoopCellRow): string {
  return r.provText
}

/**
 * 类型排序键。
 *
 * @param r 一行。
 * @returns 类型文案。
 */
function kindSortOf(r: CoopCellRow): string {
  return r.kindText
}

/**
 * 类型格。
 *
 * @param r 一行。
 * @returns 类型文案。
 */
function kindCellOf(r: CoopCellRow): string {
  return r.kindText
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

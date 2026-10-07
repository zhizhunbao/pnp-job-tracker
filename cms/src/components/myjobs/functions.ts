/**
 * 「我的」页两张岗位表(myjobs 组件桶)的函数:拉清单、取消收藏、洗展示行、列构造
 * (照 employers 桶的列构造段:洗行 → 展示行 → 哑单元格)。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { cityLabelOf } from '@/components/start'
import { ymd } from '@/lib/time'
import { ActCell } from './actcell'
import { CityCell } from './citycell'
import { CompanyCell } from './companycell'
import { ListingCell } from './listingcell'
import {
  CITY_HREF_HEAD, COL_ACT, COL_CITY, COL_COMPANY, COL_DATE, COL_LISTING, COL_SALARY, COL_STAGE, COL_TITLE, CRED_INCLUDE,
  JOB_HREF_HEAD,
  LAYER_CO,
  DASH, KIND_APPLIED, METHOD_DELETE, STAGES, TEXT_NONE, URL_SAVED_JOB_HEAD,
} from './constants'
import { SalaryCell } from './salarycell'
import { StatusCell } from './statuscell'
import { TitleCell } from './titlecell'
import type {
  CellRowIn, CellRowsIn, CoPeek, LoadMyJobsIn, MyJobCellRow, MyJobCol, MyJobItem, MyJobsRespJson, OpenCompanyFn,
  PeekStackRef, TFn, UnsaveIn,
} from './types'

/**
 * 接口响应 → 清单(行构造器:缺席按零条读)。
 *
 * @param d 响应体。
 * @returns 清单。
 */
export function toMyJobItems(d: MyJobsRespJson): MyJobItem[] {
  if (d.items == null) {
    return []
  }
  return d.items
}

/**
 * 造「拉一次清单」:成功写清单;失败(网络、未登录、回包坏)拨「拉失败了」并给空清单。
 *
 * @param x 接口与两个落格。
 * @returns 拉清单的函数。
 */
export function makeLoadMyJobs(x: LoadMyJobsIn): () => Promise<void> {
  return async function loadMyJobs(): Promise<void> {
    try {
      const r = await fetch(x.url, { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setFailed(true)
        x.setItems([])
        return
      }
      x.setItems(toMyJobItems(await r.json() as MyJobsRespJson))
    } catch {
      x.setFailed(true)
      x.setItems([])
    }
  }
}

/**
 * 造「取消收藏」的手柄:先本地删掉这一行,再 DELETE 收藏记录;服务端没删成(网络、非 2xx)就退回原样。
 *
 * @param x 哪一行、原清单与落格。
 * @returns 点击手柄。
 */
export function makeUnsave(x: UnsaveIn): () => Promise<void> {
  return async function unsave(): Promise<void> {
    const rest: MyJobItem[] = []
    for (const it of x.items) {
      if (it.id !== x.id) {
        rest.push(it)
      }
    }
    x.setItems(rest)
    try {
      const r = await fetch(URL_SAVED_JOB_HEAD + x.id, { method: METHOD_DELETE, credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setItems(x.items)
      }
    } catch {
      x.setItems(x.items)
    }
  }
}

/**
 * 职位页链接(职位删了不出)。
 *
 * @param jobId 职位 id。
 * @returns 链接;没有给空串。
 */
export function jobHrefOf(jobId: number | null): string {
  if (jobId == null) {
    return TEXT_NONE
  }
  return JOB_HREF_HEAD + jobId
}

/**
 * 投递进度字样(只读;只收藏没投给空串)。
 *
 * @param x 这一行与取词函数。
 * @returns 字样。
 */
export function statusTextOf(x: CellRowIn): string {
  for (const s of STAGES) {
    if (s.st === x.item.stage) {
      return x.t(s.labelKey)
    }
  }
  return TEXT_NONE
}

/**
 * 投递状态格的字:投过的写进度,没投过画横杠(同职位板空格)。
 *
 * @param x 这一行与取词函数。
 * @returns 字样。
 */
export function stageCellOf(x: CellRowIn): string {
  const s = statusTextOf(x)
  if (s === TEXT_NONE) {
    return DASH
  }
  return s
}

/**
 * 职位状态格的字:在架 / 已下架。
 *
 * @param x 这一行与取词函数。
 * @returns 字样。
 */
export function listingTextOf(x: CellRowIn): string {
  if (x.item.closed) {
    return x.t('mj.closed')
  }
  return x.t('mj.live')
}

/**
 * 「已下架」字样(手机卡胶囊排用)。
 *
 * @param x 这一行与取词函数。
 * @returns 字样;在架给空串。
 */
export function closedTextOf(x: CellRowIn): string {
  if (x.item.closed) {
    return x.t('mj.closed')
  }
  return TEXT_NONE
}

/**
 * 日期的原值:我的求职 = 投递那一刻,我的收藏 = 发布日期。
 *
 * @param x 哪张表与这一行。
 * @returns ISO 时刻;没有给空串。
 */
export function dateIsoOf(x: CellRowIn): string {
  if (x.kind === KIND_APPLIED) {
    return x.item.updatedAt
  }
  return x.item.datePosted
}

/**
 * ISO 时刻 → 年-月-日(空串原样)。
 *
 * @param iso ISO 时刻。
 * @returns 年-月-日。
 */
export function dayOf(iso: string): string {
  if (iso === TEXT_NONE) {
    return TEXT_NONE
  }
  return ymd(iso)
}

/**
 * 取消收藏的手柄(只有我的收藏那张表有)。
 *
 * @param x 哪张表、这一行与落格。
 * @returns 手柄;我的求职给 null。
 */
export function unsaveOf(x: CellRowIn): (() => void) | null {
  if (x.kind === KIND_APPLIED) {
    return null
  }
  return makeUnsave({ id: x.item.id, items: x.items, setItems: x.setItems })
}

/**
 * 「取消收藏」的字(我的求职那张表给空串)。
 *
 * @param x 哪张表与取词函数。
 * @returns 字。
 */
export function unsaveTextOf(x: CellRowIn): string {
  if (x.kind === KIND_APPLIED) {
    return TEXT_NONE
  }
  return x.t('mj.unsave')
}

/**
 * 造「开公司弹框」:往弹框栈上叠一层公司层(同雇主板 makePushCoLayer)。
 *
 * @param stack 弹框栈。
 * @returns 开公司弹框的手柄。
 */
export function makePushCo(stack: PeekStackRef): OpenCompanyFn {
  return function pushCo(co: CoPeek): void {
    stack.push({ kind: LAYER_CO, co })
  }
}

/**
 * 造「点这一行的公司名」:开这一家的公司弹框。
 *
 * @param x 这一行与开弹框的手柄。
 * @returns 点击手柄。
 */
export function makeCompanyOpen(x: CellRowIn): () => void {
  return function openCompany(): void {
    x.onOpenCompany({ slug: x.item.companySlug, name: x.item.company })
  }
}

/**
 * 公司格的手柄:公司表里有这一家才可点。
 *
 * @param x 这一行与开弹框的手柄。
 * @returns 手柄;没有公司页给 null。
 */
export function companyOpenOf(x: CellRowIn): (() => void) | null {
  if (x.item.companySlug === TEXT_NONE) {
    return null
  }
  return makeCompanyOpen(x)
}

/**
 * 城市落职位板按城市筛的地址(同把脉页城市段)。
 *
 * @param city 城市英文名。
 * @returns 地址;没有城市给空串。
 */
export function cityHrefOf(city: string): string {
  if (city === TEXT_NONE) {
    return TEXT_NONE
  }
  return CITY_HREF_HEAD + encodeURIComponent(city)
}

/**
 * 一行展示行。
 *
 * @param x 哪张表、这一行、整张清单、界面语、取词函数与落格。
 * @returns 展示行。
 */
export function cellRowOf(x: CellRowIn): MyJobCellRow {
  const city = cityLabelOf({
    city: x.item.city, cityZh: x.item.cityZh, cityKo: x.item.cityKo, province: x.item.province, lang: x.lang,
  })
  const iso = dateIsoOf(x)
  return {
    key: String(x.item.id),
    href: jobHrefOf(x.item.jobId),
    title: x.item.title,
    company: x.item.company,
    cityName: city.name,
    cityNote: city.note,
    cityHref: cityHrefOf(x.item.city),
    onCompany: companyOpenOf(x),
    salaryAnnual: x.item.salaryAnnual,
    onCity: ignoreCityClick,
    salary: x.item.salary,
    date: dayOf(iso),
    sortAt: iso,
    statusText: statusTextOf(x),
    stageCell: stageCellOf(x),
    listingText: listingTextOf(x),
    closed: x.item.closed,
    closedText: closedTextOf(x),
    openText: x.t('mj.open'),
    unsaveText: unsaveTextOf(x),
    onUnsave: unsaveOf(x),
  }
}

/**
 * 整张清单的展示行。
 *
 * @param x 哪张表、清单、界面语、取词函数与落格。
 * @returns 展示行。
 */
export function myJobCellRowsOf(x: CellRowsIn): MyJobCellRow[] {
  const out: MyJobCellRow[] = []
  for (const item of x.items) {
    out.push(cellRowOf({
      kind: x.kind, item, items: x.items, lang: x.lang, t: x.t, setItems: x.setItems, onOpenCompany: x.onOpenCompany,
    }))
  }
  return out
}

/**
 * 职位列的排序值(不分大小写)。
 *
 * @param r 展示行。
 * @returns 职位名。
 */
export function titleSortOf(r: MyJobCellRow): string {
  return r.title.toLowerCase()
}

/**
 * 公司列的排序值(不分大小写)。
 *
 * @param r 展示行。
 * @returns 公司名。
 */
export function companySortOf(r: MyJobCellRow): string {
  return r.company.toLowerCase()
}

/**
 * 城市列的排序值(按界面上看到的主文案)。
 *
 * @param r 展示行。
 * @returns 城市名。
 */
export function citySortOf(r: MyJobCellRow): string {
  return r.cityName
}

/**
 * 薪资列的排序值(折算年薪;没有给 null,排在最后)。
 *
 * @param r 展示行。
 * @returns 年薪。
 */
export function salarySortOf(r: MyJobCellRow): number | null {
  return r.salaryAnnual
}

/**
 * 投递状态列的排序值。
 *
 * @param r 展示行。
 * @returns 进度字样。
 */
export function stageSortOf(r: MyJobCellRow): string {
  return r.statusText
}

/**
 * 职位状态列的排序值。
 *
 * @param r 展示行。
 * @returns 在架 / 已下架。
 */
export function listingSortOf(r: MyJobCellRow): string {
  return r.listingText
}

/**
 * 日期格(纯文字)。
 *
 * @param r 展示行。
 * @returns 年-月-日。
 */
export function dateOf(r: MyJobCellRow): string {
  return r.date
}

/**
 * 日期的排序值。
 *
 * @param r 展示行。
 * @returns ISO 时刻。
 */
export function dateSortOf(r: MyJobCellRow): string {
  return r.sortAt
}

/**
 * 行身份。
 *
 * @param r 展示行。
 * @returns 收藏记录 id。
 */
export function rowKeyOf(r: MyJobCellRow): string {
  return r.key
}

/**
 * 字段 → 卡片插槽(空串给 null,卡片就不出那一格)。
 *
 * @param s 字段。
 * @returns 字段或 null。
 */
export function slotOf(s: string): string | null {
  if (s === TEXT_NONE) {
    return null
  }
  return s
}

/**
 * 城市格的点击(城市在这两张表里不链去职位板,给城市格一个什么都不做的口)。
 *
 * @returns 无。
 */
export function ignoreCityClick(): void {
  return
}

/**
 * 我的求职七列:职位 / 公司 / 市 / 投递日期 / 投递状态 / 职位状态 / 操作(定稿的「用的材料」「对比」等有数据再加)。
 *
 * @param t 取词函数。
 * @returns 列组。
 */
export function appliedColsOf(t: TFn): MyJobCol[] {
  return [
    { key: COL_TITLE, label: t('col.title'), render: TitleCell, sort: titleSortOf },
    { key: COL_COMPANY, label: t('col.company'), render: CompanyCell, sort: companySortOf },
    { key: COL_CITY, label: t('col.city'), render: CityCell, sort: citySortOf },
    { key: COL_DATE, label: t('mj.appliedAt'), render: dateOf, sort: dateSortOf, nowrap: true },
    { key: COL_STAGE, label: t('mj.col.stage'), render: StatusCell, sort: stageSortOf, nowrap: true },
    { key: COL_LISTING, label: t('mj.col.listing'), render: ListingCell, sort: listingSortOf, nowrap: true },
    { key: COL_ACT, label: t('col.actions'), render: ActCell, nowrap: true },
  ]
}

/**
 * 我的收藏八列:职位 / 公司 / 市 / 薪资 / 发布日期 / 投递状态 / 职位状态 / 操作(打开、取消收藏)。
 * 2026-10-06 Frank「你为什么喜欢把两个字段放到一个列里」「拆」:一格一个字段 —— 原「状态」拆成投递状态 / 职位状态,
 * 职位格的译名灰字撤。
 *
 * @param t 取词函数。
 * @returns 列组。
 */
export function savedColsOf(t: TFn): MyJobCol[] {
  return [
    { key: COL_TITLE, label: t('col.title'), render: TitleCell, sort: titleSortOf },
    { key: COL_COMPANY, label: t('col.company'), render: CompanyCell, sort: companySortOf },
    { key: COL_CITY, label: t('col.city'), render: CityCell, sort: citySortOf },
    { key: COL_SALARY, label: t('col.salary'), render: SalaryCell, sort: salarySortOf, nowrap: true },
    { key: COL_DATE, label: t('col.datePosted'), render: dateOf, sort: dateSortOf, nowrap: true },
    { key: COL_STAGE, label: t('mj.col.stage'), render: StatusCell, sort: stageSortOf, nowrap: true },
    { key: COL_LISTING, label: t('mj.col.listing'), render: ListingCell, sort: listingSortOf, nowrap: true },
    { key: COL_ACT, label: t('col.actions'), render: ActCell, nowrap: true },
  ]
}

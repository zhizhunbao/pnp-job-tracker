/**
 * occupations 域(紧缺职业清单页)的函数:两级分组、省名与锚点、展示行、列组与排序取值、
 * 通道标题与条数文案。零 JSX 零 hook —— 排版归各 tsx,死值归 constants.ts。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */
import { streamDisplay } from '@/lib/jobs'
import {
  ANCHOR_HREF_HEAD, COL_GO_KEY, COL_GO_LABEL, COL_NAME_KEY, COL_NOC_KEY, COUNT_GAP, JOBS_SEARCH_HEAD,
  NAME_NONE_MARK, NOC_UNIT, PROV_ANCHOR_HEAD, PROV_KEY_HEAD, TEXT_NONE,
} from './constants'
import { GoCell } from './gocell'
import { NameCell } from './namecell'
import { NocCell } from './noccell'
import type {
  NocCountIn, OccCellRow, OccCellRowIn, OccCellRowsIn, OccCol, OccColsIn, ProvAnchorIn, ProvGroup,
  ProvGroupsIn, ProvNameIn, StreamTitleIn,
} from './types'

/**
 * 省 → 通道 两级分组。数据进来时已按 province/stream/noc 排好序,所以顺着扫一遍、
 * 换省换通道就开新组即可,不必先建表再排 —— 分组顺序 = 官方清单的入库序。
 *
 * @param x 官方清单的全部行。
 * @returns 按省分组、省内再按通道分组的清单。
 */
export function toProvGroups(x: ProvGroupsIn): ProvGroup[] {
  const provs: ProvGroup[] = []
  for (const r of x.rows) {
    let p = provs[provs.length - 1]
    if (p == null || p.prov !== r.province) {
      p = { prov: r.province, streams: [] }
      provs.push(p)
    }
    let s = p.streams[p.streams.length - 1]
    if (s == null || s.stream !== r.stream) {
      s = { stream: r.stream, label: r.label, fetched: r.fetched, occ: [] }
      p.streams.push(s)
    }
    s.occ.push(r)
  }
  return provs
}

/**
 * 省名:字典里有就用人话名,没有原样显示省码 —— 字典缺词不该把省码吞掉。
 *
 * @param x 取词函数与省码。
 * @returns 省名或省码。
 */
export function provNameOf(x: ProvNameIn): string {
  const key = PROV_KEY_HEAD + x.code
  const v = x.t(key)
  if (v === TEXT_NONE || v === key) {
    return x.code
  }
  return v
}

/**
 * 省锚点的去处(页内跳到这个省的小节 —— 全清单一页展示,导航不换页)。
 *
 * @param x 省码。
 * @returns 页内锚点地址。
 */
export function provAnchorHrefOf(x: ProvAnchorIn): string {
  return ANCHOR_HREF_HEAD + PROV_ANCHOR_HEAD + x.code
}

/**
 * 省小节的锚点身份(省锚点导航按它跳)。
 *
 * @param x 省码。
 * @returns 锚点 id。
 */
export function provAnchorIdOf(x: ProvAnchorIn): string {
  return PROV_ANCHOR_HEAD + x.code
}

/**
 * 洗一条通道的清单行。
 *
 * @param x 这条通道点名的职业与取词函数。
 * @returns 展示行。
 */
export function toOccCellRows(x: OccCellRowsIn): OccCellRow[] {
  const out = []
  for (const r of x.rows) {
    out.push(toOccCellRow({ r, t: x.t }))
  }
  return out
}

/**
 * 洗一行清单事实:名字缺席补横杠(排序取值仍留 null 让它沉底,不拿横杠跟真名字比大小)、
 * 算出去职位板的地址与那枚链接的文案。
 *
 * @param x 这一行与取词函数。
 * @returns 展示行。
 */
export function toOccCellRow(x: OccCellRowIn): OccCellRow {
  let name = NAME_NONE_MARK
  let nameSort: string | null = null
  if (x.r.name !== TEXT_NONE) {
    name = x.r.name
    nameSort = x.r.name
  }
  return {
    key: x.r.noc,
    noc: x.r.noc,
    name,
    nameSort,
    href: JOBS_SEARCH_HEAD + encodeURIComponent(x.r.noc),
    goLabel: x.t('rank.viewJobs'),
  }
}

/**
 * 通道表的列组:职业码、职业名、去职位板三列。
 * 组件统一 P2 余批(#110):通道表换公共 Table(排序 / 拖宽 / hover 同职位板观感)。
 *
 * @param x 取词函数。
 * @returns 列组。
 */
export function occColsOf(x: OccColsIn): OccCol[] {
  return [
    { key: COL_NOC_KEY, label: x.t('dir.occ.colNoc'), nowrap: true, sort: occNocSortOf, render: NocCell },
    { key: COL_NAME_KEY, label: x.t('dir.occ.colName'), sort: occNameSortOf, render: NameCell },
    { key: COL_GO_KEY, label: COL_GO_LABEL, nowrap: true, render: GoCell },
  ]
}

/**
 * 「职业码」列的排序取值(码本身就是升序可比的定长串)。
 *
 * @param r 这一行的展示行。
 * @returns 职业码。
 */
export function occNocSortOf(r: OccCellRow): string {
  return r.noc
}

/**
 * 「职业名」列的排序取值;名字缺席交回 null 恒沉底。
 *
 * @param r 这一行的展示行。
 * @returns 职业名或 null。
 */
export function occNameSortOf(r: OccCellRow): string | null {
  return r.nameSort
}

/**
 * 表格的行身份(同一条通道里职业码唯一)。
 *
 * @param r 这一行的展示行。
 * @returns 行身份。
 */
export function occRowKeyOf(r: OccCellRow): string {
  return r.key
}

/**
 * 通道标题:显示短名优先,字典没收录时用清单给的人话名,人话名也没有才露官方名。
 *
 * @param x 取词函数、通道官方名与人话名。
 * @returns 通道标题。
 */
export function streamTitleOf(x: StreamTitleIn): string {
  const shown = streamDisplay({ t: x.t, label: x.stream })
  if (shown !== TEXT_NONE) {
    return shown
  }
  if (x.label !== TEXT_NONE) {
    return x.label
  }
  return x.stream
}

/**
 * 通道标题旁的条数小注(「12 NOC」)。
 *
 * @param x 这条通道点名的职业条数。
 * @returns 条数文案。
 */
export function nocCountTextOf(x: NocCountIn): string {
  return String(x.count) + COUNT_GAP + NOC_UNIT
}

/**
 * timeline 域(政策时间线页)的函数:省清单与筛选、类名预算、事件行上的几个取舍,
 * 以及筛选状态机器要用的手柄工厂。零 JSX 零 hook —— 排版归各件的 tsx,
 * 状态归 hooks.ts,死值归 constants.ts。
 * 2026-10-03 资讯页签四分(页签改叫「抽选」):政策公告撤出时间线,类型筛(全部 / 抽选 / 政策)、圆点分档、重要徽标、
 * 站内详情页地址与两只类型手柄随之撤;节奏卡下钻不再切类型。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { cssOf } from '@/components/css'
import {
  UNIT_SELECTION, EVENTS_ANCHOR_ID, KIND_NOTICE, PROV_FED, PROV_KEY_HEAD,
  SCALE_CRS, SCROLL_SMOOTH, TEXT_NONE,
} from './constants'
import type {
  DaysClsIn, DrillIn, DrillOfIn, EventRow, EventTitleIn, EventsIn, InvTextIn,
  ClickFn, ProvLabelIn, ProvMatchIn, ProvPickIn, ScaleIn, ShownOfIn,
  StreamClearIn, StreamMatchIn,
} from './types'
import css from './timeline.module.css'

/**
 * 本页事件里真出现过的省码(排好序,联邦不算省 —— 它在筛选里另有一档)。
 * 筛出来必是空结果的省不给药丸:药丸的存在本身就是「这里有东西」的承诺。
 *
 * @param x 整条事件流。
 * @returns 去重排序后的省码清单。
 */
export function provsOf(x: EventsIn): string[] {
  const codes: string[] = []
  for (const row of x.events) {
    if (row.prov !== TEXT_NONE && codes.includes(row.prov) === false) {
      codes.push(row.prov)
    }
  }
  codes.sort()
  return codes
}

/**
 * 三个筛选一起过一遍事件流(纯客户端筛:本页事件不足百条,来回请求不值得)。
 * 2026-10-03 类型筛撤,剩省筛与流筛两个。
 *
 * @param x 整条事件流与两个筛选的现值。
 * @returns 该渲的事件(原序不动 —— 服务端已按新在前排好)。
 */
export function shownOf(x: ShownOfIn): EventRow[] {
  const rows: EventRow[] = []
  for (const row of x.events) {
    const hit = isProvMatch({ rowProv: row.prov, prov: x.prov })
      && isStreamMatch({ title: row.title, stream: x.stream })
    if (hit) {
      rows.push(row)
    }
  }
  return rows
}

/**
 * 这条事件过不过省筛。联邦档筛的是「省码为空」那一批,所以它不能拿省码直接比。
 *
 * @param x 这条事件的省码与当前省筛。
 * @returns 过不过。
 */
export function isProvMatch(x: ProvMatchIn): boolean {
  if (x.prov === TEXT_NONE) {
    return true
  }
  if (x.prov === PROV_FED) {
    return x.rowProv === TEXT_NONE
  }
  return x.rowProv === x.prov
}

/**
 * 这条事件过不过流筛。流筛是节奏卡带进来的,比的是事件标题 —— 节奏卡的流名与抽选
 * 事件的标题同源(服务端的分组键就是它),所以逐字相等就是同一条流。
 *
 * @param x 这条事件的标题与当前流筛。
 * @returns 过不过。
 */
export function isStreamMatch(x: StreamMatchIn): boolean {
  if (x.stream === TEXT_NONE) {
    return true
  }
  return x.title === x.stream
}

/**
 * 省筛药丸上的字(省全名;全站的 i18n 键只有这一处要拼)。
 *
 * @param x 取词函数与省码。
 * @returns 省全名。
 */
export function provLabelOf(x: ProvLabelIn): string {
  return x.t(PROV_KEY_HEAD + x.code)
}

/**
 * 节奏卡上「距今 N 天」的类名:比历史平均间隔还久就换琥珀档,提醒这条流拖长了。
 * 算不出平均间隔(在库不足两期)就没有「拖长了」这一说,照常规档出。
 *
 * @param x 距今天数与平均间隔。
 * @returns 类名。
 */
export function daysClsOf(x: DaysClsIn): string {
  if (x.avgGapDays == null) {
    return cssOf(css.days)
  }
  if (x.daysSince > x.avgGapDays) {
    return cssOf(css.daysLate)
  }
  return cssOf(css.days)
}

/**
 * 抽选那一行的标题:省通告没有自己的标题(它的内容在摘要里),一律走 i18n 的固定说法。
 *
 * @param x 取词函数与这条事件的类型、标题。
 * @returns 该显示的标题。
 */
export function eventTitleOf(x: EventTitleIn): string {
  if (x.kind === KIND_NOTICE) {
    return x.t('tl.notice')
  }
  return x.title
}

/**
 * 抽选那一行的人数(2026-09-26 lead 定):官方口径是从 EOI 池选取的省(DRAW_SELECT_PROVS,NS)写「人入选」,
 * 其余照旧「邀请 N 人」;词条复用省提名弹框的 pnpfacts.selPeople,不另起同义词条。
 * 2026-09-30 Frank「把脉页那几处 NS 也改成读数据吧」:改认这一条的 unit 格(selection),不再按省名判。
 *
 * @param x 取词函数与这一条事件。
 * @returns 人数话术;官方没公布给空串(不出那一格)。
 */
export function invTextOf(x: InvTextIn): string {
  if (x.row.invitations == null) {
    return TEXT_NONE
  }
  if (x.row.unit === UNIT_SELECTION) {
    return x.t('pnpfacts.selPeople', { n: x.row.invitations })
  }
  return x.t('tl.inv', { n: x.row.invitations })
}

/**
 * 分数后面要不要跟一句分制小注。诚实红线:省分数不是 CRS,不标会被当成 CRS 分读;
 * 分制本来就是 CRS 的那批不再标注一遍(它是联邦默认,重复说等于噪音)。
 *
 * @param x 分制标注。
 * @returns 标不标。
 */
export function isScaleShown(x: ScaleIn): boolean {
  return x.scale !== TEXT_NONE && x.scale !== SCALE_CRS
}

/**
 * 造省筛手柄的工厂:给它省码,换一只只管切到那个省的手柄。手动切省时把节奏卡带进来的
 * 流筛一并清掉 —— 不清就会筛出空结果(那条流只属于原来那个省)。
 *
 * @param x 省筛与流筛的落格。
 * @returns 逐省的手柄工厂。
 */
export function makeProvPickOf(x: ProvPickIn): (code: string) => ClickFn {
  return function pickOf(code: string): ClickFn {
    return function pick(): void {
      x.setProv(code)
      x.setStream(TEXT_NONE)
    }
  }
}

/**
 * 造撤销流筛的手柄(流筛药丸上那枚记号)。
 *
 * @param x 流筛的落格。
 * @returns 点击手柄。
 */
export function makeStreamClear(x: StreamClearIn): ClickFn {
  return function clear(): void {
    x.setStream(TEXT_NONE)
  }
}

/**
 * 造节奏卡点击手柄的工厂:点一张卡 = 事件流按这条流筛过去并滚过去
 * (详情就是这条流的历次抽选,数据已在同页,不必再跳一页)。
 * 联邦卡的省码是空串,筛选里要换成联邦那一档的词。
 *
 * @param x 省筛与流筛的落格。
 * @returns 逐张卡的手柄工厂。
 */
export function makeDrillOf(x: DrillOfIn): (target: DrillIn) => ClickFn {
  return function pickOf(target: DrillIn): ClickFn {
    return function drill(): void {
      let code = PROV_FED
      if (target.prov !== TEXT_NONE) {
        code = target.prov
      }
      x.setProv(code)
      x.setStream(target.stream)
      scrollToEvents()
    }
  }
}

/**
 * 把页面滚到事件流那一段。找不到锚点就什么都不做 —— 筛选已经落好了,
 * 用户往下翻一样看得到,不值得为一次滚动抛错。
 *
 * @returns 无。
 */
export function scrollToEvents(): void {
  const anchor = document.getElementById(EVENTS_ANCHOR_ID)
  if (anchor == null) {
    return
  }
  anchor.scrollIntoView({ behavior: SCROLL_SMOOTH })
}

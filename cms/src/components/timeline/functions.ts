/**
 * timeline 域(政策时间线页)的函数:省清单与筛选、类名预算、事件行上的几个取舍,
 * 以及筛选状态机器要用的手柄工厂。零 JSX 零 hook —— 排版归各件的 tsx,
 * 状态归 hooks.ts,死值归 constants.ts。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { cssOf } from '@/components/css'
import {
  CLS_SEP, EVENTS_ANCHOR_ID, IMP_MIN, KIND_DRAW, KIND_NOTICE, KIND_POLICY, PROV_FED, PROV_KEY_HEAD,
  SCALE_CRS, SCROLL_SMOOTH, TEXT_NONE, URL_NEWS_HEAD,
} from './constants'
import type {
  DaysClsIn, DrillIn, DrillOfIn, EventRow, EventTitleIn, EventsIn, ImportanceIn, KindDrawIn, KindMatchIn,
  KindIn, KindPickIn, ClickFn, ProvLabelIn, ProvMatchIn, ProvPickIn, ScaleIn, ShownOfIn, SlugIn,
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
 *
 * @param x 整条事件流与三个筛选的现值。
 * @returns 该渲的事件(原序不动 —— 服务端已按新在前排好)。
 */
export function shownOf(x: ShownOfIn): EventRow[] {
  const rows: EventRow[] = []
  for (const row of x.events) {
    const hit = isProvMatch({ rowProv: row.prov, prov: x.prov })
      && isKindMatch({ rowKind: row.kind, kind: x.kind })
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
 * 这条事件过不过类型筛。「抽选」这一档收的是**除政策公告以外**的两路(抽选 + 省通告)
 * —— 通告说的也是抽选那回事,分成两档只会让用户猜哪一档装着什么。
 *
 * @param x 这条事件的类型与当前类型筛。
 * @returns 过不过。
 */
export function isKindMatch(x: KindMatchIn): boolean {
  if (x.kind === TEXT_NONE) {
    return true
  }
  if (x.kind === KIND_DRAW) {
    return x.rowKind !== KIND_POLICY
  }
  return x.rowKind === KIND_POLICY
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
 * 时间轴左缘那颗圆点的类名(政策公告换青档,与抽选一眼分得开)。
 *
 * @param x 这条事件的类型。
 * @returns 拼好的 className。
 */
export function dotClsOf(x: KindIn): string {
  const cls = [cssOf(css.dot)]
  if (isPolicy({ kind: x.kind })) {
    cls.push(cssOf(css.dotPolicy))
  } else {
    cls.push(cssOf(css.dotDraw))
  }
  return cls.join(CLS_SEP)
}

/**
 * 这条事件是不是政策公告(政策与抽选两路在一条时间轴上混排,渲的东西完全不同:
 * 政策出站内链接与重要徽标,抽选出分数与邀请数)。
 *
 * @param x 这条事件的类型。
 * @returns 是不是。
 */
export function isPolicy(x: KindIn): boolean {
  return x.kind === KIND_POLICY
}

/**
 * 这条政策公告够不够挂红「重要」徽标(与 /news 列表同一条线:只给满分挂)。
 *
 * @param x AI 重要度。
 * @returns 挂不挂。
 */
export function isImportant(x: ImportanceIn): boolean {
  if (x.importance == null) {
    return false
  }
  return x.importance >= IMP_MIN
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
 * 一条政策公告在站内的详情页地址。
 *
 * @param x 站内 slug。
 * @returns 详情页地址。
 */
export function newsHrefOf(x: SlugIn): string {
  return URL_NEWS_HEAD + x.slug
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
 * 造类型筛手柄:切档并清掉流筛(理由同上)。
 *
 * @param x 类型筛与流筛的落格,以及切到哪一档。
 * @returns 点击手柄。
 */
export function makeKindPick(x: KindPickIn): ClickFn {
  return function pick(): void {
    x.setKind(x.kind)
    x.setStream(TEXT_NONE)
  }
}

/**
 * 造「抽选」档的手柄。它是三只里唯一**不清流筛**的一只:流筛筛的本来就是抽选,
 * 从「全部/政策」切回抽选时留着流筛,用户才能接着看刚点开的那条流。
 *
 * @param x 类型筛的落格。
 * @returns 点击手柄。
 */
export function makeKindDraw(x: KindDrawIn): ClickFn {
  return function pick(): void {
    x.setKind(KIND_DRAW)
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
 * @param x 三个筛选的落格。
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
      x.setKind(KIND_DRAW)
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

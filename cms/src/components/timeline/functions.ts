/**
 * timeline 域(政策时间线页)的函数:省清单与筛选、类名预算、事件行上的几个取舍,
 * 以及筛选状态机器要用的手柄工厂。零 JSX 零 hook —— 排版归各件的 tsx,
 * 状态归 hooks.ts,死值归 constants.ts。
 * 2026-10-03 资讯页签四分(页签改叫「抽选」):政策公告撤出时间线,类型筛(全部 / 抽选 / 政策)、圆点分档、重要徽标、
 * 站内详情页地址与两只类型手柄随之撤;节奏卡下钻不再切类型。
 * 2026-10-12 抽选页三段式:节奏卡下钻改成「点中一张卡」(按卡的流名清单筛,修好联邦卡点进去一条都筛不出的老毛病 ——
 * 原先拿卡上的中文类别名对事件的英文流名,永远对不上);新增卡片译名、数字格拼装与名次记号的几个派生。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { cssOf } from '@/components/css'
import { PROV_NAMES } from '@/lib/location'
import {
  ALLOC_PR_TARGET, CLS_SEP, COVER_SEP, KIND_CADENCE, KIND_QUOTA, K_ALLOC, K_GAP_DAYS, K_N, K_N_DAYS, K_N_PEOPLE,
  K_N_TIMES, K_PR_TARGET, DASH, DATE10_LEN, EE_KEY_I18N, FED_NAME_EN, LANG_EN, LANG_KO, NUM_LOCALE,
  STATUS_IDLE, STATUS_LATE, UNIT_APPLICATION, UNIT_SELECTION, KIND_NOTICE, PROV_FED, PROV_KEY_HEAD,
  SCALE_CRS, TEXT_NONE, YEAR_LEN,
} from './constants'
import type {
  CardTextIn, DrillOfIn, EeNameIn, EventGrayIn, EventRow, EventTitleIn, EventsIn, InvTextIn,
  ClickFn, NumTextIn, PickedOfIn, ProvLabelIn, ProvMatchIn, ProvPickIn, RankCard, ScaleIn, ShownOfIn,
  StatCellRow, StreamClearIn, StreamMatchIn, UnitTextIn,
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
      && isStreamMatch({ title: row.title, streams: x.streams })
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
  if (x.streams == null) {
    return true
  }
  return x.streams.includes(x.title)
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
      x.setPick(TEXT_NONE)
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
    x.setPick(TEXT_NONE)
  }
}

/**
 * 造节奏卡点击手柄的工厂:点一张卡 = 事件流按这条流筛过去(2026-10-12 Frank「点击卡片的时候,不要往下滚」:不再滚过去)
 * (详情就是这条流的历次抽选,数据已在同页,不必再跳一页)。
 * 联邦卡的省码是空串,筛选里要换成联邦那一档的词。
 *
 * @param x 省筛与流筛的落格。
 * @returns 逐张卡的手柄工厂。
 */
export function makeDrillOf(x: DrillOfIn): (card: RankCard) => ClickFn {
  return function pickOf(card: RankCard): ClickFn {
    return function drill(): void {
      let code = PROV_FED
      if (card.prov !== TEXT_NONE) {
        code = card.prov
      }
      x.setProv(code)
      x.setPick(card.key)
    }
  }
}

/**
 * 按键找回点中的节奏卡(没点 / 找不到 = null)。
 *
 * @param x 全部节奏卡与点中的卡键。
 * @returns 那张卡或 null。
 */
export function pickedOf(x: PickedOfIn): RankCard | null {
  if (x.pick === TEXT_NONE) {
    return null
  }
  for (const card of x.cards) {
    if (card.key === x.pick) {
      return card
    }
  }
  return null
}

/**
 * 联邦类别键 → 界面语的类别名(查 ee.* 词条;不是联邦类别或词表外 = '')。
 *
 * @param x 取词函数与类别键。
 * @returns 类别名或 ''。
 */
export function eeNameOf(x: EeNameIn): string {
  const key = EE_KEY_I18N[x.label]
  if (key == null) {
    return TEXT_NONE
  }
  return x.t(key)
}

/**
 * 卡片的英文名(配额卡按省码出省全名,联邦写 Federal;节奏卡用数据层给的名)。
 *
 * @param x 取词函数、界面语与这张卡。
 * @returns 英文名。
 */
export function cardNameEnOf(x: CardTextIn): string {
  if (x.card.kind === KIND_CADENCE) {
    return x.card.nameEn
  }
  if (x.card.prov === TEXT_NONE) {
    return FED_NAME_EN
  }
  const name = PROV_NAMES[x.card.prov]
  if (name == null) {
    return x.card.prov
  }
  return name
}

/**
 * 卡片英文名下面那行译名灰字(英文界面不出;配额卡出省名 / 联邦;联邦类别查 ee.* 词条;
 * 合卡写「覆盖 …」;其余取界面语那一格,没有就不出)。
 *
 * @param x 取词函数、界面语与这张卡。
 * @returns 灰字或 ''。
 */
export function cardGrayOf(x: CardTextIn): string {
  if (x.lang === LANG_EN) {
    return TEXT_NONE
  }
  if (x.card.kind === KIND_QUOTA) {
    if (x.card.prov === TEXT_NONE) {
      return x.t('tl.fed')
    }
    return provLabelOf({ t: x.t, code: x.card.prov })
  }
  if (x.card.label !== TEXT_NONE) {
    return eeNameOf({ t: x.t, label: x.card.label })
  }
  if (x.card.covers.length > 0) {
    return x.t('tl.covers', { list: coverListOf(x) })
  }
  if (x.lang === LANG_KO) {
    return x.card.nameKo
  }
  return x.card.nameZh
}

/**
 * 合卡覆盖的几条通道按界面语拼成一串(没有译名的那条用英文名)。
 *
 * @param x 取词函数、界面语与这张卡。
 * @returns 拼好的清单。
 */
function coverListOf(x: CardTextIn): string {
  const names: string[] = []
  for (const c of x.card.covers) {
    let name = c.zh
    if (x.lang === LANG_KO) {
      name = c.ko
    }
    if (name === TEXT_NONE) {
      name = c.en
    }
    names.push(name)
  }
  return names.join(COVER_SEP[x.lang])
}

/**
 * 点中的卡在筛选药丸上的字(筛选药丸保留界面语短名:中 / 韩取译名,合卡、没有译名或英文界面用英文名)。
 *
 * @param x 取词函数、界面语与这张卡。
 * @returns 药丸字。
 */
export function pickLabelOf(x: CardTextIn): string {
  if (x.lang !== LANG_EN && x.card.covers.length === 0) {
    const gray = cardGrayOf(x)
    if (gray !== TEXT_NONE) {
      return gray
    }
  }
  return x.card.nameEn
}

/**
 * 事件标题下的译名灰字(英文界面不出;联邦按类别键查词,省行中文界面取流名中文灰注)。
 *
 * @param x 取词函数、界面语与这件事。
 * @returns 灰字或 ''。
 */
export function eventGrayOf(x: EventGrayIn): string {
  if (x.lang === LANG_EN || x.row.kind === KIND_NOTICE) {
    return TEXT_NONE
  }
  if (x.row.label !== TEXT_NONE) {
    return eeNameOf({ t: x.t, label: x.row.label })
  }
  if (x.lang === LANG_KO) {
    return TEXT_NONE
  }
  return x.row.titleZh
}

/**
 * 人数格的格名(邀请 / 入选 / 入选申请三种口径各一词;NS 官方叫选取,不叫邀请)。
 *
 * @param x 取词函数与人数口径。
 * @returns 格名。
 */
export function inviteKeyOf(x: UnitTextIn): string {
  if (x.unit === UNIT_SELECTION) {
    return x.t('tl.selYtd')
  }
  if (x.unit === UNIT_APPLICATION) {
    return x.t('tl.appYtd')
  }
  return x.t('tl.invYtd')
}

/**
 * 带单位的数字格(千分位;null 写「-」,zeroDash 时 0 也写「-」)。
 *
 * @param x 取词函数、词条键、数字与 0 是否写一横。
 * @returns 格里的字。
 */
export function numTextOf(x: NumTextIn): string {
  if (x.n == null || (x.zeroDash && x.n === 0)) {
    return DASH
  }
  return x.t(x.key, { n: x.n.toLocaleString(NUM_LOCALE) })
}

/**
 * 最近抽选那一格:今年的写月-日,往年写全日期,只到月的照写。
 *
 * @param lastDate 最近一期日期。
 * @returns 格里的字。
 */
export function lastTextOf(lastDate: string): string {
  if (lastDate === TEXT_NONE) {
    return DASH
  }
  if (lastDate.length === DATE10_LEN && lastDate.slice(0, YEAR_LEN) === String(new Date().getFullYear())) {
    return lastDate.slice(YEAR_LEN + 1)
  }
  return lastDate
}

/**
 * 距今那一格的类(数字格的底类 + 按数据层判的状态上色:正常绿 / 比平常晚橙 / 久未抽选灰)。
 *
 * @param status 节奏状态。
 * @returns 类名(两枚,空格隔开)。
 */
export function sinceClsOf(status: RankCard['status']): string {
  let color = cssOf(css.vOk)
  if (status === STATUS_LATE) {
    color = cssOf(css.vLate)
  }
  if (status === STATUS_IDLE) {
    color = cssOf(css.vIdle)
  }
  return cssOf(css.statV) + CLS_SEP + color
}

/**
 * 节奏卡的数字格:最近抽选 / 距今 / 平均间隔 / 今年抽选 / 今年邀请(按口径)/ 今年提名(联邦没有提名这一步,不出这一格)。
 *
 * @param x 取词函数、界面语与这张卡。
 * @returns 各格。
 */
export function cadenceCellsOf(x: CardTextIn): StatCellRow[] {
  const c = x.card
  const plain = cssOf(css.statV)
  const cells: StatCellRow[] = [
    { k: x.t('tl.lastDraw'), v: lastTextOf(c.lastDate), cls: plain },
    {
      k: x.t('tl.since'),
      v: numTextOf({ t: x.t, key: K_N_DAYS, n: c.daysSince, zeroDash: false }),
      cls: sinceClsOf(c.status),
    },
    { k: x.t('tl.gap'), v: numTextOf({ t: x.t, key: K_GAP_DAYS, n: c.avgGapDays, zeroDash: false }), cls: plain },
    { k: x.t('tl.drawsYtd'), v: numTextOf({ t: x.t, key: K_N_TIMES, n: c.drawsYtd, zeroDash: true }), cls: plain },
    {
      k: inviteKeyOf({ t: x.t, unit: c.inviteUnit }),
      v: numTextOf({ t: x.t, key: K_N_PEOPLE, n: c.invitationsYtd, zeroDash: false }),
      cls: plain,
    },
  ]
  if (c.prov !== TEXT_NONE) {
    const nom = numTextOf({ t: x.t, key: K_N, n: c.nominationsYtd, zeroDash: false })
    cells.push({ k: x.t('tl.nomYtd'), v: nom, cls: plain })
  }
  return cells
}

/**
 * 配额卡的数字格:今年配额(联邦写「永居目标」)/ 今年邀请(按口径)/ 今年提名(联邦不出)。
 *
 * @param x 取词函数、界面语与这张卡。
 * @returns 各格。
 */
export function quotaCellsOf(x: CardTextIn): StatCellRow[] {
  const c = x.card
  const plain = cssOf(css.statV)
  let allocKey = K_ALLOC
  if (c.allocationKind === ALLOC_PR_TARGET) {
    allocKey = K_PR_TARGET
  }
  const cells: StatCellRow[] = [
    {
      k: x.t(allocKey, { y: new Date().getFullYear() }),
      v: numTextOf({ t: x.t, key: K_N, n: c.allocation, zeroDash: false }),
      cls: plain,
    },
    {
      k: inviteKeyOf({ t: x.t, unit: c.inviteUnit }),
      v: numTextOf({ t: x.t, key: K_N, n: c.invitationsYtd, zeroDash: false }),
      cls: plain,
    },
  ]
  if (c.prov !== TEXT_NONE) {
    const nom = numTextOf({ t: x.t, key: K_N, n: c.nominationsYtd, zeroDash: false })
    cells.push({ k: x.t('tl.nomYtd'), v: nom, cls: plain })
  }
  return cells
}

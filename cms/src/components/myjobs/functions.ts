/**
 * 「我的」页两张岗位清单(myjobs 组件桶)的函数:拉清单、取消收藏、洗展示行、阶段胶囊、按阶段筛。
 * 2026-10-08 进度板:列构造段撤(表换横卡),展示行多了首字母块、日期一行、状态胶囊档。
 * 2026-10-09 N6 批:职位名 / 公司名 / 城市 / 省份换 name 桶现成件,点名字开弹框的手柄与城市拼一格撤,展示行改交原值。
 * 2026-10-10 批 2「我的求职」四段:加今日推荐段(拉推荐、洗展示行、理由胶囊、地点一行)与新岗推送段(拉 / 存设置);
 * 未发出(草稿 + 待投)只在发出去的行出日期;阶段胶囊计数为 0 的不出。
 * 同日 lead 走查对效果图:三张清单网页端改走通用 Table 的表格形(列构造段 pickColsOf / savedColsOf / appliedColsOf + 各 *cell.tsx,
 * 照雇主板样张),手机一岗一张卡(MjCard);展示行并成一种 ListRow(原横卡展示行、首字母块、日期一行撤);
 * 新岗推送段(拉 / 存设置)按 1000 行闸切进子桶 prefs/。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { openApply } from '@/components/apply'
import { cssOf } from '@/components/css'
import { provNameOf, subOf } from '@/components/name'
import { homeProvinceOf, mapsUrl } from '@/lib/location'
import { ymd } from '@/lib/time'
import { ActCell } from './actcell'
import { AddrCell } from './addrcell'
import { AppliedOnCell } from './appliedoncell'
import { CompanyCell } from './companycell'
import {
  ACT_APPLY, ACT_CONT, ACT_COVER, ACT_OPEN, ACT_RESUME, ACT_UNSAVE, ANCHOR_SAVED, CLS_SEP, COL_ACT, COL_ADDR,
  COL_APPLIED_ON, COL_COMPANY, COL_DEADLINE, COL_HOURS, COL_PAY, COL_POSTED, COL_SAVED_ON, COL_STATUS, COL_TERM,
  COL_TITLE,
  COL_WHY, CRED_INCLUDE, FILE_COVER_TAIL, FILE_RESUME_TAIL, HOURS_EN, JOB_HREF_HEAD, KEY_HOURS_HEAD, KEY_TERM_HEAD,
  KIND_APPLIED, KIND_SAVED, LOCK_FILL, LOCK_FILL_N, METHOD_DELETE, OPEN_KIND, PRIMARY_KIND, QP_SEC, SEC_FAVS, STAGES,
  STAGE_ALL, STAGE_FILTERS, ST_DRAFT, TERM_EN, TEXT_NONE, UNSAVE_KIND, URL_APPLY_HEAD, URL_FILE_HEAD, URL_PICKS,
  URL_SAVED_JOB_HEAD, WHY_KEYS, WHY_TAG,
} from './constants'
import { DeadlineCell } from './deadlinecell'
import { HoursCell } from './hourscell'
import { PayCell } from './paycell'
import { PostedCell } from './postedcell'
import { SavedOnCell } from './savedoncell'
import { TagsCell } from './tagscell'
import { TermCell } from './termcell'
import { openAppView } from './thread'
import { TitleCell } from './titlecell'
import type {
  ActBtn, AddrSubIn, ByStageIn, CellRowIn, CellRowsIn, ColsIn, FileHrefIn, FlagIn, KindNameIn, ListRow, LoadMyJobsIn,
  LoadPicksIn, LockFill, LockedItem, MaybeStageDef, MjCol, MyJobItem, MyJobsRespJson, NamePair, PickIn, PickItem,
  PickRowIn, PickRowsIn, PicksFact, PicksRespJson, PillClickIn, ReasonTextsIn, StagePill, StagePillsIn, TagItem,
  UnsaveIn, ViewRowIn, ItemByIdIn, FileHrefForIn,
} from './types'
import css from './myjobs.module.css'

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
 * 投递进度那一档(STAGES 里按状态值找)。
 *
 * @param stage 状态值。
 * @returns 那一档;没投过 / 认不得给 null。
 */
export function stageDefOf(stage: string): MaybeStageDef {
  for (const s of STAGES) {
    if (s.st === stage) {
      return s
    }
  }
  return null
}

/**
 * 整张清单的展示行(我的收藏 / 我的投递;2026-10-10 批 2 网页端表格与手机卡共用,原横卡展示行 myJobCellRowsOf 换掉)。
 *
 * @param x 哪张清单、清单、取词函数、落格与界面语。
 * @returns 展示行。
 */
export function listRowsOf(x: CellRowsIn): ListRow[] {
  const out: ListRow[] = []
  for (const item of x.items) {
    out.push(listRowOf({
      kind: x.kind,
      filter: x.filter,
      item,
      items: x.items,
      t: x.t,
      setItems: x.setItems,
      lang: x.lang,
    }))
  }
  return out
}

/**
 * 一行展示行(收藏 / 投递):职位两行、公司、地点一行 + 灰字、薪资、工时与雇佣期两名、发布 / 截止 / 收藏于 / 投递于、
 * 胶囊(状态)、操作钮与附件链接;手机卡右上日期 = 收藏清单的收藏日期、投递清单的投递日期(未发出的行没有)。
 * 2026-10-10 批 2:原横卡展示行 cellRowOf(首字母块、日期一行)换掉。
 *
 * @param x 哪张清单、这一行、整张清单、取词函数、落格与界面语。
 * @returns 展示行。
 */
export function listRowOf(x: CellRowIn): ListRow {
  const it = x.item
  const hours = namesOf({ v: it.hours, en: HOURS_EN, keyHead: KEY_HOURS_HEAD, lang: x.lang, t: x.t })
  const term = namesOf({ v: it.term, en: TERM_EN, keyHead: KEY_TERM_HEAD, lang: x.lang, t: x.t })
  const appliedOn = appliedOnOf(x)
  let savedOn = TEXT_NONE
  let cornerDate = appliedOn
  if (x.kind === KIND_SAVED) {
    savedOn = ymdOf(it.savedAt)
    cornerDate = savedOn
  }
  return {
    key: String(it.id),
    jobId: it.jobId,
    title: it.title,
    titleSub: subOf({ lang: x.lang, zh: it.titleZh, ko: it.titleKo }),
    closedText: closedTextOf(x),
    company: it.company,
    companyZh: it.companyZh,
    companyKo: it.companyKo,
    companySlug: it.companySlug,
    address: it.address,
    addressHref: mapHrefOf(it.address),
    addressSub: addrSubOf({ cityZh: it.cityZh, cityKo: it.cityKo, province: it.province, lang: x.lang, t: x.t }),
    salary: it.salary,
    hoursEn: hours.en,
    hoursSub: hours.sub,
    termEn: term.en,
    termSub: term.sub,
    posted: ymdOf(it.datePosted),
    deadline: ymdOf(it.validThrough),
    savedOn,
    appliedOn,
    cornerDate,
    tags: tagsOf(x),
    acts: actsOf(x),
    files: filesOf(x),
  }
}

/**
 * 投递于:我的投递清单里发出去了的行(已投 / 雇主回复 / 退信)才有,未发出(草稿)与收藏清单给空串
 * (16d「草稿 / 待确认行不出日期」)。
 *
 * @param x 哪张清单与这一行。
 * @returns 年-月-日或空串。
 */
export function appliedOnOf(x: CellRowIn): string {
  if (x.kind !== KIND_APPLIED || x.item.stage === ST_DRAFT) {
    return TEXT_NONE
  }
  return ymdOf(x.item.updatedAt)
}

/**
 * 胶囊:投递状态一枚(筛到单一状态时不再重复挂;只收藏没投的没有)。
 *
 * @param x 这一行、当前筛选与取词函数。
 * @returns 胶囊。
 */
export function tagsOf(x: CellRowIn): TagItem[] {
  const def = stageDefOf(x.item.stage)
  if (def == null || x.filter !== STAGE_ALL) {
    return []
  }
  return [{ text: x.t(def.labelKey), variant: def.tag }]
}

/**
 * 操作钮:我的投递 未发出「继续」(主钮,就地弹投递框)、其余「打开」(带框次钮);
 * 我的收藏 能投的「投递」(主钮)、投过的「打开」,外加「取消收藏」(带框次钮,16d)。
 * 2026-10-10 批 3(1.6 / 2.6):我的投递发出去了的行「打开」不再去职位页,改就地弹只读投递框(职位信息 / 雇主回复 / 投递内容 / 邮件预览);
 * 我的收藏投过的行「打开」照旧去职位页。
 *
 * @param x 哪张清单、这一行与取词函数。
 * @returns 钮。
 */
export function actsOf(x: CellRowIn): ActBtn[] {
  const out: ActBtn[] = []
  if (continueHrefOf(x) !== TEXT_NONE) {
    out.push({ key: ACT_CONT, text: x.t('mj.cont'), kind: PRIMARY_KIND, onClick: makeContinue(x), href: TEXT_NONE })
  } else if (applyHrefOf(x) !== TEXT_NONE) {
    out.push({ key: ACT_APPLY, text: x.t('mj.apply'), kind: PRIMARY_KIND, onClick: makeApplyOpen(x), href: TEXT_NONE })
  } else if (x.kind === KIND_APPLIED) {
    out.push({ key: ACT_OPEN, text: x.t('mj.open'), kind: OPEN_KIND, onClick: makeAppOpen(x.item.id), href: TEXT_NONE })
  } else if (jobHrefOf(x.item.jobId) !== TEXT_NONE && x.item.stage !== TEXT_NONE) {
    out.push({ key: ACT_OPEN, text: x.t('mj.open'), kind: OPEN_KIND, onClick: null, href: jobHrefOf(x.item.jobId) })
  }
  const unsave = unsaveOf(x)
  if (unsave != null) {
    out.push({ key: ACT_UNSAVE, text: x.t('mj.unsave'), kind: UNSAVE_KIND, onClick: unsave, href: TEXT_NONE })
  }
  return out
}

/**
 * 附件链接:我的投递发出去了的行给简历 / 求职信(发出时没附求职信的不出),新标签开。
 *
 * @param x 哪张清单、这一行与取词函数。
 * @returns 链接。
 */
export function filesOf(x: CellRowIn): ActBtn[] {
  const out: ActBtn[] = []
  const resume = fileHrefOf({ x, tail: FILE_RESUME_TAIL })
  if (resume !== TEXT_NONE) {
    out.push({ key: ACT_RESUME, text: x.t('mj.col.resume'), kind: OPEN_KIND, onClick: null, href: resume })
  }
  const cover = coverHrefOf(x)
  if (cover !== TEXT_NONE) {
    out.push({ key: ACT_COVER, text: x.t('mj.col.cover'), kind: OPEN_KIND, onClick: null, href: cover })
  }
  return out
}

/**
 * 「已下架」字样。
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
 * 取消收藏的手柄(只有我的收藏那张清单有)。
 *
 * @param x 哪张清单、这一行与落格。
 * @returns 手柄;我的求职给 null。
 */
export function unsaveOf(x: CellRowIn): (() => void) | null {
  if (x.kind === KIND_APPLIED) {
    return null
  }
  return makeUnsave({ id: x.item.id, items: x.items, setItems: x.setItems })
}

/**
 * 附件地址:我的求职那张清单发出去了的行(行 id = 投递行 id)给 /api/apply/file 的地址;草稿、待投与我的收藏给空串。
 *
 * @param y 这一行与种类尾。
 * @returns 地址或空串。
 */
function fileHrefOf(y: FileHrefIn): string {
  if (y.x.kind !== KIND_APPLIED || y.x.item.stage === ST_DRAFT) {
    return TEXT_NONE
  }
  return URL_FILE_HEAD + y.x.item.id + y.tail
}

/**
 * 求职信附件地址:同上,但发出时没附求职信(投递框选了「不附求职信」)的行给空串,不出链接(2026-10-10 Frank「两处都改吧」)。
 *
 * @param x 哪张清单与这一行。
 * @returns 地址或空串。
 */
function coverHrefOf(x: CellRowIn): string {
  if (x.item.hasCover === false) {
    return TEXT_NONE
  }
  return fileHrefOf({ x, tail: FILE_COVER_TAIL })
}

/**
 * 草稿 / 待投「继续」的去处:我的求职那张清单、职位还在,去投递区接着写 / 发(2026-10-08)。
 * 2026-10-10 Frank「删吧」:待投(queued)行不再列,只剩草稿。
 *
 * @param x 哪张清单与这一行。
 * @returns 投递区地址;其余给空串。
 */
export function continueHrefOf(x: CellRowIn): string {
  if (x.kind !== KIND_APPLIED || x.item.jobId == null) {
    return TEXT_NONE
  }
  if (x.item.stage !== ST_DRAFT) {
    return TEXT_NONE
  }
  return URL_APPLY_HEAD + x.item.jobId
}

/**
 * 造「点继续」:整页跳到投递区(同页软跳转只改地址栏、不装投递流程,2026-10-08 实撞;空地址不动)。
 * 2026-10-09 A 批投递搬进弹框:草稿行就地弹投递框(不再整页跳);待投行照旧整页跳到「今日待投」卡那一张。
 * 2026-10-10 批 2:「今日待投」卡从本页撤了,待投行并进「未发出」,同草稿就地弹投递框。
 *
 * @param x 哪张清单与这一行。
 * @returns 点击手柄。
 */
export function makeContinue(x: CellRowIn): () => void {
  return function cont(): void {
    const href = continueHrefOf(x)
    if (href === TEXT_NONE || x.item.jobId == null) {
      return
    }
    openApply(x.item.jobId)
  }
}

/**
 * 造收藏行「投递」:就地弹投递框(2026-10-09 A 批;原先是去「我的求职」投递区的链接)。
 *
 * @param x 哪张清单与这一行。
 * @returns 点击手柄。
 */
export function makeApplyOpen(x: CellRowIn): () => void {
  return function applyOpen(): void {
    if (applyHrefOf(x) !== TEXT_NONE && x.item.jobId != null) {
      openApply(x.item.jobId)
    }
  }
}

/**
 * 收藏行「投递」的去处:我的收藏那张清单、在架、没投过、库里有投递邮箱的岗才有(2026-10-08)。
 *
 * @param x 哪张清单与这一行。
 * @returns 投递区地址;投不了给空串。
 */
export function applyHrefOf(x: CellRowIn): string {
  if (x.kind !== KIND_SAVED || x.item.closed || x.item.stage !== TEXT_NONE || x.item.hasEmail === false) {
    return TEXT_NONE
  }
  if (x.item.jobId == null) {
    return TEXT_NONE
  }
  return URL_APPLY_HEAD + x.item.jobId
}

/**
 * 按阶段筛清单(all = 原样)。2026-10-10 批 2:「未发出」(draft)那一档连待投(queued)一起算;同日 Frank「删吧」:queued 行不再列,只认 draft。
 *
 * @param x 清单与筛哪一类。
 * @returns 筛后的清单。
 */
export function byStageOf(x: ByStageIn): MyJobItem[] {
  if (x.stage === STAGE_ALL) {
    return x.items
  }
  const out: MyJobItem[] = []
  for (const it of x.items) {
    if (it.stage === x.stage) {
      out.push(it)
    }
  }
  return out
}

/**
 * 我的求职顶上那排阶段胶囊(每档带计数;当前档选中)。2026-10-10 批 2:除「全部」与当前档外,计数为 0 的不出。
 *
 * @param x 清单、当前档与取词函数。
 * @returns 胶囊。
 */
export function stagePillsOf(x: StagePillsIn): StagePill[] {
  const out: StagePill[] = []
  for (const f of STAGE_FILTERS) {
    const n = byStageOf({ items: x.items, stage: f.key }).length
    if (n === 0 && f.key !== STAGE_ALL && f.key !== x.stage) {
      continue
    }
    out.push({
      key: f.key,
      label: x.t(f.labelKey),
      count: n,
      on: f.key === x.stage,
    })
  }
  return out
}

/**
 * 造「阶段胶囊点了切档」。
 *
 * @param x 切档落格。
 * @returns 收档键的手柄。
 */
export function makePick(x: PickIn): (key: string) => void {
  return function pick(key: string): void {
    x.setStage(key)
  }
}

/**
 * 造「点这一枚胶囊」:切到它那一档。
 *
 * @param x 档键与切档手柄。
 * @returns 点击手柄。
 */
export function makePillClick(x: PillClickIn): () => void {
  return function pick(): void {
    x.onPick(x.key)
  }
}

/**
 * 阶段胶囊的类:底座 + 选中态。
 *
 * @param on 选中了没有。
 * @returns className。
 */
export function stagePillClsOf(on: boolean): string {
  if (on) {
    return cssOf(css.stage) + CLS_SEP + cssOf(css.stageOn)
  }
  return cssOf(css.stage)
}

/**
 * 行身份。
 *
 * @param r 展示行。
 * @returns 收藏记录 / 投递行 id。
 */
export function rowKeyOf(r: ListRow): string {
  return r.key
}


/**
 * 卡头计数:零条不出(空态那一行已经说了)。
 *
 * @param n 条数。
 * @returns 条数;零给 null。
 */
export function countOf(n: number): number | null {
  if (n === 0) {
    return null
  }
  return n
}

/**
 * ISO 时刻 → 年-月-日(没有给空串)。
 *
 * @param iso ISO 时刻。
 * @returns 年-月-日。
 */
export function ymdOf(iso: string): string {
  if (iso === TEXT_NONE) {
    return TEXT_NONE
  }
  return ymd(iso)
}

/**
 * 地点一行的 Google 地图链接(没有地点给空串)。
 *
 * @param address 地点一行。
 * @returns 链接。
 */
export function mapHrefOf(address: string): string {
  if (address === TEXT_NONE) {
    return TEXT_NONE
  }
  return mapsUrl(address)
}

/**
 * 地点一行底下的灰字:「市译名,省译名」(英文界面不出;只有一样有就只写那一样)。
 *
 * @param x 城市两种译名、省码、界面语与取词函数。
 * @returns 灰字;不出给空串。
 */
export function addrSubOf(x: AddrSubIn): string {
  const city = subOf({ lang: x.lang, zh: x.cityZh, ko: x.cityKo })
  const prov = provNameOf({ code: x.province, lang: x.lang, t: x.t }).sub
  if (city === TEXT_NONE) {
    return prov
  }
  if (prov === TEXT_NONE) {
    return city
  }
  return x.t('mj.addrSub', { c: city, p: prov })
}

/**
 * 工时 / 雇佣期的两行名(数据层归一值 → 英文名 + 界面语灰字;16d,Frank「可以,按这个改」):
 * full / part = Full-time 全职 / Part-time 兼职;permanent / term / seasonal / casual = Permanent 长期 / Fixed-term 定期合同 /
 * Seasonal 季节性 / Casual 临时。没标或认不得的两格都空。
 *
 * @param x 归一值、英文名表、词条头、界面语与取词函数。
 * @returns 两行名。
 */
export function namesOf(x: KindNameIn): NamePair {
  const en = x.en[x.v]
  if (en == null) {
    return { en: TEXT_NONE, sub: TEXT_NONE }
  }
  const local = x.t(x.keyHead + x.v)
  return { en, sub: subOf({ lang: x.lang, zh: local, ko: local }) }
}

/**
 * 网页端「今日推荐」的列(16d):职位 / 公司 / 地址 / 薪资 / 工时 / 雇佣期 / 发布日期 / 截止日期 / 为什么推荐 / 操作。
 *
 * @param x 取词函数。
 * @returns 列。
 */
export function pickColsOf(x: ColsIn): MjCol<ListRow>[] {
  return baseColsOf(x).concat([
    { key: COL_WHY, label: x.t('mj.col.why'), render: TagsCell },
    { key: COL_ACT, label: x.t('mj.col.act'), render: ActCell, nowrap: true },
  ])
}

/**
 * 网页端「我的收藏」的列:职位 / 公司 / 地址 / 薪资 / 工时 / 雇佣期 / 发布日期 / 截止日期 / 收藏于 / 操作。
 *
 * @param x 取词函数。
 * @returns 列。
 */
export function savedColsOf(x: ColsIn): MjCol<ListRow>[] {
  return baseColsOf(x).concat([
    { key: COL_SAVED_ON, label: x.t('mj.col.savedOn'), render: SavedOnCell, nowrap: true },
    { key: COL_ACT, label: x.t('mj.col.act'), render: ActCell, nowrap: true },
  ])
}

/**
 * 网页端「我的投递」的列:职位 / 公司 / 地址 / 薪资 / 工时 / 雇佣期 / 发布日期 / 截止日期 / 状态 / 投递于 / 操作。
 *
 * @param x 取词函数。
 * @returns 列。
 */
export function appliedColsOf(x: ColsIn): MjCol<ListRow>[] {
  return baseColsOf(x).concat([
    { key: COL_STATUS, label: x.t('mj.col.status'), render: TagsCell },
    { key: COL_APPLIED_ON, label: x.t('mj.col.appliedOn'), render: AppliedOnCell, nowrap: true },
    { key: COL_ACT, label: x.t('mj.col.act'), render: ActCell, nowrap: true },
  ])
}

/**
 * 三张表共用的前八列(照职位板)。
 *
 * @param x 取词函数。
 * @returns 列。
 */
function baseColsOf(x: ColsIn): MjCol<ListRow>[] {
  return [
    { key: COL_TITLE, label: x.t('mj.col.title'), render: TitleCell },
    { key: COL_COMPANY, label: x.t('mj.col.company'), render: CompanyCell },
    { key: COL_ADDR, label: x.t('mj.col.addr'), render: AddrCell },
    { key: COL_PAY, label: x.t('mj.col.pay'), render: PayCell, nowrap: true },
    { key: COL_HOURS, label: x.t('mj.col.hours'), render: HoursCell, nowrap: true },
    { key: COL_TERM, label: x.t('mj.col.term'), render: TermCell, nowrap: true },
    { key: COL_POSTED, label: x.t('mj.col.posted'), render: PostedCell, nowrap: true },
    { key: COL_DEADLINE, label: x.t('mj.col.deadline'), render: DeadlineCell, nowrap: true },
  ]
}

/**
 * 造「拉一次推荐」:带上浏览器按时区预选的省(他没答所在省时服务端用它);失败拨「拉失败了」。
 *
 * @param x 两个落格。
 * @returns 拉推荐的函数。
 */
export function makeLoadPicks(x: LoadPicksIn): () => Promise<void> {
  return async function loadPicks(): Promise<void> {
    try {
      const r = await fetch(URL_PICKS + homeProvinceOf(), { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setFailed(true)
        return
      }
      x.setData(toPicksFact(await r.json() as PicksRespJson))
    } catch {
      x.setFailed(true)
    }
  }
}

/**
 * 推荐回包 → 推荐(行构造器:缺席按空读)。
 *
 * @param d 回包。
 * @returns 推荐。
 */
export function toPicksFact(d: PicksRespJson): PicksFact {
  let picks: PickItem[] = []
  if (d.picks != null) {
    picks = d.picks
  }
  let more = 0
  if (d.more != null) {
    more = d.more
  }
  let locked: LockedItem[] = []
  if (d.locked != null) {
    locked = d.locked
  }
  return { picks, more, locked }
}

/**
 * 推荐的展示行。
 *
 * @param x 推荐、界面语与取词函数。
 * @returns 展示行。
 */
export function pickRowsOf(x: PickRowsIn): ListRow[] {
  const out: ListRow[] = []
  for (const item of x.items) {
    out.push(pickRowOf({ item, lang: x.lang, t: x.t }))
  }
  return out
}

/**
 * 一行推荐的展示行:同收藏 / 投递的展示行,胶囊是理由(tag 桶 ok 档,只放真的),操作只有主钮「投递」(就地弹投递框),
 * 手机卡右上是发布日期。
 *
 * @param x 这一行、界面语与取词函数。
 * @returns 展示行。
 */
export function pickRowOf(x: PickRowIn): ListRow {
  const it = x.item
  const hours = namesOf({ v: it.hours, en: HOURS_EN, keyHead: KEY_HOURS_HEAD, lang: x.lang, t: x.t })
  const term = namesOf({ v: it.term, en: TERM_EN, keyHead: KEY_TERM_HEAD, lang: x.lang, t: x.t })
  const tags: TagItem[] = []
  for (const text of reasonTextsOf({ reasons: it.reasons, program: it.program, t: x.t })) {
    tags.push({ text, variant: WHY_TAG })
  }
  const posted = ymdOf(it.datePosted)
  return {
    key: String(it.id),
    jobId: it.id,
    title: it.title,
    titleSub: subOf({ lang: x.lang, zh: it.titleZh, ko: it.titleKo }),
    closedText: TEXT_NONE,
    company: it.company,
    companyZh: it.companyZh,
    companyKo: it.companyKo,
    companySlug: it.companySlug,
    address: it.address,
    addressHref: mapHrefOf(it.address),
    addressSub: addrSubOf({ cityZh: it.cityZh, cityKo: it.cityKo, province: it.province, lang: x.lang, t: x.t }),
    salary: it.salary,
    hoursEn: hours.en,
    hoursSub: hours.sub,
    termEn: term.en,
    termSub: term.sub,
    posted,
    deadline: ymdOf(it.validThrough),
    savedOn: TEXT_NONE,
    appliedOn: TEXT_NONE,
    cornerDate: posted,
    tags,
    acts: [
      { key: ACT_APPLY, text: x.t('mj.apply'), kind: PRIMARY_KIND, onClick: makeOpenApply(it.id), href: TEXT_NONE },
    ],
    files: [],
  }
}

/**
 * 理由码 → 胶囊的字(认不得的码不出;省提名那枚带项目简称)。
 *
 * @param x 理由码、项目简称与取词函数。
 * @returns 胶囊的字。
 */
export function reasonTextsOf(x: ReasonTextsIn): string[] {
  const out: string[] = []
  for (const code of x.reasons) {
    const key = WHY_KEYS[code]
    if (key != null) {
      out.push(x.t(key, { p: x.program }))
    }
  }
  return out
}

/**
 * 造「点投递」:就地弹投递框。
 *
 * @param jobId 职位号。
 * @returns 点击手柄。
 */
export function makeOpenApply(jobId: number): () => void {
  return function openIt(): void {
    openApply(jobId)
  }
}

/**
 * 造「拨一个开关」(开 / 关定价框)。
 *
 * @param x 落格与拨成什么。
 * @returns 点击手柄。
 */
export function makeFlag(x: FlagIn): () => void {
  return function flag(): void {
    x.set(x.v)
  }
}

/**
 * 旧深链 `?sec=favs`(「我的收藏」页签撤了,落「我的求职」):收藏卡挂上后滚过去。
 */
export function scrollSavedIfLinked(): void {
  if (new URLSearchParams(window.location.search).get(QP_SEC) !== SEC_FAVS) {
    return
  }
  const el = document.getElementById(ANCHOR_SAVED)
  if (el != null) {
    el.scrollIntoView()
  }
}

/**
 * 锁住那条用哪份假字纹理(两份轮着用)。
 *
 * @param i 第几条。
 * @returns 一份纹理。
 */
export function lockFillOf(i: number): LockFill {
  if (i % LOCK_FILL_N === 0) {
    return LOCK_FILL.even
  }
  return LOCK_FILL.odd
}

/**
 * 造「打开」:就地弹只读投递框(地址栏 `?app=<投递行 id>`,框由「我的」页上的宿主 AppViewHost 画)。
 *
 * @param appId 投递行 id。
 * @returns 点击手柄。
 */
export function makeAppOpen(appId: number): () => void {
  return function openApp(): void {
    openAppView(appId)
  }
}

/**
 * 只读投递框「职位信息」那张卡的展示行:同我的投递清单一行的展示行(单元格共用),框里不改清单。
 *
 * @param x 这一行、取词函数与界面语。
 * @returns 展示行。
 */
export function viewRowOf(x: ViewRowIn): ListRow {
  return listRowOf({
    kind: KIND_APPLIED, filter: STAGE_ALL, item: x.item, items: [x.item], t: x.t, setItems: keepItems, lang: x.lang,
  })
}

/**
 * 不改清单(只读框里展示行要一个落格,取消收藏这类改清单的钮在投递行上本来就没有)。
 *
 * @returns 无。
 */
function keepItems(): void {
  return
}

/**
 * 在我的投递清单里按投递行 id 找那一行。
 *
 * @param x 清单与投递行 id。
 * @returns 那一行;不在清单里给 null。
 */
export function itemByIdOf(x: ItemByIdIn): MyJobItem | null {
  for (const it of x.items) {
    if (it.id === x.id) {
      return it
    }
  }
  return null
}

/**
 * 展示行里某个附件的地址(简历 / 求职信;发出时没附求职信的没有)。
 *
 * @param x 展示行与附件身份。
 * @returns 地址;没有给空串。
 */
export function fileHrefFor(x: FileHrefForIn): string {
  for (const f of x.row.files) {
    if (f.key === x.key) {
      return f.href
    }
  }
  return TEXT_NONE
}

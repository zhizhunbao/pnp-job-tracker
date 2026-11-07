/**
 * me 桶子桶 jobs 的行为:三张清单(今日推荐 / 我的收藏 / 我的投递)的取数与展示行、列构造、页签、阶段筛选、
 * 公司名与职位名的懒翻,外加进「我的求职」先弹五题的判定与记账。
 * 2026-11-07 自 myjobs 桶(含子桶 recommend)与 account 桶的五题件在新域重写(Frank「全部在新域重写」):
 * 三张白卡换成一条页签,一行只留一颗主钮(推荐 / 收藏「投递」、投递「打开」、草稿「继续」),「删除」钮与删除确认框撤;
 * 我的投递行上的简历 / 求职信链接撤(只读投递框里照有);手机一条照效果图(职位、公司 + 薪资、地点 + 截止 + 一颗钮)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { openApply } from '@/components/apply'
import { missingStepsOf } from '@/components/gate'
import { lazyTitleOf, titleSubOf } from '@/components/jobtitle'
import { hoursNameOf, placeHrefOf, placeSubOf, termNameOf } from '@/components/name'
import { log, PROFILE_LOG } from '@/lib/log'
import { saveBasics } from '@/lib/quiz'
import { ymd } from '@/lib/time'
import { ActCell } from './actcell'
import { AddrCell } from './addrcell'
import { ChanCell } from './chancell'
import { CompanyCell } from './companycell'
import {
  ACT_APPLY, ACT_CONT, ACT_OPEN, CLOSED_TAG, COL_ACT, COL_ADDR, COL_APPLIED_ON, COL_CHAN, COL_COMPANY, COL_DEADLINE,
  COL_HOURS, COL_PAY, COL_POSTED, COL_SAVED_ON, COL_STATUS, COL_TERM, COL_TITLE, COL_WHY, CRED_INCLUDE, DUE_KEY,
  JOB_HREF_HEAD, KIND_APPLIED, KIND_SAVED, LANG_EN, LANG_KO, LANG_ZH, LOCK_FILL, LOCK_FILL_N, LOCK_KEY_HEAD, MD_FROM,
  OPEN_KIND, PF_ERR_ASKED, PF_ERR_EMPTY, PLACE_SEP, PRIMARY_KIND, QP_SEC, SEC_FAVS, STAGES, STAGE_ALL, STAGE_FILTERS,
  ST_DRAFT, TAB_APPLIED, TAB_PICKS, TAB_SAVED, TEXT_NONE, URL_PROFILE,
} from './constants'
import { HoursCell } from './hourscell'
import { PayCell } from './paycell'
import { chanNameOf, picksTotalOf, whyTagsOf } from './recommend'
import { TagsCell } from './tagscell'
import { TermCell } from './termcell'
import { TitleCell } from './titlecell'
import type {
  ActBtn, AskedDoneIn, ByStageIn, CellRowIn, CellRowsIn, CoAliasForIn, CoLandIn, ColsIn, FlagIn, JobsTab, JobsTabIn,
  JobsTabsIn, LazyCompaniesIn, ListRow, LoadMyJobsIn, LockedRowIn, LockedRowsIn, LockFill, MaybeStageDef, MjCol,
  MyJobItem, MyJobsRespJson, PfJson, PfLoadIn, PfSeed, PfView, PickRowIn, PickRowsIn, PillClickIn, PlaceDue, PlaceDueIn,
  QuizOpenIn, StagePill, StagePillsIn, TagItem, TitleSubForIn,
} from './types'

/**
 * 清单接口响应 → 清单(行构造器:缺席按零条读)。
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
      x.setFailed(false)
      x.setItems(toMyJobItems(await r.json() as MyJobsRespJson))
    } catch {
      x.setFailed(true)
      x.setItems([])
    }
  }
}

/**
 * 造「拨一个开关」(开 / 关定价框、显示更多 / 收起)。
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
 * 三枚页签(2026-11-07 效果图:计数挂在页签字后面;还没拉到不出计数)。页签字用短词条 mj.tab.*(同日截图验收:
 * 英文「My saved jobs」「My applications」在 375 宽排不下,第三枚被截)。
 *
 * @param x 取词函数与三张清单。
 * @returns 页签。
 */
export function tabsOf(x: JobsTabsIn): JobsTab[] {
  let picks: number | null = null
  if (x.picks != null) {
    picks = picksTotalOf(x.picks)
  }
  return [
    tabOf({ key: TAB_PICKS, label: x.t('mj.tab.picks'), n: picks }),
    tabOf({ key: TAB_SAVED, label: x.t('mj.tab.saved'), n: countOrNull(x.saved) }),
    tabOf({ key: TAB_APPLIED, label: x.t('mj.tab.applied'), n: countOrNull(x.applied) }),
  ]
}

/**
 * 一枚页签:有条数挂计数,没有不挂(tabs 桶 badge 缺席 = 不出)。
 *
 * @param x 身份、字与条数。
 * @returns 页签。
 */
export function tabOf(x: JobsTabIn): JobsTab {
  if (x.n == null) {
    return { key: x.key, label: x.label }
  }
  return { key: x.key, label: x.label, badge: x.n }
}

/**
 * 清单条数(还没拉到给 null)。
 *
 * @param items 清单。
 * @returns 条数或 null。
 */
export function countOrNull(items: MyJobItem[] | null): number | null {
  if (items == null) {
    return null
  }
  return items.length
}

/**
 * 进页先落哪一枚页签:旧深链 `?sec=favs`(「我的收藏」页签 10-10 撤了,落「我的求职」)直接切到「我的收藏」,其余落「今日推荐」。
 *
 * @returns 页签身份。
 */
export function firstTabOf(): string {
  if (typeof window === 'undefined') {
    return TAB_PICKS
  }
  if (new URLSearchParams(window.location.search).get(QP_SEC) === SEC_FAVS) {
    return TAB_SAVED
  }
  return TAB_PICKS
}

/**
 * 整张清单的展示行(我的收藏 / 我的投递;网页端表格与手机一条共用)。
 *
 * @param x 哪张清单、清单、取词函数、界面语、懒翻表与开投递框。
 * @returns 展示行。
 */
export function listRowsOf(x: CellRowsIn): ListRow[] {
  const out: ListRow[] = []
  for (const item of x.items) {
    out.push(listRowOf({
      kind: x.kind,
      filter: x.filter,
      item,
      t: x.t,
      lang: x.lang,
      titles: x.titles,
      cos: x.cos,
      openApp: x.openApp,
    }))
  }
  return out
}

/**
 * 一行展示行(收藏 / 投递):职位两行、公司、地点一行 + 灰字、薪资、工时与雇佣期、发布 / 截止 / 收藏于 / 投递于、状态胶囊、唯一那颗钮;
 * 手机一条底行「市, 省码」+「截止 月-日」。
 *
 * @param x 哪张清单、这一行、取词函数、界面语、懒翻表与开投递框。
 * @returns 展示行。
 */
export function listRowOf(x: CellRowIn): ListRow {
  const it = x.item
  const pd = placeDueOf({ city: it.city, province: it.province, validThrough: it.validThrough, t: x.t })
  let savedOn = TEXT_NONE
  if (x.kind === KIND_SAVED) {
    savedOn = ymdOf(it.savedAt)
  }
  const tags = tagsOf(x)
  return {
    key: String(it.id),
    jobId: it.jobId,
    title: it.title,
    titleSub: titleSubFor({
      title: it.title,
      titleZh: it.titleZh,
      titleKo: it.titleKo,
      titles: x.titles,
      lang: x.lang,
    }),
    chanEn: TEXT_NONE,
    chanSub: TEXT_NONE,
    company: it.company,
    companyZh: coAliasFor({ own: it.companyZh, name: it.company, cos: x.cos, want: LANG_ZH, lang: x.lang }),
    companyKo: coAliasFor({ own: it.companyKo, name: it.company, cos: x.cos, want: LANG_KO, lang: x.lang }),
    companySlug: it.companySlug,
    address: it.address,
    addressHref: placeHrefOf(it.address),
    addressSub: placeSubOf({ cityZh: it.cityZh, cityKo: it.cityKo, province: it.province, lang: x.lang, t: x.t }),
    place: pd.place,
    due: pd.due,
    salary: it.salary,
    hoursEn: hoursNameOf({ v: it.hours, lang: x.lang, t: x.t }).en,
    termEn: termNameOf({ v: it.term, lang: x.lang, t: x.t }).en,
    posted: ymdOf(it.datePosted),
    deadline: ymdOf(it.validThrough),
    savedOn,
    appliedOn: appliedDateOf(x),
    tags,
    cardTags: tags,
    act: actOf(x),
    locked: false,
  }
}

/**
 * 投递于:我的投递清单里发出去了的行(已投 / 雇主回复 / 退信)才有,草稿与收藏清单给空串
 * (16d「草稿 / 待确认行不出日期」)。
 *
 * @param x 哪张清单与这一行。
 * @returns 年-月-日或空串。
 */
export function appliedDateOf(x: CellRowIn): string {
  if (x.kind !== KIND_APPLIED || x.item.stage === ST_DRAFT) {
    return TEXT_NONE
  }
  return ymdOf(x.item.updatedAt)
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
 * 胶囊:投递状态一枚(筛到单一状态时不再重复挂;只收藏没投的没有)+ 已下架一枚。
 * 2026-10-12 Frank「已下架这个应该有个状态列」:「已下架」从职位名下面挪进状态列。
 *
 * @param x 这一行、当前筛选与取词函数。
 * @returns 胶囊。
 */
export function tagsOf(x: CellRowIn): TagItem[] {
  const out: TagItem[] = []
  const def = stageDefOf(x.item.stage)
  if (def != null && x.filter === STAGE_ALL) {
    out.push({ text: x.t(def.labelKey), variant: def.tag })
  }
  if (x.item.closed) {
    out.push({ text: x.t('mj.closed'), variant: CLOSED_TAG })
  }
  return out
}

/**
 * 唯一那颗钮(2026-11-07 效果图:一行一颗主行动;10-12 加的「删除」钮撤):
 * 我的投递 草稿「继续」(主钮,就地弹投递框)、发出去的「打开」(就地弹只读投递框,2026-10-10 批 3);
 * 我的收藏 能投的「投递」(主钮,就地弹投递框)、投过的「打开」(去职位页);都不是给 null。
 *
 * @param x 哪张清单、这一行、取词函数与开投递框。
 * @returns 钮或 null。
 */
export function actOf(x: CellRowIn): ActBtn | null {
  const it = x.item
  if (isContinue(x) && it.jobId != null) {
    return {
      key: ACT_CONT,
      text: x.t('mj.cont'),
      kind: PRIMARY_KIND,
      onClick: makeOpenApply(it.jobId),
      href: TEXT_NONE,
    }
  }
  if (canApply(x) && it.jobId != null) {
    return {
      key: ACT_APPLY,
      text: x.t('mj.apply'),
      kind: PRIMARY_KIND,
      onClick: makeOpenApply(it.jobId),
      href: TEXT_NONE,
    }
  }
  if (x.kind === KIND_APPLIED) {
    return { key: ACT_OPEN, text: x.t('mj.open'), kind: OPEN_KIND, onClick: makeAppOpen(x), href: TEXT_NONE }
  }
  if (it.jobId != null && it.stage !== TEXT_NONE) {
    return { key: ACT_OPEN, text: x.t('mj.open'), kind: OPEN_KIND, onClick: null, href: JOB_HREF_HEAD + it.jobId }
  }
  return null
}

/**
 * 草稿「继续」:我的投递那张清单、职位还在、还是草稿(2026-10-10 Frank「删吧」:待投行不再列,只剩草稿)。
 *
 * @param x 哪张清单与这一行。
 * @returns 出「继续」。
 */
export function isContinue(x: CellRowIn): boolean {
  return x.kind === KIND_APPLIED && x.item.jobId != null && x.item.stage === ST_DRAFT
}

/**
 * 收藏行「投递」:我的收藏那张清单、在架、没投过、库里有投递邮箱的岗才有(2026-10-08)。
 *
 * @param x 哪张清单与这一行。
 * @returns 出「投递」。
 */
export function canApply(x: CellRowIn): boolean {
  if (x.kind !== KIND_SAVED || x.item.closed || x.item.stage !== TEXT_NONE || x.item.hasEmail === false) {
    return false
  }
  return x.item.jobId != null
}

/**
 * 造「点投递 / 继续」:就地弹投递框(2026-10-09 A 批;原先是去「我的求职」投递区的链接)。
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
 * 造「打开」:就地弹只读投递框(地址栏 `?app=<投递行 id>`,框由「我的」页上的宿主画)。
 *
 * @param x 这一行的造行入参(投递行 id 与开框手柄都在里面)。
 * @returns 点击手柄。
 */
export function makeAppOpen(x: CellRowIn): () => void {
  return function openApp(): void {
    x.openApp(x.item.id)
  }
}

/**
 * 按阶段筛清单(all = 原样)。2026-10-10 Frank「删吧」:queued 行不再列,「未发出」只认 draft。
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
 * 我的投递顶上那排阶段筛选(每档带计数;当前档选中)。2026-10-10 批 2:除「全部」与当前档外,计数为 0 的不出。
 *
 * @param x 清单、当前档与取词函数。
 * @returns 筛选。
 */
export function stagePillsOf(x: StagePillsIn): StagePill[] {
  const out: StagePill[] = []
  for (const f of STAGE_FILTERS) {
    const n = byStageOf({ items: x.items, stage: f.key }).length
    if (n === 0 && f.key !== STAGE_ALL && f.key !== x.stage) {
      continue
    }
    out.push({ key: f.key, label: x.t(f.labelKey), count: n, on: f.key === x.stage })
  }
  return out
}

/**
 * 造「点这一枚筛选」:切到它那一档。
 *
 * @param x 档键与切档落格。
 * @returns 点击手柄。
 */
export function makePillClick(x: PillClickIn): () => void {
  return function pick(): void {
    x.setStage(x.key)
  }
}

/**
 * 推荐的展示行。
 *
 * @param x 推荐、界面语、取词函数与懒翻表。
 * @returns 展示行。
 */
export function pickRowsOf(x: PickRowsIn): ListRow[] {
  const out: ListRow[] = []
  for (const item of x.items) {
    out.push(pickRowOf({ item, lang: x.lang, t: x.t, titles: x.titles, cos: x.cos }))
  }
  return out
}

/**
 * 一行推荐的展示行:同收藏 / 投递的展示行,表格胶囊是推荐原因(手机一条不出,照效果图),唯一那颗钮「投递」(就地弹投递框)。
 * 2026-10-12 Frank「这个是 我的 推荐模块」「改吧」:推荐只推全职长期的岗,工时 / 雇佣期两格不带。
 * 2026-11-07 效果图:「删除」(这一岗以后不再推)撤。
 *
 * @param x 这一行、界面语、取词函数与懒翻表。
 * @returns 展示行。
 */
export function pickRowOf(x: PickRowIn): ListRow {
  const it = x.item
  const chan = chanNameOf({
    province: it.province,
    pnpStream: it.pnpStream,
    pnpEligible: it.pnpEligible,
    provDefault: it.provDefault,
    lang: x.lang,
    t: x.t,
  })
  const pd = placeDueOf({ city: it.city, province: it.province, validThrough: it.validThrough, t: x.t })
  return {
    key: String(it.id),
    jobId: it.id,
    title: it.title,
    titleSub: titleSubFor({
      title: it.title,
      titleZh: it.titleZh,
      titleKo: it.titleKo,
      titles: x.titles,
      lang: x.lang,
    }),
    chanEn: chan.en,
    chanSub: chan.sub,
    company: it.company,
    companyZh: coAliasFor({ own: it.companyZh, name: it.company, cos: x.cos, want: LANG_ZH, lang: x.lang }),
    companyKo: coAliasFor({ own: it.companyKo, name: it.company, cos: x.cos, want: LANG_KO, lang: x.lang }),
    companySlug: it.companySlug,
    address: it.address,
    addressHref: placeHrefOf(it.address),
    addressSub: placeSubOf({ cityZh: it.cityZh, cityKo: it.cityKo, province: it.province, lang: x.lang, t: x.t }),
    place: pd.place,
    due: pd.due,
    salary: it.salary,
    hoursEn: TEXT_NONE,
    termEn: TEXT_NONE,
    posted: ymdOf(it.datePosted),
    deadline: ymdOf(it.validThrough),
    savedOn: TEXT_NONE,
    appliedOn: TEXT_NONE,
    tags: whyTagsOf({
      reasons: it.reasons,
      abovePct: it.abovePct,
      lmiaPositions: it.lmiaPositions,
      eeCategory: it.eeCategory,
      pilot: it.pilot,
      t: x.t,
    }),
    cardTags: [],
    act: { key: ACT_APPLY, text: x.t('mj.apply'), kind: PRIMARY_KIND, onClick: makeOpenApply(it.id), href: TEXT_NONE },
    locked: false,
  }
}

/**
 * 打码行(2026-10-12 Frank「隐藏的 和 显示的 要对齐啊」「上下要对齐。有 中文 灰字的 要加上」):免费号「显示更多」后锁住的推荐,
 * 并进同一张表 —— 职位名(带灰字)与通道照常出,公司 / 地址 / 薪资是模糊假字(真值不下发;地址 = 假街址 + 这一行的省码),没有钮。
 *
 * @param x 锁住的一条、第几条、界面语、取词函数与懒翻表。
 * @returns 展示行。
 */
export function lockedRowOf(x: LockedRowIn): ListRow {
  const it = x.item
  const fill = lockFillOf(x.i)
  const chan = chanNameOf({
    province: it.province,
    pnpStream: it.pnpStream,
    pnpEligible: it.pnpEligible,
    provDefault: it.provDefault,
    lang: x.lang,
    t: x.t,
  })
  return {
    key: LOCK_KEY_HEAD + String(x.i),
    jobId: null,
    title: it.title,
    titleSub: titleSubFor({
      title: it.title,
      titleZh: it.titleZh,
      titleKo: it.titleKo,
      titles: x.titles,
      lang: x.lang,
    }),
    chanEn: chan.en,
    chanSub: chan.sub,
    company: fill.company,
    companyZh: TEXT_NONE,
    companyKo: TEXT_NONE,
    companySlug: TEXT_NONE,
    address: fill.street + it.province,
    addressHref: TEXT_NONE,
    addressSub: TEXT_NONE,
    place: TEXT_NONE,
    due: TEXT_NONE,
    salary: fill.salary,
    hoursEn: TEXT_NONE,
    termEn: TEXT_NONE,
    posted: TEXT_NONE,
    deadline: TEXT_NONE,
    savedOn: TEXT_NONE,
    appliedOn: TEXT_NONE,
    tags: [],
    cardTags: [],
    act: null,
    locked: true,
  }
}

/**
 * 打码行(只在免费号点了「显示更多」时出)。
 *
 * @param x 推荐整包、出不出、界面语、取词函数与懒翻表。
 * @returns 展示行;不出给空列。
 */
export function lockedRowsOf(x: LockedRowsIn): ListRow[] {
  const out: ListRow[] = []
  if (x.show === false) {
    return out
  }
  for (const [i, item] of x.data.locked.entries()) {
    out.push(lockedRowOf({ item, i, lang: x.lang, t: x.t, titles: x.titles }))
  }
  return out
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
 * 网页端「今日推荐」的列(2026-11-07 效果图):职位 / 公司 / 地址 / 薪资 / 截止日期 / 通道 / 推荐原因 / 操作。
 * 2026-10-12 Frank「bullets 显示 全职 长期。这两个字段就没必要显示了吧」:推荐表不出工时 / 雇佣期两列;效果图连发布日期也不出。
 *
 * @param x 取词函数。
 * @returns 列。
 */
export function pickColsOf(x: ColsIn): MjCol<ListRow>[] {
  return [
    { key: COL_TITLE, label: x.t('mj.col.title'), render: TitleCell },
    { key: COL_COMPANY, label: x.t('mj.col.company'), render: CompanyCell },
    { key: COL_ADDR, label: x.t('mj.col.addr'), render: AddrCell },
    { key: COL_PAY, label: x.t('mj.col.pay'), render: PayCell, nowrap: true },
    { key: COL_DEADLINE, label: x.t('mj.col.deadline'), render: deadlineOf, nowrap: true },
    { key: COL_CHAN, label: x.t('mj.col.chan'), render: ChanCell },
    { key: COL_WHY, label: x.t('mj.col.why'), render: TagsCell },
    { key: COL_ACT, label: x.t('mj.col.act'), render: ActCell, nowrap: true },
  ]
}

/**
 * 网页端「我的收藏」的列:职位 / 公司 / 地址 / 薪资 / 工时 / 雇佣期 / 发布日期 / 截止日期 / 状态 / 收藏日期 / 操作。
 *
 * @param x 取词函数。
 * @returns 列。
 */
export function savedColsOf(x: ColsIn): MjCol<ListRow>[] {
  return baseColsOf(x).concat([
    { key: COL_STATUS, label: x.t('mj.col.status'), render: TagsCell },
    { key: COL_SAVED_ON, label: x.t('mj.col.savedOn'), render: savedOnOf, nowrap: true },
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
    { key: COL_APPLIED_ON, label: x.t('mj.col.appliedOn'), render: appliedOnOf, nowrap: true },
    { key: COL_ACT, label: x.t('mj.col.act'), render: ActCell, nowrap: true },
  ])
}

/**
 * 我的收藏 / 我的投递共用的前八列(照职位板)。
 *
 * @param x 取词函数。
 * @returns 列。
 */
export function baseColsOf(x: ColsIn): MjCol<ListRow>[] {
  return [
    { key: COL_TITLE, label: x.t('mj.col.title'), render: TitleCell },
    { key: COL_COMPANY, label: x.t('mj.col.company'), render: CompanyCell },
    { key: COL_ADDR, label: x.t('mj.col.addr'), render: AddrCell },
    { key: COL_PAY, label: x.t('mj.col.pay'), render: PayCell, nowrap: true },
    { key: COL_HOURS, label: x.t('mj.col.hours'), render: HoursCell, nowrap: true },
    { key: COL_TERM, label: x.t('mj.col.term'), render: TermCell, nowrap: true },
    { key: COL_POSTED, label: x.t('mj.col.posted'), render: postedOf, nowrap: true },
    { key: COL_DEADLINE, label: x.t('mj.col.deadline'), render: deadlineOf, nowrap: true },
  ]
}

/**
 * 发布日期格。
 *
 * @param r 展示行。
 * @returns 年-月-日。
 */
export function postedOf(r: ListRow): string {
  return r.posted
}

/**
 * 截止日期格。
 *
 * @param r 展示行。
 * @returns 年-月-日。
 */
export function deadlineOf(r: ListRow): string {
  return r.deadline
}

/**
 * 收藏于格。
 *
 * @param r 展示行。
 * @returns 年-月-日。
 */
export function savedOnOf(r: ListRow): string {
  return r.savedOn
}

/**
 * 投递于格。
 *
 * @param r 展示行。
 * @returns 年-月-日。
 */
export function appliedOnOf(r: ListRow): string {
  return r.appliedOn
}

/**
 * 行身份。
 *
 * @param r 展示行。
 * @returns 收藏记录 / 投递行 / 职位 id。
 */
export function rowKeyOf(r: ListRow): string {
  return r.key
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
 * 手机一条底行的两段(2026-11-07 效果图「Calgary, AB,截止 11-19」):「市, 省码」与「截止 月-日」,各自没有给空串。
 *
 * @param x 城市、省码、截止日与取词函数。
 * @returns 两段。
 */
export function placeDueOf(x: PlaceDueIn): PlaceDue {
  let place = x.province
  if (x.city !== TEXT_NONE) {
    place = x.city + PLACE_SEP + x.province
  }
  let due = TEXT_NONE
  if (x.validThrough !== TEXT_NONE) {
    due = x.t(DUE_KEY, { d: ymd(x.validThrough).slice(MD_FROM) })
  }
  return { place, due }
}

/**
 * 职位名底下的灰字(2026-10-11 Frank「可以,按你说的改」:三张清单的职位格照全站 jobtitle 口径 —— 库里存好的标题译名 →
 * 懒翻回来的;英文界面不出、和岗名一样的不出。清单行不带职业名,职业名兜底那一档空着)。
 *
 * @param x 职位名、两语库存译名、懒翻表与界面语。
 * @returns 灰字;没有给空串。
 */
export function titleSubFor(x: TitleSubForIn): string {
  return titleSubOf({
    row: { title: x.title, titleZh: x.titleZh, titleKo: x.titleKo },
    lang: x.lang,
    lazy: lazyTitleOf({ map: x.titles, title: x.title }),
    noc: TEXT_NONE,
  })
}

/**
 * 一格公司译名(2026-10-12 Frank「这个也需要中文灰字」):库里存了用库里的;没存且这一格正是界面语,用懒翻回来的;都没有给空串。
 *
 * @param x 库里的、公司名、懒翻表、这一格的语言与界面语。
 * @returns 译名。
 */
export function coAliasFor(x: CoAliasForIn): string {
  if (x.own !== TEXT_NONE || x.want !== x.lang) {
    return x.own
  }
  const got = x.cos[x.name]
  if (got == null) {
    return TEXT_NONE
  }
  return got
}

/**
 * 清单里要懒翻的公司名:英文界面不翻;库里这一语没存译名的才翻,同名只翻一次。
 *
 * @param x 清单行与界面语。
 * @returns 公司名。
 */
export function untranslatedCosOf(x: LazyCompaniesIn): string[] {
  const out: string[] = []
  if (x.items == null || x.lang === LANG_EN) {
    return out
  }
  for (const it of x.items) {
    let own = it.companyKo
    if (x.lang === LANG_ZH) {
      own = it.companyZh
    }
    if (own === TEXT_NONE && it.company !== TEXT_NONE && out.includes(it.company) === false) {
      out.push(it.company)
    }
  }
  return out
}

/**
 * 造「懒翻回来一家」:译名并进译名表(换一份新表,别的公司照抄)。
 *
 * @param x 公司名与改表手柄。
 * @returns 落格手柄。
 */
export function makeCoLand(x: CoLandIn): (alias: string | null) => void {
  return function land(alias: string | null): void {
    if (alias == null) {
      return
    }
    x.setCos(function withOne(prev: Record<string, string>): Record<string, string> {
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(prev)) {
        next[k] = v
      }
      next[x.name] = alias
      return next
    })
  }
}

/**
 * 取档案(quiz 域;答案档五格 + 三语名字 + 投递署名)。取挂了留痕、不弹。
 *
 * @param x 档案落格。
 * @returns 无。
 */
export async function loadProfile(x: PfLoadIn): Promise<void> {
  try {
    const r = await fetch(URL_PROFILE, { credentials: CRED_INCLUDE })
    if (r.ok === false) {
      throw new Error(String(r.status))
    }
    const body = await r.json() as PfJson
    if (body.profile == null) {
      throw new Error(PF_ERR_EMPTY)
    }
    x.setView(body.profile)
  } catch (e) {
    log({ tag: PROFILE_LOG.tag, text: PROFILE_LOG.viewLoad + String(e) })
  }
}

/**
 * 档案 → 修改弹框的起始答案(码清单取名字里的码)。
 *
 * @param v 档案。
 * @returns 起始答案。
 */
export function profileSeedOf(v: PfView): PfSeed {
  const majors: string[] = []
  for (const m of v.majors) {
    majors.push(m.code)
  }
  const nocs: string[] = []
  for (const n of v.nocs) {
    nocs.push(n.code)
  }
  return {
    goal: v.goal, majors, nocs, prov: v.prov, abroad: v.abroad, city: v.city.en, name: v.name, who: v.who, edu: v.edu,
  }
}

/**
 * 进「我的求职」该不该弹五题(2026-10-11 Frank「一共没几个问题啊 都问不行吗」):档案取回来了、这一页还没关过、
 * 这个账号没弹过、五样里还有空着的(判空与弹框排题同一把尺:gate 桶 missingStepsOf)。
 *
 * @param x 档案与「这一页关过了」。
 * @returns 弹。
 */
export function jobsQuizOpenOf(x: QuizOpenIn): boolean {
  if (x.view == null || x.closed || x.view.asked) {
    return false
  }
  return missingStepsOf(profileSeedOf(x.view)).length > 0
}

/**
 * 记「五题弹过了」(写进答案档 jobsAsked 立刻推,随账号走、换设备不再弹)。没记上留痕 —— 下次进来会再弹一次,不拦这一次。
 *
 * @returns 无。
 */
export async function markJobsAsked(): Promise<void> {
  try {
    const ok = await saveBasics({ jobsAsked: true })
    if (ok === false) {
      throw new Error(PF_ERR_ASKED)
    }
  } catch (e) {
    log({ tag: PROFILE_LOG.tag, text: PROFILE_LOG.askedMark + String(e) })
  }
}

/**
 * 造五题弹框的「关了」:记这一页关过、交还调用方(重拉今日推荐)。
 *
 * @param x 「关过了」落格与交还口。
 * @returns 手柄。
 */
export function makeAskedDone(x: AskedDoneIn): () => void {
  return function askedDone(): void {
    x.setClosed(true)
    x.onDone()
  }
}

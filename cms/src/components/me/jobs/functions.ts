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
import { ymd } from '@/lib/time'
import { ActCell } from './actcell'
import { CompanyCell } from './companycell'
import {
  ACT_APPLY, ACT_CONT, ACT_DEL, ACT_OPEN, CLOSED_TAG, COL_ACT, COL_APPLIED_ON, COL_COMPANY, COL_DEADLINE,
  COL_HOURS, COL_PAY, COL_PLACE, COL_POSTED, COL_SAVED_ON, COL_STATUS, COL_TERM, COL_TITLE, CRED_INCLUDE,
  DUE_KEY, JOB_HREF_HEAD, KIND_APPLIED, KIND_SAVED, LANG_EN, LANG_KO, LANG_ZH, MD_FROM,
  OPEN_KIND, PF_ERR_EMPTY, PLACE_SEP, PRIMARY_KIND, STAGES, STAGE_ALL, STAGE_FILTERS,
  METHOD_DELETE, ST_DRAFT, TEXT_NONE, URL_PROFILE,
  COL_ADDR, COL_COVER, COL_RESUME, FILE_COVER_TAIL, FILE_RESUME_TAIL, MIME_PDF, URL_FILE_HEAD, URL_TAILOR_FILE_HEAD,
  FILL_KEY, FILL_LABEL_FALLBACK, FILL_LABEL_KEYS, FILL_MORE_KEY, FILL_NAME_MAX, FILL_SEP_KEY, COL_MED, COL_VS,
} from './constants'
import { AddrCell } from './addrcell'
import { CoverCell } from './covercell'
import { HoursCell } from './hourscell'
import { MedCell } from './medcell'
import { PayCell } from './paycell'
import { PlaceCell } from './placecell'
import { ResumeCell } from './resumecell'
import { wageViewOf } from './recommend'
import { TagsCell } from './tagscell'
import { TermCell } from './termcell'
import { VsCell } from './vscell'
import { TitleCell } from './titlecell'
import type {
  ActBtn, ByStageIn, CellRowIn, CellRowsIn, CoAliasForIn, CoLandIn, ColsIn,
  LazyCompaniesIn, ListRow, LoadMyJobsIn, MaybeStageDef, MjCol,
  MyJobItem, MyJobsRespJson, PfJson, PfLoadIn, PfSeed, PfView, PickRowIn, PickRowsIn, PillClickIn, PlaceDue, PlaceDueIn,
  FillTextIn, StagePill, StagePillsIn, TagItem, TitleSubForIn,
  FillHideIn, AskOkIn, AskSetFn, DelMenuIn, RemoveFn, RemoveMineIn, RowMenuItem,
  SendDeleteIn, FileBtn, FileBtnIn, FileOpenIn, FileSetFn, FileView,
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
      ask: x.ask,
      remove: x.remove,
      filter: x.filter,
      item,
      t: x.t,
      lang: x.lang,
      titles: x.titles,
      cos: x.cos,
      openApp: x.openApp,
      view: x.view,
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
    company: it.company,
    companyZh: coAliasFor({ own: it.companyZh, name: it.company, cos: x.cos, want: LANG_ZH, lang: x.lang }),
    companyKo: coAliasFor({ own: it.companyKo, name: it.company, cos: x.cos, want: LANG_KO, lang: x.lang }),
    companySlug: it.companySlug,
    addressHref: placeHrefOf(it.address),
    addressSub: placeSubOf({ cityZh: it.cityZh, cityKo: it.cityKo, province: it.province, lang: x.lang, t: x.t }),
    place: pd.place,
    due: pd.due,
    salary: it.salary,
    wage: wageViewOf({ hourly: null, pct: null }),
    hoursEn: hoursNameOf({ v: it.hours, lang: x.lang, t: x.t }).en,
    termEn: termNameOf({ v: it.term, lang: x.lang, t: x.t }).en,
    posted: ymdOf(it.datePosted),
    deadline: ymdOf(it.validThrough),
    savedOn,
    appliedOn: appliedDateOf(x),
    address: it.address,
    resume: fileBtnOf({ row: x, cover: false }),
    cover: fileBtnOf({ row: x, cover: true }),
    tags,
    cardTags: tags,
    act: actOf(x),
    menu: delMenuOf({ t: x.t, ask: x.ask, remove: x.remove, id: it.id, name: it.title }),
    more: x.t('mj.more'),
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
 * 「简历」「求职信」格里的「查看」钮(2026-11-11 Frank「要包含我投递出去的简历 和 介绍信 列,用户可以随时查看」):
 * 有文件地址才出;简历只有 PDF 能就地预览(草稿行的那份一定是 PDF),求职信一律是 PDF。
 *
 * @param x 这一行与要哪一种。
 * @returns 钮;没有文件给 null。
 */
export function fileBtnOf(x: FileBtnIn): FileBtn | null {
  const src = fileSrcOf(x)
  if (src === TEXT_NONE) {
    return null
  }
  const it = x.row.item
  let label = x.row.t('mj.col.resume')
  let pdf = it.stage === ST_DRAFT || it.resumeMime === MIME_PDF
  if (x.cover) {
    label = x.row.t('mj.col.cover')
    pdf = true
  }
  return {
    text: x.row.t('mj.view'),
    label,
    onClick: makeFileOpen({ view: x.row.view, file: { kicker: label, title: it.title, src, pdf } }),
  }
}

/**
 * 附件地址:只有我的投递有。发出去了的行给 /api/apply/file(没附求职信的求职信格给空串);
 * 草稿行只有按职位改写过的才有(/api/tailor/file,将发出的那份 PDF),没改写过给空串。
 *
 * @param x 这一行与要哪一种。
 * @returns 地址或空串。
 */
export function fileSrcOf(x: FileBtnIn): string {
  const it = x.row.item
  if (x.row.kind !== KIND_APPLIED) {
    return TEXT_NONE
  }
  let tail = FILE_RESUME_TAIL
  if (x.cover) {
    tail = FILE_COVER_TAIL
  }
  if (it.stage === ST_DRAFT) {
    if (it.hasTailor !== true || it.jobId == null) {
      return TEXT_NONE
    }
    return URL_TAILOR_FILE_HEAD + String(it.jobId) + tail
  }
  if (x.cover && it.hasCover !== true) {
    return TEXT_NONE
  }
  return URL_FILE_HEAD + String(it.id) + tail
}

/**
 * 造「开查看附件弹框」。
 *
 * @param x 开弹框的手柄与要看的那一份。
 * @returns 点击手柄。
 */
export function makeFileOpen(x: FileOpenIn): () => void {
  return function openFile(): void {
    x.view(x.file)
  }
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
 * 2026-11-11 任务书第 47 条:行末「⋯」里的删除再撤(连同删除接口;已删过的岗照旧不推)。
 *
 * @param x 这一行、界面语、取词函数与懒翻表。
 * @returns 展示行。
 */
export function pickRowOf(x: PickRowIn): ListRow {
  const it = x.item
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
    company: it.company,
    companyZh: coAliasFor({ own: it.companyZh, name: it.company, cos: x.cos, want: LANG_ZH, lang: x.lang }),
    companyKo: coAliasFor({ own: it.companyKo, name: it.company, cos: x.cos, want: LANG_KO, lang: x.lang }),
    companySlug: it.companySlug,
    addressHref: placeHrefOf(it.address),
    addressSub: placeSubOf({ cityZh: it.cityZh, cityKo: it.cityKo, province: it.province, lang: x.lang, t: x.t }),
    place: pd.place,
    due: pd.due,
    salary: it.salary,
    wage: wageViewOf({ hourly: it.wageMedHourly, pct: it.abovePct }),
    hoursEn: TEXT_NONE,
    termEn: TEXT_NONE,
    posted: ymdOf(it.datePosted),
    deadline: ymdOf(it.validThrough),
    savedOn: TEXT_NONE,
    appliedOn: TEXT_NONE,
    address: TEXT_NONE,
    resume: null,
    cover: null,
    tags: [],
    cardTags: [],
    act: { key: ACT_APPLY, text: x.t('mj.apply'), kind: PRIMARY_KIND, onClick: makeOpenApply(it.id), href: TEXT_NONE },
    menu: [],
    more: x.t('mj.more'),
  }
}

/**
 * 网页端「今日推荐」的列(2026-11-07 效果图):职位 / 公司 / 地址 / 薪资 / 截止日期 / 通道 / 推荐原因 / 操作。
 * 2026-10-12 Frank「bullets 显示 全职 长期。这两个字段就没必要显示了吧」:推荐表不出工时 / 雇佣期两列;效果图连发布日期也不出。
 * 2026-11-07 Frank「现在都按 Azure 的来」:「地址」列(完整地址一行)改「地点」列(「市, 省码」+ 译名灰字,同一个地图链)。
 * 2026-11-09 Frank「推荐原因删掉」「这部分加进 table 吧」:推荐原因列撤,薪资后面加职位板的「中位时薪」「vs 中位」两列(列名用职位板同一份词条;同日「这个地方都显示 时薪吧」,中位不出年薪)。
 * 2026-11-11 任务书第 47 条:补回「发布日期」列(截止日期前面)。
 * 同日 Frank 看着满列「Accelerated Tech Pathway」说「删掉」:通道列撤(连同通道两行名的算法、格子与词条)。
 *
 * @param x 取词函数。
 * @returns 列。
 */
export function pickColsOf(x: ColsIn): MjCol<ListRow>[] {
  return [
    { key: COL_TITLE, label: x.t('mj.col.title'), render: TitleCell },
    { key: COL_COMPANY, label: x.t('mj.col.company'), render: CompanyCell },
    { key: COL_PLACE, label: x.t('mj.col.place'), render: PlaceCell },
    { key: COL_PAY, label: x.t('mj.col.pay'), render: PayCell, nowrap: true },
    { key: COL_MED, label: x.t('col.wageMedHr'), render: MedCell, nowrap: true },
    { key: COL_VS, label: x.t('col.vsMedian'), render: VsCell, nowrap: true },
    { key: COL_POSTED, label: x.t('mj.col.posted'), render: postedOf, nowrap: true },
    { key: COL_DEADLINE, label: x.t('mj.col.deadline'), render: deadlineOf, nowrap: true },
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
 * 2026-11-11 Frank「我的投递 地点改成地址,然后要包含我投递出去的简历 和 介绍信 列,用户可以随时查看」:
 * 共用列里的「地点」在这张表换成「地址」(完整地址一行);操作前面加「简历」「求职信」两列,各一颗「查看」。
 *
 * @param x 取词函数。
 * @returns 列。
 */
export function appliedColsOf(x: ColsIn): MjCol<ListRow>[] {
  const cols: MjCol<ListRow>[] = []
  for (const c of baseColsOf(x)) {
    if (c.key === COL_PLACE) {
      cols.push({ key: COL_ADDR, label: x.t('mj.col.addr'), render: AddrCell })
    } else {
      cols.push(c)
    }
  }
  return cols.concat([
    { key: COL_STATUS, label: x.t('mj.col.status'), render: TagsCell },
    { key: COL_APPLIED_ON, label: x.t('mj.col.appliedOn'), render: appliedOnOf, nowrap: true },
    { key: COL_RESUME, label: x.t('mj.col.resume'), render: ResumeCell, nowrap: true },
    { key: COL_COVER, label: x.t('mj.col.cover'), render: CoverCell, nowrap: true },
    { key: COL_ACT, label: x.t('mj.col.act'), render: ActCell, nowrap: true },
  ])
}

/**
 * 我的收藏 / 我的投递共用的前八列(照职位板)。
 * 2026-11-07 Frank「现在都按 Azure 的来」:「地址」列同今日推荐改「地点」列(「市, 省码」)。
 *
 * @param x 取词函数。
 * @returns 列。
 */
export function baseColsOf(x: ColsIn): MjCol<ListRow>[] {
  return [
    { key: COL_TITLE, label: x.t('mj.col.title'), render: TitleCell },
    { key: COL_COMPANY, label: x.t('mj.col.company'), render: CompanyCell },
    { key: COL_PLACE, label: x.t('mj.col.place'), render: PlaceCell },
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
 * 同日 Frank「现在都按 Azure 的来」:网页端三张表的「地点」列也出这一段「市, 省码」。
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
  const workNocs: string[] = []
  for (const n of v.works) {
    workNocs.push(n.code)
  }
  return {
    workNocs,
    matchBy: v.matchBy,
    matchMode: v.matchMode,
    fromResume: v.fromResume,
    goal: v.goal,
majors,
nocs,
prov: v.prov,
abroad: v.abroad,
city: v.city.en,
name: v.name,
who: v.who,
edu: v.edu,
  }
}

/**
 * 「补全档案」那条提示的字(2026-11-07 Frank「按 Azure 的改」:代替进页自动弹五题):档案还空着的几样,点名前两样,
 * 多于两样再说一共几项;一样都不空(或档案没取回来)不出。判空与原先弹题同一把尺:gate 桶 missingStepsOf。
 *
 * @param x 档案与取词。
 * @returns 提示字;不出为 null。
 */
export function fillTextOf(x: FillTextIn): string | null {
  if (x.view == null) {
    return null
  }
  const steps = missingStepsOf(profileSeedOf(x.view))
  if (steps.length === 0) {
    return null
  }
  const names: string[] = []
  for (const st of steps.slice(0, FILL_NAME_MAX)) {
    names.push(x.t(fillLabelKeyOf(st)))
  }
  const fields = names.join(x.t(FILL_SEP_KEY))
  if (steps.length > FILL_NAME_MAX) {
    return x.t(FILL_MORE_KEY, { fields, n: steps.length })
  }
  return x.t(FILL_KEY, { fields })
}

/**
 * 档案里空着的那一样 → 它在档案页上的名字的词条(与「我的档案」左列同一组词)。
 *
 * @param step gate 桶的题键。
 * @returns 词条键。
 */
export function fillLabelKeyOf(step: string): string {
  for (const row of FILL_LABEL_KEYS) {
    if (row.step === step) {
      return row.key
    }
  }
  return FILL_LABEL_FALLBACK
}

/**
 * 「这一页不再出」的手柄(提示条上的 ✕)。
 *
 * @param x 落格。
 * @returns 无参手柄。
 */
export function makeFillHide(x: FillHideIn): () => void {
  return function hide(): void {
    x.setHidden(true)
  }
}

/**
 * 行末「⋯」菜单(2026-11-07 Frank「先做 5 条必备」:三张表加回删除;10-12 Frank「所有的操作列都应该有个删除按钮」
 * 「所有删除按钮不要直接删,先弹框确认是否删除」;11-07 效果图一行只留一颗主钮,删除收进「⋯」,
 * docs/design/我的/我的求职-20261009.md 2.11):只有「删除」一项,点了先开确认框。
 *
 * @param x 取词函数、确认与删除手柄、这一条的 id 与名字。
 * @returns 菜单各项。
 */
export function delMenuOf(x: DelMenuIn): RowMenuItem[] {
  return [{ key: ACT_DEL, text: x.t('mj.del'), danger: true, onClick: makeAskDel(x) }]
}

/**
 * 造「删除」菜单项的手柄:开确认框,确认了才删。
 *
 * @param x 同 delMenuOf。
 * @returns 点击手柄。
 */
export function makeAskDel(x: DelMenuIn): () => void {
  return function askDel(): void {
    x.ask({ name: x.name, run: makeRemoveOne(x) })
  }
}

/**
 * 造「真删这一条」:确认框点「删除」时调。
 *
 * @param x 同 delMenuOf。
 * @returns 手柄。
 */
export function makeRemoveOne(x: DelMenuIn): () => void {
  return function removeOne(): void {
    x.remove(x.id)
  }
}

/**
 * 造「删掉我的收藏 / 我的投递里的一条」(10-12 旧桶 makeRemove 的同一做法):先从表里拿掉,再发删除;
 * 服务端没删成(网络、非 2xx)把原清单放回去 —— 用户看得见这一行又回来了,不会以为删掉了。
 *
 * @param x 删除接口前缀、当前清单与落格。
 * @returns 删一条的手柄(参数:行 id)。
 */
export function makeRemoveMine(x: RemoveMineIn): RemoveFn {
  return function removeMine(id: number): void {
    const before = x.items
    if (before == null) {
      return
    }
    const rest: MyJobItem[] = []
    for (const it of before) {
      if (it.id !== id) {
        rest.push(it)
      }
    }
    x.setItems(rest)
    const restore = makeRestoreMine({ urlHead: x.urlHead, items: before, setItems: x.setItems })
    void sendDelete({ url: x.urlHead + id, restore })
  }
}

/**
 * 造「把原清单放回去」。
 *
 * @param x 删之前的清单与落格。
 * @returns 手柄。
 */
export function makeRestoreMine(x: RemoveMineIn): () => void {
  return function restoreMine(): void {
    x.setItems(x.items)
  }
}

/**
 * 发删除请求;没删成(网络断、非 2xx)调 restore。
 *
 * @param x 地址与放回手柄。
 * @returns 无。
 */
export async function sendDelete(x: SendDeleteIn): Promise<void> {
  try {
    const r = await fetch(x.url, { method: METHOD_DELETE, credentials: CRED_INCLUDE })
    if (r.ok === false) {
      x.restore()
    }
  } catch {
    x.restore()
  }
}

/**
 * 造删除确认框「删除」钮:真删再关框(10-12 旧桶同名件照抄)。
 *
 * @param x 等着确认的那一次与拨框手柄。
 * @returns 点击手柄。
 */
export function makeAskOk(x: AskOkIn): () => void {
  return function askOk(): void {
    if (x.ask != null) {
      x.ask.run()
    }
    x.setAsk(null)
  }
}

/**
 * 造删除确认框「取消」:关框。
 *
 * @param setAsk 拨框手柄。
 * @returns 点击手柄。
 */
export function makeAskClose(setAsk: AskSetFn): () => void {
  return function askClose(): void {
    setAsk(null)
  }
}

/**
 * 造「关查看附件弹框」。
 *
 * @param setFile 改「开着的那份附件」。
 * @returns 点击手柄。
 */
export function makeFileClose(setFile: FileSetFn): () => void {
  return function closeFile(): void {
    setFile(null)
  }
}

/**
 * 我的收藏清单给展示行递的空手柄:收藏行没有附件,「查看」钮不出,这只手柄不会被点到。
 *
 * @param _file 要看的那一份(不用)。
 * @returns 无。
 */
export function skipFile(_file: FileView): void {
  return
}

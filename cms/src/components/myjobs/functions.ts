/**
 * 「我的」页两张岗位清单(myjobs 组件桶)的函数:拉清单、取消收藏、洗展示行、阶段胶囊、按阶段筛。
 * 2026-10-08 进度板:列构造段撤(表换横卡),展示行多了首字母块、日期一行、状态胶囊档。
 * 2026-10-09 N6 批:职位名 / 公司名 / 城市 / 省份换 name 桶现成件,点名字开弹框的手柄与城市拼一格撤,展示行改交原值。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { openApply } from '@/components/apply'
import { cssOf } from '@/components/css'
import { ymd } from '@/lib/time'
import {
  AVATAR_CLS_HEAD, AVATAR_COLORS, AVATAR_NONE, CLS_SEP, CRED_INCLUDE, FILE_COVER_TAIL, FILE_RESUME_TAIL, JOB_HREF_HEAD,
  KEY_APPLIED_ON, KEY_EDITED_ON, KEY_POSTED_ON, KIND_APPLIED, KIND_SAVED, METHOD_DELETE, STAGES,
  STAGE_ALL, STAGE_FILTERS, ST_DRAFT, ST_QUEUED, TAG_NONE, TEXT_NONE, URL_APPLY_HEAD, URL_FILE_HEAD, URL_QUEUED_HEAD,
  URL_SAVED_JOB_HEAD,
} from './constants'
import type {
  AvaClsIn, ByStageIn, CellRowIn, CellRowsIn, DateLineIn, FileHrefIn, LoadMyJobsIn, MaybeStageDef, MyJobCellRow,
  MyJobItem, MyJobsRespJson, PickIn, PillClickIn,
  StagePill, StagePillsIn, StatusTag, UnsaveIn,
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
 * 投递状态胶囊的字(只读;只收藏没投给空串)。
 *
 * @param x 这一行与取词函数。
 * @returns 字样。
 */
export function statusTextOf(x: CellRowIn): string {
  const def = stageDefOf(x.item.stage)
  if (def == null) {
    return TEXT_NONE
  }
  return x.t(def.labelKey)
}

/**
 * 投递状态胶囊的档(tag 桶;没投给空串)。
 *
 * @param x 这一行。
 * @returns 档。
 */
export function statusTagOf(x: CellRowIn): StatusTag {
  const def = stageDefOf(x.item.stage)
  if (def == null || x.filter !== STAGE_ALL) {
    return TAG_NONE
  }
  return def.tag
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
 * 日期一行:我的求职发出去的写「投递于」,草稿 / 待投写「最近改于」;我的收藏写「发布于」;没日期给空串。
 *
 * @param x 哪张清单、这一行与取词函数。
 * @returns 一行字。
 */
export function dateTextOf(x: CellRowIn): string {
  if (x.kind === KIND_SAVED) {
    return dateLineOf({ x, key: KEY_POSTED_ON, iso: x.item.datePosted })
  }
  if (x.item.stage === ST_DRAFT || x.item.stage === ST_QUEUED) {
    return dateLineOf({ x, key: KEY_EDITED_ON, iso: x.item.updatedAt })
  }
  return dateLineOf({ x, key: KEY_APPLIED_ON, iso: x.item.updatedAt })
}

/**
 * 词条 + 年-月-日(没日期给空串)。
 *
 * @param y 造行入参、词条键与 ISO 时刻。
 * @returns 一行字。
 */
function dateLineOf(y: DateLineIn): string {
  if (y.iso === TEXT_NONE) {
    return TEXT_NONE
  }
  return y.x.t(y.key, { d: ymd(y.iso) })
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
 * 「取消收藏」的字(我的求职那张清单给空串)。
 *
 * @param x 哪张清单与取词函数。
 * @returns 字。
 */
export function unsaveTextOf(x: CellRowIn): string {
  if (x.kind === KIND_APPLIED) {
    return TEXT_NONE
  }
  return x.t('mj.unsave')
}

/**
 * 公司首字母(大写;没公司名给问号)。
 *
 * @param company 公司名。
 * @returns 一个字。
 */
export function avatarOf(company: string): string {
  if (company === TEXT_NONE) {
    return AVATAR_NONE
  }
  return company.slice(0, 1).toUpperCase()
}

/**
 * 首字母块的配色类名:公司名字符和对档数取模,同一家永远同一色。
 *
 * @param company 公司名。
 * @returns 类名(c0 ~ c6)。
 */
export function avatarClsOf(company: string): string {
  let sum = 0
  for (const ch of company) {
    sum += ch.charCodeAt(0)
  }
  return AVATAR_CLS_HEAD + String(sum % AVATAR_COLORS)
}

/**
 * 一行展示行。
 *
 * @param x 哪张清单、这一行、整张清单、取词函数与落格。
 * @returns 展示行。
 */
export function cellRowOf(x: CellRowIn): MyJobCellRow {
  return {
    key: String(x.item.id),
    stage: x.item.stage,
    avatar: avatarOf(x.item.company),
    avatarCls: avatarClsOf(x.item.company),
    jobId: x.item.jobId,
    href: jobHrefOf(x.item.jobId),
    title: x.item.title,
    company: x.item.company,
    companySlug: x.item.companySlug,
    city: x.item.city,
    cityZh: x.item.cityZh,
    cityKo: x.item.cityKo,
    province: x.item.province,
    salary: salaryOf(x),
    dateText: dateTextOf(x),
    statusText: statusTextOf(x),
    statusTag: statusTagOf(x),
    closed: x.item.closed,
    closedText: closedTextOf(x),
    openText: x.t('mj.open'),
    unsaveText: unsaveTextOf(x),
    onUnsave: unsaveOf(x),
    resumeHref: fileHrefOf({ x, tail: FILE_RESUME_TAIL }),
    coverHref: fileHrefOf({ x, tail: FILE_COVER_TAIL }),
    resumeText: x.t('mj.col.resume'),
    coverText: x.t('mj.col.cover'),
    continueHref: continueHrefOf(x),
    onContinue: makeContinue(x),
    continueText: x.t('mj.cont'),
    applyHref: applyHrefOf(x),
    onApply: makeApplyOpen(x),
    applyText: x.t('mj.apply'),
  }
}

/**
 * 薪资(只收藏那张清单出;我的求职不出 —— 投了的人关心的是进度)。
 *
 * @param x 哪张清单与这一行。
 * @returns 薪资或空串。
 */
export function salaryOf(x: CellRowIn): string {
  if (x.kind !== KIND_SAVED) {
    return TEXT_NONE
  }
  return x.item.salary
}

/**
 * 附件地址:我的求职那张清单发出去了的行(行 id = 投递行 id)给 /api/apply/file 的地址;草稿、待投与我的收藏给空串。
 *
 * @param y 这一行与种类尾。
 * @returns 地址或空串。
 */
function fileHrefOf(y: FileHrefIn): string {
  if (y.x.kind !== KIND_APPLIED || y.x.item.stage === ST_DRAFT || y.x.item.stage === ST_QUEUED) {
    return TEXT_NONE
  }
  return URL_FILE_HEAD + y.x.item.id + y.tail
}

/**
 * 草稿 / 待投「继续」的去处:我的求职那张清单、职位还在,去投递区接着写 / 发(2026-10-08)。
 *
 * @param x 哪张清单与这一行。
 * @returns 投递区地址;其余给空串。
 */
export function continueHrefOf(x: CellRowIn): string {
  if (x.kind !== KIND_APPLIED || x.item.jobId == null) {
    return TEXT_NONE
  }
  if (x.item.stage === ST_QUEUED) {
    return URL_QUEUED_HEAD + x.item.jobId
  }
  if (x.item.stage !== ST_DRAFT) {
    return TEXT_NONE
  }
  return URL_APPLY_HEAD + x.item.jobId
}

/**
 * 造「点继续」:整页跳到投递区(同页软跳转只改地址栏、不装投递流程,2026-10-08 实撞;空地址不动)。
 * 2026-10-09 A 批投递搬进弹框:草稿行就地弹投递框(不再整页跳);待投行照旧整页跳到「今日待投」卡那一张。
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
    if (x.item.stage === ST_DRAFT) {
      openApply(x.item.jobId)
      return
    }
    window.location.assign(href)
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
 * 整张清单的展示行。
 *
 * @param x 哪张清单、清单、取词函数与落格。
 * @returns 展示行。
 */
export function myJobCellRowsOf(x: CellRowsIn): MyJobCellRow[] {
  const out: MyJobCellRow[] = []
  for (const item of x.items) {
    out.push(cellRowOf({
      kind: x.kind,
      filter: x.filter,
      item,
      items: x.items,
      t: x.t,
      setItems: x.setItems,
    }))
  }
  return out
}

/**
 * 按阶段筛清单(all = 原样)。
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
 * 我的求职顶上那排阶段胶囊(每档带计数;当前档选中)。
 *
 * @param x 清单、当前档与取词函数。
 * @returns 胶囊。
 */
export function stagePillsOf(x: StagePillsIn): StagePill[] {
  const out: StagePill[] = []
  for (const f of STAGE_FILTERS) {
    out.push({
      key: f.key,
      label: x.t(f.labelKey),
      count: byStageOf({ items: x.items, stage: f.key }).length,
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
 * 首字母块的 className:底座 + 配色类。
 *
 * @param x 配色类名。
 * @returns className。
 */
export function avaClsOf(x: AvaClsIn): string {
  return cssOf(css.ava) + CLS_SEP + cssOf(css[x.cls])
}

/**
 * 行身份。
 *
 * @param r 展示行。
 * @returns 收藏记录 / 投递行 id。
 */
export function rowKeyOf(r: MyJobCellRow): string {
  return r.key
}

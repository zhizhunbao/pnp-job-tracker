/**
 * pnp 域从组件体里迁出来的函数:抽选与公告的洗行、PNP 命中与判定话术、EE 类别的分组与
 * 展示取舍、联邦轮次的分桶、依据链的行构造、AIP 归一与直判,以及类名预算与手柄工厂。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」;要 t/lang 才算得出的显示值一律
 * **在洗行时算好挂到展示行上**,单元格组件退成哑组件(样张 employers 的列构造段)。
 * 依赖方向:本文件 → 通用组件域与 lib 域(单向;各展示件只认 constants/types/css,不回引本文件
 * —— 否则 import/no-cycle 当场红)。
 * 红线在这个域里落地 —— **粗筛信号,不是资格认定**:命中与否都只陈列官方事实与出处,
 * 各省自己的职业清单/语言/工资要求不在这里判,更不替用户下结论。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { cssOf } from '@/components/css'
import { eeDisplay, eeKeyDisplay, match as matchJob, streamDisplay } from '@/lib/jobs'
import { PROV_NAMES } from '@/lib/location'
import { nocLocalTitle } from '@/lib/noc'
import { DAY_MS } from '@/lib/time'
import { track } from '@/lib/track'
import {
  AIP_ALIAS_RE, AIP_DROP_RE, AIP_MISS, AIP_NA, AIP_ON, AIP_SUFFIX_RE, ATLANTIC_PROVS, CARET_CLOSED, CARET_OPEN,
  CAT_JOIN, CLS_SEP, COLOR_CAT, COLOR_FED_OTHER, COND_PROVS, DASH, DAY_START_SUFFIX, EE_DORMANT_MONTHS,
  EV_EMPLOYER_CLICK, EV_TV_ENTRY, FED_CAT_KEY, FED_MAX, FED_PROGRAM, FED_SHOW, FED_TYPE_COLOR,
  HIST_EXPANDABLE_MIN, KEY_EE_ABOVE, KEY_EE_NOCRS, KEY_EE_NODRAW, KEY_EE_NONE, KEY_LMIA_LOWONLY, KEY_LMIA_NA,
  KEY_NOC_EXACT, KEY_NOC_MINOR, KEY_NOC_NOPROFILE, KEY_NOC_UNCAT, KEY_PROV_EXCLUDED, KEY_PROV_GENERIC,
  KEY_PROV_NAMED, KEY_PROV_NOTTARGET, KEY_PROV_QC, KEY_PROV_UNCOVERED, KEY_SEP, KEY_TEER_CHANNEL, KEY_TEER_OK,
  KEY_WAGE_ABOVE, KEY_WAGE_BELOW, KEY_WAGE_NEAR, KIND_DRAW, KIND_NOTICE, LANG_ZH, MATCH_LEVEL_HEAD, MONTH_DAYS,
  NEWS_LATEST_MAX, NOC_HEAD, PROGRAM_AIP, PROGRAM_PNP, PROV_FED, PROV_KEY_HEAD, PROV_NL, PROV_QC, ROWS_FALLBACK,
  RULE_EE, RULE_LMIA, RULE_NOC, RULE_PROV, RULE_TEER, RULE_WAGE, SALARY_DIV, SALARY_HEAD, SALARY_TAIL,
  SCROLL_BLOCK, SPACE, SPACE_RUN_RE, SRC_PNP, STREAM_REFORM, TEER_HEAD, TEER_SHORT_HEAD, TEER_SKILLED_MAX,
  TEXT_NONE, TIP_MARK, TONE_FAIL, TONE_NA, TONE_OK, TONE_PASS, TONE_WARN, TV_KIND_PNP, TYPE_INELIGIBLE,
  UNKNOWN_MARK, URL_JOBS_Q_HEAD, URL_NEWS_HEAD, URL_PLAN_PR_HEAD,
} from './constants'
import type {
  AipVerdict, BoxClsIn, CatNameClsIn, CatToggleIn, ClickFn, DimClsIn, DrawLineClsIn, DrawNoticeTextIn, DrawRowIn,
  DrawRowSpec, DrawRowsIn, DrawsClsIn, DrawsTitleIn, EeAllLabelIn, EeDrawDateRow, EeDrawLineIn,
  EeDrawsCatsIn, EeGroupIn,
  EeHistIn, EeHitIn, EeShownIn, EeVerdictClsIn, EeVerdictTextIn, FedBucket, FedBucketsIn, FedLabelIn,
  FedMoreLabelIn, FedRowSpec, FedRowsIn, FedRoundsIn, FlagToggleIn, FoldLabelIn, HasProvDrawsIn, HasProvNewsIn,
  HiddenCountIn, HistMap, HistRowSpec, HistRowsIn, HitClsIn, HitRefFn, HitRefIn, LevelClsIn, LevelTextIn,
  LocalTitleIn, MatchResultIn, MmCellSpec, MmNocCellIn, MmNocListCellIn, MmProvCellIn, MmProvListCellIn,
  MmRowOfIn, MmRowSpec, MmRowsIn, MmRuleIn, MmSalaryTextIn, MmTeerCellIn, MmTone, NewsRowSpec, NewsRowsIn,
  NocRowMap, OccRowSpec, OccRowsIn, PnpDraw, PnpEeCat, PnpJob, PnpMatchIn, PnpMatchJob, PnpMatchOut,
  PnpMatchResult, PnpNocDesc, PnpOcc, PnpReform, PnpStream, PnpTone, PnpVerdictIn, PnpVerdictSpec, ProvLabelIn,
  ReasonParams, ReformOfIn, ScrollIntoHitIn, ShownStreamsIn, SponsorLinesIn, SponsorShowIn, StreamRowSpec,
  StreamRowsIn, TagClsIn, ToggleOfFn, ToggleSetIn, TrackClickIn, TvOpenIn,
} from './types'
import css from './pnp.module.css'

/**
 * 本省的通道改制登记(登记表在 constants,判定与展示都走这一处)。
 *
 * @param x 省码。
 * @returns 改制登记;没改制的省给 null。
 */
export function reformOf(x: ReformOfIn): PnpReform | null {
  const r = STREAM_REFORM[x.province]
  if (r == null) {
    return null
  }
  return r
}

/**
 * 本省要列出来的抽选行。三道筛,一道一条口径:
 * ① 只留本省的;
 * ② 脏行过滤 —— 流名/分数/邀请数全空的行没有任何信息量(ON 2026-07-20 实测就是这种),不占位;
 * ③ 改制省 —— 改制日之前的抽选属已关闭通道,不再列出(通告行不受影响,它讲的就是改制本身)。
 * 最后按 limit 截断(C2 走查:省弹窗只留最近 1 条摘要,全量归 PNP 弹窗,消跨弹窗重复)。
 *
 * @param x 省码、全部抽选行、改制登记与条数上限。
 * @returns 要列出来的抽选行。
 */
export function drawRowsOf(x: DrawRowsIn): PnpDraw[] {
  const rows: PnpDraw[] = []
  for (const d of x.draws) {
    if (d.province !== x.province) {
      continue
    }
    const notice = isNoticeRow(d)
    if (notice === false && d.stream === TEXT_NONE && d.score == null && d.invitations == null) {
      continue
    }
    if (x.reform != null && notice === false && d.drawDate < x.reform.since) {
      continue
    }
    if (x.limit != null && rows.length >= x.limit) {
      break
    }
    rows.push(d)
  }
  return rows
}

/**
 * 打头的那一行抽选(卡标题要拿它的通道名)。
 *
 * @param rows 要列出来的抽选行。
 * @returns 第一行;一行都没有时给 null。
 */
export function firstDrawOf(rows: PnpDraw[]): PnpDraw | null {
  const first = rows[0]
  if (first == null) {
    return null
  }
  return first
}

/**
 * 这一行是不是通告(如 ON 2026-06 改制):通告跨全部列渲染,不是抽选。
 *
 * @param d 一行。
 * @returns 是通告吗。
 */
export function isNoticeRow(d: PnpDraw): boolean {
  return d.kind === KIND_NOTICE
}

/**
 * 抽选卡的标题(Frank 走查#9:卡要正式 title,原先是小灰头)。改制省讲的是现行规则,
 * 标题随之换成「现行规则」那句。
 *
 * @param x 取词函数、改制登记与打头那一行。
 * @returns 卡标题。
 */
export function drawsTitleOf(x: DrawsTitleIn): string {
  if (x.reform != null) {
    return x.t('pnpdraws.nowTitle')
  }
  let label = TEXT_NONE
  if (x.first != null) {
    label = x.first.label
  }
  return x.t('pnpdraws.title', { label })
}

/**
 * 洗一行抽选:压暗档、中文灰注、悬停提示与两个数值格的话术都在这里算完。
 * #280:zh 态英文流名 + 中文灰注(次行);streamZh 缺列/还没翻到 = 不出注,纯英文,不是报错。
 *
 * @param x 取词函数、界面语言、这一行、序号与改制登记。
 * @returns 展示行。
 */
export function toDrawRow(x: DrawRowIn): DrawRowSpec {
  const dim = x.reform != null && x.draw.drawDate < x.reform.since
  let streamZh = TEXT_NONE
  if (x.lang === LANG_ZH) {
    streamZh = x.draw.streamZh
  }
  let title = x.draw.stream
  if (x.draw.note !== TEXT_NONE) {
    title = x.draw.note
  }
  let score = TEXT_NONE
  if (x.draw.score != null) {
    score = x.t('pnpdraws.min', { score: x.draw.score })
  }
  let inv = TEXT_NONE
  if (x.draw.invitations != null) {
    inv = x.t('pnpdraws.inv', { n: x.draw.invitations })
  }
  return {
    key: String(x.index),
    date: x.draw.drawDate,
    dateCls: dateClsOf({ dim }),
    streamCls: streamClsOf({ dim }),
    stream: x.draw.stream,
    streamZh,
    title,
    score,
    inv,
  }
}

/**
 * 通告行的全文。#153:直接渲染抓到的官方通告原文(note),缺 note 才退回旧模板。
 *
 * @param x 取词函数与这一行通告。
 * @returns 通告全文。
 */
export function drawNoticeTextOf(x: DrawNoticeTextIn): string {
  if (x.draw.note !== TEXT_NONE) {
    return `${x.draw.drawDate} ${x.draw.note}`
  }
  return x.t('pnpdraws.notice', { date: x.draw.drawDate })
}

/**
 * 本省最新公告(E12-06):最新 1-2 条官方新闻,链 /news/[slug]。
 * 只摆标题+日期(事实),不解读 —— 详情页自带四件套与原文链。
 *
 * @param x 省码与全部动态。
 * @returns 展示行;本省没有动态时给空列(整块不出)。
 */
export function newsRowsOf(x: NewsRowsIn): NewsRowSpec[] {
  const rows: NewsRowSpec[] = []
  for (const n of x.news) {
    if (n.region !== x.province) {
      continue
    }
    if (rows.length >= NEWS_LATEST_MAX) {
      break
    }
    rows.push({ key: n.slug, date: n.date, href: URL_NEWS_HEAD + n.slug, title: n.title })
  }
  return rows
}

/**
 * 担保引流卡出不出。凭证行(AIP 指定/LMIA 获批)有据才出,无凭证整卡不出也不写「无」;
 * 「看该职业的全部担保雇主」链随货架页下架摘除(Frank 08-08)→ company 态无内容可渲,整卡不出。
 *
 * @param x 本岗与来源。
 * @returns 出不出这张卡。
 */
export function sponsorShows(x: SponsorShowIn): boolean {
  if (x.src !== SRC_PNP) {
    return false
  }
  return x.job.aip || lmiaCountOf(x.job) > 0
}

/**
 * 雇主近两年 LMIA 获批数。
 *
 * @param job 本岗。
 * @returns 获批数;库里没记的按 0 算(0 与「没记」在这张卡上都是「不出这一行」)。
 */
export function lmiaCountOf(job: PnpJob): number {
  if (job.lmiaPositions == null) {
    return 0
  }
  return job.lmiaPositions
}

/**
 * 担保引流卡的凭证行:AIP 指定与 LMIA 获批各一条,有据才出。
 *
 * @param x 取词函数与本岗。
 * @returns 凭证行的话术。
 */
export function sponsorLinesOf(x: SponsorLinesIn): string[] {
  const lines: string[] = []
  if (x.job.aip) {
    lines.push(x.t('spl.aip'))
  }
  const n = lmiaCountOf(x.job)
  if (n === 1) {
    lines.push(x.t('spl.lmia1'))
  } else if (n > 0) {
    lines.push(x.t('spl.lmia', { n }))
  }
  return lines
}

/**
 * 「看这家公司的岗」的去处:职位板按公司名搜。
 *
 * @param job 本岗。
 * @returns 职位板地址。
 */
export function sponsorHrefOf(job: PnpJob): string {
  return URL_JOBS_Q_HEAD + encodeURIComponent(job.company)
}

/**
 * 雇主线点击的手柄(只上报一条埋点,跳转交给链接本身)。
 *
 * @param x 埋点的 kind 值。
 * @returns 点击手柄。
 */
export function makeTrackClick(x: TrackClickIn): ClickFn {
  return function onTrack(): void {
    track(x.event, { kind: x.kind })
  }
}

/**
 * 担保引流卡那条链接的点击手柄。
 *
 * @param kind 埋点的 kind 值(从哪张卡点的)。
 * @returns 点击手柄。
 */
export function makeSponsorClick(kind: string): ClickFn {
  return makeTrackClick({ event: EV_EMPLOYER_CLICK, kind })
}

/**
 * 判定卡入口的点击手柄(#287 批D,设计 §5「modal-pnp 判定卡后」;效果图 se287-entry-pnp-modal):
 * 埋点后整页跳决策页。
 *
 * @param x 本岗主键。
 * @returns 点击手柄。
 */
export function makeTvOpen(x: TvOpenIn): ClickFn {
  return function onOpen(): void {
    track(EV_TV_ENTRY, { kind: TV_KIND_PNP })
    window.location.assign(URL_PLAN_PR_HEAD + String(x.id))
  }
}

/**
 * PNP 命中计算(清单块与通道直判块两处共用;纯函数,改一处两边同变)。
 * AIP 清单不参与省提名判定(那是另一条路,见 aipBlockOf);魁省与缺省码的岗没有通道可比。
 *
 * @param x 本岗与扁平清单。
 * @returns 本省通道、命中与排除。
 */
export function pnpMatchOf(x: PnpMatchIn): PnpMatchOut {
  const streams: PnpStream[] = []
  if (x.job.province !== PROV_QC && x.job.province !== TEXT_NONE) {
    const byLabel = new Map<string, PnpStream>()
    for (const r of x.occ) {
      if (r.province !== x.job.province || programOf(r) !== PROGRAM_PNP) {
        continue
      }
      let s = byLabel.get(r.label)
      if (s == null) {
        s = { stream: r.stream, label: r.label, type: r.type, url: r.url, fetched: r.fetched, occupations: [] }
        byLabel.set(r.label, s)
      }
      s.occupations.push({ noc: r.noc, name: r.name, gtaRestricted: r.gtaRestricted })
    }
    streams.push(...byLabel.values())
  }
  let matched: PnpStream | null = null
  let excludedBy: PnpStream | null = null
  let hasInclusion = false
  for (const s of streams) {
    if (s.type === TYPE_INELIGIBLE) {
      if (hasNocOf(s, x.job.noc)) {
        excludedBy = s
      }
    } else {
      hasInclusion = true
      if (hasNocOf(s, x.job.noc)) {
        matched = s
      }
    }
  }
  return { streams, matched, excluded: excludedBy != null, excludedBy, hasInclusion }
}

/**
 * 清单行的项目归属(数据层空档在映射时落 PNP)。
 *
 * @param r 一条清单行。
 * @returns 项目名。
 */
export function programOf(r: PnpOcc): string {
  if (r.program === TEXT_NONE) {
    return PROGRAM_PNP
  }
  return r.program
}

/**
 * 这张清单点没点名某个职业。
 *
 * @param s 一张清单。
 * @param noc 职业码。
 * @returns 点名了吗。
 */
// eslint-disable-next-line local/one-parameter -- 谓词跟着被判定的那张清单走,职业码是它的比较对象
export function hasNocOf(s: PnpStream, noc: string): boolean {
  for (const o of s.occupations) {
    if (o.noc === noc) {
      return true
    }
  }
  return false
}

/**
 * 判定行(Frank 2026-07-26「有些岗显示可提名 但是点进去却显示走不了」)。
 * 根因=两套判定 —— 列表用服务端 pnp_eligible(08_score:排除式省 ON/AB 的 TEER 0-5 默认可),
 * 弹框却自己写死 teer<=3。实测 ON 3,254 / AB 1,328 / SK 106 个岗两边打架。
 * 修:**服务端 pnpEligible 是单一真相**,清单只负责解释「凭什么」,弹框不再自行判定能不能走。
 * Frank「qc 没有对应的通道 也没有历史」:QC 不参加 PNP 是制度事实,不是缺数 —— 把它走的是什么说清。
 *
 * @param x 取词函数、本岗与命中结论。
 * @returns 判定卡的色档、话术与两条「凭什么」。
 */
export function pnpVerdictOf(x: PnpVerdictIn): PnpVerdictSpec {
  if (x.job.province === PROV_QC) {
    return { tone: TONE_NA, text: x.t('ch.pnp.qc'), why: TEXT_NONE, qcWhy: x.t('ch.pnp.qcWhy') }
  }
  if (x.match.excludedBy != null) {
    const label = streamDisplay({ t: x.t, label: x.match.excludedBy.label })
    return { tone: TONE_FAIL, text: x.t('ch.pnp.exl', { label }), why: TEXT_NONE, qcWhy: TEXT_NONE }
  }
  if (x.match.matched != null) {
    const label = streamDisplay({ t: x.t, label: x.match.matched.label })
    return { tone: TONE_OK, text: x.t('ch.pnp.on', { label }), why: TEXT_NONE, qcWhy: TEXT_NONE }
  }
  if (x.job.pnpEligible) {
    return { tone: TONE_OK, text: x.t('ch.pnp.generic'), why: genericWhyOf(x), qcWhy: TEXT_NONE }
  }
  return { tone: TONE_NA, text: x.t('ch.pnp.no'), why: TEXT_NONE, qcWhy: TEXT_NONE }
}

/**
 * 通用档的「凭什么」(Frank 同批「显示走通用 但是不知道具体走的是什么」:把「凭什么算通用」
 * 写出来,别让用户猜)。E13-09:TEER4-5 的「凭什么」分三类 —— 排除式省(不设清单)/
 * NL(offer 即可)/ MB·NS·NB·PE 普通通道(先同雇主 6 个月)。省集合镜像 etl/08_score.UNIVERSAL_*_PROVS。
 *
 * @param x 取词函数、本岗与命中结论。
 * @returns 这一档的说明句。
 */
export function genericWhyOf(x: PnpVerdictIn): string {
  const teer = teerTextOf(x.job.teer)
  if (x.job.teer != null && x.job.teer <= TEER_SKILLED_MAX) {
    return x.t('ch.pnp.whySkilled', { teer })
  }
  if (x.job.province === PROV_NL) {
    return x.t('ch.pnp.whyDirect')
  }
  const prov = provLabelOf({ t: x.t, code: x.job.province })
  if (COND_PROVS.includes(x.job.province)) {
    return x.t('ch.pnp.whyCond', { prov })
  }
  return x.t('ch.pnp.whyOpen', { prov, teer })
}

/**
 * 省名:字典里有就用人话名,没有原样显示省码 —— 字典缺词不该把省码吞掉。
 *
 * @param x 取词函数与省码。
 * @returns 省名或省码。
 */
export function provLabelOf(x: ProvLabelIn): string {
  const v = x.t(PROV_KEY_HEAD + x.code)
  if (v === TEXT_NONE) {
    return x.code
  }
  return v
}

/**
 * 技能层级拼进话术时的写法。
 *
 * @param teer 技能层级;null=未分类。
 * @returns 层级数;未分类给问号(不折 0 —— 那是替官方编数)。
 */
export function teerTextOf(teer: number | null): string | number {
  if (teer == null) {
    return UNKNOWN_MARK
  }
  return teer
}

/**
 * 数值格拼进话术时的写法(分数线、邀请数这类官方可空的数)。
 *
 * @param v 数值;null=官方未公布。
 * @returns 数值;未公布给空值符。
 */
export function numTextOf(v: number | null): string | number {
  if (v == null) {
    return DASH
  }
  return v
}

/**
 * 本省有没有抽选可列(魁省不出这张卡 —— 它不参加 PNP)。
 *
 * @param x 本岗与全部抽选行。
 * @returns 出不出抽选卡。
 */
export function hasProvDraws(x: HasProvDrawsIn): boolean {
  if (x.job.province === PROV_QC || x.job.province === TEXT_NONE) {
    return false
  }
  for (const d of x.draws) {
    if (d.province === x.job.province) {
      return true
    }
  }
  return false
}

/**
 * 本省有没有公告可列(E12-06;QC 也显 —— MIFI 部委新闻,资格口径由 /news 声明)。
 *
 * @param x 本岗与全部动态。
 * @returns 出不出公告卡。
 */
export function hasProvNews(x: HasProvNewsIn): boolean {
  if (x.job.province === TEXT_NONE) {
    return false
  }
  for (const n of x.news) {
    if (n.region === x.job.province) {
      return true
    }
  }
  return false
}

/**
 * 要展开哪几张清单。#125 → 2026-07-25 Frank 收紧「不覆盖就不用显示」:命中 → 只展示命中的清单;
 * 被排除 → 只展示排除清单;都没有 → 清单整体不渲(原全量铺浏览语境退役)——
 * 判定行已说清结论,不相干的清单只是噪音。
 * 一省可有多张排除表(NB:通用 14 个 NOC + 餐饮住宿 13 个)→ 只展示真正命中本岗的那张,
 * 否则会铺一张与本岗无关的清单(兜底行还会随便挑一条),同 #125③ 口径。
 *
 * @param x 命中结论与本岗职业码。
 * @returns 要展开的清单。
 */
export function shownStreamsOf(x: ShownStreamsIn): PnpStream[] {
  const out: PnpStream[] = []
  for (const s of x.match.streams) {
    if (s.occupations.length === 0) {
      continue
    }
    if (x.match.matched != null) {
      if (s === x.match.matched) {
        out.push(s)
      }
      continue
    }
    if (x.match.excluded && s.type === TYPE_INELIGIBLE && hasNocOf(s, x.noc)) {
      out.push(s)
    }
  }
  return out
}

/**
 * 一张清单的 React 列表键。
 *
 * @param s 一张清单。
 * @returns 列表键。
 */
export function streamKeyOf(s: PnpStream): string {
  return s.label + s.stream
}

/**
 * 洗一张清单要显示的职业行。Frank 走查#14:默认只显命中「本岗」项(其余折叠),
 * 点末尾「展开其他」才全量;命中置顶,其余保持原序;兜底:即便无命中也至少显 1 条。
 *
 * @param x 取词函数、界面语言、译名开关、这张清单、本岗职业码、职业名字典与展开态。
 * @returns 展示行。
 */
export function streamRowsOf(x: StreamRowsIn): StreamRowSpec[] {
  const hits = []
  const others = []
  for (const o of x.stream.occupations) {
    if (o.noc === x.noc) {
      hits.push(o)
    } else {
      others.push(o)
    }
  }
  let picked = hits
  if (x.open) {
    picked = hits.concat(others)
  }
  if (picked.length === 0) {
    picked = others.slice(0, ROWS_FALLBACK)
  }
  const rows: StreamRowSpec[] = []
  for (const o of picked) {
    const hit = o.noc === x.noc
    let yourTag = TEXT_NONE
    if (hit) {
      yourTag = x.t('pnplist.your')
    }
    let gtaTag = TEXT_NONE
    if (o.gtaRestricted) {
      gtaTag = x.t('pnplist.gta')
    }
    const zh = localTitleOf({ lang: x.lang, showZh: x.showZh, nocRows: x.nocRows, noc: o.noc, name: o.name })
    rows.push({ key: o.noc + o.name, hit, noc: o.noc, name: o.name, zh, yourTag, gtaTag })
  }
  return rows
}

/**
 * 折起来的条数(本岗之外的都算折起来的)。
 *
 * @param x 这张清单与本岗职业码。
 * @returns 折起来的条数。
 */
export function hiddenCountOf(x: HiddenCountIn): number {
  let n = 0
  for (const o of x.stream.occupations) {
    if (o.noc !== x.noc) {
      n += 1
    }
  }
  return n
}

/**
 * 清单末尾那行开关的文案(Frank 走查#14:清单头改纯 title 不再作折叠开关,开关移到列表末尾)。
 *
 * @param x 取词函数、展开态与折起来的条数。
 * @returns 开关文案。
 */
export function foldLabelOf(x: FoldLabelIn): string {
  if (x.open) {
    return x.t('pnplist.foldOther')
  }
  return x.t('pnplist.showOther', { n: x.hidden })
}

/**
 * 职业名字典:职业码 → 官方名行。
 *
 * @param nocDesc 职业名行。
 * @returns 字典。
 */
export function nocRowsOf(nocDesc: PnpNocDesc[]): NocRowMap {
  const m: NocRowMap = new Map()
  for (const d of nocDesc) {
    m.set(d.noc, d)
  }
  return m
}

/**
 * 职业名后面那条界面语言译名(2026-07-25 Frank:职业带界面语言译名;
 * 译名=NOC 官方职业名,取自 noc_descriptions)。
 *
 * @param x 界面语言、译名开关、职业名字典、职业码与主文案。
 * @returns 该出的译名;不出时给空串(关了开关、字典缺词、或译名与主文案同字 —— 一行不说两遍)。
 */
export function localTitleOf(x: LocalTitleIn): string {
  if (x.showZh === false) {
    return TEXT_NONE
  }
  let row: PnpNocDesc | null = null
  const found = x.nocRows.get(x.noc)
  if (found != null) {
    row = found
  }
  const zh = nocLocalTitle({ row, lang: x.lang })
  if (zh === TEXT_NONE || zh.toLowerCase() === x.name.toLowerCase()) {
    return TEXT_NONE
  }
  return zh
}

/**
 * 把扁平的 EE 维度表按 label 分组成类别(清单来自 DB 维度表 ee-categories,全国单一源)。
 *
 * @param x EE 类别的扁平清单。
 * @returns 分组后的类别。
 */
export function eeGroupOf(x: EeGroupIn): PnpEeCat[] {
  const byLabel = new Map<string, PnpEeCat>()
  for (const r of x.cats) {
    let c = byLabel.get(r.label)
    if (c == null) {
      c = {
        key: r.category,
        label: r.label,
        drawCrs: r.drawCrs,
        drawDate: r.drawDate,
        drawSize: r.drawSize,
        occupations: [],
      }
      byLabel.set(r.label, c)
    }
    c.occupations.push({ noc: r.noc, teer: r.teer, title: r.title })
  }
  return [...byLabel.values()]
}

/**
 * 各类别的历次抽选(#135 Frank「应该有个下拉箭头,点开按时间线看每一轮」)。
 * 数据源是 pnp_draws 的 province=FED 行,label=类别键;近 24 月无抽选的类别拿不到行 →
 * 不出箭头(没东西可展开就别给假入口)。
 *
 * @param x 全部抽选行。
 * @returns 类别键 → 历次抽选(降序)。
 */
export function eeHistOf(x: EeHistIn): HistMap {
  const m: HistMap = new Map()
  for (const d of x.draws) {
    if (d.province !== PROV_FED || d.drawDate === TEXT_NONE) {
      continue
    }
    const arr = m.get(d.label)
    if (arr == null) {
      m.set(d.label, [d])
    } else {
      arr.push(d)
    }
  }
  for (const arr of m.values()) {
    arr.sort(byDrawDateDesc)
  }
  return m
}

/**
 * 抽选按日期降序。
 *
 * @param a 前一行。
 * @param b 后一行。
 * @returns 排序位次。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
export function byDrawDateDesc(a: PnpDraw, b: PnpDraw): number {
  if (a.drawDate < b.drawDate) {
    return 1
  }
  return -1
}

/**
 * 命中本岗的类别。
 *
 * @param x 全部类别与本岗职业码。
 * @returns 命中的类别。
 */
export function eeHitOf(x: EeHitIn): PnpEeCat[] {
  const hit: PnpEeCat[] = []
  for (const c of x.grouped) {
    for (const o of c.occupations) {
      if (o.noc === x.noc) {
        hit.push(c)
        break
      }
    }
  }
  return hit
}

/**
 * 这一屏要展示的类别。#155(Frank「这个没有数据还需要列吗」= E8-09 开放问题①拍板):
 * 未命中时不再铺全部类别 —— 本岗跟它们没关系,铺出来只是占屏;收成一行「未列入任何 EE 类别」+
 * 折叠入口,想看全景才展开。
 *
 * @param x 全部类别、命中类别、历史轮次与全景开关。
 * @returns 要展示的类别。
 */
export function eeShownOf(x: EeShownIn): PnpEeCat[] {
  if (x.hit.length > 0) {
    return x.hit
  }
  if (x.showAll === false) {
    return []
  }
  const out: PnpEeCat[] = []
  for (const c of x.grouped) {
    if (eeHasDraw(c, x.histOf)) {
      out.push(c)
    }
  }
  return out
}

/**
 * 这个类别有没有抽选记录。#167⑥(Frank「没有抽签的类别是不是就不要显示了」):展开全景时
 * 把**从未抽过签**的类别滤掉 —— 没有任何抽选记录的类别对求职者没有可操作性(不知道分数线、
 * 不知道抽没抽、无从判断),列出来只是让人多读几行(如「军职 3 个职业」「研究 2 个职业」这类)。本岗**命中**的类别永远显示 ——
 * 那是与本岗直接相关的事实,不能因无抽选就藏,所以这一判只在全景那一路上。
 * ⚠️ 判据修复(2026-08-28 Frank 拍板「修」):原文 `drawDate != null` 是 2026-07 立判据时的
 * 写法,而库里「无记录」存的是**空串**不是 null —— 恒真,全景从来一条没滤掉,#167⑥ 的拍板
 * 一直没生效。补 `!== ''` 后,从未抽签的类别在全景里按原拍板隐藏;命中类别照旧永远显示。
 *
 * @param c 一个类别。
 * @param histOf 各类别的历史轮次。
 * @returns 有没有抽选记录。
 */
// eslint-disable-next-line local/one-parameter -- 谓词跟着被判定的那个类别走,历史表是它的查表依据
export function eeHasDraw(c: PnpEeCat, histOf: HistMap): boolean {
  const hist = histOf.get(c.label)
  if (hist != null && hist.length > 0) {
    return true
  }
  return c.drawDate != null && c.drawDate !== ''
}

/**
 * 有最近抽选可列的类别(CRS 与日期都在才算数)。
 *
 * @param x 这一屏要展示的类别。
 * @returns 有抽选可列的类别。
 */
export function eeDrawsCatsOf(x: EeDrawsCatsIn): PnpEeCat[] {
  const out: PnpEeCat[] = []
  for (const c of x.shown) {
    if (c.drawCrs != null && c.drawDate !== TEXT_NONE) {
      out.push(c)
    }
  }
  return out
}

/**
 * EE 判定行的话术:命中 → 列出命中的类别名;未命中 → 一句「未列入任何 EE 类别」。
 * EE ≠ PNP,是独立信号。
 *
 * @param x 取词函数、命中类别与本岗职业码。
 * @returns 判定话术。
 */
export function eeVerdictTextOf(x: EeVerdictTextIn): string {
  if (x.hit.length === 0) {
    return x.t('eelist.out')
  }
  const names = []
  for (const c of x.hit) {
    names.push(eeDisplay({ t: x.t, label: c.label }))
  }
  return x.t('eelist.in', { noc: x.noc, cats: names.join(CAT_JOIN) })
}

/**
 * 全类别全景钮的文案(2026-07-25 Frank「这两个应该是两行吧」:展开钮从结论行拆出,独立一行)。
 *
 * @param x 取词函数、命中类别与全部类别。
 * @returns 钮文案;命中了或压根没有类别时给空串(那颗钮不出)。
 */
export function eeAllLabelOf(x: EeAllLabelIn): string {
  if (x.hit.length > 0 || x.grouped.length === 0) {
    return TEXT_NONE
  }
  return x.t('eelist.allCats', { n: x.grouped.length })
}

/**
 * 折叠记号。
 *
 * @param open 展开了没有。
 * @returns 记号。
 */
export function caretOf(open: boolean): string {
  if (open) {
    return CARET_OPEN
  }
  return CARET_CLOSED
}

/**
 * 最近抽选那一行的话术(分数线 / 日期 / 邀请数)。
 *
 * @param x 取词函数与这个类别。
 * @returns 抽选行话术。
 */
export function eeDrawTextOf(x: EeDrawLineIn): string {
  return x.t('eelist.draw', {
    crs: numTextOf(x.cat.drawCrs),
    date: x.cat.drawDate,
    size: numTextOf(x.cat.drawSize),
  })
}

/**
 * 历史轮次够不够展开(拿不到行的类别不出箭头)。
 *
 * @param hist 这个类别的历史轮次。
 * @returns 出不出折叠入口。
 */
export function histExpandable(hist: PnpDraw[]): boolean {
  return hist.length >= HIST_EXPANDABLE_MIN
}

/**
 * 这个类别的历史轮次(拿不到就是空列)。
 *
 * @param histOf 各类别的历史轮次。
 * @param key 类别键。
 * @returns 历史轮次。
 */
// eslint-disable-next-line local/one-parameter -- 查表:表在前、键在后,收成对象反而看不出是查表
export function histAtOf(histOf: HistMap, key: string): PnpDraw[] {
  const hist = histOf.get(key)
  if (hist == null) {
    return []
  }
  return hist
}

/**
 * 洗历史轮次的展示行。
 *
 * @param x 取词函数与历史轮次。
 * @returns 展示行。
 */
export function histRowsOf(x: HistRowsIn): HistRowSpec[] {
  const rows: HistRowSpec[] = []
  let i = 0
  for (const h of x.hist) {
    rows.push({
      key: h.drawDate + KEY_SEP + String(i),
      iso: h.drawDate,
      crs: x.t('eelist.crsN', { crs: numTextOf(h.score) }),
      ita: x.t('eelist.itaN', { n: numTextOf(h.invitations) }),
    })
    i += 1
  }
  return rows
}

/**
 * 洗一个类别的职业清单行。
 *
 * @param x 取词函数、界面语言、译名开关、这个类别、本岗职业码与职业名字典。
 * @returns 展示行。
 */
export function occRowsOf(x: OccRowsIn): OccRowSpec[] {
  const rows: OccRowSpec[] = []
  for (const o of x.cat.occupations) {
    const hit = o.noc === x.noc
    let yourTag = TEXT_NONE
    if (hit) {
      yourTag = x.t('eelist.your')
    }
    let teer = TEXT_NONE
    if (o.teer != null) {
      teer = TEER_SHORT_HEAD + String(o.teer)
    }
    const zh = localTitleOf({ lang: x.lang, showZh: x.showZh, nocRows: x.nocRows, noc: o.noc, name: o.title })
    rows.push({ key: o.noc, hit, noc: o.noc, title: o.title, zh, teer, yourTag })
  }
  return rows
}

/**
 * 联邦轮次(E6-10 Frank「现在都是在抽 cec 和法语吧」):上面的类别卡只讲**本岗那一类**;
 * 联邦轮次还有 CEC、法语、省提名、通用 —— 不铺出来,用户拿着 EE 标会误判现在的行情。
 * 数据源同一个 build_ee_draws.py:pnp_draws 的 province=FED 行(label=类别键,零新表)。
 * 红线:法语按**语言能力**判定、不按职业,只在这里作通道说明与分数线参考,**绝不挂到岗位上**。
 *
 * @param x 全部抽选行。
 * @returns 联邦轮次(降序,最多 FED_MAX 轮)。
 */
export function fedRoundsOf(x: FedRoundsIn): PnpDraw[] {
  const rows: PnpDraw[] = []
  for (const d of x.draws) {
    if (d.province === PROV_FED && d.kind === KIND_DRAW && d.drawDate !== TEXT_NONE) {
      rows.push(d)
    }
  }
  rows.sort(byDrawDateDesc)
  return rows.slice(0, FED_MAX)
}

/**
 * 口径注的分桶。按真实轮次算 —— 原来是写死的一句「现阶段以 CEC 与法语为主」,轮次结构随政策变,
 * 写死就会过期。计数说明:FED 行按类别各留 12 轮(build_ee_draws.HIST_PER_CAT),只要窗口内没被
 * 截断计数就准(实核这 20 轮跨约 3 个月,CEC 的 12 轮能回溯 6 个月以上,不截断)。
 * 桶按轮数降序,零轮的桶不出现。
 *
 * @param x 取词函数与联邦轮次。
 * @returns 各类型的桶。
 */
export function fedBucketsOf(x: FedBucketsIn): FedBucket[] {
  const counts = new Map<string, number>()
  for (const d of x.rounds) {
    let k = FED_CAT_KEY
    if (FED_PROGRAM.includes(d.label)) {
      k = d.label
    }
    let n = counts.get(k)
    if (n == null) {
      n = 0
    }
    counts.set(k, n + 1)
  }
  const pairs = [...counts.entries()]
  pairs.sort(byBucketCountDesc)
  const out: FedBucket[] = []
  for (const [key, count] of pairs) {
    let sep = TEXT_NONE
    if (out.length > 0) {
      sep = x.t('sep')
    }
    out.push({ key, sep, label: fedLabelOf({ t: x.t, key }), count, color: fedHeadColorOf(key) })
  }
  return out
}

/**
 * 桶按轮数降序。
 *
 * @param a 前一个桶。
 * @param b 后一个桶。
 * @returns 排序位次。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
export function byBucketCountDesc(a: [string, number], b: [string, number]): number {
  const [, an] = a
  const [, bn] = b
  return bn - an
}

/**
 * 轮次类型的人话名。
 *
 * @param x 取词函数与类型键。
 * @returns 人话名;职业类别桶给它自己那个词。
 */
export function fedLabelOf(x: FedLabelIn): string {
  if (x.key === FED_CAT_KEY) {
    return x.t('eefed.cat')
  }
  return eeKeyDisplay({ t: x.t, key: x.key })
}

/**
 * 查一次轮次类型色表。
 *
 * @param key 类型键。
 * @returns 登记的色值;没登记给空串(兜底色由调用处按位置定,两处不同)。
 */
export function fedColorOf(key: string): string {
  const c = FED_TYPE_COLOR[key]
  if (c == null) {
    return TEXT_NONE
  }
  return c
}

/**
 * 口径注里一个类型的色。
 *
 * @param key 类型键。
 * @returns 色值;职业类别桶琥珀,未登记类型落灰。
 */
export function fedHeadColorOf(key: string): string {
  if (key === FED_CAT_KEY) {
    return COLOR_CAT
  }
  const c = fedColorOf(key)
  if (c === TEXT_NONE) {
    return COLOR_FED_OTHER
  }
  return c
}

/**
 * 轮次行上一个类型的色。
 *
 * @param key 类型键。
 * @returns 色值;未登记类型落琥珀(它多半就是职业类别轮次)。
 */
export function fedRowColorOf(key: string): string {
  const c = fedColorOf(key)
  if (c === TEXT_NONE) {
    return COLOR_CAT
  }
  return c
}

/**
 * 洗联邦轮次的展示行。
 *
 * @param x 取词函数、联邦轮次与展开态。
 * @returns 展示行。
 */
export function fedRowsOf(x: FedRowsIn): FedRowSpec[] {
  let picked = x.rounds
  if (x.open === false) {
    picked = x.rounds.slice(0, FED_SHOW)
  }
  const rows: FedRowSpec[] = []
  let i = 0
  for (const d of picked) {
    rows.push({
      key: d.drawDate + KEY_SEP + d.label + KEY_SEP + String(i),
      iso: d.drawDate,
      type: eeKeyDisplay({ t: x.t, key: d.label }),
      color: fedRowColorOf(d.label),
      title: d.stream,
      crs: x.t('eelist.crsN', { crs: numTextOf(d.score) }),
      ita: x.t('eefed.ita', { n: numTextOf(d.invitations) }),
    })
    i += 1
  }
  return rows
}

/**
 * 展开钮的文案(弹框只给最近 N 轮 + 可展开;#123 教训:别把全量塞进弹框)。
 *
 * @param x 取词函数、展开态与总轮数。
 * @returns 钮文案。
 */
export function fedMoreLabelOf(x: FedMoreLabelIn): string {
  if (x.open) {
    return `${CARET_OPEN} ${x.t('eefed.less')}`
  }
  return `${CARET_CLOSED} ${x.t('eefed.more', { n: x.total - FED_SHOW })}`
}

/**
 * 公司名归一(镜像 etl/clean/05c_flag_aip.py 的 norm_name)—— 用于把岗位公司名匹配回
 * AIP 指定雇主记录:取「经营名」分隔前那一段,抹掉组织形式后缀与标点,压平空白。
 *
 * @param name 公司名。
 * @returns 归一后的名字。
 */
export function normName(name: string): string {
  const head = name.toLowerCase().split(AIP_ALIAS_RE)[0]
  if (head == null) {
    return TEXT_NONE
  }
  return head.replace(AIP_SUFFIX_RE, SPACE).replace(AIP_DROP_RE, SPACE).replace(SPACE_RUN_RE, SPACE).trim()
}

/**
 * 批A #134 通道直判(Frank「直接判断这个岗能不能走这个通道」)。
 *
 * @param job 本岗。
 * @returns 三态:on=雇主在指定名单 / miss=大西洋省但雇主不在名单 / na=非大西洋省不适用。
 */
export function aipVerdictOf(job: PnpJob): AipVerdict {
  if (job.aip) {
    return AIP_ON
  }
  if (ATLANTIC_PROVS.includes(job.province)) {
    return AIP_MISS
  }
  return AIP_NA
}

/**
 * E6-09(2026-07-26 Frank「AIP 那个也一起补」):省里逐条点名「这些职业的 AIP 背书不受理」的
 * 清单(NB 官方两张)。**与雇主是否指定雇主无关** —— 官方明说这些岗一律不受理,故指定雇主也要如实说。
 *
 * @param job 本岗。
 * @param occ 省提名与 AIP 的扁平清单。
 * @returns 点名本岗的那张 AIP 排除清单;没有则 null。
 */
// eslint-disable-next-line local/one-parameter -- 桶门签名冻结(消费者是还没换装的 jobs 旧件,波 B 才动)
export function aipBlockOf(job: PnpJob, occ: PnpOcc[]): PnpStream | null {
  if (job.noc === TEXT_NONE || ATLANTIC_PROVS.includes(job.province) === false) {
    return null
  }
  let named: PnpOcc | null = null
  for (const r of occ) {
    if (r.program === PROGRAM_AIP && r.province === job.province && r.noc === job.noc) {
      named = r
      break
    }
  }
  if (named == null) {
    return null
  }
  const occupations = []
  for (const r of occ) {
    if (r.program === PROGRAM_AIP && r.label === named.label && r.province === named.province) {
      occupations.push({ noc: r.noc, name: r.name, gtaRestricted: r.gtaRestricted })
    }
  }
  return {
    stream: named.stream,
    label: named.label,
    type: named.type,
    url: named.url,
    fetched: named.fetched,
    occupations,
  }
}

/**
 * 某个 EE 类别上次抽选的日期。label 可含「/」多段(一个岗可能同时属于两类),取最晚那一次。
 *
 * @param label 数据层 label。
 * @param cats EE 类别的扁平清单(只读 label 与上次抽选日期)。
 * @returns 上次抽选日期;从没抽过给空串。
 */
// eslint-disable-next-line local/one-parameter -- 桶门签名冻结(消费者是还没换装的 jobs 旧件,波 B 才动)
export function eeLastDraw(label: string, cats: EeDrawDateRow[]): string {
  let best = TEXT_NONE
  for (const seg of label.split(CAT_JOIN)) {
    const one = seg.trim()
    for (const c of cats) {
      if (c.label === one && c.drawDate > best) {
        best = c.drawDate
      }
    }
  }
  return best
}

/**
 * EE 类别「休眠」判定(Frank 2026-07-26「ee stem 好久没有抽人了吧」—— 实核:STEM 上次 2024-04、
 * 运输 2024-03、教育 2025-09)。12 个月内有抽选=活跃;超过=休眠。休眠类别照旧显示(历史归属是
 * 事实),但降级变灰并标上次抽选年月,免得用户把两年没抽的类别当活路。判定与展示都走这一处。
 *
 * @param lastDraw 上次抽选日期;空串=从没抽过。
 * @returns 休眠了吗(日期缺失或读不出来都按休眠算,不当活路)。
 */
export function eeIsDormant(lastDraw: string): boolean {
  if (lastDraw === TEXT_NONE) {
    return true
  }
  const d = new Date(lastDraw + DAY_START_SUFFIX)
  if (Number.isNaN(d.getTime())) {
    return true
  }
  return Date.now() - d.getTime() > EE_DORMANT_MONTHS * MONTH_DAYS * DAY_MS
}

/**
 * 依据链在弹框端用同一 match() 重算(lib/jobs 的纯函数,与服务端列一致);每条结论指回维度记录。
 * 措辞红线:只说「符合/不符合公开清单条件」「高于/低于抽选线」,永不说「你能/不能移民」。
 *
 * @param x 本岗、身份与档案、两张维度清单。
 * @returns 匹配结论;未登录/未建档给 null(整卡不出)。
 */
export function matchResultOf(x: MatchResultIn): PnpMatchResult | null {
  if (x.plan.profileOk === false || x.plan.profile == null) {
    return null
  }
  const pnpOccupations = []
  for (const r of x.pnpOcc) {
    pnpOccupations.push({
      province: r.province,
      label: r.label,
      type: r.type,
      noc: r.noc,
      url: r.url,
      fetched: r.fetched,
    })
  }
  const eeCategories = []
  for (const r of x.eeOcc) {
    eeCategories.push({
      category: r.category,
      label: r.label,
      noc: r.noc,
      drawCrs: r.drawCrs,
      drawDate: r.drawDate,
      url: r.url,
      fetched: r.fetched,
    })
  }
  return matchJob({ profile: x.plan.profile, job: matchJobOf(x.job), dims: { pnpOccupations, eeCategories } })
}

/**
 * 岗位侧字段(喂给 match 引擎的那张形状,全格照抄)。
 *
 * @param job 本岗。
 * @returns 引擎要的岗位侧字段。
 */
export function matchJobOf(job: PnpJob): PnpMatchJob {
  return {
    noc: job.noc,
    teer: job.teer,
    province: job.province,
    pnpEligible: job.pnpEligible,
    pnpStream: job.pnpStream,
    eeCategory: job.eeCategory,
    salaryAnnual: job.salaryAnnual,
    wageMedAnnual: job.wageMedAnnual,
    lmiaPositions: job.lmiaPositions,
    lmiaPositionsSkilled: job.lmiaPositionsSkilled,
    lmiaLastQuarter: job.lmiaLastQuarter,
  }
}

/**
 * 依据链的行构造:一条 reason 一到两行,按 rule 分派;最后清掉重复的 TEER 灰注
 * (同屏可能出现两次,「0 最高,5 最低」只随首次出现 —— 一事只说一遍)。
 *
 * @param x 取词函数、界面语言、本岗、档案、职业名字典与依据链。
 * @returns 展示行。
 */
export function mmRowsOf(x: MmRowsIn): MmRowSpec[] {
  const rows: MmRowSpec[] = []
  for (const reason of x.reasons) {
    const one: MmRuleIn = {
      t: x.t,
      lang: x.lang,
      job: x.job,
      profile: x.profile,
      nocDesc: x.nocDesc,
      reason,
      params: reason.params as ReasonParams,
    }
    if (reason.rule === RULE_NOC) {
      rows.push(...mmNocRowsOf(one))
    } else if (reason.rule === RULE_PROV) {
      rows.push(...mmProvRowsOf(one))
    } else if (reason.rule === RULE_EE) {
      rows.push(...mmEeRowsOf(one))
    } else if (reason.rule === RULE_TEER) {
      rows.push(...mmTeerRowsOf(one))
    } else if (reason.rule === RULE_WAGE) {
      rows.push(...mmWageRowsOf(one))
    } else if (reason.rule === RULE_LMIA) {
      rows.push(...mmLmiaRowsOf(one))
    }
  }
  clearRepeatTeerNote(rows)
  return rows
}

/**
 * 拼一行依据(把七项收成一处,免得每个分支各写一遍对象字面量)。
 *
 * @param x 这一行的各项。
 * @returns 展示行。
 */
export function mmRowOf(x: MmRowOfIn): MmRowSpec {
  return {
    key: x.key + KEY_SEP + x.dim,
    dim: x.dim,
    job: x.job,
    you: x.you,
    tone: x.tone,
    text: x.text,
    tip: x.tip,
  }
}

/**
 * 职业码那一条依据(五档:本岗未分类 / 档案没填 / 完全一致 / 同中类 / 不一致)。
 *
 * @param x 一条依据与它需要的上下文。
 * @returns 展示行。
 */
export function mmNocRowsOf(x: MmRuleIn): MmRowSpec[] {
  const dim = x.t('mm.dim.noc')
  const key = x.reason.key
  const jobCell = mmNocCellOf({ lang: x.lang, nocDesc: x.nocDesc, code: x.job.noc })
  if (key === KEY_NOC_UNCAT) {
    const job = mmTextCellOf(x.t('cell.uncat'))
    return [mmRowOf({ key, dim, job, you: null, tone: TONE_NA, text: x.t('mm.v.uncat'), tip: TEXT_NONE })]
  }
  if (key === KEY_NOC_NOPROFILE) {
    const you = mmTextCellOf(x.t('mm.you.noNoc'))
    return [mmRowOf({ key, dim, job: jobCell, you, tone: TONE_NA, text: x.t('mm.v.noProfile'), tip: TEXT_NONE })]
  }
  if (key === KEY_NOC_EXACT) {
    return [mmRowOf({ key, dim, job: jobCell, you: jobCell, tone: TONE_PASS, text: x.t('mm.v.match'), tip: TEXT_NONE })]
  }
  if (key === KEY_NOC_MINOR) {
    const you = mmNocCellOf({ lang: x.lang, nocDesc: x.nocDesc, code: String(x.params.yours) })
    return [mmRowOf({ key, dim, job: jobCell, you, tone: TONE_PASS, text: x.t('mm.v.minor'), tip: TEXT_NONE })]
  }
  const you = mmNocListCellOf({ lang: x.lang, nocDesc: x.nocDesc, codes: x.profile.nocCodes })
  return [mmRowOf({ key, dim, job: jobCell, you, tone: TONE_FAIL, text: x.t('mm.v.nomatch'), tip: TEXT_NONE })]
}

/**
 * 省提名那一条依据(目标省 / 魁省 / 点名 / 排除 / 通用 / 未覆盖 / 都不占)。
 *
 * @param x 一条依据与它需要的上下文。
 * @returns 展示行。
 */
export function mmProvRowsOf(x: MmRuleIn): MmRowSpec[] {
  const key = x.reason.key
  if (key === KEY_PROV_NOTTARGET) {
    const dim = x.t('mm.dim.prov')
    const job = mmProvCellOf({ t: x.t, code: String(x.params.prov) })
    const you = mmProvListCellOf({ t: x.t, codes: x.profile.targetProvinces })
    return [mmRowOf({ key, dim, job, you, tone: TONE_WARN, text: x.t('mm.v.notTarget'), tip: TEXT_NONE })]
  }
  const pnpDim = x.t('mm.dim.pnp')
  if (key === KEY_PROV_QC) {
    const job = mmProvCellOf({ t: x.t, code: PROV_QC })
    return [mmRowOf({ key, dim: pnpDim, job, you: null, tone: TONE_NA, text: x.t('mm.v.qc'), tip: TEXT_NONE })]
  }
  const label = mmTextCellOf(streamDisplay({ t: x.t, label: String(x.params.label) }))
  if (key === KEY_PROV_NAMED) {
    const text = x.t('mm.v.named')
    return [mmRowOf({ key, dim: pnpDim, job: label, you: null, tone: TONE_PASS, text, tip: TEXT_NONE })]
  }
  if (key === KEY_PROV_EXCLUDED) {
    const text = x.t('mm.v.excluded')
    return [mmRowOf({ key, dim: pnpDim, job: label, you: null, tone: TONE_FAIL, text, tip: TEXT_NONE })]
  }
  const preDim = x.t('mm.dim.pnpPre')
  const teer = mmTeerCellOf({ t: x.t, job: x.job })
  if (key === KEY_PROV_GENERIC) {
    const text = x.t('mm.v.generic')
    return [mmRowOf({ key, dim: preDim, job: teer, you: null, tone: TONE_PASS, text, tip: TEXT_NONE })]
  }
  if (key === KEY_PROV_UNCOVERED) {
    const text = x.t('mm.v.uncovered')
    return [mmRowOf({ key, dim: preDim, job: teer, you: null, tone: TONE_NA, text, tip: TEXT_NONE })]
  }
  const none = x.t('mm.v.provNone')
  return [mmRowOf({ key, dim: preDim, job: teer, you: null, tone: TONE_FAIL, text: none, tip: TEXT_NONE })]
}

/**
 * 联邦 EE 那一条依据。命中类别时是两行:一行讲「你的分对不对得上」,一行讲那一轮的分数线;
 * 没填 CRS 就把两行都换成「填了才算得出」,判定降成提示档。
 *
 * @param x 一条依据与它需要的上下文。
 * @returns 展示行。
 */
export function mmEeRowsOf(x: MmRuleIn): MmRowSpec[] {
  const dim = x.t('mm.dim.ee')
  const key = x.reason.key
  if (key === KEY_EE_NONE) {
    const job = mmTextCellOf(x.t('mm.job.eeNone'))
    return [mmRowOf({ key, dim, job, you: null, tone: TONE_NA, text: DASH, tip: TEXT_NONE })]
  }
  const cat = x.t('mm.job.inCat', { cat: eeDisplay({ t: x.t, label: String(x.params.cat) }) })
  if (key === KEY_EE_NODRAW) {
    const job = mmTextCellOf(cat)
    return [mmRowOf({ key, dim, job, you: null, tone: TONE_NA, text: x.t('mm.v.noDraw'), tip: TEXT_NONE })]
  }
  const noCrs = key === KEY_EE_NOCRS
  const drawDim = x.t('mm.dim.eeDraw')
  const drawJob = mmTextCellOf(x.t('mm.job.draw', { draw: x.params.draw, date: x.params.date }))
  if (noCrs) {
    const then = x.t('mm.v.fillCrsThen')
    const you = mmTextCellOf(x.t('mm.you.noCrs'))
    return [
      mmRowOf({ key, dim, job: mmTextCellOf(cat), you, tone: TONE_WARN, text: x.t('mm.v.fillCrs'), tip: TEXT_NONE }),
      mmRowOf({ key, dim: drawDim, job: drawJob, you: null, tone: TONE_NA, text: then, tip: TEXT_NONE }),
    ]
  }
  const you = mmTextCellOf(x.t('mm.you.crs', { crs: x.params.crs }))
  let text = x.t('mm.v.crsBelow', { gap: x.params.gap })
  if (key === KEY_EE_ABOVE) {
    text = x.t('mm.v.crsAbove', { diff: x.params.diff })
  }
  return [
    mmRowOf({ key, dim, job: mmTextCellOf(cat), you, tone: x.reason.verdict, text, tip: TEXT_NONE }),
    mmRowOf({ key, dim: drawDim, job: drawJob, you: null, tone: TONE_NA, text: DASH, tip: TEXT_NONE }),
  ]
}

/**
 * 技能层级那一条依据(达标 / 有专门通道 / 不达标)。
 *
 * @param x 一条依据与它需要的上下文。
 * @returns 展示行。
 */
export function mmTeerRowsOf(x: MmRuleIn): MmRowSpec[] {
  const dim = x.t('mm.dim.teer')
  const key = x.reason.key
  const job = mmTeerCellOf({ t: x.t, job: x.job })
  if (key === KEY_TEER_OK) {
    return [mmRowOf({ key, dim, job, you: null, tone: TONE_PASS, text: x.t('mm.v.teerOk'), tip: TEXT_NONE })]
  }
  if (key === KEY_TEER_CHANNEL) {
    const stream = streamDisplay({ t: x.t, label: String(x.params.stream) })
    const text = x.t('mm.v.teerChannel', { stream })
    return [mmRowOf({ key, dim, job, you: null, tone: TONE_PASS, text, tip: TEXT_NONE })]
  }
  return [mmRowOf({ key, dim, job, you: null, tone: TONE_FAIL, text: x.t('mm.v.teerLow'), tip: TEXT_NONE })]
}

/**
 * 薪资那一条依据(高于 / 相当 / 低于 / 没数)。
 *
 * @param x 一条依据与它需要的上下文。
 * @returns 展示行。
 */
export function mmWageRowsOf(x: MmRuleIn): MmRowSpec[] {
  const dim = x.t('mm.dim.wage')
  const key = x.reason.key
  const job = mmTextCellOf(mmSalaryTextOf({ t: x.t, job: x.job }))
  const pct = x.params.pct
  if (key === KEY_WAGE_ABOVE) {
    const above = x.t('mm.v.wageAbove', { pct })
    return [mmRowOf({ key, dim, job, you: null, tone: TONE_PASS, text: above, tip: TEXT_NONE })]
  }
  if (key === KEY_WAGE_NEAR) {
    const near = x.t('mm.v.wageNear', { pct })
    return [mmRowOf({ key, dim, job, you: null, tone: TONE_WARN, text: near, tip: TEXT_NONE })]
  }
  if (key === KEY_WAGE_BELOW) {
    const below = x.t('mm.v.wageBelow', { pct })
    return [mmRowOf({ key, dim, job, you: null, tone: TONE_WARN, text: below, tip: TEXT_NONE })]
  }
  return [mmRowOf({ key, dim, job, you: null, tone: TONE_NA, text: x.t('mm.v.wageNa'), tip: TEXT_NONE })]
}

/**
 * 雇主 LMIA 记录那一条依据(无记录 / 只有低薪股 / 有记录)。
 *
 * @param x 一条依据与它需要的上下文。
 * @returns 展示行。
 */
export function mmLmiaRowsOf(x: MmRuleIn): MmRowSpec[] {
  const dim = x.t('mm.dim.lmia')
  const key = x.reason.key
  if (key === KEY_LMIA_NA) {
    const job = mmTextCellOf(x.t('mm.job.lmiaNone'))
    const tip = x.t('mm.v.lmiaNaTip')
    return [mmRowOf({ key, dim, job, you: null, tone: TONE_NA, text: x.t('mm.v.lmiaNa'), tip })]
  }
  const job = mmTextCellOf(x.t('mm.job.lmia', { n: x.params.n, q: x.params.q }))
  if (key === KEY_LMIA_LOWONLY) {
    return [mmRowOf({ key, dim, job, you: null, tone: TONE_NA, text: x.t('mm.v.lmiaLow'), tip: TEXT_NONE })]
  }
  return [mmRowOf({ key, dim, job, you: null, tone: TONE_PASS, text: x.t('mm.v.lmiaHas'), tip: TEXT_NONE })]
}

/**
 * 一格纯文字。
 *
 * @param text 文字。
 * @returns 展示格。
 */
export function mmTextCellOf(text: string): MmCellSpec {
  return { teer: false, lines: [{ key: text, main: text, note: TEXT_NONE, tail: TEXT_NONE }] }
}

/**
 * 一格省名。#175(Frank「这种还是不要用括号了」):译名不再括号包,改灰注跟在英文后;
 * 省名同理,不再走「En(译名)」的字符串拼法。
 *
 * @param x 取词函数与省码。
 * @returns 展示格。
 */
export function mmProvCellOf(x: MmProvCellIn): MmCellSpec {
  const cc = x.code.toUpperCase()
  let en = PROV_NAMES[cc]
  if (en == null) {
    en = x.code
  }
  const loc = x.t(PROV_KEY_HEAD + cc)
  let note = TEXT_NONE
  if (loc !== TEXT_NONE && loc !== PROV_KEY_HEAD + cc && loc !== en) {
    note = loc
  }
  return { teer: false, lines: [{ key: cc, main: en, note, tail: TEXT_NONE }] }
}

/**
 * 一格省名清单(目标省可以填好几个,一省一行)。
 *
 * @param x 取词函数与省码。
 * @returns 展示格。
 */
export function mmProvListCellOf(x: MmProvListCellIn): MmCellSpec {
  const lines = []
  for (const code of x.codes) {
    const one = mmProvCellOf({ t: x.t, code })
    lines.push(...one.lines)
  }
  return { teer: false, lines }
}

/**
 * 一格职业名:英文官方名主文案 + 界面语言译名灰注(#147),NOC 码作同行行尾灰注 —— 不另起行。
 * 字典查不到官方名时,主文案就是 NOC 码本身,不再重复渲一遍。
 *
 * @param x 界面语言、职业名字典与职业码。
 * @returns 展示格。
 */
export function mmNocCellOf(x: MmNocCellIn): MmCellSpec {
  let row: PnpNocDesc | null = null
  for (const d of x.nocDesc) {
    if (d.noc === x.code) {
      row = d
      break
    }
  }
  if (row == null || row.title === TEXT_NONE) {
    const main = NOC_HEAD + x.code
    return { teer: false, lines: [{ key: x.code, main, note: TEXT_NONE, tail: TEXT_NONE }] }
  }
  const note = nocLocalTitle({ row, lang: x.lang })
  return { teer: false, lines: [{ key: x.code, main: row.title, note, tail: NOC_HEAD + x.code }] }
}

/**
 * 一格职业名清单(档案里可以自报好几个职业码,一码一行)。
 *
 * @param x 界面语言、职业名字典与职业码。
 * @returns 展示格。
 */
export function mmNocListCellOf(x: MmNocListCellIn): MmCellSpec {
  const lines = []
  for (const code of x.codes) {
    const one = mmNocCellOf({ lang: x.lang, nocDesc: x.nocDesc, code })
    lines.push(...one.lines)
  }
  return { teer: false, lines }
}

/**
 * 一格技能层级。灰注「0 最高,5 最低」只随首次出现(清重复在 clearRepeatTeerNote);
 * 未分类的岗没有层级可标,那一格就是空值符,也不占「首次」的名额。
 *
 * @param x 取词函数与本岗。
 * @returns 展示格。
 */
export function mmTeerCellOf(x: MmTeerCellIn): MmCellSpec {
  if (x.job.teer == null) {
    return { teer: false, lines: [{ key: DASH, main: DASH, note: TEXT_NONE, tail: TEXT_NONE }] }
  }
  const main = TEER_HEAD + String(x.job.teer)
  return { teer: true, lines: [{ key: main, main, note: x.t('mm.job.teerNote'), tail: TEXT_NONE }] }
}

/**
 * 本岗的年薪话术(整千显示;没写年薪就说没写)。
 *
 * @param x 取词函数与本岗。
 * @returns 年薪话术。
 */
export function mmSalaryTextOf(x: MmSalaryTextIn): string {
  if (x.job.salaryAnnual == null) {
    return x.t('mm.job.noSalary')
  }
  return SALARY_HEAD + String(Math.round(x.job.salaryAnnual / SALARY_DIV)) + SALARY_TAIL
}

/**
 * 清掉重复的 TEER 灰注:同屏可能出现两次(省提名粗筛 / 技能层级),「0 最高,5 最低」只随首次
 * 出现 —— 一事只说一遍。
 *
 * @param rows 全部展示行(就地改,后面出现的那几格灰注置空)。
 * @returns 无。
 */
export function clearRepeatTeerNote(rows: MmRowSpec[]): void {
  let seen = false
  for (const r of rows) {
    if (r.job.teer === false) {
      continue
    }
    if (seen) {
      for (const line of r.job.lines) {
        line.note = TEXT_NONE
      }
    }
    seen = true
  }
}

/**
 * 判定后面那枚 tooltip 记号(有更多话才出)。
 *
 * @param tip 悬停提示;''=没有提示。
 * @returns 记号;没有提示时给空串。
 */
export function tipMarkOf(tip: string): string {
  if (tip === TEXT_NONE) {
    return TEXT_NONE
  }
  return TIP_MARK
}

/**
 * 抽选表的类名(一条都没有时整块 display:none,不占位)。
 *
 * @param x 空不空。
 * @returns 类名。
 */
export function drawsClsOf(x: DrawsClsIn): string {
  const cls = [cssOf(css.draws)]
  if (x.empty) {
    cls.push(cssOf(css.empty))
  }
  return cls.join(CLS_SEP)
}

/**
 * 抽选行日期格的类名。
 *
 * @param x 压不压暗。
 * @returns 类名。
 */
export function dateClsOf(x: DimClsIn): string {
  const cls = [cssOf(css.date)]
  if (x.dim) {
    cls.push(cssOf(css.dim))
  }
  return cls.join(CLS_SEP)
}

/**
 * 抽选行通道格的类名。
 *
 * @param x 压不压暗。
 * @returns 类名。
 */
export function streamClsOf(x: DimClsIn): string {
  const cls = [cssOf(css.stream)]
  if (x.dim) {
    cls.push(cssOf(css.dim))
  }
  return cls.join(CLS_SEP)
}

/**
 * 细边框盒的类名(斑马纹要裁圆角,上下留白按位置分三档)。
 *
 * @param x 裁不裁溢出与留白档。
 * @returns 类名。
 */
export function boxClsOf(x: BoxClsIn): string {
  const gapCls: Record<'none' | 'top' | 'both', string> = {
    none: TEXT_NONE,
    top: cssOf(css.mt),
    both: cssOf(css.my),
  }
  const cls = [cssOf(css.box)]
  if (x.clip) {
    cls.push(cssOf(css.clip))
  }
  const gap = gapCls[x.gap]
  if (gap !== TEXT_NONE) {
    cls.push(gap)
  }
  return cls.join(CLS_SEP)
}

/**
 * 省清单一行的类名(命中行高亮琥珀)。
 *
 * @param x 是不是命中行。
 * @returns 类名。
 */
export function rowClsOf(x: HitClsIn): string {
  const cls = [cssOf(css.row)]
  if (x.hit) {
    cls.push(cssOf(css.hit))
  }
  return cls.join(CLS_SEP)
}

/**
 * EE 职业行的类名(命中行高亮浅蓝 —— 与省清单的琥珀分开,两套清单不是一回事)。
 *
 * @param x 是不是命中行。
 * @returns 类名。
 */
export function occRowClsOf(x: HitClsIn): string {
  const cls = [cssOf(css.occRow)]
  if (x.hit) {
    cls.push(cssOf(css.hit))
  }
  return cls.join(CLS_SEP)
}

/**
 * 清单里附注标的类名(GTA 限制那种比「你的职业」浅一档)。
 *
 * @param x 弱化档。
 * @returns 类名。
 */
export function tagClsOf(x: TagClsIn): string {
  const cls = [cssOf(css.tagS)]
  if (x.muted) {
    cls.push(cssOf(css.muted))
  }
  return cls.join(CLS_SEP)
}

/**
 * 类别名的类名(清单卡的类别名比抽选卡的大一档)。
 *
 * @param x 大一号档。
 * @returns 类名。
 */
export function catNameClsOf(x: CatNameClsIn): string {
  const cls = [cssOf(css.catName)]
  if (x.lg) {
    cls.push(cssOf(css.lg))
  }
  return cls.join(CLS_SEP)
}

/**
 * 最近抽选那一行的类名(有历史可展开才给手型)。
 *
 * @param x 可不可点。
 * @returns 类名。
 */
export function drawLineClsOf(x: DrawLineClsIn): string {
  const cls = [cssOf(css.drawLine)]
  if (x.clickable) {
    cls.push(cssOf(css.clickable))
  }
  return cls.join(CLS_SEP)
}

/**
 * EE 判定行的类名(命中变蓝)。
 *
 * @param x 命中了没有。
 * @returns 类名。
 */
export function eeVerdictClsOf(x: EeVerdictClsIn): string {
  const cls = [cssOf(css.eeVerdict)]
  if (x.hit) {
    cls.push(cssOf(css.on))
  }
  return cls.join(CLS_SEP)
}

/**
 * 判定药丸的类名(色档 → 类是查表不是比较:键的完整性由 Record<PnpTone, string> 管着,
 * types 加一档、这表漏配,当场 tsc 红)。
 *
 * @param tone 色档。
 * @returns 类名。
 */
export function verdictPillClsOf(tone: PnpTone): string {
  const toneCls: Record<PnpTone, string> = {
    ok: cssOf(css.verdictOk),
    warn: cssOf(css.verdictWarn),
    fail: cssOf(css.verdictFail),
    na: cssOf(css.verdictNa),
  }
  return cssOf(css.verdict) + CLS_SEP + toneCls[tone]
}

/**
 * 依据链判定药丸的类名(底色随判定 —— 裸色字浮在白底上没有归属感)。
 *
 * @param tone 判定档。
 * @returns 类名。
 */
export function mmPillClsOf(tone: MmTone): string {
  const toneCls: Record<MmTone, string> = {
    pass: cssOf(css.pillPass),
    warn: cssOf(css.pillWarn),
    fail: cssOf(css.pillFail),
    na: cssOf(css.pillNa),
  }
  return cssOf(css.vPill) + CLS_SEP + toneCls[tone]
}

/**
 * 匹配总档那一句(档名过 i18n,前缀拼档位键)。
 *
 * @param x 取词函数与匹配总档。
 * @returns 档位话术。
 */
export function levelTextOf(x: LevelTextIn): string {
  return x.t('match.levelLine', { level: x.t(MATCH_LEVEL_HEAD + x.level) })
}

/**
 * 匹配总档那枚小字的类名。
 *
 * @param x 匹配总档。
 * @returns 类名。
 */
export function levelClsOf(x: LevelClsIn): string {
  const levelCls: Record<'high' | 'mid' | 'low' | 'na', string> = {
    high: cssOf(css.levelHigh),
    mid: cssOf(css.levelMid),
    low: cssOf(css.levelLow),
    na: cssOf(css.levelNa),
  }
  return cssOf(css.level) + CLS_SEP + levelCls[x.level]
}

/**
 * 命中行的回调 ref:只有命中行才把自己登记进盒子,别的行拿到同一只但不登记。
 *
 * @param x 是不是命中行与 ref 盒。
 * @returns 回调 ref。
 */
export function makeHitRef(x: HitRefIn): HitRefFn {
  return function hitRef(el: HTMLDivElement | null): void {
    if (x.hit) {
      x.ref.current = el
    }
  }
}

/**
 * 高亮行滚进视野(就近滚,尽量不动整个弹框)。
 *
 * @param x 命中行的 ref 盒。
 * @returns 无。
 */
export function scrollIntoHit(x: ScrollIntoHitIn): void {
  const el = x.ref.current
  if (el == null) {
    return
  }
  el.scrollIntoView({ block: SCROLL_BLOCK })
}

/**
 * 折叠一组的开关工厂(按键开合;用集合记开着的那些 —— 一把键一个状态,不必造对象)。
 *
 * @param x 折叠状态的写入口。
 * @returns 开关工厂。
 */
export function makeToggleOf(x: ToggleSetIn): ToggleOfFn {
  return function toggleOf(key: string): ClickFn {
    return function onToggle(): void {
      x.setKeys(function flip(prev: Set<string>): Set<string> {
        const next = new Set(prev)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }
        return next
      })
    }
  }
}

/**
 * 单开一个的开关工厂(同一时刻只展开一个类别的历史;再点一次收起)。
 *
 * @param x 当前展开的类别键与写入口。
 * @returns 开关工厂。
 */
export function makeCatToggleOf(x: CatToggleIn): ToggleOfFn {
  return function catToggleOf(key: string): ClickFn {
    return function onToggle(): void {
      if (x.openCat === key) {
        x.setOpenCat(null)
        return
      }
      x.setOpenCat(key)
    }
  }
}

/**
 * 一个开关的开合。
 *
 * @param x 开关的写入口。
 * @returns 点击手柄。
 */
export function makeFlagToggle(x: FlagToggleIn): ClickFn {
  return function onToggle(): void {
    x.setOn(function flip(prev: boolean): boolean {
      return prev === false
    })
  }
}

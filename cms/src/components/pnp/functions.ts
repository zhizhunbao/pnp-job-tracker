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
import { tagClsOf as baseTagClsOf } from '@/components/tag'
import { makeT } from '@/lib/i18n'
import { drawStreamNote, eeDisplay, eeKeyDisplay, match as matchJob, streamDisplay } from '@/lib/jobs'
import { PROV_NAMES } from '@/lib/location'
import { nocLocalTitle } from '@/lib/noc'
import { DAY_MS } from '@/lib/time'
import { track } from '@/lib/track'
import {
  COUNT_AIP, COUNT_INV, COUNT_ROW_KEY, COUNT_SEL, DRAWS_FORM_GROUPS,
  DRAWS_FORM_MONTHLY, DRAWS_FORM_NONE, DRAWS_FORM_STATUS, DRAW_SELECT_PROVS, HOST_RE, LANG_EN,
  LINK_ARROW, MONTH_DATE_LEN, MONTHLY_ROWS_MAX, MONTHS_KEYS, NUM_LOCALE, OPS_INV_YTD,
  OPS_SCOPE_STREAM, OPS_SEL_YTD, PNP_GEN_HEAD, QUOTA_COLS, ROUNDS_KEYS, YEAR_LEN,
  TAG_V_GRAY, TAG_V_IMP, TAG_V_OK, TAG_V_WARN,
  AIP_ALIAS_RE, AIP_DROP_RE, AIP_MISS, AIP_NA, AIP_ON, AIP_SUFFIX_RE, ATLANTIC_PROVS, CARET_CLOSED, CARET_OPEN,
  CAT_JOIN, CLS_SEP, COLOR_CAT, COLOR_FED_OTHER, DASH, DAY_START_SUFFIX, DRAW_STREAM_AIP, EE_DORMANT_MONTHS,
  EV_EMPLOYER_CLICK, FED_CAT_KEY, FED_CEC, FED_FRENCH, FED_TYPE_COLOR, GEN_DRAW_STREAM, NAMED_DRAW_STREAMS,
  KEY_EE_ABOVE, KEY_EE_NOCRS, KEY_EE_NODRAW, KEY_EE_NONE, KEY_LMIA_LOWONLY, KEY_LMIA_NA,
  KEY_NOC_EXACT, KEY_NOC_MINOR, KEY_NOC_NOPROFILE, KEY_NOC_UNCAT, KEY_PROV_EXCLUDED, KEY_PROV_GENERIC,
  KEY_PROV_NAMED, KEY_PROV_NOTTARGET, KEY_PROV_QC, KEY_PROV_UNCOVERED, KEY_SEP, KEY_TEER_CHANNEL, KEY_TEER_OK,
  KEY_WAGE_ABOVE, KEY_WAGE_BELOW, KEY_WAGE_NEAR, KIND_DRAW, KIND_NOTICE, LANG_ZH, FACTS_KEY_SEP, MATCH_LEVEL_HEAD,
  MONTH_DAYS,
  NEWS_LATEST_MAX, NOC_HEAD, PROGRAM_AIP, PROGRAM_PNP, PROV_FED, PROV_KEY_HEAD, PROV_QC, ROWS_FALLBACK,
  RULE_EE, RULE_LMIA, RULE_NOC, RULE_PROV, RULE_TEER, RULE_WAGE, SALARY_DIV, SALARY_HEAD, SALARY_TAIL,
  SCROLL_BLOCK, SPACE, SPACE_RUN_RE, SRC_PNP, STREAM_REFORM, TEER_HEAD, TEER_SHORT_HEAD,
  TEXT_NONE, TIP_MARK, TONE_FAIL, TONE_NA, TONE_PASS, TONE_WARN, TYPE_INELIGIBLE,
  UNKNOWN_MARK, URL_JOBS_Q_HEAD, URL_NEWS_HEAD,
  BASIS_KV, BASIS_SEP, BASIS_TENURE, BASIS_VALUE_CODE, BASIS_WINDOW, GATE_COND_LOCAL, GATE_EMP_HEAD, GATE_F,
  GATE_FORM_HEAD, GATE_FORM_ORDER, GATE_OP_GE, GATE_ROW, GATE_SUBJECT_EMPLOYER, GATE_TERM_HEAD, GATE_UNIT_CLB,
  GATE_UNIT_MONTHS, GEN_REQ_STREAMS, NAMED_REQ_STREAMS, VALUE_CODE_SEP,
} from './constants'
import type {
  AllGroupsLabelIn, ChannelOfIn, ChannelSpec, ChannelsIn, CountKind, DrawCard, DrawCardOfIn, DrawsForm,
  LatestSinceIn, SourceLink, SourceLinkIn, OpsPickIn, PnpOps, QuotaCardOfIn, QuotaCardSpec, QuotaRowIn, QuotaRowSpec,
  QuotaStreamIn, YtdLineIn,
  MonthRowsIn, RoundRowsIn,
  AipVerdict, BoxClsIn, CatNameClsIn, ClickFn, DimClsIn, DrawNoticeTextIn, DrawRowIn,
  DrawRowSpec, DrawRowsIn, DrawsClsIn, DrawsTitleIn, EeDrawDateRow,
  CmpGroupIn, CmpHeadClsIn, CmpLineClsIn, CmpScoreClsIn, CmpLineIn, DrawHist, EeCmp, EeCmpGroup, EeCmpIn,
  EeCmpLine, EeGroupIn, HistAtIn, InvTextIn, PnpDrawGroupsOfIn, PnpEeCatOcc, ZhSubIn,
  EeHitIn, FedLabelIn,
  FoldLabelIn, HasProvDrawsIn,
  HiddenCountIn, HitClsIn, HitRefFn, HitRefIn, LevelClsIn, LevelTextIn,
  FactKeyIn, LocalTitleIn, MatchResultIn, MmCellSpec, MmNocCellIn, MmNocListCellIn, MmProvCellIn, MmProvListCellIn,
  MmRowOfIn, MmRowSpec, MmRowsIn, MmRuleIn, MmSalaryTextIn, MmTeerCellIn, MmTone, NewsRowSpec, NewsRowsIn,
  NocRowMap, OccRowSpec, OccRowsIn, PnpDraw, PnpEeCat, PnpJob, PnpMatchIn, PnpMatchJob, PnpMatchOut,
  PnpFactsIndex, PnpFactsIndexIn, PnpFactsShownIn, PnpMatchResult, PnpNocDesc, PnpOcc, PnpReform, PnpStream,
  PnpStreamsIn, PnpTone, ProvDrawHistIn, ProvRow,
  ReasonParams, ReformOfIn, ScrollIntoHitIn, ShownStreamsIn, SponsorLinesIn, SponsorShowIn, StreamRowSpec,
  StreamRowsIn, TagClsIn, ToggleOfFn, ToggleSetIn, TrackClickIn,
  BasisKeyIn, ExpLineIn, GateCardOfIn, GateCardSpec, GateQuote, GateRowOfIn, GateRowSpec, GateUrlIn, LangPickIn,
  MineLineIn, NocHitIn, PnpReq, RowOfFactorIn, TeerHitIn,
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
 * 2026-09-26 晚:灰注改走 zhSubOf(人工定表优先、机器译名兜底,与组头同一个出口;名字与通道卡一致)。
 *
 * @param x 取词函数、界面语言、这一行、序号与改制登记。
 * @returns 展示行。
 */
export function toDrawRow(x: DrawRowIn): DrawRowSpec {
  const dim = x.reform != null && x.draw.drawDate < x.reform.since
  const streamZh = zhSubOf({ lang: x.lang, draw: x.draw })
  let title = x.draw.stream
  if (x.draw.note !== TEXT_NONE) {
    title = x.draw.note
  }
  let score = TEXT_NONE
  if (x.draw.score != null) {
    score = x.t('pnpdraws.min', { score: x.draw.score })
  }
  const inv = invTextOf({ t: x.t, draw: x.draw })
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
 * PNP 命中计算(清单块与通道直判块两处共用;纯函数,改一处两边同变)。
 * AIP 清单不参与省提名判定(那是另一条路,见 aipBlockOf);魁省与缺省码的岗没有通道可比。
 * 2026-09-26 /fe 首页 Frank 改判:命中清单改认数据层 pnp_stream —— 格子写哪张清单,弹框就展开哪张。
 * 原先这里按职业码自己找、取最后一个命中,也不跳过参考信号清单:NS 木匠一类 82 条格子写「NS Construction」
 * (数据层取清单最小的第一个命中),点开却是「NS Critical Vacancies」参考清单。参考信号清单(MB 在需、NS 紧缺空缺)
 * 数据层从不写进 pnp_stream,于是也不再当命中清单;排除清单照旧按职业码认。
 *
 * @param x 本岗与扁平清单。
 * @returns 本省通道、命中与排除。
 */
export function pnpMatchOf(x: PnpMatchIn): PnpMatchOut {
  const streams = pnpStreamsOf({ province: x.job.province, occ: x.occ })
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
      if (x.job.pnpStream !== TEXT_NONE && s.label === x.job.pnpStream) {
        matched = s
      }
    }
  }
  return { streams, matched, excluded: excludedBy != null, excludedBy, hasInclusion }
}

/**
 * 一省的省提名清单:扁平清单行按 label 分组成通道(AIP 背书清单不算;魁省与缺省码的岗没有通道可比)。
 * 2026-09-26 自 pnpMatchOf 体内原样提出:弹框命中计算与首屏的事实索引(pnpFactsIndexOf)共用这一处分组,
 * 格子判「弹框有没有清单卡」与弹框自己出卡才是同一份清单。
 *
 * @param x 省码与扁平清单。
 * @returns 本省通道(清单行的原序)。
 */
function pnpStreamsOf(x: PnpStreamsIn): PnpStream[] {
  const streams: PnpStream[] = []
  if (x.province !== PROV_QC && x.province !== TEXT_NONE) {
    const byLabel = new Map<string, PnpStream>()
    for (const r of x.occ) {
      if (r.province !== x.province || programOf(r) !== PROGRAM_PNP) {
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
  return streams
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
 * 省提名弹框的事实索引:清单与抽选两张整表压成三串键(服务端门里算一次,随首屏下发;整表 2026-09-26 起弹框打开才懒取)。
 * 格子凭它判「弹框里有没有卡可出」(pnpFactsShownOf)—— 抽选那串就是 hasProvDraws 为真的省,清单与排除两串就是
 * pnpStreamsOf 分出来的纳入型清单与排除清单点名的职业:与弹框自己出卡(PnpListSection)同一套判据,不另写一份
 * (排除那串不借职位板的排除键:那份按清单行算,这份按弹框分组算,判「弹框出不出卡」只认弹框自己的分组)。
 * 2026-09-26 同日「补完整」:hasProvDraws 收进了抽选卡的三种形(见 drawsFormOf),抽选那串随之多出 NS、ON,形状不变。
 *
 * @param x 两张整表。
 * @returns 出得了抽选卡的省码、认得出的纳入型清单键与排除清单点名的职业键。
 */
export function pnpFactsIndexOf(x: PnpFactsIndexIn): PnpFactsIndex {
  const draws: string[] = []
  for (const province of distinctProvsOf(x.draws)) {
    if (hasProvDraws({ province, draws: x.draws })) {
      draws.push(province)
    }
  }
  const lists: string[] = []
  const excluded: string[] = []
  for (const province of distinctProvsOf(x.occ)) {
    for (const s of pnpStreamsOf({ province, occ: x.occ })) {
      if (s.type !== TYPE_INELIGIBLE) {
        lists.push(factKeyOf({ province, tail: s.label }))
        continue
      }
      for (const o of s.occupations) {
        excluded.push(factKeyOf({ province, tail: o.noc }))
      }
    }
  }
  return { draws, lists, excluded }
}

/**
 * 这一岗的省提名弹框有没有卡可出:本省抽选卡,或清单卡(命中的纳入清单 = 数据层 pnp_stream 那张;被排除 = 点名它的排除清单)。
 * 2026-09-26 /fe 首页 Frank(止血):格子可不可点只看它 —— 安省改制不出抽选卡且没有清单、NS / SK 的通用岗与领地
 * 既无清单也无抽选,这两万来条点开只有标题;判据写的是「弹框有没有内容」而不是省份,每省事实卡上线后自然恢复可点。
 *
 * 魁省与缺省码的岗弹框里没有卡(清单分组与抽选卡两处都先把它们挡掉,见 pnpStreamsOf / hasProvDraws),这里同样先挡。
 * 2026-09-26 同日「补完整」:抽选卡多了两种形(NS 按月选取人数、ON 改制现状),都经 hasProvDraws 进 draws 那串,本函数不用改;
 * 排除那串只对不可提名的岗算数(与弹框 shownStreamsOf 同一道)—— SK 主线不合格表是参考信号表,数据层不拿它判资格,
 * 可提名的岗弹框不再出那张排除卡,这里也不再凭它判「有卡」。弹框顶上的「本岗能走的通道」卡只是抬头,不单独算「有卡」:
 * 只有它一张的弹框,内容与格子一字不差,等于点开只有标题。
 *
 * @param x 本岗省码、职业码、数据层通道标签、可提名与否与事实索引。
 * @returns 有卡可出 = true。
 */
export function pnpFactsShownOf(x: PnpFactsShownIn): boolean {
  if (x.province === PROV_QC || x.province === TEXT_NONE) {
    return false
  }
  if (x.index.draws.includes(x.province)) {
    return true
  }
  const exclKey = factKeyOf({ province: x.province, tail: x.noc })
  if (x.eligible === false && x.index.excluded.includes(exclKey)) {
    return true
  }
  if (x.stream === TEXT_NONE) {
    return false
  }
  return x.index.lists.includes(factKeyOf({ province: x.province, tail: x.stream }))
}

/**
 * 事实索引的键(省码 + 键尾:纳入型清单用清单名 —— 即数据层 pnp_stream 的取值;排除那串用职业码)。
 *
 * @param x 省码与键尾。
 * @returns 键(形如 `NS|NS 建筑`、`SK|65201`)。
 */
function factKeyOf(x: FactKeyIn): string {
  return x.province + FACTS_KEY_SEP + x.tail
}

/**
 * 表里出现过的省码(去重,保持首次出现的先后)。
 *
 * @param rows 带省码的行(清单行或抽选行)。
 * @returns 省码。
 */
function distinctProvsOf(rows: ProvRow[]): string[] {
  const out: string[] = []
  for (const r of rows) {
    if (out.includes(r.province) === false) {
      out.push(r.province)
    }
  }
  return out
}

/**
 * 本省有没有抽选可列(魁省不出这张卡 —— 它不参加 PNP)。
 * 2026-09-26 /fe 首页 Frank:这一处收成省提名弹框「出不出本省抽选卡」的完整判据 —— 原先改制省那道(安省不出,见 reformOf)
 * 写在 PnpListSection 里、「一轮带日期的抽选都没有」那道藏在 PnpDrawGroups 的空组判断里,三处拼起来才是答案;
 * 格子要照弹框出不出卡判可不可点(pnpFactsIndexOf),判据只能有一份。入参由本岗改成省码(首屏索引按省算)。
 * 同日「补完整」:抽选卡多了两种形,出哪一种收进 drawsFormOf,这里只剩「出不出」—— 判据仍是这一份。
 *
 * @param x 省码与全部抽选行。
 * @returns 出不出抽选卡。
 */
export function hasProvDraws(x: HasProvDrawsIn): boolean {
  return drawsFormOf(x) !== DRAWS_FORM_NONE
}

/**
 * 本省抽选卡出哪一种形(2026-09-26 /fe 首页 Frank「止血 + 补完整」,效果图点头):
 * ① 魁省与缺省码的岗不出(魁省不属省提名);
 * ② 改制省(安省,见 reformOf)出现状:改制后有官方公告才出(最新公告日、改制后发没发过邀请),
 *    改制前的旧通道抽选照旧不列;
 * ③ 有带日期的轮次 → 按通道分组;
 * ④ 只有到月的汇总行(NS 每月从 EOI 池选取人数)→ 按月列。
 * 形不写死省份:哪一形全看这省的抽选行长什么样,数据变了卡跟着变。
 *
 * @param x 省码与全部抽选行。
 * @returns 抽选卡的形。
 */
export function drawsFormOf(x: HasProvDrawsIn): DrawsForm {
  if (x.province === PROV_QC || x.province === TEXT_NONE) {
    return DRAWS_FORM_NONE
  }
  const reform = reformOf({ province: x.province })
  if (reform != null) {
    const notice = latestSinceOf({ province: x.province, draws: x.draws, since: reform.since, kind: KIND_NOTICE })
    if (notice == null) {
      return DRAWS_FORM_NONE
    }
    return DRAWS_FORM_STATUS
  }
  if (provDrawHistOf({ province: x.province, draws: x.draws }).size > 0) {
    return DRAWS_FORM_GROUPS
  }
  if (monthRowsOf({ province: x.province, draws: x.draws }).length > 0) {
    return DRAWS_FORM_MONTHLY
  }
  return DRAWS_FORM_NONE
}

/**
 * 本省的抽选按通道分组(只收带日期的抽选行,通告行不算;组内保持来稿序,排序归调用方)。
 * 2026-09-26 自 pnpDrawGroupsOf 体内原样提出:抽选卡出不出(hasProvDraws)与卡里分哪几组共用这一处 ——
 * 一组都分不出来,抽选卡就不出。
 * 同日「补完整」:只到月的汇总行(NS 每月选取人数)不是一轮抽选,不进分组(否则「近 90 天几轮」会把 `YYYY-MM` 当日期比),
 * 它们单走按月那一种卡(monthRowsOf)。
 *
 * @param x 省码与全部抽选行。
 * @returns 通道原值 → 历次抽选。
 */
function provDrawHistOf(x: ProvDrawHistIn): DrawHist {
  const hist: DrawHist = new Map()
  for (const d of x.draws) {
    if (d.province !== x.province || d.kind !== KIND_DRAW || d.drawDate === TEXT_NONE || isMonthOnly(d.drawDate)) {
      continue
    }
    const arr = hist.get(d.stream)
    if (arr == null) {
      hist.set(d.stream, [d])
    } else {
      arr.push(d)
    }
  }
  return hist
}

/**
 * 这个抽选日期是不是只到月(`YYYY-MM`:一个月的汇总,不是一轮)。
 *
 * @param date 抽选日期。
 * @returns 只到月 = true。
 */
function isMonthOnly(date: string): boolean {
  return date.length === MONTH_DATE_LEN
}

/**
 * 本省按月的选取人数行(只到月的抽选行,人数没公布的月份不列;降序,最多一年)。
 * 2026-09-26 /fe 首页 Frank「止血 + 补完整」:NS 官网只按月公布从 EOI 池里选了多少人(liveinnovascotia.com/eoi-selection),
 * 日期照官方写到月 —— 这里只按字符串比先后(同长的 `YYYY-MM` 字典序即时间序),不拿它算天数。
 *
 * @param x 省码与全部抽选行。
 * @returns 按月的行(降序)。
 */
export function monthRowsOf(x: MonthRowsIn): PnpDraw[] {
  const rows: PnpDraw[] = []
  for (const d of x.draws) {
    if (d.province !== x.province || d.kind !== KIND_DRAW) {
      continue
    }
    if (isMonthOnly(d.drawDate) === false || d.invitations == null) {
      continue
    }
    rows.push(d)
  }
  rows.sort(byDrawDateDesc)
  return rows.slice(0, MONTHLY_ROWS_MAX)
}

/**
 * 某一天(改制生效日)及以后,本省最近的一行某类别(官方公告或抽选)。
 *
 * @param x 省码、全部抽选行、起算日与行类别。
 * @returns 最近那一行;没有给 null。
 */
function latestSinceOf(x: LatestSinceIn): PnpDraw | null {
  let best: PnpDraw | null = null
  for (const d of x.draws) {
    if (d.province !== x.province || d.kind !== x.kind || d.drawDate < x.since) {
      continue
    }
    if (best == null || d.drawDate > best.drawDate) {
      best = d
    }
  }
  return best
}

/**
 * 抽选卡走不走分组形(PnpDrawGroups):带日期的轮次分组,或按月公布的那一组(2026-09-27 Frank「NS 这个省 弹框怎么都是汇总数据」「还是横着排的」)。
 * 同日 Frank 勾「安省改一行组头」(看过效果图):改制现状(安省)也改走分组卡的一行组头(statusGroupOf),三种形都走这一张卡,出卡即走分组卡。
 *
 * @param form 抽选卡的形。
 * @returns 走分组卡 = true。
 */
export function drawGroupsShownOf(form: DrawsForm): boolean {
  return form !== DRAWS_FORM_NONE
}

/**
 * 改制省的现状卡(2026-09-26 /fe 首页 Frank「止血 + 补完整」,效果图点头 —— 原先安省这里不出卡、格子点开只有标题):
 * 两行全取自数据:① 最新公告 = 改制后最近一条官方公告的日期(pnp_draws 的 notice 行;悬停出公告原句);
 * ② 已发邀请 = 改制后有没有抽选行,没有写「暂无」(琥珀),有就写最近那一轮的日期。
 * 底部官方链接取那条公告行记的官方页。旧通道停发日、官方页更新日数据层还没有,不出这两格(不写死)。
 * 同日 lead 定:① 的标签用通用的「最新公告」(复用 tl.tabNews),不写「EOI 注册开放」—— notice 行是数据层抓 ON 更新页的
 * 最新一条(etl/pnp parse_on),ON 发下一条公告那一行就换了,具体标签会随之指错;数据层给公告分类型后再说具体事件。
 * ② 由抽选行推出,不受这一条影响。
 * 同日晚 Frank「这种排版是不是太空了」「这个要所有省和通道的格式保持一致吧」:两行「项 | 值」竖排 + 底部链接,改成与分组卡本岗那一组
 * 同一种横排格子(末格「来源」);标题只留「本省最近抽选」、轮次标签降成灰字;「暂无」不再琥珀加粗(本岗改由整块琥珀底标出)。
 * 同晚 Frank「这个下面还有必要灰字吗」:轮次标签灰字撤(弹框顶上已写省提名名称);「上面这个高亮是不是格式改成和下面的一样的」:
 * 分组卡本岗那一组改成组头行,「来源」随之从末格挪到卡片标题那一行右端(三种卡同一处,sourceLinkOf)。
 * 2026-09-27 Frank 勾「安省改一行组头」(看过效果图):两格横排改成与其余省同一种组头行(statusGroupOf,原 statusCardOf)——
 * 名字走通用通道名(pnp.gen.<省>,与上面「本岗能走的通道」卡同一个);改制后没有抽选写「暂无邀请」、有了写那一轮的人数 / 分数;
 * 日期 = 改制后最近一轮,还没有就写最新公告日;悬停出公告原句;点开列改制后的轮次(没有就不能点)。
 * 本岗在本省可提名时(GEN_DRAW_STREAM 登记了该省)标命中。上面 ①② 两格与「最新公告」「已发邀请」两个标签随之撤。
 *
 * @param x 取词函数、界面语言、省码、全部抽选行与本岗对应的组。
 * @returns 这一组;不是改制省或改制后没有公告给 null。
 */
function statusGroupOf(x: PnpDrawGroupsOfIn): EeCmpGroup | null {
  const reform = reformOf({ province: x.province })
  if (reform == null) {
    return null
  }
  const notice = latestSinceOf({ province: x.province, draws: x.draws, since: reform.since, kind: KIND_NOTICE })
  if (notice == null) {
    return null
  }
  const rounds: PnpDraw[] = []
  for (const d of x.draws) {
    if (d.province === x.province && d.kind === KIND_DRAW && d.drawDate >= reform.since) {
      rounds.push(d)
    }
  }
  rounds.sort(byDrawDateDesc)
  const genKey = PNP_GEN_HEAD + x.province
  const en = makeT(LANG_EN)(genKey)
  let sub = TEXT_NONE
  if (x.lang !== LANG_EN && x.t(genKey) !== en) {
    sub = x.t(genKey)
  }
  let key = notice.label
  const registered = GEN_DRAW_STREAM[x.province]
  if (registered != null) {
    key = registered
  }
  const head = rounds[0]
  let none = x.t('pnpdraws.noInvYet')
  let date = notice.drawDate
  let score: number | null = null
  if (head != null) {
    none = invTextOf({ t: x.t, draw: head })
    date = head.drawDate
    score = head.score
  }
  return cmpGroupOf({
    t: x.t,
    none,
    sub,
    lang: x.lang,
    key,
    name: en,
    tip: notice.note,
    date,
    score,
    draws: rounds,
    dim: false,
    hit: x.hitStreams.includes(key),
    perMonth: false,
  })
}

/**
 * 抽选卡标题那一行右端的官方链接(「来源」+ 站名,新开页)。
 * 2026-09-26 晚 Frank「这个要所有省和通道的格式保持一致吧」:改成三种抽选卡共用的末格「来源」(原名 factLinkOf,底部单独一行)。
 * 同晚 Frank「上面这个高亮是不是格式改成和下面的一样的」:分组卡本岗那一组改成组头行,格子没了,「来源」挪到卡片标题那一行右端,
 * 三种卡同一处(改名 sourceLinkOf,原 sourceCellOf);Frank 问「每个通道 link 不一样吧」—— 抽选数据每省只来自一个官方页
 * (各通道的轮次都在同一页上),一张卡一条就够。
 *
 * @param x 取词函数与数据层记的官方页地址。
 * @returns 来源链接;认不出站名给 null(不出)。
 * 2026-09-27 Frank「这个来源看着很突兀 按钮」→ 选「描边小钮」:钮上只写「来源 ↗」,站名只用来认出这是个像样的网址。
 */
function sourceLinkOf(x: SourceLinkIn): SourceLink | null {
  const m = HOST_RE.exec(x.url)
  if (m == null || m.groups == null || m.groups.host == null) {
    return null
  }
  return { text: x.t('col.source') + LINK_ARROW, href: x.url }
}

/**
 * 要展开哪几张清单。#125 → 2026-07-25 Frank 收紧「不覆盖就不用显示」:命中 → 只展示命中的清单;
 * 被排除 → 只展示排除清单;都没有 → 清单整体不渲(原全量铺浏览语境退役)——
 * 判定行已说清结论,不相干的清单只是噪音。
 * 一省可有多张排除表(NB:通用 14 个 NOC + 餐饮住宿 13 个)→ 只展示真正命中本岗的那张,
 * 否则会铺一张与本岗无关的清单(兜底行还会随便挑一条),同 #125③ 口径。
 * 2026-09-26 /fe 首页 Frank「止血 + 补完整」(顺手修):排除清单卡只给数据层判不可提名的岗。SK 主线不合格表只管
 * OID / EE 两个子类(数据层标了参考信号,不拿它判资格),持 offer 的 SK 岗照样可提名 —— 原先按职业码一碰就出排除卡,
 * 格子写「可提名」、弹框出「排除」,数百条自相矛盾。
 *
 * @param x 命中结论、本岗职业码与可提名与否。
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
    if (x.eligible === false && x.match.excluded && s.type === TYPE_INELIGIBLE && hasNocOf(s, x.noc)) {
      out.push(s)
    }
  }
  return out
}

/**
 * 本岗能走的通道(弹框顶上那张卡;2026-09-26 /fe 首页 Frank「止血 + 补完整」,效果图点头):
 * 口径与职位板 PNP 格一致(jobs 域 pnpCellOf)—— 数据层有具名通道标签(pnp_stream)就列它,没有而可提名就列该省的通用通道名
 * (`pnp.gen.{省}` 词条;查不到词条的省不列,格子那边写「{省} 可提名」,那不是通道名);主文案英文官方名、界面语言译名作灰字。
 * 现在一岗只有一个值,出参留成清单:「一岗列出全部通道」立项后这里直接加条目,卡不用改。
 * 魁省不属省提名、缺省码的岗无从说起,都不列。
 *
 * @param x 两个取词函数、界面语言、译名开关与本岗。
 * @returns 通道条目;不列给空列。
 */
export function channelsOf(x: ChannelsIn): ChannelSpec[] {
  if (x.job.province === PROV_QC || x.job.province === TEXT_NONE) {
    return []
  }
  if (x.job.pnpStream !== TEXT_NONE) {
    const en = streamDisplay({ t: x.tEn, label: x.job.pnpStream })
    const local = streamDisplay({ t: x.t, label: x.job.pnpStream })
    return [channelOf({ lang: x.lang, showZh: x.showZh, key: x.job.pnpStream, en, local })]
  }
  if (x.job.pnpEligible === false) {
    return []
  }
  const key = PNP_GEN_HEAD + x.job.province
  const en = x.tEn(key)
  if (en === key) {
    return []
  }
  return [channelOf({ lang: x.lang, showZh: x.showZh, key, en, local: x.t(key) })]
}

/**
 * 一条通道条目(英文名作主文案;非英文界面且开着译名、译名又与英文不同字才出灰字)。
 *
 * @param x 界面语言、译名开关、列表键、英文名与界面语言名。
 * @returns 通道条目。
 */
function channelOf(x: ChannelOfIn): ChannelSpec {
  let sub = TEXT_NONE
  if (x.lang !== LANG_EN && x.showZh && x.local !== x.en) {
    sub = x.local
  }
  return { key: x.key, name: x.en, sub }
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
 * 2026-09-23 Frank「这个已经高亮了不用显示本岗了吧」:命中行已高亮,「本岗」标撤(EE 类别清单同批撤)。
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
    let gtaTag = TEXT_NONE
    if (o.gtaRestricted) {
      gtaTag = x.t('pnplist.gta')
    }
    const zh = localTitleOf({ lang: x.lang, showZh: x.showZh, nocRows: x.nocRows, noc: o.noc, name: o.name })
    rows.push({ key: o.noc + o.name, hit, noc: o.noc, name: o.name, zh, gtaTag })
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
 * 2026-09-23 Frank「对于 EE 医生类,在这找医生类的工作肯定对标的是医生类啊」:改按岗位行上的 EE 类别标签取
 * (数据层 mart 定的,医生类盖住医疗社服),不再按职业码逐个类别清单现查 —— 现查会把医生岗又算回医疗社服,
 * 和表格那一格对不上。类别清单本身照官方原样,两类都列医生。
 *
 * @param x 全部类别与本岗的 EE 类别标签。
 * @returns 命中的类别(标签顺序)。
 */
export function eeHitOf(x: EeHitIn): PnpEeCat[] {
  const hit: PnpEeCat[] = []
  for (const label of x.eeCategory.split(CAT_JOIN)) {
    for (const c of x.grouped) {
      if (c.label === label.trim()) {
        hit.push(c)
      }
    }
  }
  return hit
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
 * 洗一个类别的职业清单行。
 * 2026-09-23 Frank「这个已经高亮了不用显示本岗了吧」:命中行已高亮,「本岗」标撤(省提名清单同批撤)。
 * 同日「而且这个高亮的默认排到最上面 方便看」:命中行置顶,其余保持原序(省提名清单早就是命中置顶)。
 *
 * @param x 界面语言、译名开关、这个类别、本岗职业码与职业名字典。
 * @returns 展示行。
 */
export function occRowsOf(x: OccRowsIn): OccRowSpec[] {
  const rows: OccRowSpec[] = []
  for (const o of hitFirstOf(x)) {
    const hit = o.noc === x.noc
    let teer = TEXT_NONE
    if (o.teer != null) {
      teer = TEER_SHORT_HEAD + String(o.teer)
    }
    const zh = localTitleOf({ lang: x.lang, showZh: x.showZh, nocRows: x.nocRows, noc: o.noc, name: o.title })
    rows.push({ key: o.noc, hit, noc: o.noc, title: o.title, zh, teer })
  }
  return rows
}

/**
 * 类别清单的职业按「命中置顶」排(其余保持原序)。
 *
 * @param x 这个类别与本岗职业码(其余格不读)。
 * @returns 排好的职业。
 */
function hitFirstOf(x: OccRowsIn): PnpEeCatOcc[] {
  const hits: PnpEeCatOcc[] = []
  const others: PnpEeCatOcc[] = []
  for (const o of x.cat.occupations) {
    if (o.noc === x.noc) {
      hits.push(o)
    } else {
      others.push(o)
    }
  }
  return hits.concat(others)
}

/**
 * EE 分数线对比卡的内容(2026-09-23 Frank「先改这个 EE 类别。加个卡,对比最近走 EE CEC 分和单独走医疗社服的分」):
 * 本岗类别各一组(组头按类别表带的最近一轮;休眠的、从没抽过的压暗)+ CEC 一组;活跃且有分的类别各出一行分差
 * (休眠类别拿两年前的分比没有意义,不出分差)。拿不到 CEC 最近一轮整卡不出 —— 没有参照就不算对比。
 * 同日第二版(Frank「这个我觉得都列全了,分开列,然后带展开,收缩。而且可以简单看到对比的」「EE 基本就这三个对比就可以了吧」):
 * 三组分开列 —— 本岗类别、CEC、法语,组头一行 = 最近一轮(定宽列上下对齐,一眼可比),点开列全部轮次;
 * 法语按语言能力抽、与职业无关,只作分数线参照(组头悬停说明),不出分差。
 *
 * @param x 取词函数、界面语言、本岗命中的类别与全部抽选行。
 * @returns 对比;没有命中类别或拿不到 CEC 轮次给 null。
 */
export function eeCmpOf(x: EeCmpIn): EeCmp | null {
  const hist = fedHistOf(x.draws)
  const cec = histAtOf({ hist, key: FED_CEC })
  const cecLast = cec[0]
  if (cecLast == null || cecLast.score == null || x.cats.length === 0) {
    return null
  }
  const cecScore = cecLast.score
  const cecName = eeKeyDisplay({ t: x.t, key: FED_CEC })
  const groups: EeCmpGroup[] = []
  const lines: EeCmpLine[] = []
  for (const c of x.cats) {
    const dim = eeIsDormant(c.drawDate)
    const name = eeDisplay({ t: x.t, label: c.label })
    const draws = histAtOf({ hist, key: c.key })
    groups.push(cmpGroupOf({
      t: x.t,
      none: x.t('eecmp.none'),
      sub: TEXT_NONE,
      lang: x.lang,
      key: c.key,
      name,
      tip: TEXT_NONE,
      date: c.drawDate,
      score: c.drawCrs,
      draws,
      dim,
      hit: true,
      perMonth: false,
    }))
    if (dim === false && c.drawCrs != null) {
      lines.push(cmpLineOf({ t: x.t, key: c.key, cat: name, cec: cecName, diff: c.drawCrs - cecScore }))
    }
  }
  groups.push(cmpGroupOf({
    t: x.t,
    none: x.t('eecmp.none'),
    sub: TEXT_NONE,
    lang: x.lang,
    key: FED_CEC,
    name: cecName,
    tip: TEXT_NONE,
    date: cecLast.drawDate,
    score: cecScore,
    draws: cec,
    dim: false,
    hit: false,
    perMonth: false,
  }))
  const fr = histAtOf({ hist, key: FED_FRENCH })
  const frLast = fr[0]
  if (frLast != null) {
    groups.push(cmpGroupOf({
      t: x.t,
      none: x.t('eecmp.none'),
      sub: TEXT_NONE,
      lang: x.lang,
      key: FED_FRENCH,
      name: eeKeyDisplay({ t: x.t, key: FED_FRENCH }),
      tip: x.t('eecmp.frenchTip'),
      date: frLast.drawDate,
      score: frLast.score,
      draws: fr,
      dim: false,
      hit: false,
      perMonth: false,
    }))
  }
  return { groups, lines }
}

/**
 * 本岗 PNP 格写的通用通道在本省抽选卡里对应哪一组(2026-09-23 Frank「所以这个 NB 技术工人点进去应该哪个高亮」)。
 * 格子写的是具名清单通道或不可提名时不高亮(具名清单与抽选组的对照要等数据层把 rule_streams 对上号)。
 * 2026-09-24 改名 drawHitStreamsOf(原 genDrawStreamOf)、改回多组:具名清单通道按 NAMED_DRAW_STREAMS 对组
 * (Frank「AB 医疗也走机会通道?」「点进去应该哪个高亮」),对不上的照旧不高亮。
 *
 * @param job 本岗。
 * @returns 抽选行 stream 原值的清单;空列 = 不高亮。
 */
export function drawHitStreamsOf(job: PnpJob): string[] {
  if (job.pnpStream !== TEXT_NONE) {
    const named = NAMED_DRAW_STREAMS[job.pnpStream]
    if (named == null) {
      return []
    }
    return named
  }
  if (job.pnpEligible === false) {
    return []
  }
  const s = GEN_DRAW_STREAM[job.province]
  if (s == null) {
    return []
  }
  return [s]
}

/**
 * 省提名弹框的本省抽选分组(2026-09-23 Frank「这个要不要分类」「和 EE 那个一样」「这样我就知道可提名的和在紧缺名单的分差多少」):
 * 按通道(官方轮次名)分组,组头 = 最近一轮带分的那轮(同日有一轮没公布分的不拿来当组头),点开列全部轮次,组按最近一轮日期降序
 * —— 各通道分数上下对齐,定向轮与不限职业的轮一眼可比。组件与组形照抄 EE 分数线卡(cmpGroupOf / EeCmpGroupView)。
 * 本岗对应哪一轮、差多少分要等数据层把「抽选通道 ↔ 职业清单」对上号(抽选行的 rule_streams 现在全空),这一版只分组不标本岗。
 * 同日 Frank「大标题都改成英文」:组名一律用官方英文通道名(原先中文界面有中文名用中文、没有用英文,一张卡里中英混排);
 * 中文名留在展开后各轮的灰注里。
 * 同日又改:「这种中文灰字翻译只显示一个就行了吧」→ 中文名只在组头名字下灰字出一次,各轮不再逐行重复;
 * 「这个没有分数需要显示横线吧」→ 没公布分的组头改写那一轮发了多少份邀请,邀请数也没有就空着。
 * 同日「所以这个 NB 技术工人点进去应该哪个高亮」:本岗 PNP 格写的通道对应的组(drawHitStreamsOf)琥珀高亮、排最前。
 * 2026-09-26 晚 Frank「全站高亮要不要都改成蓝色」:本岗高亮改浅蓝(样式见 pnp.module.css 的 .cmpHit;琥珀全站另有提示 / 付费的意思)。
 *
 * @param x 取词函数、界面语言、省码、全部抽选行与本岗对应的那一组。
 * @returns 各组(没有抽选给空列)。
 */
export function pnpDrawGroupsOf(x: PnpDrawGroupsOfIn): EeCmpGroup[] {
  const hist = provDrawHistOf({ province: x.province, draws: x.draws })
  const groups: EeCmpGroup[] = []
  for (const [key, arr] of hist) {
    arr.sort(byDrawDateDesc)
    const head = scoredHeadOf(arr)
    if (head == null) {
      continue
    }
    groups.push(cmpGroupOf({
      t: x.t,
      none: invTextOf({ t: x.t, draw: head }),
      sub: zhSubOf({ lang: x.lang, draw: head }),
      lang: x.lang,
      key,
      name: head.stream,
      tip: TEXT_NONE,
      date: head.drawDate,
      score: head.score,
      draws: arr,
      dim: false,
      hit: x.hitStreams.includes(key),
      perMonth: false,
    }))
  }
  groups.sort(byGroupHitDateDesc)
  return groups
}

/**
 * 按月公布的省(NS)那一组(2026-09-27 Frank「NS 这个省 弹框怎么都是汇总数据」「还是横着排的」):
 * 官方只按月公布 EOI 池的总选取人数、不分通道,原先一月一格横排在琥珀 / 浅蓝底块里;改成与其余省同一种组头行 ——
 * 组头 = 最近一个月(人数写「人入选」,计数写「N 个月」不写「N 轮」),点开逐月一行;官方写的职业重点(抽选行 note)挂组头悬停。
 * 本岗在本省可提名时(GEN_DRAW_STREAM 登记了 NS)这一组就是本岗通道的抽选,标命中。
 *
 * @param x 取词函数、界面语言、省码、全部抽选行与本岗对应的组。
 * @returns 这一组;本省没有按月的行给 null。
 */
function monthlyGroupOf(x: PnpDrawGroupsOfIn): EeCmpGroup | null {
  const months = monthRowsOf({ province: x.province, draws: x.draws })
  const head = months[0]
  if (head == null) {
    return null
  }
  return cmpGroupOf({
    t: x.t,
    none: invTextOf({ t: x.t, draw: head }),
    sub: zhSubOf({ lang: x.lang, draw: head }),
    lang: x.lang,
    key: head.stream,
    name: head.stream,
    tip: head.note,
    date: head.drawDate,
    score: null,
    draws: months,
    dim: false,
    hit: x.hitStreams.includes(head.stream),
    perMonth: true,
  })
}

/**
 * 分组形的本省抽选卡(2026-09-26 /fe 首页 Frank「止血 + 补完整」,效果图点头 —— 原先阿省一框铺满 13 组):
 * 本岗那一组(格子写的通道对得上的组,drawHitStreamsOf)单独摊开成三格 + 灰字统计;其余组收进「查看全省 N 组」,
 * 展开后照旧组头一行(pnpDrawGroupsOf 那一套)。对不上本岗那一组时整卡只剩开关,不拿别的组冒充「本岗那一组」。
 * 同日晚 Frank「这部分怎么改的这么乱了」「默认也别合并啊」:标题只留「本省最近抽选」(pnpdraws.head),轮次标签 label 由卡里
 * 另起一行灰字;原为 drawsTitleOf 拼成「本省最近抽选 BC PNP Skills Immigration」一行中英混排(地点弹框的省份卡仍用 drawsTitleOf)。
 * 其余组改为默认展开(开合初值见 usePnpList)。
 * 同晚 Frank「上面这个高亮是不是格式改成和下面的一样的」:本岗那一组不再单独摊开(三格 + 灰字统计 + 另一套折叠记号撤),
 * 改成与其余组同一种组头行,排最前、浅蓝底,开关收起时也留着;「来源」挪到卡片标题那一行右端(本省抽选页,三种卡同一处)。
 * 2026-09-27 按月公布的省(NS)也走这张卡:按月那一组(monthlyGroupOf)排在带日期的各组之后(NS 只有这一组)。
 * 同日改制省(安省)也走这张卡:只出改制后那一组(statusGroupOf),改制前的旧通道分组不出(旧通道已全部废止)。
 *
 * @param x 取词函数、界面语言、省码、全部抽选行与本岗对应的组。
 * @returns 抽选卡;本省分不出组给 null。
 */
export function drawCardOf(x: DrawCardOfIn): DrawCard | null {
  const gx: PnpDrawGroupsOfIn = {
    t: x.t,
    lang: x.lang,
    province: x.province,
    draws: x.draws,
    hitStreams: x.hitStreams,
  }
  let groups: EeCmpGroup[] = []
  if (drawsFormOf({ province: x.province, draws: x.draws }) === DRAWS_FORM_STATUS) {
    const status = statusGroupOf(gx)
    if (status != null) {
      groups.push(status)
    }
  } else {
    groups = pnpDrawGroupsOf(gx)
    const monthly = monthlyGroupOf(gx)
    if (monthly != null) {
      groups.push(monthly)
    }
  }
  if (groups.length === 0) {
    return null
  }
  const hits: EeCmpGroup[] = []
  const others: EeCmpGroup[] = []
  for (const g of groups) {
    if (g.hit) {
      hits.push(g)
    } else {
      others.push(g)
    }
  }
  const first = firstDrawOf(drawRowsOf({ province: x.province, draws: x.draws, reform: null, limit: null }))
  let label = TEXT_NONE
  let source: SourceLink | null = null
  if (first != null) {
    label = first.label
    source = sourceLinkOf({ t: x.t, url: first.url })
  }
  return {
    title: x.t('pnpdraws.head'),
    label,
    hits,
    others,
    total: groups.length,
    source,
    ytd: ytdLineOf({ t: x.t, province: x.province, ops: x.ops }),
  }
}

/**
 * 抽选卡标题下「全年已发邀请 / 已入选」那一行(2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」、勾「全年已邀请合计」):
 * 读汇装出的 invitations_ytd(逐轮邀请加总)/ selections_ytd(NS 按月选取人数加总);汇装那边当年任一轮没公布人数就不出这一行,
 * 这里不自己加(前端不换算)。AIP 那组的「份申请入选」不在邀请合计里(汇装已剔)。
 *
 * @param x 取词函数、省码与当年配额行。
 * @returns 那一行;这一省没有合计给 ''。
 */
export function ytdLineOf(x: YtdLineIn): string {
  const rows: PnpOps[] = []
  for (const r of x.ops) {
    if (r.province === x.province && r.scopeKind === TEXT_NONE) {
      rows.push(r)
    }
  }
  const inv = opsPickOf({ rows, streamKey: TEXT_NONE, metrics: [OPS_INV_YTD] })
  if (inv != null) {
    return x.t('pnpdraws.ytdInv', { year: yearOf(inv), n: inv.value.toLocaleString(NUM_LOCALE) })
  }
  const sel = opsPickOf({ rows, streamKey: TEXT_NONE, metrics: [OPS_SEL_YTD] })
  if (sel != null) {
    return x.t('pnpdraws.ytdSel', { year: yearOf(sel), n: sel.value.toLocaleString(NUM_LOCALE) })
  }
  return TEXT_NONE
}

/**
 * 「{年} 年配额」卡(2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」;看过效果图,标题照 Frank「每个框先设计一个 title」那张表):
 * 列 = 总数 / 已发提名 / 剩余,只列这个省官方有的项(安省只有总数就只一列,不拿长横凑);行 = 全省,本岗对应的抽选组与配额行的
 * 通道键对得上(阿省公布到通道)再加「本岗通道」一行;表下「截至 {日期}」取官方写的截至日,没写就不出。数字全是官方原数,不自己减。
 *
 * @param x 取词函数、省码、当年配额行与本岗对应的抽选组。
 * @returns 配额卡;这一省当年一项都没有给 null。
 */
export function quotaCardOf(x: QuotaCardOfIn): QuotaCardSpec | null {
  const mine: PnpOps[] = []
  for (const r of x.ops) {
    if (r.province === x.province) {
      mine.push(r)
    }
  }
  const cols: string[][] = []
  const heads: string[] = []
  for (const [metrics, head] of QUOTA_COLS) {
    if (opsPickOf({ rows: mine, streamKey: TEXT_NONE, metrics }) != null) {
      cols.push(metrics)
      heads.push(x.t(head))
    }
  }
  const firstCol = cols[0]
  if (firstCol == null) {
    return null
  }
  const first = opsPickOf({ rows: mine, streamKey: TEXT_NONE, metrics: firstCol })
  if (first == null) {
    return null
  }
  const rows = [quotaRowOf({ rows: mine, streamKey: TEXT_NONE, cols, label: x.t('pnpquota.prov') })]
  const streamKey = quotaStreamKeyOf({ rows: mine, hitStreams: x.hitStreams })
  if (streamKey !== TEXT_NONE) {
    rows.push(quotaRowOf({ rows: mine, streamKey, cols, label: x.t('pnpquota.stream') }))
  }
  let asOf = TEXT_NONE
  if (first.asOf !== TEXT_NONE) {
    asOf = x.t('pnpquota.asOf', { date: first.asOf })
  }
  return {
    title: x.t('pnpquota.title', { year: yearOf(first) }),
    source: sourceLinkOf({ t: x.t, url: first.url }),
    heads,
    rows,
    asOf,
  }
}

/**
 * 配额卡的一行:逐列在这一层(全省 / 某通道)挑那一项的官方数,千分位;这一层没有这一项写长横(列是按全省有的项开的,
 * 通道那一行可能缺某一项 —— 如阿省执法通道只公布了配额)。
 *
 * @param x 这一省的配额行、层级、列与行名。
 * @returns 一行。
 */
function quotaRowOf(x: QuotaRowIn): QuotaRowSpec {
  const cells: string[] = []
  for (const metrics of x.cols) {
    const r = opsPickOf({ rows: x.rows, streamKey: x.streamKey, metrics })
    if (r == null) {
      cells.push(DASH)
    } else {
      cells.push(r.value.toLocaleString(NUM_LOCALE))
    }
  }
  return { key: x.label, label: x.label, cells }
}

/**
 * 本岗对应的抽选组在配额行里是哪条通道:抽选组名小写后与通道级配额行的通道键逐字相等才算(阿省机会通道、旅游酒店通道这类);
 * 对不上给 '' —— 不拿近似名硬配(医护那组抽选名与配额名单复数不同,就不出通道那一行)。
 *
 * @param x 这一省的配额行与本岗对应的抽选组。
 * @returns 通道键;对不上给 ''。
 */
function quotaStreamKeyOf(x: QuotaStreamIn): string {
  for (const h of x.hitStreams) {
    const k = h.toLowerCase()
    for (const r of x.rows) {
      if (r.scopeKind === OPS_SCOPE_STREAM && r.streamKey === k) {
        return k
      }
    }
  }
  return TEXT_NONE
}

/**
 * 在一省的配额行里挑一行:层级对(streamKey 空 = 全省那一层,否则通道级且通道键相等)、指标名在认的那几个里。
 *
 * @param x 这一省的配额行、层级与指标名。
 * @returns 那一行;没有给 null。
 */
function opsPickOf(x: OpsPickIn): PnpOps | null {
  for (const r of x.rows) {
    if (x.metrics.includes(r.metric) === false) {
      continue
    }
    if (x.streamKey === TEXT_NONE && r.scopeKind === TEXT_NONE) {
      return r
    }
    if (x.streamKey !== TEXT_NONE && r.scopeKind === OPS_SCOPE_STREAM && r.streamKey === x.streamKey) {
      return r
    }
  }
  return null
}

/**
 * 配额小表的网格类:列数随这一省官方有几项变(1–3 列值 + 1 列行名),一个列数一个类,不写内联样式。
 *
 * @param n 值的列数。
 * @returns 类名。
 */
export function quotaGridClsOf(n: number): string {
  const byCount = [cssOf(css.quotaCols1), cssOf(css.quotaCols2), cssOf(css.quotaCols3)]
  let cols = byCount[byCount.length - 1]
  const pick = byCount[n - 1]
  if (pick != null) {
    cols = pick
  }
  return cssOf(css.quotaGrid) + SPACE + String(cols)
}

/**
 * 配额行是哪一年的:统计期打头(`2026`、`2026 Jan-Aug`、`2026Q2`),没有统计期看截至日。
 *
 * @param r 一行配额。
 * @returns 年份(4 位)。
 */
function yearOf(r: PnpOps): string {
  if (r.period !== TEXT_NONE) {
    return r.period.slice(0, YEAR_LEN)
  }
  return r.asOf.slice(0, YEAR_LEN)
}

/**
 * 「本岗通道的门槛」卡(2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」,看过效果图;版式照公司信息卡「行名 - 值」一行一条):
 * 行 = 雇主 offer / 语言 / 工作经验 / EE / 雇主 / 其他,只出本岗通道官方有的项 —— 门槛表(pnp_requirements)里挑,挑不到的行
 * 不出;本岗通道那几条流一行门槛都没有就不出卡(只剩全省那两行会读成门槛只有这些)。语言按本岗职业码 → TEER → 不限挑那一档;
 * 每行点开看官方原句。只陈列门槛,不判「你够不够」。本岗通道 → 门槛表里的流靠 NAMED_REQ_STREAMS / GEN_REQ_STREAMS 对照
 * (先上 AB,别的省没登记就不出卡)。
 *
 * @param x 取词函数、本岗与门槛表。
 * @returns 门槛卡;本岗通道没登记对照或没有门槛行给 null。
 */
export function gateCardOf(x: GateCardOfIn): GateCardSpec | null {
  const streams = gateStreamsOf(x.job)
  if (streams.length === 0) {
    return null
  }
  const mine: PnpReq[] = []
  const chan: PnpReq[] = []
  for (const r of x.reqs) {
    if (r.province !== x.job.province) {
      continue
    }
    mine.push(r)
    if (streams.includes(r.stream)) {
      chan.push(r)
    }
  }
  if (chan.length === 0) {
    return null
  }
  const one: GateRowOfIn = { t: x.t, job: x.job, mine, chan }
  const rows: GateRowSpec[] = []
  for (const row of [offerRowOf(one), langRowOf(one), expRowOf(one), eeRowOf(one), empRowOf(one), otherRowOf(one)]) {
    if (row != null) {
      rows.push(row)
    }
  }
  return { title: x.t('pnpgate.title'), source: sourceLinkOf({ t: x.t, url: gateUrlOf({ chan }) }), rows }
}

/**
 * 本岗通道在门槛表里对应哪几条流(口径同 drawHitStreamsOf:具名通道查 NAMED_REQ_STREAMS,落省默认通道查 GEN_REQ_STREAMS)。
 *
 * @param job 本岗。
 * @returns 流名;没登记给空数组。
 */
function gateStreamsOf(job: PnpJob): string[] {
  if (job.pnpStream !== TEXT_NONE) {
    const named = NAMED_REQ_STREAMS[job.pnpStream]
    if (named == null) {
      return []
    }
    return named
  }
  if (job.pnpEligible === false) {
    return []
  }
  const s = GEN_REQ_STREAMS[job.province]
  if (s == null) {
    return []
  }
  return s
}

/**
 * 标题右端来源的出处页:本岗通道第一条带网址的门槛行。
 *
 * @param x 本岗通道的门槛行。
 * @returns 网址;都没有给 ''。
 */
function gateUrlOf(x: GateUrlIn): string {
  for (const r of x.chan) {
    if (r.url !== TEXT_NONE) {
      return r.url
    }
  }
  return TEXT_NONE
}

/**
 * 「雇主 offer」行:全职 + 不收哪几种(offer 形态行的编码值,按 GATE_FORM_ORDER 排),下面灰字摆本岗的工时 / 雇佣期;
 * 点开是 offer 形态原文与本岗通道各流的 offer 条文。
 * 同日 375 实拍:「全职」与「不收……」分两行(一行一条;挤一行时窄屏折断在词中间)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;本省没登记 offer 形态给 null。
 */
function offerRowOf(x: GateRowOfIn): GateRowSpec | null {
  const form = rowOfFactor({ rows: x.mine, factor: GATE_F.offerForm })
  if (form == null) {
    return null
  }
  const code = basisValueOf({ basis: form.basis, key: BASIS_VALUE_CODE }).split(VALUE_CODE_SEP)
  const names: string[] = []
  for (const f of GATE_FORM_ORDER) {
    if (code.includes(f)) {
      names.push(x.t(GATE_FORM_HEAD + f))
    }
  }
  if (names.length === 0) {
    return null
  }
  const quoted = [form]
  for (const r of x.chan) {
    if (r.factor === GATE_F.jobOffer) {
      quoted.push(r)
    }
  }
  return {
    key: GATE_ROW.offer,
    label: x.t('pnpgate.k.offer'),
    lines: [x.t('pnpgate.offerFull'), capFirstOf(x.t('pnpgate.offerNot', { list: names.join(x.t('pnpgate.sep')) }))],
    sub: mineLineOf({ t: x.t, job: x.job }),
    quotes: quotesOf(quoted),
  }
}

/**
 * 「本岗 全职、长期」那行灰字(工时、雇佣期用职位板同一套词;原帖都没写给「原帖未写明」)。
 *
 * @param x 取词函数与本岗。
 * @returns 灰字。
 */
function mineLineOf(x: MineLineIn): string {
  const parts: string[] = []
  if (x.job.employmentHours !== TEXT_NONE) {
    parts.push(x.t(GATE_EMP_HEAD + x.job.employmentHours))
  }
  if (x.job.employmentTerm !== TEXT_NONE) {
    parts.push(x.t(GATE_TERM_HEAD + x.job.employmentTerm))
  }
  let v = x.t('fact.unstated')
  if (parts.length > 0) {
    v = parts.join(x.t('pnpgate.sep'))
  }
  return x.t('pnpgate.mine', { v })
}

/**
 * 「语言」行:本岗通道的 CLB 门槛挑一档(职业码点名的 → 本岗 TEER 那档 → 不限档)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;挑不出给 null。
 */
function langRowOf(x: GateRowOfIn): GateRowSpec | null {
  const langs: PnpReq[] = []
  for (const r of x.chan) {
    if (r.factor === GATE_F.language && r.op === GATE_OP_GE && r.unit === GATE_UNIT_CLB && r.value != null) {
      langs.push(r)
    }
  }
  const row = langPickOf({ rows: langs, job: x.job })
  if (row == null || row.value == null) {
    return null
  }
  return {
    key: GATE_ROW.lang,
    label: x.t('pnpgate.k.lang'),
    lines: [x.t('pnpgate.lang', { n: row.value })],
    sub: TEXT_NONE,
    quotes: quotesOf([row]),
  }
}

/**
 * 在语言行里挑本岗那一档:职业码前缀点名的最具体,其次本岗 TEER 所在的档,最后不限 TEER 也不限职业的那行。
 *
 * @param x 语言行与本岗。
 * @returns 那一行;都不适用给 null。
 */
function langPickOf(x: LangPickIn): PnpReq | null {
  let byTeer: PnpReq | null = null
  let general: PnpReq | null = null
  for (const r of x.rows) {
    if (r.appliesNoc !== TEXT_NONE) {
      if (nocHitOf({ noc: x.job.noc, applies: r.appliesNoc })) {
        return r
      }
      continue
    }
    if (r.appliesTeer !== TEXT_NONE) {
      if (byTeer == null && teerHitOf({ teer: x.job.teer, applies: r.appliesTeer })) {
        byTeer = r
      }
      continue
    }
    if (general == null) {
      general = r
    }
  }
  if (byTeer != null) {
    return byTeer
  }
  return general
}

/**
 * 本岗职业码落不落在门槛行点名的前缀里。
 *
 * @param x 职业码与前缀串。
 * @returns 落在给 true。
 */
function nocHitOf(x: NocHitIn): boolean {
  if (x.noc === TEXT_NONE) {
    return false
  }
  for (const p of x.applies.split(VALUE_CODE_SEP)) {
    const head = p.trim()
    if (head !== TEXT_NONE && x.noc.startsWith(head)) {
      return true
    }
  }
  return false
}

/**
 * 本岗 TEER 在不在门槛行的 TEER 档里。
 *
 * @param x TEER 与档位串。
 * @returns 在给 true;本岗未分类给 false。
 */
function teerHitOf(x: TeerHitIn): boolean {
  if (x.teer == null) {
    return false
  }
  for (const p of x.applies.split(VALUE_CODE_SEP)) {
    if (p.trim() === String(x.teer)) {
      return true
    }
  }
  return false
}

/**
 * 「工作经验」行:通用那条(近 N 个月内 / 同雇主在职)一行,阿省境内替代款「或……」另起一行。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;本岗通道没有按月计的经验门槛给 null。
 */
function expRowOf(x: GateRowOfIn): GateRowSpec | null {
  let main: PnpReq | null = null
  let local: PnpReq | null = null
  for (const r of x.chan) {
    if (r.factor !== GATE_F.experience || r.unit !== GATE_UNIT_MONTHS || r.value == null) {
      continue
    }
    if (r.appliesCondition === TEXT_NONE && main == null) {
      main = r
    }
    if (r.appliesCondition === GATE_COND_LOCAL && local == null) {
      local = r
    }
  }
  if (main == null || main.value == null) {
    return null
  }
  const lines = [expLineOf({ t: x.t, r: main, n: main.value })]
  const quoted = [main]
  if (local != null && local.value != null) {
    const w = basisValueOf({ basis: local.basis, key: BASIS_WINDOW })
    if (w !== TEXT_NONE) {
      lines.push(x.t('pnpgate.expLocal', { n: local.value, w, prov: x.t(PROV_KEY_HEAD + x.job.province) }))
      quoted.push(local)
    }
  }
  return { key: GATE_ROW.exp, label: x.t('pnpgate.k.exp'), lines, sub: TEXT_NONE, quotes: quotesOf(quoted) }
}

/**
 * 通用经验那一条的写法:同雇主在职 / 近 N 个月内 / 只写月数。
 *
 * @param x 取词函数、经验行与月数。
 * @returns 文案。
 */
function expLineOf(x: ExpLineIn): string {
  if (basisHasOf({ basis: x.r.basis, key: BASIS_TENURE })) {
    return x.t('pnpgate.expTenure', { n: x.n })
  }
  const w = basisValueOf({ basis: x.r.basis, key: BASIS_WINDOW })
  if (w !== TEXT_NONE) {
    return x.t('pnpgate.expWin', { n: x.n, w })
  }
  return x.t('pnpgate.exp', { n: x.n })
}

/**
 * 「EE」行(科技、警务这类 EE 流):联邦 EE 档案、符合 CEC / FSW / FST、CRS 线,有哪条列哪条。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;本岗通道不是 EE 流给 null。
 */
function eeRowOf(x: GateRowOfIn): GateRowSpec | null {
  const parts: string[] = []
  const quoted: PnpReq[] = []
  const profile = rowOfFactor({ rows: x.chan, factor: GATE_F.eeProfile })
  if (profile != null) {
    parts.push(x.t('pnpgate.eeProfile'))
    quoted.push(profile)
  }
  const program = rowOfFactor({ rows: x.chan, factor: GATE_F.eeProgram })
  if (program != null) {
    parts.push(x.t('pnpgate.eeProgram'))
    quoted.push(program)
  }
  const crs = rowOfFactor({ rows: x.chan, factor: GATE_F.crs })
  if (crs != null && crs.value != null) {
    parts.push(x.t('pnpgate.crs', { n: crs.value }))
    quoted.push(crs)
  }
  if (parts.length === 0) {
    return null
  }
  return {
    key: GATE_ROW.ee,
    label: x.t('pnpgate.k.ee'),
    lines: parts.map(capFirstOf),
    sub: TEXT_NONE,
    quotes: quotesOf(quoted),
  }
}

/**
 * 「雇主」行:本省雇主侧三项(经营年限 / 年收入 / 全职员工),只取不分区的全省那档(分区的省后面批次再接)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;本省没有雇主侧门槛给 null。
 */
function empRowOf(x: GateRowOfIn): GateRowSpec | null {
  const emp: PnpReq[] = []
  for (const r of x.mine) {
    if (r.subject === GATE_SUBJECT_EMPLOYER && r.appliesArea === TEXT_NONE && r.value != null) {
      emp.push(r)
    }
  }
  const prov = x.t(PROV_KEY_HEAD + x.job.province)
  const parts: string[] = []
  const quoted: PnpReq[] = []
  const years = rowOfFactor({ rows: emp, factor: GATE_F.empYears })
  if (years != null && years.value != null) {
    parts.push(x.t('pnpgate.empYears', { n: years.value, prov }))
    quoted.push(years)
  }
  const revenue = rowOfFactor({ rows: emp, factor: GATE_F.empRevenue })
  if (revenue != null && revenue.value != null) {
    parts.push(x.t('pnpgate.empRevenue', { n: revenue.value.toLocaleString(NUM_LOCALE) }))
    quoted.push(revenue)
  }
  const staff = rowOfFactor({ rows: emp, factor: GATE_F.empStaff })
  if (staff != null && staff.value != null) {
    parts.push(x.t('pnpgate.empStaff', { n: staff.value }))
    quoted.push(staff)
  }
  if (parts.length === 0) {
    return null
  }
  return {
    key: GATE_ROW.emp,
    label: x.t('pnpgate.k.emp'),
    lines: parts.map(capFirstOf),
    sub: TEXT_NONE,
    quotes: quotesOf(quoted),
  }
}

/**
 * 「其他」行:指定社区推荐信、职业执照或注册(乡村振兴、医护专项这类流才有)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;都没有给 null。
 */
function otherRowOf(x: GateRowOfIn): GateRowSpec | null {
  const parts: string[] = []
  const quoted: PnpReq[] = []
  const endorse = rowOfFactor({ rows: x.chan, factor: GATE_F.endorse })
  if (endorse != null) {
    parts.push(x.t('pnpgate.endorse'))
    quoted.push(endorse)
  }
  const licensing = rowOfFactor({ rows: x.chan, factor: GATE_F.licensing })
  if (licensing != null) {
    parts.push(x.t('pnpgate.licensing'))
    quoted.push(licensing)
  }
  if (parts.length === 0) {
    return null
  }
  return {
    key: GATE_ROW.other,
    label: x.t('pnpgate.k.other'),
    lines: parts.map(capFirstOf),
    sub: TEXT_NONE,
    quotes: quotesOf(quoted),
  }
}

/**
 * 一行首字母大写(英文各项词条一律小写起头,排第几由数据定,落成行再把行首大写;中文、韩文没有大小写,原样返回)。
 * 同日 375 实拍后雇主 / EE / 其他三行改一项一行(顿号连成一行窄屏折断在项中间),每项各自成行、各自行首大写。
 *
 * @param s 拼好的一行。
 * @returns 行首大写后的文案。
 */
function capFirstOf(s: string): string {
  if (s === TEXT_NONE) {
    return s
  }
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * 门槛行里第一条是这个因素的。
 *
 * @param x 门槛行与因素名。
 * @returns 那一行;没有给 null。
 */
function rowOfFactor(x: RowOfFactorIn): PnpReq | null {
  for (const r of x.rows) {
    if (r.factor === x.factor) {
      return r
    }
  }
  return null
}

/**
 * 几条门槛行 → 点开露出的原文:有逐字原文(valueText)用它,没有用 label(那几条的 label 就是官方原文);同一句只出一次。
 *
 * @param rows 门槛行。
 * @returns 原文。
 */
function quotesOf(rows: PnpReq[]): GateQuote[] {
  const out: GateQuote[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    let text = r.valueText
    if (text === TEXT_NONE) {
      text = r.label
    }
    if (text === TEXT_NONE || seen.has(text)) {
      continue
    }
    seen.add(text)
    out.push({ key: text, text })
  }
  return out
}

/**
 * 口径包里某个键的值(`windowMonths=30;valueCode=part,casual` 里取 windowMonths)。
 *
 * @param x 口径包与键。
 * @returns 值;没有给 ''。
 */
function basisValueOf(x: BasisKeyIn): string {
  const head = x.key + BASIS_KV
  for (const p of x.basis.split(BASIS_SEP)) {
    if (p.startsWith(head)) {
      return p.slice(head.length)
    }
  }
  return TEXT_NONE
}

/**
 * 口径包里有没有这个标记(`employerTenure` 这种不带值的,或带值的键)。
 *
 * @param x 口径包与键。
 * @returns 有给 true。
 */
function basisHasOf(x: BasisKeyIn): boolean {
  for (const p of x.basis.split(BASIS_SEP)) {
    if (p === x.key || p.startsWith(x.key + BASIS_KV)) {
      return true
    }
  }
  return false
}


/**
 * 「查看全省 N 组」那个开关的字(展开后改「收起」,同清单卡末尾的开关)。
 *
 * @param x 取词函数、展开态、全省组数与轮次标签。
 * @returns 开关的字。
 */
export function allGroupsLabelOf(x: AllGroupsLabelIn): string {
  if (x.open) {
    return x.t('pnplist.foldOther')
  }
  return x.t('pnpfacts.allGroups', { n: x.total, label: x.label })
}

/**
 * 没公布分的组头写什么:那一轮发了多少份邀请;邀请数也没有就空着(不出长横)。
 * 2026-09-23 同日并进 AIP 文案、改名 invTextOf(原 headInvOf),抽选行也走这一处:AIP 那组的数字是选中进入审理的申请
 * (见 DRAW_STREAM_AIP),写「份申请入选」,不写「份邀请」。
 * 2026-09-26 /fe 首页 Frank「止血 + 补完整」:NS 的数字是每月从 EOI 池选取的人数,写「人入选」(DRAW_SELECT_PROVS);
 * 三种口径的词条收进 COUNT_ROW_KEY 一张表(countKindOf 判口径)。
 *
 * @param x 取词函数与这一轮。
 * @returns 文字;''=没公布。
 */
function invTextOf(x: InvTextIn): string {
  if (x.draw.invitations == null) {
    return TEXT_NONE
  }
  return x.t(COUNT_ROW_KEY[countKindOf(x.draw)], { n: x.draw.invitations })
}

/**
 * 这一轮的人数是什么口径:AIP 那组 = 选中进入审理的申请;官方写「选取」的省 = 从 EOI 池选取的人;其余 = 发出的邀请。
 *
 * @param draw 这一轮。
 * @returns 人数口径。
 */
function countKindOf(draw: PnpDraw): CountKind {
  if (draw.stream === DRAW_STREAM_AIP) {
    return COUNT_AIP
  }
  if (DRAW_SELECT_PROVS.has(draw.province)) {
    return COUNT_SEL
  }
  return COUNT_INV
}

/**
 * 组头名字下的灰字:中文界面出通道中文名(与英文名同字或没有中文名就不出)。
 * 2026-09-26 晚 Frank「上下名字怎么对不上」「名字都用一个不行么」:先查人工定表 drawStreamNote —— 与本站通道同一个项目的
 * 那几组直接就是通道名(同职位板 PNP 格、弹框通道卡),也是 /start 抽选表走的同一个出口;表里没有的,中文界面才退回数据层的
 * 机器译名(原先只看机器译名:BC Build 那组叫「建筑业技工通道」,上面通道卡叫「BC 建筑技工」)。韩文界面随之也出表里的译名。
 *
 * @param x 界面语言与组头那一轮。
 * @returns 灰字;''=不出。
 */
function zhSubOf(x: ZhSubIn): string {
  const note = drawStreamNote({ stream: x.draw.stream, lang: x.lang })
  if (note !== TEXT_NONE) {
    return note
  }
  if (x.lang !== LANG_ZH || x.draw.streamZh === x.draw.stream) {
    return TEXT_NONE
  }
  return x.draw.streamZh
}

/**
 * 一组的组头那一轮:最近一轮带分的(同日两轮、一轮没公布分时不拿它当组头);都没分给最近一轮。
 *
 * @param draws 这一组的历次抽选(降序)。
 * @returns 组头那一轮;空组给 null。
 */
function scoredHeadOf(draws: PnpDraw[]): PnpDraw | null {
  for (const d of draws) {
    if (d.score != null) {
      return d
    }
  }
  const first = draws[0]
  if (first == null) {
    return null
  }
  return first
}

/**
 * 组按最近一轮日期降序。
 * 2026-09-23 同日加一档:本岗对应那组排最前(改名 byGroupHitDateDesc,原 byGroupDateDesc)。
 *
 * @param a 前一组。
 * @param b 后一组。
 * @returns 排序位次。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byGroupHitDateDesc(a: EeCmpGroup, b: EeCmpGroup): number {
  if (a.hit !== b.hit) {
    return Number(b.hit) - Number(a.hit)
  }
  if (a.date < b.date) {
    return 1
  }
  if (a.date > b.date) {
    return -1
  }
  return 0
}

/**
 * 联邦轮次按类别键分组(pnp_draws 的 province=FED 抽选行,label = 类别键;每组按日期降序)。
 *
 * @param draws 全部抽选行。
 * @returns 类别键 → 历次抽选。
 */
function fedHistOf(draws: PnpDraw[]): DrawHist {
  const m: DrawHist = new Map()
  for (const d of draws) {
    if (d.province !== PROV_FED || d.kind !== KIND_DRAW || d.drawDate === TEXT_NONE) {
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
 * 一组的历次抽选(拿不到就是空列)。
 *
 * @param x 分组表与类别键。
 * @returns 历次抽选。
 */
function histAtOf(x: HistAtIn): PnpDraw[] {
  const hist = x.hist.get(x.key)
  if (hist == null) {
    return []
  }
  return hist
}

/**
 * 一组的展示件:组头 = 最近一轮(最低分 / 日期 / 轮数),点开列全部轮次(照抄省抽选表的行)。
 * 休眠类别的历次轮次可能已过保留窗(联邦行每类只留最近 12 轮),组头仍按类别表带的最近一轮写。
 * 同日 Frank「运输这个只有一个 没法展开」:一轮也给展开(展开才看得到轮次名与邀请数),轮数照写「1 轮」。
 * 2026-09-26 /fe 首页 Frank:英文一轮写「1 round」不再是「1 rounds」—— 一轮单走 eecmp.roundsOne(中韩两门文案同原句)。
 *
 * @param x 一组的原料。
 * @returns 这一组。
 */
function cmpGroupOf(x: CmpGroupIn): EeCmpGroup {
  let score = x.none
  if (x.score != null) {
    score = x.t('pnpdraws.min', { score: x.score })
  }
  const rows = roundRowsOf({ t: x.t, lang: x.lang, draws: x.draws })
  let keys = ROUNDS_KEYS
  if (x.perMonth) {
    keys = MONTHS_KEYS
  }
  let rounds = TEXT_NONE
  if (rows.length === 1) {
    rounds = x.t(keys.one, { n: rows.length })
  } else if (rows.length > 1) {
    rounds = x.t(keys.many, { n: rows.length })
  }
  return {
    key: x.key,
    name: x.name,
    sub: x.sub,
    tip: x.tip,
    score,
    date: x.date,
    rounds,
    dim: x.dim,
    rows,
    expandable: rows.length > 0,
    noScore: x.score == null,
    hit: x.hit,
  }
}

/**
 * 一组点开后的全部轮次(照抄省抽选表的行;中文名只在组头灰字出一次,各轮不再逐行重复 —— 2026-09-23 Frank
 * 「这种中文灰字翻译只显示一个就行了吧」)。2026-09-26 自 cmpGroupOf 体内原样提出:本岗那一组(featOf)展开的也是这一份。
 * 同晚 featOf 随本岗那一组改组头行撤掉,只剩 cmpGroupOf 一处调用。
 * 2026-09-27 Frank「我觉得这种应该拆成两个卡片」→ 选「不拆,去重复」:各轮同一个流名时通道名也不逐行重复(sameStreamOf)。
 *
 * @param x 取词函数、界面语言与这一组的历次抽选。
 * @returns 展示行。
 */
function roundRowsOf(x: RoundRowsIn): DrawRowSpec[] {
  const rows: DrawRowSpec[] = []
  const same = sameStreamOf(x.draws)
  let i = 0
  for (const d of x.draws) {
    const row = toDrawRow({ t: x.t, lang: x.lang, draw: d, index: i, reform: null })
    row.streamZh = TEXT_NONE
    if (same) {
      row.stream = TEXT_NONE
    }
    rows.push(row)
    i += 1
  }
  return rows
}

/**
 * 一组的各轮是不是同一个流名(2026-09-27 Frank「我觉得这种应该拆成两个卡片」→ 选「不拆,去重复」:组头已经写了通道名,各轮是同一个流就不再逐行重复,
 * 只留日期与分数 / 邀请数;流名不一样的组照旧逐行写,那是真有不同的子流)。
 *
 * @param draws 这一组的历次抽选。
 * @returns 全是同一个流名给 true;空组给 false。
 */
function sameStreamOf(draws: PnpDraw[]): boolean {
  const first = draws[0]
  if (first == null) {
    return false
  }
  for (const d of draws) {
    if (d.stream !== first.stream) {
      return false
    }
  }
  return true
}

/**
 * 分差一行:类别比 CEC 低 / 高 / 同分。
 *
 * @param x 取词函数、行键、两个显示名与分差。
 * @returns 分差行。
 */
function cmpLineOf(x: CmpLineIn): EeCmpLine {
  if (x.diff < 0) {
    return { key: x.key, text: x.t('eecmp.lower', { cat: x.cat, cec: x.cec, n: -x.diff }), lower: true }
  }
  if (x.diff > 0) {
    return { key: x.key, text: x.t('eecmp.higher', { cat: x.cat, cec: x.cec, n: x.diff }), lower: false }
  }
  return { key: x.key, text: x.t('eecmp.same', { cat: x.cat, cec: x.cec }), lower: false }
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
 * 分数线卡组头的类名(可点的加按钮手型,休眠 / 从没抽过的压暗)。
 *
 * @param x 压不压暗、可不可点。
 * @returns 类名。
 */
export function cmpHeadClsOf(x: CmpHeadClsIn): string {
  const cls = [cssOf(css.cmpHead)]
  if (x.button) {
    cls.push(cssOf(css.cmpBtn))
  }
  if (x.dim) {
    cls.push(cssOf(css.dim))
  }
  if (x.hit) {
    cls.push(cssOf(css.cmpHit))
  }
  return cls.join(CLS_SEP)
}

/**
 * 组头分数格的类名(写的不是分数时换成常规字重次级灰)。
 *
 * @param x 分数格写的是不是分数。
 * @returns 类名。
 */
export function cmpScoreClsOf(x: CmpScoreClsIn): string {
  const cls = [cssOf(css.cmpScore)]
  if (x.noScore) {
    cls.push(cssOf(css.cmpNoScore))
  }
  return cls.join(CLS_SEP)
}

/**
 * 「本岗能走的通道」一条的类名(细边框盒 + 条目内衬;2026-09-26)。
 * 同日晚 Frank「这部分怎么改的这么乱了」:不再套细边框盒(卡里套卡),只剩条目样式。
 *
 * @returns 类名。
 */
export function channelClsOf(): string {
  return cssOf(css.channel)
}

/**
 * 分差行的类名(低于 CEC 绿字)。
 *
 * @param x 比 CEC 低吗。
 * @returns 类名。
 */
export function cmpLineClsOf(x: CmpLineClsIn): string {
  const cls = [cssOf(css.cmpLine)]
  if (x.lower) {
    cls.push(cssOf(css.cmpLower))
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
  if (x.muted) {
    return baseTagClsOf(TAG_V_GRAY)
  }
  return baseTagClsOf(TAG_V_OK)
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
    pass: baseTagClsOf(TAG_V_OK),
    warn: baseTagClsOf(TAG_V_WARN),
    fail: baseTagClsOf(TAG_V_IMP),
    na: baseTagClsOf(TAG_V_GRAY),
  }
  return toneCls[tone]
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

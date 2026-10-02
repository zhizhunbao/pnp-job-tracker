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
import { makeT } from '@/lib/i18n'
import { cssOf } from '@/components/css'
import { tagClsOf as baseTagClsOf } from '@/components/tag'
import { drawStreamNote, eeDisplay, eeKeyDisplay, isOfferList, match as matchJob, streamDisplay } from '@/lib/jobs'
import { PROV_NAMES } from '@/lib/location'
import { nocLocalTitle } from '@/lib/noc'
import { DAY_MS } from '@/lib/time'
import { track } from '@/lib/track'
import {
  COUNT_AIP, COUNT_INV, COUNT_ROW_KEY, COUNT_SEL, DRAWS_FORM_GROUPS, DRAWS_FORM_MONTHLY, DRAWS_FORM_NONE,
  DRAWS_ALL_KEY, DRAWS_FORM_STATUS, HOST_RE, LANG_EN, LINK_ARROW, MONTH_DATE_LEN, MONTHLY_ROWS_MAX,
  MONTHS_KEYS,
  NUM_LOCALE, OPS_ALLOCATION, OPS_SCOPE_STREAM, PNP_GEN_HEAD, QUOTA_COLS, ROUNDS_KEYS, YEAR_LEN,
  SEL_CAT_HEAD, SEL_CODE_RE, SEL_KEYS, SEL_PATH, SEL_PATH_HEAD, SEL_PATH_SEP, SEL_POINTS, SEL_TOP, SEL_WAGE, TAG_V_GRAY,
  TAG_V_IMP, TAG_V_OK, TAG_V_WARN, AIP_ALIAS_RE, AIP_DROP_RE, AIP_MISS, AIP_NA, AIP_ON, AIP_SUFFIX_RE, ATLANTIC_PROVS,
  CARET_CLOSED, CARET_OPEN, CAT_JOIN, CLS_SEP, COLOR_CAT, COLOR_FED_OTHER, DASH, DAY_START_SUFFIX,
  EE_DORMANT_MONTHS, EV_EMPLOYER_CLICK, FED_CAT_KEY, FED_CEC, FED_FRENCH, FED_TYPE_COLOR,
  KEY_EE_ABOVE, KEY_EE_NOCRS, KEY_EE_NODRAW, KEY_EE_NONE, KEY_LMIA_LOWONLY, KEY_LMIA_NA,
  KEY_NOC_EXACT, KEY_NOC_MINOR, KEY_NOC_NOPROFILE, KEY_NOC_UNCAT, KEY_PROV_EXCLUDED, KEY_PROV_GENERIC, KEY_PROV_NAMED,
  KEY_PROV_NOTTARGET, KEY_PROV_QC, KEY_PROV_UNCOVERED, KEY_SEP, KEY_TEER_CHANNEL, KEY_TEER_OK, KEY_WAGE_ABOVE,
  KEY_WAGE_BELOW, KEY_WAGE_NEAR, KIND_DRAW, KIND_NOTICE, FACTS_KEY_SEP, MATCH_LEVEL_HEAD, MONTH_DAYS, NOC_HEAD,
  PROGRAM_AIP, PROGRAM_PNP, PROV_FED, PROV_KEY_HEAD, PROV_QC, ROWS_FALLBACK, RULE_EE, RULE_LMIA, RULE_NOC, RULE_PROV,
  RULE_TEER, RULE_WAGE, SALARY_DIV, SALARY_HEAD, SALARY_TAIL, SCROLL_BLOCK, SPACE, SPACE_RUN_RE, SRC_PNP, STREAM_REFORM,
  TEER_HEAD, TEER_SHORT_HEAD, TEXT_NONE, TIP_MARK, TONE_FAIL, TONE_NA, TONE_PASS, TONE_WARN, TYPE_INELIGIBLE,
  UNKNOWN_MARK, URL_JOBS_Q_HEAD, BASIS_KV, BASIS_LICENCE, BASIS_OCC_LOW, BASIS_OCC_MEDIAN, BASIS_SAME_NOC, BASIS_SEP,
  BASIS_TENURE,
  BASIS_VALUE_CODE, BASIS_WINDOW, BASIS_WINDOW_YEARS, GATE_AREA_HEAD, GATE_COND_GRAD, GATE_COND_LOCAL,
  GATE_COND_OTHER_PROV, BASIS_PROV_GRADUATE, BASIS_FISCAL, GATE_EMP_FISCAL_KEY,
  GATE_REVENUE_AREA_KEY, GATE_STAFF_AREA_KEY, PNP_BLOCK_CODES, PNP_BLOCK_CARD_CODES, PNP_BLOCK_HEAD, PNP_BLOCK_LIST,
  PNP_BLOCK_OCC, GATE_EMP_MONTHS_KEY, GATE_EMP_YEARS_KEY,
  GATE_F, GATE_FORM_HEAD, GATE_FORM_ORDER, GATE_OP_GE, GATE_ROW, GATE_SUBJECT_EMPLOYER, GATE_UNIT_CLB, GATE_UNIT_MONTHS,
  GATE_UNIT_YEARS, PNP_BLOCK_UNFIT_CODES, PNP_BLOCK_UNFIT_KEY, JOB_NATURE_BLOCKS, CHAN_TAG_HEAD, CHAN_TAG_WARN,
  BASIS_WHERE, BASIS_WHERE_IN_PROV, BASIS_WHERE_ANYWHERE, BASIS_PERMITS, BASIS_PERMIT_SEP, BASIS_NO_IMPLIED, BASIS_PGWP,
  GATE_PERMIT_HEAD,
  PICK_NONE, PICK_PGWP, PICK_NO_PGWP,
  AIP_PATHWAY_KEY, AIP_CHANNEL_TEERS, AIP_F, AIP_TIER_PREFIX, AIP_TIER_SEP, AIP_EDU_HEAD, AIP_GRAD_NOTE,
  GATE_EXP_FACTORS, GATE_OP_NONE, GATE_WAGE_FACTORS, LANG_NOC_NOTE_MAX, CHAN_JOB_TAGS, CHAN_TAG_COMPLEMENT, AIP_APOS_RE,
  AIP_OA_TAIL_RE, CHAN_NOTE_TAGS,
  AIP_HIT_MIN_LEN, BASIS_ANY_NOC, BASIS_EXP_TEER, BASIS_FIELD, BASIS_ONE_NOC, BASIS_PAID, BASIS_RELATED,
  VALUE_CODE_SEP, URL_API_JOBS_PNP, K_KICKER_GROUP, K_KICKER_PROV,
  EXCL_KEY_SEP,
  DRAWS_REFORM_ALL_KEY, FACTOR_EOI_DRAW, OPS_INV_YTD_MIN, OPS_SCOPE_PROGRAM,
  PROGRAM_POOL, QUOTA_MIN_PREFIX, UNIT_APPLICATION, UNIT_SELECTION, YTD_COUNT_KIND, COUNT_INV_ONE_KEY,
  OPS_SCOPE_DRAW_STREAM,
  K_CELL_QC, K_KICKER_QC, QC_BASIS, QC_CELL_HEAD, QC_EDU_HEAD, QC_F, QC_FR_KEY, QC_GENERAL_STREAM, QC_KIND_PARTLY,
  QC_KIND_SCOPE, QC_NAME_HEAD, QC_PROGRAM_PSTQ, QC_PROGRAMS, QC_ROW, QC_SUBJECT_SPOUSE, QC_TEER_DASH, QC_TEER_LIST_SEP,
  QC_TEST_TCF, QC_TEST_TEF, URL_API_JOBS_QC,
} from './constants'
import type {
  AllGroupsLabelIn, ChannelOfIn, ChannelSpec, ChannelsIn, CountKind, DrawCard, DrawCardOfIn, DrawsForm, LatestSinceIn,
  SourceLink, SourceLinkIn, OpsPickIn, PnpOps, QuotaCardOfIn, QuotaCardSpec, QuotaRowIn, QuotaRowSpec, QuotaStreamIn,
  MonthRowsIn, RoundRowsIn, AipVerdict, BoxClsIn, CatNameClsIn, ClickFn, DimClsIn, DrawRowIn, DrawRowSpec, DrawRowsIn,
  DrawsClsIn, EeDrawDateRow, CmpGroupIn, CmpHeadClsIn, CmpLineClsIn, CmpScoreClsIn, CmpLineIn, DrawHist, EeCmp,
  EeCmpGroup, EeCmpIn, EeCmpLine, EeChannelsIn, EeGroupIn, HistAtIn, InvTextIn, PnpDrawGroupsOfIn, PnpEeCatOcc,
  DrawSubIn,
  AsOfLinesIn, ColAsOfIn, SelectionLabelIn, EeHitIn, FedLabelIn, FoldLabelIn, HasProvDrawsIn, HiddenCountIn, HitClsIn,
  HitRefFn, HitRefIn, LevelClsIn, LevelTextIn, FactKeyIn, LocalTitleIn, MatchResultIn, MmCellSpec, MmNocCellIn,
  MmNocListCellIn, MmProvCellIn, MmProvListCellIn, MmRowOfIn, MmRowSpec, MmRowsIn, MmRuleIn, MmSalaryTextIn,
  MmTeerCellIn, MmTone, NocRowMap, OccRowSpec, OccRowsIn, PnpDraw, PnpEeCat, PnpJob, PnpMatchIn, PnpMatchJob,
  PnpMatchOut, PnpFactsIndex, PnpFactsIndexIn, PnpFactsShownIn, PnpMatchResult, PnpNocDesc, PnpOcc, PnpReform,
  PnpStream, PnpStreamsIn, PnpTone, ProvDrawHistIn, ProvRow, ReasonParams, ReformOfIn, ScrollIntoHitIn, ShownStreamsIn,
  SponsorLinesIn, SponsorShowIn, StreamRowSpec, StreamRowsIn, TagClsIn, ToggleOfFn, ToggleSetIn, TrackClickIn,
  BasisKeyIn, ExpLineIn, GateCardOfIn, GateCardSpec, GateRowOfIn, GateRowSpec, GateUrlIn, LangPickIn, NocHitIn, PnpReq,
  ReqAppliesIn, ZonedLinesIn, PnpBlockIn, PnpLang,
  RowOfFactorIn, TeerHitIn, DeadFlag, LoadFn, LoadPnpDataIn, PnpData, PnpDataJson, PnpKickerIn, PnpTitleIn, PnpBlocked,
  PnpCellActiveIn, PnpCellJob, PnpExclIn, PnpNameIn, GenDrawIn, PnpChannelKeyIn, PnpChannelOfIn, PnpPathway,
  CardYearIn, EmptyCardIn, FootLinesIn, GroupsCardIn, LineCardIn, NoDrawReqIn, ReformSplitIn,
  ReformSplitOut, RoundsTextIn, YearDrawsIn, YtdCountIn, YtdPickIn, CountKeyIn, GroupTotalIn,
  ChannelListIn, ChannelTag, ChannelTagsIn, EmployerHitIn, ExtraFitsIn, JobDecidedIn, ListedIn,
  AipSectionOfIn, AipSectionSpec, AipBlockTextIn, DrawCtxIn, DrawCtx, AipGateCardIn, AipRowOfIn, AipTierHitIn,
  ChannelHitIn, PickSetIn,
  LocalNameIn, PathwayChannelIn, StatusLinesIn,
  BandRowIn, GateWho, LangTierLineIn, NamedLangIn, NamedLangOut, ProvGateCardsIn, ProvStreamCardIn, ProvStreamRowsIn,
  AipEmpEntry, AipEmpHiddenIn, AipEmpHitIn, AipEmpListIn, AipEmpRowSpec, AipEmpRowsIn, ExpScopeIn,
  TeerBandsIn, TierLineIn,
  LoadQcChannelsIn, QcCardOfIn, QcCellMap, QcCellNameIn, QcCellRow, QcChannel, QcChannelsJson, QcFactorIn,
  HitStreamsIn, QcGateCardsIn, QcOwnRowsIn, QcReqMineIn, QcRowOfIn, QcSkillPartIn, QcTestLineIn,
} from './types'
import { CACHE } from './variables'
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
 * 洗一行抽选:压暗档、中文灰注、悬停提示与两个数值格的话术都在这里算完。
 * #280:zh 态英文流名 + 中文灰注(次行);streamZh 缺列/还没翻到 = 不出注,纯英文,不是报错。
 * 2026-09-26 晚:灰注改走 zhSubOf(人工定表优先、机器译名兜底,与组头同一个出口;名字与通道卡一致)。
 * 2026-09-27 zhSubOf 改名 drawSubOf(英文界面也可能出灰字),机器译名兜底撤掉(见 drawSubOf)。
 *
 * @param x 取词函数、界面语言、这一行、序号与改制登记。
 * @returns 展示行。
 */
export function toDrawRow(x: DrawRowIn): DrawRowSpec {
  const dim = x.reform != null && x.draw.drawDate < x.reform.since
  const streamZh = drawSubOf({ lang: x.lang, draw: x.draw })
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
 * 2026-09-27 九省体检(Frank「问题太多了」「能用多 agent 修么」):官方写明只管不走雇主 offer 的子类的排除清单不进来(SK 主线不合格表只管 OID / EE,
 * 官方原句「these occupations may be eligible through the International Skilled Worker Employment Offer subcategory」)——
 * 职位板上的岗都带 offer,原先兼职 / 合同这类因工时雇佣期不可提名的 SK 岗,弹框把这张表当成排除原因出卡(255 条)。
 * 判法与职位板格子同一把尺子(lib/jobs isOfferList)。
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
      if (r.type === TYPE_INELIGIBLE && isOfferList(r.appliesTo) === false) {
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
  return {
    draws,
    lists,
    excluded,
    defaults: pnpDefaultProvsOf(x.pathways),
    gated: gatedKeysOf(x.pathways),
    qc: qcCellMapOf(x.qcCells),
  }
}

/**
 * 魁省职业码 → 第一个通道键(2026-09-30 魁省门槛弹框;首屏整表 516 行压成查表,格子文案与能不能点读它)。
 *
 * @param rows 首屏维度 qcCells。
 * @returns 查表。
 */
function qcCellMapOf(rows: QcCellRow[]): QcCellMap {
  const out: QcCellMap = {}
  for (const r of rows) {
    if (r.noc !== TEXT_NONE && r.key !== TEXT_NONE) {
      out[r.noc] = r.key
    }
  }
  return out
}

/**
 * 有省默认通道的省码(通道对照表 isDefault 行的省;2026-09-28 通道表批二,原 GEN_CHANNEL_PROVS 九省常量)。
 * 职位板格子与手机胶囊经事实索引的 defaults 读它,弹框通道卡从懒取到的通道表现算 —— 同一张表、同一个判据。
 *
 * @param pathways 全国通道对照(整表)。
 * @returns 省码(不重复)。
 */
export function pnpDefaultProvsOf(pathways: PnpPathway[]): string[] {
  const out: string[] = []
  for (const p of pathways) {
    if (p.isDefault && out.includes(p.province) === false) {
      out.push(p.province)
    }
  }
  return out
}

/**
 * 登记了门槛的通道键(通道对照表 reqStreams 非空的行;键形同 pnpChannelKeyOf —— 具名通道用岗位通道名,省默认通道用
 * `pnp.gen.` + 省码)。2026-09-29 七省门槛卡:格子「能不能点」把门槛卡算进去用。
 *
 * @param pathways 通道对照整表。
 * @returns 通道键。
 */
function gatedKeysOf(pathways: PnpPathway[]): string[] {
  const out: string[] = []
  for (const p of pathways) {
    if (p.reqStreams.length === 0) {
      continue
    }
    if (p.boardLabel != null) {
      out.push(p.boardLabel)
    } else if (p.isDefault) {
      out.push(PNP_GEN_HEAD + p.province)
    }
  }
  return out
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
 * 2026-09-28 通道表批二:组键改读通道对照表里本省省默认通道的抽选组(x.genDraw,原 GEN_DRAW_STREAM 常量)。
 * 同日 Frank「这个要不要把灰字去掉」「先弄安省的」:组名改界面语言直白名一行,灰字撤 —— 原先英文名 + 界面语言译名是同一个名字
 * 两种语言;上面通道卡已写同一条通道,官方原名在那张卡的灰字。
 * 2026-09-29 下午 Frank「这种上下对不上的?应该是默认显示英文,灰字中文」:翻回英文官方名作主文案、界面语言名作灰字 ——
 * 与下面职业清单行(英文职业名 + 中文灰字)同一排法;推翻同日凌晨按 09-28「界面显示直白名」做的那次翻转。
 * 现行:组名 = 官方抽选组名(通道对照表本省省默认通道的抽选组;没有退英文词条名),灰字 = 界面语言通道名。
 * 2026-09-30 Frank 选「按这版改」:有轮次时分数格不再顶那一轮的人数(本年合计在旁边,两个「份邀请」挨着分不清);还没发邀请照旧写。
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
  let name = makeT(LANG_EN)(genKey)
  if (x.genDraw !== TEXT_NONE) {
    name = x.genDraw
  }
  let sub = TEXT_NONE
  if (x.lang !== LANG_EN && x.t(genKey) !== name) {
    sub = x.t(genKey)
  }
  let key = notice.label
  if (x.genDraw !== TEXT_NONE) {
    key = x.genDraw
  }
  const head = rounds[0]
  let none = x.t('pnpdraws.noInvYet')
  let date = notice.drawDate
  let score: number | null = null
  if (head != null) {
    none = TEXT_NONE
    date = head.drawDate
    score = head.score
  }
  return cmpGroupOf({
    t: x.t,
    none,
    sub,
    lang: x.lang,
    key,
    name,
    tip: notice.note,
    date,
    score,
    draws: rounds,
    dim: false,
    hit: x.hitStreams.includes(key),
    perMonth: false,
    total: groupTotalOf({ t: x.t, ops: x.ops, province: x.province, stream: key }),
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
 * 2026-09-28 Frank「这个要不要把灰字去掉」「先弄安省的」:照同日「界面显示直白名,官方原名放灰字」翻过来 —— 主文案改界面语言
 * 直白名,灰字改官方英文原名(通道对照表 officialName;原先两行是同一个名字两种语言)。官方原名全站只在这张卡出一次(去官网搜的就是它)。
 * 2026-09-29 下午 Frank「这种上下对不上的?应该是默认显示英文,灰字中文」:翻回英文官方名作主文案、界面语言名作灰字 ——
 * 与下面职业清单行(英文职业名 + 中文灰字)同一排法;推翻同日凌晨按 09-28「界面显示直白名」做的那次翻转。
 * 现在一岗只有一个值,出参留成清单:「一岗列出全部通道」立项后这里直接加条目,卡不用改。
 * 魁省不属省提名、缺省码的岗无从说起,都不列。
 *
 * @param x 取词函数、界面语言、灰字开关、本岗与通道对照表。
 * @returns 通道条目;不列给空列。
 */
export function channelsOf(x: ChannelsIn): ChannelSpec[] {
  if (x.job.province === PROV_QC || x.job.province === TEXT_NONE) {
    return []
  }
  const key = pnpChannelKeyOf({ job: x.job, defaults: x.defaults })
  if (key === TEXT_NONE) {
    return []
  }
  const local = pnpNameOf({ key, t: x.t })
  const en = pnpNameOf({ key, t: x.tEn })
  const channel = pnpChannelOf({ job: x.job, pathways: x.pathways })
  let official = TEXT_NONE
  let tags: ChannelTag[] = []
  if (channel != null) {
    official = channel.officialName
    tags = channelTagsOf({ t: x.t, tags: channel.tags })
  }
  return [channelOf({ lang: x.lang, showZh: x.showZh, key, local, en, official, tags })]
}

/**
 * 一条通道条目(界面语言直白名作主文案;非英文界面且开着灰字、官方原名又与主文案不同字才出灰字)。
 * 2026-09-28 前是英文名作主文案、界面语言译名作灰字(见 channelsOf)。
 * 2026-09-29 下午 Frank「这种上下对不上的?应该是默认显示英文,灰字中文」:翻回英文官方名作主文案、界面语言名作灰字 ——
 * 与下面职业清单行(英文职业名 + 中文灰字)同一排法;推翻同日凌晨按 09-28「界面显示直白名」做的那次翻转。
 * 现行:官方英文原名作主文案(通道对照表没有这条时退英文词条名),非英文界面且开着灰字、界面语言名与主文案不同字才出灰字。
 *
 * @param x 界面语言、灰字开关、列表键、界面语言名与官方原名。
 * @returns 通道条目。
 */
function channelOf(x: ChannelOfIn): ChannelSpec {
  let name = x.official
  if (name === TEXT_NONE) {
    name = x.en
  }
  let sub = TEXT_NONE
  if (x.lang !== LANG_EN && x.showZh && x.local !== name) {
    sub = x.local
  }
  return { key: x.key, name, sub, tags: x.tags }
}

/**
 * 同日晚 Frank「不要 offer 这个也删了,只列本岗能走的通道」:下段撤,本函数给的就是整张卡。
 * 通道卡上段的全部条目(2026-09-30 通道补全批二;立项稿 docs/design/通道补全-20260930.md 第五节):本岗自己的通道(channelsOf ——
 * 数据层挂的具名通道或本省默认通道)在前,其余跟工作有关的通道(extraChannelsOf)按表序接后。
 * 2026-10-01 Frank「PNP 弹框 里面的 AIP 部分 提出来,放到 AIP 弹框」「都做吧」:末尾的 AIP 那条搬去 AIP 弹框(aipSectionOf),这里只剩省提名。
 *
 * @param x 取词函数、界面语言、灰字开关、本岗、省默认省码、通道对照表与职业清单。
 * @returns 条目;不列给空列。
 */
export function channelListOf(x: ChannelListIn): ChannelSpec[] {
  const out = channelsOf({
    t: x.t, tEn: x.tEn, lang: x.lang, showZh: x.showZh, job: x.job, defaults: x.defaults, pathways: x.pathways,
  })
  for (const c of extraChannelsOf(x)) {
    out.push(c)
  }
  return out
}

/**
 * 上段末尾的 AIP(2026-09-30 Frank「这个部分只显示能走的通道。能走 AIP 就列,不能走就不列」):大西洋四省、本岗雇主是本省 AIP
 * 指定雇主(aipVerdictOf,同职位板 AIP 列)、职业 TEER 0–4、不是兼职 / 定期合同 / 季节工 / 临时工(AIP 要全职非季节的 offer,TEER 4 要长期,
 * 定期合同判不了长短就不列)才列;名字取通道对照表 AIP 那一行。
 * 2026-10-01 搬去 AIP 弹框(aipSectionOf 调它;省提名弹框的通道卡不再列 AIP)。
 *
 * @param x 取词函数、界面语言、灰字开关、本岗与通道对照表。
 * @returns 能走给一条,否则空列。
 */
export function aipChannelsOf(x: ChannelListIn): ChannelSpec[] {
  if (aipVerdictOf(x.job) !== AIP_ON || ATLANTIC_PROVS.includes(x.job.province) === false) {
    return []
  }
  if (x.job.teer == null || AIP_CHANNEL_TEERS.includes(x.job.teer) === false) {
    return []
  }
  if (JOB_NATURE_BLOCKS.includes(x.job.pnpBlock)) {
    return []
  }
  for (const p of x.pathways) {
    if (p.key === AIP_PATHWAY_KEY) {
      return [pathwayChannelOf({ t: x.t, lang: x.lang, showZh: x.showZh, p })]
    }
  }
  return []
}

/**
 * 上段本岗通道之外的条目(2026-09-30 通道补全批二):本省跟工作有关、但数据层不会分给岗位的通道(不是省默认、没挂岗位通道名 ——
 * 补通道这批新加的那些),按岗位能判的条件筛(isExtraChannelOf)。工作性质卡住的岗(兼职 / 定期合同 / 季节工 / 临时工)一条不列:
 * 各省工人类通道都要全职、非季节、够长的 offer。人的条件(EE 档案、本省毕业、PGWP …)不筛,写成标签。
 * 2026-10-01 Frank「所有省,只列这个职位能走的通道」(配图 PE 卡列着国际毕业生、快速通道):带人的条件的通道不再列,只剩条件全由
 * 岗位定的(isJobDecidedOf;眼下是 NS 医生、NB 关键工人试点 —— 都看雇主)。
 *
 * @param x 取词函数、界面语言、灰字开关、本岗、通道对照表与职业清单。
 * @returns 条目;没有给空列。
 */
export function extraChannelsOf(x: ChannelListIn): ChannelSpec[] {
  const out: ChannelSpec[] = []
  if (x.job.province === PROV_QC || x.job.province === TEXT_NONE || JOB_NATURE_BLOCKS.includes(x.job.pnpBlock)) {
    return out
  }
  const own = pnpChannelOf({ job: x.job, pathways: x.pathways })
  let ownTags: string[] = []
  if (own != null) {
    ownTags = own.tags
  }
  for (const p of x.pathways) {
    if (isExtraChannelOf({ p, job: x.job, occ: x.occ, ownTags })) {
      out.push(pathwayChannelOf({ t: x.t, lang: x.lang, showZh: x.showZh, p }))
    }
  }
  return out
}

/**
 * 这条通道要不要列在本岗上段:同省、跟工作有关、不是省默认也没挂岗位通道名(那两种由数据层分派,见 channelsOf),再过按岗位能判的
 * 四种条件 —— TEER(teers)、职业码(nocs)、职业清单(occLabels)、雇主名(employers);哪格空着就不限。
 * 2026-10-01:标签里带人的条件的不列(isJobDecidedOf)。
 *
 * @param x 这条通道、本岗与职业清单。
 * @returns 列 = true。
 */
function isExtraChannelOf(x: ExtraFitsIn): boolean {
  const p = x.p
  if (p.province !== x.job.province || p.jobLinked === false || p.isDefault || p.boardLabel != null) {
    return false
  }
  if (isJobDecidedOf({ tags: p.tags, ownTags: x.ownTags }) === false) {
    return false
  }
  if (p.teers.length > 0 && (x.job.teer == null || p.teers.includes(x.job.teer) === false)) {
    return false
  }
  if (p.nocs.length > 0 && p.nocs.includes(x.job.noc) === false) {
    return false
  }
  if (p.occLabels.length > 0 && isListedOf({ labels: p.occLabels, noc: x.job.noc, occ: x.occ }) === false) {
    return false
  }
  return p.employers.length === 0 || isEmployerOf({ names: p.employers, company: x.job.company })
}

/**
 * 这条通道能不能走全由岗位定:标签只有 CHAN_JOB_TAGS 那几种(限指定雇主 + 三种状态)。带一个人的条件标签就不算
 * (2026-10-01 Frank「所有省,只列这个职位能走的通道」)。
 * 同日 Frank「同一个工作 有 pgwp 的走一条通道,没有 pgwp 走另一个通道吗」「都做吧」:把所有人一分为二的人的条件(CHAN_TAG_COMPLEMENT)
 * 在本岗那条带着互补标签时也算 —— 每个人必落一边,两条合起来仍是这个职位能走的。只写成标签的门槛(CHAN_NOTE_TAGS)不挡。
 *
 * @param x 这条通道的条件标签键与本岗那条的标签。
 * @returns 全由岗位定 = true。
 */
function isJobDecidedOf(x: JobDecidedIn): boolean {
  for (const tag of x.tags) {
    if (CHAN_JOB_TAGS.includes(tag) || CHAN_NOTE_TAGS.includes(tag)) {
      continue
    }
    const pair = CHAN_TAG_COMPLEMENT[tag]
    if (pair == null || x.ownTags.includes(pair) === false) {
      return false
    }
  }
  return true
}

/**
 * 本岗职业码在不在这几张清单里(pnp_occupations 同 label 的行)。
 *
 * @param x 清单名、本岗职业码与全部清单行。
 * @returns 在 = true。
 */
function isListedOf(x: ListedIn): boolean {
  for (const o of x.occ) {
    if (o.noc === x.noc && x.labels.includes(o.label)) {
      return true
    }
  }
  return false
}

/**
 * 本岗雇主是不是名单上的一家(公司名同 AIP 指定雇主一样归一,名单上的名字被包含即算;名单在 etl 已按同一把尺子归一,自校管着)。
 *
 * @param x 名单与本岗公司名。
 * @returns 是 = true。
 */
function isEmployerOf(x: EmployerHitIn): boolean {
  const name = normName(x.company)
  if (name === TEXT_NONE) {
    return false
  }
  for (const n of x.names) {
    if (name.includes(n)) {
      return true
    }
  }
  return false
}

/**
 * 通道对照表一行 → 通道条目(官方英文原名主文案;中韩界面开着灰字、直白名与主文案不同字才出灰字;标签照表)。
 *
 * @param x 取词函数、界面语言、灰字开关与这条通道。
 * @returns 通道条目。
 */
function pathwayChannelOf(x: PathwayChannelIn): ChannelSpec {
  let sub = TEXT_NONE
  const local = localNameOf({ lang: x.lang, p: x.p })
  if (x.showZh && local !== TEXT_NONE && local !== x.p.officialName) {
    sub = local
  }
  return { key: x.p.key, name: x.p.officialName, sub, tags: channelTagsOf({ t: x.t, tags: x.p.tags }) }
}

/**
 * 一条通道的界面语言直白名(中文 plainZh、韩文 plainKo;英文界面不出灰字给 '')。
 *
 * @param x 界面语言与这条通道。
 * @returns 名字;'' = 不出。
 */
function localNameOf(x: LocalNameIn): string {
  const byLang: Record<PnpLang, string> = { zh: x.p.plainZh, en: TEXT_NONE, ko: x.p.plainKo }
  return byLang[x.lang]
}

/**
 * 通道的条件标签键 → 标签条目(文字走 i18n `pnpchan.tag.` + 键;胶囊类名取通用 tag 桶:状态类 warn、其余 gray)。
 *
 * @param x 取词函数与标签键。
 * @returns 标签条目。
 */
function channelTagsOf(x: ChannelTagsIn): ChannelTag[] {
  const out: ChannelTag[] = []
  for (const key of x.tags) {
    let cls = baseTagClsOf(TAG_V_GRAY)
    if (CHAN_TAG_WARN.includes(key)) {
      cls = baseTagClsOf(TAG_V_WARN)
    }
    out.push({ key, text: x.t(CHAN_TAG_HEAD + key), cls })
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
 * EE 弹框结论卡「本岗能走的通道」的条目(2026-10-01 三弹框统一):本岗职业命中的 EE 类别一类一条 —— 主文案英文名、界面语言名灰字
 * (与职位板 EE 列同一套类别名,eeDisplay);英文界面、关了译名或两边同字不出灰字。类别抽选的人的条件(经验、语言)不进这里。
 *
 * @param x 取词函数、界面语言、灰字开关与命中的类别。
 * @returns 条目;没命中给空列。
 */
export function eeChannelsOf(x: EeChannelsIn): ChannelSpec[] {
  const tEn = makeT(LANG_EN)
  const out: ChannelSpec[] = []
  for (const c of x.cats) {
    const name = eeDisplay({ t: tEn, label: c.label })
    let sub = TEXT_NONE
    const local = eeDisplay({ t: x.t, label: c.label })
    if (x.showZh && x.lang !== LANG_EN && local !== name) {
      sub = local
    }
    out.push({ key: c.key, name, sub, tags: [] })
  }
  return out
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
      total: TEXT_NONE,
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
    total: TEXT_NONE,
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
      total: TEXT_NONE,
    }))
  }
  return { groups, lines }
}

/**
 * 本岗 PNP 格写的通用通道在本省抽选卡里对应哪一组(2026-09-23 Frank「所以这个 NB 技术工人点进去应该哪个高亮」)。
 * 格子写的是具名清单通道或不可提名时不高亮(具名清单与抽选组的对照要等数据层把 rule_streams 对上号)。
 * 2026-09-24 改名 drawHitStreamsOf(原 genDrawStreamOf)、改回多组:具名清单通道按 NAMED_DRAW_STREAMS 对组
 * (Frank「AB 医疗也走机会通道?」「点进去应该哪个高亮」),对不上的照旧不高亮。
 * 2026-09-28 通道表批二:对照搬进库表 pathways(本岗通道 = pnpChannelOf,组 = 它的 drawStreams),NAMED_DRAW_STREAMS /
 * GEN_DRAW_STREAM 两张常量退役;判据一字没变 —— 具名通道看通道名对上的那一行,可提名而没挂名看本省省默认通道那一行。
 *
 * @param channel 本岗走的那条通道(pnpChannelOf 给的;null = 没有)。
 * @returns 抽选行 stream 原值的清单;空列 = 不高亮。
 */
export function drawHitStreamsOf(channel: PnpPathway | null): string[] {
  if (channel == null) {
    return []
  }
  return channel.drawStreams
}

/**
 * 省提名弹框里本岗高亮哪几组抽选(2026-09-30 Frank「和其他省保持一致吧」):九省按本岗通道(drawHitStreamsOf);
 * 魁省按本岗职业能走的 PSTQ 通道 —— 抽选行的 stream 与门槛流名同是官方英文原名(「Stream 1: Highly qualified …」),逐字相等才算;
 * PEQ 不抽选,不算。
 *
 * @param x 本岗走的那条通道与魁省通道(非魁省岗为空列)。
 * @returns 抽选行 stream 原值的清单;空列 = 不高亮。
 */
export function hitStreamsOf(x: HitStreamsIn): string[] {
  const out: string[] = []
  for (const s of drawHitStreamsOf(x.channel)) {
    out.push(s)
  }
  for (const c of x.qcChannels) {
    if (c.program === QC_PROGRAM_PSTQ && out.includes(c.stream) === false) {
      out.push(c.stream)
    }
  }
  return out
}

/**
 * 门槛卡按哪条通道出:本岗走得了就是本岗那条(pnpChannelOf);走不了且有要显示的原因(兼职、工资低于中位……,
 * pnpBlockOf 那几个码)就出本省省默认通道的门槛 —— 「本岗不满足的门槛」卡写原因,门槛卡紧接着列这条路要什么,原因与门槛对得上
 * (2026-09-29 Frank「sk 省 没显示 门槛卡片啊」「都接上,开工吧」)。清单排除与没有原因的岗照旧不出。
 * 2026-10-01 三弹框统一(Frank「统一一下 ee pnp aip 弹框的顺序 和 格式」「可以,做吧」):清单排除(list)也出 —— 原因码表换弹框那张
 * (PNP_BLOCK_CARD_CODES),与「本岗不满足的门槛」卡同一个判据。
 *
 * @param x 本岗与通道对照整表。
 * @returns 那一行;没有给 null。
 */
export function gateChannelOf(x: PnpChannelOfIn): PnpPathway | null {
  const own = pnpChannelOf(x)
  if (own != null) {
    return own
  }
  if (PNP_BLOCK_CARD_CODES.includes(x.job.pnpBlock) === false) {
    return null
  }
  for (const p of x.pathways) {
    if (p.isDefault && p.province === x.job.province) {
      return p
    }
  }
  return null
}

/**
 * 本岗走哪条通道(通道对照表的一行):数据层给了具名通道(pnp_stream)就是通道名对上的那一行,对不上给 null(不拿省默认
 * 通道冒充);没挂名而可提名就是本省省默认通道那一行;都不是给 null。与原先 NAMED_* / GEN_* 两套常量的分支一一对应
 * (2026-09-28 通道表批二,那几张常量退役)。
 *
 * @param x 本岗与通道对照整表。
 * @returns 那一行;没有给 null。
 */
export function pnpChannelOf(x: PnpChannelOfIn): PnpPathway | null {
  if (x.job.pnpStream !== TEXT_NONE) {
    for (const p of x.pathways) {
      if (p.boardLabel === x.job.pnpStream) {
        return p
      }
    }
    return null
  }
  if (x.job.pnpEligible === false) {
    return null
  }
  for (const p of x.pathways) {
    if (p.isDefault && p.province === x.job.province) {
      return p
    }
  }
  return null
}

/**
 * 本岗通道在配额表里的通道键(通道对照表的 quotaKey;没有给 '')—— 配额卡「本岗通道」那一行先查它,再按抽选组名小写配。
 *
 * @param channel 本岗走的那条通道(null = 没有)。
 * @returns 通道键;没有给 ''。
 */
export function quotaKeyOf(channel: PnpPathway | null): string {
  if (channel == null || channel.quotaKey == null) {
    return TEXT_NONE
  }
  return channel.quotaKey
}

/**
 * 本省省默认通道的抽选组(安省改制那一组的组键;没有给 '',原 GEN_DRAW_STREAM 常量)。
 *
 * @param x 省码与通道对照整表。
 * @returns 抽选组;没有给 ''。
 */
export function genDrawOf(x: GenDrawIn): string {
  for (const p of x.pathways) {
    const first = p.drawStreams[0]
    if (p.isDefault && p.province === x.province && first != null) {
      return first
    }
  }
  return TEXT_NONE
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
 * 2026-09-30 Frank「右边这部分看着还是 有点乱」,选「按这版改」:没公布分的组头不再写那一轮的人数(组头第二格已是本年合计,
 * 两个「份邀请」挨着分不清;各轮人数点开看),分数格空着。
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
    let score = head.score
    if (isMixedSelectionOf(arr) && head.selection !== SEL_POINTS) {
      score = null
    }
    groups.push(cmpGroupOf({
      t: x.t,
      none: TEXT_NONE,
      sub: drawSubOf({ lang: x.lang, draw: head }),
      lang: x.lang,
      key,
      name: head.stream,
      tip: TEXT_NONE,
      date: head.drawDate,
      score,
      draws: arr,
      dim: false,
      hit: x.hitStreams.includes(key),
      perMonth: false,
      total: groupTotalOf({ t: x.t, ops: x.ops, province: x.province, stream: key }),
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
 * 2026-09-30 Frank 选「按这版改」:组头不再写最近一个月的人数(本年合计在旁边),逐月人数点开看。
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
    none: TEXT_NONE,
    sub: drawSubOf({ lang: x.lang, draw: head }),
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
    total: groupTotalOf({ t: x.t, ops: x.ops, province: x.province, stream: head.stream }),
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
 * 2026-09-29 抽选卡重排(Frank「按你建议」;设计稿 docs/design/省提名抽选卡重排-20260929.md):只列这一年(年份与配额卡标题同一个来源,
 * cardYearOf)、只列不属 AIP 的轮次(AIP 分去 aipCardOf;认数据层逐行打好的 program 格,不再按省名判);标题下灰字(NB 不按分数、
 * NS 同池含 AIP)由这里给(原在组件里按 DRAW_NO_SCORE_PROVS 写死);卡底合计行(footLinesOf);这一年一组都分不出来时交
 * emptyPnpCardOf(SK 写不经抽选、往年有轮次写今年还没有抽选)。安省改制前的轮次分去 preReformCardOf,这里只剩改制后那一组。
 * 魁省不出(不参加 PNP,同 drawsFormOf 的口径)。
 * 2026-09-30 Frank「和其他省保持一致吧」:魁省也出(PSTQ 邀请轮次按官方四个通道分组,本岗能走的通道高亮,hitStreamsOf)。
 * 2026-10-01 三弹框统一(Frank「这个废话也删了」,效果图「可以,做吧」):标题下灰字两条都撤(NS 同池、NB 不按分数),lines 恒为空列。
 *
 * @param x 取词函数、界面语言、省码、全部抽选行、本岗对应的组、省默认通道的抽选组、当年配额行、门槛行与卡只列的那一年。
 * @returns 抽选卡;本省没有可说的给 null。
 */
export function drawCardOf(x: DrawCardOfIn): DrawCard | null {
  if (x.province === TEXT_NONE) {
    return null
  }
  const draws = yearDrawsOf({ province: x.province, draws: x.draws, year: x.year, aip: false })
  const gx: PnpDrawGroupsOfIn = {
    t: x.t,
    lang: x.lang,
    province: x.province,
    draws,
    hitStreams: x.hitStreams,
    genDraw: x.genDraw,
    ops: x.ops,
  }
  const reform = reformOf({ province: x.province })
  let groups: EeCmpGroup[] = []
  let rows = roundsOf(draws)
  let total = true
  if (reform != null) {
    const status = statusGroupOf(gx)
    if (status != null) {
      groups.push(status)
    }
    const split = reformSplitOf({ rows, since: reform.since })
    rows = split.after
    total = split.before.length === 0
  } else {
    groups = pnpDrawGroupsOf(gx)
    const monthly = monthlyGroupOf(gx)
    if (monthly != null) {
      groups.push(monthly)
    }
  }
  const lines: string[] = []
  if (groups.length === 0) {
    return emptyPnpCardOf({ t: x.t, province: x.province, draws: x.draws, reqs: x.reqs, year: x.year, lines })
  }
  const first = firstDrawOf(drawRowsOf({ province: x.province, draws: x.draws, reform: null, limit: null }))
  let label = TEXT_NONE
  let source: SourceLink | null = null
  if (first != null) {
    label = first.label
    source = sourceLinkOf({ t: x.t, url: first.url })
  }
  return groupsCardOf({
    title: x.t('pnpdraws.head'),
    label,
    groups,
    source,
    lines,
    foot: footLinesOf({ t: x.t, province: x.province, year: x.year, rows, ops: x.ops, scopeKind: TEXT_NONE, total }),
    allKey: DRAWS_ALL_KEY,
    fold: true,
  })
}

/**
 * 「改制前的抽选」卡(2026-09-29 抽选卡重排,Frank「ON 可以单独设计一个卡,列出历史的」「按你建议」):改制省(安省)这一年改制生效日之前的
 * 轮次,按官方通道分组(旧通道已全部废止,组名下灰字写直白名);卡底合计:这一年改制后还没有轮次时,汇装的全年合计恰好就是这些轮次,
 * 写轮数与份数;改制后有了轮次,份数分不开,只写轮数。
 *
 * @param x 同 drawCardOf。
 * @returns 这张卡;不是改制省或这一年改制前没有轮次给 null。
 */
export function preReformCardOf(x: DrawCardOfIn): DrawCard | null {
  const reform = reformOf({ province: x.province })
  if (reform == null) {
    return null
  }
  const draws = yearDrawsOf({ province: x.province, draws: x.draws, year: x.year, aip: false })
  const split = reformSplitOf({ rows: roundsOf(draws), since: reform.since })
  const first = split.before[0]
  if (first == null) {
    return null
  }
  const groups = pnpDrawGroupsOf({
    t: x.t,
    lang: x.lang,
    province: x.province,
    draws: split.before,
    hitStreams: x.hitStreams,
    genDraw: x.genDraw,
    ops: x.ops,
  })
  return groupsCardOf({
    title: x.t('pnpreform.head'),
    label: first.label,
    groups,
    source: sourceLinkOf({ t: x.t, url: first.url }),
    lines: [],
    foot: footLinesOf({
      t: x.t,
      province: x.province,
      year: x.year,
      rows: split.before,
      ops: x.ops,
      scopeKind: TEXT_NONE,
      total: split.after.length === 0,
    }),
    allKey: DRAWS_REFORM_ALL_KEY,
    fold: true,
  })
}

/**
 * 「AIP 抽选」卡(2026-09-29 抽选卡重排,Frank「AIP 是不是应该单独的卡」「按你建议」):大西洋四省(AIP 的适用范围)各出一张 ——
 * 这一年有 AIP 的轮次(NB 的 AIP 组、NL 每批拆出来的 AIP 份数)就按组列、卡底写合计(汇装 AIP 那一份);没有轮次交 aipLineCardOf
 * 写一行说明(不经抽选 / 今年还没有)。
 * 2026-10-01 三弹框统一(Frank「这个应该 可以 家 展开 收起」「如果是 省提名同池,也列出来」「省提名与 AIP 同池选取,人数含 AIP 这个废话
 * 也删了」):同池的省(NS)不再写「见本省抽选」,直接列同池那组(aipPoolCardOf)。
 *
 * @param x 同 drawCardOf。
 * @returns 这张卡;不在大西洋四省、或什么都说不出给 null。
 */
export function aipCardOf(x: DrawCardOfIn): DrawCard | null {
  if (ATLANTIC_PROVS.includes(x.province) === false) {
    return null
  }
  const rows = roundsOf(yearDrawsOf({ province: x.province, draws: x.draws, year: x.year, aip: true }))
  const first = rows[0]
  if (first == null) {
    const pool = aipPoolCardOf(x)
    if (pool != null) {
      return pool
    }
    return aipLineCardOf(x)
  }
  const groups = pnpDrawGroupsOf({
    t: x.t,
    lang: x.lang,
    province: x.province,
    draws: rows,
    hitStreams: x.hitStreams,
    genDraw: x.genDraw,
    ops: x.ops,
  })
  return groupsCardOf({
    title: x.t('pnpaip.head'),
    label: PROGRAM_AIP,
    groups,
    source: sourceLinkOf({ t: x.t, url: first.url }),
    lines: [],
    foot: footLinesOf({
      t: x.t,
      province: x.province,
      year: x.year,
      rows,
      ops: x.ops,
      scopeKind: OPS_SCOPE_PROGRAM,
      total: true,
    }),
    allKey: DRAWS_ALL_KEY,
    fold: false,
  })
}

/**
 * 同池省(NS)的「AIP 抽选」卡(2026-10-01 三弹框统一):这一年没有 AIP 自己的轮次、而本省抽选是省提名与 AIP 同池(program = PNP+AIP)
 * 时,直接列本省抽选卡那几组(同一份组、合计与出处;NS 那组是按月选取人数,组名「NSNP + AIP」、组里通道名含 AIP,已说明是合池),
 * 只换标题。
 *
 * @param x 同 drawCardOf。
 * @returns 这张卡;不是同池给 null。
 */
function aipPoolCardOf(x: DrawCardOfIn): DrawCard | null {
  let pooled = false
  for (const d of roundsOf(yearDrawsOf({ province: x.province, draws: x.draws, year: x.year, aip: false }))) {
    if (d.program === PROGRAM_POOL) {
      pooled = true
    }
  }
  if (pooled === false) {
    return null
  }
  const card = drawCardOf(x)
  if (card == null) {
    return null
  }
  return {
    title: x.t('pnpaip.head'),
    label: card.label,
    hits: card.hits,
    others: card.others,
    total: card.total,
    source: card.source,
    lines: card.lines,
    foot: card.foot,
    allKey: card.allKey,
  }
}

/**
 * 「AIP 抽选」卡这一年没有 AIP 轮次时写的那一行(2026-09-29 抽选卡重排):
 * 门槛表有 AIP 的「不经抽选」行(PE:由指定雇主直接递背书申请)→ 写它、挂出处;往年有 AIP 轮次 → 今年还没有;都没有不出卡。
 * 2026-10-01 同池(NS)那支撤:同池那组改由 aipRowsOf 直接列。
 *
 * @param x 同 drawCardOf。
 * @returns 只有一行说明的卡;说不出给 null。
 */
function aipLineCardOf(x: DrawCardOfIn): DrawCard | null {
  const title = x.t('pnpaip.head')
  const direct = noDrawReqOf({ reqs: x.reqs, province: x.province, program: PROGRAM_AIP })
  if (direct != null) {
    return lineCardOf({
      title,
      lines: [x.t('pnpaip.direct')],
      source: sourceLinkOf({ t: x.t, url: direct.url }),
      allKey: DRAWS_ALL_KEY,
    })
  }
  if (roundsOf(yearDrawsOf({ province: x.province, draws: x.draws, year: TEXT_NONE, aip: true })).length > 0) {
    return lineCardOf({
      title,
      lines: [x.t('pnpdraws.none', { year: x.year })],
      source: null,
      allKey: DRAWS_ALL_KEY,
    })
  }
  return null
}

/**
 * AIP 弹框的通道卡与抽选卡(2026-10-01 Frank「PNP 弹框 里面的 AIP 部分 提出来,放到 AIP 弹框吗?」「都做吧」):原在省提名弹框的
 * 两块原样搬来 —— 通道卡上段末尾的 AIP 那条(aipChannelsOf)与「AIP 抽选」卡(aipCardOf,年份 / 本岗那组 / 卡底合计与省提名弹框同一套
 * 抽选卡入参,drawCtxOf)。原卡顶上「本岗雇主是本省 AIP 指定雇主」那一行(09-30 aipEmployerCardOf)不搬:AIP 弹框的判定行与指定雇主清单卡
 * 已经说了。
 * 同日 Frank「AIP 也需要一个 门槛卡片吧」「格式需要 和 pnp 的保持一致吗」「可以,做吧」:多一张门槛卡(aipGateCardOf),本岗能走 AIP 才出。
 * 同日三弹框统一(Frank「统一一下 ee pnp aip 弹框的顺序 和 格式」「这个嵌套删了」「改成这种不行吗」,看过效果图「可以,做吧」):
 * 判定卡撤,走不了的岗改出「本岗不满足的门槛」卡(block,与省提名弹框同一张卡、同一套原因词),通道不列;门槛卡能走、走不了都出。
 *
 * @param x 取词函数、界面语言、灰字开关、本岗与几张整表。
 * @returns 走不了的原因词、AIP 那条通道(能走才有)、AIP 抽选卡与门槛卡(不出给 null)。
 */
export function aipSectionOf(x: AipSectionOfIn): AipSectionSpec {
  const ctx = drawCtxOf({
    t: x.t, lang: x.lang, job: x.job, draws: x.draws, ops: x.ops, reqs: x.reqs, pathways: x.pathways, qcChannels: [],
  })
  const block = aipBlockTextOf({ t: x.t, job: x.job, occ: x.occ })
  let channels: ChannelSpec[] = []
  if (block === TEXT_NONE) {
    channels = aipChannelsOf({
      t: x.t,
      tEn: x.tEn,
      lang: x.lang,
      showZh: x.showZh,
      job: x.job,
      defaults: pnpDefaultProvsOf(x.pathways),
      pathways: x.pathways,
      occ: x.occ,
    })
  }
  let gate: GateCardSpec | null = null
  if (channels.length > 0 || block !== TEXT_NONE) {
    gate = aipGateCardOf({ t: x.t, job: x.job, reqs: x.reqs })
  }
  return { block, channels, card: aipCardOf(ctx.dx), gate }
}

/**
 * AIP 弹框「本岗不满足的门槛」卡的原因词(2026-10-01 三弹框统一):弹框只在雇主是本省指定雇主时打得开,走不了只剩两种 ——
 * 省里点名这个职业的 AIP 背书不受理(aipBlockOf)写「职业不收」;工作性质卡住(兼职 / 定期合同 / 季节工 / 临时工,AIP 要全职、
 * 非季节的 offer)写那个工作性质。词与省提名弹框同一套(pnp.block.*)。
 *
 * @param x 取词函数、本岗与职业清单整表。
 * @returns 原因词;走得了给 ''。
 */
function aipBlockTextOf(x: AipBlockTextIn): string {
  if (aipBlockOf(x.job, x.occ) != null) {
    return x.t(PNP_BLOCK_HEAD + PNP_BLOCK_OCC)
  }
  if (JOB_NATURE_BLOCKS.includes(x.job.pnpBlock)) {
    return x.t(PNP_BLOCK_HEAD + x.job.pnpBlock)
  }
  return TEXT_NONE
}

/**
 * 抽选卡的公共入参与配额卡(2026-10-01 AIP 搬家时自 PnpListSection 收进来,省提名弹框与 AIP 弹框同用一份,年份与本岗那组不岔):
 * 本岗那条通道 → 对应的抽选组 → 配额卡 → 抽选卡写哪一年(有配额卡用它的年份)。
 *
 * @param x 取词函数、界面语言、本岗、几张整表与魁省通道。
 * @returns 配额卡与抽选卡入参。
 */
export function drawCtxOf(x: DrawCtxIn): DrawCtx {
  const channel = pnpChannelOf({ job: x.job, pathways: x.pathways })
  const hitStreams = hitStreamsOf({ channel, qcChannels: x.qcChannels })
  const quota = quotaCardOf({ t: x.t, province: x.job.province, ops: x.ops, hitStreams, quotaKey: quotaKeyOf(channel) })
  return {
    quota,
    dx: {
      t: x.t,
      lang: x.lang,
      province: x.job.province,
      draws: x.draws,
      hitStreams,
      genDraw: genDrawOf({ province: x.job.province, pathways: x.pathways }),
      ops: x.ops,
      reqs: x.reqs,
      year: cardYearOf({ quota, province: x.job.province, draws: x.draws }),
    },
  }
}

/**
 * AIP 门槛卡(2026-10-01 Frank「AIP 也需要一个 门槛卡片吧」「格式需要 和 pnp 的保持一致吗」「可以,做吧」):与省提名门槛卡同一个组件、
 * 同一套行名(雇主 offer → 雇主条件 → 语言 → 工作经验 → 学历 → 资金;学历、资金两行同日加进 GATE_ROW)。行取门槛表联邦 AIP 那几行
 *(IRCC AIP 官方页),按本岗 TEER 只留管得着的那一档;只陈列门槛,不判「你够不够」。本岗 TEER 不在 AIP 收的范围不出卡。
 *
 * @param x 取词函数、本岗与门槛表。
 * @returns 门槛卡;不出给 null。
 */
export function aipGateCardOf(x: AipGateCardIn): GateCardSpec | null {
  const teer = x.job.teer
  if (teer == null || AIP_CHANNEL_TEERS.includes(teer) === false) {
    return null
  }
  const rows: PnpReq[] = []
  for (const r of x.reqs) {
    if (r.province === PROV_FED && r.program === PROGRAM_AIP && aipTierHitOf({ stream: r.stream, teer })) {
      rows.push(r)
    }
  }
  if (rows.length === 0) {
    return null
  }
  const one: AipRowOfIn = { t: x.t, rows }
  const out: GateRowSpec[] = []
  for (const row of [aipOfferRowOf(one), aipEmpRowOf(one), aipLangRowOf(one), aipExpRowOf(one), aipEduRowOf(one),
    aipFundsRowOf(one)]) {
    if (row != null) {
      out.push(row)
    }
  }
  return {
    title: x.t('pnpgate.title'),
    sub: TEXT_NONE,
    tags: [],
    source: sourceLinkOf({ t: x.t, url: aipGateUrlOf(rows) }),
    rows: out,
    empty: TEXT_NONE,
  }
}

/**
 * 这一行门槛管不管得着本岗:流名 '' 各档都适用;分档名(teer-0-3 这类)看本岗 TEER 在不在区间(teer-4 只一档)。
 *
 * @param x 流名与本岗 TEER。
 * @returns 管得着 = true。
 */
function aipTierHitOf(x: AipTierHitIn): boolean {
  if (x.stream === TEXT_NONE) {
    return true
  }
  if (x.stream.startsWith(AIP_TIER_PREFIX) === false) {
    return false
  }
  const ends = x.stream.slice(AIP_TIER_PREFIX.length).split(AIP_TIER_SEP).map(Number)
  const lo = ends[0]
  const hi = ends[ends.length - 1]
  if (lo == null || hi == null) {
    return false
  }
  return x.teer >= lo && x.teer <= hi
}

/**
 * 「雇主 offer」行:全职(每周最少小时)、全年不分季节、期限(TEER 0–3 写年数,TEER 4 写长期),一项一行。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;一项都没有给 null。
 */
function aipOfferRowOf(x: AipRowOfIn): GateRowSpec | null {
  const lines: string[] = []
  const full = rowOfFactor({ rows: x.rows, factor: AIP_F.fullTime })
  if (full != null && full.value != null) {
    lines.push(x.t('aipgate.fullTime', { n: String(full.value) }))
  }
  if (rowOfFactor({ rows: x.rows, factor: AIP_F.nonSeasonal }) != null) {
    lines.push(x.t('aipgate.nonSeasonal'))
  }
  const term = rowOfFactor({ rows: x.rows, factor: AIP_F.duration })
  if (term != null && term.value != null) {
    lines.push(x.t('aipgate.duration', { n: String(term.value) }))
  } else if (term != null) {
    lines.push(x.t('aipgate.permanent'))
  }
  if (lines.length === 0) {
    return null
  }
  return { key: GATE_ROW.offer, label: x.t('pnpgate.k.offer'), lines, notes: [] }
}

/**
 * 「雇主条件」行:须是省指定雇主、不能是本人或配偶控股的公司。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有给 null。
 */
function aipEmpRowOf(x: AipRowOfIn): GateRowSpec | null {
  const lines: string[] = []
  if (rowOfFactor({ rows: x.rows, factor: AIP_F.designated }) != null) {
    lines.push(x.t('aipgate.designated'))
  }
  if (rowOfFactor({ rows: x.rows, factor: AIP_F.ownership }) != null) {
    lines.push(x.t('aipgate.ownership'))
  }
  if (lines.length === 0) {
    return null
  }
  return { key: GATE_ROW.emp, label: x.t('pnpgate.k.emp'), lines, notes: [] }
}

/**
 * 「语言」行:本岗那一档的 CLB(写法同省提名门槛卡 pnpgate.lang)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有给 null。
 */
function aipLangRowOf(x: AipRowOfIn): GateRowSpec | null {
  const r = rowOfFactor({ rows: x.rows, factor: AIP_F.language })
  if (r == null || r.value == null) {
    return null
  }
  const lines = [x.t('pnpgate.lang', { n: String(r.value) })]
  return { key: GATE_ROW.lang, label: x.t('pnpgate.k.lang'), lines, notes: [] }
}

/**
 * 「工作经验」行:小时数与跨度、同 TEER 或更高、须带薪;大西洋院校毕业免经验写在末行,免的条件(学制、毕业年限、住满月数)
 * 挂灰字(2026-10-01 Frank「大西洋四省院校毕业可免 是什么意思」:光写「可免」读不懂,条件要写出来)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有给 null。
 */
function aipExpRowOf(x: AipRowOfIn): GateRowSpec | null {
  const hours = rowOfFactor({ rows: x.rows, factor: AIP_F.hours })
  if (hours == null || hours.value == null) {
    return null
  }
  const lines = [x.t('aipgate.hours', { n: hours.value.toLocaleString(NUM_LOCALE) })]
  const span = rowOfFactor({ rows: x.rows, factor: AIP_F.period })
  if (span != null && span.value != null) {
    lines.push(x.t('aipgate.period', { n: String(span.value) }))
  }
  if (rowOfFactor({ rows: x.rows, factor: AIP_F.teerMatch }) != null) {
    lines.push(x.t('aipgate.teerMatch'))
  }
  if (rowOfFactor({ rows: x.rows, factor: AIP_F.paid }) != null) {
    lines.push(x.t('aipgate.paid'))
  }
  const notes: string[] = []
  if (rowOfFactor({ rows: x.rows, factor: AIP_F.exemptGrad }) != null) {
    lines.push(x.t('aipgate.exemptGrad'))
    for (const [factor, key] of Object.entries(AIP_GRAD_NOTE)) {
      const r = rowOfFactor({ rows: x.rows, factor })
      if (r != null && r.value != null) {
        notes.push(x.t(key, { n: String(r.value) }))
      }
    }
  }
  return { key: GATE_ROW.exp, label: x.t('pnpgate.k.exp'), lines, notes }
}

/**
 * 「学历」行:本岗那一档的学历门槛(条文无值,按档写一句,词条 aipgate.edu.<档>);海外学历须做 ECA 另起一行。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有给 null。
 */
function aipEduRowOf(x: AipRowOfIn): GateRowSpec | null {
  const r = rowOfFactor({ rows: x.rows, factor: AIP_F.education })
  if (r == null) {
    return null
  }
  const lines = [x.t(AIP_EDU_HEAD + r.stream)]
  if (rowOfFactor({ rows: x.rows, factor: AIP_F.eca }) != null) {
    lines.push(x.t('aipgate.eca'))
  }
  return { key: GATE_ROW.edu, label: x.t('pnpgate.k.edu'), lines, notes: [] }
}

/**
 * 「资金」行:1 人的最低安家资金(按家庭人数各一行,取最小那行 = 1 人);已在加拿大持工签工作的免,另起一行。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有给 null。
 */
function aipFundsRowOf(x: AipRowOfIn): GateRowSpec | null {
  let least: number | null = null
  for (const r of x.rows) {
    if (r.factor === AIP_F.funds && r.value != null && (least == null || r.value < least)) {
      least = r.value
    }
  }
  if (least == null) {
    return null
  }
  const lines = [x.t('aipgate.funds', { n: least.toLocaleString(NUM_LOCALE) })]
  if (rowOfFactor({ rows: x.rows, factor: AIP_F.fundsWaived }) != null) {
    lines.push(x.t('aipgate.fundsWaived'))
  }
  return { key: GATE_ROW.funds, label: x.t('pnpgate.k.funds'), lines, notes: [] }
}

/**
 * 卡右上的来源:挑到的行里第一条带网址的(IRCC AIP 官方页)。
 *
 * @param rows 挑好的 AIP 门槛行。
 * @returns 网址;都没有给 ''。
 */
function aipGateUrlOf(rows: PnpReq[]): string {
  for (const r of rows) {
    if (r.url !== TEXT_NONE) {
      return r.url
    }
  }
  return TEXT_NONE
}

/**
 * 本省抽选卡这一年一组都分不出来时(2026-09-29 抽选卡重排,Frank「没有抽选卡 要标上 没有抽选卡啊」「sk 怎么这么特别」):门槛表有
 * 省提名的「不经抽选」行(SK:持雇主 offer 直接递申请)→ 写它、挂出处;本省往年有轮次 → 今年还没有抽选;都没有才不出卡。
 *
 * @param x 取词函数、省码、全部抽选行、门槛行、那一年与已有的灰字说明。
 * @returns 只有说明行的卡;说不出给 null。
 */
function emptyPnpCardOf(x: EmptyCardIn): DrawCard | null {
  const title = x.t('pnpdraws.head')
  const direct = noDrawReqOf({ reqs: x.reqs, province: x.province, program: PROGRAM_PNP })
  if (direct != null) {
    return lineCardOf({
      title,
      lines: x.lines.concat([x.t('pnpdraws.direct')]),
      source: sourceLinkOf({ t: x.t, url: direct.url }),
      allKey: DRAWS_ALL_KEY,
    })
  }
  if (roundsOf(yearDrawsOf({ province: x.province, draws: x.draws, year: TEXT_NONE, aip: false })).length > 0) {
    return lineCardOf({
      title,
      lines: x.lines.concat([x.t('pnpdraws.none', { year: x.year })]),
      source: null,
      allKey: DRAWS_ALL_KEY,
    })
  }
  return null
}

/**
 * 本省某一年的抽选行(2026-09-29 抽选卡重排):只留本省;抽选行再只留日期落在这一年的('' = 不筛年)、项目合这张卡的
 * (aip = true 只要 AIP 的,false 只要不属 AIP 的 —— 省提名、同池与认不出的);通告行照旧跟着(安省改制那一组要读它)。
 *
 * @param x 省码、全部抽选行、那一年与要不要 AIP 的。
 * @returns 筛过的行(保持来稿序)。
 */
function yearDrawsOf(x: YearDrawsIn): PnpDraw[] {
  const rows: PnpDraw[] = []
  for (const d of x.draws) {
    if (d.province !== x.province) {
      continue
    }
    if (d.kind === KIND_DRAW && (d.drawDate.startsWith(x.year) === false || (d.program === PROGRAM_AIP) !== x.aip)) {
      continue
    }
    rows.push(d)
  }
  return rows
}

/**
 * 只留抽选行(通告行不算一轮;2026-09-29 抽选卡重排)。
 *
 * @param draws 抽选行与通告行。
 * @returns 抽选行。
 */
function roundsOf(draws: PnpDraw[]): PnpDraw[] {
  const rows: PnpDraw[] = []
  for (const d of draws) {
    if (d.kind === KIND_DRAW) {
      rows.push(d)
    }
  }
  return rows
}

/**
 * 这一年的轮次按改制生效日一分为二(2026-09-29 抽选卡重排)。
 *
 * @param x 轮次与改制生效日。
 * @returns 改制前、改制后两份。
 */
function reformSplitOf(x: ReformSplitIn): ReformSplitOut {
  const before: PnpDraw[] = []
  const after: PnpDraw[] = []
  for (const d of x.rows) {
    if (d.drawDate < x.since) {
      before.push(d)
    } else {
      after.push(d)
    }
  }
  return { before, after }
}

/**
 * 门槛表里本省某项目的「不经抽选」那一行(factor = eoiDraw、op = none;2026-09-29 抽选卡重排)。
 *
 * @param x 门槛行、省码与项目。
 * @returns 那一行;没有给 null。
 */
function noDrawReqOf(x: NoDrawReqIn): PnpReq | null {
  for (const r of x.reqs) {
    if (r.province === x.province && r.factor === FACTOR_EOI_DRAW && r.program === x.program) {
      return r
    }
  }
  return null
}

/**
 * 有轮次可列的抽选卡:本岗那几组(浅蓝组头行,开关收起时也留着)与其余组分开(2026-09-29 自 drawCardOf 体内提出,三张卡共用)。
 * 不折叠的卡(fold = false,AIP 卡)各组全放进常显的那一列,不设开关;组头照旧只按 hit 着色。
 * 2026-10-01 Frank「这两个 是不是重复」(配图组头「共 2,300 份邀请 16 轮」与卡底「2026 年 16 轮,共 2,300 份邀请」):卡里只有一组、
 * 且这一组组头写了本年合计时卡底合计不出 —— 一组的卡两者是同一个数;组头没合计(汇装没出那一组)照旧出卡底;多组照旧出(那是全省合计)。
 *
 * @param x 标题、轮次标签、各组、来源、灰字、卡底合计、开关键与折不折叠。
 * @returns 抽选卡。
 */
function groupsCardOf(x: GroupsCardIn): DrawCard {
  const hits: EeCmpGroup[] = []
  const others: EeCmpGroup[] = []
  for (const g of x.groups) {
    if (g.hit || x.fold === false) {
      hits.push(g)
    } else {
      others.push(g)
    }
  }
  let foot = x.foot
  const only = x.groups[0]
  if (x.groups.length === 1 && only != null && only.total !== TEXT_NONE) {
    foot = []
  }
  return {
    title: x.title,
    label: x.label,
    hits,
    others,
    total: x.groups.length,
    source: x.source,
    lines: x.lines,
    foot,
    allKey: x.allKey,
  }
}

/**
 * 没有轮次可列、只写说明行的抽选卡(2026-09-29 抽选卡重排:「没有就标上」,不静默缺卡)。
 *
 * @param x 标题、说明行、来源与开关键。
 * @returns 抽选卡(没有组)。
 */
function lineCardOf(x: LineCardIn): DrawCard {
  return {
    title: x.title,
    label: TEXT_NONE,
    hits: [],
    others: [],
    total: 0,
    source: x.source,
    lines: x.lines,
    foot: [],
    allKey: x.allKey,
  }
}

/**
 * 卡底合计行(2026-09-29 抽选卡重排,Frank「本省抽选的和 等于 年度配额的 已邀请吗」「按你建议」):「{年} 年 N 轮,共 X 份邀请」——
 * 轮数数卡里列的(同一组同一天几行算一轮,与组头「N 轮」同一数法;按月那一组数月份),份数读汇装的全年合计(不在前端加,与配额卡
 * 「已发邀请」同一个数);下限指标写「至少」;汇装那一份没出(有一轮没公布)或份数分不开(安省改制前后两张卡)只写轮数;
 * 有轮次官方只写了上限再补一行(belowLineOf)。
 * 2026-09-30 下午 Frank「这种补充信息都删掉」(配图「其中 3 轮官方只写「少于 5」」):补的那一行撤,只剩合计一行。
 *
 * @param x 取词函数、省码、那一年、卡里列的轮次、配额行、口径层级与份数能不能写。
 * @returns 合计行(一行一条;没有轮次给空列)。
 */
function footLinesOf(x: FootLinesIn): string[] {
  const keys = new Set<string>()
  for (const d of x.rows) {
    keys.add(d.stream + KEY_SEP + d.drawDate)
  }
  if (keys.size === 0) {
    return []
  }
  const rounds = roundsTextOf({ t: x.t, rows: x.rows, n: keys.size })
  const row = ytdPickOf({ ops: x.ops, province: x.province, scopeKind: x.scopeKind })
  const count = ytdCountTextOf({ t: x.t, row })
  const lines: string[] = []
  if (row == null || count === TEXT_NONE || x.total === false) {
    lines.push(x.t('pnpdraws.footRounds', { year: x.year, rounds }))
  } else if (row.metric === OPS_INV_YTD_MIN) {
    lines.push(x.t('pnpdraws.footMin', { year: x.year, rounds, count }))
  } else {
    lines.push(x.t('pnpdraws.foot', { year: x.year, rounds, count }))
  }
  return lines
}

/**
 * 本省一份全年合计(汇装按抽选行加总的那几个指标;口径层级 '' = 省提名那一份,program = AIP 那一份;2026-09-29 抽选卡重排)。
 *
 * @param x 配额行、省码与口径层级。
 * @returns 那一行;没有给 null。
 */
function ytdPickOf(x: YtdPickIn): PnpOps | null {
  for (const r of x.ops) {
    if (r.province === x.province && r.scopeKind === x.scopeKind && YTD_COUNT_KIND[r.metric] != null) {
      return r
    }
  }
  return null
}

/**
 * 一组组头第三行(2026-09-29 Frank「每一个通道也需要一个总数吧」,选「单独一行靠右」):读汇装的这一组本年合计(scopeKind = drawStream、scope = 组键)
 * ——「共 7,465 份邀请」,下限指标写「至少 198 份邀请」;汇装没出(有一轮没公布,或本年一个确数都没有)时,这一组全是只写上限的
 * 轮次就写上限那一句(阿省警务五轮都是「Less than 10」),否则不出这一行。份数不在前端加:各组相加与卡底合计是同一套口径算的。
 * 2026-09-30 下午 Frank「这种补充信息都删掉」:上限那一句撤,汇装没出就不出这一行。
 *
 * @param x 取词函数、配额行、省码与组键。
 * @returns 那一行;不出给 ''。
 */
function groupTotalOf(x: GroupTotalIn): string {
  for (const r of x.ops) {
    if (r.province !== x.province || r.scopeKind !== OPS_SCOPE_DRAW_STREAM || r.scope !== x.stream) {
      continue
    }
    const count = ytdCountTextOf({ t: x.t, row: r })
    if (count === TEXT_NONE) {
      continue
    }
    if (r.metric === OPS_INV_YTD_MIN) {
      return x.t('pnpdraws.groupTotalMin', { count })
    }
    return x.t('pnpdraws.groupTotal', { count })
  }
  return TEXT_NONE
}

/**
 * 合计份数那几个字(「13,083 份邀请」「3,242 人入选」「632 份申请入选」;口径按指标名,YTD_COUNT_KIND;2026-09-29 抽选卡重排)。
 *
 * @param x 取词函数与挑到的合计行。
 * @returns 文字;没有合计行或指标名认不出给 ''。
 */
function ytdCountTextOf(x: YtdCountIn): string {
  if (x.row == null || x.row.value == null) {
    return TEXT_NONE
  }
  const kind = YTD_COUNT_KIND[x.row.metric]
  if (kind == null) {
    return TEXT_NONE
  }
  return x.t(countKeyOf({ kind, n: x.row.value }), { n: x.row.value.toLocaleString(NUM_LOCALE) })
}

/**
 * 「N 轮」/「N 个月」(卡里列的是按月那一组就数月份;英文单复数走 one / many 两个词条;2026-09-29 抽选卡重排)。
 *
 * @param x 取词函数、卡里列的轮次与个数。
 * @returns 文字。
 */
function roundsTextOf(x: RoundsTextIn): string {
  let keys = ROUNDS_KEYS
  const first = x.rows[0]
  if (first != null && isMonthOnly(first.drawDate)) {
    keys = MONTHS_KEYS
  }
  if (x.n === 1) {
    return x.t(keys.one, { n: x.n })
  }
  return x.t(keys.many, { n: x.n })
}

/**
 * 抽选卡只列哪一年(2026-09-29 抽选卡重排:「年份跟配额卡标题同一个来源,不另判」):有配额卡用它标题的年份;没有取本省最近一轮的年份;
 * 本省一轮都没有给 ''(不筛)。
 *
 * @param x 配额卡、省码与全部抽选行。
 * @returns 年份(`YYYY`)。
 */
export function cardYearOf(x: CardYearIn): string {
  if (x.quota != null) {
    return x.quota.year
  }
  let latest = TEXT_NONE
  for (const d of x.draws) {
    if (d.province === x.province && d.kind === KIND_DRAW && d.drawDate > latest) {
      latest = d.drawDate
    }
  }
  return latest.slice(0, YEAR_LEN)
}

/**
 * 「{年} 年配额」卡(2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」;看过效果图,标题照 Frank「每个框先设计一个 title」那张表):
 * 列 = 总数 / 已发提名 / 剩余,只列这个省官方有的项(安省只有总数就只一列,不拿长横凑);行 = 全省,本岗对应的抽选组与配额行的
 * 通道键对得上(阿省公布到通道)再加「本岗通道」一行;表下「截至 {日期}」取官方写的截至日,没写就不出。数字全是官方原数,不自己减。
 * 2026-09-27 Frank「已发和总数放到一个卡片里可以吗」「你帮我弄」:抽选卡标题下那行「全年已发邀请 / 已入选」(原 ytdLineOf)并进来当一列
 * —— 读汇装出的 invitations_ytd(逐轮邀请加总)/ selections_ytd(NS 按月选取人数加总),汇装那边当年任一轮没公布人数就不出,
 * 这里不自己加;AIP 那组的「份申请入选」不在合计里(汇装已剔)。没有配额只有合计的省(NB、PE)这张卡就只这一列。
 * 截至日改取最右一列带截至日的那格:配额总数是全年定数(安省、NS、NL 不写截至日),截至日跟着会动的那几项走;
 * 同一省几项的截至日当天核过一致(阿省三项同为 2026-09-23),哪天分叉了这一行要改成逐项写。
 * 同日晚果然分叉(曼省补上全年已邀请后:已发提名截至 08 月、已邀请申请截至 09-24)→ 改逐项写,挪到右下角(asOfLinesOf)。
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
  const dates: string[] = []
  for (const [metrics, head] of QUOTA_COLS) {
    const picked = opsPickOf({ rows: mine, streamKey: TEXT_NONE, metrics })
    if (picked != null) {
      cols.push(metrics)
      heads.push(x.t(head))
      dates.push(colAsOfOf({ metrics, row: picked }))
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
  const streamKey = quotaStreamKeyOf({ rows: mine, hitStreams: x.hitStreams, quotaKey: x.quotaKey })
  if (streamKey !== TEXT_NONE) {
    rows.push(quotaRowOf({ rows: mine, streamKey, cols, label: x.t('pnpquota.stream') }))
  }
  return {
    title: x.t('pnpquota.title', { year: yearOf(first) }),
    source: sourceLinkOf({ t: x.t, url: first.url }),
    heads,
    rows,
    asOfLines: asOfLinesOf({ t: x.t, heads, dates }),
    year: yearOf(first),
  }
}

/**
 * 配额卡右下角的截至行(2026-09-27 Frank「这个数据怎么回事」「这两个还不一样吗」「这他妈弄的乱七八糟的」,看过效果图选「照改,加这一列」;同日 Frank「这个截止日期放到右下角呢」):
 * 各列官方截至日一致只写一行「截至 {日期}」;不一致逐列写「{列名}截至 {日期}」(曼省已发提名截至 08 月、已邀请申请截至 09-24,
 * 原先只写最右一列那天,读成提名数也截至 09-24)。没写截至日的列不写;配额总数是全年定数,它那一格的截至日(曼省月度页、
 * 阿省处理页的页面日期)也不写(colAsOfOf)。
 *
 * @param x 取词函数、列名与各列截至日。
 * @returns 截至行;都没写给空列。
 */
function asOfLinesOf(x: AsOfLinesIn): string[] {
  const distinct: string[] = []
  for (const d of x.dates) {
    if (d !== TEXT_NONE && distinct.includes(d) === false) {
      distinct.push(d)
    }
  }
  const only = distinct[0]
  if (only == null) {
    return []
  }
  if (distinct.length === 1) {
    return [x.t('pnpquota.asOf', { date: only })]
  }
  const lines: string[] = []
  for (let i = 0; i < x.dates.length; i += 1) {
    const date = x.dates[i]
    const col = x.heads[i]
    if (date != null && col != null && date !== TEXT_NONE) {
      lines.push(x.t('pnpquota.asOfCol', { col, date }))
    }
  }
  return lines
}

/**
 * 一列的截至日:配额总数那一列是全年定数,不算它的截至日(给 '');其余照官方写的截至日(2026-09-27)。
 *
 * @param x 这一列认的指标名与挑到的那一行。
 * @returns 截至日;'' = 不写。
 */
function colAsOfOf(x: ColAsOfIn): string {
  if (x.metrics.includes(OPS_ALLOCATION)) {
    return TEXT_NONE
  }
  return x.row.asOf
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
      cells.push(quotaCellOf(r))
    }
  }
  return { key: x.label, label: x.label, cells }
}

/**
 * 配额卡一格的数:千分位;下限指标(AB / BC 有轮次官方只写上限,那几轮按 0 计)前面加「≥ 」(2026-09-29 抽选卡重排,
 * Frank「按你建议」:AB、BC 的已邀请写「至少 X」)。
 * 2026-09-30 魁省配额是区间(甄选计划 32,600–35,600):没有数值的行写官方原文(数据层按千分位写好);原文也没有写长横。
 *
 * @param r 挑到的那一行。
 * @returns 格里的字。
 */
function quotaCellOf(r: PnpOps): string {
  if (r.value == null) {
    if (r.valueText === TEXT_NONE) {
      return DASH
    }
    return r.valueText
  }
  const n = r.value.toLocaleString(NUM_LOCALE)
  if (r.metric === OPS_INV_YTD_MIN) {
    return QUOTA_MIN_PREFIX + n
  }
  return n
}

/**
 * 本岗对应的抽选组在配额行里是哪条通道:抽选组名小写后与通道级配额行的通道键逐字相等才算(阿省机会通道、旅游酒店通道这类);
 * 对不上给 '' —— 不拿近似名硬配(医护那组抽选名与配额名单复数不同,就不出通道那一行)。
 * 2026-09-27 九省体检(Frank「问题太多了」「能用多 agent 修么」):先查人工对照表 QUOTA_STREAM_KEYS(本岗具名通道 → 配额行通道键;阿省医护 / 科技 /
 * 警务三条组名与配额名不同字),再按组名小写逐字相等配;仍不拿近似名硬配。
 * 2026-09-28 通道表批二:人工对照搬进库表 pathways(本岗通道那一行的 quotaKey,由 mart 用配额行 streamKey 同一个归一算出),
 * QUOTA_STREAM_KEYS 常量退役;先查它、再按组名小写配,顺序与结果不变。
 *
 * @param x 这一省的配额行、本岗通道的配额键与本岗对应的抽选组。
 * @returns 通道键;对不上给 ''。
 */
function quotaStreamKeyOf(x: QuotaStreamIn): string {
  const keys: string[] = []
  if (x.quotaKey !== TEXT_NONE) {
    keys.push(x.quotaKey)
  }
  for (const h of x.hitStreams) {
    keys.push(h.toLowerCase())
  }
  for (const k of keys) {
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
 * 2026-09-27 并入已发邀请 / 已入选后 QUOTA_COLS 五项,但当天各省最多三项(阿省总数 / 已发提名 / 剩余,阿省汇装不出全年已发邀请);
 * 哪天一省凑出四项,这里加一档并先验 375 宽。
 * 2026-09-29 抽选卡重排:阿省汇装出了全年已发邀请的下限(「≥ 13,083」),凑出四项,加 quotaCols4(375 宽另验)。
 *
 * @param n 值的列数。
 * @returns 类名。
 */
export function quotaGridClsOf(n: number): string {
  const byCount = [cssOf(css.quotaCols1), cssOf(css.quotaCols2), cssOf(css.quotaCols3), cssOf(css.quotaCols4)]
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
 * 2026-09-27 Frank「就门槛就只提门槛就行。不用提原文,不用提本岗」「如果需要提那是之后的时候,在单独用卡片分开」:点开看原句撤了,值一项一行纯文字;原文 / 本岗对照要提以后单独开卡。
 * 2026-09-28 通道表批二:本岗通道 → 门槛流的对照改读库表 pathways(本岗通道那一行的 reqStreams),两张常量退役;没登记的省照旧不出卡。
 * 2026-09-29 Frank「照这个做」(安省门槛卡,看过文字效果图):工作经验之后加「工资」一行;语言 / 经验按本岗 TEER 与排除职业挑档,
 * 经验列应届款与替代路径「或……」;雇主分区各档全部列出。
 * 2026-10-01 Frank「检查一下所有的这个工作经验。如果是 过去十年 24 个月工作经验。为什么还对雇主有要求。」:
 * Frank 把「雇主」行读成了对攒经验那个雇主的要求 —— 它说的是发 offer 的雇主。挪到「雇主 offer」正下面、行名改「雇主条件」
 *(资讯页门槛卡同)。
 *
 * @param x 取词函数、本岗、门槛表与本岗走的那条通道。
 * @returns 门槛卡;本岗通道没登记对照或没有门槛行给 null。
 */
export function gateCardOf(x: GateCardOfIn): GateCardSpec | null {
  const streams = gateStreamsOf(x.channel)
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
  if (applicantRowsOf(chan) === 0) {
    return null
  }
  const one: GateRowOfIn = { t: x.t, job: x.job, mine, chan }
  const rows: GateRowSpec[] = []
  for (const row of [statusRowOf(one), offerRowOf(one), empRowOf(one), langRowOf(one), expRowOf(one),
    residenceRowOf(one), wageRowOf(one), pointsRowOf(one), eeRowOf(one), otherRowOf(one)]) {
    if (row != null) {
      rows.push(row)
    }
  }
  return {
    title: x.t('pnpgate.title'),
    sub: TEXT_NONE,
    tags: [],
    source: sourceLinkOf({ t: x.t, url: gateUrlOf({ chan, streams }) }),
    rows,
    empty: TEXT_NONE,
  }
}

/**
 * 本岗通道那几条流里申请人侧的门槛有几行(雇主侧不算):一行都没有就不出卡 —— 只剩全省的 offer 形态与雇主几行会读成门槛只有这些
 * (2026-09-29 七省合并:雇主门槛所在的「all streams」流挂进各通道 reqStreams 后,原先「本岗通道没有门槛行」的判据得改数申请人侧)。
 *
 * @param chan 本岗通道那几条流的门槛行。
 * @returns 申请人侧行数。
 */
function applicantRowsOf(chan: PnpReq[]): number {
  let n = 0
  for (const r of chan) {
    if (r.subject !== GATE_SUBJECT_EMPLOYER) {
      n += 1
    }
  }
  return n
}

/**
 * 本岗通道在门槛表里对应哪几条流(口径同 drawHitStreamsOf:具名通道查 NAMED_REQ_STREAMS,落省默认通道查 GEN_REQ_STREAMS)。
 * 2026-09-28 通道表批二:两张常量退役,读本岗通道那一行的 reqStreams(本岗通道同 drawHitStreamsOf,由 pnpChannelOf 给)。
 *
 * @param channel 本岗走的那条通道(null = 没有)。
 * @returns 流名;没登记给空数组。
 */
function gateStreamsOf(channel: PnpPathway | null): string[] {
  if (channel == null) {
    return []
  }
  return channel.reqStreams
}

/**
 * 标题右端来源的出处页:本岗通道第一条带网址的门槛行。
 * 2026-09-29 七省接入(曼省子代理回报):改按通道登记流名的先后取 —— 原先按库表流名排序取第一条,曼省会落到语言政策页而不是 SWM 资格页。
 *
 * @param x 本岗通道的门槛行。
 * @returns 网址;都没有给 ''。
 */
function gateUrlOf(x: GateUrlIn): string {
  for (const s of x.streams) {
    for (const r of x.chan) {
      if (r.stream === s && r.url !== TEXT_NONE) {
        return r.url
      }
    }
  }
  return TEXT_NONE
}

/**
 * 「身份」行(2026-09-30 通道与门槛批 1,Frank「那不是在国内有工作经验的可以直接申请了吗?」「对啊。门槛要说清楚」):申请时人得在哪、
 * 认哪几类工签、维持身份算不算 —— 全由身份行的 basis 编码出(statusLinesOf),排卡上第一行。本岗通道没登记身份行就不出。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有给 null。
 */
function statusRowOf(x: GateRowOfIn): GateRowSpec | null {
  const prov = x.t(PROV_KEY_HEAD + x.job.province)
  const lines: string[] = []
  for (const r of x.chan) {
    if (r.factor !== GATE_F.status || reqAppliesOf({ r, job: x.job }) === false) {
      continue
    }
    for (const line of statusLinesOf({ t: x.t, r, prov })) {
      lines.push(line)
    }
  }
  if (lines.length === 0) {
    return null
  }
  return { key: GATE_ROW.status, label: x.t('pnpgate.k.status'), lines, notes: [] }
}

/**
 * 一条身份行的文案:where=inProvince →「申请时须在本省工作」;permits=… → 认哪几类工签(逐个查词条,顿号连);noImplied →
 * 「申请期间维持身份的不算」。认不出的编码不出(宁缺不乱写)。
 * 同日 375 实拍工签那句折成三行、断在词中间:改「须持以下工签之一:」一行 + 每种工签各一行(文案「一行一条」)。
 *
 * @param x 取词函数、身份行与本省界面名。
 * @returns 文案;没有给空列。
 */
function statusLinesOf(x: StatusLinesIn): string[] {
  const out: string[] = []
  if (basisValueOf({ basis: x.r.basis, key: BASIS_WHERE }) === BASIS_WHERE_IN_PROV) {
    out.push(x.t('pnpgate.statusInProv', { prov: x.prov }))
  }
  const permits = basisValueOf({ basis: x.r.basis, key: BASIS_PERMITS })
  if (permits !== TEXT_NONE) {
    out.push(x.t('pnpgate.statusPermitsHead'))
    for (const p of permits.split(BASIS_PERMIT_SEP)) {
      out.push(capFirstOf(x.t(GATE_PERMIT_HEAD + p)))
    }
  }
  if (basisHasOf({ basis: x.r.basis, key: BASIS_NO_IMPLIED })) {
    out.push(x.t('pnpgate.statusNoImplied'))
  }
  return out
}

/**
 * 「雇主 offer」行:全职 + 不收哪几种(offer 形态行的编码值,按 GATE_FORM_ORDER 排),下面灰字摆本岗的工时 / 雇佣期;
 * 点开是 offer 形态原文与本岗通道各流的 offer 条文。
 * 2026-09-27 Frank「就门槛就只提门槛就行。不用提原文,不用提本岗」「如果需要提那是之后的时候,在单独用卡片分开」:本岗灰字与点开的原文都撤了,只列门槛。
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
  return {
    key: GATE_ROW.offer,
    label: x.t('pnpgate.k.offer'),
    lines: [x.t('pnpgate.offerFull'), capFirstOf(x.t('pnpgate.offerNot', { list: names.join(x.t('pnpgate.sep')) }))],
    notes: [],
  }
}

/**
 * 「语言」行:本岗通道的 CLB 门槛挑一档(职业码点名的 → 本岗 TEER 那档 → 不限档)。
 * 2026-09-29 Frank「照这个做」(安省门槛卡):免考条款(近 N 年在本省毕业)另起一行,只对管得着本岗的出(reqAppliesOf)。
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
  const lines = [x.t('pnpgate.lang', { n: row.value })]
  const exempt = rowOfFactor({ rows: x.chan, factor: GATE_F.languageExempt })
  if (exempt != null && exempt.value != null && reqAppliesOf({ r: exempt, job: x.job })) {
    lines.push(x.t('pnpgate.langExempt', { n: exempt.value, prov: x.t(PROV_KEY_HEAD + x.job.province) }))
  }
  return {
    key: GATE_ROW.lang,
    label: x.t('pnpgate.k.lang'),
    lines,
    notes: [],
  }
}

/**
 * 在语言行里挑本岗那一档:职业码前缀点名的最具体,其次本岗 TEER 所在的档,最后不限 TEER 也不限职业的那行。
 * 2026-09-29:点名行自带的排除前缀(安省技工档排除 726 / 932)落在里头的不算点名,退回 TEER 那档。
 *
 * @param x 语言行与本岗。
 * @returns 那一行;都不适用给 null。
 */
function langPickOf(x: LangPickIn): PnpReq | null {
  let byTeer: PnpReq | null = null
  let general: PnpReq | null = null
  for (const r of x.rows) {
    if (r.appliesNoc !== TEXT_NONE) {
      const named = nocHitOf({ noc: x.job.noc, applies: r.appliesNoc })
      if (named && nocHitOf({ noc: x.job.noc, applies: r.excludesNoc }) === false) {
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
 * 这一行门槛管不管本岗:标了 TEER 档的要落在档里,标了排除职业的不能落在排除里(2026-09-29 安省门槛卡:
 * TEER 4 / 5 只有 9 个月那档;卡车 / 公交司机不适用应届与执照两条)。本岗未分类时标了 TEER 档的行一律不管(挑不了档,不猜)。
 *
 * @param x 门槛行与本岗。
 * @returns 管给 true。
 */
function reqAppliesOf(x: ReqAppliesIn): boolean {
  if (x.r.appliesTeer !== TEXT_NONE && teerHitOf({ teer: x.job.teer, applies: x.r.appliesTeer }) === false) {
    return false
  }
  return nocHitOf({ noc: x.job.noc, applies: x.r.excludesNoc }) === false
}

/**
 * 「工作经验」行:通用那条(近 N 个月内 / 同雇主在职)一行,阿省境内替代款「或……」另起一行。
 * 2026-09-29 Frank「照这个做」(安省门槛卡):只挑管本岗的行(reqAppliesOf)—— 安省 TEER 0-3 与 4 / 5 各一档;
 * 安省应届毕业生款与两条替代路径(同职业累计、持执照,expAltLinesOf)各起一行「或……」。
 * 同日七省接入:曼省外省毕业款(grad-other-province,比通用档严,不是「或」)另起一行「外省毕业的须满 N 个月」。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;本岗通道没有按月计的经验门槛给 null。
 */
function expRowOf(x: GateRowOfIn): GateRowSpec | null {
  let main: PnpReq | null = null
  let local: PnpReq | null = null
  let grad: PnpReq | null = null
  let otherProv: PnpReq | null = null
  for (const r of x.chan) {
    if (r.factor !== GATE_F.experience || r.unit !== GATE_UNIT_MONTHS || r.value == null) {
      continue
    }
    if (reqAppliesOf({ r, job: x.job }) === false) {
      continue
    }
    if (r.appliesCondition === TEXT_NONE && main == null) {
      main = r
    }
    if (r.appliesCondition === GATE_COND_LOCAL && local == null) {
      local = r
    }
    if (r.appliesCondition === GATE_COND_GRAD && grad == null) {
      grad = r
    }
    if (r.appliesCondition === GATE_COND_OTHER_PROV && otherProv == null) {
      otherProv = r
    }
  }
  if (main == null || main.value == null) {
    return null
  }
  const prov = x.t(PROV_KEY_HEAD + x.job.province)
  const lines = [expLineOf({ t: x.t, r: main, n: main.value })]
  for (const line of expScopeLinesOf({ t: x.t, r: main, prov })) {
    lines.push(line)
  }
  if (local != null && local.value != null) {
    const w = basisValueOf({ basis: local.basis, key: BASIS_WINDOW })
    if (w !== TEXT_NONE) {
      lines.push(x.t('pnpgate.expLocal', { n: local.value, w, prov }))
    }
  }
  if (grad != null && grad.value != null) {
    lines.push(x.t('pnpgate.expGrad', { n: grad.value, prov }))
  }
  if (otherProv != null && otherProv.value != null) {
    lines.push(x.t('pnpgate.expGradOther', { n: otherProv.value, prov }))
  }
  for (const line of expAltLinesOf(x)) {
    lines.push(line)
  }
  return { key: GATE_ROW.exp, label: x.t('pnpgate.k.exp'), lines, notes: [] }
}

/**
 * 经验主行下面「说清楚」的几行(2026-10-01 Frank「检查一下所有的这个工作经验。如果是 过去十年 24 个月工作经验。为什么还对雇主有要求。」):
 * 在哪攒的算(加拿大境内外都算 / 须在本省)、哪类职业(任何 TEER 0–3 职业都算 / 须是 TEER 0–3 职业)、要不要同职业(须是这个职业 /
 * 须在同一职业连续)、要不要相关(与这份工作相关 / 与所学专业相关)—— 全由经验行口径包编码出,数据层只在官方原句写了时才打标。
 * 原先只有「加拿大境内外都算」一种,写在 expRowOf 里,同批并进这里。
 *
 * @param x 取词函数、经验主行与本省界面名。
 * @returns 文案;口径包没写给空列。
 */
function expScopeLinesOf(x: ExpScopeIn): string[] {
  const out: string[] = []
  const where = basisValueOf({ basis: x.r.basis, key: BASIS_WHERE })
  if (where === BASIS_WHERE_ANYWHERE) {
    out.push(x.t('pnpgate.expAnywhere'))
  }
  if (where === BASIS_WHERE_IN_PROV) {
    out.push(x.t('pnpgate.expInProv', { prov: x.prov }))
  }
  const teer = basisValueOf({ basis: x.r.basis, key: BASIS_EXP_TEER })
  if (teer !== TEXT_NONE) {
    if (basisHasOf({ basis: x.r.basis, key: BASIS_ANY_NOC })) {
      out.push(x.t('pnpgate.expAnyTeer', { teers: qcTeerRangeOf(teer) }))
    } else {
      out.push(x.t('pnpgate.expTeer', { teers: qcTeerRangeOf(teer) }))
    }
  }
  if (basisHasOf({ basis: x.r.basis, key: BASIS_SAME_NOC })) {
    out.push(x.t('pnpgate.expSameOcc'))
  }
  if (basisHasOf({ basis: x.r.basis, key: BASIS_ONE_NOC })) {
    out.push(x.t('pnpgate.expOneNoc'))
  }
  if (basisHasOf({ basis: x.r.basis, key: BASIS_RELATED })) {
    out.push(x.t('pnpgate.expRelated'))
  }
  if (basisHasOf({ basis: x.r.basis, key: BASIS_FIELD })) {
    out.push(x.t('pnpgate.expField'))
  }
  return out
}

/**
 * 通用经验那一条的写法:同雇主在职 / 近 N 个月内 / 只写月数。
 * 2026-09-30 通道与门槛批 1(Frank「24 个月全职经验。不需要本省?国外呢?」):口径包写了 where=anywhere 的,写明「加拿大境内外都算」
 *(同日 375 实拍折在词中间,改由 expRowOf 在下面另起一行「加拿大境内外的经验都算」,本函数不再管)。
 * 2026-10-01:口径包带 paid 的(萨省本省毕业生「paid employment」)写「N 个月有薪工作经验」,不套「全职」。
 *
 * @param x 取词函数、经验行与月数。
 * @returns 文案。
 */
function expLineOf(x: ExpLineIn): string {
  if (basisHasOf({ basis: x.r.basis, key: BASIS_PAID })) {
    return x.t('pnpgate.expPaid', { n: x.n })
  }
  if (basisHasOf({ basis: x.r.basis, key: BASIS_TENURE })) {
    return x.t('pnpgate.expTenure', { n: x.n })
  }
  const w = basisValueOf({ basis: x.r.basis, key: BASIS_WINDOW })
  if (w !== TEXT_NONE) {
    return x.t('pnpgate.expWin', { n: x.n, w })
  }
  const wy = basisValueOf({ basis: x.r.basis, key: BASIS_WINDOW_YEARS })
  if (wy !== TEXT_NONE) {
    return x.t('pnpgate.expWinYears', { n: x.n, w: wy })
  }
  return x.t('pnpgate.exp', { n: x.n })
}

/**
 * 工作经验的替代路径各一行「或……」(门槛表 experienceAlt:同职业累计 N 年(近 M 年内)、持有这份工作要求的执照;
 * 2026-09-29 安省门槛卡)。只挑管本岗的行;认不出口径的不出(宁缺不乱写)。
 * 同日七省接入加两种:在担保雇主处全职满 N 个月(萨省三条定向通道,employerTenure)、本省院校毕业(NB Graduates,provGraduate)。
 * 2026-09-30 通道与门槛批 1 加一种:持 PGWP 的那一档(阿省机会通道「近 18 个月在本省满 6 个月」,pgwp + windowMonths)。
 * 同日批 2 资讯页真数据性质测试抓到:本省院校毕业那条英文 / 韩文词条带 {prov},原先没传省名,英文界面露出「{prov}」—— 补传。
 *
 * @param x 各行构造器的共同入参。
 * @returns 文案;没有给空列。
 */
function expAltLinesOf(x: GateRowOfIn): string[] {
  const lines: string[] = []
  const prov = x.t(PROV_KEY_HEAD + x.job.province)
  for (const r of x.chan) {
    if (r.factor !== GATE_F.experienceAlt || reqAppliesOf({ r, job: x.job }) === false) {
      continue
    }
    const w = basisValueOf({ basis: r.basis, key: BASIS_WINDOW_YEARS })
    const sameNoc = basisHasOf({ basis: r.basis, key: BASIS_SAME_NOC })
    if (sameNoc && r.unit === GATE_UNIT_YEARS && r.value != null && w !== TEXT_NONE) {
      lines.push(x.t('pnpgate.expSameNoc', { n: r.value, w }))
    } else if (basisHasOf({ basis: r.basis, key: BASIS_LICENCE })) {
      lines.push(x.t('pnpgate.expLicence'))
    } else if (basisHasOf({ basis: r.basis, key: BASIS_TENURE }) && r.unit === GATE_UNIT_MONTHS && r.value != null) {
      lines.push(x.t('pnpgate.expAltTenure', { n: r.value }))
    } else if (basisHasOf({ basis: r.basis, key: BASIS_PROV_GRADUATE })) {
      lines.push(x.t('pnpgate.expAltProvGrad', { prov }))
    } else if (basisHasOf({ basis: r.basis, key: BASIS_PGWP }) && r.unit === GATE_UNIT_MONTHS && r.value != null) {
      const wm = basisValueOf({ basis: r.basis, key: BASIS_WINDOW })
      if (wm !== TEXT_NONE) {
        lines.push(x.t('pnpgate.expPgwpHead'))
        lines.push(x.t('pnpgate.expPgwp', { n: r.value, w: wm, prov }))
      }
    }
  }
  return lines
}

/**
 * 「工资」行(2026-09-29 Frank「照这个做」:安省门槛卡加这一行):门槛是本职业在本地区的中位工资(口径 occMedian)。
 * 只认中位口径;别的写法(绝对数、按档)还没有省接进门槛卡,认不出不出(宁缺不乱写)。
 * 同日 Frank 选「分档判」:官方原句「the low wage level, if the employee is a recent Ontario graduate and the job offer is in a
 * TEER 0-3 category occupation」—— 管得着本岗(TEER 0-3)时下面加一行「或本省应届毕业生不低于低位工资」(口径 occLow)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;本岗通道没有中位工资门槛给 null。
 */
function wageRowOf(x: GateRowOfIn): GateRowSpec | null {
  let median: PnpReq | null = null
  let low: PnpReq | null = null
  for (const r of x.chan) {
    if (r.factor !== GATE_F.wage) {
      continue
    }
    if (median == null && r.appliesCondition === TEXT_NONE && basisHasOf({ basis: r.basis, key: BASIS_OCC_MEDIAN })) {
      median = r
    }
    const grad = r.appliesCondition === GATE_COND_GRAD && basisHasOf({ basis: r.basis, key: BASIS_OCC_LOW })
    if (low == null && grad && reqAppliesOf({ r, job: x.job })) {
      low = r
    }
  }
  if (median == null) {
    return null
  }
  const lines = [capFirstOf(x.t('pnpgate.wageMedian'))]
  if (low != null) {
    lines.push(x.t('pnpgate.wageLowGrad', { prov: x.t(PROV_KEY_HEAD + x.job.province) }))
  }
  return { key: GATE_ROW.wage, label: x.t('pnpgate.k.wage'), lines, notes: [] }
}

/**
 * 「居住」行(2026-09-29 七省接入:NB「have lived in New Brunswick for the past six months」这类按月的居住门槛)。
 * 只认按月写的;别的写法认不出不出(宁缺不乱写)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;本岗通道没有居住门槛给 null。
 */
function residenceRowOf(x: GateRowOfIn): GateRowSpec | null {
  const res = rowOfFactor({ rows: x.chan, factor: GATE_F.residence })
  if (res == null || res.value == null || res.unit !== GATE_UNIT_MONTHS) {
    return null
  }
  const prov = x.t(PROV_KEY_HEAD + x.job.province)
  const line = capFirstOf(x.t('pnpgate.residence', { n: res.value, prov }))
  return { key: GATE_ROW.residence, label: x.t('pnpgate.k.residence'), lines: [line], notes: [] }
}

/**
 * 「积分」行(2026-09-29 七省接入:萨省 SINP 这类「本省打分表至少 N 分」的门槛,因素 pointsMin)。
 * 2026-09-30 资讯页走查:英文词条小写起头(同其余各项),行首补大写(原先英文界面写成「provincial points grid ≥ 60」)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;本岗通道没有打分门槛给 null。
 */
function pointsRowOf(x: GateRowOfIn): GateRowSpec | null {
  const pts = rowOfFactor({ rows: x.chan, factor: GATE_F.pointsMin })
  if (pts == null || pts.value == null) {
    return null
  }
  return {
    key: GATE_ROW.points,
    label: x.t('pnpgate.k.points'),
    lines: [capFirstOf(x.t('pnpgate.pointsMin', { n: pts.value }))],
    notes: [],
  }
}

/**
 * 「EE」行(科技、警务这类 EE 流):联邦 EE 档案、符合 CEC / FSW / FST、CRS 线,有哪条列哪条。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;本岗通道不是 EE 流给 null。
 */
function eeRowOf(x: GateRowOfIn): GateRowSpec | null {
  const parts: string[] = []
  const profile = rowOfFactor({ rows: x.chan, factor: GATE_F.eeProfile })
  if (profile != null) {
    parts.push(x.t('pnpgate.eeProfile'))
  }
  const program = rowOfFactor({ rows: x.chan, factor: GATE_F.eeProgram })
  if (program != null) {
    parts.push(x.t('pnpgate.eeProgram'))
  }
  const crs = rowOfFactor({ rows: x.chan, factor: GATE_F.crs })
  if (crs != null && crs.value != null) {
    parts.push(x.t('pnpgate.crs', { n: crs.value }))
  }
  if (parts.length === 0) {
    return null
  }
  return {
    key: GATE_ROW.ee,
    label: x.t('pnpgate.k.ee'),
    lines: parts.map(capFirstOf),
    notes: [],
  }
}

/**
 * 「雇主」行:本省雇主侧三项(经营年限 / 年收入 / 全职员工),只取不分区的全省那档(分区的省后面批次再接)。
 * 2026-09-29 Frank「照这个做」(安省门槛卡):分区的省接上 —— 年收入 / 全职员工按区各一行「≥ N(区名)」,全部列出:
 * 官方「指定地区」名单本站没抓全,判不了本岗落哪一区,不猜(zonedLinesOf)。
 * 同日七省接入(曼省子代理回报):雇主行改读本通道登记的流(原先读全省 —— 曼省唯一的雇主行属雇主直招项目 EDI,会串到 SWM 卡上);
 * 各省雇主门槛所在的「all streams」流随之挂进各通道的 reqStreams。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;本省没有雇主侧门槛给 null。
 */
function empRowOf(x: GateRowOfIn): GateRowSpec | null {
  const emp: PnpReq[] = []
  const zoned: PnpReq[] = []
  for (const r of x.chan) {
    if (r.subject !== GATE_SUBJECT_EMPLOYER || r.value == null) {
      continue
    }
    if (r.appliesArea === TEXT_NONE) {
      emp.push(r)
    } else {
      zoned.push(r)
    }
  }
  const prov = x.t(PROV_KEY_HEAD + x.job.province)
  const parts: string[] = []
  const years = rowOfFactor({ rows: emp, factor: GATE_F.empYears })
  if (years != null && years.value != null) {
    parts.push(x.t(empYearsKeyOf(years), { n: years.value, prov }))
  }
  const revenue = rowOfFactor({ rows: emp, factor: GATE_F.empRevenue })
  if (revenue != null && revenue.value != null) {
    parts.push(x.t('pnpgate.empRevenue', { n: revenue.value.toLocaleString(NUM_LOCALE) }))
  }
  for (const line of zonedLinesOf({ t: x.t, rows: zoned, factor: GATE_F.empRevenue, key: GATE_REVENUE_AREA_KEY })) {
    parts.push(line)
  }
  const staff = rowOfFactor({ rows: emp, factor: GATE_F.empStaff })
  if (staff != null && staff.value != null) {
    parts.push(x.t('pnpgate.empStaff', { n: staff.value }))
  }
  for (const line of zonedLinesOf({ t: x.t, rows: zoned, factor: GATE_F.empStaff, key: GATE_STAFF_AREA_KEY })) {
    parts.push(line)
  }
  if (parts.length === 0) {
    return null
  }
  return {
    key: GATE_ROW.emp,
    label: x.t('pnpgate.k.emp'),
    lines: parts.map(capFirstOf),
    notes: [],
  }
}

/**
 * 经营年限那一行用哪条文案:官方按月写的(萨省「no less than 24 consecutive months」)写「个月」,其余写「个财年」
 * (2026-09-29 七省接入前补:原先一律「个财年」,萨省会读成 24 个财年)。
 * 同日七省回报:官方写 fiscal years 的只有阿省(口径标记 fiscal),其余省写 years —— 默认改「年」。
 *
 * @param r 经营年限那一行。
 * @returns 文案键。
 */
function empYearsKeyOf(r: PnpReq): string {
  if (r.unit === GATE_UNIT_MONTHS) {
    return GATE_EMP_MONTHS_KEY
  }
  if (basisHasOf({ basis: r.basis, key: BASIS_FISCAL })) {
    return GATE_EMP_FISCAL_KEY
  }
  return GATE_EMP_YEARS_KEY
}

/**
 * 分区的雇主门槛各一行「≥ N(区名)」(年收入 / 全职员工;2026-09-29 安省门槛卡),按门槛表原序。
 * 区名走词条 `pnpgate.area.` + 区码;查不到词条的那区不出(不把区码原样露给用户;pnpFacts 测试锁住数据里的区码都有词条)。
 *
 * @param x 取词函数、分区的雇主行、要哪一项与它的文案键。
 * @returns 文案;没有给空列。
 */
function zonedLinesOf(x: ZonedLinesIn): string[] {
  const lines: string[] = []
  for (const r of x.rows) {
    if (r.factor !== x.factor || r.value == null) {
      continue
    }
    const areaKey = GATE_AREA_HEAD + r.appliesArea
    const area = x.t(areaKey)
    if (area === areaKey) {
      continue
    }
    lines.push(x.t(x.key, { n: r.value.toLocaleString(NUM_LOCALE), area }))
  }
  return lines
}

/**
 * 「其他」行:指定社区推荐信、职业执照或注册(乡村振兴、医护专项这类流才有)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;都没有给 null。
 */
function otherRowOf(x: GateRowOfIn): GateRowSpec | null {
  const parts: string[] = []
  const endorse = rowOfFactor({ rows: x.chan, factor: GATE_F.endorse })
  if (endorse != null) {
    parts.push(x.t('pnpgate.endorse'))
  }
  const licensing = rowOfFactor({ rows: x.chan, factor: GATE_F.licensing })
  if (licensing != null) {
    parts.push(x.t('pnpgate.licensing'))
  }
  if (parts.length === 0) {
    return null
  }
  return {
    key: GATE_ROW.other,
    label: x.t('pnpgate.k.other'),
    lines: parts.map(capFirstOf),
    notes: [],
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
 * 资讯页「通道与门槛」一省的门槛卡(2026-09-30 通道与门槛批 2;Frank「各省门槛 我觉得 应该放到资讯下面」「盘点各种通道,各种门槛」
 * 「对啊。门槛要说清楚」;设计 docs/design/通道与门槛-20260930.md):本省现行通道每条一张卡,省默认在前,其余照通道表顺序。
 * 卡与职位弹框「本岗通道的门槛」同一个组件、同一套行构造器;不同的是不挑本岗那档 —— 语言全档列、经验与工资按 TEER 分档列。
 * 只陈列官方门槛,不判「你够不够」。
 *
 * @param x 取词函数、界面语言、省码、通道对照表与门槛表。
 * @returns 卡片;本省没有通道给空列。
 */
export function provGateCardsOf(x: ProvGateCardsIn): GateCardSpec[] {
  const mine: PnpReq[] = []
  for (const r of x.reqs) {
    if (r.province === x.province) {
      mine.push(r)
    }
  }
  const out: GateCardSpec[] = []
  for (const p of x.pathways) {
    if (p.province === x.province && p.isDefault) {
      out.push(provStreamCardOf({ t: x.t, lang: x.lang, p, mine }))
    }
  }
  for (const p of x.pathways) {
    if (p.province === x.province && p.isDefault === false) {
      out.push(provStreamCardOf({ t: x.t, lang: x.lang, p, mine }))
    }
  }
  return out
}

/**
 * 一条通道的门槛卡:卡头官方英文原名 + 界面语言直白名灰字 + 条件标签(同通道卡);一行门槛都没收录的写「本站未收录门槛」,
 * 来源退到这条通道自己那一页(门槛行有出处的取门槛行的,同弹框)。
 *
 * @param x 取词函数、界面语言、这条通道与本省全部门槛行。
 * @returns 卡。
 */
function provStreamCardOf(x: ProvStreamCardIn): GateCardSpec {
  const chan: PnpReq[] = []
  for (const r of x.mine) {
    if (x.p.reqStreams.includes(r.stream)) {
      chan.push(r)
    }
  }
  const one: GateRowOfIn = { t: x.t, job: { province: x.p.province, noc: TEXT_NONE, teer: null }, mine: x.mine, chan }
  const rows = provStreamRowsOf({ p: x.p, one })
  let empty = TEXT_NONE
  if (rows.length === 0) {
    empty = x.t('pnpgate.noReqs')
  }
  let url = gateUrlOf({ chan, streams: x.p.reqStreams })
  if (url === TEXT_NONE) {
    url = x.p.url
  }
  return {
    title: x.p.officialName,
    sub: pathwaySubOf({ lang: x.lang, p: x.p }),
    tags: channelTagsOf({ t: x.t, tags: x.p.tags }),
    source: sourceLinkOf({ t: x.t, url }),
    rows,
    empty,
  }
}

/**
 * 一条通道卡上的行(行序同弹框门槛卡):申请人侧一行都没收录的给空列 —— 只剩全省的 offer 形态与雇主几行会读成门槛只有这些
 * (同弹框 applicantRowsOf 那道);不看工作的通道(jobLinked = false)不出「雇主 offer」行。
 *
 * @param x 这条通道与各行构造器的共同入参。
 * @returns 行;没收录给空列。
 */
function provStreamRowsOf(x: ProvStreamRowsIn): GateRowSpec[] {
  const rows: GateRowSpec[] = []
  if (applicantRowsOf(x.one.chan) === 0) {
    return rows
  }
  let offer: GateRowSpec | null = null
  if (x.p.jobLinked) {
    offer = offerRowOf(x.one)
  }
  for (const row of [statusRowOf(x.one), offer, empRowOf(x.one), langAllRowOf(x.one),
    bandRowOf({ one: x.one, factors: GATE_EXP_FACTORS, build: expRowOf }), residenceRowOf(x.one),
    bandRowOf({ one: x.one, factors: GATE_WAGE_FACTORS, build: wageRowOf }), pointsRowOf(x.one), eeRowOf(x.one),
    otherRowOf(x.one)]) {
    if (row != null) {
      rows.push(row)
    }
  }
  return rows
}

/**
 * 通道卡头的灰字:界面语言直白名(英文界面不出;与官方原名同字不出)。
 *
 * @param x 界面语言与这条通道。
 * @returns 灰字;'' = 不出。
 */
function pathwaySubOf(x: LocalNameIn): string {
  const local = localNameOf(x)
  if (local === x.p.officialName) {
    return TEXT_NONE
  }
  return local
}

/**
 * 资讯页「语言」行(弹框只挑本岗那档,这里全档列):分 TEER 的一档一行「TEER 0–3:每项 CLB 5」,不要求考试的档写
 * 「不要求语言考试」(卑诗 TEER 0 / 1、纽省与爱德华王子岛 TEER 0–3);本省毕业免考那条照弹框写法、分档的带档;点名职业的
 * 那档合一行放最后(namedLangOf)。不分档的在前,分档的按 TEER 从低到高(数据原序卑诗、纽省是高档在前)。
 *
 * @param x 各行构造器的共同入参(探针不看档)。
 * @returns 这一行;本通道没有语言行给 null。
 */
function langAllRowOf(x: GateRowOfIn): GateRowSpec | null {
  const plain: PnpReq[] = []
  const tiered: PnpReq[] = []
  const named: PnpReq[] = []
  for (const r of x.chan) {
    if (r.factor !== GATE_F.language) {
      continue
    }
    if (r.appliesNoc !== TEXT_NONE) {
      if (r.op === GATE_OP_GE && r.unit === GATE_UNIT_CLB && r.value != null) {
        named.push(r)
      }
    } else if (r.appliesTeer === TEXT_NONE) {
      plain.push(r)
    } else {
      tiered.push(r)
    }
  }
  tiered.sort(byTeerAsc)
  const lines: string[] = []
  for (const r of plain.concat(tiered)) {
    const line = langTierLineOf({ t: x.t, r })
    if (line !== TEXT_NONE) {
      lines.push(line)
    }
  }
  const exempt = rowOfFactor({ rows: x.chan, factor: GATE_F.languageExempt })
  if (exempt != null && exempt.value != null) {
    const line = x.t('pnpgate.langExempt', { n: exempt.value, prov: x.t(PROV_KEY_HEAD + x.job.province) })
    lines.push(tierLineOf({ t: x.t, applies: exempt.appliesTeer, line }))
  }
  const notes: string[] = []
  if (named.length > 0) {
    const n = namedLangOf({ t: x.t, rows: named })
    if (n.line !== TEXT_NONE) {
      lines.push(n.line)
    }
    for (const note of n.notes) {
      notes.push(note)
    }
  }
  if (lines.length === 0) {
    return null
  }
  return { key: GATE_ROW.lang, label: x.t('pnpgate.k.lang'), lines, notes }
}

/**
 * 分档的门槛行按 TEER 从低到高(各行档串的第一档比)。
 *
 * @param a 前一行。
 * @param b 后一行。
 * @returns 排序位次。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byTeerAsc(a: PnpReq, b: PnpReq): number {
  return bandTeerOf(a.appliesTeer) - bandTeerOf(b.appliesTeer)
}

/**
 * 一条不点名职业的语言行怎么写:不要求考试的写「不要求语言考试」,要分数的写 CLB;分 TEER 的带档(tierLineOf)。
 * 不分档的要分数那行照弹框写法「英语或法语每项 CLB 4」;分档的省掉「英语或法语」,窄屏一档一行放得下。
 *
 * @param x 取词函数与一条语言行。
 * @returns 文案;认不出给 ''。
 */
function langTierLineOf(x: LangTierLineIn): string {
  if (x.r.op === GATE_OP_NONE) {
    return tierLineOf({ t: x.t, applies: x.r.appliesTeer, line: x.t('pnpgate.langNone') })
  }
  if (x.r.op !== GATE_OP_GE || x.r.unit !== GATE_UNIT_CLB || x.r.value == null) {
    return TEXT_NONE
  }
  if (x.r.appliesTeer === TEXT_NONE) {
    return x.t('pnpgate.lang', { n: x.r.value })
  }
  return tierLineOf({ t: x.t, applies: x.r.appliesTeer, line: x.t('pnpgate.langEach', { n: x.r.value }) })
}

/**
 * 一行文案前面带上 TEER 档(「TEER 0–3:每项 CLB 5」);不分档的原样返回。
 *
 * @param x 取词函数、TEER 档逗号串与文案。
 * @returns 带档的文案。
 */
function tierLineOf(x: TierLineIn): string {
  if (x.applies === TEXT_NONE) {
    return x.line
  }
  return x.t('pnpgate.tier', { teers: qcTeerRangeOf(x.applies), line: x.line })
}

/**
 * 点名职业那档合一行:分数只有一种写「指定职业:每项 CLB 7」、灰字列职业码(带排除的写「…除外」;多于 LANG_NOC_NOTE_MAX 个
 * 不列);几种分数写「按职业定:CLB 4–7」(曼省 158 个职业逐个定分)。
 *
 * @param x 取词函数与点名职业的语言行。
 * @returns 那一行与灰字。
 */
function namedLangOf(x: NamedLangIn): NamedLangOut {
  const values: number[] = []
  const nocs: string[] = []
  const excl: string[] = []
  for (const r of x.rows) {
    if (r.value != null && values.includes(r.value) === false) {
      values.push(r.value)
    }
    nocs.push(r.appliesNoc)
    excl.push(r.excludesNoc)
  }
  if (values.length === 0) {
    return { line: TEXT_NONE, notes: [] }
  }
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const v of values) {
    min = Math.min(min, v)
    max = Math.max(max, v)
  }
  if (values.length > 1) {
    return { line: x.t('pnpgate.langByOcc', { min, max }), notes: [] }
  }
  const line = x.t('pnpgate.langNoc', { n: min })
  const codes = codesOf(nocs)
  if (codes.length > LANG_NOC_NOTE_MAX) {
    return { line, notes: [] }
  }
  const sep = x.t('pnpgate.sep')
  const except = codesOf(excl)
  if (except.length === 0) {
    return { line, notes: [x.t('pnpgate.nocList', { list: codes.join(sep) })] }
  }
  return { line, notes: [x.t('pnpgate.nocExcept', { list: codes.join(sep), except: except.join(sep) })] }
}

/**
 * 几串逗号分隔的职业码 → 去重的码(按出现先后;空段不要)。
 *
 * @param csvs 逗号串(门槛表 applies_noc / excludes_noc 原值)。
 * @returns 码。
 */
function codesOf(csvs: string[]): string[] {
  const out: string[] = []
  for (const csv of csvs) {
    for (const p of csv.split(VALUE_CODE_SEP)) {
      const code = p.trim()
      if (code !== TEXT_NONE && out.includes(code) === false) {
        out.push(code)
      }
    }
  }
  return out
}

/**
 * 资讯页按 TEER 分档的一行(工作经验、工资;弹框只挑本岗那档,这里各档都列):先用不看档的探针拼一遍(各档都适用的那几条),
 * 再逐档拼、只把多出来的条目挂在「TEER 0–3:」小标下面 —— 安省经验 TEER 0–3 与 4–5 各一档、应届毕业生的低位工资只管 TEER 0–3。
 * 本行的因素都不分档就只拼一遍。
 *
 * @param x 各行构造器的共同入参、这一行读的因素与它的构造器。
 * @returns 这一行;各档都拼不出给 null。
 */
function bandRowOf(x: BandRowIn): GateRowSpec | null {
  const base = x.build(x.one)
  const bands = teerBandsOf({ rows: x.one.chan, factors: x.factors })
  if (bands.length === 0) {
    return base
  }
  let row = base
  const baseLines: string[] = []
  if (base != null) {
    for (const l of base.lines) {
      baseLines.push(l)
    }
  }
  const lines = baseLines.slice()
  for (const band of bands) {
    const who: GateWho = { province: x.one.job.province, noc: TEXT_NONE, teer: bandTeerOf(band) }
    const got = x.build({ t: x.one.t, job: who, mine: x.one.mine, chan: x.one.chan })
    if (got == null) {
      continue
    }
    row = got
    const extra: string[] = []
    for (const l of got.lines) {
      if (baseLines.includes(l) === false) {
        extra.push(l)
      }
    }
    if (extra.length === 0) {
      continue
    }
    lines.push(x.one.t('pnpgate.tierHead', { teers: qcTeerRangeOf(band) }))
    for (const l of extra) {
      lines.push(l)
    }
  }
  if (row == null || lines.length === 0) {
    return null
  }
  return { key: row.key, label: row.label, lines, notes: [] }
}

/**
 * 一行要读的因素里出现过哪几种 TEER 档(门槛表 applies_teer 原串,去重后按 TEER 从低到高;不分档的不算)。
 *
 * @param x 门槛行与因素。
 * @returns 档。
 */
function teerBandsOf(x: TeerBandsIn): string[] {
  const out: string[] = []
  for (const r of x.rows) {
    if (x.factors.includes(r.factor) && r.appliesTeer !== TEXT_NONE && out.includes(r.appliesTeer) === false) {
      out.push(r.appliesTeer)
    }
  }
  out.sort(byBandAsc)
  return out
}

/**
 * TEER 档串按第一档从低到高。
 *
 * @param a 前一档。
 * @param b 后一档。
 * @returns 排序位次。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byBandAsc(a: string, b: string): number {
  return bandTeerOf(a) - bandTeerOf(b)
}

/**
 * 一档 TEER 的探针取哪一档(逗号串的第一档;同一行门槛对档内各档一样,取哪个都行)。
 *
 * @param band TEER 档逗号串。
 * @returns TEER。
 */
function bandTeerOf(band: string): number {
  return Number(band.split(VALUE_CODE_SEP)[0])
}


/**
 * 「查看全省 N 组」那个开关的字(展开后改「收起」,同清单卡末尾的开关)。
 * 2026-09-30 Frank「收起那个按钮是不是不要放在外面」,选「可提名的岗去掉收起」:展开后开关不再出(PnpDrawGroups),「收起」那一支撤。
 *
 * @param x 取词函数、全省组数与轮次标签。
 * @returns 开关的字。
 */
export function allGroupsLabelOf(x: AllGroupsLabelIn): string {
  return x.t('pnpfacts.allGroups', { n: x.total, label: x.label })
}

/**
 * 没公布分的组头写什么:那一轮发了多少份邀请;邀请数也没有就空着(不出长横)。
 * 2026-09-23 同日并进 AIP 文案、改名 invTextOf(原 headInvOf),抽选行也走这一处:AIP 那组的数字是选中进入审理的申请
 * (见 DRAW_STREAM_AIP),写「份申请入选」,不写「份邀请」。
 * 2026-09-26 /fe 首页 Frank「止血 + 补完整」:NS 的数字是每月从 EOI 池选取的人数,写「人入选」(DRAW_SELECT_PROVS);
 * 三种口径的词条收进 COUNT_ROW_KEY 一张表(countKindOf 判口径)。
 * 2026-09-27 九省体检(Frank「问题太多了」「能用多 agent 修么」):人数加千分位(原「1874 份邀请」,配额卡与标题行都有千分位,这里没有)。
 * 2026-09-29 抽选卡重排:官方只写了上限的轮次(AB「Less than 10」、BC「<5」;数据层 invitationsBelow)写「少于 N 份邀请」,
 * 原先这种轮次人数一格是空的。
 * 2026-09-30 起省提名抽选卡组头不再用它顶分数格(Frank 选「按这版改」:本年合计在旁边,两个「份邀请」挨着分不清),只剩抽选行用。
 *
 * @param x 取词函数与这一轮。
 * @returns 文字;''=没公布。
 */
function invTextOf(x: InvTextIn): string {
  if (x.draw.invitations == null) {
    if (x.draw.invitationsBelow != null) {
      return x.t('pnpdraws.below', { n: x.draw.invitationsBelow.toLocaleString(NUM_LOCALE) })
    }
    return TEXT_NONE
  }
  return x.t(countKeyOf({ kind: countKindOf(x.draw), n: x.draw.invitations }), {
    n: x.draw.invitations.toLocaleString(NUM_LOCALE),
  })
}

/**
 * 人数那几个字的词条:按口径取 COUNT_ROW_KEY;邀请恰好 1 份取单数那条(英文「1 invitation」;2026-09-29 抽选卡重排线上验收)。
 *
 * @param x 人数口径与人数。
 * @returns 词条键。
 */
function countKeyOf(x: CountKeyIn): string {
  if (x.kind === COUNT_INV && x.n === 1) {
    return COUNT_INV_ONE_KEY
  }
  return COUNT_ROW_KEY[x.kind]
}

/**
 * 这一轮的人数是什么口径:AIP 那组 = 选中进入审理的申请;官方写「选取」的省 = 从 EOI 池选取的人;其余 = 发出的邀请。
 * 2026-09-29 抽选卡重排(Frank「如果改一个地方,是不是所有省份都得改一遍」):改认数据层逐行打好的 unit 格 —— 原按组名
 * (DRAW_STREAM_AIP = 'AIP')与省名(DRAW_SELECT_PROVS = NS)判,两常量退役(原注并进 constants 的 UNIT_APPLICATION / UNIT_SELECTION)。
 *
 * @param draw 这一轮。
 * @returns 人数口径。
 */
function countKindOf(draw: PnpDraw): CountKind {
  if (draw.unit === UNIT_APPLICATION) {
    return COUNT_AIP
  }
  if (draw.unit === UNIT_SELECTION) {
    return COUNT_SEL
  }
  return COUNT_INV
}

/**
 * 组头名字下的灰字:中文界面出通道中文名(与英文名同字或没有中文名就不出)。
 * 2026-09-26 晚 Frank「上下名字怎么对不上」「名字都用一个不行么」:先查人工定表 drawStreamNote —— 与本站通道同一个项目的
 * 那几组直接就是通道名(同职位板 PNP 格、弹框通道卡),也是 /start 抽选表走的同一个出口;表里没有的,中文界面才退回数据层的
 * 机器译名(原先只看机器译名:BC Build 那组叫「建筑业技工通道」,上面通道卡叫「BC 建筑技工」)。韩文界面随之也出表里的译名。
 * 2026-09-27 Frank「这个数据怎么回事」「这两个还不一样吗」「这他妈弄的乱七八糟的」,看过效果图选「照改,加这一列」:改名 drawSubOf(原 zhSubOf)—— 覆盖本站通道的组英文界面也出灰字(写它邀请的通道名,
 * 见 lib/jobs DRAW_STREAM_L10N 的 en 格);机器译名兜底撤掉(PE 那组译成「面向联邦快通在职技工」、NL 用了俗称「纽省」、
 * 曼省两组中文几乎同名,体检点名),表里没有的只显官方英文名,不让模型现编译名。
 *
 * @param x 界面语言与组头那一轮。
 * @returns 灰字;''=不出。
 */
function drawSubOf(x: DrawSubIn): string {
  return drawStreamNote({ stream: x.draw.stream, lang: x.lang })
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
 * 2026-09-27 九省体检(Frank「问题太多了」「能用多 agent 修么」):轮数改数不同的抽选日期(roundCountOf),不数行。
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
  const count = roundCountOf(x.draws)
  let rounds = TEXT_NONE
  if (count === 1) {
    rounds = x.t(keys.one, { n: count })
  } else if (count > 1) {
    rounds = x.t(keys.many, { n: count })
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
    total: x.total,
  }
}

/**
 * 一组一共几轮:数不同的抽选日期,不数行(2026-09-27 九省体检(Frank「问题太多了」「能用多 agent 修么」)实撞)—— 同一天的一次抽选
 * 可能分几行记:曼省一期(Draw #N)下有定向职业 / 法语 / 曼省毕业几项选取,BC 同一天的工资档与分数档是一次发放两个条件;
 * 各算一轮会把曼省 Skilled Worker in Manitoba 的 9 期数成 19 轮、BC Innovate 的 10 次数成 20 轮。
 * 按月公布的那一组(NS)一行就是一个月,不受影响。
 *
 * @param draws 这一组的历次抽选。
 * @returns 轮数。
 */
function roundCountOf(draws: PnpDraw[]): number {
  const days = new Set<string>()
  for (const d of draws) {
    days.add(d.drawDate)
  }
  return days.size
}

/**
 * 一组点开后的全部轮次(照抄省抽选表的行;中文名只在组头灰字出一次,各轮不再逐行重复 —— 2026-09-23 Frank
 * 「这种中文灰字翻译只显示一个就行了吧」)。2026-09-26 自 cmpGroupOf 体内原样提出:本岗那一组(featOf)展开的也是这一份。
 * 同晚 featOf 随本岗那一组改组头行撤掉,只剩 cmpGroupOf 一处调用。
 * 2026-09-27 Frank「我觉得这种应该拆成两个卡片」→ 选「不拆,去重复」:各轮同一个流名时通道名也不逐行重复(sameStreamOf)。
 * 2026-09-27 Frank「这个数据怎么回事」「这两个还不一样吗」「这他妈弄的乱七八糟的」,看过效果图选「照改,加这一列」:去重复后同一天几行分不开(曼省一期几项选取、BC 工资档与分数档、NB 按路径)——
 * 组里不止一种选取时(isMixedSelectionOf),流名那一格改写这一行是哪一项(selectionLabelOf);只有一种的照旧空着。
 *
 * @param x 取词函数、界面语言与这一组的历次抽选。
 * @returns 展示行。
 */
function roundRowsOf(x: RoundRowsIn): DrawRowSpec[] {
  const rows: DrawRowSpec[] = []
  const same = sameStreamOf(x.draws)
  const mixed = isMixedSelectionOf(x.draws)
  let i = 0
  for (const d of x.draws) {
    const row = toDrawRow({ t: x.t, lang: x.lang, draw: d, index: i, reform: null })
    row.streamZh = TEXT_NONE
    if (same) {
      row.stream = TEXT_NONE
      if (mixed) {
        row.stream = selectionLabelOf({ t: x.t, code: d.selection })
      }
    }
    rows.push(row)
    i += 1
  }
  return rows
}

/**
 * 这一组里是不是不止一种选取(数据层 selection 短码去重后多于一种;空串也算一种 —— 认不出的行与认得出的行并存时照样要分开写)。
 * 2026-09-27 Frank「这个数据怎么回事」「这两个还不一样吗」「这他妈弄的乱七八糟的」,看过效果图选「照改,加这一列」。
 *
 * @param draws 这一组的历次抽选。
 * @returns 不止一种 = true。
 */
function isMixedSelectionOf(draws: PnpDraw[]): boolean {
  const seen = new Set<string>()
  for (const d of draws) {
    seen.add(d.selection)
  }
  return seen.size > 1
}

/**
 * 一行是哪一项选取的界面词:数据层短码 → 三语(2026-09-27 Frank「这个数据怎么回事」「这两个还不一样吗」「这他妈弄的乱七八糟的」,看过效果图选「照改,加这一列」)。
 * 定向职业 / 法语 / 曼省毕业 / 按分数查 SEL_KEYS;高分者带大类名(词条里没有那一类就只写「高分者」);工资档带时薪与年薪;
 * NB 路径逐条取名、顿号连。短码认不出或参数缺给 ''(不猜)。
 *
 * @param x 取词函数与短码。
 * @returns 界面词;'' = 不写。
 */
function selectionLabelOf(x: SelectionLabelIn): string {
  const m = SEL_CODE_RE.exec(x.code)
  if (m == null || m.groups == null) {
    return TEXT_NONE
  }
  const kind = m.groups.kind
  if (kind == null) {
    return TEXT_NONE
  }
  const fixed = SEL_KEYS[kind]
  if (fixed != null) {
    return x.t(fixed)
  }
  const arg = m.groups.arg
  if (arg == null) {
    return TEXT_NONE
  }
  if (kind === SEL_TOP) {
    const catKey = SEL_CAT_HEAD + arg
    const cat = x.t(catKey)
    if (cat === catKey) {
      return x.t('pnpsel.topAny')
    }
    return x.t('pnpsel.top', { cat })
  }
  if (kind === SEL_WAGE) {
    const year = m.groups.arg2
    if (year == null) {
      return TEXT_NONE
    }
    return x.t('pnpsel.wage', { hour: arg, year: Number(year).toLocaleString(NUM_LOCALE) })
  }
  if (kind === SEL_PATH) {
    const names: string[] = []
    for (const code of arg.split(SEL_PATH_SEP)) {
      const key = SEL_PATH_HEAD + code
      const name = x.t(key)
      if (name !== key) {
        names.push(name)
      }
    }
    return names.join(x.t('pnpdraws.sep'))
  }
  return TEXT_NONE
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
 * 2026-10-01 Frank「这个弹框需要列表,然后高亮雇主」(AIP 清单卡高亮):撇号先删(同数据层 norm_name),不再抹成空格。
 *
 * @param name 公司名。
 * @returns 归一后的名字。
 */
export function normName(name: string): string {
  const head = name.toLowerCase().replace(AIP_APOS_RE, TEXT_NONE).split(AIP_ALIAS_RE)[0]
  if (head == null) {
    return TEXT_NONE
  }
  return head.replace(AIP_SUFFIX_RE, SPACE).replace(AIP_DROP_RE, SPACE).replace(SPACE_RUN_RE, SPACE).trim()
}

/**
 * 一省的 AIP 指定雇主清单(弹框清单卡用;2026-10-01 Frank「这个弹框需要列表,然后高亮雇主」):只取本岗所在省的(名单已按省、名字排好),
 * 每家先算好能对上的归一名 —— 法定名与「o/a」后的经营名,数据层 aip 域打标同时认这两种(etl aip load_aip_names)。
 *
 * @param x 名单(只有 AIP 那份)与省码。
 * @returns 这一省的清单行。
 */
export function aipEmpListOf(x: AipEmpListIn): AipEmpEntry[] {
  const out: AipEmpEntry[] = []
  for (const e of x.employers) {
    if (e.province === x.province) {
      out.push({ name: e.name, location: e.location, keys: aipEmpKeysOf(e.name) })
    }
  }
  return out
}

/**
 * 名单上一家能对上的归一名:法定名一个,带「o/a」的再加经营名一个;归一后是空串的不要。
 *
 * @param name 名单上的原名。
 * @returns 归一名。
 */
function aipEmpKeysOf(name: string): string[] {
  const keys: string[] = []
  const head = normName(name)
  if (head !== TEXT_NONE) {
    keys.push(head)
  }
  const m = AIP_OA_TAIL_RE.exec(name)
  if (m != null && m.groups != null && m.groups.tail != null) {
    const tail = normName(m.groups.tail)
    if (tail !== TEXT_NONE && keys.includes(tail) === false) {
      keys.push(tail)
    }
  }
  return keys
}

/**
 * 名单上这一家算不算本岗雇主:本岗归一名整词出现在这家任一归一名里。名单写法五花八门 —— 「X o/a 品牌」「法定名 - 品牌 分店」
 * 「品牌 地名 (法定名)」,岗位上多半只写品牌,只认相等对不上(线上实测:NB 的 Subway、Kent Building Supplies 都对不上
 * 「Subway Moncton (709028 NB Inc)」「J.D. Irving, Limited - Kent Building Supplies (Head Office)」);品牌连锁会高亮本省各家加盟店。
 * 相等一律算(「CG Group Ltd」归一只剩 cg);整词包含要本岗归一名不短于 AIP_HIT_MIN_LEN。
 *
 * @param x 这一家的归一名与本岗雇主归一名。
 * @returns 对上 = true。
 */
function isAipEmpHitOf(x: AipEmpHitIn): boolean {
  if (x.me !== TEXT_NONE && x.keys.includes(x.me)) {
    return true
  }
  if (x.me.length < AIP_HIT_MIN_LEN) {
    return false
  }
  const needle = SPACE + x.me + SPACE
  for (const k of x.keys) {
    if ((SPACE + k + SPACE).includes(needle)) {
      return true
    }
  }
  return false
}

/**
 * 清单卡这一刻要露的行:本岗雇主那几行在前(高亮),展开才列其余;一行都没对上时露头几行(同职业清单卡 streamRowsOf)。
 *
 * @param x 这一省的清单、本岗公司名与展开态。
 * @returns 展示行。
 */
export function aipEmpRowsOf(x: AipEmpRowsIn): AipEmpRowSpec[] {
  const me = normName(x.company)
  const hits: AipEmpEntry[] = []
  const others: AipEmpEntry[] = []
  for (const e of x.list) {
    if (isAipEmpHitOf({ keys: e.keys, me })) {
      hits.push(e)
    } else {
      others.push(e)
    }
  }
  let picked = hits
  if (x.open) {
    picked = hits.concat(others)
  }
  if (picked.length === 0) {
    picked = others.slice(0, ROWS_FALLBACK)
  }
  const rows: AipEmpRowSpec[] = []
  for (const e of picked) {
    rows.push({ key: e.name + e.location, hit: hits.includes(e), name: e.name, location: e.location })
  }
  return rows
}

/**
 * 折起来的家数(本岗雇主之外的都算)。
 *
 * @param x 这一省的清单与本岗公司名。
 * @returns 家数。
 */
export function aipEmpHiddenOf(x: AipEmpHiddenIn): number {
  const me = normName(x.company)
  let n = 0
  for (const e of x.list) {
    if (isAipEmpHitOf({ keys: e.keys, me }) === false) {
      n += 1
    }
  }
  return n
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
      appliesTo: r.appliesTo,
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
 * 2026-09-29 Frank「每一个通道也需要一个总数吧」:有本年合计的组头加 cmpHasTotal(多一行放合计)。
 * 2026-09-30 Frank「我觉得这个 日期 和 总数 互换一下位置是不是好一些」(看过效果图选「互换」):省提名抽选卡的组头一律加
 * cmpDateBelow(合计换到原日期那一格、日期落最下一行,没合计的组同样排),cmpHasTotal 撤;EE 分数线卡不加,照旧一行。
 *
 * @param x 压不压暗、本岗那组、可不可点、是不是省提名抽选卡的组头。
 * @returns 类名。
 */
export function cmpHeadClsOf(x: CmpHeadClsIn): string {
  const cls = [cssOf(css.cmpHead)]
  if (x.button) {
    cls.push(cssOf(css.cmpBtn))
  }
  if (x.dateBelow) {
    cls.push(cssOf(css.cmpDateBelow))
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
 * 通道卡里一条通道的子卡片类(2026-10-01 Frank「这个是不是改成两个子卡片。能走哪个高亮哪个。」「你都改完」:推翻 09-26 晚
 * 「条目不再套框」—— 一条一张细边框子卡;高亮同全站本岗那一档浅蓝底)。
 *
 * @param hit 高亮。
 * @returns 类名。
 */
export function chanBoxClsOf(hit: boolean): string {
  if (hit) {
    return cssOf(css.chanBox) + CLS_SEP + cssOf(css.chanHit)
  }
  return cssOf(css.chanBox)
}

/**
 * 出不出「你有 PGWP 吗」:卡里一条带「需持 PGWP」、另一条带它的互补标签(CHAN_TAG_COMPLEMENT;眼下只有 NL 技术工人 / 国际毕业生)。
 *
 * @param channels 卡里的通道条目。
 * @returns 出 = true。
 */
export function channelSplitOf(channels: ChannelSpec[]): boolean {
  const keys = new Set<string>()
  for (const c of channels) {
    for (const g of c.tags) {
      keys.add(g.key)
    }
  }
  return keys.has(PICK_PGWP) && keys.has(PICK_NO_PGWP)
}

/**
 * 这一条要不要高亮:选了哪一边,带那一边标签的那条亮;没选都不亮。
 *
 * @param x 这一条与当前选项。
 * @returns 亮 = true。
 */
export function channelHitOf(x: ChannelHitIn): boolean {
  if (x.pick === PICK_NONE) {
    return false
  }
  for (const g of x.c.tags) {
    if (g.key === x.pick) {
      return true
    }
  }
  return false
}

/**
 * 「你有 PGWP 吗」两段的手柄工厂:点某一段选它,再点一次取消(两段互斥,不像折叠开关那样各管各的)。
 *
 * @param x 选项的写入口。
 * @returns 给一段的值、拿它的点击手柄。
 */
export function makePickOf(x: PickSetIn): ToggleOfFn {
  return function pickOf(value: string): ClickFn {
    return function onPick(): void {
      x.setPick(function next(prev: string): string {
        if (prev === value) {
          return PICK_NONE
        }
        return value
      })
    }
  }
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
 * 本省抽选卡开合的初值:可提名的岗默认展开全省各组;不可提名(不符合清单)的岗没有「本岗那一组」,默认折叠,
 * 只露「查看全省 N 组」(2026-09-28 Frank「如果是不符合清单的。本省抽选默认折叠」)。
 * 2026-09-29 抽选卡重排:「改制前的抽选」卡同本省抽选卡一个规矩;「AIP 抽选」卡一律展开 —— AIP 与省提名是两条路,本岗不可提名
 * 不等于走不了 AIP。同日线上验收改:AIP 卡干脆不设开关(groupsCardOf 的 fold = false),它那把键随之撤。
 * 2026-09-30 Frank「收起那个按钮是不是不要放在外面。默认是不是都展开」,选「可提名的岗去掉收起」:展开后开关不再出 ——
 * 可提名的岗初值就展开,全省各组常显、没有开关;不可提名的岗照旧折着,只露「查看全省 N 组」,点开后不给收起。
 * 2026-10-01 Frank「本省抽选默认不要折叠」:不分可不可提名,初值一律展开(全省各组常显、没有开关),不再看本岗。
 *
 * @returns 开着的键集合。
 */
export function drawOpenInitOf(): Set<string> {
  return new Set([DRAWS_ALL_KEY, DRAWS_REFORM_ALL_KEY])
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
 * 省提名几张整表的懒取(2026-09-26 /fe 首页 Frank:首页每次内联约 380KB 的清单与抽选,弹框近 30 天真实用户
 * 打开 0 次 —— 改成弹框打开才取)。取到一次记进 CACHE,整页复用;没取成落 failed —— 不拿空表冒充「官方没有」。
 * 2026-09-28 自 advisor 迁入(Frank「pnp 弹框自己管自己」)。
 *
 * @param x 整表到齐与失败的落格。
 * @returns 取数函数(收一只「弹框关了没」的旗子)。
 */
export function makeLoadPnpData(x: LoadPnpDataIn): LoadFn {
  return function loadPnpData(flag: DeadFlag): void {
    function read(r: Response): Promise<PnpDataJson> {
      if (r.ok) {
        return r.json()
      }
      return Promise.resolve(null)
    }
    function land(j: PnpDataJson): void {
      if (flag.dead) {
        return
      }
      const d = toPnpData(j)
      if (d == null) {
        x.setFailed(true)
        return
      }
      CACHE.pnpData = d
      x.setData(d)
    }
    function fall(): void {
      if (flag.dead === false) {
        x.setFailed(true)
      }
    }
    fetch(URL_API_JOBS_PNP).then(read).then(land).catch(fall)
  }
}

/**
 * `/api/jobs/pnp` 的响应 → 整表(行构造器:请求没成、或缺了清单 / 抽选,都当没取到 —— 缺表不是「那张表是空的」)。
 *
 * @param j 响应。
 * @returns 整表;没取到给 null。
 */
function toPnpData(j: PnpDataJson): PnpData | null {
  if (j == null || j.pnpOccupations == null || j.pnpDraws == null) {
    return null
  }
  let ops: PnpOps[] = []
  if (j.pnpOps != null) {
    ops = j.pnpOps
  }
  let reqs: PnpReq[] = []
  if (j.pnpReqs != null) {
    reqs = j.pnpReqs
  }
  let pathways: PnpPathway[] = []
  if (j.pathways != null) {
    pathways = j.pathways
  }
  return { occ: j.pnpOccupations, draws: j.pnpDraws, ops, reqs, pathways }
}

/**
 * 喂给弹框正文的整表:还没到就给空表(那时 ready 为 false、正文不渲,空表不会被当成「官方没有」)。
 *
 * @param data 懒取到的整表;null = 还没到。
 * @returns 整表。
 */
export function pnpDataOf(data: PnpData | null): PnpData {
  if (data == null) {
    return { occ: [], draws: [], ops: [], reqs: [], pathways: [] }
  }
  return data
}

/**
 * 省提名弹框页眉的灰色小标。2026-09-23 Frank「这个地方应该是点那个省 就显示那个省」:带上本岗的省 ——
 * 「新不伦瑞克省提名(PNP)」;没有省、魁省(不参加 PNP)照旧写分组名。
 * 同日「这里面还包含了 AIP 哈 不光是 PNP」:抽选卡带 AIP 轮次的省(AIP_DRAW_PROVS)写「{省}提名(PNP)及 AIP」。
 * 2026-09-28 随省提名弹框自 advisor 的 kickerOf(省提名组那一支)迁入。
 * 2026-09-29 抽选卡重排(Frank「AIP 是不是应该单独的卡」「如果改一个地方,是不是所有省份都得改一遍」):大西洋四省都有「AIP 抽选」卡
 * (AIP 的轮次、同池说明或不经抽选),改按 AIP 的适用范围 ATLANTIC_PROVS 判,PE 也带「及 AIP」;AIP_DRAW_PROVS 退役,原注:
 * 「省提名弹框里本省抽选卡带 AIP 轮次的省(etl/pnp 的 DRAWS_NB_LABEL「NBPNP + AIP」、DRAWS_NL_LABEL「NLPNP + AIP」:两省官网把 AIP
 * 选取与省提名邀请发在同一张抽选页):小标写「{省}提名(PNP)及 AIP」(2026-09-23 Frank「这里面还包含了 AIP 哈 不光是 PNP」)。
 * 2026-09-26 加 NS:数据层今起接入 NS 月度选取人数(etl/pnp 的 DRAWS_NS_LABEL「NSNP + AIP」—— NSNP 各通道与 AIP 走同一个 EOI 池,
 * 官方按月只发一个总数),抽选卡标题带 AIP,小标同口径。2026-09-28 随省提名弹框自 advisor 迁入。」
 * 2026-10-01 Frank「PNP 弹框 里面的 AIP 部分 提出来,放到 AIP 弹框」「都做吧」:AIP 抽选卡与通道搬去 AIP 弹框,大西洋四省的小标随之
 * 回到「{省}提名(PNP)」(「及 AIP」那支与词条 grp.pnpProvAip 撤;线上 375px 走查截图看出来的漏改)。
 *
 * @param x 取词函数与本岗省码。
 * @returns 小标文字。
 */
export function pnpKickerOf(x: PnpKickerIn): string {
  if (x.province === PROV_QC) {
    return x.t(K_KICKER_QC)
  }
  if (x.province === TEXT_NONE) {
    return x.t(K_KICKER_GROUP)
  }
  return x.t(K_KICKER_PROV, { p: x.t(PROV_KEY_HEAD + x.province) })
}

/**
 * 省提名弹框的大标题:岗位名(E8-10 S6:页眉写分组名、大标题写岗位名);岗名空退调用方给的标题,再空退公司名,都空给「—」。
 * 2026-09-28 随省提名弹框自 advisor 的 modalTitleOf(非公司组那一支)迁入。
 *
 * @param x 这一岗与调用方给的标题。
 * @returns 大标题。
 */
export function pnpTitleOf(x: PnpTitleIn): string {
  for (const s of [x.job.title, x.title, x.job.company]) {
    if (s !== TEXT_NONE) {
      return s
    }
  }
  return DASH
}

/**
 * 这一岗的省提名写哪条通道(职位板格子、手机胶囊、弹框顶上的通道卡同一个判据):数据层给了具名通道就是它;
 * 否则可提名且本省有通用雇主担保通道(GEN_CHANNEL_PROVS)就是那条通用通道(键 `pnp.gen.` + 省码);都不是给空串。
 * 2026-09-23 Frank「那这个是不是最好显示是哪个通道?」「改 全改」:可提名那一档写通用通道名,不再写「{省} 可提名」
 * (原 jobs 的 pnpGenericOf;格子与手机卡片共用)。
 * 2026-09-28 省提名弹框自立第 4 步:原先格子(jobs)与通道卡(本域)各判一遍,判法还不一样,并成这一处。
 * 同日通道表批二:「本省有没有通用通道」改读通道对照表的省默认通道(x.defaults,原 GEN_CHANNEL_PROVS 九省常量)——
 * 格子与手机胶囊从事实索引的 defaults 递、通道卡从懒取到的通道表现算,同一张表。
 *
 * @param x 这一岗(读具名通道、可提名与省码)与有省默认通道的省码。
 * @returns 通道键;没有给空串。
 */
export function pnpChannelKeyOf(x: PnpChannelKeyIn): string {
  const job = x.job
  if (job.pnpStream !== TEXT_NONE) {
    return job.pnpStream
  }
  if (job.pnpEligible !== true || x.defaults.includes(job.province) === false) {
    return TEXT_NONE
  }
  return PNP_GEN_HEAD + job.province
}

/**
 * 通道键的显示名:通用通道走词条 `pnp.gen.` + 省码,具名通道走 lib/jobs 的 streamDisplay(一个项目一个名字)。
 * 英文行传英文取词、灰字行传界面语言取词。
 *
 * @param x 通道键与取词函数。
 * @returns 显示名。
 */
export function pnpNameOf(x: PnpNameIn): string {
  if (x.key.startsWith(PNP_GEN_HEAD)) {
    return x.t(x.key)
  }
  return streamDisplay({ t: x.t, label: x.key })
}

/**
 * 职位板格子与手机胶囊上的原因词(2026-09-30 Frank「兼职 这种都改成不符合 可以吗」,选「五个都改」):工作性质四个与工资那个
 * 统一写「不符合」(PNP_BLOCK_UNFIT_CODES;职位板别的列已经写着),其余照 pnpBlockOf 写具体原因。弹框「本岗不满足的门槛」卡不走这里。
 * 2026-10-01 Frank「职业不收 也改成 不符合」:职业不收也写「不符合」(码表加 occ)。
 *
 * @param x 本岗与取词函数。
 * @returns 格子上的词;走得了或码不在显示表里给 ''。
 */
export function pnpBlockCellOf(x: PnpBlockIn): string {
  if (PNP_BLOCK_UNFIT_CODES.includes(x.job.pnpBlock)) {
    return x.t(PNP_BLOCK_UNFIT_KEY)
  }
  return pnpBlockOf(x)
}

/**
 * 本岗走不了省提名的原因词(数据层 pnpBlock 原因码 → 界面词;2026-09-29 Frank「有些职位不满足门槛 也要弹框 并说明」
 * 「直接精简 一些原因可以吗」「就直接说 兼职」):职位板格子、手机胶囊与弹框「本岗不满足的门槛」卡同一处取。
 * 清单排除(list)不在显示码里 —— 照旧走 pnpExcludedOf 那条路。
 * 2026-09-30 起职位板格子与手机胶囊改走 pnpBlockCellOf(五个码写「不符合」),这里的具体原因词留给弹框卡与职业不收。
 *
 * @param x 本岗与取词函数。
 * @returns 原因词;走得了或码不在显示表里给 ''。
 */
export function pnpBlockOf(x: PnpBlockIn): string {
  if (PNP_BLOCK_CODES.includes(x.job.pnpBlock) === false) {
    return TEXT_NONE
  }
  return x.t(PNP_BLOCK_HEAD + x.job.pnpBlock)
}

/**
 * 弹框「本岗不满足的门槛」卡上的原因词(2026-10-01 三弹框统一,Frank「统一一下 ee pnp aip 弹框的顺序 和 格式」「可以,做吧」):
 * 比 pnpBlockOf 多认清单排除(list),写「职业不收」—— 线上 NB 不受理清单上的岗点开既没有这张卡也没有门槛卡。格子与胶囊不走这里。
 *
 * @param x 本岗与取词函数。
 * @returns 原因词;走得了或码不在弹框表里给 ''。
 */
export function pnpBlockCardOf(x: PnpBlockIn): string {
  if (PNP_BLOCK_CARD_CODES.includes(x.job.pnpBlock) === false) {
    return TEXT_NONE
  }
  if (x.job.pnpBlock === PNP_BLOCK_LIST) {
    return x.t(PNP_BLOCK_HEAD + PNP_BLOCK_OCC)
  }
  return x.t(PNP_BLOCK_HEAD + x.job.pnpBlock)
}

/**
 * 省提名这一格可不可点(表格格子与手机卡胶囊同一个判据)。先得有信号:可提名,或被官方具名清单排除
 * (批A「走不了的就别给点了」、07-26「恢复可点」两拍照旧);
 * 2026-09-26 /fe 首页 Frank(止血):再得弹框里真有卡可出 —— 本省抽选卡或清单卡(pnpFactsShownOf,
 * 与弹框自己出卡同一判据)。可点的省提名格里 20,809 条(安省 17,651、NS 1,609、SK 1,533、领地 16)点开只有标题:
 * 安省改制不出抽选卡且没有清单,NS / SK 的通用岗与领地既无清单也无抽选。改成不可点、字照显示;
 * 判据写的是「弹框有没有内容」而不是省份,每省事实卡上线后这些格子自然恢复可点。
 * 同日「补完整」:pnp 域判「有卡」多吃一格可提名与否(可提名的岗弹框不出排除清单卡,排除键对它不算数)。
 * 2026-09-28 自 jobs 迁入(省提名弹框自立第 4 步):「格子能不能点」与「弹框出什么卡」住同一个域,加卡时回头改判据不用跨域找。
 * 2026-09-29 七省门槛卡(Frank「现在就 AB 省 pnp 弹框是全的吧。其他都不全」):本岗通道登记了门槛也算有卡(弹框必出门槛卡)——
 * 萨省普通岗没抽选没清单,原先点开只有通道卡、被设成不可点;走不了但有原因的岗同理(出「本岗不满足的门槛」卡)。
 *
 * @param x 这一岗、两套排除键与弹框事实索引。
 * @returns 可点 = true。
 */
export function pnpCellActiveOf(x: PnpCellActiveIn): boolean {
  if (x.job.province === PROV_QC) {
    return x.index.qc[x.job.noc] != null
  }
  if (PNP_BLOCK_CODES.includes(x.job.pnpBlock)) {
    return true
  }
  if (x.job.pnpEligible === true) {
    const key = pnpChannelKeyOf({ job: x.job, defaults: x.index.defaults })
    if (key !== TEXT_NONE && x.index.gated.includes(key)) {
      return true
    }
  }
  const excluded = pnpExcludedOf({ job: x.job, blocked: x.blocked })
  if (x.job.pnpEligible !== true && excluded === false) {
    return false
  }
  const eligible = x.job.pnpEligible === true
  const job = x.job
  return pnpFactsShownOf({ province: job.province, noc: job.noc, stream: job.pnpStream, eligible, index: x.index })
}

/**
 * 官方具名排除清单:整表算一次 `省码|NOC` 命中集,逐行 O(1) 查。
 * E6-09(2026-07-26 Frank「恢复可点」):命中官方具名排除清单的岗,格子要说结论、
 * 要能点开看依据 —— 与「TEER 不够」这种泛判定不同。只收管带 offer 的岗的清单(isOfferList,与弹框清单卡同一把尺子)。
 * 2026-09-28 自 jobs 的 blockedKeysOf 迁入(省提名弹框自立第 4 步):拼键与查键都在本域,项目归属走本域 programOf。
 * 2026-10-01 Frank「这个地方不应该显示职业不受理,应该只显示是否是指定雇主」:AIP 格 / 胶囊只看指定雇主,AIP 那套键没人读了,只收省提名的。
 *
 * @param rows 省提名与 AIP 的扁平清单(整表)。
 * @returns 省提名的键集。
 */
export function pnpBlockedKeysOf(rows: PnpOcc[]): PnpBlocked {
  const pnp = new Set<string>()
  for (const r of rows) {
    if (r.type !== TYPE_INELIGIBLE || isOfferList(r.appliesTo) === false || programOf(r) === PROGRAM_AIP) {
      continue
    }
    pnp.add(r.province + EXCL_KEY_SEP + r.noc)
  }
  return { pnp }
}

/**
 * 这一岗在不在省提名官方具名排除清单上。
 *
 * @param x 这一岗与两套键集。
 * @returns 在 = true。
 */
export function pnpExcludedOf(x: PnpExclIn): boolean {
  return x.blocked.pnp.has(x.job.province + EXCL_KEY_SEP + x.job.noc)
}

/**
 * 魁省弹框结论卡「本岗能走的通道」的条目(2026-10-01 三弹框统一,Frank「统一一下 ee pnp aip 弹框的顺序 和 格式」「各个省都检查一下」):
 * 本岗能走的每个通道一条,取自这些通道洗好的门槛卡(qcGateCardsOf)—— 主文案官方原名、灰字界面语言名,与门槛卡标题同字。
 *
 * @param cards 各通道洗好的门槛卡。
 * @returns 条目;没有给空列。
 */
export function qcChannelSpecsOf(cards: GateCardSpec[]): ChannelSpec[] {
  const out: ChannelSpec[] = []
  for (const c of cards) {
    out.push({ key: c.title, name: c.title, sub: c.sub, tags: [] })
  }
  return out
}

/**
 * 魁省门槛卡(2026-09-30 Frank 看过效果图第三版「可以」「先不要解读,只要门槛」;设计 docs/design/魁省门槛弹框-20260929.md):
 * 本岗职业能走几个通道就出几张(通道来自官方「职业 → 通道」对照,数据层汇装成 qc_noc_streams),标题官方原名、灰字界面语言名、
 * 右上来源;行只陈列官方门槛,不判「你够不够」。魁省不属省提名,这几张卡与九省的门槛卡同一个组件(PnpGateCard)。
 *
 * @param x 取词函数、本岗、门槛表与本岗职业的通道。
 * @returns 卡片(通道顺序);一张门槛行都挑不到的通道不出卡。
 */
export function qcGateCardsOf(x: QcGateCardsIn): GateCardSpec[] {
  const out: GateCardSpec[] = []
  for (const chan of x.channels) {
    const card = qcCardOf({ t: x.t, lang: x.lang, job: x.job, reqs: x.reqs, chan })
    if (card != null) {
      out.push(card)
    }
  }
  return out
}

/**
 * 一个通道的门槛卡:门槛表里挑魁省这个通道的行(本通道流;PSTQ 各通道另挂一般条件),标了 TEER 档的只留管得着本岗的那档
 * (受监管通道的法语按 TEER 分两档),再按效果图的行序拼。
 *
 * @param x 取词函数、本岗、门槛表与这个通道。
 * @returns 卡;挑不到行给 null。
 */
function qcCardOf(x: QcCardOfIn): GateCardSpec | null {
  const rows: PnpReq[] = []
  for (const r of x.reqs) {
    if (qcReqMineOf({ r, chan: x.chan }) === false) {
      continue
    }
    if (r.appliesTeer !== TEXT_NONE && teerHitOf({ teer: x.job.teer, applies: r.appliesTeer }) === false) {
      continue
    }
    rows.push(r)
  }
  if (qcOwnRowsOf({ rows, chan: x.chan }) === 0) {
    return null
  }
  const one: QcRowOfIn = { t: x.t, lang: x.lang, chan: x.chan, rows }
  const out: GateRowSpec[] = []
  for (const row of [qcScopeRowOf(one), qcLicenceRowOf(one), qcTeerRowOf(one), qcFrenchRowOf(one), qcExpRowOf(one),
    qcReceptRowOf(one), qcIntakeRowOf(one), qcEduRowOf(one), qcAgeRowOf(one), qcFundsRowOf(one), qcSpouseRowOf(one)]) {
    if (row != null) {
      out.push(row)
    }
  }
  return {
    title: x.chan.title,
    sub: x.t(QC_NAME_HEAD + x.chan.key),
    tags: [],
    source: sourceLinkOf({ t: x.t, url: qcUrlOf(one) }),
    rows: out,
    empty: TEXT_NONE,
  }
}

/**
 * 本通道自己那条流有几行(一般条件不算):一行都没有就不出卡 —— 只剩年龄 / 自给两行会读成这个通道的门槛只有这些
 * (同九省门槛卡的 applicantRowsOf 那道;测试用例实撞)。
 *
 * @param x 这张卡挑到的行与通道。
 * @returns 本通道流的行数。
 */
function qcOwnRowsOf(x: QcOwnRowsIn): number {
  let n = 0
  for (const r of x.rows) {
    if (r.stream === x.chan.stream) {
      n += 1
    }
  }
  return n
}

/**
 * 这一行门槛属不属于这个通道:魁省、项目对得上,流名是本通道的,或 PSTQ 一般条件(四个通道都适用)。
 *
 * @param x 一行门槛与通道。
 * @returns 属于给 true。
 */
function qcReqMineOf(x: QcReqMineIn): boolean {
  if (x.r.province !== PROV_QC || QC_PROGRAMS.includes(x.r.program) === false) {
    return false
  }
  if (x.r.stream === x.chan.stream) {
    return true
  }
  return x.chan.program === QC_PROGRAM_PSTQ && x.r.stream === QC_GENERAL_STREAM
}

/**
 * 卡右上的来源:本通道流里第一条带网址的行(一般条件行的出处页同是 PSTQ 门槛页,落不到它也一样)。
 *
 * @param x 这张卡的行。
 * @returns 网址;都没有给 ''。
 */
function qcUrlOf(x: QcRowOfIn): string {
  for (const r of x.rows) {
    if (r.stream === x.chan.stream && r.url !== TEXT_NONE) {
      return r.url
    }
  }
  for (const r of x.rows) {
    if (r.url !== TEXT_NONE) {
      return r.url
    }
  }
  return TEXT_NONE
}

/**
 * 这张卡的行里申请人侧某个因素的全部行(按门槛表原序)。
 *
 * @param x 这张卡的行与因素。
 * @returns 那些行。
 */
function qcApplicantRowsOf(x: QcFactorIn): PnpReq[] {
  const out: PnpReq[] = []
  for (const r of x.rows) {
    if (r.factor === x.factor && r.subject !== QC_SUBJECT_SPOUSE) {
      out.push(r)
    }
  }
  return out
}

/**
 * 「适用」行:要公民 / 永居身份、要魁省学历的通道写一句;部分受监管的写适用范围(只有其中几种工作受监管,
 * 如焊工「in the construction sector only, welders …」;2026-09-30 起中韩界面写 mart 手译的那一语,英文界面照录官方原文);
 * 整类都走这个通道的不出。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;不需要给 null。
 */
function qcScopeRowOf(x: QcRowOfIn): GateRowSpec | null {
  let line = TEXT_NONE
  const key = QC_KIND_SCOPE[x.chan.kind]
  if (key != null) {
    line = x.t(key)
  } else if (x.chan.kind === QC_KIND_PARTLY) {
    const byLang: Record<PnpLang, string> = { zh: x.chan.scopeZh, en: x.chan.scope, ko: x.chan.scopeKo }
    line = byLang[x.lang]
  }
  if (line === TEXT_NONE) {
    return null
  }
  return { key: QC_ROW.scope, label: x.t('qcgate.k.scope'), lines: [line], notes: [] }
}

/**
 * 「执照」行(受监管职业通道):监管机构发的执业许可或学历等同认定;灰字列这个职业的监管机构(法文原名)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;不是受监管通道给 null。
 */
function qcLicenceRowOf(x: QcRowOfIn): GateRowSpec | null {
  if (qcApplicantRowsOf({ rows: x.rows, factor: QC_F.licensing }).length === 0) {
    return null
  }
  const notes: string[] = []
  if (x.chan.authorities.length > 0) {
    notes.push(x.chan.authorities.join(x.t('pnpgate.sep')))
  }
  return { key: QC_ROW.licence, label: x.t('qcgate.k.licence'), lines: [x.t('qcgate.licence')], notes }
}

/**
 * 「职业档」行:本通道收哪几档 TEER。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;通道不看 TEER 给 null。
 */
function qcTeerRowOf(x: QcRowOfIn): GateRowSpec | null {
  const rows = qcApplicantRowsOf({ rows: x.rows, factor: QC_F.teer })
  const first = rows[0]
  if (first == null || first.appliesTeer === TEXT_NONE) {
    return null
  }
  return {
    key: QC_ROW.teer,
    label: x.t('qcgate.k.teer'),
    lines: [x.t('qcgate.teer', { list: qcTeerRangeOf(first.appliesTeer) })],
    notes: [],
  }
}

/**
 * TEER 档逗号串 → 显示:连号写「0–2」,不连号照列「0, 1, 3」。
 *
 * @param applies 逗号串(门槛表 applies_teer)。
 * @returns 显示串。
 */
function qcTeerRangeOf(applies: string): string {
  const nums: number[] = []
  for (const p of applies.split(VALUE_CODE_SEP)) {
    nums.push(Number(p.trim()))
  }
  const first = nums[0]
  const last = nums[nums.length - 1]
  if (first == null || last == null) {
    return applies
  }
  if (nums.length > 1 && last - first === nums.length - 1) {
    return String(first) + QC_TEER_DASH + String(last)
  }
  return nums.join(QC_TEER_LIST_SEP)
}

/**
 * 「法语」行(2026-09-30 Frank「要不都用 TEF 呢?」):主写 TEF 分数线(魁省只认法语,TEF / TEFAQ / TEF Canada 同一套线),
 * 灰字两行:魁省等级、TCF 分数线(理解按 699 分制、表达按 20 分制,听说读写分开写)。分数线由数据层按魁省对照表算好挂在口径包里。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有申请人法语门槛给 null。
 */
function qcFrenchRowOf(x: QcRowOfIn): GateRowSpec | null {
  let oral: PnpReq | null = null
  let written: PnpReq | null = null
  for (const r of qcApplicantRowsOf({ rows: x.rows, factor: QC_F.language })) {
    if (r.value == null) {
      continue
    }
    if (basisHasOf({ basis: r.basis, key: QC_BASIS.oral }) && oral == null) {
      oral = r
    } else if (basisHasOf({ basis: r.basis, key: QC_BASIS.written }) && written == null) {
      written = r
    }
  }
  if (oral == null && written == null) {
    return null
  }
  const levels: string[] = []
  if (oral != null) {
    levels.push(x.t('qcgate.fr.oralLv', { n: String(oral.value) }))
  }
  if (written != null) {
    levels.push(x.t('qcgate.fr.writtenLv', { n: String(written.value) }))
  }
  const tef = qcTestLineOf({ t: x.t, test: QC_TEST_TEF, oral, written, comp: QC_BASIS.tefComp, expr: QC_BASIS.tefExpr })
  const tcf = qcTestLineOf({ t: x.t, test: QC_TEST_TCF, oral, written, comp: QC_BASIS.tcfComp, expr: QC_BASIS.tcfExpr })
  return {
    key: QC_ROW.french,
    label: x.t('qcgate.k.french'),
    lines: [tef],
    notes: [x.t('qcgate.fr.levels', { parts: levels.join(x.t('pnpgate.sep')) }), tcf],
  }
}

/**
 * 一个考试的分数线一句:口语 / 书面各一段;理解与表达同分写一个数(TEF「口语 400」),不同分分开写(TCF「听 400、说 10」)。
 *
 * @param x 取词函数、考试名、两行与两格键。
 * @returns 一句(「TEF 口语 400、书面 300 分起」)。
 */
function qcTestLineOf(x: QcTestLineIn): string {
  const parts: string[] = []
  if (x.oral != null) {
    parts.push(qcSkillPartOf({
      t: x.t,
      row: x.oral,
      comp: x.comp,
      expr: x.expr,
      same: QC_FR_KEY.oral,
      compKey: QC_FR_KEY.listen,
      exprKey: QC_FR_KEY.speak,
    }))
  }
  if (x.written != null) {
    parts.push(qcSkillPartOf({
      t: x.t,
      row: x.written,
      comp: x.comp,
      expr: x.expr,
      same: QC_FR_KEY.written,
      compKey: QC_FR_KEY.read,
      exprKey: QC_FR_KEY.write,
    }))
  }
  return x.t('qcgate.fr.test', { test: x.test, parts: parts.join(x.t('pnpgate.sep')) })
}

/**
 * 一段技能的分数线:理解与表达同分 → 「口语 400」;不同分 → 「听 400、说 10」。
 *
 * @param x 取词函数、那一行、两格键与三个词条。
 * @returns 一段。
 */
function qcSkillPartOf(x: QcSkillPartIn): string {
  const comp = basisValueOf({ basis: x.row.basis, key: x.comp })
  const expr = basisValueOf({ basis: x.row.basis, key: x.expr })
  if (comp === expr) {
    return x.t(x.same, { n: comp })
  }
  return x.t(x.compKey, { n: comp }) + x.t('pnpgate.sep') + x.t(x.exprKey, { n: expr })
}

/**
 * 「工作经验」行:近 N 年 / N 个月内至少几个月;「其中至少几个月在魁省」另起一行;PEQ 的全职口径进灰字。
 * 带截点日的那条(PEQ 收件条件)不在这里,见 qcReceptRowOf。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有经验门槛给 null。
 */
function qcExpRowOf(x: QcRowOfIn): GateRowSpec | null {
  const lines: string[] = []
  const notes: string[] = []
  for (const r of qcApplicantRowsOf({ rows: x.rows, factor: QC_F.experience })) {
    if (r.value == null || basisHasOf({ basis: r.basis, key: QC_BASIS.asOf })) {
      continue
    }
    const years = basisValueOf({ basis: r.basis, key: QC_BASIS.windowYears })
    const months = basisValueOf({ basis: r.basis, key: QC_BASIS.windowMonths })
    const inQc = basisHasOf({ basis: r.basis, key: QC_BASIS.inQuebec })
    if (years !== TEXT_NONE && inQc) {
      lines.push(x.t('qcgate.expInQc', { m: String(r.value) }))
    } else if (years !== TEXT_NONE) {
      lines.push(x.t('qcgate.expWin', { y: years, m: String(r.value) }))
    } else if (months !== TEXT_NONE) {
      lines.push(x.t('qcgate.expWinMonths', { w: months, m: String(r.value) }))
    }
    const hours = basisValueOf({ basis: r.basis, key: QC_BASIS.fullTime })
    if (hours !== TEXT_NONE) {
      notes.push(x.t('qcgate.fullTimeQc', { h: hours }))
    }
  }
  if (lines.length === 0) {
    return null
  }
  return { key: QC_ROW.exp, label: x.t('qcgate.k.exp'), lines, notes }
}

/**
 * 「收件条件」行(PEQ 本轮):截点日前在魁省做满几个月、哪几档 TEER 的工作。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有给 null。
 */
function qcReceptRowOf(x: QcRowOfIn): GateRowSpec | null {
  for (const r of qcApplicantRowsOf({ rows: x.rows, factor: QC_F.experience })) {
    const date = basisValueOf({ basis: r.basis, key: QC_BASIS.asOf })
    if (date === TEXT_NONE || r.value == null) {
      continue
    }
    const line = x.t('qcgate.recept', { date, m: String(r.value), list: qcTeerRangeOf(r.appliesTeer) })
    return { key: QC_ROW.recept, label: x.t('qcgate.k.recept'), lines: [line], notes: [] }
  }
  return null
}

/**
 * 「收件期」行(PEQ 本轮收件起止)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有给 null。
 */
function qcIntakeRowOf(x: QcRowOfIn): GateRowSpec | null {
  const r = rowOfFactor({ rows: x.rows, factor: QC_F.intake })
  if (r == null) {
    return null
  }
  const opens = basisValueOf({ basis: r.basis, key: QC_BASIS.opens })
  const closes = basisValueOf({ basis: r.basis, key: QC_BASIS.closes })
  if (opens === TEXT_NONE || closes === TEXT_NONE) {
    return null
  }
  return {
    key: QC_ROW.intake,
    label: x.t('qcgate.k.intake'),
    lines: [x.t('qcgate.intake', { opens, closes })],
    notes: [],
  }
}

/**
 * 「学历」行:官方学历门槛是条文不是数,按通道各写一句(词条 qcgate.edu.<通道键>)。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;通道没有学历门槛给 null。
 */
function qcEduRowOf(x: QcRowOfIn): GateRowSpec | null {
  if (qcApplicantRowsOf({ rows: x.rows, factor: QC_F.education }).length === 0) {
    return null
  }
  return { key: QC_ROW.edu, label: x.t('qcgate.k.edu'), lines: [x.t(QC_EDU_HEAD + x.chan.key)], notes: [] }
}

/**
 * 「年龄」行。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有给 null。
 */
function qcAgeRowOf(x: QcRowOfIn): GateRowSpec | null {
  const r = rowOfFactor({ rows: x.rows, factor: QC_F.age })
  if (r == null || r.value == null) {
    return null
  }
  return { key: QC_ROW.age, label: x.t('qcgate.k.age'), lines: [x.t('qcgate.age', { n: String(r.value) })], notes: [] }
}

/**
 * 「自给」行:签自给合同,成为永久居民后头几个月自己负担。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有给 null。
 */
function qcFundsRowOf(x: QcRowOfIn): GateRowSpec | null {
  const r = rowOfFactor({ rows: x.rows, factor: QC_F.funds })
  if (r == null || r.value == null) {
    return null
  }
  return {
    key: QC_ROW.funds,
    label: x.t('qcgate.k.funds'),
    lines: [x.t('qcgate.funds', { n: String(r.value) })],
    notes: [],
  }
}

/**
 * 「配偶」行:随行配偶的法语口语门槛;灰字 TEF 分数线。
 *
 * @param x 各行构造器的共同入参。
 * @returns 这一行;没有给 null。
 */
function qcSpouseRowOf(x: QcRowOfIn): GateRowSpec | null {
  for (const r of x.rows) {
    if (r.factor !== QC_F.language || r.subject !== QC_SUBJECT_SPOUSE || r.value == null) {
      continue
    }
    const tef = qcTestLineOf({
      t: x.t,
      test: QC_TEST_TEF,
      oral: r,
      written: null,
      comp: QC_BASIS.tefComp,
      expr: QC_BASIS.tefExpr,
    })
    return {
      key: QC_ROW.spouse,
      label: x.t('qcgate.k.spouse'),
      lines: [x.t('qcgate.spouse', { n: String(r.value) })],
      notes: [tef],
    }
  }
  return null
}

/**
 * 职位板魁省岗那一格的文案(2026-09-30 Frank 勾「PSTQ + 通道名」):按职业码查首屏事实索引里的第一个通道键 →「PSTQ 高技能」这类;
 * 职业不在官方对照表里照旧写「魁省」。
 *
 * @param x 取词函数、职业码与事实索引。
 * @returns 格子文案。
 */
export function qcCellNameOf(x: QcCellNameIn): string {
  const key = x.index.qc[x.noc]
  if (key == null) {
    return x.t(K_CELL_QC)
  }
  return x.t(QC_CELL_HEAD + key)
}

/**
 * 魁省一个职业的通道取数机器(2026-09-30 魁省门槛弹框;照 makeLoadPnpData 的形):取挂了落 failed,不重取(下次开框重来)。
 *
 * @param x 职业码与两个落格。
 * @returns 取数函数(收卸下标记)。
 */
export function makeLoadQcChannels(x: LoadQcChannelsIn): LoadFn {
  return function loadQcChannels(flag: DeadFlag): void {
    function read(r: Response): Promise<QcChannelsJson> {
      if (r.ok) {
        return r.json()
      }
      return Promise.resolve(null)
    }
    function land(j: QcChannelsJson): void {
      if (flag.dead) {
        return
      }
      if (j == null || j.channels == null) {
        x.setFailed(true)
        return
      }
      x.setChannels(j.channels)
    }
    function fall(): void {
      if (flag.dead === false) {
        x.setFailed(true)
      }
    }
    fetch(URL_API_JOBS_QC + x.noc).then(read).then(land).catch(fall)
  }
}

/**
 * 喂给弹框的通道列:还没到给空列(那时 ready 为 false、正文不渲)。
 *
 * @param channels 懒取到的通道;null = 还没到。
 * @returns 通道列。
 */
export function qcChannelsOf(channels: QcChannel[] | null): QcChannel[] {
  if (channels == null) {
    return []
  }
  return channels
}

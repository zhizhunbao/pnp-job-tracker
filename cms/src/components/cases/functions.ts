/**
 * cases 域(处境页)的函数:i18n 键拼装、判定理由与徽章的措辞/配色、供需 bullet、
 * 埋点手柄工厂。判定核输出的形状按「类型跟着主人走」就地 `import type` 自
 * `@/lib/ruling/server`('use client' 链路对 /server 只许 import type,编译期擦除);
 * 入参形状与函数同住 —— 这些格子引用外域类型,进不了本域不许 import 的 types.ts。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { cssOf } from '@/components/css'
import { makeT } from '@/lib/i18n'
import { dropProvPrefix } from '@/lib/jobs'
import { CASES } from '@/lib/ruling'
import { track } from '@/lib/track'
import type { CaseAnswer, OpsFacts, PathwayVerdict, VerdictReason } from '@/lib/ruling/server'
import {
  CASE_KEY_HEAD, CASE_LABEL_TAIL, CASE_Q_TAIL, EV_INDEX_PAGE, EV_TO_QUIZ, FED_CODE, KIND_NEEDS_INFO, LANG_ZH,
  LD_CONTEXT, LD_CONTEXT_KEY, LD_ITEM_TYPE, LD_LIST_TYPE, LD_TYPE_KEY, LIST_POS_BASE, OPS_POOL_AT_KEY,
  OPS_POOL_KEY, OPS_POOL_ON_KEY, PCT_TENTH_DIV, PCT_TENTH_SCALE, PROV_KEY_HEAD, QUOTE_CLOSE, QUOTE_OPEN,
  QUOTE_ZH_CLOSE, QUOTE_ZH_OPEN, REASONS_MAX, TEXT_NONE, TIER_KEY_HEAD, URL_CASE_HEAD, URL_SITE_HEAD,
  VERDICT_EXCLUDED, YEAR_RE,
} from './constants'
import type { CaseListItem, CaseTierBand, TFn } from './types'
import css from './cases.module.css'

/**
 * 处境标签的 i18n 键(索引行与详情页 H1 同一条文案 —— 两处叫法必须一致)。
 *
 * @param x 案例编号。
 * @returns 整键。
 */
export function caseLabelKeyOf(x: {
  /**
   * 案例编号(C01…)。
   */
  id: string
}): string {
  return CASE_KEY_HEAD + x.id + CASE_LABEL_TAIL
}

/**
 * 用户原话的 i18n 键。
 *
 * @param x 案例编号。
 * @returns 整键。
 */
export function caseQKeyOf(x: {
  /**
   * 案例编号。
   */
  id: string
}): string {
  return CASE_KEY_HEAD + x.id + CASE_Q_TAIL
}

/**
 * 用户原话套引号:引号跟语言走 —— 中文用「」,英韩用弯引号(英文句子外面
 * 套全角方头括号是明显的中文味)。「用户原话」标签 2026-08-11 Frank 撤掉,
 * 引号自己就说明了。
 *
 * @param x 语言与原话。
 * @returns 套好引号的整句。
 */
export function quotedOf(x: {
  /**
   * 当前界面语言。
   */
  lang: string

  /**
   * 原话(一个字不改)。
   */
  text: string
}): string {
  if (x.lang === LANG_ZH) {
    return QUOTE_ZH_OPEN + x.text + QUOTE_ZH_CLOSE
  }
  return QUOTE_OPEN + x.text + QUOTE_CLOSE
}

/**
 * 处境详情页的地址(slug 唯一来源是 `CASES.page` —— 两边各写一份就会出死链)。
 *
 * @param x 该处境的 slug。
 * @returns 整地址。
 */
export function caseHrefOf(x: {
  /**
   * `CASES.page` 里的 slug。
   */
  page: string
}): string {
  return URL_CASE_HEAD + x.page
}

/**
 * 造一枚索引行「完整案例」的埋点手柄(E7-02:点了哪条处境要看得见)。
 *
 * @param x 案例编号。
 * @returns 点击埋点手柄(跳转由 LinkButton 的 href 自己走)。
 */
export function makeTrackIndex(x: {
  /**
   * 案例编号。
   */
  id: string
}): () => void {
  return function trackIndex(): void {
    track(EV_INDEX_PAGE, { id: x.id })
  }
}

/**
 * 造一枚详情页 CTA「测测我自己的」的埋点手柄。
 *
 * @param x 案例编号。
 * @returns 点击埋点手柄。
 */
export function makeTrackQuiz(x: {
  /**
   * 案例编号。
   */
  id: string
}): () => void {
  return function trackQuiz(): void {
    track(EV_TO_QUIZ, { id: x.id })
  }
}

/**
 * 判定核给的一条理由该显示什么:有 pv.* 键就走措辞层,没有(将来新加漏挂的)
 * 退回中文原句 —— 宁可露一句中文,不露键名。
 *
 * @param x 取词函数与那条理由。
 * @returns 显示文本。
 */
export function reasonTextOf(x: {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 判定核给的一条理由。
   */
  r: VerdictReason
}): string {
  if (x.r.key) {
    return x.t(x.r.key, x.r.params)
  }
  return x.r.text
}

/**
 * 省码 → 省全名(键查不到时回退显示码本身 —— 宁露码不露键名;FED 由调用方
 * 自己分流,不进这里)。
 *
 * @param x 取词函数与两字省码。
 * @returns 省全名或码。
 */
export function provNameOf(x: {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省的两字码。
   */
  code: string
}): string {
  const full = x.t(PROV_KEY_HEAD + x.code)
  if (full === PROV_KEY_HEAD + x.code) {
    return x.code
  }
  return full
}

/**
 * 档位 → 档位标签(没有档位的按 0 读,与改造前 `tier ?? 0` 同口径)。
 *
 * @param x 取词函数与该通道的档位。
 * @returns 档位标签。
 */
export function tierLabelOf(x: {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 该通道的档位;null 按 0 读。
   */
  tier: CaseTierBand | null
}): string {
  let n: CaseTierBand = 0
  if (x.tier != null) {
    n = x.tier
  }
  return x.t(TIER_KEY_HEAD + n)
}

/**
 * 通道抬头的省位文本(FED 走联邦文案,其余走省全名)。
 *
 * @param x 取词函数与该通道判定。
 * @returns 省位文本。
 */
export function pathProvOf(x: {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 该通道判定(只读 province 一格)。
   */
  v: PathwayVerdict
}): string {
  if (x.v.province === FED_CODE) {
    return x.t('dp.federal')
  }
  return provNameOf({ t: x.t, code: x.v.province })
}

/**
 * 通道抬头的官方通道名(走查 #293:通道名本身以省名开头的把前缀摘掉,
 * 否则一行里省名说两遍,还多折一行)。
 *
 * @param x 取词函数与该通道判定。
 * @returns 摘过前缀的通道名。
 */
export function pathStreamOf(x: {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 该通道判定(读 stream 与 province 两格)。
   */
  v: PathwayVerdict
}): string {
  let prov = TEXT_NONE
  if (x.v.province !== FED_CODE) {
    prov = provNameOf({ t: x.t, code: x.v.province })
  }
  return dropProvPrefix({ name: x.v.stream, prov })
}

/**
 * 档位徽章的类名预算:排除 = 红档、档 0 = 绿档、其余 = 琥珀档。
 *
 * @param x 该通道判定(读 verdict 与 tier 两格)。
 * @returns 拼好的 className。
 */
export function badgeClsOf(x: {
  /**
   * 该通道判定。
   */
  v: PathwayVerdict
}): string {
  if (x.v.verdict === VERDICT_EXCLUDED) {
    return `${cssOf(css.badge)} ${cssOf(css.badgeBlocked)}`
  }
  if (x.v.tier === 0) {
    return `${cssOf(css.badge)} ${cssOf(css.badgeOk)}`
  }
  return `${cssOf(css.badge)} ${cssOf(css.badgeWarm)}`
}

/**
 * 档位徽章的面文字:排除给「现在走不通」,其余给档位标签。
 *
 * @param x 取词函数与该通道判定。
 * @returns 徽章文字。
 */
export function badgeTextOf(x: {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 该通道判定。
   */
  v: PathwayVerdict
}): string {
  if (x.v.verdict === VERDICT_EXCLUDED) {
    return x.t('case.blockedTag')
  }
  return tierLabelOf({ t: x.t, tier: x.v.tier })
}

/**
 * 理由文字的色档类(met 绿 / gap 琥珀 / excluded 红 / needs-info 灰;
 * 键完整性由 Record<理由档, string> 管着)。
 *
 * @param x 那条理由的档。
 * @returns 色档 className。
 */
export function reasonClsOf(x: {
  /**
   * 判定核给这条理由标的档。
   */
  kind: VerdictReason['kind']
}): string {
  const toneCls: Record<VerdictReason['kind'], string> = {
    met: cssOf(css.toneMet),
    gap: cssOf(css.toneGap),
    excluded: cssOf(css.toneExcluded),
    [KIND_NEEDS_INFO]: cssOf(css.toneInfo),
  }
  return toneCls[x.kind]
}

/**
 * 一条通道正文里要摆的理由:滤掉「还差信息」档(页面是给答案的,不是出题的),
 * 最多 REASONS_MAX 条(官方原文收在 details 里不占行)。
 *
 * @param x 判定核给的全部理由。
 * @returns 要摆的那几条。
 */
export function visibleReasonsOf(x: {
  /**
   * 判定核给的全部理由。
   */
  reasons: readonly VerdictReason[]
}): VerdictReason[] {
  const out: VerdictReason[] = []
  for (const r of x.reasons) {
    if (out.length >= REASONS_MAX) {
      break
    }
    if (r.kind === KIND_NEEDS_INFO) {
      continue
    }
    out.push(r)
  }
  return out
}

/**
 * 把按档分组的其余路径摊平成一条有序队列(档位分组只是排序依据,不是版面分节)。
 *
 * @param x 整份答案(只读 tiers 一格)。
 * @returns 由易到难的一条队列。
 */
export function flatRowsOf(x: {
  /**
   * 整份答案。
   */
  answer: CaseAnswer
}): PathwayVerdict[] {
  const out: PathwayVerdict[] = []
  for (const g of x.answer.tiers) {
    for (const v of g.rows) {
      out.push(v)
    }
  }
  return out
}

/**
 * 「他问的那个省」段首那句:最快的替代是哪一档(取其余路径的第一档;
 * 一档都没有按 0 读,与改造前 `tiers[0]?.tier ?? 0` 同口径)。
 *
 * @param x 整份答案。
 * @returns 最快替代的档位。
 */
export function fastestTierOf(x: {
  /**
   * 整份答案。
   */
  answer: CaseAnswer
}): CaseTierBand | null {
  const first = x.answer.tiers[0]
  if (first == null) {
    return null
  }
  return first.tier
}

/**
 * 工作机会 bullet 的那句话:同档排序就是按它排的,排序依据必须看得见 ——
 * 有带训岗时说「其中 m 个带训」,否则只报在招数。
 *
 * @param x 取词函数与该省的在招计数。
 * @returns bullet 文本。
 */
export function openingLineOf(x: {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 该省该职业的在招计数(n = 在招,t = 其中带训)。
   */
  o: {
    /**
     * 在招岗数。
     */
    n: number

    /**
     * 其中标了带训的岗数。
     */
    t: number
  }
}): string {
  if (x.o.t > 0) {
    return x.t('case.openingsTrain', { n: x.o.n, m: x.o.t })
  }
  return x.t('case.openings', { n: x.o.n })
}

/**
 * 该省公布的运营数字 → bullet 条目(供需:各省公布的口径不同,谁公布什么写什么,
 * **不硬凑统一比值**)。期次形态决定池子那句的说法:纯年份 = 年报的**年末快照**
 * (MB);带日期 = 当天的**实时池**(AB)—— 两者差着一年,套同一句话就等于把
 * 去年的数说成今天的(2026-08-11 接 MB 时实拍撞到)。
 *
 * @param x 取词函数与该省运营数字。
 * @returns bullet 条目;这一格没有就零条。
 */
export function supplyBitsOf(x: {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 该省公布的运营数字;没有 = null。
   */
  o: OpsFacts | null
}): string[] {
  const bits: string[] = []
  if (x.o == null) {
    return bits
  }
  let allocPeriod = TEXT_NONE
  if (x.o.allocPeriod != null) {
    allocPeriod = x.o.allocPeriod
  }
  if (x.o.allocation != null && x.o.nominated != null) {
    const left = Math.max(x.o.allocation - x.o.nominated, 0)
    bits.push(x.t('case.ops.spots', { total: x.o.allocation, used: x.o.nominated, left, period: allocPeriod }))
  } else if (x.o.allocation != null) {
    bits.push(x.t('case.ops.alloc', { n: x.o.allocation, period: allocPeriod }))
  }
  if (x.o.poolTotal != null) {
    let poolPeriod = TEXT_NONE
    if (x.o.poolPeriod != null) {
      poolPeriod = x.o.poolPeriod
    }
    let key = OPS_POOL_ON_KEY
    if (poolPeriod === TEXT_NONE) {
      key = OPS_POOL_KEY
    } else if (YEAR_RE.test(poolPeriod)) {
      key = OPS_POOL_AT_KEY
    }
    bits.push(x.t(key, { n: x.o.poolTotal, period: poolPeriod }))
  }
  if (x.o.nominated != null && x.o.refused != null) {
    const pct = Math.round((x.o.nominated / (x.o.nominated + x.o.refused)) * PCT_TENTH_SCALE) / PCT_TENTH_DIV
    let ytd = TEXT_NONE
    if (x.o.ytdPeriod != null) {
      ytd = x.o.ytdPeriod
    }
    bits.push(x.t('case.ops.approved', { pct, ok: x.o.nominated, no: x.o.refused, period: ytd }))
  }
  return bits
}

/**
 * 索引页的 JSON-LD(schema.org ItemList):有事实层的处境各出一条,让搜索引擎
 * 认出这是一张列表。2026-08-29 自 cases/page.tsx 的散常量下沉(页面门只许拼装);
 * `@context`/`@type` 两个键名是 schema.org 线格式定死的,走 constants 的键常量
 * 以计算属性拼,不写裸串。
 *
 * @returns 序列化好的整串(页面门直接塞进 script 体)。
 */
export function casesJsonLd(): string {
  const items: CaseListItem[] = []
  for (const c of CASES) {
    if (c.page === '') {
      continue
    }
    items.push({
      [LD_TYPE_KEY]: LD_ITEM_TYPE,
      position: items.length + LIST_POS_BASE,
      name: makeT(LANG_ZH)(caseLabelKeyOf({ id: c.id })),
      url: URL_SITE_HEAD + URL_CASE_HEAD + c.page,
    })
  }
  return JSON.stringify({
    [LD_CONTEXT_KEY]: LD_CONTEXT,
    [LD_TYPE_KEY]: LD_LIST_TYPE,
    itemListElement: items,
  })
}

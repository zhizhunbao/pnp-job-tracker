// 🔵 逐句门控 + ✂️ 截断:一句过了才发给前端。
//
// 2026-08-08 起答复正文也流,但靠的是「按句门控」不是把校验关了 —— 五道里有四道本来就一句一句能判,
// 跨句才判得了的那两道(逐行抄、同开头)整段跑完只留痕。**红线一个字没松。**
// 截断:朋友服务不收 max_tokens,长度与句数都得回来自己收,宁可少说一句,不许留半句。
import { type Availability } from './tools'
import { AVAIL_SENTENCE, type Lang, SHEET_HEAD } from '../i18n'
import { sayFact } from './answer'
import { findAlienProvinces, findEnglishUnits, findFactEq, findForeignScript, findLeaks, findUngroundedClaims, findUnitMismatch, findWordNumbers, guardAnswer, tidy } from './guards'
import { SENT_SPLIT, findHedges, findMixedStates } from './traces'
import type { Fact, Slots } from './types'
import { LEN_CAP, SENT_CAP, localizeUnits } from './wording'

/** 按句截断:宁可少说一句,不许留半句。字数与句数**两条都收**;整句都塞不下才硬切(极端情况)。 */
export function clampAnswer(s: string, lang: Lang, cap = LEN_CAP[lang], sentCap = SENT_CAP): string {
  const t = s.trim()
  const parts = t.split(SENT_SPLIT)      // 断句口径见 SENT_SPLIT(全站一份,别在这儿另写一条)
  if (t.length <= cap && parts.filter((p) => p.trim()).length <= sentCap) return t
  let out = ''
  let n = 0
  for (const p of parts) {
    if (out.length + p.length > cap) break
    if (p.trim() && ++n > sentCap) break
    out += p
  }
  return out.trim() || t.slice(0, cap).trim()
}

// ── 🔵 逐句门控:一句过了才发给前端 ─────────────────────────────────────────
//
// 2026-08-08 拍板(Frank),判据一句话:**永不让用户看见编出来的数字,偶尔容忍啰嗦。**
// 出口校验按「判得了几句」分成两类,不是按重要性分:
//   ① **一句就能判的**(数字回查 facts / 内部码 / 语言混用 / 两态揉一句)→ 逐句门,一句过了才放行;
//   ② **跨句才能判的**(逐行抄 ⓑ 要数够三条、连着三句同开头)→ 属**质量**不属真假,整段跑完只留痕。
//
// 🔴 **一道判据都没有放宽**:①里用的就是原来那几个函数,一个字没改,只是喂给它的是「到此为止的前缀」
//    而不是整段。**故意喂前缀而不是喂单独一句** —— 行首序号白名单、官方专名遮罩这些判据都要看上下文,
//    拆散了喂就成了另一套判定(两套迟早不一致)。前面的句子已经验过是干净的,新报出来的必然出在新那截。
const HEDGE_SPLIT = /(?<=[。！？；!?;\n])/    // dropTrailingHedge 砍的粒度(它自己那把刀,英文里 `.` 不断段)
// 一句写完了没有:全角句末标点 / `\n` 直接算;ASCII `.` 前面是数字时**不算**(在写的可能是 `3.6`)——
// 这正是 2579202 那条红线的同款判据:**宁可晚一拍,不许断在词中间(或数字中间)**。
const SENT_END = /(?:[。！？；!?;\n]|(?<!\d)\.)$/

/**
 * 尾巴留手:两样**得等到后面还有字**才判得了的东西,不许先发出去。
 *   ① 在途的半句 —— 断句用全站那一份 SENT_SPLIT(clampAnswer / findSameOpening / findMixedStates 用的同一条,
 *      2579202 抽出来的),**这里不另写一套**;
 *   ② dropTrailingHedge 会砍掉结尾那一两「段」劝告 —— 先发再删 = 用户读到了我们打算删掉的建议。
 * ② 只对**真可能被砍的**留手(判据照抄 dropTrailingHedge:带劝告词且一个数字都没有),
 * 而**还在写的那一段**只认「已经带着数字」就放行 —— 数字只会越加越多不会消失,带数字的段它砍不动;
 * 一个数字都还没有的在写段一律压着,免得后面冒出一句「建议尽快…」时已经发出去了。
 */
function holdTail(s: string, lang: Lang): string {
  const parts = s.split(SENT_SPLIT)
  let n = parts.length
  if (n && !SENT_END.test(parts[n - 1].trimEnd())) n--                 // ① 在途的半句
  const head = parts.slice(0, n).join('')
  const units = head.split(HEDGE_SPLIT)
  const openEnd = !/[。！？；!?;\n]$/.test(head)                        // 最后那一段还没写完
  let m = units.length
  let held = 0
  while (m > 0 && held < 2) {                                          // ② 它最多砍两段
    const p = units[m - 1]
    if (!p.trim()) { m--; continue }                                   // 空白段跟着走(它找最后一句时也跳过空白)
    if (/\d/.test(p) || (!(m === units.length && openEnd) && !findHedges(p, lang).length)) break
    m--; held++
  }
  return units.slice(0, m).join('')
}

/**
 * 逐句门的硬拦集合 = 既有六道里**一句就能判的那五道**(第六道 findFactCopied 见上面 ⓑ),
 * 外加 2026-08-09 新增的两道确定性硬拦(闸A 归因 / 闸B 派生数单位),它们也都是一句就能判的。
 * `slots` = 用户真给过的槽,闸A 的输入;不给 = 闸A 不生效(见 findUngroundedClaims)。
 */
export function sentenceBlockers(text: string, facts: Fact[], lang: Lang, echo = '', slots?: Partial<Slots> | null): string[] {
  return [
    ...guardAnswer(text, facts, echo).bad,
    ...findLeaks(text),
    ...findFactEq(text),
    ...findEnglishUnits(text, lang, facts),
    ...findWordNumbers(text, lang, facts, echo),
    ...findForeignScript(text, lang),
    ...findMixedStates(text, lang),
    ...findUngroundedClaims(text, slots, echo),
    ...findUnitMismatch(text, facts, echo),
    // K03 省名串台(2026-08-09 治病批):点名了 facts/原话里都没有的省,一句就能判
    ...findAlienProvinces(text, facts, echo, slots),
  ].slice(0, 8)
}

type SentenceGate = {
  /** 已经放行出去的那截(处理后的文本 —— 前端收到的就是它,一字不差)。 */
  readonly released: string
  /** 又收到一段模型原文(累计) → 这次能放行的增量('' = 还不能)。blocked 非空 = 撞了门,调用方必须停流。 */
  push(raw: string): { text: string; blocked: string[] }
  /** 整段落地后收尾:final = 最终见客文案。返回还没发的那截;`null` = 对不上前缀,调用方得撤回重画。 */
  tail(final: string): string | null
}
/**
 * 流的那一稿走的是**和整段完全同一条流水线**(tidy → localizeUnits → clampAnswer),
 * 只是每次喂进去的是「到目前为止」的原文 —— 所以流出去的字与最终答复逐字相同,不是另做一份。
 */
export function makeSentenceGate(facts: Fact[], lang: Lang, echo = '', slots?: Partial<Slots> | null): SentenceGate {
  let out = ''
  return {
    get released() { return out },
    push(raw) {
      const cand = clampAnswer(holdTail(localizeUnits(tidy(raw), lang), lang), lang)
      if (cand.length <= out.length || !cand.startsWith(out)) return { text: '', blocked: [] }
      const blocked = sentenceBlockers(cand, facts, lang, echo, slots)
      if (blocked.length) return { text: '', blocked }
      const add = cand.slice(out.length)
      out = cand
      return { text: add, blocked: [] }
    },
    tail(final) {
      if (!final.startsWith(out)) return null
      const add = final.slice(out.length)
      out = final
      return add
    },
  }
}

// 降级清单也是见客文案:四态码换人话(四态句子只有 AVAIL_SENTENCE 一个来源)、单位换用户语言。
// label 仍是英文速记 —— 那是原料不是话术,降级本来就是「给你看我查到了什么」。
const dropCodes = (s: string, lang: Lang) => s
  .replace(/NOT-(PUBLISHED|COLLECTED|APPLICABLE)(\s*\([^)]*\))?/gi, (_m, k: string) => AVAIL_SENTENCE[lang][`not-${k.toLowerCase()}` as Availability])
  .replace(/\bN-A(\s*\([^)]*\))?/g, AVAIL_SENTENCE[lang]['not-applicable'])

/**
 * 降级:宁可给一张能溯源的事实清单,也不给一句编出来的话。
 *
 * 🔴 但**清单本身要排得能读**(2026-08-05 Frank 实测:「一坨 - 标签: 值 — 一长串 note」)。
 * 三条排法,都只做减法,一个事实不新增、不改写:
 *   ① **别人跟他说的话排最前** —— 他就是为这个来的,而它偏偏在 collectFacts 的存储序里排最后(第⑦格);
 *   ② 带数字的事实排中间,四态行(「这项官方不公布」)排最后 —— 有数的先看,没数的后看;
 *   ③ 索引口径注(unit='note')整条不进:那是管道内情,不是他的事实。
 * 再加 brief:砍掉四态行后面的取证注(见 sayFact)。条数从 20 收到 14 —— 再多没人读得完。
 */
const SHEET_ORDER: Record<string, number> = { claim: 0, status: 3 }
export function factSheet(facts: Fact[], lang: Lang): string {
  // 与 prompt 用同一个 sayFact:降级清单和喂模型的材料是同一批话,两处各写各的迟早分叉
  const lines = facts
    .filter((f) => f.unit !== 'note')
    .map((f, i) => ({ f, i, rank: SHEET_ORDER[f.unit] ?? (f.value != null ? 1 : 2) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .slice(0, 14)
    .map(({ f }) => `- ${sayFact(f, lang, { brief: true })}`)
    .filter((l, i, a) => a.indexOf(l) === i)          // 同一句重复摆两遍只会显得没查清楚
  return localizeUnits(dropCodes([SHEET_HEAD[lang], ...lines].join('\n'), lang), lang)
}

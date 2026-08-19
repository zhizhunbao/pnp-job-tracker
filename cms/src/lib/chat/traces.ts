// 🟡 只留痕不拦的四条。
//
// 与 guards.ts 的分界:那边拦下重来,这边记一笔放行 —— 它们判的是「读着像在念表格」这类
// 说不上违规、但值得知道的毛病。留痕进日志,不影响这次答复。
import { type Availability } from './tools'
import { type Lang } from '../i18n'
import { ALL_PROVS } from '../location'
import { PROV_ALIAS } from './normalize'
import type { Fact } from './types'
import { AVAIL_MARKERS, HEDGE_WORDS } from './wording'

// ── 🟡 出口留痕:两条状态不同的主张被揉成一句 ───────────────────────────────
//
// 「官方不公布」≠「本站还没收录」是这套系统的立身之本(pnp_ops_stats 那张表、C1 的四态都是为了这个区分)。
// 合并 = 撒谎,而且撒的正是中介最爱钻的空子:用户以为「你们没查到」,实际是「官方根本不发,谁承诺都没依据」。
// 两道查法,都只留痕(硬拦风险大于收益;真正的闸门是金标测试那两条断言):
//   ⓐ 吞掉:facts 里两种状态都有,答复里只出现一种说法;
//   ⓑ 揉句:同一句里同时提到了两条**状态不同**的主张,却只给了一种说法。
export const CLAIM_TEXT_RE = /[「"](.+?)[」"]/
/** 主张 → 用来判「这句话提到它了吗」的碎片:数字 + 中/韩文 2-4 连字;要**两个**碎片同时命中才算提到(压噪)。 */
export function claimKeys(text: string): string[] {
  const keys = new Set<string>()
  for (const m of text.matchAll(/\d+/g)) keys.add(m[0])
  for (const run of text.match(/[一-鿿가-힯]+/g) ?? []) {
    if (run.length <= 2) { keys.add(run); continue }
    for (let i = 0; i + 2 <= run.length; i++) {
      keys.add(run.slice(i, i + 2))
      if (i + 4 <= run.length) keys.add(run.slice(i, i + 4))
    }
  }
  return [...keys]
}
export const saysState = (s: string, lang: Lang, av: Exclude<Availability, 'ok'>) =>
  AVAIL_MARKERS[lang][av].some((m) => s.toLowerCase().includes(m.toLowerCase()))

/**
 * 断句的**单一来源**(clampAnswer / findSameOpening 一直用的就是这一条,现在写成一份)。
 * 全角句末标点直接断;ASCII 的 `.` 必须后跟空白才算句末,否则「3.6」会被劈开。
 *
 * 🔴 findMixedStates 原来漏了 ASCII `.` —— 于是**两句各说各态的英文**(`… does not publish this.
 * Our site has not indexed …`)被当成一句,判成「一句焊了两态」,白烧一次软重写(2026-08-07 实测 C07)。
 * 补的是断句,不是判据:一句里真焊两态照旧抓 —— 英文句末那个 `.` 后面没有空白,整句仍然是一句。
 */
export const SENT_SPLIT = /(?<=[。！？；!?;\n])|(?<=\.)(?=\s)/

/**
 * ⓒ **一句话里同时挂着两种状态**,不管说的是哪两条记录 ——
 * 2026-08-05 实测中文 C13 末句:「至于该省是否有…职业清单或抽选记录,官方不公布这项数据且本站尚未收录。」
 * 一个「且」把两件事的两种状态焊在一起,读者根本分不清哪件是官方不发、哪件是我们没收。
 * ⓐⓑ 只盯主张行(claim),这句里两条都是四态行(status),整个漏了过去 —— 所以这条判据**不看是哪条 fact**,
 * 只看一句话里出现了几种状态说法。这是那条红线最后一道机械网。
 */
export function findMixedStates(answer: string, lang: Lang): string[] {
  const AVS = ['not-published', 'not-collected', 'not-applicable'] as const
  const out: string[] = []
  for (const sent of answer.split(SENT_SPLIT)) {
    if (!sent.trim()) continue
    const hit = AVS.filter((av) => saysState(sent, lang, av))
    if (hit.length > 1) out.push(`mixed:${sent.trim().slice(0, 40)}`)
  }
  return out.slice(0, 4)
}

// ── 🟡 出口留痕⑤:同一个句式连着来三遍 = 在念表格 ───────────────────────────
//
// 2026-08-05 实录(英文 C13):"NS requires the applicant to reach 5 CLB…" / "NS requires the applicant to have 12 months…"
// / "NS requires the employer to have been in business 2 years." —— 数字全溯得回 facts、没有内部码、没有 `=`,
// 前面每一道都放行,可它读起来就是一张表。判据只认**机械可证**的:相邻句子的开头一模一样,连着 ≥3 句。
//
// 🔴 **只重试一次,绝不因此降级**:降级成事实清单比句式雷同难看得多(那才是真的念表格)。
// 判开头:英文取前两个词,中/韩取前 4 个字 —— 再长会把「MB 要求…」和「MB 现在…」误判成同一句式。
//
// 一省一句(RULE 5b 早就禁了)是同一个病的另一张脸:2026-08-05 实测英文 C14 连着五句
// "Ontario requires… / British Columbia requires… / Alberta requires… / Saskatchewan requires…",
// 每句开头不同,按前两个词判一条都抓不到。所以**开头是省名的句子一律归成同一个 key**:
// 连着三句都以省份起头 = 在按省念表,不管念的是哪个省。
const PROV_OPEN = new RegExp(
  `^(?:${[...ALL_PROVS, ...Object.keys(PROV_ALIAS)].map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![A-Za-z])`, 'i')
const openKey = (s: string, lang: Lang): string => {
  const t = s.trim().replace(/^[^\p{L}\p{N}]+/u, '')
  if (PROV_OPEN.test(t)) return 'PROV'
  return lang === 'en' ? t.toLowerCase().split(/\s+/).slice(0, 2).join(' ') : t.slice(0, 4)
}
/** 行首 `- `(答复里唯一允许的列表记号,与前端 ChatText 同一个判据)。 */
export const BULLET_LINE = /^\s*-\s+/
/**
 * 🔴 **列表项不进这道检查**(2026-08-06,RULE 5 松绑同批):项目符号里句式相近**正是列表的用处** ——
 * 「- 这个省要求雇主经营满 3 年 / - 要求你语言到 CLB 5」读起来是一份对齐的清单,不是在念表格。
 * 而且 bucket A 按 RULE 0b 就该**围着问题里那个省**写,一判 PROV 三条全中,等于把我们自己
 * 要求的形状判成违规(那会白烧一次重写,重写完还是同一个形状)。
 * 收窄而不是放弃:散文句之间照旧连着三句同开头就抓 —— 「在念表格」这道红线一个字没松,
 * 只是**列表形态不算它的射程**;列表还顺带把前后两句的连号打断(隔着一份清单的两句不叫「连着」)。
 */
export function findSameOpening(answer: string, lang: Lang): string[] {
  const sents = answer.split(SENT_SPLIT).map((s) => s.trim()).filter(Boolean)
  const out: string[] = []
  let run = 1
  for (let i = 1; i < sents.length; i++) {
    if (BULLET_LINE.test(sents[i]) || BULLET_LINE.test(sents[i - 1])) { run = 1; continue }
    const k = openKey(sents[i], lang)
    if (k && k === openKey(sents[i - 1], lang)) {
      if (++run >= 3 && !out.includes(k)) out.push(k)
    } else run = 1
  }
  return out.slice(0, 4)
}

// ── 🟡 出口留痕⑥:提示词里的大写强调被抄进了答复 ──────────────────────────────
//
// 2026-08-06 生产实测,英文首句原样回来一句 `**WE** do not have a record…` —— 那个 WE 是 RULE 0 里
// 用来加重语气的大写,模型分不清「这个词重要」和「这个词照抄」。治本在**提示词不再用大写做强调**
// (见 synthMessages 顶部那段);这里是复查的那一道:答复里出现全大写英文词 = 病还在,留痕给读日志的人。
//
// ⚠️ 只报警不拦 —— 误杀比漏一句贵。三类**必须**放行:
//   ① 站内通用缩写(CRS/CLB/NOC/TEER/EE/PNP/PGWP/LMIA/ITA/CEC/FSW/AIP/DLI/SIRS/WEOI + 各省提名项目缩写);
//   ② 省份两位码(ON/BC/AB/…);
//   ③ **在 facts 里出现过的**大写词(官方清单名与通道名里的缩写,如 MPNP EOI)—— 判据照 factsEnglish
//      那套「它在 facts 里出现过就是官方原名」,不靠再养一份词表(养了必分叉)。
// 专有名词(Nova Scotia)不是全大写,天然不在射程内。
const OK_CAPS = new Set([
  'CRS', 'CLB', 'NOC', 'TEER', 'EE', 'PNP', 'PGWP', 'LMIA', 'ITA', 'CEC', 'FSW', 'AIP', 'DLI', 'SIRS', 'WEOI',
  'MPNP', 'OINP', 'SINP', 'AAIP', 'BCPNP', 'NBPNP', 'NSNP', 'PEIPNP', 'NLPNP', 'EOI', 'IRCC', 'CRA', 'GST', 'SIN',
  // 用户自己会说的通用缩写(「读 IT」那条路上,IT 就是他说的专业名 —— 报它等于报用户的原话)
  'IT', 'ICT', 'PR', 'AI', 'HR', 'CV', 'RN', 'PSW', 'ECE', 'CPA', 'IELTS', 'CELPIP', 'TEF', 'TCF', 'ESL', 'MBA',
  ...ALL_PROVS,
])
export function findShoutedWords(answer: string, facts: Fact[] = []): string[] {
  const fromFacts = new Set<string>()
  for (const f of facts) for (const m of `${f.label} ${f.valueText}`.matchAll(/\b[A-Z][A-Z0-9]+\b/g)) fromFacts.add(m[0])
  const out: string[] = []
  for (const m of answer.matchAll(/\b[A-Z]{2,}(?:[-'][A-Z]+)*\b/g)) {
    const w = m[0]
    if (OK_CAPS.has(w) || fromFacts.has(w) || out.includes(w)) continue
    out.push(w)
  }
  return out.slice(0, 8)
}

/** 留痕用,不拦(误杀正常表述比漏一句推断更贵)。 */
export function findHedges(answer: string, lang: Lang): string[] {
  const low = answer.toLowerCase()
  return HEDGE_WORDS[lang].filter((w) => low.includes(w.toLowerCase())).slice(0, 8)
}

/**
 * 只砍**结尾那一两句劝告**。实测(2026-08-04)qwen3.6 对三种写法都照写不误 ——
 * RULE 8、结尾「End on a fact」、把词表原词贴进 prompt,三次回来一字不差都是
 * 「…建议直接通过 Job Bank 核实最新空缺,勿轻信中介承诺。」求不动就回来自己收。
 *
 * 三个条件同时满足才砍,**结构上砍不掉有出处的事实**:
 *   ① 是最后一句;② 句里带劝告/推断词;③ **句里一个数字都没有**(facts 的值全是数字,没数字就没事实)。
 * 句子中间的推断照旧只留痕不动 —— 那种得靠 prompt 治,删了会把整句话删残。
 */
export function dropTrailingHedge(s: string, lang: Lang): { text: string; dropped: string[] } {
  // 🔴 **空白段不能 filter 掉再 join** —— 那正是 2026-08-06 实测中文 C01 的病根:
  //    模型交回来的排版是对的(`…而非省份选择。\n\n- MB、SK、NS…`),按 `\n` 切完,那两个只含换行的
  //    part 被 `.filter(p => p.trim())` 丢掉,`join('')` 一拼,**空行就没了** —— 第一条项目粘回上一句,
  //    渲染器只认得剩下两条,同一份清单被劈成两半。这一道本来只该砍尾巴,却顺手改了全篇排版。
  //    改法:一个 part 都不丢,只在**找最后一句**时跳过空白段(要砍就连它后面的空白一起砍)。
  const parts = s.split(/(?<=[。！？；!?;\n])/)
  const dropped: string[] = []
  const lastIdx = () => { let i = parts.length - 1; while (i >= 0 && !parts[i].trim()) i--; return i }
  while (dropped.length < 2) {
    const i = lastIdx()
    if (i <= 0) break                                                // 只剩一句(或全是空白)就停
    const last = parts[i]
    if (/\d/.test(last) || !findHedges(last, lang).length) break
    if (parts.slice(0, i).join('').trim().length < 40) break         // 砍到只剩个开头就停(宁可留着)
    dropped.push(last.trim())
    parts.splice(i)                                                  // 连同它后面的空白一起去掉
  }
  return { text: parts.join('').trim() || s.trim(), dropped }
}

/**
 * 给模型看的字:K 公司调查的 system 与用户侧模板(#107/#158)。
 * 用户永远看不到这些,不进 i18n。
 *
 * @author Frank
 * @time 2026-08-21 23:20:43
 */

/**
 * 公司调查的 system(#158 Frank「这部分也按 job 的结构来比较好吧」:原是一段散文,与 JD 五节
 * 整理版不是一套语言 → 固定标记分节,搬运不发挥、缺项写 (not stated)、查不到整条 NOT_FOUND。
 * 2026-07-21 Frank「公司的信息需要增强」:三节 → 五节(+成立时间/要点),仍全白名单制)。
 */
export const RESEARCH_SYSTEM = `You are a factual company researcher. Use ONLY the web search results.
Output plain text with EXACTLY these section markers, each on its own line: [WHAT] [BASE] [SIZE] [FOUNDED] [NOTE]
- [WHAT]: 1-2 sentences on what the company does / what it sells.
- [BASE]: where it is based (city, province) — one short line.
- [SIZE]: employee count or scale ONLY if the results state it.
- [FOUNDED]: founding year ONLY if the results state it — one short line.
- [NOTE]: ONE fact a job seeker would care about that the results state (parent company, stock listing, major brands/products, main clients) — one short line.
If a section is not supported by the results, write exactly: (not stated)
If the results are unclear or about a different company, reply exactly: NOT_FOUND
Finally on its own line output [SITE]=<official website url or NONE>. No other commentary.`

/**
 * 调查提问的前缀(后接公司名与国别,拼装在 functions.ts)。
 */
export const RESEARCH_PROMPT_HEAD = 'Company: '

/**
 * 调查提问的后缀:锁定加拿大语境。
 */
export const RESEARCH_PROMPT_TAIL = ' (Canada). What does this company do?'

/**
 * 联网检索词的后缀(前接公司名)。
 */
export const RESEARCH_SEARCH_TAIL = ' company Canada'

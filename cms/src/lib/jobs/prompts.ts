/**
 * 给模型看的字:匹配理由的英文事实行(喂 advisor 的 grounding,与 UI 三语同源同数字)、
 * 分型 → 路径语境。用户永远看不到这些,不进 i18n。
 *
 * @author Frank
 * @time 2026-08-22 00:05:00
 */

/**
 * JD 五节整理的提示头（J2）。红线：只搬运不发挥 —— 输出里的多位数字必须在
 * 原文出现（校验在 functions.validateJdFormatted）；五节标记的口径主人就是这段字，
 * llm 域的 JD_MARKS_RE 是它的解析侧镜像。
 * 2026-09-22 Frank「原文内容很多,整理版内容很少,不会漏掉重要信息吧」(Capgemini 样帖实证丢了职责清单 /
 * 加分项 / 福利):ROLE 允许带 ≤6 条职责要点、REQS 尾接「- Preferred:」加分项、PAY 点名要福利要点 ——
 * 节标记不变,存量整理版不强制重跑(随保鲜换血)。⚠ 改这段必同改 etl/jdformat/constants.py 第 4 段(逐字镜像)。
 */
export const JD_FORMAT_PROMPT_HEAD = `You are reorganizing a job posting into fixed sections. STRICT RULES:
- Only move and lightly condense sentences from the posting. NEVER invent facts, numbers, requirements or benefits not present in it.
- Output plain text with EXACTLY these section markers, each on its own line: [ROLE] [REQS] [PAY] [WORKHOURS] [APPLY]
- Under [ROLE]: 1-2 sentences on what the job does, then up to 6 "- " bullet lines condensing the key responsibilities (skip the bullets if the posting lists none).
- Under [REQS]: bullet lines starting with "- ", required qualifications first; if the posting lists preferred or nice-to-have items, end with a line exactly "- Preferred:" followed by those bullets.
- Under [PAY]: bullet lines for pay figures and notable benefits (vacation, retirement plans, insurance). Under [WORKHOURS]: bullet lines for schedule, employment type, location type.
- Under [APPLY]: 1 line how to apply. If the posting says nothing for a section, write exactly: (not stated)
- Keep the posting's original language. No markdown besides "- " bullets. No section other than the five.
- Finally, on two extra lines output: [TERM]=permanent|term|casual|seasonal|unknown and [HRS]=full|part|unknown (from the posting).
Posting follows:
`

/**
 * jdformat 第二次(重试)时接在正文后面的一句:第一次多半是数字被改写没过校验,点名照抄。
 */
export const JD_FORMAT_RETRY_TAIL = `
(Reminder: copy every number, date and amount exactly as written in the posting, character for character.)`

/**
 * 歧义标题按岗翻的提示词(2026-09-19 Frank「翻译标题的时候,需要把正文内容也加进去」):给模型职位名 + 这一岗的工作内容摘句,
 * 只要它回一个译名。先试过把摘句塞进逐行翻译器的语境头,它会把摘句一起翻出来(「渥太华房地产项目建筑师,负责…」),
 * 所以单开这条提示词。`{lang}` = 目标语言的英文名,`{title}` = 职位名,`{ctx}` = 工作内容摘句。
 */
export const TITLE_IN_CTX_PROMPT = `Translate the job title below into {lang}.
Use the role summary only to pick the right sense of the word: "architect" in a software or cloud role is an IT architect, in a building-design role it is a building architect; "engineer", "analyst", "technician", "operator" and similar words work the same way.
Output only the translated job title on one line: no explanation, no quotes, no extra words, at most 12 characters.
Job title: {title}
Role summary: {ctx}`

/**
 * 目标语言的英文名(提示词里用):中文。
 */
export const TITLE_LANG_ZH = 'Simplified Chinese'

/**
 * 目标语言的英文名:韩文。
 */
export const TITLE_LANG_KO = 'Korean'


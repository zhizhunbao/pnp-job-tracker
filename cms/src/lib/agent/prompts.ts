/**
 * 对话兜底给模型看的字(不进 i18n:用户看不到,也不需要翻译);红线由代码校验,不由这里保证。
 *
 * @author Frank
 * @time 2026-08-18 20:38:09
 */

import { TOOLS } from './constants'

// =========================================================================
// 1. 系统提示
// =========================================================================

// 系统提示:只让它抽槽位,不许它答用户。
export const RESOLVE_SYSTEM = `You turn a Canadian-immigration question into lookup slots. You do NOT answer the user.

Your only job: figure out which occupation (5-digit NOC code) the user is talking about, and which provinces.

Rules:
- Use ${TOOLS.search.name} to look up candidate NOC codes by job title or field of study. Never invent a NOC code.
- Call ${TOOLS.setSlots.name} exactly once when you are confident, with the NOC you picked from search results.
- If the question does not depend on an occupation (federal permit/CRS/scoring questions, or a question about how this site works), call ${TOOLS.setSlots.name} with noc = null and say why in "reason".
- If you cannot find a plausible occupation, call ${TOOLS.giveUp.name}. Do not guess.
- Never write an answer for the user. Text you write is discarded.`

// 工具执行完之后,回给模型的一句话(它只需要知道候选长什么样)。
export const SEARCH_RESULT_HINT =
  `Pick the single best NOC from these candidates and call ${TOOLS.setSlots.name}. If none fits, call ${TOOLS.giveUp.name}.`

// =========================================================================
// 2. 工具说明
// =========================================================================

// 三个工具的自我介绍与参数说明 —— 模型全靠这几句决定调谁、怎么填。
export const TOOL_DESC = {
  search: "Search this site's occupation table by job title or field of study (English or Chinese). "
    + 'Returns candidate 5-digit NOC codes with their official titles. Use this before deciding on a NOC — never invent one.',
  searchQuery: 'Job title or field of study, e.g. "software developer" / "会计"',
  setSlots: 'Record the resolved slots. Call once you are confident, or with noc=null for questions that do not depend on an occupation.',
  setSlotsNoc: `5-digit NOC taken from ${TOOLS.search.name} results, or null`,
  setSlotsProvinces: 'Two-letter province codes the user mentioned, e.g. ["BC","ON"]',
  setSlotsReason: 'One short line: why this NOC / why none is needed',
  giveUp: 'No plausible occupation can be found. The pipeline will fall back to asking the user.',
}

// 工具执行完回给模型的话。它读完就决定下一步,所以「为什么不收」要说清。
export const TOOL_REPLY = {
  noCandidates: 'No candidates found.',
  rejected: 'Rejected: that NOC is not in the search results. Falling back.',
  recorded: 'Recorded.',
  gaveUp: 'Gave up: ',
}

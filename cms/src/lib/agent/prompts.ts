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

/**
 * 系统提示:只让它抽槽位,不许它答用户。
 */
export const RESOLVE_SYSTEM = `You turn a Canadian-immigration question into lookup slots. You do NOT answer the user.

Your only job: figure out which occupation (5-digit NOC code) the user is talking about, and which provinces.

Rules:
- Use ${TOOLS.search.name} to look up candidate NOC codes by job title or field of study. Never invent a NOC code.
- Call ${TOOLS.setSlots.name} exactly once when you are confident, with the NOC you picked from search results.
- If the question does not depend on an occupation (federal permit/CRS/scoring questions, or a question about how this site works), call ${TOOLS.setSlots.name} with noc = null and say why in "reason".
- If you cannot find a plausible occupation, call ${TOOLS.giveUp.name}. Do not guess.
- Never write an answer for the user. Text you write is discarded.`

/**
 * 工具执行完之后,回给模型的一句话(它只需要知道候选长什么样)。
 */
export const SEARCH_RESULT_HINT =
  `Pick the single best NOC from these candidates and call ${TOOLS.setSlots.name}. If none fits, call ${TOOLS.giveUp.name}.`

// =========================================================================
// 2. 工具说明
// =========================================================================

/**
 * 三个工具的自我介绍与参数说明 —— 模型全靠这几句决定调谁、怎么填。
 */
export const TOOL_DESC = {
  /**
   * 查职业候选那把工具的说明。写清能用中英文、能用专业名,模型才不会只试一次就放弃。
   */
  search: "Search this site's occupation table by job title or field of study (English or Chinese). "
    + 'Returns candidate 5-digit NOC codes with their official titles. Use this before deciding on a NOC — never invent one.',

  /**
   * 检索词该长什么样。给中英各一个例子,模型照着抄。
   */
  searchQuery: 'Job title or field of study, e.g. "software developer" / "会计"',

  /**
   * 记槽位那把工具的说明。点明「不依赖职业的问题填 null」,否则模型会硬凑一个码。
   */
  setSlots: 'Record the resolved slots. Call once you are confident, or with noc=null for questions that do not depend on an occupation.',

  /**
   * NOC 那个参数的说明。写死「只能从检索结果里取」,采信校验拦的就是它编出来的码。
   */
  setSlotsNoc: `5-digit NOC taken from ${TOOLS.search.name} results, or null`,

  /**
   * 省码那个参数的说明。只要用户自己提过的,别替他补。
   */
  setSlotsProvinces: 'Two-letter province codes the user mentioned, e.g. ["BC","ON"]',

  /**
   * 理由那个参数的说明。只进日志不见客,所以一行就够。
   */
  setSlotsReason: 'One short line: why this NOC / why none is needed',

  /**
   * 交回反问那把工具的说明。告诉模型「交回去有人接」,它才敢交,而不是硬编一个码。
   */
  giveUp: 'No plausible occupation can be found. The pipeline will fall back to asking the user.',
}

/**
 * 工具执行完回给模型的话。它读完就决定下一步,所以「为什么不收」要说清。
 */
export const TOOL_REPLY = {
  /**
   * 一个候选都没查到。模型看到它就该改检索词再试,或者交回反问。
   */
  noCandidates: 'No candidates found.',

  /**
   * 采信校验没过。留着这句是为了让模型知道「编码没用」。
   */
  rejected: 'Rejected: that NOC is not in the search results. Falling back.',

  /**
   * 槽位记下了。带 terminate,所以这是模型看到的最后一句。
   */
  recorded: 'Recorded.',

  /**
   * 交回反问的回执,后面接模型自己写的理由。
   */
  gaveUp: 'Gave up: ',
}

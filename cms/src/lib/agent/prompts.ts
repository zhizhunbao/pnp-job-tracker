// 给模型看的提示词 —— **用户永远看不到,也不需要翻译**(CLAUDE.md:提示词不是文案,不进 lib/i18n)。
//
// 这一层只做一件事:**在流水线放弃之前,先查一次库**。
// 现在的抽槽(SLOT_SYSTEM)是一次性盲猜,猜不中职业码就反问用户「请提供 NOC」——
// 实测 198 轮里 41 轮(20.7%)栽在这儿。差别不在模型多聪明,在于**它有没有机会先查一下**。
//
// 🔴 红线写进提示词只是第一道;真正兜住的是代码:
//    ① 这一层**永远不产出见客文字** —— 它的 text 我们直接丢掉,只取工具调用
//    ② 它给出的 NOC / 省码一律过校验(五位数字 / 九省表),编的过不了
//    ③ 事实一条都不由它产生 —— 它只补槽位,facts 仍旧由 collectFacts 从工具层取

export const RESOLVE_SYSTEM = `You turn a Canadian-immigration question into lookup slots. You do NOT answer the user.

Your only job: figure out which occupation (5-digit NOC code) the user is talking about, and which provinces.

Rules:
- Use search_occupations to look up candidate NOC codes by job title or field of study. Never invent a NOC code.
- Call set_slots exactly once when you are confident, with the NOC you picked from search results.
- If the question does not depend on an occupation (federal permit/CRS/scoring questions, or a question about how this site works), call set_slots with noc = null and say why in "reason".
- If you cannot find a plausible occupation, call give_up. Do not guess.
- Never write an answer for the user. Text you write is discarded.`

/** 工具执行完之后,回给模型的一句话(它只需要知道候选长什么样)。 */
export const SEARCH_RESULT_HINT =
  'Pick the single best NOC from these candidates and call set_slots. If none fits, call give_up.'

// 公司简介「查不到」回答的拒收判据(lib/employers BRIEF_REFUSAL_RE;2026-11-06 Frank 截图 Private Home 的主营业务是
// 「The provided search results do not contain information…」)。
// 来由:联网现查时模型没回 NOT_FOUND,在 [WHAT] 节写一句「给的材料里查不到」,被当简介存库显示。
// 性质:① 生产库里抽出的「查不到」句式全认(含 [WHAT] 后带冒号、带 Based on… 前缀、弯引号缩写);
// ② 正经简介一律不认 —— 包括开头撞上 The information / No / There 这些词的真公司;③ 只认 [WHAT] 节开头,别的节里提到 search results 不算。
import { describe, expect, it } from 'vitest'

// 测试例外:纯常量直接点文件(桶只走门的规矩不管测试)
import { BRIEF_REFUSAL_RE } from '@/lib/employers/constants'

const HITS = [
  '[WHAT] The provided search results do not contain information about a specific company named "Private Home"; they reference general directories.',
  '[WHAT] The provided search results do not identify a specific company named "Harpreet Sarao"; instead, they indicate an individual.',
  '[WHAT] The provided search result does not contain information about a company named "Na\'omi Canart".',
  '[WHAT]: The provided search results do not specify what Groupe Orygamy Canada Inc. sells.',
  '[WHAT] The provided text only lists the names "Adrian Van Kempen" and "Bernard Vankempen".',
  '[WHAT] The provided input refers to an individual, Camila Cabuhayan, located in Canada.',
  '[WHAT] The provided information is insufficient to determine what the company does.',
  '[WHAT] The search results identify multiple distinct entities with "Choy" in their names.',
  '[WHAT] There is no publicly available information indicating that "Tyler Antypowich" operates a company.',
  '[WHAT] There is insufficient information in the provided search results.',
  '[WHAT] No information found regarding the business activities or products of Joan Jacildo in Canada.',
  '[WHAT] No specific company is identified in the provided text.',
  '[WHAT] No company or business entity is associated with the name "S".',
  '[WHAT] I cannot determine what CSSSPNQL does as there is no available information.',
  '[WHAT] I couldn’t find information on a company named "Kahleigh\'s Brew Barn".',
  '[WHAT] I could not find information on a company named "Kahleigh\'s Brew Barn" in the provided search results.',
  '[WHAT] Based on the provided search results, there is no specific company named "MIN ZHE YIN" listed.',
]

const MISSES = [
  '[WHAT] Saskatchewan Cancer Agency provides leadership in health promotion, early detection, and research for cancer.',
  '[WHAT] The Canadian Brewhouse operates a chain of sports bars and restaurants.',
  '[WHAT] The information technology firm builds custom software for municipalities.',
  '[WHAT] No Limits Underground Ltd. is an underground utilities contractor.',
  '[WHAT] No Limit Landscaping specializes in custom landscape design.',
  '[WHAT] Information Network Systems Inc provides office printing solutions.',
  '[WHAT] I Live to Paint is a Canadian company that sells paint-by-number kits.',
  '[WHAT] The Search Group is a recruitment firm for insurance brokers.',
  '[WHAT] There Studio designs furniture.',
  '[WHAT] Bakery chain.\n[NOTE] The provided search results do not mention its parent company.',
]

describe('BRIEF_REFUSAL_RE:[WHAT] 节写「查不到」的回答', function suite() {
  it.each(HITS)('认:%s', function hit(brief) {
    expect(BRIEF_REFUSAL_RE.test(brief)).toBe(true)
  })

  it.each(MISSES)('不认:%s', function miss(brief) {
    expect(BRIEF_REFUSAL_RE.test(brief)).toBe(false)
  })

  it('变异探针:去掉 [WHAT] 标记,同一句不再认(判据只看 [WHAT] 节开头)', function probe() {
    for (const brief of HITS) {
      expect(BRIEF_REFUSAL_RE.test(brief.replace('[WHAT]', '[NOTE]'))).toBe(false)
    }
  })
})

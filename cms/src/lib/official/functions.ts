/**
 * 官方资料域的行为:官方原句 → 界面译名。
 *
 * @author Frank
 * @time 2026-08-22 22:00:00
 */

import { queryRowsOrEmpty, SQL, text } from '../db'
import { LABEL_MISS, officialLabels, OR_TAIL_DROP, OR_TAIL_RE, RULES_PROVINCE_FED } from './constants'
import type {
  LangCode, LoadRuleGroupsIn, OfficialLabelIn, RuleDbRow, RuleGroup, RuleGroupSeed, RuleGroupsOut, RuleRow,
} from './types'

/**
 * 连库现查全部官方门槛行,按通道(联邦段)/ 省(省段)分组(2026-09-06 Frank「放到资料库吗」:
 * pnp_requirements 早已一行一条带原句与 URL,只差一个人能看的地方)。
 *
 * @param x 连接。
 * @returns 分组清单,联邦通道在前(按库内序),省在后。
 */
export async function loadRuleGroups(x: LoadRuleGroupsIn): RuleGroupsOut {
  const rows = await queryRowsOrEmpty({ db: x.db, sql: SQL.PNP_REQUIREMENTS_ALL, params: [], map: toRuleGroupSeed })
  const groups = new Map<string, RuleGroup>()
  for (const r of rows) {
    const g = groups.get(r.key)
    if (g == null) {
      groups.set(r.key, { key: r.key, province: r.province, program: r.program, rows: [r.row] })
    } else {
      g.rows.push(r.row)
    }
  }
  return Array.from(groups.values())
}

/**
 * 一条库行 → 组键 + 对外行(值级清洗只在这里做)。
 *
 * @param r 库行。
 * @returns 组键、省、通道与洗净的行。
 */
function toRuleGroupSeed(r: RuleDbRow): RuleGroupSeed {
  const province = text(r.province)
  const program = text(r.program)
  const row: RuleRow = { stream: text(r.stream), label: text(r.label), quote: text(r.value_text), url: text(r.url) }
  if (province === RULES_PROVINCE_FED) {
    return { key: program, province, program, row }
  }
  return { key: province, province, program, row }
}

/**
 * 官方原句 → 界面语言的译名(表里没有原样返回官方原文)。体内 `as LangCode` 是跨边界收窄:
 * 调用端拿到的 `t.lang` 是宽字符串,不认识的语言在查表落空后回落原文。
 * 尾部悬空的 ", or" 摘掉 —— 官方原文里那个 or 是表格排版留下的(下一行接着念),
 * 单拎出来放进选项就是个悬空的 or(英文界面实拍);二选一改由 UI 表达。
 *
 * @param input 官方原句与界面语言。
 * @returns 译名(或官方原文)。
 */
export function officialLabel(input: OfficialLabelIn): string {
  const row = officialLabels[input.raw]
  let hit = LABEL_MISS
  if (row != null) {
    const v = row[input.lang as LangCode]
    if (v != null) {
      hit = v
    }
  }
  if (hit === '') {
    hit = input.raw
  }
  return hit.replace(OR_TAIL_RE, OR_TAIL_DROP)
}

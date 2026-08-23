/**
 * 给模型看的字:匹配理由的英文事实行(喂 advisor 的 grounding,与 UI 三语同源同数字)、
 * 分型 → 路径语境。用户永远看不到这些,不进 i18n。
 *
 * @author Frank
 * @time 2026-08-22 00:05:00
 */

/**
 * 理由键 → 英文事实行模板(槽位名 = MatchReason.params 的键;填充在 functions.reasonEn 走
 * `lib/template` 的 fill —— prompts 只装字,不装函数;措辞红线:只陈述可核验事实)。
 */
export const REASON_EN: Record<string, string> = {
  /**
   * 岗位未分类。
   */
  'match.r.noc.jobUncat': 'Job has no NOC classification; profile match not applicable.',

  /**
   * 档案没填职业码。
   */
  'match.r.noc.noProfile': 'User has not listed their NOC codes.',

  /**
   * 精确命中。
   */
  'match.r.noc.exact': "User's own NOC {noc} matches this job's NOC exactly.",

  /**
   * 同小类。
   */
  'match.r.noc.minor': "User's NOC {yours} is in the same minor group as this job's NOC {noc}.",

  /**
   * 同族。
   */
  'match.r.noc.submajor': "User's NOC {yours} is in the same occupational sub-major group as this job's NOC {noc} (same field, different specialty).",

  /**
   * 全不沾边。
   */
  'match.r.noc.none': "Job NOC {noc} does not match user's NOC ({yours}).",

  /**
   * 魁省自有体系。
   */
  'match.r.prov.qc': 'Quebec runs its own selection system (not PNP).',

  /**
   * 不在目标省(只提示不扣分)。
   */
  'match.r.prov.notTarget': "Job is in {prov}, outside user's target provinces ({targets}).",

  /**
   * 具名清单命中。
   */
  'match.r.prov.named': "Job NOC {noc} is on {prov}'s published list \"{label}\".",

  /**
   * 排除清单命中。
   */
  'match.r.prov.excluded': "Job NOC {noc} is on {prov}'s exclusion list \"{label}\".",

  /**
   * TEER 0-3 通用粗筛。
   */
  'match.r.prov.generic': 'Meets the generic TEER 0-3 screen for {prov} (no named list hit).',

  /**
   * 不满足省粗筛。
   */
  'match.r.prov.none': 'Does not meet the provincial screen for {prov}.',

  /**
   * 不在任何 EE 类别清单。
   */
  'match.r.ee.none': 'Job NOC is not on any federal EE category-based selection list.',

  /**
   * 类别无抽选记录。
   */
  'match.r.ee.noDraw': 'EE category "{cat}" has no recorded draw data.',

  /**
   * 用户没报 CRS。
   */
  'match.r.ee.noCrs': 'Job is in EE category "{cat}" (last draw CRS {draw}, {date}); user has not reported a CRS score.',

  /**
   * CRS 高于分数线。
   */
  'match.r.ee.above': "User's self-reported CRS {crs} is {diff} above the last \"{cat}\" draw cutoff {draw} ({date}).",

  /**
   * CRS 低于分数线。
   */
  'match.r.ee.below': "User's self-reported CRS {crs} is {gap} below the last \"{cat}\" draw cutoff {draw} ({date}).",

  /**
   * TEER 达标。
   */
  'match.r.teer.ok': 'TEER {teer} passes the generic skilled-worker screen.',

  /**
   * 低 TEER 但命中具名通道。
   */
  'match.r.teer.channel': 'TEER {teer} but hits named low-TEER stream "{stream}".',

  /**
   * 低 TEER 无通道。
   */
  'match.r.teer.low': 'TEER {teer} with no named low-TEER stream.',

  /**
   * 高于中位。
   */
  'match.r.wage.above': 'Offered salary is {pct}% above the local NOC median.',

  /**
   * 略低于中位。
   */
  'match.r.wage.near': 'Offered salary is {pct}% below the local NOC median (within 20%).',

  /**
   * 明显低于中位(省提名工资要求风险)。
   */
  'match.r.wage.below': 'Offered salary is {pct}% below the local NOC median — verify the offer meets provincial wage requirements.',

  /**
   * 无可比数据。
   */
  'match.r.wage.na': 'No salary/median data to compare.',

  /**
   * 有获批记录(股别未拆)。
   */
  'match.r.lmia.has': 'Employer had {n} positions on approved positive LMIAs in the past two years (latest: {q}, ESDC open data) — a historical fact, not an indication they can or will sponsor now.',

  /**
   * 技能股获批。
   */
  'match.r.lmia.skilled': 'Employer had {n} skilled-stream (High Wage/Global Talent) positions on approved LMIAs in the past two years ({total} across all streams, latest {q}, ESDC open data) — a historical fact, not a sponsorship promise.',

  /**
   * 纯农业/低薪股(不加分,中性提示)。
   */
  'match.r.lmia.lowOnly': "Employer's {n} approved LMIA positions (latest {q}) are all in Primary Agriculture / Low Wage streams — mostly seasonal hiring, weak evidence for skilled-stream sponsorship; no points added.",

  /**
   * 无记录(许多雇主从不需要 LMIA,不是负面证据)。
   */
  'match.r.lmia.na': 'No positive-LMIA record for this employer in the past two years (many employers never needed one; not negative evidence).',
}

/**
 * 分型 → 英文路径语境(E11-04:让顾问按读者真实处境措辞;只陈述该分型的主路径事实,
 * 不预测成功率、不断言个人资格 —— 与 match reason 的措辞红线一致)。
 */
export const STATUS_EN: Record<string, string> = {
  /**
   * 海外申请。
   */
  overseas: 'still outside Canada, applying from abroad — main path is federal Express Entry / FSW selected by CRS (no Canadian job offer required), plus overseas-friendly PNP streams',

  /**
   * 在读。
   */
  studying: 'currently studying in Canada — main path is graduate → PGWP → Canadian work experience → CEC / provincial nominee',

  /**
   * 持工签在职。
   */
  working: 'working in Canada on a work permit — main path is accumulate Canadian experience → CEC / provincial nominee',

  /**
   * 毕业求职中。
   */
  jobhunting: 'in Canada as a graduate / PGWP holder looking for work — main path is landing a PNP-track job → provincial nominee',

  /**
   * 已 PR / 不需要移民。
   */
  pr: 'already a permanent resident or does not need immigration — goal is simply finding a good job; de-emphasize immigration angles',
}

/**
 * JD 五节整理的提示头（J2）。红线：只搬运不发挥 —— 输出里的多位数字必须在
 * 原文出现（校验在 functions.validateJdFormatted）；五节标记的口径主人就是这段字，
 * llm 域的 JD_MARKS_RE 是它的解析侧镜像。
 */
export const JD_FORMAT_PROMPT_HEAD = `You are reorganizing a job posting into fixed sections. STRICT RULES:
- Only move and lightly condense sentences from the posting. NEVER invent facts, numbers, requirements or benefits not present in it.
- Output plain text with EXACTLY these section markers, each on its own line: [ROLE] [REQS] [PAY] [WORKHOURS] [APPLY]
- Under [ROLE]: 1-2 sentences, what the job does. Under [REQS]: bullet lines starting with "- ", hard requirements only.
- Under [PAY]: bullet lines for pay and benefits. Under [WORKHOURS]: bullet lines for schedule, employment type, location type.
- Under [APPLY]: 1 line how to apply. If the posting says nothing for a section, write exactly: (not stated)
- Keep the posting's original language. No markdown besides "- " bullets. No section other than the five.
- Finally, on two extra lines output: [TERM]=permanent|term|casual|seasonal|unknown and [HRS]=full|part|unknown (from the posting).
Posting follows:
`

/**
 * 给模型看的字:匹配理由的英文事实行(喂 advisor 的 grounding,与 UI 三语同源同数字)、
 * 分型 → 路径语境。用户永远看不到这些,不进 i18n。
 *
 * @author Frank
 * @time 2026-08-22 00:05:00
 */

/**
 * 理由键 → 英文事实行(与 MatchReason 同一 params;措辞红线:只陈述可核验事实)。
 */
export const REASON_EN: Record<string, (p: Record<string, string | number>) => string> = {
  /**
   * 岗位未分类。
   */
  'match.r.noc.jobUncat': function jobUncat() {
    return 'Job has no NOC classification; profile match not applicable.'
  },

  /**
   * 档案没填职业码。
   */
  'match.r.noc.noProfile': function noProfile() {
    return 'User has not listed their NOC codes.'
  },

  /**
   * 精确命中。
   */
  'match.r.noc.exact': function exact(p) {
    return `User's own NOC ${p.noc} matches this job's NOC exactly.`
  },

  /**
   * 同小类。
   */
  'match.r.noc.minor': function minor(p) {
    return `User's NOC ${p.yours} is in the same minor group as this job's NOC ${p.noc}.`
  },

  /**
   * 同族。
   */
  'match.r.noc.submajor': function submajor(p) {
    return `User's NOC ${p.yours} is in the same occupational sub-major group as this job's NOC ${p.noc} (same field, different specialty).`
  },

  /**
   * 全不沾边。
   */
  'match.r.noc.none': function none(p) {
    return `Job NOC ${p.noc} does not match user's NOC (${p.yours}).`
  },

  /**
   * 魁省自有体系。
   */
  'match.r.prov.qc': function qc() {
    return 'Quebec runs its own selection system (not PNP).'
  },

  /**
   * 不在目标省(只提示不扣分)。
   */
  'match.r.prov.notTarget': function notTarget(p) {
    return `Job is in ${p.prov}, outside user's target provinces (${p.targets}).`
  },

  /**
   * 具名清单命中。
   */
  'match.r.prov.named': function named(p) {
    return `Job NOC ${p.noc} is on ${p.prov}'s published list "${p.label}".`
  },

  /**
   * 排除清单命中。
   */
  'match.r.prov.excluded': function excluded(p) {
    return `Job NOC ${p.noc} is on ${p.prov}'s exclusion list "${p.label}".`
  },

  /**
   * TEER 0-3 通用粗筛。
   */
  'match.r.prov.generic': function generic(p) {
    return `Meets the generic TEER 0-3 screen for ${p.prov} (no named list hit).`
  },

  /**
   * 不满足省粗筛。
   */
  'match.r.prov.none': function provNone(p) {
    return `Does not meet the provincial screen for ${p.prov}.`
  },

  /**
   * 不在任何 EE 类别清单。
   */
  'match.r.ee.none': function eeNone() {
    return 'Job NOC is not on any federal EE category-based selection list.'
  },

  /**
   * 类别无抽选记录。
   */
  'match.r.ee.noDraw': function noDraw(p) {
    return `EE category "${p.cat}" has no recorded draw data.`
  },

  /**
   * 用户没报 CRS。
   */
  'match.r.ee.noCrs': function noCrs(p) {
    return `Job is in EE category "${p.cat}" (last draw CRS ${p.draw}, ${p.date}); user has not reported a CRS score.`
  },

  /**
   * CRS 高于分数线。
   */
  'match.r.ee.above': function above(p) {
    return `User's self-reported CRS ${p.crs} is ${p.diff} above the last "${p.cat}" draw cutoff ${p.draw} (${p.date}).`
  },

  /**
   * CRS 低于分数线。
   */
  'match.r.ee.below': function below(p) {
    return `User's self-reported CRS ${p.crs} is ${p.gap} below the last "${p.cat}" draw cutoff ${p.draw} (${p.date}).`
  },

  /**
   * TEER 达标。
   */
  'match.r.teer.ok': function teerOk(p) {
    return `TEER ${p.teer} passes the generic skilled-worker screen.`
  },

  /**
   * 低 TEER 但命中具名通道。
   */
  'match.r.teer.channel': function teerChannel(p) {
    return `TEER ${p.teer} but hits named low-TEER stream "${p.stream}".`
  },

  /**
   * 低 TEER 无通道。
   */
  'match.r.teer.low': function teerLow(p) {
    return `TEER ${p.teer} with no named low-TEER stream.`
  },

  /**
   * 高于中位。
   */
  'match.r.wage.above': function wageAbove(p) {
    return `Offered salary is ${p.pct}% above the local NOC median.`
  },

  /**
   * 略低于中位。
   */
  'match.r.wage.near': function wageNear(p) {
    return `Offered salary is ${p.pct}% below the local NOC median (within 20%).`
  },

  /**
   * 明显低于中位(省提名工资要求风险)。
   */
  'match.r.wage.below': function wageBelow(p) {
    return `Offered salary is ${p.pct}% below the local NOC median — verify the offer meets provincial wage requirements.`
  },

  /**
   * 无可比数据。
   */
  'match.r.wage.na': function wageNa() {
    return 'No salary/median data to compare.'
  },

  /**
   * 有获批记录(股别未拆)。
   */
  'match.r.lmia.has': function lmiaHas(p) {
    return `Employer had ${p.n} positions on approved positive LMIAs in the past two years (latest: ${p.q}, ESDC open data) — a historical fact, not an indication they can or will sponsor now.`
  },

  /**
   * 技能股获批。
   */
  'match.r.lmia.skilled': function lmiaSkilled(p) {
    return `Employer had ${p.n} skilled-stream (High Wage/Global Talent) positions on approved LMIAs in the past two years (${p.total} across all streams, latest ${p.q}, ESDC open data) — a historical fact, not a sponsorship promise.`
  },

  /**
   * 纯农业/低薪股(不加分,中性提示)。
   */
  'match.r.lmia.lowOnly': function lmiaLowOnly(p) {
    return `Employer's ${p.n} approved LMIA positions (latest ${p.q}) are all in Primary Agriculture / Low Wage streams — mostly seasonal hiring, weak evidence for skilled-stream sponsorship; no points added.`
  },

  /**
   * 无记录(许多雇主从不需要 LMIA,不是负面证据)。
   */
  'match.r.lmia.na': function lmiaNa() {
    return 'No positive-LMIA record for this employer in the past two years (many employers never needed one; not negative evidence).'
  },
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
 * 规则 6 的依据链(ESDC 公开数据集;fetched 空 —— 这是数据集页不是快照)。
 */
export const LMIA_SOURCE = {
  /**
   * 依据名。
   */
  label: 'ESDC TFWP positive LMIA employers',

  /**
   * 数据集页。
   */
  url: 'https://open.canada.ca/data/en/dataset/90fed587-1364-4f33-a9ee-208181dc0b97',

  /**
   * 无快照时刻。
   */
  fetched: '',
} as const

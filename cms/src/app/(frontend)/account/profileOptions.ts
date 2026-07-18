// 大白话点选选项 → 结构化值(E11-05 ①,§3.4 术语翻译)。零打字翻译表单一来源:ProfileForm 用,wizard(E11-05b)复用。
// 标签只给 i18n 键(三语在 jobs/i18n.ts),此处定 value 与「值→选中哪档」的归属函数。
// 数据完整性红线:CRS 各档存「区间下界」——保守,永不把区间上界当精确分喂给 match「差 N 分」,杜绝假「高于分数线」。

export type Opt = { key: string; value: number | null }

// 热门职业(§3.4:热门 chips 一点即选,只显示职位名藏码)。NOC 2021 官方码,已对照 data/mart/noc_descriptions.json 逐条核。
export const POPULAR_NOCS: { noc: string; key: string }[] = [
  { noc: '21232', key: 'prof.job.software' },   // Software developers and programmers
  { noc: '11100', key: 'prof.job.accountant' }, // Financial auditors and accountants
  { noc: '31301', key: 'prof.job.nurse' },      // Registered nurses
  { noc: '33102', key: 'prof.job.psw' },        // Nurse aides, orderlies and patient service associates (PSW)
  { noc: '63200', key: 'prof.job.cook' },       // Cooks
  { noc: '73300', key: 'prof.job.truck' },      // Transport truck drivers
  { noc: '72200', key: 'prof.job.electrician' },// Electricians
  { noc: '72106', key: 'prof.job.welder' },     // Welders and related machine operators
  { noc: '42202', key: 'prof.job.ece' },        // Early childhood educators and assistants
  { noc: '64100', key: 'prof.job.retail' },     // Retail salespersons
  { noc: '75101', key: 'prof.job.warehouse' },  // Material handlers
  { noc: '65200', key: 'prof.job.server' },     // Food and beverage servers
  { noc: '13110', key: 'prof.job.admin' },      // Administrative assistants
  { noc: '65100', key: 'prof.job.cashier' },    // Cashiers
]

// 英语水平(§3.4:初级/中级/流利/考过高分 → CLB 档)。match v1 不用 CLB 评分(仅存 + advisor 可见),精度低风险。
export const CLB_OPTS: Opt[] = [
  { key: 'prof.clbOpt.basic', value: 4 },
  { key: 'prof.clbOpt.mid', value: 6 },
  { key: 'prof.clbOpt.fluent', value: 8 },
  { key: 'prof.clbOpt.high', value: 9 },
]
// 存值 → 高亮哪档(区间归属)
export const clbActive = (v: number | null | undefined): number | null =>
  v == null ? null : v <= 5 ? 4 : v <= 7 ? 6 : v === 8 ? 8 : 9

// EE 分区间(§3.4:算过→区间下拉,不敲具体数)。存下界(<400 存 399:低于任何类别抽选线,永不造成假「高于」)。
export const CRS_OPTS: Opt[] = [
  { key: 'prof.crsOpt.lt400', value: 399 },
  { key: 'prof.crsOpt.r400', value: 400 },
  { key: 'prof.crsOpt.r450', value: 450 },
  { key: 'prof.crsOpt.r500', value: 500 },
]
export const crsActive = (v: number | null | undefined): number | null =>
  v == null ? null : v < 400 ? 399 : v < 450 ? 400 : v < 500 ? 450 : 500

// 工签剩余(§3.4:区间单选)。match v1 不用 PGWP(prof.pgwpNote 已诚实标注),低风险。
export const PGWP_OPTS: Opt[] = [
  { key: 'prof.pgwpOpt.lt6', value: 3 },
  { key: 'prof.pgwpOpt.6to12', value: 9 },
  { key: 'prof.pgwpOpt.1to2', value: 18 },
  { key: 'prof.pgwpOpt.unsure', value: null },
]
export const pgwpActive = (v: number | null | undefined): number | null =>
  v == null ? null : v < 6 ? 3 : v <= 12 ? 9 : 18

// 移民路径引擎(E12-01,北极星 P1)。规则只住这一处:/pathways 方案卡、未来顾问联动(E12-05)都消费它的输出。
// 纯函数、无 IO、前后端同构:路径评估 = 配方(pathwayRecipes)× 用户档案 × 现有维度(pnp_occupations/ee_categories)。
// 红线(规划 §1):摆信息不下结论——signal/gap 只陈述「你的 NOC 在 X 省公开清单上(出处)」「该步骤见官方页」,
// 永不「你应该/你就能拿 PR」;政策数值不硬编(CLB 门槛/名额 v1 不写,指官方页);故意不做匹配度打分(伪权威)。
import type { CurrentStatus, MatchDims, MatchProfile } from './match'
import { PATHWAY_RECIPES, type PathwayRecipe } from './pathwayRecipes'

export type PathwaySignal = {
  verdict: 'pass' | 'warn' | 'na'
  key: string                                   // i18n 键(pw.sig.*)
  params: Record<string, string | number>
  source?: { label: string; url: string; fetched: string }   // 维度行自带出处(逐行 url+fetched)
}
export type PathwayGap = {
  key: string                                   // i18n 键(pw.gap.*)——缺口连补法一句话(§7.1:只指官方/站内)
  url?: string                                  // 官方页或站内深链
}
export type PathwayEval = {
  recipe: PathwayRecipe
  forYou: boolean | null                        // 分型 ∈ audience;未设分型 = null(平铺不分组)
  signals: PathwaySignal[]
  gaps: PathwayGap[]
}

// 受监管护士职业(NNAS+省注册红线只对这组断言;护理员 33102/44101 非同一注册体系,不硬套)
const REGULATED_NURSE = new Set(['31301', '32101'])
const SIG_CAP = 5   // 每卡清单命中上限,多 NOC 档案防刷屏

export function evalPathways(profile: MatchProfile, dims: MatchDims): PathwayEval[] {
  const hasAny = profile.nocCodes.length > 0 || profile.targetProvinces.length > 0 || profile.crs != null
  const evals = PATHWAY_RECIPES.map((recipe) => {
    const forYou = profile.currentStatus == null ? null : recipe.audience.includes(profile.currentStatus)
    const signals: PathwaySignal[] = []
    const gaps: PathwayGap[] = []

    // 未建档:不出信号,单一缺口=建档(匿名/空档案同态)
    if (!hasAny) {
      gaps.push({ key: 'pw.gap.build', url: '/account?sec=profile' })
      return { recipe, forYou, signals, gaps }
    }

    // 分支职业归属(nocPrefixes 限定的配方):用户自报 NOC 是否属于该分支
    const branchNocs = recipe.nocPrefixes
      ? profile.nocCodes.filter((n) => recipe.nocPrefixes!.some((p) => n.startsWith(p)))
      : profile.nocCodes
    if (recipe.nocPrefixes && profile.nocCodes.length > 0) {
      if (branchNocs.length > 0) signals.push({ verdict: 'pass', key: 'pw.sig.branchNoc', params: { noc: branchNocs.join(' / ') } })
      else signals.push({ verdict: 'na', key: 'pw.sig.branchOther', params: {} })
    }

    // 省清单命中(与 match.ts 规则 2 同口径同出处):分支 NOC × 全部省(不设目标省也把机会摆出来)
    let named = 0
    for (const noc of branchNocs) {
      for (const r of dims.pnpOccupations) {
        if (r.noc !== noc || named >= SIG_CAP) continue
        if (r.type === 'ineligible') {
          signals.push({ verdict: 'warn', key: 'pw.sig.excluded', params: { noc, prov: r.province, label: r.label }, source: { label: r.label, url: r.url, fetched: r.fetched } })
        } else {
          named++
          signals.push({ verdict: 'pass', key: 'pw.sig.named', params: { noc, prov: r.province, label: r.label }, source: { label: r.label, url: r.url, fetched: r.fetched } })
        }
      }
    }
    if (branchNocs.length > 0 && named === 0) signals.push({ verdict: 'na', key: 'pw.sig.noneNamed', params: {} })

    // 联邦 EE 类别(只挂主线卡,免四卡重复;与 match.ts 规则 3 同口径)
    if (recipe.id === 'direct') {
      let ee = 0
      for (const noc of branchNocs) {
        const row = dims.eeCategories.find((r) => r.noc === noc && r.drawCrs != null)
        if (!row || ee >= 2) continue
        ee++
        const date = (row.drawDate || '').slice(0, 10)
        if (profile.crs == null) {
          signals.push({ verdict: 'warn', key: 'pw.sig.ee', params: { noc, cat: row.label, draw: row.drawCrs!, date }, source: { label: row.label, url: row.url, fetched: row.fetched } })
        } else if (profile.crs >= row.drawCrs!) {
          signals.push({ verdict: 'pass', key: 'pw.sig.eeAbove', params: { noc, cat: row.label, crs: profile.crs, draw: row.drawCrs!, date, diff: profile.crs - row.drawCrs! }, source: { label: row.label, url: row.url, fetched: row.fetched } })
        } else {
          signals.push({ verdict: 'warn', key: 'pw.sig.eeBelow', params: { noc, cat: row.label, crs: profile.crs, draw: row.drawCrs!, date, gap: row.drawCrs! - profile.crs }, source: { label: row.label, url: row.url, fetched: row.fetched } })
        }
      }
    }

    // 缺口→补法(§7.1:每条=缺什么+官方/站内怎么补,一句话一链)
    if (profile.nocCodes.length === 0) gaps.push({ key: 'pw.gap.noNoc', url: '/account?sec=profile' })
    if (profile.targetProvinces.length === 0) gaps.push({ key: 'pw.gap.noProv', url: '/account?sec=profile' })
    if (profile.currentStatus === 'overseas') gaps.push({ key: 'pw.gap.offerFirst', url: '/' })
    if (profile.clb == null) gaps.push({ key: 'pw.gap.lang', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-requirements.html' })
    if (recipe.id === 'health' && profile.nocCodes.some((n) => REGULATED_NURSE.has(n))) {
      gaps.push({ key: 'pw.gap.nnas', url: 'https://www.nnas.ca/' })
    }
    if (recipe.id === 'trades' && branchNocs.length > 0) {
      gaps.push({ key: 'pw.gap.cert', url: 'https://www.canada.ca/en/services/jobs/training/support-skilled-trades-apprentices.html' })
    }

    return { recipe, forYou, signals, gaps }
  })

  // 排序:与处境相关在前(forYou true → null → false),同组保配方原序
  return evals.sort((a, b) => Number(b.forYou === true) - Number(a.forYou === true))
}

export type { PathwayRecipe, CurrentStatus }

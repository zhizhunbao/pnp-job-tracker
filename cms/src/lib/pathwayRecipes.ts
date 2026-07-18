// 旗舰①配方数据(E12-01):直接就业→雇主担保→PNP 主线 + 低门槛职业分支(护工/医护/trades)。
// 结构化「政策配方」(规划 §4),照 plan.ts 常量单一来源先例住 lib(编辑=改码;E12-04 再考虑数据化+抓取核验)。
// 红线:政策数值不硬编(CLB/名额一概不写,步骤指官方页);sources 全部 2026-07-18 httpx 实测 200(celpip/red-seal.ca
// 不可达已弃用,换 canada.ca 官方页);NOC 码逐条对照 data/mart/noc_descriptions.json 核验;lastReviewed=人工核对日。
import type { CurrentStatus } from './match'

export type PathwaySource = { label: string; url: string }
export type PathwayStep = { key: string; sourceIdx?: number }   // key=i18n(pw.<id>.s*);sourceIdx 指向本配方 sources
export type PathwayRecipe = {
  id: 'direct' | 'hcw' | 'health' | 'trades'
  audience: CurrentStatus[]        // 分型 §2.5(E 已 PR 纯找工不硬塞移民路径)
  nocPrefixes: string[] | null     // 职业分支限定(前缀);null=不限职业
  steps: PathwayStep[]
  sources: PathwaySource[]         // 官方页,实测可达
  lastReviewed: string             // 人工核对 YYYY-MM-DD
}

// 共享官方源(全部 2026-07-18 实测 200)
const SRC = {
  pnp: { label: 'IRCC — Provincial Nominee Program', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html' },
  work: { label: 'IRCC — Work in Canada', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html' },
  ee: { label: 'IRCC — Express Entry', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html' },
  hcwp: { label: 'IRCC — Home Care Worker Immigration pilots', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/caregivers/home-care-worker-immigration-pilots.html' },
  nnas: { label: 'NNAS — National Nursing Assessment Service', url: 'https://www.nnas.ca/' },
  trades: { label: 'Canada.ca — Skilled trades and apprenticeship', url: 'https://www.canada.ca/en/services/jobs/training/support-skilled-trades-apprentices.html' },
} satisfies Record<string, PathwaySource>

const REVIEWED = '2026-07-18'
// 受众:A 海外直申 / C 工签在职(换更好担保岗)/ D 在加找工作;B 留学生的正餐是旗舰②(E12-03),E 已 PR 不硬塞
const AUD: CurrentStatus[] = ['overseas', 'working', 'jobhunting']

export const PATHWAY_RECIPES: PathwayRecipe[] = [
  {
    // 主线:不留学·雇主担保→省提名(项目原始核心,零新数据——职位板 pnpEligible/LMIA/AIP 信号全在库)
    id: 'direct', audience: AUD, nocPrefixes: null,
    steps: [
      { key: 'pw.direct.s1' },                    // 筛担保信号岗(直发/LMIA 记录/AIP 指定雇主/命中省清单)= 本站职位板
      { key: 'pw.direct.s2', sourceIdx: 1 },      // 拿全职 offer → 工签(海外)/攒加拿大经验(在加)
      { key: 'pw.direct.s3', sourceIdx: 0 },      // 按目标省提名通道递省提名(职业命中省公开清单是关键信号)
      { key: 'pw.direct.s4', sourceIdx: 0 },      // 省提名后递 PR;联邦 EE 类别是独立的平行信号
    ],
    sources: [SRC.pnp, SRC.work, SRC.ee], lastReviewed: REVIEWED,
  },
  {
    // 护工:家庭护理类试点(语言/学历门槛相对低——具体门槛不写死,以官方页为准)
    id: 'hcw', audience: AUD, nocPrefixes: ['44100', '44101'],   // Home child care providers / Home support workers(已核)
    steps: [
      { key: 'pw.hcw.s1' },                       // 确认职业属家庭护理类(NOC 44100/44101)
      { key: 'pw.hcw.s2', sourceIdx: 0 },         // 对照 Home Care Worker 试点要求(语言/学历门槛见官方页)
      { key: 'pw.hcw.s3' },                       // 拿家庭护理类全职 offer(本站可筛)
      { key: 'pw.hcw.s4', sourceIdx: 0 },         // 按试点递交(开放状态/名额以官方页为准)
    ],
    sources: [SRC.hcwp], lastReviewed: REVIEWED,
  },
  {
    // 医护:多省紧缺专属通道(本站已有 SK 医疗/NS 紧缺清单数据);受监管职业认证红线显式进步骤
    id: 'health', audience: AUD, nocPrefixes: ['31', '32', '33'],   // NOC 3 大类 health(31 专业/32 技术/33 辅助)
    steps: [
      { key: 'pw.health.s1', sourceIdx: 0 },      // 受监管职业先做资格认证:护士=NNAS 评估+省护士协会注册(境外证不能直接执业)
      { key: 'pw.health.s2' },                    // 语言考试(各通道要求不同,见官方页)
      { key: 'pw.health.s3' },                    // 筛医护紧缺通道命中岗(本站清单信号)
      { key: 'pw.health.s4', sourceIdx: 1 },      // offer → 省提名 → PR
    ],
    sources: [SRC.nnas, SRC.pnp], lastReviewed: REVIEWED,
  },
  {
    // trades 技工:省学徒/认证体系(Red Seal 跨省标准),多省紧缺清单常年含 trades
    id: 'trades', audience: AUD, nocPrefixes: ['72', '73'],   // NOC 7 大类 trades 主段(72 工业电气建筑/73 维护设备操作)
    steps: [
      { key: 'pw.trades.s1', sourceIdx: 0 },      // 技工认证:省学徒/认证体系(Red Seal 跨省标准),要求见官方页
      { key: 'pw.trades.s2' },                    // 筛 trades 岗(命中省清单/EE trades 类别信号)
      { key: 'pw.trades.s3', sourceIdx: 1 },      // offer → 工签 → 省提名 → PR
    ],
    sources: [SRC.trades, SRC.pnp], lastReviewed: REVIEWED,
  },
]

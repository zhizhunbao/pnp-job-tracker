// 职位域的桶 —— **客户端也安全的那半**:匹配规则、来源标签、全部形状。
//
// 为什么单独存在:职位是这个站的主干,匹配/来源/形状先前平铺在 lib/ 顶层,
// 一个调用点常要写三四行 import(`api/advisor` 写了 4 行)。收成一个模块之后外部只认这一个入口。
//
// 🔴 **取数那半在 `./server`**,不在这儿(2026-08-18 实撞):`queries` / `dims` / `jd` 的依赖链上
//    挂着 `payload` 与 `@/payload.config`,而 `Table.tsx` / `Pnp.tsx` 这些 `'use client'` 组件只要
//    `match` 与 `source`。混在一个桶里,打包器会把连接池、集合配置整条链拉进**浏览器**包,
//    一屏 `Can't resolve 'fs/promises' / 'net' / 'tls'`,页面直接渲不出来 —— 而 tsc 全绿,build 才炸。
//    分界不是风格,是**运行环境**:能在浏览器跑的进这里,要连库的进 `./server`。
//
// 🔴 外部一律从这两个门取(eslint 边界闸盯着);模块内部文件之间走相对路径,**不从桶取**
//    —— 桶反过来引成员、成员再引桶,那是环(`lib/quiz` 立的规矩)。

// ── 匹配:档案 × 岗位的规则引擎(付费墙头牌,规则只住这一处)────────────────
export { NO_LIST_PROVINCES, hasProfile, match, matchRank, normalizeProfile, provListCoverage, reasonEn, statusEn } from './match'
export type { MatchDims, MatchJob, MatchProfile, MatchReason, ProvListCoverage } from './match'

// ── 来源标签(Job Bank 聚合的那些渠道统一显示成一个名字)────────────────────
export { blockedSrc, isDirect, sourceLabel } from './source'

// ── 形状:职位域的类型只有这一个家(库里一行 + 页面「怎么摆」的那三个)────────
export type {
  CoGradeDetail, ColKey, DesigEmp, Dims, EeCat, EeOcc, FieldGroup, FieldSource, JobRow, NewsSlim,
  NocDesc, Plan, PnpDraw, PnpOcc, PnpStream, ProvInfo,
} from './types'

// 通道策略契约(设计:docs/design/通道策略分文件-20260815.md)。
//
// 起因(Frank 2026-08-15「每个通道一个策略文件吧?不要混在一起吧」):同一条通道的规矩此前散在
// pathVerdict 的 REGISTRY、gateManifest、前端特例、拆省表、i18n 五六处 —— 今天两次踩坑
// (工签闸误判学签、NL 跨专业默认放行)都不是算法错,是改一处想不起另一处。
//
// 🔴 边界一(拆的时候不许越):**门槛的数字仍在库里**。策略文件只写「去哪张表挑门槛行」和
//    「有哪几类闸」,CLB 6 / 24 个月 / 1,560 小时这些数值照旧来自 pnp_requirements。
//    抄进代码 = 官方改版时代码与库两套真相,那是 URL→数据→SQL 铁律的反面。
// 🔴 边界二:**算法不在这里**。这一层是声明,判定流程仍归 pathVerdict()。
import type { GateKey, GateRule } from '../gateManifest'

/** 官方要求、而本站没有对应问题的提醒(灰胶囊「待你自己核对」,不是判他不行)。
 *  kind 决定文案键(dp.why.<kind>),quote/url 是举证 —— 同 gateManifest 的规矩:
 *  敢把一条门槛摆到用户面前,就得说得出它出自哪一句官方原文。 */
export type PathwayNote = {
  kind: 'fieldMatch'
  quote: string
  url: string
}

export type PathwayStrategy = {
  key: string
  /** 'FED' 或省码(判定结果里的 province) */
  province: string
  /** 官方通道名(英文原名,判定卡与日志用) */
  stream: string

  // ── 去哪挑门槛行(reqStream 用**子串**匹配不用字面相等:mart 里的通道名带 em dash,
  //    写死全串等于把编码问题埋进代码)────────────────────────────────────────
  reqProvince: string
  reqPrograms?: string[]
  reqStream?: RegExp

  // ── 抽选线 ────────────────────────────────────────────────────────────────
  drawStream?: string
  /** 该省抽选行没有子通道字段时,准不准退回「全省最近一轮有分线的抽选」。
   *  只对 MB 开:MPNP 是单池单分制;BC 是逐通道设线,退回全省线就是拿医疗线量木匠。 */
  drawFallbackProvinceWide?: boolean
  scorer?: 'CRS' | 'MB'

  // ── 口径 ──────────────────────────────────────────────────────────────────
  /** 门槛是否认可境外经验(库里没有 workLocation=canada 行的默认认) */
  countsForeign: boolean
  /** 有没有「不在清单就不合格」的明文(PE 的 OID 子通道;其余省的 indemand 清单只是定向信号) */
  listRequired?: { province: string; streamRe: RegExp }

  // ── 门槛清单三类闸(原 gateManifest.GATE_MANIFEST[key])──────────────────────
  /** 缺这一类 = 本站未收录(gateOf 兜底成 unknown),**不等于**官方不要求 */
  gates?: Partial<Record<GateKey, GateRule>>

  /** 官方要求但本站没问的事(现只有「工作与专业对口」) */
  notes?: PathwayNote[]

  note?: string
}

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

/** 专业对口闸的**例外**(2026-08-15):官方给本省院校毕业生留的口子。
 *  NL 原文:Memorial University / College of the North Atlantic 毕业生可以从事与专业不直接相关的岗位,
 *  但岗位要「NOC 需专科以上 + TEER 0/1/2/3(或 TEER 4 紧缺)」。NL 的公立高等院校就这两所,
 *  故以**学习省份**近似;TEER 4/5 那档要对紧缺清单,本站判不了 → 落 needs-info 不放行。 */
export type FieldMatchExemption = {
  /** 在这个省读的书才够得着例外 */
  studyProvince: string
  /** 例外只覆盖这几档 TEER;其余档判不了 */
  teers: readonly number[]
  quote: string
  url: string
}

/** 展示层要的通道特性(2026-08-15 C 批:把前端那 11 处 `key === 'AIP'` 收成字段)。
 *  🔴 边界:这里只放**这条通道与别人不一样的地方**,颜色/间距/排版仍归前端 ——
 *  前端读字段、不认 key,否则拆完还是散的,只是散得好看一点。 */
export type PathwayUi = {
  /** 制度归属(显示在通道名尾的小括号);缺省 PNP */
  program?: 'EE' | 'AIP' | 'RCIP' | 'PNP'
  /** 「在招」取 occ-competition 的哪一列:AIP=该省指定雇主∩本职业、RCIP=试点社区∩本职业,
   *  普通省提名=全省在招。口径不许混(2026-08-15 拆省时立的规矩) */
  jobsSource?: 'openJobs' | 'aipJobs' | 'rcipJobs'
  /** province==='FED' 且未拆到具体省时的区域名文案键(AIP=大西洋四省、RCIP=试点社区) */
  regionLabelKey?: string
  /** 「拿到 offer 即可申请」的专属话术键:AIP 要指定雇主、RCIP 要社区雇主、
   *  AB 官方还要求「已在阿省全职在岗」→ 各自如实,不共用一句 */
  afterOfferOkKey?: string
  /** 推荐原因里「差 offer」那枚胶囊的专属文案键(AIP/RCIP 要的不是普通 offer) */
  offerGapKey?: string
  /** 「看在招岗」链接的筛选参数(不含 prov);缺省 = 该省 pnp=yes */
  jobsQuery?: string
  /** 没有岗位数时链接写什么(AIP 走指定雇主筛选、RCIP 走试点筛选,都没有职业级岗数) */
  seeJobsKey?: string
}

export type PathwayStrategy = {
  key: string
  /** 'FED' 或省码(判定结果里的 province) */
  province: string
  /** 官方通道名(英文原名,判定卡与日志用) */
  stream: string
  /** 页面显示名三语(2026-08-15 从 i18n 的 jpw.p.<key> 搬进来:一条通道的名字也是它自己的事)。
   *  i18n 字典在装载时把它摊回 `jpw.p.<key>` 键,调用方照旧 t(),不必改一处。 */
  name: { zh: string; en: string; ko: string }
  /** 联邦区域线覆盖哪几个省(AIP/RCIP)。判定是联邦一份,但在招岗/指定雇主/试点社区是省的事 →
   *  展示层按 目标省∩这几个省 拆行(不限省=全拆)。非区域线不填。 */
  regionProvinces?: readonly string[]

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

  /** 专业对口闸的例外(只有声明了 gates.fieldMatch 的通道才用得上) */
  fieldMatchExemption?: FieldMatchExemption

  /** 展示层特性(缺省即「普通省提名通道」的那套) */
  ui?: PathwayUi

  note?: string
}

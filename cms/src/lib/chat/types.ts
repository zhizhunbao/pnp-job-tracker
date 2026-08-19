// 对话模块的契约 —— 前端按这个写,别改。
//
// 为什么单独存在:这些形状被本目录里 8 个文件共用,住进任何一个功能文件都会让另外七个反向 import 它。
// 🔴 **本文件只放类型,一个运行时值都不许有。** lib/i18n/chat.ts 反向取其中 5 个
//    (FollowKey / MetaTopic / OccOption / ProfileSlot / UsageTopic)靠的是 `import type` 编译期擦除;
//    这里一旦出现常量,那条反向边立刻变成真环 —— 实撞过:PNP_PROVINCES 初始化时是 undefined。
//    (ChatError 是类=运行时值,所以它住 orchestrate.ts,不住这儿。)
import { type ClaimTopic } from './tools'
import { type EduKey } from '../score'

// ── 契约(前端按这个写,别改)────────────────────────────────────────────────

export type Fact = {
  tool: string
  label: string
  value: number | null
  valueText: string
  unit: string
  evidence: { url: string; fetched: string }
  /** 答复真的用到了这条吗(citeFacts 在答复落地后回读打的标)。前端出处区只列 true 的。 */
  cited?: boolean
}
/** 'other' = 主张不属于任何官方数据工具管得着的题目(中介收费这类)—— 不硬塞给某张表去“核”。
 *  收费是交易条件,私人承诺有自己的 'private-promise' 桶;两者在见客层合成一条“不能证明结果”的判断。 */
export type SlotClaimTopic = ClaimTopic | 'other'
export type SlotClaim = { text: string; topic: SlotClaimTopic; province?: string }
/**
 * C5c 起多了**档案槽**(age / married / clb / edu + 两个附带项 eduYears / studyProvince / canadaStudy):
 * 判定层 `pathVerdict` 要的就是这几样。全部**可选**且默认 null —— 两条理由,都不是图省事:
 *   ① 缺一个槽 ≠ 有一个默认值:`married: false`「按单身算」会直接换一张 CRS 分表,
 *      算出来的分是另一个人的(编排层缺槽就反问,见 verdictFollowups);
 *   ② 类型上可选,是为了不逼既有调用方(路由、测试里的 emptySlots)全部改造 —— 加槽不该是一次破坏性变更。
 */
export type Slots = {
  noc: string | null
  occText: string
  provs: string[]
  expMonths: number | null
  status: string | null
  claims: SlotClaim[]
  /** 年龄(CRS/MPNP 年龄档;不猜) */
  age?: number | null
  /** **配偶是否随行申请**(不是「有没有结婚」):CRS 单身/已婚是两张表,随行与否才是分表的判据 */
  married?: boolean | null
  /** CLB 四项最低。**只认用户自己说的 CLB/NCLC 档** —— 雅思分数换算 CLB 是官方一张表,本站没收录,不许模型心算 */
  clb?: number | null
  edu?: EduKey | null
  /** 学制年数(两年制 → 2);说不清就 null */
  eduYears?: number | null
  /** 有没有加拿大学历 */
  canadaStudy?: boolean | null
  /** 在哪个省读的(两位省码) */
  studyProvince?: string | null
}
export type ChatTurn = { role: 'user' | 'assistant'; content: string }
/** `degraded` = 这段「答复」其实是**原始事实清单**(出口校验两次都没过 → factSheet)。
 *  前端据此换一种排版(ChatAnswer.cbSheet):清单要排成清单,不能跟正常答复长一个样。
 *  路由是纯透传(Response.json(result) / sse(result)),加字段不用动它。 */
/**
 * C6 选项卡(设计 docs/design/对话选项卡与图片上传-20260806.md §一):
 * 需要决定才弹;点选=以用户身份把 sendText 发出去(气泡进对话流,引擎照常抽槽+继承 context);
 * 推荐位带理由。label/consequence 是 UI 文案(零逗号铁律),sendText 是用户口吻的一句话。
 */
export type ChatOption = { label: string; consequence?: string; sendText: string; recommended?: boolean }
export type ChatResult = {
  answer: string; slots: Slots; facts: Fact[]; followups: string[]
  /** 弹选项卡时才有:reason 是推荐理由行,options ≤3(第 4 张「自己说」由前端固定给)。
   *  slotKey = 这张卡在收集哪个档案槽(2026-08-09 Frank「能让用户手点就别用手输入」),
   *  裁决路径的工签卡不带它(那是判定前置,不是建档)。 */
  options?: { reason: string; items: ChatOption[]; slotKey?: 'status' | 'prov' | 'clb' | 'edu' | 'expMonths' | 'married' | 'canadaStudy' }
  degraded?: boolean
}
/** 档案里已有值的槽(route 从 users.profile 算好传进来)——已有的不再点选追问,手填优先。 */
export type ProfileKnown = { status?: boolean; provs?: boolean; clb?: boolean; edu?: boolean; expMonths?: boolean; married?: boolean; canadaStudy?: boolean }

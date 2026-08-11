// 每个决定要哪些字段(设计:docs/design/统一题库与付费面-20260731.md §3)。
// 加一张卡 = 加一行声明,渲染层与存储层零改动 —— 七套题库不存在,只有一套字段库 + 各决定的取用清单。
// 只声明**已经有 builder 能出报告的决定**(没报告的卡先别占位,YAGNI)。
import { FIELDS } from './fields'
import type { Answers } from './answers'

export type Stage = 'basic' | 'explore'
export type Decision = {
  basic: string[]          // 答满即出报告(粗版,confidence 低)
  explore: string[][]      // 探索题按批推进,一批一屏组
}

// 题库扩充 20260802:基本题按「你是谁 → 技能 → 经验 → 工作 → 去哪」排,一屏内就是对话顺序。
// 每张卡只取自己算得动的子集(挂不上结论的字段不问,铁律没变)。
export const DECISIONS: Record<string, Decision> = {
  pr: {
    // 学历/年龄两题 08-10 撤(Frank「怎么还是显示 8 个题目」):它们是给官方分值表的,
    // 分值卡退出决策页后引擎规则(rules)只吃语言/经验/收入 —— 没消费方的题不问(铁律)。
    // 批 3 个人关接 pnpSelfScore 时随消费方回归。
    // 具体省份是可多选数组，不再塞进四选一字段；PR 页面在基础题之后用 ProvincePicker 采集。
    basic: ['status', 'clbBand', 'totalExpBand', 'expBand'],
    // 批 2 = B1-4 PGWP(20260803):批首 studyMonthsBand 是 free 题(batchLeadsFree ✓)——
    // 批 1 的历史偏差(KNOWN_NO_FREE_LEAD)不因此消,但新批守规矩
    explore: [['crsBand', 'pgwpBand'], ['studyMonthsBand', 'studyLevelBand']],
  },
  // 卡①找工作 / 卡⑥职业规划:零新题 —— 职业来自选职业(不是四选一题),其余全在共用底座里。
  // 这就是横向扩面成立的原因:同一批答案,三张卡都能出报告。
  // 「手上有没有 offer」不进本卡:buildJobReport 不消费它,问了改不了任何一行(挂不上结论就不问)。
  job: { basic: ['status', 'provBand'], explore: [] },
  career: { basic: ['provBand'], explore: [] },
  // 卡③选省份:目标省是这张卡要**算出来**的东西,不能拿它当输入问。
  // 2026-08-03 砍掉 edu/age/clb/totalExp 四道 —— 实测 buildProvReport 对它们的消费次数是 **0**
  //(而这行原注释还写着「都真的进换省对照的分值表」,注释撒了谎)。Frank:「这种问题和语言成绩、
  // 工作经验都没什么关系,用户根本不需要填」「那些都是个人能克服的问题,主要是政策和环境不好克服」——
  // 这张卡讲的就是政策与环境(哪个省清单收你、多挤、多少岗),个人可改变的因素不在其中。
  // 留下的两道都真消费:goal 决定排序目标函数,hasJobOffer 决定雇主担保通道那条结论。
  // totalExpBand 是 B1-2(学徒序,2026-08-03)加回来的——与被砍那四道不同,它真消费:
  // 0 经验 → 报告改写下一步(先解决第一份岗,再谈选省;rpt.g.zeroExp / rpt.n.firstJob),
  // 有经验 → 进换省对照的下界分(switchLines 的 work 因素)。复用共用底座那道题,不新造字段。
  prov: { basic: ['goalBand', 'totalExpBand', 'offerBand'], explore: [] },
}

export const fieldsOf = (decision: string, stage: Stage, batch = 0): string[] => {
  const d = DECISIONS[decision]
  if (!d) return []
  return stage === 'basic' ? d.basic : (d.explore[batch] ?? [])
}

// 只问缺的(字段属于用户,不属于页面)
export const missingFields = (names: string[], a: Answers): string[] =>
  names.filter((n) => !(a as any)[n])

// 规则:每批探索题第一道必须是 free 题 —— 先兑现一次再谈钱,一整批全是 pro 题
// = 用户答完什么都没多看到。新加批次必须守;PR 批 1 是历史偏差(见下),不许再加第二个。
export const batchLeadsFree = (names: string[]): boolean => FIELDS[names[0]]?.tier === 'free'
// 例外:拿 PR 探索批 1(crs/pgwp 两题都进锁区)。探索层现在没有能立刻给免费结论的字段
// —— 省级语言与工资门槛未建模、hasJobOffer 还没规则。这两样任一落地,就把它挪到批首并删掉这行。
export const KNOWN_NO_FREE_LEAD = new Set(['pr:0'])

/**
 * me 桶子桶 jobs 的子桶 recommend —— 「今日推荐」这一页签的形状(本桶自声明;推荐线格式与父桶同形的各自抄)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语三字面量(各域自抄)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 今日推荐一行(线格式;lib/myjobs 的 PickRow 全格照抄)。
 */
export type PickItem = {
  /**
   * 职位 id。
   */
  id: number

  /**
   * 职位名英文原文。
   */
  title: string

  /**
   * 职位名中文译文(没有 = 空串)。
   */
  titleZh: string

  /**
   * 职位名韩文译文(没有 = 空串)。
   */
  titleKo: string

  /**
   * 公司英文名。
   */
  company: string

  /**
   * 公司中文译名(没有 = 空串)。
   */
  companyZh: string

  /**
   * 公司韩文译名(没有 = 空串)。
   */
  companyKo: string

  /**
   * 公司页 slug(没有 = 空串)。
   */
  companySlug: string

  /**
   * 地点一行(照 Indeed)。
   */
  address: string

  /**
   * 城市英文名。
   */
  city: string

  /**
   * 城市中文译名(没有 = 空串)。
   */
  cityZh: string

  /**
   * 城市韩文译名(没有 = 空串)。
   */
  cityKo: string

  /**
   * 省码。
   */
  province: string

  /**
   * 薪资显示串(没有 = 空串)。
   */
  salary: string

  /**
   * 发布日期(ISO;没有 = 空串)。
   */
  datePosted: string

  /**
   * 截止日(ISO;没有 = 空串)。
   */
  validThrough: string

  /**
   * 具名省提名通道(没有 = 空串)。
   */
  pnpStream: string

  /**
   * 能走省提名。
   */
  pnpEligible: boolean

  /**
   * 本省有省默认通道。
   */
  provDefault: boolean

  /**
   * 推荐理由码。
   */
  reasons: string[]

  /**
   * 薪资高出本省同职业中位的百分比(没有是 null)。
   */
  abovePct: number | null

  /**
   * 本省同职业时薪中位(没有是 null)。
   */
  wageMedHourly: number | null

  /**
   * 雇主办过的 LMIA 外劳名额(没有是 0)。
   */
  lmiaPositions: number

  /**
   * EE 定向类别(没有 = 空串)。
   */
  eeCategory: string

  /**
   * 社区试点名(RCIP / FCIP;没有 = 空串)。
   */
  pilot: string
}

/**
 * 推荐(洗净)。
 */
export type PicksFact = {
  /**
   * 今天的推荐。
   */
  picks: PickItem[]

  /**
   * 各行的推荐指数(与 picks 同序)。
   */
  fits: FitFact[]

  /**
   * 目标(pr / job)。
   */
  goal: string

  /**
   * 有没有职业依据。
   */
  basis: boolean

  /**
   * 拿 PR 要补的档案项。
   */
  need: string[]

  /**
   * 出的是低档。
   */
  lowOnly: boolean
}

/**
 * 带职位名与两语库存译名的一行(MyJobItem / PickItem 都合这个形)。
 */
export type TitledItem = {
  /**
   * 职位名(英文原名)。
   */
  title: string

  /**
   * 库里存好的中文译名(没有 = 空串)。
   */
  titleZh: string

  /**
   * 库里存好的韩文译名。
   */
  titleKo: string
}

/**
 * 今日推荐接口的回包(线格式;缺席按空读)。
 */
export type PicksRespJson = {
  /**
   * 今天的推荐。
   */
  picks?: PickItem[]

  /**
   * 各行的推荐指数(与 picks 同序;2026-11-11 任务书第 46 条)。
   */
  fits?: FitFact[]

  /**
   * 目标(pr / job)。
   */
  goal?: string

  /**
   * 有没有职业依据(没有 = 不出推荐,出引导去填)。
   */
  basis?: boolean

  /**
   * 拿 PR 要补的档案项(who / clb / exp)。
   */
  need?: string[]

  /**
   * 高、中档一条都没有,出的是低档。
   */
  lowOnly?: boolean
}

/**
 * 拉推荐(makeLoadPicks)的入参。
 */
export type LoadPicksIn = {
  /**
   * 写推荐。
   */
  setData: (v: PicksFact) => void

  /**
   * 拨「拉失败了」。
   */
  setFailed: (v: boolean) => void

  /**
   * 这一页答过档案,让服务端现算(不用当天缓存)。
   */
  fresh: boolean
}

/**
 * 中位时薪与 vs 中位两格(wageViewOf)的入参。
 */
export type WageViewIn = {
  /**
   * 本省同职业时薪中位(没有是 null)。
   */
  hourly: number | null

  /**
   * 薪资高出中位的百分比(没有是 null)。
   */
  pct: number | null
}

/**
 * 中位时薪与 vs 中位两格的显示(wageViewOf 的产出)。
 */
export type WageView = {
  /**
   * 中位时薪显示串(「$N/hr」;没有 = 空串)。
   */
  med: string

  /**
   * vs 中位显示串(「+N%」「-N%」;没有 = 空串)。
   */
  vs: string

  /**
   * 薪资低于中位(vs 中位格用琥珀;否则绿)。
   */
  down: boolean
}

/**
 * 推荐指数胶囊的色档(tag 桶变体里用到的四个,本桶自抄)。
 */
export type FitVariant = 'ok' | 'info' | 'gray' | 'warn'

/**
 * 取词函数(本桶自声明)。
 */
export type FitTFn = (key: string, vars?: Record<string, string>) => string

/**
 * 推荐指数里的一项结论(服务端下发的形:词条键尾与填词)。
 */
export type FitLine = {
  /**
   * 项的身份(who / edu / lang / work / term / draw / occ / pay / place / emp)。
   */
  key: string

  /**
   * 结论胶囊的词条键尾(pass / check / high / mid / low / none)。
   */
  tag: string

  /**
   * 说明一句的词条键尾。
   */
  note: string

  /**
   * 说明一句的填词。
   */
  vars: Record<string, string>
}

/**
 * 一行推荐的推荐指数(服务端下发的形)。
 */
export type FitFact = {
  /**
   * 档(high / mid / low)。
   */
  level: string

  /**
   * 目标(pr / job)。
   */
  goal: string

  /**
   * 硬性条件各项(找工作 = 空)。
   */
  hard: FitLine[]

  /**
   * 匹配情况各项。
   */
  soft: FitLine[]
}

/**
 * needTextOf 的入参。
 */
export type NeedTextIn = {
  /**
   * 要补的档案项。
   */
  need: string[]

  /**
   * 取词函数。
   */
  t: FitTFn
}

/**
 * 推荐表上的点击事件里本桶真读的一格。
 */
export type PickClickEvent = {
  /**
   * 点到的元素。
   */
  target: EventTarget | null
}

/**
 * makeOpenApply 的入参。
 */
export type OpenApplyIn = {
  /**
   * 职位号。
   */
  jobId: number

  /**
   * 投递入口(picks / saved / draft)。
   */
  from: string
}

/**
 * 一行推荐的推荐指数显示(2026-11-11 Frank「不要弹框了」「直接那一列,列 bullets」:一枚胶囊加几条要点)。
 */
export type FitView = {
  /**
   * 档的字(高 / 中 / 低)。
   */
  levelText: string

  /**
   * 胶囊色档。
   */
  variant: FitVariant

  /**
   * 几条要点(一行一条)。
   */
  bullets: string[]

  /**
   * 要点展开着(默认收着,点胶囊展开;2026-11-11 Frank「bullets 要不点击 high 那个按钮时候才显示」)。
   */
  open: boolean

  /**
   * 胶囊上档字后面的箭头(收着向下、展开向上)。
   */
  mark: string

  /**
   * 胶囊钮的无障碍名。
   */
  aria: string
}

/**
 * fitViewOf 的入参。
 */
export type FitViewIn = {
  /**
   * 服务端下发的推荐指数。
   */
  fact: FitFact

  /**
   * 取词函数。
   */
  t: FitTFn

  /**
   * 这一行的要点展开着。
   */
  open: boolean
}

/**
 * 几条要点。
 */
export type Bullets = string[]

/**
 * 推荐指数要点的展开状态(哪几行展开着)与改它的落格。
 */
export type FitFold = {
  /**
   * 展开着的行(行身份)。
   */
  open: string[]

  /**
   * 写展开着的行。
   */
  setOpen: (v: string[]) => void
}

/**
 * makeFitToggle 的入参。
 */
export type FitToggleIn = {
  /**
   * 行身份。
   */
  key: string

  /**
   * 展开状态与落格。
   */
  fold: FitFold
}

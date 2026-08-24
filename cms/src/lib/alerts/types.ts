/**
 * 提醒域的形状 —— 本域自己声明(两处 `import type` 特批:db 基础设施叶子、
 * jobs 的匹配引擎输入行,那是引擎的契约,抄一份就是两份真相)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */


// eslint-disable-next-line local/no-import-in-leaf -- db 是基础设施叶子(能 query 的连接形状归它),与 stats/types 同一特批
import type { Db } from '../db'
// eslint-disable-next-line local/no-import-in-leaf -- 匹配引擎的输入行与维度表形状归 jobs 域(引擎契约,特批牌形态)
import type { MatchDims, MatchJob } from '../jobs'
// eslint-disable-next-line local/no-import-in-leaf -- payload 句柄形状由库定（特批牌形态）；注入而非自取是为解 payload.config → mail 的环
import type { Payload } from 'payload'

/**
 * SQL.ALERT_JOBS 的一行里本域读的格(词汇表在 rows 收)。
 */
export type AlertJobRow = {
  /**
   * 岗 id(详情页链接用;可空防御老行)。
   */
  id: number | null

  /**
   * 职位名。
   */
  title: string | null

  /**
   * 公司名(LEFT JOIN 可空)。
   */
  company_name: string | null

  /**
   * 城市。
   */
  city: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 薪资原文。
   */
  salary_text: string | null

  /**
   * NOC 码。
   */
  noc: string | null

  /**
   * TEER(pg 可能按字符串交回)。
   */
  teer: string | number | null

  /**
   * 可提名信号。
   */
  pnp_eligible: boolean | null

  /**
   * 省提名通道文本。
   */
  pnp_stream: string | null

  /**
   * 联邦 EE 类别。
   */
  ee_category: string | null

  /**
   * 年化薪资。
   */
  salary_annual: string | number | null

  /**
   * 同职业中位年薪。
   */
  wage_med_annual: string | number | null
}

/**
 * C2 档案版周报的一条样例岗(SQL.alertSampleJobs:列已 COALESCE,非空)。
 */
export type SampleRow = {
  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 薪资原文。
   */
  sal: string
}

/**
 * C2 档案版周报的当周事实数。
 */
export type WeeklyStat = {
  /**
   * 本周新增岗数。
   */
  newN: number

  /**
   * 其中可提名岗数。
   */
  eligN: number

  /**
   * 中位年薪;库里没有是 null(不编数)。
   */
  medSal: number | null
}

/**
 * C 收藏版周报的一条。
 */
export type WeeklyItem = {
  /**
   * 收藏时存的职位名。
   */
  title: string

  /**
   * 收藏时存的公司名。
   */
  company: string

  /**
   * 现在还在招吗。
   */
  open: boolean
}

/**
 * 邮件语言键(周报三语;A/B 信恒英文)。
 */
export type MailLang = 'zh' | 'en' | 'ko'

/**
 * 「按邮件语言取范围描述”的函数形状(职业名与省范围按邮件语言取 —— 英文/韩文邮件里
 * 塞中文职业名,与 #216 是同一类漏)。
 */
export type DimsOfFn = (lang: MailLang) => string

/**
 * 邮件展示用的岗位行（A 轮的 AlertJobRow 与 B 轮 jobs 域的 AlertHit 都宽度兼容它 ——
 * 拼信只读这六格）。
 */
export type MailJobRow = {
  /**
   * 岗 id（详情页链接；可空防御老行）。
   */
  id: number | null

  /**
   * 职位名。
   */
  title: string | null

  /**
   * 公司名。
   */
  company_name: string | null

  /**
   * 城市。
   */
  city: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 薪资原文。
   */
  salary_text: string | null
}

/**
 * saved-search 取命中函数的形状(取数函数由路由注入 —— 域之间不互相借取数函数,
 * 样板:路由把 resolveByAgent 注给 orchestrate)。
 */
export type LoadHitsFn = (input: {
  /**
   * 保存的筛选(payload 文档里的 json)。
   */
  filters: SavedFilters

  /**
   * 游标:只取 first_seen 晚于它的岗。
   */
  since: string
}) => Promise<{
  /**
   * 命中的岗(emailHtml 直接排版)。
   */
  rows: MailJobRow[]

  /**
   * 认不出的筛选键(照实上报进响应)。
   */
  skipped: string[]
}>

/**
 * `runAlerts` 的入参。
 */
export type RunIn = {
  /**
   * 能查的连接(池由路由注进来)。
   */
  db: Db

  /**
   * dry-run(没配发信密钥或 ?dry=1):照常计算返回计数,不发信不回写。
   */
  dry: boolean

  /**
   * ?preview=weekly:只渲染第一封档案版周报的 HTML 返回,不发信不写库(走查用)。
   */
  preview: string

  /**
   * preview 时的语言覆盖(?lang=;空串=按用户 locale)。
   */
  previewLang: string

  /**
   * 匹配维度表(路由 loadMatchDims 预载注入)。
   */
  dims: MatchDims

  /**
   * payload 句柄（路由注入；解 payload.config → mail 的环）。
   */
  payload: PayloadHandle

  /**
   * saved-search 命中取数(路由注入 loadAlertHits)。
   */
  fetchHits: LoadHitsFn
}

/**
 * 一轮跑完的计数(键序与历史响应一致 —— 运维在 build 日志里对这个 json)。
 */
export type AlertCounts = {
  /**
   * 这轮是 dry-run 吗。
   */
  dryRun: boolean

  /**
   * A 档案匹配信发出(dry 时=会发的)封数。
   */
  matchEmails: number

  /**
   * B saved-search 信封数。
   */
  searchEmails: number

  /**
   * C 周报封数。
   */
  weeklyEmails: number

  /**
   * 发送失败数(第25轮 #116:失败原先只落 Render console,现随响应进 build 日志)。
   */
  sendFails: number

  /**
   * A 轮实际核对的用户数。
   */
  usersChecked: number

  /**
   * B 轮核对的 saved-search 数。
   */
  searchesChecked: number

  /**
   * C 轮真正产出内容的用户数。
   */
  weeklyChecked: number

  /**
   * 认不出的筛选键(fetchHits 上报的并集)。
   */
  skippedFilters: string[]
}

/**
 * `runAlerts` 的产物:正常一轮出计数;preview 命中时出 HTML。
 */
export type RunResult = {
  /**
   * 哪种产物。
   */
  kind: 'counts'

  /**
   * 计数。
   */
  counts: AlertCounts
} | {
  /**
   * 哪种产物。
   */
  kind: 'preview'

  /**
   * 第一封档案版周报的 HTML。
   */
  html: string
}

/**
 * `runAlerts` 的返回。
 */
export type RunOut = Promise<RunResult>

/**
 * 静默时段判定的产物(响应里原样带出,运维看得懂这轮为什么没发)。
 */
export type QuietInfo = {
  /**
   * 现在在静默窗口内吗。
   */
  inQuiet: boolean

  /**
   * 窗口起(小时,ET)。
   */
  qs: number

  /**
   * 窗口止。
   */
  qe: number

  /**
   * 当前 ET 小时。
   */
  etHour: number
}

/**
 * 匹配引擎输入行的本域别名(rows 的 toMatchJob 产它)。
 */
export type EngineJob = MatchJob


/**
 * 退订 token 的主体(payload 主键,数字或串)。
 */
export type MailUserId = string | number

/**
 * payload 句柄的本地名（路由层 getPayload 后注进来 —— functions 不自取，
 * 否则 payload.config → alerts 成环）。
 */
export type PayloadHandle = Payload

/**
 * 退订判定的三态。
 */
export type UnsubState = 'invalid' | 'done' | 'fail'

/**
 * `unsubApply` 的入参。
 */
export type UnsubIn = {
  /**
   * payload 句柄（路由注入）。
   */
  payload: PayloadHandle

  /**
   * 链接里的用户 id（原料）。
   */
  u: string

  /**
   * 链接里的 token（原料）。
   */
  t: string
}

/**
 * 保存的筛选里一格的取值（payload 自由 json 的信任边界；真正的白名单收窄在
 * loadAlertHits，这里只把 unknown 换成显式联合）。
 */
export type FilterCell = string | number | boolean | string[] | null

/**
 * 保存的筛选（键任意）。
 */
export type SavedFilters = Record<string, FilterCell>

/**
 * `emailHtml` 的入参。
 */
export type EmailHtmlIn = {
  /**
   * 命中的岗。
   */
  rows: MailJobRow[]

  /**
   * 抽选段文案（可空数组）。
   */
  drawLines: string[]
}

/**
 * `weeklyHtml` 的入参。
 */
export type WeeklyHtmlIn = {
  /**
   * 收藏条目。
   */
  items: WeeklyItem[]

  /**
   * 当周新增数。
   */
  newN: number

  /**
   * 方向描述（省·大类对串）。
   */
  dims: string

  /**
   * 退订链接。
   */
  unsubUrl: string
}

/**
 * `weeklyProfileHtml` 的入参。
 */
export type ProfileHtmlIn = {
  /**
   * 样例岗三条。
   */
  rows: SampleRow[]

  /**
   * 当周事实数。
   */
  stat: WeeklyStat

  /**
   * 按邮件语言取范围描述。
   */
  dimsOf: DimsOfFn

  /**
   * 退订链接。
   */
  unsubUrl: string

  /**
   * 用户 locale（空串=双语）。
   */
  locale: string
}

/**
 * 职业名一行（SQL.ALERT_NOC_TITLE：列已 COALESCE）。
 */
export type NocNameRow = {
  /**
   * 中文名。
   */
  zh: string

  /**
   * 英文名。
   */
  en: string
}

/**
 * `makeDimsOf` 的入参。
 */
export type DimsOfMakeIn = {
  /**
   * 职业名行。
   */
  nameRows: NocNameRow[]

  /**
   * 档案里的码数（兑底文案用）。
   */
  nocs: string[]

  /**
   * 目标省码组。
   */
  provs: string[]
}

/**
 * C2 统计行（SQL.alertOccStats 的唯一一行）。
 */
export type WeeklyStatRow = {
  /**
   * 新增数。
   */
  n: number | null

  /**
   * 可提名数。
   */
  elig: number | null

  /**
   * 中位年薪（pg 可能按字符串交回）。
   */
  med: string | number | null
}

/**
 * 统计行或查空。
 */
export type MaybeWeeklyStatRow = WeeklyStatRow | null

/**
 * 样例岗原始行（列已 COALESCE，但接缝上仍按可空收）。
 */
export type SampleDbRow = {
  /**
   * 职位名。
   */
  title: string | null

  /**
   * 公司名。
   */
  company: string | null

  /**
   * 薪资原文。
   */
  sal: string | null
}

/**
 * 年薪或没有（kSal 的入参；不编数）。
 */
export type MaybeMoney = number | null

/**
 * 邮件展示行的复数（jobsTable/emailHtml 共用）。
 */
export type MailJobList = MailJobRow[]

/**
 * 当日新抽选的一条（dims.eeCategories 里本域读的三格）。
 */
export type DrawCat = {
  /**
   * 类别名。
   */
  label: string

  /**
   * 分数线；没有是 null。
   */
  drawCrs: number | null

  /**
   * 抽选日。
   */
  drawDate: string
}

/**
 * 收藏岗状态核对行（SQL.ALERT_JOBS_BY_IDS）。
 */
export type SavedJobStatusRow = {
  /**
   * 岗 id。
   */
  id: number

  /**
   * 状态。
   */
  status: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 大类。
   */
  broad: string | null
}

/**
 * 收藏画像的 (省, 大类) 对。
 */
export type ProvBroadPair = {
  /**
   * 省码。
   */
  province: string

  /**
   * 大类。
   */
  broad: string
}

/**
 * query 参数串或没传（isDryRun 的入参）。
 */
export type MaybeParam = string | null

/**
 * 目标省优先比较器的形状（sort 用）。
 */
export type TargetFirstFn = (a: AlertJobRow, b: AlertJobRow) => number

/**
 * 目标省码组。
 */
export type ProvCodes = string[]

/**
 * `unsubApply` 的返回。
 */
export type UnsubOut = Promise<UnsubState>

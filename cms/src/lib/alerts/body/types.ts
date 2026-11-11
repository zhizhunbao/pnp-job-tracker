/**
 * alerts 桶的子桶 body 的形状:各封信的入参与职位块(本桶自声明,不取父桶)。
 *
 * @author Frank
 * @time 2026-11-11 03:00:00
 */

// =========================================================================
// 1. 四种提醒信
// =========================================================================

/**
 * C2 档案版周报的一条样例岗(SQL.alertSampleJobs:列已 COALESCE,非空)。
 */
export type SampleRow = {
  /**
   * 职位 id(信里的链接落本站详情页);没有 null。
   */
  id: number | null

  /**
   * 职位名。
   */
  title: string

  /**
   * 地点「市, 省码」;都没有 = 空串。
   */
  where: string

  /**
   * 是不是可提名(只决定这一行挂不挂小标签)。
   */
  pnp: boolean

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
 * 「取范围描述」的函数形状(职业名加省范围,英文)。
 */
export type DimsOfFn = () => string

/**
 * 邮件展示用的岗位行（A 轮的 AlertJobRow 宽度兼容它 ——
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
 * `emailHtml` 的入参。
 */
export type EmailHtmlIn = {
  /**
   * 退订链接(2026-11-08 清单第 16 条)。
   */
  unsubUrl: string

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
}

/**
 * 邮件展示行的复数（jobsTable/emailHtml 共用）。
 */
export type MailJobList = MailJobRow[]

/**
 * 每日推送的一条(lib/myjobs 的推荐一行里本域读的格;全格照抄形状,不跨域引 type)。
 */
export type MailPick = {
  /**
   * 职位 id(链到本站职位页)。
   */
  id: number

  /**
   * 职位名英文原文。
   */
  title: string

  /**
   * 公司英文名。
   */
  company: string

  /**
   * 城市英文名(没有 = 空串)。
   */
  city: string

  /**
   * 省码。
   */
  province: string

  /**
   * 薪资显示串(没有 = 空串)。
   */
  salary: string
}

/**
 * 每日推送整封 HTML(dailyHtml)的入参。
 */
export type DailyHtmlIn = {
  /**
   * 推荐。
   */
  picks: MailPick[]


  /**
   * 退订链接。
   */
  unsubUrl: string
}

// =========================================================================
// 3. 外壳与共用块
// =========================================================================

/**
 * 提醒类的信套外壳(alertShellOf)的入参。
 */
export type AlertShellIn = {
  /**
   * 右上角的小字:这是哪一种信。
   */
  kicker: string

  /**
   * 正文 HTML。
   */
  body: string

  /**
   * 退订链接。
   */
  unsubUrl: string
}

/**
 * 信里一个职位一块(jobBlockOf)的入参;没有的格传空串。
 */
export type JobBlockIn = {
  /**
   * 职位链接;空串 = 职位名只出字。
   */
  href: string

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 地点。
   */
  where: string

  /**
   * 薪资。
   */
  salary: string

  /**
   * 第三行的标签(可提名、在招、已下架):HTML 版传标签 HTML,纯文本版传标签字;没有 = 空串。
   */
  tag: string
}

/**
 * 提醒类的信的纯文本版(alertTextOf)的入参。
 */
export type AlertTextIn = {
  /**
   * 标题一行。
   */
  head: string

  /**
   * 正文各行(每个职位一行,另有抽选、本周新增等行)。
   */
  lines: string[]

  /**
   * 「查看全部」那个链接的文字。
   */
  cta: string

  /**
   * 「查看全部」那个链接的地址。
   */
  href: string

  /**
   * 退订链接。
   */
  unsubUrl: string
}

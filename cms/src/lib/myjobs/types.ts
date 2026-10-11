/**
 * 我的岗位域(lib/myjobs)的形状:库行 → 对外行(两张表同一种线格式)。
 *
 * @author Frank
 * @time 2026-10-06 23:00:00
 */
import type { Db } from '../db'

/**
 * 一行的库行(收藏表连职位表、城市表;职位删了时职位那几格是 NULL)。
 */
export type MyJobDbRow = {
  /**
   * 收藏记录 id。
   */
  id: number | string | null

  /**
   * 职位 id(职位删了是 NULL)。
   */
  job_id: number | string | null

  /**
   * 职位名快照。
   */
  title: string | null

  /**
   * 公司名快照。
   */
  company: string | null

  /**
   * 投递进度(空 / applied / interview / offer)。
   */
  status: string | null

  /**
   * 收藏的时刻。
   */
  created_at: TimeCell

  /**
   * 最近一次改进度的时刻(已投的行 = 点「邮箱投递」那一刻)。
   */
  updated_at: TimeCell

  /**
   * 城市英文名。
   */
  city: string | null

  /**
   * 城市中文译名(人工核定)。
   */
  city_zh: string | null

  /**
   * 城市韩文译名(人工核定)。
   */
  city_ko: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 薪资显示串(数据层洗好,如 $18–$21/hr)。
   */
  salary_text: string | null

  /**
   * 折算年薪(数据层算好;薪资列按它排序)。
   */
  salary_annual: number | string | null

  /**
   * 发布日期。
   */
  date_posted: TimeCell

  /**
   * 公司页 slug(公司表没这家 / 职位删了是 NULL)。
   */
  company_slug: string | null

  /**
   * 职位状态(open / closed / campus;职位删了是 NULL)。
   */
  job_status: string | null

  /**
   * 库里有投递邮箱(我的收藏:能不能直接投;我的求职那条 SQL 给 false;2026-10-08)。
   */
  has_email: boolean | null

  /**
   * 发出时附了求职信(我的求职:cover_file 不空;收藏那条 SQL 给 false;2026-10-10 Frank「两处都改吧」)。
   */
  has_cover: boolean | null

  /**
   * 职位名中文译文(2026-10-10 批 2;版本号对不上当没有)。
   */
  title_zh: string | null

  /**
   * 职位名韩文译文。
   */
  title_ko: string | null

  /**
   * 职位名译文的版本号。
   */
  trans_v: number | string | null

  /**
   * 公司中文译名。
   */
  alias_zh: string | null

  /**
   * 公司韩文译名。
   */
  alias_ko: string | null

  /**
   * 精确地址(有街号带门牌与邮编;没有是 NULL)。
   */
  address: string | null

  /**
   * 工时归一值 full / part(数据层洗好;没标 NULL;2026-10-10 批 2)。
   */
  employment_hours: string | null

  /**
   * 雇佣期归一值 permanent / term / seasonal / casual(没标 NULL)。
   */
  employment_term: string | null

  /**
   * 截止日(发帖方写的;Job Bank 帖多为 NULL)。
   */
  valid_through: TimeCell
}

/**
 * 计数库行(已投几封)。
 */
export type CountDbRow = {
  /**
   * 条数。
   */
  n: number | string | null
}

/**
 * 时刻格(pg 的 timestamptz 交回 Date;测试桩可能给串)。
 */
export type TimeCell = Date | string | null

/**
 * 一行(洗净;也是两个接口的线格式)。
 */
export type MyJobRow = {
  /**
   * 收藏记录 id(取消收藏时 DELETE 它)。
   */
  id: number

  /**
   * 职位 id;null = 职位已从库里删掉(打不开职位页)。
   */
  jobId: number | null

  /**
   * 职位名(英文原名;没有 = 空串)。
   */
  title: string

  /**
   * 公司名(没有 = 空串)。
   */
  company: string

  /**
   * 城市英文名(没有 = 空串)。
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
   * 省码(没有 = 空串)。
   */
  province: string

  /**
   * 薪资显示串(没有 = 空串)。
   */
  salary: string

  /**
   * 折算年薪(排序用;没有 = null)。
   */
  salaryAnnual: number | null

  /**
   * 发布日期(ISO;没有 = 空串)。
   */
  datePosted: string

  /**
   * 公司页 slug(点公司名开公司弹框;没有 = 空串,公司名不可点)。
   */
  companySlug: string

  /**
   * 投递进度(空串 = 只收藏没投;applied / interview / offer)。
   */
  stage: string

  /**
   * 收藏的时刻(ISO)。
   */
  savedAt: string

  /**
   * 最近一次改进度的时刻(ISO;已投的行 = 投递那一刻)。
   */
  updatedAt: string

  /**
   * 职位已下架。
   */
  closed: boolean

  /**
   * 库里有投递邮箱(我的收藏表上出「投递」钮的前提;2026-10-08)。
   */
  hasEmail: boolean

  /**
   * 发出时附了求职信(我的求职表上出「求职信」链接的前提;2026-10-10 Frank「两处都改吧」)。
   */
  hasCover: boolean

  /**
   * 职位名中文译文(没有 = 空串;2026-10-10 批 2)。
   */
  titleZh: string

  /**
   * 职位名韩文译文(没有 = 空串)。
   */
  titleKo: string

  /**
   * 公司中文译名(没有 = 空串)。
   */
  companyZh: string

  /**
   * 公司韩文译名(没有 = 空串)。
   */
  companyKo: string

  /**
   * 地点一行(照 Indeed:有精确地址写到门牌与邮编,没有写「市, 省码」)。
   */
  address: string

  /**
   * 工时归一值 full / part(没标 = 空串;2026-10-10 批 2)。
   */
  hours: string

  /**
   * 雇佣期归一值 permanent / term / seasonal / casual(没标 = 空串)。
   */
  term: string

  /**
   * 截止日(ISO;没有 = 空串)。
   */
  validThrough: string
}

/**
 * 用户 id(payload 给的是 number 或 string,原样带进 SQL 参数)。
 */
export type UserId = string | number

/**
 * 按人取清单(loadApplied / loadSaved)的入参。
 */
export type MyJobsIn = {
  /**
   * 数据库连接(调用方注入,本域不自己连库)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId
}

/**
 * 取清单的返回。
 */
export type MyJobsOut = Promise<MyJobRow[]>

/**
 * 取计数的返回。
 */
export type CountOut = Promise<number>

/**
 * 今日推荐一行的库行(SQL.MYJOBS_PICKS)。
 */
export type PickDbRow = {
  /**
   * 职位 id。
   */
  id: number | string | null

  /**
   * 职位名英文原文。
   */
  title: string | null

  /**
   * 职位名中文译文(版本号对不上当没有)。
   */
  title_zh: string | null

  /**
   * 职位名韩文译文。
   */
  title_ko: string | null

  /**
   * 职位名译文的版本号。
   */
  trans_v: number | string | null

  /**
   * 公司英文名(公司表)。
   */
  company_name: string | null

  /**
   * 公司中文译名。
   */
  alias_zh: string | null

  /**
   * 公司韩文译名。
   */
  alias_ko: string | null

  /**
   * 公司页 slug。
   */
  company_slug: string | null

  /**
   * 精确地址(有街号带门牌与邮编;没有是 NULL)。
   */
  address: string | null

  /**
   * 城市英文名。
   */
  city: string | null

  /**
   * 城市中文译名。
   */
  city_zh: string | null

  /**
   * 城市韩文译名。
   */
  city_ko: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 薪资显示串。
   */
  salary_text: string | null

  /**
   * 发布日期。
   */
  date_posted: TimeCell

  /**
   * 能走省提名。
   */
  pnp_eligible: boolean | null

  /**
   * 薪资高于本省同职业中位(两边任一没有是 NULL)。
   */
  above_med: boolean | null

  /**
   * 和他投过的岗同一职业单元组。
   */
  occ_applied: boolean | null

  /**
   * 和他收藏的岗同一职业单元组。
   */
  occ_saved: boolean | null

  /**
   * 和他档案里答的「想做的工作」同一职业单元组(2026-10-11)。
   */
  occ_want: boolean | null

  /**
   * 这一岗所在省的雇主 offer 类通道近 PICKS_DRAW_DAYS 天抽过(没收录到抽选的省也算 true;2026-10-11)。
   */
  offer_active: boolean | null

  /**
   * 工时归一值 full / part(数据层洗好;没标 NULL;2026-10-10 批 2)。
   */
  employment_hours: string | null

  /**
   * 雇佣期归一值 permanent / term / seasonal / casual(没标 NULL)。
   */
  employment_term: string | null

  /**
   * 截止日(发帖方写的;Job Bank 帖多为 NULL)。
   */
  valid_through: TimeCell
}

/**
 * 今日推荐一行(洗净;对外线格式同形)。
 */
export type PickRow = {
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
   * 地点一行(照 Indeed:有精确地址写到门牌与邮编,没有写「市, 省码」)。
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
   * 推荐理由码(只放真的;顺序即胶囊顺序)。
   */
  reasons: string[]

  /**
   * 省提名项目简称(理由里有 pnp 时胶囊用;没有 = 空串)。
   */
  program: string

  /**
   * 工时归一值 full / part(没标 = 空串;2026-10-10 批 2)。
   */
  hours: string

  /**
   * 雇佣期归一值 permanent / term / seasonal / casual(没标 = 空串)。
   */
  term: string

  /**
   * 截止日(ISO;没有 = 空串)。
   */
  validThrough: string
}

/**
 * 「更多推荐」里锁住的一条:只给职位名与理由,公司 / 地址 / 薪资 / 职位号一概不下发。
 */
export type LockedPick = {
  /**
   * 职位名英文原文。
   */
  title: string

  /**
   * 推荐理由码。
   */
  reasons: string[]

  /**
   * 省提名项目简称(没有 = 空串)。
   */
  program: string
}

/**
 * 推荐接口的回包。
 */
export type PicksJson = {
  /**
   * 看得见的推荐(免费号最多 PICKS_FREE 条,Pro 全给)。
   */
  picks: PickRow[]

  /**
   * 免费号还有几条看不见(Pro 恒 0)。
   */
  more: number

  /**
   * 锁住给看的几条(免费号、more 大于 0 才有)。
   */
  locked: LockedPick[]
}

/**
 * 算推荐(loadPicks)的入参。
 */
export type PicksIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 浏览器按时区预选的省码(空串 = 不知道;答过所在省时不用它)。
   */
  prov: string
}

/**
 * 取推荐(getPicks)的入参:算推荐的入参 + 是不是 Pro。
 */
export type PicksViewIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 浏览器按时区预选的省码(空串 = 不知道)。
   */
  prov: string

  /**
   * 是不是 Pro(Pro 看全部,免费号看 PICKS_FREE 条)。
   */
  pro: boolean

  /**
   * 不用当天缓存、现算一份(2026-10-11:答完档案重拉推荐)。
   */
  fresh: boolean
}

/**
 * 推荐切成「看得见 / 锁住」(picksViewOf)的入参。
 */
export type PicksSplitIn = {
  /**
   * 当天算好的全部推荐(已剔掉今天新碰过的岗)。
   */
  rows: PickRow[]

  /**
   * 是不是 Pro。
   */
  pro: boolean
}

/**
 * 剔掉碰过的岗(dropTouchedOf)的入参。
 */
export type DropTouchedIn = {
  /**
   * 推荐。
   */
  rows: PickRow[]

  /**
   * 碰过的职位 id。
   */
  touched: number[]
}

/**
 * 地点一行(addressOf)的入参。
 */
export type AddressIn = {
  /**
   * 精确地址(没有 = 空串)。
   */
  address: string

  /**
   * 城市英文名。
   */
  city: string

  /**
   * 省码。
   */
  province: string
}

/**
 * 推荐理由(reasonsOf)的入参:库行里的四个判定格与省码。
 */
export type ReasonsIn = {
  /**
   * 能走省提名。
   */
  pnp: boolean

  /**
   * 省码(魁北克等不在 PROV_PNP 里的省不出省提名理由)。
   */
  province: string

  /**
   * 薪资高于本省中位。
   */
  aboveMed: boolean

  /**
   * 和投过的同职业单元组。
   */
  occApplied: boolean

  /**
   * 和收藏的同职业单元组。
   */
  occSaved: boolean

  /**
   * 和档案里答的「想做的工作」同职业单元组(2026-10-11;与投过的同组一样算「职业对口」)。
   */
  occWant: boolean

  /**
   * 这一省的雇主 offer 类通道近 PICKS_DRAW_DAYS 天抽过(2026-10-11 Frank「90 天可以」;过了不出省提名理由)。
   */
  offerActive: boolean
}

/**
 * 碰过的岗的库行。
 */
export type IdDbRow = {
  /**
   * 职位 id。
   */
  id: number | string | null
}

/**
 * 推荐缓存里一个人的那一份。
 */
export type PicksEntry = {
  /**
   * 哪一天算的(多伦多时间 YYYY-MM-DD)。
   */
  day: string

  /**
   * 按哪个预选省算的(换了设备时区就重算)。
   */
  prov: string

  /**
   * 算好的推荐。
   */
  rows: PickRow[]
}

/**
 * 本域全部可变状态。
 */
export type MyJobsCache = {
  /**
   * 用户 id → 当天的推荐(一人一天一份)。
   */
  picks: Map<string, PicksEntry>
}

/**
 * 取推荐的返回。
 */
export type PicksOut = Promise<PickRow[]>

/**
 * 推荐清单。
 */
export type PickRows = PickRow[]

/**
 * 推荐理由码清单。
 */
export type ReasonCodes = string[]

/**
 * 碰过的岗的返回。
 */
export type TouchedOut = Promise<number[]>

/**
 * 推荐接口回包的返回。
 */
export type PicksJsonOut = Promise<PicksJson>

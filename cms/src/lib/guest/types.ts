/**
 * 访客域的形状:浏览记录的一条、访客向导草稿、草稿并进答案档的那几格与所在省预选。
 * 形状本域自己声明,不从别的域取(宪法 08-25「types 自声明」)—— 并进答案档的那几格
 * 只声明真写的五格,名字与 lib/quiz 的 Answers 同名同义,结构上对得上它的局部写口。
 *
 * @author Frank
 * @time 2026-10-03 20:10:00
 */

// =========================================================================
// 1. 浏览记录
// =========================================================================

/**
 * 本地存储读出来的原文;键不在 = null。
 */
export type RawText = string | null

/**
 * json 原文解析出来的一格(归一前:本地存储谁都能改,什么形状都可能有)。
 */
export type RawCell = string | number | boolean | null | RawCell[] | { [k: string]: RawCell }

/**
 * json 原文解析出来的一个对象(归一前)。
 */
export type RawDoc = { [k: string]: RawCell }

/**
 * gateDueFor 的入参:登录态(2026-10-04 门槛撤了,这一岗的号与码不再参与判定,只剩这一格)。
 */
export type GateForIn = {
  /**
   * 登录了没(登录用户永远不弹)。
   */
  loggedIn: boolean
}

/**
 * 职业码清单。
 */
export type NocList = string[]

/**
 * 专业码清单(CIP 2021 class 码,至多 MAJOR_PICK_MAX 个,选的先后序;2026-10-05 专业改多选时立)。
 */
export type MajorList = string[]

// =========================================================================
// 2. 访客向导草稿
// =========================================================================

/**
 * 访客向导的由头:点开第 3 个职位(job)、未登录点投递(apply)、未登录点收藏(save)。
 * 2026-10-04 加进站即弹(entry);job 改成未登录点开职位弹框就算。
 * 同日收口加 filter(关掉进站向导后在职位板上改筛选再弹)。
 */
export type GateIntent = 'job' | 'apply' | 'save' | 'entry' | 'filter'

/**
 * 访客向导草稿(本地存储 DRAFT_KEY;每步改动即写,注册后并进 users.answers 再清)。
 * 没答的格是「空」值(0 / 空串 / 空数组 / false),与答案档的「没答」同口径。
 */
export type GateDraft = {
  /**
   * 目标档(答案档 goalBand:1 = 拿 PR、2 = 先找工作);0 = 没答。
   */
  goal: number

  /**
   * 专业大类码('01'…'12');空串 = 没答。
   * 2026-10-04 A2 起存 CIP 2021 class 码(如 '52.0203');A1 没上线,线上没有大类码的旧值,不迁移。
   * 2026-10-05 改多选:格名 major → majors,存码清单(至多 MAJOR_PICK_MAX 个,去重,选的先后序);空列 = 没答。
   * 单值那版(10-04)也没上线,不迁移 —— 本地存着旧 major 串的草稿读回时那一格直接不认(按没答)。
   */
  majors: MajorList

  /**
   * 想做的职业码。
   */
  nocs: NocList

  /**
   * 现在在哪个省(省码);空串 = 没答,或者答的是境外。
   */
  prov: string

  /**
   * 答的是「加拿大境外」。
   */
  abroad: boolean

  /**
   * 这次向导是因为什么弹的。
   */
  intent: GateIntent
}

/**
 * 草稿或没有(没存过 / 存的认不出 = null)。
 */
export type MaybeGateDraft = GateDraft | null

/**
 * readGateSeed 的入参。
 */
export type GateSeedIn = {
  /**
   * 这次向导的由头(没有草稿时新开的那份记它)。
   */
  intent: GateIntent
}

/**
 * 草稿并进答案档的那几格。缺席 = 这一格不动(局部写口的协议语义:跳过的题不许拿空值抹掉旧答案)。
 */
export type GatePatch = {
  /**
   * 目标档。
   */
  goalBand?: number

  /**
   * 专业大类码。2026-10-04 A2 起是 CIP 2021 class 码。
   * 2026-10-05 改多选:格名 major → majors,码清单(与 lib/quiz Answers.majors 同名同义)。
   */
  majors?: MajorList

  /**
   * 想做的职业码。
   */
  nocs?: NocList

  /**
   * 现居省码(境外时写空串)。
   */
  resProv?: string

  /**
   * 处境码(只有答了境外才写 overseas)。
   */
  status?: string
}

// =========================================================================
// 3. 交接
// =========================================================================

/**
 * syncGateDraft 的返回(结果落在本地存储与答案档上)。
 * 2026-10-04 收口审查:改交回「并进去且推上去了没有」—— 补交钩子只在交成了才记「首访引导弹过了」、才回职位板筛
 * (原先交回 void,没交成也照记照换地址栏;票据过期的人还是匿名,却被记成弹过、地址栏被改)。
 */
export type SyncOut = Promise<boolean>

/**
 * isHandoffFresh 的入参(交接戳原文与此刻)。
 */
export type HandoffFreshIn = {
  /**
   * 会话存储里的戳原文;null = 没落过戳。
   */
  raw: RawText

  /**
   * 此刻(毫秒时间戳)。
   */
  now: number
}

/**
 * 访客域的全部可变状态(variables.ts 的 CACHE)。
 */
export type GuestCache = {
  /**
   * 这个页面里刚在访客向导里登录 / 注册成功:软刷把服务端登录态带回来之前分层态还是匿名,
   * 这一格补上那段空档(别在那几百毫秒里又弹一次向导)。登出是整页刷新,这一格随之归零。
   */
  signedIn: boolean
}

// =========================================================================
// 4. 所在省预选
// =========================================================================

/**
 * 所在省那一题的预选:选哪个省,或者选「加拿大境外」;两样都没有 = 不预选。
 */
export type ProvSeed = {
  /**
   * 预选的省码;空串 = 不预选省。
   */
  prov: string

  /**
   * 预选「加拿大境外」。
   */
  abroad: boolean
}

/**
 * gateProvSeedOf 的入参。
 */
export type ProvSeedIn = {
  /**
   * lib/location 的 homeProvinceOf 交回的省码;空串 = 时区对不上省。
   */
  home: string

  /**
   * 设备时区名;空串 = 浏览器没报。
   */
  tz: string
}

// =========================================================================
// 5. 进站
// =========================================================================

/**
 * isEntryGateExempt 的入参:这一页的地址(路径与查询串分开交)。
 */
export type EntryExemptIn = {
  /**
   * 路径(不带查询串)。
   */
  path: string

  /**
   * 查询串(带不带开头的 `?` 都行;没有 = 空串)。
   */
  search: string
}

/**
 * takeEntryGate 的入参:登录态 + 这一页的地址。
 */
export type EntryGateIn = {
  /**
   * 登录了没(登录用户永远不弹)。
   */
  loggedIn: boolean

  /**
   * 路径(不带查询串)。
   */
  path: string

  /**
   * 查询串(没有 = 空串)。
   */
  search: string
}

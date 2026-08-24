/**
 * 配额域的形状 —— **本域自己声明,不从别的域取**。
 *
 * @author Frank
 * @time 2026-08-22 18:00:00
 */

/**
 * 请求头的本地名(库类型先起本地名,签名里不出现外部类型)。
 */
export type ReqHeaders = Headers

/**
 * 请求的本地名(ipOf 只读 headers 那一格)。
 */
export type ReqLike = Request

/**
 * 拦截响应的本地名。
 */
export type GateDeny = 'user402' | 'ip429'

/**
 * 可空的响应素材(denyBodyOf 的返回)。
 */
export type MaybeDenyBody = DenyBody | null

/**
 * 拦截响应的素材(状态码 + 文本;Response 由路由层用 http 叶的 textResponseOf 拼 ——
 * 2026-08-23 收牌批:functions 不造 Response)。
 */
export type DenyBody = {
  /**
   * HTTP 状态码。
   */
  status: number

  /**
   * 响应正文。
   */
  text: string
}

/**
 * 用户档案 json 的一格(users.profile jsonb;形状归 lib/jobs 的 normalizeProfile 消化,
 * 本域只透传)。
 */
export type ProfileCell = string | number | boolean | null | ProfileObj | ProfileCell[]

/**
 * 用户档案 json 对象格。
 */
export type ProfileObj = { [k: string]: ProfileCell }

/**
 * 会话用户(payload-token cookie 解出来的;rows 的 toSessionUser 洗成本形状)。
 */
export type SessionUser = {
  /**
   * 用户 id(payload 的主键,数字或串)。
   */
  id: string | number

  /**
   * 邮箱。
   */
  email: string

  /**
   * 角色;没有则 null。
   */
  role: string | null

  /**
   * Pro 到期日(ISO);没买过则 null。时长包语义:到期日在未来 = Pro,没有订阅状态机。
   */
  proUntil: string | null

  /**
   * 档案 jsonb(答题/匹配那套;本域不读内容,只透传给 jobs 的 normalizeProfile)。
   */
  profile: ProfileObj | null
}

/**
 * 会话用户或没登录。
 */
export type MaybeUser = SessionUser | null

/**
 * `getUser` 的返回。
 */
export type UserOut = Promise<MaybeUser>

/**
 * payload.auth 交回来的用户里本域读的那几格(别人家的对象:缺席格是 undefined,
 * rows 的 `== null` 一网收)。
 */
export type RawUser = {
  /**
   * 用户 id。
   */
  id: string | number

  /**
   * 邮箱。
   */
  email: string | null

  /**
   * 角色。
   */
  role: string | null

  /**
   * Pro 到期日。
   */
  proUntil: string | null

  /**
   * 档案 jsonb。
   */
  profile: ProfileObj | null
}

/**
 * `RawUser` 或没登录(toSessionUser 的入参)。
 */
export type MaybeRawUser = RawUser | null

/**
 * 一个配额位:计数键 + 上限。
 */
export type QuotaPair = [string, number]

/**
 * 配额位的复数(checkLimit 的入参:全有余量才放行并各自 +1)。
 */
export type QuotaPairs = QuotaPair[]

/**
 * 计数桶的一格。
 */
export type Bucket = {
  /**
   * 计数所属的日子(ISO 日期,过日清零)。
   */
  day: string

  /**
   * 今日已用次数。
   */
  n: number
}

/**
 * 配额域全部可变状态的形状(住 variables.ts 的 CACHE)。
 */
export type QuotaCache = {
  /**
   * 进程内日配额计数器(E2-02 公测期防滥用;重启清零可接受,
   * 付费墙上线后按用户配额替代)。单线程事件循环内 check+increment 无竞态。
   */
  buckets: Map<string, Bucket>
}

/**
 * `freeGate` 的入参。
 */
export type FreeGateIn = {
  /**
   * 当前用户;未登录 null(走 IP 池)。
   */
  user: MaybeUser

  /**
   * 请求头(取客户端 IP 用)。
   */
  headers: ReqHeaders
}

/**
 * 响应头键值对。
 */
export type HeaderMap = Record<string, string>

/**
 * 统一闸的裁决。
 */
export type FreeGated = {
  /**
   * 拦截判定(user402=免费池用完 / ip429=匿名池超限);放行则 null。
   * Response 由路由层拼:denyBodyOf(gate) → textResponseOf(2026-08-23 收牌批)。
   */
  deny: GateDeny | null

  /**
   * 免费池剩余次数;Pro 与匿名不给数则 null。
   */
  left: number | null

  /**
   * 随响应带出的头(X-Free-Left;没有则空对象)。
   */
  headers: HeaderMap
}

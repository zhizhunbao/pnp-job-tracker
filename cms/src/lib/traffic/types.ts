/**
 * 流量域的形状。Node 诊断频道的消息只声明真读的格(本域自声明,不 import 库类型)。
 *
 * @author Frank
 * @time 2026-10-01 19:00:00
 */

// =========================================================================
// 2. 记账
// =========================================================================

/**
 * 请求头:头名 → 值(Node 的形状:头可能压根没带,`set-cookie` 这类会是数组;真读的只有浏览器标识与转发地址两格)。
 */
export type FinishHeaders = Record<string, string | string[]>

/**
 * 诊断消息里的请求,真读的两格。
 */
export type FinishRequest = {
  /**
   * 请求路径带查询串(Node 类型把它标成可能缺席)。
   */
  url?: string

  /**
   * 请求头。
   */
  headers: FinishHeaders
}

/**
 * 诊断消息里的连接,真读的一格。
 */
export type FinishSocket = {
  /**
   * 这条连接累计写出去的字节(含响应头;压缩后的真实出站量)。
   */
  bytesWritten: number
}

/**
 * `http.server.response.finish` 频道的消息(Node 文档定死的形状,只声明真读的两格)。
 */
export type FinishMsg = {
  /**
   * 这个响应对应的请求。
   */
  request: FinishRequest

  /**
   * 送这个响应的连接(长连接会被前后多个请求复用,所以按差值算本次字节)。
   */
  socket: FinishSocket
}

/**
 * 洗净的一次响应:三路键都有值、字节已算好。
 */
export type HitFact = {
  /**
   * 截短后的浏览器标识。
   */
  ua: string

  /**
   * 分好桶的路径。
   */
  path: string

  /**
   * 来源地址。
   */
  ip: string

  /**
   * 这次响应写出去的字节。
   */
  bytes: number
}

/**
 * 一个键攒下的账。
 */
export type Tally = {
  /**
   * 响应次数。
   */
  count: number

  /**
   * 出站字节。
   */
  bytes: number
}

/**
 * 一路账本:键 → 账。
 */
export type TallyMap = Map<string, Tally>

/**
 * 往一路账本记一笔要的三样。
 */
export type AddTallyIn = {
  /**
   * 记到哪一路。
   */
  book: TallyMap

  /**
   * 记在哪个键下。
   */
  key: string

  /**
   * 这一笔的字节。
   */
  bytes: number
}

/**
 * 流量域全部可变状态的形状。
 */
export type TrafficCache = {
  /**
   * 诊断频道订过没有(开发热重载会重跑启动钩子,别订两遍)。
   */
  installed: boolean

  /**
   * 每条连接上次记账时的累计字节(连接一断自动回收)。
   */
  sentBy: WeakMap<FinishSocket, number>

  /**
   * 这一小时的总账。
   */
  total: Tally

  /**
   * 按浏览器标识。
   */
  ua: TallyMap

  /**
   * 按路径桶。
   */
  path: TallyMap

  /**
   * 按来源地址。
   */
  ip: TallyMap
}

// =========================================================================
// 3. 出账
// =========================================================================

/**
 * 一路账本出账要的两样。
 */
export type LogBookIn = {
  /**
   * 这一路叫什么(日志里的一路名)。
   */
  name: string

  /**
   * 这一路的账本。
   */
  book: TallyMap
}

/**
 * 账本里的一行:键与账。
 */
export type TallyEntry = {
  /**
   * 浏览器标识 / 路径桶 / 来源地址。
   */
  key: string

  /**
   * 这个键的账。
   */
  tally: Tally
}

/**
 * 出账时排好序的前几行。
 */
export type TallyEntries = TallyEntry[]

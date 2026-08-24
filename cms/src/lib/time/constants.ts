/**
 * time 域的死值:时区、格式与毫秒换算。
 *
 * @author Frank
 * @time 2026-08-24 12:00:00
 */

/**
 * 站点渲染时区 = **渥太华时间**(2026-08-24 Frank 拍板的说法;首都口径,移民主题更自然)。
 * ⚠️ 标识符只能写 'America/Toronto':IANA 时区库里没有 America/Ottawa —— 渥太华与多伦多
 * 同属加拿大东部时区(EST/EDT),两地时间永远一致,这是标识符不是城市偏好。
 *
 * 为什么不跟随访客本地时区(2026-08-24 与 Frank 议定):
 * ① 数据本身是加拿大日期 —— 抽选公布日、职位发布日、政策生效日的官方口径都在东部时区。
 *    北京的访客比这里快 12 小时,跟随本地会让他看到的日期比官方文件晚一天,**拿去对官网对不上**;
 * ② SSR 与水合会打架 —— 服务端按服务器时区渲、浏览器按访客时区渲,两串不一致就是水合错。
 * 相对时间(「已挂 N 天」)不受此限:它按访客的此刻算,那本来就该是他的现在。
 */
export const TZ = 'America/Toronto'

/**
 * 取 'YYYY-MM-DD HH:mm' 这种排序友好格式借的 locale(sv-SE 的日期格式恰好是
 * ISO 顺序 —— 不是给瑞典人看,是借它的格式)。
 */
export const ISO_LOCALE = 'sv-SE'

/**
 * 一天的毫秒数(原先 lib/plan 的 MS_PER_DAY、lib/stripe 的 DAY_MS 与四处裸
 * 86400000 各写各的,2026-08-24 立域时收拢到这一处)。
 */
export const DAY_MS = 86400000

/**
 * ISO 串里日期部分的长度('2026-08-24' = 10;裁到这里就是纯日期)。
 */
export const YMD_LEN = 10

/**
 * ISO 串裁到分钟的长度('2026-08-24T09:30' = 16)。
 */
export const MIN_LEN = 16

/**
 * ISO 串裁到秒的长度('2026-08-24T09:30:15' = 19)。
 */
export const SEC_LEN = 19

/**
 * ISO 里日期与时间的分隔符(退化路径把它换成空格)。
 */
export const ISO_T = 'T'

/**
 * 退化路径里替代 T 的分隔符。
 */
export const SPACE = ' '

/**
 * 把纯日期当**本地零点**解析时补的尾巴:'2026-08-24' 直接 new Date 会按 UTC 零点
 * 解析,在西五区就成了前一天下午 —— 算「挂了几天」会差一天。
 */
export const MIDNIGHT_SUFFIX = 'T00:00:00'

/**
 * 到分格式的字段档位(`Intl.DateTimeFormat` 的选项)。
 * 值是平台定死的枚举字面量,不是我们能起的名字:
 * `'numeric'` = 不补零的数字(年份要 2026 不要 26),`'2-digit'` = 补零到两位
 * (月日时分要 08 不要 8 —— 这一栏是等宽对齐的关键,列表里不补零会参差)。
 * 整块放这儿而不是散在 functions:两个格式只差一个 second,并排放才看得出差在哪。
 */
export const FMT_MIN: Intl.DateTimeFormatOptions = {
  /**
   * 渲染时区,见本文件 TZ。
   */
  timeZone: TZ,

  /**
   * 年:不补零(四位年本来就够宽)。
   */
  year: 'numeric',

  /**
   * 月:补零两位。
   */
  month: '2-digit',

  /**
   * 日:补零两位。
   */
  day: '2-digit',

  /**
   * 时:补零两位(配 sv-SE 出 24 小时制)。
   */
  hour: '2-digit',

  /**
   * 分:补零两位。
   */
  minute: '2-digit',
}

/**
 * 到秒格式:同 FMT_MIN 再加一格秒(「最近看到」列要看到时分秒)。
 * 逐字重复 FMT_MIN 的六格是有意的 —— 常量文件不许有函数,
 * 用展开拼(`...FMT_MIN`)又撞全站禁展开;六行换一个「一眼看全」值得。
 */
export const FMT_SEC: Intl.DateTimeFormatOptions = {
  /**
   * 渲染时区,见本文件 TZ。
   */
  timeZone: TZ,

  /**
   * 年:不补零。
   */
  year: 'numeric',

  /**
   * 月:补零两位。
   */
  month: '2-digit',

  /**
   * 日:补零两位。
   */
  day: '2-digit',

  /**
   * 时:补零两位。
   */
  hour: '2-digit',

  /**
   * 分:补零两位。
   */
  minute: '2-digit',

  /**
   * 秒:补零两位(这一格是它和 FMT_MIN 唯一的差别)。
   */
  second: '2-digit',
}

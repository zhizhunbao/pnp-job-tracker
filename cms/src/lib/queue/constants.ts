/**
 * 智能投递域(lib/queue)的死值(2026-10-08 Frank「找一个最好的直接抄」= 照 AIApply 的 Auto Apply:每天按求职条件挑岗、
 * AI 写好信进「今日待投」,用户逐岗「投出 / 跳过」或 Pro「全部投出」)。表改动 docs/sql/apply-queue-20261008.sql。
 * 域边界:回答「每天替谁投什么」;数据(投递行、简历、署名、写信素材)全是 apply 域的,本域只排队。寿命:随 apply 一起走,
 * 本域死 apply 不动(依赖只指向活得更久的那个)。
 *
 * @author Frank
 * @time 2026-10-08 14:00:00
 */

/**
 * 投递状态:在队列里,信已写好,等用户点「投出」(照 AIApply 的 Preparing to apply;与 lib/apply 的 ST_QUEUED 同字,各域各抄一份)。
 */
export const ST_QUEUED = 'queued'

/**
 * 一轮最多跑多少人。
 */
export const QUEUE_USERS_MAX = 500

/**
 * 每人每轮最多进几岗(照 AIApply 一天几岗的节奏;免费档 AI 信还受一辈子 3 岗的试用账管)。
 */
export const QUEUE_PER_USER = 5

/**
 * 第一次跑往回看多久的新岗(毫秒;36 小时,同盯梢)。
 * 2026-10-08 小白走查改判(困惑分 5):开了对着「今天没有新岗」,而职位页同职业写着 45 个 —— 第一次跑(含每次拨开)
 * 不设时间窗,在架的全算(没投过、按省与评分排);之后每天只看上次之后新上的。36 小时窗退役,改成这个起点。
 */
export const QUEUE_SINCE_ALL = '1970-01-01T00:00:00.000Z'

/**
 * 「同类职业」取 NOC 码前几位(4 = 职业单元组,与职位页「同省同职业」RELATED_SAME_OCC 同一口径)。
 */
export const NOC_GROUP_LEN = 4

/**
 * 「今日待投」一次最多列多少岗。
 */
export const QUEUE_LIST_MAX = 20

/**
 * 四题答案的基础段(answers.basic)。
 */
export const ANS_BASIC = 'basic'

/**
 * 基础段里「想做的工作」那一格(NOC 码)。
 */
export const ANS_NOCS = 'nocs'

/**
 * 基础段里「所在省」那一格(省码)。
 */
export const ANS_PROV = 'resProv'

/**
 * 基础段里「所在城市」那一格(城市英文名,同 cities.name;空串 = 没选。2026-10-09「我的档案」批:所在地答案加的可选城市)。
 */
export const ANS_CITY = 'resCity'

/**
 * 基础段里「目标」那一格(档位数:1 = 拿 PR、2 = 先找工作;与 lib/quiz 的 FIELD_SPECS.goalBand 同值同义,各域各抄一份)。
 */
export const ANS_GOAL = 'goalBand'

/**
 * 目标档「先找工作」的值(2026-10-09「我的档案」批:只有这一档按所在城市的都会区排岗,拿 PR 的照旧全省按评分)。
 */
export const GOAL_JOB_BAND = 2

/**
 * 开关接口的请求体字段。
 */
export const FIELD_AUTO = 'autoQueue'

/**
 * 跑队列那条路由的鉴权头(同 seed / alerts:x-seed-token = SEED_TOKEN)。
 */
export const HDR_SEED_TOKEN = 'x-seed-token'

/**
 * 职位已下架的状态值(jobs.status)。
 */
export const JOB_CLOSED = 'closed'

/**
 * base64(简历原件在库里的编码)。
 */
export const B64 = 'base64'

/**
 * 响应的缓存头:只给本人,哪一层都不许存。
 */
export const CACHE_PRIVATE = 'private, no-store'

/**
 * 错误体:要登录。
 */
export const E_AUTH = 'auth'

/**
 * 错误体:请求体不合形。
 */
export const E_BODY = 'body'

/**
 * 错误体:不在队列里(跳过时找不到那一行)。
 */
export const E_QUEUE = 'queue'

/**
 * 错误体:英文署名不合规(同 apply 域的 name)。
 */
export const E_NAME = 'name'

/**
 * 错误体:信太长(同 apply 域的 long)。
 */
export const E_LONG = 'long'

/**
 * 错误体:信里有写不进 PDF 的字(同 apply 域的 chars)。
 */
export const E_CHARS = 'chars'

/**
 * 空串。
 */
export const TEXT_NONE = ''

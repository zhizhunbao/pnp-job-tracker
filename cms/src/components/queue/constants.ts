/**
 * queue 页面域(/queue 管理员队列页)的死值:门禁角色、条数上限、卡与列的文案、状态词与胶囊配色、时长单位。
 * 文案只有中文 —— 这页只给管理员(Frank)看,不是产品页面(同 /funnel 先例)。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */

/**
 * 能看这页的角色(users.role)。门禁值:拼错不报错,只会把整页对所有人关上 —— 本域自己声明一份(同 funnel)。
 */
export const ROLE_ADMIN = 'admin'

/**
 * 每张卡最多列几条(卡头照样报总条数)。
 */
export const QUEUE_ROWS = 100

/**
 * 全站分区白卡(main.css 全局类)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 全站卡头(main.css 全局类)。
 */
export const CARD_HEAD_CLS = 'mcardHead'

/**
 * 类名拼接符。
 */
export const CLS_SEP = ' '

/**
 * 整页标题。
 */
export const TITLE_TEXT = '队列'

/**
 * 卡标题:ETL 调度单元。
 */
export const SEC_UNITS_TEXT = 'ETL 调度单元'

/**
 * 卡标题:投递待发。
 */
export const SEC_APPLY_TEXT = '投递待发'

/**
 * 卡标题:公司官网抓取。
 */
export const SEC_SITES_TEXT = '公司官网抓取'

/**
 * 卡标题:雇主译名翻译。
 */
export const SEC_ALIAS_TEXT = '雇主译名翻译'

/**
 * 卡里一条都没有。
 */
export const EMPTY_TEXT = '没有排队的'

/**
 * 调度单元卡一条都没有(etl_units 表还没建,或容器还没带上新版上报)。
 */
export const EMPTY_UNITS_TEXT = '还没有单元上报'

/**
 * 卡头计数的尾巴(「12 条」)。
 */
export const COUNT_TAIL = ' 条'

/**
 * 截断时卡头计数的头(「前 100 条,共 230 条」)。
 */
export const SHOWN_HEAD = '前 '

/**
 * 截断时卡头计数的中段。
 */
export const SHOWN_MID = ' 条,共 '

/**
 * 没有这一刻 / 没有这一格。
 */
export const DASH = '—'

/**
 * 空串(库里没给的文字格;胶囊第二枚不出)。
 */
export const TEXT_NONE = ''

/**
 * 列键:名字(单元名 / 公司 / 雇主)。
 */
export const COL_NAME_KEY = 'name'

/**
 * 列键:状态胶囊。
 */
export const COL_STATE_KEY = 'state'

/**
 * 列键:时间(已跑 / 下一轮 / 等了多久)。
 */
export const COL_WHEN_KEY = 'when'

/**
 * 列键:上一轮。
 */
export const COL_LAST_KEY = 'last'

/**
 * 列键:节奏。
 */
export const COL_EVERY_KEY = 'every'

/**
 * 列键:用户邮箱。
 */
export const COL_USER_KEY = 'user'

/**
 * 列键:职位。
 */
export const COL_JOB_KEY = 'job'

/**
 * 列键:公司(投递卡)。
 */
export const COL_COMPANY_KEY = 'company'

/**
 * 列键:归哪个工人。
 */
export const COL_WORKER_KEY = 'worker'

/**
 * 列键:次数(点开 / 被列出)。
 */
export const COL_TIMES_KEY = 'times'

/**
 * 列键:由头。
 */
export const COL_NOTE_KEY = 'note'

/**
 * 列头:单元。
 */
export const COL_UNIT_TEXT = '单元'

/**
 * 列头:状态。
 */
export const COL_STATE_TEXT = '状态'

/**
 * 列头:时间(正在跑的报已跑多久,其余报下一轮还有多久或过点多久)。
 */
export const COL_NEXT_TEXT = '时间'

/**
 * 列头:上一轮。
 */
export const COL_LAST_TEXT = '上一轮'

/**
 * 列头:节奏。
 */
export const COL_EVERY_TEXT = '节奏'

/**
 * 列头:用户。
 */
export const COL_USER_TEXT = '用户'

/**
 * 列头:职位。
 */
export const COL_JOB_TEXT = '职位'

/**
 * 列头:公司。
 */
export const COL_COMPANY_TEXT = '公司'

/**
 * 列头:雇主。
 */
export const COL_EMPLOYER_TEXT = '雇主'

/**
 * 列头:等了多久。
 */
export const COL_WAIT_TEXT = '等了'

/**
 * 列头:归哪个工人。
 */
export const COL_WORKER_TEXT = '工人'

/**
 * 列头:点开次数。
 */
export const COL_OPENS_TEXT = '点开'

/**
 * 列头:被列出次数。
 */
export const COL_SEEN_TEXT = '被列出'

/**
 * 列头:由头。
 */
export const COL_NOTE_TEXT = '由头'

/**
 * 单元状态:正在跑(与 etl/sched 的 STATE_RUN 同值)。
 */
export const UNIT_RUN = 'run'

/**
 * 单元状态:等 LLM 盒子(与 etl/sched 的 STATE_LLM 同值)。
 */
export const UNIT_LLM = 'llm'

/**
 * 过了下一轮的点还这么多秒没开跑 = 失联(容器停了 / 卡死;调度器每 30 秒查一次到点)。
 */
export const LOST_S = 600

/**
 * 胶囊:正在跑。
 */
export const TAG_RUN_TEXT = '正在跑'

/**
 * 胶囊:排队等下一轮。
 */
export const TAG_WAIT_TEXT = '排队'

/**
 * 胶囊:等 LLM 盒子。
 */
export const TAG_LLM_TEXT = '等盒子'

/**
 * 胶囊:失联。
 */
export const TAG_LOST_TEXT = '失联'

/**
 * 胶囊:上一轮失败。
 */
export const TAG_FAIL_TEXT = '上轮失败'

/**
 * 投递状态:待投(与 lib/apply 的 ST_QUEUED 同值)。
 */
export const APPLY_QUEUED = 'queued'

/**
 * 正在发超过这么多秒 = 发信半路死了(投递那头 10 分钟后当草稿收回,同一个数)。
 */
export const STUCK_S = 600

/**
 * 胶囊:待投。
 */
export const TAG_QUEUED_TEXT = '待投'

/**
 * 胶囊:正在发。
 */
export const TAG_SENDING_TEXT = '正在发'

/**
 * 胶囊:卡住。
 */
export const TAG_STUCK_TEXT = '卡住'

/**
 * 官网工种的阶段 → 胶囊文字。
 */
export const STAGE_TEXT: Record<string, string> = {
  /**
   * 排队中。
   */
  queued: '排队中',

  /**
   * 查找官网。
   */
  find: '查找官网',

  /**
   * 抓取官网。
   */
  fetch: '抓取官网',

  /**
   * 整理内容。
   */
  facts: '整理内容',
}

/**
 * 官网工种:还在排队的那一档(胶囊灰,其余三档是在办,胶囊蓝)。
 */
export const STAGE_QUEUED = 'queued'

/**
 * 胶囊:人工核定过,两个工人都不取。
 */
export const TAG_CURATED_TEXT = '已核定不取'

/**
 * 工人:没官网的归找官网(findsite)。
 */
export const WORKER_FIND_TEXT = '找官网'

/**
 * 工人:有官网的归抓官网(visit)。
 */
export const WORKER_VISIT_TEXT = '抓官网'

/**
 * 次数的尾巴(「3 次」)。
 */
export const TIMES_TAIL = ' 次'

/**
 * 胶囊配色:正在办。
 */
export const VAR_INFO = 'info'

/**
 * 胶囊配色:排着。
 */
export const VAR_GRAY = 'gray'

/**
 * 胶囊配色:等外部。
 */
export const VAR_WARN = 'warn'

/**
 * 胶囊配色:出事了。
 */
export const VAR_BAD = 'bad'

/**
 * 一分钟的秒数。
 */
export const MINUTE_S = 60

/**
 * 一小时的秒数。
 */
export const HOUR_S = 3600

/**
 * 一天的秒数。
 */
export const DAY_S = 86400

/**
 * 时长单位:秒。
 */
export const UNIT_SEC_TEXT = ' 秒'

/**
 * 时长单位:分钟。
 */
export const UNIT_MIN_TEXT = ' 分钟'

/**
 * 时长单位:小时。
 */
export const UNIT_HOUR_TEXT = ' 小时'

/**
 * 时长单位:天。
 */
export const UNIT_DAY_TEXT = ' 天'

/**
 * 「多久以前」的尾巴。
 */
export const AGO_TAIL = '前'

/**
 * 「多久以后」的尾巴。
 */
export const IN_TAIL = '后'

/**
 * 正在跑的单元「已跑多久」的头。
 */
export const RAN_HEAD = '已跑 '

/**
 * 过了下一轮的点还没开跑「过点多久」的头。
 */
export const LATE_HEAD = '过点 '

/**
 * 节奏的头(「每 1 小时」)。
 */
export const EVERY_HEAD = '每 '

/**
 * 更新时刻没拿到(Updated 见空串不渲)。
 */
export const ISO_NONE = ''

/**
 * 调度单元表的最小宽(窄屏横滚,不挤成竖排;同「我的通道」表的做法)。
 */
export const UNITS_MIN_W = 560

/**
 * 投递待发表的最小宽(邮箱、职位、公司三列长字,窄屏横滚)。
 */
export const APPLY_MIN_W = 760

/**
 * 官网抓取表的最小宽(六列,窄屏横滚)。
 */
export const SITES_MIN_W = 760

/**
 * 译名翻译表的最小宽(三列,窄屏横滚)。
 */
export const ALIAS_MIN_W = 420

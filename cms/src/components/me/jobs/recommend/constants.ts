/**
 * me 桶子桶 jobs 的子桶 recommend —— 「今日推荐」这一页签的死值(与父桶同值的各自抄)。
 * 2026-10-12 Frank「你分的那些都不算子领域」「recommend 吧」:推荐原因、通道名、显示更多 / 打码行、推荐取数是「今日推荐」这一节,
 * 并成一个子桶(判据:页面上的一节)。2026-11-07 随「我的求职」在新域重写(父桶 functions 过 1000 行闸,照旧切出这一族)。
 * 2026-11-09 Frank「推荐原因删掉」:理由码词条表与胶囊档撤。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 今日推荐接口(2026-10-10 批 2;后接 `?prov=` 浏览器按时区预选的省码)。
 */
export const URL_PICKS = '/api/myjobs/picks?prov='

/**
 * 今日推荐接口「不用当天缓存、现算一份」的尾巴(2026-10-11「进我的求职先弹五题」:答完档案重拉要按新答案推)。
 */
export const URL_PICKS_FRESH = '&fresh=1'

/**
 * 请求带 cookie(登录态)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 中位时薪显示串的头(货币号;2026-11-09 Frank「这部分加进 table 吧」「这个地方都显示 时薪吧」)。
 */
export const MED_HEAD = '$'

/**
 * 中位时薪显示串的尾(每小时,同职位板「中位时薪」列)。
 */
export const MED_TAIL = '/hr'

/**
 * vs 中位高于或持平时的加号。
 */
export const VS_PLUS = '+'

/**
 * vs 中位的百分号。
 */
export const VS_PCT = '%'

/**
 * 推荐指数的档 → 胶囊色档(高绿、中蓝、低灰)。
 */
export const FIT_TAG_VARIANT: Record<string, 'ok' | 'info' | 'gray'> = {
  /**
   * 高。
   */
  high: 'ok',

  /**
   * 中。
   */
  mid: 'info',

  /**
   * 低。
   */
  low: 'gray',
}

/**
 * 推荐指数档的词条键头。
 */
export const FIT_LEVEL_KEY = 'mj.fit.lv.'

/**
 * 推荐指数各项项名的词条键头。
 */
export const FIT_LABEL_KEY = 'mj.fit.k.'

/**
 * 推荐指数各项说明一句的词条键头。
 */
export const FIT_NOTE_KEY = 'mj.fit.n.'

/**
 * 说明一句词条键里项与结论之间的点。
 */
export const FIT_KEY_SEP = '.'

/**
 * 查不到色档时的胶囊色档(灰)。
 */
export const FIT_VARIANT_NONE = 'gray'

/**
 * 回包没带目标时按的目标(找工作;任务书第 41 条的默认)。
 */
export const GOAL_DEFAULT = 'job'

/**
 * 要补的档案项名字的词条键头。
 */
export const NEED_KEY = 'mj.need.'

/**
 * 几项之间的分隔符的词条键(同补全档案提示条)。
 */
export const NEED_SEP_KEY = 'mj.fillSep'

/**
 * 上报「点了今天推的这一岗」的接口(2026-11-11 任务书第 48 条)。
 */
export const URL_PICK_ACT = '/api/myjobs/picks'

/**
 * 上报用的 HTTP 方法。
 */
export const METHOD_POST = 'POST'

/**
 * JSON 请求体的类型头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 请求体的 MIME。
 */
export const MIME_JSON = 'application/json'

/**
 * 上报的动作词:点了。
 */
export const ACT_CLICK = 'click'

/**
 * 推荐表里职位名链接的选择器(name 桶的 JobName:href 以 /jobs/ 开头)。
 */
export const JOB_LINK_SEL = 'a[href^="/jobs/"]'

/**
 * 职位页地址的头(后面是职位 id)。
 */
export const JOB_HREF_HEAD = '/jobs/'

/**
 * 链接的地址属性名。
 */
export const ATTR_HREF = 'href'

/**
 * 投递入口:今日推荐(与父桶的 FROM_PICKS 同值,各自抄;从这里点投递再上报一次点击)。
 */
export const FROM_PICKS = 'picks'

/**
 * 目标:拿 PR(回包 goal 的值;要点里第一条写「硬性条件符合」)。
 */
export const GOAL_PR = 'pr'

/**
 * 一项结论的胶囊词条键尾:需自行核对(这种硬性条件单列一条要点)。
 */
export const TAG_CHECK = 'check'

/**
 * 一项结论的说明键尾:缺数据(这种不列要点)。
 */
export const NOTE_NONE = 'none'

/**
 * 要点词条键:硬性条件符合。
 */
export const FIT_HARD_KEY = 'mj.fit.b.hard'

/**
 * 要点词条键:某一项需自行核对(填词 k = 项名)。
 */
export const FIT_CHECK_KEY = 'mj.fit.b.check'

/**
 * 胶囊上的箭头:要点收着。
 */
export const FIT_MARK_CLOSED = ' ▾'

/**
 * 胶囊上的箭头:要点展开着。
 */
export const FIT_MARK_OPEN = ' ▴'

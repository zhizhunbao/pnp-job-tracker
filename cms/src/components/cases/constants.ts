/**
 * cases 域(处境页)的死值:i18n 键头、地址、埋点事件名、版式档位与引号记号。
 * 2026-08-27 换装批自 Case.tsx / Cases.tsx 的散值收拢挂注释。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */

/**
 * 处境文案的 i18n 键头(`case.<id>.label` / `case.<id>.q` / 运营 bullet 的
 * case.ops.* 都在这个前缀下)。lib/ruling 侧另有一份同义键头(跨域不互相取常量,
 * 各家一份)。
 */
export const CASE_KEY_HEAD = 'case.'

/**
 * 处境标签键的尾巴(索引行与详情页 H1 用同一条文案 —— 两处叫法必须一致)。
 */
export const CASE_LABEL_TAIL = '.label'

/**
 * 用户原话键的尾巴(详情页引号卡;原话一个字不改)。
 */
export const CASE_Q_TAIL = '.q'

/**
 * 档位标签的键头(`case.tier0` ~ `case.tier3`;没有档位的按 0 读,
 * 与改造前 `tier ?? 0` 同口径)。
 */
export const TIER_KEY_HEAD = 'case.tier'

/**
 * 省全名的键头(`prov.<两字码>`;键查不到时回退显示码本身 —— 宁露码不露键名)。
 */
export const PROV_KEY_HEAD = 'prov.'

/**
 * 联邦通道的省位记号(不是省,单独走 `dp.federal` 文案)。
 */
export const FED_CODE = 'FED'

/**
 * 处境详情页的地址前缀(拼上 `CASES.page` 的 slug;slug 单一来源在那张表,
 * 两边各写一份就会出死链)。
 */
export const URL_CASE_HEAD = '/cases/'

/**
 * 「测测我自己的」CTA 的去处(决策页直接开答题)。
 */
export const URL_QUIZ = '/plan/pr?quiz=1'

/**
 * 详情页右上返回的去处(处境页从决策页来,回决策页)。
 */
export const URL_BACK = '/plan/pr'

/**
 * 索引行「完整案例」点击的埋点事件名(E7-02;打错是静默丢数)。
 */
export const EV_INDEX_PAGE = 'cases-index-page'

/**
 * 详情页 CTA 点击的埋点事件名。
 */
export const EV_TO_QUIZ = 'case-to-quiz'

/**
 * 其余路径摊开几条再折叠(走查 #299:整页太长,英文态 5.5k px ——
 * 前 5 条直出、其余收进 details;第 6 条往后都是「更慢或更难」的)。
 */
export const HEAD_N = 5

/**
 * 每条路径最多摆几条判定理由(多了淹没主干;官方原文收在 details 里不占行)。
 */
export const REASONS_MAX = 4

/**
 * 判定理由里「还差信息」那档的记号(索引页与详情页都不出它 —— 页面是给答案的,
 * 不是出题的)。
 */
export const KIND_NEEDS_INFO = 'needs-info'

/**
 * 判定结论「排除」的记号(徽章走红档、理由归红色)。
 */
export const VERDICT_EXCLUDED = 'excluded'

/**
 * 年份形态的期次(纯年份 = 年报的**年末快照**;带日期 = 当天的**实时池**。
 * 两者差着一年,套同一句话就等于把去年的数说成今天的 —— 2026-08-11 接 MB 实拍撞到)。
 */
export const YEAR_RE = /^\d{4}$/

/**
 * 批准率保留一位小数的两枚刻度(round(x × 1000) / 10 = 百分数一位小数)。
 */
export const PCT_TENTH_SCALE = 1000

/**
 * 批准率一位小数的除数(与 PCT_TENTH_SCALE 配对)。
 */
export const PCT_TENTH_DIV = 10

/**
 * 中文态的开引号(引号跟语言走:中文用「」,英韩用弯引号 ——
 * 英文句子外面套全角方头括号是明显的中文味;2026-08-11「用户原话」标签撤掉,
 * 引号自己就说明了)。
 */
export const QUOTE_ZH_OPEN = '「'

/**
 * 中文态的闭引号。
 */
export const QUOTE_ZH_CLOSE = '」'

/**
 * 英韩态的开弯引号。
 */
export const QUOTE_OPEN = '“'

/**
 * 英韩态的闭弯引号。
 */
export const QUOTE_CLOSE = '”'

/**
 * 中文语言码(引号分叉的判据)。
 */
export const LANG_ZH = 'zh'

/**
 * 切不出东西时的空文本(运营期次缺席时的插值兜底)。与 account 域同名同义,各家一份。
 */
export const TEXT_NONE = ''

/**
 * 池子 bullet:期次缺席时的键(只报池内人数)。
 */
export const OPS_POOL_KEY = 'case.ops.pool'

/**
 * 池子 bullet:期次是纯年份时的键(年报的年末快照,MB 形态)。
 */
export const OPS_POOL_AT_KEY = 'case.ops.poolAt'

/**
 * 池子 bullet:期次带日期时的键(当天的实时池,AB 形态)。
 */
export const OPS_POOL_ON_KEY = 'case.ops.poolOn'

/**
 * 索引页 banner 的模块档(banner 域按模块配图与配色;处境页归 pathways 族)。
 */
export const BANNER_MODULE = 'pathways'

/**
 * 工作机会 bullet 的固定列表 key(一条通道里它至多一条)。
 */
export const OPENING_KEY = 'opening'

/**
 * 新窗口打开的 target 值(官方来源链接在新页开,不打断读判定的动线)。
 */
export const TARGET_BLANK = '_blank'

/**
 * 第一步两列表省名格的 key 尾巴(同一省两格,key 要区分)。
 */
export const CELL_PROV_TAIL = 'p'

/**
 * 第一步两列表数字格的 key 尾巴。
 */
export const CELL_NUM_TAIL = 'n'

/**
 * 理由 bullet 的 key 头(按下标编 key:同一通道里同一措辞键可能出现两次 ——
 * pv.fedLangOk 实撞,措辞键当 key 会重)。
 */
export const REASON_KEY_HEAD = 'r'

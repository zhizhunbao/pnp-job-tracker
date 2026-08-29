/**
 * pnp 域(省提名与联邦 EE 的事实区块)的死值:通道改制登记、EE 休眠门槛、联邦轮次的
 * 类型色与展开档、AIP 公司名归一的正则、判定与清单用到的档位串,外加地址、埋点名与记号。
 * 2026-08-28 换装批自 Pnp.tsx 的散值收拢挂注释(值一个不改)。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */

/**
 * 通道改制登记。Frank 2026-07-26 二拍:「老的历史记录删了吧,改成最新的打分规则」——
 * 上一版是灰化保留改制前的抽选行,实测整块被 8 条已关闭通道的历史占满,新规则反而看不见。
 * 现在:**改制日之前的抽选行直接不渲染**(它们属于已不存在的通道,不是本省现在的行情),改列现行规则。
 * ON 事实源(ontario.ca 实核 2026-07-26):O.Reg 422/17 修订 2026-06-25 生效,原 8 条流全部废止,
 * 只剩 Ontario Workforce Priority 一条(按 job offer 的 TEER 分档,全部 TEER 均有路径,另有自雇医生路径);
 * 新 EOI 系统官方称「今夏晚些时候开放」,旧 EOI 池已关闭不再发邀请 → 现阶段无抽选可列。
 * 规则行是**人工登记的政策事实**(同 on-workforce-priority.json 的性质);再多一两个省就该下沉数据层。
 * 每对是「项的文案键 · 内容的文案键」,渲染时按两列左对齐铺开。
 */
export const STREAM_REFORM: Record<string, {
  /**
   * 改制生效日(`YYYY-MM-DD`):这一天之前的抽选行不再列出。
   */
  since: string

  /**
   * 现行规则的文案键对(项的键 · 内容的键),按两列左对齐铺开。
   */
  rules: [string, string][]
}> = {
  /**
   * 安大略:2026-06 改制,原 8 条流废止。
   */
  ON: {
    since: '2026-06-01',
    rules: [['pnpdraws.on.k1', 'pnpdraws.on.v1'], ['pnpdraws.on.k2', 'pnpdraws.on.v2'],
      ['pnpdraws.on.k3', 'pnpdraws.on.v3'], ['pnpdraws.on.k4', 'pnpdraws.on.v4']],
  },
}

/**
 * EE 类别「休眠」的月数门槛(Frank 2026-07-26「ee stem 好久没有抽人了吧」——
 * 实核:STEM 上次 2024-04、运输 2024-03、教育 2025-09)。12 个月内有抽选=活跃;超过=休眠。
 */
export const EE_DORMANT_MONTHS = 12

/**
 * 一个月按多少天折算(月数门槛换成毫秒时的平均天数,不做日历精算)。
 */
export const MONTH_DAYS = 30.4

/**
 * 联邦轮次类型 → 显示色(一类一色)。轮次类型是**数据**不是版式,所以留在 tsx 走内联色,
 * 几何全在 pnp.module.css(判定与分工写在 main.css 第 16 段的原注释里)。
 */
export const FED_TYPE_COLOR: Record<string, string> = {
  /**
   * 加拿大经验类(CEC):蓝。
   */
  cec: '#2563eb',

  /**
   * 法语类:紫。
   */
  french: '#7c3aed',

  /**
   * 省提名类:墨绿。
   */
  pnp: '#0f766e',

  /**
   * 通用轮次:灰。
   */
  general: '#4b5563',

  /**
   * 联邦技术移民(FSW):灰。
   */
  fsw: '#4b5563',

  /**
   * 联邦技工(FST):灰。
   */
  fst: '#4b5563',
}

/**
 * 非「按职业类别」的轮次类型(联邦轮次按它分桶:在表里的按本名成桶,不在的并进职业类别桶)。
 */
export const FED_PROGRAM = ['cec', 'french', 'pnp', 'general', 'fsw', 'fst']

/**
 * 弹框先给最近几轮(#123 教训:别把全量塞进弹框)。
 */
export const FED_SHOW = 6

/**
 * 展开后最多给几轮(与 FED_SHOW 一起构成「先给 N 轮 + 可展开」)。
 */
export const FED_MAX = 20

/**
 * 职业类别轮次的桶键(不在 FED_PROGRAM 里的类型都并进这一桶)。
 */
export const FED_CAT_KEY = '__cat'

/**
 * 职业类别桶与未登记轮次类型在**行**上的色(琥珀)。
 */
export const COLOR_CAT = '#b45309'

/**
 * 未登记轮次类型在**口径注**上的兜底色(灰)。
 */
export const COLOR_FED_OTHER = '#4b5563'

/**
 * 公司名里的组织形式后缀(镜像 etl/clean/05c_flag_aip.py 的 norm_name)。
 */
// eslint-disable-next-line @stylistic/max-len -- 一条正则就是一个值:词表断行会变成两个不同的正则,与 etl 那份镜像当场脱节
export const AIP_SUFFIX_RE = /\b(inc|incorporated|ltd|limited|llp|llc|corp|corporation|co|company|enr|ltee|ltée|holdings?|group|services?|enterprises?)\b\.?/gi

/**
 * 「经营名」分隔(o/a、dba、d/b/a):只取分隔前那一段当正名。
 */
export const AIP_ALIAS_RE = /\bo\/a\b|\bdba\b|\bd\/b\/a\b/

/**
 * 归一时要抹掉的字符(只留小写字母、数字、& 与空格)。
 */
export const AIP_DROP_RE = /[^a-z0-9& ]/g

/**
 * 连续空白(归一时压成单个空格)。
 */
export const SPACE_RUN_RE = /\s+/g

/**
 * 单个空格(抹字符与压空白时的替换值)。
 */
export const SPACE = ' '

/**
 * 大西洋四省(AIP 的适用范围;不在其中的省 AIP 一律不适用)。
 */
export const ATLANTIC_PROVS = ['NL', 'NB', 'NS', 'PE']

/**
 * 先同雇主干满 6 个月才走得通的普通通道省(TEER 4-5 的「凭什么」分档之一;
 * 省集合镜像 etl/08_score.UNIVERSAL_*_PROVS)。
 */
export const COND_PROVS = ['MB', 'NS', 'NB', 'PE']

/**
 * 大西洋试点(AIP)的项目名。
 */
export const PROGRAM_AIP = 'AIP'

/**
 * 省提名的项目名(数据层空档在映射时落它)。
 */
export const PROGRAM_PNP = 'PNP'

/**
 * 魁省省码(走自己的体系,不属 PNP)。
 */
export const PROV_QC = 'QC'

/**
 * 纽芬兰省码(TEER 4-5 有 offer 即可,是「凭什么」的单独一档)。
 */
export const PROV_NL = 'NL'

/**
 * 联邦行的省码(pnp_draws 里 province=FED 的行就是 EE 轮次,零新表)。
 */
export const PROV_FED = 'FED'

/**
 * 通告行(如 ON 2026-06 改制):渲染成跨列的一条通告,不是抽选。
 */
export const KIND_NOTICE = 'notice'

/**
 * 抽选行。
 */
export const KIND_DRAW = 'draw'

/**
 * 排除清单的类型名(省里逐条点名「这些职业不受理」的那种表)。
 */
export const TYPE_INELIGIBLE = 'ineligible'

/**
 * 技能岗的 TEER 上限(0-3 算技能岗)。
 */
export const TEER_SKILLED_MAX = 3

/**
 * 中文界面的语言码(英文流名的中文灰注只在它下面出)。
 */
export const LANG_ZH = 'zh'

/**
 * 省名文案键的前缀(拼省码取人话省名)。
 */
export const PROV_KEY_HEAD = 'prov.'

/**
 * 匹配档文案键的前缀(拼 high/mid/low/na 取档名)。
 */
export const MATCH_LEVEL_HEAD = 'match.'

/**
 * 「没有」的空文本(不出灰注、不出话术时的值)。各域一份。
 */
export const TEXT_NONE = ''

/**
 * 空值符(数据这一格官方没给)。
 */
export const DASH = '—'

/**
 * 类名之间的分隔。
 */
export const CLS_SEP = ' '

/**
 * 已展开的折叠记号。
 */
export const CARET_OPEN = '▴'

/**
 * 已收起的折叠记号。
 */
export const CARET_CLOSED = '▾'

/**
 * 带 tooltip 的判定后面那枚记号(鼠标悬停才有更多话)。
 */
export const TIP_MARK = ' ⓘ'

/**
 * 「不适用」那一档的图标位:一个点(没有结论可给,也不摆判定图标)。
 */
export const DOT_MARK = '·'

/**
 * 把日期串补成当天零点(判 EE 休眠时要拿它算毫秒差,不补时区解析口径会跟着浏览器跑)。
 */
export const DAY_START_SUFFIX = 'T00:00:00'

/**
 * 灰注与主文案之间的全角空格(#175 Frank「这种还是不要用括号了」:译名不再括号包,改灰注跟在后面)。
 */
export const NOTE_GAP = '　'

/**
 * 职业码前缀(NOC 码当同行行尾灰注,不另起行)。
 */
export const NOC_HEAD = 'NOC '

/**
 * 技能层级前缀。
 */
export const TEER_HEAD = 'TEER '

/**
 * 年薪的货币号。
 */
export const SALARY_HEAD = '$'

/**
 * 年薪的单位(整千显示)。
 */
export const SALARY_TAIL = 'K/yr'

/**
 * 年薪折算成整千的除数。
 */
export const SALARY_DIV = 1000

/**
 * 职位板按公司名搜索的地址头(「看这家公司的岗」)。
 */
export const URL_JOBS_Q_HEAD = '/?q='

/**
 * 动态详情页的地址头。
 */
export const URL_NEWS_HEAD = '/news/'

/**
 * 决策页的地址头(判定卡入口带上本岗 id)。
 */
export const URL_PLAN_PR_HEAD = '/plan/pr?job='

/**
 * 新开页的 target(站内长页与外站一律新开,rel 由 button 族补)。
 */
export const TARGET_BLANK = '_blank'

/**
 * 新开页的记号(↗ = 新开页惯例,跟在钮文字后面)。
 */
export const LINK_ARROW = ' ↗'

/**
 * 雇主线点击的埋点名。
 */
export const EV_EMPLOYER_CLICK = 'pnp-employer-click'

/**
 * 判定卡入口点击的埋点名。
 */
export const EV_TV_ENTRY = 'tv-entry'

/**
 * 判定卡入口埋点的 kind 值(从省提名弹框点进去的那一路)。
 */
export const TV_KIND_PNP = 'pnp'

/**
 * 担保引流卡的来源:省提名弹框(有凭证才出卡的那一路)。
 */
export const SRC_PNP = 'pnp'

/**
 * 高亮行滚进视野的档位:就近滚,尽量不动整个弹框。
 */
export const SCROLL_BLOCK = 'nearest'

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 历史轮次多于一轮才给展开箭头(#135:拿不到行的类别不出箭头,没东西可展开就别给假入口)。
 */
export const HIST_EXPANDABLE_MIN = 2

/**
 * 清单兜底:即便一条都没命中,也至少显这么多条。
 */
export const ROWS_FALLBACK = 1

/**
 * 现行规则表的列数(项 | 内容 两列左对齐)。
 */
export const REFORM_COLS = 2

/**
 * 抽选卡里出不出类别名的门槛:展示的类别多于一个才出(只有一个时卡头已经说清是谁)。
 */
export const MULTI_CAT_MIN = 2

/**
 * 依据链一格里几行起算「多行」:多行的格一行一块,单行的格就地铺开。
 */
export const CELL_MULTI_MIN = 2

/**
 * 细边框盒的留白档:不留(卡里紧贴标题的那层)。
 */
export const BOX_GAP_NONE = 'none'

/**
 * 细边框盒的留白档:只往上留(跟在一段文字后面的列表)。
 */
export const BOX_GAP_TOP = 'top'

/**
 * 细边框盒的留白档:上下都留(夹在两段之间的历史轮次)。
 */
export const BOX_GAP_BOTH = 'both'

/**
 * 本省最新公告最多摆几条(只摆标题与日期的事实行,不解读)。
 */
export const NEWS_LATEST_MAX = 2

/**
 * 判定档:能走(绿)。
 */
export const TONE_OK = 'ok'

/**
 * 判定档:提示(琥珀)。
 */
export const TONE_WARN = 'warn'

/**
 * 判定档:排除(红)。
 */
export const TONE_FAIL = 'fail'

/**
 * 判定档:不适用(灰)。
 */
export const TONE_NA = 'na'

/**
 * 依据链判定档:符合(绿)。
 */
export const TONE_PASS = 'pass'

/**
 * AIP 直判:雇主在指定名单上。
 */
export const AIP_ON = 'on'

/**
 * AIP 直判:大西洋省,但雇主不在指定名单上。
 */
export const AIP_MISS = 'miss'

/**
 * AIP 直判:非大西洋省,这条通道不适用。
 */
export const AIP_NA = 'na'

/**
 * 官方这一格没给数时的问号(拼进话术,不折成 0 —— 折 0 = 替官方编数)。
 */
export const UNKNOWN_MARK = '?'

/**
 * 多个命中类别之间的连接号。
 */
export const CAT_JOIN = '/'

/**
 * 拼 React 列表键时的分隔。
 */
export const KEY_SEP = '-'

/**
 * 技能层级的窄位前缀(清单行里只给一个字母 + 数字)。
 */
export const TEER_SHORT_HEAD = 'T'

/**
 * 依据链规则:职业码。
 */
export const RULE_NOC = 'noc'

/**
 * 依据链规则:省提名。
 */
export const RULE_PROV = 'prov'

/**
 * 依据链规则:联邦 EE。
 */
export const RULE_EE = 'ee'

/**
 * 依据链规则:技能层级。
 */
export const RULE_TEER = 'teer'

/**
 * 依据链规则:薪资。
 */
export const RULE_WAGE = 'wage'

/**
 * 依据链规则:雇主 LMIA 记录。
 */
export const RULE_LMIA = 'lmia'

/**
 * 依据链键:本岗未匹配 NOC。
 */
export const KEY_NOC_UNCAT = 'match.r.noc.jobUncat'

/**
 * 依据链键:档案里没填职业码。
 */
export const KEY_NOC_NOPROFILE = 'match.r.noc.noProfile'

/**
 * 依据链键:职业码完全一致。
 */
export const KEY_NOC_EXACT = 'match.r.noc.exact'

/**
 * 依据链键:同中类职业码。
 */
export const KEY_NOC_MINOR = 'match.r.noc.minor'

/**
 * 依据链键:本岗不在目标省。
 */
export const KEY_PROV_NOTTARGET = 'match.r.prov.notTarget'

/**
 * 依据链键:魁省不参加 PNP。
 */
export const KEY_PROV_QC = 'match.r.prov.qc'

/**
 * 依据链键:省清单点名了本岗职业。
 */
export const KEY_PROV_NAMED = 'match.r.prov.named'

/**
 * 依据链键:省清单把本岗职业排除在外。
 */
export const KEY_PROV_EXCLUDED = 'match.r.prov.excluded'

/**
 * 依据链键:走通用档(省不设职业清单)。
 */
export const KEY_PROV_GENERIC = 'match.r.prov.generic'

/**
 * 依据链键:本省清单没覆盖到这个职业。
 */
export const KEY_PROV_UNCOVERED = 'match.r.prov.uncovered'

/**
 * 依据链键:本岗不属任何 EE 类别。
 */
export const KEY_EE_NONE = 'match.r.ee.none'

/**
 * 依据链键:所属类别近期没有抽选。
 */
export const KEY_EE_NODRAW = 'match.r.ee.noDraw'

/**
 * 依据链键:档案里没填 CRS。
 */
export const KEY_EE_NOCRS = 'match.r.ee.noCrs'

/**
 * 依据链键:CRS 高于该类别上次抽选线。
 */
export const KEY_EE_ABOVE = 'match.r.ee.above'

/**
 * 依据链键:TEER 达到技能岗档。
 */
export const KEY_TEER_OK = 'match.r.teer.ok'

/**
 * 依据链键:低 TEER 但有专门通道。
 */
export const KEY_TEER_CHANNEL = 'match.r.teer.channel'

/**
 * 依据链键:高于当地中位工资。
 */
export const KEY_WAGE_ABOVE = 'match.r.wage.above'

/**
 * 依据链键:与当地中位工资相当。
 */
export const KEY_WAGE_NEAR = 'match.r.wage.near'

/**
 * 依据链键:低于当地中位工资。
 */
export const KEY_WAGE_BELOW = 'match.r.wage.below'

/**
 * 依据链键:雇主没有 LMIA 记录。
 */
export const KEY_LMIA_NA = 'match.r.lmia.na'

/**
 * 依据链键:雇主只有低薪股 LMIA 记录。
 */
export const KEY_LMIA_LOWONLY = 'match.r.lmia.lowOnly'

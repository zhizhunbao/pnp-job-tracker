/**
 * start 域(/start 就业把脉首页)的死值:地址与锚点、样本门槛、窗口与缓存时长、
 * 记号与前缀、以及榜单行序表。2026-08-28 换装批自 Pulse.tsx 与 start/page.tsx
 * 的散值收拢挂注释(值一个不改)。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */

/**
 * 职位板首页(脉象卡与 CTA 的去处)。
 */
export const URL_HOME = '/'

/**
 * 职位板按 PNP 可走筛选(命中率那张脉象卡的去处)。
 */
export const URL_HOME_PNP = '/?pnp=yes'

/**
 * 职位板按职业码筛选的地址头(每行可溯源:职业名点开落到按该 NOC 筛过的职位板)。
 */
export const URL_HOME_Q_HEAD = '/?q='

/**
 * 移民动态列表页(政策动态标题旁那条外链,也是无 slug 时的兜底去处)。
 */
export const URL_NEWS = '/news'

/**
 * 橱窗三分表全量接口。#313(LCP 7.15s 真因):三表全量 16,430 行序列化进 RSC payload
 * 把 SSR 文档撑到 6.92MB ——「全量可翻页」拍板不动,只换运输方式:SSR 只带每表前
 * SE_SSR_ROWS 行 + total,挂载后拉这条接口换全量(手法照 occ 大表的 /api/stats/market)。
 */
export const URL_SPONSORS_API = '/api/employers/sponsors'

/**
 * 锚点地址的头(拼上分区 id)。
 */
export const ANCHOR_HEAD = '#'

/**
 * 雇主橱窗区的锚点 id。
 */
export const ID_SE = 'pl-se'

/**
 * 职业榜区的锚点 id。
 */
export const ID_BOARDS = 'pl-boards'

/**
 * 分省概览区的锚点 id。
 */
export const ID_PROV = 'pl-prov'

/**
 * 省内职业榜区的锚点 id。
 */
export const ID_PROVOCC = 'pl-provocc'

/**
 * 城市概览区的锚点 id(2026-09-04 新段)。
 */
export const ID_CITY = 'pl-city'

/**
 * 趋势区的锚点 id(2026-09-04 新段:全国一条线 + 行业小图)。
 */
export const ID_TREND = 'pl-trend'

/**
 * 二级导航条上的六个分区 id(顺序即条上的顺序;分区可能条件不渲,取元素时空安全)。
 * 2026-09-04 重排:职业 → 雇主 → 省份 → 城市 → 趋势(LMIA 段 09-05 并回雇主段的没工签档;抽选段不进导航)。
 */
export const NAV_IDS = [ID_BOARDS, ID_SE, ID_PROV, ID_CITY, ID_TREND]

/**
 * 滚动跟随的判定线(px):当前分区 = 顶部粘条下沿以上最后一个分区标题。
 */
export const NAV_TOP_LINE = 96

/**
 * 滚动监听的事件名(打错是静默失效 —— 监听器绑不上不报错)。
 */
export const EV_SCROLL = 'scroll'

/**
 * 「没有」的空文本(缺译名、缺省码、缺灰注时的返回值)。
 */
export const TEXT_NONE = ''

/**
 * 「本站没有这一项」的横杠。🔴 它不是 0 —— 官方可空的数值折成 0 等于替官方编数。
 */
export const DASH_MARK = '—'

/**
 * 省码清单串的分隔符(数据层用顿号连;全站禁「·」杂糅,这里是数据值不是排版)。
 */
export const SEP_LIST = '、'

/**
 * 拼 className 时各类之间的分隔符(HTML 的 class 属性按空白切词)。
 */
export const CLS_SEP = ' '

/**
 * 拼复合键时各段之间的分隔符(抽选的「省+通道」分组键、筛选的六格变更键)。
 * 竖线不会出现在省码、通道名与分类名里,拼出来的键不会撞。
 */
export const KEY_SEP = '|'

/**
 * 中文界面的语言码。
 */
export const LANG_ZH = 'zh'

/**
 * 英文界面的语言码。
 */
export const LANG_EN = 'en'

/**
 * 韩文界面的语言码。
 */
export const LANG_KO = 'ko'

/**
 * 全国档的省值(切省下拉的第一项)。
 */
export const PROV_ALL = 'ALL'

/**
 * occ 表里全国行的省字段值(E13-02 若改出 'ALL' 大写也吃得下,比对前统一转小写)。
 */
export const PROV_ALL_LOWER = 'all'

/**
 * 匿名用户的默认省(S4 设计 §1 拍板 4:**已建档按档案省,匿名默认 ON —— 不许按 IP 判**;
 * 站内零 geo 能力,且主力受众在境外,同 i18n「不许按 IP 判语言」同族红线)。
 */
export const PROV_DEFAULT = 'ON'

/**
 * 魁北克的省码 —— 省提名那一格对它出「不适用」而不是横杠:QC 走自己的移民体系,
 * 不属 PNP。两者在用户那里意思相反,不许合成一个横杠。
 */
export const PROV_QC = 'QC'

/**
 * 省 × 大类汇总行的大类值(分省概览只取这一档)。
 */
export const BROAD_ALL = 'all'

/**
 * 省 × 大类汇总行的中类值(旧行未落 mid 列时读取层回填的也是它)。
 */
export const MID_ALL = 'all'

/**
 * 全国榜的样本门槛:在架 ≥30 才进榜(设计 §3,禁上榜噪音)。
 * S2/S3 的 ≥100 大盘门槛 2026-08-07 撤(Frank「榜单去 ≥100 门槛、全 NOC 显示」E13-08);
 * 小样本环比仍被 mom14d 的 prev<5→null 守着,不出噪音数。
 */
export const NAT_MIN_OPEN = 30

/**
 * 省级榜的样本门槛:在架 ≥10 才进榜(设计 §3)。
 */
export const PROV_MIN_OPEN = 10

/**
 * 环比持平的基准(等于它既不算涨也不算跌,配色走中性灰)。
 */
export const MOM_FLAT = 0

/**
 * 卡片列表的每页条数(手机档;桌面表格的页态在 Table 里,俩视图同刻只显示一个,各翻各的)。
 * 2026-09-04 Frank「默认显示 10 行,显示所有条目,加上分页」:与桌面表格同 10。
 */
export const CARD_PAGE_SIZE = 10

/**
 * 雇主表操作列的显式宽:两只 mini 钮并排在最宽的韩文(「채용 보기」「회사 보기」)下也放得下,
 * 不参与量宽也不折行(2026-09-05 Frank 韩语截图右钮被切 →「最好是不要换行」)。
 */
export const W_EMP_ACT = '150px'

/**
 * 桌面表格的每页行数。
 */
export const TABLE_PAGE_SIZE = 10

/**
 * 首页聚合的进程内缓存时长(ms)。手法照 jobs/page.tsx 的 ssrDimsCache:判决证据/抽选/
 * 政策/省卡全是与用户无关的聚合数,10 分钟陈旧完全可接受;Render 单实例,进程缓存即全局缓存。
 * checkedAt 与「用户档案省」不进缓存(前者 lib/jobs/queries 自带 30s,后者是逐用户的)。
 */
export const HOME_TTL_MS = 600000

/**
 * 数字的显示地区(千分位按加拿大英文习惯)。
 */
export const NUM_LOCALE = 'en-CA'

/**
 * 环比涨的正号(跌用减号,持平不带号)。
 */
export const SIGN_PLUS = '+'

/**
 * 环比跌的减号。
 */
export const SIGN_MINUS = '-'

/**
 * 百分号。
 */
export const PCT_MARK = '%'

/**
 * 比值换算成百分数的倍数。
 */
export const PCT_SCALE = 100

/**
 * 担保率超过 100% 时的显示(已知方法论偏差,见 E14-01 §7.4 农业案例,非 bug ——
 * 照实标出来而不是截断成 100%)。
 */
export const RATE_OVER_TEXT = '100%+'

/**
 * 担保率的上界(超过它走 RATE_OVER_TEXT)。
 */
export const RATE_MAX = 1

/**
 * 担保率保留几位小数。
 */
export const RATE_DIGITS = 1

/**
 * 年薪区间的千元除数。
 */
export const WAGE_K = 1000

/**
 * 年薪区间的货币符号。
 */
export const WAGE_SIGN = '$'

/**
 * 年薪区间的千元单位。
 */
export const WAGE_K_MARK = 'K'

/**
 * 年薪区间的区间号(短横,不是减号)。
 */
export const WAGE_RANGE_SEP = '–'

/**
 * TEER 单元格的前缀(2026-08-06 Frank:裸数字像个数据值,带前缀自明)。
 */
export const TEER_HEAD = 'TEER '

/**
 * 手机卡片上 NOC 代码胶囊的前缀。
 */
export const NOC_HEAD = 'NOC '

/**
 * 手机卡片上「在招 N」那一格的分隔空格。
 */
export const CARD_GAP = ' '

/**
 * 省名 i18n 键的头(拼上省码;下拉里只显本语言全名)。
 */
export const KEY_PROV_HEAD = 'prov.'

/**
 * 省份译名 i18n 键的头(拼上省码;英文界面不出译名)。
 */
export const KEY_PR_HEAD = 'pr.'

/**
 * 难度档名 i18n 键的头(拼上档位)。
 */
export const KEY_DIFF_HEAD = 'diff.'

/**
 * 省卡 IRCC 体量里的学签那一格。
 */
export const INFO_STUDY = 'study'

/**
 * 省卡 IRCC 体量里的 TFWP 工签那一格。
 */
export const INFO_TFWP = 'tfwp'

/**
 * 省卡 IRCC 体量里的 IMP 工签那一格。
 */
export const INFO_IMP = 'imp'

/**
 * 省卡 IRCC 体量里的「省提名拿到 PR」那一格。
 */
export const INFO_PNP_PR = 'pnpPr'

/**
 * 可提名省份排序键里直可省数的权重(直可省数主键、有条件省数副键,
 * 乘它就能把两者压成一个可比的数)。
 */
export const PNP_SORT_SCALE = 10

/**
 * NOC 代码列的列名(官方缩写,不进 i18n —— 三语都写它)。
 */
export const LABEL_NOC = 'NOC'

/**
 * 省 chips 上译名括注的左括号(半角,与原实现逐字相同)。
 */
export const PAREN_L = '('

/**
 * 省 chips 上译名括注的右括号。
 */
export const PAREN_R = ')'

/**
 * E13-08 判定省序(与 etl/11_build_stats.PNP_PROV_ORDER 同值同序;QC 不判)——
 * 「有路可走的省」= 此序 − deadProvs(any_pr_path=true,含 AIP/保育兜底,不只雇主担保)。
 */
export const DEAD_PROV_ORDER = ['BC', 'AB', 'SK', 'MB', 'ON', 'NB', 'NS', 'PE', 'NL']

/**
 * 卡上用的通行短名(悬停仍显全名)。目前只有一省:官方全名太长,榜上会把列撑破。
 */
export const SHORT_PROV: Record<string, string> = {
  /**
   * 纽芬兰与拉布拉多:官方全名太长,榜上会把列撑破,卡与 chips 用通行短名。
   */
  NL: 'Newfoundland',
}

/**
 * 难度档的排序键(easy 最松、tight 最紧;表外的档给 null 沉底)。
 */
export const DIFF_ORDER: Record<string, number> = {
  /**
   * 宽松:排最前。
   */
  easy: 0,

  /**
   * 中等。
   */
  mid: 1,

  /**
   * 紧:排最后。
   */
  tight: 2,
}

/**
 * 难度档:宽松。
 */
export const DIFF_EASY = 'easy'

/**
 * 难度档:中等。
 */
export const DIFF_MID = 'mid'

/**
 * 难度档:紧。
 */
export const DIFF_TIGHT = 'tight'

/**
 * 通道档:联邦(紧缺胶囊里那粒青的)。
 */
export const TIER_FED = 'fed'

/**
 * 通道档:省与联邦双头点名(紧缺胶囊里联邦那粒也出)。
 */
export const TIER_BOTH = 'both'

/**
 * 表格列的 key:职业名。
 */
export const COL_OCC = 'occ'

/**
 * 表格列的 key:在招岗数。
 */
export const COL_OPEN = 'open'

/**
 * 表格列的 key:14 天新发环比。
 */
export const COL_MOM = 'mom'

/**
 * 表格列的 key:薪资区间。
 */
export const COL_SAL = 'sal'

/**
 * 表格列的 key:NOC 代码。
 */
export const COL_NOC = 'noc'

/**
 * 表格列的 key:TEER。
 */
export const COL_TEER = 'teer'

/**
 * 表格列的 key:完全无路可走的省。
 */
export const COL_DEAD = 'dead'

/**
 * 表格列的 key:紧缺(省紧缺胶囊 + 联邦紧缺胶囊)。
 */
export const COL_HOT = 'provs'

/**
 * 表格列的 key:可提名省份。
 */
export const COL_PNP_PROVS = 'pnpProvs'

/**
 * 表格列的 key:担保率。
 */
export const COL_SPONSOR_RATE = 'sponsorRate'

/**
 * 表格列的 key:省份。
 */
export const COL_PROV = 'prov'

/**
 * 表格列的 key:难度档。
 */
export const COL_DIFF = 'diff'

/**
 * 表格列的 key:具名通道岗数。
 */
export const COL_NAMED = 'named'

/**
 * 表格列的 key:工签体量。
 */
export const COL_WORK = 'work'

/**
 * 表格列的 key:学签体量。
 */
export const COL_STUDY = 'study'

/**
 * 表格列的 key:省提名拿到 PR。
 */
export const COL_PR = 'pr'

/**
 * 职业榜区的加载占位高(px)。
 */
export const PH_BOARDS = 480

/**
 * 分省概览的加载占位高(px)。
 */
export const PH_PROV = 420

/**
 * 省内职业榜的加载占位高(px)。
 */
export const PH_PROVOCC = 320

/**
 * 正文轨的上内衬档(px;色带自己管上下距,轨上下都贴满)。
 */
export const SHELL_TOP = 0

/**
 * 正文轨的下内衬档(px)。
 */
export const SHELL_BOTTOM = 0

/**
 * banner 的模块名(取本模块那组图)。
 */
export const BANNER_MODULE = 'home'

/**
 * 该省提名通道那一行标签的色档。
 */
export const TAG_VARIANT_WARN = 'warn'

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 表格操作小钮走 button 桶的 mini 档(2026-09-05 Frank「按钮样式不能全站统一吗」:与职位板操作列同一颗)。
 */
export const MINI_BTN_KIND = 'mini'

/**
 * 本页的 SEO 头(英文优先 —— 88% 流量来自 Google;中文一句压在后面)。
 * 住这里而不是页面门里:门里不留死值常量,页面门只 `export const metadata = START_META` 一行转发。
 */
export const START_META = {
  /**
   * 浏览器标签与搜索结果标题。
   */
  title: 'Canada job market pulse — what is shrinking, what is hiring, by province | Offer2PR',

  /**
   * 搜索结果摘要。
   */
  description:
    'Which occupations are shrinking and which are still hiring: 14-day posting change, average days open,'
    + ' PNP-list hit rate, provincial breakdown and the latest draw cutoffs.'
    + ' 就业把脉:哪些职业在缩、哪些还在招,数字全部来自库内真数。',
}

/**
 * 卡片 hover 高亮的全局规范类(跨页规范,单一来源在 main.css)。
 */
export const CLS_CARD_HOVER = 'cardHover'

/**
 * 原生下拉的手机触控靶全局规范类(#300 第 38 轮体检,单一来源在 main.css)。
 */
export const CLS_MKT_CTL = 'mktCtl'

/**
 * 埋点名:点了一张脉象卡。
 */
export const TRACK_CARD = 'pulse_card_click'

/**
 * 埋点名:点了榜上的一个职业名。
 */
export const TRACK_OCC = 'pulse_occ_click'

/**
 * 埋点名:点了 S6 的职位板入口大钮。
 */
export const TRACK_CTA = 'landing_cta_browse'



/**
 * 行业组的键(2026-09-04 Frank「职业应该分行业,比如医疗、技工、STEM」;顺序即页面上的顺序;8 组)。
 * 组名文案 = KEY_IND_HEAD + 键(三语在 lib/i18n)。职业 / 雇主 / LMIA / 趋势四段共用这一份。
 */
export const IND_KEYS = [
  'health', 'stem', 'trades', 'food', 'transport', 'manufacturing', 'business', 'education',
]

/**
 * 行业组 → 本站大类(etl/noc 的 27 大类归成 8 组)。只在把脉页用,住这里;
 * 第二个消费者出现时搬 etl/noc 成数据层事实(设计稿 docs/design/把脉页重构-20260904.md §4)。
 */
export const IND_BROADS: Record<string, string[]> = {
  /**
   * 医疗:大类只有一个。
   */
  health: ['医疗'],

  /**
   * STEM:IT、工程、科学三大类并一组(Frank 点名的组)。
   */
  stem: ['IT', '工程', '科学'],

  /**
   * 技工:技工 + 建筑两大类并一组(2026-09-04 Frank「应该放一起,名字都叫技工」;官方 NOC 第 7 大类
   * 本就把两者编在一起,站内 27 大类拆开的是 08-02 的心智切法,把脉页按官方口径合回)。
   */
  trades: ['技工', '建筑'],

  /**
   * 餐饮零售:餐饮、住宿、零售、销售、生活服务五个服务业大类。
   */
  food: ['餐饮', '住宿', '零售', '销售', '生活服务'],

  /**
   * 运输物流:运输、物流。
   */
  transport: ['运输', '物流'],

  /**
   * 制造农矿:制造、农业、矿业三个一二产大类。
   */
  manufacturing: ['制造', '农业', '矿业'],

  /**
   * 商务办公:管理层、商务、行政、文员、金融、会计、法律七个办公室大类。
   */
  business: ['管理层', '商务', '行政', '文员', '金融', '会计', '法律'],

  /**
   * 教育文体:教育、社会服务、艺术、体育。
   */
  education: ['教育', '社会服务', '艺术', '体育'],
}

/**
 * 行业组名的 i18n 键头。
 */
export const KEY_IND_HEAD = 'pulse.ind.'

/**
 * 最高工资榜的最低在招数:样本太小的中位薪不上榜(18 岗的外科医生可以,2 岗的不行)。
 */
export const WAGE_MIN_OPEN = 10

/**
 * 全职业榜的键:最多岗位。
 */
export const SEC_TOP_OPEN = 'topOpen'

/**
 * 全职业榜的键:最高工资。
 */
export const SEC_TOP_WAGE = 'topWage'

/**
 * 雇主表列键:雇主名。
 */
export const COL_EMP = 'emp'

/**
 * 职位板按城市筛的地址头(城市卡下钻:该市全部在招岗)。
 */
export const URL_HOME_CITY_HEAD = '/?city='

/**
 * 趋势主图(全国)高度(px)。
 */
export const TREND_H_MAIN = 220

/**
 * 趋势行业小图高度(px)。
 */
export const TREND_H_SMALL = 110

/**
 * 趋势线颜色(与 stats 主图首色同,#2563eb = blue-600)。
 */
export const TREND_COLOR = '#2563eb'

/**
 * 趋势线下方淡填充的透明度。
 */
export const TREND_AREA_OPACITY = 0.08

/**
 * 趋势小图的四边留白(px):小图不出坐标轴,只留一点呼吸。
 */
export const TREND_PAD_SMALL = 4

/**
 * 趋势主图的四边留白(px):要放下坐标轴刻度。
 */
export const TREND_PAD_MAIN = 28

/**
 * 一条趋势线至少要几个点才画(一个点画不成线)。
 */
export const TREND_MIN_POINTS = 2


/**
 * 埋点名:点了雇主表 / LMIA 表里的雇主名(沿用 2026-08-08 起就在白名单里的 se-view-jobs,不另起名)。
 */
export const TRACK_EMP = 'se-view-jobs'


/**
 * echarts 提示框的触发方式:按横轴(整列一起提示)。
 */
export const CHART_TRIGGER_AXIS = 'axis'

/**
 * echarts 横轴类型:类目轴(日期串)。
 */
export const AXIS_CATEGORY = 'category'

/**
 * echarts 纵轴类型:数值轴。
 */
export const AXIS_VALUE = 'value'

/**
 * echarts 序列类型:折线。
 */
export const SERIES_LINE_TYPE = 'line'

/**
 * 趋势线线宽(px)。
 */
export const TREND_LINE_WIDTH = 2

/**
 * 抽选表下发条数上限(前端 Top N 下拉再切;冷解读要按通道回看 12 期,
 * 多取的那批只在服务端用完即丢,不进 HTML)。
 */
export const DRAWS_LIMIT = 50

/**
 * 抽选尺子区的锚点 id。
 */
export const ID_DRAWS = 'pl-draws'

/**
 * 冷解读的回看窗(设计 §4):当期分数线 vs **近 12 期同通道**的区间。
 */
export const HIST_WINDOW = 12

/**
 * 冷解读的样本门槛:同通道有效期数 <4 不出解读(样本太少的「区间」是噪音,宁可不说)。
 */
export const HIST_MIN_N = 4

/**
 * 联邦抽选在表上显示的标签(省码那一格)。
 */
export const TAG_FED = 'EE'

/**
 * 联邦发布方在 news 表里的 region 值。
 */
export const REGION_FEDERAL = 'federal'

/**
 * 联邦发布方在列表上显示的标签。
 */
export const TAG_IRCC = 'IRCC'

/**
 * 联邦抽选在 pnp_draws 里的省字段值。
 */
export const PROV_FED = 'FED'

/**
 * 表格列的 key:抽选日期。
 */
export const COL_DATE = 'date'

/**
 * 表格列的 key:抽选项目(省码或 EE)。
 */
export const COL_PROG = 'prog'

/**
 * 表格列的 key:抽选通道名。
 */
export const COL_STREAM = 'stream'

/**
 * 表格列的 key:分数线。
 */
export const COL_SCORE = 'score'

/**
 * 表格列的 key:邀请数。
 */
export const COL_INV = 'inv'

/**
 * 表格列的 key:冷解读。
 */
export const COL_READ = 'read'

/**
 * 抽选表日期列的列宽(百分比;列宽写死,冷解读吃最宽一列 —— 它是这张表的结论。
 * 百分比固定布局永不横滚)。
 */
export const W_DATE = '12%'

/**
 * 抽选表项目列的列宽。
 */
export const W_PROG = '8%'

/**
 * 抽选表通道名列的列宽。
 */
export const W_STREAM = '22%'

/**
 * 抽选表分数线列的列宽。
 */
export const W_SCORE = '10%'

/**
 * 抽选表邀请数列的列宽。
 */
export const W_INV = '10%'

/**
 * 抽选表冷解读列的列宽。
 */
export const W_READ = '38%'

/**
 * 行 hover 高亮的全局规范类(同上)。
 */
export const CLS_ROW_HOVER = 'rowHover'

/**
 * 城市行没到时页态吃的那份空清单(模块级单例:每次渲染新建空数组会让页态每帧回第一页)。
 */
export const EMPTY_CITY_ROWS: never[] = []

/**
 * 身份档:没工签(境外或访客)—— 看雇主办过 LMIA 没有、在不在 AIP / RCIP 名单。
 */
export const ID_NOWP = 'nowp'

/**
 * 身份档:PGWP 或其他工签 —— 看雇主招不招 TEER 0-3、岗位在不在省清单、雇主够不够省提名门槛。
 * 默认档:本站主流量是学签转 PGWP 的人群(2026-09-05 Frank「我应该选什么雇主是根据我的身份来的」)。
 */
export const ID_PGWP = 'pgwp'

/**
 * 身份档的文案键头(拼上档键)。
 */
export const KEY_ID_HEAD = 'pulse.id.'

/**
 * 雇主表列键:近一年 LMIA 获批。
 */
export const COL_LMIA_4Q = 'lmia4q'

/**
 * 雇主表列键:雇主门槛。
 */
export const COL_VERDICT = 'verdict'

/**
 * 雇主表列键:在招职业。
 */
export const COL_HIRING_OCC = 'hiringOcc'

/**
 * 表列键:操作(看岗位 / 看公司)。
 */
export const COL_ACT = 'act'

/**
 * 公司页地址头(雇主表「看公司」)。
 */
export const URL_COMPANY_HEAD = '/companies/'

/**
 * 在招职业一格最多摆几个职业名(其余折成「等 N 个」)。
 */
export const HIRING_OCC_MAX = 2

/**
 * TEER 的可提名上界:0-3 才走得了 CEC 与省提名的技术类。
 */
export const TEER_PNP_MAX = 3

/**
 * 雇主门槛判定态的文案键头(拼上 met / short / unknown / public)。
 */
export const KEY_VERDICT_HEAD = 'se.verdict.'

/**
 * 雇主门槛差项的文案键头(拼上 years / staff)。
 */
export const KEY_VERDICT_FACTOR_HEAD = 'se.verdict.factor.'

/**
 * 雇主门槛判定态:差项。
 */
export const VERDICT_SHORT = 'short'

/**
 * 雇主门槛判定态:达标。
 */
export const VERDICT_MET = 'met'

/**
 * 雇主门槛判定态:公共部门(省提名对公共部门雇主不设年限雇员数门槛)。
 */
export const VERDICT_PUBLIC = 'public'

/**
 * 雇主类别列键。
 */
export const COL_SECTOR = 'sector'

/**
 * 雇主类别的文案键前缀(后接 private / public / government)。
 */
export const KEY_SECTOR_HEAD = 'pulse.sector.'

/**
 * 雇主类别的两个标注值(数据层 companies.sector;空 = 私营企业)。
 */
export const SECTOR_GOVERNMENT = 'government'

/**
 * 同上:公立机构。
 */
export const SECTOR_PUBLIC = 'public'

/**
 * 私营企业的文案键尾(sector 为空时)。
 */
export const SECTOR_PRIVATE = 'private'

/**
 * PGWP 档把脉结论:省提名可走(有 TEER 0-3 岗、岗位在省清单、雇主门槛达标或公共部门)。排序权 0。
 */
export const PULSE_OK = 'ok'

/**
 * PGWP 档把脉结论:省提名待核(岗与清单都对,雇主门槛本站还没核到)。排序权 1。
 */
export const PULSE_CHECK = 'check'

/**
 * PGWP 档把脉结论:差门槛(雇主门槛判定差项)。排序权 2。
 */
export const PULSE_SHORT = 'short'

/**
 * PGWP 档把脉结论:只能攒 CEC(没有在省清单上的 TEER 0-3 岗,省提名雇主类走不通)。排序权 3。
 */
export const PULSE_CEC = 'cec'

/**
 * 把脉结论 → 排序权(小在前)。
 */
export const PULSE_RANK: Record<string, number> = {
  /**
   * 可走。
   */
  ok: 0,

  /**
   * 待核。
   */
  check: 1,

  /**
   * 差门槛。
   */
  short: 2,

  /**
   * 只能攒 CEC。
   */
  cec: 3,
}

/**
 * 「是」的记号(与 DASH_MARK「没有」成对;在省清单 / AIP / RCIP 三格只放勾或杠)。
 */
export const CHECK_MARK = '✓'

/**
 * 雇主表列键:近半年 LMIA 获批(没工签档显示这一档;入选看近一年)。
 */
export const COL_LMIA_2Q = 'lmia2q'

/**
 * 雇主表列键:业务(公司简介)。
 */
export const COL_BIZ = 'biz'

/**
 * 试点名单 source 里认 RCIP 的记号。
 */
export const PILOT_RCIP = 'RCIP'

/**
 * 试点名单 source 里认 FCIP 的记号。
 */
export const PILOT_FCIP = 'FCIP'

/**
 * 雇主表的表种:三试点指定雇主表(不分身份档,不分行业;2026-09-05 Frank「AIP / RCIP / FCIP 在招的单独开 table,
 * 不要和一般走 PNP 的雇主放到一起」)。
 */
export const TABLE_PILOT = 'pilot'

/**
 * 三试点的键(顺序即三张表的顺序);表题文案 = KEY_PILOT_HEAD + 键。
 */
export const PILOT_KEYS = ['aip', 'rcip', 'fcip']

/**
 * 试点表题的文案键头。
 */
export const KEY_PILOT_HEAD = 'pulse.pilot.'

/**
 * 试点键:AIP(大西洋四省)。
 */
export const PILOT_KEY_AIP = 'aip'

/**
 * 试点键:RCIP(乡村社区)。
 */
export const PILOT_KEY_RCIP = 'rcip'

/**
 * 试点键:FCIP(法语社区)。
 */
export const PILOT_KEY_FCIP = 'fcip'

/**
 * 词间空格(雇主名按词拆再拼)。
 */
export const SPACE_SEP = ' '

/**
 * 全大写雇主名里,几个字母以内的词当缩写保留大写(KFC / A&W / CDC / RBC)。
 */
export const ACRONYM_MAX = 3

/**
 * 公司后缀词(全大写名里即使短也转词首大写:INC → Inc)。
 */
export const CORP_SUFFIXES = ['INC', 'LTD', 'CO', 'LLC', 'LLP', 'LTEE', 'LP']

/**
 * 去掉非字母(数缩写长度时 A&W 算 2 个字母)。
 */
export const NON_LETTER_RE = /[^A-Za-z]/g

/**
 * 操作钮的打开方式:新标签页(2026-09-05 Frank「看岗位 看公司,应该跳到一个新的 tab」;把脉页是查询台,不离开)。
 */
export const NEW_TAB = '_blank'

/**
 * AI 简介里「做什么」那一段的标记(公司信息批的落库格式:[WHAT] [BASE] [SIZE] [FOUNDED] [NOTE] 五段串一行)。
 */
export const BRIEF_TAG_WHAT = '[WHAT]'

/**
 * AI 简介里任一段标记(切出 [WHAT] 段的右界)。
 */
export const BRIEF_TAG_RE = /\[(BASE|SIZE|FOUNDED|NOTE|WHAT)\]/

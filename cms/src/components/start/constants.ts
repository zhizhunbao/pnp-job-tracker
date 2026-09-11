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
 * 职位板 AIP 筛选参数尾巴(components/jobs URL_TO_FILTER 的 aip → fAip=yes,SQL 只留 aip=true 的岗)。
 * AIP 表「看岗位」一律带它(2026-09-05 Frank「看岗位的时候是不是也需要加上省份筛选」):AIP 岗天然只在
 * 大西洋四省且 TEER 0-4,比拼省清单准,也绕开职位板省参数只吃单省的限制;点进去的数与表里「在招」一致。
 */
export const URL_AIP_TAIL = '&aip=yes'

/**
 * 职位板试点社区筛选参数尾巴(URL_TO_FILTER 的 pilot → fPilot=yes,SQL 留 pilot 非空的岗)。
 * RCIP / FCIP 表「看岗位」带它(2026-09-06):职位板没有按单个试点筛的参数,任一试点社区的岗都出,
 * 雇主同时在两种社区有岗时会比表里「在招」多几条。
 */
export const URL_PILOT_TAIL = '&pilot=yes'

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
 * 分表锚点 id 的连接符:分区 id + 连接符 + 分表键(pl-se-health / pl-boards-topOpen)。
 * 2026-09-06 Frank「这个应该加子项,要不然手机端没法跳转」:二级导航按当前分区出一行子项,
 * 职业 = 两榜 + 8 行业,雇主 = 8 行业 + 三试点,省份 = 概览 / 省内榜;城市、趋势没有分表不出。
 */
export const SUB_ID_SEP = '-'

/**
 * 滚动跟随的判定线(px):当前分区 = 顶部粘条下沿以上最后一个分区标题。
 * 2026-09-06 加子项行后粘条两层高 87(藏滚动条后),.band / .subAnchor 的 scroll-margin-top 92、判定线 96:
 * 让位比粘条多 5px,判定线再比让位多 4px —— 锚点跳到的位置带小数(104.4 > 104 实撞,高亮与子项不跟着切),
 * 线必须严格高于让位;此前 60 时锚点跳到 84 落在线下同病。
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
 * occ 表里全国行的省字段值(E13-02 若改出 'ALL' 大写也吃得下,比对前统一转小写)。
 */
export const PROV_ALL_LOWER = 'all'

/**
 * 省 × 大类汇总行的大类值(分省概览只取这一档)。
 */
export const BROAD_ALL = 'all'

/**
 * 省 × 大类汇总行的中类值(旧行未落 mid 列时读取层回填的也是它)。
 */
export const MID_ALL = 'all'

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
 * 职业榜区的加载占位高(px)。
 */
export const PH_BOARDS = 480

/**
 * 分省概览的加载占位高(px)。
 */
export const PH_PROV = 420

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
 * 雇主类别的标注值(数据层 companies.sector;空 = 私营企业):省市政府。
 */
export const SECTOR_GOVERNMENT = 'government'

/**
 * 同上:联邦机关(2026-09-05 Frank「雇主类别细到四档」)。
 */
export const SECTOR_FEDERAL = 'federal'

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
 * 连锁记号的文案键(2026-09-06 Frank 拍板:AIP 本地 / 连锁两张表合回一张,连锁雇主名旁挂灰胶囊 + tooltip
 * —— 两张表只差一个词,用户不知道为什么分;胶囊在他需要的那一刻说「按门店逐家指定,投前核对门店」。
 * 连锁判据见 lib/employers CHAIN_PROVS_MIN;三试点表都挂,行业表不挂)。
 */
export const KEY_CHAIN = 'pulse.chain'

/**
 * 连锁胶囊 tooltip 的文案键(允许的四类文案之一:tooltip)。
 */
export const KEY_CHAIN_TIP = 'pulse.chain.tip'

/**
 * 三试点的键(顺序即三张表的顺序);表题文案 = KEY_PILOT_HEAD + 键。
 * 2026-09-06 起三张表都按岗级事实数(AIP 岗 / RCIP 岗 / FCIP 岗,见 lib/db sponsorEmployers),
 * 在招、在招职业、看岗位都只看该试点的岗,不再挂全国数(Frank「rcip 和 fcip 也有这个问题吧」)。
 */
export const PILOT_KEYS = ['aip', 'rcip', 'fcip']

/**
 * 不按试点取值的记号(行业表的行:在招 = 全国在招、职业 = 全部在招岗)。
 */
export const PILOT_NONE = ''

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

/**
 * 省份段「招聘对比」横表的锚点(二级导航子项;宏观按年表的锚点 = ID_PROV_GEO_HEAD + 地区码小写)。
 * 2026-09-06 Frank 拍板省份段 = 宏观统计(含联邦):全国 + 十省各一张按年表 + 一张招聘对比横表。
 */
export const ID_PROV_JOBS = 'pl-prov-jobs'

/**
 * 全国的地区码(macro_series 的 geo;与十省两位码并列)。
 */
export const GEO_CA = 'CA'

/**
 * 省份段地区块的顺序:全国打头,十省按 2026-09-06 在招量降序钉死(锚点要稳,不随日更漂)。
 */
export const MACRO_GEO_ORDER = ['CA', 'ON', 'QC', 'BC', 'AB', 'SK', 'NS', 'MB', 'NB', 'NL', 'PE']

/**
 * 宏观表行名 i18n 键的头(拼上行键)。
 */
export const KEY_MACRO_HEAD = 'pulse.m.'

/**
 * 月份缩写 i18n 键的头(拼上 1–12;进行年灰注「Apr」「至 6 月」)。
 */
export const KEY_MON_HEAD = 'pulse.m.mon'

/**
 * macro_series 的频率码:季度。
 */
export const FREQ_Q = 'Q'

/**
 * macro_series 的频率码:月度。
 */
export const FREQ_M = 'M'

/**
 * macro_series 的频率码:年度。
 */
export const FREQ_A = 'A'

/**
 * 季度键「YYYY 年末」= 次年 1 月 1 日参考日,期键的尾。
 */
export const PERIOD_JAN_TAIL = '-01-01'

/**
 * 月度键「YYYY 年末」= 当年 12 月,期键的尾。
 */
export const PERIOD_DEC_TAIL = '-12-01'

/**
 * 期键里年份的长度(YYYY)。
 */
export const YEAR_LEN = 4

/**
 * 期键里月份两位的起始下标(YYYY-MM-DD 的 MM)。
 */
export const MONTH_START = 5

/**
 * 期键里月份两位的结束下标(不含)。
 */
export const MONTH_END = 7

/**
 * 宏观表默认显示的年份列数:5 个年末 + 进行年(工具条「近 5 年」)。
 */
export const MACRO_RECENT = 6

/**
 * macro_series 数据键:总人口(StatCan 17-10-0009)。
 */
export const MK_POP = 'pop'

/**
 * macro_series 数据键:临时居民总数(StatCan 17-10-0121)。
 */
export const MK_NPR = 'npr'

/**
 * macro_series 数据键:仅持工签。
 */
export const MK_WORK_ONLY = 'workOnly'

/**
 * macro_series 数据键:仅持学签。
 */
export const MK_STUDY_ONLY = 'studyOnly'

/**
 * macro_series 数据键:工签学签双持(算工签也算学签)。
 */
export const MK_WORK_STUDY = 'workStudy'

/**
 * macro_series 数据键:难民申请人及相关群体。
 */
export const MK_ASYLUM = 'asylum'

/**
 * macro_series 数据键:学签新签(IRCC 年度)。
 */
export const MK_STUDY_NEW = 'studyNew'

/**
 * macro_series 数据键:GDP(StatCan 36-10-0222,2017 链式美元,百万)。
 */
export const MK_GDP = 'gdp'

/**
 * macro_series 数据键:失业率(StatCan 14-10-0287,季调,百分数)。
 */
export const MK_UNEMP = 'unemp'

/**
 * macro_series 数据键:省提名配额(各省官方)。
 */
export const MK_ALLOC = 'alloc'

/**
 * macro_series 数据键:PR 获批(IRCC 年度,全部类别)。
 */
export const MK_PR_ALL = 'prAll'

/**
 * macro_series 数据键:PR 获批里的省提名类别。
 */
export const MK_PR_PNP = 'prPnp'

/**
 * macro_series 数据键:联邦 EE 邀请人数(仅全国)。
 */
export const MK_EE = 'eeInvites'

/**
 * macro_series 数据键:省提名接纳目标(联邦人头口径;2026-09-10 起并进配额表当全国行,不再单独成表)。
 */
export const MK_PNP_TARGET = 'pnpTarget'

/**
 * macro_series 数据键:EE 接纳目标(水平计划联邦高技术线,人头口径;2026-09-10 补,
 * 进 EE 表当第二行 —— 邀请是实际、目标是预算,同表对照)。
 */
export const MK_EE_TARGET = 'eeTarget'

/**
 * PR 每省小表的行键序(2026-09-10 Frank「拆成每个省一个表」:一地区一张小表,
 * 行 = PR 获批 + 其中省提名,列 = 年)。
 */
export const PR_ROW_KEYS = ['prAll', 'prPnp']

/**
 * 宏观表行键:工签(2026-09-10 Frank 重排清单点名;数据键 = workOnly 只持工签存量,行键另起
 * 免得沿用「其中只持工签」的行名与缩进样式)。
 */
export const MR_WORK = 'work'

/**
 * macro_series 数据键:名额竞争比(省级一年一格 = 该年年末在库学签 + 工签人头 ÷ 该年省提名配额;
 * Frank 2026-09-08「每年的竞争是不是不一样,每一年都得算吧」)。最新一年这格就是竞争度胶囊的依据。
 */
export const MK_COMP = 'comp'

/**
 * macro_series 数据键:省提名 + AIP 合并配额(NB / NL / PE 官方不拆的年份;配额表单列缺格时顶上带「含 AIP」灰注,
 * 竞争比不用它;2026-09-09)。
 */
export const MK_ALLOC_INCL = 'allocIncl'

/**
 * macro_series 数据键:省提名依赖度(%)= 其中省提名 ÷ PR 获批(mart 算;Frank 2026-09-09 九张表拍板:「该走 PNP 还是 EE」看它)。
 */
export const MK_PNP_SHARE = 'pnpShare'

/**
 * macro_series 数据键:临时居民占人口比(%)= 临时居民 ÷ 总人口(mart 算,按季;「下一刀砍谁」看它)。
 */
export const MK_NPR_SHARE = 'nprShare'

/**
 * 派生行键:配额用尽率(%)= 已发提名 ÷ 配额。与「剩余名额」同源同处派生:已发在 pnp_ops_stats、配额在
 * macro_series,两表只在这里相遇(2026-09-06 剩余名额的先例)。
 */
export const MR_USE_RATE = 'useRate'

/**
 * 按百分数显示的行键(一位小数 + %)。
 */
export const MACRO_PCT_KEYS = ['unemp', 'pnpShare', 'nprShare', 'useRate']

/**
 * 「按指标」视图的九张表及其序(Frank 2026-09-09 拍板:一张表回答一个问题,按用户问的先后 ——
 * 挤不挤 → 发多少 → 还有没有 → 走哪条路 → 人在减少吗 → 新人速度 → 落地多少 → 下一刀砍谁 → 找工作难不难)。
 * 2026-09-09 Frank「之前安省的可以删掉了吧」「包含对比才有意义」:省块视图撤,原来只在省块里的
 * 其中省提名 / EE 邀请 / 接纳目标 / 总人口 / GDP 也各成一表(后四张只有全国一行或是背景数,垫底);
 * 已发提名同日撤(「有意义吗」—— 九成年份等于配额,今年用到哪已在用尽率里),数据留库给用尽率。
 * 2026-09-10 Frank「这个没必要显示」:用尽率表也撤(历史年份几乎全 100%,今年只三省有进度),数据仍留库。
 * 2026-09-10 Frank「省提名依赖度 删掉」:依赖度表撤,数据仍留库。
 * 2026-09-10 Frank 重排清单「人口 gdp 失业率 临时居民 EE配额 PNP配额 学签 工签 旅游签 pr 招聘」:
 * 照单排;竞争比留在 PNP 配额旁(判断表,由配额派生);临时居民占比跟在临时居民后;
 * 工签 = 只持工签存量单独成表(行键 work,数据键 workOnly);旅游签本站无数据,进数据补全清单不上表;
 * 接纳目标并进配额表当全国行(「这四个都是一回事」),其中省提名并进 PR 表当缩进行,单行表清零。
 */
export const IND_ORDER = [
  'pop', 'gdp', 'unemp', 'npr', 'nprShare', 'eeInvites', 'alloc', 'comp', 'studyNew', 'work', 'prAll',
]

/**
 * 标题下带一行公式的指标(只有竞争表:Frank 2026-09-09 三次问「公式是什么」—— 页面该自己说)。
 */
export const FORMULA_KEY = 'comp'

/**
 * 指标表的锚点前缀(pl-ind-<键>)。
 */
export const ID_IND_HEAD = 'pl-ind-'

/**
 * 指标短名(二级导航胶囊)的 i18n 键头(KEY_IND_HEAD 是行业组的,另起一个)。
 */
export const KEY_IND_SHORT_HEAD = 'pulse.i.'

/**
 * 同比在这个幅度内算持平(判词不说涨跌;单位百分数)。
 */
export const YOY_FLAT_PCT = 0.3

/**
 * 表格里跟在数后面的灰注左括号(「60.0 : 1 (至 4 月)」一行写完不折行;Frank 2026-09-09「后面加个括号,不要换行」)。
 */
export const NOTE_OPEN = ' ('

/**
 * 灰注右括号。
 */
export const NOTE_CLOSE = ')'

/**
 * 「涨了是坏事」的指标:同比颜色反着给(竞争比涨、失业率涨显红;Frank 2026-09-09「竞争激烈还显示绿色?」)。
 */
export const MACRO_BAD_UP_KEYS = ['comp', 'unemp']

/**
 * 流量类指标(一年一个累计数):同比只拿最近两个完整年比 —— 进行年是「到 X 月的累计」,对上一整年会算出假暴跌。
 * 不在表里的是存量 / 比值类(人口、在库、竞争比、失业率、配额、目标),最新一期直接对上一年
 * (Frank 2026-09-09「应该用最近一年的和之前年份的比」)。
 * 2026-09-10 Frank「所有的都用 26 比 25 的…最新的比去年的。这个是自动更新的」:同比不再分流量 / 存量,
 * 上一条口径作废,本表退出同比判据成零消费者;表留档(哪些键是一年一个累计数的事实不变),再有消费者直接复用。
 */
export const MACRO_FLOW_KEYS = ['studyNew', 'prAll', 'prPnp', 'eeInvites', 'issued']

/**
 * 不出「推荐」列的指标:只有全国一行,没得比(Frank 2026-09-09「每个统计维度表都有一个推荐,这样就可以最终综合打分了」——
 * 其余每张表都按最新值给十省排名出推荐,综合打分后面在这些列上做)。
 * 2026-09-10 Frank「你这个推荐不是乱写的吗」改成只在比值表上出(见 REC_KEYS):计数表「盘子大 = 推荐」站不住
 * (临时居民多是竞争大),这张跳过表退役。
 */
export const REC_SKIP_KEYS = ['pnpTarget', 'eeInvites']

/**
 * 出「推荐」列的指标(2026-09-10 拍板):本身就是判断的比值表 —— 竞争比、失业率、临时居民占比,都越低越好;
 * 计数表(配额、人口、PR、学签…)不出。
 */
export const REC_KEYS = ['comp', 'unemp', 'nprShare']

/**
 * 「越低越好」的指标:竞争比、失业率、临时居民占比、配额用尽率;不在表里的都按越高越好(配额、已发、依赖度、
 * 人口、GDP、PR 获批 —— 盘子大 / 名额多 / 靠省提名多的省对申请人有利)。
 */
export const REC_LOWER_BETTER = ['comp', 'unemp', 'nprShare', 'useRate']

/**
 * 推荐列的档:排名前这么多省「推荐」、末这么多省「不推荐」,中间「一般」。
 * 2026-09-10 Frank「把一般删了,只有推荐和不推荐」:改成对半 —— 名次在前一半「推荐」,其余「不推荐」
 * (参评省数为奇数时中位那省算前一半);REC_TOP_N 退役,分界见 REC_HALF。
 */
export const REC_HALF = 0.5

/**
 * 指标表的地区行序:全国 + 九省。魁北克撤出(Frank 2026-09-09「魁北克如果是专项的话,可以把其他 table 的魁北克行去掉」:
 * 它自成体系,另立专项;数据仍在库里)。
 */
export const IND_GEO_ORDER = ['CA', 'ON', 'BC', 'AB', 'SK', 'NS', 'MB', 'NB', 'NL', 'PE']

/**
 * 指标表的推荐列键。
 */
export const COL_REC = 'rec'

/**
 * 同比列名里年份取后两位(「同比 25/24」)。
 */
export const YOY_YEAR_TAIL = 2

/**
 * 竞争比格的尾巴(「67.1 : 1」)。
 */
export const RATIO_TAIL = ' : 1'

/**
 * 竞争比的小数位:整数(Frank 2026-09-09「竞争比需要小数吗」—— 60 : 1 和 60.0 : 1 对用户是一个意思)。
 */
export const RATIO_DIGITS = 0

/**
 * 各地区**不适用**的宏观行(没数据时不出「未公布」,有数据照出):全国没有「已发提名 / 剩余名额」
 * (提名是省发的);魁省自成体系不参加省提名,配额 / 竞争比 / 已发 / 剩余 / 其中省提名 五行都不适用
 * (Frank 2026-09-06「魁北克不是省提名吧」)。
 */
export const MACRO_NA_ROWS: Record<string, string[]> = {
  /**
   * 全国:提名是省发的,没有全国「配额 / 已发 / 剩余 / 竞争比」—— 联邦只发接纳目标(pnpTarget,人头口径),
   * 与省的提名证书个数不是一个单位,不硬套进 alloc。
   */
  CA: ['alloc', 'comp', 'issued', 'remaining', 'useRate'],

  /**
   * 魁省:自成体系不参加省提名。
   */
  QC: ['alloc', 'comp', 'issued', 'remaining', 'prPnp', 'useRate', 'pnpShare'],
}

/**
 * 只有全国才有的宏观行(EE 邀请是联邦发的,不按省;省块缺它不算缺)。
 */
export const MACRO_CA_ONLY_ROWS = ['eeInvites', 'pnpTarget']

/**
 * 官方**未公布**的格(地区 → 行键):没数据时显「未公布」而不是「本站未收录」。两词在用户那里意思相反
 * (前者 = 官方的问题、该警惕中介报数;后者 = 本站的问题、该去官网),所以每个键都要举证,举不出的不进表。
 * - PE remaining / useRate:已发提名数省官网在 Radware 反爬后面抓不到;配额本身 2026-09-09 已从省 IIDI 年报
 *   Table 1 拆出 PNP 单列(2021–2024,证伪此前「PE 只发合并名额」的记录),2025 / 2026 年报未出 → 格上「未发布」。
 * - NB issued / remaining:gnb.ca 移民版块只发逐轮「Invitations issued」
 *   (invitation-selection-rounds 页表头 Date of draw / Pathways / Invitations issued),无年度已发提名数(2026-09-08 逐页核)。
 * - NL issued / remaining:gov.nl.ca/immigration 只发逐轮「Number of ITAs Issued」(invitations-to-apply-updates 页),
 *   2026-01-26 的 NLPNP 独立审计报告原句「post-nomination outcomes … are not systematically monitored」(2026-09-08 核)。
 */
export const MACRO_UNPUBLISHED: Record<string, string[]> = {
  /**
   * 爱德华王子岛:配额只发合并数。
   */
  PE: ['remaining', 'useRate'],

  /**
   * 新不伦瑞克:只发逐轮邀请数。
   */
  NB: ['issued', 'remaining', 'useRate'],

  /**
   * 纽芬兰:只发逐轮邀请数。
   */
  NL: ['issued', 'remaining', 'useRate'],
}

/**
 * macro_series 数据键:其他许可持有人及家属(临时居民里工签 / 学签 / 难民之外的一小块)。
 */
export const MK_OTHER = 'other'

/**
 * 宏观表「近 10 年」显示的年份列数:10 个年末 + 进行年(Frank 2026-09-06「全部 table 的话就跑偏了,加一个近十年」)。
 */
export const MACRO_MORE = 11

/**
 * 手机省卡迷你格显示的年数(2026-09-10「手机用卡片 手机不用显示图」:趋势图撤出手机,
 * 逐年对比由卡下缘近几年格承担;四年一排正好占满卡宽)。
 */
export const CARD_YEARS = 4

/**
 * 折叠钮的 button 族档(与序列表工具条同档)。
 */
export const TOGGLE_BTN_KIND = 'ghost'

/**
 * 宏观表行键:已发提名(pnp_ops_stats,进行年)。
 */
export const MR_ISSUED = 'issued'

/**
 * 宏观表行键:剩余名额(pnp_ops_stats 官方直给,缺则 配额 − 已发)。
 */
export const MR_REMAINING = 'remaining'

/**
 * 宏观表里缩进显示的「其中」行:五块加起来 = 临时居民(StatCan 17-10-0121 的互斥拆分;
 * Frank 2026-09-06「这个加一起也不等啊」—— 原先工签 / 学签各含双持,相加会超)。默认折叠在临时居民下。
 */
export const MACRO_SUB_ROWS = ['workOnly', 'studyOnly', 'workStudy', 'asylum', 'other']

/**
 * pnp_ops_stats 的省级指标名:年度配额。
 */
export const OPS_ALLOCATION = 'allocation'

/**
 * pnp_ops_stats 的省级指标名:已发提名(各省叫法不同,三个名字都算)。
 */
export const OPS_ISSUED_METRICS = ['issued', 'nominations_issued', 'nominations_ytd', 'nominations_issued_fy']

/**
 * 能和自然年配额相除的已发指标(算剩余 / 用尽率用):PE 的 nominations_issued_fy 是财年数,不进这里
 * (2026-09-09;它只在「已发提名」行里显示,格上带 FY 灰注)。
 */
export const OPS_ISSUED_CAL_METRICS = ['issued', 'nominations_issued', 'nominations_ytd']

/**
 * pnp_ops_stats 的省级指标名:官方直给的剩余名额。
 */
export const OPS_REMAINING = 'remaining'

/**
 * 百分数的小数位(失业率)。
 */
export const PCT_DIGITS = 1

/**
 * 金额前缀(中位年薪)。
 */
export const CURRENCY_MARK = '$'

/**
 * 指标表的同比列键。
 */
export const COL_YOY = 'yoy'

/**
 * 招聘对比横表列键:在招职位。
 */
export const COL_JOBS_OPEN = 'open'

/**
 * 招聘对比横表列键:近 7 天发布。
 */
export const COL_JOBS_NEW7 = 'new7'

/**
 * 招聘对比横表列键:中位年薪(ESDC)。AIP 岗列键与「看岗位」地址头 2026-09-10 Frank「这两列 删掉」随列同撤。
 */
export const COL_JOBS_WAGE = 'wage'

/**
 * 宏观表「指标」列宽(其余列均分)。
 */
export const W_MACRO_KEY = '22%'

/**
 * 宏观表「指标」列键。
 */
export const COL_MACRO_KEY = 'k'

/**
 * pnp_ops_stats 期间原文里的四位年份(2026 Jan-Jun / 2026Q2 / 2025)。
 */
export const OPS_YEAR_RE = /\d{4}/

/**
 * 通用表格序列能力的视图态:表(与 components/table 的 SeriesView 字面量同值,本域自抄)。
 */
export const SERIES_VIEW_TABLE = 'table'

/**
 * 通用表格序列能力的视图态:趋势图。
 */
export const SERIES_VIEW_CHART = 'chart'

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
 * PR 规划页(抽选表标题旁那条外链)。
 */
export const URL_PLAN_PR = '/plan/pr'

/**
 * 移民动态列表页(政策动态标题旁那条外链,也是无 slug 时的兜底去处)。
 */
export const URL_NEWS = '/news'

/**
 * 移民动态详情页的地址头(拼上 slug)。
 */
export const URL_NEWS_HEAD = '/news/'

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
 * 雇主橱窗区伞标题的 id。
 */
export const ID_SE_UMBRELLA = 'pl-se-um'

/**
 * 单张橱窗表标题 id 的头(拼上人群档)。
 */
export const ID_SE_GRP_HEAD = 'se-'

/**
 * 职业榜区的锚点 id。
 */
export const ID_BOARDS = 'pl-boards'

/**
 * 职业榜区伞标题的 id。
 */
export const ID_BOARDS_UMBRELLA = 'pl-boards-um'

/**
 * 雷区榜(哪些职位在哪些省完全无路可走)的标题 id。
 */
export const ID_BOARD_MINE = 'b1a'

/**
 * 有兜底榜(不在任何省紧缺清单但处处有路)的标题 id。
 */
export const ID_BOARD_BACKUP = 'b1'

/**
 * 降温榜(上了紧缺清单但岗位在减)的标题 id。
 */
export const ID_BOARD_COOLING = 'b2'

/**
 * 升温榜(上了紧缺清单且岗位在涨)的标题 id。
 */
export const ID_BOARD_HEATING = 'b3'

/**
 * 分省概览区的锚点 id。
 */
export const ID_PROV = 'pl-prov'

/**
 * 分省概览标题的 id。
 */
export const ID_PROV_SEC = 's4'

/**
 * 省内职业榜区的锚点 id。
 */
export const ID_PROVOCC = 'pl-provocc'

/**
 * 省内职业榜标题的 id。
 */
export const ID_PROVOCC_SEC = 's4b'

/**
 * 抽选尺子区的锚点 id。
 */
export const ID_DRAWS = 'pl-draws'

/**
 * 抽选表标题的 id。
 */
export const ID_DRAWS_SEC = 's5'

/**
 * 二级导航条上的五个分区 id(顺序即条上的顺序;分区可能条件不渲,取元素时空安全)。
 */
export const NAV_IDS = [ID_SE, ID_BOARDS, ID_PROV, ID_PROVOCC, ID_DRAWS]

/**
 * 滚动跟随的判定线(px):当前分区 = 顶部粘条下沿以上最后一个分区标题。
 */
export const NAV_TOP_LINE = 96

/**
 * 滚动监听的事件名(打错是静默失效 —— 监听器绑不上不报错)。
 */
export const EV_SCROLL = 'scroll'

/**
 * 对话浮层的打开事件名(行为复刻 C6 通道卡 PathwaysCard.openChat 的既有写法,
 * 不自造事件;预填问句只填框,绝不代发送)。
 */
export const EV_CHAT_OPEN = 'o2p:chat-open'

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
 * 联邦抽选在 pnp_draws 里的省字段值。
 */
export const PROV_FED = 'FED'

/**
 * 魁北克的省码 —— 省提名那一格对它出「不适用」而不是横杠:QC 走自己的移民体系,
 * 不属 PNP。两者在用户那里意思相反,不许合成一个横杠。
 */
export const PROV_QC = 'QC'

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
 * 降温榜的入榜线:14 天新发环比跌破它才算「在减」。
 */
export const COOLING_MAX = -0.05

/**
 * 升温榜的入榜线:14 天新发环比涨过它才算「在涨」。
 */
export const HEATING_MIN = 0.05

/**
 * 环比持平的基准(等于它既不算涨也不算跌,配色走中性灰)。
 */
export const MOM_FLAT = 0

/**
 * 卡片列表的每页条数(手机档;桌面表格的页态在 Table 里,俩视图同刻只显示一个,各翻各的)。
 */
export const CARD_PAGE_SIZE = 5

/**
 * 桌面表格的每页行数。
 */
export const TABLE_PAGE_SIZE = 10

/**
 * 条数下拉的三档(抽选表与政策动态共用一把;数据 SSR 已多取,前端只切片)。
 */
export const TOPN_OPTS = [10, 20, 50]

/**
 * 条数下拉的起始档(条数不足这个数时下拉整个不出)。
 */
export const TOPN_MIN = 10

/**
 * 条数下拉每一项的前缀。
 */
export const TOPN_LABEL_HEAD = 'Top '

/**
 * 条数下拉至少要有两档才值得出(只剩一档 = 没得选)。
 */
export const TOPN_MIN_OPTS = 2

/**
 * 冷解读的回看窗(设计 §4):当期分数线 vs **近 12 期同通道**的区间。
 */
export const HIST_WINDOW = 12

/**
 * 冷解读的样本门槛:同通道有效期数 <4 不出解读(样本太少的「区间」是噪音,宁可不说)。
 */
export const HIST_MIN_N = 4

/**
 * 抽选表下发条数上限(前端 Top N 下拉再切;冷解读要按通道回看 12 期,
 * 多取的那批只在服务端用完即丢,不进 HTML)。
 */
export const DRAWS_LIMIT = 50

/**
 * 政策动态下发条数上限(多取几条再按标题去重,前端 Top N 下拉再切)。
 */
export const NEWS_LIMIT = 50

/**
 * 首页聚合的进程内缓存时长(ms)。手法照 jobs/page.tsx 的 ssrDimsCache:判决证据/抽选/
 * 政策/省卡全是与用户无关的聚合数,10 分钟陈旧完全可接受;Render 单实例,进程缓存即全局缓存。
 * checkedAt 与「用户档案省」不进缓存(前者 lib/jobs/queries 自带 30s,后者是逐用户的)。
 */
export const HOME_TTL_MS = 600000

/**
 * 职业筛 datalist 候选与分类联动表的进程内缓存时长(ms;旧货架页同款手法,
 * ~500 行 gzip 15KB)。
 */
export const DICT_TTL_MS = 3600000

/**
 * 分类维度表的取数上限(一行 = 一个小类)。
 */
export const CAT_FIND_LIMIT = 1000

/**
 * 分类维度表的关联深度(只要本表列,不展开关联)。
 */
export const CAT_FIND_DEPTH = 0

/**
 * 分类维度表的 collection 名(打错是静默取空 —— 查不到就没有联动下拉)。
 */
export const CAT_COLLECTION = 'noc-categories'

/**
 * 同题去重的归一化正则:IRCC 同一稿隔日重发常只差尾部「(城市)」括注,精确比对抓不住,
 * 先把尾部括注剪掉再比。
 */
export const NEWS_TAIL_RE = /\s*[(（][^)）]*[)）]\s*$/

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
 * 收缩榜题后面那只箭头(2026-08-08 Frank:榜题带涨跌箭头)。
 */
export const ARROW_DOWN = '↓'

/**
 * 增长榜题后面那只箭头。
 */
export const ARROW_UP = '↑'

/**
 * 省名 i18n 键的头(拼上省码;下拉里只显本语言全名)。
 */
export const KEY_PROV_HEAD = 'prov.'

/**
 * 省份译名 i18n 键的头(拼上省码;英文界面不出译名)。
 */
export const KEY_PR_HEAD = 'pr.'

/**
 * 大类名 i18n 键的头(拼上大类值;27 个大类已全译)。
 */
export const KEY_BROAD_HEAD = 'broad.'

/**
 * 难度档名 i18n 键的头(拼上档位)。
 */
export const KEY_DIFF_HEAD = 'diff.'

/**
 * 橱窗单表表题 i18n 键的头(拼上人群档)。
 */
export const KEY_SE_GRP_HEAD = 'se.grp.'

/**
 * 对话导流钮预填问句 i18n 键的头(拼上人群档)。
 */
export const KEY_SE_ASK_HEAD = 'se.ask.'

/**
 * 未分类大类的数据值(它没有 i18n 键,单独走「未分类」那条词)。
 */
export const BROAD_UNCAT = '未分类'

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
 * 分类三级里的大类那一级(橱窗筛选按级取值时的键名)。
 */
export const NOC_KEY_BROAD = 'broad'

/**
 * 分类三级里的中类那一级。
 */
export const NOC_KEY_MID = 'mid'

/**
 * 分类三级里的小类那一级。
 */
export const NOC_KEY_FINE = 'fine'

/**
 * 中类值(行键)在分类维度行上的列名。
 */
export const COL_MID_KEY = 'mid'

/**
 * 小类值(行键)在分类维度行上的列名。
 */
export const COL_FINE_KEY = 'fine'

/**
 * 中类英文名在分类维度行上的列名。
 */
export const COL_MID_EN = 'midEn'

/**
 * 中类韩文名在分类维度行上的列名。
 */
export const COL_MID_KO = 'midKo'

/**
 * 小类英文名在分类维度行上的列名。
 */
export const COL_FINE_EN = 'fineEn'

/**
 * 小类韩文名在分类维度行上的列名。
 */
export const COL_FINE_KO = 'fineKo'

/**
 * 省序表里查不到的省排在最后(省下拉按 PROVS 的次序排,表外的码兜到队尾)。
 */
export const PROV_ORDER_LAST = 99

/**
 * 通道档序表里查不到的档排在最后。
 */
export const TIER_RANK_LAST = 9

/**
 * E13-08 判定省序(与 etl/11_build_stats.PNP_PROV_ORDER 同值同序;QC 不判)——
 * 「有路可走的省」= 此序 − deadProvs(any_pr_path=true,含 AIP/保育兜底,不只雇主担保)。
 */
export const DEAD_PROV_ORDER = ['BC', 'AB', 'SK', 'MB', 'ON', 'NB', 'NS', 'PE', 'NL']

/**
 * E13-07 通道档的行序(Frank 2026-08-06 深夜四档拍板):rank 越小越难 ——
 * 有兜底榜默认难的在上(Frank「把最难的放上面」),同档按在架量。
 * ⚠️ 这张表原本还配着一张同名的配色表(employer 红 / ee 灰 / fed 青 / prov 与 both 绿),
 * 通道档 pill 列 2026-08-08 三轮退役后配色随列一起退役(理由留在 start.module.css 的
 * 胶囊段),只有这份**档次序**还活着:榜 B 的行序按它排。
 */
export const TIER_RANK: Record<string, number> = {
  /**
   * 仅雇主担保:最难,排最上(「别为它来」)。
   */
  employer: 0,

  /**
   * 只够得着联邦 EE。
   */
  ee: 1,

  /**
   * 联邦点名。
   */
  fed: 2,

  /**
   * 省点名。
   */
  prov: 3,

  /**
   * 省与联邦双头点名:最松,排最下。
   */
  both: 4,
}

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
 * 橱窗人群档:没工签 → 要雇主办 LMIA。
 */
export const KIND_LMIA = 'lmia'

/**
 * 橱窗人群档:有工签 → 要打包省提名。
 */
export const KIND_NAMED = 'named'

/**
 * 橱窗人群档:去海洋省 → AIP 指定雇主。
 */
export const KIND_AIP = 'aip'

/**
 * 省筛下拉的元素身份(换人群档时控件顺序变,靠它认出「还是那只下拉」不重挂)。
 */
export const SEL_PROV = 'prov'

/**
 * 通道筛下拉的元素身份。
 */
export const SEL_STREAM = 'stream'

/**
 * 大类筛下拉的元素身份。
 */
export const SEL_BROAD = 'broad'

/**
 * 中类筛下拉的元素身份。
 */
export const SEL_MID = 'mid'

/**
 * 小类筛下拉的元素身份。
 */
export const SEL_FINE = 'fine'

/**
 * 职业筛下拉的元素身份。
 */
export const SEL_OCC = 'occ'

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
 * 分布主图的加载占位高(px)。
 */
export const PH_CHART = 380

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
 * 筛选下拉的壳宽档(lg = 210,就业把脉这一档)。
 */
export const SELECT_SIZE = 'lg'

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
 * 顶栏高亮键(本页在顶栏上是「就业把脉」那一项)。
 */
export const HEADER_ACTIVE = 'start'

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
 * 行 hover 高亮的全局规范类(同上)。
 */
export const CLS_ROW_HOVER = 'rowHover'

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
 * 埋点名:点了橱窗表题旁的对话导流钮。
 */
export const TRACK_ASK = 'se-ask-chat'

/**
 * 埋点名:点了 S6 的职位板入口大钮。
 */
export const TRACK_CTA = 'landing_cta_browse'

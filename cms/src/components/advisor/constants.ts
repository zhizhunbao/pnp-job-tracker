/**
 * advisor 域的死值:内嵌初判段要打的接口、HTTP 词、两个 field 档与状态档。
 * 2026-08-28 拆域批随 JdAdvisorSection 自 components/jobs/Jd.tsx 迁入 —— 它是顾问域的肉,
 * 寄居 JD 文件是历史(消费者:职位详情、公司弹框、本域完整弹框)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */

/**
 * POST。
 */
export const METHOD_POST = 'POST'

/**
 * 请求体类型头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 的 MIME。
 */
export const MIME_JSON = 'application/json'

/**
 * 纯 JD 速读(职位弹框,2026-07-21 Frank「只速读这个 job 的内容即可,
 * 不需要过度解读移民信号」)。
 */
export const FIELD_JD_READ = 'jdRead'

/**
 * 空串:没有文本 / 没有标题。
 */
export const TEXT_NONE = ''

/**
 * 一个空格(图标与文字之间)。
 */
export const SPACE = ' '

/**
 * 顾问弹框的尺寸记忆键(记 `{full, w, h}`;位置每次打开居中,避免窗口缩小后跑出屏外)。
 */
export const ADV_PREF = 'adv_modal_pref'

/**
 * 职位描述弹框的尺寸记忆键。与顾问弹框分开存:两框常用尺寸不同,共用一个键会互相踩。
 */
export const JD_PREF = 'jd_modal_pref'

/**
 * 顾问弹框默认宽(2026-07-10 用户反馈「弹框不够大,内容显示不全」再加一档)。
 */
export const ADV_PANEL_W = 900

/**
 * 顾问弹框默认高。
 */
export const ADV_PANEL_H = 760

/**
 * 职位描述弹框默认宽(比顾问框窄:它只装一栏 JD 正文)。
 */
export const JD_PANEL_W = 760

/**
 * 职位描述弹框默认高。
 */
export const JD_PANEL_H = 640

/**
 * 分类弹框的职责/要求翻译接口(懒调朋友那台 qwen,进程缓存;数据层只存英文)。
 */
export const URL_API_NOC_TRANSLATE = '/api/noc/translate'

/**
 * 管理员「重译」:清这一岗译文与版本(2026-09-14 Frank「右上角加一个刷新的按钮吧」「把重译去掉」:钮住浮层页眉右上角)。
 */
export const URL_API_JOBS_RETRANSLATE = '/api/jobs/retranslate'

/**
 * 管理员「重译」:清这家公司别名 / 简介译文与版本。
 */
export const URL_API_EMPLOYERS_RETRANSLATE = '/api/employers/retranslate'

/**
 * 公司在榜岗清单的接口头:走职位板的全文搜索参数 q(2026-09-14 Frank「这个为什么只有第一个改成弹框了」:
 * 原写 `?company=`,接口没这个参数、整条被当无筛选,回来的是全站最新一页,只有恰好在那一页的岗才能解析成弹框,
 * 其余落成整页跳转)。
 */
export const URL_API_JOBS_COMPANY = '/api/jobs?q='

/**
 * 同公司在榜岗只取第一页(弹框里是「还有哪些岗」的一瞥,不做分页)。
 */
export const URL_PAGE_FIRST = '&page=0'

/**
 * 正文要读省提名清单 / 抽选整表的分组(2026-09-26 起两表懒取:这几组开框先等两表到齐再渲正文,别的组照旧当场出)。
 * 移民组(依据链读清单)、省提名组(清单卡 + 本省抽选卡)、EE 组(分数线卡读联邦轮次)、AIP 组(不受理清单)、
 * 地点组(省份卡读本省抽选)—— 与各组正文真读 pnpOcc / pnpDraws 的那几件逐一对过;
 * 新增读这两表的组要在这里登记,否则那组开框会拿到空表。
 * 2026-09-28 省提名组撤出(省提名弹框自立成 pnp 桶的 PnpModal,自己取);取数本身也迁进 pnp 桶(usePnpData)。
 * 同日地点组撤出(Frank「地点弹框 删了吧」)。
 */
export const PNP_DATA_GROUPS = new Set(['immigration', 'ee', 'aip'])

/**
 * 两表懒取失败时那句话的提醒框色:notice 域四色里的红(2026-09-26;文案沿用雇主板同义的 de.loadFailed,不另起词条)。
 */
export const NOTICE_ERR = 'err'

/**
 * 省地区统计页的地址头(地点弹框的「打开完整页」——它有专属 SEO 页)。
 */
export const URL_STATS_HEAD = '/stats/'

/**
 * 公司详情页的地址头(区级卡里的雇主名点得进去)。
 */
export const URL_COMPANY_HEAD = '/companies/'

/**
 * 职位详情页的地址头(2026-09-21 职位描述弹框右上角的箭头钮去这里)。
 */
export const URL_JOB_HEAD = '/jobs/'

/**
 * 雇主池键的前缀:公司弹框的 slug 以它开头 = 这家没有公司页(只在指定名单 / LMIA 里出现过,雇主板上点得开),不出箭头钮。
 */
export const POOL_KEY_HEAD = 'n:'

/**
 * 市级取数的城市参数名。
 */
export const P_CITY = 'city'

/**
 * 市级取数的省码参数名。
 */
export const P_PROV = 'prov'

/**
 * 市级取数的区参数名(点区进来才带)。
 */
export const P_DISTRICT = 'district'

/**
 * 带上登录 cookie 取数(同公司在榜岗按登录态给字段)。
 */
export const CREDENTIALS_INCLUDE = 'include'

/**
 * 新开页目标(弹框里点出去的链接一律新标签页 —— 别把弹框关掉)。
 */
export const TARGET_BLANK = '_blank'

/**
 * 翻译在途。
 */
export const TRANS_LOADING = 'loading'

/**
 * 翻译失败(整块不消失,钮上说人话让人再点一次)。
 */
export const TRANS_ERROR = 'error'

/**
 * 翻译还没点过。
 */
export const TRANS_IDLE = 'idle'

/**
 * 一格三态里的「没有值」占位(值真的缺时显示的破折号)。
 */
export const DASH = '—'

/**
 * 折叠开关展开态的记号。
 */
export const CARET_DOWN = '▾'

/**
 * 折叠开关收起态的记号。
 */
export const CARET_RIGHT = '▸'

/**
 * 外链尾巴(点出去会离开本页)。
 */
export const ARROW_EXTERNAL = '↗'

/**
 * 枚举多值时的顿号(全站禁「·」「/」杂糅,枚举一律顿号)。
 */
export const LIST_SEP = '、'

/**
 * 拼 className 时各类之间的分隔符。HTML 的 class 属性按**空白**切词,
 * 写错不会报错,只会让两个类粘成一个匹配不上的长类名,那一块当场变成裸元素。
 */
export const CLS_SEP = ' '

/**
 * 金额前缀。
 */
export const MONEY_HEAD = '$'

/**
 * 千元单位尾巴(年薪一律折成 K 显示,读得快)。
 */
export const THOUSAND_TAIL = 'K'

/**
 * 年薪单位尾巴。
 */
export const PER_YEAR_TAIL = '/yr'

/**
 * 时薪单位尾巴。
 */
export const PER_HOUR_TAIL = '/hr'

/**
 * 一千(年薪折 K 的除数)。
 */
export const THOUSAND = 1000

/**
 * 一百(比中位的偏离折成百分比)。
 */
export const HUNDRED = 100

/**
 * NOC 码前缀(五位码前面那三个字母)。
 */
export const NOC_HEAD = 'NOC '

/**
 * TEER 档前缀。
 */
export const TEER_HEAD = 'TEER '

/**
 * TEER 档后面那句人话说明的左括号。
 */
export const PAREN_OPEN = ' ('

/**
 * TEER 档人话说明的右括号。
 */
export const PAREN_CLOSE = ')'

/**
 * JD 命中原句的左引号(可核验:原句照抄,不转述)。
 */
export const QUOTE_OPEN = '“'

/**
 * JD 命中原句的右引号。
 */
export const QUOTE_CLOSE = '”'

/**
 * 换行(职责/要求逐行拆的分隔)。
 */
export const NEWLINE = '\n'

/**
 * 界面语言里的英文(中文对照钮在英文界面整条不出 —— 译文与主文案同语,挂一遍是两遍)。
 */
export const LANG_EN = 'en'

/**
 * 加拿大(国家格缺席时的兜底:本站只收加拿大的岗)。
 */
export const COUNTRY_CANADA = 'Canada'

/**
 * 魁北克省码。QC 走自己的移民体系,不属 PNP —— 省级卡组里它的通道数与配额行都不出,
 * 换成一句独立体系说明。
 */
export const PROV_QC = 'QC'

/**
 * 岗位下架态。
 */
export const STATUS_CLOSED = 'closed'

/**
 * 岗位在招态(status 缺席时按在招算 —— 抓到就是在招,下架要靠对账才知道)。
 */
export const STATUS_OPEN = 'open'

/**
 * 未分类的分类值:数据层匹配不上 NOC 时写的字。分类行遇到它整行不渲 ——
 * 「未分类」不是一个分类,摆上去是噪音。
 */
export const CAT_NONE = '未分类'

/**
 * 抽选记录里的「公告」类型(只是通知不是真抽选,判「改制后抽没抽过」时不算数)。
 */
export const DRAW_KIND_NOTICE = 'notice'

/**
 * JD 取数被防滥用闸挡下的档名(#201:429 = JD 宽松防滥用闸偶发,JD 已免费,非付费墙)。
 * ⚠️ 与 components/jobs 的 fetchJobText 是同一个档表,值必须逐字相同 ——
 * 各域自己声明自己的常量,改一处要两处一起改。
 */
export const JOB_TEXT_LIMITED = 'limited'

/**
 * 地点面板的省级档。
 */
export const LEVEL_PROVINCE = 'province'

/**
 * ESDC 工资表低档那一行的列表键。
 */
export const BAND_KEY_LOW = 'low'

/**
 * ESDC 工资表中位那一行的列表键。
 */
export const BAND_KEY_MED = 'med'

/**
 * ESDC 工资表高档那一行的列表键。
 */
export const BAND_KEY_HIGH = 'high'

/**
 * 分类身份卡 NOC 码那一行的列表键。
 */
export const ROW_KEY_NOC = 'noc'

/**
 * 分类身份卡官方职业名那一行的列表键(与 NOC 码同属 `noc` 字段,点 NOC 两行齐亮)。
 */
export const ROW_KEY_NOC_TITLE = 'nocTitle'

/**
 * 分类身份卡 TEER 那一行的列表键。
 */
export const ROW_KEY_TEER = 'teer'

/**
 * 分类身份卡大类那一行的列表键。
 */
export const ROW_KEY_BROAD = 'broad'

/**
 * 分类身份卡职业名那一行的列表键(2026-09-23 职业分类改两级:中 / 小类两行撤,换职业名与职业码;
 * 职业名、职业码、官方名三行同属 `noc` 字段,点职业格三行齐亮)。
 * 同日 Frank「点击职业,不用都高亮吧」:一格点进来只亮一行 —— 职业格亮职业行,NOC 格亮码那一行,官方名不随任何一格亮。
 */
export const ROW_KEY_OCC = 'occ'

/**
 * AIP 直判的「命中」档(雇主在指定雇主名录里)。
 */
export const AIP_ON = 'on'

/**
 * 试点社区职业清单的「在清单内」档(RCIP 制度要求 offer 职业在清单内,官方清单为据)。
 */
export const PILOT_OCC_YES = 'yes'

/**
 * LMIA 高薪类(不受低薪冻结影响)。
 */
export const WAGE_HIGH = 'high'

/**
 * LMIA 低薪类(非豁免行业时大城市可能冻结)。
 */
export const WAGE_LOW = 'low'

/**
 * 直判药丸的「可以」档色。
 */
export const TONE_OK = 'ok'

/**
 * 直判药丸的「不可以」档色。
 */
export const TONE_FAIL = 'fail'

/**
 * 直判药丸的「未命中/不适用」档色(灰 —— 未命中不是坏消息,只是这条路不通)。
 */
export const TONE_NA = 'na'

/**
 * 直判药丸的「低于」档色(比中位低是提醒不是否定)。
 */
export const TONE_WARN = 'warn'

/**
 * 分类层级:大类(点「大分类」格不混进中/小分类 —— 07-06 用户点名)。
 */
export const CLS_DEPTH_BROAD = 1

/**
 * 分类层级:NOC 全链(五位码职业级信息只在这一格里给)。
 */
export const CLS_DEPTH_NONE = 0

/**
 * 薪资组的五个字段(帖面 / 折算年薪 / ESDC 时薪中位 / ESDC 年薪中位 / 对比中位)。
 */
export const SAL_FIELDS = ['salary', 'salaryYr', 'wageMedHr', 'wageMedYr', 'vsMedian']

/**
 * 分类组的字段(NOC 全链 / TEER / 大)。2026-09-23 职业分类改两级:中 / 小两个字段随表格两列一起撤
 * (原为五个:NOC 全链 / TEER / 大 / 中 / 小)。同日 NOC 码列单列回来,码列字段进组。
 */
export const CLS_FIELDS = ['noc', 'nocCode', 'teer', 'broad']

/**
 * 来源组的三个字段(来源板 / 发布渠道 / 一手转帖)。
 */
export const SRC_FIELDS = ['source', 'origin', 'direct']

/**
 * 时间组的四个字段(状态 / 发布 / 抓取 / 下架)。
 */
export const TIME_FIELDS = ['status', 'datePosted', 'lastSeen', 'closedAt']

/**
 * 通道档字段(移民组的头牌:个人化解读「对我意味着什么」)。
 */
export const FIELD_SCORE = 'score'

/**
 * 联邦快速通道字段。
 */
export const FIELD_EE = 'ee'

/**
 * 大西洋试点(AIP)字段。
 */
export const FIELD_AIP = 'aip'

/**
 * 乡村/法语社区试点(RCIP/FCIP)字段。
 */
export const FIELD_PILOT = 'pilot'

/**
 * 担保红旗字段(GAP1③:红旗 + JD 命中原句)。
 */
export const FIELD_ELIGIBILITY = 'eligibility'

/**
 * 公司级 LMIA 获批史字段。
 */
export const FIELD_LMIA = 'lmia'

/**
 * NOC 字段。
 */
export const FIELD_NOC = 'noc'

/**
 * NOC 码列字段(2026-09-23 职业列占了 noc 键后单起的码列;点它只亮码那一行)。
 */
export const FIELD_NOC_CODE = 'nocCode'

/**
 * TEER 字段。
 */
export const FIELD_TEER = 'teer'

/**
 * 大分类字段。
 */
export const FIELD_BROAD = 'broad'

/**
 * 无障碍字段。
 */
export const FIELD_ACCESSIBILITY = 'accessibility'

/**
 * 公司字段。
 */
export const FIELD_COMPANY = 'company'

/**
 * 帖面薪资字段。
 */
export const FIELD_SALARY = 'salary'

/**
 * 对比中位字段。
 */
export const FIELD_VS_MEDIAN = 'vsMedian'

/**
 * ESDC 时薪中位字段(挂 ESDC 三档表那张卡)。
 */
export const FIELD_WAGE_MED_HR = 'wageMedHr'

/**
 * 来源板字段。
 */
export const FIELD_SOURCE = 'source'

/**
 * 发布渠道字段。
 */
export const FIELD_ORIGIN = 'origin'

/**
 * 一手/转帖字段。
 */
export const FIELD_DIRECT = 'direct'

/**
 * 状态字段。
 */
export const FIELD_STATUS = 'status'

/**
 * 发布时间字段。
 */
export const FIELD_DATE_POSTED = 'datePosted'

/**
 * 抓取时间字段。
 */
export const FIELD_LAST_SEEN = 'lastSeen'

/**
 * 下架时间字段。
 */
export const FIELD_CLOSED_AT = 'closedAt'

/**
 * 无障碍字段的「未知」值(列值是「—」会被 Row 隐藏,弹框里改说「未知(帖内未写)」)。
 */
export const ACC_UNKNOWN = 'unknown'

/**
 * 移民分组(通道档 + 个人化解读)。
 */
export const GROUP_IMMIGRATION = 'immigration'

/**
 * 分类分组(#176「这职业是干嘛的」:三卡 + 中文对照 + AI 速读)。
 */
export const GROUP_CATEGORY = 'category'

/**
 * 公司分组(2026-07-21:走专用 CompanyPanel 平级卡)。
 */
export const GROUP_COMPANY = 'company'

/**
 * 事实块按**分组**铺开的明表(E8-10 S6,2026-07-21)。
 * 收编前:点「通道」列只渲通道一条 —— 弹框标题写着「移民」,里面却只有一个字段,
 * 用户还得退出去再点 PNP、再点 EE、再点 AIP,每点一次烧一次额度。这正是 24 个弹框的病根。
 * 收编后:一个分组一次把该组事实全铺出来,顺序即阅读顺序,先结论后依据。
 * ⚠️ 一套组件伺候 24 种字段必漏,所以字段→分组是**一张明表**,不是 if 链。
 * 2026-07-25 Frank 拆弹框(#176 五合一退役):移民价值做薄=通道卡;PNP/EE/AIP/薪资
 * 各回各家 ——「xx 的内容只放 xx 的弹框」,与依据链结论行不再重复。
 */
export const GROUP_SECTIONS: Record<string, string[]> = {
  /**
   * 移民组只剩通道档一条(三行直判卡 2026-07-26 退役:它是 PNP/EE/AIP 三列的汇总,
   * 三列点开各有更具体的弹框,一条信息只出现一次)。
   */
  immigration: ['score'],

  /**
   * 联邦快速通道组。
   */
  ee: ['ee'],

  /**
   * 大西洋试点组。
   */
  aip: ['aip'],

  /**
   * 乡村/法语社区试点组。
   */
  pilot: ['pilot'],

  /**
   * 薪资组三卡(批A):帖面(原文+折算)+ vs 中位(ESDC 中位+直判)+ ESDC 表(低中高一行一条)。
   */
  salary: ['salary', 'vsMedian', 'wageMedHr'],

  /**
   * 分类组。
   */
  category: ['noc'],

  /**
   * 公司组走专用 CompanyPanel(平级卡),不经本表(2026-07-21)。
   */
  company: [],

}

/**
 * 列名文案键的前缀(弹框里大量「这一格叫什么」直接复用列名)。
 */
export const K_COL_HEAD = 'col.'

/**
 * 分组名文案键的前缀(页眉那行灰色小标)。
 */
export const K_GROUP_HEAD = 'grp.'

/**
 * 工时枚举的文案键前缀。
 */
export const K_EMP_HEAD = 'emp.'

/**
 * 雇佣期枚举的文案键前缀。
 */
export const K_TERM_HEAD = 'term.'

/**
 * TEER 档人话说明的文案键前缀。
 */
export const K_TEER_HEAD = 'teer.'

/**
 * 大分类名的文案键前缀。
 */
export const K_BROAD_HEAD = 'broad.'

/**
 * 发布渠道枚举的文案键前缀。渠道值是数据层写的,界面语文案表里未必配齐 ——
 * 取回来还是键本身时退回原值(见 functions 的 originTextOf)。
 */
export const K_ORIGIN_HEAD = 'origin.'

/**
 * 无障碍枚举的文案键前缀。
 */
export const K_ACC_HEAD = 'acc.'

/**
 * 担保红旗枚举的文案键前缀。
 */
export const K_ELIG_HEAD = 'cell.elig.'

/**
 * AIP 直判三态的文案键前缀。
 */
export const K_AIP_HEAD = 'ch.aip.'

/**
 * 埋点:四类弹框打开各记一事件(modal-immigration / company / category / location),
 * 拼上分组名(#129 功能级埋点)。
 */
export const TRACK_MODAL_HEAD = 'modal-'

/**
 * 埋点:职位描述弹框打开(#129 + 漏斗第 1 步)。
 */
export const TRACK_MODAL_JD = 'modal-jd'

/**
 * 埋点:分类弹框点了中文对照(#129)。
 */
export const TRACK_CAT_TRANSLATE = 'cat-translate'

/**
 * 埋点:移民弹框点了中文对照。
 */
export const TRACK_IMM_TRANSLATE = 'imm-translate'

/**
 * 埋点参数名:入口格是哪一列。
 */
export const TRACK_P_FIELD = 'field'

/**
 * 埋点参数名:从哪种形态打开的(kind 分开弹框与整页)。
 */
export const TRACK_P_KIND = 'kind'

/**
 * 埋点参数值:弹框形态。
 */
export const TRACK_KIND_MODAL = 'modal'

/**
 * 白卡壳的全局类名(main.css 第 9 段:白底 + 描边 + 12 圆角 + 12/16 内衬 + 下边距 14)。
 * 跨域共用的词汇(companies / jobs 各有一份同名常量),不是顾问专有,留在全局层。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 卡片小标题的全局类名(main.css 第 9 段:13.5px 700 近黑 + 下边距 6)。同上,跨域共用。
 */
export const CARD_HEAD_CLS = 'mcardHead'

/**
 * 事实网格标签格的全局类名(main.css 第 9 段)。它是 grid 域的**单元格角色词汇**
 * (见 components/grid/types.ts:角色类由调用方按格写,组件不按列位自动派),
 * 所以留全局层,不收进本域私有样式。
 */
export const GRID_K_CLS = 'gridK'

/**
 * 事实网格值格的全局类名(等宽数字对齐)。同上。
 */
export const GRID_V_CLS = 'gridV'

/**
 * 事实网格注格的全局类名(小一号灰字)。同上。
 */
export const GRID_N_CLS = 'gridN'

/**
 * 职位字段(点它开的是职位组的事实块:雇佣形态 + 入职要求 + JD 摘录)。
 * ⚠️ 与 FIELD_TITLE 值相同意思不同:那个是**生成哪一种 AI 段**的档,这个是**哪一列**。
 */
export const COL_TITLE = 'title'

/**
 * ESDC 工资表的列数(档名 | 时薪 | 折算年薪)。
 */
export const GRID_COLS_3 = 3

/**
 * 网格里标签格的列表键后缀。
 */
export const KEY_TAIL_K = 'k'

/**
 * ESDC 表时薪格的列表键后缀。
 */
export const KEY_TAIL_HR = 'hr'

/**
 * ESDC 表年薪格的列表键后缀。
 */
export const KEY_TAIL_YR = 'yr'

/**
 * ESDC 表表头空格的列表键(首行是表头:同一列在不同行里角色不同,
 * 所以角色类按格写不按列位派)。
 */
export const HEAD_KEY_BLANK = 'head0'

/**
 * ESDC 表表头时薪格的列表键。
 */
export const HEAD_KEY_HR = 'head1'

/**
 * ESDC 表表头年薪格的列表键。
 */
export const HEAD_KEY_YR = 'head2'

/**
 * 正文蓝链的全局类名(main.css 第 5 段 `.link`:品牌蓝 + 无下划线)。地图链接用它 ——
 * 它是**跨域共用的词汇**;地点卡里的值链接走本域私有的 .valueLink(那一处历来是自己的蓝)。
 */
export const LINK_CLS = 'link'

/**
 * 弹框栈的职位层(2026-09-21;PeekJobLayer.kind 的字面量)。
 */
export const LAYER_JOB = 'job'

/**
 * 弹框栈的公司层(PeekCoLayer.kind 的字面量)。
 */
export const LAYER_CO = 'company'

/**
 * 弹框栈各层 key 的分隔(位置 + 种类 / 岗位号)。
 */
export const PEEK_KEY_SEP = ':'

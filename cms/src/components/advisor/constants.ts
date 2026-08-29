/**
 * advisor 域的死值:内嵌初判段要打的接口、HTTP 词、两个 field 档与状态档。
 * 2026-08-28 拆域批随 JdAdvisorSection 自 components/jobs/Jd.tsx 迁入 —— 它是顾问域的肉,
 * 寄居 JD 文件是历史(消费者:职位详情、公司弹框、本域完整弹框)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */

/**
 * 顾问初判/速读的流式接口。
 */
export const URL_API_ADVISOR = '/api/advisor'

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
 * 剩余免费次数的响应头(额度可见化)。
 */
export const HDR_FREE_LEFT = 'X-Free-Left'

/**
 * 402:免费额度用完 → 升级卡。
 */
export const HTTP_PAYMENT = 402

/**
 * 429:匿名 IP 池用完 → 打码 + 锁行说人话。
 */
export const HTTP_TOO_MANY = 429

/**
 * 顾问初判(详情页,含移民路径)。
 */
export const FIELD_TITLE = 'title'

/**
 * 纯 JD 速读(职位弹框,2026-07-21 Frank「只速读这个 job 的内容即可,
 * 不需要过度解读移民信号」)。
 */
export const FIELD_JD_READ = 'jdRead'

/**
 * 在途:还没开始出字。
 */
export const ADV_LOADING = 'loading'

/**
 * 在途:正在出字(尾巴挂打字机光标)。
 */
export const ADV_STREAMING = 'streaming'

/**
 * 出完了。
 */
export const ADV_DONE = 'done'

/**
 * 生成失败(2026-07-25 用户:解析失败要能重试)。
 */
export const ADV_ERROR = 'error'

/**
 * 免费额度用完 → 升级卡。
 */
export const ADV_UPGRADE = 'upgrade'

/**
 * 防滥用闸挡下 → 打码 + 锁行(#175:429 黄条退役,失去感靠打码传达)。
 */
export const ADV_LIMITED = 'limited'

/**
 * 缓存键的两段分隔(`档:岗位号`)。
 */
export const CK_SEP = ':'

/**
 * 空串:没有文本 / 没有标题。
 */
export const TEXT_NONE = ''

/**
 * 流式打字机光标。
 */
export const CARET_BAR = '▋'

/**
 * 一个空格(图标与文字之间)。
 */
export const SPACE = ' '

/**
 * 定制样式钮统一走 ghost 变体 + 本域加倍类(样板 account 的 PLAIN_BTN_KIND)。
 */
export const BTN_GHOST = 'ghost'

/**
 * AI 顾问弹框正文长文的总开关。Frank 走查#15(2026-07-25):AI 顾问(移民弹框
 * 【移民信号/分步走/怎么准备】长文)整体可逆下架 ——「目前看着是废话,没什么实际价值;
 * 以后可能再用,看情况」。false = 不渲卡 + 不发请求(省额度 / 省朋友那台 qwen)+
 * 页眉不挂「AI 顾问」名;翻回 true 即复活(`/api/advisor`、etl 底子未删)。
 */
export const AI_ADVISOR_ON = false

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
 * 浮层最小宽(px):再窄两列事实行就挤成一团。
 */
export const PANEL_W_MIN = 360

/**
 * 浮层最小高(px)。
 */
export const PANEL_H_MIN = 280

/**
 * 浮层与视口边缘的留白(px):算居中位与钳制记忆尺寸时,先从视口宽高里扣掉它,
 * 免得贴边贴到看不见拉伸手柄。
 */
export const VIEWPORT_GAP = 24

/**
 * 浮层左上角的最小坐标(px):再往上就把标题栏顶出屏外,拖不回来。
 */
export const PANEL_POS_MIN = 12

/**
 * 首帧还没测到视口时的落位横坐标(服务端渲染没有 window)。
 */
export const PANEL_POS_X0 = 80

/**
 * 首帧还没测到视口时的落位纵坐标。
 */
export const PANEL_POS_Y0 = 60

/**
 * 八向拉伸的方向名,顺序即渲染顺序(四条边在前、四个角在后 —— 角块要盖在边条上)。
 * 每个方向的边距与光标是**样式**,住 advisor.module.css 的 .edgeN … .edgeSe;
 * 这里只留身份,拼类走 functions 的 edgeClsOf。
 */
export const PANEL_DIRS = ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se']

/**
 * 方向名里的「东」(右边跟手,右边界外扩)。
 */
export const DIR_E = 'e'

/**
 * 方向名里的「南」(下边跟手)。
 */
export const DIR_S = 's'

/**
 * 方向名里的「西」(左边跟手:宽反向变,同时挪左上角)。
 */
export const DIR_W = 'w'

/**
 * 方向名里的「北」(上边跟手:高反向变,同时挪左上角)。
 */
export const DIR_N = 'n'

/**
 * 指针移动的事件名(平台定值,打错是静默失效 —— 监听器绑不上不报错)。
 */
export const EV_POINTER_MOVE = 'pointermove'

/**
 * 指针松开的事件名。
 */
export const EV_POINTER_UP = 'pointerup'

/**
 * 分类弹框的职责/要求翻译接口(懒调朋友那台 qwen,进程缓存;数据层只存英文)。
 */
export const URL_API_NOC_TRANSLATE = '/api/noc/translate'

/**
 * 省级面板的取数接口头(拼上编码后的省码)。
 */
export const URL_API_PROVINCE = '/api/jobs/province?code='

/**
 * 市/区级面板的取数接口头(拼上 city / prov / district 三个查询参数)。
 */
export const URL_API_CITY = '/api/jobs/city?'

/**
 * 同公司在榜岗的取数接口头(E10-01 P3:blob 没了 → 打开公司弹框时按公司名现拉)。
 */
export const URL_API_JOBS_COMPANY = '/api/jobs?company='

/**
 * 同公司在榜岗只取第一页(弹框里是「还有哪些岗」的一瞥,不做分页)。
 */
export const URL_PAGE_FIRST = '&page=0'

/**
 * 省地区统计页的地址头(地点弹框的「打开完整页」——它有专属 SEO 页)。
 */
export const URL_STATS_HEAD = '/stats/'

/**
 * 公司详情页的地址头(区级卡里的雇主名点得进去)。
 */
export const URL_COMPANY_HEAD = '/companies/'

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
 * 分类弹框的 AI 速读档:按 NOC 现查职责/要求(2026-08-23 契约换 id 制,不再整包上传)。
 */
export const FIELD_OCC_READ = 'occRead'

/**
 * 省级面板的 AI 解读档:事实块由服务端用面板同一取数函数重建(provFactsOf)。
 */
export const FIELD_PROV_READ = 'provRead'

/**
 * 市/区级面板的 AI 解读档(cityFactsOf)。
 */
export const FIELD_CITY_READ = 'cityRead'

/**
 * 点了才生成的那类 AI 段的起手态:还没点过,一个字都没烧。
 */
export const ADV_IDLE = 'idle'

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
 * 打字机的出字节拍(ms):约每秒 30 帧,肉眼看着是连续吐字。
 */
export const TYPE_TICK_MS = 33

/**
 * 打字机每帧吐掉积压的几分之一。与积压成正比 —— 整段大文本几秒内追平,不会无限拖尾。
 */
export const TYPE_RATE_DIV = 12

/**
 * 打字机每帧至少吐几个字(积压很短时也别一个字一个字磨)。
 */
export const TYPE_MIN_CHARS = 2

/**
 * 建议问题的分隔记号(❓ 协议):模型把「下一步该问什么」写在这个记号之后。
 * ⚠️ 与 components/jobs 的 extractSug 是**同一个协议**,值必须逐字相同 ——
 * 各域自己声明自己的常量(宪法「域之间不互相取常量」),改一处要两处一起改。
 */
export const SUG_MARK = '❓'

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
 * 关闭钮上的叉。
 */
export const CLOSE_MARK = '×'

/**
 * 枚举多值时的顿号(全站禁「·」「/」杂糅,枚举一律顿号)。
 */
export const LIST_SEP = '、'

/**
 * 地图查询词各级之间的分隔(街址, 区, 市, 省 —— Google 地图吃这一套)。
 */
export const MAP_SEP = ', '

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
 * 百分号尾巴。
 */
export const PCT_TAIL = '%'

/**
 * 正向偏离的加号(负号由数字自带)。
 */
export const PLUS_HEAD = '+'

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
 * 地图链接尾巴的查询词左括号(「在 Google 地图查看(渥太华, ON)↗」)。
 */
export const MAP_PAREN_OPEN = '('

/**
 * 地图链接尾巴的查询词右括号。
 */
export const MAP_PAREN_CLOSE = ')'

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
 * 省提名职业清单里的「不受理」类型(算该省具名通道数时要把它剔掉)。
 */
export const OCC_TYPE_INELIGIBLE = 'ineligible'

/**
 * 抽选记录里的「公告」类型(只是通知不是真抽选,判「改制后抽没抽过」时不算数)。
 */
export const DRAW_KIND_NOTICE = 'notice'

/**
 * 近 180 天邀请那一格的常规口径注。
 */
export const K_DIFF_ACT = 'diff.n.act'

/**
 * 近 180 天邀请那一格的改制注:改制省(ON)近 180 天的抽选全在改制之前 ——
 * 不加注就与下方「旧 8 条流已关闭」自相矛盾。判定走同一份抽选记录:
 * 改制日之后一条都没有才加注,新 EOI 一开抽注自动消失。
 */
export const K_DIFF_ACT_OLD = 'diff.n.actOld'

/**
 * 临时外劳项目的英文缩写(人话名主文案 + 代码灰字小注:Frank「TFWP/IMP 用户都不知道是什么」)。
 */
export const CODE_TFWP = 'TFWP'

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
 * 地点面板的市级档。
 */
export const LEVEL_CITY = 'city'

/**
 * 地点面板的区级档。
 */
export const LEVEL_DISTRICT = 'district'

/**
 * 市/区 AI 解读主体标识的分段记号(「市|省|区」拼串,服务端按同一形状拆)。
 */
export const ID_SEP = '|'

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
 * 分类身份卡中类那一行的列表键。
 */
export const ROW_KEY_MID = 'mid'

/**
 * 分类身份卡小类那一行的列表键。
 */
export const ROW_KEY_FINE = 'fine'

/**
 * 体量卡留学生那一行的列表键。
 */
export const VOL_KEY_STUDY = 'study'

/**
 * 体量卡临时外劳那一行的列表键。
 */
export const VOL_KEY_TFWP = 'tfwp'

/**
 * 体量卡国际流动项目那一行的列表键。
 */
export const VOL_KEY_IMP = 'imp'

/**
 * 体量卡提名配额那一行的列表键。
 */
export const VOL_KEY_ALLOC = 'alloc'

/**
 * 体量卡省提名落地那一行的列表键。
 */
export const VOL_KEY_PNP_PR = 'pnpPr'

/**
 * 市/区体量在招岗数那一行的列表键。
 */
export const AREA_KEY_OPEN = 'openJobs'

/**
 * 市/区体量近 7 天新增那一行的列表键。
 */
export const AREA_KEY_NEW7D = 'new7d'

/**
 * 市/区体量年薪中位那一行的列表键。
 */
export const AREA_KEY_MED = 'medSalary'

/**
 * 市/区体量大类分布那一行的列表键。
 */
export const AREA_KEY_BROADS = 'topBroads'

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
 * 难度因子:竞争比(在池人数 ÷ 当年配额)。
 */
export const FAC_COMP = 'comp'

/**
 * 难度因子:配额同比。
 */
export const FAC_QUOTA_TREND = 'quotaTrend'

/**
 * 难度因子:近 180 天邀请。
 */
export const FAC_ACTIVITY = 'activity'

/**
 * 难度因子:最近一次抽选的分数档。
 */
export const FAC_SCORE_LEVEL = 'scoreLevel'

/**
 * 省级卡里最近抽选只列一条(省弹框是一瞥,深看去统计页)。
 */
export const DRAWS_LIMIT_ONE = 1

/**
 * 省级卡组里最近抽选列三条(点省进来就是来看这个的)。
 */
export const DRAWS_LIMIT_THREE = 3

/**
 * 地点层级:国(点「国家」格只看到这一级)。
 */
export const DEPTH_COUNTRY = 1

/**
 * 地点层级:省。
 */
export const DEPTH_PROVINCE = 2

/**
 * 地点层级:市。
 */
export const DEPTH_CITY = 3

/**
 * 地点层级:区。
 */
export const DEPTH_DISTRICT = 4

/**
 * 地点层级:精确地址(点哪级只看哪级,含上级路径 —— 07-06 用户拍板)。
 */
export const DEPTH_ADDRESS = 5

/**
 * 分类层级:大类(点「大分类」格不混进中/小分类 —— 07-06 用户点名)。
 */
export const CLS_DEPTH_BROAD = 1

/**
 * 分类层级:中类。
 */
export const CLS_DEPTH_MID = 2

/**
 * 分类层级:小类。
 */
export const CLS_DEPTH_FINE = 3

/**
 * 分类层级:NOC 全链(五位码职业级信息只在这一格里给)。
 */
export const CLS_DEPTH_NONE = 0

/**
 * 地点组的五个字段(点哪一格开哪一级)。
 */
export const LOC_FIELDS = ['country', 'province', 'city', 'district', 'address']

/**
 * 薪资组的五个字段(帖面 / 折算年薪 / ESDC 时薪中位 / ESDC 年薪中位 / 对比中位)。
 */
export const SAL_FIELDS = ['salary', 'salaryYr', 'wageMedHr', 'wageMedYr', 'vsMedian']

/**
 * 分类组的五个字段(NOC 全链 / TEER / 大 / 中 / 小)。
 */
export const CLS_FIELDS = ['noc', 'teer', 'broad', 'mid', 'fine']

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
 * 省提名字段。
 */
export const FIELD_PNP = 'pnp'

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
 * TEER 字段。
 */
export const FIELD_TEER = 'teer'

/**
 * 大分类字段。
 */
export const FIELD_BROAD = 'broad'

/**
 * 中分类字段。
 */
export const FIELD_MID = 'mid'

/**
 * 小分类字段。
 */
export const FIELD_FINE = 'fine'

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
 * 国家字段。
 */
export const FIELD_COUNTRY = 'country'

/**
 * 省字段。
 */
export const FIELD_PROVINCE = 'province'

/**
 * 市字段。
 */
export const FIELD_CITY = 'city'

/**
 * 区字段。
 */
export const FIELD_DISTRICT = 'district'

/**
 * 精确地址字段。
 */
export const FIELD_ADDRESS = 'address'

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
 * 地点分组(E8-12:五卡两列,走专用面板)。
 */
export const GROUP_LOCATION = 'location'

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
   * 省提名组。
   */
  pnp: ['pnp'],

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

  /**
   * 地点组走专用 LocationPanel(五卡两列),不经本表(E8-12)。
   */
  location: [],
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
 * 移民难度档名的文案键前缀。
 */
export const K_DIFF_HEAD = 'diff.'

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
 * 埋点:地点弹框点开了 AI 解读。
 */
export const TRACK_AI_READ = 'ai-read-co'

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
 * 网格里值格的列表键后缀。
 */
export const KEY_TAIL_V = 'v'

/**
 * 网格里注格的列表键后缀。
 */
export const KEY_TAIL_N = 'n'

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
 * 居中位的除数:视口宽高减去浮层之后,左右(上下)各留一半。
 */
export const CENTER_DIV = 2

/**
 * employers 页面域的死值(2026-08-27 换装批:三个旧件里散着的类名、路径、记号、
 * 尺寸、映射表全部搬到这里挂注释 —— 闸 local/no-bare-strings 与 local/no-magic-number
 * 要的就是「每个值都有名字和说明书」)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */

/**
 * 拼 className 时各类之间的分隔符。HTML 的 class 属性按**空白**切词,一个空格就是
 * 一次分隔 —— 写错不会报错,只会让基座类和修饰类粘成一个匹配不上的长类名,
 * 那一块当场变成没样式的裸元素。
 * (account / notice 域各有一份同名同义的私有常量;跨域不互相取常量,各域自己声明一份。)
 */
export const CLS_SEP = ' '

/**
 * 白卡壳的全局类名。描边 + 圆角 + 白底那份真身写在 main.css 第 9 段的全局层,
 * 不是 CSS Module 生成的哈希名,所以取不到 `css.card`,只能按这个固定字符串拼。
 * 对照页的模糊样例卡叠在它之上,只管定位与裁剪。
 */
export const CARD_CLS = 'card'

/**
 * 对照表的手机卡容器类名(main.css 第 3 段「响应式:表 ⇄ 卡」的全局层)。
 * ≤640 显示卡片流、桌面隐藏 —— 与 `COMPARE_TABLE_CLS` 是同一条断点的两半,
 * 两者都留在全局层是历史位置,迁类时原样保留(改名要连 main.css 一起改)。
 */
export const COMPARE_CARDS_CLS = 'tcCards'

/**
 * 对照表的桌面表格容器类名(同上,≤640 隐藏)。
 */
export const COMPARE_TABLE_CLS = 'tcTableWrap'

/**
 * 筛选行控件的全局高度类名(main.css 第 5 段 `.sbCtl`:桌面 38px、
 * ≤640 断点 min-height 44 触控靶)。雇主板的「更多筛选」与「清空」两枚钮
 * 与职位板筛选控件同规格,靠它对齐。
 */
export const CTL_CLS = 'sbCtl'

/**
 * 雇主板口径:官方指定名录。路径段与筛选值同一个词。
 */
export const MODE_DESIGNATED = 'designated'

/**
 * 雇主板口径:本站库内在招。
 */
export const MODE_HIRING = 'hiring'

/**
 * 口径下拉的选项清单(顺序即显示顺序:名录在前,在招在后)。
 */
export const MODE_OPTS = [MODE_DESIGNATED, MODE_HIRING]

/**
 * 担保雇主三分表的人群档:去大西洋省(AIP 指定)。
 */
export const KIND_AIP = 'aip'

/**
 * 担保雇主三分表的人群档:没工签,要雇主办 LMIA。
 */
export const KIND_LMIA = 'lmia'

/**
 * 担保雇主三分表的人群档:有工签,要打包省提名。
 */
export const KIND_NAMED = 'named'

/**
 * 雇主板 API 的路径。换筛选/翻页打它懒取 —— 名录 6,680 行不进 SSR payload
 * (#313 同款性能红线),路径打错是静默 404,只能从这里取。
 */
export const EMP_API_URL = '/api/employers'

/**
 * 雇主板深链的路径前缀(后面接口径段:`/employers/designated`)。
 * 筛选态进 URL 走 replaceState,同职位板惯例。
 */
export const EMP_PATH_HEAD = '/employers/'

/**
 * 雇主板首页(对照页的「回名录」与清空对比栏后的落点)。
 * 旁边原有 EMP_BACK_URL('/plan/pr',雇主板右上角返回的落点 —— 初评表「查雇主」的来路),
 * 2026-09-03 撤编:Frank「所有主页面都不应该有返回按钮」,雇主板是顶栏一级页。
 */
export const EMP_URL = '/employers'

/**
 * 「看该雇主在招」的落点前缀:职位板按雇主名搜。雇主名本身就是这个直达 ——
 * 再单开一列同一个落点是 2026-08-10 拍过的重复入口,不做。
 */
export const JOBS_SEARCH_HEAD = '/jobs?q='

/**
 * 担保雇主卡/表里「看在招岗」的落点前缀:首页按雇主名搜(橱窗一族沿用首页搜)。
 */
export const HOME_SEARCH_HEAD = '/?q='

/**
 * 新开页的 target(名录出处、公司官网这类站外链;LinkButton 见到它自动补 rel)。
 */
export const TARGET_BLANK = '_blank'

/**
 * 埋点事件名:担保雇主卡/表点雇主名去看在招岗。打错是静默失效(事件照发、没人收),
 * 所以进常量。
 */
export const EV_VIEW_JOBS = 'se-view-jobs'

/**
 * 埋点事件名:雇主板搜索框落词(2026-09-04 /fe 雇主模块补)。防抖满了那一下才算一次,
 * 不是每敲一个字算一次。
 * 🔴 分组值是**口径**(designated / hiring),搜索词本身永不进埋点 —— 它是高基数自由文本,
 * 进了漏斗日聚合表就把表撑成明细表(lib/funnel 的 PROP_OK 也不收),还踩隐私页那句承诺。
 */
export const EV_SEARCH = 'emp-search'

/**
 * 埋点事件名:雇主板换了任意一格筛选。分组值是**哪一格**(见 EV_PROP_* 一族),
 * 不是选了什么值 —— 省码尚可,职业码是高基数,同上。
 */
export const EV_FILTER = 'emp-filter'

/**
 * 埋点事件名:雇主板点雇主名去看在招岗(表格行、手机卡标题、整卡触控靶三处同一件事;
 * 整卡那处点在卡内链接上时交给链接自己记,不重复)。分组值是口径。
 */
export const EV_ROW = 'emp-row'

/**
 * 埋点事件名:雇主板翻页。分组值是口径。
 */
export const EV_PAGE = 'emp-page'

/**
 * 埋点分组值:换的是口径那一格。
 * 🔴 与查询参数名 `P_MODE` 恰好同字,但**各自声明一份**:改 URL 参数名不该顺手改埋点分组值 ——
 * 改了历史计数就断在半路,再也对不上。下面四格同理。
 */
export const EV_PROP_MODE = 'mode'

/**
 * 埋点分组值:换的是省那一格。
 */
export const EV_PROP_PROV = 'prov'

/**
 * 埋点分组值:换的是制度那一格。
 */
export const EV_PROP_PROGRAM = 'program'

/**
 * 埋点分组值:换的是社区那一格。
 */
export const EV_PROP_CITY = 'city'

/**
 * 埋点分组值:换的是职业那一格。
 */
export const EV_PROP_NOC = 'noc'

/**
 * 埋点附加值里承载低基数分组的那个键。lib/track 的 pickProp 只认 plan / kind / card 三个键,
 * 换个键名不会报错,只会让分组值静默丢掉(事件照记,prop 永远是空)。
 */
export const EV_PROP_KEY = 'kind'

/**
 * 缺数记号。🔴 口径:它是「本站没有这一格」,不是 0 —— 官方可空的数值折 0 = 替官方编数。
 */
export const DASH_MARK = '—'

/**
 * 判定达标的前缀记号(后面接「达标」文案)。
 */
export const VERDICT_OK_HEAD = '✓ '

/**
 * 判定差项的前缀记号(后面接「差:年限、雇员数」这类差项清单)。
 */
export const VERDICT_NG_HEAD = '✗ '

/**
 * AIP 命中的对勾(对照表 AIP 维度行的标签内容)。
 */
export const AIP_MARK = '✓'

/**
 * 折叠抽屉收起态的箭头。
 */
export const CARET_DOWN = '▼'

/**
 * 折叠抽屉展开态的箭头。
 */
export const CARET_UP = '▲'

/**
 * 省名词条的键前缀(`pr.NS`)。拼出来的键查不到时原样显示省码 —— 字典缺词不该
 * 把省码吞掉。
 */
export const PROV_KEY_HEAD = 'pr.'

/**
 * 口径下拉选项名的键前缀(`de.mode.designated`)。
 */
export const MODE_KEY_HEAD = 'de.mode.'

/**
 * 行业大类名的键前缀(`broad.health`)。
 */
export const BROAD_KEY_HEAD = 'broad.'

/**
 * 省难度档名的键前缀(`diff.tight`)。
 */
export const DIFF_KEY_HEAD = 'diff.'

/**
 * 雇主门槛差项 → 文案键。判定引擎只交回差项的机器名(years/staff),
 * 人话在 i18n 里 —— 这张表是两者之间唯一的接头处,少一格就会渲出空串。
 */
export const VERDICT_FACTOR_KEY: Record<string, string> = {
  /**
   * 成立年限不足。
   */
  years: 'se.verdict.factor.years',

  /**
   * 雇员数不足。
   */
  staff: 'se.verdict.factor.staff',
}

/**
 * 雇主门槛列的排序权重:达标/差项排前面(信息量大的先看),待核垫底,
 * 公共部门单独一档(它是**旁路**不是判定结果,不该混进达标里)。
 */
export const VERDICT_RANK: Record<string, number> = {
  /**
   * 达标 —— 最有信息量,置顶。
   */
  met: 0,

  /**
   * 差项 —— 次之,点名差在哪。
   */
  short: 1,

  /**
   * 公共部门旁路 —— 不走门槛,单独一档。
   */
  public: 2,

  /**
   * 待核(列未回填)—— 垫底。
   */
  unknown: 3,
}

/**
 * 省难度档 → 标签变体。三档三色:easy 绿、mid 琥珀、tight 联邦蓝。
 */
export const DIFF_TAG: Record<string, 'ok' | 'warn' | 'federal'> = {
  /**
   * 好进的省 —— 通过绿。
   */
  easy: 'ok',

  /**
   * 中等 —— 关注琥珀。
   */
  mid: 'warn',

  /**
   * 卷的省 —— 联邦蓝(与「好/坏」二元区分开,它只是难)。
   */
  tight: 'federal',
}

/**
 * 行业标签的变体(地区/分类那一套配色)。
 */
export const TAG_REGION = 'region'

/**
 * AIP 命中标签的变体(通过绿)。
 */
export const TAG_OK = 'ok'

/**
 * 空对比栏提示框的色档(口径/注记蓝)。
 */
export const NOTICE_INFO = 'info'

/**
 * 白底描边钮的变体(「更多筛选」「清空」「回名录」)。
 */
export const BTN_SECONDARY = 'secondary'

/**
 * 付费琥珀钮的变体(样例表上的「解锁」)。
 */
export const BTN_PRO = 'pro'

/**
 * 弱操作幽灵钮的变体(「清空对比」)。
 */
export const BTN_GHOST = 'ghost'

/**
 * 雇主板筛选下拉的壳宽档(md = 170px,雇主板专属那一档)。
 */
export const SEL_SIZE = 'md'

/**
 * 雇主板搜索框的尺寸档(md,与同行下拉等高)。
 */
export const SEARCH_SIZE = 'md'

/**
 * 搜索框防抖窗口。每敲一个字打一次 API 是拿生产池当草稿纸(#313 性能红线),
 * 300ms 是「停手了」与「还在打字」之间实测够用的分界。
 */
export const Q_DEBOUNCE_MS = 300

/**
 * 每页行数的兜底。服务端交回的 pageSize 为 0(或没这一格)时用它算总页数 ——
 * 除以 0 会算出 Infinity 页,翻页器当场废掉。
 */
export const PAGE_SIZE_FALLBACK = 50

/**
 * 一行的职业格最多显示几个职业名。名录里一家雇主挂十几个 NOC 是常态,
 * 全摆出来这一列会把表撑破;剩下的收成「+N」。
 */
export const NOC_SHOW_MAX = 2

/**
 * 所在地列最多平铺几个省码。1-3 省列两字码,≥4 省收「N 省」——
 * Frank 2026-08-08「怎么有的显示省有的显示市」:单省带市名造成两种粒度混排,
 * 统一到省维度,市级细节归公司弹框。
 */
export const WHERE_PROV_MAX = 3

/**
 * 对照表简介列的截断长度。超出截到这里再补省略号 —— 全文挂在 title 上悬停可看。
 */
export const BRIEF_LEN_MAX = 150

/**
 * 简介截断后的省略记号。
 */
export const BRIEF_TAIL = '…'

/**
 * 年薪显示的千元除数(`$84K` = 84000 / 1000)。
 */
export const MONEY_DIV = 1000

/**
 * 年薪显示的货币前缀。
 */
export const MONEY_HEAD = '$'

/**
 * 年薪显示的千元后缀。
 */
export const MONEY_TAIL = 'K'

/**
 * 正文轨的上内衬档(雇主板;紧贴顶栏,筛选行要尽早出现在首屏)。
 */
export const SHELL_TOP_PX = 16

/**
 * 正文轨的下内衬档(雇主板;翻页器与页脚之间留一档)。
 */
export const SHELL_BOTTOM_PX = 40

/**
 * 正文轨的上内衬档(对照页;它没有筛选行,标题往下压一档更稳)。
 */
export const COMPARE_SHELL_TOP_PX = 32

/**
 * 对照表的最小宽:窄屏横滚而非把维度挤成竖排(stats 第 2 轮 #10 同款)。
 */
export const COMPARE_TABLE_MIN_PX = 560

/**
 * 对照表维度列(最左那列)的 key。它不是雇主列,渲的是维度名。
 */
export const COMPARE_DIM_KEY = 'dim'

/**
 * 对照表雇主列 key 的前缀(后面接列序号:`e0`、`e1`)。列 key 只要唯一,
 * 用序号是因为雇主名可能重复(同名不同省的连锁)。
 */
export const COMPARE_EMP_KEY_HEAD = 'e'

/**
 * 对照页出真表的最少雇主数。只选了一家没什么好「对照」的,落空态引导回名录。
 */
export const COMPARE_MIN_ROWS = 2

/**
 * 对照页 URL `?names=` 里雇主名之间的分隔符。挑竖线是因为公司名本身常带逗号、
 * 顿号与空格(「Maple Health Group, Inc.」),拿那些当分隔符会把一个名字劈成两半。
 */
export const COMPARE_NAME_SEP = '|'

/**
 * 模糊样例表的指标列 key。
 */
export const DEMO_METRIC_KEY = 'metric'

/**
 * 模糊样例表第一家假雇主名(付费诱导样例;真值不出服务端,所以这里必须是假名)。
 * 三家写成三个具名常量而不是一个数组:样例表的列是**固定三列**,按下标取值
 * 读不出哪一格是哪一家(闸 local/no-literal-index)。
 */
export const DEMO_CO_A = 'Maple Health Group'

/**
 * 模糊样例表第二家假雇主名。
 */
export const DEMO_CO_B = 'Northern Build Co'

/**
 * 模糊样例表第三家假雇主名。
 */
export const DEMO_CO_C = 'Prairie Foods Ltd'

/**
 * 模糊样例表「技能类获批」那一行的三个假值(A / B / C 三家)。
 */
export const DEMO_SKILLED_A = '168'

/**
 * 「技能类获批」行第二家的假值。
 */
export const DEMO_SKILLED_B = '52'

/**
 * 「技能类获批」行第三家的假值。
 */
export const DEMO_SKILLED_C = '9'

/**
 * 「在招岗」行第一家的假值。
 */
export const DEMO_OPEN_A = '24'

/**
 * 「在招岗」行第二家的假值。
 */
export const DEMO_OPEN_B = '11'

/**
 * 「在招岗」行第三家的假值。
 */
export const DEMO_OPEN_C = '37'

/**
 * 「具名岗」行第一家的假值。
 */
export const DEMO_NAMED_A = '12'

/**
 * 「具名岗」行第二家的假值。
 */
export const DEMO_NAMED_B = '3'

/**
 * 「具名岗」行第三家的假值。
 */
export const DEMO_NAMED_C = '0'

/**
 * 「省难度」行第一家的假值。
 */
export const DEMO_PROV_A = 'ON'

/**
 * 「省难度」行第二家的假值。
 */
export const DEMO_PROV_B = 'AB'

/**
 * 「省难度」行第三家的假值。
 */
export const DEMO_PROV_C = 'SK'

/**
 * 对照表各维度行的 key(点表头排序与卡片键值行都按它记;一格一个身份)。
 * 顺序即维度行的显示顺序 —— 事实列在前、派生列在后、长文本垫底。
 */
export const DIM_INDUSTRY_KEY = 'industry'

/**
 * 技能类获批维度行的 key。
 */
export const DIM_SKILLED_KEY = 'skilled'

/**
 * LMIA 获批岗位数维度行的 key。
 */
export const DIM_LMIA_KEY = 'lmia'

/**
 * 最近获批季度维度行的 key。
 */
export const DIM_QUARTER_KEY = 'quarter'

/**
 * AIP 指定维度行的 key。
 */
export const DIM_AIP_KEY = 'aip'

/**
 * 在招岗数维度行的 key。
 */
export const DIM_OPEN_KEY = 'open'

/**
 * 开放岗平均分维度行的 key。
 */
export const DIM_AVG_KEY = 'avg'

/**
 * 具名岗数维度行的 key。
 */
export const DIM_NAMED_KEY = 'named'

/**
 * 年薪中位数维度行的 key。
 */
export const DIM_SAL_KEY = 'sal'

/**
 * 主要省与难度档维度行的 key。
 */
export const DIM_PROV_KEY = 'prov'

/**
 * 「与我的匹配」维度行的 key(Pro 且建过档才出这一行)。
 */
export const DIM_MATCH_KEY = 'match'

/**
 * K 调查简介维度行的 key(长文本,卡片里独占整行)。
 */
export const DIM_BRIEF_KEY = 'brief'

/**
 * 雇主板列 key:雇主名。
 */
export const COL_NAME_KEY = 'name'

/**
 * 雇主板列 key:所在地。
 */
export const COL_WHERE_KEY = 'where'

/**
 * 雇主板列 key:制度(AIP/RCIP/FCIP)。
 */
export const COL_PROGRAM_KEY = 'program'

/**
 * 雇主板列 key:名录列明的职业。
 */
export const COL_NOC_KEY = 'noc'

/**
 * 雇主板列 key:名录出处链。
 */
export const COL_LIST_KEY = 'list'

/**
 * 雇主板列 key:在招岗数。
 */
export const COL_OPEN_KEY = 'open'

/**
 * 担保雇主表列 key:近 1 季 LMIA 获批数。
 */
export const COL_W1_KEY = 'w1'

/**
 * 担保雇主表列 key:近 2 季 LMIA 获批数。
 */
export const COL_W2_KEY = 'w2'

/**
 * 担保雇主表列 key:近 4 季 LMIA 获批数。
 */
export const COL_W4_KEY = 'w4'

/**
 * 担保雇主表列 key:LMIA 获批岗位数合计。
 */
export const COL_LMIA_KEY = 'lmia'

/**
 * 担保雇主表列 key:其中技能类获批数。
 */
export const COL_SKILLED_KEY = 'skilled'

/**
 * 担保雇主表列 key:雇主门槛判定。
 */
export const COL_VERDICT_KEY = 'verdict'

/**
 * 名录口径·带出处列时雇主名列的宽。五列版把宽度预算重新分一遍 ——
 * 名录出处只占 8%,省下的宽还给名字与职业两列。
 */
export const W_NAME_LIST = '30%'

/**
 * 名录口径·不带出处列时雇主名列的宽。
 */
export const W_NAME_PLAIN = '33%'

/**
 * 名录口径·带出处列时所在地列的宽。
 */
export const W_WHERE_LIST = '19%'

/**
 * 名录口径·不带出处列时所在地列的宽。
 */
export const W_WHERE_PLAIN = '21%'

/**
 * 名录口径·带出处列时制度列的宽。
 */
export const W_PROGRAM_LIST = '11%'

/**
 * 名录口径·不带出处列时制度列的宽。
 */
export const W_PROGRAM_PLAIN = '12%'

/**
 * 名录口径·带出处列时职业列的宽。
 */
export const W_NOC_LIST = '21%'

/**
 * 名录口径·不带出处列时职业列的宽。
 */
export const W_NOC_PLAIN = '22%'

/**
 * 名录口径·带出处列时在招列的宽(2026-09-04 名录页加在招列:六列 30/19/11/21/11/8,
 * 五列 33/21/12/22/12,每列都从原预算里让一点)。
 */
export const W_OPEN_LIST = '11%'

/**
 * 名录口径·不带出处列时在招列的宽。
 */
export const W_OPEN_PLAIN = '12%'

/**
 * 名录出处列的宽(只有一枚短链,给最窄那档)。
 */
export const W_LIST = '8%'

/**
 * 在招口径·雇主名列的宽(三列版,名字吃掉近一半)。
 */
export const W_HIRE_NAME = '46%'

/**
 * 在招口径·所在地列的宽。
 */
export const W_HIRE_WHERE = '32%'

/**
 * 在招口径·在招岗数列的宽。
 */
export const W_HIRE_OPEN = '22%'

/**
 * 数字列右对齐档(在招岗数那列;数字右对齐才连成竖线)。
 */
export const ALIGN_RIGHT = 'right'

/**
 * 查询参数名:制度。
 */
export const P_PROGRAM = 'program'

/**
 * 查询参数名:省码。
 */
export const P_PROV = 'prov'

/**
 * 查询参数名:社区/城市。
 */
export const P_CITY = 'city'

/**
 * 查询参数名:职业码。
 */
export const P_NOC = 'noc'

/**
 * 查询参数名:雇主名关键词。
 */
export const P_Q = 'q'

/**
 * 查询参数名:页码。
 */
export const P_PAGE = 'page'

/**
 * 查询参数名:口径(打 API 时口径走 query,进 URL 时走路径段)。
 */
export const P_MODE = 'mode'

/**
 * 拼 query 时第一个参数前的问号。
 */
export const QS_HEAD = '?'

/**
 * 拼 query 时追加参数用的与号(API 那条 URL 已经带了 `?mode=`)。
 */
export const QS_JOIN = '&'

/**
 * 空文本。筛选值的「未选」、别名的「没有」、注文的「不出」都用它 ——
 * 空串是**这一格没内容**,与 null(这一格没被记录)在本域里不混用。
 */
export const TEXT_NONE = ''

/**
 * 三语别名里的中文档(按界面语言取雇主的官方中文名)。
 */
export const LANG_ZH = 'zh'

/**
 * 三语别名里的韩文档。
 */
export const LANG_KO = 'ko'

/**
 * 模糊样例表第一家假雇主那一列的 key。
 */
export const DEMO_A_KEY = 'demoA'

/**
 * 模糊样例表第二家假雇主那一列的 key。
 */
export const DEMO_B_KEY = 'demoB'

/**
 * 模糊样例表第三家假雇主那一列的 key。
 */
export const DEMO_C_KEY = 'demoC'

/**
 * 雇主门槛达标的色档(表里绿粗、卡里绿)。
 */
export const TONE_OK = 'ok'

/**
 * 雇主门槛差项的色档(红)。
 */
export const TONE_NG = 'ng'

/**
 * 雇主门槛待核与公共部门旁路的色档(灰)。🔴 它**不是「不满足」**,是我们查不到。
 */
export const TONE_DIM = 'dim'

/**
 * 省难度档标签的兜底变体(没有难度档时标签不渲染,这一格只是给类型一个确定值)。
 */
export const DIFF_VARIANT_NONE = 'ok'

/**
 * 行身份里连接所在地与雇主名的分隔符(同名雇主可能落在不同社区)。
 */
export const KEY_SEP = ':'

/**
 * 拼 query 时参数名与值之间的等号。
 */
export const QS_EQ = '='

/**
 * 升级弹框的层级。对比页的模糊样例上本来就压着一层遮罩,弹框要盖住它才点得到 ——
 * 60 是全站弹框层里高于页内遮罩的那一档。
 */
export const PRICING_Z = 60

/**
 * 手机卡上「职业」列名与「未列明」之间的空格。它是**文案里的分隔**,
 * 与拼 className 的那一个不是同一件事,所以各有各的名字。
 */
export const LABEL_SEP = ' '

/**
 * 雇主门槛判定的一态:公共部门旁路 —— 它不走门槛,不该混进「达标」里。
 */
export const VERDICT_PUBLIC = 'public'

/**
 * 雇主门槛判定的一态:达标。
 */
export const VERDICT_MET = 'met'

/**
 * 雇主门槛判定的一态:差项(会点名差在哪)。
 */
export const VERDICT_SHORT = 'short'

/**
 * 雇主门槛判定的一态:待核。🔴 它**不是「不满足」**,是我们查不到 ——
 * 整批都是它时那一列压根不出。
 */
export const VERDICT_UNKNOWN = 'unknown'

/**
 * 判断点击是不是落在卡内链接上的选择器。选择器打错是**静默失效**
 * (选不中,也不报错),整卡点击就会跟卡内链接重复导航一次。
 */
export const LINK_SELECTOR = 'a'

/**
 * `/employers/compare` 的 SEO 头(Pro 页不进索引;内容写死,用常量形不用函数形)。
 * 住这里而不是页面门里:门里不留死值常量,页面门只 `export const metadata = COMPARE_META`
 * 一行转发(2026-08-29 Frank「框架导出的内容也一律来自桶」,形照 start 的 START_META)。
 */
export const COMPARE_META = {
  /**
   * 浏览器标签与搜索结果标题。
   */
  title: 'Compare employers — LMIA record, AIP status & immigration signals side by side | Offer2PR',

  /**
   * 不进索引:对比页是 Pro 功能,真值不出服务端,收录了也只能给到示例模糊态。
   */
  robots: { index: false },
}

/**
 * `/employers/designated` 标题里范围前缀之后的固定尾巴(前缀由省码与制度拼,见 designatedMetaOf)。
 */
export const DESIGNATED_TITLE_TAIL = 'Designated employers | Offer2PR'

/**
 * `/employers/designated` 的搜索结果摘要(英文优先 —— 88% 流量来自 Google;
 * 「被指定不等于在招」是站规四类保留解释里的口径说明,不许删成一句广告词)。
 */
export const DESIGNATED_DESC
  = 'Employers designated under AIP / RCIP / FCIP, from official community and provincial lists.'
  + ' Being designated does not mean the employer is hiring — check open jobs.'
  + ' 指定雇主名录(AIP/RCIP/FCIP),官方名录周更;被指定不等于在招。'

/**
 * `/employers/hiring` 标题里范围前缀之后的固定尾巴(前缀是省码,见 hiringMetaOf)。
 */
export const HIRING_TITLE_TAIL = 'Employers hiring now | Offer2PR'

/**
 * `/employers/hiring` 的搜索结果摘要(口径:该省该职业正在招人的雇主来自本站每日职位库,
 * 不是官方名录 —— 两块视图共用一件,描述里必须把来源分清)。
 */
export const HIRING_DESC
  = 'Employers with open postings for this occupation in this province, from our daily job crawl.'
  + ' 该省该职业正在招人的雇主,来自本站每日抓取的职位库。'

/**
 * 标题里认得的三个指定制度码。URL 上 `?program=` 只有落在这三个里才进标题前缀 ——
 * 白名单之外一律当没带,免得把随手编的串渲进 `<title>`。
 */
export const META_PROGRAMS = ['AIP', 'RCIP', 'FCIP']

/**
 * 省码的形状(两位大写字母)。URL 上 `?prov=` 过不了它就当没带,同上。
 */
export const META_PROV_RE = /^[A-Z]{2}$/

/**
 * 标题里范围前缀各截之间、以及前缀与固定尾巴之间的空格(「NS AIP Designated employers」)。
 * 全站禁「·」杂糅那条说的是多条并列信息,这里是同一个范围的两截限定词。
 */
export const META_SCOPE_SEP = ' '


/**
 * jobs 页面域的死值:cookie 与本地存储的键、接口路径与 HTTP 词、URL 查询参数名、
 * 取词键前缀、列表(有哪些列、哪些列不折行、哪些列锁 Pro)、字段→弹框分组的明表,
 * 以及 JD 正文解析用的白名单与正则。
 *
 * 🔴 cookie 键名与它们的值格式**一字不能改**:线上有存量,bump 名字等于把所有人的
 * 列偏好/列宽/横幅记忆一次性作废。要作废才 bump(下面各键的注释里写着它上次为什么 bump)。
 *
 * 2026-08-28 换装批自 Jobs.tsx / Table.tsx / Jd.tsx / colWidths*.ts / filters.shared.ts
 * 五处收拢:原先散在组件体内的裸串与裸数全部落这一份,决策注释随值一起搬(不删一条)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
// eslint-disable-next-line local/no-import-in-leaf -- 只 import type,靠 satisfies 让打错的键当场 tsc 红;运行时零依赖
import type {
  AuthMode, CellKind, CellTone, ColSpec, Disposition, JdLineKind, JobColKey, JobTextStatus,
  SortDir,
} from './types'

/**
 * 列键的名字表。全部 36 个键各写一份,拿它做比较与赋值 —— 散写字面量打错了
 * 不会有任何东西报错,格子只是默默不出内容。
 */
export const COL = {
  /**
   * 旧 0-100 评分列。⚠️ 它**不在 COLUMNS 里**(#127 后评分不再参与任何排序,列已撤),
   * 留着只因 ColKey 联合里还有它 —— 谁也渲不出这一列。
   */
  score: 'score',

  /**
   * 与我的匹配。
   */
  match: 'match',

  /**
   * 省提名。
   */
  pnp: 'pnp',

  /**
   * 联邦 EE 类别。
   */
  ee: 'ee',

  /**
   * 大西洋试点。
   */
  aip: 'aip',

  /**
   * RCIP/FCIP 试点社区。
   */
  pilot: 'pilot',

  /**
   * 外劳(LMIA)记录。
   */
  lmia: 'lmia',

  /**
   * 身份预筛红旗。
   */
  eligibility: 'eligibility',

  /**
   * 大分类。
   */
  broad: 'broad',

  /**
   * 中分类。
   */
  mid: 'mid',

  /**
   * 小分类。
   */
  fine: 'fine',

  /**
   * TEER 档。
   */
  teer: 'teer',

  /**
   * 工时。
   */
  empHours: 'empHours',

  /**
   * 雇佣期。
   */
  empTerm: 'empTerm',

  /**
   * 谁能投(2026-09-05)。
   */
  whoCanApply: 'whoCanApply',

  /**
   * 职位名。
   */
  title: 'title',

  /**
   * 公司名。
   */
  company: 'company',

  /**
   * NOC 码。
   */
  noc: 'noc',

  /**
   * 经验级别。
   */
  accessibility: 'accessibility',

  /**
   * 帖面薪资。
   */
  salary: 'salary',

  /**
   * 折算年薪。
   */
  salaryYr: 'salaryYr',

  /**
   * 当地中位时薪。
   */
  wageMedHr: 'wageMedHr',

  /**
   * 当地中位年薪。
   */
  wageMedYr: 'wageMedYr',

  /**
   * vs 当地中位。
   */
  vsMedian: 'vsMedian',

  /**
   * 国家。
   */
  country: 'country',

  /**
   * 省。
   */
  province: 'province',

  /**
   * 市。
   */
  city: 'city',

  /**
   * 区。
   */
  district: 'district',

  /**
   * 街道地址。
   */
  address: 'address',

  /**
   * 来源板。
   */
  source: 'source',

  /**
   * 发布渠道。
   */
  origin: 'origin',

  /**
   * 首发/转发。
   */
  direct: 'direct',

  /**
   * 在招/已下架。
   */
  status: 'status',

  /**
   * 发布时间。
   */
  datePosted: 'datePosted',

  /**
   * 更新时间。
   */
  lastSeen: 'lastSeen',

  /**
   * 下架时间。
   */
  closedAt: 'closedAt',

  /**
   * 操作(收藏)。
   */
  actions: 'actions',
} as const satisfies Record<string, JobColKey>

/**
 * 单元格色档的名字表(值与 CELL_TONE_CLS 的键一一对应)。
 */
export const TONE = {
  /**
   * 不加色。
   */
  plain: 'plain',

  /**
   * 站内蓝链。
   */
  link: 'link',

  /**
   * 大分类(色由 NOC 分类表逐类给)。
   */
  cat: 'cat',

  /**
   * 深灰正文。
   */
  slate: 'slate',

  /**
   * 深灰小字。
   */
  slateSm: 'slateSm',

  /**
   * 近黑。
   */
  ink: 'ink',

  /**
   * 浅灰。
   */
  muted: 'muted',

  /**
   * 浅灰小字。
   */
  mutedSm: 'mutedSm',

  /**
   * 更浅的灰小字。
   */
  faintSm: 'faintSm',

  /**
   * 中灰小字。
   */
  graySm: 'graySm',

  /**
   * 绿。
   */
  money: 'money',

  /**
   * 绿小字。
   */
  moneySm: 'moneySm',

  /**
   * 绿半粗小字。
   */
  moneyMd: 'moneyMd',

  /**
   * 绿粗(高于中位)。
   */
  vsUp: 'vsUp',

  /**
   * 琥珀粗(低于中位)。
   */
  vsDown: 'vsDown',

  /**
   * 紫小字。
   */
  purpleSm: 'purpleSm',

  /**
   * 红小字。
   */
  redSm: 'redSm',

  /**
   * 红粗小字。
   */
  redBoldSm: 'redBoldSm',

  /**
   * 琥珀小字。
   */
  amberSm: 'amberSm',

  /**
   * 青小字。
   */
  cyanSm: 'cyanSm',

  /**
   * 蓝绿半粗小字。
   */
  tealSm: 'tealSm',

  /**
   * 蓝小字。
   */
  blueSm: 'blueSm',
} as const satisfies Record<string, CellTone>

/**
 * 这一格由哪个哑组件渲(展示行的第一格)。
 */
export const KIND = {
  /**
   * 文本格(带色档,可能是地图链接)。
   */
  text: 'text',

  /**
   * 具名紧缺通道徽章。
   */
  stream: 'stream',

  /**
   * 匹配档 chip。
   */
  match: 'match',

  /**
   * 未建档引导链。
   */
  needProfile: 'needProfile',

  /**
   * Pro 锁位。
   */
  lock: 'lock',

  /**
   * 操作列。
   */
  actions: 'actions',
} as const satisfies Record<string, CellKind>

/**
 * 手机卡胶囊的语义色档(值与 CHIP_TONE_CLS 的键一一对应)。
 */
export const CHIP = {
  /**
   * TEER 档。
   */
  gray: 'gray',

  /**
   * 可提名 / 具名紧缺通道。
   */
  amber: 'amber',

  /**
   * 官方具名不受理。
   */
  red: 'red',

  /**
   * EE 类别命中。
   */
  blue: 'blue',

  /**
   * AIP 在指定名单。
   */
  orange: 'orange',

  /**
   * 魁省。
   */
  purple: 'purple',

  /**
   * LMIA 获批记录。
   */
  teal: 'teal',

  /**
   * 担保档。
   */
  indigo: 'indigo',

  /**
   * 试点社区。
   */
  sky: 'sky',
} as const

/**
 * JD 正文一行的渲染档。
 */
export const JD_KIND = {
  /**
   * 空行 = 段距。
   */
  gap: 'gap',

  /**
   * 数据层给的列表项。
   */
  bullet: 'bullet',

  /**
   * 大节头。
   */
  h1: 'h1',

  /**
   * 子节头。
   */
  h2: 'h2',

  /**
   * 行内「Label: 值」。
   */
  label: 'label',

  /**
   * 普通正文行。
   */
  text: 'text',
} as const satisfies Record<string, JdLineKind>

/**
 * JD 正文取数的结果档。
 */
export const TEXT_STATUS = {
  /**
   * 拿到正文。
   */
  ok: 'ok',

  /**
   * 402:免费额度用完。
   */
  gated: 'gated',

  /**
   * 429:匿名 IP 池用完 / 防滥用闸偶发。
   */
  limited: 'limited',

  /**
   * 其它非 2xx:取数失败(**不是**「没有」)。
   */
  error: 'error',

  /**
   * 这一岗确实没有正文。
   */
  empty: 'empty',
} as const satisfies Record<string, JobTextStatus>

/**
 * 降序。
 */
export const DIR_DESC: SortDir = 'desc'

/**
 * 升序。
 */
export const DIR_ASC: SortDir = 'asc'

/**
 * 关键词筛选键(它的值要过防抖,别处不走 fState 直接读)。
 */
export const FILTER_Q = 'q'

/**
 * 省筛选键(URL 上是两位码或全名,存进来一律全名)。
 */
export const FILTER_PROV = 'fProv'

/**
 * 经验级别没标注时的档名。
 */
export const ACC_UNKNOWN = 'unknown'

/**
 * 左括号(挂帖时长文案)。
 */
export const PAREN_L = '('

/**
 * 右括号。
 */
export const PAREN_R = ')'

/**
 * 固定列的定位方式。
 */
export const CSS_STICKY = 'sticky'

/**
 * 固定列不画普通右边框(sticky 下 Chromium 不画它)。
 */
export const CSS_BORDER_NONE = 'none'

/**
 * 固定列的层级(压在滚动内容之上,低于表头面板)。
 */
export const FROZEN_Z = 3

/**
 * 固定列的竖线(inset 阴影画,任何模式下都看得见)。
 */
export const FROZEN_LINE_SHADOW = 'inset -1px 0 0 '

/**
 * 最后一枚固定列右边那道投影(与滚动区分界)。
 */
export const FROZEN_EDGE_SHADOW = ', 3px 0 5px -3px rgba(0, 0, 0, .18)'

/**
 * 表头行的底色(固定列贴边时要拿它当不透明底)。
 */
export const HEAD_BG = '#f9fafb'

/**
 * 表头行的竖线色。
 */
export const HEAD_LINE = '#e5e7eb'

/**
 * 数据行的底色。
 */
export const ROW_BG = '#fff'

/**
 * 斑马纹另一档的底色。
 */
export const ROW_BG_ALT = '#fcfcfd'

/**
 * 数据行的竖线色(比表头淡一档)。
 */
export const ROW_LINE = '#f3f4f6'

/**
 * 未登录价值主张横幅(E5-01)的关闭记忆。关闭走 cookie(同 COLS_COOKIE 手法)→
 * SSR 首帧直接渲对,不再等水合后才弹出来(用户点名);bump 名可重新展示。
 * ValueBanner 本体已退役(#65 收尾,Frank:「不需要两个蓝条」)—— 建档 CTA 并进页头右槽;
 * 本键留给 page.tsx 读旧 cookie 作兼容。
 */
export const BANNER_COOKIE = 'jobs_banner_v1'

/**
 * 列**集**偏好(显示哪几列)的 cookie。服务端 page.tsx 与客户端表格都要读,
 * 所以它住在不带 hook 的普通模块里(同列宽与筛选映射的理由)。
 * 与列**宽** cookie 的分界:那边是每列多宽,这边是显示哪几列 —— 两件事各有各的 cookie、
 * 各自失效,合成一个会让「改列宽为什么动到列集」这种问题多绕一圈。
 * 2026-08-17 从 jobs/i18n.ts 搬来(它当初图省事搭在那儿,可它和语言毫无关系)。
 * v2:新默认 10 列,bump 名让旧 cookie 失效。
 */
export const COLS_COOKIE = 'jobsCols3'

/**
 * 列**宽**比例的 cookie:上次算出来的百分比,SSR 首屏就按它下 colgroup。
 * 存比例不存像素 —— 视口宽窄不同也照样对得上(百分比之和 = 100% = 容器宽)。
 */
export const COLW_COOKIE = 'jt.colw.v1'

/**
 * 列集偏好的 localStorage 兜底(cookie 之外再留一份)。
 * v11:删「通道」列(#201,移民入口改操作列按钮);bump 版本让新默认生效。
 */
export const PREF_KEY = 'jobs.visibleCols.v11'

/**
 * 「返回保筛选」的快照键(2026-07-25):详情页右上角返回带 ?back=1 回流 → 回放这份快照。
 */
export const BOARD_FILTERS_KEY = 'boardFilters'

/**
 * OAuth 整页跳转后的续投意图键,值形如 `岗位号|时间戳`(E9-04)。
 */
export const APPLY_RESUME_KEY = 'apply_resume_v1'

/**
 * 列集 cookie 的存活秒数(一年)。
 */
export const COLS_MAX_AGE_S = 31536000

/**
 * 列宽 cookie 的存活秒数(30 天):列宽跟着数据走,过一个月的比例已经不作数了。
 */
export const COLW_MAX_AGE_S = 2592000

/**
 * cookie 串的「名=」那一段。
 */
export const COOKIE_EQ = '='

/**
 * cookie 串的路径与时效段(拼在值之后)。
 */
export const COOKIE_PATH_AGE = '; path=/; max-age='

/**
 * cookie 串的同站策略段(收尾)。
 */
export const COOKIE_SAMESITE = '; SameSite=Lax'

/**
 * 职位分页接口(E10-01 P3:服务端 WHERE + 分页,取代旧的 20k blob)。
 */
export const URL_API_JOBS = '/api/jobs?'

/**
 * 大维度独立加载(cities/districts/designatedEmployers/nocDescriptions)。
 */
export const URL_API_JOBS_DIMS = '/api/jobs/dims'

/**
 * 我的收藏(E9-01)。
 */
export const URL_API_SAVED_JOBS = '/api/saved-jobs'

/**
 * 收藏列表的查询串(只要 200 条、不展开关联)。
 */
export const URL_API_SAVED_JOBS_LIST = '/api/saved-jobs?limit=200&depth=0'

/**
 * 按岗位号查这一岗的收藏行(投递时改状态用)。
 */
export const URL_API_SAVED_JOB_BY_JOB = '/api/saved-jobs?where[job][equals]='

/**
 * 上一条查询串的尾巴(只要一条、不展开关联)。
 */
export const URL_API_SAVED_JOB_BY_JOB_TAIL = '&limit=1&depth=0'

/**
 * 已保存筛选(E5-03)。
 */
export const URL_API_SAVED_SEARCHES = '/api/saved-searches'

/**
 * 当前登录身份(#84 的兜底:SSR 没给身份时才拉)。
 */
export const URL_API_USERS_ME = '/api/users/me'

/**
 * JD 正文懒取(#126 带同岗会话缓存)。
 */
export const URL_API_JOB_TEXT = '/api/jobs/text?url='

/**
 * Job Bank 岗的投递方式懒查(dd24-#110:邮箱藏在「Show how to apply」的 JSF 后面)。
 */
export const URL_API_APPLY_HOW = '/api/jobs/applyhow?url='

/**
 * 整理版逐句翻译(行位保真)。
 */
export const URL_API_JD_TRANSLATE = '/api/jobs/jd-translate'

/**
 * AI 五节整理版(J3)。
 */
export const URL_API_JD_FORMAT = '/api/jobs/jdformat'

/**
 * 账户页(未建档/未登录的落点)。
 */
export const URL_ACCOUNT = '/account'

/**
 * 职位板(2026-07-17 根域直出后,职位板 = 根路径)。
 */
export const URL_BOARD = '/'

/**
 * 进「我的匹配」视图(URL 即状态,可分享可回退)。
 */
export const URL_BOARD_MATCH = '/?view=match'

/**
 * 详情页右上角返回的落点:带 ?back=1 回流,由职位板回放筛选快照。
 */
export const URL_BOARD_BACK = '/?back=1'

/**
 * 按省筛选的职位板(面包屑省格与相似职位兜底共用)。
 */
export const URL_BOARD_PROV = '/?prov='

/**
 * 按大分类筛选的职位板(面包屑大类格)。
 */
export const URL_BOARD_BROAD = '/?broad='

/**
 * 面包屑中类格的第二段(大类之后再加中类)。
 */
export const URL_BOARD_MID = '&mid='

/**
 * 按小分类筛选的职位板(面包屑小类格)。
 */
export const URL_BOARD_FINE = '/?fine='

/**
 * 相似职位兜底链的分级键前缀(?prov=… 之后按级追加)。
 */
export const URL_LEVEL_AMP = '&'

/**
 * 职位详情页前缀。
 */
export const URL_JOB = '/jobs/'

/**
 * 按公司名搜的职位板(手机卡公司名的真 href,#315:左键仍开弹框,中键/爬虫拿到真链接)。
 */
export const URL_JOBS_QUERY = '/jobs?q='

/**
 * POST。
 */
export const METHOD_POST = 'POST'

/**
 * DELETE。
 */
export const METHOD_DELETE = 'DELETE'

/**
 * PATCH。
 */
export const METHOD_PATCH = 'PATCH'

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
 * 带 cookie 发请求(登录态接口都要)。
 */
export const CREDENTIALS_INCLUDE = 'include'

/**
 * 402:免费额度用完(升级卡)。
 */
export const HTTP_PAYMENT = 402

/**
 * 429:匿名 IP 池用完 / 宽松防滥用闸偶发(说人话,不谎报成缺数据 —— #134)。
 */
export const HTTP_TOO_MANY = 429

/**
 * 200:整理版拿到了。
 */
export const HTTP_OK = 200

/**
 * 204:这一岗压根没有正文(不显示失败行,空态自己解释)。
 */
export const HTTP_NO_CONTENT = 204

/**
 * 新标签页打开(外链一律)。
 */
export const TARGET_BLANK = '_blank'

/**
 * `window.open` 的特性串:新标签页不带 opener。
 */
export const WINDOW_FEATURES = 'noopener'

/**
 * URL 短名 → 筛选键(筛选键 = 前端 state 名 = buildJobsWhere 的键,三者同名,
 * 不必再各翻译一遍)。参数名沿用既有深链(q/prov/broad/mid/fine 三方在用,不能改),
 * 新增的取短名。
 * ⚠️ 新增筛选键四处同步:本表 + buildJobsWhere(lib/jobs/queries)+ 前端 state
 * + /api/jobs 的 FILTER_KEYS。
 */
export const URL_TO_FILTER: Record<string, string> = {
  /**
   * 逗号分隔的 NOC 码多值(2026-08-16 Frank「查岗位应该带着条件查」「要支持多个职位类别」)——
   * 先前从初评表跳过来是把 NOC 码塞进关键词框(q=72310):页面看着像在搜一串数字,
   * 且只带得动一个职业。
   */
  noc: 'fNoc',

  /**
   * 关键词。
   */
  q: 'q',

  /**
   * 省(接受两位码或全名,深链两种都在用)。
   */
  prov: 'fProv',

  /**
   * 大分类。
   */
  broad: 'fBroad',

  /**
   * 中分类。
   */
  mid: 'fMid',

  /**
   * 小分类。
   */
  fine: 'fFine',

  /**
   * 市。
   */
  city: 'fCity',

  /**
   * 区。
   */
  dist: 'fDistrict',

  /**
   * 国家。
   */
  country: 'fCountry',

  /**
   * TEER。
   */
  teer: 'fTeer',

  /**
   * 来源板。
   */
  src: 'fSource',

  /**
   * 经验级别。
   */
  acc: 'fAcc',

  /**
   * 省提名。
   */
  pnp: 'fPnp',

  /**
   * 大西洋试点(AIP)。
   */
  aip: 'fAip',

  /**
   * 试点社区(RCIP/FCIP)。
   */
  pilot: 'fPilot',

  /**
   * 在招/已下架。
   */
  st: 'fStatus',

  /**
   * 发布渠道。
   */
  org: 'fOrigin',

  /**
   * 旧 0-100 评分(#127 后不再参与排序,深链仍生效)。
   */
  score: 'fScore',

  /**
   * 年薪档。
   */
  sal: 'fSal',

  /**
   * 对比当地中位。
   */
  vs: 'fVs',

  /**
   * 职位类型(E6-06:full/part/gig)。
   */
  emp: 'fEmp',

  /**
   * 身份预筛(GAP1③:'ok' = 排除明确不担保/须 PR 的岗)。
   */
  elig: 'fElig',
}

/**
 * directOnly 是布尔,URL 上是 direct=1,不走 URL_TO_FILTER 那张表。
 */
export const DIRECT_URL_KEY = 'direct'

/**
 * 筛选键的名字表(= 前端 state 名 = buildJobsWhere 的键 = /api/jobs 参数名,三者同名)。
 * 拿它做取值与建表 —— 散写字面量打错了不会有任何东西报错,只是那一格筛选默默不生效。
 */
export const FK = {
  /**
   * 关键词。
   */
  q: 'q',

  /**
   * 职业(逗号分隔的 NOC 多值)。
   */
  noc: 'fNoc',

  /**
   * 国家。
   */
  country: 'fCountry',

  /**
   * 省(全名)。
   */
  prov: 'fProv',

  /**
   * 市。
   */
  city: 'fCity',

  /**
   * 区。
   */
  district: 'fDistrict',

  /**
   * 大分类。
   */
  broad: 'fBroad',

  /**
   * 中分类。
   */
  mid: 'fMid',

  /**
   * 小分类。
   */
  fine: 'fFine',

  /**
   * TEER。
   */
  teer: 'fTeer',

  /**
   * 来源板。
   */
  source: 'fSource',

  /**
   * 经验级别。
   */
  acc: 'fAcc',

  /**
   * 省提名。
   */
  pnp: 'fPnp',

  /**
   * 大西洋试点。
   */
  aip: 'fAip',

  /**
   * 试点社区。
   */
  pilot: 'fPilot',

  /**
   * 在招/已下架。
   */
  status: 'fStatus',

  /**
   * 发布渠道。
   */
  origin: 'fOrigin',

  /**
   * 旧 0-100 评分。
   */
  score: 'fScore',

  /**
   * 年薪档。
   */
  sal: 'fSal',

  /**
   * 对比当地中位。
   */
  vs: 'fVs',

  /**
   * 职位类型。
   */
  emp: 'fEmp',

  /**
   * 身份预筛。
   */
  elig: 'fElig',
} as const

/**
 * 只看直发岗的筛选键(它是布尔,不进 fState 那张表)。
 */
export const FK_DIRECT = 'directOnly'

/**
 * 身份预筛勾上时的值(GAP1③:'ok' = 排除明确不担保/须 PR 的岗)。
 */
export const ELIG_OK = 'ok'

/**
 * 折叠区里参与徽标计数的筛选键(2026-08-16:PNP/年薪 从常用一行下沉进折叠区,
 * 一并进徽标计数,否则选了却看不出来)。
 */
export const FOLD_KEYS: string[] = [
  FK.city, FK.district, FK.mid, FK.fine, FK.pnp, FK.sal, FK.aip, FK.pilot, FK.emp, FK.vs, FK.elig,
]

/**
 * 是/否两档的下拉选项(PNP / AIP 共用)。
 */
export const OPTS_YES_NO: string[] = ['yes', 'no']

/**
 * 试点社区下拉选项(E6-11:yes = 任一命中,RCIP/FCIP = 指定类型)。
 */
export const OPTS_PILOT: string[] = ['yes', 'RCIP', 'FCIP', 'no']

/**
 * 职位类型下拉选项(E6-06;gig = 兼职∪casual∪seasonal,
 * 未标注岗选类型自然不命中,与「未分类」同一诚实口径)。
 */
export const OPTS_EMP: string[] = ['full', 'part', 'gig']

/**
 * 年薪档下拉选项。
 */
export const OPTS_SAL: string[] = ['ge100', '80', '60', 'u60']

/**
 * 对比中位档下拉选项。
 */
export const OPTS_VS: string[] = ['above', 'above20', 'below']

/**
 * 「我的匹配」视图的 URL 参数名。
 */
export const P_VIEW = 'view'

/**
 * 分页序号参数名。
 */
export const P_PAGE = 'page'

/**
 * 排序列参数名。
 */
export const P_SORT = 'sort'

/**
 * 排序方向参数名。
 */
export const P_DIR = 'dir'

/**
 * 自动开登录框(未登录访问 /account 被弹回时带上)。
 */
export const P_LOGIN = 'login'

/**
 * 自动开注册框(二级页头「注册」直达)。
 */
export const P_SIGNUP = 'signup'

/**
 * 重置密码邮件链接落地(E3-07:token 收进 state 再洗参)。
 */
export const P_RESET = 'reset'

/**
 * 详情页返回回流的标记(回放筛选快照,回放后立刻洗掉)。
 */
export const P_BACK = 'back'

/**
 * 布尔型参数的「真」值。
 */
export const VAL_ON = '1'

/**
 * view 参数的匹配视图值。
 */
export const VAL_MATCH = 'match'

/**
 * 筛选签名的一格分隔(键=值)。
 */
export const SIG_EQ = '='

/**
 * 筛选签名的格间分隔。
 */
export const SIG_SEP = '&'

/**
 * 查询串起始符(拼回地址栏时用)。
 */
export const QS_HEAD = '?'

/**
 * 列名取词键前缀(`col.` + 列键)。
 */
export const K_COL = 'col.'

/**
 * 是/否类下拉项(`opt.yes` / `opt.no`)。
 */
export const K_OPT = 'opt.'

/**
 * 职位类型档(`emp.full` 等)。
 */
export const K_EMP = 'emp.'

/**
 * 雇佣期档(`term.permanent` 等)。
 */
export const K_TERM = 'term.'

/**
 * 谁能投三档的文案键前缀(后接 citizens_pr / temporary_ok / anyone)。
 */
export const K_WHO = 'who.'

/**
 * 年薪档下拉项。
 */
export const K_SAL = 'sal.'

/**
 * 对比中位档下拉项。
 */
export const K_VS = 'vs.'

/**
 * TEER 档名(`teer.0` 等)。
 */
export const K_TEER = 'teer.'

/**
 * 匹配档名(`match.high` 等)。
 */
export const K_MATCH = 'match.'

/**
 * 经验级别(`acc.unknown` 等)。
 */
export const K_ACC = 'acc.'

/**
 * 发布渠道(`origin.jobbank` 等)。
 */
export const K_ORIGIN = 'origin.'

/**
 * 身份预筛红旗(`cell.elig.<旗名>`)。
 */
export const K_ELIG = 'cell.elig.'

/**
 * 担保档名(`gr.sp.<档>`)。
 */
export const K_SPONSOR_GRADE = 'gr.sp.'

/**
 * Pro 锁列的悬停说明(`up.lockTip.<列键>`)。
 */
export const K_LOCK_TIP = 'up.lockTip.'

/**
 * 省名三语单名(`prov.ON` 等)。
 */
export const K_PROV = 'prov.'

/**
 * 未分类的规范键 —— 大/中/小类都复用它(字典里没有 `broad.未分类`,
 * 否则会回退成原样输出 "broad.未分类";#256 那类事故的同一个根)。
 */
export const K_UNCAT = 'cell.uncat'

/**
 * 默认显示 10 列(发布时间·大分类·公司·职位·省·市·薪资·年薪·vs中位·操作);其余用户自选。
 * 布局:表格永远满宽不横向滚动,列按内容自适应,内容多行换行(不省略)。
 */
export const DEFAULT_COLS: JobColKey[] = [
  'datePosted', 'broad', 'company', 'title', 'province', 'city', 'salary', 'salaryYr', 'vsMedian', 'actions',
]

/**
 * 全部列的明表(顺序即列序)。`label` 是这张表的备注名,渲染一律走 `t('col.' + key)`。
 * PNP/EE/AIP 三信号列:2026-07-25 Frank 让它们默认亮(「差异化信号该默认亮」),
 * 2026-08-03 他自己推翻(「页面看着别扭,很多人一进来看这个页面设计就跑路了」)——
 * 首屏 13 列在 1440 上还要横滚,一进来是一张密密麻麻的表格,差异化没被读到就先被劝退了。
 * **信号没丢**:三样都在字段弹框里,手机卡片 chips 照旧;字段面板一键调回。
 */
export const COLUMNS: ColSpec[] = [
  { key: 'datePosted', label: '发布时间' },
  { key: 'broad', label: '大分类' },
  { key: 'mid', label: '中分类' },
  { key: 'fine', label: '小分类' },
  { key: 'teer', label: 'TEER' },
  { key: 'empHours', label: '工时' },
  { key: 'empTerm', label: '雇佣期' },
  { key: 'whoCanApply', label: '谁能投' },
  { key: 'company', label: '公司' },
  { key: 'title', label: '职位', always: true },
  { key: 'match', label: '与我的匹配' },
  { key: 'noc', label: 'NOC' },
  { key: 'accessibility', label: '经验级别' },
  { key: 'country', label: '国家' },
  { key: 'province', label: '省' },
  { key: 'city', label: '市' },
  { key: 'district', label: '区' },
  { key: 'address', label: '地址' },
  { key: 'salary', label: '薪资' },
  { key: 'salaryYr', label: '年薪(折算)' },
  { key: 'wageMedHr', label: '中位时薪' },
  { key: 'wageMedYr', label: '中位年薪' },
  { key: 'vsMedian', label: 'vs 中位' },
  { key: 'source', label: '来源' },
  { key: 'origin', label: '渠道' },
  { key: 'direct', label: '发布' },
  { key: 'pnp', label: 'PNP' },
  { key: 'ee', label: 'EE 类别' },
  { key: 'aip', label: 'AIP' },
  { key: 'pilot', label: 'RCIP/FCIP' },
  { key: 'lmia', label: '外劳记录' },
  { key: 'eligibility', label: '身份预筛' },
  { key: 'status', label: '状态' },
  { key: 'lastSeen', label: '更新时间' },
  { key: 'closedAt', label: '下架时间' },
  { key: 'actions', label: '操作', always: true },
]

/**
 * 「与我的匹配」列键 —— E5-05 独立视图专属,不进列选择器,老 cookie 里有也剔除。
 */
export const COL_MATCH: JobColKey = 'match'

/**
 * 职位名列键(唯一 always 的内容列;它的格子直开职位描述弹框)。
 */
export const COL_TITLE: JobColKey = 'title'

/**
 * 操作列键(固定最后一列)。
 */
export const COL_ACTIONS: JobColKey = 'actions'

/**
 * 薪资列键(元素类格子回退薪资原文时用得着)。
 */
export const COL_SALARY: JobColKey = 'salary'

/**
 * 年薪列键(表头收短成「年薪」后,折算口径挂表头 title)。
 */
export const COL_SALARY_YR: JobColKey = 'salaryYr'

/**
 * 原子值列:内容单行不换行(日期/金额/百分比/分级等短值,断行会很丑)。其余文本列
 * (职位/公司/地点等)允许多行,以便表格压进容器宽度不横向滚动。表头一律不换行。
 * salary 不在此列:薪资原文可为长文本(如 "40% commission per sale"),要像文本列一样换行;
 * 年薪/中位数等计算列恒短值。
 */
export const NOWRAP_COLS = new Set<JobColKey>([
  'datePosted', 'lastSeen', 'closedAt', 'salaryYr', 'wageMedHr', 'wageMedYr', 'vsMedian', 'teer',
  'empHours', 'empTerm', 'whoCanApply', 'status', 'direct', 'aip', 'pilot', 'lmia', 'eligibility', 'match',
])

/**
 * 这几列的值是**短语**不是原子值(AIP「Occupation not accepted」、LMIA、资格、匹配),
 * 中文短、英文长 —— 让它们在本列内换行,别再挤隔壁。
 */
export const WRAP_COLS = new Set<JobColKey>(['aip', 'pilot', 'lmia', 'eligibility', 'match'])

/**
 * 固定左列(发布时间/大分类/公司/职位):只有**真的横滚**时才需要
 * (默认总宽 = 容器宽,压根不滚)。顺带收掉一个副作用:border-collapse 的表里
 * sticky 单元格的右边框 Chromium 不画 —— Frank「查询之后列竖线没了,点一下竖线才恢复」就是它。
 */
export const FROZEN_COLS = new Set<JobColKey>(['datePosted', 'broad', 'company', 'title'])

/**
 * Pro 专属列(免费用户列位打码,真值本就没进浏览器)。**单一来源就是这一格** ——
 * 2026-07-25 Frank「先都显示出来」放开 vs 中位三件套后,锁只剩 match 语义位。
 */
export const PRO_COLS = new Set<JobColKey>(['match'])

/**
 * #152 锁位统一打码(Frank「应该给他打上马赛克那种」;#130 详情页先例推广到表格):
 * 每列一个**写死的假占位数**,blur 掉 ——「这儿有个数」比一把锁更能说明值多少。
 * 真值免费态压根不出服务端,占位数是假的,扒开也没用。
 */
export const PRO_MASK: Partial<Record<JobColKey, string>> = {
  /**
   * vs 当地中位的假占位。
   */
  vsMedian: '+15%',

  /**
   * 中位时薪的假占位。
   */
  wageMedHr: '$28/hr',

  /**
   * 中位年薪的假占位。
   */
  wageMedYr: '$58K/yr',
}

/**
 * 字段 → 点了开哪个弹框(三档:并 = 三个弹框之一、图 = 直连地图、无 = 不可点)。
 * 原设计还有一档「注 = 悬停小注」,2026-07-21 Frank 拍板不做 —— 它与「无」行为完全一致,
 * 留着只是个没兑现的意图,故合并(YAGNI)。
 * #175(Frank「所有的框都去掉可点吧。hover 高亮也去掉,只有 分类 公司 职位 可以点击弹框,
 * 地址可以点击跳转」):可点集合大收编 —— 满屏蓝绿都能点 = 没有重点。
 */
export const FIELD_GROUP: Partial<Record<JobColKey, Disposition>> = {
  /**
   * ① 分类族 → 职业分类弹框(#176:点分类看分类 ——「这职业是干嘛的」,轻、快、零额度)。
   */
  noc: 'category',

  /**
   * TEER 同属分类族。
   */
  teer: 'category',

  /**
   * 大分类。
   */
  broad: 'category',

  /**
   * 中分类。
   */
  mid: 'category',

  /**
   * 小分类。
   */
  fine: 'category',

  /**
   * ③ 公司 → 公司弹框;职位名不走本表(cellActionable 特判,直开 JD 弹框)。
   */
  company: 'company',

  /**
   * ④ 地址保持地图直连(有街号才点得开)。
   */
  address: 'map',

  /**
   * 省 → 地点弹框(E8-12:格内文字仍是地图链接,两个动作分开)。
   */
  province: 'location',

  /**
   * 市 → 地点弹框。
   */
  city: 'location',

  /**
   * 区 → 地点弹框。
   */
  district: 'location',

  /**
   * ⑤ PNP → 省提名弹框(2026-07-25 Frank 拆弹框:「xx 的内容只放 xx 的弹框」,
   * 原并入移民弹框的五合一退役 —— 与移民价值的依据链行重复)。
   */
  pnp: 'pnp',

  /**
   * EE 类别 → 联邦抽选弹框。
   */
  ee: 'ee',

  /**
   * AIP → 大西洋试点弹框。
   */
  aip: 'aip',

  /**
   * RCIP/FCIP → 试点社区弹框。
   */
  pilot: 'pilot',

  /**
   * ⑥ 薪资族 → 薪资弹框(帖面薪资 + 折算 + 当地 band + vs 中位一处看全)。
   */
  vsMedian: 'salary',

  /**
   * 薪资原文。
   */
  salary: 'salary',

  /**
   * 折算年薪。
   */
  salaryYr: 'salary',

  /**
   * 当地中位时薪。
   */
  wageMedHr: 'salary',

  /**
   * 当地中位年薪。
   */
  wageMedYr: 'salary',

  /**
   * ② 「匹配」列 → 个人化解读弹框(2026-07-26:操作列「移民通道」钮下架后,
   * 「对我意味着什么」改挂它自己的字段;score 键随三维档卡一起退役)。
   */
  match: 'immigration',

  /**
   * ⑦ 其余一律不可点(Pro 锁位的锁自己链升级弹窗,不走本路由)。
   */
  eligibility: 'none',

  /**
   * 工时。
   */
  empHours: 'none',

  /**
   * 雇佣期。
   */
  empTerm: 'none',

  /**
   * 谁能投。
   */
  whoCanApply: 'none',

  /**
   * 经验级别。
   */
  accessibility: 'none',

  /**
   * 外劳记录。
   */
  lmia: 'none',

  /**
   * 国家。
   */
  country: 'none',

  /**
   * 来源板。
   */
  source: 'none',

  /**
   * 发布渠道。
   */
  origin: 'none',

  /**
   * 首发/转发。
   */
  direct: 'none',

  /**
   * 在招/下架。
   */
  status: 'none',

  /**
   * 发布时间。
   */
  datePosted: 'none',

  /**
   * 更新时间。
   */
  lastSeen: 'none',

  /**
   * 下架时间。
   */
  closedAt: 'none',
}

/**
 * 「不可点」那一档的字面量(cellActionable 与 openField 都要判它)。
 */
export const DISPOSITION_NONE = 'none'

/**
 * 「直连地图」那一档的字面量。
 */
export const DISPOSITION_MAP = 'map'

/**
 * 空值的显示字符(全站一个长横)。
 */
export const DASH = '—'

/**
 * 空串:没有 title / 没有链接 / 没有动态色时这一格给它。
 */
export const TEXT_NONE = ''

/**
 * 数据层用来表示「没归到类」的分类值 —— 它不是分类名,是占位。
 */
export const UNCAT = '未分类'

/**
 * 魁北克省码(走自己的移民体系,不属 PNP)。
 */
export const PROV_QC = 'QC'

/**
 * 省码与 NOC 拼成排除清单键的分隔符(键形如 `ON|72310`)。
 */
export const BLOCK_KEY_SEP = '|'

/**
 * 官方具名排除清单里「不受理」那一档的类型值。
 */
export const PNP_OCC_INELIGIBLE = 'ineligible'

/**
 * 排除清单的默认所属项目(没写 program 的行按 PNP 算)。
 */
export const PNP_OCC_PROGRAM_PNP = 'PNP'

/**
 * 排除清单里 AIP 那一档的 program 值。
 */
export const PNP_OCC_PROGRAM_AIP = 'AIP'

/**
 * 年薪换算成「$NK/yr」的除数。
 */
export const K_DIVISOR = 1000

/**
 * vs 中位换算成百分比的乘数。
 */
export const PCT_MULTIPLIER = 100

/**
 * 正数百分比的前缀(负数自带减号)。
 */
export const SIGN_PLUS = '+'

/**
 * 百分号。
 */
export const SIGN_PCT = '%'

/**
 * 「$」。
 */
export const SIGN_DOLLAR = '$'

/**
 * 折算年薪与中位年薪的单位后缀。
 */
export const UNIT_K_YEAR = 'K/yr'

/**
 * 中位时薪的单位后缀。
 */
export const UNIT_HOUR = '/hr'

/**
 * TEER 胶囊的前缀(卡片上显示 TEER 码,人话档名退到 title —— #214 回滚)。
 */
export const TEER_PREFIX = 'TEER '

/**
 * EE 胶囊的前缀。
 */
export const EE_PREFIX = 'EE '

/**
 * LMIA 胶囊的前缀(有 LMIA 数无担保档时显示)。
 */
export const LMIA_PREFIX = 'LMIA ✓'

/**
 * EE 上次抽选日期截到「年-月」的长度。
 */
export const YEAR_MONTH_LEN = 7

/**
 * 每列单元格的色档 → 类名。色是**判定结果**不是排版(薪资有值才绿、走不了才灰),
 * 所以先在 functions 里算成档,再由这张表换成类 —— 值都在 jobs.module.css 一处。
 */
export const CELL_TONE_CLS: Record<CellTone, string> = {
  /**
   * 不加色(继承格子默认)。
   */
  plain: 'plain',

  /**
   * 站内蓝链色(职位名/公司名)。
   */
  link: 'link',

  /**
   * 大分类:色值由 NOC 分类表逐类给(动态,类只管字重)。
   */
  cat: 'cat',

  /**
   * 深灰正文。
   */
  slate: 'slate',

  /**
   * 深灰小字。
   */
  slateSm: 'slateSm',

  /**
   * 近黑(区名)。
   */
  ink: 'ink',

  /**
   * 浅灰(无值)。
   */
  muted: 'muted',

  /**
   * 浅灰小字。
   */
  mutedSm: 'mutedSm',

  /**
   * 更浅的灰小字(「这一格没有信号」那一档)。
   */
  faintSm: 'faintSm',

  /**
   * 中灰小字(发布时间)。
   */
  graySm: 'graySm',

  /**
   * 绿(有可信薪资)。
   */
  money: 'money',

  /**
   * 绿小字(首发/在招)。
   */
  moneySm: 'moneySm',

  /**
   * 绿半粗小字(可提名)。
   */
  moneyMd: 'moneyMd',

  /**
   * 绿粗(高于中位)。
   */
  vsUp: 'vsUp',

  /**
   * 琥珀粗(低于中位)。
   */
  vsDown: 'vsDown',

  /**
   * 紫小字(魁省 N/A)。
   */
  purpleSm: 'purpleSm',

  /**
   * 红小字(官方具名排除)。
   */
  redSm: 'redSm',

  /**
   * 红粗小字(身份预筛红旗)。
   */
  redBoldSm: 'redBoldSm',

  /**
   * 琥珀小字(AIP 在指定名单)。
   */
  amberSm: 'amberSm',

  /**
   * 青小字(试点社区)。
   */
  cyanSm: 'cyanSm',

  /**
   * 蓝绿半粗小字(外劳记录)。
   */
  tealSm: 'tealSm',

  /**
   * 蓝小字(EE 命中)。
   */
  blueSm: 'blueSm',
}

/**
 * 胶囊的语义色档 → 类名。配色是**语义**不是数据:可提名 = 琥珀、不受理 = 红、
 * EE = 蓝、试点 = 天蓝…… 三个色值(底/字/框)在样式里一处定死 —— 2026-08-18 从
 * 「调用点传裸 hex + 一张 bg→border 查表」改过来:原先同一种胶囊的三个色分散在两处。
 */
export const CHIP_TONE_CLS: Record<string, string> = {
  /**
   * TEER 档:中性灰。
   */
  gray: 'toneGray',

  /**
   * 可提名 / 具名紧缺通道。
   */
  amber: 'toneAmber',

  /**
   * 官方具名不受理。
   */
  red: 'toneRed',

  /**
   * EE 类别命中。
   */
  blue: 'toneBlue',

  /**
   * AIP 在指定名单。
   */
  orange: 'toneOrange',

  /**
   * 魁省(独立体系)。
   */
  purple: 'tonePurple',

  /**
   * LMIA 获批记录。
   */
  teal: 'toneTeal',

  /**
   * 担保档。
   */
  indigo: 'toneIndigo',

  /**
   * RCIP/FCIP 试点社区。
   */
  sky: 'toneSky',
}

/**
 * TEER 3 是「可走省提名的技术档」下限:TEER 0-3 属通用可提名档,超过它就得靠具名清单。
 */
export const TEER_ROUTE_MAX = 3

/**
 * 担保档里「只有 AIP 背书」的那一档(无 LMIA 数且有 AIP 时不出胶囊,AIP 胶囊已经在)。
 */
export const SPONSOR_GRADE_AIP_ONLY = 3

/**
 * 试点类型「yes」的下拉值(任一命中)。
 */
export const PILOT_ANY = 'yes'

/**
 * 试点类型「no」的下拉值。
 */
export const PILOT_NONE = 'no'

/**
 * 头回来的人没有 cookie(88% 流量来自搜索,大多是头回),给一份默认比例兜底:
 * 首屏就按它定版式,水合后换成真量出来的像素 —— 差几个像素,不会像「自动布局→固定布局」
 * 那样整表抻一下(实测 CLS 0.087 → 0.008)。
 * 数值 = 2026-08-03 默认列集在 1440 视口实测比例;**keys 必须与 DEFAULT_COLS 一致**,
 * 对不上会被列宽机器直接忽略(退回今天的行为),所以改列集这里忘了改也不会出错。
 */
export const DEFAULT_COLW_SEED = {
  /**
   * 这份比例对应的列集(逗号分隔,顺序即列序)。
   */
  keys: 'datePosted,broad,company,title,province,city,salary,salaryYr,vsMedian,actions',

  /**
   * 各列占容器宽的百分比(和 = 100)。
   */
  pct: [6.69, 9.83, 20.77, 14.79, 9.6, 9.36, 8.26, 5.82, 7.32, 7.55],
}

/**
 * 任何列都不低于这个宽(表头量不到时的兜底)。
 */
export const COL_FLOOR = 44

/**
 * 单元格左右内边距(6+6)+ 1px 列分隔线:量到的是纯内容宽,分宽要算上。
 */
export const CELL_PAD = 14

/**
 * 量宽只看前 60 行:再往下量不改结论,却要多跑几百次 Range 测量。
 */
export const MEASURE_ROWS = 60

/**
 * 九成位而不是最大值:整列宽度不该被一条超长值绑架(一条「Manufacturing and utilities」
 * 能把大分类撑到 249px,右边几列全被压到底线反而更折行)。最长值留给「还有余量」那步。
 */
export const P90 = 0.9

/**
 * 量出来的文字实宽是小数(85.2px),向上取整还差半个像素就会折行 —— 留 1px 富余。
 */
export const WIDTH_SLACK = 1

/**
 * 比例写进 cookie 时保留的小数位。
 */
export const PCT_DECIMALS = 2

/**
 * 分宽第二步的第一趟目标:九成的值不折行。
 */
export const TARGET_P90 = 'p90'

/**
 * 分宽第二步的第二趟目标:最长值也不折行。
 */
export const TARGET_MAX = 'max'

/**
 * 列宽拖拽的鼠标按下事件名。
 */
export const EV_MOUSE_MOVE = 'mousemove'

/**
 * 列宽拖拽的鼠标松开事件名。
 */
export const EV_MOUSE_UP = 'mouseup'

/**
 * 点空白处关下拉/关面板用的按下事件名。
 */
export const EV_MOUSE_DOWN = 'mousedown'

/**
 * Esc 关弹框用的按键事件名。
 */
export const EV_KEY_DOWN = 'keydown'

/**
 * 窗口尺寸变化事件名(固定列偏移要重量)。
 */
export const EV_RESIZE = 'resize'

/**
 * Esc 键名。
 */
export const KEY_ESCAPE = 'Escape'

/**
 * 量宽时整表临时加的类(不折行 + 按内容撑开,量完立刻摘)。
 */
export const MEASURE_CLS = 'jtMeasure'

/**
 * 表格外层容器的全局类名 —— 量宽要靠它拿可分宽度(`closest` 选择器)。
 */
export const TABLE_WRAP_SEL = '.jtTableWrap'

/**
 * 表格元素选择器(量宽从表头往上找到它)。
 */
export const TABLE_SEL = 'table'

/**
 * 表体首行选择器(没有行就量不出内容宽,这一帧不量)。
 */
export const TBODY_ROW_SEL = 'tbody tr'

/**
 * 表头单元格选择器(拖拽时从竖线往上找)。
 */
export const TH_SEL = 'th'

/**
 * 量宽第一趟:整表按内容撑开(允许溢出)。
 */
export const LAYOUT_AUTO = 'auto'

/**
 * 量宽第一趟的表宽:按内容最大宽。
 */
export const WIDTH_MAX_CONTENT = 'max-content'

/**
 * 量宽第二趟的表宽:按最窄可行宽(读得出每列最长的那个词)。
 */
export const WIDTH_MIN_CONTENT = 'min-content'

/**
 * 量宽期间的最小宽(不设限,免得被旧值卡住)。
 */
export const WIDTH_ZERO = '0'

/**
 * 表格不溢出时的宽度(百分比,交给浏览器)。
 */
export const WIDTH_FULL = '100%'

/**
 * 拖列时全局光标。
 */
export const CURSOR_COL_RESIZE = 'col-resize'

/**
 * 拖完还原光标。
 */
export const CURSOR_NONE = ''

/**
 * 本视图默认排序列(#127 拍板:发布时间最新在前,旧 0-100 分不再参与任何排序)。
 */
export const SORT_DEFAULT: JobColKey = 'datePosted'

/**
 * 匹配视图的默认排序列(2026-07-21 Frank:横幅写「按匹配度排序」得名副其实,
 * 原默认发布时间序把非今日的高匹配全压在今日中匹配下面)。
 */
export const SORT_MATCH: JobColKey = 'match'

/**
 * 换血中(第 0 页在拉)骨架行的条数。
 */
export const SKELETON_ROWS = 8

/**
 * 收藏的初始状态(心愿单)。
 */
export const SAVED_STATUS_WISH = 'wish'

/**
 * 投递后的收藏状态。
 */
export const SAVED_STATUS_APPLIED = 'applied'

/**
 * 岗位已下架。
 */
export const STATUS_CLOSED = 'closed'

/**
 * 岗位在招(status 缺席时按它算)。
 */
export const STATUS_OPEN = 'open'

/**
 * 收藏一个岗(#129 功能级 umami 埋点)。
 */
export const TRACK_SAVE_JOB = 'save-job'

/**
 * 保存一套筛选。
 */
export const TRACK_SAVE_SEARCH = 'save-search'

/**
 * 进「我的匹配」视图。
 */
export const TRACK_MATCH_VIEW = 'match-view'

/**
 * 手里没有职业答案 → 先去建档。
 */
export const TRACK_MATCH_VIEW_QUIZ = 'match-view-quiz'

/**
 * 详情页浏览(漏斗第 1 步,主线 M2 收口 2026-08-02)。
 */
export const TRACK_JD_OPEN = 'jd-open'

/**
 * 详情页浏览的来源格:整页(列表页弹框另计 modal)。
 */
export const TRACK_KIND_PAGE = 'page'

/**
 * 埋点参数名:来源形态。
 */
export const TRACK_KEY_KIND = 'kind'

/**
 * 下架页的相似职位点击。
 */
export const TRACK_REL_JOB = 'rel-job'

/**
 * 相似职位埋点的来源格名。
 */
export const TRACK_KEY_FROM = 'from'

/**
 * 相似职位来自下架页。
 */
export const TRACK_FROM_CLOSED = 'closed'

/**
 * 相似职位来自「同公司同职业都零在招」的兜底链。
 */
export const TRACK_FROM_CLOSED_NONE = 'closed-none'

/**
 * 中文对照(首次拉取才计,纯开合不计)。
 */
export const TRACK_JD_TRANSLATE = 'jd-translate'

/**
 * JD 速读展开。
 */
export const TRACK_AI_READ_JD = 'ai-read-jd'

/**
 * 简历对照 JD 弹框开启(G3)。
 */
export const TRACK_JD_MATCH_OPEN = 'jd-match-open'

/**
 * 投递(E9-04)—— 走 umami 全局对象,带投递方式。
 */
export const TRACK_APPLY = 'apply'

/**
 * 投递方式的参数名。
 */
export const TRACK_KEY_MODE = 'mode'

/**
 * 邮件投递。
 */
export const TRACK_MODE_EMAIL = 'email'

/**
 * 外跳原帖投递。
 */
export const TRACK_MODE_WEB = 'web'

/**
 * JD 正文渲染的截断长度(再长也没人读完,且会把弹框拖慢)。
 */
export const JD_MAX_LEN = 4000

/**
 * 大节头白名单(Job Bank 固定小节)。白名单外一律当内容行 ——「English」这类单词值
 * 不会被误判成标题。
 */
export const JD_TOP_HEADS = new Set([
  'overview', 'responsibilities', 'requirements', 'experience and specialization',
  'additional information', 'benefits', 'employment groups',
  'who can apply for this job', 'who can apply to this job',
])

/**
 * 子节头白名单(Job Bank 固定小节)。
 */
export const JD_SUB_HEADS = new Set([
  'languages', 'education', 'experience', 'on site', 'on the road', 'work setting',
  'work site environment', 'tasks', 'supervision', 'credentials',
  'certificates, licences, memberships, and courses', 'computer and technology knowledge',
  'area of specialization', 'area of work experience', 'security and safety',
  'transportation/travel information', 'work conditions and physical capabilities',
  'weight handling', 'own tools/equipment', 'personal suitability', 'health benefits',
  'financial benefits', 'long term benefits', 'other benefits', 'screening questions', 'green job',
])

/**
 * Indeed/ATS 尾巴的内联标签(源头丢换行,如 "Job Type: Part-time Pay: $20 Benefits: * A * B"):
 * 白名单标签前补换行 + 「* 」项拆行 —— 只认这些词,不会切碎正文散文段落。
 */
export const JD_INLINE_LABELS = [
  'Job Types', 'Job Type', 'Pay', 'Salary', 'Benefits', 'Schedule', 'Expected hours',
  'Supplemental pay types', 'Flexible language requirement', 'Experience', 'Education', 'Language',
  'Work Location', 'Licence/Certification', 'Ability to commute/relocate', 'Application question(s)',
  'Application deadline', 'Expected start date', 'Shift availability',
]

/**
 * 第三套版式(2026-07-07 用户第三例):医疗/政府 HR 系统导出(SHA/SAHO 等)——
 * 整段「Label: value Label: value」粘连,且有无空格粘边(「YesEducation- Bachelor」)
 * 和「Label- 值」破折号变体。照旧全白名单制,不碰散文。
 */
export const JD_HR_LABELS = [
  'Position #', 'Expected Start Date', 'Union', 'Facility', 'City/Town', 'Department', 'Type', 'FTE',
  'Shift Information', 'Number of Hours per Rotation', 'Relief', 'Float', 'Hours of Work',
  'Salary or Pay Band', 'Travel Required', 'Job Description', 'Human Resources Exemption',
  'Multi-Cost', 'Licenses', 'Other Information', 'About Us', 'About The Team',
]

/**
 * 正则元字符转义用的模式(把标签词拼进正则前先过它)。
 */
export const JD_ESC_RE = /[.*+?^${}()|[\]\\/]/g

/**
 * 转义替换串(捕获到的字符前补反斜杠)。
 */
export const JD_ESC_TO = '\\$&'

/**
 * 标签词拼成正则备选项的分隔符。
 */
export const JD_ALT_SEP = '|'

/**
 * 「已知标签前断行」正则的模板(`%s` 位由标签备选项填)。
 */
export const JD_INLINE_TPL = '\\s+(?=(?:%s):)'

/**
 * 「HR 破折号变体前断行」正则的模板(「 Education- Bachelor」)。
 */
export const JD_HR_DASH_TPL = '\\s+(?=(?:%s)-\\s)'

/**
 * 「无空格粘边」正则的模板(「YesEducation-」)。
 */
export const JD_GLUE_TPL = '(?<=[a-z)])(?=(?:%s)[:-])'

/**
 * 「行首 Label- 」正则的模板(归一成「Label: 」)。
 */
export const JD_HR_LINE_TPL = '^(%s)-\\s*'

/**
 * 正则模板里的填充位。
 */
export const JD_TPL_SLOT = '%s'

/**
 * 全局标志。
 */
export const RE_FLAG_G = 'g'

/**
 * 「行首 Label- 」归一后的替换串。
 */
export const JD_HR_LINE_TO = '$1: '

/**
 * 相邻重复短行的长度上限:节头/标签才这么短,正文长句不碰。
 */
export const JD_DUP_MAX_LEN = 80

/**
 * markdown 强调残渣(连堆的 * \ _)。
 */
export const JD_EMPHASIS_RE = /[*\\_]{2,}/g

/**
 * 孤立的 * 与反斜杠(真实 JD 不用星号行文,误伤面≈0)。
 */
export const JD_STAR_RE = /[*\\]/g

/**
 * 「* 项」拆行。
 */
export const JD_STAR_ITEM_RE = /\s+\*\s+/g

/**
 * 行内圆点 bullet 拆行(2026-07-10 用户第四例,CER 帖:「decision making;• Design」——
 * 源头丢换行,圆点前可无空格;圆点后必有空格才算列表项,防误伤小数/代码)。
 */
export const JD_BULLET_RE = /\s*[•▪◦‣]\s+/g

/**
 * 一句一行(07-06 用户拍板):句末标点(前一字符是小写/数字/右括号,防 $20.00、U.S. 误拆)
 * + 可选空格 + 大写开头 → 断行;兼容 Job Bank 抓取的无空格粘连("asset.Core")。
 */
export const JD_SENTENCE_RE = /(?<=[a-z0-9)][.!?])\s*(?=[A-Z])/

/**
 * 行首的 bullet 前缀(猜测轨才剥;保真轨保留数据层给的「• 」)。
 */
export const JD_LEAD_BULLET_RE = /^[•·▪◦‣*-]+\s*/

/**
 * 连续空白压成一个空格。
 */
export const JD_SPACES_RE = /\s{2,}/g

/**
 * 一个空格(压缩后的替换串,也是拼句子的分隔)。
 */
export const SPACE = ' '

/**
 * 换行符(断行与分行都用它)。
 */
export const NEWLINE = '\n'

/**
 * 数据层给的列表符前缀(保真轨保留它,渲成悬挂缩进)。
 */
export const JD_BULLET_MARK = '• '

/**
 * 裸标签行(如 "Benefits:")→ 小节头。
 */
export const JD_BARE_LABEL_RE = /^([A-Z][A-Za-z ()/#&'-]{1,40}):$/

/**
 * 行内「Label: 值」。
 */
export const JD_LABEL_LINE_RE = /^([A-Z][A-Za-z ()/#&'-]{1,40}):\s*(.+)$/

/**
 * 「Label:」显示时补的冒号。
 */
export const COLON = ':'

/**
 * 五节整理版的节标记(J3,2026-07-19 Frank 批)。
 */
export const JD_SEC_SPLIT_RE = /\[(ROLE|REQS|PAY|WORKHOURS|APPLY)\]/

/**
 * 五节的节键与它们的取词键(顺序即渲染顺序)。
 */
export const JD_SECS: [string, string][] = [
  ['ROLE', 'act.f.role'],
  ['REQS', 'act.f.reqs'],
  ['PAY', 'act.f.pay'],
  ['WORKHOURS', 'act.f.hours'],
  ['APPLY', 'act.f.apply'],
]

/**
 * 首节键(#155:它的小标题紧贴大标题「职位描述」,两行说同一件事 —— 详情页省略它)。
 */
export const JD_SEC_ROLE = 'ROLE'

/**
 * 薪资节键(#123c:整节空且帖面有薪资 → 兜底显示帖面薪资)。
 */
export const JD_SEC_PAY = 'PAY'

/**
 * 投递节键(#125:整节文本直接渲成官方原帖链接)。
 */
export const JD_SEC_APPLY = 'APPLY'

/**
 * 分节时相邻两片(标记、正文)的步长。
 */
export const JD_SEC_STEP = 2

/**
 * 先剥「- 」bullet 前缀再判缺节(#186:变体常以「- (not stated)」形式混在有内容的节里)。
 */
export const JD_DASH_PREFIX_RE = /^-\s*/

/**
 * PAY 节里「这一行含不含钱数」的判据(Frank 2026-07-31「整理后的怎么薪资没显示」:
 * 模型抄了福利漏了钱数,一行都不含数字 = 视为缺薪资,帖面薪资顶到节首)。
 */
export const JD_MONEY_RE = /[$€£]\s?\d|\d[\d,]{2,}/

/**
 * 「- 」开头 = 这一节是列表(渲成 ul)。
 */
export const JD_BULLET_PREFIX = '- '

/**
 * 外链箭头(「怎么投」那几行点出去)。
 */
export const ARROW_OUT = ' ↗'

/**
 * Job Bank 岗的判据:只有它的投递方式藏在 JSF 后面,要懒查 applyhow。
 */
export const JB_POSTING_RE = /jobbank\.gc\.ca\/jobsearch\/jobposting\//

/**
 * 正文里抽投递邮箱的正则(非 JB 岗常直接带邮箱)。
 */
export const APPLY_MAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g

/**
 * 邮箱域名分隔符。
 */
export const AT = '@'

/**
 * 官方站的邮箱域(这些不是雇主邮箱,跳过)。
 */
export const JB_MAIL_HOST = 'jobbank'

/**
 * 加拿大政府域后缀之一。
 */
export const GC_MAIL_SUFFIX = 'gc.ca'

/**
 * 加拿大政府域后缀之二。
 */
export const CANADA_MAIL_SUFFIX = 'canada.ca'

/**
 * 来源行只报域名不铺整条链接(#239:整条 URL 在 375 上折两行又长又丑)。
 */
export const WWW_PREFIX_RE = /^www\./

/**
 * mailto 协议头。
 */
export const MAILTO = 'mailto:'

/**
 * mailto 的主题参数。
 */
export const MAILTO_SUBJECT = '?subject='

/**
 * mailto 的正文参数。
 */
export const MAILTO_BODY = '&body='

/**
 * 投递邮件的主题模板起手(后接职位名)。
 */
export const MAIL_SUBJECT_HEAD = 'Application for '

/**
 * 主题里公司名前的连接。
 */
export const MAIL_SUBJECT_AT = ' - '

/**
 * 邮件正文的换行(邮件客户端认 CRLF)。
 */
export const MAIL_CRLF = '\r\n'

/**
 * 邮件正文首行。
 */
export const MAIL_HELLO = 'Hello,'

/**
 * 正文第二段起手。
 */
export const MAIL_BODY_HEAD = 'I would like to apply for the position of "'

/**
 * 职位名之后的引号。
 */
export const MAIL_BODY_QUOTE = '"'

/**
 * 公司名前的介词。
 */
export const MAIL_BODY_AT = ' at '

/**
 * 城市省份前的介词。
 */
export const MAIL_BODY_IN = ' in '

/**
 * 第二段句号。
 */
export const MAIL_BODY_DOT = '.'

/**
 * 原帖链接那一行的标签。
 */
export const MAIL_POSTING = 'Job posting: '

/**
 * 附简历那一句。
 */
export const MAIL_ATTACH = 'Please find my resume attached.'

/**
 * 落款。
 */
export const MAIL_REGARDS = 'Best regards,'

/**
 * 空行(邮件正文分段)。
 */
export const MAIL_BLANK = ''

/**
 * 地点两段之间的分隔(城市, 省)。
 */
export const LOC_SEP = ', '

/**
 * OAuth 回跳续投的有效期(10 分钟):超时就不再替他接着投,免得莫名其妙弹出投递。
 */
export const APPLY_RESUME_TTL_MS = 600000

/**
 * 续投意图串的两段分隔(岗位号|时间戳)。
 */
export const APPLY_RESUME_SEP = '|'

/**
 * 详情页正文轨的上内衬档。
 */
export const DETAIL_SHELL_TOP = 14

/**
 * 相似职位:同公司组不带公司名小注(组标题已经说了同公司,再贴一遍既重复又在 375 上被截断)。
 */
export const REL_WITH_COMPANY = false

/**
 * 相似职位:同职业组带公司名小注。
 */
export const REL_WITH_COMPANY_OCC = true

/**
 * 兜底链按「省」一级时的分级键(探不到本省该级还有在招岗就退到只按省)。
 */
export const LEVEL_FINE = 'fine'

/**
 * 兜底链按中类。
 */
export const LEVEL_MID = 'mid'

/**
 * 兜底链按大类。
 */
export const LEVEL_BROAD = 'broad'

/**
 * 界面语言:英文(英文界面不出译名灰注,也不出中文对照开关)。
 */
export const LANG_EN = 'en'

/**
 * 界面语言:中文(职业胶囊多值用顿号连接)。
 */
export const LANG_ZH = 'zh'

/**
 * 中文的多值连接符(顿号)。
 */
export const SEP_ZH = '、'

/**
 * 西文的多值连接符。
 */
export const SEP_EN = ', '

/**
 * 逗号(列集签名、NOC 多值都用它)。
 */
export const COMMA = ','

/**
 * 表头排序提示:当前降序。
 */
export const SORT_MARK_DESC = ' ▼'

/**
 * 表头排序提示:当前升序。
 */
export const SORT_MARK_ASC = ' ▲'

/**
 * 表头排序提示:未按此列排。
 */
export const SORT_MARK_IDLE = ' ↕'

/**
 * 折叠区展开的箭头。
 */
export const CARET_OPEN = '▲'

/**
 * 折叠区收起的箭头。
 */
export const CARET_CLOSED = '▼'

/**
 * AI 速读展开的箭头。
 */
export const CARET_DOWN = '▾'

/**
 * AI 速读收起的箭头。
 */
export const CARET_RIGHT = '▸'

/**
 * 已收藏的实心星。
 */
export const STAR_ON = '★'

/**
 * 未收藏的空心星。
 */
export const STAR_OFF = '☆'

/**
 * 职业胶囊的撤销叉。
 */
export const CROSS = '×'

/**
 * 匹配视图状态条的退出叉(跟在文案后面)。
 */
export const EXIT_CROSS = ' ×'

/**
 * 匹配视图状态条里「今日 N 个高匹配」前的连接。
 */
export const MV_DOT = ' · '

/**
 * 「更多」按钮在途时的占位。
 */
export const ELLIPSIS = '…'

/**
 * AI 整理版的星标。
 */
export const SPARKLE = '✨ '

/**
 * 流式打字机光标。
 */
export const CARET_BAR = '▋'

/**
 * AI 正文里的【小标题】切分(保留分隔符)。
 */
export const AI_HEAD_SPLIT_RE = /(【[^】]+】)/g

/**
 * 【小标题】的判据。
 */
export const AI_HEAD_RE = /^【[^】]+】$/

/**
 * markdown 加粗残渣(正文是 pre-wrap 纯文本,** 不会变粗只碍眼)。
 */
export const AI_BOLD_RE = /\*{2,}/g

/**
 * 段首空行。
 */
export const AI_LEAD_BLANK_RE = /^\n+/

/**
 * 段尾空行。
 */
export const AI_TAIL_BLANK_RE = /\n+$/

/**
 * 三个以上连续换行压成两个(免大空隙)。
 */
export const AI_GAP_RE = /\n{3,}/g

/**
 * 上一条的替换串(留一个空行当段距)。
 */
export const AI_GAP_TO = '\n\n'

/**
 * ❓ 建议行协议(第 15 轮 #36,用户点名「基于具体内容生成问题」):模型每次回复结尾
 * 附一行「❓问题」,打字机 drain 时截住不显示,完成后取出做建议 chip。
 */
export const SUG_MARK = '❓'

/**
 * 建议行只在回复末尾这么近的范围内找(再远就是正文里的问号了)。
 */
export const SUG_TAIL_MAX = 300

/**
 * 建议问题长度红线(2026-07-11 用户拍板「不要太长」):超了裁到首个问号。
 */
export const SUG_MAX_LEN = 60

/**
 * 裁到首个问号的正则。
 */
export const SUG_CUT_RE = /^[^?？]{0,59}[?？]/

/**
 * 兜底分支:末行是独立短问句(模型偶发漏打标记)——下限长度。
 */
export const SUG_LAST_MIN = 8

/**
 * 兜底分支的上限长度。
 */
export const SUG_LAST_MAX = 70

/**
 * 末行以问号收尾才算问题。
 */
export const SUG_QUESTION_RE = /[?？]$/

/**
 * 末行以【 开头的是小标题不是问题。
 */
export const SUG_HEAD_MARK = '【'

/**
 * 行尾空白(裁正文时先剥)。
 */
export const TRAIL_WS_RE = /\s+$/

/**
 * 公司名后缀(#49:把公司名换成指代词前,先去掉这些后缀拿核心名)。
 */
export const COMPANY_SUFFIX_RE = /\b(incorporated|inc|ltd|limited|llp|llc|corp|corporation|co)\.?\s*$/i

/**
 * 正则元字符转义(公司名拼进正则前)。
 */
export const RE_ESC_RE = /[.*+?^${}()|[\]\\]/g

/**
 * 忽略大小写的全局标志。
 */
export const RE_FLAG_GI = 'gi'

/**
 * 公司名最短几个字才值得替换(太短会误伤正文)。
 */
export const COMPANY_MIN_LEN = 3

/**
 * 相邻重复指代词合一的模板(`%s` 由指代词填)。
 */
export const SUG_DEDUP_TPL = '(%s)(的?\\s*\\1)+'

/**
 * 上一条的替换串。
 */
export const SUG_DEDUP_TO = '$1'

/**
 * 指代词的取词键(#44 的 prompt 约束模型不稳定遵守,前端兜底替换)。
 */
export const K_SUG_GENERIC = 'jd.sugGeneric'

/**
 * 顾问初判(详情页,含移民路径)。
 */
export const ADVISOR_FIELD_TITLE = 'title'

/**
 * 纯 JD 速读(职位弹框,2026-07-21 Frank「只速读这个 job 的内容即可,
 * 不需要过度解读移民信号」)。
 */
export const ADVISOR_FIELD_JD_READ = 'jdRead'

/**
 * 行业顺序清单里没有的大类(「未分类」)排到最后。
 */
export const BROAD_ORDER_LAST = 99

/**
 * 登录框的三档:登录 / 注册 / 重置密码。
 */
export const AUTH_LOGIN: AuthMode = 'login'

/**
 * 注册框。
 */
export const AUTH_REGISTER: AuthMode = 'register'

/**
 * 重置密码框(E3-07:邮件链接 ?reset=<token> 落地)。
 */
export const AUTH_RESET: AuthMode = 'reset'

/**
 * 匿名免费态(props 没给 plan 时的兜底 —— 老调用方兼容)。
 */
export const FREE_PLAN = {
  /**
   * 不是 Pro。
   */
  isPro: false,

  /**
   * 没登录。
   */
  loggedIn: false,

  /**
   * 没建档。
   */
  profileOk: false,

  /**
   * 没有档案。
   */
  profile: null,

  /**
   * 免费匹配额度(SSR 会给真值)。
   */
  freeMatchCap: 0,

  /**
   * 没有邮箱。
   */
  email: null,

  /**
   * 没有昵称。
   */
  displayName: null,

  /**
   * 没有头像。
   */
  avatar: null,

  /**
   * 没有 Pro 到期日。
   */
  proUntil: '',
}

/**
 * 空维度(props 没给 dims 时的兜底;大维度随后由 /api/jobs/dims 补进来)。
 */
export const EMPTY_DIMS = {
  /**
   * 省。
   */
  provinces: [],

  /**
   * 市。
   */
  cities: [],

  /**
   * 区。
   */
  districts: [],

  /**
   * 三级分类(含英韩名)。
   */
  nocCategories: [],

  /**
   * 来源板。
   */
  sources: [],

  /**
   * 经验级别。
   */
  experienceLevels: [],

  /**
   * 省提名职业清单(含官方具名排除)。
   */
  pnpOccupations: [],

  /**
   * 省提名抽选。
   */
  pnpDraws: [],

  /**
   * 联邦 EE 类别(算休眠要看最近抽选日)。
   */
  eeCategories: [],

  /**
   * 大西洋试点指定雇主。
   */
  designatedEmployers: [],

  /**
   * NOC 官方职业名与职责。
   */
  nocDescriptions: [],

  /**
   * 事实出处。
   */
  fieldSources: [],

  /**
   * 官方新闻。
   */
  news: [],
}

/**
 * 路径分隔(拼 `/api/saved-jobs/<行号>` 用)。
 */
export const SLASH = '/'

/**
 * localStorage 里没有快照时,JSON.parse 拿到的那个「空」。
 */
export const JSON_NULL = 'null'

/**
 * 存筛选:成了。
 */
export const SAVE_OK = 'ok'

/**
 * 存筛选:免费位用满(弹升级框「Pro 可存 5 个」)。
 */
export const SAVE_LIMIT = 'limit'

/**
 * 存筛选:其它失败(说人话,不引流 Pro)。
 */
export const SAVE_ERR = 'err'

/**
 * 服务端「位子满了」的判据:错误体里带 limit 字样。
 */
export const LIMIT_RE = /limit/i

/**
 * 升级/登录弹框的由头:Pro 锁列 / 匿名点收藏。
 */
export const UPSELL_LOCK = 'lock'

/**
 * 由头:已保存筛选的免费位用满。
 */
export const UPSELL_SS = 'ss'

/**
 * 由头:「我的匹配」入口要先登录(E9-04b:登录成功直接落匹配视图)。
 */
export const UPSELL_LOGIN = 'login'

/**
 * JD 正文在途。
 */
export const JD_LOADING = 'loading'

/**
 * JD 正文拿到了。
 */
export const JD_DONE = 'done'

/**
 * 这一岗确实没有正文(空态自己解释,不谎报成失败)。
 */
export const JD_EMPTY = 'empty'

/**
 * 被宽松防滥用闸挡下(#201:JD 已免费,429 偶发,素文案不引流 Pro)。
 */
export const JD_LIMITED = 'limited'

/**
 * 整理版失败:额度用完(重试无用,不给钮)。
 */
export const FMT_QUOTA = 'quota'

/**
 * 整理版失败:生成失败(可重试)。
 */
export const FMT_FAIL = 'fail'

/**
 * 整理版失败:这一岗没有正文(不显示失败行)。
 */
export const FMT_NOTEXT = 'notext'

/**
 * 中文对照:闲置。
 */
export const TRANS_IDLE = 'idle'

/**
 * 中文对照:在途。
 */
export const TRANS_LOADING = 'loading'

/**
 * 中文对照:拉失败。
 */
export const TRANS_ERROR = 'error'

/**
 * 投递流程:闲置。
 */
export const APPLY_IDLE = 'idle'

/**
 * 投递流程:注册闸。
 */
export const APPLY_AUTH = 'auth'

/**
 * 投递流程:求职意向表单。
 */
export const APPLY_INTENT = 'intent'

/**
 * 整理版一节的渲染档:「怎么投」整节缺又有邮箱 / 整节缺只出官方短链 / 有内容且逐行链官方 /
 * 薪资整节缺但帖面有薪资 / 整节缺 / 有内容。
 */
export const SEC_MODE = {
  /**
   * 「怎么投」整节缺,但抽到了投递邮箱 —— 出邮箱人话行(dd24-#110)。
   */
  applyEmail: 'applyEmail',

  /**
   * 「怎么投」整节缺又没邮箱 —— 原先整条裸 URL 换短链文案(URL 又长又丑还与下方投递栏重复)。
   */
  applyLink: 'applyLink',

  /**
   * 「怎么投」有内容 —— #125(Frank「重复」):整节文本直接渲成官方原帖链接,
   * 一处内容一处链接,不再额外附按钮行(与底部合规来源行重复);「Click Here」类废句
   * 自身变成可点出口。
   */
  applyLines: 'applyLines',

  /**
   * #123c(Frank「每个职位都有薪资吧」):原帖正文没写薪资但帖面字段有 → 兜底显示帖面薪资
   * (仍是搬运原帖信息 —— JB 列表字段也是雇主自报,非编造)。
   */
  payFallback: 'payFallback',

  /**
   * 整节缺:出「原帖未提及」,缺节不脑补。
   */
  none: 'none',

  /**
   * 有内容。
   */
  lines: 'lines',
} as const

/**
 * 「打开完整页」的箭头。
 */
export const ARROW_LINK = ' ↗'

/**
 * 全站胶囊钮的全局类(main.css 的 `.pill`)—— 它是全站共用件,不是本域的,
 * 改名要连 main.css 一起改。
 */
export const PILL_CLS = 'pill'

/**
 * 全站白卡的全局类(main.css 的 `.cardMd`)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 定制样式钮统一走 ghost 变体 + 本域加倍类(样板 account 的 PLAIN_BTN_KIND)。
 */
export const BTN_GHOST = 'ghost'

/**
 * 表格操作小钮走 button 桶的 mini 档(2026-09-05 收拢:原 .actBtn 加倍类搬进 button 桶,全站一形)。
 */
export const BTN_MINI = 'mini'

/**
 * 白底描边钮(筛选行那几颗)。
 */
export const BTN_SECONDARY = 'secondary'

/**
 * 普通行动蓝(每屏唯一主行动)。
 */
export const BTN_PRIMARY = 'primary'

/**
 * 弹框层级:叠在别的弹框之上(投递流程的注册闸与意向表单)。
 */
export const MODAL_Z_STACKED = 70

/**
 * 小号弹框(拿不到 JD 时那句提示)。
 */
export const MODAL_SM = 'sm'

/**
 * 整理版首节出不出小标题(#155/#161 的那一格)。
 * ⚠️ 逐字保留旧行为:JD 身体从来**没有**给 JdFormattedView 传过这一格,于是它恒为 false ——
 * 首节的小标题一直照出。#155 当初想省的那一行(详情页大标题下面紧跟「这活干什么」)
 * 实际上没省成。改它会动到详情页的版式,不在换装批的范围 —— 记在行为疑点台账里。
 */
export const UNDER_TITLE = false

/**
 * 面包屑各段之间的分隔。
 */
export const CRUMB_SEP = ' › '

/**
 * 建档引导链尾巴上的箭头。
 */
export const ARROW_RIGHT = '→'

/**
 * 匹配档 → 它的配色类(值是 jobs.module.css 里的键名)。
 */
export const MATCH_TONE_CLS: Record<string, string> = {
  /**
   * 高匹配:绿。
   */
  high: 'matchHigh',

  /**
   * 中匹配:蓝。
   */
  mid: 'matchMid',

  /**
   * 低匹配:灰。
   */
  low: 'matchLow',

  /**
   * 不适用:浅。
   */
  na: 'matchNa',
}

/**
 * 斑马纹的周期(隔行换底色)。
 */
export const ZEBRA_MOD = 2

/**
 * 卡底「最后可见」精确到分(2026-08-29 Frank 拍板去秒:秒位对用户是噪音;
 * 原 GRAIN_SECOND 唯一消费者就是卡底,随拍板整个换档)。
 */
export const GRAIN_MINUTE = 'minute'

/**
 * 筛选行的下拉与搜索框统一走 sm 档(壳宽 150,与 38 高的钮对齐)。
 */
export const SELECT_SM = 'sm'

/**
 * 勾选框的 type(打错就渲成文本框,静默失效)。
 */
export const INPUT_CHECKBOX = 'checkbox'

/**
 * 由头:匹配锁(弹框带 FOMO 数字)。
 */
export const UPSELL_MATCH = 'match'

/**
 * 横幅的模块名(#65/#66 五模块统一浅色带,职位板 = 蓝)。
 */
export const BANNER_MODULE = 'jobs'

/**
 * 横幅大标题(站点定位是日更职位板,标题就是这两个字的英文)。
 */
export const BANNER_TITLE = 'Jobs'

/**
 * 职位板的 SEO 头(静态定稿;门里只 `export const metadata = BOARD_META` 一行转发 ——
 * 2026-08-29 Frank 定形:静态 B 形/动态 A 形,`= jobsMetaOf` 的 C 形随之退役)。
 * 标题:88% 流量来自 Google,把三样差异化信号写全;描述英文主打、中文一句压后。
 */
export const BOARD_META = {
  /**
   * 浏览器标签与搜索结果标题。
   */
  title: 'Canadian jobs with immigration signals — PNP · EE · wages | Offer2PR',

  /**
   * 搜索结果摘要。
   */
  description: 'Daily-updated job board across all 10 provinces: PNP named streams, '
    + 'EE categories, wages vs ESDC median, profile matching. '
    + '全加拿大日更职位板:省提名通道/EE 类别/工资对比/档案匹配。',
}

/**
 * 详情页不要匹配维度(E8-11 B2:页面砍到只剩 JD,匹配级与 PNP/EE 维度不再取)。
 */
export const EMPTY_MATCH_DIMS = {
  /**
   * 省提名职业清单。
   */
  pnpOccupations: [],

  /**
   * 联邦 EE 类别。
   */
  eeCategories: [],
}

/**
 * 在招岗不查相似职位(服务端就不查,related 恒空)—— 在招岗照旧守「一条信息一个家」。
 */
export const EMPTY_RELATED = {
  /**
   * 同公司在招。
   */
  sameCompany: [],

  /**
   * 同省同职业在招。
   */
  sameOcc: [],

  /**
   * 兜底链按哪一级筛。
   */
  fallbackLevel: null,
}

/**
 * 日期截到「年-月-日」的长度。
 */
export const DATE_LEN = 10

/**
 * 结构化数据脚本的 MIME(打错 Google 就不认这段,静默失效)。
 */
export const LD_MIME = 'application/ld+json'

/**
 * 职位板 SSR 首屏行数(2026-07-05 用户拍板):只带最近这么多行秒开,
 * 筛选与翻页由客户端打 `/api/jobs` 分页续取。
 */
export const FIRST_SCREEN_ROWS = 50


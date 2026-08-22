/**
 * 职位域的死值:省名对照、搜索列集、排序白名单、清单覆盖口径、缓存时长、JD 抓取参数与正则。
 *
 * @author Frank
 * @time 2026-08-22 00:05:00
 */

/**
 * 省全名 → 省码(筛选参数收进来可能是全名)。
 */
export const PROV_CODE: Record<string, string> = {
  /**
   * 安大略。
   */
  'Ontario': 'ON',

  /**
   * 不列颠哥伦比亚。
   */
  'British Columbia': 'BC',

  /**
   * 阿尔伯塔。
   */
  'Alberta': 'AB',

  /**
   * 魁北克。
   */
  'Quebec': 'QC',

  /**
   * 马尼托巴。
   */
  'Manitoba': 'MB',

  /**
   * 萨斯喀彻温。
   */
  'Saskatchewan': 'SK',

  /**
   * 新斯科舍。
   */
  'Nova Scotia': 'NS',

  /**
   * 新不伦瑞克。
   */
  'New Brunswick': 'NB',

  /**
   * 纽芬兰与拉布拉多。
   */
  'Newfoundland and Labrador': 'NL',

  /**
   * 爱德华王子岛。
   */
  'Prince Edward Island': 'PE',
}

/**
 * 搜索覆盖列(E10-01 拍板):职位/城市/区/NOC 码/来源标签。2026-07-19 提速三刀:公司名挪出 OR、
 * 省码列砍掉不可命中的 '%q%' 分支、剩余分支配 pg_trgm GIN(docs/sql/search-trgm-indexes.sql)。
 */
export const SEARCH_COLS = ['j.title', 'j.city', 'j.district', 'j.noc', 'j.source_label'] as const

/**
 * 搜索词封顶:再多是滥用,每多一词多一组位图 OR(截断不报错 —— 搜索不是表单)。
 */
export const Q_MAX_TERMS = 4

/**
 * 短词(≤2 字符)才附加的省码等值分支的长度界。
 */
export const Q_SHORT_LEN = 2

/**
 * 排序白名单(列 key → SQL 列/表达式):防注入,未知 key 回退发布时间。
 * E12-08:评分列改「通道」;#73 教训:前端可点列必须进白名单,否则静默回退看着像坏了。
 */
export const SORT_COLUMNS: Record<string, string> = {
  /**
   * 发布时间(默认序)。
   */
  datePosted: 'j.date_posted',

  /**
   * 通道档(评分列的排序主键)。
   */
  score: 'j.grade_channel',

  /**
   * 年薪。
   */
  salary: 'j.salary_annual',

  /**
   * 年薪(年显示列)。
   */
  salaryYr: 'j.salary_annual',

  /**
   * 最后确认。
   */
  lastSeen: 'j.last_seen',

  /**
   * 岗名。
   */
  title: 'j.title',

  /**
   * 公司名。
   */
  company: 'c.name',

  /**
   * 省。
   */
  province: 'j.province',

  /**
   * 城市。
   */
  city: 'j.city',

  /**
   * 大类。
   */
  broad: 'j.broad',

  /**
   * 中类。
   */
  mid: 'j.mid',

  /**
   * 小类。
   */
  fine: 'j.fine',

  /**
   * TEER。
   */
  teer: 'j.teer',

  /**
   * NOC 码。
   */
  noc: 'j.noc',

  /**
   * 无障碍。
   */
  accessibility: 'j.accessibility',

  /**
   * 国家。
   */
  country: 'j.country',

  /**
   * 区。
   */
  district: 'j.district',

  /**
   * 地址。
   */
  address: 'j.address',

  /**
   * 来源标签。
   */
  source: 'j.source_label',

  /**
   * 发布渠道。
   */
  origin: 'j.origin',

  /**
   * 直接雇主(与 directOnly 筛选同一谓词)。
   */
  direct: `(COALESCE(j.apply_url,'') NOT ILIKE '%jobbank.gc.ca%' OR COALESCE(j.source,'') = 'Job Bank')`,

  /**
   * 粗筛信号。
   */
  pnp: 'j.pnp_eligible',

  /**
   * EE 类别。
   */
  ee: 'j.ee_category',

  /**
   * AIP。
   */
  aip: 'j.aip',

  /**
   * 试点。
   */
  pilot: 'j.pilot',

  /**
   * LMIA 记录。
   */
  lmia: 'c.lmia_positions',

  /**
   * 红旗岗聚一起看(GAP1③)。
   */
  eligibility: `COALESCE(j.eligibility_flag,'')`,

  /**
   * 状态。
   */
  status: 'j.status',

  /**
   * 下架时刻。
   */
  closedAt: 'j.closed_at',

  /**
   * 全职/兼职(J1;#73 教训同款)。
   */
  empHours: `COALESCE(j.employment_hours,'')`,

  /**
   * 雇佣形态。
   */
  empTerm: `COALESCE(j.employment_term,'')`,

  /**
   * 中位时薪。
   */
  wageMedHr: 'j.wage_med_hourly',

  /**
   * 中位年薪。
   */
  wageMedYr: 'j.wage_med_annual',

  /**
   * vs 中位。
   */
  vsMedian: '(j.salary_annual::float / NULLIF(j.wage_med_annual, 0))',
}

/**
 * Pro 数据列排序回退集(#73 防行序泄露)。2026-07-25「先都显示出来」后泄露前提不存在 →
 * 回退集清空;集合保留,收费面回收时把列名加回来即可。
 */
export const PRO_SORTS = new Set<string>([])

/**
 * 主线清单覆盖口径表(2026-08-03 逐省核过官方页,政策事实非数据推断;核对依据写在每行)。
 * 旧判据「有非 ineligible 行就算 listed」会撒谎:SK 91 行全是行业专项,判 listed 后报告对付费用户
 * 说「查过萨省公开清单你不在上面」,而我们从没查过萨省主线。
 */
export const MAIN_LIST_COVERAGE: Record<string, string> = {
  /**
   * 魁省自有体系。
   */
  QC: 'qc',

  /**
   * MPNP In-Demand Occupations List 是全省主清单(158 条)。
   */
  MB: 'listed',

  /**
   * 2026-06 改制后官方不公布职业清单(排除集为空)。
   */
  ON: 'exclusion',

  /**
   * SINP 主线 OID/EE 走排除清单(152 条)+ 要求 TEER 0-3;官方原话见 build_sk.py。
   */
  SK: 'exclusion',

  /**
   * AAIP Alberta Opportunity Stream 排除清单(34 条)。
   */
  AB: 'exclusion',

  /**
   * NB 技术工人 / AIP 两张不受理清单(43 条)。
   */
  NB: 'exclusion',

  /**
   * 主线 Skilled Worker 不列职业(按 offer+TEER);OID 通道官方明示当前为空。
   */
  NS: 'exclusion',

  /**
   * NLPNP Skilled Worker 不列职业(2026-08-03 核:整页 0 个 NOC 码)。
   */
  NL: 'exclusion',

  /**
   * 主线 Skills Immigration 全通道排除清单(指南 §3.11,12 条,2026-06-13 起)+ 5 条 targeted ITA 专项。
   */
  BC: 'exclusion',

  /**
   * Occupations in Demand 具名 8 个,但 PEI 另有不列职业的通道。
   */
  PE: 'partial',
}

/**
 * 政策上不公布职业清单的省(人工核对 2026-07-30,非数据缺失;政策变更时更新此表)。
 */
export const NO_LIST_PROVINCES = new Set(['ON'])

/**
 * 用户分型全集(E11-04 §2.5;稳定 slug,枚举单一来源)。
 */
export const CURRENT_STATUSES = ['overseas', 'studying', 'working', 'jobhunting', 'pr'] as const

/**
 * 匹配档的序值(matchRank;null 档给 -1 在函数里)。
 */
export const LEVEL_RANK: Record<string, number> = {
  /**
   * 高匹配。
   */
  high: 3,

  /**
   * 中匹配。
   */
  mid: 2,

  /**
   * 低匹配。
   */
  low: 1,

  /**
   * 不适用。
   */
  na: 0,
}

/**
 * 匹配分档线:达线 high。
 */
export const SCORE_HIGH = 60

/**
 * 匹配分档线:达线 mid。
 */
export const SCORE_MID = 30

/**
 * 匹配视图候选封顶:按新鲜度取最近 N 个候选,防全表 TS 计算失控(足够覆盖真实匹配)。
 */
export const CAND_CAP = 12000

/**
 * count/updatedAt 微缓存时长(2026-07-19「排序 3-4 秒」第二刀:WHERE 不变时总数不必每次全表扫;
 * 数据小时级更新,30s 陈旧无感,Render 单实例)。
 */
export const COUNT_TTL_MS = 30_000

/**
 * count 缓存粗暴防涨上限(300 组筛选签名足够日常)。
 */
export const COUNT_CACHE_MAX = 300

/**
 * 站级证言三连数的缓存时长(2026-08-03 生产僵死事故:三连 count 全表扫打满连接池;分钟级新鲜度绰绰有余)。
 */
export const PROOF_TTL_MS = 60_000

/**
 * 匹配维度包缓存时长(1h;advisor 档案注入与 alerts run 共用)。
 */
export const DIMS_TTL_MS = 3600_000

/**
 * 5 位职业码。
 */
export const NOC_RE = /^\d{5}$/

/**
 * difficulty json 里名额竞争因子的 key(fetchOccCompetition 借省级比值用)。
 */
export const COMP_KEY = 'comp'

/**
 * 热门职业榜缓存时长(10 分钟)。聚合表日更,TTL 只是挡「Google 落地页每请求一查」
 * (prod-pool-wedge 口径;2026-08-22 自 lib/score 的表包缓存拆来)。
 */
export const TOP_NOCS_TTL_MS = 600_000

/**
 * 单个数字(fTeer 里挑数字)。
 */
export const DIGIT_PICK_RE = /(\d)/

/**
 * 分类未匹配时的占位(fTeer 筛选的「未分类」值也是它)。
 */
export const UNCAT = '未分类'

/**
 * 连续空白(搜索词切分)。
 */
export const SPACES_RE = /\s+/

/**
 * fetchTopNocs 的 limit 夹紧上限。
 */
export const TOP_NOCS_MAX = 200

/**
 * 大清单要不要算中位薪资的界(percentile_cont 是查询大头,控件用不到)。
 */
export const TOP_NOCS_WITH_MED = 24

/**
 * fetchBroadNocs 的 limit 夹紧上限。
 */
export const BROAD_NOCS_MAX = 80

/**
 * 职业名搜索的最短词长。
 */
export const NOC_SEARCH_MIN = 2

/**
 * 中位薪资附加 SELECT 片段(fetchTopNocs 回退现算路用)。
 */
export const MED_SELECT = ', percentile_cont(0.5) WITHIN GROUP (ORDER BY j.salary_annual) med'

/**
 * 在招条件(与列表默认 WHERE 同口径:#125 去重 + #136 排除下架)。
 */
export const OPEN_COND = `COALESCE(j.status,'open') <> 'closed'`

/**
 * pg 「列不存在」错误码(is_dup / 探测列未落地的部署时序降级判据)。
 */
export const PG_UNDEFINED_COLUMN = '42703'

/**
 * pg 「表不存在」错误码(etl_heartbeat 未落地的降级判据)。
 */
export const PG_UNDEFINED_TABLE = '42P01'

/**
 * 实测确认拦截本站抓取的原站(#136/#137:整站 403 = 有意拦截,不绕过 —— 那是规避访问控制;
 * 文案只陈述实测事实,不替对方做版权断言)。
 */
export const BLOCKED_SRC: Record<string, string> = {
  /**
   * Indeed(实测连首页都 403)。
   */
  'indeed.com': 'Indeed',

  /**
   * 86network。
   */
  '86network': '86network',
}

/**
 * Job Bank 域名判定(来源与懒抓分流都用)。
 */
export const JB_URL_RE = /jobbank\.gc\.ca/i

/**
 * Job Bank 雇主直发的 source 值(isDirect 判据)。
 */
export const SRC_JOB_BANK = 'Job Bank'

/**
 * 来源标签兜底(空值显示)。
 */
export const SRC_DASH = '—'

// =========================================================================
// JD 懒抓(#123;lazy-first 铁律)
// =========================================================================

/**
 * 抓取 UA(装常规浏览器 —— 不带它不少站给空壳)。
 */
export const JD_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/**
 * 正文最短长度:短于此=没抓到(导航残渣不入库,宁缺勿滥)。
 */
export const JD_MIN_LEN = 300

/**
 * 正文封顶(前端 JdTextView max=4000,富余给顾问上下文)。
 */
export const JD_MAX_LEN = 15000

/**
 * 失败负缓存时长(防连点重抓)。
 */
export const JD_NEG_TTL_MS = 600_000

/**
 * 失败表粗暴防涨上限。
 */
export const JD_FAILED_MAX = 500

/**
 * 单页抓取超时(毫秒)。
 */
export const JD_FETCH_TIMEOUT_MS = 8000

/**
 * 响应体读取封顶(字符)。
 */
export const JD_HTML_CAP = 800_000

/**
 * 内网/环回地址(SSRF 挡板:applyUrl 来自库,但外链是原站页里抽的)。
 */
export const JD_BAD_HOST_RE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/

/**
 * 172.16-31 私网段。
 */
export const JD_BAD_HOST_172_RE = /^172\.(1[6-9]|2\d|3[01])\./

/**
 * 合法协议。
 */
export const JD_PROTO_RE = /^https?:$/

/**
 * 头部残渣行黑名单(#126 央行帖实证:导航菜单/语言切换/订阅控件渲在 div 里,<nav> 剥不掉)。
 */
export const JD_HEAD_JUNK_RE = /^(skip to|careers?$|language$|english$|fran[çc]ais$|my profile$|sign in|log ?in|register$|menu$|search$|home$|apply now|create alert|select how often|cookie|accept|privacy (policy|notice)$|back to)/i

/**
 * 头部区探测:首个「像正文」的段落行长度界。
 */
export const JD_PARA_LEN = 100

/**
 * 头部区封顶行数。
 */
export const JD_HEAD_MAX_LINES = 40

/**
 * 孤行(菜单链接文本)长度界:短于此且无数字的丢。
 */
export const JD_ORPHAN_LEN = 30

/**
 * 非内容块(整块剥掉)。
 */
export const JD_STRIP_BLOCK_RE = /(?:<(script|style|noscript|nav|header|footer|svg|form)[^>]*>[\s\S]*?<\/\1>)/gi

/**
 * 块级闭合转行。
 */
export const JD_BLOCK_BREAK_RE = /<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h[1-6]>|<\/tr>/gi

/**
 * 剥所有标签。
 */
export const JD_TAG_RE = /<[^>]+>/g

/**
 * JB 自有正文结构区的锚(direct 帖,版式最好)。
 */
export const JB_REQ_ANCHOR = 'job-posting-detail-requirements'

/**
 * JB 结构区的截止锚。
 */
export const JB_APPLY_ANCHOR = 'id="applynow"'

/**
 * JB 结构区兜底截取长度。
 */
export const JB_SECTION_CAP = 60_000

/**
 * JB 微数据字段(聚合帖大头;#141 实证 property="description" 里有雇主原文)。
 */
export const JB_DESC_RE = /property="description"[^>]*>([\s\S]{0,80000}?)<\/(?:div|section|span|p)>/i

/**
 * JB 外链锚(#140:href 是 HTML 实体编码,不解码带 query 的外链一律抓错页)。
 */
export const JB_EXT_LINK_RE = /id="externalJobLink"[^>]*href="([^"]+)"/

/**
 * 原站 <title>(岗名标注行;JB 会把聚合帖标题标准化成职业名,差异自解释不掩盖)。
 */
export const TITLE_RE = /<title>([^<]{3,200})<\/title>/i

/**
 * <title> 分段符(各站顺序不一:竖线分段/连字符分段)。
 */
export const TITLE_SPLIT_RE = /\s*\|\s*|\s+[-–]\s+/

/**
 * <title> 通用段黑名单(不是岗名的段)。
 */
export const TITLE_JUNK_RE = /^(job postings?|jobs?|careers?|job details?|job opportunities|home)$/i

/**
 * <title> 域名段。
 */
export const TITLE_DOMAIN_RE = /\.(com|ca|net|org)$/i

/**
 * <title> 通用尾词(剥掉)。
 */
export const TITLE_TAIL_RE = /\s*(job details?|job postings?)\s*$/i

/**
 * 原帖岗名标注行前缀(标题≠正文的差异显性化)。
 */
export const ORIGIN_TITLE_HEAD = 'Original posting title: '

/**
 * 原站 <title> 段的最短长度(短段是站名/栏目)。
 */
export const TITLE_SEG_MIN = 4

// =========================================================================
// PII 脱敏(E4-03 D6:雇主联系方式不出前台,投递统一走官方原帖按钮)
// =========================================================================

/**
 * 邮箱。
 */
export const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

/**
 * 北美电话(含分机)。
 */
export const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(\s*(ext|x|poste)\.?\s*\d+)?/gi

/**
 * 脱敏占位(#155:占位符跟原文语言走 —— 这段文字属于原帖不是我们的界面文案,统一中性英文标记)。
 */
export const PII_MASK = '[see original posting]'


// =========================================================================
// WHERE 片段表(SQL 表达式当死值装 —— 与 SORT_COLUMNS 同一先例;组装在 functions.ts)
// =========================================================================

/**
 * 省全名 → 省码的镜像:省码 → 全名(#168:喂给模型/地图/搜索引擎的一律给全名 ——
 * 两字母省码对模型有歧义,NS 被说成新不伦瑞克、NL 被当荷兰国家码)。
 * ⚠️ 与 PROV_CODE 互为镜像,改一处必改另一处。
 */
export const PROV_NAME: Record<string, string> = {
  /**
   * 安大略。
   */
  ON: 'Ontario',

  /**
   * 不列颠哥伦比亚。
   */
  BC: 'British Columbia',

  /**
   * 阿尔伯塔。
   */
  AB: 'Alberta',

  /**
   * 魁北克。
   */
  QC: 'Quebec',

  /**
   * 马尼托巴。
   */
  MB: 'Manitoba',

  /**
   * 萨斯喀彻温。
   */
  SK: 'Saskatchewan',

  /**
   * 新斯科舍。
   */
  NS: 'Nova Scotia',

  /**
   * 新不伦瑞克。
   */
  NB: 'New Brunswick',

  /**
   * 纽芬兰与拉布拉多。
   */
  NL: 'Newfoundland and Labrador',

  /**
   * 爱德华王子岛。
   */
  PE: 'Prince Edward Island',
}

/**
 * 省名最长几个词(Newfoundland and Labrador / Prince Edward Island = 3;splitQ 粘省名用)。
 */
export const PROV_MAX_WORDS = 3

/**
 * WHERE 片段(前缀式的在 functions 里接占位符;整句式的原样进 conds)。
 */
export const W = {
  /**
   * ILIKE 连接词。
   */
  ilike: ' ILIKE ',

  /**
   * 省码等值前缀(搜索词翻省名用)。
   */
  provEq: 'j.province = ',

  /**
   * 公司 id 命中(= ANY 才能与 trgm 分支一起进位图 OR;IN(子查询)会退化全表扫)。
   */
  companyIdAnyOpen: 'j.company_id = ANY(',

  /**
   * 括号闭合。
   */
  close: ')',

  /**
   * 精确公司名前缀(advisor「同公司在榜岗」用)。
   */
  companyEq: 'c.name = ',

  /**
   * 国家等值前缀。
   */
  countryEq: 'j.country = ',

  /**
   * 城市等值前缀。
   */
  cityEq: 'j.city = ',

  /**
   * 区等值前缀。
   */
  districtEq: 'j.district = ',

  /**
   * 职业多值前缀(2026-08-16 逗号分隔,与初评表「在招」同一把尺)。
   */
  nocAnyOpen: 'j.noc = ANY(',

  /**
   * 大类等值前缀。
   */
  broadEq: 'j.broad = ',

  /**
   * 中类等值前缀。
   */
  midEq: 'j.mid = ',

  /**
   * 小类等值前缀。
   */
  fineEq: 'j.fine = ',

  /**
   * TEER 未分类。
   */
  teerNull: 'j.teer IS NULL',

  /**
   * TEER 等值前缀。
   */
  teerEq: 'j.teer = ',

  /**
   * 来源标签等值前缀。
   */
  sourceEq: 'j.source_label = ',

  /**
   * 无障碍等值前缀。
   */
  accEq: 'j.accessibility = ',

  /**
   * 可提名(粗筛)。
   */
  pnpYes: 'COALESCE(j.pnp_eligible,false) = true',

  /**
   * 不可提名(QC 不算「否」—— 它走自己的体系)。
   */
  pnpNo: "COALESCE(j.pnp_eligible,false) = false AND COALESCE(j.province,'') <> 'QC'",

  /**
   * AIP 是。
   */
  aipYes: 'COALESCE(j.aip,false) = true',

  /**
   * AIP 否。
   */
  aipNo: 'COALESCE(j.aip,false) = false',

  /**
   * 任一试点命中(E6-11)。
   */
  pilotAny: "COALESCE(j.pilot,'') <> ''",

  /**
   * 无试点。
   */
  pilotNone: "COALESCE(j.pilot,'') = ''",

  /**
   * 指定试点类型前缀(LIKE,含同城双试点 RCIP+FCIP)。
   */
  pilotLike: "COALESCE(j.pilot,'') LIKE ",

  /**
   * 状态等值前缀(#136 显式选「已下架」仍可看)。
   */
  statusEq: "COALESCE(j.status,'open') = ",

  /**
   * 发布渠道等值前缀。
   */
  originEq: 'j.origin = ',

  /**
   * 通道档高(E12-08 尾巴:fScore 谓词随评分制切档)。
   */
  scoreHigh: 'j.grade_channel >= 4',

  /**
   * 通道档中。
   */
  scoreMid: 'j.grade_channel = 3',

  /**
   * 通道档低。
   */
  scoreLow: 'j.grade_channel <= 2',

  /**
   * 年薪 ≥10 万。
   */
  salGe100: 'j.salary_annual >= 100000',

  /**
   * 年薪 8-10 万。
   */
  sal80: 'j.salary_annual >= 80000 AND j.salary_annual < 100000',

  /**
   * 年薪 6-8 万。
   */
  sal60: 'j.salary_annual >= 60000 AND j.salary_annual < 80000',

  /**
   * 年薪 <6 万。
   */
  salU60: 'j.salary_annual < 60000',

  /**
   * vs 中位的护栏(两值都得有且中位非零)。
   */
  vsGuard: 'j.salary_annual IS NOT NULL AND j.wage_med_annual IS NOT NULL AND j.wage_med_annual <> 0',

  /**
   * 高于中位。
   */
  vsAbove: 'j.salary_annual >= j.wage_med_annual',

  /**
   * 高于中位 20%。
   */
  vsAbove20: 'j.salary_annual >= 1.2 * j.wage_med_annual',

  /**
   * 低于中位。
   */
  vsBelow: 'j.salary_annual < j.wage_med_annual',

  /**
   * 全职/兼职等值前缀。
   */
  empEq: 'j.employment_hours = ',

  /**
   * 零工口径(兼职 或 casual/seasonal)。
   */
  empGig: "(j.employment_hours = 'part' OR j.employment_term IN ('casual','seasonal'))",

  /**
   * 直接雇主(与 direct 排序列同一谓词)。
   */
  direct: "(COALESCE(j.apply_url,'') NOT ILIKE '%jobbank.gc.ca%' OR COALESCE(j.source,'') = 'Job Bank')",

  /**
   * GAP1③ 无红旗(未检出=通过,宁可漏不误伤)。
   */
  eligOk: "COALESCE(j.eligibility_flag,'') = ''",

  /**
   * 条件连接。
   */
  and: ' AND ',

  /**
   * 分支连接。
   */
  or: ' OR ',

  /**
   * 组括号开。
   */
  open: '(',

  /**
   * 恒真(零条件)。
   */
  alwaysTrue: 'TRUE',
} as const

/**
 * 筛选参数的取值字面量(URL/保存筛选里出现的值)。
 */
export const FV = {
  /**
   * 是。
   */
  yes: 'yes',

  /**
   * 否。
   */
  no: 'no',

  /**
   * 开关真(字符串形态)。
   */
  trueStr: 'true',

  /**
   * 开关真(数字形态)。
   */
  oneStr: '1',

  /**
   * RCIP。
   */
  rcip: 'RCIP',

  /**
   * FCIP。
   */
  fcip: 'FCIP',

  /**
   * 年薪档:≥10 万。
   */
  ge100: 'ge100',

  /**
   * 年薪档:8-10 万。
   */
  s80: '80',

  /**
   * 年薪档:6-8 万。
   */
  s60: '60',

  /**
   * 年薪档:<6 万。
   */
  u60: 'u60',

  /**
   * vs 中位:高于。
   */
  above: 'above',

  /**
   * vs 中位:高于 20%。
   */
  above20: 'above20',

  /**
   * vs 中位:低于。
   */
  below: 'below',

  /**
   * 全职。
   */
  full: 'full',

  /**
   * 兼职。
   */
  part: 'part',

  /**
   * 零工。
   */
  gig: 'gig',

  /**
   * 通道档高。
   */
  high: 'high',

  /**
   * 通道档中。
   */
  mid: 'mid',

  /**
   * 通道档低。
   */
  low: 'low',

  /**
   * 无红旗。
   */
  ok: 'ok',

  /**
   * 升序。
   */
  asc: 'asc',

  /**
   * QC(匹配规则与 pnpNo 口径比对用)。
   */
  qc: 'QC',
} as const

/**
 * 筛选键名(buildJobsWhere 读的键;键名 = /jobs 前端筛选 state 原样)。
 */
export const FK = {
  /**
   * 搜索词。
   */
  q: 'q',

  /**
   * 精确公司名。
   */
  company: 'company',

  /**
   * 国家。
   */
  country: 'fCountry',

  /**
   * 省。
   */
  prov: 'fProv',

  /**
   * 城市。
   */
  city: 'fCity',

  /**
   * 区。
   */
  district: 'fDistrict',

  /**
   * 职业码(逗号分隔多值)。
   */
  noc: 'fNoc',

  /**
   * 大类。
   */
  broad: 'fBroad',

  /**
   * 中类。
   */
  mid: 'fMid',

  /**
   * 小类。
   */
  fine: 'fFine',

  /**
   * TEER。
   */
  teer: 'fTeer',

  /**
   * 来源。
   */
  source: 'fSource',

  /**
   * 无障碍。
   */
  acc: 'fAcc',

  /**
   * 可提名。
   */
  pnp: 'fPnp',

  /**
   * AIP。
   */
  aip: 'fAip',

  /**
   * 试点。
   */
  pilot: 'fPilot',

  /**
   * 状态。
   */
  status: 'fStatus',

  /**
   * 发布渠道。
   */
  origin: 'fOrigin',

  /**
   * 通道档。
   */
  score: 'fScore',

  /**
   * 年薪档。
   */
  sal: 'fSal',

  /**
   * vs 中位。
   */
  vs: 'fVs',

  /**
   * 雇佣形态。
   */
  emp: 'fEmp',

  /**
   * 只看直接雇主。
   */
  directOnly: 'directOnly',

  /**
   * 红旗。
   */
  elig: 'fElig',

  /**
   * 预查出的公司 id 组(resolveQCompanyIds 写入)。
   */
  qCompanyIds: 'qCompanyIds',
} as const

/**
 * 百分号(ILIKE 通配)。
 */
export const PCT = '%'

/**
 * 逗号(fNoc 多值切分)。
 */
export const COMMA = ','

/**
 * 占位符前缀($N)。
 */
export const DOLLAR = '$'

/**
 * 排序兜底:最新发现在前(#159:date_posted 只有日期没时间,当天最早抓的那批会钉在榜首一整天;
 * first_seen DESC 让榜单随每小时抓取真正滚动;仍是纯时间序不掺分数,#127 意图不变)。
 */
export const ORDER_FRESH = 'j.first_seen DESC NULLS LAST, j.id DESC'

/**
 * 默认排序列。
 */
export const ORDER_DEFAULT_COL = 'j.date_posted'

/**
 * 非默认列的次级兜底前缀。
 */
export const ORDER_DATE_TAIL = 'j.date_posted DESC NULLS LAST, '

/**
 * 降序。
 */
export const DIR_DESC = 'DESC'

/**
 * 升序。
 */
export const DIR_ASC = 'ASC'

// =========================================================================
// JD 抽取的实体与拼装字面量
// =========================================================================

/**
 * HTML 实体 → 字符的替换对(顺序执行,**逐字保持旧实现的次序** —— &amp; 第二个换,
 * 于是「&amp;lt;」会被二次解转义成 <,旧行为如此,别顺手改)。
 */
export const ENT_PAIRS: [RegExp, string][] = [
  [/&nbsp;/g, ' '],
  [/&amp;/g, '&'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&#39;|&apos;/g, "'"],
  [/&quot;/g, '"'],
]

/**
 * JB 微数据字段内层的解转义对(恢复分段前先反转义,次序照旧实现)。
 */
export const JB_INNER_ENT_PAIRS: [RegExp, string][] = [
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&amp;/g, '&'],
]

/**
 * 外链 href 的实体解码对(#140:不解码带 query 的外链一律抓错页)。
 */
export const HREF_ENT_PAIRS: [RegExp, string][] = [
  [/&amp;/g, '&'],
  [/&#38;/g, '&'],
  [/&quot;/g, '"'],
]

/**
 * title 抽取的实体解码对。
 */
export const TITLE_ENT_PAIRS: [RegExp, string][] = [
  [/&amp;/g, '&'],
  [/&#39;/g, "'"],
]

/**
 * 一个空格(标签剥掉后的占位)。
 */
export const SPACE = ' '

/**
 * 换行。
 */
export const NL = '\n'

/**
 * 行内连续空白(压行用,全局;与搜索切词的 SPACES_RE 同形不同责)。
 */
export const LINE_SPACES_RE = /\s+/g

/**
 * 正文行的最短长度(短于此的碎行丢)。
 */
export const JD_LINE_MIN = 2

/**
 * 冒号结尾(字段标签行,孤行保留判据)。
 */
export const COLON_END_RE = /:$/

/**
 * 含数字(孤行保留判据)。
 */
export const HAS_DIGIT_RE = /\d/

/**
 * fetch 的 Accept 值。
 */
export const ACCEPT_HTML = 'text/html'

/**
 * fetch 的跳转策略。
 */
export const REDIRECT_FOLLOW = 'follow'


/**
 * 省清单覆盖档的字面量(值域与 types 的 ProvListCoverage 联合逐字对齐)。
 */
export const COV = {
  /**
   * 全省主清单,查过没有可下结论。
   */
  listed: 'listed',

  /**
   * 只有专项通道清单,主线未核实。
   */
  partial: 'partial',

  /**
   * 排除式(不在排除清单即按 TEER 粗筛)。
   */
  exclusion: 'exclusion',

  /**
   * 本站清单数据未覆盖。
   */
  uncovered: 'uncovered',

  /**
   * 魁省自有体系。
   */
  qc: 'qc',
} as const

/**
 * 匹配档的字面量(值域与 MatchLevel 联合逐字对齐)。
 */
export const LV = {
  /**
   * 高。
   */
  high: 'high',

  /**
   * 中。
   */
  mid: 'mid',

  /**
   * 低。
   */
  low: 'low',

  /**
   * 不适用。
   */
  na: 'na',
} as const

/**
 * 匹配理由的 i18n 键(match.r.*;三语文案在 lib/i18n,英文事实行在 prompts.REASON_EN)。
 */
export const RK = {
  /**
   * 岗位未分类。
   */
  nocJobUncat: 'match.r.noc.jobUncat',

  /**
   * 档案没填职业码。
   */
  nocNoProfile: 'match.r.noc.noProfile',

  /**
   * 精确命中。
   */
  nocExact: 'match.r.noc.exact',

  /**
   * 同小类。
   */
  nocMinor: 'match.r.noc.minor',

  /**
   * 同族。
   */
  nocSubmajor: 'match.r.noc.submajor',

  /**
   * 全不沾边。
   */
  nocNone: 'match.r.noc.none',

  /**
   * 魁省。
   */
  provQc: 'match.r.prov.qc',

  /**
   * 不在目标省。
   */
  provNotTarget: 'match.r.prov.notTarget',

  /**
   * 具名清单命中。
   */
  provNamed: 'match.r.prov.named',

  /**
   * 排除清单命中。
   */
  provExcluded: 'match.r.prov.excluded',

  /**
   * 本站清单未覆盖。
   */
  provUncovered: 'match.r.prov.uncovered',

  /**
   * TEER 0-3 通用粗筛。
   */
  provGeneric: 'match.r.prov.generic',

  /**
   * NL:offer 即可(E13-09)。
   */
  provNl: 'match.r.prov.nl',

  /**
   * MB/NS/NB/PE:先同雇主 6 个月。
   */
  provCond: 'match.r.prov.cond',

  /**
   * 其余省 TEER 4-5 开放。
   */
  provOpen: 'match.r.prov.open',

  /**
   * 不满足省粗筛。
   */
  provNone: 'match.r.prov.none',

  /**
   * 不在任何 EE 清单。
   */
  eeNone: 'match.r.ee.none',

  /**
   * 类别无抽选记录。
   */
  eeNoDraw: 'match.r.ee.noDraw',

  /**
   * 没报 CRS。
   */
  eeNoCrs: 'match.r.ee.noCrs',

  /**
   * 高于分数线。
   */
  eeAbove: 'match.r.ee.above',

  /**
   * 低于分数线。
   */
  eeBelow: 'match.r.ee.below',

  /**
   * TEER 达标。
   */
  teerOk: 'match.r.teer.ok',

  /**
   * 低 TEER 命中通道。
   */
  teerChannel: 'match.r.teer.channel',

  /**
   * 低 TEER 无通道。
   */
  teerLow: 'match.r.teer.low',

  /**
   * 高于中位。
   */
  wageAbove: 'match.r.wage.above',

  /**
   * 略低于中位。
   */
  wageNear: 'match.r.wage.near',

  /**
   * 明显低于中位。
   */
  wageBelow: 'match.r.wage.below',

  /**
   * 无可比数据。
   */
  wageNa: 'match.r.wage.na',

  /**
   * 有获批记录。
   */
  lmiaHas: 'match.r.lmia.has',

  /**
   * 技能股获批。
   */
  lmiaSkilled: 'match.r.lmia.skilled',

  /**
   * 纯农业/低薪股。
   */
  lmiaLowOnly: 'match.r.lmia.lowOnly',

  /**
   * 无记录。
   */
  lmiaNa: 'match.r.lmia.na',
} as const

/**
 * E13-09:NL 的 TEER4-5 通过口径(offer 即可)。
 */
export const T45_NL = 'NL'

/**
 * E13-09:先同雇主 6 个月的省集合(镜像 etl/08_score.UNIVERSAL_*_PROVS)。
 */
export const T45_COND_PROVS = ['MB', 'NS', 'NB', 'PE'] as const

/**
 * 匹配视图里 match 列自身(不进取值器,按档位序)。
 */
export const SORT_MATCH_KEY = 'match'

/**
 * NOC 同小类的前缀长(前 4 位)。
 */
export const NOC_MINOR_LEN = 4

/**
 * NOC 同族的前缀长(前 3 位,如 212x=计算机专业类)。
 */
export const NOC_SUBMAJOR_LEN = 3

/**
 * NOC 码全长。
 */
export const NOC_LEN = 5


/**
 * 匹配规则名(值域与 MatchReason.rule 联合逐字对齐)。
 */
export const RULE = {
  /**
   * NOC 对口。
   */
  noc: 'noc',

  /**
   * 省通道。
   */
  prov: 'prov',

  /**
   * EE 类别距离。
   */
  ee: 'ee',

  /**
   * TEER 可达。
   */
  teer: 'teer',

  /**
   * 工资信用。
   */
  wage: 'wage',

  /**
   * 雇主外劳记录。
   */
  lmia: 'lmia',
} as const

/**
 * 单条理由的判定字面量(值域与 MatchVerdict 联合逐字对齐)。
 */
export const VD = {
  /**
   * 通过。
   */
  pass: 'pass',

  /**
   * 提示。
   */
  warn: 'warn',

  /**
   * 不符。
   */
  fail: 'fail',

  /**
   * 不适用。
   */
  na: 'na',
} as const

/**
 * 清单行的排除类型值。
 */
export const TYPE_INELIGIBLE = 'ineligible'

/**
 * 省码列(短词搜索附加分支用)。
 */
export const COL_PROVINCE = 'j.province'

/**
 * count 缓存键的分隔符。
 */
export const CNT_SEP = '|'

/**
 * 省提名项目值(pnpOnly 的筛选口径)。
 */
export const PROGRAM_PNP = 'PNP'

/**
 * 公司详情按 slug 的 WHERE(与 companyDetail SQL 的表别名对齐)。
 */
export const COMPANY_SLUG_COND = 'c.slug = $1'

/**
 * 分类三级的字面量(相关职位兜底探测用;值域与 fallbackLevel 联合逐字对齐)。
 */
export const CAT_LEVEL = {
  /**
   * 小类。
   */
  fine: 'fine',

  /**
   * 中类。
   */
  mid: 'mid',

  /**
   * 大类。
   */
  broad: 'broad',
} as const

/**
 * 匹配视图排序取值器认的列 key(与 SORT_COLUMNS 同集;switch 的 case 用它,不写裸串)。
 */
export const CK = {
  /**
   * 发布时间。
   */
  datePosted: 'datePosted',

  /**
   * 通道档。
   */
  score: 'score',

  /**
   * 年薪。
   */
  salary: 'salary',

  /**
   * 年薪(年列)。
   */
  salaryYr: 'salaryYr',

  /**
   * 最后确认。
   */
  lastSeen: 'lastSeen',

  /**
   * 岗名。
   */
  title: 'title',

  /**
   * 公司名。
   */
  company: 'company',

  /**
   * 省。
   */
  province: 'province',

  /**
   * 城市。
   */
  city: 'city',

  /**
   * 大类。
   */
  broad: 'broad',

  /**
   * 中类。
   */
  mid: 'mid',

  /**
   * 小类。
   */
  fine: 'fine',

  /**
   * TEER。
   */
  teer: 'teer',

  /**
   * NOC 码。
   */
  noc: 'noc',

  /**
   * 无障碍。
   */
  accessibility: 'accessibility',

  /**
   * 国家。
   */
  country: 'country',

  /**
   * 区。
   */
  district: 'district',

  /**
   * 地址。
   */
  address: 'address',

  /**
   * 来源标签。
   */
  source: 'source',

  /**
   * 发布渠道。
   */
  origin: 'origin',

  /**
   * 粗筛信号。
   */
  pnp: 'pnp',

  /**
   * EE 类别。
   */
  ee: 'ee',

  /**
   * AIP。
   */
  aip: 'aip',

  /**
   * 试点。
   */
  pilot: 'pilot',

  /**
   * LMIA 记录。
   */
  lmia: 'lmia',

  /**
   * 状态。
   */
  status: 'status',

  /**
   * 下架时刻。
   */
  closedAt: 'closedAt',

  /**
   * 中位时薪。
   */
  wageMedHr: 'wageMedHr',

  /**
   * 中位年薪。
   */
  wageMedYr: 'wageMedYr',

  /**
   * vs 中位。
   */
  vsMedian: 'vsMedian',
} as const


/**
 * 档案多职业码的展示连接词(reason params 里 yours 的分隔)。
 */
export const NOC_JOIN_SLASH = '/'


/**
 * 相关职位兜底探测列的后缀(levelHasJobs 的输出列名 = 级名 + 它)。
 */
export const HAS_SUFFIX = '_has'

/**
 * 规则 6 的依据链(ESDC 公开数据集;fetched 空 —— 这是数据集页不是快照)。
 * 它随 `MatchReason.source` 出现在 UI 的来源引用里,是数据不是提示词,所以住这儿不住 prompts。
 */
export const LMIA_SOURCE = {
  /**
   * 依据名。
   */
  label: 'ESDC TFWP positive LMIA employers',

  /**
   * 数据集页。
   */
  url: 'https://open.canada.ca/data/en/dataset/90fed587-1364-4f33-a9ee-208181dc0b97',

  /**
   * 无快照时刻。
   */
  fetched: '',
} as const

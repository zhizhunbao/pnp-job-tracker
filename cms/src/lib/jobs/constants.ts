/**
 * 职位域的死值:省名对照、搜索列集、排序白名单、清单覆盖口径、缓存时长、JD 抓取参数与正则。
 *
 * @author Frank
 * @time 2026-08-22 00:05:00
 */

// eslint-disable-next-line local/no-import-in-leaf -- 语言轴由 i18n 基建持有,三语表的形状检查靠它
import type { Dict, Lang } from '../i18n'

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

/**
 * eeDisplay 的多段分隔(数据层用「/」拼接)。
 */
export const EE_SPLIT = '/'

/**
 * 顿号枚举的 i18n 键(eeDisplay 拼回用;no-dot-separator 硬规矩)。
 */
export const SEP_KEY = 'sep'

/**
 * 界面语言码·英文(显示函数分岔用)。
 */
export const LANG_EN = 'en'

/**
 * 界面语言码·韩文。
 */
export const LANG_KO = 'ko'

/**
 * 通道名归一时破折号统到的字符(mart 里是 em dash)。
 */
export const NORM_DASH = '-'

/**
 * 通道名归一:要统掉的两种破折号。
 */
export const NORM_DASH_RE = /[—–]/g

/**
 * 通道名归一:连空白折一(带 g,逐处替换)。
 */
export const NORM_WS_RE = /\s+/g

/**
 * 摘省名前缀后要吃掉的连接符与空白。
 */
export const PROV_PREFIX_TRIM_RE = /^[\s:：—–-]+/

/**
 * 省抽选的**官方通道名**译名(2026-08-01 Frank 队列⑤:「中文界面官方英文名 + 中文译名,
 * 英文界面只显英文」)。有限集人工定表(现 17 条,取自 pnp_draws 实际出现过的通道名),
 * 照「宁可留空也不瞎猜」—— 表里没有的原样只显英文,不让模型现编译名。
 * 官方英文名永远是主文案,译名只是灰字小注。
 */
export const DRAW_STREAM_L10N: Record<string, { zh: string; ko: string }> = {
  // AB(AAIP)
  'Rural Renewal Stream': { zh: '乡镇振兴通道', ko: '농촌 재생 스트림' },
  'Alberta Opportunity Stream': { zh: '阿尔伯塔机会通道', ko: '앨버타 기회 스트림' },
  'Dedicated Health Care Pathway – Express Entry': { zh: '医护专项(EE 通道)', ko: '의료 전용 경로(EE)' },
  'Dedicated Health Care Pathway – non-Express Entry': { zh: '医护专项(非 EE)', ko: '의료 전용 경로(비 EE)' },
  'Alberta Express Entry Stream – Law Enforcement Pathway': { zh: 'EE 定向:执法', ko: 'EE 지정: 법 집행' },
  'Alberta Express Entry Stream – Accelerated Tech Pathway': { zh: 'EE 定向:科技加速', ko: 'EE 지정: 기술 가속' },
  'Alberta Express Entry Stream – Priority Sectors (Agriculture)': { zh: 'EE 定向:农业', ko: 'EE 지정: 농업' },
  'Alberta Express Entry Stream – Priority Sectors (Construction)': { zh: 'EE 定向:建筑', ko: 'EE 지정: 건설' },
  // BC(2026 新政三大类)
  'Innovate: High Economic Impact': { zh: 'Innovate:高经济贡献', ko: 'Innovate: 높은 경제 기여' },
  'Care: Health': { zh: 'Care:医疗', ko: 'Care: 의료' },
  'Care: Childcare': { zh: 'Care:幼教', ko: 'Care: 보육' },
  'Care: Veterinary Care': { zh: 'Care:兽医', ko: 'Care: 수의' },
  'Build: Construction Trades': { zh: 'Build:建筑技工', ko: 'Build: 건설 기능직' },
  'Temporary Rural/Remote Health Support Initiative': { zh: '乡镇偏远医疗支援(临时)', ko: '농촌·오지 의료 지원(임시)' },
  // MB / ON
  'Skilled Worker Stream': { zh: '技术工人通道', ko: '숙련 인력 스트림' },
  'Employer Job Offer: Foreign Worker stream': { zh: '雇主 offer:海外工人(已关停)', ko: '고용주 오퍼: 해외 근로자(폐지)' },
  'Employer Job Offer: International Student stream': { zh: '雇主 offer:国际学生(已关停)', ko: '고용주 오퍼: 유학생(폐지)' },
}
/**
 * 具名通道 chip 的 label(数据层的中文,有限小集合)→ 三语 key,未知值原样回退
 * (第 9 轮 #24,照大类 cat.* 先例;数据层不动,ETL 新增 label 时这里补一行即可)。
 */
export const STREAM_L10N: Record<string, string> = {
  'AB 科技': 'stream.abTech', 'SK 医疗': 'stream.skHealth', 'SK 科技': 'stream.skTech',
  'SK 农业': 'stream.skAgri', 'NS 紧缺空缺': 'stream.nsCritical', 'NS 毕业生': 'stream.nsGrad',
  'AAIP 不符合清单': 'stream.aaipExcl',
  'BC 医疗': 'stream.bcHealth', 'BC 幼教': 'stream.bcChildcare', 'BC 法语教师': 'stream.bcEdu',
  'BC 兽医': 'stream.bcVet', 'BC 建筑技工': 'stream.bcConstr',
  'MB 在需职业': 'stream.mbIndemand', 'MB 乡镇在需': 'stream.mbRural', 'PE 在需职业': 'stream.peIndemand',
  'NB 不符合清单': 'stream.nbExcl', 'NB 餐饮住宿不符合': 'stream.nbExclFood',
  'NB AIP 不受理': 'stream.nbAipExcl', 'NB AIP 餐饮住宿不受理': 'stream.nbAipExclFood',
}
/**
 * pnp_requirements.stream(官方通道名,键按 normReqStream 归一)→ 三语显示短名。
 * 表里没有的**原样返回官方英文名**(照 DRAW_STREAM_L10N 的老规矩:宁可显英文,不让模型现编译名);
 * 英文短名只做前缀缩写(NSNP / PEI …)—— 判定卡那行灰字要在 375 一行放得下。
 */
export const REQ_STREAM_L10N: Record<string, { zh: string; ko: string; en: string }> = {
  'bc pnp skills immigration (all streams)': { zh: 'BC 技术移民全通道', ko: 'BC 기술이민 전 통로', en: 'BC Skills Immigration' },
  'aaip alberta opportunity stream': { zh: '阿尔伯塔机会通道', ko: '앨버타 기회 스트림', en: 'Alberta Opportunity Stream' },
  'mpnp in-demand occupations list': { zh: 'MB 在需职业清单', ko: 'MB 수요 직업 목록', en: 'MPNP In-Demand list' },
  'mpnp skilled worker overseas': { zh: 'MB 海外技术工人通道', ko: 'MB 해외 기술인력 통로', en: 'MPNP Overseas' },
  'nlpnp skilled worker category': { zh: 'NL 技术工人类别', ko: 'NL 기술인력 부문', en: 'NLPNP Skilled Worker' },
  'nlpnp international graduate category': { zh: 'NL 国际毕业生类别', ko: 'NL 국제 졸업생 부문', en: 'NLPNP International Graduate' },
  'nova scotia nominee program - skilled worker stream': { zh: 'NS 技术工人通道', ko: 'NS 기술인력 통로', en: 'NSNP Skilled Worker' },
  'ontario workforce priority stream': { zh: 'ON 劳动力优先通道', ko: 'ON 우선 직군 통로', en: 'Ontario Workforce Priority' },
  'pei pnp workforce - skilled worker stream': { zh: 'PEI 技术工人通道', ko: 'PEI 기술인력 통로', en: 'PEI Skilled Worker' },
}
/**
 * EE 类别 label 三语映射(第 11 轮 #28,同 #24 性质;数据层 label 是有限集,
 * federal-categories.json 9 类)。职位可命中多类别,数据层用「/」拼接 —— 逐段映射再拼回。
 */
export const EE_L10N: Record<string, string> = {
  '医疗社服': 'ee.healthcare', 'STEM': 'ee.stem', '技工': 'ee.trade', '教育': 'ee.education',
  '运输': 'ee.transport', '医生': 'ee.physicians', '高管': 'ee.seniorMgr', '研究': 'ee.researchers', '军职': 'ee.military',
}
/**
 * E6-10:联邦轮次(pnp_draws 的 province=FED 行)的 label 是数据层 **英文 cat_key**
 * (build_ee_draws.CAT_MAP),与上面 ee_categories 的中文 label 不同源 —— 两张表各管一头,别合并。
 */
export const EE_KEY_L10N: Record<string, string> = {
  healthcare: 'ee.healthcare', stem: 'ee.stem', trade: 'ee.trade', education: 'ee.education', transport: 'ee.transport',
  physicians: 'ee.physicians', 'senior-managers': 'ee.seniorMgr', researchers: 'ee.researchers', military: 'ee.military',
  agriculture: 'ee.agriculture', cec: 'ee.cec', french: 'ee.french', pnp: 'ee.pnpLinked', general: 'ee.general',
  fsw: 'ee.fsw', fst: 'ee.fst',
}
/**
 * NOC 中/小分类名 —— **不是 UI 文案,是数据值的译名**:值本身是 etl/noc.py 产的中文,
 * 所以 zh 天然没有条目(catName 查不到就回退原值,见 lib/noc),三语键集本来就不该相同,
 * 塞进受键强制的语言文件只会逼出一堆假的 zh 条目。
 * 终局不在代码里:noc_categories 维度表已带 mid_en/mid_ko,registerCatLabels 登记后优先于这张表;
 * 这里是维度表查不到时的回退路径(CLAUDE.md:移民事实的去处是 data/ → mart → DB)。
 */
export const nocLabels: Record<Lang, Dict> = {
  zh: {},
  en: {
    'cat.IT': 'IT',
    'cat.科技管理': 'Science & tech management', 'cat.自然科学': 'Natural sciences', 'cat.建筑与规划': 'Architecture & planning',
    'cat.数据与统计': 'Data & statistics', 'cat.科学技术员': 'Science technologists', 'cat.设计与制图': 'Design & drafting',
    'cat.IT 支持': 'IT support', 'cat.检验与安全': 'Inspection & safety', 'cat.工程技术员': 'Engineering technologists',
    'cat.自然与应用科学': 'Natural and applied sciences', 'cat.工程管理': 'Engineering management', 'cat.建筑与科学管理': 'Architecture & science management',
    'cat.IT 管理': 'IT management', 'cat.物理与天文': 'Physics & astronomy', 'cat.化学': 'Chemistry',
    'cat.地球与海洋': 'Earth & ocean sciences', 'cat.生物': 'Biology', 'cat.林业': 'Forestry',
    'cat.景观设计': 'Landscape architecture', 'cat.城市规划': 'Urban planning', 'cat.测绘': 'Land surveying',
    'cat.统计与精算': 'Statistics & actuarial', 'cat.数据科学': 'Data science',
    'cat.电气与电子工程': 'Electrical & electronics engineering', 'cat.计算机与硬件工程': 'Computer & hardware engineering', 'cat.化学工程': 'Chemical engineering',
    'cat.工业与制造工程': 'Industrial & manufacturing engineering', 'cat.冶金与材料工程': 'Metallurgical & materials engineering', 'cat.采矿工程': 'Mining engineering',
    'cat.地质工程': 'Geological engineering', 'cat.石油工程': 'Petroleum engineering', 'cat.航空航天工程': 'Aerospace engineering',
    'cat.其他工程': 'Other engineering', 'cat.农渔产品检验': 'Agricultural & fish product inspection', 'cat.保育与渔业': 'Conservation & fishery',
    'cat.园艺与景观': 'Horticulture & landscaping', 'cat.建筑技术': 'Architectural technology', 'cat.工业设计': 'Industrial design',
    'cat.制图': 'Drafting', 'cat.测绘技术': 'Survey technology', 'cat.地理信息与气象': 'Geomatics & meteorology',
    'cat.网络与网站': 'Network & web technicians', 'cat.用户支持': 'User support', 'cat.无损检测': 'Non-destructive testing',
    'cat.工程检查': 'Engineering inspection', 'cat.职业健康与安全': 'Occupational health & safety', 'cat.建筑检查': 'Construction inspection',
    'cat.土木': 'Civil', 'cat.机械': 'Mechanical', 'cat.工业与制造': 'Industrial & manufacturing',
    'cat.建筑估价': 'Construction estimating', 'cat.电气与电子': 'Electrical & electronics', 'cat.电子设备维修': 'Electronic equipment repair',
    'cat.工业仪表': 'Industrial instrumentation', 'cat.航空电子': 'Avionics',
    'cat.高级管理': 'Senior management', 'cat.金融': 'Finance', 'cat.人力资源': 'Human resources',
    'cat.市场营销': 'Marketing', 'cat.客户成功': 'Customer success', 'cat.财务支持': 'Finance support', 'cat.行政': 'Administration',
    'cat.办公支持': 'Office support', 'cat.工程': 'Engineering', 'cat.医疗专业': 'Health professionals', 'cat.护理': 'Nursing',
    'cat.医疗技术': 'Medical technology', 'cat.社会服务': 'Social services', 'cat.教育辅助': 'Education support', 'cat.照护': 'Care work',
    'cat.设计': 'Design', 'cat.销售管理': 'Sales management', 'cat.餐饮': 'Food service', 'cat.服务主管': 'Service supervisors',
    'cat.零售': 'Retail', 'cat.客服': 'Customer service', 'cat.服务支持': 'Service support', 'cat.清洁': 'Cleaning',
    'cat.运输': 'Transportation', 'cat.物流': 'Logistics', 'cat.建筑': 'Construction', 'cat.农业': 'Agriculture',
    'cat.金融商务': 'Finance & business', 'cat.行政支持': 'Admin support', 'cat.教育/社会': 'Education & social services',
    'cat.文化艺术': 'Arts & culture', 'cat.销售/客服': 'Sales & customer service', 'cat.劳工/物流': 'Labour & logistics',
    'cat.高层管理': 'Senior executives', 'cat.IT/信息系统管理': 'IT & IS management', 'cat.会计/财务分析': 'Accounting & financial analysis',
    'cat.市场/品牌/传播': 'Marketing / brand / comms', 'cat.客户成功/实施': 'Customer success & implementation', 'cat.记账/薪酬': 'Bookkeeping & payroll',
    'cat.行政助理': 'Administrative assistants', 'cat.文员/数据录入': 'Clerks & data entry', 'cat.数据科学/机器学习': 'Data science & ML',
    'cat.网络安全': 'Cybersecurity', 'cat.系统/业务分析': 'Systems & business analysis', 'cat.数据库': 'Databases',
    'cat.软件工程': 'Software engineering', 'cat.软件开发': 'Software development', 'cat.Web 开发': 'Web development',
    'cat.计算机/硬件工程': 'Computer & hardware engineering', 'cat.IT 支持/网络': 'IT support & networking', 'cat.测试/QA': 'Testing & QA',
    'cat.医生/全科': 'Physicians & GPs', 'cat.牙科': 'Dental', 'cat.药剂师': 'Pharmacists', 'cat.理疗/康复': 'Physio & rehab',
    'cat.注册护士': 'Registered nurses', 'cat.实用护士': 'Practical nurses', 'cat.医学影像/化验': 'Medical imaging & lab',
    'cat.教师/讲师': 'Teachers & instructors', 'cat.社工/社区': 'Social & community work', 'cat.幼教/托育': 'Early childhood & childcare',
    'cat.护理员/PSW': 'Care aides & PSW', 'cat.UI/UX/平面设计': 'UI/UX & graphic design', 'cat.销售/业务管理': 'Sales & business management',
    'cat.厨师/主厨': 'Chefs', 'cat.厨工': 'Cooks', 'cat.零售/餐饮主管': 'Retail & food service supervisors', 'cat.零售销售': 'Retail sales',
    'cat.客服/安保': 'Customer service & security', 'cat.餐饮服务': 'Food & beverage service', 'cat.服务员/接待': 'Servers & reception',
    'cat.清洁/保洁': 'Cleaning & janitorial', 'cat.机械师/CNC': 'Machinists & CNC', 'cat.焊工': 'Welders', 'cat.电工': 'Electricians',
    'cat.管道工': 'Plumbers', 'cat.木工': 'Carpenters', 'cat.暖通/制冷': 'HVAC & refrigeration', 'cat.安装技工': 'Installers',
    'cat.汽修/钳工': 'Auto mechanics & millwrights', 'cat.油漆/装修': 'Painting & finishing', 'cat.货车司机': 'Truck drivers',
    'cat.物料搬运/仓储': 'Material handling & warehousing', 'cat.建筑劳工': 'Construction labourers', 'cat.农场工': 'Farm workers',
    'cat.农林劳工': 'Agriculture & forestry labourers', 'cat.园林劳工': 'Landscaping labourers', 'cat.生产劳工': 'Production labourers',
  },
  ko: {
    'cat.IT': 'IT',
    'cat.科技管理': '과학기술 관리', 'cat.自然科学': '자연과학', 'cat.建筑与规划': '건축 및 도시계획',
    'cat.数据与统计': '데이터 및 통계', 'cat.科学技术员': '과학 기술직', 'cat.设计与制图': '설계 및 제도',
    'cat.IT 支持': 'IT 지원', 'cat.检验与安全': '검사 및 안전', 'cat.工程技术员': '엔지니어링 기술직',
    'cat.自然与应用科学': '자연 및 응용과학', 'cat.工程管理': '엔지니어링 관리', 'cat.建筑与科学管理': '건축·과학 관리',
    'cat.IT 管理': 'IT 관리', 'cat.物理与天文': '물리학 및 천문학', 'cat.化学': '화학',
    'cat.地球与海洋': '지구·해양과학', 'cat.生物': '생물학', 'cat.林业': '임업',
    'cat.景观设计': '조경 설계', 'cat.城市规划': '도시계획', 'cat.测绘': '측량',
    'cat.统计与精算': '통계 및 보험계리', 'cat.数据科学': '데이터 사이언스',
    'cat.电气与电子工程': '전기·전자공학', 'cat.计算机与硬件工程': '컴퓨터·하드웨어 공학', 'cat.化学工程': '화학공학',
    'cat.工业与制造工程': '산업·제조공학', 'cat.冶金与材料工程': '금속·재료공학', 'cat.采矿工程': '광산공학',
    'cat.地质工程': '지질공학', 'cat.石油工程': '석유공학', 'cat.航空航天工程': '항공우주공학',
    'cat.其他工程': '기타 공학', 'cat.农渔产品检验': '농수산물 검사', 'cat.保育与渔业': '자연보호 및 수산',
    'cat.园艺与景观': '원예 및 조경', 'cat.建筑技术': '건축 기술', 'cat.工业设计': '산업 디자인',
    'cat.制图': '제도', 'cat.测绘技术': '측량 기술', 'cat.地理信息与气象': '지리정보 및 기상',
    'cat.网络与网站': '네트워크 및 웹 기술', 'cat.用户支持': '사용자 지원', 'cat.无损检测': '비파괴 검사',
    'cat.工程检查': '엔지니어링 검사', 'cat.职业健康与安全': '산업보건 및 안전', 'cat.建筑检查': '건축 검사',
    'cat.土木': '토목', 'cat.机械': '기계', 'cat.工业与制造': '산업·제조',
    'cat.建筑估价': '건축 적산', 'cat.电气与电子': '전기·전자', 'cat.电子设备维修': '전자기기 수리',
    'cat.工业仪表': '산업 계측', 'cat.航空电子': '항공전자',
    'cat.高级管理': '고위 경영', 'cat.金融': '금융', 'cat.人力资源': '인사(HR)',
    'cat.市场营销': '마케팅', 'cat.客户成功': '고객 성공', 'cat.财务支持': '재무 지원', 'cat.行政': '행정',
    'cat.办公支持': '사무 지원', 'cat.工程': '엔지니어링', 'cat.医疗专业': '의료 전문직', 'cat.护理': '간호',
    'cat.医疗技术': '의료 기술', 'cat.社会服务': '사회 서비스', 'cat.教育辅助': '교육 보조', 'cat.照护': '돌봄',
    'cat.设计': '디자인', 'cat.销售管理': '영업 관리', 'cat.餐饮': '요식업', 'cat.服务主管': '서비스 관리자',
    'cat.零售': '소매', 'cat.客服': '고객 서비스', 'cat.服务支持': '서비스 지원', 'cat.清洁': '청소',
    'cat.运输': '운송', 'cat.物流': '물류', 'cat.建筑': '건설', 'cat.农业': '농업',
    'cat.金融商务': '금융·비즈니스', 'cat.行政支持': '행정 지원', 'cat.教育/社会': '교육·사회 서비스',
    'cat.文化艺术': '문화·예술', 'cat.销售/客服': '영업·고객 서비스', 'cat.劳工/物流': '노무·물류',
    'cat.高层管理': '최고 경영진', 'cat.IT/信息系统管理': 'IT·정보시스템 관리', 'cat.会计/财务分析': '회계·재무 분석',
    'cat.市场/品牌/传播': '마케팅·브랜드·홍보', 'cat.客户成功/实施': '고객 성공·구축', 'cat.记账/薪酬': '부기·급여',
    'cat.行政助理': '행정 보조', 'cat.文员/数据录入': '사무원·데이터 입력', 'cat.数据科学/机器学习': '데이터 과학·머신러닝',
    'cat.网络安全': '사이버 보안', 'cat.系统/业务分析': '시스템·업무 분석', 'cat.数据库': '데이터베이스',
    'cat.软件工程': '소프트웨어 엔지니어링', 'cat.软件开发': '소프트웨어 개발', 'cat.Web 开发': '웹 개발',
    'cat.计算机/硬件工程': '컴퓨터·하드웨어 엔지니어링', 'cat.IT 支持/网络': 'IT 지원·네트워크', 'cat.测试/QA': '테스트 및 QA',
    'cat.医生/全科': '의사 및 일반의', 'cat.牙科': '치과', 'cat.药剂师': '약사', 'cat.理疗/康复': '물리치료 및 재활',
    'cat.注册护士': '등록 간호사(RN)', 'cat.实用护士': '실무 간호사(LPN)', 'cat.医学影像/化验': '의료 영상 및 검사',
    'cat.教师/讲师': '교사 및 강사', 'cat.社工/社区': '사회복지 및 지역사회', 'cat.幼教/托育': '유아교육 및 보육',
    'cat.护理员/PSW': '요양보호사(PSW)', 'cat.UI/UX/平面设计': 'UI/UX 및 그래픽 디자인', 'cat.销售/业务管理': '영업 및 사업 관리',
    'cat.厨师/主厨': '셰프 및 주방장', 'cat.厨工': '조리원', 'cat.零售/餐饮主管': '소매 및 요식업 관리자', 'cat.零售销售': '소매 판매',
    'cat.客服/安保': '고객 서비스 및 보안', 'cat.餐饮服务': '푸드 앤 드링크 서비스', 'cat.服务员/接待': '서빙 및 접수',
    'cat.清洁/保洁': '청소 및 미화', 'cat.机械师/CNC': '기계공 및 CNC', 'cat.焊工': '용접공', 'cat.电工': '전기공',
    'cat.管道工': '배관공', 'cat.木工': '목수', 'cat.暖通/制冷': 'HVAC·냉동', 'cat.安装技工': '설치 기사',
    'cat.汽修/钳工': '자동차 정비·기계 정비', 'cat.油漆/装修': '도장·마감', 'cat.货车司机': '트럭 운전기사',
    'cat.物料搬运/仓储': '자재 운반·창고', 'cat.建筑劳工': '건설 노무', 'cat.农场工': '농장 노동자',
    'cat.农林劳工': '농림 노무', 'cat.园林劳工': '조경 노무', 'cat.生产劳工': '생산 노무',
  },
}

/**
 * seo 域常量:站点根、核心页清单、分片口径、robots 规则、sitemapindex 模板件。
 * 2026-08-23 立域(Frank「seed robots sitemap 需要单独成域吧」;seed 已归 mart 不进本域)。
 * 收拢的实证:SITE fallback 那行原在 5 个 app 文件里逐字抄了 5 遍。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */

/**
 * 站点根 URL(尾斜杠掐掉)。
 * ⚠️ robots/sitemap 根文件构建期静态烘焙,Docker 构建拿不到 Render env(Dockerfile 无 ARG)
 * → 实际生效的是 fallback,必须=正式域。
 */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')

/**
 * 职位分片的固定片数(片号 = 岗 id 对它取模)。
 * 原判(SHARD_SIZE = 5000):每片 URL 数(jobs 与 companies 同一容量;片数按库内现量自适应,2026-08-02 撑爆定案)。
 * 2026-09-26 改判(/fe SEO,Frank 勾「给 Google 新鲜信号」):按位置切 —— 第 N 片 = id 升序第 N 个五千 ——
 * 关掉一个老岗,后面每个网址都往前挪一格,各片内容天天整体换,Google 看到的是「每片都改了」,真新鲜信号淹在挪片噪音里。
 * 改成 id 取模的固定片数:一个岗永远落同一片,与清单里还有谁无关。10 片 × 单册上限五万 = 50 万,
 * 当天收录口径 2.4 万(每片约 2,400,各片差不到 4%)。
 */
export const JOB_SHARDS = 10

/**
 * 公司分片的固定片数(片号 = 公司 id 对它取模;改判同 JOB_SHARDS)。当天有在架岗的公司 3.7 万家(每片约 4,600)。
 */
export const CO_SHARDS = 8

/**
 * 核心页清单(E7-03 + E5-04 §2;path/priority/freq 三格一行)。
 * 决策记录:/pathways 与 /plan/{job,province,career} 已 301 进决策页只留 /plan/pr;
 * /stats 全家 E13-03 退役(08-06 Frank「完整统计与首页重复」)只留 /start。
 */
export const CORE_PAGES = [
  /**
   * 首页。
   */
  { path: '/', priority: 1, freq: 'daily' },

  /**
   * PTE 刷题题单(默认型;2026-09-03 批二上线,日用页)。
   * 即 PTE 题单 · 朗读:同日 /pte 门厅撤成 301 → /pte/ra 后这条改指 /pte/ra,与原「朗读」那条同址重复;
   * 2026-09-26 并成一条(/pte 本身没有页,next.config 301 兜底,不进册)。
   */
  { path: '/pte/ra', priority: 0.8, freq: 'daily' },

  /**
   * PTE 题单 · 复述句子。
   */
  { path: '/pte/rs', priority: 0.7, freq: 'daily' },

  /**
   * PTE 题单 · 简答题。
   */
  { path: '/pte/asq', priority: 0.7, freq: 'daily' },

  /**
   * PTE 题单 · 听写句子。
   */
  { path: '/pte/wfd', priority: 0.7, freq: 'daily' },

  /**
   * 定价页。
   */
  { path: '/pricing', priority: 0.8, freq: 'weekly' },

  /**
   * 关于页。
   */
  { path: '/about', priority: 0.5, freq: 'monthly' },

  /**
   * 免责声明。
   */
  { path: '/legal/disclaimer', priority: 0.3, freq: 'monthly' },

  /**
   * 隐私政策。
   */
  { path: '/legal/privacy', priority: 0.3, freq: 'monthly' },

  /**
   * 服务条款。
   */
  { path: '/legal/terms', priority: 0.3, freq: 'monthly' },

  /**
   * PR 决策页(判定合一批2 的唯一幸存 plan 路由)。
   */
  { path: '/plan/pr', priority: 0.9, freq: 'daily' },

  /**
   * 新闻页。
   */
  { path: '/news', priority: 0.8, freq: 'daily' },

  /**
   * 职业名录(B4-01 SEO 高意图词落地页)。
   */
  { path: '/occupations', priority: 0.8, freq: 'weekly' },

  /**
   * 抽选与政策时间线(C6-01)。
   */
  { path: '/timeline', priority: 0.8, freq: 'daily' },

  /**
   * 官方资源导航(E4-05)。
   */
  { path: '/resources', priority: 0.7, freq: 'weekly' },

  /**
   * 周榜。
   */
  { path: '/rankings/weekly-top', priority: 0.9, freq: 'daily' },

  /**
   * 把脉首页(/stats 全家退役后的唯一收录入口)。
   */
  { path: '/start', priority: 0.9, freq: 'daily' },

  /**
   * 常见案例索引(SEO 落地页,中文长尾收录主体;2026-08-29 补册 —— 处境页要被爬到
   * 靠这一页 + 顶栏,册里此前漏了它。担保倾向榜同日出册:sponsor-likely 08-08 已下架,
   * 今日降位成 301,再列就是喂 Google 跳转)。
   */
  { path: '/cases', priority: 0.8, freq: 'weekly' },
]

/**
 * 职位详情页在 sitemap 里的优先级。
 */
export const JOB_PRIORITY = 0.6

/**
 * 公司详情页在 sitemap 里的优先级。
 */
export const CO_PRIORITY = 0.5

/**
 * 详情页的更新频率标注。
 */
export const FREQ_WEEKLY = 'weekly'

/**
 * robots 放开的清单:根,加禁抓区里点名放行的两个洞(2026-08-30 三族进 api 批:
 * og 分享图与 sitemap 的唯一读者就是爬虫,Twitter/Google 守 robots,不放行等于白做;
 * seed 不开洞 —— 灌库端点本就该禁抓)。Google 按最长匹配,Allow 压得过 Disallow /api/。
 */
export const ROBOTS_ALLOW = ['/', '/api/og/', '/api/sitemaps/']

/**
 * robots 挡住的路径(admin/api/账号页不进索引)。
 */
export const ROBOTS_DISALLOW = ['/admin', '/api/', '/account']

/**
 * robots 的 userAgent 通配。
 */
export const ROBOTS_UA = '*'

/**
 * sitemapindex 首选路径(GSC 手动提交只认一个 URL,提交索引即覆盖全部分片 —— #156)。
 * 2026-08-29「一个入口一个目录」收进 /sitemaps/;2026-08-30「三个都搬」再迁 /api/sitemaps/
 * (robots 点名 Allow;GSC 同日二次割接)。原口径:全家一个前缀、
 * 一个动态壳;旧 /sitemap-index.xml 与 /sitemap.xml 在 next.config 301 兜底(Google 认
 * 站点地图跳转);分片旧址无 301 —— GSC 实查 Google 从未读到过它们(索引 7/21 后未重读)。
 */
export const SITEMAP_INDEX_PATH = '/api/sitemaps/index.xml'

/**
 * 平铺核心表路径。
 */
export const SITEMAP_PATH = '/api/sitemaps/core.xml'

/**
 * 职位分片路径模板(`{n}` 槽 = 片号)。
 */
export const JOB_SHARD_PATH = '/api/sitemaps/jobs-{n}.xml'

/**
 * 近 7 天新岗册路径(2026-09-26 /fe SEO「给 Google 新鲜信号」:收录口径里发布不满 7 天的岗,按 lastmod 倒序;
 * 同一网址也在它自己的取模片里,Google 允许一址多册)。
 */
export const JOB_NEW_PATH = '/api/sitemaps/jobs-new.xml'

/**
 * 公司分片路径模板。
 */
export const CO_SHARD_PATH = '/api/sitemaps/companies-{n}.xml'

/**
 * 职位详情页路径前缀(后接 id)。
 */
export const JOB_PAGE_PREFIX = '/jobs/'

/**
 * 公司详情页路径前缀(后接 slug)。
 */
export const CO_PAGE_PREFIX = '/companies/'

/**
 * sitemapindex XML 头(sitemaps.org 0.9 标准,主流爬虫都认)。
 */
export const INDEX_XML_HEAD = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`

/**
 * sitemapindex XML 尾。
 */
export const INDEX_XML_TAIL = `</sitemapindex>`

/**
 * sitemapindex 单条模板(`{loc}`/`{mod}` 两槽)。
 * 2026-09-26 起 `{mod}` 填该片条目里最晚的 lastmod(真值;原先整张索引填请求时刻)。
 */
export const INDEX_ITEM_TPL = `  <sitemap><loc>{loc}</loc><lastmod>{mod}</lastmod></sitemap>`

/**
 * sitemapindex 单条模板 · 不带落款(`{loc}` 一槽;2026-09-26:核心册与空片没有真值,整个 lastmod 元素不出,不给空标签)。
 */
export const INDEX_ITEM_NOMOD_TPL = `  <sitemap><loc>{loc}</loc></sitemap>`

/**
 * 响应头:内容类型。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * XML 内容类型值。
 */
export const CT_XML = 'application/xml; charset=utf-8'

/**
 * 响应头:缓存控制。
 */
export const HDR_CACHE_CONTROL = 'Cache-Control'

/**
 * 索引缓存一小时(sitemap 访问频次极低,现查无压力,再给层缓存)。
 */
export const CACHE_1H = 'public, max-age=3600'

/**
 * 分片清单的进程内缓存寿命(与 CACHE_1H 同口径)。2026-09-03 GSC 实查定案:响应头的一小时缓存在
 * Render 上没有 CDN 兜着,等于每次都现查 —— 索引 63 秒、分片 10–24 秒,Google 读索引后子表逐个超时,
 * 8/30 提交的 sitemap「发现 0 页」,新岗全部对 Google 不存在(职位富结果 28K → 22)。
 * 改成两侧各一次全量查询进程内切片,一小时一刷;Render 单实例,进程缓存即全局缓存。
 */
export const SEO_TTL_MS = 60 * 60_000

/**
 * 换行(functions 不许裸字面量,XML 行粘接用)。
 */
export const NL = '\n'

/**
 * 万册壳的分发件名:索引。
 */
export const SM_FILE_INDEX = 'index.xml'

/**
 * 万册壳的分发件名:核心册。
 */
export const SM_FILE_CORE = 'core.xml'

/**
 * 万册壳的分发件名:近 7 天新岗册(与 JOB_NEW_PATH 末段同名;职位分册件名形只认数字片号,撞不上它)。
 */
export const SM_FILE_JOBS_NEW = 'jobs-new.xml'

/**
 * 职位分册件名形(捕获组 = 片号)。
 */
export const SM_JOBS_FILE_RE = /^jobs-(?<n>\d+)\.xml$/

/**
 * 公司分册件名形(捕获组 = 片号)。
 */
export const SM_CO_FILE_RE = /^companies-(?<n>\d+)\.xml$/

/**
 * urlset XML 头(sitemaps.org 0.9;此前核心/分片册由 Next Metadata 框架序列化,
 * 2026-08-29 归目录批改走 route handler,序列化收回本域)。
 */
export const URLSET_XML_HEAD = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`

/**
 * urlset XML 尾。
 */
export const URLSET_XML_TAIL = '</urlset>'

/**
 * urlset 单条模板(与 Next Metadata 框架此前的输出同形,四格全给)。
 */
export const URLSET_ITEM_TPL = `<url>
<loc>{loc}</loc>
<lastmod>{mod}</lastmod>
<changefreq>{freq}</changefreq>
<priority>{pri}</priority>
</url>`

/**
 * urlset 单条模板 · 不带 lastmod(2026-09-26 /fe SEO:没有真改动时刻的条目整个元素不出 —— 核心册全是这种;
 * 原先核心册填请求时刻,是假新鲜信号)。
 */
export const URLSET_ITEM_NOMOD_TPL = `<url>
<loc>{loc}</loc>
<changefreq>{freq}</changefreq>
<priority>{pri}</priority>
</url>`

/**
 * URL 路径段分隔符(万册壳取末段件名用)。
 */
export const PATH_SEP = '/'

/**
 * 空文本(模板槽没值时的占位;与 account 域同名同义,各家一份)。
 */
export const TEXT_NONE = ''

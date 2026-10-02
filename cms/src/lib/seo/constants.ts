/**
 * seo 域常量:站点根、robots 规则、职位站点地图 jobs.xml 的路径与模板件。
 * 2026-08-23 立域(Frank「seed robots sitemap 需要单独成域吧」;seed 已归 mart 不进本域)。
 * 2026-10-02 站点地图合成一个 jobs.xml(Frank「合成一个不行吗」「叫 jobs.xml 不行么」):索引、核心册(CORE_PAGES)、
 * 职位取模分片(JOB_SHARDS)、近 7 天新岗册与 sitemapindex 模板件随之撤。
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
 * 职位详情页在 sitemap 里的优先级。
 */
export const JOB_PRIORITY = 0.6

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
 * 职位站点地图(全站唯一一张,robots 只指它;GSC 只交这一个)。
 * 原判(SITEMAP_INDEX_PATH = index.xml,#156):GSC 手动提交只认一个 URL,提交索引即覆盖全部分片;2026-08-29 收进 /sitemaps/,
 * 08-30 再迁 /api/sitemaps/(robots 点名 Allow)。2026-09-14 实查索引被 Google 记成空表后不再展开,改成各片单独提交。
 * 原判(JOB_SHARDS = 10,2026-09-26):岗 id 对 10 取模的固定片,外加核心册 core.xml 与近 7 天新岗册 jobs-new.xml。
 * 2026-10-02 改判(Frank「合成一个不行吗」「叫 jobs.xml 不行么」):收录口径收窄到最全的岗后只剩七千多条,
 * 单册上限五万条、50MB,一个文件装得下;核心页站内处处有链接,不再进站点地图。
 */
export const SITEMAP_JOBS_PATH = '/api/sitemaps/jobs.xml'

/**
 * 职位详情页路径前缀(后接 id)。
 */
export const JOB_PAGE_PREFIX = '/jobs/'

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
 * 站点地图响应缓存一小时(sitemap 访问频次极低,现查无压力,再给层缓存)。
 */
export const CACHE_1H = 'public, max-age=3600'

/**
 * 分片清单的进程内缓存寿命(与 CACHE_1H 同口径)。2026-09-03 GSC 实查定案:响应头的一小时缓存在
 * Render 上没有 CDN 兜着,等于每次都现查 —— 索引 63 秒、分片 10–24 秒,Google 读索引后子表逐个超时,
 * 8/30 提交的 sitemap「发现 0 页」,新岗全部对 Google 不存在(职位富结果 28K → 22)。
 * 改成两侧各一次全量查询进程内切片,一小时一刷;Render 单实例,进程缓存即全局缓存。
 * 2026-10-02 起只剩职位一张 jobs.xml,缓存的就是它的全量清单。
 */
export const SEO_TTL_MS = 60 * 60_000

/**
 * 换行(functions 不许裸字面量,XML 行粘接用)。
 */
export const NL = '\n'

/**
 * 分发件名:职位站点地图(与 SITEMAP_JOBS_PATH 末段同名;其余件名一律 404)。
 */
export const SM_FILE_JOBS = 'jobs.xml'

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
 * urlset 单条模板 · 不带 lastmod(2026-09-26 /fe SEO:没有真改动时刻的条目整个元素不出;
 * 原先核心册填请求时刻,是假新鲜信号)。
 */
export const URLSET_ITEM_NOMOD_TPL = `<url>
<loc>{loc}</loc>
<changefreq>{freq}</changefreq>
<priority>{pri}</priority>
</url>`

/**
 * URL 路径段分隔符(壳取末段件名用)。
 */
export const PATH_SEP = '/'

/**
 * 空文本(模板槽没值时的占位;与 account 域同名同义,各家一份)。
 */
export const TEXT_NONE = ''

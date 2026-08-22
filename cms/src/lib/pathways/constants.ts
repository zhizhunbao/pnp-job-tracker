/**
 * 通道域的死值:各策略文件共用的出处常量(原 sources.ts)+ 展示默认值 + 闸兜底的字面量。
 *
 * 取证方式(铁律 URL→数据→SQL):全部来自 data/crawl/<slug>/html_cache 的官方页,
 * 用 etl/scan_gate_quotes.py 捞候选句后人工核定。**不猜 URL、不凭印象、不拿文档记忆当库。**
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

/**
 * 本轮 crawl 抓取日(mb-mpnp 是 2026-08-03,见该条策略文件)。
 */
export const D = '2026-08-12'

/**
 * 与 etl/pnp/build_bc_req.py:PDF_URL 同一份。
 */
export const BC_GUIDE = 'https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf'

/**
 * 与 etl/pnp/build_pe_req.py:GUIDE_URL 同一份。
 */
export const PE_GUIDE = 'https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf'

/**
 * NB 技术工人通道资格页(2026 换版后的新址;从老地址 302 落到的 PNP 总览页上现取的链接)。
 */
export const NB_SW_URL = 'https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/skilled-worker-stream.html'

/**
 * 展示默认:制度归属(普通省提名通道)。
 */
export const UI_PROGRAM_DEFAULT = 'PNP'

/**
 * 展示默认:在招口径(全省在招)。
 */
export const UI_JOBS_DEFAULT = 'openJobs'

/**
 * 闸兜底:没登记的格落成「本站未收录」的 need 值。
 */
export const NEED_UNKNOWN = 'unknown'

/**
 * 闸兜底:未收录的缘由值(没有资格页可读)。
 */
export const WHY_NO_SOURCE = 'no-source'

/**
 * 试点聚合认的两种制度(身兼两制的社区计入两组)。
 */
export const PILOT_TYPES = ['RCIP', 'FCIP'] as const

/**
 * 聚合分组键的分隔符。
 */
export const GROUP_SEP = '|'

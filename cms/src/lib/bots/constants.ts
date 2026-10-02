/**
 * 爬虫域的死值:哪些爬虫不让进。
 * 立域缘由(2026-10-01):9 月 Render 出站流量 130 GB 扣了约 CA$68,Frank「他瞎爬跑我的流量」。
 * 与 lib/traffic(出站流量记账)分开:这里给页面门用,跑在边缘运行时,不能沾 Node 内置件。
 *
 * @author Frank
 * @time 2026-10-01 21:00:00
 */

// =========================================================================
// 1. 挡爬虫
// =========================================================================

/**
 * 直接回 403 的爬虫(浏览器标识里含其一即中,不分大小写;2026-10-01 Frank「他瞎爬跑我的流量」,
 * 拍「拦非搜索类」):只挡 AI 训练与 SEO 工具两类 —— 它们不给本站带一个访客,只吃流量。
 * 搜索引擎(Googlebot / bingbot / DuckDuckBot / Applebot 等)一个不挡:Google 招聘富结果是最大入口。
 * 只认自报身份的;冒充浏览器的挡不住,要靠 lib/traffic 的出站流量记账找出来再补。
 */
export const BOT_BLOCK_RE =
  /GPTBot|ClaudeBot|anthropic-ai|CCBot|Bytespider|meta-externalagent|Amazonbot|cohere-ai|Diffbot|ImagesiftBot|Timpibot|AhrefsBot|SemrushBot|MJ12bot|DotBot|BLEXBot|DataForSeoBot|serpstatbot|barkrowler/i

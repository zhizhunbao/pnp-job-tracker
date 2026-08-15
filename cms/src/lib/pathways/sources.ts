// 各通道策略文件共用的出处常量(原 gateManifest 顶部那几行,拆文件时一并搬出来)。
//
// 取证方式(铁律 URL→数据→SQL):全部来自 data/crawl/<slug>/html_cache 的官方页,
// 用 etl/scan_gate_quotes.py 捞候选句后人工核定。**不猜 URL、不凭印象、不拿文档记忆当库。**
//
// 放在这里而不是 gateManifest:策略文件要用它们,而 gateManifest 现在反过来要用策略文件的汇总
// (gateOf 已移进 pathways/index)—— 常量留在 gateManifest 会绕出一条真运行时循环依赖。

/** 本轮 crawl 抓取日(mb-mpnp 是 2026-08-03,见该条策略文件) */
export const D = '2026-08-12'

/** 与 etl/pnp/build_bc_req.py:PDF_URL 同一份 */
export const BC_GUIDE = 'https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf'
/** 与 etl/pnp/build_pe_req.py:GUIDE_URL 同一份 */
export const PE_GUIDE = 'https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf'
/** NB 技术工人通道资格页(2026 换版后的新址;从老地址 302 落到的 PNP 总览页上现取的链接) */
export const NB_SW_URL = 'https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/skilled-worker-stream.html'

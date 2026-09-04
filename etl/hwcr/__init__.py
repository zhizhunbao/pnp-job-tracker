"""
hwcr 域:海外超人便民信息系统(m.hwcr.vip)渥太华站房屋帖 → Lisgar 中学附近出租单间清单。

2026-09-04 Frank 立域(「创建一个单独的 etl 域,我有朋友想在渥太华市中心给他的孩子租一个单间」,
锚点 = Lisgar Collegiate Institute,29 Lisgar Street, Ottawa, K2P 0B9)。
域回答的问题:**这个华人分类信息站上,离 Lisgar 近的出租单间现在有哪些**。

实撞证据(2026-09-04):首页 httpx 只拿到 1.7KB 的 Vite SPA 壳,真数据走
`http://yk.hwcr.vip/api/v1/convenience.getConvenienceList`(GET,零鉴权;app_id/identity 是
前端 bundle 里写死的客户端串,不是用户凭证)。渥太华站房屋帖 1128 条,模板 17=出租 / 16=求租;
每帖带结构化 data 五格(房屋户型/坐标地址/房屋描述/出租租金/联系方式),联系方式一律「联系超人」
(平台微信中间人),帖子本身不给电话。
地点解析三级梯(精确地址 → 邮编 → 地标词表),坐标查 Nominatim(OSM 免费地理编码,1 req/s 礼貌档),
响应原文一律先落 crawl 层(crawl/hwcr/ 与 crawl/nominatim/),距离用 haversine 算到 Lisgar。
产物 data/raw/hwcr/ottawa-housing.json(按帖 id 增量累积)+ data/processed/hwcr/lisgar-rooms.{json,md}。
⚠ 私用清单:不建 mart / 不灌库 / 不上线。

META:一域一容器(SOURCE=hwcr),小时更(2026-08-31 Frank「都改成小时更新也不费劲」);
每轮只翻到 RECENT_DAYS 窗口为止(约 2-3 页 × 200 条),不占 healthchecks 心跳。
"""
META = {
    "role": "hwcr",
    "method": "httpx",
    "interval": 3600,          # 1h(租房帖时效短,新帖当天就被抢;成本 = 每轮 3 个 GET)
    "seed": False,             # 私用域,不灌库
    "ping": False,             # 不占 healthchecks 心跳(不接生产监控)
}

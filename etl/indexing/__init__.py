"""
indexing 域:Google Indexing API 主动通知(2026-09-26 立域;Frank 勾「接 Indexing API」,拍「三处都只放有投递邮箱的岗」
「这个最好能自动更新」)。

回答的问题:「本站哪些职位页该主动告诉 Google 来抓 / 来删」。起因:Google 自 7/28 起不再收本站新岗,抓取从每天约 2.9 万次
掉到 200~400 次 —— 瓶颈是 Google 不来抓;Indexing API 是 Google 官方只许职位页与直播页用的主动通知接口。
**线上 sitemap 是唯一真相**:cms 的 sitemap 职位分册只列有投递邮箱、在架、正文完整、不重复的岗,分册里有的就是该推的 ——
本域不另查库、不另判口径。每轮:读 sitemap 职位分册 → 先撤回(以前推过、现已离开 sitemap 的:页面 404 / 410 / noindex
才发 URL_DELETED,页面仍可收录的只从状态里退役)→ 再推新(sitemap 里没推过的,lastmod 新→旧,用完当日剩余额度发 URL_UPDATED)。
状态落 processed/indexing/state.json;密钥 = 服务账号 JSON 文件,路径走环境变量 GOOGLE_INDEXING_KEY_FILE
(文件 gitignore,Frank 亲手放),没配每轮一行警告跳过。

META = 域即役的调度声明:role=挂哪个角色容器(SOURCE 环境变量),interval=本域一轮的间隔秒;
入口固定 etl/indexing/main.py,步骤清单在 main.py 里。
⚠ 本文件保持零 import:build 容器每轮的保鲜闸(sched freshness_ok → domain_metas)会逐个 exec 各域 __init__,
轻门免得每轮白拉依赖;不声明 fresh 契约(状态只在有密钥的轮才刷新,没配密钥时报超期是误报)。

@author Frank
@time 2026-09-26 02:30:43
"""

META = {
    "role": "indexing",
    "method": "httpx",       # 对应 etl/sched/Dockerfile 通用轻镜像(只打自家站与 Google 接口,无浏览器;镜像要带 cryptography)
    "interval": 3600,        # 每小时一轮(Frank「这个最好能自动更新」):sitemap 每小时变,额度按太平洋零点重置,
                             # 当天额度用完的轮只读一次状态就退,不打站也不打 Google
    "seed": False,           # 不产 mart,不灌库(结果只落 processed/indexing/state.json)
    "ping": True,            # 本角色唯一单元
}

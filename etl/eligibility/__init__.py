"""
eligibility 域:联邦试点申请人门槛库(quote-anchored 规则抓取)—— 2026-09-06 立域
(Frank「这种不同省的规则也需要一个单独模块维护吧」)。域名 2026-09-06 由 rules 改 eligibility
(Frank「叫 rules 是不是不知道是干啥的」:rules 全仓都能叫;本域回答「谁能申请」,官方页就叫 eligibility)。

回答什么问题:**某通道官方要求申请人满足什么**。每条门槛由人从官方原文抄成结构化行,
本域每轮只读 crawl 缓存,逐条验证引用仍逐字在页面上(改版即 exit 1 保留旧表),
产 raw/ircc/<program>_rules.json,mart IN_REQ_TABLES 直接消费 → pnp_requirements → 引擎 facts。

边界(切法 = 「名录与岗位」vs「申请人门槛」):aip / rcip / fcip 三域管指定雇主名录、社区清单与岗位打标,
本域只管申请人门槛;首批三段 —— AIP(aip 域第 3 段整段搬入,产物路径不变)、RCIP、FCIP(新写,
crawl fed-rcip 缓存)。各省 PNP 的门槛表仍住 pnp 域 build_<省>_req,以后再迁,不在立域批。
寿命:跟官方页面走;谁都不依赖本域函数,只读本域产物文件(依赖只指向活得更久的那个:mart → 文件)。

META = 域即役的调度声明:role=挂哪个角色容器(SOURCE 环境变量),interval=本域一轮的间隔秒;
入口固定 etl/eligibility/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "eligibility",           # 一域一容器(docker-compose 的 eligibility service)
    "method": "httpx",         # 实际零网络:只读 crawl 缓存,method 只是形制字段
    "interval": 3600,          # 1h(与 aip 域同节奏;引用核验只读缓存零开销)
    "seed": False,
    "ping": False,             # 报警走 pnp 链尾 freshness 哨兵(盯产物文件,跨容器有效)
    "fresh": [                 # 保鲜契约(语义见 sched.K_FRESH;三份规则表各一条,fetched 字段即抓取日)
        {"file": "raw/ircc/aip_rules.json", "cadence_days": 7, "key": "fetched",
         "note": "AIP 申请人门槛(原 aip 域产,2026-09-06 搬入本域,路径不变)"},
        {"file": "raw/ircc/rcip_rules.json", "cadence_days": 7, "key": "fetched",
         "note": "RCIP 申请人门槛(2026-09-06 新增)"},
        {"file": "raw/ircc/fcip_rules.json", "cadence_days": 7, "key": "fetched",
         "note": "FCIP 申请人门槛(2026-09-06 新增)"},
    ],
}

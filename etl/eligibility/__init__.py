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
2026-09-26 晚改判(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」「一单元一容器」,
pnp 同批同形):单役 META 拆成 METAS 三役(一域多役,load 首例的形),一试点一役;一役 = 一个调度单元 = 一个容器
(SOURCE = 役名)= 一个 healthchecks 检查项(HEALTHCHECK_PING_<役名大写>);入口同门不同 --only(= 役名,
main.UNITS 整名命中)。三份规则表互不依赖,原链里一份引用消失,排在它后面的表本轮就不跑;拆开后各跑各的、各报各的。
原单役 META 各键逐条落进每一役:
  role="eligibility" → 各役自己的名字;method="httpx" / interval=3600 / seed=False 三役照抄;
  ping False → True(一役一 ping);fresh 三条各归各役(aip_rules.json → eligibility_aip,依此类推)。
原单役 META 的键上注释(逐字留档):
  role "eligibility"  一域一容器(docker-compose 的 eligibility service)
  method "httpx"      实际零网络:只读 crawl 缓存,method 只是形制字段
  interval 3600       1h(与 aip 域同节奏;引用核验只读缓存零开销)
  ping False          报警走 pnp 链尾 freshness 哨兵(盯产物文件,跨容器有效)
                      —— 2026-09-26 晚改 True(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」
                      →「拆 + 每个单元配 ping」:三役各发各的心跳,保鲜闸照旧盯产物文件)
  fresh               保鲜契约(语义见 sched.K_FRESH;三份规则表各一条,fetched 字段即抓取日)
                      2026-09-26 Frank「最次也是日更」:三条原 7 天 → 2(日更一轮 + 一天余量;本域小时更)
"""
METAS = [
    {"name": "eligibility_aip", "role": "eligibility_aip", "only": "eligibility_aip", "method": "httpx",
     "interval": 3600, "seed": False, "ping": True,
     "fresh": [
         {"file": "raw/ircc/aip_rules.json", "cadence_days": 2, "key": "fetched",
          "note": "AIP 申请人门槛(原 aip 域产,2026-09-06 搬入本域,路径不变)"},
     ]},
    {"name": "eligibility_rcip", "role": "eligibility_rcip", "only": "eligibility_rcip", "method": "httpx",
     "interval": 3600, "seed": False, "ping": True,
     "fresh": [
         {"file": "raw/ircc/rcip_rules.json", "cadence_days": 2, "key": "fetched",
          "note": "RCIP 申请人门槛(2026-09-06 新增)"},
     ]},
    {"name": "eligibility_fcip", "role": "eligibility_fcip", "only": "eligibility_fcip", "method": "httpx",
     "interval": 3600, "seed": False, "ping": True,
     "fresh": [
         {"file": "raw/ircc/fcip_rules.json", "cadence_days": 2, "key": "fetched",
          "note": "FCIP 申请人门槛(2026-09-06 新增)"},
     ]},
]
"""本域三役(2026-09-26 晚拆,见文件头;三役都只读 crawl 缓存,零网络):
  eligibility_aip   aip:AIP 申请人门槛库 → raw/ircc/aip_rules.json(步骤见 main.UNITS)
  eligibility_rcip  rcip:RCIP 申请人门槛库 → raw/ircc/rcip_rules.json
  eligibility_fcip  fcip:FCIP 申请人门槛库 → raw/ircc/fcip_rules.json
间隔一律 3600(照原单役 META)。"""

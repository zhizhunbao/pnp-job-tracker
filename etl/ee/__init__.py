"""
ee 域:联邦 Express Entry「类别抽选」清单 + 抽选轮次(全国单一源,与 PNP 两条路)。
只刷 raw 不灌库 —— build 角色每轮 08→09→seed 目录驱动消费(08 读 raw/ee)。
回退:源站若重新上 Akamai(解析空保留旧表打 ⚠)→ 换回 crawl 域回退工具(python etl/crawl/main.py --only ee_categories)。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/ee/main.py,步骤清单在 main.py 里。
2026-09-26 晚改判(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」「一单元一容器」,
pnp 同批同形):单役 META 拆成 METAS 两役(一域多役,load 首例的形),一役 = 一个调度单元 = 一个容器(SOURCE = 役名)
= 一个 healthchecks 检查项(HEALTHCHECK_PING_<役名大写>);入口同门不同 --only(= 役名,main.UNITS 整名命中),
单元内一步失败即中止。原单役 META 各键逐条落进每一役:
  role="ee" → 各役自己的名字(第一役仍叫 ee);interval=3600 / seed=False / ping=True / method="httpx" 两役照抄;
  fresh 保鲜契约连同键上注释整块挂在第一役 ee 上(保鲜闸扫全部域全部役的 fresh 并起来,挂哪一役都一样;
  raw/ee/*.json 一条 glob 同时盖住 ee_rules 落的 crs-grid / fed-eligibility / language-grid / category-rules)。
原单役 META 的键上注释(逐字留档):
  interval 3600  1h(#128 同拍:EE 抽选两周一轮,月更会漏;批2 误写月更,2026-08-31 批F 修回)
  ping True      本角色的 healthchecks 心跳由本域发
"""
METAS = [
    {"name": "ee", "role": "ee", "only": "ee", "method": "httpx", "interval": 3600, "seed": False, "ping": True,
     "fresh": [      # 保鲜契约(2026-08-31 批O:source_manifest 退役,行原样搬入;语义见 sched.K_FRESH)
         {"glob": "raw/ee/*.json", "cadence_days": 2},
     ]},
    {"name": "ee_rules", "role": "ee_rules", "only": "ee_rules", "method": "httpx", "interval": 3600, "seed": False,
     "ping": True},
]
"""本域两役(2026-09-26 晚拆,见文件头):
  ee        categories → draws:类别抽选职业清单 + 抽选轮次(httpx 直取 / IRCC 开放 JSON;步骤见 main.UNITS)
  ee_rules  rules → category_rules:联邦 EE 官方口径三表 + 类别抽选逐类别条文(纯读 crawl 缓存,自校失败 exit 1)
间隔一律 3600(照原单役 META)。"""

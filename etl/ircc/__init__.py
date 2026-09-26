"""
ircc 域:联邦开放数据(学签/工签存量、PGWP 规则、官方规费、省移民难度指数)。
只刷 raw+processed 不灌库 —— build 角色每轮 11_build_stats 读 processed/difficulty.json 挂进 mart。
配额表 raw/ircc/pnp_allocations.json = 人工核对维护表(年度公告后手改,Frank 抽查制),本域不动它。
⚠ 2026-09-06:「NPR 刻度」与「分省临时居民」两段搬去 statcan 域(那是 StatCan 的表,不是 IRCC
开放数据)。**产物路径不动**:npr_share.json / statcan_tr_prov.json 仍落在 raw/ircc/ 下,
本域段7 的难度指数照旧读后者;它们的保鲜条目改由 statcan 域 META 按文件声明
(file 行压过本域的 glob 行,见 sched.fresh_rows),本域不再替它们担新鲜度。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/ircc/main.py,步骤清单在 main.py 里。
2026-09-26 晚改判(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」「一单元一容器」,
pnp 同批同形):单役 META 拆成 METAS 两役(一域多役,load 首例的形),一役 = 一个调度单元 = 一个容器(SOURCE = 役名)
= 一个 healthchecks 检查项(HEALTHCHECK_PING_<役名大写>);入口同门不同 --only(= 役名,main.UNITS 整名命中),
单元内一步失败即中止。原单役 META 各键逐条落进每一役:
  role="ircc" → 各役自己的名字(第一役仍叫 ircc);interval=86400 / seed=False / ping=True / method="httpx" 两役照抄;
  fresh 保鲜契约连同键上 / 行上注释整块挂在第一役 ircc 上(保鲜闸扫全部域全部役的 fresh 并起来,挂哪一役都一样;
  raw/ircc/*.json 一条 glob 同时盖住 ircc_rules 落的规则库与规费表)。
原单役 META 的键上注释(逐字留档):
  interval 86400  日更当兜底(#128:官方月度发布,小时抓纯空转;批2 误写月更,2026-08-31 批F 修回)
  ping True       本角色的 healthchecks 心跳由本域发
"""
METAS = [
    {"name": "ircc", "role": "ircc", "only": "ircc", "method": "httpx", "interval": 86400, "seed": False,
     "ping": True,
     "fresh": [      # 保鲜契约(2026-08-31 批O:source_manifest 退役,行原样搬入;语义见 sched.K_FRESH)
         {"glob": "raw/ircc/*.json", "cadence_days": 2},   # 2026-09-26 Frank「最次也是日更」:原 4 天 → 2(日更一轮 +
                                                           # 一天余量,按日期差判,跨零点 / 一轮失败重试不误报);本域日更,
                                                           # 同目录的 allocation_watch / ns_allocations 由 pnp 小时更
         {"file": "raw/ircc/pnp_allocations.json", "cadence_days": 60, "key": "checkedAt",
          "note": "人工核对表(配额)"},
         {"file": "raw/ircc/levels_plan.json", "cadence_days": 60, "key": "checkedAt",
          "note": "人工核对表(移民水平计划;2026-09-15 补:原被上面通配规则按 fetched 判无戳,拖红心跳)"},
     ]},
    {"name": "ircc_rules", "role": "ircc_rules", "only": "ircc_rules", "method": "httpx", "interval": 86400,
     "seed": False, "ping": True},
]
"""本域两役(2026-09-26 晚拆,见文件头):
  ircc        stats → difficulty:IRCC 官方 XLSX 存量 / 流量 + 九省难度因子重算(纯算件,吃 stats 刚落的 raw;
              步骤见 main.UNITS)
  ircc_rules  pgwp → fees:联邦 PGWP 规则库 + 官方规费(quote-anchored / 交叉自校,不过即保留旧表 exit 1)
间隔一律 86400(照原单役 META)。"""

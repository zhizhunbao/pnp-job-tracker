"""
pnp 域:省提名(PNP)具名清单/门槛/分值/运营统计**实时刷新**(低频)。

一省一段实时抓省政府页 → raw/pnp/*.json(2026-08-30 批B 全溶:原 33 个 build_*/scrape_*/
watch_*/translate_* 步骤文件收进 functions.py 的 34 个段,域 = 五件)。
只刷 raw 参考表不灌库 —— build 角色每轮 08→09→seed 目录驱动消费(最终一致,不抢 mart/seed)。
复用 httpx 镜像(只需 httpx+bs4+pymupdf,不需浏览器:AB/BC/SK/NS 源站直连 200)。
沿革:原 etl/sources/pnp 役册(2026-08-29 批2 域即役并入);AIP/试点/DLI/哨兵各回本域。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/pnp/main.py,步骤清单在 main.py 里。
2026-09-26 晚改判(Frank「我他妈之前让你拆成多个 docker 你非的合一起」「其中一个失败,其余照跑?那我怎么知道这个失败」
→ 选「拆 + 每个单元配 ping」「一单元一容器」「抽选按省拆」):单役 META 拆成 METAS 二十役(一域多役,load 首例的形),
一役 = 一个调度单元 = 一个容器(SOURCE = 役名)= 一个 healthchecks 检查项(HEALTHCHECK_PING_<役名大写>);
入口同门不同 --only(= 役名,main.UNITS 整名命中),单元内一步失败即中止。原单役 META 各键逐条落进每一役:
  role="pnp" → 各役自己的名字;interval=3600 / seed=False / ping=True / method="httpx" 二十役照抄(沿革见下);
  fresh 保鲜契约挂在第一役 pnp_ab 上(保鲜闸扫全部域全部役的 fresh 并起来,挂哪一役都一样;raw/pnp/*.json 一条 glob
  即盖住九省抽选的 draws-<省>.json)。
原单役 META 的键上注释(逐字留档):
  interval 3600  1h(#128 Frank「都改成小时更,不知道什么时候有新数据」。批2 换轨时被写成周更
                 —— 域单元不吃 SCRAPE_INTERVAL,#128 拍板被静默回归两天;2026-08-31 批F 修回)
  seed False     只刷 raw 参考表,build 角色统一灌库(避免抢 mart/seed)
  ping True      2026-08-31 批D:ops 拆散,ping 权随 freshness 哨兵迁本域;
                 批O:哨兵再迁 sched 的 ping 门口(全域保鲜闸,任一持 ping 单元
                 发 ping 前都过闸),本域链尾只剩 watch 哨兵,ping 权保留
  fresh          保鲜契约(2026-08-31 批O:source_manifest 退役,行原样搬入;语义见 sched.K_FRESH)
"""
METAS = [
    {"name": "pnp_ab", "role": "pnp_ab", "only": "pnp_ab", "method": "httpx", "interval": 3600, "seed": False,
     "ping": True,
     "fresh": [
         {"glob": "raw/pnp/*.json", "cadence_days": 2},
         {"file": "raw/pnp/on-workforce-priority.json", "cadence_days": 60,
          "note": "人工核对表(官方公告后手改,Frank 抽查制)"},
         {"file": "raw/pnp/ab-eoi-points.json", "cadence_days": 60,
          "note": "人工核对表(AAIP Worker EOI 分值,161be8be 竞争卡批一次性核入,无生产者;"
                  "分值表极少变,变了随 AB 公告手改)"},
     ]},
    {"name": "pnp_bc", "role": "pnp_bc", "only": "pnp_bc", "method": "httpx", "interval": 3600, "seed": False,
     "ping": True},
    {"name": "pnp_sk", "role": "pnp_sk", "only": "pnp_sk", "method": "httpx", "interval": 3600, "seed": False,
     "ping": True},
    {"name": "pnp_mb", "role": "pnp_mb", "only": "pnp_mb", "method": "httpx", "interval": 3600, "seed": False,
     "ping": True},
    {"name": "pnp_ns", "role": "pnp_ns", "only": "pnp_ns", "method": "httpx", "interval": 3600, "seed": False,
     "ping": True},
    {"name": "pnp_nb", "role": "pnp_nb", "only": "pnp_nb", "method": "httpx", "interval": 3600, "seed": False,
     "ping": True},
    {"name": "pnp_nl", "role": "pnp_nl", "only": "pnp_nl", "method": "httpx", "interval": 3600, "seed": False,
     "ping": True},
    {"name": "pnp_pe", "role": "pnp_pe", "only": "pnp_pe", "method": "httpx", "interval": 3600, "seed": False,
     "ping": True},
    {"name": "pnp_on", "role": "pnp_on", "only": "pnp_on", "method": "httpx", "interval": 3600, "seed": False,
     "ping": True},
    {"name": "pnp_qc", "role": "pnp_qc", "only": "pnp_qc", "method": "httpx", "interval": 3600, "seed": False,
     "ping": True},
    {"name": "pnp_draws_ab", "role": "pnp_draws_ab", "only": "pnp_draws_ab", "method": "httpx", "interval": 3600,
     "seed": False, "ping": True},
    {"name": "pnp_draws_bc", "role": "pnp_draws_bc", "only": "pnp_draws_bc", "method": "httpx", "interval": 3600,
     "seed": False, "ping": True},
    {"name": "pnp_draws_mb", "role": "pnp_draws_mb", "only": "pnp_draws_mb", "method": "httpx", "interval": 3600,
     "seed": False, "ping": True},
    {"name": "pnp_draws_nb", "role": "pnp_draws_nb", "only": "pnp_draws_nb", "method": "httpx", "interval": 3600,
     "seed": False, "ping": True},
    {"name": "pnp_draws_nl", "role": "pnp_draws_nl", "only": "pnp_draws_nl", "method": "httpx", "interval": 3600,
     "seed": False, "ping": True},
    {"name": "pnp_draws_ns", "role": "pnp_draws_ns", "only": "pnp_draws_ns", "method": "httpx", "interval": 3600,
     "seed": False, "ping": True},
    {"name": "pnp_draws_on", "role": "pnp_draws_on", "only": "pnp_draws_on", "method": "httpx", "interval": 3600,
     "seed": False, "ping": True},
    {"name": "pnp_draws_pe", "role": "pnp_draws_pe", "only": "pnp_draws_pe", "method": "httpx", "interval": 3600,
     "seed": False, "ping": True},
    {"name": "pnp_draws_qc", "role": "pnp_draws_qc", "only": "pnp_draws_qc", "method": "httpx", "interval": 3600,
     "seed": False, "ping": True},
    {"name": "pnp_drawzh", "role": "pnp_drawzh", "only": "pnp_drawzh", "method": "httpx", "interval": 3600,
     "seed": False, "ping": True,
     "after": ["pnp_draws_ab", "pnp_draws_bc", "pnp_draws_mb", "pnp_draws_nb", "pnp_draws_nl", "pnp_draws_ns",
               "pnp_draws_on", "pnp_draws_pe", "pnp_draws_qc"]},
    {"name": "pnp_watch", "role": "pnp_watch", "only": "pnp_watch", "method": "httpx", "interval": 3600,
     "seed": False, "ping": True},
]
"""本域二十役(2026-09-26 晚拆,见文件头):
  pnp_ab … pnp_on     九省各一:该省清单 / 门槛 / 分值 / 统计(同一官方来源,步骤见 main.UNITS)
  pnp_qc              魁省:PSTQ / PEQ 门槛 + 年度移民计划(2026-09-29 立,Frank「不属于省提名 也算是省的吧」;
                      代码住 pnp/qc 子域,按省拆首例;加它之后本域二十一役)
  pnp_draws_ab … _qc  九省抽选各一(一省一份 raw/pnp/draws-<省>.json;任一页失败本单元失败、文件不动)
  pnp_drawzh          抽选流名中文灰注(本地 Ollama):消费者,盯九个抽选单元的轮次标记,兜底一小时;有流名没翻成即失败
  pnp_watch           名额公告哨兵(只读配额表 / crawl 缓存 / news,不发请求)
间隔一律 3600(Frank 保鲜标准「其他最次也是日更」,本域向来小时更)。"""

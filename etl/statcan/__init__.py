"""
statcan 域:StatCan WDS 表 → raw(2026-09-06 立域)。

回答什么问题:**加拿大官方统计口径的宏观刻度现在是多少**(分省可比、按期序列)——
人口 / 临时居民 / GDP / 失业率四张 WDS 表,一表一文件落 raw/statcan/<pid>.json;
另有两张老表(NPR 占总人口比、分省临时居民存量)自 ircc 域整段搬入,**产物路径不动**
(raw/ircc/npr_share.json 与 raw/ircc/statcan_tr_prov.json,消费端一个字不用改)。

边界(切法 = 「谁家的数据」而不是「谁在用」):ircc 域管 IRCC 开放数据(许可存量/流量、
PGWP、规费、难度指数),本域管 StatCan WDS;两家口径不可混列(StatCan=常住估算,
IRCC=有效许可持有人),分域正好把这条红线摆在目录边界上。
寿命:跟 StatCan WDS 走(免密钥 REST,比任何消费页活得久);谁都不依赖本域函数,
只读本域产物文件(依赖只指向活得更久的那个:mart → 文件)。

META = 域即役的调度声明:role=挂哪个角色容器(SOURCE 环境变量),interval=本域一轮的间隔秒;
入口固定 etl/statcan/main.py,步骤清单在 main.py 里。
2026-09-26 晚改判(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」「一单元一容器」,
pnp 同批同形):单役 META 拆成 METAS 两役(一域多役,load 首例的形),一役 = 一个调度单元 = 一个容器(SOURCE = 役名)
= 一个 healthchecks 检查项(HEALTHCHECK_PING_<役名大写>);入口同门不同 --only(= 役名,main.UNITS 整名命中),
单元内一步失败即中止。原单役 META 各键逐条落进每一役:
  role="statcan" → 各役自己的名字(第一役仍叫 statcan);interval=86400 / seed=False / ping=True / method="httpx" 两役照抄;
  fresh 保鲜契约连同键上 / 块内注释整块挂在第一役 statcan 上(保鲜闸扫全部域全部役的 fresh 并起来,挂哪一役都一样;
  raw/statcan/*.json 一条 glob 同时盖住 statcan_naics 落的 naics.json)。
原单役 META 的键上注释(逐字留档):
  role "statcan"  一域一容器(docker-compose 的 statcan service)
  interval 86400  日更当兜底(StatCan 按期发布:季度表一季一次、月度表一月一次)
  ping True       本角色的 healthchecks 心跳由本域发
"""
METAS = [
    {"name": "statcan", "role": "statcan", "only": "statcan", "method": "httpx", "interval": 86400, "seed": False,
     "ping": True,
     "fresh": [      # 保鲜契约(语义见 sched.K_FRESH;两张老表的条目自 ircc 域 META 搬来,路径不变)
         # 2026-09-26 Frank「最次也是日更」:三条原 8 天 → 2(本域日更一轮 + 一天余量;同日 TLS 1.2 封顶修掉握手断连、
         # 门改每步兜住、naics 进链,之后才压 —— 不修先压 = city_macro / naics 当场红)
         {"glob": "raw/statcan/*.json", "cadence_days": 2},
         {"file": "raw/ircc/npr_share.json", "cadence_days": 2},
         {"file": "raw/ircc/statcan_tr_prov.json", "cadence_days": 2},
     ]},
    {"name": "statcan_naics", "role": "statcan_naics", "only": "statcan_naics", "method": "httpx",
     "interval": 86400, "seed": False, "ping": True},
]
"""本域两役(2026-09-26 晚拆,见文件头):
  statcan        npr_share → tr_prov → cubes → city:两张老表 + 四张宏观表 + 城市刻度(步骤见 main.UNITS)
  statcan_naics  naics:NAICS 类目表 → raw/statcan/naics.json(分类标准五年一修;换版时自校拦,只红本役)
间隔一律 86400(照原单役 META)。"""

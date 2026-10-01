"""
company 域:公司实体(目录穷举/一司一档/careers 定位/官网富化)。
定时单元 2026-09-05 起 = 把脉页雇主数据链四步(places/sites/about/brief,见 main.SCHEDULED);
老官网富化(E8-04 enrich 役)退为手动件;Kanata 三件是休眠引导工具,手动跑。
产出 company_enrich.json,build 角色下一轮 09 自然合并进 companies。
2026-08-31 批J 再收一件手动件:雇主 D 富化(行业 + 中韩别名 + 知名,原
clean/_enrich_company_facts.py),产 company_facts.json;Wikidata 那半边已退役,别批量跑。

METAS = 域即役的调度声明(2026-08-29 批2;2026-09-20 起一域两役:enrich 例行链 + findsite 点开优先):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/company/main.py,步骤清单在 main.py 里。
2026-09-26 晚改判(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」「一单元一容器」,
pnp 同批同形):enrich 例行链一役拆成三役(一域四役),一役 = 一个调度单元 = 一个容器(SOURCE = 役名)= 一个 healthchecks
检查项(HEALTHCHECK_PING_<役名大写>);入口同门不同 --only(= 役名,main.UNITS 整名命中),单元内一步失败即中止。
原 company 役(name company / role enrich / only 空串 = 默认链)各键逐条落进三役:name / role / only → 各役自己的名字;
method "httpx" / interval 21600 / seed False / ping True 三役照抄;原条目键上的两条注释(6h 一轮的理由、ping 那句)
逐字留在 enrich_about 的对应键上(6h 那条讲的 brief 400 家 ≈ 4.5h 正是这一役)。findsite 役原样不动。
"""
METAS = [
    # 2026-10-01 enrich_places 役撤编(Frank「补公司信息用本地 Opus 做,让 Opus 判断是否调用 google places 免费额度」
    # 「google 那个后台自动查询 删了吧」):定时容器月界按 UTC 判当月,9 月超额 CA$87.39(见 constants.PT_OFFSETS_H)。
    # places 步留作手动件(main.TOOLS,`PLACES_SLUGS=a,b --only places` 点名查)。原条目逐字留档:
    #   {"name": "enrich_places", "role": "enrich_places", "method": "httpx",
    #    "interval": 21600,        # 6h(照抄原 company 役,理由见 enrich_about 的同键)
    #    "seed": False,
    #    "ping": True,   # 本角色的 healthchecks 心跳由本域发(照抄原 company 役)
    #    "only": "enrich_places"},
    {
        "name": "enrich_sites",
        "role": "enrich_sites",
        "method": "httpx",
        "interval": 21600,        # 6h(照抄原 company 役,理由见 enrich_about 的同键)
        "seed": False,
        "ping": True,   # 本角色的 healthchecks 心跳由本域发(照抄原 company 役)
        "only": "enrich_sites",
    },
    {
        "name": "enrich_about",
        "role": "enrich_about",
        "method": "httpx",
        "interval": 21600,        # 6h 一轮(brief 400 家 ≈ 4.5h 压在一轮内;官网快照不需要小时级新鲜度)
        "seed": False,
        "ping": True,   # 本角色的 healthchecks 心跳由本域发
        "only": "enrich_about",
        "after": ["enrich_sites"],  # 2026-09-26 晚拆单元时补(子工核出):about 读 sites 当轮刚找到的官网;原链同轮先 sites 后 about,
                                    # 拆开后改由 enrich_sites 每轮完成的标记触发(pnp_drawzh 同法),6h 兜底照旧
    },
    {
        "name": "findsite",
        "role": "findsite",       # 点开优先的查找官网(2026-09-20;一域多役,load 先例):被真人点开过、没官网 / 官网已死 / 官网名字对不上的公司,
                                  # 阶梯 帖内线索 → Wikidata → Google(只在本机)→ Bing → DDG;设计稿 docs/design/点开优先抓取与纠错-20260920.md
        "method": "browser",
        "interval": 60,           # 1 分钟一轮(公司卡 15 秒来问一次进度;没活的那一轮只是一次取活请求,不起浏览器)
        "seed": False,
        "ping": True,
        "only": "findsite",
    },
]
"""本域四役(2026-09-26 晚把原 company 役拆成三个 enrich_*,见文件头):
  enrich_places  places:Google Places 查官网 / 地址 / 业务类型(预算由当月免费额度封顶;步骤见 main.UNITS)
                 —— 2026-10-01 撤编,places 改手动点名(见 METAS 上的留档注释)
  enrich_sites   sites → wikihq:补官网 + 维基总部兜底(两步同打 Wikidata,同一单元串行 = 错开不叠)
  enrich_about   about → brief:官网正文进 crawl 层,brief 读它出五节简介
  findsite       点开优先的查找官网(2026-09-20 立,原样不动;走 TOOLS 单件 --only findsite,不进 UNITS)
单元名不叫 enrich:main.TOOLS 里已有 enrich 手动件(老官网富化),UNITS 整名匹配在前,同名会遮住它。"""

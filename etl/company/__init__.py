"""
company 域:公司实体(目录穷举/一司一档/careers 定位/官网富化)。
定时单元 2026-09-05 起 = 把脉页雇主数据链四步(places/sites/about/brief,见 main.SCHEDULED);
老官网富化(E8-04 enrich 役)退为手动件;Kanata 三件是休眠引导工具,手动跑。
产出 company_enrich.json,build 角色下一轮 09 自然合并进 companies。
2026-08-31 批J 再收一件手动件:雇主 D 富化(行业 + 中韩别名 + 知名,原
clean/_enrich_company_facts.py),产 company_facts.json;Wikidata 那半边已退役,别批量跑。

METAS = 域即役的调度声明(2026-08-29 批2;2026-09-20 起一域两役:enrich 例行链 + findsite 点开优先):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/company/main.py,步骤清单在 main.py 里。
"""
METAS = [
    {
        "name": "company",
        "role": "enrich",
        "method": "httpx",
        "interval": 21600,        # 6h 一轮(brief 400 家 ≈ 4.5h 压在一轮内;官网快照不需要小时级新鲜度)
        "seed": False,
        "ping": True,   # 本角色的 healthchecks 心跳由本域发
        "only": "",
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

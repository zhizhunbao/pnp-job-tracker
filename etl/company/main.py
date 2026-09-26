"""
company 域唯一入口(一域一门;步骤 2026-08-30 全溶进 functions.py,本门直调函数,
不再 subprocess —— 全溶域的门形,样张;未溶域仍走 _steps 跑步器)。

默认链只有官网富化(唯一定时步,挂 enrich 角色 6h);Kanata 三件与雇主 D 富化(2026-08-31
批J 自 clean/_enrich_company_facts.py 归户)是休眠引导/手动工具,不进默认链 ——
语义与旧役册完全一致。
一律从仓库根执行:
    python etl/company/main.py                 # 默认链(places → sites → wikihq → about → brief)
    python etl/company/main.py --only kanata   # 手动件:kanata / folders / careers / facts
    BROWSER_CHANNEL=chrome python etl/company/main.py --only unblock   # 本机搜总部放行台(http://127.0.0.1:8787)

⚡ 2026-09-26 晚改判(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」「一单元一容器」):
默认链五步拆成三个调度单元(UNITS:enrich_places / enrich_sites / enrich_about),一单元一容器一 ping,
容器跑 `--only <单元名>`,单元内一步失败即中止(door 叶);findsite 役照旧走 TOOLS 单件。
SCHEDULED 不再是调度真相,只剩手动全跑;调度声明仍在 __init__ 的 METAS(由两役改为四役,一单元一条)。
    python etl/company/main.py --only enrich_about   # 跑一个单元(容器就是这么跑的)
"""
import sys
from itertools import chain
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from company.functions import (
    build_company_briefs, build_company_folders, crawl_company_about, enrich_company_facts,
    enrich_company_websites, lookup_company_places, lookup_sponsor_websites, scrape_company_careers,
    find_opened_sites, locate_career_entries, lookup_wiki_hq, serve_hq_desk,
    scrape_kanata_directory,
)

UNITS = {
    "enrich_places": [("places", lookup_company_places)],
    "enrich_sites": [("sites", lookup_sponsor_websites), ("wikihq", lookup_wiki_hq)],
    "enrich_about": [("about", crawl_company_about), ("brief", build_company_briefs)],
}
"""调度单元(调度真相,2026-09-26 晚立;Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」
「一单元一容器」,pnp 同批同形)。一单元 = 一个容器(SOURCE = 单元名)= 一个 healthchecks 检查项;
容器跑 `python etl/company/main.py --only <单元>`,单元内按序跑、**一步失败即中止**(door 叶),哪个单元坏了哪个 ping 红。
声明(role / interval / ping)在 __init__ 的 METAS。
切法:places 独占一单元(Google Places,预算由当月免费额度封顶);sites 与 wikihq 两步同打 Wikidata,同一单元串行
才错开不叠(原链紧挨着排的由头);about 正文进 crawl 层、brief 读它,同生共死。单元之间只经产物文件衔接:
about 的候选含 sites 刚找到、还没合并进库的官网(读 sites 落的缓存),拆开后读到的是 enrich_sites 最近一轮的。
单元名不叫 enrich:TOOLS 里已有 enrich 手动件(老官网富化),整名匹配在前,同名会遮住它。
findsite(点开优先,1 分钟一轮)是 __init__ 的另一役,走 TOOLS 单件 `--only findsite`,不进 UNITS;
其余手动件(kanata / folders / careers / entries / enrich / facts / unblock)不进任何单元。"""

SCHEDULED = list(chain.from_iterable(UNITS.values()))
"""默认链(不带参数跑 = 各单元的步按 UNITS 顺序拼成一串;一步失败即中止)。
2026-09-26 晚改判:容器不再跑这条链(每个容器只跑自己那个单元,见 UNITS);它只剩「手动全跑一遍」这个用途,
步序与改判前逐项相同(places → sites → wikihq → about → brief),下面原文保留 —— 只是分进了各单元。
原文:默认链(调度真相):按序执行,一步抛错即中止本轮(_steps 同款语义)。
2026-09-05 Frank「不花钱就跑呗」「最好能定时跑」:把脉页雇主数据链四步进链(Places 两档只吃当月免费额、
搜索每轮 Google 25 家 / DDG 60 家、正文 400 家、qwen 简介 400 家),enrich 容器亮回;老 enrich 步(首页 meta 简介)退出默认链
留作手动件 —— about 步抓的正文盖过它,且两步都打 DDG 会双倍撞限流。
2026-09-20 wikihq 进链(紧跟 sites,两步都打 Wikidata、错开不叠):官网没标总部的公司查「总部所在地」,一轮 ≤200 家约半小时;
挂本役不另开域的由头 = 它用的就是本域那套 Wikidata 查询与严格名字闸(行为不许复制到别的域)。
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
同日晚改判回一步失败即中止(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):门叶改回 fail-fast,本门一字不改;互不相干的步拆成各自的调度单元(各自容器、各自 ping)。
"""

TOOLS = {
    "kanata": scrape_kanata_directory,
    "folders": build_company_folders,
    "careers": scrape_company_careers,
    "entries": locate_career_entries,
    "enrich": enrich_company_websites,
    "facts": enrich_company_facts,
    "places": lookup_company_places,
    "sites": lookup_sponsor_websites,
    "about": crawl_company_about,
    "brief": build_company_briefs,
    "wikihq": lookup_wiki_hq,
    "findsite": find_opened_sites,
    "unblock": serve_hq_desk,
}
"""全部可 --only 点名的步(含休眠引导工具)。

  facts  雇主 D 富化(行业多数派 + Wikidata 中韩别名/知名);2026-08-31 批J 自
         clean/_enrich_company_facts.py 归户全溶(判据:逐公司抓数据 = 公司域的活)。
         ⛔ Wikidata 那半边已退役(#109/#111),别再批量跑;行业那半边可手动重跑。
         **不进默认链**,与 Kanata 三件同属手动件。

  places 雇主官网/地址/业务类型查询(2026-09-04 Frank「帮我开」Google Places):在招担保
         雇主限量查,每家约 3.5 美分,密钥读 GOOGLE_PLACES_KEY;**不进默认链**(公司级数据
         懒查询禁批量预抓),放量改 constants.PLACES_LIMIT。

  sites  在招担保雇主补官网(2026-09-04 Frank「走 DuckDuckGo 跑起来」):复用 enrich 的
         D2 阶梯(JD 线索 → Wikidata 官网属性 → 搜索),免费,命中记 found 进 company_enrich.json
         等 build 合并;只补各大类前 PULSE_RANK_MAX 名。2026-09-09 Frank「能用 wiki 尽量用 wiki」:
         Google Custom Search JSON API 对新项目已关闭,Wikidata 成主力(每轮 WIKI_LIMIT),搜索兜底
         (有 GOOGLE_CSE_KEY/CX 走 Google,缺席退 DDG)。

  about  官网正文(2026-09-05 Frank「可以」):首页 + About 页原文进 crawl 层,剥标签裁长;
         预算 constants.ABOUT_LIMIT。手动件。2026-09-08 起前 PULSE_RANK_MAX 名 403 / 验证壳 /
         JS 壳走 crawl 域有头浏览器兜底(company 容器改用 crawl 重镜像)。
  brief  五节简介:about 正文 → 本地 qwen 五节英文 + 中文(NEWS_LLM_BASE 盒子);
         预算 constants.BRIEF_LIMIT。手动件;产出由 build 汇装进 companies.ai_brief。

  wikihq 维基总部兜底(2026-09-20 Frank「官网没标总部的公司用 Wikidata P159」):sites 域官网整理成了、总部一节却没有的公司,
         按名查 Wikidata「总部所在地」→ 市 / 省 + 条目链接,落 company_wiki_hq.json 等 build 汇装(官网的总部优先)。

  unblock 搜总部放行台(2026-09-22 Frank「专门弄个本地服务 我来处理这些问题」):本机开 http://127.0.0.1:8787,
         列容器撞上人机验证的落地页(company_hq_blocked.json);点「放行」在统一 profile 窗口里打开,Frank 过验证,
         过了当场存原文进 crawl 层、抽总部写 company_search_hq.json。本机跑,要 BROWSER_CHANNEL=chrome 与 NEWS_LLM_BASE;
         同一 profile 同一时刻只许一个进程开,用完 Ctrl+C 收摊让位。

⚠ --only 是子串匹配:facts/places/sites/about/brief 与既有键互不误命中(逐对核过)。
"""


def main() -> int:
    """跑默认链、点名的调度单元(UNITS,名字整名命中;容器走这条)或 --only 点名的单步;返回进程退出码。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        if args[1] in UNITS:
            return run_steps(UNITS[args[1]])
        picked = []
        for k, f in TOOLS.items():
            if args[1] in k:
                picked.append((k, f))
        if len(picked) == 0:
            say(f"✗ --only {args[1]} 没命中(可选:{'/'.join(TOOLS)})")
            return 1
        todo = picked
    else:
        todo = SCHEDULED
    return run_steps(todo)


if __name__ == "__main__":
    sys.exit(main())

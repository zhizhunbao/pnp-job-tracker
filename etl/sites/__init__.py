"""
sites 域:有官网的在招公司,定期把官网原文缓存到本地,再由局域网模型整理成事实
(2026-09-19 立域;Frank「有官网的公司,我是不是应该定期抓取 etl 啊,这样就不用 AI 探索内容,AI 只做整理」
「官网不光是总部,还是他的业务 以及 其他用户想知道的内容」「不能先把对应的官网先缓存到本地吗 html」)。

回答的问题:「这家公司的官网自己怎么说 —— 做什么、总部在哪、多大、哪年成立 / 谁家的、还在哪有办公点、
对新移民 / 外籍员工什么态度、福利与怎么投」。设计稿 docs/design/公司官网定期抓取-20260919.md(七节 Frank 09-19 拍)。

两步:fetch(每家抓首页 + Contact + About 三页,原文进 crawl 层 data/crawl/site-<slug>/,写门 crawl.put_cached_page)
→ facts(读缓存原文 → 局域网 qwen 只凭页面文字整理七节,**每一节必须附页面原句,程序回页面核对原句真的在,核不上这一节作废**)
→ 落 processed/sites/facts.json。模型只搬运不探索:网关的联网搜索自 09-11 起被搜索引擎拦成 0 结果,
靠联网现查的简介 39% 零出处(SOTI 总部被写成 Ottawa,真身 Mississauga);这条线不依赖联网搜索。

范围(Frank 09-19 批):有官网 且 当前有在招岗的公司(约 1.5 万家),每月一轮;在招岗多的在前。
与「公司级数据一律懒查询,禁批量预抓」的关系:Frank 同日对**有官网的公司**改判为定期抓,没官网的仍走懒查询。

META = 域即役的调度声明:role=挂哪个角色容器(SOURCE 环境变量),interval=本域一轮的间隔秒;
入口固定 etl/sites/main.py,步骤清单在 main.py 里。
"""
import os

FETCH_LIMIT = os.environ.get("SITES_FETCH_LIMIT", "200")
"""每轮最多抓多少家官网(一家 3 页、同主机间隔 1 秒,约 6~10 秒一家:200 家 ≈ 半小时)。
本地验收可压小(SITES_FETCH_LIMIT=5)。"""

FACTS_LIMIT = os.environ.get("SITES_FACTS_LIMIT", "200")
"""每轮最多整理多少家(盒子实测一家 4~11 秒:200 家 ≈ 半小时;盒子还要给整理版 / 译名 / 分类用)。
本地验收可压小(SITES_FACTS_LIMIT=5)。"""

META = {
    "role": "sites",
    "method": "httpx",       # 对应 etl/sched/Dockerfile 通用轻镜像(抓公司官网 + 打局域网 Ollama,无浏览器)
    "interval": 3600,        # 1h 一轮,每轮抓 200 家 + 整理 200 家:首轮 1.5 万家约三四天追平,之后按 30 天刷新期滚动
    "seed": False,           # 只刷 crawl/ 与 processed/sites/,灌库归 load 域 build 链
    "ping": True,            # 本角色唯一单元
}

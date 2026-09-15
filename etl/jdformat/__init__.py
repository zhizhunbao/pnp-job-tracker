"""
jdformat 域:岗位正文 → 五节整理版预生成(2026-09-15 立域;Frank「就是抓工作的之后,同时跑整理版不就行了吗」
「也算 etl 的一部分」)。

回答的问题:「一条岗的五节整理版从哪来」。此前只有一条来路 —— 用户(或 Googlebot 的 JS 渲染)点开岗页,
cms /api/jobs/jdformat 现打朋友网关懒生成,落 jobs.jd_formatted;正文区 2026-09-14 起只出整理版(原文乱,
Frank 拍板不出原文),于是没被点开过的岗对爬虫就是一页转圈(Search Console 塌方两段病因之二)。
本域把它变成数据层的常规产物:读 mart/jobs.json 里在招且有正文的岗,按发布时间新→旧过局域网 qwen
(NEWS_LLM_BASE 那台盒子;批量不烧朋友网关,CLAUDE.md「批量翻译走本地模型」),校验通过的落
processed/jdformat/formatted.json;mart 汇装并进 jobs 行的 jdFormatted / jdFormattedAt 两列(缺整理版的岗
不落键,seed 侧 COALESCE 保留线上懒生成版)。提示词与校验口径的主人是 cms lib/jobs(prompts.ts /
functions.ts),本域逐字镜像 —— 两方言无法共用一份源,改一处必同改另一处
(docs/design/整理版预生成-20260915.md)。

META = 域即役的调度声明:role=挂哪个角色容器(SOURCE 环境变量),interval=本域一轮的间隔秒;
入口固定 etl/jdformat/main.py,步骤清单在 main.py 里。
"""
import os

FORMAT_LIMIT = os.environ.get("JDFORMAT_LIMIT", "400")
"""每轮最多整理多少条(盒子实测 qwen3.6 一条 5.7k 字原文约 11 秒:400 条 ≈ 1 小时 = 一个 interval;
存量在招岗约 6 万条一周追平,之后每天新帖 2~3 千条一轮内消化)。本地验收可压小(JDFORMAT_LIMIT=3);
形同 jobboom 域的 DETAILS_PER_RUN。"""

META = {
    "role": "jdformat",
    "method": "httpx",       # 对应 etl/sched/Dockerfile 通用轻镜像(只打局域网 Ollama,无浏览器)
    "interval": 3600,        # 1h(全站抓岗节奏;build 每小时汇装一次,本域产物下一轮汇装即入 mart)
    "seed": False,           # 只刷 processed/,灌库归 load 域 build 链
    "ping": True,            # 本角色唯一单元
}

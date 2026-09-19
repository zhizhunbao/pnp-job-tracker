"""
explore 域:雇主探索队列的后台工人(2026-09-18 立域;Frank「雇主有个探索列表,用户列出过哪些雇主,就自动从那个表里翻译,
类似于处理消息」)。

回答的问题:「被用户在雇主板上看过的雇主,名字的中 / 韩文叫什么」。队列在生产库的 employer_explore 表
(docs/sql/employer-explore-20260918.sql):雇主板在中 / 韩文界面下把列出来的雇主报进队;本域像消费消息一样
取活(GET /api/employers/explore/todo)→ 过局域网 qwen(NEWS_LLM_BASE 那台盒子;批量翻译走本地模型,不烧付费 API)
→ 交活(POST /api/employers/explore/done)。模型顺带判「这是不是一个人的名字」—— 是的标 skip(雇保姆 / 护工的
私人雇主,音译没有信息量,板上不显示)。没人看过的雇主永远不翻(Frank 铁律:公司级数据懒查询,禁批量预抓)。
数据层照旧不直连生产库:取活 / 交活走带 x-seed-token 的 cms 接口(与上传 mart 同一把钥匙,站点根从 SEED_URL 反推)。
本域不产 data/ 下的文件 —— 队列与结果都在库里。找官网(付费模型)不在本域,等翻译这条跑顺了再作为第二个工种议。

META = 域即役的调度声明:role=挂哪个角色容器(SOURCE 环境变量),interval=本域一轮的间隔秒;
入口固定 etl/explore/main.py,步骤清单在 main.py 里。
"""
import os

TAKE_LIMIT = os.environ.get("EXPLORE_LIMIT", "100")
"""每轮最多取多少条待办(盒子实测一个名字约 2~3 秒:100 条约 5 分钟,压在一个 interval 内;
cms 侧封顶 EXPLORE_TAKE_MAX = 300)。本地验收可压小(EXPLORE_LIMIT=3)。"""

META = {
    "role": "explore",
    "method": "httpx",       # 对应 etl/sched/Dockerfile 通用轻镜像(只打 cms 接口与局域网 Ollama,无浏览器)
    "interval": 60,          # 1 分钟一轮(2026-09-19 由 600 改:Frank「我不想在刷新一下页面,才显示 中文灰字。我需要他自动显示」——
                             # 板上开着的那一页每 15 秒来问一次译名,工人一分钟一轮,列出来一两分钟内灰字自己补上;
                             # 没活的那一轮只是一次取活请求,不打模型)
    "seed": False,           # 不产 mart,不灌库(结果经接口直接落队列表)
    "ping": True,            # 本角色唯一单元
}

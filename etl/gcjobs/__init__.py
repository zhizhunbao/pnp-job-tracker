"""
gcjobs 域:GC Jobs(emploisfp-psjobs.cfp-psc.gc.ca,联邦公务员招聘,PSC 运营)公开岗位抓取 ——
搜索结果分页枚举 → 岗位页原文落 crawl 层 → 字段表格抽字段落 raw → 归一成 Job Bank 仓同形的 postings 仓(processed)。

为什么接(2026-09-13 Frank「那 GC Jobs 接一下吧」):联邦政府是渥太华最大雇主,岗全在这站不上 Job Bank,
站上渥太华 877 条在招被明显低估;学生项目(FSWEP / 研究生招聘 / 研究助理)与「open to persons residing in Canada」
的岗留学生也能投;联邦全职 offer 是最硬的省提名材料之一。
怎么接(2026-09-13 实测,调研稿 docs/design/招聘板调研-20260906.md 第 22 行原判「JS 壳,三级浏览器兜底」作废):
页壳 149KB 只是空壳,正文由页内脚本再拉一次「同 URL + isSecondPartOfPage=1」—— httpx 带 cookie 会话照抄这一手
即可直取,不用浏览器;会话 id 嵌在路径 `;jsessionid=…`,翻页 `?requestedPage=N&fromPage=N-1&tab=1&log=false`
与正文标一起发。公开搜索 20 页 × 20 帖 ≈ 400 帖;岗位页两种:站内全文(Reference number / Location / Salary /
Who can apply / 各节)与站外跳转(雇主自家站,页上只给外链)。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/gcjobs/main.py,步骤清单在 main.py 里。

@author Frank
@time 2026-09-13
"""
import os

DETAILS_PER_RUN = os.environ.get("DETAILS_PER_RUN", "1000")
"""每轮最多抓多少张岗位页(全站公开帖约 400 张,首轮一次抓完;之后只抓列表里的新帖号)。"""

META = {
    "role": "gcjobs",
    "method": "httpx",       # 对应 etl/sched/Dockerfile 通用轻镜像(会话式 httpx 直取,无墙)
    "interval": 3600,        # 1h(2026-08-31 Frank「都改成小时更新也不费劲」,新域沿用)
    "seed": False,           # 抓取源只刷 raw/processed,不灌库(灌库归 load 域 build 链)
    "ping": True,            # 本角色唯一单元
}

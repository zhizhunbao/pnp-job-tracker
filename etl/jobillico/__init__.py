"""jobillico 域:Jobillico(jobillico.com)全国职位板抓岗 —— 站点地图枚举 → 详情页原文落 crawl 层
→ ld+json JobPosting 抽字段落 raw → 归一成 Job Bank 仓同形的 postings 仓(processed)。

为什么接它(2026-09-06 Frank「两站都接」,调研见 docs/design/招聘板调研-20260906.md):
站点地图列 3.5 万条,来自 2,282 家雇主的 ATS 喂帖(Fraser Health/AHS/Home Depot/BMO 这类全国
大雇主),抽样对 Job Bank 同省零重复;搜索页是 JS 渲染抓不到,站点地图 + 详情页 ld+json 是它
给爬虫留的正门(robots 只禁 /ajax/ 与深分页参数)。「从源头接」实测不划算:头部 14 家用
iCIMS/Oracle HCM/BrassRing/SuccessFactors/Phenom 各一套,ats 域只会 7 家厂商;Jobillico 已把
两千多家归一成同一份 JobPosting,它就是归一后的源头。
与 jobboom 域一站一域(Frank 拍板),两域同形不共码。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/jobillico/main.py,步骤清单在 main.py 里。
"""
import os

DETAILS_PER_RUN = os.environ.get("DETAILS_PER_RUN", "3000")
"""每轮最多抓多少张详情页(首轮 3.5 万张分十几轮跑完;之后只抓站点地图里的新帖号)。
本地验收可压小(DETAILS_PER_RUN=200);形同 jobbank 域的 SINCE_DAYS。"""

META = {
    "role": "jobillico",
    "method": "httpx",       # 对应 etl/sched/Dockerfile 通用轻镜像(详情页 httpx 直取,无墙)
    "interval": 3600,        # 1h(2026-08-31 Frank「都改成小时更新也不费劲」,新域沿用)
    "seed": False,           # 抓取源只刷 raw/processed,不灌库(灌库归 load 域 build 链)
    "ping": True,            # 本角色唯一单元
}

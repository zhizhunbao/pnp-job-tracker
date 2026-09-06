"""jobboom 域:Jobboom(jobboom.com)雇主直发岗抓取 —— 站点地图枚举(剔 Job Bank 转载)→ 详情页原文
落 crawl 层 → ld+json JobPosting 抽字段落 raw → 归一成 Job Bank 仓同形的 postings 仓(processed)。

为什么接它、为什么剔(2026-09-06 Frank「两站都接,Jobboom 剔 Job Bank 转载」,调研见
docs/design/招聘板调研-20260906.md):英文站点地图 dynamic-en.xml 列 24,901 条,其中 21,433 条
(86%)是 Job Bank 转载(URL 雇主段 = job-bank,hiringOrganization 写 Job Bank,申请链接直指
jobbank.gc.ca)—— 库里已有,全剔;剩 3,468 条雇主直发(RONA 等,另有 Robert Half 一类中介由
mart 现有规则过滤),抽样对 Job Bank 同省零重复。详情页 ld+json 与 Jobillico 同形但没有薪资块与街道。
与 jobillico 域一站一域(Frank 拍板),两域同形不共码。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/jobboom/main.py,步骤清单在 main.py 里。
"""
import os

DETAILS_PER_RUN = os.environ.get("DETAILS_PER_RUN", "3000")
"""每轮最多抓多少张详情页(直发帖约 3.5k,首轮两轮跑完;之后只抓站点地图里的新帖号)。
本地验收可压小(DETAILS_PER_RUN=200);形同 jobbank 域的 SINCE_DAYS。"""

META = {
    "role": "jobboom",
    "method": "httpx",       # 对应 etl/sched/Dockerfile 通用轻镜像(详情页 httpx 直取,无墙)
    "interval": 3600,        # 1h(2026-08-31 Frank「都改成小时更新也不费劲」,新域沿用)
    "seed": False,           # 抓取源只刷 raw/processed,不灌库(灌库归 load 域 build 链)
    "ping": True,            # 本角色唯一单元
}

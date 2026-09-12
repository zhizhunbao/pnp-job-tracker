"""careerbeacon 域:CareerBeacon(careerbeacon.com)大西洋四省岗位抓取 —— 省列表页分页枚举
→ 详情页原文落 crawl 层 → ld+json JobPosting 抽字段落 raw → 归一成 Job Bank 仓同形的 postings 仓(processed)。

为什么接它、为什么只收四省(2026-09-11 拍板,调研见 docs/design/招聘板调研-20260906.md):
CareerBeacon 是大西洋本土板,NS/NB/NL/PE 四省列表页合计约 494 页 × 25 岗 ≈ 1.2 万条本地直发帖,
是 Job Bank 之外大西洋岗的最大增量(AIP 指定雇主的招聘主场);站上其余约 8 万全国岗是聚合喂料,
不接。枚举不走站点地图(它不开职位子图),走四个省列表页分页;详情页 ld+json JobPosting 带
发布日、截止日、城市邮编、薪资区间与单位、工时。岗位语言是英文,不需要 jobillico 那步法译英。
与 jobillico / jobboom 一站一域(Frank 拍板),三域同形不共码。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/careerbeacon/main.py,步骤清单在 main.py 里。

@author Frank
@time 2026-09-11
"""
import os

DETAILS_PER_RUN = os.environ.get("DETAILS_PER_RUN", "3000")
"""每轮最多抓多少张详情页(首轮约 1.2 万张分四五轮跑完;之后只抓列表页里的新帖号)。
本地验收可压小(DETAILS_PER_RUN=200);形同 jobbank 域的 SINCE_DAYS。"""

META = {
    "role": "careerbeacon",
    "method": "httpx",       # 对应 etl/sched/Dockerfile 通用轻镜像(列表/详情页 httpx 直取,无墙)
    "interval": 3600,        # 1h(2026-08-31 Frank「都改成小时更新也不费劲」,新域沿用)
    "seed": False,           # 抓取源只刷 raw/processed,不灌库(灌库归 load 域 build 链)
    "ping": True,            # 本角色唯一单元
}

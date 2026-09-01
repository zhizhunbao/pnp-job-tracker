"""jobbank 域:Job Bank(jobbank.gc.ca)全加拿大全职业抓岗 —— 全站职位板的主源。

抓取只落 raw 原始 HTML 快照(listing 一轮 + 详情一轮),解析下沉 clean/ 横切层
合并进 processed/jobbank/postings.json;公司档(build_jobbank_companies)是本域的
build —— 2026-08-31 Frank「build 应该每个域自己管自己的」,谁的数据谁管。
2026-08-31 批F 立域(搬家批):三个抓岗件自编号主管线迁入改名,META 自
sources/jobbank 役册搬来(docs/design/etl分域-20260829.md §7 拍板点 8)。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/jobbank/main.py,步骤清单在 main.py 里。
"""
import os

SINCE_DAYS = os.environ.get("SINCE_DAYS", "3")
"""增量窗口天数(只抓最近 N 天的新帖)。抓取与解析两步共用同一个值,cutoff 才对得上;
2026-08-31 批F 自旧 sources/jobbank 役册顶上那行原样搬进本域。"""

META = {
    "role": "jobbank",
    "method": "httpx",       # 对应 etl/Dockerfile 通用轻镜像(批N 自 docker/etl/httpx/ 迁入)
    # 沿革(2026-08-31 批F):旧役册 META 写 7200(2h),但 docker-compose 的
    # SCRAPE_INTERVAL=3600 一路压过它 —— 单轨后没有覆盖层了(域单元不吃
    # SCRAPE_INTERVAL),这里写现役生效值 1h,调度节奏与迁移前逐分钟相同
    "interval": 3600,
    "seed": False,           # 抓取源只刷 raw,不灌库(灌库归 build 角色)
    "ping": True,            # 本角色唯一单元,沿袭旧役册单元 ping 恒 True 的行为
}

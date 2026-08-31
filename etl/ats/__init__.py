"""ats 域:Kanata 公司第一方 ATS(greenhouse/lever/bamboohr/recruitee/smartrecruiters/
workable/workday 的公开 JSON)抓岗。

抓的是雇主自家 careers 页后端的原始挂岗(不是聚合站转发),产出就地写回一司一档的
jobs.json + jobs/<职位>.md;ATS 专属的薪资抽取(clean/04b)跟在同一条链上 ——
「只对 ATS 生效的清洗步归 ats 域」(docs/design/etl分域-20260829.md §7 拍板点 8-②)。
2026-08-31 批F 立域(搬家批):04 自编号主管线迁入改名,META 自 sources/ats 役册搬来。

⚠ 本域现处休眠:docker/docker-compose.yml 里 ats 服务整段是注释态(原注「加 ATS
第一方源时取消注释(Kanata 名录变动少,频率可低)」)—— 没有 SOURCE=ats 的容器在跑,
META 先就位等启用,启用只需取消 compose 那段注释,域这边零改。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/ats/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "ats",
    "method": "httpx",       # 对应 docker/etl/httpx/ 镜像
    "interval": 3600,        # 1h(2026-08-31 Frank「都改成小时更新也不费劲」;立域时沿旧役册日更,同日拉平)
    "seed": False,           # 抓取源只刷 raw,不灌库
    "ping": True,            # 本角色唯一单元,沿袭旧役册单元 ping 恒 True 的行为
}

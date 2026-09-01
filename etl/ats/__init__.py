"""ats 域:Kanata 公司第一方 ATS(greenhouse/lever/bamboohr/recruitee/smartrecruiters/
workable/workday 的公开 JSON)抓岗。

抓的是雇主自家 careers 页后端的原始挂岗(不是聚合站转发),产出就地写回一司一档的
jobs.json + jobs/<职位>.md;ATS 专属的薪资抽取(extract_ats_salary)跟在同一条链上 ——
「只对 ATS 生效的清洗步归 ats 域」(docs/design/etl分域-20260829.md §7 拍板点 8-②)。
2026-08-31 批F 立域(搬家批):04 自编号主管线迁入改名,META 自 sources/ats 役册搬来。
2026-08-31 批H2 clean 横切层清算:薪资抽取件(原 clean/04b_extract_ats_salary.py)
本体也迁进来了,门从 subprocess 包装改直调 —— 上面那句拍板点至此才真正兑现。

2026-08-31 批N「一域一容器」起本域已启用:根 docker-compose.yml 有 SOURCE=ats 的
service(此前整段注释态休眠、META 就位等启用 —— 那一步在批N 兑现,域这边零改)。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/ats/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "ats",
    "method": "httpx",       # 对应 etl/Dockerfile 通用轻镜像(批N 自 docker/etl/httpx/ 迁入)
    "interval": 3600,        # 1h(2026-08-31 Frank「都改成小时更新也不费劲」;立域时沿旧役册日更,同日拉平)
    "seed": False,           # 抓取源只刷 raw,不灌库
    "ping": True,            # 本角色唯一单元,沿袭旧役册单元 ping 恒 True 的行为
}

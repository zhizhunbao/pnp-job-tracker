"""
minwage 域:ESDC 最低工资数据库 → raw(2026-09-13 立域,Frank「省的话 这个省的法律要求 最低工资 是有用的」)。
回答什么问题:**各省法定最低工资现在是多少、什么时候生效、历年怎么调**(联邦管辖行业另有一档)——
官方源是加拿大劳工计划(ESDC)的 Minimum Wage Database,页面表由一个官方 JSON 端点填,本域直取该 JSON
(先落 crawl 层原文,再抽一般成人档落 raw/minwage/minimum_wage.json)。
边界(切法 = 「谁家的数据」):lmia 域管 ESDC 临时外劳计划(LMIA),statcan 域管 StatCan 统计,
本域管 ESDC 劳工计划的法定工资底线 —— 三家口径互不相干,分域把边界摆在目录上。
寿命:跟 ESDC 这个数据库走(2001 年起在线,历史到 1965);谁都不依赖本域函数,只读产物文件
(mart → 文件:provinces.info 挂现行档,macro_series 挂省 × 年序列)。
META = 域即役的调度声明:role=挂哪个角色容器(SOURCE 环境变量),interval=本域一轮的间隔秒;
入口固定 etl/minwage/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "minwage",         # 一域一容器(docker-compose 的 minwage service)
    "method": "httpx",
    "interval": 86400,         # 日更当兜底(调整按既定生效日,一年几次;430 KB 一次拿完)
    "seed": False,
    "ping": True,   # 本角色的 healthchecks 心跳由本域发
    "fresh": [      # 保鲜契约(语义见 sched.K_FRESH)
        {"file": "raw/minwage/minimum_wage.json", "cadence_days": 8},
    ],
}

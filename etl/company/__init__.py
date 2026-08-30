"""
company 域:公司实体(目录穷举/一司一档/careers 定位/官网富化)。
定时单元只有官网富化(E8-04 拆分沿革:原 enrich 役);Kanata 三件是休眠引导工具,手动跑。
产出 company_enrich.json,build 角色下一轮 09 自然合并进 companies。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/company/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "enrich",
    "method": "httpx",
    "interval": 21600,        # 6h 一轮(官网快照不需要小时级新鲜度)
    "seed": False,
    "ping": True,   # 本角色的 healthchecks 心跳由本域发
}

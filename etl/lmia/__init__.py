"""
lmia 域:ESDC LMIA 雇主级获批记录(E6-02;雇主池证据源)。
只刷 raw 不灌库;役上挂 ee 角色容器(同镜像含 openpyxl,沿革:原 ee 役第三步)。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/lmia/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "lmia",     # 2026-08-31 批N Frank「一域一容器」:原挂 ee 角色,拆出自役
    "method": "httpx",
    "interval": 2592000,       # 月检查:ESDC LMIA 季度数据,已缓存季度不重下
    "seed": False,
    "ping": False,  # 报警走 pnp 链尾 freshness 哨兵(盯的是产物文件,跨容器仍有效;批O 重排)
}

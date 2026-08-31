"""
pnp 域:省提名(PNP)具名清单/门槛/分值/运营统计**实时刷新**(低频)。

一省一段实时抓省政府页 → raw/pnp/*.json(2026-08-30 批B 全溶:原 33 个 build_*/scrape_*/
watch_*/translate_* 步骤文件收进 functions.py 的 34 个段,域 = 五件)。
只刷 raw 参考表不灌库 —— build 角色每轮 08→09→seed 目录驱动消费(最终一致,不抢 mart/seed)。
复用 httpx 镜像(只需 httpx+bs4+pymupdf,不需浏览器:AB/BC/SK/NS 源站直连 200)。
沿革:原 etl/sources/pnp 役册(2026-08-29 批2 域即役并入);AIP/试点/DLI/哨兵各回本域。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/pnp/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "pnp",
    "method": "httpx",
    "interval": 604800,        # 周更:具名清单极少变(SCRAPE_INTERVAL 不覆盖域单元)
    "seed": False,             # 只刷 raw 参考表,build 角色统一灌库(避免抢 mart/seed)
    "ping": True,   # 2026-08-31 批D:ops 拆散,本域链尾收编 watch+freshness 两哨兵,
                    # ping 权随 freshness 走(报警语义 = freshness 红了本轮不 ping;
                    # 角色内其余单元 dli/pilot/citations 一律 ping=False 防遮蔽)
}

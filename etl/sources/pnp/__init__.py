"""pnp 源:省提名(PNP)/AIP 具名清单**实时刷新**(低频)。

每省一个自包含 build 脚本(`etl/pnp/build_<prov>.py`)实时抓省政府页 → `raw/pnp/*.json`;
AIP 指定雇主 `06_scrape_aip_employers.py` → `raw/aip/`。
**只刷 raw 参考表,不灌库** —— build 角色每轮 08→09→seed 会目录驱动消费这些表(最终一致,不抢 mart/seed)。
复用 httpx 镜像(脚本只需 httpx+bs4,不需浏览器:AB/ON/SK/NS 源站直连 200;BC 暂解析旧 md)。
"""
META = {
    "method": "httpx",
    "interval": 604800,        # 周更:具名清单极少变(SCRAPE_INTERVAL 可覆盖)
    "seed": False,             # 只刷 raw 参考表,build 角色统一灌库(避免抢 mart/seed)
    "steps": [
        ["python", "etl/pnp/build_ab.py"],   # AB AAIP(实时,exclusion 排除式)
        # ON:2026-06-26 OINP 改制(O.Reg 422/17)旧 8 流全删、EOI 关;新 Workforce Priority 流按 TEER 分档
        #     无职业清单 → 不产出(E6-05,同 BC/SK「没数据不猜」);清单若重现,按 git 史 build_on.py 模板重写。
        # BC:tech 定向抽选 2024-12 已关、无具名通道;welcomebc 也无清单页 → 不产出,BC 岗走通用「可提名」。
        ["python", "etl/pnp/build_sk.py"],   # SK SINP 三通道(实时)
        ["python", "etl/pnp/build_ns.py"],   # NS 两通道(实时)
        ["python", "etl/pnp/build_draws.py"],  # E6-04 省抽选事实(BC/AB/MB+ON通告;无 occupations 键,08 扫表跳过)
        ["python", "etl/06_scrape_aip_employers.py"],  # AIP 指定雇主(NL/NB/NS;PE 仍 TODO)
        ["python", "etl/build_field_sources.py"],     # 字段级来源注册表(E4-04:验证 URL+抽 title/meta)
        ["python", "etl/build_dli.py"],               # PGWP 可申 DLI 子集(E12-03 旗舰②学校数据;IRCC 官方 JSON)
    ],
}

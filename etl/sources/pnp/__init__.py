"""pnp 源:省提名(PNP)/AIP 具名清单**实时刷新**(低频)。

每省一个自包含 build 脚本(`etl/pnp/build_<prov>.py`)实时抓省政府页 → `raw/pnp/*.json`;
AIP 指定雇主 `06_scrape_aip_employers.py` → `raw/aip/`。
**只刷 raw 参考表,不灌库** —— build 角色每轮 08→09→seed 会目录驱动消费这些表(最终一致,不抢 mart/seed)。
复用 httpx 镜像(脚本只需 httpx+bs4,不需浏览器:AB/BC/SK/NS 源站直连 200)。
"""
META = {
    "method": "httpx",
    "interval": 604800,        # 周更:具名清单极少变(SCRAPE_INTERVAL 可覆盖)
    "seed": False,             # 只刷 raw 参考表,build 角色统一灌库(避免抢 mart/seed)
    "steps": [
        ["python", "etl/pnp/build_ab.py"],   # AB AAIP(实时,exclusion 排除式)
        # ON:2026-06-26 OINP 改制(O.Reg 422/17)旧 8 流全删、EOI 关;新 Workforce Priority 流覆盖
        #     TEER0-5 全职业、官方**不设职业清单**(2026-07-25 复核)→ 无抓取脚本;
        #     政策事实由人工维护表 raw/pnp/on-workforce-priority.json(空排除集=全职业可)承载,
        #     清单若重现(如传闻中的 CLB5 职业表),删该表并按 git 史 build_on.py 模板重写。
        ["python", "etl/pnp/build_bc.py"],   # BC 2026 新政 Care/Build 清单(实时,2026-07-25 接入;旧 tech 定向 2024-12 关)
        ["python", "etl/pnp/build_sk.py"],   # SK SINP 三通道(实时)
        ["python", "etl/pnp/build_ns.py"],   # NS 两通道(实时)
        ["python", "etl/pnp/build_mb.py"],   # MB MPNP 在需职业 + 乡镇在需(实时,E6-09;旧「MB 无清单」假设已纠正)
        ["python", "etl/pnp/build_nb.py"],   # NB 不受理职业两表(实时,E6-09;叠加式排除 overlay)
        ["python", "etl/pnp/build_draws.py"],  # E6-04 省抽选事实(BC/AB/MB+ON通告;无 occupations 键,08 扫表跳过)
        ["python", "etl/06_scrape_aip_employers.py"],  # AIP 指定雇主(NL/NB/NS;PE 仍 TODO)
        ["python", "etl/build_field_sources.py"],     # 字段级来源注册表(E4-04:验证 URL+抽 title/meta)
        ["python", "etl/build_dli.py"],               # PGWP 可申 DLI 子集(E12-03 旗舰②学校数据;IRCC 官方 JSON)
        # ↓ 自校失败会 exit 1 的步骤一律排在最后:本役是「一步失败就中止本役」,
        #   排前面会把后面的清单/DLI 一起拖掉(build_bc_sirs / build_sk_points 同理,故至今仍手动跑)。
        ["python", "etl/pnp/build_bc_req.py"],  # E13-01 BC 官方门槛(语言/最低收入/经验/雇主侧;解析不全则保留旧表 exit 1)
        ["python", "etl/pnp/build_on_req.py"],     # E13-02 ON/OINP 门槛(雇主侧经营年限/营业额/雇员数 + 技工语言分档;同上)
        ["python", "etl/pnp/build_on_points.py"],  # E12-09 第三个省:ON EOI 打分表(自校同上)
    ],
}

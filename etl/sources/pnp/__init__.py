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
        ["python", "etl/pnp/build_nl.py"],   # NL 优先处理职位(2026-08-03;职位名文本非 NOC,不参与打分)
        ["python", "etl/pnp/build_pe.py"],   # PE 在需职业 8 个(2026-08-03;走官方指南 PDF——PEI 网页在 Radware 后面)
        ["python", "etl/pnp/build_draws.py"],  # E6-04 省抽选事实(BC/AB/MB+ON通告;无 occupations 键,08 扫表跳过)
        ["python", "etl/06_scrape_aip_employers.py"],  # AIP 指定雇主(NL/NB/NS;PE 仍 TODO)
        ["python", "etl/build_field_sources.py"],     # 字段级来源注册表(E4-04:验证 URL+抽 title/meta)
        ["python", "etl/build_dli.py"],               # PGWP 可申 DLI 子集(E12-03 旗舰②学校数据;IRCC 官方 JSON)
        # ↓ 自校失败会 exit 1 的步骤一律排在最后:本役是「一步失败就中止本役」,
        #   排前面会把后面的清单/DLI 一起拖掉(build_bc_sirs / build_sk_points 同理,故至今仍手动跑)。
        ["python", "etl/pnp/build_bc_req.py"],  # E13-01 BC 官方门槛(语言/最低收入/经验/雇主侧;解析不全则保留旧表 exit 1)
        ["python", "etl/pnp/build_on_req.py"],     # E13-02 ON/OINP 门槛(雇主侧经营年限/营业额/雇员数 + 技工语言分档;同上)
        ["python", "etl/pnp/build_on_points.py"],  # E12-09 第三个省:ON EOI 打分表(自校同上)
        # 2026-08-03 Frank 立铁律「抓完就要 docker 定时跑,不是抓一次完事」→ 这两个不再手动:
        # 它们自校失败会 exit 1 中止本役,所以钉在**最末尾**,失败也拖不到任何人。
        ["python", "etl/pnp/build_bc_sirs.py"],    # BC SIRS 分值表(手动 → 入役,2026-08-03)
        ["python", "etl/pnp/build_sk_points.py"],  # SINP 分值表(手动 → 入役,2026-08-03)
        # ↓ B1-1(2026-08-03):其余七省的官方门槛(语言/经验/雇主侧)。QC 走自有体系不属 PNP,
        #   所以「其余八省」实际是七个。全部照 build_bc_req 的硬闸:解析不全 → 保留旧表 + exit 1。
        #   ⚠️ 本役一步失败即中止本役 → 排在这里的七步是**串在同一根绳上**的:AB 挂了,后面六个
        #   本轮不会跑(各自保留旧表,不会写坏数据)。这正是 B3-1「新鲜度告警」要盯的场景 ——
        #   在 B3-1 落地前,判断某省是否停更看 raw/pnp/<省>-req.json 的 fetched,不要只看容器 healthy。
        ["python", "etl/pnp/build_ab_req.py"],  # AAIP AOS:语言按 TEER + 33102 单档、经验 24 个月
        ["python", "etl/pnp/build_sk_req.py"],  # SINP 主线:CLB 4 + 近 10 年 1 年经验(两页交叉校验)
        ["python", "etl/pnp/build_mb_req.py"],  # MPNP:**逐职业** Minimum CLB(158 个)+ TEER 4/5 下限
        ["python", "etl/pnp/build_ns_req.py"],  # NSNP:指南 PDF(链接从通道页现取)语言两档 + 经验 + 雇主年限
        ["python", "etl/pnp/build_nb_req.py"],  # NBPNP:三份 pathway 指南 PDF 互校,CLB 4
        ["python", "etl/pnp/build_pe_req.py"],  # PEI Workforce:指南 PDF,CLB 4 + TEER 0-3 经验 24 个月
        ["python", "etl/pnp/build_nl_req.py"],  # NLPNP:TEER 4/5 要 CLB 4、TEER 0-3 免考(档位算出来的)
        # ↓ 官方运营统计(2026-08-03,Frank「官方没有数据么」问出来的;此前误断言「分母没有省公布」):
        #   「等多久 / 还剩多少名额 / 被捞概率」的官方答案。同为硬闸自校,失败保留旧表。
        ["python", "etl/pnp/build_sk_stats.py"],  # SINP:季度处理时长 + 配额三档 YTD(日更)+ 优先/受限行业
        ["python", "etl/pnp/build_ab_stats.py"],  # AAIP:逐 stream 配额/已发/剩余 + 积压游标 + **EOI 池人数**(分母!)+ 64 轮抽选史
        ["python", "etl/pnp/build_bc_stats.py"],  # BC PNP:注册池 **SIRS 分数分布**(三省分母里颗粒度最细;与 build_draws 同页,分工见脚本头)
        # ↓ B3-1 新鲜度哨兵(2026-08-03)——上面第 40 行预言的那只表来了:按 etl/source_manifest.json
        #   逐文件核 fetched vs cadence,超期 exit 1 → 本轮记失败 → healthchecks 不 ping → 报警。
        #   钉死在最末尾:它红了不挡任何真实步骤,但让 ping 第一次证明「数据是新的」。
        ["python", "etl/check_freshness.py"],
    ],
}

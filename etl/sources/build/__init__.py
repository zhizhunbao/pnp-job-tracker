"""build 角色(非抓取源,灌库唯一角色):跨源清洗 → 评分 → mart → seed。

各抓取源只刷各自 raw;本角色把全部源重建进 mart 并灌库(幂等、最终一致,谁都不抢 mart/seed)。
**after=["jobbank"]:不独立计时,而是等 jobbank 每轮抓完才触发(严格「先抓后灌」),
兜底每 interval 至少跑一次(防 jobbank 卡住时彻底不灌)。** 复用 httpx 镜像。
"""
META = {
    "method": "httpx",
    "interval": 7200,        # 兜底:即使 jobbank 没出新轮次,最多每 2h 也灌一次
    "seed": True,            # 跑完 steps 后 GET /seed 灌库
    "after": ["jobbank"],    # 反应式:jobbank 每轮完成后触发
    "steps": [
        # ⚠️ 顺序讲究(2026-08-05 实撞):**慢活先跑,快清洗贴着 09 跑**。
        # 病因:jobbank 是**另一个容器**,按自己的钟整文件重写 postings.json;本轮跑到一半它写进来的新帖
        # 就绕过了前面已经跑完的清洗步,带着空字段直接进 mart 灌库(当天 00:22 跑 04d → 00:25 写入 24 条
        # 新帖 → 00:42 建表 → 页面薪资列一片横线)。把 05e/verify_expired 这两个慢步(12 分 + 7.5 分)
        # 提到前面,清洗到建表的窗口从 ~20 分钟压到十几秒。**窗口只是变小没有消失** ——
        # 薪资那列另有 09 侧的兜底(见 09_build_mart.py 的 fill_salary),那条才是真堵死。
        ["python", "etl/clean/05e_flag_apprentice.py"],  # B1-3:官方标「不要经验/带训」+ 学徒标题 → apprentice_friendly
        ["python", "etl/verify_expired.py"],        # #124 批C:死岗验尸(周节奏,7 天内跑过=秒退;判死帖 09 剔除出 mart)
        ["python", "etl/clean/04c_clean_ats_locations.py"],
        ["python", "etl/clean/04d_clean_salary.py"],
        ["python", "etl/clean/05c_flag_aip.py"],
        ["python", "etl/clean/05d_noc_sanity.py"],  # #47:标题↔NOC 失配护栏(泛词标题×TEER0/1×低薪 → NOC 置空转未分类)
                                                    # 🔴 必须排在 04d 之后:它的判据里有「低薪」,读的是 04d 算出的 salaryAnnual
        # 官网富化已拆独立 enrich 角色(2026-07-16「分开来跑」拍板):每轮 10-17 分钟拖垮 seed 时效;
        # 本角色只消费它落好的 company_enrich.json(09 合并),不再现抓
        ["python", "etl/08_score.py"],
        ["python", "etl/09_build_mart.py"],
        ["python", "etl/10_build_rankings.py"],   # 榜单(E5-02:读 mart 纯聚合)
        ["python", "etl/11_build_stats.py"],      # 地区统计(E5-04:读 mart 纯聚合)
        ["python", "etl/upload_mart.py"],   # E7-04:mart → gzip 推 cms /api/mart(SEED_URL 未设自动跳过)
    ],
}

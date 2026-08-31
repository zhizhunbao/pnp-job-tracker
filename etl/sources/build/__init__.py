"""build 角色(非抓取源,灌库唯一角色):跨源清洗 → 评分 → mart → seed。

各抓取源只刷各自 raw;本角色把全部源重建进 mart 并灌库(幂等、最终一致,谁都不抢 mart/seed)。
**after=["jobbank"]:不独立计时,而是等 jobbank 每轮抓完才触发(严格「先抓后灌」),
兜底每 interval 至少跑一次(防 jobbank 卡住时彻底不灌)。** 复用 httpx 镜像。
"""
BUILD_STEPS = [
    ["python", "etl/clean/05e_flag_apprentice.py"],  # B1-3:官方标「不要经验/带训」+ 学徒标题 → apprentice_friendly
    ["python", "etl/verify_expired.py"],        # #124 批C:死岗验尸(周节奏,7 天内跑过=秒退;判死帖 09 剔除出 mart);2026-08-31 批D ops 拆散归根
    ["python", "etl/clean/04c_clean_ats_locations.py"],
    ["python", "etl/clean/04d_clean_salary.py"],
    ["python", "etl/clean/05c_flag_aip.py"],
    # E6-11:试点社区名单(读 fed-rcip crawl 缓存,改版保旧不拦役)。
    # 2026-08-31 批C:步骤文件全溶进 pilot 域,跨役走域门 --only 点名(顺序不动,仍在 05f 之前)
    ["python", "etl/pilot/main.py", "--only", "communities"],
    ["python", "etl/clean/05f_flag_pilot.py"],   # E6-11:城市×省 → jobs.pilot/pilotCommunity(05c 同款一字段一脚本)
    ["python", "etl/clean/05d_noc_sanity.py"],  # #47:标题↔NOC 失配护栏(泛词标题×TEER0/1×低薪 → NOC 置空转未分类)
                                                # 🔴 必须排在 04d 之后:它的判据里有「低薪」,读的是 04d 算出的 salaryAnnual
    # 官网富化已拆独立 enrich 角色(2026-07-16「分开来跑」拍板):每轮 10-17 分钟拖垮 seed 时效;
    # 本角色只消费它落好的 company_enrich.json(09 合并),不再现抓
    ["python", "etl/08_score.py"],
    ["python", "etl/09_build_mart.py"],
    ["python", "etl/10_build_rankings.py"],   # 榜单(E5-02:读 mart 纯聚合)
    ["python", "etl/11_build_stats.py"],      # 地区统计(E5-04:读 mart 纯聚合)
    ["python", "etl/employers/main.py"],      # 雇主池两表(雇主板批一,2026-08-30:读 mart+LMIA+postings 纯聚合,须在 upload 前)
    ["python", "etl/load/main.py", "--only", "upload"],   # E7-04:mart → gzip 推 cms /api/mart(SEED_URL 未设自动跳过;2026-08-30 收编 load 域)
]

META = {
    "method": "httpx",
    "interval": 7200,        # 兜底:即使 jobbank 没出新轮次,最多每 2h 也灌一次
    "seed": True,            # 跑完 steps 后 GET /seed 灌库
    "after": ["jobbank"],    # 反应式:jobbank 每轮完成后触发
    # 一条 wrapper 在整轮 BUILD_STEPS 外持锁。不能拆成「加锁 step / 解锁 step」:
    # 任一步异常时 auto_update 会立即中止,解锁 step 没机会执行;内核文件锁则随 wrapper 退出自动释放。
    "steps": [["python", "etl/sources/build/run_locked.py"]],
}

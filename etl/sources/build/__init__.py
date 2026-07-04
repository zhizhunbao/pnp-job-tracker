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
        ["python", "etl/clean/04c_clean_ats_locations.py"],
        ["python", "etl/clean/04d_clean_salary.py"],
        ["python", "etl/clean/05c_flag_aip.py"],
        ["python", "etl/08_score.py"],
        ["python", "etl/09_build_mart.py"],
        ["python", "etl/upload_mart.py"],   # R3:mart → Supabase Storage(SUPABASE_* 未设自动跳过)
    ],
}

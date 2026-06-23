"""build 角色(非抓取源,灌库唯一角色):跨源清洗 → 评分 → mart → seed。

各抓取源只刷各自 raw;本角色定期把全部源重建进 mart 并灌库(幂等、最终一致,
谁都不抢 mart/seed)。复用 httpx 镜像(只需 python + httpx 调 /seed)。
"""
META = {
    "method": "httpx",
    "interval": 7200,
    "seed": True,            # 跑完 steps 后 GET /seed 灌库
    "steps": [
        ["python", "etl/clean/04c_clean_ats_locations.py"],
        ["python", "etl/clean/04d_clean_salary.py"],
        ["python", "etl/clean/05c_flag_aip.py"],
        ["python", "etl/08_score.py"],
        ["python", "etl/09_build_mart.py"],
    ],
}

"""enrich 角色(E8-04 拆分,2026-07-16 用户拍板「分开来跑」):公司官网富化独立调度。

原挂在 build 轮里每轮现抓 300 家官网(~10-17 分钟)——jobbank 改 1h 后成了 seed 大头,
页头更新时间显著滞后。拆出来后 build 轮回到分钟级;本角色 6h 一轮逐轮清覆盖缺口,
产出 company_enrich.json,下一次 build 轮自然合并进 companies。
--min-interval 3600 仅防容器重启抖动(重启即重跑);正常节奏由本角色 interval 管。
"""
META = {
    "method": "httpx",
    "interval": 21600,        # 6h 一轮(官网快照不需要小时级新鲜度)
    "seed": False,
    "steps": [
        ["python", "etl/enrich_companies.py", "--min-interval", "3600"],
    ],
}

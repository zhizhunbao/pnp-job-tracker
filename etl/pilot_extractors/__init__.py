"""批C(E6-11,2026-08-15):社区名单抽取器注册表 —— 批B 一次性抽取转自动刷新。

四个地区模块各自导出 EXTRACTORS: dict[社区官方名(与 raw/pilot/pilot-communities.json 的 name 一致), callable]。
抽取函数签名(无参):
    fn() -> {"employers": [{"name": str, "location": str}...],   # 官方当前指定雇主(excluded/de-designated 剔除)
             "occupations": [{"noc": str5位或"", "title": str, "sectorOnly": bool}...],
             "employersUrl": str, "occupationsUrl": str}
约束:只用 stdlib + httpx + fitz(pymupdf) + re/json/csv;直连官方源带浏览器 UA;
     解析不动摇的红线=宁缺勿猜,拿不准的行不要;抛异常即可 —— 总控(build_pilot_details)对该社区保旧+喊人。
"""
from . import atl, bc, on, prairie  # noqa: F401

EXTRACTORS = {**on.EXTRACTORS, **bc.EXTRACTORS, **prairie.EXTRACTORS, **atl.EXTRACTORS}

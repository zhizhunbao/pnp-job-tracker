"""批C(E6-11,2026-08-15):社区名单抽取器注册表 —— 批B 一次性抽取转自动刷新。

四个地区模块各自导出 EXTRACTORS: dict[社区官方名(与 raw/rcip/rcip-communities.json 的 name 一致), callable]。
抽取函数签名(无参):
    fn() -> {"employers": [{"name": str, "location": str}...],   # 官方当前指定雇主(excluded/de-designated 剔除)
             "occupations": [{"noc": str5位或"", "title": str, "sectorOnly": bool}...],
             "employersUrl": str, "occupationsUrl": str}
约束:只用 stdlib + httpx + fitz(pymupdf) + re/json/csv;直连官方源带浏览器 UA;
     解析不动摇的红线=宁缺勿猜,拿不准的行不要;抛异常即可 —— 总控(build_pilot_details)对该社区保旧+喊人。

批E 拆分改动(2026-08-31,pilot 拆三域;Frank「拆成三个 很少有人有法语」):
本注册表由 18 个社区收成 **RCIP 14 个**,四个纯法语社区(Kelowna, BC / Acadian Peninsula, NB /
St. Pierre Jolys, MB / Superior East Region, ON)的抽取函数原样搬去 etl/fcip/extractors/;
双身份社区 Sudbury, ON 与 Timmins, ON 的抽取器**留在本域**(拍板点 8-②),
产出行照旧逐行带 RCIP / FCIP / RCIP+FCIP 的 type,fcip 域不重复抽取。
"""
from . import atl, bc, on, prairie  # noqa: F401

EXTRACTORS = {**on.EXTRACTORS, **bc.EXTRACTORS, **prairie.EXTRACTORS, **atl.EXTRACTORS}

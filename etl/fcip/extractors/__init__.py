"""批C(E6-11,2026-08-15):法语社区名单抽取器注册表 —— 批B 一次性抽取转自动刷新。

四个地区模块各自导出 EXTRACTORS: dict[社区官方名(与 raw/fcip/fcip-communities.json 的 name 一致), callable]。
抽取函数签名(无参):
    fn() -> {"employers": [{"name": str, "location": str}...],   # 官方当前指定雇主(excluded/de-designated 剔除)
             "occupations": [{"noc": str5位或"", "title": str, "sectorOnly": bool}...],
             "employersUrl": str, "occupationsUrl": str}
约束:只用 stdlib + httpx + fitz(pymupdf) + re/json/csv;直连官方源带浏览器 UA;
     解析不动摇的红线=宁缺勿猜,拿不准的行不要;抛异常即可 —— 总控(build_pilot_details)对该社区保旧+喊人。

批E 拆分改动(2026-08-31,pilot 拆三域;Frank「拆成三个 很少有人有法语」):
本注册表 = **纯法语四社区**(Kelowna, BC / Acadian Peninsula, NB / St. Pierre Jolys, MB /
Superior East Region, ON),四个函数自 etl/pilot/extractors/ 的四个地区文件原样搬来(函数体一字未改),
地区分文件的结构沿用(bc/atl/prairie/on),共用私件与 rcip 域两边各留一份镜像。
⚠ fcip-communities.json 里还有 Sudbury, ON 与 Timmins, ON 两个**双身份社区**行,
但它们的抽取器住 rcip 域(拍板点 8-②:IRCC 名单页两节都列它俩,抽取只做一次),
本注册表**故意不含**它们 —— 总控查不到抽取器即跳过,fcip 产物只含纯法语四社区。
"""
from . import atl, bc, on, prairie  # noqa: F401

EXTRACTORS = {**on.EXTRACTORS, **bc.EXTRACTORS, **prairie.EXTRACTORS, **atl.EXTRACTORS}

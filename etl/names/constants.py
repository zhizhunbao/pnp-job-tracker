"""
names 域常量 —— 公司名归一的三条正则(方言:constants 只许 import re / paths)。
"""
import re

SUFFIX_RE = re.compile(
    r"\b(inc|incorporated|ltd|limited|llp|llc|corp|corporation|co|company|enr|ltee|lt[eé]e|"
    r"holdings?|group|services?|enterprises?)\b\.?", re.I)
"""公司后缀词(归一时整体去掉)。沿革:pilot 域 _SUFFIX → aip SUFFIX_RE(值一字未改)→
2026-08-31 收拢批随 norm_name 迁入本域。mart 试点段原 PILOT_SUFFIX_RE 与本条逐字相同
(其「词表不同」注释系搬运期陈旧断言,56,909 名全集探针零差异),随收拢删除。"""

ALIAS_SPLIT_RE = re.compile(r"\bo/a\b|\bdba\b|\bd/b/a\b|\bo\.a\.\b")
"""「operating as」别名分隔:切开取前面的主名(输入已小写,故不带 re.I,原值)。"""

KEEP_RE = re.compile(r"[^a-z0-9& ]")
"""归一后允许保留的字符之外的一切(标点全换空格,& 保留)。"""

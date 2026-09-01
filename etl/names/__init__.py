"""
names 域:公司名归一基础设施叶(2026-08-31 抽叶,Frank「需要一个 name 域专门处理名字问题」)。

回答的问题:「这两个公司名是不是同一家?」—— aip 打标 / lmia 聚合键 / mart companies join
判同一家必须同一把尺子,尺子只住这一份(与 noc 域「这个岗是什么职业」同款判定叶)。
正门 = from names.functions import norm_name(件套以包名被引,与 fetch/log 同形)。
本 __init__ 零 import:sched 域发现会 import 每个 etl/*/__init__,基础设施叶无 META。

@author Frank
@time 2026-08-31 20:31
"""

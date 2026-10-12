"""
mart/rank 子域:抽选页三段式的排名表 draw_rank —— 一行一张卡,两种卡:

  quota    配额卡:联邦 + 各省一张(2026 配额 / 今年邀请 / 今年提名 + 综合排名)
  cadence  抽选节奏卡:一条通道一张(官方一次抽选同时覆盖几条通道的合一张,列出覆盖了哪几条;
           没挂上任何通道的抽选流按流名族各一张);联邦按 EE 类别一张,「省提名专场」(label = pnp)不出卡

2026-10-12 立(Frank 看效果图 docs/design/资讯/抽选-三段式-20261012.md 拍「定稿,开工」):
排名是评分,评分在数据层算(宪法「分类/标签在数据层算」);前端只读 rank / status 两格,不重算。

形(照 etl/pnp/qc 子域:目录 + 四件,不带 main.py、不带 META):入口函数 draw_rank_of 由 mart 汇装(to_mart_tables)
与单表件 build_draw_rank_table 调用。依赖单向:mart → 本子域;本子域只吃上游已成形的 mart 行(抽选 / 运营统计 / 通道 /
宏观序列),不 import mart 共用段,键名在本子域 constants 自抄一份。

@author Frank
@time 2026-10-12 16:40:00
"""

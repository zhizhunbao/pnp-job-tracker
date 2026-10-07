"""
statcan/cip 子域:CIP Canada 2021 专业分类 —— 访客四题第 2 题「读的什么专业」的数据层(2026-10-04 Frank「改」:
十几个热门专业胶囊 + 搜索全部 CIP 2021 专业,单选,存 class 码;第 3 题按专业对应的本站职业大类列在招最多的职业)。

回答什么问题:加拿大官方专业分类有哪些专业(2,119 个 class)、各叫什么中 / 韩名、哪几个算热门、各落到本站哪些职业大类。
三步 + 自测(入口 statcan/main.py,步名 cip2021 / cip_i18n / cip_programs / test_cip;`--only cip` 子串命中这四步按序全跑,
译名一步要一两个小时,单点请写全名):
  cip2021       官方结构表 CSV → raw/statcan/cip2021.json(原文先落 crawl 层;进 statcan_naics 调度单元日抓一发)
  cip_i18n      英文名 → 中 / 韩名(本地 qwen 分批译 → processed/statcan/cip_i18n.json;手动件,可断点续跑)
  cip_programs  汇装件 → processed/statcan/cip_programs.json(列对齐 docs/sql/cip-programs-20261004.sql;手动件)
  test_cip      子域自测(解析金标 / 真表金标 / 专业 → 大类对照表 / 译名闸与上架名定稿)
🔴 汇装件写 processed 不写 mart:data/mart/*.json 每小时被 build 役整目录上传 + seed,生产 DDL 没跑之前不许进生产。

为什么拆子域:statcan/functions.py 836 行,CIP 三步 + 自测约 270 行,并进去超 ⑪号规 1000 行线(statcan 不在存量名单,
加名单 = 放松闸,只紧不松)。照 pnp/qc 子域首例样张的形:目录 + 四件(本文件 / constants / scheme / functions),
**不带 main.py、不带 META** —— 调度声明仍在 statcan/__init__ 的 METAS,入口仍是 statcan/main.py(从本子域 import 步骤函数)。
依赖单向:本子域 → statcan 共用段(statcan.constants 的 crawl slug / UA / 落盘键,statcan.functions 的 today_iso)
+ 基础设施叶(paths / log / fetch / crawl / noc);statcan 共用段永不 import 本子域。
⚠ 子域此前只有 pnp/qc 一例(按省拆),本例是按主题拆的头一例 —— 待 Frank 过目,不认可就整目录并回 statcan 再议拆法。
2026-10-05 掌上高考版(Frank「参考掌上高考啊」「可以,做吧」):cip_programs 步顺手算选择器位置(places:左栏 16 个大类
→ 可展开的专业类 → 专业,序号与「单列」标在这里排好)和两个显示名(titleEnShort 英文短名、titleZh 换成中文清洗名,
机翻定稿挪 titleZhRaw);大类对照、专业类三语名、清洗规则住 constants 段 4 / 5,产物与效果图分类表逐格一致
(设计稿 docs/design/访客四题-专业题调研-20261004.md「效果图:掌上高考版」)。

@author Frank
@time 2026-10-04 02:14:05
"""

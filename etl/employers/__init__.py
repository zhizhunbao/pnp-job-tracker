"""
employers 域:雇主池(雇主板重构批一,2026-08-30 立;设计稿 docs/design/雇主板重构-20260829.md)。

回答「谁最可能要我」的数据层:一行=一雇主(全局表)+ 雇主×大类分桶表(切面星住桶行)。
零新抓取,纯三源聚合:jobs(在招/入门/工资)+ designated_employers(指定资格)+
LMIA 事实(技能类旁证)+ postings 全史(规模代理)。
🔴 口径红线:裸 LMIA 总量永不入星不入排序;星级权重 指定>>在招+入门>技能LMIA;
口径只有数据层一份,板与顾问工具只读(lib/ruling 先例);机会参考 ≠ 资格认定。

无 META(不自带役):由 build 役册在 mart 之后、upload 之前点名
(python etl/employers/main.py)。本 __init__ 零 import(域发现轻门惯例)。
"""

"""
pnp/qc 子域:魁省(QC)经济类移民事实 —— PSTQ 邀请轮次、通道门槛、年度移民计划、PEQ。

2026-09-29 立(Frank「魁省数据也要抓一下吧」「不属于省提名 也算是省的吧」;同日「开工」拍拆分首例):
pnp 域 functions.py 九千行、constants.py 八千行,早超 ⑪号规 1000 行线;天然切口是省(每省四五百到八百行,
各自在线下,调度单元早已按省拆)。本目录是**按省拆子域的首例样张**,九省日后照这个形逐省纯搬家。

形(首例,Frank 看过再推九省):
  子域 = 目录 + 四件(本文件 / constants / scheme / functions),**不带 main.py、不带 META** ——
  一域一门:调度声明仍在 pnp/__init__ 的 METAS,入口仍是 pnp/main.py(它从本子域 import 步骤函数)。
  依赖单向:本子域 → pnp 共用段(pnp.constants 的 K_ 键词表与共用件、pnp.functions 的共用函数、pnp.scheme 的共用形状)
  + 基础设施叶;pnp 共用段**永不 import 本子域**(否则成环,也违背「共用不认识省」)。
  两个以上省份用到的件一律住 pnp 共用段,不在省子域之间互取。
QC 自成体系,不属 PNP:label / scale / program 一律写项目名(PSTQ / PEQ),不标 PNP。

@author Frank
@time 2026-09-29 20:01:04
"""

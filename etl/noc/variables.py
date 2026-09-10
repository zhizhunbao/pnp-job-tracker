"""noc.variables — 本域唯一放变量的地方(一个容器对象,跨模块只读活绑定)。

原 noc.py 在 import 期就把 structure.json 读进模块级 _LEVELS;2026-08-31 并域改成
首用惰性(get_structure_levels 填 CACHE)—— 行为差异仅「NOC_STRUCTURE 环境变量的
读取时刻」从 import 期挪到首次调用,同进程内取值一致。
"""
from types import SimpleNamespace

CACHE = SimpleNamespace(levels=None, titles=None, cores=None)
"""分类库状态:levels = structure.json 的层级表(None = 还没读;读过一次全进程复用,
文件缺席时置空 dict —— 名字全退「未分类」,不炸);titles = 官方示例职称全名 → NOC 查表,
cores = 去限定语的核心名 → NOC(段 8,2026-09-10;None = 还没建,首次 noc_of_title 时从
Elements CSV 一并建;全名供整名相等与子串,核心名只供整名相等)。"""

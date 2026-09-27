"""pte.variables — 本域唯一放变量的地方(一个容器对象,跨模块只读活绑定)。

2026-09-27 立(形制闸清零批:Frank「问题太多了」「先不要加新功能」,lead 定改代码清掉):猩际两步(列表 / 流)
截页面自发接口地址的 request 监听,playwright 定死回调只收一参(request)—— 原先 make_xj_url_sink /
make_xj_exam_url_sink 两个工厂用闭包捕获收集槽,犯形制闸⑨内嵌函数禁令;照 crawl.variables CACHE.patches
先例(2026-09-03 route 回调由 lambda 闭包改成容器格,过形制闸一参令)改成顶层具名回调 + 本容器两格。
行为不变:每步开头照旧新建一只空清单(换进本容器),回调往当前那只 append;浏览器在步尾 finally 收摊,监听随页关闭。

@author Frank
@time 2026-09-27 17:23:35
"""
from types import SimpleNamespace

CACHE = SimpleNamespace(xj_urls=[], xj_exam_urls=[])
"""猩际两步的请求地址收集槽:xj_urls = 列表步截到的 single_num_v2 地址(xj_lists_async 开头换上新空清单,
每型开页前清空);xj_exam_urls = 流步截到的 comments/exam 地址(xj_exam_async 开头换上新空清单)。"""

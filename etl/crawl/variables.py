"""crawl.variables — 本域唯一放变量的地方(一个容器对象,跨模块只读活绑定)。

浏览器兜底是持久单例(一个有头窗口一个复用标签,页与页严格串行 —— 并发自动化标签
更容易触发人机检测),其可变状态全住 CACHE 一格格数清;launch 竞态由 lock 管,
串行由 sem(上限 1)管。asyncio 原语在 3.11 是懒绑事件循环的,import 期创建安全。
"""
import asyncio
from types import SimpleNamespace

CACHE = SimpleNamespace(pw=None, context=None, page=None, unavailable=False,
                        lock=asyncio.Lock(), sem=asyncio.Semaphore(1), patches=())
"""浏览器单例状态:pw = playwright 驱动;context = 持久上下文(cf_clearance 随 profile
落盘,验证过一次后续免检);page = 唯一复用标签;unavailable = playwright 缺席/启动失败
(警告一次,后续 403 页直接跳过);lock = 启动互斥;sem = 单标签串行闸(上限 1);
patches = 已装配的站点脚本补丁表(route 回调只收一参,补丁表从这格取 —— 2026-09-03 由
lambda 闭包改成容器格,过形制闸一参令)。"""

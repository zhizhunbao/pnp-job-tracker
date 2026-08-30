"""fetch — 抓取基础设施域(2026-08-30 单文件 _fetch.py 升格目录,Frank:单文件看着乱)。

正门 = 件套以包名被引(与 crawl 正门 from crawl.cache import 同形):
  from fetch.functions import make_client, make_polite_client, iso_date, run, …
  from fetch.constants import BROWSER_UA, POLITE_UA, …

与 crawl 的分工(名字即判据):fetch 拿「已知 URL」—— 一个地址一发请求直取;
crawl 找「未知 URL」—— 先 BFS 顺链接探出 manifest,再定向抓、读缓存。

本 __init__ 保持零 import:auto_update 域发现会 import 每个 etl/*/__init__,
基础设施域无 META,轻门免得每轮白拉 httpx/bs4。
"""

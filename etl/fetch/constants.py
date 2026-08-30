"""fetch.constants — 抓取通用件的词表与节奏参数(UA 双档 / 超时重试 / 日期词表)。

2026-08-30 目录化拆出(原住单文件 etl/_fetch.py 顶部);UA 是全站伪装/礼貌两档的
唯一来源,节奏参数只被 fetch.functions 的 news 母框架消费。
"""
import re

BROWSER_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
# 伪装 UA 全站单一来源(2026-08-30 批A 收拢:本件 Chrome/120 与 company 的 131 已漂移,取新)

POLITE_UA = "Mozilla/5.0 (compatible; PNPJobTracker/1.0; +https://offer2pr.com)"
# 自报家门的礼貌 UA(抓第三方官网/搜索用;与伪装档用途相反,两档并存是设计)

UA = BROWSER_UA
# 旧名别名(news 子源体系沿用;新代码一律用 BROWSER_UA/POLITE_UA 两个明确档名)
TIMEOUT = 30
RETRIES = 2                 # 每 URL 最多 1+2 次
DETAIL_SLEEP = 1.0          # 详情页抓取间隔(礼貌频控)
MAX_DETAIL_PER_RUN = 15     # 每轮每子源最多抓 N 个详情页(12h 一轮,追平只是时间问题)
MAX_AGE_DAYS = 400          # 只收这个窗口内的条目(AB 页带 2020 年陈年更新,旧闻不进站)
MIN_TOTAL = 10              # 全轮防线:合并后至少 N 条(首轮 ~几十条,低于此 = 结构性故障)

MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"
DATE_RE = re.compile(rf"({MONTHS})\s+(\d{{1,2}}),?\s+(20\d\d)", re.I)

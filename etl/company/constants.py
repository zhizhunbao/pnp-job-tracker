"""
company 域常量 —— 域词汇表(三件套形制**全站样张**,2026-08-30 Frank「先拿一个做样章」)。

进这个文件的判据(照 cms 宪法同款):**被本域 ≥2 个文件消费**;单消费者的常量留在
它的步骤文件里(careers 的 ATS 清单、kanata 的 REFERER、enrich 的自报家门 UA 都没搬,
就是这条判据在执行)。本文件零 import(叶子不 import,cms 同律)。
"""

# 浏览器伪装 UA(2026-08-30 收拢:kanata 与 careers 两份逐字相同 —— 目录站/官网对
# 无头 UA 挑剔,自报家门的礼貌 UA 归 enrich 自己,那是另一件事,不并)。
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

# 「算不算科技公司」的行业关键词(is_tech 的唯一判据来源)。
# ⚠ 2026-08-30 收拢时发现两份已**漂移**:kanata 版 20 词,careers 版少
# " it " / "telecom" / " ai" 三个(后写的抄漏)—— 行为复制=口径开岔的现行犯。
# 取超集(kanata 版全集);careers 阶段因此会多认少量公司为 tech,方向=查漏不是误杀。
TECH_TERMS = ("software", "technolog", "information technology", " it ", "telecom", "saas",
              "cyber", "data", "artificial intelligence", " ai", "cloud", "semiconductor",
              "electronics", "engineering", "computer", "digital", "developer", "wireless",
              "fintech", "network")

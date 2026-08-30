"""
company 域常量 —— 域词汇表(三件套形制**全站样张**,2026-08-30 Frank「先拿一个做样章」
+「enrich/scrape 这些都要重构到其他三个文件里」:步骤文件全溶,域=五件)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则);本文件零 import
(叶子不 import,连 _paths 也不 —— 经 _paths 解析的 IN/OUT 路径常量住 functions.py
各段段首,方言判据见 docs/design/etl分域-20260829.md §4)。
注释方言(2026-08-30 Frank「只允许 jsDoc 注释,不允许行内注释」):每个常量用
**赋值后的裸字符串 docstring**,不用行内 #;段横幅三行框保留。
"""
import re

# =========================================================================
# 1. 共享词汇(≥2 段消费)
# =========================================================================

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
"""浏览器伪装 UA(2026-08-30 收拢:kanata 与 careers 两份逐字相同 —— 目录站/官网对
无头 UA 挑剔;enrich 自报家门的礼貌 UA 是另一件事,见 POLITE_UA)。"""

TECH_TERMS = ("software", "technolog", "information technology", " it ", "telecom", "saas",
              "cyber", "data", "artificial intelligence", " ai", "cloud", "semiconductor",
              "electronics", "engineering", "computer", "digital", "developer", "wireless",
              "fintech", "network")
"""「算不算科技公司」的行业关键词(is_tech 的唯一判据来源)。
⚠ 2026-08-30 收拢时发现两份已漂移:kanata 版 20 词,careers 版少 " it "/"telecom"/" ai"
三个(后写的抄漏)—— 行为复制=口径开岔的现行犯。取超集;careers 阶段因此会多认
少量公司为 tech,方向=查漏不是误杀。"""

# =========================================================================
# 2. Kanata 目录抓取
# =========================================================================

KANATA_AJAX_URL = "https://www.kanatanorthba.com/wp-admin/admin-ajax.php"
"""目录数据的真实出口:页面前端渲染,但主题的 WordPress AJAX action
`elevatex_load_more_companies` 一次可吐全部会员卡片(逆向所得,免浏览器)。"""

KANATA_REFERER = "https://www.kanatanorthba.com/member-directory/"
"""AJAX 请求要带的来源页(不带会被 WordPress 挡)。"""

KANATA_REGION_LABEL = "Ottawa · Kanata North (ON)"
"""目录行的 region 格固定值(加拿大最大科技园,~520 家)。"""

# =========================================================================
# 3. careers 页定位
# =========================================================================

ATS_HOSTS = ("greenhouse.io", "lever.co", "bamboohr", "myworkdayjobs", "workday", "ashbyhq",
             "jobvite", "icims", "smartrecruiters", "recruitee", "workable", "breezy.hr",
             "teamtailor", "applytojob", "bullhorn", "rippling", "dayforcehcm")
"""标准 ATS 平台域名 —— 命中即可在 Stage 3 直取干净的职位 JSON。"""

CAREERS_RE = re.compile(r"career|jobs?|join[-\s]?us|we[-'\s]*re[-\s]?hiring|work[-\s]?with[-\s]?us|"
                        r"opportunit|life[-\s]?at|positions", re.I)
"""首页链接里「这是招聘页」的文本特征。"""

COMMON_CAREER_PATHS = ("/careers", "/careers/", "/career", "/jobs", "/jobs/", "/join-us",
                       "/join", "/company/careers", "/about/careers", "/we-are-hiring")
"""首页没露招聘链接时逐个探的常见路径。"""

# =========================================================================
# 4. 官网富化(E8-04 / D1=B;D2 找官网阶梯)
# =========================================================================

POLITE_UA = "Mozilla/5.0 (compatible; PNPJobTracker/1.0; +https://offer2pr.com)"
"""富化抓首页用的自报家门 UA(非 gov 站,礼貌先行;与伪装 UA 用途相反,不并)。"""

RETRY_FAILED_DAYS = 30
"""失败的公司多久后才重试(避免每轮死磕抓不动的站)。"""

RETRY_NOSITE_DAYS = 90
"""找不到官网的公司多久后才再找(找官网比抓首页贵)。"""

DESC_LEN_MAX = 600
"""简介截断(事实段展示够用,过长是整页倒灌;原名 MAX_DESC,2026-08-30 命名就范)。"""

ENRICH_LIMIT = 300
"""每轮最多抓多少家官网(逐轮累积清覆盖缺口)。"""

ENRICH_REFRESH_DAYS = 180
"""成功记录多久后刷新(官网快照不需要高新鲜度)。"""

FIND_LIMIT = 60
"""每轮 DDG 找官网最多搜多少家(0=关)。"""

ENRICH_MIN_INTERVAL_S = 3600
"""距上次产出不足 N 秒整轮跳过 —— 只防容器重启抖动(重启即重跑),正常节奏由域
META.interval(6h)管;2026-07-16 拍板拆出 enrich 角色的沿革见 __init__ 头注。"""

DDG_HTML_URL = "https://html.duckduckgo.com/html/"
"""DuckDuckGo HTML 版搜索端点(找官网②的兜底)。"""

NAME_STOP = {"the", "and", "inc", "incorporated", "ltd", "ltee", "limited", "llp", "llc", "corp",
             "corporation", "company", "co", "of", "du", "de", "la", "le", "les", "et", "group",
             "groupe", "services", "service", "enterprises", "enterprise", "canada", "canadian",
             "holdings", "holding", "international", "solutions", "consulting", "management"}
"""名称归一停用词(公司后缀+泛词)—— 不参与「域名↔公司名」匹配。"""

NOT_OFFICIAL = {"indeed.com", "linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com",
                "tiktok.com", "youtube.com", "yelp.ca", "yelp.com", "yellowpages.ca", "yellowpages.com",
                "jobbank.gc.ca", "guichetemplois.gc.ca", "glassdoor.ca", "glassdoor.com", "zoominfo.com",
                "opencorporates.com", "canada411.ca", "bloomberg.com", "dnb.com", "ziprecruiter.com",
                "kijiji.ca", "careerbeacon.com", "workopolis.com", "monster.ca", "jooble.org",
                "talent.com", "simplyhired.ca", "wikipedia.org", "betterteam.com", "jobillico.com",
                "trustpilot.com", "google.com", "duckduckgo.com", "cylex.ca", "forms.gle", "bit.ly",
                "wa.me", "mapquest.ca", "grabjobs.co", "postjobfree.com", "workingincanada.gc.ca"}
"""聚合站/社交/黄页域名 —— 搜索结果里绝不是「官网」。"""

GENERIC_MAIL = {"gmail.com", "gmail.ca", "hotmail.com", "hotmail.ca", "yahoo.com", "yahoo.ca",
                "outlook.com", "outlook.ca", "icloud.com", "live.com", "live.ca", "aol.com", "me.com",
                "msn.com", "telus.net", "shaw.ca", "bell.net", "sympatico.ca", "rogers.com",
                "protonmail.com", "mail.com", "videotron.ca", "eastlink.ca", "cogeco.ca", "sasktel.net"}
"""JD 里的通用邮箱域 —— 不是官网线索。"""

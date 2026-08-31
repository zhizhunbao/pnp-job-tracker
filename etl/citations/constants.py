"""
citations 域常量 —— 字段级来源注册表(数据集级 citation + 派生字段口径)+ 着陆页抓取词表。

2026-08-31 批D 立域:原 ops/verify_field_source_pages.py 全溶五件,注册表数据一字未改。
判据照 company/dli 样张:常量只装 JSON 装得下的(标量/字符串表/正则/配置 dict)+ OUT 路径;
唯一特批 import = `re` 与 `paths`(件套以 citations.constants 包名被引,门先摆 etl/ 上路径)。
注释方言(2026-08-30):每个常量用赋值后的裸字符串 docstring,行内 # 退役;
零字符串令:functions 里除空串/数值外一切字面量住这。
"""
import re

import paths

OUT_FILE = paths.RAW / "sources" / "field-sources.json"
"""输出:字段 → 来源注册表(跟踪,09 直通进 mart)。"""

OUT_INDENT = 2
"""落盘缩进(raw 惯例 2,与原脚本逐字一致)。"""

DATASETS = [
    {
        "publisher": "Job Bank / Guichet-Emplois (Government of Canada)",
        "url": "https://www.jobbank.gc.ca/jobsearch/",
        "fields": ["title", "company", "salary", "datePosted", "address", "city", "province", "country", "source", "jd"],
    },
    {
        "publisher": "Statistics Canada — NOC 2021 Version 1.0",
        "url": "https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1",
        "fields": ["noc", "teer", "broad", "mid", "fine"],
    },
    {
        "publisher": "ESDC — Wages by occupation (Open Government)",
        "url": "https://open.canada.ca/data/en/dataset/adad580f-76b0-4502-bd05-20c125de9116",
        "fields": ["wageMedHr", "wageMedYr"],
    },
    {
        "publisher": "IRCC — Express Entry category-based selection",
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations/category-based-selection.html",
        "fields": ["ee"],
    },
    {
        "publisher": "IRCC — Atlantic Immigration Program",
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html",
        "fields": ["aip"],
    },
    {
        "publisher": "IRCC — Provincial Nominee Program",
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html",
        "fields": ["pnp"],
    },
    {
        "publisher": "IRCC — Rural and Francophone Community Immigration pilots",
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots.html",
        "fields": ["pilot"],
    },
    {
        "publisher": "GeoNames — Canada postal codes (open data)",
        "url": "https://download.geonames.org/export/zip/",
        "fields": ["district"],
    },
    {
        "publisher": "ESDC — TFWP positive LMIA employers list (Open Government)",
        "url": "https://open.canada.ca/data/en/dataset/90fed587-1364-4f33-a9ee-208181dc0b97",
        "fields": ["lmia"],
    },
]
"""注册表:数据集级来源(fields 共享同一 citation;URL=着陆页)。

契约(advisor-fields-plan Part C):
- 来源解释 = 抓取页面 <title>/meta description **原文**(不经 LLM 不翻译);
  抓取失败 → unverified 只留链接(宁可留空)。
- 记录级 citation(pnp 通道 url / applyUrl / AIP 名单)已在各维度,前端优先显示 ——
  本表只管数据集级兜底。
- URL 聚合自各 build 步骤既有常量(wages/noc/ee 三域),不重复维护数据 URL;
  citation 用**着陆页**(人能读的页面,title/description 有意义;数据文件 URL 抓不出解释)。
末条 lmia = E6-02 雇主外劳雇佣记录(正面 LMIA 清单;着陆页 = 开放数据集页)。"""

DERIVED = [
    {"field": "score", "note": "评分为本站派生:TEER 基准 + 紧缺大类 + 省具名通道 + 第一方雇主 + 经验 + 省份(弹框有逐项明细);底层来源 = StatCan NOC × 省提名清单", "basedOn": ["noc", "pnp"]},
    {"field": "vsMedian", "note": "vs 中位为本站派生:本岗年薪 ÷ 当地同 NOC 中位年薪 − 1;中位来自 ESDC 工资开放数据", "basedOn": ["salary", "wageMedYr"]},
    {"field": "salaryYr", "note": "年薪(折算)为本站派生:从原帖薪资文本按时薪×2080/周薪×52 等口径归一;原始薪资见官方原帖", "basedOn": ["salary"]},
    {"field": "accessibility", "note": "经验级别为本站派生:按职位文本启发式判定(co-op/初/中/高级),非官方分级", "basedOn": ["title"]},
    {"field": "status", "note": "状态/下架为本站口径:本次抓取未见 且 发布超 30 天 → 标记已下架;非雇主官方状态", "basedOn": ["datePosted"]},
    {"field": "firstSeen", "note": "首次收录/更新时间为本站抓取时间戳,非职位官方发布/修改时间", "basedOn": ["datePosted"]},
    {"field": "origin", "note": "渠道为本站口径:抓取来源(jobbank/ats/directory),表示发布通道,不代表雇主真假", "basedOn": ["source"]},
    {"field": "direct", "note": "第一方/转贴为本站派生:按发布渠道与公司名(中介名单)判定", "basedOn": ["source"]},
    {"field": "match", "note": "「与我的匹配」为本站派生:你自报的档案 × 公开清单/抽选数据的机械比对,非资格认定", "basedOn": ["pnp", "ee", "wageMedYr"]},
]
"""派生字段:本站口径(kind=derived,不抓网;citation = 口径一句 + 底层来源链)。
静态文案住这里,单一来源。"""

UA = {"User-Agent": "Mozilla/5.0 (compatible; pnp-job-tracker source-verifier)"}
"""抓着陆页的自报家门头。"""

FETCH_TIMEOUT_S = 30
"""单个着陆页抓取超时。"""

HTTP_OK = 200
"""只有 200 才算验证通过,其余一律 unverified(宁可留空)。"""

TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
"""页面标题原文。"""

DESC_RE = re.compile(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', re.I | re.S)
"""meta description 原文(name 在前的写法)。"""

DESC_ALT_RE = re.compile(r'<meta[^>]+content=["\'](.*?)["\'][^>]+name=["\']description["\']', re.I | re.S)
"""meta description 原文(content 在前的写法)。"""

SPACE_RE = re.compile(r"\s+")
"""标题/描述里的连续空白折成一个空格。"""

SPACE = " "
"""折叠后的空白。"""

TITLE_MAX = 300
"""标题落盘上限。"""

DESC_MAX = 500
"""描述落盘上限。"""

KIND_DATASET = "dataset"
"""行类型:数据集级 citation(抓网验证)。"""

KIND_DERIVED = "derived"
"""行类型:本站派生字段(不抓网)。"""

STATUS_VERIFIED = "verified"
"""状态:着陆页 200 且抽到原文。"""

STATUS_UNVERIFIED = "unverified"
"""状态:抓取失败/非 200 —— 只留链接,不编解释。"""

STATUS_DERIVED = "derived"
"""状态:派生字段(无外部页面可验)。"""

PUBLISHER_DERIVED = "PNP Job Tracker(本站派生)"
"""派生行的 publisher 值。"""

K_URL = "url"
"""注册表条目键:着陆页 URL。"""

K_FIELDS = "fields"
"""注册表条目键:共享该 citation 的前端字段清单。
(publisher/url/field/note 四键只在 to_* 行构造器体内出现,按方言律⑩ 不另立 K_ 常量。)"""

IN_TPL = "IN : (registry in-script, {n} datasets / {m} derived)"
"""输入报行(注册表住脚本内,无输入文件)。"""

OUT_TPL = "OUT: {path}"
"""输出报行。"""

FETCH_FAIL_TPL = "  ! {url} → {name}(unverified)"
"""单页抓取失败留痕行(异常类名;这一页留空,下轮续验)。"""

DONE_TPL = "field-sources: {n} 行(verified {ok} / unverified {un} / derived {derived})"
"""收口报行(带产出行数,宪法既有)。"""

"""
build_aip_rules — 联邦大西洋移民计划(AIP)申请人门槛库(G-AIP,2026-08-09;
设计 docs/design/一键三合一判定-20260809.md §4:#287 的硬前置,AIP 申请人侧生产 0 行)。

**quote-anchored**(照 build_pgwp.py / build_ee_rules.py 惯例):每条规则由人从官方原文抄成
结构化行,本脚本每轮实抓核对,**逐条验证引用仍逐字存在于对应页面**——页面改版引用消失
→ 保留旧表 + exit 1,绝不拿半份数据盖好数据。

只读 crawl 缓存(URL 铁律:先 grep manifest,再谈抓不到,禁猜 URL、禁现场上网抓)。
`data/crawl/fed-aip/` 首轮只到 depth 2(17 页),**申请人门槛细节页(work-experience /
proof-funds / settlement-service-provider-organizations 等)全挂在 how-to-immigrate/
eligibility.html 之下一跳、是 depth 3**,depth=2 探不到 —— 本批把 etl/crawl/discover_sources.py
的 fed-aip 种子深度 2→3 重跑过一次(照 fed-ee depth=4 同款先例),缺失页已在缓存里,
本脚本不再自己发请求。

产出 raw/ircc/aip_rules.json,形状对齐 raw/ircc/pgwp_rules.json / raw/ee/fed-eligibility.json
(province='FED' program='AIP',09 IN_REQ_TABLES 直接消费 → mart pnp_requirements →
引擎 facts.requirements 免费拿到)。

收的门槛:工作经验(小时数/时间窗/TEER 匹配/国际毕业生豁免)、语言(CLB 按 TEER 分档)、
学历(境内/境外 + ECA)、job offer 条款(全职/非季节性/时长/雇主指定/健康照护职业互认)、
安家资金(按家庭人数档)。页面上没写的一律不编(如「官方不公布」需要举证,举不出来落
not-collected —— 本表目前每条都有官方原句,不存在这种行)。

Usage:  uv run python etl/build_aip_rules.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))
sys.path.insert(0, str(_HERE / "crawl"))
import _paths  # noqa: E402
from cache import get as crawl_get  # noqa: E402
from bs4 import BeautifulSoup  # noqa: E402

# ── IN(crawl 役产物;URL 是键,实体在 data/crawl/fed-aip/html_cache/)────────
_BASE = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/"
         "immigrate-canada/atlantic-immigration")
IN_URL_ELIG = _BASE + "/how-to-immigrate/eligibility.html"          # Who can apply(索引页)
IN_URL_WORK = _BASE + "/how-to-immigrate/work-experience.html"      # 工作经验门槛+国际毕业生豁免
IN_URL_FUNDS = _BASE + "/proof-funds.html"                          # 安家资金(按家庭人数档)
IN_URL_JOBOFFER = _BASE + "/how-to-immigrate/job-offer.html"        # job offer 条款
IN_URL_LANG = _BASE + "/language-testing.html"                      # 语言 CLB 门槛(按 TEER 分档)
IN_URL_EDU = _BASE + "/education-assessment.html"                   # 学历要求 + ECA

# ── OUT ────────────────────────────────────────────────────────────────────
OUT = _paths.IRCC / "aip_rules.json"


def norm(t: str) -> str:
    """归一化后再比对:弯引号→直引号、压空白 —— 引用核对不被排版噪音干扰(同 build_pgwp/build_ee_rules)。"""
    t = t.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", t).strip()


def load(url: str) -> tuple:
    """只走 crawl 缓存:没爬到就报错,不偷偷 httpx 补(那正是「猜 URL」的老病根)。"""
    html, fetched = crawl_get(url)
    if not html:
        raise SystemExit(f"✗ crawl 缓存里没有这一页(先跑 etl/crawl/discover_sources.py fed-aip):{url}")
    main = BeautifulSoup(html, "html.parser").find("main")
    return norm(main.get_text(" ", strip=True)), fetched


# 安家资金表(proof-funds.html,「Minimum amount of money you need to immigrate to Canada
# based on the size of your family」,Updated July 29, 2025):一行一个家庭规模档,
# 用 familySize 列(schema 已有,ON/其余省份门槛表同款用法)而不是塞进 basis 编码。
FUNDS_TABLE = [(1, 3815), (2, 4750), (3, 5840), (4, 7090), (5, 8042), (6, 9070), (7, 10098)]

# 一条规则一条官方原文;page 指向下面 main() 里 pages 字典的键,quote 必须逐字(归一化后)
# 出现在该页上,否则整表不更新(照 build_pgwp/build_ee_rules)。
RULES = [
    # ---- 工作经验(work-experience.html)----
    {"page": "work", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "windowYears=5;hoursPerWeek=30;minYears=1",
     "label": "At least 1,560 hours (30 hrs/week for 1 year) of related work experience in the past 5 years",
     "quote": "You need at least 1,560 hours of related work experience over the past 5 years."},
    {"page": "work", "factor": "workPeriodMin", "op": ">=", "value": 1, "unit": "years",
     "basis": "windowYears=5",
     "label": "The 1,560 hours must be worked over a period of at least 1 year",
     "quote": "You must have worked these hours over a period of at least 1 year."},
    {"page": "work", "factor": "workTeerMatch", "op": "rule", "value": "same-or-higher", "unit": "",
     "basis": "jobOfferTeer0->workTeer0,1,2,3,4;jobOfferTeer1->workTeer1,2,3,4;"
              "jobOfferTeer2->workTeer2,3,4;jobOfferTeer3->workTeer3,4;jobOfferTeer4->workTeer4",
     "label": "Work experience must be in the same TEER category as the job offer, or higher",
     "quote": "be in the same TEER category as your job offer or higher"},
    {"page": "work", "factor": "workPaid", "op": "rule", "value": "paid-only", "unit": "",
     "label": "Work experience must be from a paid job; volunteer work and unpaid internships don't count",
     "quote": "have been for a paid job"},
    {"page": "work", "factor": "workSelfEmployed", "op": "rule", "value": "excluded", "unit": "",
     "label": "Self-employment does not count toward the work experience requirement",
     "quote": "not be from a self-employed job"},
    # 国际毕业生豁免(work-experience.html「Exemption if you studied and graduated in Atlantic Canada」)
    {"page": "work", "factor": "workExemptGrad", "op": "rule", "value": "exempt-if-atlantic-grad", "unit": "",
     "label": "International graduates of a recognized Atlantic Canada post-secondary institution "
              "are exempt from the work experience requirement",
     "quote": "You do not need to meet the work experience requirements if you're an international "
              "graduate and you:"},
    {"page": "work", "factor": "workExemptGradCredentialYears", "op": ">=", "value": 2, "unit": "years",
     "basis": "appliesTo=workExemptGrad",
     "label": "Exemption credential (degree/diploma/certificate/trade or apprenticeship) must have taken at least 2 years",
     "quote": "took at least 2 years"},
    {"page": "work", "factor": "workExemptGradRecency", "op": "<=", "value": 2, "unit": "years",
     "basis": "appliesTo=workExemptGrad",
     "label": "Exemption credential must have been received less than 2 years before applying for PR",
     "quote": "you received less than 2 years before you applied for permanent residence"},
    {"page": "work", "factor": "workExemptGradResidencyMonths", "op": ">=", "value": 16, "unit": "months",
     "basis": "appliesTo=workExemptGrad;windowYears=2",
     "label": "Must have lived in 1 of the 4 Atlantic provinces for at least 16 months during the last "
              "2 years before graduating",
     "quote": "lived in 1 of the 4 Atlantic provinces for at least 16 months during the last 2 years "
              "before you graduated"},

    # ---- Job offer 条款(how-to-immigrate/job-offer.html)----
    {"page": "joboffer", "factor": "offerFullTime", "op": ">=", "value": 30, "unit": "hoursPerWeek",
     "label": "Job offer must be full-time: at least 30 hours a week",
     "quote": "full-time (at least 30 hours a week)"},
    {"page": "joboffer", "factor": "offerNonSeasonal", "op": "rule", "value": "non-seasonal", "unit": "",
     "label": "Job offer must be non-seasonal (consistent and paid all year)",
     "quote": "non-seasonal (consistent and paid all year)"},
    {"page": "joboffer", "factor": "offerDuration", "stream": "teer-0-3", "op": ">=", "value": 1, "unit": "years",
     "label": "TEER 0/1/2/3 job offers: at least 1 year of employment from the date of becoming a permanent resident",
     "quote": "for at least 1 year from the time you become a permanent resident for TEER 0, 1, 2 or 3 job offers"},
    {"page": "joboffer", "factor": "offerDuration", "stream": "teer-4", "op": "rule", "value": "indefinite", "unit": "",
     "label": "TEER 4 job offers: permanent employment with no set end date",
     "quote": "for permanent employment with no set end date for TEER 4 job offers"},
    {"page": "joboffer", "factor": "offerSkillLevel", "op": "rule", "value": "same-or-higher", "unit": "",
     "label": "Job offer must be at the same or higher skill level as the qualifying work experience",
     "quote": "at the same or higher skill level as your qualifying work experience"},
    {"page": "joboffer", "factor": "offerDesignatedEmployer", "op": "rule", "value": "required", "unit": "",
     "label": "The job offer must come from a provincially designated employer",
     "quote": "Each province designates employers who can offer jobs under this program."},
    {"page": "joboffer", "factor": "offerOwnershipExclusion", "op": "rule", "value": "excluded", "unit": "",
     "label": "The job offer can't come from a company where you (or your spouse/common-law partner) "
              "are a majority owner",
     "quote": "The job offer can't come from a company in which you, your spouse or common-law partner "
              "are a majority owner."},
    # 健康照护职业互认(直接命中 #287 完美案例 NOC 33102 continuing care assistant 的路径):
    # LPN/RN 工作经验可用来满足 NOC 33102/44101 岗位的 job offer 门槛
    {"page": "joboffer", "factor": "workHealthcareCrossQualify", "op": "rule",
     "value": "NOC31201/31301-experience->NOC33102/44101-offer", "unit": "",
     "label": "Work experience as a licensed practical nurse (NOC 31201) or registered nurse (NOC 31301) "
              "can be used for a job offer in NOC 33102 or NOC 44101",
     "quote": "Work experience in NOC 31201 (licensed practical nurses) and NOC 31301 (registered nurses) "
              "can be used for a job offer in"},

    # ---- 语言(language-testing.html)----
    {"page": "lang", "factor": "language", "stream": "teer-0-3", "op": ">=", "value": 5, "unit": "CLB",
     "label": "CLB 5 minimum for a job offer in TEER 0, 1, 2 or 3",
     "quote": "CLB 5 for job offer in TEER 0, 1, 2 or 3"},
    {"page": "lang", "factor": "language", "stream": "teer-4", "op": ">=", "value": 4, "unit": "CLB",
     "label": "CLB 4 minimum for a job offer in TEER 4",
     "quote": "CLB 4 for job offer in TEER 4"},
    {"page": "lang", "factor": "languageTestRecency", "op": "<=", "value": 2, "unit": "years",
     "label": "Language test results must be less than 2 years old when you apply",
     "quote": "These results must be less than 2 years old when you apply."},

    # ---- 学历(education-assessment.html)----
    {"page": "edu", "factor": "education", "stream": "teer-0-1", "op": "rule",
     "value": "canadian-1yr-postsecondary", "unit": "",
     "label": "Education in Canada, TEER 0/1: a Canadian one-year post-secondary (or higher) credential",
     "quote": "a Canadian one-year post-secondary (or higher) educational credential"},
    {"page": "edu", "factor": "education", "stream": "teer-2-4", "op": "rule",
     "value": "canadian-high-school", "unit": "",
     "label": "Education in Canada, TEER 2/3/4: a Canadian high school diploma (or higher)",
     "quote": "a Canadian high school diploma (or higher)"},
    {"page": "edu", "factor": "educationForeign", "stream": "teer-0-1", "op": "rule",
     "value": "foreign-equivalent-1yr-postsecondary", "unit": "",
     "label": "Education outside Canada, TEER 0/1: the foreign equivalent of a Canadian one-year "
              "post-secondary (or higher) credential",
     "quote": "the foreign equivalent of a Canadian one-year post-secondary (or higher) educational credential"},
    {"page": "edu", "factor": "educationForeign", "stream": "teer-2-4", "op": "rule",
     "value": "foreign-equivalent-high-school", "unit": "",
     "label": "Education outside Canada, TEER 2/3/4: the foreign equivalent of a Canadian high school diploma (or higher)",
     "quote": "the foreign equivalent of a Canadian high school diploma (or higher)"},
    {"page": "edu", "factor": "educationEcaRequired", "op": "rule", "value": "eca-required", "unit": "",
     "label": "Foreign education needs an Educational Credential Assessment (ECA) for immigration",
     "quote": "You must get an educational credential assessment (ECA) for immigration."},
    {"page": "edu", "factor": "educationEcaValidity", "op": "<=", "value": 5, "unit": "years",
     "label": "An ECA is only valid for 5 years",
     "quote": "ECAs are only valid for 5 years."},

    # ---- 安家资金(proof-funds.html)----
    {"page": "funds", "factor": "fundsRequired", "op": "rule", "value": "required", "unit": "",
     "label": "Must prove enough money to support yourself and your family after arriving in Canada",
     "quote": "You must prove to us that you have enough money to support yourself and your family "
              "after you get to Canada."},
    {"page": "funds", "factor": "fundsWaivedIfWorking", "op": "rule", "value": "waived-if-authorized-worker", "unit": "",
     "label": "Proof of funds is waived if already working in Canada with a valid work permit",
     "quote": "You do not need to show proof of funds if you're already working in Canada with a valid work permit."},
    {"page": "funds", "factor": "fundsPerAdditionalMember", "op": "rule", "value": None, "unit": "CAD",
     "basis": "perAdditionalMemberCAD=1028;baseFamilySize=7",
     "label": "For each additional family member beyond 7, add $1,028",
     "quote": "If more than 7 people, for each additional family member, add $1,028"},
] + [
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": amount, "unit": "CAD",
     "familySize": n, "basis": f"asOf=2025-07-29",
     "label": f"Minimum settlement funds for a family of {n}: ${amount:,} CAD",
     "quote": f"{n} ${amount:,}"}
    for n, amount in FUNDS_TABLE
]


def main() -> None:
    urls = {"elig": IN_URL_ELIG, "work": IN_URL_WORK, "funds": IN_URL_FUNDS,
            "joboffer": IN_URL_JOBOFFER, "lang": IN_URL_LANG, "edu": IN_URL_EDU}
    print(f"OUT : {OUT}")
    pages = {}
    for key, url in urls.items():
        text, fetched = load(url)
        pages[key] = {"url": url, "fetched": fetched, "text": text}
        print(f"IN  : {url}  (crawl 缓存 {fetched})")

    missing = [r for r in RULES if norm(r["quote"]) not in pages[r["page"]]["text"]]
    if missing:
        print(f"✗ {len(missing)}/{len(RULES)} 条官方引用在页面上消失(改版?)—— 保留旧表,人工重核:")
        for r in missing:
            print(f"✗   [{r['factor']}/{r.get('stream', '')}] {r['quote'][:90]}")
        raise SystemExit(1)

    reqs = [{
        "stream": r.get("stream", ""), "subject": "applicant", "factor": r["factor"], "op": r["op"],
        "value": r["value"], "valueText": r["quote"], "unit": r["unit"],
        "basis": r.get("basis", ""), "label": r["label"],
        **({"familySize": r["familySize"]} if "familySize" in r else {}),
        "url": pages[r["page"]]["url"], "fetched": pages[r["page"]]["fetched"],
    } for r in RULES]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": "FED", "program": "AIP", "url": IN_URL_ELIG,
        "fetched": date.today().isoformat(),
        "note": "quote-anchored:valueText=官方原文,本脚本每轮验证其仍逐字在页面上;字段语义见 basis。"
                "覆盖工作经验(小时数/时间窗/TEER 匹配/国际毕业生豁免)、job offer 条款(全职/非季节性/"
                "时长/雇主指定/健康照护职业互认)、语言(CLB 按 TEER 分档)、学历(境内/境外+ECA)、"
                "安家资金(fundsMinimum 按 familySize 分档,fundsPerAdditionalMember 是超 7 人后的"
                "每人递增,value=None 编码进 basis,照 22P02 教训)。"
                "AIP 只是三个大西洋省(NB/NS/PE/NL)共用的联邦项目框架——省一级各自的紧缺职业清单/"
                "雇主指定名单不在本表,那是各省 <省>-req.json 的事。",
        "requirements": reqs,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ {len(reqs)} 条规则全部引用核验通过 → {OUT.name}")


if __name__ == "__main__":
    main()

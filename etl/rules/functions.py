"""
rules 域函数 —— quote-anchored 规则引擎(段 1)+ 三个试点各一个入口(段 2-4,门直调)。

沿革:2026-09-06 立域。引擎从 aip 域 functions 第 3 段搬入并按 ProgramSpec 参数化(原段把 RULES / PAGE_URLS /
OUT_AIP_RULES / RULES_PROGRAM 写死成模块常量;一个域装三个试点后引擎只认规格,行为逐条与原段等价:
只读 crawl 缓存 → main 正文归一 → 逐条核引用 → 缺一条即保留旧表 + SystemExit(1) → 全过才落盘)。
零字符串令:一切字面量住 constants;to_* 体内字典键是唯一例外(行构造器就是键的家)。
"""
import json
from datetime import date
from typing import cast

from bs4 import BeautifulSoup

import paths
from log.functions import say
from fetch.constants import SPACE_SEP, WS_RE
from crawl.functions import get_cached_page
from rules.constants import (
    AIP_CRAWL_SLUG, AIP_PAGE_URLS, AIP_PROGRAM, AIP_RULES, AIP_RULES_NOTE, AIP_URL_ELIG,
    FCIP_CRAWL_SLUG, FCIP_PAGE_URLS, FCIP_PROGRAM, FCIP_RULES, FCIP_RULES_NOTE, FCIP_URL_ELIG,
    HTML_PARSER, INDENT_1, K_FACTOR, K_FAMILY_SIZE, K_PAGE, K_QUOTE, K_STREAM, K_TEXT, MAIN_TAG,
    MISSING_QUOTE_LEN, OUT_AIP_RULES, OUT_FCIP_RULES, OUT_RCIP_RULES, QUOTE_FIXES,
    RCIP_CRAWL_SLUG, RCIP_PAGE_URLS, RCIP_PROGRAM, RCIP_RULES, RCIP_RULES_NOTE, RCIP_URL_ELIG,
    RULES_DONE_TPL, RULES_IN_TPL, RULES_MISSING_ROW_TPL, RULES_MISSING_TPL, RULES_NO_CACHE_TPL,
    RULES_OUT_TPL, RULES_PROVINCE_FED, SUBJECT_APPLICANT,
)
from rules.scheme import (
    LoadIn, MissingIn, PageEntryIn, PageOut, ProgramSpec, RequirementIn, RulesDocIn, SoupNodeLike,
)

# =========================================================================
# 1. 引擎词汇(三段共用:取页、核引用、落盘)
# =========================================================================


def build_rules(spec: ProgramSpec) -> None:
    """一个试点的申请人门槛库 → <program>_rules.json。

    **每轮逐条验证官方引用仍逐字存在于对应页面**:页面改版引用消失 → 保留旧表 + exit 1,
    绝不拿半份数据盖好数据(门见 SystemExit 直接中止本轮)。
    """
    say(RULES_OUT_TPL.format(path=spec.out))
    pages: dict = {}
    for key, url in spec.page_urls.items():
        got = load(LoadIn(url=url, slug=spec.slug))
        pages[key] = to_page_entry(PageEntryIn(url=url, fetched=got.fetched, text=got.text))
        say(RULES_IN_TPL.format(url=url, fetched=got.fetched))
    missing: list = []
    for r in spec.rules:
        if norm(str(r[K_QUOTE])) not in pages[r[K_PAGE]][K_TEXT]:
            missing.append(r)
    if len(missing) > 0:
        report_missing(MissingIn(missing=missing, total=len(spec.rules)))
    reqs: list = []
    for r in spec.rules:
        reqs.append(to_requirement(RequirementIn(rule=r, page=pages[r[K_PAGE]])))
    spec.out.parent.mkdir(parents=True, exist_ok=True)
    paths.write_text(paths.WriteTextIn(path=spec.out,
                                       text=json.dumps(to_rules_doc(RulesDocIn(spec=spec, requirements=reqs)),
                                                       ensure_ascii=False, indent=INDENT_1)))
    say(RULES_DONE_TPL.format(n=len(reqs), name=spec.out.name))


def report_missing(x: MissingIn) -> None:
    """引用消失时逐条点名后 exit 1(保留旧表,人工重核)。"""
    say(RULES_MISSING_TPL.format(n=len(x.missing), total=x.total))
    for r in x.missing:
        say(RULES_MISSING_ROW_TPL.format(factor=r[K_FACTOR], stream=r.get(K_STREAM, ""),
                                         quote=r[K_QUOTE][:MISSING_QUOTE_LEN]))
    raise SystemExit(1)


def load(x: LoadIn) -> PageOut:
    """只走 crawl 缓存:没爬到就报错,不偷偷 httpx 补(那正是「猜 URL」的老病根)。
    slug 只进缺页提示(原 aip 段写死 fed-aip,搬入后按试点规格带)。"""
    hit = get_cached_page(x.url)
    if not hit.html:
        raise SystemExit(RULES_NO_CACHE_TPL.format(slug=x.slug, url=x.url))
    main = cast(SoupNodeLike, BeautifulSoup(hit.html, HTML_PARSER).find(MAIN_TAG))
    return PageOut(text=norm(main.get_text(SPACE_SEP, strip=True)), fetched=hit.fetched)


def norm(t: str) -> str:
    """归一化后再比对:弯引号→直引号、压空白 —— 引用核对不被排版噪音干扰
    (同 build_pgwp / build_ee_rules)。"""
    out = t
    for bad, good in QUOTE_FIXES:
        out = out.replace(bad, good)
    return WS_RE.sub(SPACE_SEP, out).strip()


def to_page_entry(x: PageEntryIn) -> dict:
    """一页在 pages 表里的记录(键词汇只住行构造器)。"""
    return {"url": x.url, "fetched": x.fetched, "text": x.text}


def to_requirement(x: RequirementIn) -> dict:
    """一条规则 + 它所属页 → 产出行。

    familySize 只有安家资金分档规则才有,条件加键(键序照旧:label 之后、url 之前)。
    """
    out = {
        "stream": x.rule.get("stream", ""), "subject": SUBJECT_APPLICANT,
        "factor": x.rule["factor"], "op": x.rule["op"],
        "value": x.rule["value"], "valueText": x.rule["quote"], "unit": x.rule["unit"],
        "basis": x.rule.get("basis", ""), "label": x.rule["label"],
    }
    if K_FAMILY_SIZE in x.rule:
        out["familySize"] = x.rule["familySize"]
    out["url"] = x.page["url"]
    out["fetched"] = x.page["fetched"]
    return out


def to_rules_doc(x: RulesDocIn) -> dict:
    """<program>_rules.json 的文档形(province 恒 FED:三个试点都是联邦项目框架)。"""
    return {"province": RULES_PROVINCE_FED, "program": x.spec.program, "url": x.spec.index_url,
            "fetched": date.today().isoformat(),
            "note": x.spec.note, "requirements": x.requirements}


# =========================================================================
# 2. aip 步(AIP 申请人门槛库,quote-anchored;aip 域第 3 段整段搬入,2026-09-06)
# =========================================================================


def build_aip_rules() -> None:
    """AIP 申请人门槛库 → aip_rules.json(入口,门直调;判据见 constants.AIP_RULES_DOC)。"""
    build_rules(ProgramSpec(program=AIP_PROGRAM, slug=AIP_CRAWL_SLUG, index_url=AIP_URL_ELIG,
                            page_urls=AIP_PAGE_URLS, rules=AIP_RULES, out=OUT_AIP_RULES, note=AIP_RULES_NOTE))


# =========================================================================
# 3. rcip 步(RCIP 偏远社区试点申请人门槛库,quote-anchored)
# =========================================================================


def build_rcip_rules() -> None:
    """RCIP 申请人门槛库 → rcip_rules.json(入口,门直调;判据见 constants.RCIP_RULES_DOC)。"""
    build_rules(ProgramSpec(program=RCIP_PROGRAM, slug=RCIP_CRAWL_SLUG, index_url=RCIP_URL_ELIG,
                            page_urls=RCIP_PAGE_URLS, rules=RCIP_RULES, out=OUT_RCIP_RULES,
                            note=RCIP_RULES_NOTE))


# =========================================================================
# 4. fcip 步(FCIP 法语社区试点申请人门槛库,quote-anchored)
# =========================================================================


def build_fcip_rules() -> None:
    """FCIP 申请人门槛库 → fcip_rules.json(入口,门直调;判据见 constants.FCIP_RULES_DOC)。"""
    build_rules(ProgramSpec(program=FCIP_PROGRAM, slug=FCIP_CRAWL_SLUG, index_url=FCIP_URL_ELIG,
                            page_urls=FCIP_PAGE_URLS, rules=FCIP_RULES, out=OUT_FCIP_RULES,
                            note=FCIP_RULES_NOTE))

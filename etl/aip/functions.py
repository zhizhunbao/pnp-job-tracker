"""
aip 域函数 —— 全部行为住这(照 company/noc/pnp 全溶样张,方言律全集见
docs/design/etl分域-20260829.md §4)。

2026-08-31 批E 从 pilot 域拆出(Frank「拆成三个 很少有人有法语」):原 pilot/functions.py
的 employers 段与 aip_rules 段整段搬来,**函数体、函数名、每条 docstring 逐字未改**;
批E 拆分改动只有两处形式项 —— 段号重编(2/6 → 2/3)、import 源改指 aip.constants /
aip.scheme。产物路径一字不动(raw/aip/ 两件 + raw/ircc/aip_rules.json)。
**零字符串令**:字面量全住 constants(文案 *_TPL 模板、JSON 键 K_ 词族、官方原句 *_QUOTE);
**显式循环令**:禁推导/genexp/lambda;**内嵌禁令**:内部函数出户成顶层具名函数;
**一参令**:函数至多一参,多入参收 scheme 的 XxxIn dataclass,多返回值收 XxxOut。
日志口径:域内不裸 print,报数走 log.functions.say;各步原有的「✗ / ! / [WARN]」行原样保留
(auto_update 按行首升 ERROR 级,这就是本域的错误通道);原来静默 pass 的 catch 补 err() 留痕。
退出口径两档,逐步不同、逐字保留:
  · employers —— 单省塌方保旧,永不清空,正常返回;
  · aip_rules —— 引用核验未过 → 保留旧表 + SystemExit(1),门见 SystemExit 直接中止本轮。
依赖单边:本文件 → constants/scheme + 基础设施叶(log / fetch / crawl)。
"""
import html as html_lib
import json
from datetime import date

import fitz
import httpx
from bs4 import BeautifulSoup

from log.functions import err, say
from fetch.constants import BROWSER_UA, HDR_UA, LINE_SEP, SPACE_SEP, WS_RE
from crawl.functions import get_cached_page
from aip.constants import (
    BULLET, CDX_PARAMS, CDX_TIMEOUT_S, CDX_URL, EMP_OUT_TPL, EMP_PROV_TPL, EMP_TABLE_HEAD,
    EMP_TIMEOUT_S, ENC_UTF8, ERRORS_IGNORE, GUARD_KEEP_TPL, GUARD_NO_OLD, GUARD_WARN_TPL,
    HTML_PARSER, IN_NL_EMP_DIR, IN_URL_ELIG, K_EMPLOYER, K_FACTOR, K_FAMILY_SIZE, K_LOCATION,
    K_PAGE, K_PROVINCE, K_QUOTE, K_STREAM, K_TECH, K_TEXT, MAIN_TAG, MD_HEAD,
    MD_LINE_SEP, MD_ROW_EMPTY_TPL, MD_ROW_TPL, MD_TAIL, MD_TECH_COLS, MD_TECH_HEAD_TPL,
    MD_TECH_ROW_TPL, MIN_ROWS, MISSING_QUOTE_LEN, NAME_MIN_LEN, NAME_TRIM_CHARS, NL_LOC_RE,
    NL_MARKER, NL_MD_GLOB, NL_OFFICE_RE, NL_TITLE_RE, NOC5_RE, NOISE_RE, NS_LOC_RE, OUT_AIP_DIR,
    OUT_AIP_JSON, OUT_AIP_MD, OUT_AIP_RULES, PAGE_URLS, PDF_FAIL_TPL, PDF_FILETYPE, PDFS,
    PE_FAIL_TPL, PE_LI_RE, PE_MIN_ROWS, PE_NAME_MAX_LEN, PE_NAV_RE, PE_OK_TPL, PE_PAGE,
    PE_SHORT_TPL, PE_TS_LEN, PERCENT_BASE, PROV_NAME, PROV_NL, PROV_NS, PROV_ORDER_ALL,
    PROV_ORDER_TECH, PROV_PE, QUOTE_FIXES, RULES, RULES_DONE_TPL, RULES_IN_TPL,
    RULES_MISSING_ROW_TPL, RULES_MISSING_TPL, RULES_NO_CACHE_TPL, RULES_OUT_NOTE, RULES_OUT_TPL,
    RULES_PROGRAM, RULES_PROVINCE, SKIP_WORDS, SUBJECT_APPLICANT, TECH_NAME, TECH_NOC,
    WAYBACK_TIMEOUT_S, WAYBACK_TPL,
)
from aip.scheme import (
    GuardIn, MdRowIn, NlRowIn, PageEntryIn, PageOut, PdfBulletsIn, PdfRowIn, PeRowIn,
    RequirementIn, RulesDocIn,
)

# =========================================================================
# 1. 共享词汇(纯常量段,无跨段函数 —— 镜像占位)
# =========================================================================

# =========================================================================
# 2. employers 步(AIP 官方指定雇主名录:NL/NB/NS/PE 四省)
# =========================================================================


def scrape_aip_employers() -> None:
    """四省 AIP 官方指定雇主名录 → json + md(入口,门直调)。

    每一路都过 guard:任何一省解析塌方都不许把上一轮的行冲掉
    (NB 1263→29 静默覆盖实撞见 constants.MIN_ROWS_DOC)。
    """
    OUT_AIP_DIR.mkdir(parents=True, exist_ok=True)
    rows = guard(GuardIn(prov=PROV_NL, parsed=load_nl()))
    for prov, url in PDFS.items():
        try:
            parsed = parse_pdf_bullets(PdfBulletsIn(prov=prov, url=url))
        except Exception as e:  # noqa: BLE001
            say(PDF_FAIL_TPL.format(prov=prov, err=e))
            parsed = []
        rows += guard(GuardIn(prov=prov, parsed=parsed))
    rows += load_pe()
    by_prov: dict = {}
    for r in rows:
        by_prov.setdefault(r[K_PROVINCE], []).append(r)
    OUT_AIP_JSON.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding=ENC_UTF8)
    OUT_AIP_MD.write_text(render_employers_md(by_prov), encoding=ENC_UTF8)
    say(EMP_TABLE_HEAD)
    for prov in PROV_ORDER_TECH:
        rs = by_prov.get(prov, [])
        say(EMP_PROV_TPL.format(prov=prov, total=len(rs), tech=count_tech(rs)))
    say(EMP_OUT_TPL.format(path=OUT_AIP_MD))


def load_nl() -> list:
    """NL:从 nl-immigration crawl 语料逐份雇主档抽 —— 这一路**带 NOC**,科技判定精确。"""
    rows: list = []
    for f in sorted(IN_NL_EMP_DIR.glob(NL_MD_GLOB)):
        t = f.read_text(encoding=ENC_UTF8, errors=ERRORS_IGNORE)
        if NL_MARKER not in t:
            continue
        tm = NL_TITLE_RE.search(t)
        name = tm.group(1).strip() if tm else f.stem
        name = NL_OFFICE_RE.split(name)[0].strip()
        loc_m = NL_LOC_RE.search(t)
        location = loc_m.group(1).strip() if loc_m else ""
        tech = False
        for n in NOC5_RE.findall(t):
            if n in TECH_NOC:
                tech = True
        if tech is False:
            tech = bool(TECH_NAME.search(name))
        rows.append(to_nl_row(NlRowIn(name=name, location=location, tech=tech)))
    return rows


def to_nl_row(x: NlRowIn) -> dict:
    """NL 一份雇主档 → 产出行(键词汇只住行构造器)。"""
    return {"province": PROV_NL, "employer": x.name, "location": x.location, "tech": x.tech}


def parse_pdf_bullets(x: PdfBulletsIn) -> list:
    """一省官方名录 PDF → 雇主行。

    每个雇主由「•」引导,名字是它后面第一个非空行(「• name」与「•\\n name」两种都吃),
    所以按 bullet 切段;NS 名单在名字后追加「 - City」,只在该省剥。
    """
    data = httpx.get(x.url, headers={HDR_UA: BROWSER_UA}, follow_redirects=True,
                     timeout=EMP_TIMEOUT_S).content
    doc = fitz.open(stream=data, filetype=PDF_FILETYPE)
    parts: list = []
    for p in doc:
        parts.append(p.get_text())
    rows: list = []
    seen: set = set()
    for chunk in LINE_SEP.join(parts).split(BULLET)[1:]:
        first = first_nonempty_line(chunk)
        if first == "":
            continue
        name = WS_RE.sub(SPACE_SEP, first).strip(NAME_TRIM_CHARS)
        if is_pdf_noise(name):
            continue
        location = ""
        tail = NS_LOC_RE.search(name)
        if tail and x.prov == PROV_NS:
            location = tail.group(1).strip()
            name = name[:tail.start()].strip()
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        rows.append(to_pdf_row(PdfRowIn(prov=x.prov, name=name, location=location)))
    return rows


def first_nonempty_line(chunk: str) -> str:
    """一段 PDF 文本里的第一个非空行(已 strip);全空给空串。"""
    for ln in chunk.splitlines():
        s = ln.strip()
        if s != "":
            return s
    return ""


def is_pdf_noise(name: str) -> bool:
    """这条 bullet 是不是套话/页码残渣(太短、命中套话词、或纯数字标点)。"""
    if len(name) < NAME_MIN_LEN:
        return True
    low = name.lower()
    for s in SKIP_WORDS:
        if s in low:
            return True
    return NOISE_RE.fullmatch(name) is not None


def to_pdf_row(x: PdfRowIn) -> dict:
    """PDF 一条 bullet → 产出行(NB/NS 名单不给行业字段,科技判定只能靠公司名)。"""
    return {"province": x.prov, "employer": x.name, "location": x.location,
            "tech": bool(TECH_NAME.search(x.name))}


def load_pe() -> list:
    """PE:官方页在 WAF 后,经 web.archive.org 快照直取(举证见 constants.PE_DOC)。

    cdx 索引首行是表头,从第 2 行起取最大时间戳 = 最新快照。自带同款塌方闸
    (PE_MIN_ROWS):取不回或解析残缺一律保旧,不清空。
    """
    try:
        cdx = httpx.get(CDX_URL, params=CDX_PARAMS, headers={HDR_UA: BROWSER_UA},
                        timeout=CDX_TIMEOUT_S).json()
        stamps: list = []
        for row in cdx[1:]:
            stamps.append(row[1])
        ts = max(stamps)
        page = httpx.get(WAYBACK_TPL.format(ts=ts, url=PE_PAGE), headers={HDR_UA: BROWSER_UA},
                         follow_redirects=True, timeout=WAYBACK_TIMEOUT_S).text
    except Exception as e:  # noqa: BLE001
        say(PE_FAIL_TPL.format(err=e))
        return pe_previous()
    names = pe_names_of(page)
    if len(names) < PE_MIN_ROWS:
        say(PE_SHORT_TPL.format(n=len(names), floor=PE_MIN_ROWS))
        return pe_previous()
    say(PE_OK_TPL.format(ts=ts[:PE_TS_LEN], n=len(names)))
    rows: list = []
    for n in names:
        rows.append(to_pe_row(PeRowIn(name=n, ts=ts[:PE_TS_LEN])))
    return rows


def pe_names_of(page: str) -> list:
    """快照 html → 名单区的雇主名(<li> 纯文本项;导航/页脚词与超长项剔除)。"""
    names: list = []
    for it in PE_LI_RE.findall(page):
        name = html_lib.unescape(it).strip()
        if name == "" or len(name) > PE_NAME_MAX_LEN or PE_NAV_RE.search(name):
            continue
        names.append(name)
    return names


def to_pe_row(x: PeRowIn) -> dict:
    """PE 快照里的一个名字 → 产出行(asOf = 快照日,不是脚本跑的今天)。"""
    return {"province": PROV_PE, "employer": x.name, "location": "",
            "tech": bool(TECH_NAME.search(x.name)), "asOf": x.ts}


def pe_previous() -> list:
    """PE 上一轮的行(原 `_pe_previous`,2026-08-31 批C 下划线名退役)。"""
    return previous_rows(PROV_PE)


def previous_rows(prov: str) -> list:
    """上一轮落盘里该省的行(解析塌方时的兜底)。

    读不出旧档就只能返回空,但仍不覆盖(见 guard 的判断);原脚本这里是静默 pass,
    2026-08-31 批C 补 err() 留痕(永不吞异常令)。
    """
    if not OUT_AIP_JSON.exists():
        return []
    try:
        old = json.loads(OUT_AIP_JSON.read_text(encoding=ENC_UTF8))
    except Exception as e:  # noqa: BLE001
        err(OUT_AIP_JSON, e)
        return []
    rows: list = []
    for r in old:
        if r.get(K_PROVINCE) == prov:
            rows.append(r)
    return rows


def guard(x: GuardIn) -> list:
    """解析量塌方 → 退回上一轮该省的行;上一轮也没有才认这次的结果。"""
    floor = MIN_ROWS.get(x.prov, 0)
    if len(x.parsed) >= floor:
        return x.parsed
    old = previous_rows(x.prov)
    if len(old) > 0:
        tail = GUARD_KEEP_TPL.format(n=len(old))
    else:
        tail = GUARD_NO_OLD
    say(GUARD_WARN_TPL.format(prov=x.prov, n=len(x.parsed), floor=floor, tail=tail))
    if len(old) > 0:
        return old
    return x.parsed


def render_employers_md(by_prov: dict) -> str:
    """四省汇总表 + 三省科技明细的人读版报告(⚠ 疑似零消费者产出,见 constants.OUT_AIP_MD)。"""
    lines: list = []
    for s in MD_HEAD:
        lines.append(s)
    for prov in PROV_ORDER_ALL:
        lines.append(md_summary_row(MdRowIn(prov=prov, rows=by_prov.get(prov, []))))
    for prov in PROV_ORDER_TECH:
        rs = tech_rows_of(by_prov.get(prov, []))
        if len(rs) == 0:
            continue
        lines.append(MD_TECH_HEAD_TPL.format(name=PROV_NAME[prov], n=len(rs)))
        for s in MD_TECH_COLS:
            lines.append(s)
        for r in sorted(rs, key=employer_key):
            lines.append(MD_TECH_ROW_TPL.format(employer=r[K_EMPLOYER], location=r[K_LOCATION]))
    for s in MD_TAIL:
        lines.append(s)
    return MD_LINE_SEP.join(lines)


def md_summary_row(x: MdRowIn) -> str:
    """md 汇总表的一省行(该省一行都没有 → 占位行)。"""
    if len(x.rows) == 0:
        return MD_ROW_EMPTY_TPL.format(name=PROV_NAME[x.prov])
    tech = count_tech(x.rows)
    return MD_ROW_TPL.format(name=PROV_NAME[x.prov], total=len(x.rows), tech=tech,
                             pct=tech / len(x.rows) * PERCENT_BASE)


def tech_rows_of(rows: list) -> list:
    """该省里被判为科技相关的行。"""
    out: list = []
    for r in rows:
        if r[K_TECH]:
            out.append(r)
    return out


def count_tech(rows: list) -> int:
    """该省科技相关的行数。"""
    return len(tech_rows_of(rows))


def employer_key(row: dict) -> str:
    """md 科技明细的排序键(雇主名小写;原 sorted 的 lambda,2026-08-31 出户成具名)。"""
    return row[K_EMPLOYER].lower()


# =========================================================================
# 3. aip_rules 步(AIP 申请人门槛库,quote-anchored)
# =========================================================================


def build_aip_rules() -> None:
    """AIP 申请人门槛库 → aip_rules.json(入口,门直调)。

    **每轮逐条验证官方引用仍逐字存在于对应页面**:页面改版引用消失 → 保留旧表 + exit 1,
    绝不拿半份数据盖好数据(门见 SystemExit 直接中止本轮)。
    """
    say(RULES_OUT_TPL.format(path=OUT_AIP_RULES))
    pages: dict = {}
    for key, url in PAGE_URLS.items():
        got = load(url)
        pages[key] = to_page_entry(PageEntryIn(url=url, fetched=got.fetched, text=got.text))
        say(RULES_IN_TPL.format(url=url, fetched=got.fetched))
    missing: list = []
    for r in RULES:
        if norm(r[K_QUOTE]) not in pages[r[K_PAGE]][K_TEXT]:
            missing.append(r)
    if len(missing) > 0:
        report_missing(missing)
    reqs: list = []
    for r in RULES:
        reqs.append(to_requirement(RequirementIn(rule=r, page=pages[r[K_PAGE]])))
    OUT_AIP_RULES.parent.mkdir(parents=True, exist_ok=True)
    OUT_AIP_RULES.write_text(json.dumps(to_rules_doc(RulesDocIn(requirements=reqs)),
                                        ensure_ascii=False, indent=1), encoding=ENC_UTF8)
    say(RULES_DONE_TPL.format(n=len(reqs), name=OUT_AIP_RULES.name))


def report_missing(missing: list) -> None:
    """引用消失时逐条点名后 exit 1(保留旧表,人工重核)。"""
    say(RULES_MISSING_TPL.format(n=len(missing), total=len(RULES)))
    for r in missing:
        say(RULES_MISSING_ROW_TPL.format(factor=r[K_FACTOR], stream=r.get(K_STREAM, ""),
                                         quote=r[K_QUOTE][:MISSING_QUOTE_LEN]))
    raise SystemExit(1)


def load(url: str) -> PageOut:
    """只走 crawl 缓存:没爬到就报错,不偷偷 httpx 补(那正是「猜 URL」的老病根)。"""
    hit = get_cached_page(url)
    if not hit.html:
        raise SystemExit(RULES_NO_CACHE_TPL.format(url=url))
    main = BeautifulSoup(hit.html, HTML_PARSER).find(MAIN_TAG)
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
    """aip_rules.json 的文档形。"""
    return {"province": RULES_PROVINCE, "program": RULES_PROGRAM, "url": IN_URL_ELIG,
            "fetched": date.today().isoformat(),
            "note": RULES_OUT_NOTE, "requirements": x.requirements}

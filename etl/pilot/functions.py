"""
pilot 域函数 —— 全部行为住这(照 company/noc/pnp 全溶样张,方言律全集见
docs/design/etl分域-20260829.md §4)。

原五个步骤文件(scrape_aip_employers / build_pilot_details / build_pilot_quota /
build_pilot_communities / build_aip_rules)2026-08-31 批C 溶入本文件,一步一段
(段横幅三行框 + N. 编号,与 constants.py / scheme.py 同名同序镜像),各段入口函数
与原脚本同名、一律零参,门(main.py)直调;行为逐字不变。
**零字符串令**:字面量全住 constants(文案 *_TPL 模板、JSON 键 K_ 词族、官方原句 *_QUOTE);
**显式循环令**:禁推导/genexp/lambda;**内嵌禁令**:内部函数出户成顶层具名函数;
**一参令**:函数至多一参,多入参收 scheme 的 XxxIn dataclass,多返回值收 XxxOut。
日志口径:域内不裸 print,报数走 log.functions.say;各步原有的「✗ / ! / [WARN]」行原样保留
(auto_update 按行首升 ERROR 级,这就是本域的错误通道);原来静默 pass 的 catch 补 err() 留痕。
退出口径三档,逐步不同、逐字保留:
  · employers / communities —— 单省/单锚塌方保旧,永不清空,正常返回;
  · details —— **整步永远 exit 0 不拦役**,总控自身失败在入口函数体内当场吃掉,不漏给门;
  · aip_rules —— 引用核验未过 → 保留旧表 + SystemExit(1),门见 SystemExit 直接中止本轮。
依赖单边:本文件 → constants/scheme + 基础设施叶(log / fetch / crawl)+ 本域私件群 extractors。
"""
import html as html_lib
import json
from datetime import date
from pathlib import Path
from urllib.parse import urljoin

import fitz
import httpx
from bs4 import BeautifulSoup

from log.functions import err, say
from fetch.constants import BROWSER_UA, HDR_UA, LINE_SEP, SPACE_SEP, WS_RE
from crawl.functions import get_cached_page
from pilot.constants import (
    ASOF_LEN, BASELINE_EMP, BULLET, CDX_PARAMS, CDX_TIMEOUT_S, CDX_URL, CITY_MAP, CL_COMMUNITY,
    CL_URL, COMM_COLLAPSE_TPL, COMM_DONE_TPL, COMM_IO_TPL, COMM_NO_ANCHOR, COMM_NOTE,
    COMM_PAGE_SUFFIX, CTYPE_BOTH, DET_CRASH_EXTRACT_TPL, DET_CRASH_TPL, DET_DONE_TPL,
    DET_EMP_NOTE, DET_EMP_SHORT_TPL, DET_ERR_DETAIL_LEN, DET_IO_TPL, DET_KEPT_SEP, DET_KEPT_TPL,
    DET_OCC_NOTE, DET_OCC_SHORT_TPL, EMP_OUT_TPL, EMP_PROV_TPL, EMP_TABLE_HEAD, EMP_TIMEOUT_S,
    ENC_UTF8, ERRORS_IGNORE, ERRORS_REPLACE, GUARD_KEEP_TPL, GUARD_NO_OLD, GUARD_WARN_TPL,
    HTML_CACHE_DIR, HTML_PARSER, IN_COMMUNITIES, IN_CRAWL, IN_MANIFEST, IN_NL_EMP_DIR,
    IN_URL_ELIG, K_ASOF, K_CITIES, K_COMMUNITY, K_CRAWLED_AT, K_EMPLOYER, K_EMPLOYERS,
    K_EMPLOYERS_URL, K_FACTOR, K_FAMILY_SIZE, K_FIRST_COME, K_FIRST_COME_QUOTE, K_FIRST_COME_URL,
    K_HTML, K_LOCATION, K_NAME, K_OCCUPATIONS, K_OCCUPATIONS_URL, K_PAGE, K_PAGES, K_PER_INTAKE,
    K_PER_INTAKE_QUOTE, K_PER_INTAKE_URL, K_PROVINCE, K_QUOTE, K_REMAINING, K_REMAINING_QUOTE,
    K_REMAINING_URL, K_ROWS, K_STREAM, K_TECH, K_TEXT, K_TYPE, K_URL, LIVE_UA,
    LIVE_TIMEOUT_S, MAIN_TAG, MANIFEST_FILE, MD_HEAD, MD_LINE_SEP, MD_ROW_EMPTY_TPL, MD_ROW_TPL,
    MD_TAIL, MD_TECH_COLS, MD_TECH_HEAD_TPL, MD_TECH_ROW_TPL, MIN_FCIP, MIN_OCC, MIN_RCIP,
    MIN_ROWS, MISSING_QUOTE_LEN, NAME_MIN_LEN, NAME_TRIM_CHARS, NL_LOC_RE, NL_MARKER, NL_MD_GLOB,
    NL_OFFICE_RE, NL_TITLE_RE, NOC5_RE, NOISE_RE, NS_LOC_RE, OFFICIAL_HOSTS, OUT_AIP_DIR,
    OUT_AIP_JSON, OUT_AIP_MD, OUT_AIP_RULES, OUT_COMMUNITIES, OUT_EMP, OUT_OCC, OUT_QUOTA,
    PAGE_URLS, PDF_FAIL_TPL, PDF_FILETYPE, PDFS, PE_FAIL_TPL, PE_LI_RE, PE_MIN_ROWS,
    PE_NAME_MAX_LEN, PE_NAV_RE, PE_OK_TPL, PE_PAGE, PE_SHORT_TPL, PE_TS_LEN, PERCENT_BASE,
    PROV_HINT, PROV_NAME, PROV_NL, PROV_NS, PROV_ORDER_ALL, PROV_ORDER_TECH, PROV_PE, PROV_RE,
    QUOTA_DONE_TPL, QUOTA_FLAG_KV_TPL, QUOTA_FLAG_LABELS, QUOTA_FLAG_NONE, QUOTA_FLAG_OCC_TPL,
    QUOTA_FLAG_SEP, QUOTA_IO_TPL, QUOTA_LIVE_FAIL_TPL, QUOTA_LIVE_FLAG_TPL, QUOTA_LIVE_ROW_TPL,
    QUOTA_LIVE_SKIP_TPL, QUOTA_NOTE, QUOTA_ROW_TPL, QUOTA_SKIP_TPL, QUOTE_AFTER, QUOTE_BEFORE,
    QUOTE_FIXES, RE_CL_PER_INTAKE, RE_COMM_LINK, RE_FIRST_COME, RE_FRANCO_H3, RE_NOC,
    RE_OCC_FULL, RE_OCC_NOT_FULL, RE_PER_INTAKE, RE_REMAINING, RE_RURAL_H3, RE_WK_PER_INTAKE,
    RULES, RULES_DONE_TPL, RULES_IN_TPL, RULES_MISSING_ROW_TPL, RULES_MISSING_TPL,
    RULES_NO_CACHE_TPL, RULES_OUT_NOTE, RULES_OUT_TPL, RULES_PROGRAM, RULES_PROVINCE,
    SCRIPT_STYLE_RE, SENT_SPLIT, SKIP_WORDS, SLUG_TO_COMMUNITY, STATUS_FULL, SUBJECT_APPLICANT,
    TAG_RE, TECH_NAME, TECH_NOC, TYPE_FCIP, TYPE_RCIP, URL_SEP, WAYBACK_TIMEOUT_S, WAYBACK_TPL,
    WK_COMMUNITY, WK_HOST_INDEX, WK_HREF_RE, WK_POST_LIMIT, WK_POST_RE, WK_UPDATES_URL,
)
from pilot.scheme import (
    CommDocIn, CommRowIn, CommunityIn, CommunityOut, CountTypeIn, DetailDocIn, DetailRowIn,
    EmpPartIn, FetchLiveOut, FlagsIn, GuardIn, LiveOut, LiveScanIn, MdRowIn, MergeLiveIn,
    NlRowIn, OccPartIn, PageEntryIn, PageOut, ParseCommIn, PdfBulletsIn, PdfRowIn, PeRowIn,
    ProvIn, QuotaOccIn, RequirementIn, RulesDocIn, ScanIn, ScanOut, ScanPageIn, ScanSentIn,
    SegmentIn, WindowIn, WriteDetailsIn, WriteQuotaIn,
)
from pilot.extractors import EXTRACTORS

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
# 3. details 步(社区指定雇主/职业清单自动刷新)
# =========================================================================


def build_pilot_details() -> None:
    """社区指定雇主/职业清单周更(入口,门直调)。

    **整步永远 exit 0 不拦役**:总控自身失败在这里当场吃掉,异常不许漏到门里变 return 1
    —— 原脚本 `__main__` 外层那道 try/except 的逐字对应物(raw 保持原样)。
    """
    try:
        refresh_pilot_details()
    except Exception as e:  # noqa: BLE001
        say(DET_CRASH_TPL.format(kind=type(e).__name__, detail=e))


def refresh_pilot_details() -> None:
    """逐社区跑抽取,塌方保旧,两份 raw 原地刷新。"""
    say(DET_IO_TPL.format(comm=IN_COMMUNITIES, emp=OUT_EMP, occ=OUT_OCC))
    comms = load_communities()
    prev_emp = load_prev(OUT_EMP)
    prev_occ = load_prev(OUT_OCC)
    emp_rows: list = []
    occ_rows: list = []
    kept: list = []
    refreshed: list = []
    for name in dict.fromkeys(comms):
        one = refresh_one_community(CommunityIn(name=name, comms=comms,
                                                prev_emp=prev_emp, prev_occ=prev_occ))
        emp_rows.extend(one.emp_rows)
        occ_rows.extend(one.occ_rows)
        if one.ok:
            refreshed.append(name)
        else:
            kept.append(name)
    write_details(WriteDetailsIn(emp_rows=emp_rows, occ_rows=occ_rows,
                                 refreshed=refreshed, kept=kept))


def load_communities() -> dict:
    """社区索引(名 → pilot-communities.json 的行)—— 同名社区双类型在这里已折叠成一条。"""
    doc = json.loads(IN_COMMUNITIES.read_text(encoding=ENC_UTF8))
    out: dict = {}
    for r in doc[K_ROWS]:
        out[r[K_NAME]] = r
    return out


def load_prev(path: Path) -> dict:
    """上一版落盘按社区分组(塌方保旧的底本)。"""
    out: dict = {}
    if path.exists():
        doc = json.loads(path.read_text(encoding=ENC_UTF8))
        for r in doc.get(K_ROWS, []):
            out.setdefault(r.get(K_COMMUNITY, ""), []).append(r)
    return out


def refresh_one_community(x: CommunityIn) -> CommunityOut:
    """一个社区跑一轮:抽取 → 过塌方哨兵 → 刷新或保旧。

    哨兵:雇主行掉到基线一半以下、职业行少于 MIN_OCC、或抽取抛异常 → 该份沿用上一版。
    Peace Liard 雇主基线 0(官方待公示):>0 即收,不设下限。
    """
    prov = x.comms[x.name][K_PROVINCE]
    ctype = community_type_of(x)
    got = extract_community(x.name)
    n_emp = 0
    n_occ = 0
    if got is not None:
        n_emp = len(got.get(K_EMPLOYERS) or [])
        n_occ = len(got.get(K_OCCUPATIONS) or [])
    base = BASELINE_EMP.get(x.name, 0)
    emp_ok = got is not None and (n_emp > 0 if base == 0 else n_emp >= base / 2)
    occ_ok = got is not None and n_occ >= MIN_OCC
    emp_rows = community_emp_rows(EmpPartIn(name=x.name, province=prov, ctype=ctype, got=got,
                                            n=n_emp, base=base, ok=emp_ok, prev=x.prev_emp))
    occ_rows = community_occ_rows(OccPartIn(name=x.name, province=prov, ctype=ctype, got=got,
                                            n=n_occ, ok=occ_ok, prev=x.prev_occ))
    return CommunityOut(emp_rows=emp_rows, occ_rows=occ_rows, ok=emp_ok or occ_ok)


def community_type_of(x: CommunityIn) -> str:
    """试点类型:同名社区双类型(Sudbury/Timmins 各有 RCIP+FCIP 两行)→ RCIP+FCIP,否则用本行的。

    ⚠ comms 是「名 → 行」的索引(同名在读入时已折叠),所以同名计数恒为 1 —— 原脚本即如此,
    2026-08-31 批C 全溶逐字保留;是否该改判是口径问题,不在搬运批内。
    """
    n = 0
    for r in x.comms.values():
        if r[K_NAME] == x.name:
            n += 1
    if n > 1:
        return CTYPE_BOTH
    return x.comms[x.name][K_TYPE]


def extract_community(name: str) -> dict | None:
    """跑该社区的抽取函数;没注册或抛异常 → None(单社区源挂了不拖垮整轮)。"""
    fn = EXTRACTORS.get(name)
    if fn is None:
        return None
    try:
        return fn()
    except Exception as e:  # noqa: BLE001
        say(DET_CRASH_EXTRACT_TPL.format(name=name, kind=type(e).__name__,
                                         detail=str(e)[:DET_ERR_DETAIL_LEN]))
        return None


def community_emp_rows(x: EmpPartIn) -> list:
    """一个社区本轮的雇主行:刷新成功用新抽的,塌方喊一声用上一版的。

    基线 0 且本轮也 0 = 官方还没公示,不算塌方,不喊。
    """
    rows: list = []
    if x.ok:
        for r in x.got[K_EMPLOYERS]:
            if clean_name_of(r) == "":
                continue
            rows.append(to_emp_row(DetailRowIn(community=x.name, province=x.province,
                                               ctype=x.ctype, raw=r,
                                               url=x.got.get(K_EMPLOYERS_URL, ""))))
        return rows
    if x.got is not None and not (x.base == 0 and x.n == 0):
        say(DET_EMP_SHORT_TPL.format(name=x.name, n=x.n, base=x.base))
    rows.extend(x.prev.get(x.name, []))
    return rows


def community_occ_rows(x: OccPartIn) -> list:
    """一个社区本轮的职业行:刷新成功用新抽的,塌方喊一声用上一版的。"""
    rows: list = []
    if x.ok:
        for r in x.got[K_OCCUPATIONS]:
            rows.append(to_occ_row(DetailRowIn(community=x.name, province=x.province,
                                               ctype=x.ctype, raw=r,
                                               url=x.got.get(K_OCCUPATIONS_URL, ""))))
        return rows
    if x.got is not None:
        say(DET_OCC_SHORT_TPL.format(name=x.name, n=x.n, floor=MIN_OCC))
    rows.extend(x.prev.get(x.name, []))
    return rows


def clean_name_of(raw: dict) -> str:
    """抽取器给的雇主名压空白(空 = 这条不要)。"""
    return SPACE_SEP.join(str(raw.get(K_NAME, "")).split())


def to_emp_row(x: DetailRowIn) -> dict:
    """抽取器一条雇主 → 产出行(键词汇只住行构造器)。"""
    return {"community": x.community, "province": x.province,
            "type": str(x.raw.get("type") or x.ctype),
            "name": clean_name_of(x.raw),
            "location": str(x.raw.get("location") or "").strip(),
            "url": x.url}


def to_occ_row(x: DetailRowIn) -> dict:
    """抽取器一条职业 → 产出行(sectorOnly=官方只给行业名)。"""
    return {"community": x.community, "province": x.province,
            "type": str(x.raw.get("type") or x.ctype),
            "noc": str(x.raw.get("noc") or ""),
            "title": SPACE_SEP.join(str(x.raw.get("title", "")).split()),
            "sectorOnly": bool(x.raw.get("sectorOnly")),
            "url": x.url}


def write_details(x: WriteDetailsIn) -> None:
    """两份 raw 原地落盘 + 收尾报数(保旧的社区逐个点名)。"""
    today = date.today().isoformat()
    OUT_EMP.write_text(json.dumps(to_emp_doc(DetailDocIn(fetched=today, rows=x.emp_rows)),
                                  ensure_ascii=False, indent=1), encoding=ENC_UTF8)
    OUT_OCC.write_text(json.dumps(to_occ_doc(DetailDocIn(fetched=today, rows=x.occ_rows)),
                                  ensure_ascii=False, indent=1), encoding=ENC_UTF8)
    if len(x.kept) > 0:
        tail = DET_KEPT_TPL.format(names=DET_KEPT_SEP.join(x.kept))
    else:
        tail = ""
    say(DET_DONE_TPL.format(emp=len(x.emp_rows), occ=len(x.occ_rows),
                            n=len(x.refreshed), tail=tail))


def to_emp_doc(x: DetailDocIn) -> dict:
    """pilot-employers.json 的文档形(键词汇只住行构造器)。"""
    return {"fetched": x.fetched, "note": DET_EMP_NOTE, "rows": x.rows}


def to_occ_doc(x: DetailDocIn) -> dict:
    """pilot-occupations.json 的文档形。"""
    return {"fetched": x.fetched, "note": DET_OCC_NOTE, "rows": x.rows}


# =========================================================================
# 4. quota 步(RCIP 社区名额状态)
# =========================================================================


def build_pilot_quota() -> None:
    """RCIP 社区名额状态 → pilot-quota.json(入口,门直调)。

    先扫 crawl 缓存(18 个 slug),再直连补抓缓存够不着的两个社区;抓不到就少几行,
    空 ≠ 没有限额,只是官网没写。
    """
    say(QUOTA_IO_TPL.format(crawl=IN_CRAWL, comm=IN_COMMUNITIES, out=OUT_QUOTA))
    known = load_known_communities()
    occupations: list = []
    communities: list = []
    for slug, name in SLUG_TO_COMMUNITY.items():
        prov = province_of(ProvIn(known=known, name=name))
        if prov == "":
            say(QUOTA_SKIP_TPL.format(slug=slug, name=name))
            continue
        out = scan_slug(ScanIn(slug=slug, community=name, province=prov))
        occupations.extend(out.occupations)
        if len(out.community) > 0:
            communities.append(out.community)
        say(QUOTA_ROW_TPL.format(name=name, flags=quota_flags(
            FlagsIn(occupations=out.occupations, community=out.community))))
    scan_live(LiveScanIn(known=known, communities=communities, occupations=occupations))
    write_quota(WriteQuotaIn(communities=communities, occupations=occupations))


def load_known_communities() -> dict:
    """社区对表(名 → 行);对不上的 slug 一律跳过,不猜省份。"""
    doc = json.loads(IN_COMMUNITIES.read_text(encoding=ENC_UTF8))
    out: dict = {}
    for r in doc.get(K_ROWS, []):
        out[r[K_NAME]] = r
    return out


def province_of(x: ProvIn) -> str:
    """社区对表里的省码;对不上给空串。"""
    row = x.known.get(x.name)
    if row is None:
        return ""
    return row.get(K_PROVINCE, "")


def scan_slug(x: ScanIn) -> ScanOut:
    """扫一个 crawl slug 的全部缓存页 → 该社区的职业满额行 + 社区级名额状态。"""
    root = IN_CRAWL / x.slug
    man = root / MANIFEST_FILE
    if not man.exists():
        return ScanOut(occupations=[], community={})
    doc = json.loads(man.read_text(encoding=ENC_UTF8))
    fetched = doc.get(K_CRAWLED_AT, "")[:ASOF_LEN]
    occ_rows: dict = {}
    comm: dict = {}
    for it in doc.get(K_PAGES, []):
        scan_page(ScanPageIn(item=it, root=root, community=x.community, province=x.province,
                             fetched=fetched, occ_rows=occ_rows, comm=comm))
    if len(comm) > 0:
        comm.update({K_COMMUNITY: x.community, K_PROVINCE: x.province, K_ASOF: fetched})
    return ScanOut(occupations=list(occ_rows.values()), community=comm)


def scan_page(x: ScanPageIn) -> None:
    """扫一个缓存页的每一句(结果原地累进 occ_rows / comm)。"""
    f = x.item.get(K_HTML)
    if f is None or f == "":
        return
    p = x.root / HTML_CACHE_DIR / f
    if not p.exists():
        return
    url = x.item.get(K_URL, "")
    for sent in sentences(text_of(p)):
        scan_sentence(ScanSentIn(sent=sent, url=url, community=x.community,
                                 province=x.province, fetched=x.fetched,
                                 occ_rows=x.occ_rows, comm=x.comm))


def scan_sentence(x: ScanSentIn) -> None:
    """一句话过四条抽取规则:① 职业满额 ② 剩余名额 ③ 先到先得 ④ 每轮名额上限。

    ① 必须同句出现「满」的明文与 NOC 码(分句抓正是为了不跨句乱配),且不被
    「新增/开收」的否定闸命中;②③④ 各自首次命中即定,后面的不覆盖。
    """
    mfull = RE_OCC_FULL.search(x.sent)
    if mfull and not RE_OCC_NOT_FULL.search(x.sent):
        for noc in RE_NOC.findall(x.sent):
            x.occ_rows.setdefault(noc, to_quota_occ_row(QuotaOccIn(
                community=x.community, province=x.province, noc=noc, fetched=x.fetched,
                url=x.url, quote=window(WindowIn(sent=x.sent, m=mfull)))))
    m = RE_REMAINING.search(x.sent)
    if m and K_REMAINING not in x.comm:
        x.comm.update({K_REMAINING: int(m.group(1)),
                       K_REMAINING_QUOTE: window(WindowIn(sent=x.sent, m=m)),
                       K_REMAINING_URL: x.url})
    m = RE_FIRST_COME.search(x.sent)
    if m and K_FIRST_COME not in x.comm:
        x.comm.update({K_FIRST_COME: True,
                       K_FIRST_COME_QUOTE: window(WindowIn(sent=x.sent, m=m)),
                       K_FIRST_COME_URL: x.url})
    m = RE_PER_INTAKE.search(x.sent)
    if m and K_PER_INTAKE not in x.comm:
        x.comm.update({K_PER_INTAKE: int(m.group(1)),
                       K_PER_INTAKE_QUOTE: window(WindowIn(sent=x.sent, m=m)),
                       K_PER_INTAKE_URL: x.url})


def to_quota_occ_row(x: QuotaOccIn) -> dict:
    """一条职业满额行(键词汇只住行构造器)。"""
    return {"community": x.community, "province": x.province, "noc": x.noc,
            "status": STATUS_FULL, "asOf": x.fetched, "url": x.url, "quote": x.quote}


def window(x: WindowIn) -> str:
    """原句取**匹配点周围的窗口**,不取句首(理由见 constants.QUOTE_AFTER)。"""
    start = max(0, x.m.start() - QUOTE_BEFORE)
    return x.sent[start:x.m.start() + QUOTE_AFTER].strip()


def sentences(text: str) -> list:
    """按句末标点分句(空句丢掉)。"""
    out: list = []
    for s in SENT_SPLIT.split(text):
        t = s.strip()
        if t != "":
            out.append(t)
    return out


def text_of(path: Path) -> str:
    """crawl 缓存 html 文件 → 纯文本。"""
    return text_of_html(path.read_text(encoding=ENC_UTF8, errors=ERRORS_IGNORE))


def text_of_html(raw: str) -> str:
    """html → 纯文本:先拆脚本/样式,再去 tag、还原实体、压空白。"""
    body = SCRIPT_STYLE_RE.sub(SPACE_SEP, raw)
    return WS_RE.sub(SPACE_SEP, html_lib.unescape(TAG_RE.sub(SPACE_SEP, body)))


def scan_live(x: LiveScanIn) -> None:
    """直连补抓缓存够不着的两个社区(破例举证见 constants.LIVE_DOC)。

    抓不到/抓挂了 = 该社区这轮没有名额行,绝不吞成 0 或猜一个;官网抖动不该炸掉整步。
    """
    today = date.today().isoformat()
    by_name: dict = {}
    for c in x.communities:
        by_name[c[K_COMMUNITY]] = c
    for name, fn in live_extractors().items():
        prov = province_of(ProvIn(known=x.known, name=name))
        if prov == "":
            say(QUOTA_LIVE_SKIP_TPL.format(name=name))
            continue
        try:
            out = fn()
        except Exception as e:  # noqa: BLE001
            say(QUOTA_LIVE_FAIL_TPL.format(name=name, kind=type(e).__name__, detail=e))
            continue
        merge_live(MergeLiveIn(name=name, province=prov, today=today, out=out,
                               by_name=by_name, communities=x.communities,
                               occupations=x.occupations))
        say(QUOTA_LIVE_ROW_TPL.format(name=name, flag=live_flag_of(out.community)))


def live_extractors() -> dict:
    """社区官方名 → 直连抽取函数(常量装不下函数,所以是个构建函数,不是 constants 的表)。"""
    return {CL_COMMUNITY: live_claresholm, WK_COMMUNITY: live_west_kootenay}


def merge_live(x: MergeLiveIn) -> None:
    """直连结果并进结果集:职业行补齐上下文;社区级行只补缓存里没有的字段,不覆盖既有举证。"""
    for r in x.out.occupations:
        r.update({K_COMMUNITY: x.name, K_PROVINCE: x.province, K_ASOF: x.today})
    x.occupations.extend(x.out.occupations)
    comm = x.out.community
    if len(comm) == 0:
        return
    comm.update({K_COMMUNITY: x.name, K_PROVINCE: x.province, K_ASOF: x.today})
    old = x.by_name.get(x.name)
    if old is None:
        x.communities.append(comm)
        x.by_name[x.name] = comm
        return
    for k, v in comm.items():
        if k not in old:
            old[k] = v


def live_flag_of(comm: dict) -> str:
    """直连结果行里的每期名额说法(没抓到 → 占位符)。"""
    v = comm.get(K_PER_INTAKE)
    if v is None:
        return QUOTA_FLAG_NONE
    return QUOTA_LIVE_FLAG_TPL % v


def live_claresholm() -> LiveOut:
    """Claresholm:官网首页写着月度名额(缓存那一页是 403,爬役 UA 被挡)。"""
    got = fetch_live(CL_URL)
    m = RE_CL_PER_INTAKE.search(got.text)
    if m is None:
        return LiveOut(community={}, occupations=[])
    return LiveOut(community={K_PER_INTAKE: int(m.group(1)),
                              K_PER_INTAKE_QUOTE: m.group(0).strip(),
                              K_PER_INTAKE_URL: got.url}, occupations=[])


def live_west_kootenay() -> LiveOut:
    """West Kootenay:官网换域,名额写在公告贴里;从 /updates/ 索引现取,不写死某一篇。"""
    idx = fetch_index(WK_UPDATES_URL)
    posts = wk_post_urls(idx)
    for p in posts[:WK_POST_LIMIT]:
        got = fetch_live(p)
        m = RE_WK_PER_INTAKE.search(got.text)
        if m is not None:
            return LiveOut(community={K_PER_INTAKE: int(m.group(1)),
                                      K_PER_INTAKE_QUOTE: m.group(0).strip(),
                                      K_PER_INTAKE_URL: got.url}, occupations=[])
    return LiveOut(community={}, occupations=[])


def wk_post_urls(idx: FetchLiveOut) -> list:
    """公告索引 → 同主机、名字里带 intake/allocation 的贴子 URL(去重保序,时间倒序)。"""
    host = idx.url.split(URL_SEP)[WK_HOST_INDEX]
    seen: dict = {}
    for h in WK_HREF_RE.findall(idx.text):
        seen[urljoin(idx.url, h)] = True
    out: list = []
    for u in seen:
        if u.split(URL_SEP)[WK_HOST_INDEX:WK_HOST_INDEX + 1] == [host] and WK_POST_RE.search(u):
            out.append(u)
    return out


def fetch_index(idx_url: str) -> FetchLiveOut:
    """直连取索引页 → (最终 URL, **原始 html**)。

    索引页要的是 href,不能先去 tag —— 与 fetch_live 的分工就在这。
    (原脚本这里是个内联 lambda 拆响应元组,2026-08-31 批C 改显式两行。)
    """
    r = httpx.get(idx_url, headers={HDR_UA: LIVE_UA}, follow_redirects=True,
                  timeout=LIVE_TIMEOUT_S)
    return FetchLiveOut(url=str(r.url), text=r.text)


def fetch_live(url: str) -> FetchLiveOut:
    """直连取页 → (最终 URL, 纯文本)。跟重定向(WK 换域全靠它);原 `_live`,下划线名退役。"""
    r = httpx.get(url, headers={HDR_UA: LIVE_UA}, follow_redirects=True, timeout=LIVE_TIMEOUT_S)
    r.raise_for_status()
    return FetchLiveOut(url=str(r.url), text=text_of_html(r.text))


def quota_flags(x: FlagsIn) -> str:
    """一个社区扫出来的东西拼成一行人话(什么都没有 → 占位符)。"""
    flags: list = []
    if len(x.occupations) > 0:
        flags.append(QUOTA_FLAG_OCC_TPL.format(n=len(x.occupations)))
    for k, label in QUOTA_FLAG_LABELS:
        if k not in x.community:
            continue
        if k == K_FIRST_COME:
            flags.append(label)
        else:
            flags.append(QUOTA_FLAG_KV_TPL.format(label=label, value=x.community[k]))
    if len(flags) == 0:
        return QUOTA_FLAG_NONE
    return QUOTA_FLAG_SEP.join(flags)


def write_quota(x: WriteQuotaIn) -> None:
    """落盘 + 收尾报数。"""
    OUT_QUOTA.parent.mkdir(parents=True, exist_ok=True)
    OUT_QUOTA.write_text(json.dumps(to_quota_doc(x), ensure_ascii=False, indent=1),
                         encoding=ENC_UTF8)
    say(QUOTA_DONE_TPL.format(path=OUT_QUOTA, comm=len(x.communities),
                              occ=len(x.occupations)))


def to_quota_doc(x: WriteQuotaIn) -> dict:
    """pilot-quota.json 的文档形(键词汇只住行构造器)。"""
    return {"note": QUOTA_NOTE, "communities": x.communities, "occupations": x.occupations}


# =========================================================================
# 5. communities 步(RCIP/FCIP 试点社区名单)
# =========================================================================


def build_pilot_communities() -> None:
    """IRCC 官方参与社区名单 → pilot-communities.json(入口,门直调)。

    两道哨兵都是**报一声就返回,不 raise 不拦役**:标题锚缺失(疑 IRCC 改版)、
    行数塌方(RCIP<10 / FCIP<4)—— 两种情况都保留旧表,绝不拿半份数据盖好数据。
    """
    OUT_COMMUNITIES.parent.mkdir(parents=True, exist_ok=True)
    say(COMM_IO_TPL.format(manifest=IN_MANIFEST, out=OUT_COMMUNITIES))
    manifest = json.loads(IN_MANIFEST.read_text(encoding=ENC_UTF8))
    page = find_pilot_page(manifest)
    doc = (IN_MANIFEST.parent / HTML_CACHE_DIR / page[K_HTML]).read_text(
        encoding=ENC_UTF8, errors=ERRORS_REPLACE)
    rural = RE_RURAL_H3.search(doc)
    franco = RE_FRANCO_H3.search(doc)
    if rural is None or franco is None:
        say(COMM_NO_ANCHOR)
        return
    rows = parse_community_rows(ParseCommIn(html=doc, rural_end=rural.end(),
                                            franco_start=franco.start(),
                                            franco_end=franco.end()))
    n_rcip = count_type(CountTypeIn(rows=rows, ctype=TYPE_RCIP))
    n_fcip = count_type(CountTypeIn(rows=rows, ctype=TYPE_FCIP))
    if n_rcip < MIN_RCIP or n_fcip < MIN_FCIP:
        say(COMM_COLLAPSE_TPL.format(rcip=n_rcip, fcip=n_fcip))
        return
    OUT_COMMUNITIES.write_text(
        json.dumps(to_communities_doc(CommDocIn(source=page[K_URL], rows=rows)),
                   ensure_ascii=False, indent=1), encoding=ENC_UTF8)
    say(COMM_DONE_TPL.format(n=len(rows), rcip=n_rcip, fcip=n_fcip,
                             mapped=count_mapped(rows), name=OUT_COMMUNITIES.name))


def find_pilot_page(manifest: dict) -> dict:
    """manifest 里的官方名单页记录。

    找不到即抛(crawl 役没爬到)—— 原 `next(p for …)` 的 StopIteration 语义逐字保留:
    当场炸,不静默产半份表。
    """
    for p in manifest[K_PAGES]:
        if p[K_URL].endswith(COMM_PAGE_SUFFIX):
            return p
    raise StopIteration(COMM_PAGE_SUFFIX)


def parse_community_rows(x: ParseCommIn) -> list:
    """两段名单(h3「Rural communities」→ RCIP、h3「Francophone communities」→ FCIP)→ 社区行。

    页顶导语也含 Francophone 字样,所以只认 h3 标题锚。
    """
    rows: list = []
    seen: set = set()
    parse_segment(SegmentIn(segment=x.html[x.rural_end:x.franco_start], ctype=TYPE_RCIP,
                            rows=rows, seen=seen))
    parse_segment(SegmentIn(segment=x.html[x.franco_end:], ctype=TYPE_FCIP,
                            rows=rows, seen=seen))
    return rows


def parse_segment(x: SegmentIn) -> None:
    """一段名单区的社区链接 → 行(联邦链接剔除、名字读不出省码的剔除、同名同类型去重)。"""
    for u, raw in RE_COMM_LINK.findall(x.segment):
        name = SPACE_SEP.join(raw.split())
        if is_official_host(u):
            continue
        if PROV_RE.search(name) is None and name not in PROV_HINT:
            continue
        if (name, x.ctype) in x.seen:
            continue
        x.seen.add((name, x.ctype))
        x.rows.append(to_community_row(CommRowIn(name=name, province=province_hint_of(name),
                                                 ctype=x.ctype, url=u)))


def is_official_host(url: str) -> bool:
    """联邦域名的链接 = 导航,不是社区。"""
    for h in OFFICIAL_HOSTS:
        if h in url:
            return True
    return False


def province_hint_of(name: str) -> str:
    """社区的省码:人工表优先,否则从名字尾巴读(调用方已保证两者必有其一)。"""
    hint = PROV_HINT.get(name)
    if hint is None:
        return PROV_RE.search(name).group(1)
    return hint


def to_community_row(x: CommRowIn) -> dict:
    """一个社区 → 产出行(cities 空 = 区域型社区界线未举证,不参与打标)。"""
    return {"name": x.name, "province": x.province, "type": x.ctype,
            "cities": CITY_MAP.get(x.name, []), "url": x.url}


def count_type(x: CountTypeIn) -> int:
    """该类型的行数(哨兵用:官方名单 14 RCIP + 6 FCIP)。"""
    n = 0
    for r in x.rows:
        if r[K_TYPE] == x.ctype:
            n += 1
    return n


def count_mapped(rows: list) -> int:
    """映射到了城市的社区数(cities 非空)。"""
    n = 0
    for r in rows:
        if r[K_CITIES]:
            n += 1
    return n


def to_communities_doc(x: CommDocIn) -> dict:
    """pilot-communities.json 的文档形(键词汇只住行构造器)。"""
    return {"fetched": date.today().isoformat(), "source": x.source,
            "note": COMM_NOTE, "rows": x.rows}


# =========================================================================
# 6. aip_rules 步(AIP 申请人门槛库,quote-anchored)
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

"""
rcip 域函数 —— 全部行为住这(照 company/noc/pnp 全溶样张,方言律全集见
docs/design/etl分域-20260829.md §4)。

2026-08-31 批E 从 pilot 域拆出(Frank「拆成三个 很少有人有法语」):原 pilot/functions.py
的 details / quota / communities 三段整段搬来,**函数体逐字未改**,批E 拆分改动只有三处
(每处在所属函数的 docstring 里另记一段):
  · community_type_of 改查 constants.DUAL_COMMUNITIES(原「同名计数 > 1」是死分支,
    拍板点 8-② 明文背书按名单点名;沿革见该常量 docstring);
  · parse_community_rows 只切 Rural 那一节(Francophone 节归 fcip 域);
  · build_pilot_communities 的塌方哨兵单侧化(只看 RCIP < MIN_RCIP)。
IN/OUT 路径的改指全在 constants,本文件一行不涉。
**零字符串令**:字面量全住 constants(文案 *_TPL 模板、JSON 键 K_ 词族、官方原句 *_QUOTE);
**显式循环令**:禁推导/genexp/lambda;**内嵌禁令**:内部函数出户成顶层具名函数;
**一参令**:函数至多一参,多入参收 scheme 的 XxxIn dataclass,多返回值收 XxxOut。
日志口径:域内不裸 print,报数走 log.functions.say;各步原有的「✗ / !」行原样保留
(auto_update 按行首升 ERROR 级,这就是本域的错误通道)。
退出口径两档,逐步不同、逐字保留:
  · details —— **整步永远 exit 0 不拦役**,总控自身失败在入口函数体内当场吃掉,不漏给门;
  · quota / communities —— 抓不到就少几行 / 保留旧表,正常返回,不拦役。
依赖单边:本文件 → constants/scheme + 基础设施叶(log / fetch)。

2026-08-31 批L 溶解(Frank「都需要检查的」——域内 .py 只许七名,子目录不豁免):
extractors/ 私件群(__init__ + atl/bc/on/prairie)整体溶进本文件第 5~9 段 ——
第 5 段登记表(原包 __init__ 的 EXTRACTORS 常量 → community_extractors() 构建函数),
第 6~9 段四个地区的抽取函数,与 constants/scheme 同名同序镜像。
溶解口径:**解析逻辑一行不改**,只做方言就范 —— `_` 前缀私件名退役成无下划线顶层名、
字面量全提进 constants、推导式/genexp/lambda 改显式循环、多参函数收 scheme 的 XxxIn、
行内 # 注释折进 docstring;四个文件头逐字存档在 constants 的 ON_DOC/BC_DOC/PRAIRIE_DOC/ATL_DOC。
金标:18 社区 fixtures 重放,新旧行集 0 差异(逐社区 employers/occupations 与两个 url)。
"""
import csv
import html as html_lib
import io
import json
import socket
import ssl
import unicodedata
from datetime import date
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import fitz
import httpx

from log.functions import say
from fetch.constants import BROWSER_UA, HDR_UA, LINE_SEP, SPACE_SEP, WS_RE
from rcip.constants import (
    AIA_FAIL_TPL, AL_CELL_RE, AL_COMMUNITY, AL_EMP_LABEL, AL_EMP_URL, AL_OCC_LABEL, AL_OCC_URL,
    AMP, AMP_ENTITY, ASCII, ASOF_LEN, ATL_ACCEPT_LANG, BASELINE_EMP, BOM, BR_COMMUNITY,
    BR_EMP_LABEL, BR_EMP_URL, BR_HEADER_NAME, BR_LIST_MARK, BR_OCC_LABEL, BR_OCC_RE, BR_OCC_URL,
    BR_TABLE_RE, BR_TD_RE, BR_TR_RE, CA_ISSUER_RE, CERT_FAIL_MARK, CITY_MAP, CL_COMMUNITY,
    CL_EMP_LABEL, CL_EMP_RE, CL_LI_RE, CL_OCC_LABEL, CL_OCC_RE, CL_QUALIFIER_RE, CL_QUALIFIER_TPL,
    CL_SECTOR_RE, CL_URL, COMM_COLLAPSE_TPL, COMM_DONE_TPL, COMM_IO_TPL, COMM_NOTE, COMM_NO_ANCHOR,
    COMM_PAGE_SUFFIX, CTYPE_BOTH, CURLY_QUOTE, DET_CRASH_EXTRACT_TPL, DET_CRASH_TPL, DET_DONE_TPL,
    DET_EMP_NOTE, DET_EMP_SHORT_TPL, DET_ERR_DETAIL_LEN, DET_IO_TPL, DET_KEPT_SEP, DET_KEPT_TPL,
    DET_OCC_NOTE, DET_OCC_SHORT_TPL, DIV_CLOSE, DUAL_COMMUNITIES, ENC_UTF8, ERRORS_IGNORE,
    ERRORS_REPLACE, FILETYPE_PDF, GET_TEXT_DICT, HDR_ACCEPT_LANGUAGE, HTML_CACHE_DIR, HTTPS_PORT,
    IN_COMMUNITIES, IN_CRAWL, IN_MANIFEST, K_ASOF, K_BBOX, K_BLOCKS, K_CITIES, K_COMMUNITY,
    K_CRAWLED_AT, K_EMPLOYERS, K_EMPLOYERS_URL, K_EXCLUDED, K_FIRST_COME, K_FIRST_COME_QUOTE,
    K_FIRST_COME_URL, K_HTML, K_ITEMS, K_LEGAL, K_LINES, K_LOCATION, K_NAME, K_NOC, K_OA,
    K_OCCUPATIONS, K_OCCUPATIONS_URL, K_PAGES, K_PER_INTAKE, K_PER_INTAKE_QUOTE, K_PER_INTAKE_URL,
    K_PILOT, K_PROVINCE, K_REMAINING, K_REMAINING_QUOTE, K_REMAINING_URL, K_ROWS, K_SECTOR_ONLY,
    K_SPANS, K_TEXT, K_TITLE, K_TYPE, K_URL, K_Y, LI_RE, MANIFEST_FILE,
    MIN_OCC, MIN_RCIP, MJ_CANDIDATES, MJ_COMMUNITY, MJ_EMP_LABEL, MJ_MAX_WORDS, MJ_NOTE_MARK,
    MJ_NOTICE_RE, MJ_OCC_LABEL, MJ_OCC_ROW_RE, MJ_OCC_URL, MJ_PDF_PATTERN, MJ_PDF_RE, NB_AJAX,
    NB_AJAX_ACTION, NB_COMMUNITY, NB_EMP_URL, NB_NO_TABLE, NB_OCC_ANCHOR, NB_OCC_ROW_RE,
    NB_OCC_URL, NB_SHORT_TPL, NEBC_ANCHOR_HINT, NEBC_A_RE, NEBC_CAND_URL, NEBC_COMMUNITY,
    NEBC_MISMATCH_TPL, NEBC_NAME_TPL, NEBC_NORM_RE, NEBC_NO_LIST, NEBC_OCC_CSV, NEBC_OCC_URL,
    NEBC_PAGE_RE, NEBC_PDF_MARK, NEBC_PENDING_RE, NEBC_TOTAL_RE, NEBC_X_LEGAL, NEBC_X_NUM,
    NFKC_FORM, NOC5_RE, NOC_LINE_RE, NOS_COMMUNITY, NOS_DATE_RE, NOS_DY_ORDER, NOS_MISMATCH_TPL,
    NOS_NAMECOL_SKIP, NOS_NO_PDF, NOS_OCC_RE, NOS_OCC_URL, NOS_PDF_HINT, NOS_RES_URL,
    NOS_SECTOR_STARTS, NOS_X_SPLIT, NOS_Y_TOL, NOTE_DASH_RE, NOTE_JOIN, NOTE_STAR, OFFICIAL_HOSTS,
    OUT_COMMUNITIES, OUT_EMP, OUT_OCC, OUT_QUOTA, PDF_HREF_RE, PDF_LINK_FAIL_TPL, PEM_MARK,
    PICTOU_COMMUNITY, PICTOU_EMPLOYERS_PAGE_URL, PICTOU_EMP_SHORT_TPL, PICTOU_HOME_URL,
    PICTOU_MIN_EMP, PICTOU_MIN_OCC, PICTOU_NO_PDF, PICTOU_OCC_RE, PICTOU_OCC_SHORT_TPL,
    PICTOU_PDF_RE, PICTOU_STATUS_HEADER, PICTOU_STATUS_VALUES, PICTOU_VALUE_RE,
    PRAIRIE_SCRIPT_STYLE_RE, PRIORITY_OCC_ANCHOR, PROV_HINT, PROV_RE, P_ACTION, QUOTA_DONE_TPL,
    QUOTA_FLAG_KV_TPL, QUOTA_FLAG_LABELS, QUOTA_FLAG_NONE, QUOTA_FLAG_OCC_TPL, QUOTA_FLAG_SEP,
    QUOTA_IO_TPL, QUOTA_LIVE_FAIL_TPL, QUOTA_LIVE_FLAG_TPL, QUOTA_LIVE_ROW_TPL,
    QUOTA_LIVE_SKIP_TPL, QUOTA_NOTE, QUOTA_ROW_TPL, QUOTA_SKIP_TPL, QUOTE_AFTER, QUOTE_BEFORE,
    REQUIRE_FAIL_TPL, RE_CL_PER_INTAKE, RE_COMM_LINK, RE_FIRST_COME, RE_FRANCO_H3, RE_NOC,
    RE_OCC_FULL, RE_OCC_NOT_FULL, RE_PER_INTAKE, RE_REMAINING, RE_RURAL_H3, RE_WK_PER_INTAKE,
    SB_COMMUNITY, SB_DASH_FIX_RE, SB_DASH_FIX_TO, SB_EMP_LABEL, SB_OCC_LABEL, SB_OCC_RE,
    SB_OCC_URL, SB_PDF_PATTERN, SB_PDF_RE, SB_SKIP_RE, SB_URL, SCRIPT_STYLE_RE, SENT_SPLIT,
    SLUG_TO_COMMUNITY, SSM_BLOCK_RE, SSM_COMMUNITY, SSM_EMPTY_NOTE, SSM_EMPTY_SECTOR, SSM_EMP_URL,
    SSM_MIN_EMP, SSM_NAME_MAX, SSM_NOT_HIRING_RE, SSM_NO_BLOCK, SSM_NO_OCC, SSM_OCC_URL,
    SSM_PAIR_RE, SSM_P_OPEN_RE, SSM_P_RE, SSM_SECTOR_RE, SSM_SHORT_TPL, SSM_SKIP_RE,
    SSM_YEAR_NOTE_RE, STATUS_FULL, STRAIGHT_QUOTE, SUD_ADDR_RE, SUD_BOX_RE, SUD_COMMUNITY,
    SUD_EMP_ANCHOR, SUD_JOBS_ANCHOR, SUD_NAME_RE, SUD_NO_BOUNDS, SUD_OCC_RE, SUD_PANEL_RE,
    SUD_SHORT_TPL, SUD_URL, TABLE_CLOSE, TAG_RE, TB_ALLEN_LOC, TB_ALLEN_NAME, TB_ALLEN_PREFIX,
    TB_ALLSTATE_MARK, TB_ALLSTATE_NAME, TB_COMMUNITY, TB_EXCL_RE, TB_LINK_HINT, TB_LINK_WINDOW,
    TB_NO_OCC, TB_NO_PDF, TB_PAGE, TB_PATCH, TB_SHORT_TPL, TB_SKIP_RE, TB_SOVEREIGN,
    TB_SOVEREIGN_LOC1, TB_SOVEREIGN_LOC2, TB_SOVEREIGN_PAIR, TB_X_SPLIT, TB_Y_TOL, TIMEOUT_S,
    TM_COMMUNITY, TM_CONT_NAME, TM_HDR_RE, TM_NON_ALPHA_RE, TM_NOT_HIRING_RE, TM_NO_PDF,
    TM_NO_TABS, TM_OCC_BLOCK_RE, TM_PAGE, TM_PDF_HREF_RE, TM_PILOT_CODES, TM_SHORT_TPL,
    TM_TAB_TITLE_RE, TM_X_NAME_MIN, TM_X_PILOT_MIN, TM_Y_TOL, TYPE_RCIP, UL_OPEN_RE,
    UL_TAG_RE, URL_SEP, WK_COMMUNITY, WK_EMP_URL, WK_HEADER_MARK, WK_HOST_INDEX, WK_HREF_RE,
    WK_LIST_END, WK_LIST_START, WK_LOC_SEP, WK_NEW_MARK, WK_NO_BOUNDS, WK_OCC_URL, WK_POST_LIMIT,
    WK_POST_RE, WK_TD_ANY_RE, WK_TD_RE, WK_TR_RE, WK_UPDATES_URL,
)
from rcip.scheme import (
    CommDocIn, CommRowIn, CommunityIn, CommunityOut, CountTypeIn, DetailDocIn, DetailRowIn,
    EmpPartIn, FetchLiveOut, FlagsIn, LiveOut, LiveScanIn, MergeLiveIn, NebcNameIn, NebcPageIn,
    NosPageIn, NosSectorIn, OccPartIn, OnFetchIn, ParseCommIn, PdfLinkIn, ProvIn, QuotaOccIn,
    RequireIn, ScanIn, ScanOut, ScanPageIn, ScanSentIn, SegmentIn, SsmPairsIn, TbSideIn, TbState,
    TbTakeIn, TimminsPilotIn, TimminsRowsIn, UlBlockIn, WindowIn, WriteDetailsIn, WriteQuotaIn,
)

# =========================================================================
# 1. 共享词汇(纯常量段,无跨段函数 —— 镜像占位)
# =========================================================================

# =========================================================================
# 2. details 步(社区指定雇主/职业清单自动刷新)
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

    批E 拆分改动(2026-08-31):上面那条死分支在本批修活 —— 拆域后 rcip-communities.json
    每个社区只剩一行,「同名计数」彻底没了立足点,改为查 constants.DUAL_COMMUNITIES 点名
    (拍板点 8-② 明文背书:IRCC 名单页两节都列 Sudbury/Timmins)。沿革与影响面
    (行级 type 大多来自抽取器,兜底极少触发)见该常量的 docstring。
    """
    if x.name in DUAL_COMMUNITIES:
        return CTYPE_BOTH
    return x.comms[x.name][K_TYPE]


def extract_community(name: str) -> dict | None:
    """跑该社区的抽取函数;没注册或抛异常 → None(单社区源挂了不拖垮整轮)。

    批L 溶解改动(2026-08-31):登记表从 `rcip.extractors` 包的 EXTRACTORS 常量
    改成本文件第 5 段的 community_extractors() 构建函数(常量装不下函数),查法与语义不变。
    """
    fn = community_extractors().get(name)
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
        # pyrefly: ignore[unsupported-operation] — ok 为真即抽取成功,got 恒非 None(两格同生同灭)
        for r in x.got[K_EMPLOYERS]:
            if clean_name_of(r) == "":
                continue
            rows.append(to_emp_row(DetailRowIn(community=x.name, province=x.province,
                                               ctype=x.ctype, raw=r,
                                               # pyrefly: ignore[missing-attribute] — 同上
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
        # pyrefly: ignore[unsupported-operation] — 同上
        for r in x.got[K_OCCUPATIONS]:
            rows.append(to_occ_row(DetailRowIn(community=x.name, province=x.province,
                                               ctype=x.ctype, raw=r,
                                               # pyrefly: ignore[missing-attribute] — 同上
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
# 3. quota 步(RCIP 社区名额状态)
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
    2026-08-31 批M:本域六个直连函数原共用自留的 UA_CHROME126(批L 由 LIVE_UA 与四个
    抽取器抄本收成一处,Chrome/126),整体并进 fetch.constants.BROWSER_UA(Chrome/131)。
    """
    r = httpx.get(idx_url, headers={HDR_UA: BROWSER_UA}, follow_redirects=True,
                  timeout=TIMEOUT_S)
    return FetchLiveOut(url=str(r.url), text=r.text)


def fetch_live(url: str) -> FetchLiveOut:
    """直连取页 → (最终 URL, 纯文本)。跟重定向(WK 换域全靠它);原 `_live`,下划线名退役。"""
    r = httpx.get(url, headers={HDR_UA: BROWSER_UA}, follow_redirects=True, timeout=TIMEOUT_S)
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
# 4. communities 步(RCIP 试点社区名单)
# =========================================================================


def build_pilot_communities() -> None:
    """IRCC 官方参与社区名单 → rcip-communities.json(入口,门直调)。

    两道哨兵都是**报一声就返回,不 raise 不拦役**:标题锚缺失(疑 IRCC 改版)、
    行数塌方(RCIP<10)—— 两种情况都保留旧表,绝不拿半份数据盖好数据。

    批E 拆分改动(2026-08-31):① 只解析 Rural 那一节(Francophone 节归 fcip 域,
    但它的 h3 仍是本节的**终点**,所以两个锚照旧都要找到);② 塌方哨兵单侧化
    ——FCIP 那一侧连同 MIN_FCIP / TYPE_FCIP 移去 fcip 域,本域只看 RCIP < MIN_RCIP。
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
                                            franco_start=franco.start()))
    n_rcip = count_type(CountTypeIn(rows=rows, ctype=TYPE_RCIP))
    if n_rcip < MIN_RCIP:
        say(COMM_COLLAPSE_TPL.format(rcip=n_rcip))
        return
    OUT_COMMUNITIES.write_text(
        json.dumps(to_communities_doc(CommDocIn(source=page[K_URL], rows=rows)),
                   ensure_ascii=False, indent=1), encoding=ENC_UTF8)
    say(COMM_DONE_TPL.format(n=len(rows), rcip=n_rcip,
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
    """一段名单(h3「Rural communities」→ h3「Francophone communities」之间,记 RCIP)→ 社区行。

    页顶导语也含 Francophone 字样,所以只认 h3 标题锚。

    批E 拆分改动(2026-08-31):原函数一次解析两节(Rural→RCIP、Francophone→FCIP),
    拆域后本域只切 Rural 那一节;Francophone 节的解析(与 TYPE_FCIP)归 fcip 域同名函数。
    """
    rows: list = []
    seen: set = set()
    parse_segment(SegmentIn(segment=x.html[x.rural_end:x.franco_start], ctype=TYPE_RCIP,
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
        # pyrefly: ignore[missing-attribute] — 上一行已判 PROV_HINT 缺席;调用方保证人工表与名字尾巴必有其一(见 docstring)
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
# 5. 社区抽取器登记(社区官方名 → 抽取函数;details 步的私件群)
# =========================================================================


def community_extractors() -> dict:
    """社区官方名 → 该社区的抽取函数(常量装不下函数,所以是构建函数,照 live_extractors 先例)。

    契约与红线见 constants.EXTRACTORS_DOC:无参、出参四键、宁缺勿猜、抽不到就抛(总控保旧)。
    批L 溶解改动(2026-08-31):原 rcip/extractors/__init__.py 的四张地区表合并式
    (`{**on.EXTRACTORS, **bc.EXTRACTORS, …}`)随子目录退役 —— 四段同住本文件后
    地区分表没了立足点,按地区顺序直接列 14 条,键值一字未改。
    """
    return {
        NB_COMMUNITY: north_bay,
        SUD_COMMUNITY: sudbury,
        TM_COMMUNITY: timmins,
        SSM_COMMUNITY: sault_ste_marie,
        TB_COMMUNITY: thunder_bay,
        WK_COMMUNITY: west_kootenay,
        NOS_COMMUNITY: north_okanagan_shuswap,
        NEBC_COMMUNITY: peace_liard,
        MJ_COMMUNITY: moose_jaw,
        CL_COMMUNITY: claresholm,
        SB_COMMUNITY: steinbach,
        AL_COMMUNITY: altona_rhineland,
        BR_COMMUNITY: brandon,
        PICTOU_COMMUNITY: pictou_county,
    }


# =========================================================================
# 6. ON 五社区抽取(North Bay / Sudbury / Timmins / Sault Ste. Marie / Thunder Bay)
# =========================================================================


def north_bay() -> dict:
    """North Bay:雇主走 admin-ajax 实时源,职业走 employers 页的 NOC 表。"""
    feed = fetch_on_monday_feed()
    employers: list = []
    for e in feed:
        if str(e.get(K_NAME, "")).strip() == "":
            continue
        employers.append({K_NAME: SPACE_SEP.join(str(e[K_NAME]).split()), K_LOCATION: ""})
    h = fetch_on_page(NB_OCC_URL)
    i = h.find(NB_OCC_ANCHOR)
    if i < 0:
        raise ValueError(NB_NO_TABLE)
    seg = h[i:]
    seg = seg[:seg.find(TABLE_CLOSE)]
    occupations: list = []
    for n, t in NB_OCC_ROW_RE.findall(seg):
        occupations.append({K_NOC: n, K_TITLE: on_clean(t), K_SECTOR_ONLY: False})
    if len(employers) == 0 or len(occupations) == 0:
        raise ValueError(NB_SHORT_TPL.format(emp=len(employers), occ=len(occupations)))
    return {K_EMPLOYERS: employers, K_OCCUPATIONS: occupations,
            K_EMPLOYERS_URL: NB_EMP_URL, K_OCCUPATIONS_URL: NB_OCC_URL}


def fetch_on_monday_feed() -> list:
    """North Bay 的 admin-ajax 实时雇主源(带 action 参数,返回 json 数组)。"""
    return fetch_on_response(OnFetchIn(url=NB_AJAX, params={P_ACTION: NB_AJAX_ACTION})).json()


def fetch_on_page(url: str) -> str:
    """ON 段取一页 HTML。"""
    return fetch_on_response(OnFetchIn(url=url, params={})).text


def fetch_on_bytes(url: str) -> bytes:
    """ON 段下一份二进制(名单 PDF)。"""
    return fetch_on_response(OnFetchIn(url=url, params={})).content


def fetch_on_response(x: OnFetchIn) -> httpx.Response:
    """ON 段取页:每次开一个 httpx.Client(原脚本的 with 写法),浏览器 UA + 跟随重定向。

    params 空就不传 —— 与原脚本 `c.get(url)` 那一路逐字一致,不靠空 dict 合并出同样的 URL。
    """
    with httpx.Client(headers={HDR_UA: BROWSER_UA}, timeout=TIMEOUT_S,
                      follow_redirects=True) as c:
        if len(x.params) == 0:
            r = c.get(x.url)
        else:
            r = c.get(x.url, params=x.params)
        r.raise_for_status()
        return r


def on_clean(s: str) -> str:
    """HTML 片段 → 单行纯文本(去标签/实体/多余空白)。"""
    return WS_RE.sub(SPACE_SEP, html_lib.unescape(TAG_RE.sub(SPACE_SEP, s))).strip()


def on_cut_note(title: str) -> str:
    """剪掉职业名后接的大写附注从句(「 – Limit of 1 …」);官方 NOC 名内部的破折段是
    小写延续(如 representatives – financial institutions),保留。尾注星号一并剥掉。"""
    parts = NOTE_DASH_RE.split(title)
    keep = [parts[0]]
    for p in parts[1:]:
        if p[:1].isupper():
            break
        keep.append(p)
    return NOTE_JOIN.join(keep).rstrip(NOTE_STAR).strip()


def sudbury() -> dict:
    """Sudbury:雇主与职业同页两个 vc_tta 面板,行级 type 取面板标题(RCIP / FCIP)。"""
    h = fetch_on_page(SUD_URL)
    occupations = sudbury_occupation_rows(h)
    employers = sudbury_employer_rows(h)
    if len(employers) == 0 or len(occupations) == 0:
        raise ValueError(SUD_SHORT_TPL.format(emp=len(employers), occ=len(occupations)))
    return {K_EMPLOYERS: employers, K_OCCUPATIONS: occupations,
            K_EMPLOYERS_URL: SUD_URL, K_OCCUPATIONS_URL: SUD_URL}


def sudbury_occupation_rows(html: str) -> list:
    """RCIP/FCIP 面板内 Priority Occupations 段的「<p>12345 – 职业名</p>」行(逐行带 type)。"""
    rows: list = []
    panels = SUD_PANEL_RE.split(html)
    for i in range(1, len(panels), 2):
        prog = panels[i]
        body = panels[i + 1]
        j = body.find(PRIORITY_OCC_ANCHOR)
        if j < 0:
            continue
        sub = body[j:]
        k = sub.find(DIV_CLOSE)
        if k > 0:
            sub = sub[:k]
        for n, t in SUD_OCC_RE.findall(sub):
            rows.append({K_NOC: n, K_TITLE: on_cut_note(on_clean(t)),
                         K_SECTOR_ONLY: False, K_TYPE: prog})
    return rows


def sudbury_employer_rows(html: str) -> list:
    """id="employers" 段(到 Find a job 止)内 RCIP/FCIP 面板的 employer_box 卡片。"""
    i0 = html.find(SUD_EMP_ANCHOR)
    i1 = html.find(SUD_JOBS_ANCHOR)
    if i0 < 0 or i1 < 0 or i1 < i0:
        raise ValueError(SUD_NO_BOUNDS)
    rows: list = []
    epanels = SUD_PANEL_RE.split(html[i0:i1])
    for i in range(1, len(epanels), 2):
        prog = epanels[i]
        for box in SUD_BOX_RE.findall(epanels[i + 1]):
            nm = SUD_NAME_RE.search(box)
            name = ""
            if nm is not None:
                name = on_clean(nm.group(1))
            if name == "":
                continue
            ad = SUD_ADDR_RE.search(box)
            location = ""
            if ad is not None:
                location = on_clean(ad.group(1))
            rows.append({K_NAME: name, K_LOCATION: location, K_TYPE: prog})
    return rows


def timmins() -> dict:
    """Timmins:雇主走页内链的名单 PDF(pilot 列逐行归 type),职业走同页 RCIP/FCIP 两栏。"""
    h = fetch_on_page(TM_PAGE)
    m = TM_PDF_HREF_RE.search(h)
    if m is None:
        raise ValueError(TM_NO_PDF)
    pdf_url = html_lib.unescape(m.group(1))
    employers = timmins_pdf_rows(fetch_on_bytes(pdf_url))
    occupations = timmins_occupation_rows(h)
    if len(employers) == 0 or len(occupations) == 0:
        raise ValueError(TM_SHORT_TPL.format(emp=len(employers), occ=len(occupations)))
    return {K_EMPLOYERS: employers, K_OCCUPATIONS: occupations,
            K_EMPLOYERS_URL: pdf_url, K_OCCUPATIONS_URL: TM_PAGE}


def timmins_pdf_rows(data: bytes) -> list:
    """PDF 三列:sector(x<170)不需要 / 雇主名(170–440)/ pilot(x>=440)。
    同 y(±3)的 pilot 值归到该雇主;空白 = 两试点均可 → RCIP+FCIP。"""
    lines = timmins_spans(data)
    pilots = timmins_pilot_index(lines)
    return timmins_employers(timmins_name_rows(TimminsRowsIn(lines=lines, pilots=pilots)))


def timmins_spans(data: bytes) -> list:
    """PDF → (页号, y 取整, x, 文字) 片段流,按页/y/x 排序。"""
    doc = fitz.open(stream=data, filetype=FILETYPE_PDF)
    lines: list = []
    for pi, page in enumerate(doc):
        # pyrefly: ignore[bad-index] — pymupdf get_text("dict") 档位返回 dict,存根把三档位并成 str|list|dict
        for b in page.get_text(GET_TEXT_DICT)[K_BLOCKS]:
            for ln in b.get(K_LINES, []):
                for s in ln[K_SPANS]:
                    t = s[K_TEXT].strip()
                    if t != "":
                        lines.append((pi, round(s[K_BBOX][1]), s[K_BBOX][0], t))
    lines.sort(key=span_sort_key)
    return lines


def span_sort_key(row: tuple) -> tuple:
    """片段流的排序键:页号 → y → x(原内联 lambda,显式令下出户成具名函数)。"""
    return (row[0], row[1], row[2])


def timmins_pilot_index(lines: list) -> dict:
    """(页号, y) → pilot 列文字(x>=440 且不是页眉句)。"""
    out: dict = {}
    for pi, y, x, t in lines:
        if x >= TM_X_PILOT_MIN and TM_HDR_RE.search(t) is None:
            out[(pi, y)] = t
    return out


def timmins_name_rows(x: TimminsRowsIn) -> list:
    """雇主名列(170<=x<440,非页眉)逐行取名,配同 y 的 pilot 值;换行续名接到上一行。"""
    rows: list = []
    for pi, y, xx, t in x.lines:
        if xx < TM_X_NAME_MIN or xx >= TM_X_PILOT_MIN or TM_HDR_RE.search(t) is not None:
            continue
        p = timmins_pilot_at(TimminsPilotIn(pilots=x.pilots, page=pi, y=y))
        if p is None and t == TM_CONT_NAME and len(rows) > 0:
            rows[-1][K_NAME] += SPACE_SEP + t
        else:
            rows.append({K_NAME: t, K_PILOT: p})
    return rows


def timmins_pilot_at(x: TimminsPilotIn) -> str | None:
    """同一页、y 差 ≤3 的 pilot 值;没有 → None(原 next(genexp),显式令下改显式循环)。"""
    for key, v in x.pilots.items():
        if key[0] == x.page and abs(key[1] - x.y) <= TM_Y_TOL:
            return v
    return None


def timmins_employers(rows: list) -> list:
    """中间行 → 雇主行:压空白、剥 [not hiring]、pilot 值归成行级 type。"""
    out: list = []
    for r in rows:
        name = TM_NOT_HIRING_RE.sub("", WS_RE.sub(SPACE_SEP, r[K_NAME]).strip()).strip()
        if name == "":
            continue
        pilot = r[K_PILOT]
        if pilot is None:
            pilot = ""
        out.append({K_NAME: name, K_LOCATION: "", K_TYPE: timmins_pilot_type(pilot)})
    return out


def timmins_pilot_type(pilot: str) -> str:
    """pilot 列文字 → 行级 type:只留大写字母比对,不是 RCIP/FCIP(含空白)就是两试点均可。"""
    pv = TM_NON_ALPHA_RE.sub("", pilot.upper())
    if pv in TM_PILOT_CODES:
        return pv
    return CTYPE_BOTH


def timmins_occupation_rows(html: str) -> list:
    """职业块(Priority Occupations 标题后的 ul)逐条;type 取块前最近的 RCIP/FCIP 标签。"""
    rows: list = []
    for blk in TM_OCC_BLOCK_RE.finditer(html):
        progs = TM_TAB_TITLE_RE.findall(html[:blk.start()])
        if len(progs) == 0:
            raise ValueError(TM_NO_TABS)
        for li in LI_RE.findall(blk.group(1)):
            m2 = NOC_LINE_RE.match(on_clean(li))
            if m2 is None:
                continue
            rows.append({K_NOC: m2.group(1), K_TITLE: on_cut_note(m2.group(2)),
                         K_SECTOR_ONLY: False, K_TYPE: progs[-1]})
    return rows


def sault_ste_marie() -> dict:
    """Sault Ste. Marie:雇主走 designated-employers 页 <p> 列表,职业走分行业表。"""
    employers = ssm_employer_rows(fetch_on_page(SSM_EMP_URL))
    occupations = ssm_occupation_rows(fetch_on_page(SSM_OCC_URL))
    return {K_EMPLOYERS: employers, K_OCCUPATIONS: occupations,
            K_EMPLOYERS_URL: SSM_EMP_URL, K_OCCUPATIONS_URL: SSM_OCC_URL}


def ssm_employer_rows(html: str) -> list:
    """名单块(<p> 最多的那个富文本块)逐行:空行与免责说明段剔除,状态/年份注记剥掉。"""
    blocks = SSM_BLOCK_RE.findall(html)
    if len(blocks) == 0:
        raise ValueError(SSM_NO_BLOCK)
    rows: list = []
    for p in SSM_P_RE.findall(max(blocks, key=ssm_paragraph_count)):
        t = on_clean(p)
        if t == "" or len(t) > SSM_NAME_MAX or SSM_SKIP_RE.search(t) is not None:
            continue
        t = SSM_NOT_HIRING_RE.sub("", t)
        t = SSM_YEAR_NOTE_RE.sub("", t).strip()
        if t != "":
            rows.append({K_NAME: t, K_LOCATION: ""})
    if len(rows) < SSM_MIN_EMP:
        raise ValueError(SSM_SHORT_TPL.format(n=len(rows)))
    return rows


def ssm_paragraph_count(block: str) -> int:
    """一个富文本块里的 <p> 数(名单块 = 最多的那个;原内联 lambda,出户成具名)。"""
    return len(SSM_P_OPEN_RE.findall(block))


def ssm_occupation_rows(html: str) -> list:
    """分行业表:有 NOC 对的逐条收(页面含同表两份副本,去重);官方空栏 → sectorOnly。"""
    rows: list = []
    seen: set = set()
    secs = SSM_SECTOR_RE.split(html)
    for i in range(1, len(secs), 2):
        sector = on_clean(secs[i])
        body = secs[i + 1]
        pairs = SSM_PAIR_RE.findall(body)
        if len(pairs) > 0:
            ssm_take_pairs(SsmPairsIn(pairs=pairs, rows=rows, seen=seen))
        elif SSM_EMPTY_SECTOR in body or SSM_EMPTY_NOTE in body:
            if ("", sector) not in seen:
                seen.add(("", sector))
                rows.append({K_NOC: "", K_TITLE: sector, K_SECTOR_ONLY: True})
    if len(rows) == 0:
        raise ValueError(SSM_NO_OCC)
    return rows


def ssm_take_pairs(x: SsmPairsIn) -> None:
    """一个行业段里的 NOC 对并进结果(同 (码, 名) 只收一次)。"""
    for n, t in x.pairs:
        title = on_clean(t)
        if (n, title) in x.seen:
            continue
        x.seen.add((n, title))
        x.rows.append({K_NOC: n, K_TITLE: title, K_SECTOR_ONLY: False})


def thunder_bay() -> dict:
    """Thunder Bay:雇主走页内 PDF(y 聚簇双列),职业走 Priority Occupations 段的 ul。"""
    h = fetch_on_page(TB_PAGE)
    pdf_url = thunder_bay_pdf_url(h)
    if pdf_url == "":
        raise ValueError(TB_NO_PDF)
    employers = thunder_bay_pdf_rows(fetch_on_bytes(pdf_url))
    occupations = thunder_bay_occupation_rows(h)
    if len(employers) == 0 or len(occupations) == 0:
        raise ValueError(TB_SHORT_TPL.format(emp=len(employers), occ=len(occupations)))
    return {K_EMPLOYERS: employers, K_OCCUPATIONS: occupations,
            K_EMPLOYERS_URL: pdf_url, K_OCCUPATIONS_URL: TB_PAGE}


def thunder_bay_pdf_url(html: str) -> str:
    """页内第一个「后面 400 字里出现 List of Designated Employers」的 .pdf 链接(没有 → 空串)。"""
    for m in PDF_HREF_RE.finditer(html):
        if TB_LINK_HINT in html[m.end():m.end() + TB_LINK_WINDOW]:
            return html_lib.unescape(m.group(1))
    return ""


def thunder_bay_pdf_rows(data: bytes) -> list:
    """y 聚簇双列(名 x<290 / 地址 x>=290),跨行名前向拼接;
    「excluded from 2026」段起整段剔除;红字(not hiring)行保留。"""
    doc = fitz.open(stream=data, filetype=FILETYPE_PDF)
    raw: list = []
    state = TbState(pending="", excluded=False)
    for page in doc:
        for cl in tb_clusters(page):
            tb_take_cluster(TbTakeIn(cluster=cl, raw=raw, state=state))
    rows = tb_kept_rows(raw)
    tb_patch_locations(rows)
    tb_split_allen(rows)
    tb_fix_sovereign(rows)
    return rows


def tb_clusters(page: fitz.Page) -> list:
    """一页 → y 聚簇清单({y, items});同 y(±3)的片段并成一簇。"""
    spans: list = []
    # pyrefly: ignore[bad-index] — pymupdf get_text("dict") 档位返回 dict,存根把三档位并成 str|list|dict
    for b in page.get_text(GET_TEXT_DICT)[K_BLOCKS]:
        for ln in b.get(K_LINES, []):
            for s in ln[K_SPANS]:
                t = s[K_TEXT].strip()
                if t != "":
                    spans.append((s[K_BBOX][1], s[K_BBOX][0], t))
    spans.sort()
    out: list = []
    for y, x, t in spans:
        if len(out) > 0 and abs(y - out[-1][K_Y]) <= TB_Y_TOL:
            out[-1][K_ITEMS].append((x, t))
        else:
            out.append({K_Y: y, K_ITEMS: [(x, t)]})
    return out


def tb_take_cluster(x: TbTakeIn) -> None:
    """一簇 → 左列名 / 右列地址,按四种组合并进结果(pending 与 excluded 原地更新)。"""
    left = tb_join_side(TbSideIn(items=x.cluster[K_ITEMS], left=True))
    right = tb_join_side(TbSideIn(items=x.cluster[K_ITEMS], left=False))
    if TB_SKIP_RE.search(left) is not None or TB_SKIP_RE.search(right) is not None:
        return
    if TB_EXCL_RE.search(left) is not None:
        x.state.excluded = True
        return
    if left != "" and right != "":
        x.raw.append({K_NAME: (x.state.pending + SPACE_SEP + left).strip(),
                      K_LOCATION: right, K_EXCLUDED: x.state.excluded})
        x.state.pending = ""
        return
    if left != "":
        x.state.pending = (x.state.pending + SPACE_SEP + left).strip()
        return
    if right == "":
        return
    if x.state.pending != "":
        x.raw.append({K_NAME: x.state.pending, K_LOCATION: right,
                      K_EXCLUDED: x.state.excluded})
        x.state.pending = ""
    elif len(x.raw) > 0:
        x.raw[-1][K_LOCATION] = (x.raw[-1][K_LOCATION] + SPACE_SEP + right).strip()


def tb_join_side(x: TbSideIn) -> str:
    """一簇里某一列的文字(左 x<290 / 右 x>=290),按 x 排序后空格拼。"""
    parts: list = []
    for x0, t in sorted(x.items):
        if x.left:
            if x0 < TB_X_SPLIT:
                parts.append(t)
        elif x0 >= TB_X_SPLIT:
            parts.append(t)
    return SPACE_SEP.join(parts)


def tb_kept_rows(raw: list) -> list:
    """排除段的行整批滤掉,名与地址各压一次空白。"""
    out: list = []
    for r in raw:
        if r[K_EXCLUDED]:
            continue
        out.append({K_NAME: WS_RE.sub(SPACE_SEP, r[K_NAME]).strip(),
                    K_LOCATION: WS_RE.sub(SPACE_SEP, r[K_LOCATION]).strip()})
    return out


def tb_patch_locations(rows: list) -> None:
    """双列版式错位的手工校正(名字对不上=换版,跳过);原地改。"""
    for r in rows:
        for key, loc in TB_PATCH.items():
            if key in r[K_NAME]:
                r[K_LOCATION] = loc
                break


def tb_split_allen(rows: list) -> None:
    """两行被并成一行:名列里印了 Allen 的地址 —— 拆回两家(原地改)。"""
    for i, r in enumerate(rows):
        if r[K_NAME].startswith(TB_ALLEN_PREFIX) and TB_ALLSTATE_MARK in r[K_NAME]:
            rows[i:i + 1] = [{K_NAME: TB_ALLEN_NAME, K_LOCATION: TB_ALLEN_LOC},
                             {K_NAME: TB_ALLSTATE_NAME, K_LOCATION: r[K_LOCATION]}]
            break


def tb_fix_sovereign(rows: list) -> None:
    """第二家 Sovereign Dental 的地址印在名行上方 —— 恰好两家时按核过的地址补(原地改)。"""
    sd: list = []
    for r in rows:
        if r[K_NAME] == TB_SOVEREIGN:
            sd.append(r)
    if len(sd) == TB_SOVEREIGN_PAIR:
        sd[0][K_LOCATION] = TB_SOVEREIGN_LOC1
        sd[1][K_LOCATION] = TB_SOVEREIGN_LOC2


def thunder_bay_occupation_rows(html: str) -> list:
    """Priority Occupations 段的 ul 逐条(TB 清单无带内嵌破折号的职业名,破折号后全是限制条件附注)。"""
    j = html.find(PRIORITY_OCC_ANCHOR)
    if j < 0:
        raise ValueError(TB_NO_OCC)
    rows: list = []
    for li in LI_RE.findall(on_ul_block(UlBlockIn(html=html, start=j))):
        m2 = NOC_LINE_RE.match(on_clean(li))
        if m2 is None:
            continue
        rows.append({K_NOC: m2.group(1),
                     K_TITLE: NOTE_DASH_RE.split(m2.group(2))[0].strip(),
                     K_SECTOR_ONLY: False})
    return rows


def on_ul_block(x: UlBlockIn) -> str:
    """从 start 起第一个 <ul> 到与之配对的 </ul>(嵌套计深;TB 64100 行内嵌套过子列表)。"""
    m0 = UL_OPEN_RE.search(x.html[x.start:])
    if m0 is None:
        return ""
    i0 = x.start + m0.start()
    depth = 0
    for m in UL_TAG_RE.finditer(x.html[i0:]):
        if m.group(1) == "":
            depth += 1
        else:
            depth -= 1
        if depth == 0:
            return x.html[i0:i0 + m.start()]
    return x.html[i0:]


# =========================================================================
# 7. BC 三社区抽取(West Kootenay / North Okanagan Shuswap / Peace Liard)
# =========================================================================


def west_kootenay() -> dict:
    """West Kootenay:雇主走公示页 accordion 表(De-designated 段剔除),职业走 priorities 页表。"""
    employers = wk_employer_rows(fetch_bc_response(WK_EMP_URL).text)
    occupations = wk_occupation_rows(fetch_bc_response(WK_OCC_URL).text)
    return {K_EMPLOYERS: employers, K_OCCUPATIONS: occupations,
            K_EMPLOYERS_URL: WK_EMP_URL, K_OCCUPATIONS_URL: WK_OCC_URL}


def fetch_bc_response(url: str) -> httpx.Response:
    """BC 段取页(httpx.get + 浏览器 UA + 跟随重定向)。"""
    r = httpx.get(url, headers={HDR_UA: BROWSER_UA}, follow_redirects=True, timeout=TIMEOUT_S)
    r.raise_for_status()
    return r


def bc_text(html_fragment: str) -> str:
    """去标签 + 实体解码 + 空白归一。"""
    return SPACE_SEP.join(html_lib.unescape(TAG_RE.sub(SPACE_SEP, html_fragment)).split())


def bc_pdf_norm(s: str) -> str:
    """PDF 文本归一:合字还原(ﬂ→fl 等)+ 空白归一。"""
    return SPACE_SEP.join(unicodedata.normalize(NFKC_FORM, s).split())


def bc_dedupe(rows: list) -> list:
    """按 name 去重保首条(与批B 合并口径一致)。"""
    seen: set = set()
    out: list = []
    for r in rows:
        if r[K_NAME] != "" and r[K_NAME] not in seen:
            seen.add(r[K_NAME])
            out.append(r)
    return out


def wk_employer_rows(html: str) -> list:
    """名单区间:h2 标题 → De-designated 段之前;标记缺失 = 改版,抛。表头格(<strong>)跳过。"""
    start = html.find(WK_LIST_START)
    end = html.find(WK_LIST_END)
    if start < 0 or end < 0 or end <= start:
        raise ValueError(WK_NO_BOUNDS)
    rows: list = []
    for cell in WK_TD_RE.findall(html[start:end]):
        if WK_HEADER_MARK in cell:
            continue
        t = bc_text(cell)
        if t == "":
            continue
        name, _sep, loc = t.partition(WK_LOC_SEP)
        rows.append({K_NAME: name.strip(), K_LOCATION: loc.strip()})
    return bc_dedupe(rows)


def wk_occupation_rows(html: str) -> list:
    """职业表:第二格是五位 NOC 码的行才收;职业名里的「(new)」标注剥掉。"""
    rows: list = []
    for tr in WK_TR_RE.findall(html):
        tds = WK_TD_ANY_RE.findall(tr)
        if len(tds) < 2:
            continue
        noc = bc_text(tds[1])
        if NOC5_RE.fullmatch(noc) is None:
            continue
        rows.append({K_NOC: noc, K_TITLE: bc_text(tds[0]).replace(WK_NEW_MARK, "").strip(),
                     K_SECTOR_ONLY: False})
    return rows


def north_okanagan_shuswap() -> dict:
    """North Okanagan Shuswap:雇主走每月换版的官方 PDF,职业走 priority-sectors-nocs 页表。"""
    pdf_url = nos_pdf_url(fetch_bc_response(NOS_RES_URL).text)
    employers = nos_employer_rows(fetch_bc_response(pdf_url).content)
    occupations = nos_occupation_rows(fetch_bc_response(NOS_OCC_URL).text)
    return {K_EMPLOYERS: employers, K_OCCUPATIONS: occupations,
            K_EMPLOYERS_URL: pdf_url, K_OCCUPATIONS_URL: NOS_OCC_URL}


def nos_pdf_url(html: str) -> str:
    """Resources 页里第一个 Designated-Employer-List PDF 链接(没有即抛)。"""
    for u in PDF_HREF_RE.findall(html):
        if NOS_PDF_HINT in u:
            return u
    raise ValueError(NOS_NO_PDF)


def nos_employer_rows(data: bytes) -> list:
    """两列表格:行业列 x≈78、雇主名列 x≈290,单元格折行时两列逐行对齐。

    行业行数与雇主名数对不上 = 解析漏行,抛异常保旧;带 * 的(快餐/加油站子行业暂停受理)
    官方仍列入指定 → 原样保留(* 是官方标注,与批B 一致)。
    """
    doc = fitz.open(stream=data, filetype=FILETYPE_PDF)
    parts: list = []
    starts = 0
    for page in doc:
        starts += nos_scan_page(NosPageIn(cells=bc_page_cells(page), parts=parts))
    if len(parts) != starts:
        raise ValueError(NOS_MISMATCH_TPL.format(starts=starts, parts=len(parts)))
    rows: list = []
    for p in parts:
        rows.append({K_NAME: SPACE_SEP.join(p).strip(), K_LOCATION: ""})
    return bc_dedupe(rows)


def bc_page_cells(page: fitz.Page) -> list:
    """一页 → (y 取整, x 取整, 归一后文字) 格子流,已排序(NOS 与 NEBC 两处共用,原文逐字相同)。"""
    cells: list = []
    # pyrefly: ignore[bad-index] — pymupdf get_text("dict") 档位返回 dict,存根把三档位并成 str|list|dict
    for b in page.get_text(GET_TEXT_DICT)[K_BLOCKS]:
        for ln in b.get(K_LINES, []):
            texts: list = []
            for s in ln[K_SPANS]:
                texts.append(s[K_TEXT])
            cells.append((round(ln[K_BBOX][1]), round(ln[K_BBOX][0]),
                          bc_pdf_norm("".join(texts))))
    cells.sort()
    return cells


def nos_scan_page(x: NosPageIn) -> int:
    """一页:行业列建 y 索引 → 名列拼回整行 → 逐行归成新雇主或上一家的折行;返回本页行业行数。"""
    sector_ys = nos_sector_ys(x.cells)
    for y, t in nos_name_lines(x.cells):
        if nos_sector_at(NosSectorIn(sector_ys=sector_ys, y=y)) in NOS_SECTOR_STARTS:
            x.parts.append([t])
        elif len(x.parts) > 0:
            x.parts[-1].append(t)
    return nos_sector_start_count(sector_ys)


def nos_sector_ys(cells: list) -> dict:
    """行业列(x<260)的 y → 文字。"""
    out: dict = {}
    for y, x, t in cells:
        if t != "" and x < NOS_X_SPLIT:
            out[y] = t
    return out


def nos_sector_start_count(sector_ys: dict) -> int:
    """本页有几行是行业名首行(= 有几家雇主起头)。"""
    n = 0
    for t in sector_ys.values():
        if t in NOS_SECTOR_STARTS:
            n += 1
    return n


def nos_name_lines(cells: list) -> list:
    """名列(x>=260)拼回整行:同一视觉行会被拆成多个同 y 碎片(如 'Aslan|Electrical,|…')。"""
    out: list = []
    for y, x, t in cells:
        if x < NOS_X_SPLIT or t == "" or t.lower() in NOS_NAMECOL_SKIP:
            continue
        if NOS_DATE_RE.fullmatch(t) is not None:
            continue
        if len(out) > 0 and abs(out[-1][0] - y) <= NOS_Y_TOL:
            out[-1] = (out[-1][0], out[-1][1] + SPACE_SEP + t)
        else:
            out.append((y, t))
    return out


def nos_sector_at(x: NosSectorIn) -> str:
    """同视觉行的行业名:先本行,再上一行,再下一行;都没有 → 空串。"""
    for dy in NOS_DY_ORDER:
        s = x.sector_ys.get(x.y + dy)
        if s is not None and s != "":
            return s
    return ""


def nos_occupation_rows(html: str) -> list:
    """表格单元:「<a …>12200</a> – Accounting technicians and bookkeepers」。"""
    rows: list = []
    for noc, title in NOS_OCC_RE.findall(html):
        rows.append({K_NOC: noc, K_TITLE: bc_text(title), K_SECTOR_ONLY: False})
    return rows


def peace_liard() -> dict:
    """Peace Liard(NEBC):雇主走 candidates 页链接的官方 PDF,职业走 Wix 组件挂的官方 CSV。

    官方回到「待公示」状态 → 空名单(基线 0 放行);两条路都不通 = 疑似改版,抛。
    """
    cand_html = fetch_bc_response(NEBC_CAND_URL).text
    pdf_url = nebc_pdf_url(cand_html)
    if pdf_url != "":
        employers = nebc_pdf_employers(pdf_url)
        emp_url = pdf_url
    elif NEBC_PENDING_RE.search(cand_html) is not None:
        employers = []
        emp_url = NEBC_CAND_URL
    else:
        raise ValueError(NEBC_NO_LIST)
    occupations = nebc_occupation_rows(fetch_bc_response(NEBC_OCC_CSV).text)
    return {K_EMPLOYERS: employers, K_OCCUPATIONS: occupations,
            K_EMPLOYERS_URL: emp_url, K_OCCUPATIONS_URL: NEBC_OCC_URL}


def nebc_pdf_url(html: str) -> str:
    """锚文本含 Designated Employer 的 .pdf 链接(2026-08 起已公示);没有 → 空串。"""
    for href, atext in NEBC_A_RE.findall(html):
        if NEBC_PDF_MARK in href and NEBC_ANCHOR_HINT in bc_text(atext):
            return href
    return ""


def nebc_pdf_employers(url: str) -> list:
    """NEBC 名单 PDF:三列(# / Legal Name / Operating As),按行号锚定,折行拼接。

    PDF 自带总数(As of … • N Designated Employers)对账,对不上 = 解析漏行,抛。
    """
    doc = fitz.open(stream=fetch_bc_response(url).content, filetype=FILETYPE_PDF)
    rows: list = []
    for page in doc:
        nebc_take_page(NebcPageIn(cells=bc_page_cells(page), rows=rows))
    employers: list = []
    for r in rows:
        legal = SPACE_SEP.join(r[K_LEGAL])
        if legal == "":
            continue
        employers.append({K_NAME: nebc_row_name(
            NebcNameIn(legal=legal, oa=SPACE_SEP.join(r[K_OA]))), K_LOCATION: ""})
    m = NEBC_TOTAL_RE.search(nebc_pdf_text(doc))
    if m is not None and int(m.group(1)) != len(employers):
        raise ValueError(NEBC_MISMATCH_TPL.format(claim=m.group(1), n=len(employers)))
    return employers


def nebc_take_page(x: NebcPageIn) -> None:
    """一页:行号列开新行,法定名/经营名两列各自累加。

    跨页折行极少且页首必有行号 —— 本函数按页调用即等于原脚本的「按页重置防串行」。
    """
    current = None
    for cell in x.cells:
        t = cell[2]
        if t == "" or NEBC_PAGE_RE.fullmatch(t) is not None:
            continue
        if cell[1] < NEBC_X_NUM:
            if t.isdigit():
                current = {K_LEGAL: [], K_OA: []}
                x.rows.append(current)
            continue
        if current is None:
            continue
        if cell[1] < NEBC_X_LEGAL:
            current[K_LEGAL].append(t)
        else:
            current[K_OA].append(t)


def nebc_row_name(x: NebcNameIn) -> str:
    """两名不同 → 「法定名 (经营名)」;同一个或没给经营名 → 只留法定名。"""
    if x.oa != "" and nebc_norm_key(x.oa) != nebc_norm_key(x.legal):
        return NEBC_NAME_TPL.format(legal=x.legal, oa=x.oa)
    return x.legal


def nebc_norm_key(s: str) -> str:
    """比对两名是否同一个时的归一(原内联 lambda norm,出户成具名)。"""
    return NEBC_NORM_RE.sub("", s.lower())


def nebc_pdf_text(doc: fitz.Document) -> str:
    """整份 PDF 的纯文本(拿来读 PDF 自带的总数对账)。"""
    parts: list = []
    for p in doc:
        # pyrefly: ignore[no-matching-overload] — pymupdf get_text() 无参档位恒返回 str,存根把三档位并成 str|list|dict
        parts.append(p.get_text())
    return LINE_SEP.join(parts)


def nebc_occupation_rows(csv_text: str) -> list:
    """官方 CSV:首列是五位 NOC 码的行才收。"""
    rows: list = []
    for row in csv.reader(io.StringIO(csv_text.lstrip(BOM))):
        if len(row) < 2:
            continue
        noc = row[0].strip()
        if NOC5_RE.fullmatch(noc) is None:
            continue
        rows.append({K_NOC: noc, K_TITLE: SPACE_SEP.join(row[1].split()),
                     K_SECTOR_ONLY: False})
    return rows


# =========================================================================
# 8. 草原五社区抽取(Moose Jaw / Claresholm / Steinbach / Altona-Rhineland / Brandon)
# =========================================================================


def moose_jaw() -> dict:
    """Moose Jaw:雇主走 candidates 页发现的官方 PDF(原件重复段去重),职业走 employers 页表。"""
    pdf_url = prairie_pdf_url(PdfLinkIn(html=fetch_prairie_page(MJ_CANDIDATES),
                                        base_url=MJ_CANDIDATES, link_re=MJ_PDF_RE,
                                        pattern=MJ_PDF_PATTERN))
    employers = mj_employer_rows(pdf_url)
    occupations = mj_occupation_rows(fetch_prairie_page(MJ_OCC_URL))
    return {K_EMPLOYERS: prairie_require(RequireIn(rows=employers, what=MJ_EMP_LABEL)),
            K_OCCUPATIONS: prairie_require(RequireIn(rows=occupations, what=MJ_OCC_LABEL)),
            K_EMPLOYERS_URL: pdf_url, K_OCCUPATIONS_URL: MJ_OCC_URL}


def fetch_prairie_response(url: str) -> httpx.Response:
    """草原段取页;证书校验失败(Brandon 官网漏发中间证书)时走一次 AIA 补链重试。"""
    try:
        r = httpx.get(url, headers={HDR_UA: BROWSER_UA}, timeout=TIMEOUT_S,
                      follow_redirects=True)
    except httpx.ConnectError as e:
        if CERT_FAIL_MARK not in str(e):
            raise
        r = httpx.get(url, headers={HDR_UA: BROWSER_UA}, timeout=TIMEOUT_S,
                      follow_redirects=True, verify=prairie_aia_context(url))
    r.raise_for_status()
    return r


def fetch_prairie_page(url: str) -> str:
    """草原段取一页 HTML。"""
    return fetch_prairie_response(url).text


def prairie_aia_context(url: str) -> ssl.SSLContext:
    """AIA 补链:服务器漏发中间证书时(Brandon 官网实况),按叶证书里的
    CA Issuers URL 下载中间证书补进校验上下文 —— 链条仍必须锚定到 certifi
    受信根,校验不打折(等价浏览器的 AIA chasing,绝不 verify=False)。

    探测那一握手只为取叶证书原文,不作为信任依据,所以 check_hostname/verify 都关掉。
    """
    host = urlsplit(url).hostname
    if host is None:
        host = ""
    port = urlsplit(url).port
    if port is None:
        port = HTTPS_PORT
    probe = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    probe.check_hostname = False
    probe.verify_mode = ssl.CERT_NONE
    with socket.create_connection((host, port), TIMEOUT_S) as sock:
        with probe.wrap_socket(sock, server_hostname=host) as tls:
            leaf_der = tls.getpeercert(binary_form=True)
    if leaf_der is None:
        leaf_der = b""
    pems = prairie_ca_pems(leaf_der)
    if len(pems) == 0:
        raise ssl.SSLCertVerificationError(AIA_FAIL_TPL.format(host=host))
    ctx = ssl.create_default_context()
    ctx.load_verify_locations(cadata=LINE_SEP.join(pems))
    return ctx


def prairie_ca_pems(leaf_der: bytes) -> list:
    """叶证书里的 CA Issuers 地址逐个下载,统一成 PEM 文本。"""
    pems: list = []
    for u in CA_ISSUER_RE.findall(leaf_der):
        body = httpx.get(u.decode(ASCII), timeout=TIMEOUT_S, follow_redirects=True).content
        if PEM_MARK in body:
            pems.append(body.decode(ASCII))
        else:
            pems.append(ssl.DER_cert_to_PEM_cert(body))
    return pems


def prairie_pdf_url(x: PdfLinkIn) -> str:
    """按特征在官方页里发现 PDF 链接(不写死文件名,官方按日期换版)。

    只还原 &amp; —— 整串 unescape 会把查询串里的 &curren… 吃成 ¤(St. Pierre 实撞)。
    """
    m = x.link_re.search(x.html)
    if m is None:
        raise ValueError(PDF_LINK_FAIL_TPL.format(pattern=x.pattern))
    return urljoin(x.base_url, m.group(1).replace(AMP_ENTITY, AMP))


def prairie_pdf(url: str) -> fitz.Document:
    """草原段下一份 PDF 并打开。"""
    return fitz.open(stream=fetch_prairie_response(url).content, filetype=FILETYPE_PDF)


def prairie_tidy(text: str) -> str:
    """并空白 + 弯引号归直引号(批B 底本口径,避免刷新时全量行 churn)。"""
    return WS_RE.sub(SPACE_SEP, text).replace(CURLY_QUOTE, STRAIGHT_QUOTE).strip()


def prairie_clean(fragment: str) -> str:
    """HTML 片段 → 纯文本单行(去标签、解实体、并空白)。"""
    return prairie_tidy(html_lib.unescape(TAG_RE.sub(SPACE_SEP, fragment)))


def prairie_html_lines(page_html: str) -> list:
    """整页 HTML → 文本行(每个标签断行),供逐行状态机解析。"""
    h = PRAIRIE_SCRIPT_STYLE_RE.sub(SPACE_SEP, page_html)
    h = html_lib.unescape(TAG_RE.sub(LINE_SEP, h))
    out: list = []
    for ln in h.splitlines():
        if ln.strip() == "":
            continue
        out.append(WS_RE.sub(SPACE_SEP, ln).strip())
    return out


def prairie_require(x: RequireIn) -> list:
    """解析 0 行即抛 —— 源疑似改版,总控保旧(宁缺勿猜)。"""
    if len(x.rows) == 0:
        raise ValueError(REQUIRE_FAIL_TPL.format(what=x.what))
    return x.rows


def mj_employer_rows(pdf_url: str) -> list:
    """PDF 逐行:告示段与长句(≥8 词)剔除,原件重复行去重
    (Briercrest College / Capilano Court 各重复一次;雇主名最长 5~6 词)。"""
    rows: list = []
    seen: set = set()
    with prairie_pdf(pdf_url) as doc:
        for page in doc:
            # pyrefly: ignore[missing-attribute] — pymupdf get_text() 无参档位恒返回 str,存根把三档位并成 str|list|dict
            for raw in page.get_text().splitlines():
                line = prairie_tidy(raw)
                if line == "" or line.startswith(MJ_NOTE_MARK):
                    continue
                if len(line.split()) >= MJ_MAX_WORDS or MJ_NOTICE_RE.search(line) is not None:
                    continue
                if line.lower() in seen:
                    continue
                seen.add(line.lower())
                rows.append({K_NAME: line, K_LOCATION: ""})
    return rows


def mj_occupation_rows(html: str) -> list:
    """Priority Occupations 段的表格逐行(段锚缺失就当空表,由 prairie_require 报 0 行)。"""
    i = html.find(PRIORITY_OCC_ANCHOR)
    table = ""
    if i >= 0:
        table = html[i:html.find(TABLE_CLOSE, i)]
    rows: list = []
    for noc, title in MJ_OCC_ROW_RE.findall(table):
        rows.append({K_NOC: noc, K_TITLE: prairie_clean(title), K_SECTOR_ONLY: False})
    return rows


def claresholm() -> dict:
    """Claresholm:单页站,雇主是 <li> 行(HIRING/NOT HIRING 一律保留),职业是行业绑定行。"""
    h = fetch_prairie_page(CL_URL)
    employers = cl_employer_rows(h)
    occupations = cl_occupation_rows(h)
    return {K_EMPLOYERS: prairie_require(RequireIn(rows=employers, what=CL_EMP_LABEL)),
            K_OCCUPATIONS: prairie_require(RequireIn(rows=occupations, what=CL_OCC_LABEL)),
            K_EMPLOYERS_URL: CL_URL, K_OCCUPATIONS_URL: CL_URL}


def cl_employer_rows(html: str) -> list:
    """雇主行形如「Name – 6, Sales & Services – NOT HIRING」;在招与否不影响收不收。"""
    rows: list = []
    for li in CL_LI_RE.findall(html):
        m = CL_EMP_RE.match(prairie_clean(li))
        if m is None:
            continue
        rows.append({K_NAME: m.group(1), K_LOCATION: ""})
    return rows


def cl_occupation_rows(html: str) -> list:
    """行业绑定的职业行(同 NOC 可多行);「To be used by X:」限定语并入随后各行标题,
    遇下一个行业标题(单位数编号)即失效。"""
    rows: list = []
    qualifier = ""
    for line in prairie_html_lines(html):
        if CL_SECTOR_RE.match(line) is not None:
            qualifier = ""
            continue
        mq = CL_QUALIFIER_RE.match(line)
        if mq is not None:
            qualifier = mq.group(1)
            continue
        mo = CL_OCC_RE.match(line)
        if mo is None:
            continue
        title = mo.group(2)
        if qualifier != "":
            title = title + CL_QUALIFIER_TPL.format(qualifier=qualifier)
        rows.append({K_NOC: mo.group(1), K_TITLE: title, K_SECTOR_ONLY: False})
    return rows


def steinbach() -> dict:
    """Steinbach:雇主走 /rcip/ 页发现的官方 PDF,职业走同页 <p> 行(移动/桌面双份渲染,去重)。"""
    h = fetch_prairie_page(SB_URL)
    pdf_url = prairie_pdf_url(PdfLinkIn(html=h, base_url=SB_URL, link_re=SB_PDF_RE,
                                        pattern=SB_PDF_PATTERN))
    employers = sb_employer_rows(pdf_url)
    occupations = sb_occupation_rows(h)
    return {K_EMPLOYERS: prairie_require(RequireIn(rows=employers, what=SB_EMP_LABEL)),
            K_OCCUPATIONS: prairie_require(RequireIn(rows=occupations, what=SB_OCC_LABEL)),
            K_EMPLOYERS_URL: pdf_url, K_OCCUPATIONS_URL: SB_OCC_URL}


def sb_employer_rows(pdf_url: str) -> list:
    """PDF 逐行:页眉/联系方式剔除;排版伪影「Manitoba Health -Health…」补齐连字号空格。"""
    rows: list = []
    with prairie_pdf(pdf_url) as doc:
        for page in doc:
            # pyrefly: ignore[missing-attribute] — pymupdf get_text() 无参档位恒返回 str,存根把三档位并成 str|list|dict
            for raw in page.get_text().splitlines():
                line = SB_DASH_FIX_RE.sub(SB_DASH_FIX_TO, prairie_tidy(raw))
                if line != "" and SB_SKIP_RE.search(line) is None:
                    rows.append({K_NAME: line, K_LOCATION: ""})
    return rows


def sb_occupation_rows(html: str) -> list:
    """Priority Occupations 段起的 <p> 职业行,按 (noc, title) 有序去重。"""
    rows: list = []
    seen: set = set()
    i = html.find(PRIORITY_OCC_ANCHOR)
    for noc, title in SB_OCC_RE.findall(html[max(i, 0):]):
        t = prairie_clean(title)
        if (noc, t) in seen:
            continue
        seen.add((noc, t))
        rows.append({K_NOC: noc, K_TITLE: t, K_SECTOR_ONLY: False})
    return rows


def altona_rhineland() -> dict:
    """Altona/Rhineland:雇主/职业各一张 eael 数据表(td-content 单元格流)。"""
    employers: list = []
    for c in altona_td_cells(fetch_prairie_page(AL_EMP_URL)):
        if c != "":
            employers.append({K_NAME: c, K_LOCATION: ""})
    occupations = altona_occupation_rows(altona_td_cells(fetch_prairie_page(AL_OCC_URL)))
    return {K_EMPLOYERS: prairie_require(RequireIn(rows=employers, what=AL_EMP_LABEL)),
            K_OCCUPATIONS: prairie_require(RequireIn(rows=occupations, what=AL_OCC_LABEL)),
            K_EMPLOYERS_URL: AL_EMP_URL, K_OCCUPATIONS_URL: AL_OCC_URL}


def altona_td_cells(page_html: str) -> list:
    """一张 eael 表 → 单元格文字流。"""
    out: list = []
    for c in AL_CELL_RE.findall(page_html):
        out.append(prairie_clean(c))
    return out


def altona_occupation_rows(cells: list) -> list:
    """三列表(NOC / 职业名 / 行业)拍平成单元格流:5 位数字起一行,取其后一格为标题。"""
    rows: list = []
    for i in range(len(cells) - 1):
        if NOC5_RE.fullmatch(cells[i]) is None:
            continue
        rows.append({K_NOC: cells[i], K_TITLE: cells[i + 1], K_SECTOR_ONLY: False})
    return rows


def brandon() -> dict:
    """Brandon:雇主走两列名单表(逐家备注列忽略),职业走优先表的 NOC 链接锚文本。"""
    employers = br_employer_rows(fetch_prairie_page(BR_EMP_URL))
    occupations = br_occupation_rows(fetch_prairie_page(BR_OCC_URL))
    return {K_EMPLOYERS: prairie_require(RequireIn(rows=employers, what=BR_EMP_LABEL)),
            K_OCCUPATIONS: prairie_require(RequireIn(rows=occupations, what=BR_OCC_LABEL)),
            K_EMPLOYERS_URL: BR_EMP_URL, K_OCCUPATIONS_URL: BR_OCC_URL}


def br_employer_rows(html: str) -> list:
    """**第一张**含「Designated Employers」的表就是名单表(原脚本取首张即 break)。"""
    for table in BR_TABLE_RE.findall(html):
        if BR_LIST_MARK in table:
            return br_table_rows(table)
    return []


def br_table_rows(table: str) -> list:
    """名单表逐行取首列(次列逐家备注按拍板忽略,行保留);表头行跳过。"""
    rows: list = []
    for tr in BR_TR_RE.findall(table):
        tds = BR_TD_RE.findall(tr)
        name = ""
        if len(tds) > 0:
            name = prairie_clean(tds[0])
        if name != "" and name.lower() != BR_HEADER_NAME:
            rows.append({K_NAME: name, K_LOCATION: ""})
    return rows


def br_occupation_rows(html: str) -> list:
    """优先表里的 NOC 链接锚文本「12345 – 职业名」。"""
    rows: list = []
    for noc, title in BR_OCC_RE.findall(html):
        rows.append({K_NOC: noc, K_TITLE: prairie_clean(title), K_SECTOR_ONLY: False})
    return rows


# =========================================================================
# 9. 大西洋一社区抽取(Pictou County)
# =========================================================================


def pictou_county() -> dict:
    """Pictou County RCIP:雇主 PDF(带 recruiting 状态行,全保留)+ 首页职业列表。"""
    employers_url = pictou_pdf_url(fetch_atl_page(PICTOU_EMPLOYERS_PAGE_URL))
    employers = pictou_employer_rows(atl_pdf_lines(employers_url))
    occupations = pictou_occupation_rows(fetch_atl_page(PICTOU_HOME_URL))
    if len(employers) < PICTOU_MIN_EMP:
        raise ValueError(PICTOU_EMP_SHORT_TPL.format(n=len(employers)))
    if len(occupations) < PICTOU_MIN_OCC:
        raise ValueError(PICTOU_OCC_SHORT_TPL.format(n=len(occupations)))
    return {K_EMPLOYERS: employers, K_OCCUPATIONS: occupations,
            K_EMPLOYERS_URL: employers_url, K_OCCUPATIONS_URL: PICTOU_HOME_URL}


def fetch_atl_response(url: str) -> httpx.Response:
    """大西洋段取页(浏览器 UA + 英优先的语言偏好,英法双语站的实况值)。"""
    with httpx.Client(headers={HDR_UA: BROWSER_UA, HDR_ACCEPT_LANGUAGE: ATL_ACCEPT_LANG},
                      follow_redirects=True, timeout=TIMEOUT_S) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp


def fetch_atl_page(url: str) -> str:
    """大西洋段取一页 HTML。"""
    return fetch_atl_response(url).text


def atl_pdf_lines(url: str) -> list:
    """下载 PDF,按页返回去首尾空白后的非空文本行。"""
    resp = fetch_atl_response(url)
    pages: list = []
    with fitz.open(stream=resp.content, filetype=FILETYPE_PDF) as doc:
        for page in doc:
            lines: list = []
            # pyrefly: ignore[missing-attribute] — pymupdf get_text() 无参档位恒返回 str,存根把三档位并成 str|list|dict
            for ln in page.get_text().splitlines():
                if ln.strip() != "":
                    lines.append(ln.strip())
            pages.append(lines)
    return pages


def atl_clean(text: str) -> str:
    """实体解码 + 空白归一(**不去标签** —— 调用点要去标签的自己先去)。"""
    return WS_RE.sub(SPACE_SEP, html_lib.unescape(text)).strip()


def pictou_pdf_url(html: str) -> str:
    """从 /employers/ 页发现当期 PDF(文件名含日期,官方换版即换名)。"""
    m = PICTOU_PDF_RE.search(html)
    if m is None:
        raise ValueError(PICTOU_NO_PDF)
    return html_lib.unescape(m.group(1))


def pictou_employer_rows(pages: list) -> list:
    """状态行的**前一非空行** = 雇主名(表头/脚注后面不会紧跟状态行)。"""
    rows: list = []
    for page_lines in pages:
        prev = ""
        for line in page_lines:
            norm = atl_clean(line)
            if norm.lower() not in PICTOU_STATUS_VALUES:
                prev = norm
                continue
            if pictou_is_name(prev):
                rows.append({K_NAME: prev, K_LOCATION: ""})
            prev = ""
    return rows


def pictou_is_name(prev: str) -> bool:
    """前一行是不是雇主名(非空、不是状态行、不是 Status 表头)。"""
    if prev == "" or prev == PICTOU_STATUS_HEADER:
        return False
    return prev.lower() not in PICTOU_STATUS_VALUES


def pictou_occupation_rows(html: str) -> list:
    """首页 repeater 的 dmach-acf-value:「Title – 12345」;同款元素还装了 6 条无码的
    Priority Sectors,按尾码过滤即分离。"""
    rows: list = []
    for raw in PICTOU_VALUE_RE.findall(html):
        m = PICTOU_OCC_RE.match(atl_clean(TAG_RE.sub(SPACE_SEP, raw)))
        if m is None:
            continue
        rows.append({K_NOC: m.group(2), K_TITLE: m.group(1), K_SECTOR_ONLY: False})
    return rows

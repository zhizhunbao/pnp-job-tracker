"""
fcip 域函数 —— 全部行为住这(照 company/noc/pnp 全溶样张,方言律全集见
docs/design/etl分域-20260829.md §4)。

2026-08-31 批E 从 pilot 域拆出(Frank「拆成三个 很少有人有法语」):原 pilot/functions.py
的 details / quota / communities 三段整段搬来,**函数体逐字未改**,批E 拆分改动只有四处
(每处在所属函数的 docstring 里另记一段):
  · community_type_of 改查 constants.DUAL_COMMUNITIES(本域该表为空,判定与 rcip 镜像同形);
  · build_pilot_quota 去掉直连补抓那一步(两个直连社区都是 RCIP,整套归 rcip 域);
  · parse_community_rows 只切 Francophone 那一节(Rural 节归 rcip 域);
  · build_pilot_communities 只找 Francophone 一个锚 + 塌方哨兵单侧化(只看 FCIP < MIN_FCIP)。
IN/OUT 路径的改指全在 constants,本文件一行不涉。
**零字符串令**:字面量全住 constants(文案 *_TPL 模板、JSON 键 K_ 词族、官方原句 *_QUOTE);
**显式循环令**:禁推导/genexp/lambda;**内嵌禁令**:内部函数出户成顶层具名函数;
**一参令**:函数至多一参,多入参收 scheme 的 XxxIn dataclass,多返回值收 XxxOut。
日志口径:域内不裸 print,报数走 log.functions.say;各步原有的「✗ / !」行原样保留
(auto_update 按行首升 ERROR 级,这就是本域的错误通道)。
退出口径两档,逐步不同、逐字保留:
  · details —— **整步永远 exit 0 不拦役**,总控自身失败在入口函数体内当场吃掉,不漏给门;
  · quota / communities —— 抓不到就少几行 / 保留旧表,正常返回,不拦役。
依赖单边:本文件 → constants/scheme + 基础设施叶(log / fetch)+ 本域私件群 extractors。
"""
import html as html_lib
import json
from datetime import date
from pathlib import Path

from log.functions import say
from fetch.constants import SPACE_SEP, WS_RE
from fcip.constants import (
    ASOF_LEN, BASELINE_EMP, CITY_MAP, COMM_COLLAPSE_TPL, COMM_DONE_TPL, COMM_IO_TPL,
    COMM_NO_ANCHOR, COMM_NOTE, COMM_PAGE_SUFFIX, CTYPE_BOTH, DET_CRASH_EXTRACT_TPL, DET_CRASH_TPL,
    DET_DONE_TPL, DET_EMP_NOTE, DET_EMP_SHORT_TPL, DET_ERR_DETAIL_LEN, DET_IO_TPL, DET_KEPT_SEP,
    DET_KEPT_TPL, DET_OCC_NOTE, DET_OCC_SHORT_TPL, DUAL_COMMUNITIES, ENC_UTF8, ERRORS_IGNORE,
    ERRORS_REPLACE, HTML_CACHE_DIR, IN_COMMUNITIES, IN_CRAWL, IN_MANIFEST, K_ASOF, K_CITIES,
    K_COMMUNITY, K_CRAWLED_AT, K_EMPLOYERS, K_EMPLOYERS_URL, K_FIRST_COME, K_FIRST_COME_QUOTE,
    K_FIRST_COME_URL, K_HTML, K_NAME, K_OCCUPATIONS, K_OCCUPATIONS_URL, K_PAGES, K_PER_INTAKE,
    K_PER_INTAKE_QUOTE, K_PER_INTAKE_URL, K_PROVINCE, K_REMAINING, K_REMAINING_QUOTE,
    K_REMAINING_URL, K_ROWS, K_TYPE, K_URL, MANIFEST_FILE, MIN_FCIP, MIN_OCC, OFFICIAL_HOSTS,
    OUT_COMMUNITIES, OUT_EMP, OUT_OCC, OUT_QUOTA, PROV_HINT, PROV_RE, QUOTA_DONE_TPL,
    QUOTA_FLAG_KV_TPL, QUOTA_FLAG_LABELS, QUOTA_FLAG_NONE, QUOTA_FLAG_OCC_TPL, QUOTA_FLAG_SEP,
    QUOTA_IO_TPL, QUOTA_NOTE, QUOTA_ROW_TPL, QUOTA_SKIP_TPL, QUOTE_AFTER, QUOTE_BEFORE,
    RE_COMM_LINK, RE_FIRST_COME, RE_FRANCO_H3, RE_NOC, RE_OCC_FULL, RE_OCC_NOT_FULL,
    RE_PER_INTAKE, RE_REMAINING, SCRIPT_STYLE_RE, SENT_SPLIT, SLUG_TO_COMMUNITY, STATUS_FULL,
    TAG_RE, TYPE_FCIP,
)
from fcip.scheme import (
    CommDocIn, CommRowIn, CommunityIn, CommunityOut, CountTypeIn, DetailDocIn, DetailRowIn,
    EmpPartIn, FlagsIn, OccPartIn, ParseCommIn, ProvIn, QuotaOccIn, ScanIn, ScanOut, ScanPageIn,
    ScanSentIn, SegmentIn, WindowIn, WriteDetailsIn, WriteQuotaIn,
)
from fcip.extractors import EXTRACTORS

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

    批E 拆分改动(2026-08-31):上面那条死分支改为查 constants.DUAL_COMMUNITIES 点名
    (拍板点 8-②)。本域该表为空 —— 双身份社区 Sudbury/Timmins 的抽取归 rcip 域,
    本域压根抽不到它俩,所以这条兜底在本域永不命中;写成与 rcip 镜像同形,
    是为了哪天 IRCC 改口径只需改常量。
    """
    if x.name in DUAL_COMMUNITIES:
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
# 3. quota 步(FCIP 社区名额状态)
# =========================================================================


def build_pilot_quota() -> None:
    """FCIP 社区名额状态 → fcip-quota.json(入口,门直调)。

    扫 crawl 缓存(4 个 fcip-* slug);抓不到就少几行,空 ≠ 没有限额,只是官网没写。

    批E 拆分改动(2026-08-31):原步先扫 18 个 slug 再直连补抓缓存够不着的两个社区,
    那两个(Claresholm / West Kootenay)都是 RCIP,整套直连件随 rcip-* 14 个 slug
    归 rcip 域;本域只剩缓存扫描一路。2026-08-16 实测四站全文都不提名额 → 稳定产 0 行。
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
# 4. communities 步(FCIP 试点社区名单)
# =========================================================================


def build_pilot_communities() -> None:
    """IRCC 官方参与社区名单 → fcip-communities.json(入口,门直调)。

    两道哨兵都是**报一声就返回,不 raise 不拦役**:标题锚缺失(疑 IRCC 改版)、
    行数塌方(FCIP<4)—— 两种情况都保留旧表,绝不拿半份数据盖好数据。

    批E 拆分改动(2026-08-31):① 只解析 Francophone 那一节(段起点=该 h3 的结束位,
    段终点=页尾),Rural 节归 rcip 域,所以本域只找一个锚;② 塌方哨兵单侧化
    ——RCIP 那一侧连同 MIN_RCIP / TYPE_RCIP / RE_RURAL_H3 移去 rcip 域。
    """
    OUT_COMMUNITIES.parent.mkdir(parents=True, exist_ok=True)
    say(COMM_IO_TPL.format(manifest=IN_MANIFEST, out=OUT_COMMUNITIES))
    manifest = json.loads(IN_MANIFEST.read_text(encoding=ENC_UTF8))
    page = find_pilot_page(manifest)
    doc = (IN_MANIFEST.parent / HTML_CACHE_DIR / page[K_HTML]).read_text(
        encoding=ENC_UTF8, errors=ERRORS_REPLACE)
    franco = RE_FRANCO_H3.search(doc)
    if franco is None:
        say(COMM_NO_ANCHOR)
        return
    rows = parse_community_rows(ParseCommIn(html=doc, franco_end=franco.end()))
    n_fcip = count_type(CountTypeIn(rows=rows, ctype=TYPE_FCIP))
    if n_fcip < MIN_FCIP:
        say(COMM_COLLAPSE_TPL.format(fcip=n_fcip))
        return
    OUT_COMMUNITIES.write_text(
        json.dumps(to_communities_doc(CommDocIn(source=page[K_URL], rows=rows)),
                   ensure_ascii=False, indent=1), encoding=ENC_UTF8)
    say(COMM_DONE_TPL.format(n=len(rows), fcip=n_fcip,
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
    """一段名单(h3「Francophone communities」之后到页尾,记 FCIP)→ 社区行。

    页顶导语也含 Francophone 字样,所以只认 h3 标题锚。

    批E 拆分改动(2026-08-31):原函数一次解析两节(Rural→RCIP、Francophone→FCIP),
    拆域后本域只切 Francophone 那一节;Rural 节的解析(与 TYPE_RCIP)归 rcip 域同名函数。
    """
    rows: list = []
    seen: set = set()
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

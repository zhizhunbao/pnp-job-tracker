"""
statcan/cip 子域函数 —— CIP 2021 专业表的行为全住这(方言同 statcan/functions.py:零字符串令、显式循环令、一参令、
永不吞异常令;日志走 log 叶的 say / err)。

依赖单向:本文件 → 本子域 constants / scheme + statcan 共用段(statcan.constants 的 crawl slug / UA / 落盘键与缩进,
statcan.functions 的 today_iso)+ 基础设施叶(paths / log / fetch / crawl / noc);statcan 共用段不 import 本文件。
入口函数由 statcan/main.py 登记(cip2021 进 statcan_naics 调度单元;cip_i18n / cip_programs / test_cip 只进 TOOLS 手动点名)。
专业 → 本站职业大类的对照与查表住 noc 叶(major_broads_of / major_broads_problems,分类法单一来源),本文件只调用。

@author Frank
@time 2026-10-04 02:14:05
"""
import csv
import io
import json
import re
import sys
import unittest
from typing import cast

import httpx

import paths
from crawl.functions import put_cached_page
from crawl.scheme import CachePutIn
from fetch.constants import HDR_UA
from fetch.functions import make_tls_context
from log.functions import err, say
from noc.functions import major_broads_of, major_broads_problems, ollama_base
from statcan.constants import CRAWL_SLUG, INDENT_1, K_FETCHED, K_SOURCE, WDS_UA
from statcan.functions import today_iso
from statcan.cip.constants import (
    CIP_BROADS_FAIL_TPL, CIP_CATS, CIP_CAT_EMPTY_TPL, CIP_CAT_LOST_TPL, CIP_CAT_OF, CIP_CAT_PREFIX_LENS,
    CIP_CAT_SERIES30, CIP_CAT_UNKNOWN_TPL, CIP_CLASSES_N, CIP_COL_CODE, CIP_COL_PARENT, CIP_COL_STRUCT,
    CIP_COL_TITLE_EN, CIP_COL_TITLE_FR, CIP_COUNT_FAIL_TPL, CIP_CSV_URL, CIP_CUSTOM_GROUPS, CIP_DEPTH_MAX, CIP_DONE_TPL,
    CIP_ENC, CIP_EN_AGENT_RE, CIP_EN_AND, CIP_EN_CHAIN_RE, CIP_EN_GENERAL_RE, CIP_EN_LANG_RE, CIP_EN_LANG_TO,
    CIP_EN_LIST_SEP, CIP_EN_NFC, CIP_EN_NOTE_RE, CIP_EN_OTHER_HEAD, CIP_EN_OTHER_RE, CIP_EN_PAIR_RE, CIP_EN_PROPER,
    CIP_EN_ROLES, CIP_EN_ROLE_RE_TPL, CIP_EN_ROOT_LEN, CIP_EN_SHORT_FIX, CIP_EN_SPACE_RE, CIP_EN_SWAPS, CIP_FAIL_SHOW,
    CIP_FIX_MISS_TPL, CIP_GENERAL_SUFFIX, CIP_GEN_URL_TPL, CIP_GROUPINGS, CIP_GROUP_DEAD_TPL, CIP_GROUP_FOLD,
    CIP_GROUP_NAMELESS_TPL, CIP_GROUP_NAMES,
    CIP_I18N_DONE_TPL, CIP_I18N_IO_TPL, CIP_I18N_TICK_TPL, CIP_I18N_TODO_TPL, CIP_JSON_ENC, CIP_LANGS, CIP_LANG_RE,
    CIP_LATIN_RE, CIP_LCFIRST_MIN, CIP_NAME_FIX, CIP_OTHER_CODE_TAIL, CIP_OTHER_EN, CIP_OTHER_EN_TAIL,
    CIP_OTHER_GROUP_TAIL, CIP_OTHER_HEADS, CIP_OTHER_LOCAL, CIP_OTHER_MARK, CIP_OTHER_TAILS, CIP_OTHER_TRIM,
    CIP_PLACES_DONE_TPL, CIP_POPULAR, CIP_POPULAR_MISS_TPL, CIP_PRINT_OUT_TPL, CIP_PROGRAMS_DONE_TPL, CIP_ROOT_FAIL_TPL,
    CIP_SERIES_30, CIP_SERIES_LEN, CIP_SINK_SERIES, CIP_SLASH, CIP_SPACE, CIP_STRUCT_CLASS, CIP_SUBSERIES_LEN,
    CIP_CROSS_TAIL, CIP_MISC_TAIL, CIP_SERIES_GENERAL_TAILS, CIP_SINGLE_DEAD_TPL, CIP_SINGLE_TO,
    CIP_TERM_FIX, CIP_TIMEOUT_S, CIP_TITLE, CIP_TRANS_BATCH, CIP_TRANS_FAIL, CIP_TRANS_LINE_RE, CIP_TRANS_LINE_TPL,
    CIP_TRANS_MAX_LEN, CIP_TRANS_MODEL, CIP_TRANS_PROMPT_TPL, CIP_TRANS_TIMEOUT_S, CIP_TRANS_V, CIP_UNRANKED,
    CIP_VERSION, CIP_ZH_AGENT_TAILS, CIP_ZH_ALSO, CIP_ZH_AND, CIP_ZH_CLASS_TAIL, CIP_ZH_GENERAL_MARK, CIP_ZH_LIST_SEP,
    CIP_ZH_NOTE_RE,
    CIP_ZH_ROLES, CIP_ZH_ROLE_JOINS, CIP_ZH_SHOW_FIX, CIP_ZH_SWAPS, K_BROADS, K_CIP_CODE, K_CIP_ROWS, K_CIP_SERIES,
    K_CIP_VERSION, K_GROUPING, K_KO, K_MODEL, K_OPTIONS, K_PLACES, K_PLACE_CAT, K_PLACE_CAT_EN, K_PLACE_CAT_KO,
    K_PLACE_CAT_ORDER, K_PLACE_CAT_ZH, K_PLACE_GROUP, K_PLACE_GROUP_EN, K_PLACE_GROUP_KO, K_PLACE_GROUP_ORDER,
    K_PLACE_GROUP_ZH, K_PLACE_ORDER, K_PLACE_SINGLE, K_POPULAR, K_PROMPT, K_RESPONSE, K_STREAM, K_SUBSERIES,
    K_TEMPERATURE, K_THINK, K_TITLE_EN, K_TITLE_EN_SHORT, K_TITLE_FR, K_TITLE_KO, K_TITLE_ZH, K_TITLE_ZH_RAW, K_V, K_ZH,
    NL, OUT_CIP, OUT_CIP_I18N, OUT_CIP_PROGRAMS, TEST_VERBOSITY,
)
from statcan.cip.scheme import (
    CipBatchIn, CipCatIn, CipEnIn, CipGroupIn, CipLocalIn, CipNameIn, CipOtherIn, CipPlaceIn, CipPlacesCheckIn,
    CipPlacesIn, CipPrefixIn, CipProgramIn, CipRankIn, CipRanksIn, CipRootIn, CipRowIn, CipTodoIn, CipZhIn,
    CipFoldCheckIn, CipFoldIn, CipMoveIn, CipNearIn, CipSeriesIn,
    HttpJsonClientLike,
    StatcanCipPlacesTest, StatcanCipTest,
)


# =========================================================================
# 1. 结构表(cip2021 步)
# =========================================================================

def scrape_statcan_cip() -> None:
    """官方 CIP 2021 结构表 → raw/statcan/cip2021.json(2,119 个 class,一码一行)。

    IN : statcan.gc.ca/en/media/4226(primary groupings 变体 CSV,原文进 crawl 层)
    OUT: raw/statcan/cip2021.json
    条数或父链对不上即抛,整表不更新(保留旧文件)。
    """
    say(CIP_PRINT_OUT_TPL.format(path=OUT_CIP))
    r = httpx.get(CIP_CSV_URL, headers={HDR_UA: WDS_UA}, timeout=CIP_TIMEOUT_S, follow_redirects=True,
                  verify=make_tls_context())
    r.raise_for_status()
    text = r.content.decode(CIP_ENC)
    put_cached_page(CachePutIn(slug=CRAWL_SLUG, url=CIP_CSV_URL, html=text, title=CIP_TITLE))
    rows = cip_rows_of(text)
    check_cip(rows)
    paths.STATCAN.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_CIP, payload={
        K_SOURCE: [CIP_CSV_URL], K_CIP_VERSION: CIP_VERSION, K_FETCHED: today_iso(), K_CIP_ROWS: rows,
    }, indent=INDENT_1))
    say(CIP_DONE_TPL.format(n=len(rows), out=OUT_CIP.name))


def cip_rows_of(text: str) -> list:
    """结构表原文 → class 行。认 class 看 Hierarchical structure 列(series 30 的 class 在第 3 层,见 CIP_COL_STRUCT);
    按代码去重先到先得(父码索引同口径);表头先 strip(官方 'Parent ' 带尾随空格)。"""
    reader = csv.DictReader(io.StringIO(text))
    names: list = []
    for name in reader.fieldnames or []:
        names.append(name.strip())
    reader.fieldnames = names
    parent_of: dict = {}
    classes: list = []
    for raw in reader:
        if raw[CIP_COL_CODE] in parent_of:
            continue
        parent_of[raw[CIP_COL_CODE]] = raw[CIP_COL_PARENT]
        if raw[CIP_COL_STRUCT] == CIP_STRUCT_CLASS:
            classes.append(raw)
    rows: list = []
    for raw in classes:
        rows.append(to_cip_row(CipRowIn(row=raw, parent_of=parent_of)))
    return rows


def to_cip_row(x: CipRowIn) -> dict:
    """官方一行 → 落盘行(英法名去首尾空白;subseries = 官方父码;grouping 顺父链爬到根)。"""
    code = x.row[CIP_COL_CODE]
    return {
        K_CIP_CODE: code,
        K_TITLE_EN: x.row[CIP_COL_TITLE_EN].strip(),
        K_TITLE_FR: x.row[CIP_COL_TITLE_FR].strip(),
        K_CIP_SERIES: code[:CIP_SERIES_LEN],
        K_SUBSERIES: x.row[CIP_COL_PARENT],
        K_GROUPING: cip_root_of(CipRootIn(code=code, parent_of=x.parent_of)),
    }


def cip_root_of(x: CipRootIn) -> str:
    """顺父链爬到根(父码为空的那一层 = primary grouping);链断或超步数就停在当处,由自校拦。"""
    code = x.code
    for _ in range(CIP_DEPTH_MAX):
        parent = x.parent_of.get(code, "")
        if parent == "":
            break
        code = parent
    return code


def check_cip(rows: list) -> None:
    """自校:class 数 = 官方 2,119,且每行都爬到 13 个 primary grouping 之一(未过即抛,保留旧表)。"""
    if len(rows) != CIP_CLASSES_N:
        raise RuntimeError(CIP_COUNT_FAIL_TPL.format(n=len(rows), want=CIP_CLASSES_N))
    bad: list = []
    for row in rows:
        if row[K_GROUPING] not in CIP_GROUPINGS:
            bad.append(row[K_CIP_CODE])
    if len(bad) > 0:
        raise RuntimeError(CIP_ROOT_FAIL_TPL.format(codes=bad[:CIP_FAIL_SHOW]))


# =========================================================================
# 2. 中韩名(cip_i18n 步)
# =========================================================================

def translate_statcan_cip() -> None:
    """CIP class 英文名 → 中 / 韩名(本地 qwen 分批译;手动件,可断点续跑:版本对、已译的语言跳过,每批落一次盘)。

    IN : raw/statcan/cip2021.json
    OUT: processed/statcan/cip_i18n.json({code: {v, zh, ko}};没过闸的留空,下轮再译,不瞎填)
    """
    say(CIP_I18N_IO_TPL.format(src=OUT_CIP, out=OUT_CIP_I18N, model=CIP_TRANS_MODEL, base=ollama_base()))
    rows = load_cip_rows()
    done = load_cip_i18n()
    OUT_CIP_I18N.parent.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=CIP_TRANS_TIMEOUT_S) as raw_client:
        client = cast(HttpJsonClientLike, raw_client)
        for lang in CIP_LANGS:
            todo = cip_todo_of(CipTodoIn(rows=rows, done=done, lang=lang))
            say(CIP_I18N_TODO_TPL.format(lang=lang, n=len(todo), have=len(rows) - len(todo)))
            ok = 0
            for at in range(0, len(todo), CIP_TRANS_BATCH):
                batch = todo[at:at + CIP_TRANS_BATCH]
                titles: list = []
                for row in batch:
                    titles.append(row[K_TITLE_EN].removesuffix(CIP_GENERAL_SUFFIX))
                for row, name in zip(batch, cip_translate_split(CipBatchIn(client=client, titles=titles, lang=lang))):
                    if name != "":
                        done.setdefault(row[K_CIP_CODE], {K_V: CIP_TRANS_V})[lang] = name
                        ok += 1
                paths.write_json(paths.WriteJsonIn(path=OUT_CIP_I18N, payload=done, indent=INDENT_1))
                say(CIP_I18N_TICK_TPL.format(lang=lang, done=min(at + CIP_TRANS_BATCH, len(todo)), todo=len(todo), ok=ok))
    paths.write_json(paths.WriteJsonIn(path=OUT_CIP_I18N, payload=done, indent=INDENT_1))
    zh = 0
    ko = 0
    for cell in done.values():
        zh += int(K_ZH in cell)
        ko += int(K_KO in cell)
    say(CIP_I18N_DONE_TPL.format(n=len(rows), zh=zh, ko=ko, out=OUT_CIP_I18N))


def load_cip_rows() -> list:
    """raw/statcan/cip2021.json 的 class 行(第 2 / 3 步共读;没抓过直接抛 —— 先跑 --only cip2021)。"""
    return json.loads(OUT_CIP.read_text(encoding=CIP_JSON_ENC))[K_CIP_ROWS]


def load_cip_i18n() -> dict:
    """译名缓存当前态;版本号不是 CIP_TRANS_V 的格读进来即丢(加一 = 整批重译)。首跑没有文件 = 空表。"""
    if OUT_CIP_I18N.exists() is False:
        return {}
    out: dict = {}
    for code, cell in json.loads(OUT_CIP_I18N.read_text(encoding=CIP_JSON_ENC)).items():
        if cell.get(K_V) == CIP_TRANS_V:
            out[code] = cell
    return out


def cip_todo_of(x: CipTodoIn) -> list:
    """一门语言的待译行:缓存里这门语言还没有的。"""
    todo: list = []
    for row in x.rows:
        if x.done.get(row[K_CIP_CODE], {}).get(x.lang, "") == "":
            todo.append(row)
    return todo


def cip_translate_split(x: CipBatchIn) -> list:
    """一批译不齐就对半再试,直到单条;返回与入参等长的清单,空串 = 这条没译成(照 noc.translate_split)。"""
    got = cip_translate(x)
    if len(got) == len(x.titles):
        return got
    if len(x.titles) == 1:
        return [""]
    mid = len(x.titles) // 2
    head = cip_translate_split(CipBatchIn(client=x.client, titles=x.titles[:mid], lang=x.lang))
    tail = cip_translate_split(CipBatchIn(client=x.client, titles=x.titles[mid:], lang=x.lang))
    return head + tail


def cip_translate(x: CipBatchIn) -> list:
    """一批英文名编号送模型,按编号对位收回;少一条或有一条没过闸给空清单(调用方二分重试;照 noc.translate_titles)。"""
    lines: list = []
    for i, name in enumerate(x.titles):
        lines.append(CIP_TRANS_LINE_TPL.format(n=i + 1, text=name))
    body = {K_MODEL: CIP_TRANS_MODEL, K_STREAM: False, K_THINK: False, K_OPTIONS: {K_TEMPERATURE: 0},
            K_PROMPT: CIP_TRANS_PROMPT_TPL.format(lang=CIP_LANGS[x.lang], lines=NL.join(lines))}
    raw: object = None
    try:
        data = x.client.post(CIP_GEN_URL_TPL.format(base=ollama_base()), json=body).json()
        if isinstance(data, dict):
            raw = data.get(K_RESPONSE)
    except Exception as e:  # noqa: BLE001 — 网络 / 解析失败留痕,整批不中止(照 noc.translate_titles)
        err(CIP_TRANS_FAIL, e)
        return []
    got: dict = {}
    if isinstance(raw, str):
        for line in raw.split(NL):
            m = re.match(CIP_TRANS_LINE_RE, line)
            if m is not None:
                got[int(m.group(1))] = m.group(2).strip()
    out: list = []
    for i, src in enumerate(x.titles):
        name = got.get(i + 1, "")
        if cip_name_ok(CipNameIn(text=name, src=src, lang=x.lang)) is False:
            return []
        out.append(name)
    return out


def cip_name_ok(x: CipNameIn) -> bool:
    """译名过闸:非空、不超长、不是把英文原样吐回、目标语言的字真出现(口径照 noc.title_ok);另加两条:
    中文拉丁字母不许多过汉字(只译了括号、正文照抄英文的退回);英文没有 other 译名却冒出「其他 / 기타」的退回。"""
    out = x.text.strip()
    if out == "" or len(out) > CIP_TRANS_MAX_LEN or out.lower() == x.src.lower():
        return False
    if x.lang == K_ZH and len(re.findall(CIP_LATIN_RE, out)) > len(re.findall(CIP_LANG_RE[K_ZH], out)):
        return False
    if CIP_OTHER_LOCAL[x.lang] in out and CIP_OTHER_EN not in x.src.lower():
        return False
    return re.search(CIP_LANG_RE[x.lang], out) is not None


# =========================================================================
# 3. 汇装件(cip_programs 步)
# =========================================================================

def build_statcan_cip_programs() -> None:
    """CIP 表 + 中韩名 + 专业 → 大类对照 + 热门名次 → processed/statcan/cip_programs.json(手动件)。

    IN : raw/statcan/cip2021.json、processed/statcan/cip_i18n.json、noc 的 MAJOR_SERIES_BROADS、本域 CIP_POPULAR
         + 译名定稿三件(CIP_NAME_FIX 人工定名 / CIP_TERM_FIX 术语校正 / 「其他」归一;2026-10-04 收口审查立)
    OUT: processed/statcan/cip_programs.json(列对齐 docs/sql/cip-programs-20261004.sql;没译成的语言格 null 不瞎填)
    🔴 写 processed 不写 mart(理由见 constants.OUT_CIP_PROGRAMS);对照表有问题 / 热门码或人工定名的码不在表里即抛,不落盘。
    2026-10-05 掌上高考版(Frank「可以,做吧」):每行多算选择器位置(places,cip_places_of,全表一次排好序号)与英文短名
    (titleEnShort),titleZh 换成清洗名、机翻定稿挪 titleZhRaw(列对齐再加 docs/sql/cip-programs-places-20261005.sql);
    显示名两张人工定名表的死键、落不到大类 / 专业类缺名同样即抛。
    """
    rows = load_cip_rows()
    codes: list = []
    for row in rows:
        codes.append(row[K_CIP_CODE])
    problems = major_broads_problems(codes)
    if len(problems) > 0:
        raise RuntimeError(CIP_BROADS_FAIL_TPL.format(problems=problems[:CIP_FAIL_SHOW]))
    rank: dict = {}
    missing: list = []
    for i, code in enumerate(CIP_POPULAR):
        rank[code] = i + 1
        if code not in codes:
            missing.append(code)
    if len(missing) > 0:
        raise RuntimeError(CIP_POPULAR_MISS_TPL.format(codes=missing))
    dead: list = []
    for table in (CIP_NAME_FIX, CIP_EN_SHORT_FIX, CIP_ZH_SHOW_FIX):
        for code in table:
            if code not in codes:
                dead.append(code)
    if len(dead) > 0:
        raise RuntimeError(CIP_FIX_MISS_TPL.format(codes=dead))
    names = load_cip_i18n()
    places = cip_places_of(CipPlacesIn(rows=rows, rank=rank))
    out: list = []
    zh = 0
    ko = 0
    for row in rows:
        got = to_cip_program_row(CipProgramIn(row=row, names=names.get(row[K_CIP_CODE], {}),
                                              rank=rank.get(row[K_CIP_CODE]), places=places.get(row[K_CIP_CODE], [])))
        zh += int(got[K_TITLE_ZH] is not None)
        ko += int(got[K_TITLE_KO] is not None)
        out.append(got)
    OUT_CIP_PROGRAMS.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_CIP_PROGRAMS, payload=out, indent=INDENT_1))
    say(CIP_PROGRAMS_DONE_TPL.format(n=len(out), zh=zh, ko=ko, pop=len(rank), out=OUT_CIP_PROGRAMS))
    say_cip_places(places)


def to_cip_program_row(x: CipProgramIn) -> dict:
    """一个 class → cip_programs 表的一行(键序 = DDL 列序;中韩名过 cip_local_name_of 定稿,没译成的语言格 None,
    不拿英文顶)。
    2026-10-05 掌上高考版:popular 之后接 DDL 新加的两列 titleEnShort / places
    (列序同 docs/sql/cip-programs-places-20261005.sql),titleZh 换成清洗名(cip_zh_show_of),
    机翻定稿殿后放 titleZhRaw(不是 DB 列,只在 processed / mart 留底)。"""
    code = x.row[K_CIP_CODE]
    src = x.row[K_TITLE_EN]
    zh_raw = cip_local_name_of(CipLocalIn(code=code, src=src, names=x.names, lang=K_ZH))
    return {
        K_CIP_CODE: code,
        K_TITLE_EN: src,
        K_TITLE_ZH: cip_zh_show_of(CipZhIn(code=code, text=zh_raw)),
        K_TITLE_KO: cip_local_name_of(CipLocalIn(code=code, src=src, names=x.names, lang=K_KO)),
        K_CIP_SERIES: x.row[K_CIP_SERIES],
        K_GROUPING: x.row[K_GROUPING],
        K_BROADS: major_broads_of(x.row[K_CIP_CODE]),
        K_POPULAR: x.rank,
        K_TITLE_EN_SHORT: cip_en_short_of(CipEnIn(code=code, src=src)),
        K_PLACES: x.places,
        K_TITLE_ZH_RAW: zh_raw,
    }


def cip_local_name_of(x: CipLocalIn) -> str | None:
    """一个 class 一门语言的上架名(2026-10-04 收口审查立):人工定名(CIP_NAME_FIX)整格盖过机翻;否则机翻名过术语校正
    (CIP_TERM_FIX:英文名含那个词才换)与「其他」归一(英文名 ', other' 结尾才归);没译成给 None。"""
    fixed = CIP_NAME_FIX.get(x.code, {}).get(x.lang)
    if fixed is not None:
        return fixed
    name = x.names.get(x.lang, "")
    if name == "":
        return None
    src = x.src.lower()
    for lang, hint, wrong, right in CIP_TERM_FIX:
        if lang == x.lang and hint in src:
            name = name.replace(wrong, right)
    if src.endswith(CIP_OTHER_EN_TAIL):
        return cip_other_of(CipOtherIn(text=name, lang=x.lang))
    return name


def cip_other_of(x: CipOtherIn) -> str:
    """「其他」兜底类译名归一成「正文 + 统一后缀」(CIP_OTHER_MARK):先剥头部的「其他」,再反复剥尾部各种写法到剥不动;
    剥完正文空了就原样交回(不造空名)。"""
    body = x.text.strip()
    head = CIP_OTHER_HEADS[x.lang]
    if body.startswith(head):
        body = body[len(head):].strip(CIP_OTHER_TRIM)
    cut = True
    while cut:
        cut = False
        for tail in CIP_OTHER_TAILS[x.lang]:
            if body.endswith(tail) and len(body) > len(tail):
                body = body[:-len(tail)].strip(CIP_OTHER_TRIM)
                cut = True
    if body == "":
        return x.text
    return body + CIP_OTHER_MARK[x.lang]


def say_cip_places(places: dict) -> None:
    """第 3 步收尾报选择器那一半:大类数 / 折叠专业类数 / 单列专业数 / 挂上的专业数 / 挂两处的专业数。"""
    groups: set = set()
    singles = 0
    twice = 0
    for got in places.values():
        twice += int(len(got) > 1)
        for place in got:
            groups.add((place[K_PLACE_CAT], place[K_PLACE_GROUP]))
            singles += int(place[K_PLACE_SINGLE])
    say(CIP_PLACES_DONE_TPL.format(cats=len(CIP_CATS), groups=len(groups) - singles, singles=singles,
                                   placed=len(places), twice=twice))


# =========================================================================
# 4. 选择器位置(places:左栏大类 → 专业类 → 专业)
# =========================================================================

def cip_places_of(x: CipPlacesIn) -> dict:
    """全表 class → 选择器位置 {code: [place, ...]}(2026-10-05 掌上高考版,Frank「可以,做吧」;效果图与口径见
    docs/design/访客四题-专业题调研-20261004.md「效果图:掌上高考版」)。不进选择器的 series(CIP_SINK_SERIES)不出键
    (调用方给 []);一个专业可挂两个大类(CIP_CAT_OF),各自落一个专业类(cip_group_of);一个码的格按 catOrder 先后。
    落不到大类 / 大类键写错 / 大类空着 / 专业类缺名一律即抛(check_cip_places),不落盘。
    2026-10-05 单列并类(Frank「这下面怎么还有一些单蹦的专业」):分桶自校过了以后逐大类把单列类并进别的专业类
    (cip_folded_of),并完再校一遍(check_cip_folded:人工并类表死键 / 新专业类缺名即抛),按并完的分桶排序号。"""
    buckets: dict = {}
    lost: list = []
    for row in x.rows:
        if row[K_CIP_SERIES] in CIP_SINK_SERIES:
            continue
        code = row[K_CIP_CODE]
        cats = cip_cats_of(row)
        if len(cats) == 0:
            lost.append(code)
        for cat in cats:
            group = cip_group_of(CipGroupIn(cat=cat, code=code))
            buckets.setdefault(cat, {}).setdefault(group, []).append(code)
    check_cip_places(CipPlacesCheckIn(lost=lost, buckets=buckets, rows=x.rows))
    folded = cip_folded_of(buckets)
    check_cip_folded(CipFoldCheckIn(buckets=buckets, folded=folded))
    out: dict = {}
    for i, cat in enumerate(CIP_CATS):
        for code, place in cip_cat_places_of(CipCatIn(cat=cat, order=i + 1, groups=folded[cat], rank=x.rank)):
            out.setdefault(code, []).append(place)
    return out


def cip_cats_of(row: dict) -> list:
    """一个 class 落哪几个左栏大类:CIP_CAT_OF 最细的键先命中(class → subseries → series);series 30 没点名的
    subseries 按 primary grouping 落(CIP_CAT_SERIES30);都查不到给空清单(调用方记账后即抛,不硬塞「其他」)。"""
    code = row[K_CIP_CODE]
    for n in CIP_CAT_PREFIX_LENS:
        cats = CIP_CAT_OF.get(code[:n])
        if cats is not None:
            return list(cats)
    if row[K_CIP_SERIES] == CIP_SERIES_30 and row[K_GROUPING] in CIP_CAT_SERIES30:
        return [CIP_CAT_SERIES30[row[K_GROUPING]]]
    return []


def cip_group_of(x: CipGroupIn) -> str:
    """一个专业在一个大类里落哪个专业类:先看并类(CIP_GROUP_FOLD),再看本大类的自定专业类(CIP_CUSTOM_GROUPS:
    最长的成员前缀赢、同长先登记的赢),都不中就是它自己的 subseries。"""
    fold = CIP_GROUP_FOLD.get(x.code)
    if fold is not None:
        return fold
    best = ""
    width = 0
    for key, (cat, members) in CIP_CUSTOM_GROUPS.items():
        if cat != x.cat:
            continue
        for prefix in members:
            if x.code.startswith(prefix) and len(prefix) > width:
                best = key
                width = len(prefix)
    if best == "":
        return x.code[:CIP_SUBSERIES_LEN]
    return best


def check_cip_places(x: CipPlacesCheckIn) -> None:
    """选择器分桶自校(未过即抛,不落盘):进选择器的专业都落到了大类、大类键(对照表的值与自定专业类的所在大类)
    都在 CIP_CATS —— 自定专业类的大类写错不会报错只会让它整个失效,所以单查;16 个大类都有专业;
    专业类名另由 check_cip_group_names 查。
    2026-10-05 审查补三张对照表的死键查(check_cip_dead_keys,同一类漏洞:前缀写错一位也只会悄悄失效)。"""
    if len(x.lost) > 0:
        raise RuntimeError(CIP_CAT_LOST_TPL.format(codes=x.lost[:CIP_FAIL_SHOW]))
    unknown: list = []
    for cat in x.buckets:
        if cat not in CIP_CATS:
            unknown.append(cat)
    for cat, _members in CIP_CUSTOM_GROUPS.values():
        if cat not in CIP_CATS:
            unknown.append(cat)
    if len(unknown) > 0:
        raise RuntimeError(CIP_CAT_UNKNOWN_TPL.format(cats=unknown))
    empty: list = []
    for cat in CIP_CATS:
        if cat not in x.buckets:
            empty.append(cat)
    if len(empty) > 0:
        raise RuntimeError(CIP_CAT_EMPTY_TPL.format(cats=empty))
    check_cip_group_names(x.buckets)
    check_cip_dead_keys(x)


def check_cip_group_names(buckets: dict) -> None:
    """用到的专业类都要在 CIP_GROUP_NAMES 里有三语名(含单列类:位置格里照样带名字),缺一个即抛。"""
    nameless: list = []
    for groups in buckets.values():
        for group in groups:
            if group not in CIP_GROUP_NAMES and group not in nameless:
                nameless.append(group)
    if len(nameless) > 0:
        raise RuntimeError(CIP_GROUP_NAMELESS_TPL.format(groups=nameless[:CIP_FAIL_SHOW]))


def check_cip_dead_keys(x: CipPlacesCheckIn) -> None:
    """三张对照表的死键(2026-10-05 审查补;口径同 CIP_FIX_MISS_TPL「死键 = 码写错 → 汇装即抛」),有一个即抛:
    ① CIP_CUSTOM_GROUPS 的每个成员前缀,都要在本类(所在大类的那一桶)里命中至少一个专业;
    ② CIP_GROUP_FOLD 的每个码都要真落进了某个专业类;
    ③ CIP_CAT_OF 的每个键都要是至少一个进选择器的 class 码的前缀。"""
    groups = cip_dead_groups_of(x.buckets)
    folds = cip_dead_folds_of(x.buckets)
    cats = cip_dead_cats_of(x.rows)
    if len(groups) + len(folds) + len(cats) > 0:
        raise RuntimeError(CIP_GROUP_DEAD_TPL.format(groups=groups, folds=folds, cats=cats))


def cip_dead_groups_of(buckets: dict) -> list:
    """① 自定专业类里一个专业都没命中的成员前缀 [(专业类键, 前缀)](只数所在大类那一桶里落进本类的专业)。"""
    dead: list = []
    for key, (cat, members) in CIP_CUSTOM_GROUPS.items():
        got = buckets.get(cat, {}).get(key, [])
        for prefix in members:
            if is_cip_prefix_hit(CipPrefixIn(prefix=prefix, codes=got)) is False:
                dead.append((key, prefix))
    return dead


def cip_dead_folds_of(buckets: dict) -> list:
    """② 没落进任何专业类的并类码(CIP_GROUP_FOLD 的键)。"""
    placed: set = set()
    for groups in buckets.values():
        for codes in groups.values():
            placed.update(codes)
    dead: list = []
    for code in CIP_GROUP_FOLD:
        if code not in placed:
            dead.append(code)
    return dead


def cip_dead_cats_of(rows: list) -> list:
    """③ 不是任何进选择器的 class 码(沉底 series 不算)前缀的 CIP_CAT_OF 键。"""
    live: list = []
    for row in rows:
        if row[K_CIP_SERIES] not in CIP_SINK_SERIES:
            live.append(row[K_CIP_CODE])
    dead: list = []
    for key in CIP_CAT_OF:
        if is_cip_prefix_hit(CipPrefixIn(prefix=key, codes=live)) is False:
            dead.append(key)
    return dead


def is_cip_prefix_hit(x: CipPrefixIn) -> bool:
    """清单里至少有一个码以这个前缀开头。"""
    for code in x.codes:
        if code.startswith(x.prefix):
            return True
    return False


def cip_folded_of(buckets: dict) -> dict:
    """单列并类(2026-10-05 Frank「这下面怎么还有一些单蹦的专业」;掌上高考每个专业都在一个专业类里):分桶逐大类过
    cip_cat_folded_of,返回同形的新分桶 {大类键 → {专业类键 → 成员 class 码}}(入参不改)。"""
    out: dict = {}
    for cat, groups in buckets.items():
        out[cat] = cip_cat_folded_of(CipFoldIn(cat=cat, groups=groups))
    return out


def cip_cat_folded_of(x: CipFoldIn) -> dict:
    """一个大类的单列并类:只装一个专业的类(单列类)依次过四步并进别的专业类,装两个以上的类不动:
    ① 人工表(CIP_SINGLE_TO,最长前缀赢);② series 30 跨学科专业 → 本大类的交叉学科类(<大类>.cross);
    ③ 其余并进同 series 的通用类(装 XX.00 专业的类,没有就装 XX.01 的;通用类自己单列也收,收到人就成了折叠类);
    ④ 还落单、也没人并进来的(通用类就是它自己、或本 series 没有通用类)并进同 series 码最近的折叠类(cip_nearest_of),
       本大类没有同 series 折叠类的进其他专业类(<大类>.misc)。
    并完交叉学科类只剩一个专业的也挪进其他专业类;其他专业类只剩一个专业时仍是单列(无处可并,收尾报数里看得见)。"""
    out = cip_moved_of(CipMoveIn(groups=x.groups, moves=cip_single_moves_of(x)))
    cross = x.cat + CIP_CROSS_TAIL
    if len(out.get(cross, [])) == 1:
        out.setdefault(x.cat + CIP_MISC_TAIL, []).extend(out.pop(cross))
    return out


def cip_single_moves_of(x: CipFoldIn) -> dict:
    """单列类 → 并进的专业类键 {单列类键 → 目标键}:先定前三步(cip_pinned_moves_of),再给还落单、也没人并进来的
    单列类找同 series 码最近的折叠类(第 ④ 步;折叠类按前三步并完的样子算)。"""
    moves = cip_pinned_moves_of(x)
    staged = cip_moved_of(CipMoveIn(groups=x.groups, moves=moves))
    for group, codes in x.groups.items():
        if len(codes) == 1 and group not in moves and len(staged[group]) == 1:
            moves[group] = cip_nearest_of(CipNearIn(cat=x.cat, groups=staged, code=codes[0]))
    return moves


def cip_pinned_moves_of(x: CipFoldIn) -> dict:
    """并类前三步:① 人工表 ② series 30 → 交叉学科类 ③ 同 series 的通用类(通用类自己被 ① 挪走的,跟着挪到它的去处)。"""
    moves: dict = {}
    for group, codes in x.groups.items():
        if len(codes) != 1:
            continue
        target = cip_single_to_of(CipGroupIn(cat=x.cat, code=codes[0]))
        if target == "" and codes[0][:CIP_SERIES_LEN] == CIP_SERIES_30:
            target = x.cat + CIP_CROSS_TAIL
        if target != "":
            moves[group] = target
    for group, codes in x.groups.items():
        if len(codes) != 1 or group in moves:
            continue
        home = cip_general_of(CipSeriesIn(groups=x.groups, series=codes[0][:CIP_SERIES_LEN]))
        if home != "" and home != group:
            moves[group] = moves.get(home, home)
    return moves


def cip_single_to_of(x: CipGroupIn) -> str:
    """人工并类表(CIP_SINGLE_TO)里这个专业在这个大类的目标专业类键:最长的码前缀赢;表里没有给空串。"""
    best = ""
    width = 0
    for prefix, group in CIP_SINGLE_TO.get(x.cat, {}).items():
        if x.code.startswith(prefix) and len(prefix) > width:
            best = group
            width = len(prefix)
    return best


def cip_general_of(x: CipSeriesIn) -> str:
    """一个 series 在这个大类里的通用类:装着 XX.00 专业的那个专业类,没有就装着 XX.01 的(CIP_SERIES_GENERAL_TAILS
    先到先得;自定专业类也算,如 14.01 在综合工程类);都没有给空串。"""
    for tail in CIP_SERIES_GENERAL_TAILS:
        for group, codes in x.groups.items():
            if is_cip_prefix_hit(CipPrefixIn(prefix=x.series + tail, codes=codes)):
                return group
    return ""


def cip_nearest_of(x: CipNearIn) -> str:
    """同 series 码最近的折叠类(装两个以上专业的;按成员的 subseries 号算距离,一样近取号小的,再一样取键小的);
    本大类没有同 series 的折叠类给其他专业类键(<大类>.misc)。"""
    series = x.code[:CIP_SERIES_LEN]
    at = cip_sub_no_of(x.code)
    best: tuple = ()
    for group, codes in x.groups.items():
        if len(codes) == 1:
            continue
        for code in codes:
            if code[:CIP_SERIES_LEN] != series:
                continue
            key = (abs(cip_sub_no_of(code) - at), cip_sub_no_of(code), group)
            if len(best) == 0 or key < best:
                best = key
    if len(best) == 0:
        return x.cat + CIP_MISC_TAIL
    return best[-1]


def cip_sub_no_of(code: str) -> int:
    """class 码的 subseries 号(52.0203 → 2;series 后面隔一个点)。"""
    return int(code[CIP_SERIES_LEN + 1:CIP_SUBSERIES_LEN])


def cip_moved_of(x: CipMoveIn) -> dict:
    """照并类表挪一遍:{专业类键 → 成员 class 码},挪走的类整个并进目标类(目标类还没有就新开;入参不改)。"""
    out: dict = {}
    for group, codes in x.groups.items():
        out.setdefault(x.moves.get(group, group), []).extend(codes)
    return out


def check_cip_folded(x: CipFoldCheckIn) -> None:
    """单列并类自校(未过即抛,不落盘):人工并类表(CIP_SINGLE_TO)没有死键 —— 大类键在 CIP_CATS、每个前缀命中本大类
    至少一个单列专业、目标是本大类分桶时就有的专业类或本大类的交叉学科类 / 其他专业类(写错一位不会报别的错,
    那个专业只会悄悄走自动规则、或在别的大类的类名下自成单列);并完用到的专业类都有三语名(交叉学科类 / 其他专业类
    按大类登记在 CIP_GROUP_NAMES)。"""
    dead: list = []
    for cat, table in CIP_SINGLE_TO.items():
        singles: list = []
        for codes in x.buckets.get(cat, {}).values():
            if len(codes) == 1:
                singles.append(codes[0])
        homes = set(x.buckets.get(cat, {}))
        homes.update((cat + CIP_CROSS_TAIL, cat + CIP_MISC_TAIL))
        for prefix, group in table.items():
            if is_cip_prefix_hit(CipPrefixIn(prefix=prefix, codes=singles)) is False or group not in homes:
                dead.append((cat, prefix))
    if len(dead) > 0:
        raise RuntimeError(CIP_SINGLE_DEAD_TPL.format(keys=dead))
    check_cip_group_names(x.folded)


def cip_cat_places_of(x: CipCatIn) -> list:
    """一个大类里的全部位置 [(code, place)]。专业类排序(2026-10-05 效果图定):折叠类(两个以上专业)在前,按
    「类里最靠前的热门名次 → 专业个数多的在前 → 成员最小码」;单列类(只装一个)殿后,按「热门名次 → 码」
    (选择器把它们合成一张卡列在折叠类之后)。类里的专业按「热门名次 → 兜底类殿后 → 码」(cip_codes_ordered_of)。
    2026-10-05 单列卡兜底类殿后(契约「any 'other' item last」):单列类改按「热门名次 → 兜底类殿后 → 码」,
    与类里的专业同一个键形(cip_single_key_of)。
    2026-10-05 单列并类:其他专业类(<大类>.misc)不论装几个专业一律殿后(在单列类之后;单列类并类以后正常没有了)。"""
    multi: list = []
    single: list = []
    misc: list = []
    for group, codes in x.groups.items():
        if group.endswith(CIP_MISC_TAIL):
            misc.append(group)
        elif len(codes) == 1:
            single.append((cip_single_key_of(CipRankIn(code=codes[0], rank=x.rank)), group))
        else:
            multi.append((cip_group_key_of(CipRanksIn(codes=codes, rank=x.rank)), group))
    multi.sort()
    single.sort()
    ordered: list = []
    for _, group in multi + single:
        ordered.append(group)
    out: list = []
    for i, group in enumerate(ordered + misc):
        codes = cip_codes_ordered_of(CipRanksIn(codes=x.groups[group], rank=x.rank))
        for j, code in enumerate(codes):
            out.append((code, to_cip_place(CipPlaceIn(cat=x.cat, cat_order=x.order, group=group, group_order=i + 1,
                                                      order=j + 1, single=len(codes) == 1))))
    return out


def cip_single_key_of(x: CipRankIn) -> tuple:
    """单列类的排序键:(热门名次, 码)(不在热门清单 = CIP_UNRANKED)。
    2026-10-05 单列卡兜底类殿后(契约):键改成 (热门名次, 兜底类记 1 殿后, 码),同 cip_major_key_of。"""
    return (x.rank.get(x.code, CIP_UNRANKED), int(is_cip_other(x.code)), x.code)


def cip_group_key_of(x: CipRanksIn) -> tuple:
    """折叠类的排序键:(类里最靠前的热门名次, 专业个数取负, 成员最小码)。"""
    best = CIP_UNRANKED
    for code in x.codes:
        best = min(best, x.rank.get(code, CIP_UNRANKED))
    return (best, -len(x.codes), min(x.codes))


def cip_codes_ordered_of(x: CipRanksIn) -> list:
    """专业类里的专业排好序的码清单(排序键见 cip_major_key_of)。"""
    keyed: list = []
    for code in x.codes:
        keyed.append(cip_major_key_of(CipRankIn(code=code, rank=x.rank)))
    keyed.sort()
    out: list = []
    for key in keyed:
        out.append(key[-1])
    return out


def cip_major_key_of(x: CipRankIn) -> tuple:
    """专业在专业类里的排序键:(热门名次, 兜底类记 1 殿后, 码)。"""
    return (x.rank.get(x.code, CIP_UNRANKED), int(is_cip_other(x.code)), x.code)


def is_cip_other(code: str) -> bool:
    """兜底专业:class 码以 99 结尾(52.0299、52.9999)。"""
    return code.endswith(CIP_OTHER_CODE_TAIL)


def to_cip_place(x: CipPlaceIn) -> dict:
    """一处位置 → places 清单的一格(键序同 DDL 注释的样例;大类 / 专业类三语名查 CIP_CATS / CIP_GROUP_NAMES)。"""
    cat_en, cat_zh, cat_ko = CIP_CATS[x.cat]
    group_en, group_zh, group_ko = CIP_GROUP_NAMES[x.group]
    return {
        K_PLACE_CAT: x.cat,
        K_PLACE_CAT_ORDER: x.cat_order,
        K_PLACE_CAT_EN: cat_en,
        K_PLACE_CAT_ZH: cat_zh,
        K_PLACE_CAT_KO: cat_ko,
        K_PLACE_GROUP: x.group,
        K_PLACE_GROUP_EN: group_en,
        K_PLACE_GROUP_ZH: group_zh,
        K_PLACE_GROUP_KO: group_ko,
        K_PLACE_GROUP_ORDER: x.group_order,
        K_PLACE_ORDER: x.order,
        K_PLACE_SINGLE: x.single,
    }


# =========================================================================
# 5. 显示名(titleEnShort 英文短名 / titleZh 中文清洗名)
# =========================================================================

def cip_en_short_of(x: CipEnIn) -> str:
    """英文显示名(2026-10-05 掌上高考版;规则逐条见 constants 段 5):人工定名(CIP_EN_SHORT_FIX)整格盖过;否则
    去括注 → ', other' 兜底类改「Other + 主题」→ 去 ', general' → 语言类长尾缩短 → 斜杠处理 → 并空白。
    2026-10-05 审查:原名带 (not for credit) 的,清洗完补回末尾(CIP_EN_NFC;与中文「（不计学分）」对齐,
    也免得和计学分的同名专业撞名)。"""
    fixed = CIP_EN_SHORT_FIX.get(x.code)
    if fixed is not None:
        return fixed
    tail = ""
    if CIP_EN_NFC in x.src:
        tail = CIP_SPACE + CIP_EN_NFC
    text = re.sub(CIP_EN_NOTE_RE, "", x.src).strip()
    if re.search(CIP_EN_OTHER_RE, text) is not None:
        return cip_en_other_of(CipEnIn(code=x.code, src=text)) + tail
    text = re.sub(CIP_EN_GENERAL_RE, "", text)
    text = re.sub(CIP_EN_LANG_RE, CIP_EN_LANG_TO, text)
    text = cip_en_slash_of(text)
    return re.sub(CIP_EN_SPACE_RE, CIP_SPACE, text).strip() + tail


def cip_en_other_of(x: CipEnIn) -> str:
    """', other' 兜底类的英文名:码尾 99 且所在 subseries 有专业类名的,拿类名派生(.99 类直接用类名「Other business」,
    其余「Other + 类名」);其余(码尾不是 99、或不进选择器没有类名的)拿正文派生「Other + 正文」。"""
    group = x.code[:CIP_SUBSERIES_LEN]
    if is_cip_other(x.code) and group in CIP_GROUP_NAMES:
        name, _zh, _ko = CIP_GROUP_NAMES[group]
        if group.endswith(CIP_OTHER_GROUP_TAIL):
            return name
        return CIP_EN_OTHER_HEAD + cip_lcfirst_of(name)
    return CIP_EN_OTHER_HEAD + cip_lcfirst_of(cip_en_slash_of(re.sub(CIP_EN_OTHER_RE, "", x.src)))


def cip_en_slash_of(text: str) -> str:
    """英文斜杠处理四步:整串替换(CIP_EN_SWAPS)→ 剥角色后缀(CIP_EN_ROLES)→ 同根两词留长的(cip_en_pair_of)→
    剩下的斜杠链改 and(cip_en_chain_of)。"""
    for wrong, right in CIP_EN_SWAPS:
        text = text.replace(wrong, right)
    for role in CIP_EN_ROLES:
        text = re.sub(CIP_EN_ROLE_RE_TPL.format(role=re.escape(role)), "", text)
    text = re.sub(CIP_EN_PAIR_RE, cip_en_pair_of, text)
    return re.sub(CIP_EN_CHAIN_RE, cip_en_chain_of, text)


def cip_en_pair_of(m: re.Match) -> str:
    """re.sub 的回调(库定死签名:收一个 Match):斜杠两边同根(两边都不短于 CIP_EN_ROOT_LEN、前几个字母不分大小写
    相同)只留长的那个(一样长留左边);不同根原样交回,下一步改 and。
    2026-10-05 审查两处改判:右边是职业名(CIP_EN_AGENT_RE)、左边不是的留左边的学科名(therapy/therapist →
    therapy;题面问的是专业);留右边时首字母照左边的大小写(Biology/biological → Biological,原先出小写开头)。"""
    left = m.group(1)
    right = m.group(2)
    if len(left) < CIP_EN_ROOT_LEN or len(right) < CIP_EN_ROOT_LEN:
        return m.group(0)
    if left[:CIP_EN_ROOT_LEN].lower() != right[:CIP_EN_ROOT_LEN].lower():
        return m.group(0)
    if re.search(CIP_EN_AGENT_RE, right) is not None and re.search(CIP_EN_AGENT_RE, left) is None:
        return left
    if len(right) > len(left):
        return left[:1] + right[1:]
    return left


def cip_en_chain_of(m: re.Match) -> str:
    """re.sub 的回调:斜杠链改写,两段「A and B」,三段以上「A, B and C」。"""
    parts = m.group(0).split(CIP_SLASH)
    if len(parts) == 2:
        return parts[0] + CIP_EN_AND + parts[1]
    return CIP_EN_LIST_SEP.join(parts[:-1]) + CIP_EN_AND + parts[-1]


def cip_lcfirst_of(text: str) -> str:
    """拼「Other + 主题」时主题首字母改小写;首词是专名(CIP_EN_PROPER)、太短、或第二个字母大写(缩写)的原样。"""
    first = text.split(CIP_SPACE)[0]
    if first in CIP_EN_PROPER or len(text) < CIP_LCFIRST_MIN or text[1].isupper():
        return text
    return text[0].lower() + text[1:]


def cip_zh_show_of(x: CipZhIn) -> str | None:
    """中文显示名(2026-10-05 掌上高考版):人工定名(CIP_ZH_SHOW_FIX)整格盖过;没译成给 None;否则去拉丁括注 →
    码尾 99 的「（其他）」兜底类拿专业类名派生(cip_zh_other_of;不进选择器、没有类名的跳过这步)→ 去角色尾巴与
    斜杠改写(cip_zh_slash_of)。"""
    fixed = CIP_ZH_SHOW_FIX.get(x.code)
    if fixed is not None:
        return fixed
    if x.text is None:
        return None
    text = re.sub(CIP_ZH_NOTE_RE, "", x.text)
    if is_cip_other(x.code) and text.endswith(CIP_OTHER_MARK[K_ZH]) \
            and x.code[:CIP_SUBSERIES_LEN] in CIP_GROUP_NAMES:
        return cip_zh_other_of(x.code)
    return cip_zh_slash_of(text)


def cip_zh_other_of(code: str) -> str:
    """码尾 99 的兜底专业的中文名:.99 类直接用类名(「商科（其他）」),其余「类名去掉（通用）与尾字类 + （其他）」
    (「会计类」→「会计（其他）」)。"""
    group = code[:CIP_SUBSERIES_LEN]
    _en, name, _ko = CIP_GROUP_NAMES[group]
    if group.endswith(CIP_OTHER_GROUP_TAIL):
        return name
    base = name.replace(CIP_ZH_GENERAL_MARK, "")
    if base.endswith(CIP_ZH_CLASS_TAIL):
        base = base[:-len(CIP_ZH_CLASS_TAIL)]
    return base + CIP_OTHER_MARK[K_ZH]


def cip_zh_slash_of(text: str) -> str:
    """去角色尾巴(「/技术员」「与技术员」「及技术员」…,CIP_ZH_ROLES)→ 再去一遍拉丁括注 → 整串替换 → 斜杠改写:
    两段且一段是另一段的开头 / 结尾只留长的,两段且没有「与 / 及」改「X与Y」,其余改顿号。
    2026-10-05 审查:一段是另一段开头、且长的只多一个职业尾字(CIP_ZH_AGENT_TAILS:物理治疗/物理治疗师)的留短的学科名。"""
    for role in CIP_ZH_ROLES:
        for join in CIP_ZH_ROLE_JOINS:
            text = text.replace(join + role, "")
    text = re.sub(CIP_ZH_NOTE_RE, "", text)
    for wrong, right in CIP_ZH_SWAPS:
        text = text.replace(wrong, right)
    parts = text.split(CIP_SLASH)
    if len(parts) == 2 and (parts[1].startswith(parts[0]) or parts[0].endswith(parts[1])):
        if len(parts[1]) == len(parts[0]) + 1 and parts[1][-1] in CIP_ZH_AGENT_TAILS:
            return parts[0]
        if len(parts[1]) > len(parts[0]):
            return parts[1]
        return parts[0]
    if len(parts) == 2 and CIP_ZH_AND not in text and CIP_ZH_ALSO not in text:
        return parts[0] + CIP_ZH_AND + parts[1]
    if len(parts) > 1:
        return CIP_ZH_LIST_SEP.join(parts)
    return text


# =========================================================================
# 6. 自测(用例住本子域 scheme)
# =========================================================================

def run_cip_tests() -> None:
    """test_cip 步入口:跑本子域自测(用例集住本子域 scheme 的 StatcanCipTest,先例 pnp.qc.run_qc_tests);
    有失败 sys.exit(1),门接住后记本步失败。
    2026-10-05 起同一步连跑 StatcanCipPlacesTest(选择器位置与显示名,掌上高考版)。"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    for case in (StatcanCipTest, StatcanCipPlacesTest):
        suite.addTests(loader.loadTestsFromTestCase(case))
    if unittest.TextTestRunner(verbosity=TEST_VERBOSITY).run(suite).wasSuccessful() is False:
        sys.exit(1)

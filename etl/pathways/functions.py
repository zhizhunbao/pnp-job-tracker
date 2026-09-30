"""
pathways 域函数 —— 全部行为住这(照 citations / indexing 样张,方言律全集见 docs/design/etl分域-20260829.md §4)。

一个入口(零参):build_pathways(默认链唯一一步)—— 读 raw/pnp 现值 → 拿通道对照表逐格对 → 全对上才写产物,
有一处对不上就逐条报红、sys.exit(1)(门叶接住转成本轮失败、扣 ping),上一版产物原样留给 mart。
**零字符串令**(字面量全住 constants;to_* 行构造器体内的行键豁免)/ **显式循环令**(禁推导 / genexp / lambda)/
**内嵌禁令** / **一参令**(多入参收 scheme 的 XxxIn dataclass)。
依赖单边:本文件 → constants / scheme + 基础设施叶(paths / log / names);只读 raw/pnp 的文件,不 import pnp 域。

@author Frank
@time 2026-09-28 14:52:58
"""
import json
import sys
from dataclasses import asdict
from pathlib import Path

import paths
from log.functions import say
from names.functions import norm_name
from pathways.constants import (
    BAD_EMPLOYER_TPL, BAD_NOC_TPL, BAD_TAG_TPL, BAD_TEER_TPL, JOB_LINKED_DEFAULT, K_EMPLOYERS, K_JOB_LINKED, K_NOCS, K_TAGS,
    K_TEERS, NOC_RE, TAG_KEYS, TEER_VALUES, UNLINKED_BOARD_TPL,
    BAD_KEY_TPL, BAD_STATUS_TPL, BOARD_MISSING_TPL, BOARD_UNMAPPED_TPL, CHECK_FAIL_TPL, CHECK_ROW_TPL, CLOSED_BOARD_TPL,
    DONE_TPL, DRAW_MISSING_TPL, DRAWS_GLOB, DUP_BOARD_TPL, DUP_KEY_TPL, ENC_UTF8, IN_PNP_DIR, IN_TPL, K_BOARD_LABEL,
    K_COMMUNITIES, K_DRAW_STREAMS, K_DRAWS, K_DRAWS_PENDING, K_IS_DEFAULT, K_KEY, K_LABEL, K_OCC_LABELS, K_OCCUPATIONS,
    K_PROGRAM, K_PROVINCE, K_PROVINCES, K_QUOTA_SCOPE, K_REQ_STREAMS, K_REQUIREMENTS, K_SIGNAL, K_STATUS, K_STREAM,
    K_STREAMS, K_TYPE, KEY_RE, LIST_GLOB, MISSING_FIELD_TPL, MULTI_DEFAULT_TPL, OCC_MISSING_TPL, OUT_INDENT, OUT_PATHWAYS,
    OUT_TPL, PATHWAYS, PENDING_SEEN_TPL, PROGRAM_PNP, QUOTA_MISSING_TPL, REQ_GLOB, REQ_MISSING_TPL, REQUIRED_TEXT,
    RULE_BOARD_LABELS, SEQ_START, STATS_GLOB, STATUS_CLOSED, STATUSES, TYPE_COMMUNITY, TYPE_INELIGIBLE,
)
from pathways.scheme import CheckIn, EntryIn, PathwaysFile, PnpFacts, RowIn, Tally

# =========================================================================
# 1. 入口:读 pnp 产物 → 自校 → 对得上才写产物
# =========================================================================


def build_pathways() -> None:
    """通道对照表 → processed/pathways/pathways.json(自校全过才写;有红逐条报、sys.exit(1),不写产物)。"""
    facts = load_pnp_facts()
    say(IN_TPL.format(n=len(PATHWAYS), draws=len(facts.draw_streams), reqs=len(facts.req_streams),
                      quotas=len(facts.quota_scopes), lists=len(facts.list_labels), boards=len(facts.board_labels)))
    check = CheckIn(table=PATHWAYS, facts=facts)
    for note in pending_notes_of(check):
        say(note)
    problems = problems_of(check)
    if len(problems) > 0:
        say(CHECK_FAIL_TPL.format(n=len(problems)))
        for p in problems:
            say(CHECK_ROW_TPL.format(msg=p))
        sys.exit(1)
    rows: list = []
    seq = SEQ_START
    for entry in PATHWAYS:
        rows.append(to_pathway_row(RowIn(entry=entry, seq=seq)))
        seq += 1
    OUT_PATHWAYS.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_PATHWAYS, payload=asdict(PathwaysFile(rows=rows)), indent=OUT_INDENT))
    say(OUT_TPL.format(path=OUT_PATHWAYS))
    counted = tally_of(PATHWAYS)
    say(DONE_TPL.format(n=len(rows), defaults=counted.defaults, named=counted.named, closed=counted.closed))


def tally_of(table: list) -> Tally:
    """收口行的三个数:省默认 / 挂岗位通道名 / 已关停。"""
    defaults = 0
    named = 0
    closed = 0
    for entry in table:
        if entry[K_IS_DEFAULT]:
            defaults += 1
        if entry[K_BOARD_LABEL] is not None:
            named += 1
        if entry[K_STATUS] == STATUS_CLOSED:
            closed += 1
    return Tally(defaults=defaults, named=named, closed=closed)


# =========================================================================
# 3. 读 pnp 产物(只读 raw/pnp 现值;读坏了照抛 —— 门叶记本轮失败,不拿半套事实去自校)
# =========================================================================


def load_pnp_facts() -> PnpFacts:
    """扫 raw/pnp:抽选组、门槛流、配额行、清单 label、会给岗位挂通道名的清单 label。"""
    draws: set = set()
    for f in sorted(IN_PNP_DIR.glob(DRAWS_GLOB)):
        draws.update(draw_streams_of(read_table(f)))
    reqs: set = set()
    for f in sorted(IN_PNP_DIR.glob(REQ_GLOB)):
        reqs.update(req_streams_of(read_table(f)))
    quotas: set = set()
    for f in sorted(IN_PNP_DIR.glob(STATS_GLOB)):
        quotas.update(quota_scopes_of(read_table(f)))
    labels: set = set()
    boards: set = set()
    for f in sorted(IN_PNP_DIR.glob(LIST_GLOB)):
        data = read_table(f)
        label = data.get(K_LABEL)
        if isinstance(label, str) and label != "":
            labels.add(label)
        board = board_label_of(data)
        if board != "":
            boards.add(board)
    return PnpFacts(draw_streams=draws, req_streams=reqs, quota_scopes=quotas, list_labels=labels, board_labels=boards)


def read_table(path: Path) -> dict:
    """读一份 raw/pnp 表(pnp 各单元原子写盘,读到的一定是整份)。"""
    return json.loads(path.read_text(encoding=ENC_UTF8))


def draw_streams_of(data: dict) -> set:
    """一份抽选表(一省一份)里出现过的抽选组。"""
    out: set = set()
    for block in data.get(K_PROVINCES, {}).values():
        for row in block.get(K_DRAWS, []):
            stream = row.get(K_STREAM)
            if isinstance(stream, str) and stream != "":
                out.add(stream)
    return out


def req_streams_of(data: dict) -> set:
    """一份门槛表里出现过的流。"""
    out: set = set()
    for row in data.get(K_REQUIREMENTS, []):
        stream = row.get(K_STREAM)
        if isinstance(stream, str) and stream != "":
            out.add(stream)
    return out


def quota_scopes_of(data: dict) -> set:
    """一份统计表里通道级配额行的写法(streams 表;目前只有阿省官方按通道公布配额)。"""
    out: set = set()
    streams = data.get(K_STREAMS, [])
    if isinstance(streams, list) is False:
        return out
    for row in streams:
        stream = row.get(K_STREAM)
        if isinstance(stream, str) and stream != "":
            out.add(stream)
    return out


def board_label_of(data: dict) -> str:
    """这份清单会不会给岗位挂通道名:会就回它的 label,不会回空串。
    判法照汇装(mart 的 load_pnp_by_prov / load_community_tables):省提名项目(不写 program = 省提名)、不是信号表、
    不是排除式;职业清单要有职业行,社区表(AB 乡村振兴)没有职业行照挂。"""
    label = data.get(K_LABEL)
    if not isinstance(label, str) or label == "":
        return ""
    if data.get(K_PROGRAM, PROGRAM_PNP) != PROGRAM_PNP or data.get(K_SIGNAL):
        return ""
    kind = data.get(K_TYPE)
    if kind == TYPE_COMMUNITY and len(data.get(K_COMMUNITIES, [])) > 0:
        return label
    if kind is None or kind == TYPE_INELIGIBLE or len(data.get(K_OCCUPATIONS, [])) == 0:
        return ""
    return label


# =========================================================================
# 4. 自校(对不上就停,不写产物)
# =========================================================================


def problems_of(x: CheckIn) -> list[str]:
    """全部红:必填格先查(缺格时后面几查会拿空值去比,先停在这一层)→ 编号与状态、岗位通道名、省默认、逐条对 pnp 现值。"""
    out = required_problems_of(x.table)
    if len(out) > 0:
        return out
    out.extend(key_problems_of(x.table))
    out.extend(board_problems_of(x))
    out.extend(default_problems_of(x.table))
    out.extend(condition_problems_of(x.table))
    for entry in x.table:
        out.extend(entry_problems_of(EntryIn(entry=entry, facts=x.facts)))
    return out


def required_problems_of(table: list) -> list[str]:
    """必填的文字格不许空(空串 / None / 不是字符串都算缺)。"""
    out: list[str] = []
    seq = SEQ_START
    for entry in table:
        for field in REQUIRED_TEXT:
            value = entry.get(field)
            if not isinstance(value, str) or value == "":
                out.append(MISSING_FIELD_TPL.format(seq=seq, key=entry.get(K_KEY), field=field))
        seq += 1
    return out


def key_problems_of(table: list) -> list[str]:
    """编号唯一且合规则、状态在词表里。"""
    out: list[str] = []
    seen: set = set()
    for entry in table:
        key = entry[K_KEY]
        if key in seen:
            out.append(DUP_KEY_TPL.format(key=key))
        seen.add(key)
        if KEY_RE.match(key) is None:
            out.append(BAD_KEY_TPL.format(key=key))
        if entry[K_STATUS] not in STATUSES:
            out.append(BAD_STATUS_TPL.format(key=key, status=entry[K_STATUS]))
    return out


def board_problems_of(x: CheckIn) -> list[str]:
    """岗位通道名:一名一条、关停的不挂、认领的名字岗位上真会出现、pnp 会挂的名字表里都有。"""
    out: list[str] = []
    claimed: set = set()
    allowed = x.facts.board_labels | set(RULE_BOARD_LABELS)
    for entry in x.table:
        label = entry[K_BOARD_LABEL]
        if label is None:
            continue
        if label in claimed:
            out.append(DUP_BOARD_TPL.format(label=label))
        claimed.add(label)
        if entry[K_STATUS] == STATUS_CLOSED:
            out.append(CLOSED_BOARD_TPL.format(key=entry[K_KEY], label=label))
        if label not in allowed:
            out.append(BOARD_MISSING_TPL.format(key=entry[K_KEY], label=label))
    for label in sorted(x.facts.board_labels - claimed):
        out.append(BOARD_UNMAPPED_TPL.format(label=label))
    return out


def default_problems_of(table: list) -> list[str]:
    """每省至多一条省默认通道。"""
    counts: dict = {}
    for entry in table:
        if entry[K_IS_DEFAULT]:
            prov = entry[K_PROVINCE]
            counts[prov] = counts.get(prov, 0) + 1
    out: list[str] = []
    for prov in sorted(counts):
        if counts[prov] > 1:
            out.append(MULTI_DEFAULT_TPL.format(prov=prov, n=counts[prov]))
    return out


def condition_problems_of(table: list) -> list[str]:
    """2026-09-30 通道补全批一的五个新格:标签在词表里、TEER 只许 0–5、职业码五位、雇主名归一小写;不看工作的通道不挂岗位通道名、
    不当省默认(岗位不会落到它上面)。批二起雇主名必须等于 norm_name 的结果(同 AIP 指定雇主那把尺子;前端拿岗位公司名归一后
    直接比对,名单不再归一)。"""
    out: list[str] = []
    for entry in table:
        key = entry[K_KEY]
        for tag in entry.get(K_TAGS, []):
            if tag not in TAG_KEYS:
                out.append(BAD_TAG_TPL.format(key=key, tag=tag))
        for teer in entry.get(K_TEERS, []):
            if teer not in TEER_VALUES:
                out.append(BAD_TEER_TPL.format(key=key, teer=teer))
        for noc in entry.get(K_NOCS, []):
            if NOC_RE.match(noc) is None:
                out.append(BAD_NOC_TPL.format(key=key, noc=noc))
        for name in entry.get(K_EMPLOYERS, []):
            if len(name) == 0 or name != norm_name(name):
                out.append(BAD_EMPLOYER_TPL.format(key=key, name=name))
        if entry.get(K_JOB_LINKED, JOB_LINKED_DEFAULT) is False and (entry[K_BOARD_LABEL] is not None or entry[K_IS_DEFAULT]):
            out.append(UNLINKED_BOARD_TPL.format(key=key))
    return out


def entry_problems_of(x: EntryIn) -> list[str]:
    """一条通道的官方写法逐格对 pnp 现值:抽选组(等开抽的除外)、门槛流、配额行、清单名。"""
    out: list[str] = []
    key = x.entry[K_KEY]
    if x.entry.get(K_DRAWS_PENDING) is not True:
        for stream in x.entry[K_DRAW_STREAMS]:
            if stream not in x.facts.draw_streams:
                out.append(DRAW_MISSING_TPL.format(key=key, stream=stream))
    for stream in x.entry[K_REQ_STREAMS]:
        if stream not in x.facts.req_streams:
            out.append(REQ_MISSING_TPL.format(key=key, stream=stream))
    scope = x.entry[K_QUOTA_SCOPE]
    if scope is not None and scope not in x.facts.quota_scopes:
        out.append(QUOTA_MISSING_TPL.format(key=key, scope=scope))
    for label in x.entry[K_OCC_LABELS]:
        if label not in x.facts.list_labels:
            out.append(OCC_MISSING_TPL.format(key=key, label=label))
    return out


def pending_notes_of(x: CheckIn) -> list[str]:
    """等开抽的通道,抽选组已出现在抽选表里 → 提示摘掉 drawsPending(不算红:开抽是好事,表慢一步不该拖停本单元)。"""
    out: list[str] = []
    for entry in x.table:
        if entry.get(K_DRAWS_PENDING) is not True:
            continue
        for stream in entry[K_DRAW_STREAMS]:
            if stream in x.facts.draw_streams:
                out.append(PENDING_SEEN_TPL.format(key=entry[K_KEY], stream=stream))
    return out


# =========================================================================
# 5. 产出行(列对齐库表 pathways;drawsPending 只给自校用,不进产物)
# =========================================================================


def to_pathway_row(x: RowIn) -> dict:
    """对照表一段 → 产物一行(camelCase 键 = 库表 snake_case 列;行序 = 列序)。2026-09-30 通道补全批一加五格(旧行没写的按默认:
    看工作、无标签、不筛)。"""
    e = x.entry
    return {
        "key": e["key"], "seq": x.seq, "province": e["province"], "program": e["program"],
        "plainZh": e["plainZh"], "plainEn": e["plainEn"], "plainKo": e["plainKo"], "officialName": e["officialName"],
        "boardLabel": e["boardLabel"], "isDefault": e["isDefault"],
        "drawStreams": e["drawStreams"], "reqStreams": e["reqStreams"], "quotaScope": e["quotaScope"],
        "occLabels": e["occLabels"], "status": e["status"], "url": e["url"], "quote": e["quote"], "checked": e["checked"],
        "jobLinked": e.get(K_JOB_LINKED, JOB_LINKED_DEFAULT), "tags": e.get(K_TAGS, []), "teers": e.get(K_TEERS, []),
        "nocs": e.get(K_NOCS, []), "employers": e.get(K_EMPLOYERS, []),
    }

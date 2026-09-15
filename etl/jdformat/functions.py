"""
jdformat 域函数 —— 全部行为住这(照 company 全溶样张,方言律全集见 docs/design/etl分域-20260829.md §4)。

一步一入口(零参):build_formatted。**零字符串令**(字面量全住 constants)/ **显式循环令**(禁推导 /
genexp / lambda)/ **内嵌禁令** / **一参令**(多入参收 scheme 的 XxxIn dataclass)。
第 3、4 段是 cms lib/jobs/functions.ts 的镜像(draft_of ⇔ jdDraftOf,validate_note_of ⇔ validateJdFormatted,
mark_lines_of ⇔ jdMarkLinesOf):改那边必同改这边。
依赖单边:本文件 → constants/scheme + 基础设施叶(paths / log / fetch)。
"""
import json
import os
from datetime import datetime, timezone
from typing import cast

import paths
from fetch.functions import make_client
from log.functions import say
from jdformat import FORMAT_LIMIT
from jdformat.constants import (
    BODY_MAX_LEN, DIGITS_RE, ENV_LLM_BASE, ENV_LLM_MODEL, FIELD_NONE, FLUSH_N, GEN_TOKENS, GEN_TRIES, HOURS_VALUES,
    HRS_RE, IN_MART_JOBS, JSON_INDENT, K_DATE_POSTED, K_DESCRIPTION, K_EXTERNAL_ID, K_STATUS, LLM_MODEL_DEFAULT,
    LLM_TEMPERATURE, LLM_TIMEOUT_S, MARK_HEAD, MARK_INLINE_RE, MARK_LINE_REPL, MARK_TAIL, NOTE_DIGITS, NOTE_EMPTY,
    NOTE_HTTP_TPL, NOTE_LEN, NOTE_MARKS, NOTE_NO_LLM, NOTE_NO_MART, OPEN_STATUSES, OUT_FORMATTED,
    OUT_MAX_BASE, OUT_MAX_RATIO, OUT_MIN_LEN, P_MODEL, P_NUM_PREDICT, P_OPTIONS, P_PROMPT, P_RESPONSE,
    P_STREAM, P_TEMPERATURE, P_THINK, PATH_OLLAMA_GENERATE, PRINT_DONE_TPL, PRINT_ROW_TPL, PRINT_TARGETS_TPL,
    PROMPT_HEAD, RETRY_FAILED_DAYS, RETRY_TAIL, SECTION_MARKS, ST_OK, STRIP_REPL, TAIL_STRIP_RE, TERM_RE,
    TERM_VALUES, TEXT_ENCODING, THINK_RE, URL_TAIL_SLASH,
)
from jdformat.scheme import (
    Draft, FormatOneIn, FormatRecord, HttpClientLike, LlmCallIn, LlmCfg, PickIn, PruneIn, ValidateIn,
)

# =========================================================================
# 1. 入口:读 mart → 挑队列 → 逐条过盒子 → 落盘
# =========================================================================


def build_formatted() -> None:
    """format 步入口:mart 里在招有正文、还没整理版的岗按发布时间新→旧过局域网 qwen,落 OUT_FORMATTED。

    没盒子地址直接退;mart 还没产出直接退;单条失败只记 status 不炸整轮;每 FLUSH_N 条落一次盘(中途被杀不丢)。
    """
    cfg = llm_config()
    if cfg.base == "":
        say(NOTE_NO_LLM)
        return
    jobs = read_mart_jobs()
    if len(jobs) == 0:
        say(NOTE_NO_MART)
        return
    cache = read_cache()
    pruned = prune_cache(PruneIn(cache=cache, jobs=jobs))
    todo = pick_todo(PickIn(jobs=jobs, cache=cache, limit=int(FORMAT_LIMIT)))
    say(PRINT_TARGETS_TPL.format(jobs=len(jobs), done=count_ok(cache), pruned=pruned, todo=len(todo),
                                 limit=FORMAT_LIMIT, model=cfg.model))
    ok = 0
    fail = 0
    with make_client(timeout=LLM_TIMEOUT_S) as client:
        for ext in todo:
            src = str(jobs[ext].get(K_DESCRIPTION, FIELD_NONE))
            rec = format_one(FormatOneIn(client=cast(HttpClientLike, client), cfg=cfg, src=src))
            cache[ext] = rec
            if rec.status == ST_OK:
                ok += 1
            else:
                fail += 1
            say(PRINT_ROW_TPL.format(status=rec.status, ext=ext, src_len=rec.src_len, out_len=len(rec.formatted),
                                     note=rec.note))
            if (ok + fail) % FLUSH_N == 0:
                write_cache(cache)
    total = write_cache(cache)
    say(PRINT_DONE_TPL.format(ok=ok, fail=fail, total=total, n=len(cache), out=OUT_FORMATTED.name))


def llm_config() -> LlmCfg:
    """读环境定盒子地址与模型名。"""
    return LlmCfg(base=os.environ.get(ENV_LLM_BASE, FIELD_NONE).strip().rstrip(URL_TAIL_SLASH),
                  model=os.environ.get(ENV_LLM_MODEL, LLM_MODEL_DEFAULT))


def read_mart_jobs() -> dict[str, dict]:
    """mart/jobs.json → externalId → 行,只留在招(open / campus)且有正文的;缺文件 = 空表(build 还没跑过)。"""
    out: dict[str, dict] = {}
    if not IN_MART_JOBS.exists():
        return out
    rows = json.loads(IN_MART_JOBS.read_text(encoding=TEXT_ENCODING))
    for r in rows:
        if r.get(K_STATUS) not in OPEN_STATUSES:
            continue
        desc = str(r.get(K_DESCRIPTION) or FIELD_NONE)
        if desc.strip() == FIELD_NONE:
            continue
        out[str(r.get(K_EXTERNAL_ID))] = r
    return out


def read_cache() -> dict[str, FormatRecord]:
    """读上轮产出(缺文件 = 空表)。"""
    cache: dict[str, FormatRecord] = {}
    if OUT_FORMATTED.exists():
        for ext, d in json.loads(OUT_FORMATTED.read_text(encoding=TEXT_ENCODING)).items():
            cache[ext] = FormatRecord.model_validate(d)
    return cache


def write_cache(cache: dict[str, FormatRecord]) -> int:
    """缓存落盘 OUT_FORMATTED(原子写;首轮先建目录),返回累计 ok 条数。"""
    OUT_FORMATTED.parent.mkdir(parents=True, exist_ok=True)
    out: dict[str, dict] = {}
    total = 0
    for ext, rec in cache.items():
        out[ext] = rec.model_dump()
        if rec.status == ST_OK:
            total += 1
    paths.write_json(paths.WriteJsonIn(path=OUT_FORMATTED, payload=out, indent=JSON_INDENT))
    return total


def count_ok(cache: dict[str, FormatRecord]) -> int:
    """已做成的条数(报数用)。"""
    n = 0
    for rec in cache.values():
        if rec.status == ST_OK:
            n += 1
    return n


def prune_cache(x: PruneIn) -> int:
    """剪掉不在当前 mart 在招列里的记录(岗关了 / 正文没了):整理版已随上一轮 seed 进库,库里 COALESCE 保着,
    缓存只为在招岗服务,不让它无限长。返回剪掉的条数。"""
    gone: list[str] = []
    for ext in x.cache:
        if ext not in x.jobs:
            gone.append(ext)
    for ext in gone:
        del x.cache[ext]
    return len(gone)


def pick_todo(x: PickIn) -> list[str]:
    """还没做成 ok 的岗(失败冷却 RETRY_FAILED_DAYS),按发布时间新→旧,凑够 limit 即止。"""
    pairs: list[tuple[str, str]] = []
    for ext, r in x.jobs.items():
        pairs.append((str(r.get(K_DATE_POSTED) or FIELD_NONE), ext))
    pairs.sort(key=date_of_pair, reverse=True)
    todo: list[str] = []
    for pair in pairs:
        if len(todo) >= x.limit:
            break
        ext = pair[1]
        c = x.cache.get(ext)
        if c is not None:
            if c.status == ST_OK:
                continue
            if days_since(c.at) <= RETRY_FAILED_DAYS:
                continue
        todo.append(ext)
    return todo


def date_of_pair(pair: tuple[str, str]) -> str:
    """排序键:(发布日, externalId) 里的发布日。"""
    return pair[0]


# =========================================================================
# 2. 单岗:打模型(最多 GEN_TRIES 次)→ 校验 → 记录
# =========================================================================


def format_one(x: FormatOneIn) -> FormatRecord:
    """一岗:第一次没过(多半是数字被改写)再打一次,第二次提示尾加一句照抄数字;过校验即 ok,
    都没过记最后一次由头;盒子掉线 / 超时转数据记异常类名(留痕在记录里,不炸整轮)。"""
    body = x.src[:BODY_MAX_LEN]
    rec = FormatRecord(model=x.cfg.model, at=now_iso(), src_len=len(body))
    for attempt in range(1, GEN_TRIES + 1):
        prompt = PROMPT_HEAD + body
        if attempt > 1:
            prompt = prompt + RETRY_TAIL
        try:
            answer = call_llm(LlmCallIn(client=x.client, cfg=x.cfg, prompt=prompt))
        except Exception as e:  # noqa: BLE001 — 盒子掉线/超时转数据,由头进记录 note
            rec.note = type(e).__name__
            return rec
        if answer == FIELD_NONE:
            rec.note = NOTE_EMPTY
            continue
        draft = draft_of(answer)
        note = validate_note_of(ValidateIn(out=draft.out, src=x.src))
        if note == FIELD_NONE:
            rec.status = ST_OK
            rec.formatted = mark_lines_of(draft.out)
            rec.term = term_ok_of(draft.term)
            rec.hrs = hrs_ok_of(draft.hrs)
            rec.note = FIELD_NONE
            return rec
        rec.note = note
    return rec


def call_llm(x: LlmCallIn) -> str:
    """单轮生成:Ollama /api/generate,think 关,剥 think 块双保险;非 2xx 抛。"""
    r = x.client.post(x.cfg.base + PATH_OLLAMA_GENERATE,
                      json={P_MODEL: x.cfg.model, P_PROMPT: x.prompt, P_STREAM: False, P_THINK: False,
                            P_OPTIONS: {P_NUM_PREDICT: GEN_TOKENS, P_TEMPERATURE: LLM_TEMPERATURE}})
    if not r.is_success:
        raise RuntimeError(NOTE_HTTP_TPL.format(status=r.status_code))
    body = r.json()
    if not isinstance(body, dict):
        return FIELD_NONE
    return THINK_RE.sub(STRIP_REPL, str(body.get(P_RESPONSE, FIELD_NONE))).strip()


# =========================================================================
# 3. 抽取与校验(镜像 cms jdDraftOf / validateJdFormatted)
# =========================================================================


def draft_of(answer: str) -> Draft:
    """模型回答 → 正文(剥掉尾部 [TERM]= / [HRS]= 行)+ 两个抽出的枚举词(小写;抽不到空串)。"""
    term = FIELD_NONE
    term_m = TERM_RE.search(answer)
    if term_m is not None:
        term = term_m.group(1).lower()
    hrs = FIELD_NONE
    hrs_m = HRS_RE.search(answer)
    if hrs_m is not None:
        hrs = hrs_m.group(1).lower()
    return Draft(out=TAIL_STRIP_RE.sub(STRIP_REPL, answer).strip(), term=term, hrs=hrs)


def validate_note_of(x: ValidateIn) -> str:
    """整理版校验:五节标记齐 + 长度合理 + 输出多位数字必须来自原文(防幻觉)。过了给空串,没过给由头。"""
    for mark in SECTION_MARKS:
        if (MARK_HEAD + mark + MARK_TAIL) not in x.out:
            return NOTE_MARKS
    if len(x.out) < OUT_MIN_LEN or len(x.out) > max(OUT_MAX_BASE, len(x.src) * OUT_MAX_RATIO):
        return NOTE_LEN
    src_digits: set[str] = set()
    for d in DIGITS_RE.findall(x.src):
        src_digits.add(d)
    for d in DIGITS_RE.findall(TAIL_STRIP_RE.sub(STRIP_REPL, x.out)):
        if d not in src_digits:
            return NOTE_DIGITS
    return FIELD_NONE


def term_ok_of(term: str) -> str:
    """抽出的就业性质词落在合法值里才采信,否则空串(unknown / 乱词都不进库)。"""
    if term in TERM_VALUES:
        return term
    return FIELD_NONE


def hrs_ok_of(hrs: str) -> str:
    """抽出的工时词落在合法值里才采信,否则空串。"""
    if hrs in HOURS_VALUES:
        return hrs
    return FIELD_NONE


# =========================================================================
# 4. 小件:节标记顶行首 / 时间
# =========================================================================


def mark_lines_of(text: str) -> str:
    """节标记一律顶到行首(模型偶发把五节挤成一行;镜像 cms jdMarkLinesOf,写库前与读库后都过一遍)。"""
    return MARK_INLINE_RE.sub(MARK_LINE_REPL, text).strip()


def now_iso() -> str:
    """当前 UTC 时刻(ISO)。"""
    return datetime.now(timezone.utc).isoformat()


def days_since(iso: str) -> float:
    """距某 ISO 时刻过了几天(空串或解析失败当很久以前:冷却已过)。"""
    if iso == FIELD_NONE:
        return float(RETRY_FAILED_DAYS + 1)
    try:
        then = datetime.fromisoformat(iso)
    except ValueError:
        return float(RETRY_FAILED_DAYS + 1)
    if then.tzinfo is None:
        then = then.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - then).total_seconds() / 86400

"""
classify 域的活 —— 读 mart 未分类岗 → bge-m3 候选检索 → qwen 只在候选里选码 → 落 processed/classify/。
(段横幅与 constants.py / scheme.py 同名同序镜像;顶层只有 function,常量归 constants,形状归 scheme。)

两相分开跑是有意的:先把语料与岗位**全部**嵌完,再换判定模型逐条选码。盒子显存只常驻一个模型,
嵌入与判定交替会每条都重载(2026-09-15 jdformat 实撞 num_ctx 版同款病:一条 50~85 秒)。
"""
import json
import math
import os
import random
import time
from datetime import datetime, timezone
from typing import cast

import httpx
from classify.constants import (
    ANSWER_NONE, BODY_MAX_LEN, CAND_DUTIES_MAX, CAND_JOIN, CAND_K, CAND_LINE_TPL, CAND_SCORE_SEP,
    CLASSIFY_LIMIT, CLASSIFY_V, CLIENT_TIMEOUT_S, CODE_RE, CORPUS_TPL, DEFAULT_LIMIT, DUTIES_MAX,
    DUTY_SEP, EMBED_BATCH, EMBED_MODEL_DEFAULT, ENV_EMBED_MODEL, ENV_LLM_BASE, ENV_LLM_MODEL,
    EXAMPLE_SEP, EXAMPLES_MAX, FIELD_NONE, FLUSH_N, GEN_TOKENS, IN_MART_JOBS, IN_NOC_DESC,
    JOB_TEXT_TPL, JSON_INDENT, K_BY_NOC, K_CITY, K_DATE_POSTED, K_DESCRIPTION, K_DUTIES,
    K_EXTERNAL_ID, K_NOC, K_NOC_TITLE, K_ORIGIN, K_STATUS, K_TITLE, LINE_SEP, LLM_MODEL_DEFAULT,
    LOW_SCORE, PRINT_WEAK_TPL, TITLE_EN_MAX, TRANSLATE_PROMPT_TPL, TRANSLATE_TOKENS,
    LLM_TEMPERATURE, METHOD_MODEL, NET_ERRORS, NOTE_ABSTAIN, NOTE_EMPTY, NOTE_HTTP_TPL,
    NOTE_NO_LLM, NOTE_OFF_LIST, OPEN_STATUSES, OUT_JOBS, OUT_PILOT, P_EMBEDDINGS, P_INPUT, P_MODEL,
    P_NUM_PREDICT, P_OPTIONS, P_PROMPT, P_RESPONSE, P_STREAM, P_TEMPERATURE, P_THINK,
    PATH_OLLAMA_EMBED, PATH_OLLAMA_GENERATE, PILOT_HEADERS, PILOT_MIN_PER_ORIGIN, PILOT_N,
    PILOT_SEED, PRINT_ABORT_TPL, PRINT_CORPUS_TPL, PRINT_DONE_TPL, PRINT_IN_TPL,
    PRINT_JOBS_EMBED_TPL, PRINT_PILOT_ORIGIN_TPL, PRINT_PILOT_TPL, PRINT_TARGETS_TPL,
    PROMPT_BODY_MAX, PROMPT_TPL, QUERIES_PER_JOB, RETRY_FAILED_DAYS, ST_FAIL, ST_OK, STRIP_REPL,
    TAB_REPL, TEXT_ENCODING, THINK_RE, TITLE_QUERY_TPL, TSV_SEP, URL_TAIL_SLASH,
)
from classify.scheme import (
    CandScore, CandsAllIn, CandsAllOut, CandsIn, CandsOut, ClassifyOneIn, DotIn, EmbedIn, FixWeakIn,
    HttpClientLike, JobDoc, LabelRecord, LlmCallIn, LlmCfg, NocDoc, PickTodoIn, PilotRowIn, RoundIn,
    RoundOut, SampleIn, SaveIn, TallyIn, TitleEnIn, WritePilotIn,
)
from log.functions import say
from noc.functions import get_title_index

# =========================================================================
# 1. 入口(一轮 / 试点)
# =========================================================================


def classify_jobs() -> None:
    """定时步入口:未分类的在招岗按发布日新→旧,每轮 ≤ CLASSIFY_LIMIT 条过候选检索 + 模型选码。

    没盒子地址直接退(手动件缺配置不是代码病);盒子掉线整轮中止,已判的照常落盘。
    """
    cfg = llm_config()
    if cfg.base == FIELD_NONE:
        say(NOTE_NO_LLM)
        return
    say(PRINT_IN_TPL.format(jobs=IN_MART_JOBS, noc=IN_NOC_DESC))
    jobs = read_mart_jobs()
    pool = open_unclassified(jobs)
    cache = pruned_labels(jobs)
    todo = pick_todo(PickTodoIn(jobs=pool, cache=cache, limit=limit_of()))
    say(PRINT_TARGETS_TPL.format(todo=len(pool), cache=len(cache), n=len(todo), limit=limit_of(),
                                 model=cfg.model))
    run_and_save(SaveIn(cfg=cfg, todo=todo, cache=cache))


def pilot_jobs() -> None:
    """试点件(手动):按渠道分层抽 PILOT_N 条未分类岗判一遍,产核对表给人工复核。

    与定时步共用同一条判定链(同候选、同提示词、同校验),只多了抽样与写表两步 ——
    试点验的就是上线要跑的那套,不另起一套。
    """
    cfg = llm_config()
    if cfg.base == FIELD_NONE:
        say(NOTE_NO_LLM)
        return
    say(PRINT_IN_TPL.format(jobs=IN_MART_JOBS, noc=IN_NOC_DESC))
    jobs = read_mart_jobs()
    pool = open_unclassified(jobs)
    cache = pruned_labels(jobs)
    picked = sample_jobs(SampleIn(jobs=pool, n=PILOT_N, seed=PILOT_SEED))
    say(PRINT_TARGETS_TPL.format(todo=len(pool), cache=len(cache), n=len(picked), limit=PILOT_N,
                                 model=cfg.model))
    run_and_save(SaveIn(cfg=cfg, todo=picked, cache=cache))
    doc_of = doc_index_of(noc_docs())
    write_pilot(WritePilotIn(jobs=picked, cache=cache, doc_of=doc_of))
    say_pilot(WritePilotIn(jobs=picked, cache=cache, doc_of=doc_of))


def run_and_save(x: SaveIn) -> None:
    """开客户端跑一轮 → 落盘 → 报数(两个入口共用的收尾;客户端在这里才真造,cast 只住这个装配点)。"""
    with httpx.Client(timeout=CLIENT_TIMEOUT_S) as client:
        got = run_round(RoundIn(client=cast(HttpClientLike, client), cfg=x.cfg, todo=x.todo, cache=x.cache))
    write_labels(x.cache)
    if got.abort != FIELD_NONE:
        say(PRINT_ABORT_TPL.format(note=got.abort))
    say(PRINT_DONE_TPL.format(ok=got.ok, abstain=got.abstain, fail=got.fail,
                              total=ok_count_of(x.cache), out=OUT_JOBS.name))


# =========================================================================
# 2. 产物记录(读 / 剪 / 挑 / 写)
# =========================================================================


def read_labels() -> dict[str, LabelRecord]:
    """读上轮产出(缺文件 = 空表)。"""
    cache: dict[str, LabelRecord] = {}
    if not OUT_JOBS.exists():
        return cache
    for ext, d in json.loads(OUT_JOBS.read_text(encoding=TEXT_ENCODING)).items():
        cache[ext] = LabelRecord.model_validate(d)
    return cache


def pruned_labels(jobs: list[JobDoc]) -> dict[str, LabelRecord]:
    """剪掉不在当前在招列里的记录。

    🔴 按**全部在招岗**剪,不是按「未分类岗」剪:判出的码经下一轮汇装进 mart 后,那条岗就不再是
    未分类的了 —— 按未分类列剪会把刚判出的记录当场删掉,岗位回到未分类,下轮重判,永远打转。
    """
    live = ext_set_of(jobs)
    out: dict[str, LabelRecord] = {}
    for ext, rec in read_labels().items():
        if ext in live:
            out[ext] = rec
    return out


def pick_todo(x: PickTodoIn) -> list[JobDoc]:
    """按序挑本轮要判的:判过且版本一致的跳过,失败冷却中的跳过,凑够 limit 即止。"""
    todo: list[JobDoc] = []
    for job in x.jobs:
        if len(todo) >= x.limit:
            break
        rec = x.cache.get(job.ext)
        if rec is not None and rec.v == CLASSIFY_V:
            if rec.status == ST_OK:
                continue
            if days_since(rec.at) <= RETRY_FAILED_DAYS:
                continue
        todo.append(job)
    return todo


def write_labels(cache: dict[str, LabelRecord]) -> None:
    """记录表落盘(externalId → 记录;每 FLUSH_N 条与收尾各一次)。"""
    OUT_JOBS.parent.mkdir(parents=True, exist_ok=True)
    body: dict[str, object] = {}
    for ext, rec in cache.items():
        body[ext] = rec.model_dump()
    OUT_JOBS.write_text(json.dumps(body, ensure_ascii=False, indent=JSON_INDENT), encoding=TEXT_ENCODING)


def ok_count_of(cache: dict[str, LabelRecord]) -> int:
    """记录表里判出码的条数(报数用)。"""
    n = 0
    for rec in cache.values():
        if rec.status == ST_OK:
            n += 1
    return n


# =========================================================================
# 3. 岗位与语料读取
# =========================================================================


def read_mart_jobs() -> list[JobDoc]:
    """mart/jobs.json → 在招且有标题的岗(含已分类的 —— 剪记录要按全部在招列);按发布日新→旧。

    值级清洗全在这里做完:缺键补空串、正文截断、类型归一;后面的函数入参一律已有效。
    """
    out: list[JobDoc] = []
    if not IN_MART_JOBS.exists():
        return out
    for r in json.loads(IN_MART_JOBS.read_text(encoding=TEXT_ENCODING)):
        if r.get(K_STATUS) not in OPEN_STATUSES:
            continue
        title = str(r.get(K_TITLE) or FIELD_NONE).strip()
        if title == FIELD_NONE:
            continue
        body = str(r.get(K_DESCRIPTION) or FIELD_NONE).strip()
        out.append(JobDoc(ext=str(r.get(K_EXTERNAL_ID) or FIELD_NONE), title=title,
                          body=body[:PROMPT_BODY_MAX], noc=str(r.get(K_NOC) or FIELD_NONE).strip(),
                          origin=str(r.get(K_ORIGIN) or FIELD_NONE), city=str(r.get(K_CITY) or FIELD_NONE),
                          date_posted=str(r.get(K_DATE_POSTED) or FIELD_NONE)))
    out.sort(key=job_order_of, reverse=True)
    return out


def job_order_of(job: JobDoc) -> tuple:
    """排队键:发布日新的先,同日按 externalId 稳序。"""
    return (job.date_posted, job.ext)


def open_unclassified(jobs: list[JobDoc]) -> list[JobDoc]:
    """在招岗里还没有职业码的那批(本域只判它们 —— 源带码与规则判出的一律不碰)。"""
    out: list[JobDoc] = []
    for job in jobs:
        if job.noc == FIELD_NONE:
            out.append(job)
    return out


def ext_set_of(jobs: list[JobDoc]) -> set:
    """在招岗的 externalId 集合(剪记录用)。"""
    live: set = set()
    for job in jobs:
        live.add(job.ext)
    return live


def noc_docs() -> list[NocDoc]:
    """官方 516 条职业 → 语料行(官方类名 + 示例职称 + 职责);示例职称取自 noc 域的官方示例职称表。"""
    data = json.loads(IN_NOC_DESC.read_text(encoding=TEXT_ENCODING))
    by_noc = data.get(K_BY_NOC)
    if not isinstance(by_noc, dict):
        return []
    examples = examples_by_noc()
    docs: list[NocDoc] = []
    for code, row in by_noc.items():
        title = str(row.get(K_NOC_TITLE) or FIELD_NONE)
        duties = duty_list_of(row)
        docs.append(NocDoc(noc=str(code), title=title, duties=DUTY_SEP.join(duties[:CAND_DUTIES_MAX]),
                           text=CORPUS_TPL.format(title=title, duties=DUTY_SEP.join(duties[:DUTIES_MAX]),
                                                  examples=EXAMPLE_SEP.join(examples.get(str(code), [])))))
    return docs


def duty_list_of(row: dict) -> list[str]:
    """一条官方职业的职责清单(非列表或缺键 = 空表)。"""
    duties = row.get(K_DUTIES)
    if not isinstance(duties, list):
        return []
    out: list[str] = []
    for d in duties:
        out.append(str(d))
    return out


def examples_by_noc() -> dict[str, list]:
    """官方示例职称按码归组(noc 域的全名表反过来建;每码最多 EXAMPLES_MAX 条)。"""
    out: dict[str, list] = {}
    for name, code in get_title_index().items():
        arr = out.get(str(code))
        if arr is None:
            out[str(code)] = [str(name)]
            continue
        if len(arr) < EXAMPLES_MAX:
            arr.append(str(name))
    return out


def doc_index_of(docs: list[NocDoc]) -> dict[str, NocDoc]:
    """码 → 语料行(拼候选表与核对表要官方类名)。"""
    out: dict[str, NocDoc] = {}
    for doc in docs:
        out[doc.noc] = doc
    return out


# =========================================================================
# 4. 嵌入与候选检索
# =========================================================================


def embed_texts(x: EmbedIn) -> list[list[float]]:
    """一批文本 → 归一后的向量(Ollama /api/embed;非 2xx 抛)。"""
    r = x.client.post(x.cfg.base + PATH_OLLAMA_EMBED, json={P_MODEL: x.cfg.embed_model, P_INPUT: x.texts})
    if not r.is_success:
        raise RuntimeError(NOTE_HTTP_TPL.format(status=r.status_code))
    body = r.json()
    if not isinstance(body, dict):
        return []
    vecs = body.get(P_EMBEDDINGS)
    if not isinstance(vecs, list):
        return []
    out: list[list[float]] = []
    for vec in vecs:
        out.append(unit_of(vec))
    return out


def embed_all(x: EmbedIn) -> list[list[float]]:
    """分批嵌完一整串文本(每批 EMBED_BATCH 条),出参与入参同序。"""
    out: list[list[float]] = []
    for i in range(0, len(x.texts), EMBED_BATCH):
        out.extend(embed_texts(EmbedIn(client=x.client, cfg=x.cfg, texts=x.texts[i:i + EMBED_BATCH])))
    return out


def unit_of(vec: object) -> list[float]:
    """向量归一(归一后点积即余弦;零向量原样返回零)。"""
    if not isinstance(vec, list):
        return []
    vals: list[float] = []
    total = 0.0
    for v in vec:
        f = float(v)
        vals.append(f)
        total += f * f
    norm = math.sqrt(total)
    if norm <= 0.0:
        return vals
    out: list[float] = []
    for f in vals:
        out.append(f / norm)
    return out


def job_text_of(job: JobDoc) -> str:
    """岗位进嵌入的文本:标题在前,正文截到 BODY_MAX_LEN 接在后。"""
    return JOB_TEXT_TPL.format(title=job.title, body=job.body[:BODY_MAX_LEN])


def cands_of(x: CandsIn) -> CandsOut:
    """岗位 → 相似度最高的 CAND_K 个候选码(降序)+ 纯标题那一路的最高分。

    每个码取「标题+正文」与「标题单独」两次查询里的**较高**分:正文长的帖子里福利与公司介绍会把
    标题信号稀释掉,标题单独那次把它捞回来。纯标题最高分单独带出去,给补救路当闸。
    """
    scored: list[CandScore] = []
    title_top = 0.0
    for i, doc in enumerate(x.docs):
        row = x.mat[i]
        with_body = dot_of(DotIn(vec=x.vec, row=row))
        title_only = dot_of(DotIn(vec=x.vec_title, row=row))
        title_top = max(title_top, title_only)
        scored.append(CandScore(noc=doc.noc, score=max(with_body, title_only)))
    scored.sort(key=cand_order_of, reverse=True)
    return CandsOut(cands=scored[:CAND_K], title_top=title_top)


def dot_of(x: DotIn) -> float:
    """两个归一向量的点积 = 余弦相似度(维度对不上按短的算,不炸)。"""
    total = 0.0
    for i in range(min(len(x.vec), len(x.row))):
        total += x.vec[i] * x.row[i]
    return total


def cand_order_of(c: CandScore) -> float:
    """候选排序键:相似度。"""
    return c.score


# =========================================================================
# 5. 判定(模型只在候选里选,拿不准弃权)
# =========================================================================


def classify_one(x: ClassifyOneIn) -> LabelRecord:
    """一岗:拼候选表 → 模型选码 → 校验。

    四种不 ok:盒子出错(记异常类名,上层据此中止整轮)、空答复、模型答 NONE(弃权,允许)、
    给的码不在候选里(防它自己编码)。四种都留空,由头进 note。
    """
    rec = LabelRecord(model=x.cfg.model, v=CLASSIFY_V, at=now_iso(), cands=cand_codes_of(x.cands))
    try:
        answer = call_llm(LlmCallIn(client=x.client, cfg=x.cfg, prompt=prompt_of(x), tokens=GEN_TOKENS))
    except Exception as e:  # noqa: BLE001 — 盒子掉线/超时转数据,由头进记录 note
        rec.note = type(e).__name__
        return rec
    if answer == FIELD_NONE:
        rec.note = NOTE_EMPTY
        return rec
    if ANSWER_NONE in answer.upper():
        rec.note = NOTE_ABSTAIN
        return rec
    code = code_of(answer)
    if code == FIELD_NONE or code not in rec.cands:
        rec.note = NOTE_OFF_LIST
        return rec
    rec.status = ST_OK
    rec.noc = code
    rec.method = METHOD_MODEL
    return rec


def prompt_of(x: ClassifyOneIn) -> str:
    """判定提示词:候选表(码 + 官方类名 + 职责)+ 岗位标题与正文。"""
    lines: list[str] = []
    for c in x.cands:
        doc = x.doc_of.get(c.noc)
        if doc is None:
            continue
        lines.append(CAND_LINE_TPL.format(code=doc.noc, title=doc.title, duties=doc.duties))
    return PROMPT_TPL.format(cands=CAND_JOIN.join(lines), title=x.job.title, body=x.job.body[:PROMPT_BODY_MAX])


def call_llm(x: LlmCallIn) -> str:
    """单轮生成:Ollama /api/generate,think 关,剥 think 块双保险;非 2xx 抛。"""
    r = x.client.post(x.cfg.base + PATH_OLLAMA_GENERATE,
                      json={P_MODEL: x.cfg.model, P_PROMPT: x.prompt, P_STREAM: False, P_THINK: False,
                            P_OPTIONS: {P_NUM_PREDICT: x.tokens, P_TEMPERATURE: LLM_TEMPERATURE}})
    if not r.is_success:
        raise RuntimeError(NOTE_HTTP_TPL.format(status=r.status_code))
    body = r.json()
    if not isinstance(body, dict):
        return FIELD_NONE
    return THINK_RE.sub(STRIP_REPL, str(body.get(P_RESPONSE, FIELD_NONE))).strip()


def code_of(answer: str) -> str:
    """从答复里抠五位码(抠不到空串)。"""
    m = CODE_RE.search(answer)
    if m is None:
        return FIELD_NONE
    return m.group(1)


def cand_codes_of(cands: list[CandScore]) -> list[str]:
    """候选码清单(进记录留痕:复核时看真码在不在候选里 —— 不在是检索层的锅,在是判定层的锅)。"""
    out: list[str] = []
    for c in cands:
        out.append(c.noc)
    return out


# =========================================================================
# 6. 一轮(先嵌完再判,不交替换模型)
# =========================================================================


def run_round(x: RoundIn) -> RoundOut:
    """一轮:语料嵌入 → 岗位嵌入 → 逐条选码。盒子掉线当场中止(abort 记由头),已判的留在 cache 里。"""
    got = RoundOut(ok=0, abstain=0, fail=0, abort=FIELD_NONE)
    if len(x.todo) == 0:
        return got
    docs = noc_docs()
    started = time.time()
    try:
        mat = embed_all(EmbedIn(client=x.client, cfg=x.cfg, texts=corpus_texts_of(docs)))
        say(PRINT_CORPUS_TPL.format(docs=len(docs), embed=x.cfg.embed_model,
                                    secs=round(time.time() - started, 1)))
        started = time.time()
        vecs = embed_all(EmbedIn(client=x.client, cfg=x.cfg, texts=job_texts_of(x.todo)))
        say(PRINT_JOBS_EMBED_TPL.format(n=len(x.todo), secs=round(time.time() - started, 1)))
    except Exception as e:  # noqa: BLE001 — 嵌入阶段掉线:整轮中止,一条记录都不写
        got.abort = type(e).__name__
        return got
    doc_of = doc_index_of(docs)
    scan = cands_all_of(CandsAllIn(todo=x.todo, vecs=vecs, docs=docs, mat=mat))
    try:
        cands_all = fixed_weak_cands(FixWeakIn(client=x.client, cfg=x.cfg, todo=x.todo,
                                               cands_all=scan.cands_all, title_tops=scan.title_tops,
                                               docs=docs, mat=mat))
    except Exception as e:  # noqa: BLE001 — 补救路掉线:整轮中止,不把弱候选当结果记下来
        got.abort = type(e).__name__
        return got
    for i, job in enumerate(x.todo):
        rec = classify_one(ClassifyOneIn(client=x.client, cfg=x.cfg, job=job, cands=cands_all[i], doc_of=doc_of))
        if rec.note in NET_ERRORS:
            got.abort = rec.note
            return got
        x.cache[job.ext] = rec
        add_tally(TallyIn(got=got, bucket=bucket_of(rec)))
        if (i + 1) % FLUSH_N == 0:
            write_labels(x.cache)
    return got


def cands_all_of(x: CandsAllIn) -> CandsAllOut:
    """一轮里每条岗的候选与纯标题最高分(与 todo 同序;向量成对排列,取标题那条与标题+正文那条)。"""
    cands_all: list[list[CandScore]] = []
    title_tops: list[float] = []
    for i in range(len(x.todo)):
        base = i * QUERIES_PER_JOB
        got = cands_of(CandsIn(vec=x.vecs[base + 1], vec_title=x.vecs[base], docs=x.docs, mat=x.mat))
        cands_all.append(got.cands)
        title_tops.append(got.title_top)
    return CandsAllOut(cands_all=cands_all, title_tops=title_tops)


def fixed_weak_cands(x: FixWeakIn) -> list[list[CandScore]]:
    """检索太弱的那批(最高分 < LOW_SCORE):标题翻成英文再查一次,换掉候选。

    法语帖的病根:单个法语职位名对英文语料的相似度又低又平(实测 Soudeur 最高 0.337、焊工排第 121),
    模型再老实也只能在错的候选里挑。翻完标题重查,焊工回到前列。英文帖分数普遍高于门槛,不会走这条路。
    """
    weak = weak_indexes_of(x.title_tops)
    if len(weak) == 0:
        return x.cands_all
    say(PRINT_WEAK_TPL.format(n=len(weak), floor=LOW_SCORE))
    titles: list[str] = []
    for i in weak:
        job = x.todo[i]
        job.title_en = title_en_of(TitleEnIn(client=x.client, cfg=x.cfg, title=job.title))
        titles.append(job.title_en)
    vecs = embed_all(EmbedIn(client=x.client, cfg=x.cfg, texts=titles))
    out = list(x.cands_all)
    for k, i in enumerate(weak):
        out[i] = cands_of(CandsIn(vec=vecs[k], vec_title=vecs[k], docs=x.docs, mat=x.mat)).cands
    return out


def weak_indexes_of(title_tops: list[float]) -> list[int]:
    """哪些岗的检索太弱:**纯标题**最高分低于 LOW_SCORE(法语帖的典型形)。"""
    out: list[int] = []
    for i, top in enumerate(title_tops):
        if top < LOW_SCORE:
            out.append(i)
    return out


def title_en_of(x: TitleEnIn) -> str:
    """标题 → 英文(已经是英文的原样返回;答复太长当模型跑题,退回原标题)。"""
    answer = call_llm(LlmCallIn(client=x.client, cfg=x.cfg, tokens=TRANSLATE_TOKENS,
                                prompt=TRANSLATE_PROMPT_TPL.format(title=x.title)))
    if answer == FIELD_NONE or len(answer) > TITLE_EN_MAX:
        return x.title
    return answer


def bucket_of(rec: LabelRecord) -> str:
    """一条记录归哪一档:判出 / 弃权 / 失败(弃权单独一档 —— 它不是故障,是该有的结果)。"""
    if rec.status == ST_OK:
        return ST_OK
    if rec.note == NOTE_ABSTAIN:
        return NOTE_ABSTAIN
    return ST_FAIL


def add_tally(x: TallyIn) -> None:
    """把一档计到本轮计数上(判出 / 弃权 / 失败三选一)。"""
    if x.bucket == ST_OK:
        x.got.ok += 1
        return
    if x.bucket == NOTE_ABSTAIN:
        x.got.abstain += 1
        return
    x.got.fail += 1


def corpus_texts_of(docs: list[NocDoc]) -> list[str]:
    """语料行 → 待嵌入文本(与 docs 同序)。"""
    out: list[str] = []
    for doc in docs:
        out.append(doc.text)
    return out


def job_texts_of(jobs: list[JobDoc]) -> list[str]:
    """岗位 → 待嵌入文本,一岗 QUERIES_PER_JOB 条:先标题单独,再标题+正文(与 jobs 同序,成对排列)。"""
    out: list[str] = []
    for job in jobs:
        out.append(TITLE_QUERY_TPL.format(title=job.title))
        out.append(job_text_of(job))
    return out


# =========================================================================
# 7. 试点抽样与核对表
# =========================================================================


def sample_jobs(x: SampleIn) -> list[JobDoc]:
    """按渠道分层抽样:各渠道按未分类量按比例分配,每个渠道至少 PILOT_MIN_PER_ORIGIN 条。

    小渠道(HireAC / CareerBeacon)按纯比例会被抽空,而它们恰恰是分类最差的那几个,必须有样本;
    保底会让总数略超 n,不截断 —— 截断等于按渠道名排序偏心,报数按实际条数报。
    """
    rnd = random.Random(x.seed)
    groups: dict[str, list] = {}
    for job in x.jobs:
        groups.setdefault(job.origin, []).append(job)
    picked: list[JobDoc] = []
    for origin in sorted(groups):
        arr = groups[origin]
        rnd.shuffle(arr)
        share = int(x.n * len(arr) / max(len(x.jobs), 1))
        picked.extend(arr[:max(share, PILOT_MIN_PER_ORIGIN)])
    return picked


def write_pilot(x: WritePilotIn) -> None:
    """核对表落盘(TSV:Excel 直开;标题里的制表符换空格,否则串列)。"""
    OUT_PILOT.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = [TSV_SEP.join(PILOT_HEADERS)]
    for job in x.jobs:
        lines.append(TSV_SEP.join(pilot_row_of(PilotRowIn(job=job, cache=x.cache, doc_of=x.doc_of))))
    OUT_PILOT.write_text(LINE_SEP.join(lines), encoding=TEXT_ENCODING)


def pilot_row_of(x: PilotRowIn) -> list[str]:
    """核对表一行:岗位上下文 + 判出的码 + 官方类名 + 状态 + 由头 + 候选码。"""
    rec = x.cache.get(x.job.ext)
    if rec is None:
        rec = LabelRecord()
    doc = x.doc_of.get(rec.noc)
    title = FIELD_NONE
    if doc is not None:
        title = doc.title
    return [x.job.ext, x.job.origin, x.job.city, x.job.title.replace(TSV_SEP, TAB_REPL), rec.noc, title,
            rec.status, rec.note, CAND_SCORE_SEP.join(rec.cands)]


def say_pilot(x: WritePilotIn) -> None:
    """试点收尾报数:总数三档 + 按渠道分行(准确率要人工核对表回填,机器不自评)。"""
    got = RoundOut(ok=0, abstain=0, fail=0, abort=FIELD_NONE)
    per: dict[str, list] = {}
    for job in x.jobs:
        rec = x.cache.get(job.ext)
        if rec is None:
            continue
        bucket = bucket_of(rec)
        add_tally(TallyIn(got=got, bucket=bucket))
        arr = per.setdefault(job.origin, [0, 0])
        arr[0] += 1
        if bucket == ST_OK:
            arr[1] += 1
    say(PRINT_PILOT_TPL.format(n=len(x.jobs), ok=got.ok, abstain=got.abstain, fail=got.fail, out=OUT_PILOT))
    for origin in sorted(per):
        say(PRINT_PILOT_ORIGIN_TPL.format(origin=origin, n=per[origin][0], ok=per[origin][1]))


# =========================================================================
# 8. 小工具(接线 / 时刻)
# =========================================================================


def llm_config() -> LlmCfg:
    """读环境定盒子地址与两个模型名。"""
    return LlmCfg(base=os.environ.get(ENV_LLM_BASE, FIELD_NONE).strip().rstrip(URL_TAIL_SLASH),
                  model=os.environ.get(ENV_LLM_MODEL, LLM_MODEL_DEFAULT),
                  embed_model=os.environ.get(ENV_EMBED_MODEL, EMBED_MODEL_DEFAULT))


def limit_of() -> int:
    """本轮上限(环境变量 CLASSIFY_LIMIT;写坏了退回 DEFAULT_LIMIT)。"""
    try:
        return int(CLASSIFY_LIMIT)
    except ValueError:
        return DEFAULT_LIMIT


def now_iso() -> str:
    """当前时刻(UTC ISO)。"""
    return datetime.now(timezone.utc).isoformat()


def days_since(stamp: str) -> float:
    """距某个 ISO 时刻过了几天(解析不了当很久以前 —— 让它重试,不是跳过)。"""
    try:
        then = datetime.fromisoformat(stamp)
    except ValueError:
        return float(RETRY_FAILED_DAYS + 1)
    if then.tzinfo is None:
        then = then.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - then).total_seconds() / 86400.0

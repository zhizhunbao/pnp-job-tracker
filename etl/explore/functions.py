"""
explore 域函数 —— 全部行为住这(照 jdformat 样张,方言律全集见 docs/design/etl分域-20260829.md §4)。

一步一入口(零参):consume_queue。**零字符串令**(字面量全住 constants)/ **显式循环令**(禁推导 /
genexp / lambda)/ **内嵌禁令** / **一参令**(多入参收 scheme 的 XxxIn dataclass)。
依赖单边:本文件 → constants/scheme + 基础设施叶(log / fetch)。
"""
import os
from typing import cast

import httpx

from fetch.functions import make_client
from log.functions import say
from explore import TAKE_LIMIT
from explore.constants import (
    ALIAS_MAX_LEN, BROADS_HINT_MAX, BROADS_SEP, CJK_RE, ENV_LLM_BASE, ENV_LLM_MODEL, ENV_SEED_TOKEN, ENV_SEED_URL, FIELD_NONE, FLUSH_N, GEN_TOKENS,
    HANGUL_RE, HDR_SEED_TOKEN, HTTP_TIMEOUT_S, INDUSTRIES, INDUSTRY_RE, K_ALIAS_KO, K_ALIAS_ZH, K_BROADS, K_INDUSTRY, K_KEY, K_NAME, K_NOTE, K_RESULTS, K_STATUS,
    K_TODOS, KO_RE, LLM_MODEL_DEFAULT, LLM_TEMPERATURE, NAME_MAX_LEN, NET_ERRORS, NOTE_EMPTY, NOTE_HTTP_TPL,
    NOTE_NO_LLM, NOTE_NO_SITE, NOTE_PERSON, NOTE_SHAPE, P_LIMIT, P_MODEL, P_NUM_PREDICT, P_OPTIONS, P_PROMPT,
    P_RESPONSE, P_STREAM, P_TEMPERATURE, P_THINK, PATH_DONE, PATH_OLLAMA_GENERATE, PATH_TODO, PERSON_RE, PERSON_YES,
    PRINT_ABORT_TPL, PRINT_DONE_TPL, PRINT_ROW_TPL, PRINT_TAKE_TPL, PROMPT_HEAD, PROMPT_TAIL_TPL, SCHEME_SEP, ST_DONE, ST_SKIP,
    STRIP_REPL, THINK_RE, URL_TAIL_SLASH, ZH_RE, ZH_TRIES,
)
from explore.scheme import AliasIn, HandIn, HttpClientLike, LlmCallIn, LlmCfg, Result, SiteCfg, TakeIn, Todo, TranslateIn

# =========================================================================
# 1. 入口:取活 → 逐条过盒子 → 分批交活
# =========================================================================


def consume_queue() -> None:
    """explore 步入口:从 cms 取一批待办,逐条过局域网 qwen,每 FLUSH_N 条交一次活(中途被杀不丢已翻的)。

    没盒子地址 / 没站点根或钥匙直接退;单条回答不成形记 fail 不炸整轮;
    盒子连不上 / 超时(NET_ERRORS)不是这条名字的错:不记失败、整轮中止,没交的下轮再取。
    """
    cfg = llm_config()
    if cfg.base == FIELD_NONE:
        say(NOTE_NO_LLM)
        return
    site = site_config()
    if site.base == FIELD_NONE or len(site.headers) == 0:
        say(NOTE_NO_SITE)
        return
    done = 0
    skip = 0
    fail = 0
    saved = 0
    batch: list = []
    with make_client(timeout=HTTP_TIMEOUT_S) as raw:
        client = cast(HttpClientLike, raw)
        todos = take_todos(TakeIn(client=client, site=site, limit=int(TAKE_LIMIT)))
        say(PRINT_TAKE_TPL.format(n=len(todos), limit=TAKE_LIMIT, model=cfg.model, base=site.base))
        for todo in todos:
            res = translate_filled(TranslateIn(client=client, cfg=cfg, todo=todo))
            if res.note in NET_ERRORS:
                say(PRINT_ABORT_TPL.format(note=res.note))
                break
            if res.status == ST_DONE:
                done += 1
            elif res.status == ST_SKIP:
                skip += 1
            else:
                fail += 1
            say(PRINT_ROW_TPL.format(status=res.status, name=todo.name, zh=res.alias_zh, ko=res.alias_ko,
                                     industry=res.industry, note=res.note))
            batch.append(res)
            if len(batch) >= FLUSH_N:
                saved += hand_in(HandIn(client=client, site=site, results=batch))
                batch = []
        if len(batch) > 0:
            saved += hand_in(HandIn(client=client, site=site, results=batch))
    say(PRINT_DONE_TPL.format(done=done, skip=skip, fail=fail, saved=saved))


def llm_config() -> LlmCfg:
    """读环境定盒子地址与模型名。"""
    return LlmCfg(base=os.environ.get(ENV_LLM_BASE, FIELD_NONE).strip().rstrip(URL_TAIL_SLASH),
                  model=os.environ.get(ENV_LLM_MODEL, LLM_MODEL_DEFAULT))


def site_config() -> SiteCfg:
    """读环境定站点根(从 SEED_URL 反推 scheme://host)与带钥匙的请求头;缺一个就是没配。"""
    seed_url = os.environ.get(ENV_SEED_URL, FIELD_NONE)
    token = os.environ.get(ENV_SEED_TOKEN, FIELD_NONE)
    if seed_url == FIELD_NONE or token == FIELD_NONE:
        return SiteCfg(base=FIELD_NONE, headers={})
    parts = httpx.URL(seed_url)
    return SiteCfg(base=parts.scheme + SCHEME_SEP + parts.netloc.decode(), headers={HDR_SEED_TOKEN: token})


# =========================================================================
# 2. 取活 / 交活(cms 接口,带钥匙)
# =========================================================================


def take_todos(x: TakeIn) -> list:
    """取活:GET 待办清单;非 2xx 抛(整轮中止并留痕,由门的 err 接)。键或名字缺的行丢掉。"""
    r = x.client.get(x.site.base + PATH_TODO, params={P_LIMIT: x.limit}, headers=x.site.headers)
    if not r.is_success:
        raise RuntimeError(NOTE_HTTP_TPL.format(status=r.status_code))
    body = r.json()
    out: list = []
    if not isinstance(body, dict):
        return out
    rows = body.get(K_TODOS)
    if not isinstance(rows, list):
        return out
    for row in rows:
        if not isinstance(row, dict):
            continue
        key = str(row.get(K_KEY) or FIELD_NONE)
        name = str(row.get(K_NAME) or FIELD_NONE).strip()
        if key == FIELD_NONE or name == FIELD_NONE:
            continue
        broads: list = []
        raw = row.get(K_BROADS)
        if isinstance(raw, list):
            for b in raw[:BROADS_HINT_MAX]:
                broads.append(str(b))
        out.append(Todo(key=key, name=name, broads=broads))
    return out


def hand_in(x: HandIn) -> int:
    """交活:POST 一批结果;非 2xx 抛。返回交了几条。"""
    rows: list = []
    for res in x.results:
        rows.append({K_KEY: res.key, K_STATUS: res.status, K_ALIAS_ZH: res.alias_zh, K_ALIAS_KO: res.alias_ko,
                     K_INDUSTRY: res.industry, K_NOTE: res.note})
    r = x.client.post(x.site.base + PATH_DONE, json={K_RESULTS: rows}, headers=x.site.headers)
    if not r.is_success:
        raise RuntimeError(NOTE_HTTP_TPL.format(status=r.status_code))
    return len(rows)


# =========================================================================
# 3. 单条:打模型 → 解析 → 校验
# =========================================================================


def translate_filled(x: TranslateIn) -> Result:
    """一个雇主名翻到「中文名不空」为止,最多 ZH_TRIES 回;人名(skip)、答不成形、盒子掉线的不重问。

    2026-09-19 Frank「别空着啊。空着不知道什么意思。翻译最起码能知道是什么方向」:原先中文名是空的也照交「办完」、
    永不重试(`done Giatec Scientific Inc. → zh「」 ko「」`,81 条);本地模型同一个名字几回答得不一样,多问一回多半就有了。
    试满还是空的照交(办完但没译名),不卡队列。
    """
    res = translate_one(x)
    tries = 1
    while res.status == ST_DONE and res.alias_zh == FIELD_NONE and tries < ZH_TRIES:
        res = translate_one(x)
        tries += 1
    return res


def translate_one(x: TranslateIn) -> Result:
    """一个雇主名:模型三行定式回答 → 人名的标 skip;其余取中 / 韩文译名,过不了校验的那一门留空
    (品牌名只有拉丁字母写法时,空着比硬翻好);盒子掉线 / 超时转数据记异常类名,由入口判整轮中止。"""
    res = Result(key=x.todo.key)
    try:
        tail = PROMPT_TAIL_TPL.format(name=x.todo.name[:NAME_MAX_LEN], broads=BROADS_SEP.join(x.todo.broads))
        answer = call_llm(LlmCallIn(client=x.client, cfg=x.cfg, prompt=PROMPT_HEAD + tail))
    except Exception as e:  # noqa: BLE001 — 盒子掉线/超时转数据,由头进 note
        res.note = type(e).__name__
        return res
    if answer == FIELD_NONE:
        res.note = NOTE_EMPTY
        return res
    person = PERSON_RE.search(answer)
    if person is None:
        res.note = NOTE_SHAPE
        return res
    if person.group(1).lower() == PERSON_YES:
        res.status = ST_SKIP
        res.note = NOTE_PERSON
        return res
    res.status = ST_DONE
    zh = ZH_RE.search(answer)
    if zh is not None:
        res.alias_zh = alias_ok_of(AliasIn(text=zh.group(1), name=x.todo.name, ko=False))
    ko = KO_RE.search(answer)
    if ko is not None:
        res.alias_ko = alias_ok_of(AliasIn(text=ko.group(1), name=x.todo.name, ko=True))
    industry = INDUSTRY_RE.search(answer)
    if industry is not None and industry.group(1).strip() in INDUSTRIES:
        res.industry = industry.group(1).strip()
    return res


def call_llm(x: LlmCallIn) -> str:
    """单轮生成:Ollama /api/generate,think 关,剥 think 块双保险;非 2xx 抛。"""
    r = x.client.post(x.cfg.base + PATH_OLLAMA_GENERATE,
                      json={P_MODEL: x.cfg.model, P_PROMPT: x.prompt, P_STREAM: False, P_THINK: False,
                            P_OPTIONS: {P_NUM_PREDICT: GEN_TOKENS, P_TEMPERATURE: LLM_TEMPERATURE}},
                      headers={})
    if not r.is_success:
        raise RuntimeError(NOTE_HTTP_TPL.format(status=r.status_code))
    body = r.json()
    if not isinstance(body, dict):
        return FIELD_NONE
    return THINK_RE.sub(STRIP_REPL, str(body.get(P_RESPONSE, FIELD_NONE))).strip()


def alias_ok_of(x: AliasIn) -> str:
    """译名校验:要有目标文字(中文 = 汉字,韩文 = 韩文音节)、不超长、不是原样抄名字;过不了给空串。"""
    text = x.text.strip()
    if text == FIELD_NONE or len(text) > ALIAS_MAX_LEN or text.lower() == x.name.strip().lower():
        return FIELD_NONE
    if x.ko:
        if HANGUL_RE.search(text) is None:
            return FIELD_NONE
        return text
    if CJK_RE.search(text) is None:
        return FIELD_NONE
    return text

"""pte.functions — ynwac 对照库抽取(bundle 直取 → 数据模块配平 → JS 字面量规范化 → 分组落盘)。

2026-09-01 立域。IN = ynwac 首页 → main.<hash>.js(公开静态,零鉴权);
OUT = data/pte/ynwac-bank.json(私有研究,不进 mart/DB)。逐数组 try/except 隔离:
一个模块的诡异嵌套引号解析不动就跳过留痕,不拖垮整轮、不静默丢(no silent cap)。
数据纯净假设:题库是 webpack 数据模块(只有 字符串/数字/布尔/数组/对象),无函数无计算值。
"""
import json
import os
import time
from datetime import date
from typing import cast

from log.functions import say
from fetch.functions import fetch, make_client
from fetch.scheme import FetchIn, HttpClientLike as FetchClientLike
from paths.constants import ENC_UTF8
from paths.functions import write_json
from paths.scheme import WriteJsonIn
from pte.constants import (ARRAY_HEAD_RE, AUTH_TPL, BACKSLASH, BANG, BOOL_FALSE_DIGIT,
                           BOOL_TRUE_DIGIT, BRACKET_CLOSE, BRACKET_OPEN, BUNDLE_HASH_RE, BUNDLE_RE,
                           CH_K_ADDED, CH_K_FETCHED, CH_K_GONE, CH_K_HINT, CH_K_ID, CH_K_LABEL,
                           CH_K_SIGNATURE, CH_K_TYPES, COMMENTS_TPL, COUNT_FIELD, CTRL_ESCAPES,
                           DATA_KEY, DQUOTE, ENV_TOKEN, ESCAPE_DQUOTE, ESCAPED_BACKSLASH, FALSE_LIT,
                           HDR_AUTH, HDR_WP_TOTAL_PAGES, HTTP_OK,
                           HTTP_TIMEOUT_S, HTTP_UNAUTH, INDEX_URL, JSON_INDENT, K_IMAGE_URL,
                           KEY_QUOTE_RE, KEY_QUOTE_SUB, LABEL_RULES, LABEL_UNKNOWN, MARK_EXPIRED,
                           MARK_MISS, MIN_ARRAY_LEN, MIN_TOTAL_FLOOR, MP3_RE, NOT_FOUND, OUT_BANK,
                           OUT_CHANGES, OUT_IMG_DIR, OUT_K_ARRAY_INDEX, OUT_K_BUNDLE, OUT_K_COUNT,
                           OUT_K_FETCHED, OUT_K_GROUPS, OUT_K_LABEL, OUT_K_QUESTIONS,
                           OUT_K_SIGNATURE, OUT_K_SOURCE, OUT_K_TOTAL, OUT_PB_BANK, OUT_PB_CHANGES,
                           OUT_PB_PREV, OUT_PB_RAW_DIR, OUT_PREV, OUT_RAW_DIR,
                           OUT_VOTES, P_ARRAY_FAIL_TPL, P_ARRAY_OK_TPL, P_ASSETS_EMPTY, P_ASSETS_TPL,
                           P_BUNDLE_TPL, P_DONE_TPL, P_FIRST_ROUND, P_GUARD_TPL, P_NO_CHANGE,
                           FLAG_FREQUENT, FLAG_IMPORTANT, IDX_K_AUDIO, IDX_K_COUNTS, IDX_K_FLAGS,
                           IDX_K_ROWS, IDX_K_SOURCE, IDX_K_TYPE, K_AUDIO_URL_YN, K_IS_FREQUENT,
                           K_IS_IMPORTANT, K_TITLE, OUT_INDEX, P_INDEX_DONE_TPL, PB_SLUG_TIPS,
                           PB_SLUG_TYPE, SRC_PTEBANK, SRC_YNWAC, TYPE_TIPS, TYPE_UNKNOWN,
                           YN_SIG_TYPE, K_TEXT, OUT_TIMELINE, OUT_WORDS, P_TL_DONE_TPL, P_W_DONE_TPL,
                           TL_BODY_KEYS, TL_ENTITY_RE, TL_K_DATES, TL_LONG_MIN, TL_NONWORD_RE,
                           TL_PROBE_LEN, TL_SHORT_MIN, TL_SPACE, TL_TAG_RE, TL_WS_RE,
                           W_K_SENTENCES, W_K_WORDS, W_MIN_COUNT, W_MIN_LEN, W_STOPWORDS,
                           W_TOKEN_RE, W_TYPES,
                           OUT_PB_AUDIO_DIR, P_PB_AUDIO_EMPTY, P_PB_AUDIO_TPL, PB_ASSET_DELAY_S,
                           P_PB_DONE_TPL, P_PB_GUARD_TPL, P_PB_PAGE_TPL, PB_API, PB_CATS_TPL,
                           PB_DELAY_S, PB_K_CATS, PB_K_CONTENT, PB_K_DATE, PB_K_LINK, PB_K_MODIFIED,
                           PB_K_NAME, PB_K_RENDERED, PB_K_SLUG, PB_K_TITLE, PB_LABEL_JOIN,
                           PB_MIN_TOTAL_FLOOR, PB_PER_PAGE, PB_POSTS_TPL, PB_RAW_CATS,
                           PB_RAW_POSTS_TPL, PB_R_AUDIO, PB_R_CATS, PB_SOURCE,
                           P_RADAR_ADD_TPL, P_RADAR_TPL, P_VOTES_CODE_TPL, P_VOTES_DONE_TPL,
                           P_VOTES_EXPIRED, P_VOTES_NO_TOKEN, QUOTE_CHARS, RAW_BUNDLE_TPL, SIG_JOIN,
                           SITE_ORIGIN, SNIPPET_KEYS, SNIPPET_LEN, TAGS_TPL, TRAILING_COMMA_RE,
                           TRAILING_COMMA_SUB, TRUE_LIT, URL_SLASH, V_K_COMMENTS, V_K_FETCHED,
                           V_K_ID, V_K_TAGS, V_K_TOTAL, V_K_TYPES, VALID_ESCAPE_NEXT,
                           VOTE_API, VOTE_CODES, VOTE_DELAY_S, VOTE_MAX_ID, VOTE_MISS_MAX)
from pte.scheme import (BankIn, CloseIn, CollectIn, DiffIn, Group, GroupIn, HttpClientLike,
                        PbBankIn, PbGroupsIn, PbRowIn, RadarIn, SnapshotIn, VoteGetIn)


# =========================================================================
# 1. 入口(抓 bundle → 逐模块解析 → 装配落盘;零基线防线兜底)
# =========================================================================


def run() -> None:
    """ynwac 整库抽取一轮:发现 bundle → 快照留痕 → 抽全部数据模块 → 逐个解析分组 → 落 OUT_BANK。

    逐数组 try/except 隔离(留痕不丢);总题数跌破 MIN_TOTAL_FLOOR = bundle 结构变,当场抛
    (防线地基,不静默入库)。"""
    client = cast(FetchClientLike, make_client(HTTP_TIMEOUT_S))
    index_html = fetch(FetchIn(client=client, url=INDEX_URL, post_data=None))
    bundle_url = bundle_url_of(index_html)
    bundle = fetch(FetchIn(client=client, url=bundle_url, post_data=None))
    say(P_BUNDLE_TPL.format(url=bundle_url, n=len(bundle)))
    snapshot_bundle(SnapshotIn(url=bundle_url, text=bundle))
    arrays = extract_arrays(bundle)
    groups = []
    fail = 0
    total = 0
    for idx, text in enumerate(arrays):
        if len(text) < MIN_ARRAY_LEN:
            continue
        try:
            questions = questions_of(text)
        except Exception as e:  # noqa: BLE001
            say(P_ARRAY_FAIL_TPL.format(idx=idx, name=type(e).__name__, detail=str(e)[:80]))
            fail += 1
            continue
        if len(questions) == 0:
            continue
        group = group_of(GroupIn(array_index=idx, questions=questions))
        total += len(questions)
        groups.append(group)
        say(P_ARRAY_OK_TPL.format(idx=idx, label=group.label, n=len(questions), sig=group.signature))
    if total < MIN_TOTAL_FLOOR:
        raise ValueError(P_GUARD_TPL.format(total=total, floor=MIN_TOTAL_FLOOR))
    payload = to_bank(BankIn(bundle_url=bundle_url, fetched=date.today().isoformat(), groups=groups))
    OUT_BANK.parent.mkdir(parents=True, exist_ok=True)
    radar(RadarIn(cur_payload=payload, bank=OUT_BANK, prev=OUT_PREV, changes=OUT_CHANGES))
    write_json(WriteJsonIn(path=OUT_BANK, payload=payload, indent=JSON_INDENT))
    say(P_DONE_TPL.format(groups=len(groups), total=total, path=OUT_BANK, fail=fail))


# =========================================================================
# 2. 抓取(禁猜 hash:首页现抽 bundle 地址;原文快照留痕)
# =========================================================================


def bundle_url_of(html: str) -> str:
    """首页 HTML → 主 bundle 绝对地址(hash 每次部署变,现抽不写死)。抽不到即抛(不猜)。"""
    m = BUNDLE_RE.search(html)
    if m is None:
        raise ValueError(INDEX_URL)
    return SITE_ORIGIN + m.group(0)


def snapshot_bundle(x: SnapshotIn) -> None:
    """bundle 原文落 raw/main-<hash>.js(出处留痕;同版覆盖)。"""
    h = ""
    m = BUNDLE_HASH_RE.search(x.url)
    if m is not None:
        h = m.group(1)
    OUT_RAW_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_RAW_DIR / RAW_BUNDLE_TPL.format(hash=h)
    path.write_text(x.text, encoding=ENC_UTF8)


# =========================================================================
# 3. 数据模块定位与解析(bracket 配平 → JS 字面量规范化 → json.loads)
# =========================================================================


def extract_arrays(js: str) -> list:
    """bundle 全文 → 全部题库数据数组文本(`const r=[…]`,bracket 配平抽整段)。"""
    arrays = []
    for m in ARRAY_HEAD_RE.finditer(js):
        start = m.start(1)
        end = close_index_of(CloseIn(src=js, start=start))
        if end != NOT_FOUND:
            arrays.append(js[start:end])
    return arrays


def close_index_of(x: CloseIn) -> int:
    """从 `[` 起做字符串感知的括号配平,返回匹配 `]` 之后一位;找不到返回 NOT_FOUND。"""
    depth = 0
    i = x.start
    instr = ""
    while i < len(x.src):
        ch = x.src[i]
        if instr:
            if ch == BACKSLASH:
                i += 2
                continue
            if ch == instr:
                instr = ""
        elif ch in QUOTE_CHARS:
            instr = ch
        elif ch == BRACKET_OPEN:
            depth += 1
        elif ch == BRACKET_CLOSE:
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return NOT_FOUND


def questions_of(array_text: str) -> list:
    """一个数据数组文本 → 题目对象清单(规范化成 JSON 再 json.loads;非法即抛,由 run 隔离)。"""
    return json.loads(normalize(array_text))


def normalize(src: str) -> str:
    """JS 数组字面量 → JSON 文本:单/反引号归一到双引号、非法转义保字面量、`!0`·`!1` → 布尔、
    裸键加引号、去尾逗号。字符串感知(只在字符串外改结构),纯数据假设。"""
    out = []
    i = 0
    n = len(src)
    while i < n:
        ch = src[i]
        if ch in QUOTE_CHARS:
            quote = ch
            j = i + 1
            buf = [DQUOTE]
            while j < n:
                d = src[j]
                if d == BACKSLASH:
                    nxt = src[j + 1:j + 2]
                    if nxt in VALID_ESCAPE_NEXT:
                        buf.append(src[j:j + 2])
                    else:
                        buf.append(ESCAPED_BACKSLASH + nxt)
                    j += 2
                    continue
                if d == quote:
                    j += 1
                    break
                buf.append(json_content_char(d))
                j += 1
            buf.append(DQUOTE)
            out.append("".join(buf))
            i = j
            continue
        if ch == BANG:
            nxt = src[i + 1:i + 2]
            if nxt == BOOL_TRUE_DIGIT:
                out.append(TRUE_LIT)
                i += 2
                continue
            if nxt == BOOL_FALSE_DIGIT:
                out.append(FALSE_LIT)
                i += 2
                continue
        out.append(ch)
        i += 1
    return quote_keys("".join(out))


def quote_keys(text: str) -> str:
    """字符串感知地给裸键加引号 + 去尾逗号:只在字符串外做(此时串已全双引号)。
    否则正文里的「, explains:」这类「逗号+词+冒号」会被误当键注引号(arr#3 实撞)。"""
    out = []
    buf = []
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if ch == DQUOTE:
            out.append(transform_struct("".join(buf)))
            buf = []
            j = i + 1
            s = [DQUOTE]
            while j < n:
                d = text[j]
                if d == BACKSLASH:
                    s.append(text[j:j + 2])
                    j += 2
                    continue
                s.append(d)
                if d == DQUOTE:
                    j += 1
                    break
                j += 1
            out.append("".join(s))
            i = j
            continue
        buf.append(ch)
        i += 1
    out.append(transform_struct("".join(buf)))
    return "".join(out)


def transform_struct(s: str) -> str:
    """一段「字符串外」的结构文本:裸键加引号 → 去尾逗号(顺序不可换)。"""
    quoted = KEY_QUOTE_RE.sub(KEY_QUOTE_SUB, s)
    return TRAILING_COMMA_RE.sub(TRAILING_COMMA_SUB, quoted)


def json_content_char(d: str) -> str:
    """字符串内一个非定界、非转义引导的内容字符 → JSON 安全片段(裸双引号转义、裸控制字符转义)。"""
    if d == DQUOTE:
        return ESCAPE_DQUOTE
    for raw, esc in CTRL_ESCAPES:
        if d == raw:
            return esc
    return d


# =========================================================================
# 4. 标注与装配(best-effort 题型标签 + 字段签名 → 产物 dict,to_* 边界)
# =========================================================================


def group_of(x: GroupIn) -> Group:
    """一组题目 → Group(按首题字段推题型标签 + 记签名 + 存序号)。"""
    first = x.questions[0]
    return Group(label=label_of(first), signature=signature_of(first),
                 array_index=x.array_index, questions=x.questions)


def label_of(obj: dict) -> str:
    """按 LABEL_RULES(优先序标志键组)给 best-effort 题型标签;全不中返回空串(靠签名人工核)。"""
    for keys, label in LABEL_RULES:
        matched = True
        for k in keys:
            if k not in obj:
                matched = False
                break
        if matched:
            return label
    return LABEL_UNKNOWN


def signature_of(obj: dict) -> str:
    """首题排序键名 join = 题型指纹(标签留空时的人工核依据)。"""
    return SIG_JOIN.join(sorted(obj.keys()))


def to_bank(x: BankIn) -> dict:
    """整库产物装配(json 边界键只在此出现):meta + 分组清单(每组标签/签名/序号/题数/题目)。"""
    groups_out = []
    total = 0
    for g in x.groups:
        total += len(g.questions)
        groups_out.append({
            OUT_K_LABEL: g.label,
            OUT_K_SIGNATURE: g.signature,
            OUT_K_ARRAY_INDEX: g.array_index,
            OUT_K_COUNT: len(g.questions),
            OUT_K_QUESTIONS: g.questions,
        })
    return {
        OUT_K_SOURCE: INDEX_URL,
        OUT_K_BUNDLE: x.bundle_url,
        OUT_K_FETCHED: x.fetched,
        OUT_K_TOTAL: total,
        OUT_K_GROUPS: groups_out,
    }


# =========================================================================
# 5. 图片资产(DI 看图题的图 = 题干本体;公开可下,落 raw/pte/images/)
# =========================================================================


def run_assets() -> None:
    """读已落盘的库 → 收集全部 imageUrl → 下载 DI 图片到 raw/pte/images/(已存跳过,幂等)。

    听力 mp3 不在此步:api.ynwac.com/audio/ 需登录态(401),transcript 已在库内文本可研究。"""
    client = make_client(HTTP_TIMEOUT_S)
    bank = load_bank()
    urls = image_urls_of(bank)
    if len(urls) == 0:
        say(P_ASSETS_EMPTY)
        return
    OUT_IMG_DIR.mkdir(parents=True, exist_ok=True)
    got = 0
    skip = 0
    for u in urls:
        name = u.rsplit(URL_SLASH, 1)[-1]
        path = OUT_IMG_DIR / name
        if path.exists():
            skip += 1
            continue
        resp = client.get(SITE_ORIGIN + u)
        path.write_bytes(resp.content)
        got += 1
    say(P_ASSETS_TPL.format(got=got, skip=skip, total=len(urls), dir=OUT_IMG_DIR))


def load_bank() -> dict:
    """读回 OUT_BANK(资产步的输入;库不在即抛,由 main 隔离留痕)。"""
    with OUT_BANK.open(encoding=ENC_UTF8) as f:
        return json.load(f)


def image_urls_of(bank: dict) -> list:
    """整库 → 去重排序的 imageUrl 清单(DI 组的图片相对路径)。"""
    urls = set()
    for g in bank[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            u = q.get(K_IMAGE_URL)
            if u is not None and len(u) > 0:
                urls.add(u)
    return sorted(urls)


# =========================================================================
# 6. 机经雷达(diff:本轮 vs 上轮 → 新题/消失题;照 crawl 政策雷达)
# =========================================================================


def radar(x: RadarIn) -> None:
    """写新库前先跑 diff:旧库当基准 → 按题型+题 id 比对 → 落 prev/changes + 播报新题。
    无旧库 = 首轮建档(只留基准不报)。ynwac 上新题 → 这里冒出来(它是 duoink 下游镜像)。
    2026-09-01 路径入参化(x.bank/prev/changes):ptebank 第二源共用本实现,行为不复制。"""
    if not x.bank.exists():
        say(P_FIRST_ROUND)
        return
    with x.bank.open(encoding=ENC_UTF8) as f:
        prev = json.load(f)
    types = diff_of(DiffIn(prev_groups=prev[OUT_K_GROUPS], cur_groups=x.cur_payload[OUT_K_GROUPS]))
    changes = {CH_K_FETCHED: date.today().isoformat(), CH_K_TYPES: types}
    write_json(WriteJsonIn(path=x.prev, payload=prev, indent=JSON_INDENT))
    write_json(WriteJsonIn(path=x.changes, payload=changes, indent=JSON_INDENT))
    if len(types) == 0:
        say(P_NO_CHANGE)
        return
    for t in types:
        say(P_RADAR_TPL.format(label=t[CH_K_LABEL], added=len(t[CH_K_ADDED]), gone=len(t[CH_K_GONE])))
        for q in t[CH_K_ADDED]:
            say(P_RADAR_ADD_TPL.format(id=q[CH_K_ID], hint=q[CH_K_HINT]))


def diff_of(x: DiffIn) -> list:
    """两轮分组 → 变更清单:每题型(按签名)算新增/消失的题 id;无变更的题型不入清单。"""
    prev_ids = ids_of(x.prev_groups)
    cur_ids = ids_of(x.cur_groups)
    cur_labels = labels_of(x.cur_groups)
    prev_labels = labels_of(x.prev_groups)
    types = []
    for sig in sorted(set(prev_ids) | set(cur_ids)):
        pmap = prev_ids.get(sig, {})
        cmap = cur_ids.get(sig, {})
        added_ids = sorted(set(cmap) - set(pmap))
        gone_ids = sorted(set(pmap) - set(cmap))
        if len(added_ids) == 0 and len(gone_ids) == 0:
            continue
        added = []
        for qid in added_ids:
            added.append({CH_K_ID: qid, CH_K_HINT: cmap[qid]})
        label = cur_labels.get(sig, LABEL_UNKNOWN)
        if len(label) == 0:
            label = prev_labels.get(sig, LABEL_UNKNOWN)
        types.append({CH_K_SIGNATURE: sig, CH_K_LABEL: label, CH_K_ADDED: added, CH_K_GONE: gone_ids})
    return types


def ids_of(groups: list) -> dict:
    """分组清单 → {签名: {题 id: 提示文本}}(diff 的题型内题目索引)。"""
    out = {}
    for g in groups:
        ids = {}
        for q in g[OUT_K_QUESTIONS]:
            ids[q[CH_K_ID]] = snippet_of(q)
        out[g[OUT_K_SIGNATURE]] = ids
    return out


def labels_of(groups: list) -> dict:
    """分组清单 → {签名: 题型标签}(diff 播报用人话名)。"""
    out = {}
    for g in groups:
        out[g[OUT_K_SIGNATURE]] = g[OUT_K_LABEL]
    return out


def snippet_of(q: dict) -> str:
    """一道题 → 提示文本(SNIPPET_KEYS 里第一个非空的截断;都空返回空串)。"""
    for k in SNIPPET_KEYS:
        v = q.get(k)
        if v is not None and len(str(v)) > 0:
            return str(v)[:SNIPPET_LEN]
    return LABEL_UNKNOWN


# =========================================================================
# 7. 考过投票 + 考试记录(登录门控 API;token 走 env,你部署的容器自动抓)
# =========================================================================


def run_votes() -> None:
    """自动抓考过投票 + 评论:token 取自 YNWAC_TOKEN(空则跳过不报错;401 则中止提示重取)。
    候选题型代码自探测(loop 到连续 miss);原样存 API data,不二次解析。**「你部署的容器」跑,
    不是交互式跑 —— 交互式登录态自动化被运行环境拦。**"""
    token = os.environ.get(ENV_TOKEN, LABEL_UNKNOWN)
    if len(token) == 0:
        say(P_VOTES_NO_TOKEN)
        return
    client = make_client(HTTP_TIMEOUT_S)
    client.headers[HDR_AUTH] = AUTH_TPL.format(token=token)
    like = cast(HttpClientLike, client)
    types_out = {}
    total = 0
    for code in VOTE_CODES:
        rows = collect_code(CollectIn(client=like, code=code))
        if rows is None:
            say(P_VOTES_EXPIRED)
            return
        if len(rows) > 0:
            types_out[code] = rows
            total += len(rows)
            say(P_VOTES_CODE_TPL.format(code=code, n=len(rows)))
    payload = {V_K_FETCHED: date.today().isoformat(), V_K_TOTAL: total, V_K_TYPES: types_out}
    OUT_VOTES.parent.mkdir(parents=True, exist_ok=True)
    write_json(WriteJsonIn(path=OUT_VOTES, payload=payload, indent=JSON_INDENT))
    say(P_VOTES_DONE_TPL.format(types=len(types_out), total=total, path=OUT_VOTES))


def collect_code(x: CollectIn) -> list | None:
    """一个题型代码从 id=1 探到连续 miss 到头 → 题行清单;命中 401 返回 None(token 失效,上层中止)。"""
    rows = []
    miss = 0
    qid = 1
    while qid <= VOTE_MAX_ID and miss < VOTE_MISS_MAX:
        tags = vote_get(VoteGetIn(client=x.client, url=VOTE_API + TAGS_TPL.format(code=x.code, id=qid)))
        if MARK_EXPIRED in tags:
            return None
        if MARK_MISS in tags or count_of(tags) is None:
            miss += 1
            qid += 1
            continue
        miss = 0
        comments = vote_get(VoteGetIn(client=x.client, url=VOTE_API + COMMENTS_TPL.format(id=qid, code=x.code)))
        rows.append({V_K_ID: qid, V_K_TAGS: data_of(tags), V_K_COMMENTS: data_of(comments)})
        qid += 1
        time.sleep(VOTE_DELAY_S)
    return rows


def count_of(resp: dict) -> object:
    """tags 响应 → data.count(考过投票数);data 非 dict 或缺 count 则 None —— **判真伪的关键**:
    真题 count 非 null(实测 id=1 → 67),不存在的 id 返回 count=null(实测 id=999)。"""
    d = resp.get(DATA_KEY)
    if isinstance(d, dict):
        return d.get(COUNT_FIELD)
    return None


def data_of(resp: dict) -> object:
    """API 响应取 data 字段(标准壳 {result,message,data,error};缺则 None)。"""
    return resp.get(DATA_KEY)


def vote_get(x: VoteGetIn) -> dict:
    """登录态一发 GET:401 → {MARK_EXPIRED};非 200 或网络错 → {MARK_MISS};200 → 响应 json。"""
    try:
        r = x.client.get(x.url)
    except Exception:  # noqa: BLE001
        return {MARK_MISS: True}
    if r.status_code == HTTP_UNAUTH:
        return {MARK_EXPIRED: True}
    if r.status_code != HTTP_OK:
        return {MARK_MISS: True}
    data = r.json()
    if not isinstance(data, dict):
        return {MARK_MISS: True}
    return data


# =========================================================================
# 8. ptebank 第二源(WP REST 整库:分页抓 → raw 快照 → 洗行分组 → 雷达 → 落库)
# =========================================================================


def run_ptebank() -> None:
    """ptebank 整库一轮:分类 → 帖子分页(原始响应先落 raw)→ 洗行 → 按题型分组 → 雷达 → 落 OUT_PB_BANK。

    2026-09-01 接入(same-source-analysis §7):第二个全开机经库,音频重补 ynwac 文本重;
    帖数跌破 PB_MIN_TOTAL_FLOOR = API/站点结构变,当场抛(不静默入库)。"""
    client = cast(HttpClientLike, make_client(HTTP_TIMEOUT_S))
    cats = pb_categories_of(client)
    posts = pb_posts_of(client)
    if len(posts) < PB_MIN_TOTAL_FLOOR:
        raise ValueError(P_PB_GUARD_TPL.format(total=len(posts), floor=PB_MIN_TOTAL_FLOOR))
    rows = []
    for p in posts:
        rows.append(to_pb_row(PbRowIn(post=p, cats=cats)))
    groups = pb_groups_of(PbGroupsIn(rows=rows, cats=cats))
    payload = to_pb_bank(PbBankIn(fetched=date.today().isoformat(), groups=groups))
    OUT_PB_BANK.parent.mkdir(parents=True, exist_ok=True)
    radar(RadarIn(cur_payload=payload, bank=OUT_PB_BANK, prev=OUT_PB_PREV, changes=OUT_PB_CHANGES))
    write_json(WriteJsonIn(path=OUT_PB_BANK, payload=payload, indent=JSON_INDENT))
    say(P_PB_DONE_TPL.format(groups=len(groups), total=len(rows), path=OUT_PB_BANK))


def pb_categories_of(client: HttpClientLike) -> dict:
    """分类端点一发 → {id: {slug, name}}(原始响应先落 raw/categories.json)。非 200 即抛(不猜)。"""
    url = PB_API + PB_CATS_TPL.format(per=PB_PER_PAGE)
    r = client.get(url)
    if r.status_code != HTTP_OK:
        raise ValueError(url)
    OUT_PB_RAW_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_PB_RAW_DIR / PB_RAW_CATS).write_text(r.text, encoding=ENC_UTF8)
    data = r.json()
    if not isinstance(data, list):
        raise ValueError(url)
    cats = {}
    for c in data:
        cats[c[CH_K_ID]] = {PB_K_SLUG: c[PB_K_SLUG], PB_K_NAME: c[PB_K_NAME]}
    return cats


def pb_posts_of(client: HttpClientLike) -> list:
    """帖子分页抓全 → 帖清单;每页原始响应先落 raw/posts-p<n>.json。
    页数取 X-WP-TotalPages 响应头(权威);头缺失或非 200 即抛(不静默截断)。"""
    posts = []
    page = 1
    pages = 1
    while page <= pages:
        url = PB_API + PB_POSTS_TPL.format(per=PB_PER_PAGE, page=page)
        r = client.get(url)
        if r.status_code != HTTP_OK:
            raise ValueError(url)
        tp = r.headers.get(HDR_WP_TOTAL_PAGES)
        if tp is None:
            raise ValueError(HDR_WP_TOTAL_PAGES)
        pages = int(tp)
        OUT_PB_RAW_DIR.mkdir(parents=True, exist_ok=True)
        (OUT_PB_RAW_DIR / PB_RAW_POSTS_TPL.format(page=page)).write_text(r.text, encoding=ENC_UTF8)
        batch = r.json()
        if not isinstance(batch, list):
            raise ValueError(url)
        posts.extend(batch)
        say(P_PB_PAGE_TPL.format(page=page, pages=pages, n=len(batch)))
        page += 1
        time.sleep(PB_DELAY_S)
    return posts


def to_pb_row(x: PbRowIn) -> dict:
    """一条 WP 帖 → 洗净 row(值级清洗全在此:rendered 壳展平、分类 id 换译 slug、mp3 直链抽出)。
    未知分类 id 保 str(id) 留痕不丢;此后消费端入参一律已有效。"""
    post = x.post
    content = pb_rendered_of(post.get(PB_K_CONTENT))
    slugs = []
    for cid in post.get(PB_K_CATS, []):
        c = x.cats.get(cid)
        if c is None:
            slugs.append(str(cid))
        else:
            slugs.append(c[PB_K_SLUG])
    return {
        CH_K_ID: post[CH_K_ID],
        PB_K_DATE: post.get(PB_K_DATE),
        PB_K_MODIFIED: post.get(PB_K_MODIFIED),
        PB_K_LINK: post.get(PB_K_LINK),
        PB_K_TITLE: pb_rendered_of(post.get(PB_K_TITLE)),
        PB_R_CATS: slugs,
        PB_R_AUDIO: sorted(set(MP3_RE.findall(content))),
        PB_K_CONTENT: content,
    }


def pb_rendered_of(v: object) -> str:
    """WP 渲染壳({rendered: 文本})→ 纯文本;壳缺或格缺返回空串(留痕靠 raw,不编数)。"""
    if isinstance(v, dict):
        r = v.get(PB_K_RENDERED)
        if isinstance(r, str):
            return r
    return LABEL_UNKNOWN


def pb_groups_of(x: PbGroupsIn) -> list:
    """全部 row → 组 dict 清单:signature = 本帖分类 slug 集排序 join(稳定身份键,雷达按它 diff),
    label = 对应人话名 join(播报用)。组形照 ynwac bank(diff_of/ids_of 直接可用)。"""
    name_of = {}
    for c in x.cats.values():
        name_of[c[PB_K_SLUG]] = c[PB_K_NAME]
    buckets = {}
    for row in x.rows:
        sig = SIG_JOIN.join(sorted(row[PB_R_CATS]))
        if sig not in buckets:
            buckets[sig] = []
        buckets[sig].append(row)
    groups = []
    for sig in sorted(buckets):
        names = []
        for s in sig.split(SIG_JOIN):
            if s in name_of:
                names.append(name_of[s])
            else:
                names.append(s)
        groups.append({
            OUT_K_LABEL: PB_LABEL_JOIN.join(names),
            OUT_K_SIGNATURE: sig,
            OUT_K_COUNT: len(buckets[sig]),
            OUT_K_QUESTIONS: buckets[sig],
        })
    return groups


def to_pb_bank(x: PbBankIn) -> dict:
    """ptebank 整库产物装配(meta + 分组;形照 ynwac bank,radar/diff 双源同一套读法)。"""
    total = 0
    for g in x.groups:
        total += g[OUT_K_COUNT]
    return {
        OUT_K_SOURCE: PB_SOURCE,
        OUT_K_FETCHED: x.fetched,
        OUT_K_TOTAL: total,
        OUT_K_GROUPS: x.groups,
    }


def run_pb_audio() -> None:
    """读已落盘的 ptebank 库 → 收集全部 audio 直链 → 下载 mp3 到 raw/pte/ptebank/audio/(已存跳过,幂等)。

    2026-09-01 立(照 run_assets 形):音频 = 听力题干本体,链接会腐,趁开放落盘;
    单条失败计数留痕不拖全轮(公开静态文件,偶发 404 属对方删档,不当红)。"""
    client = cast(HttpClientLike, make_client(HTTP_TIMEOUT_S))
    with OUT_PB_BANK.open(encoding=ENC_UTF8) as f:
        bank = json.load(f)
    urls = pb_audio_urls_of(bank)
    if len(urls) == 0:
        say(P_PB_AUDIO_EMPTY)
        return
    OUT_PB_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    got = 0
    skip = 0
    fail = 0
    for u in urls:
        name = u.rsplit(URL_SLASH, 1)[-1]
        path = OUT_PB_AUDIO_DIR / name
        if path.exists():
            skip += 1
            continue
        try:
            resp = client.get(u)
        except Exception:  # noqa: BLE001 — 单条网络错跳过计数,不拖全轮
            fail += 1
            continue
        if resp.status_code != HTTP_OK:
            fail += 1
            continue
        path.write_bytes(resp.content)
        got += 1
        time.sleep(PB_ASSET_DELAY_S)
    say(P_PB_AUDIO_TPL.format(got=got, skip=skip, fail=fail, total=len(urls), dir=OUT_PB_AUDIO_DIR))


def pb_audio_urls_of(bank: dict) -> list:
    """ptebank 整库 → 去重排序的 mp3 直链清单(row 的 audio 格已是绝对地址)。"""
    urls = set()
    for g in bank[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            for u in q[PB_R_AUDIO]:
                urls.add(u)
    return sorted(urls)


# =========================================================================
# 9. 双源统一索引(组织层:两库 → 标准题型下一题一行 + 题型×来源盘点)
# =========================================================================


def run_index() -> None:
    """统一索引一轮:读两库 → 各自构行(签名/分类 → 标准题型码)→ 合并落 OUT_INDEX。

    2026-09-01 立(Frank「先组织和收集数据」):收集靠雷达自动,组织靠本步 ——
    题型盘点/押题信号/音频资产从此有单一查询面,后续分析(缺口/时间轴/词表)全踩这层。"""
    with OUT_BANK.open(encoding=ENC_UTF8) as f:
        yn = json.load(f)
    with OUT_PB_BANK.open(encoding=ENC_UTF8) as f:
        pb = json.load(f)
    rows = to_yn_index_rows(yn) + to_pb_index_rows(pb)
    counts = index_counts_of(rows)
    payload = {
        OUT_K_FETCHED: date.today().isoformat(),
        IDX_K_COUNTS: counts,
        IDX_K_ROWS: rows,
    }
    write_json(WriteJsonIn(path=OUT_INDEX, payload=payload, indent=JSON_INDENT))
    say(P_INDEX_DONE_TPL.format(rows=len(rows), types=len(counts), path=OUT_INDEX))


def to_yn_index_rows(bank: dict) -> list:
    """ynwac 整库 → 索引行清单(签名 → 题型码;押题标记/音频有无在此抽平)。"""
    rows = []
    for g in bank[OUT_K_GROUPS]:
        t = YN_SIG_TYPE.get(g[OUT_K_SIGNATURE], TYPE_UNKNOWN)
        for q in g[OUT_K_QUESTIONS]:
            flags = []
            if q.get(K_IS_IMPORTANT) is True:
                flags.append(FLAG_IMPORTANT)
            if q.get(K_IS_FREQUENT) is True:
                flags.append(FLAG_FREQUENT)
            au = q.get(K_AUDIO_URL_YN)
            rows.append({
                IDX_K_TYPE: t,
                IDX_K_SOURCE: SRC_YNWAC,
                CH_K_ID: q.get(CH_K_ID),
                K_TITLE: snippet_of(q),
                IDX_K_FLAGS: flags,
                IDX_K_AUDIO: isinstance(au, str) and len(au) > 0,
            })
    return rows


def to_pb_index_rows(bank: dict) -> list:
    """ptebank 整库 → 索引行清单(分类 slug → 题型码;纯 tips 帖归 TIPS 当时间轴素材)。"""
    rows = []
    for g in bank[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            rows.append({
                IDX_K_TYPE: pb_type_of(q[PB_R_CATS]),
                IDX_K_SOURCE: SRC_PTEBANK,
                CH_K_ID: q[CH_K_ID],
                K_TITLE: q[PB_K_TITLE],
                IDX_K_FLAGS: [],
                IDX_K_AUDIO: len(q[PB_R_AUDIO]) > 0,
            })
    return rows


def pb_type_of(slugs: list) -> str:
    """一帖的分类 slug 集 → 标准题型码:先取映射表接住的题型;全没接住时纯 tips 帖归 TIPS,
    其余留 ?(待人工补表,不硬塞)。"""
    for s in slugs:
        t = PB_SLUG_TYPE.get(s)
        if t is not None:
            return t
    if PB_SLUG_TIPS in slugs:
        return TYPE_TIPS
    return TYPE_UNKNOWN


def index_counts_of(rows: list) -> dict:
    """索引行 → {题型码: {来源: 题数}} 盘点表(缺口一眼可数)。"""
    counts = {}
    for r in rows:
        t = r[IDX_K_TYPE]
        if t not in counts:
            counts[t] = {}
        src = r[IDX_K_SOURCE]
        if src not in counts[t]:
            counts[t][src] = 0
        counts[t][src] += 1
    return counts


# =========================================================================
# 10. 组织层分析(时间轴:题探针 × 月更存档;词表:句库词频 —— 全本地零抓取)
# =========================================================================


def tl_norm(s: str) -> str:
    """题面/存档文本归一化(剥标签实体、抹标点、压空白、小写)—— 转录差异下仍可撞探针。"""
    t = TL_TAG_RE.sub(TL_SPACE, s.lower())
    t = TL_ENTITY_RE.sub(TL_SPACE, t)
    t = TL_NONWORD_RE.sub(TL_SPACE, t)
    return TL_WS_RE.sub(TL_SPACE, t).strip()


def tl_probe_of(q: dict) -> str:
    """一道题 → 探针文本:候选键里最长正文归一化后,长文取中段、短句取整句;
    太短返回空串(误撞率高,弃 —— 调用方跳过)。"""
    body = ""
    for k in TL_BODY_KEYS:
        v = q.get(k)
        if isinstance(v, str) and len(v) > len(body):
            body = v
    nb = tl_norm(body)
    if len(nb) >= TL_LONG_MIN:
        mid = len(nb) // 2
        return nb[mid - TL_PROBE_LEN // 2:mid + TL_PROBE_LEN // 2]
    if len(nb) >= TL_SHORT_MIN:
        return nb
    return LABEL_UNKNOWN


def run_timeline() -> None:
    """时间轴一轮:双库全部题出探针 → 逐篇撞 ptebank 月更存档(带日期)→ 每题出现日期清单。

    2026-09-01 立(事实层路线):「某题某月被存档引用」是事实,不受版权保护,可直接消费;
    首现/末现/复现次数由消费端从 dates 派生。"""
    with OUT_BANK.open(encoding=ENC_UTF8) as f:
        yn = json.load(f)
    with OUT_PB_BANK.open(encoding=ENC_UTF8) as f:
        pb = json.load(f)
    probes = []
    for g in yn[OUT_K_GROUPS]:
        t = YN_SIG_TYPE.get(g[OUT_K_SIGNATURE], TYPE_UNKNOWN)
        for q in g[OUT_K_QUESTIONS]:
            p = tl_probe_of(q)
            if len(p) > 0:
                probes.append((t, SRC_YNWAC, q.get(CH_K_ID), snippet_of(q), p))
    archives = []
    for g in pb[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            if pb_type_of(q[PB_R_CATS]) == TYPE_TIPS:
                d = str(q.get(PB_K_DATE))[:10]
                archives.append((d, tl_norm(q[PB_K_CONTENT])))
            else:
                p = tl_probe_of(q)
                if len(p) > 0:
                    probes.append((pb_type_of(q[PB_R_CATS]), SRC_PTEBANK, q[CH_K_ID], q[PB_K_TITLE], p))
    rows = []
    for t, src, qid, title, p in probes:
        dates = []
        for d, c in archives:
            if p in c:
                dates.append(d)
        if len(dates) > 0:
            rows.append({
                IDX_K_TYPE: t,
                IDX_K_SOURCE: src,
                CH_K_ID: qid,
                K_TITLE: title,
                TL_K_DATES: sorted(dates),
            })
    rows.sort(key=timeline_hits_of, reverse=True)
    payload = {OUT_K_FETCHED: date.today().isoformat(), IDX_K_ROWS: rows}
    write_json(WriteJsonIn(path=OUT_TIMELINE, payload=payload, indent=JSON_INDENT))
    say(P_TL_DONE_TPL.format(hit=len(rows), probes=len(probes), posts=len(archives), path=OUT_TIMELINE))


def timeline_hits_of(row: dict) -> int:
    """时间轴行 → 被引用次数(排序键:引用最多 = 最长寿/最热)。"""
    return len(row[TL_K_DATES])


def run_words() -> None:
    """词表一轮:双库句库题型(WFD/RS)全部正文分词 → 停用词外的词频降序落盘。

    词不是题面表达,不受版权保护 —— 第一个可直接上产品的资产(高频考点词表)。"""
    with OUT_BANK.open(encoding=ENC_UTF8) as f:
        yn = json.load(f)
    with OUT_PB_BANK.open(encoding=ENC_UTF8) as f:
        pb = json.load(f)
    sentences = []
    for g in yn[OUT_K_GROUPS]:
        if YN_SIG_TYPE.get(g[OUT_K_SIGNATURE], TYPE_UNKNOWN) in W_TYPES:
            for q in g[OUT_K_QUESTIONS]:
                sentences.append(tl_norm(str(q.get(K_TEXT))))
    for g in pb[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            if pb_type_of(q[PB_R_CATS]) in W_TYPES:
                sentences.append(tl_norm(q[PB_K_CONTENT]))
    counts = {}
    for s in sentences:
        for w in W_TOKEN_RE.findall(s):
            if len(w) < W_MIN_LEN or w in W_STOPWORDS:
                continue
            if w not in counts:
                counts[w] = 0
            counts[w] += 1
    pairs = []
    for w, n in counts.items():
        if n >= W_MIN_COUNT:
            pairs.append((-n, w))
    pairs.sort()
    ranked = {}
    for neg, w in pairs:
        ranked[w] = -neg
    payload = {OUT_K_FETCHED: date.today().isoformat(), W_K_SENTENCES: len(sentences), W_K_WORDS: ranked}
    write_json(WriteJsonIn(path=OUT_WORDS, payload=payload, indent=JSON_INDENT))
    say(P_W_DONE_TPL.format(sentences=len(sentences), words=len(ranked), path=OUT_WORDS))

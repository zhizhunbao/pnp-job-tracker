"""pte.functions — ynwac 对照库抽取(bundle 直取 → 数据模块配平 → JS 字面量规范化 → 分组落盘)。

2026-09-01 立域。IN = ynwac 首页 → main.<hash>.js(公开静态,零鉴权);
OUT = data/pte/ynwac-bank.json(私有研究,不进 mart/DB)。逐数组 try/except 隔离:
一个模块的诡异嵌套引号解析不动就跳过留痕,不拖垮整轮、不静默丢(no silent cap)。
数据纯净假设:题库是 webpack 数据模块(只有 字符串/数字/布尔/数组/对象),无函数无计算值。
"""
import asyncio
import json
import os
import time
from datetime import date, timedelta
from pathlib import Path
from typing import cast
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from log.functions import say
from crawl.constants import PROFILE_DIR
from crawl.functions import close_browser, get_browser_page, put_cached_page
from crawl.scheme import CachePutIn
from fetch.functions import fetch, make_client
from fetch.scheme import FetchIn, HttpClientLike as FetchClientLike
from paths.constants import ENC_UTF8, MART
from paths.functions import write_json, write_text
from paths.scheme import WriteJsonIn, WriteTextIn
from pte.constants import (DK_AVATAR_MARKS, DK_CRAWL_SLUG, DK_ENTRY_DELAY_S, DK_ENTRY_FILE_TPL,
                           DK_ENTRY_JS, DK_ENTRY_TPL, DK_ENTRY_WAIT_S, DK_FREQ_HOT, DK_J_HTML,
                           DK_J_IMGS, DK_J_TEXT, DK_J_TITLE, DK_K_FREQ, DK_SHOW_ROUNDS_MAX,
                           DK_BLOCK_ABORT_MAX, DK_BLOCK_MARK, DK_BLOCK_POLL_S, DK_BLOCK_WAIT_S,
                           DK_BODY_TEXT_JS, P_DK_BLOCK_ABORT, P_DK_BLOCK_OK, P_DK_BLOCK_TIMEOUT,
                           P_DK_BLOCK_WAIT,
                           DK_K_ID, DK_K_TEXT, DK_TITLE_KEYS, DK_LIST_TPL, DK_NAV_TIMEOUT_MS, DK_PAGE_WAIT_S,
                           DK_PART_TOKEN, DK_PART_TYPE, DK_PARTS, DK_R_CONTENT, DK_R_IMAGES, DK_R_PART,
                           DK_RAW_LIST_TPL, DK_SHOW_JS, DK_SHOW_WAIT_S, DK_SOURCE, DK_STORE_JS,
                           DK_TEXT_END, DK_TEXT_PARTS, DK_TEXT_START, DK_WAIT_UNTIL, OUT_DK_BANK,
                           OUT_DK_CHANGES, OUT_DK_ENTRIES_DIR, OUT_DK_IMG_DIR, OUT_DK_PREV,
                           OUT_DK_RAW_DIR, P_DK_DONE_TPL, P_DK_ENTRIES_TPL, P_DK_LIST_TPL,
                           P_DK_LISTS_DONE_TPL, P_DK_LOGIN_LOST, P_DK_NO_BROWSER, SRC_DUOINK,
                           DATE_LEN, DAYS_BAD, DK_K_FREQ_CORE, DK_K_SEEN, EXAM_DATE_RE, OUT_RECENT,
                           P_RECENT_DONE_TPL, R_K_FREQ, R_K_SEEN, R_K_SEEN_N, R_K_SUMMARY, R_K_VOTES,
                           R_S_LAST, R_S_SEEN, R_S_TOTAL, R_S_WIN_TPL, RECENT_WINDOWS_D, V_C_CONTENT,
                           V_C_REPLIES, V_T_COUNT, YN_VOTE_TYPE,
                           CORE_TYPES, KIND_AUDIO, KIND_IMAGE, M_K_FILE, M_K_KIND, M_K_URL,
                           OUT_MEDIA, OUT_PB_IMG_DIR, OUT_YN_AUDIO_DIR, P_MEDIA_DONE_TPL,
                           P_PB_IMG_EMPTY, P_PB_IMG_TPL, P_YN_AUDIO_EMPTY, P_YN_AUDIO_TPL,
                           YN_AUDIO_TPL, CT_AUDIO_PREFIX, HDR_CONTENT_TYPE,
                           PB_IMG_RE, PB_THUMB_RE, RAW_PTE,
                           ARRAY_HEAD_RE, AUTH_TPL, BACKSLASH, BANG, BOOL_FALSE_DIGIT,
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
                           VOTE_API, VOTE_CODES, VOTE_DELAY_S, VOTE_MAX_ID, VOTE_MISS_MAX,
                           OUT_XJ_BANK, OUT_XJ_CHANGES, OUT_XJ_PREV, OUT_XJ_RAW_DIR, P_XJ_BAD_SHAPE_TPL,
                           P_XJ_DONE_TPL, P_XJ_LIST_TPL, P_XJ_LISTS_DONE_TPL, P_XJ_LOGIN_LOST,
                           P_XJ_NO_BROWSER, P_XJ_NO_SEED_TPL, SRC_PTEXJ, XJ_A_ADDITION, XJ_A_COUNT,
                           XJ_A_CURRENT, XJ_A_DATA, XJ_A_EXAM_COUNT, XJ_A_NEXT, XJ_A_PREV, XJ_API_SINGLE,
                           XJ_CALL_DELAY_S, XJ_CHAIN_MAX, XJ_FETCH_JS, XJ_K_MODEL, XJ_K_TAG,
                           XJ_MODEL_TYPE, XJ_MODELS, XJ_NAV_TIMEOUT_MS, XJ_NUM_RE, XJ_P_NUM,
                           XJ_PAGE_WAIT_S, XJ_PRACTICE_TPL, XJ_RAW_LIST_TPL, XJ_SOURCE, XJ_TAG_PREDICT,
                           OUT_XJ_EXAM, P_XJ_EXAM_DONE_TPL, P_XJ_EXAM_NO_SEED, P_XJ_EXAM_PAGE_TPL,
                           P_XJ_EXAM_STOP_TPL, XJ_A_COMMENTABLE, XJ_A_COMMENTS, XJ_A_CREATED,
                           XJ_A_EXAM_DATE, XJ_A_ID, XJ_A_MODEL, XJ_A_NUM, XJ_A_PAGE_INFO, XJ_A_TOTAL_PAGES,
                           XJ_API_EXAM, XJ_EXAM_DELAY_S, XJ_EXAM_DEPTH_D, XJ_EXAM_DROP_PARAMS,
                           XJ_EXAM_KEEP_D, XJ_EXAM_LOG_EVERY, XJ_EXAM_PAGE_SIZE, XJ_EXAM_PAGES_MAX,
                           XJ_K_EXAM_DATES, XJ_K_PREDICTED, XJ_P_PAGE, XJ_P_PAGE_SIZE, XJ_STOP_DEPTH,
                           XJ_STOP_EMPTY, XJ_STOP_END, XJ_STOP_KNOWN, XJ_STOP_MAX, XJ_WAIT_UNTIL,
                           XJ_EXAM_STOP_STREAK,
                           DK_ANSWER_MARK, DK_LINE_SEP, DK_STOP_MARKS, DK_TEXT_MARK, DK_TRANSCRIPT_MARK,
                           K_ANSWER, K_CONTENT, K_ID, K_QUESTION,
                           MART_QUESTIONS_FILE, MART_TYPE_ROWS, MART_TYPES, MART_TYPES_FILE,
                           OPEN_TIGHT_RE, P_MART_DONE_TPL, PUNCT_TIGHT_RE, Q_K_ANSWER, Q_K_AUDIO_FILE,
                           Q_K_AUDIO_URL, Q_K_FETCHED, Q_K_IMAGE_URL, Q_K_NUM, Q_K_PREDICTED, Q_K_QID,
                           Q_K_SEEN_N, Q_K_TEXT, QID_SEP, TOKEN_JOIN, T_ASQ, T_RA, T_WFD, DK_K_SN)
from pte.scheme import (BankIn, CloseIn, CollectIn, DiffIn, DkEntryIn, DkImagesIn, DkPageIn, DkPageLike,
                        Group, GroupIn, HttpClientLike, MediaRowIn, PbBankIn, PbGroupsIn, PbRowIn,
                        DaysIn, RadarIn, RecentRowIn, RecentSummaryIn, SnapshotIn, VoteGetIn,
                        XjExamIn, XjExamUrlIn, XjGroupIn, XjListIn, XjPageLike, XjRowIn, XjSignalsIn,
                        XjUrlIn, DkSegmentIn, PteQuestionIn, QuestionTextIn)


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
    write_text(WriteTextIn(path=path, text=x.text))


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
    write_text(WriteTextIn(path=OUT_PB_RAW_DIR / PB_RAW_CATS, text=r.text))
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
        write_text(WriteTextIn(path=OUT_PB_RAW_DIR / PB_RAW_POSTS_TPL.format(page=page),
                               text=r.text))
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
    if OUT_DK_BANK.exists():
        with OUT_DK_BANK.open(encoding=ENC_UTF8) as f:
            rows = rows + to_dk_index_rows(json.load(f))
    if OUT_XJ_BANK.exists():
        with OUT_XJ_BANK.open(encoding=ENC_UTF8) as f:
            rows = rows + to_xj_index_rows(json.load(f))
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
    """词表一轮:三库句库题型(WFD/RS)全部正文分词 → 停用词外的词频降序落盘。

    词不是题面表达,不受版权保护 —— 第一个可直接上产品的资产(高频考点词表)。
    2026-09-02 三库:duoink 接入(WFD/RS 全句在列表 te 格),分词与排名拆具名小函数(C901 14>12 同批清)。"""
    with OUT_BANK.open(encoding=ENC_UTF8) as f:
        yn = json.load(f)
    with OUT_PB_BANK.open(encoding=ENC_UTF8) as f:
        pb = json.load(f)
    sentences = w_yn_sentences_of(yn) + w_pb_sentences_of(pb)
    if OUT_DK_BANK.exists():
        with OUT_DK_BANK.open(encoding=ENC_UTF8) as f:
            sentences += w_dk_sentences_of(json.load(f))
    ranked = w_ranked_of(sentences)
    payload = {OUT_K_FETCHED: date.today().isoformat(), W_K_SENTENCES: len(sentences), W_K_WORDS: ranked}
    write_json(WriteJsonIn(path=OUT_WORDS, payload=payload, indent=JSON_INDENT))
    say(P_W_DONE_TPL.format(sentences=len(sentences), words=len(ranked), path=OUT_WORDS))


def w_yn_sentences_of(yn: dict) -> list:
    """ynwac 库 → 句库题型正文清单(组签名经 YN_SIG_TYPE 映射后取 WFD/RS)。"""
    out = []
    for g in yn[OUT_K_GROUPS]:
        if YN_SIG_TYPE.get(g[OUT_K_SIGNATURE], TYPE_UNKNOWN) in W_TYPES:
            for q in g[OUT_K_QUESTIONS]:
                out.append(tl_norm(str(q.get(K_TEXT))))
    return out


def w_pb_sentences_of(pb: dict) -> list:
    """ptebank 库 → 句库题型正文清单(题型从分类格逐题判)。"""
    out = []
    for g in pb[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            if pb_type_of(q[PB_R_CATS]) in W_TYPES:
                out.append(tl_norm(q[PB_K_CONTENT]))
    return out


def w_dk_sentences_of(dk: dict) -> list:
    """duoink 库 → 句库题型正文清单(组签名已是标准码;WFD/RS 全句在列表 te 格,空格跳过不造)。"""
    out = []
    for g in dk[OUT_K_GROUPS]:
        if g[OUT_K_SIGNATURE] not in W_TYPES:
            continue
        for q in g[OUT_K_QUESTIONS]:
            v = q.get(DK_K_TEXT)
            if isinstance(v, str) and len(v) > 0:
                out.append(tl_norm(v))
    return out


def w_ranked_of(sentences: list) -> dict:
    """正文清单 → 词频降序表(短词/停用词剔除,低频截断;同频按字母序稳定)。"""
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
    return ranked


# =========================================================================
# 11. 媒体资产收口(pb 图片 Core 筛下载 + 题目↔媒体映射)
# =========================================================================


def run_pb_images() -> None:
    """读 ptebank 库 → Core 帖收图片直链(缩略图变体弃)→ 下载到 raw/pte/ptebank/images/(幂等)。

    2026-09-01 Frank「继续」(照 run_pb_audio 形):图片大头在 TIPS 文章插图,
    Core 白名单筛后剩题干本体(DI 图等);单条失败计数留痕,不拖全轮。"""
    client = cast(HttpClientLike, make_client(HTTP_TIMEOUT_S))
    with OUT_PB_BANK.open(encoding=ENC_UTF8) as f:
        bank = json.load(f)
    urls = pb_image_urls_of(bank)
    if len(urls) == 0:
        say(P_PB_IMG_EMPTY)
        return
    OUT_PB_IMG_DIR.mkdir(parents=True, exist_ok=True)
    got = 0
    skip = 0
    fail = 0
    for u in urls:
        name = u.rsplit(URL_SLASH, 1)[-1]
        path = OUT_PB_IMG_DIR / name
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
    say(P_PB_IMG_TPL.format(got=got, skip=skip, fail=fail, total=len(urls), dir=OUT_PB_IMG_DIR))


def pb_image_urls_of(bank: dict) -> list:
    """ptebank 整库 → Core 帖内去重排序的图片直链清单(缩略图尺寸变体剔除)。"""
    urls = set()
    for g in bank[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            if pb_type_of(q[PB_R_CATS]) not in CORE_TYPES:
                continue
            for u in PB_IMG_RE.findall(q[PB_K_CONTENT]):
                if PB_THUMB_RE.search(u) is None:
                    urls.add(u)
    return sorted(urls)


def run_media() -> None:
    """媒体映射一轮:读两库 → 每条媒体 URL 一行(题 id/题型/种类/本地文件)→ 落 OUT_MEDIA。

    file=null 三种成因全留痕:ynwac 音频付费墙(api.ynwac.com 401 实撞)、下载失败/
    对方删档、非 Core 图不下 —— 消费端按 type × file 一眼分得清,不静默折「没有」。"""
    with OUT_BANK.open(encoding=ENC_UTF8) as f:
        yn = json.load(f)
    with OUT_PB_BANK.open(encoding=ENC_UTF8) as f:
        pb = json.load(f)
    rows = to_yn_media_rows(yn) + to_pb_media_rows(pb)
    if OUT_DK_BANK.exists():
        with OUT_DK_BANK.open(encoding=ENC_UTF8) as f:
            rows = rows + to_dk_media_rows(json.load(f))
    have = 0
    for r in rows:
        if r[M_K_FILE] is not None:
            have += 1
    payload = {OUT_K_FETCHED: date.today().isoformat(), IDX_K_ROWS: rows}
    write_json(WriteJsonIn(path=OUT_MEDIA, payload=payload, indent=JSON_INDENT))
    say(P_MEDIA_DONE_TPL.format(rows=len(rows), have=have, miss=len(rows) - have, path=OUT_MEDIA))


def to_yn_media_rows(bank: dict) -> list:
    """ynwac 整库 → 媒体映射行(DI 图按 basename 对上落盘位;音频付费墙未落盘 file=null)。"""
    rows = []
    for g in bank[OUT_K_GROUPS]:
        t = YN_SIG_TYPE.get(g[OUT_K_SIGNATURE], TYPE_UNKNOWN)
        for q in g[OUT_K_QUESTIONS]:
            img = q.get(K_IMAGE_URL)
            if isinstance(img, str) and len(img) > 0:
                name = img.rsplit(URL_SLASH, 1)[-1]
                rows.append(media_row_of(MediaRowIn(
                    source=SRC_YNWAC, qid=q.get(CH_K_ID), qtype=t, kind=KIND_IMAGE,
                    url=yn_abs_of(img), local=OUT_IMG_DIR / name)))
            au = q.get(K_AUDIO_URL_YN)
            if isinstance(au, str) and len(au) > 0:
                qid = q.get(CH_K_ID)
                rows.append(media_row_of(MediaRowIn(
                    source=SRC_YNWAC, qid=qid, qtype=t, kind=KIND_AUDIO,
                    url=yn_audio_url_of(qid), local=OUT_YN_AUDIO_DIR / yn_audio_name_of(qid))))
    return rows


def yn_abs_of(u: str) -> str:
    """ynwac 媒体地址绝对化(库内相对路径拼站点源;已绝对的原样)。"""
    if u.startswith(URL_SLASH):
        return SITE_ORIGIN + u
    return u


def to_pb_media_rows(bank: dict) -> list:
    """ptebank 整库 → 媒体映射行(音频全量对落盘位;图片同 Core 筛口径,非 Core 的 file=null)。"""
    rows = []
    for g in bank[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            t = pb_type_of(q[PB_R_CATS])
            for u in q[PB_R_AUDIO]:
                name = u.rsplit(URL_SLASH, 1)[-1]
                rows.append(media_row_of(MediaRowIn(
                    source=SRC_PTEBANK, qid=q[CH_K_ID], qtype=t, kind=KIND_AUDIO,
                    url=u, local=OUT_PB_AUDIO_DIR / name)))
            for u in PB_IMG_RE.findall(q[PB_K_CONTENT]):
                if PB_THUMB_RE.search(u) is not None:
                    continue
                name = u.rsplit(URL_SLASH, 1)[-1]
                rows.append(media_row_of(MediaRowIn(
                    source=SRC_PTEBANK, qid=q[CH_K_ID], qtype=t, kind=KIND_IMAGE,
                    url=u, local=OUT_PB_IMG_DIR / name)))
    return rows


def run_yn_audio() -> None:
    """读 ynwac 库 → 带音频的题按 id 拼公开静态地址 → 下载 mp3 到 raw/pte/ynwac/audio/(幂等)。

    2026-09-02 浏览器实测定案(照 run_pb_audio 形):`/sst/{id}.mp3` 匿名可下,无需登录;
    SPA 对不存在的文件回 200 壳页,content-type 非 audio/* 一律计 fail 不落盘。"""
    client = cast(HttpClientLike, make_client(HTTP_TIMEOUT_S))
    bank = load_bank()
    qids = yn_audio_qids_of(bank)
    if len(qids) == 0:
        say(P_YN_AUDIO_EMPTY)
        return
    OUT_YN_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    got = 0
    skip = 0
    fail = 0
    for qid in qids:
        path = OUT_YN_AUDIO_DIR / yn_audio_name_of(qid)
        if path.exists():
            skip += 1
            continue
        try:
            resp = client.get(yn_audio_url_of(qid))
        except Exception:  # noqa: BLE001 — 单条网络错跳过计数,不拖全轮
            fail += 1
            continue
        ct = resp.headers.get(HDR_CONTENT_TYPE)
        if resp.status_code != HTTP_OK or ct is None or not ct.startswith(CT_AUDIO_PREFIX):
            fail += 1
            continue
        path.write_bytes(resp.content)
        got += 1
        time.sleep(PB_ASSET_DELAY_S)
    say(P_YN_AUDIO_TPL.format(got=got, skip=skip, fail=fail, total=len(qids), dir=OUT_YN_AUDIO_DIR))


def yn_audio_qids_of(bank: dict) -> list:
    """ynwac 整库 → 带音频的题 id 清单(audioUrl 非空 = 这题有音频;地址本身是死路不用)。"""
    qids = []
    for g in bank[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            u = q.get(K_AUDIO_URL_YN)
            if isinstance(u, str) and len(u) > 0:
                qids.append(q.get(CH_K_ID))
    return sorted(qids, key=str)


def yn_audio_url_of(qid: object) -> str:
    """SST 题 id → 主站公开静态音频地址(2026-09-02 浏览器实测的播放器 currentSrc 形)。"""
    return SITE_ORIGIN + YN_AUDIO_TPL.format(id=qid)


def yn_audio_name_of(qid: object) -> str:
    """SST 题 id → 落盘文件名(与线上路径同名,媒体映射按此对上)。"""
    return YN_AUDIO_TPL.format(id=qid).rsplit(URL_SLASH, 1)[-1]


def to_dk_media_rows(bank: dict) -> list:
    """duoink 整库 → 媒体映射行(题图按 basename 对落盘位;音频是 TTS 无实体,不出行)。"""
    rows = []
    for g in bank[OUT_K_GROUPS]:
        t = g[OUT_K_SIGNATURE]
        for q in g[OUT_K_QUESTIONS]:
            for u in q.get(DK_R_IMAGES, []):
                name = u.rsplit(URL_SLASH, 1)[-1]
                rows.append(media_row_of(MediaRowIn(
                    source=SRC_DUOINK, qid=q[DK_K_ID], qtype=t, kind=KIND_IMAGE,
                    url=u, local=OUT_DK_IMG_DIR / name)))
    return rows


def media_row_of(x: MediaRowIn) -> dict:
    """一条媒体 → 映射行(落盘现状定 file:存在 = 相对 data/raw/pte/ 的 POSIX 路径,否则 null)。"""
    file = None
    if x.local.exists():
        file = x.local.relative_to(RAW_PTE).as_posix()
    return {
        IDX_K_SOURCE: x.source,
        CH_K_ID: x.qid,
        IDX_K_TYPE: x.qtype,
        M_K_KIND: x.kind,
        M_K_URL: x.url,
        M_K_FILE: file,
    }


# =========================================================================
# 12. duoink 第三源(登录态浏览器读渲染态:Vuex 列表 → 题页正文 → 装库雷达)
# =========================================================================


def run_dk_lists() -> None:
    """列表步:逐 Core 题型开列表页 → 读 Vuex 内存态 items → 原样落 raw/pte/duoink/list-<PART>.json。

    2026-09-02 立(constants §13 定案):登录态住统一 profile;全部题型都空 = 登录态丢,当场红。
    无 playwright 的机器(容器)跳过不报错 —— 渲染态抓取只在装了浏览器的机器跑。"""
    if dk_browser_ok() is False:
        say(P_DK_NO_BROWSER)
        return
    from playwright.sync_api import sync_playwright
    OUT_DK_RAW_DIR.mkdir(parents=True, exist_ok=True)
    total = 0
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(str(PROFILE_DIR), headless=False)
        page = cast(DkPageLike, dk_first_page(ctx))
        for part in DK_PARTS:
            items = dk_list_of(DkPageIn(page=page, part=part))
            payload = {OUT_K_SOURCE: DK_SOURCE, OUT_K_FETCHED: date.today().isoformat(),
                       DK_R_PART: part, OUT_K_QUESTIONS: items}
            write_json(WriteJsonIn(path=OUT_DK_RAW_DIR / DK_RAW_LIST_TPL.format(part=part),
                                   payload=payload, indent=JSON_INDENT))
            say(P_DK_LIST_TPL.format(part=part, n=len(items)))
            total += len(items)
        ctx.close()
    if total == 0:
        raise ValueError(P_DK_LOGIN_LOST)
    say(P_DK_LISTS_DONE_TPL.format(parts=len(DK_PARTS), total=total, dir=OUT_DK_RAW_DIR))


def dk_browser_ok() -> bool:
    """playwright 可导入即 True(缺席是预期形态:容器不装浏览器)。"""
    try:
        import playwright.sync_api  # noqa: F401 — 只探可用性
    except ImportError:
        return False
    return True


def dk_first_page(ctx: object) -> object:
    """持久上下文的首页(persistent context 自带一页;没有就新开)。外部库形状,装配点 cast 收窄。"""
    pages = getattr(ctx, "pages")
    if isinstance(pages, list) and len(pages) > 0:
        return pages[0]
    return getattr(ctx, "new_page")()


def dk_list_of(x: DkPageIn) -> list:
    """一个题型列表页 → Vuex items 原样清单(非 list 视为空,由上层零基线防线判)。"""
    x.page.goto(DK_SOURCE + DK_LIST_TPL.format(part=x.part), wait_until=DK_WAIT_UNTIL, timeout=DK_NAV_TIMEOUT_MS)
    time.sleep(DK_PAGE_WAIT_S)
    items = x.page.evaluate(DK_STORE_JS.replace(DK_PART_TOKEN, x.part))
    if isinstance(items, list):
        return items
    return []


def run_dk_entries() -> None:
    """题页步:读各题型列表 → 非纯文本题型逐题开题页(已存跳过,幂等断续)→ 展开折叠 → 落 entries/<id>.json;
    题图公开直链顺手下载到 images/。单题失败计数留痕不拖全轮。"""
    if dk_browser_ok() is False:
        say(P_DK_NO_BROWSER)
        return
    from playwright.sync_api import sync_playwright
    OUT_DK_ENTRIES_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DK_IMG_DIR.mkdir(parents=True, exist_ok=True)
    client = cast(HttpClientLike, make_client(HTTP_TIMEOUT_S))
    got = 0
    skip = 0
    fail = 0
    imgs = 0
    streak = 0
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(str(PROFILE_DIR), headless=False)
        page = cast(DkPageLike, dk_first_page(ctx))
        for part in DK_PARTS:
            if part in DK_TEXT_PARTS or streak >= DK_BLOCK_ABORT_MAX:
                continue
            for item in dk_list_items_of(part):
                eid = str(item[DK_K_ID])
                path = OUT_DK_ENTRIES_DIR / DK_ENTRY_FILE_TPL.format(id=eid)
                if path.exists():
                    skip += 1
                    continue
                try:
                    entry = dk_entry_of(DkEntryIn(page=page, part=part, eid=eid))
                except Exception:  # noqa: BLE001 — 单题导航/渲染/验证错跳过计数,不拖全轮
                    fail += 1
                    streak += 1
                    if streak >= DK_BLOCK_ABORT_MAX:
                        say(P_DK_BLOCK_ABORT.format(n=streak))
                        break
                    continue
                streak = 0
                write_json(WriteJsonIn(path=path, payload=entry, indent=JSON_INDENT))
                got += 1
                imgs += dk_images_fetch(DkImagesIn(client=client, urls=entry[DK_R_IMAGES]))
                time.sleep(DK_ENTRY_DELAY_S)
        ctx.close()
    say(P_DK_ENTRIES_TPL.format(got=got, skip=skip, fail=fail, imgs=imgs, dir=OUT_DK_ENTRIES_DIR))


def dk_list_items_of(part: str) -> list:
    """读回一个题型的列表落盘(列表步产物;文件不在 = 列表步没跑,当场抛由 main 留痕)。"""
    with (OUT_DK_RAW_DIR / DK_RAW_LIST_TPL.format(part=part)).open(encoding=ENC_UTF8) as f:
        return json.load(f)[OUT_K_QUESTIONS]


def dk_entry_of(x: DkEntryIn) -> dict:
    """一道题的题页 → {id, part, content, images}:导航 → 等渲染 → 点开折叠 → 原文进 crawl 层 → 倒文本切正文段 + 题图。"""
    url = DK_SOURCE + DK_ENTRY_TPL.format(part=x.part, id=x.eid)
    x.page.goto(url, wait_until=DK_WAIT_UNTIL, timeout=DK_NAV_TIMEOUT_MS)
    time.sleep(DK_ENTRY_WAIT_S)
    if dk_blocked(x.page):
        say(P_DK_BLOCK_WAIT)
        if dk_wait_unblocked(x.page) is False:
            say(P_DK_BLOCK_TIMEOUT)
            raise ValueError(P_DK_BLOCK_TIMEOUT)
        say(P_DK_BLOCK_OK)
    for _ in range(DK_SHOW_ROUNDS_MAX):
        opened = x.page.evaluate(DK_SHOW_JS)
        time.sleep(DK_SHOW_WAIT_S)
        if opened == 0:
            break
    dump = x.page.evaluate(DK_ENTRY_JS)
    text = ""
    html = ""
    title = ""
    urls = []
    if isinstance(dump, dict):
        text = str(dump.get(DK_J_TEXT, ""))
        html = str(dump.get(DK_J_HTML, ""))
        title = str(dump.get(DK_J_TITLE, ""))
        raw = dump.get(DK_J_IMGS, [])
        if isinstance(raw, list):
            urls = dk_images_of(raw)
    put_cached_page(CachePutIn(slug=DK_CRAWL_SLUG, url=url, html=html, title=title))
    return {DK_K_ID: x.eid, DK_R_PART: x.part, DK_R_CONTENT: dk_content_of(text), DK_R_IMAGES: urls}


def dk_blocked(page: DkPageLike) -> bool:
    """题页当前是不是验证壳(极验拦截判词在,或正文起点标记不在 = 没渲染出题)。
    2026-09-02 实撞:249 页验证壳被当正文存档 —— 照 crawl 域「challenge 页绝不存档」立此门。"""
    s = str(page.evaluate(DK_BODY_TEXT_JS))
    return DK_BLOCK_MARK in s or DK_TEXT_START not in s


def dk_wait_unblocked(page: DkPageLike) -> bool:
    """等人工在有头窗里完成验证:轮询到正文出现返回 True;到 DK_BLOCK_WAIT_S 仍挡着返回 False。"""
    waited = 0.0
    while waited < DK_BLOCK_WAIT_S:
        time.sleep(DK_BLOCK_POLL_S)
        waited += DK_BLOCK_POLL_S
        if dk_blocked(page) is False:
            return True
    return False


def dk_content_of(text: str) -> str:
    """整页文本 → CONTENT…START 之间的正文;标记缺失时整页留痕(不静默裁空)。"""
    i = text.find(DK_TEXT_START)
    if i < 0:
        return text
    j = text.find(DK_TEXT_END, i)
    if j < 0:
        return text[i:]
    return text[i:j]


def dk_images_of(urls: list) -> list:
    """题页图片地址 → 剔除头像后的题图清单(去重保序)。"""
    out = []
    for u in urls:
        s = str(u)
        if any(m in s for m in DK_AVATAR_MARKS):
            continue
        if s not in out:
            out.append(s)
    return out


def dk_images_fetch(x: DkImagesIn) -> int:
    """题图公开直链下载到 images/(已存跳过;非 200 留给 media 映射的 file=null 说话)→ 新下张数。"""
    n = 0
    for u in x.urls:
        path = OUT_DK_IMG_DIR / u.rsplit(URL_SLASH, 1)[-1]
        if path.exists():
            continue
        try:
            resp = x.client.get(u)
        except Exception:  # noqa: BLE001 — 单图网络错当未下,不拖题页步
            resp = None
        if resp is None or resp.status_code != HTTP_OK:
            continue
        path.write_bytes(resp.content)
        n += 1
    return n


def run_duoink() -> None:
    """装库步:列表 + 题页产物 → 按题型分组(签名 = 标准题型码)→ 雷达 → 落 OUT_DK_BANK。

    题页缺席的题只带列表元数据(content 不造);列表文件不在 = 列表步没跑,open 抛出留痕。"""
    groups = []
    total = 0
    for part in DK_PARTS:
        questions = []
        for item in dk_list_items_of(part):
            questions.append(dk_question_of(item))
        groups.append({OUT_K_LABEL: part, OUT_K_SIGNATURE: DK_PART_TYPE[part],
                       OUT_K_COUNT: len(questions), OUT_K_QUESTIONS: questions})
        total += len(questions)
    payload = {OUT_K_SOURCE: DK_SOURCE, OUT_K_FETCHED: date.today().isoformat(),
               OUT_K_TOTAL: total, OUT_K_GROUPS: groups}
    OUT_DK_BANK.parent.mkdir(parents=True, exist_ok=True)
    radar(RadarIn(cur_payload=payload, bank=OUT_DK_BANK, prev=OUT_DK_PREV, changes=OUT_DK_CHANGES))
    write_json(WriteJsonIn(path=OUT_DK_BANK, payload=payload, indent=JSON_INDENT))
    say(P_DK_DONE_TPL.format(groups=len(groups), total=total, path=OUT_DK_BANK))


def dk_question_of(item: dict) -> dict:
    """列表项 + 题页产物(若有)→ 库内题行(列表格原样保留,题页正文/题图并入)。"""
    q = dict(item)
    path = OUT_DK_ENTRIES_DIR / DK_ENTRY_FILE_TPL.format(id=item[DK_K_ID])
    if path.exists():
        with path.open(encoding=ENC_UTF8) as f:
            entry = json.load(f)
        q[DK_R_CONTENT] = entry[DK_R_CONTENT]
        q[DK_R_IMAGES] = entry[DK_R_IMAGES]
    return q


def to_dk_index_rows(bank: dict) -> list:
    """duoink 整库 → 索引行清单(组签名已是标准码;热度 3 = hot 记 frequent 押题信号)。"""
    rows = []
    for g in bank[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            flags = []
            if q.get(DK_K_FREQ) == DK_FREQ_HOT:
                flags.append(FLAG_FREQUENT)
            rows.append({
                IDX_K_TYPE: g[OUT_K_SIGNATURE],
                IDX_K_SOURCE: SRC_DUOINK,
                CH_K_ID: q[DK_K_ID],
                K_TITLE: dk_title_of(q),
                IDX_K_FLAGS: flags,
                IDX_K_AUDIO: False,
            })
    return rows


def dk_title_of(q: dict) -> str:
    """列表项 → 索引标题(te → tt → q 首个非空,截 SNIPPET_LEN;全空留空串不造)。"""
    for k in DK_TITLE_KEYS:
        v = q.get(k)
        if isinstance(v, str) and len(v) > 0:
            return v[:SNIPPET_LEN]
    return ""


# =========================================================================
# 13. 「最近考了」组织层(三源回忆信号 → 每题四格 + 分源分型窗口盘点)
# =========================================================================


def run_recent() -> None:
    """最近考了一轮:读索引 → 三源信号各成表 → 逐行贴 seen/seen_n/freq/votes → 分源分型窗口盘点 → 落 OUT_RECENT。

    2026-09-02 立(Frank「最主要的是每个来源哪些题最近考了」):信号缺席四格 null 不造;
    某源产物不在(votes/timeline/duoink 未跑)= 该源全 null,不当红。"""
    with OUT_INDEX.open(encoding=ENC_UTF8) as f:
        idx = json.load(f)
    today = date.today()
    signals: dict[tuple, dict] = {}
    signals.update(dk_signals_of())
    signals.update(yn_signals_of(today))
    signals.update(pb_signals_of())
    signals.update(xj_signals_of(XjSignalsIn(today=today)))
    rows = []
    for r in idx[IDX_K_ROWS]:
        key = (r[IDX_K_SOURCE], r[IDX_K_TYPE], str(r[CH_K_ID]))
        rows.append(recent_row_of(RecentRowIn(row=r, signal=signals.get(key))))
    summary = recent_summary_of(RecentSummaryIn(rows=rows, today=today))
    payload = {OUT_K_FETCHED: today.isoformat(), R_K_SUMMARY: summary, IDX_K_ROWS: rows}
    write_json(WriteJsonIn(path=OUT_RECENT, payload=payload, indent=JSON_INDENT))
    seen = 0
    d30 = 0
    for r in rows:
        if r[R_K_SEEN] is not None:
            seen += 1
            if days_since(DaysIn(seen=r[R_K_SEEN], today=today)) <= RECENT_WINDOWS_D[0]:
                d30 += 1
    say(P_RECENT_DONE_TPL.format(rows=len(rows), seen=seen, d30=d30, path=OUT_RECENT))


def dk_signals_of() -> dict:
    """duoink 整库 → {(源,型,id): 信号}(seen = e 截日期;freq = f_c;库不在 = 空表)。"""
    out = {}
    if not OUT_DK_BANK.exists():
        return out
    with OUT_DK_BANK.open(encoding=ENC_UTF8) as f:
        bank = json.load(f)
    for g in bank[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            e = q.get(DK_K_SEEN)
            seen = None
            if isinstance(e, str) and len(e) >= DATE_LEN:
                seen = e[:DATE_LEN]
            n = 0
            if seen is not None:
                n = 1
            freq = q.get(DK_K_FREQ_CORE)
            if not isinstance(freq, int):
                freq = None
            out[(SRC_DUOINK, g[OUT_K_SIGNATURE], str(q[DK_K_ID]))] = {
                R_K_SEEN: seen, R_K_SEEN_N: n, R_K_FREQ: freq, R_K_VOTES: None}
    return out


def yn_signals_of(today: date) -> dict:
    """ynwac votes.json → {(源,型,id): 信号}(seen = 评论考试记录最晚日期;votes = 考过票数;文件不在 = 空表)。

    未来日期剔除(2026-09-02 实撞:用户把预约考试日也写成「考试记录」,出现 2027-07-14 之类;
    今天之后的不是「考过」,不进 seen 也不计数)。"""
    out = {}
    if not OUT_VOTES.exists():
        return out
    with OUT_VOTES.open(encoding=ENC_UTF8) as f:
        v = json.load(f)
    cutoff = today.isoformat()
    for code, rows in v[V_K_TYPES].items():
        t = YN_VOTE_TYPE.get(code, TYPE_UNKNOWN)
        for r in rows:
            dates = [d for d in exam_dates_of(r[V_K_COMMENTS]) if d <= cutoff]
            seen = None
            if len(dates) > 0:
                seen = max(dates)
            votes = None
            tags = r[V_K_TAGS]
            if isinstance(tags, dict) and isinstance(tags.get(V_T_COUNT), int):
                votes = tags[V_T_COUNT]
            out[(SRC_YNWAC, t, str(r[V_K_ID]))] = {
                R_K_SEEN: seen, R_K_SEEN_N: len(dates), R_K_FREQ: None, R_K_VOTES: votes}
    return out


def exam_dates_of(comments: object) -> list:
    """一题的评论响应 → 正文与回复里全部「考试记录」日期(YYYY-MM-DD;形状不对 = 空)。"""
    dates = []
    if not isinstance(comments, dict):
        return dates
    lst = comments.get(V_C_CONTENT)
    if not isinstance(lst, list):
        return dates
    for c in lst:
        if not isinstance(c, dict):
            continue
        for m in EXAM_DATE_RE.finditer(str(c.get(V_C_CONTENT, ""))):
            dates.append(m.group(1))
        replies = c.get(V_C_REPLIES)
        if isinstance(replies, list):
            for rp in replies:
                if isinstance(rp, dict):
                    for m in EXAM_DATE_RE.finditer(str(rp.get(V_C_CONTENT, ""))):
                        dates.append(m.group(1))
    return dates


def pb_signals_of() -> dict:
    """ptebank timeline.json → {(源,型,id): 信号}(seen = 存档引用最晚日期;文件不在 = 空表)。"""
    out = {}
    if not OUT_TIMELINE.exists():
        return out
    with OUT_TIMELINE.open(encoding=ENC_UTF8) as f:
        tl = json.load(f)
    for r in tl[IDX_K_ROWS]:
        dates = r[TL_K_DATES]
        seen = None
        if len(dates) > 0:
            seen = max(dates)
        out[(r[IDX_K_SOURCE], r[IDX_K_TYPE], str(r[CH_K_ID]))] = {
            R_K_SEEN: seen, R_K_SEEN_N: len(dates), R_K_FREQ: None, R_K_VOTES: None}
    return out


def recent_row_of(x: RecentRowIn) -> dict:
    """索引行 + 信号 → 带四格的行(信号缺席四格全 null)。"""
    row = dict(x.row)
    sig = x.signal
    if sig is None:
        sig = {R_K_SEEN: None, R_K_SEEN_N: 0, R_K_FREQ: None, R_K_VOTES: None}
    row[R_K_SEEN] = sig[R_K_SEEN]
    row[R_K_SEEN_N] = sig[R_K_SEEN_N]
    row[R_K_FREQ] = sig[R_K_FREQ]
    row[R_K_VOTES] = sig[R_K_VOTES]
    return row


def recent_summary_of(x: RecentSummaryIn) -> dict:
    """全部行 → {源: {型: {total, seen, last, d30, d90, d180}}}(窗口按 today 算)。"""
    out = {}
    for r in x.rows:
        src = r[IDX_K_SOURCE]
        t = r[IDX_K_TYPE]
        if src not in out:
            out[src] = {}
        if t not in out[src]:
            cell = {R_S_TOTAL: 0, R_S_SEEN: 0, R_S_LAST: None}
            for d in RECENT_WINDOWS_D:
                cell[R_S_WIN_TPL.format(days=d)] = 0
            out[src][t] = cell
        cell = out[src][t]
        cell[R_S_TOTAL] += 1
        seen = r[R_K_SEEN]
        if seen is None:
            continue
        cell[R_S_SEEN] += 1
        if cell[R_S_LAST] is None or seen > cell[R_S_LAST]:
            cell[R_S_LAST] = seen
        age = days_since(DaysIn(seen=seen, today=x.today))
        for d in RECENT_WINDOWS_D:
            if age <= d:
                cell[R_S_WIN_TPL.format(days=d)] += 1
    return out


def days_since(x: DaysIn) -> int:
    """回忆日期 → 距 today 的天数(未来日期算 0;日期串坏 = 极大值,等于「不在任何窗口」不静默算进)。"""
    try:
        d = date.fromisoformat(x.seen)
    except ValueError:
        return DAYS_BAD
    return max(0, (x.today - d).days)


# =========================================================================
# 14. 猩际第四源(登录态浏览器页内 fetch 明文 API:预测清单沿 next_num 链 → 装库雷达 → 索引/信号)
# =========================================================================


def run_xj_lists() -> None:
    """列表步:逐 Core 题型开 /practice/<model>(站点自跳到预测清单首题)→ 截页面自发的 single_num_v2 地址
    → 页内 fetch 沿 next_num 走完清单 → 明文行原样落 raw/pte/ptexj/predict-<model>.json。

    2026-09-03 立(constants §15 定案):题号不在明文里,只能从跳转地址读首题、沿链拿其余;
    全部题型都空 = 登录态丢,当场红。无 playwright 的机器跳过不报错。
    浏览器走 crawl 域 get_browser_page(async 单例,带反自毁补丁;§15 ⑥),所以本步是 asyncio 壳。"""
    if dk_browser_ok() is False:
        say(P_XJ_NO_BROWSER)
        return
    asyncio.run(xj_lists_async())


async def xj_lists_async() -> None:
    """列表步主体:crawl 浏览器 → 逐题型沿链 → 落盘;收摊在 finally(断网/断链都不留窗)。"""
    page = await get_browser_page()
    if page is None:
        say(P_XJ_NO_BROWSER)
        return
    OUT_XJ_RAW_DIR.mkdir(parents=True, exist_ok=True)
    xp = cast(XjPageLike, page)
    urls: list = []
    xp.on("request", make_xj_url_sink(urls))
    total = 0
    try:
        for model in XJ_MODELS:
            urls.clear()
            rows = await xj_list_of(XjListIn(page=xp, model=model, urls=urls))
            payload = {OUT_K_SOURCE: XJ_SOURCE, OUT_K_FETCHED: date.today().isoformat(),
                       XJ_K_MODEL: model, XJ_K_TAG: XJ_TAG_PREDICT, OUT_K_QUESTIONS: rows}
            write_json(WriteJsonIn(path=OUT_XJ_RAW_DIR / XJ_RAW_LIST_TPL.format(model=model),
                                   payload=payload, indent=JSON_INDENT))
            total += len(rows)
    finally:
        await close_browser()
    if total == 0:
        raise ValueError(P_XJ_LOGIN_LOST)
    say(P_XJ_LISTS_DONE_TPL.format(models=len(XJ_MODELS), total=total, dir=OUT_XJ_RAW_DIR))


def make_xj_url_sink(urls: list) -> object:
    """request 监听工厂:把页面自发的 single_num_v2 请求地址收进 urls(外部库回调接缝,形状由 playwright 定)。"""
    def sink(req: object) -> None:
        u = str(getattr(req, "url", ""))
        if XJ_API_SINGLE in u:
            urls.append(u)
    return sink


async def xj_list_of(x: XjListIn) -> list:
    """一个题型 → 预测清单明文行(开页 → 截接口地址 + 读首题号 → 沿链 fetch;截不到 / 没跳到题 = 空清单留痕)。"""
    await x.page.goto(XJ_SOURCE + XJ_PRACTICE_TPL.format(model=x.model), wait_until=XJ_WAIT_UNTIL,
                      timeout=XJ_NAV_TIMEOUT_MS)
    await asyncio.sleep(XJ_PAGE_WAIT_S)
    m = XJ_NUM_RE.search(str(x.page.url))
    if len(x.urls) == 0 or m is None:
        say(P_XJ_NO_SEED_TPL.format(model=x.model, url=str(x.page.url), n=len(x.urls)))
        return []
    seed = x.urls[0]
    num: int | None = int(m.group(1))
    rows: list = []
    count = 0
    while num is not None and len(rows) < XJ_CHAIN_MAX:
        resp = await x.page.evaluate(XJ_FETCH_JS, xj_url_with_num(XjUrlIn(seed=seed, num=num)))
        row = xj_row_of(XjRowIn(num=num, resp=resp))
        if row is None:
            say(P_XJ_BAD_SHAPE_TPL.format(model=x.model, num=num))
            break
        rows.append(row)
        count = row[XJ_A_COUNT]
        num = row[XJ_A_NEXT]
        await asyncio.sleep(XJ_CALL_DELAY_S)
    say(P_XJ_LIST_TPL.format(model=x.model, n=len(rows), count=count))
    return rows


def xj_url_with_num(x: XjUrlIn) -> str:
    """接口地址只换 num 参数(其余鉴权/过滤参数原样)。"""
    p = urlparse(x.seed)
    q = []
    for k, v in parse_qsl(p.query, keep_blank_values=True):
        if k == XJ_P_NUM:
            q.append((k, str(x.num)))
        else:
            q.append((k, v))
    return urlunparse((p.scheme, p.netloc, p.path, p.params, urlencode(q), p.fragment))


def xj_row_of(x: XjRowIn) -> dict | None:
    """一次响应 → 明文行 {id, exam_count, current_count, count, prev_num, next_num}(密文 item 不存;
    缺 data / item_addition = None,不猜)。"""
    if not isinstance(x.resp, dict):
        return None
    data = x.resp.get(XJ_A_DATA)
    if not isinstance(data, dict):
        return None
    add = data.get(XJ_A_ADDITION)
    if not isinstance(add, dict):
        return None
    exam_count = add.get(XJ_A_EXAM_COUNT)
    if not isinstance(exam_count, int):
        exam_count = None
    nxt = data.get(XJ_A_NEXT)
    if not isinstance(nxt, int):
        nxt = None
    count = data.get(XJ_A_COUNT)
    if not isinstance(count, int):
        count = 0
    return {CH_K_ID: x.num, XJ_A_EXAM_COUNT: exam_count, XJ_A_CURRENT: data.get(XJ_A_CURRENT),
            XJ_A_COUNT: count, XJ_A_PREV: data.get(XJ_A_PREV), XJ_A_NEXT: nxt}


def run_xj_exam() -> None:
    """流步:全站「确认考过」流增量拉取 → 去用户化条目并入 raw/pte/ptexj/exam-comments.json。

    2026-09-03 立(constants §15 流段定案):地址从练习页自发的 comments/exam 请求截取,去 commentable_id /
    filter 成全站流;首轮拉到 XJ_EXAM_DEPTH_D 天前,此后追到上次最大 id 即停;截不到地址当场红。"""
    if dk_browser_ok() is False:
        say(P_XJ_NO_BROWSER)
        return
    asyncio.run(xj_exam_async())


async def xj_exam_async() -> None:
    """流步主体:crawl 浏览器开一页练习页取地址 → 翻页 → 合并落盘;收摊在 finally。"""
    page = await get_browser_page()
    if page is None:
        say(P_XJ_NO_BROWSER)
        return
    xp = cast(XjPageLike, page)
    urls: list = []
    xp.on("request", make_xj_exam_url_sink(urls))
    today = date.today()
    old = xj_exam_rows_of()
    known_id = 0
    for r in old:
        if r[XJ_A_ID] > known_id:
            known_id = r[XJ_A_ID]
    try:
        await xp.goto(XJ_SOURCE + XJ_PRACTICE_TPL.format(model=XJ_MODELS[0]), wait_until=XJ_WAIT_UNTIL,
                      timeout=XJ_NAV_TIMEOUT_MS)
        await asyncio.sleep(XJ_PAGE_WAIT_S)
        if len(urls) == 0:
            raise ValueError(P_XJ_EXAM_NO_SEED)
        cutoff = (today - timedelta(days=XJ_EXAM_DEPTH_D)).isoformat()
        new = await xj_exam_pull(XjExamIn(page=xp, seed=urls[0], known_id=known_id, cutoff=cutoff))
    finally:
        await close_browser()
    keep_from = (today - timedelta(days=XJ_EXAM_KEEP_D)).isoformat()
    merged: dict = {}
    for r in old + new:
        if r[XJ_A_CREATED][:DATE_LEN] >= keep_from:
            merged[r[XJ_A_ID]] = r
    rows = sorted(merged.values(), key=xj_exam_id_of, reverse=True)
    OUT_XJ_RAW_DIR.mkdir(parents=True, exist_ok=True)
    write_json(WriteJsonIn(path=OUT_XJ_EXAM, payload={OUT_K_SOURCE: XJ_SOURCE, OUT_K_FETCHED: today.isoformat(),
                                                      XJ_A_COMMENTS: rows}, indent=JSON_INDENT))
    say(P_XJ_EXAM_DONE_TPL.format(new=len(new), total=len(rows), keep=XJ_EXAM_KEEP_D, path=OUT_XJ_EXAM))


def make_xj_exam_url_sink(urls: list) -> object:
    """request 监听工厂:把页面自发的 comments/exam 请求地址收进 urls(外部库回调接缝)。"""
    def sink(req: object) -> None:
        u = str(getattr(req, "url", ""))
        if XJ_API_EXAM in u:
            urls.append(u)
    return sink


def xj_exam_rows_of() -> list:
    """读回 raw 流文件的条目(文件不在 = 首轮,空清单)。"""
    if not OUT_XJ_EXAM.exists():
        return []
    with OUT_XJ_EXAM.open(encoding=ENC_UTF8) as f:
        return json.load(f)[XJ_A_COMMENTS]


def xj_exam_id_of(r: dict) -> int:
    """条目排序键(评论 id)。"""
    return r[XJ_A_ID]


async def xj_exam_pull(x: XjExamIn) -> list:
    """从第 1 页翻到停机线:每页 Core 条目收成去用户化行;停机判据按整页看且要连续 XJ_EXAM_STOP_STREAK 页
    (流不严格按时间排序,整页旧记录会混在中间 —— 单页作数就停早,首跑实撞)。"""
    rows: list = []
    page_no = 1
    why = XJ_STOP_MAX
    known_streak = 0
    depth_streak = 0
    while page_no <= XJ_EXAM_PAGES_MAX:
        resp = await x.page.evaluate(XJ_FETCH_JS, xj_exam_url_of(XjExamUrlIn(seed=x.seed, page=page_no)))
        items = xj_exam_items_of(resp)
        if len(items) == 0:
            why = XJ_STOP_EMPTY
            break
        ids = []
        newest = ""
        for it in items:
            ids.append(int(it.get(XJ_A_ID, 0)))
            created = str(it.get(XJ_A_CREATED, ""))[:DATE_LEN]
            if created > newest:
                newest = created
            row = xj_exam_row_of(it)
            if row is not None and row[XJ_A_ID] > x.known_id:
                rows.append(row)
        if max(ids) <= x.known_id:
            known_streak += 1
        else:
            known_streak = 0
        if newest < x.cutoff:
            depth_streak += 1
        else:
            depth_streak = 0
        if known_streak >= XJ_EXAM_STOP_STREAK:
            why = XJ_STOP_KNOWN
            break
        if depth_streak >= XJ_EXAM_STOP_STREAK:
            why = XJ_STOP_DEPTH
            break
        if page_no % XJ_EXAM_LOG_EVERY == 0:
            say(P_XJ_EXAM_PAGE_TPL.format(page=page_no, n=len(rows), oldest=newest))
        if page_no >= xj_exam_total_pages_of(resp):
            why = XJ_STOP_END
            break
        page_no += 1
        await asyncio.sleep(XJ_EXAM_DELAY_S)
    say(P_XJ_EXAM_STOP_TPL.format(page=page_no, why=why))
    return rows


def xj_exam_url_of(x: XjExamUrlIn) -> str:
    """截到的地址 → 全站流第 N 页地址(去 commentable_id / filter,换 page / page_size,其余原样)。"""
    p = urlparse(x.seed)
    q = []
    for k, v in parse_qsl(p.query, keep_blank_values=True):
        if k in XJ_EXAM_DROP_PARAMS or k == XJ_P_PAGE or k == XJ_P_PAGE_SIZE:
            continue
        q.append((k, v))
    q.append((XJ_P_PAGE, str(x.page)))
    q.append((XJ_P_PAGE_SIZE, str(XJ_EXAM_PAGE_SIZE)))
    return urlunparse((p.scheme, p.netloc, p.path, p.params, urlencode(q), p.fragment))


def xj_exam_items_of(resp: object) -> list:
    """流响应 → 条目清单(形状不对 = 空,由上层当空页停)。"""
    if not isinstance(resp, dict):
        return []
    data = resp.get(XJ_A_DATA)
    if not isinstance(data, dict):
        return []
    items = data.get(XJ_A_COMMENTS)
    if not isinstance(items, list):
        return []
    return items


def xj_exam_total_pages_of(resp: object) -> int:
    """流响应 → 总页数(缺 = 极大,交给上限守)。"""
    if isinstance(resp, dict):
        data = resp.get(XJ_A_DATA)
        if isinstance(data, dict):
            info = data.get(XJ_A_PAGE_INFO)
            if isinstance(info, dict) and isinstance(info.get(XJ_A_TOTAL_PAGES), int):
                return info[XJ_A_TOTAL_PAGES]
    return XJ_EXAM_PAGES_MAX


def xj_exam_row_of(it: dict) -> dict | None:
    """一条流条目 → 去用户化行 {id, model, num, exam_date, created_at};非 Core 题型 / 缺格 = None(不收)。"""
    c = it.get(XJ_A_COMMENTABLE)
    if not isinstance(c, dict):
        return None
    model = c.get(XJ_A_MODEL)
    num = c.get(XJ_A_NUM)
    cid = it.get(XJ_A_ID)
    exam_date = it.get(XJ_A_EXAM_DATE)
    created = it.get(XJ_A_CREATED)
    if model not in XJ_MODEL_TYPE or not isinstance(num, int) or not isinstance(cid, int):
        return None
    if not isinstance(exam_date, str) or len(exam_date) != DATE_LEN or not isinstance(created, str):
        return None
    return {XJ_A_ID: cid, XJ_A_MODEL: model, XJ_A_NUM: num, XJ_A_EXAM_DATE: exam_date,
            XJ_A_CREATED: created[:DATE_LEN]}


def run_ptexj() -> None:
    """装库步:19 份预测清单 ∪ 考试记录流 → 按题型分组(签名 = 标准题型码;预测题带 predicted,
    每题挂 exam_dates)→ 雷达(题进出 = 进/出预测清单或近期考过)→ 落 OUT_XJ_BANK。
    清单文件不在 = 列表步没跑,open 抛出留痕;流文件不在 = 只有预测清单(exam_dates 全空)。"""
    dates = xj_dates_by_model_of()
    groups = []
    total = 0
    predicted = 0
    for model in XJ_MODELS:
        with (OUT_XJ_RAW_DIR / XJ_RAW_LIST_TPL.format(model=model)).open(encoding=ENC_UTF8) as f:
            plist = json.load(f)[OUT_K_QUESTIONS]
        questions = xj_group_of(XjGroupIn(model=model, predicted=plist, dates=dates.get(model, {})))
        groups.append({OUT_K_LABEL: model, OUT_K_SIGNATURE: XJ_MODEL_TYPE[model],
                       OUT_K_COUNT: len(questions), OUT_K_QUESTIONS: questions})
        total += len(questions)
        predicted += len(plist)
    payload = {OUT_K_SOURCE: XJ_SOURCE, OUT_K_FETCHED: date.today().isoformat(),
               XJ_K_TAG: XJ_TAG_PREDICT, OUT_K_TOTAL: total, OUT_K_GROUPS: groups}
    OUT_XJ_BANK.parent.mkdir(parents=True, exist_ok=True)
    radar(RadarIn(cur_payload=payload, bank=OUT_XJ_BANK, prev=OUT_XJ_PREV, changes=OUT_XJ_CHANGES))
    write_json(WriteJsonIn(path=OUT_XJ_BANK, payload=payload, indent=JSON_INDENT))
    say(P_XJ_DONE_TPL.format(groups=len(groups), total=total, predicted=predicted,
                             examined=total - predicted, path=OUT_XJ_BANK))


def xj_dates_by_model_of() -> dict:
    """raw 流 → {model: {题号: [exam_date …]}}(文件不在 = 空表)。"""
    out: dict = {}
    for r in xj_exam_rows_of():
        by_num = out.setdefault(r[XJ_A_MODEL], {})
        by_num.setdefault(r[XJ_A_NUM], []).append(r[XJ_A_EXAM_DATE])
    return out


def xj_group_of(x: XjGroupIn) -> list:
    """一个题型 → bank 题行清单:预测行(predicted=True + exam_dates)在前,只在流里出现的题殿后
    (exam_count null 不造,predicted=False)。"""
    rows = []
    seen = set()
    for q in x.predicted:
        num = q[CH_K_ID]
        seen.add(num)
        rows.append({CH_K_ID: num, XJ_A_EXAM_COUNT: q[XJ_A_EXAM_COUNT], XJ_K_PREDICTED: True,
                     XJ_K_EXAM_DATES: sorted(x.dates.get(num, []))})
    for num in sorted(x.dates):
        if num in seen:
            continue
        rows.append({CH_K_ID: num, XJ_A_EXAM_COUNT: None, XJ_K_PREDICTED: False,
                     XJ_K_EXAM_DATES: sorted(x.dates[num])})
    return rows


def to_xj_index_rows(bank: dict) -> list:
    """猩际库 → 索引行清单(在预测清单里 = frequent 押题信号;无题面,标题留空不造)。"""
    rows = []
    for g in bank[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            flags = []
            if q[XJ_K_PREDICTED] is True:
                flags.append(FLAG_FREQUENT)
            rows.append({
                IDX_K_TYPE: g[OUT_K_SIGNATURE],
                IDX_K_SOURCE: SRC_PTEXJ,
                CH_K_ID: q[CH_K_ID],
                K_TITLE: "",
                IDX_K_FLAGS: flags,
                IDX_K_AUDIO: False,
            })
    return rows


def xj_signals_of(x: XjSignalsIn) -> dict:
    """猩际库 → {(源,型,id): 信号}(seen = 考试记录最晚日期,未来日期剔(ynwac 同律);seen_n = 持有条数;
    votes = exam_count;freq 本源无 null;库不在 = 空表)。"""
    out = {}
    if not OUT_XJ_BANK.exists():
        return out
    with OUT_XJ_BANK.open(encoding=ENC_UTF8) as f:
        bank = json.load(f)
    cutoff = x.today.isoformat()
    for g in bank[OUT_K_GROUPS]:
        for q in g[OUT_K_QUESTIONS]:
            dates = [d for d in q[XJ_K_EXAM_DATES] if d <= cutoff]
            seen = None
            if len(dates) > 0:
                seen = max(dates)
            out[(SRC_PTEXJ, g[OUT_K_SIGNATURE], str(q[CH_K_ID]))] = {
                R_K_SEEN: seen, R_K_SEEN_N: len(dates), R_K_FREQ: None, R_K_VOTES: q[XJ_A_EXAM_COUNT]}
    return out


# =========================================================================
# 15. mart 出表(题型维度 + 题目事实;pte 域升产品域的落库口 —— constants §16 定案)
# =========================================================================


def run_pte_mart() -> None:
    """出表步:读索引 + 两库 + recent + media → data/mart/pte_types.json / pte_questions.json。

    2026-09-03 立(Frank「上」):首批四型;题面只取 ynwac / duoink,猩际无题面不出行;
    四格信号并进题行;一题一行按源。索引/recent 文件不在 = 上游没跑,open 抛出留痕。"""
    with OUT_INDEX.open(encoding=ENC_UTF8) as f:
        idx = json.load(f)
    signals: dict = {}
    signals.update(dk_signals_of())
    signals.update(yn_signals_of(date.today()))
    banks = {SRC_YNWAC: bank_lookup_of(OUT_BANK), SRC_DUOINK: bank_lookup_of(OUT_DK_BANK)}
    media = media_lookup_of()
    fetched = date.today().isoformat()
    rows = []
    for r in idx[IDX_K_ROWS]:
        if r[IDX_K_TYPE] not in MART_TYPES or r[IDX_K_SOURCE] not in banks:
            continue
        row = to_pte_question_row(PteQuestionIn(row=r, banks=banks, signals=signals, media=media, fetched=fetched))
        if row is not None:
            rows.append(row)
    MART.mkdir(parents=True, exist_ok=True)
    write_json(WriteJsonIn(path=MART / MART_TYPES_FILE, payload=list(MART_TYPE_ROWS), indent=JSON_INDENT))
    write_json(WriteJsonIn(path=MART / MART_QUESTIONS_FILE, payload=rows, indent=JSON_INDENT))
    audio = 0
    predicted = 0
    for q in rows:
        if q[Q_K_AUDIO_URL] is not None:
            audio += 1
        if q[Q_K_PREDICTED] is True:
            predicted += 1
    say(P_MART_DONE_TPL.format(types=len(MART_TYPE_ROWS), questions=len(rows), audio=audio,
                               predicted=predicted, dir=MART))


def bank_lookup_of(path: object) -> dict:
    """一份库 → {(标准题型码, id 串): 题 dict}(库不在 = 空表;ynwac 组签名经 YN_SIG_TYPE 换码)。"""
    out: dict = {}
    p = cast(Path, path)
    if not p.exists():
        return out
    with p.open(encoding=ENC_UTF8) as f:
        bank = json.load(f)
    for g in bank[OUT_K_GROUPS]:
        t = YN_SIG_TYPE.get(g[OUT_K_SIGNATURE], g[OUT_K_SIGNATURE])
        for q in g[OUT_K_QUESTIONS]:
            out[(t, str(q[K_ID]))] = q
    return out


def media_lookup_of() -> dict:
    """media.json → {(源, 型, id 串, 种类): (url, 本地文件或 None)}(文件不在 = 空表;同键多条取首条)。"""
    out: dict = {}
    if not OUT_MEDIA.exists():
        return out
    with OUT_MEDIA.open(encoding=ENC_UTF8) as f:
        m = json.load(f)
    for r in m[IDX_K_ROWS]:
        key = (r[IDX_K_SOURCE], r[IDX_K_TYPE], str(r[CH_K_ID]), r[M_K_KIND])
        if key not in out:
            out[key] = (r[M_K_URL], r[M_K_FILE])
    return out


def to_pte_question_row(x: PteQuestionIn) -> dict | None:
    """索引行 → mart 题行;题面取不到(库里没这题 / 该型不会切)= None 不出行(题面空的题练不了)。"""
    src = x.row[IDX_K_SOURCE]
    t = x.row[IDX_K_TYPE]
    sid = str(x.row[CH_K_ID])
    q = x.banks[src].get((t, sid))
    if q is None:
        return None
    text = question_text_of(QuestionTextIn(source=src, qtype=t, q=q))
    if text == "":
        return None
    sig = x.signals.get((src, t, sid))
    if sig is None:
        sig = {R_K_SEEN: None, R_K_SEEN_N: 0, R_K_FREQ: None, R_K_VOTES: None}
    audio = x.media.get((src, t, sid, KIND_AUDIO), (None, None))
    image = x.media.get((src, t, sid, KIND_IMAGE), (None, None))
    return {
        Q_K_QID: src + QID_SEP + sid,
        IDX_K_SOURCE: src,
        IDX_K_TYPE: t,
        Q_K_NUM: question_num_of(QuestionTextIn(source=src, qtype=t, q=q)),
        K_TITLE: x.row[K_TITLE],
        Q_K_TEXT: text,
        Q_K_ANSWER: question_answer_of(QuestionTextIn(source=src, qtype=t, q=q)),
        Q_K_AUDIO_URL: audio[0],
        Q_K_AUDIO_FILE: audio[1],
        Q_K_IMAGE_URL: image[0],
        Q_K_PREDICTED: len(x.row[IDX_K_FLAGS]) > 0,
        R_K_SEEN: sig[R_K_SEEN],
        Q_K_SEEN_N: sig[R_K_SEEN_N],
        R_K_VOTES: sig[R_K_VOTES],
        R_K_FREQ: sig[R_K_FREQ],
        Q_K_FETCHED: x.fetched,
    }


def question_num_of(x: QuestionTextIn) -> str:
    """站内题号:duoink 取 sn,ynwac 取 id(页面显示 #N;两源各自的编号体系,不互通)。"""
    if x.source == SRC_DUOINK:
        return str(x.q.get(DK_K_SN, ""))
    return str(x.q.get(K_ID, ""))


def question_text_of(x: QuestionTextIn) -> str:
    """题面:ynwac 按型取字段(WFD text / RA content / ASQ question);duoink WFD·RS 取 te,
    RA 切 ITEM TEXT 段、ASQ 切 ITEM TRANSCRIPT 段(一词一行拼回句子)。取不到给空串,由上层不出行。"""
    if x.source == SRC_YNWAC:
        if x.qtype == T_WFD:
            return str(x.q.get(K_TEXT, "")).strip()
        if x.qtype == T_RA:
            return str(x.q.get(K_CONTENT, "")).strip()
        if x.qtype == T_ASQ:
            return str(x.q.get(K_QUESTION, "")).strip()
        return ""
    if x.qtype in DK_TEXT_PARTS:
        return str(x.q.get(DK_K_TEXT, "")).strip()
    content = x.q.get(DK_R_CONTENT)
    if not isinstance(content, str):
        return ""
    if x.qtype == T_RA:
        return dk_segment_of(DkSegmentIn(text=content, mark=DK_TEXT_MARK))
    if x.qtype == T_ASQ:
        return dk_segment_of(DkSegmentIn(text=content, mark=DK_TRANSCRIPT_MARK))
    return ""


def question_answer_of(x: QuestionTextIn) -> str | None:
    """答案:ASQ 才有(ynwac answer 字段 / duoink EXAMPLE ANSWER 段);其余 null 不造。"""
    if x.qtype != T_ASQ:
        return None
    if x.source == SRC_YNWAC:
        a = str(x.q.get(K_ANSWER, "")).strip()
        if a == "":
            return None
        return a
    content = x.q.get(DK_R_CONTENT)
    if not isinstance(content, str):
        return None
    a = dk_segment_of(DkSegmentIn(text=content, mark=DK_ANSWER_MARK))
    if a == "":
        return None
    return a


def dk_segment_of(x: DkSegmentIn) -> str:
    """duoink 一词一行正文 → 起点标记之后、任一终点标记之前的词元拼成句(标点贴前词,开括号贴后词)。"""
    lines = x.text.split(DK_LINE_SEP)
    start = -1
    for i, line in enumerate(lines):
        if line.strip() == x.mark:
            start = i + 1
            break
    if start < 0:
        return ""
    tokens = []
    for line in lines[start:]:
        s = line.strip()
        if s in DK_STOP_MARKS:
            break
        if s == "":
            continue
        tokens.append(s)
    joined = TOKEN_JOIN.join(tokens)
    joined = PUNCT_TIGHT_RE.sub(r"\1", joined)
    return OPEN_TIGHT_RE.sub(r"\1", joined).strip()

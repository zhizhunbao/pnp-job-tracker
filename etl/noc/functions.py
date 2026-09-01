"""
noc 域函数 —— 分类库(单一来源,08/09/10/11/employers 消费)+ 官方 CSV 两步
(structure / descriptions)+ 体检 + 三张 i18n 表(titles / short / cities)。
段横幅与 constants/scheme 同名同序镜像,段内 step-down。

沿革:2026-08-31 Frank 拍板「noc 就叫 noc」—— 原根上 noc.py(分类函数)、
noc_buckets.py(bucket_of)与 noc_facts/ 两个步骤文件全溶进本文件;
行为逐字不变,金标 = 全码域 10 万 classify 探针 byte-identical + 两步产物重跑比对。
2026-08-31 批I3 溶段:批H2 从 clean/ 归户进来的三件(translate_noc_titles /
shorten_noc_titles)溶成段6/7,本域步骤文件清零(cities 件曾同批溶成段8,
2026-08-31 Frank 拍板迁 mart 域段20 —— 城市译名是维度装配的料,不是 NOC 的东西)。
两处收拢有据可查:① 段6 与段7 的 /api/chat 调用**逐字相同、只差 num_predict**,
合成 ask_chat 一份(差异收进入参 = 超集);② 三段各抄一份的 OLLAMA_URL / OLLAMA_MODEL
取值合成 ollama_base / ollama_model。⚠ 段3 的 /api/generate 与段6/7 的 /api/chat
**不是一套**(端点、temperature 都不同,合并等于换模型输入)—— 不合并,证据见交付报告。
"""
import csv
import datetime
import io
import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path

import httpx

import paths
from log.functions import say
from noc.constants import (
    ARG_FORCE, ARG_LANG, ARG_SEP, CHAT_FAIL_TPL, CHAT_TEMPERATURE,
    CHAT_TIMEOUT_S, CHAT_URL_TPL, LANG_EN, LATIN3_RE,
    OUT_TITLES_I18N, ROLE_USER, SHORT_DONE_TPL, SHORT_DUP_OK_TPL,
    SHORT_DUP_ROW_TPL, SHORT_DUP_SEP, SHORT_DUP_SHOW_MAX, SHORT_DUP_WARN_TPL, SHORT_FIX_BY_LANG,
    SHORT_HAVE_TPL, SHORT_IN_TPL, SHORT_LANG_DONE_TPL, SHORT_MIN_LEN, SHORT_MODEL_TPL,
    SHORT_NUM_PREDICT, SHORT_OUT_TPL, SHORT_PROGRESS_TPL, SHORT_SAVE_EVERY, SHORT_SKIP_TPL,
    SHORT_SRC_FALLBACK, SHORT_TODO_TPL, SPECS, TERM_FIX, TITLES_DONE_TPL, TITLES_EMPTY_MARK,
    TITLES_IN_TPL, TITLES_LANGS, TITLES_MAX_LEN, TITLES_MIN_LEN, TITLES_MODEL_TPL,
    TITLES_NUM_PREDICT, TITLES_OUT_TPL, TITLES_PROGRESS_TPL, TITLES_PROMPT_TPL,
    TITLES_SAVE_EVERY, TITLES_TERM_FIX_TPL, TITLES_TODO_TPL,
    ARG_ALL, ARG_LIMIT, ARG_RETRANSLATE, AUDIT_HEAD_TPL, AUDIT_LABELS, AUDIT_ROW_TPL,
    BROAD_BAD_TPL, BROAD_HEAD_TPL, BROAD_MORE_TPL, BROAD_OK_MSG, BROAD_SHOW_MAX, BROADS,
    BUCKETS3, BUCKETS4, BUCKETS5, CACHE_HIT_TPL, CJK_RE,
    COL_CODE_DESC, COL_CODE_PREFIX, COL_EDESC, COL_ETYPE, COL_LEVEL, COL_TITLE, COLLISION_CODE_TPL,
    COLLISION_LANGS, COLLISION_OK_TPL, COLLISION_ROW_TPL, COLLISION_SEP, COLLISION_SHOW_MAX,
    COLLISION_WARN_TPL, COLON, COVER_BAD_TPL, COVER_OK_TPL, DESC_CACHE_TPL, DESC_DL_TPL,
    DESC_DONE_TPL, DESC_SOURCE,
    DESC_TIMEOUT_S, DESC_UA, DESC_URL, DOWNLOAD_TPL, DUTIES_LEAD_SUFFIX, EMPTY_MARK, ENC_UTF8,
    ENC_UTF8_SIG, ERRORS_REPLACE, FILL_KEYS, FINE_NO, FINE_SHOW_LEN, FINE_YES, FIX, GEN_URL_TPL,
    HAND_NO, HAND_YES, HANGUL_RE, HIT_HEAD_TPL, HIT_MORE_TPL, HIT_ROW_TPL, HIT_SHOW_MAX,
    I18N, IN_DESC_CSV, IN_DESCR,
    IN_LINE_TPL, IN_STATS, IN_STRUCT_CSV, K_BROAD, K_BROAD_EN, K_BROAD_KO, K_BY_NOC, K_DUTIES,
    K_EN, K_EN_SHORT, K_EN_UI, K_FETCHED, K_FINE, K_FINE_EN, K_FINE_KO, K_KO, K_KO_UI, K_LEVEL,
    K_LEVELS, K_MID, K_MID_EN, K_MID_KO, K_NOC, K_PROVINCE, K_REQUIREMENTS, K_RESPONSE, K_SOURCE,
    K_TEER, K_TEER_LABEL, K_TITLE, K_URL, K_ZH, K_ZH_UI, LANGS,
    LATIN_RE, LEVEL_COUNT_TPL, MID_ITEM_TPL, MID_TOP_MAX, MID_TOP_TPL, MISS_ROW_TPL,
    MODEL_DEFAULT, MODEL_ENV, NL, NOFINE_TPL, OFFICIAL_BROAD, OLLAMA_DEFAULT,
    OLLAMA_ENV, OUT_DESC, OUT_LINE_TPL, OUT_STRUCT, OUT_TSV, PREFIXES, PROBE_NOCS, PROBE_TPL,
    PROGRESS_TPL, PROMPT_TPL, PROVINCE_ALL, QUOTE_STRIP, SEC1_HEAD, SEC2_HEAD, SEC3_HEAD, SMELL,
    SRC_ITEM_TPL, SRC_SEP, STRUCT_CACHE_MIN_BYTES, STRUCT_DONE_TPL, STRUCT_ENV,
    STRUCT_TIMEOUT_S, STRUCTURE_URL, TEER_TPL, TITLE_FALLBACK, TITLE_SHOW_LEN, TODO_TPL,
    TRANSLATE_FAIL_TPL, TRANSLATE_TIMEOUT_S, TSV_DONE_TPL, TSV_HEADER, TSV_ROW_TPL,
    UI_BANNED, UI_FIX, UI_KEY_BY_LANG, UI_KEY_DEFAULT,
    UI_MAX_LEN, UI_PROMPT_TPL, UNCLASSIFIED, UNIT_LEVEL, WANT_ELEMENTS, WANT_LEVELS, ZH_MAX_LEN,
    ZH_SHOW_LEN, ZH_WIDE_LEN,
)
from noc.scheme import (
    AskCountOut, AskShortIn, AskTitleIn, AuditRow, AuditSeedIn, BroadI18nIn, ChatIn, CheckIn,
    DescSeedIn, DupReportIn, ElementRow, FillIn, FineIn, LabelIn, LevelSeedIn, MidIn, OllamaIn,
    ParseIn, ShortLangIn, ShortOkIn, ShortSpec, ShortSrcIn, ShortTodo, SmellHit, TitleOkIn,
    TitlesTodoIn, TranslateIn, TranslateTodoIn,
)
from noc.variables import CACHE

# =========================================================================
# 1. 分类库(NOC → TEER/大类/中类/小类)
# =========================================================================


def classify(noc: str | None) -> dict:
    """noc → {teer, broad, mid, fine}(供 mart 写到 job 上 + 建 noc 维度)。
    中/小类同时带 en/ko —— 显示层不必再攒一张翻译表(先前 cat.* 靠人肉往 i18n 里加,
    新分类一进来就漏成中文混进英文界面)。"""
    t = teer_of(noc)
    if t is None:
        teer_label = UNCLASSIFIED
    else:
        teer_label = TEER_TPL.format(t=t)
    return {
        K_TEER: t, K_TEER_LABEL: teer_label,
        K_BROAD: broad_of(noc),
        K_BROAD_EN: broad_i18n(BroadI18nIn(noc=noc, lang=K_EN)),
        K_BROAD_KO: broad_i18n(BroadI18nIn(noc=noc, lang=K_KO)),
        K_MID: mid_of(MidIn(noc=noc, lang=K_ZH)),
        K_MID_EN: mid_of(MidIn(noc=noc, lang=K_EN_SHORT)),
        K_MID_KO: mid_of(MidIn(noc=noc, lang=K_KO)),
        K_FINE: fine_of(FineIn(noc=noc, lang=K_ZH)),
        K_FINE_EN: fine_of(FineIn(noc=noc, lang=K_EN_SHORT)),
        K_FINE_KO: fine_of(FineIn(noc=noc, lang=K_KO)),
    }


def teer_of(noc: str | None) -> int | None:
    """TEER 档(NOC 第 2 位);非法码给 None(消费端标未分类,不硬塞)。"""
    # pyrefly: ignore[unsupported-operation] — is_valid_noc 已判过「5 位且首位数字」,它不是 TypeGuard,检查器不跟着收窄
    if is_valid_noc(noc) and noc[1].isdigit():
        # pyrefly: ignore[unsupported-operation] — 同上
        return int(noc[1])
    return None


def broad_of(noc: str | None) -> str:
    """大类 = 本站浏览分类(第 2 段桶表)。映射查不到 → 未分类,不拿官方组名硬顶。"""
    if not is_valid_noc(noc):
        return UNCLASSIFIED
    b = bucket_of(noc)
    if b is None:
        return UNCLASSIFIED
    return b[0]


def broad_i18n(x: BroadI18nIn) -> str:
    """大类的英/韩名(手写表;缺则退中文 —— 前端不该拿中文顶英文,体检脚本盯着不许缺)。"""
    b = bucket_of(x.noc)
    if b is None:
        return UNCLASSIFIED
    i = I18N.get(b[0])
    if i is None:
        return b[0]
    if x.lang == K_KO:
        return i[1]
    return i[0]


def official_broad_of(noc: str | None) -> str:
    """官方第 1 位的组名(只给体检脚本对照用,不进库)。"""
    if not is_valid_noc(noc):
        return UNCLASSIFIED
    # pyrefly: ignore[unsupported-operation] — 同上
    return OFFICIAL_BROAD.get(noc[0], UNCLASSIFIED)


def mid_of(x: MidIn) -> str:
    """中类 = **人话桶**(第 2 段:官方子大类 3 位 → 本站分类名)。
    Frank 2026-08-03「之前分的是对的,就是类别有错误」—— 名字回到旧那套人话桶,
    成员判定换成官方码(旧版 `^2 → IT` 把 22 开头的各行业技术员全扫进 IT)。
    英韩暂用官方短名(桶名只有中文一版,三语化随人话名那批一起补)。"""
    if not is_valid_noc(x.noc):
        return UNCLASSIFIED
    b = bucket_of(x.noc)
    if b is None:
        return UNCLASSIFIED
    if x.lang == K_ZH:
        return b[1]
    i = I18N.get(b[1])
    if i is None:
        return b[1]
    if x.lang == K_KO:
        return i[1]
    return i[0]


def fine_of(x: FineIn) -> str:
    """小类 = 官方 Minor Group(前 4 位)的**人话名**。
    但**被单个职业挪过窝的不能用**(BUCKETS5):那时这个职业已经离开了它的官方小组,
    再挂小组名就自相矛盾 —— 实见 22114 景观园艺技师归到「园艺与景观」,小类却写
    「生命科学技术员」。那种情况退回中类(显示层遇到 小类==中类 会留空,
    官方在这一级对它确实没有更细的划分)。"""
    if not is_valid_noc(x.noc):
        return UNCLASSIFIED
    if x.noc in BUCKETS5:
        return mid_of(MidIn(noc=x.noc, lang=x.lang))
    # pyrefly: ignore[unsupported-operation] — 同上
    v = get_structure_levels().get(x.noc[:4])
    if v is None:
        v = {}
    ui_key = UI_KEY_BY_LANG.get(x.lang)
    if ui_key is None:
        ui_key = UI_KEY_DEFAULT
    ui = v.get(ui_key)
    if ui:
        return ui
    # pyrefly: ignore[unsupported-operation] — 同上
    lbl = label_of(LabelIn(code=x.noc[:4], lang=x.lang))
    if lbl:
        return lbl
    return mid_of(MidIn(noc=x.noc, lang=x.lang))


def bucket_of(noc: str | None) -> tuple[str, str] | None:
    """5 位 → 4 位 → 3 位;查不到返回 None(体检脚本会红,不许兜底瞎归)。"""
    if not noc or len(noc) != 5:
        return None
    return BUCKETS5.get(noc) or BUCKETS4.get(noc[:4]) or BUCKETS3.get(noc[:3])


def is_valid_noc(noc: str | None) -> bool:
    """5 位、首位是数字才算一个可分类的 NOC。"""
    return bool(noc) and len(noc) == 5 and noc[0].isdigit()


def label_of(x: LabelIn) -> str | None:
    """官方类别名(缺翻译退英文短名;都没有 → None,由调用方决定怎么兜底)。"""
    v = get_structure_levels().get(x.code)
    if not v:
        return None
    return v.get(x.lang) or v.get(K_EN_SHORT) or v.get(K_EN) or None


def get_structure_levels() -> dict:
    """官方层级表(structure.json 的 levels 格)—— 首用惰性读进 CACHE,全进程复用。
    NOC_STRUCTURE 环境变量可改道(测试/容器);文件缺席给空表(名字全退未分类,不炸)。"""
    if CACHE.levels is not None:
        return CACHE.levels
    override = os.environ.get(STRUCT_ENV)
    if override is None or override == "":
        path = OUT_STRUCT
    else:
        path = Path(override)
    levels: dict = {}
    if path.exists():
        data = json.loads(path.read_text(encoding=ENC_UTF8))
        got = data.get(K_LEVELS)
        if got is not None:
            levels = got
    CACHE.levels = levels
    return levels


# =========================================================================
# 2. 浏览分类桶(纯常量段,函数只有 bucket_of —— 已按 step-down 住第 1 段)
# =========================================================================

# =========================================================================
# 3. structure 步(官方层级 + 三语人话名)
# =========================================================================


def build_structure() -> None:
    """官方层级 CSV → structure.json(261 条三语层级表;入口,门直调)。
    手动开关(跟在 --only structure 后面):--limit N 只翻前 N 条;--retranslate 全部重来。"""
    limit = 0
    if ARG_LIMIT in sys.argv:
        limit = int(sys.argv[sys.argv.index(ARG_LIMIT) + 1])
    retranslate = ARG_RETRANSLATE in sys.argv
    say(IN_LINE_TPL.format(url=STRUCTURE_URL))
    say(OUT_LINE_TPL.format(path=OUT_STRUCT))
    old: dict = {}
    if OUT_STRUCT.exists() and retranslate is False:
        old_doc = json.loads(OUT_STRUCT.read_text(encoding=ENC_UTF8))
        got = old_doc.get(K_LEVELS)
        if got is not None:
            old = got
    levels = parse_structure_rows(ParseIn(text=fetch_structure_csv(), old=old))
    fill_translations(FillIn(levels=levels, limit=limit))
    report_collisions(levels)
    write_structure(levels)


def fetch_structure_csv() -> str:
    """层级 CSV:够大的缓存直接用,否则下载并落缓存。"""
    IN_STRUCT_CSV.parent.mkdir(parents=True, exist_ok=True)
    if IN_STRUCT_CSV.exists() and IN_STRUCT_CSV.stat().st_size > STRUCT_CACHE_MIN_BYTES:
        say(CACHE_HIT_TPL.format(name=IN_STRUCT_CSV.name))
        return IN_STRUCT_CSV.read_text(encoding=ENC_UTF8_SIG)
    say(DOWNLOAD_TPL.format(url=STRUCTURE_URL))
    r = httpx.get(STRUCTURE_URL, timeout=STRUCT_TIMEOUT_S, follow_redirects=True)
    r.raise_for_status()
    IN_STRUCT_CSV.write_bytes(r.content)
    return r.content.decode(ENC_UTF8_SIG)


def parse_structure_rows(x: ParseIn) -> dict:
    """CSV 全文 → {code: 层级条目}(只收 1/3/4 级),并报三级计数。"""
    rows = list(csv.DictReader(io.StringIO(x.text)))
    code_col = None
    for c in rows[0]:
        if c.startswith(COL_CODE_PREFIX):
            code_col = c
            break
    levels: dict = {}
    for r in rows:
        lvl = r[COL_LEVEL]
        code = r[code_col].strip()
        title = r[COL_TITLE].strip()
        if lvl not in WANT_LEVELS or not code:
            continue
        prev = x.old.get(code)
        if prev is None:
            prev = {}
        levels[code] = to_level_entry(LevelSeedIn(lvl=int(lvl), code=code, title=title, prev=prev))
    n_broad = 0
    n_mid = 0
    n_fine = 0
    for v in levels.values():
        if v[K_LEVEL] == 1:
            n_broad += 1
        if v[K_LEVEL] == 3:
            n_mid += 1
        if v[K_LEVEL] == 4:
            n_fine += 1
    say(LEVEL_COUNT_TPL.format(broad=n_broad, mid=n_mid, fine=n_fine))
    return levels


def to_level_entry(x: LevelSeedIn) -> dict:
    """一行官方层级 → 产出条目(旧译文沿用;人话名 UI_FIX 手写档压过旧值)。"""
    return {
        "level": x.lvl, "en": x.title, "enShort": short_en(x.title),
        "zh": x.prev.get("zh", ""), "ko": x.prev.get("ko", ""),
        "zhUi": UI_FIX.get((x.code, K_ZH), x.prev.get("zhUi", "")),
        "koUi": UI_FIX.get((x.code, K_KO), x.prev.get("koUi", "")),
        "enUi": UI_FIX.get((x.code, K_EN), x.prev.get("enUi", "")),
    }


def short_en(title: str) -> str:
    """剥掉每条都重复的套话前缀 —— 去的是套话,不是改名(官方全名仍在 en 字段里)。"""
    s = title
    for p in PREFIXES:
        if s.startswith(p):
            s = s[len(p):]
            break
    if s:
        return s[:1].upper() + s[1:]
    return title


def fill_translations(x: FillIn) -> None:
    """把缺格的条目逐条过本地模型(FIX 手写档优先);原地补,失败留空下次续跑。"""
    todo: list[str] = []
    for code, v in x.levels.items():
        filled = True
        for k in FILL_KEYS:
            if not v[k]:
                filled = False
        if filled is False:
            todo.append(code)
    if x.limit:
        todo = todo[:x.limit]
    say(TODO_TPL.format(n=len(todo)))
    i = 0
    for code in todo:
        i += 1
        v = x.levels[code]
        for lang in (K_ZH, K_KO):
            if not v[lang]:
                v[lang] = FIX.get((code, lang)) or translate(
                    TranslateIn(title=v[K_EN_SHORT], lang=lang, ui=False))
        for lang, key in ((K_ZH, K_ZH_UI), (K_KO, K_KO_UI), (K_EN, K_EN_UI)):
            if not v[key]:
                if lang == K_EN:
                    v[key] = short_en(v[K_EN])
                else:
                    v[key] = translate(TranslateIn(title=v[K_EN_SHORT], lang=lang, ui=True))
        say(PROGRESS_TPL.format(i=i, n=len(todo), code=code,
                                name=v[K_EN_SHORT][:TITLE_SHOW_LEN],
                                zh=v[K_ZH_UI] or EMPTY_MARK, ko=v[K_KO_UI] or EMPTY_MARK))


def translate(x: TranslateIn) -> str:
    """一条一译,逐条校验;不过关返回空 —— 空的前端回退,不瞎编。ui=True 出人话名。"""
    if x.ui:
        prompt = UI_PROMPT_TPL.format(lang=LANGS[x.lang], title=x.title)
    else:
        prompt = PROMPT_TPL.format(lang=LANGS[x.lang], title=x.title)
    try:
        r = httpx.post(GEN_URL_TPL.format(base=ollama_base()), timeout=TRANSLATE_TIMEOUT_S,
                       json=to_ollama_payload(OllamaIn(model=ollama_model(), prompt=prompt)))
        r.raise_for_status()
        raw = r.json().get(K_RESPONSE)
        if raw is None:
            raw = ""
        out = raw.strip().strip(QUOTE_STRIP).split(NL)[-1].strip()
    except Exception as e:  # noqa: BLE001
        say(TRANSLATE_FAIL_TPL.format(lang=x.lang, title=x.title[:ZH_MAX_LEN], err=e))
        return ""
    if translation_ok(CheckIn(text=out, lang=x.lang, ui=x.ui)):
        return out
    return ""


def ollama_base() -> str:
    """本地模型地址(OLLAMA_URL 环境变量,缺/空退默认盒子)。

    2026-08-31 批I3 收拢:原来段3 的 translate()、段6 的 ask()、段7 的 ask() 各抄一份
    逐字相同的四行取值 —— 行为重复不许,合成本函数。取值与默认值一字未改。
    """
    base = os.environ.get(OLLAMA_ENV)
    if base is None or base == "":
        return OLLAMA_DEFAULT
    return base


def ollama_model() -> str:
    """本地模型名(OLLAMA_MODEL 环境变量,缺/空退默认;三段共用,见 ollama_base)。"""
    model = os.environ.get(MODEL_ENV)
    if model is None or model == "":
        return MODEL_DEFAULT
    return model


def translation_ok(x: CheckIn) -> bool:
    """译文过闸:长度上限、人话名套话/括号补语退回、zh 必含汉字不混长拉丁、ko 必含谚文。"""
    if x.ui:
        max_len = UI_MAX_LEN
    else:
        max_len = ZH_MAX_LEN
    if not x.text or len(x.text) > max_len:
        return False
    if x.ui:
        for bad in UI_BANNED:
            if bad in x.text:
                return False
    if x.lang == K_ZH and (not CJK_RE.search(x.text) or LATIN_RE.search(x.text)):
        return False
    if x.lang == K_KO and not HANGUL_RE.search(x.text):
        return False
    return True


def to_ollama_payload(x: OllamaIn) -> dict:
    """Ollama /api/generate 的请求体(temperature=0 求稳定,不开思维链)。"""
    return {"model": x.model, "stream": False, "think": False,
            "prompt": x.prompt, "options": {"temperature": 0}}


def report_collisions(levels: dict) -> None:
    """撞车检测:同一层名字重复 = 筛选下拉出现两个一样的选项。**只报不改**,人工裁决
    (04g 短名教训:逐条翻的模型看不见别的条目)。官方父子同名占位不算撞车。"""
    for lang in COLLISION_LANGS:
        seen: dict = {}
        for code, v in levels.items():
            if v[lang]:
                seen.setdefault(v[lang], []).append(code)
        real = []
        official = 0
        for name, cs in seen.items():
            if len(cs) < 2:
                continue
            cs = sorted(cs, key=len)
            same_branch = True
            for c in cs:
                # pyrefly: ignore[missing-attribute] — key=len 让检查器把元素判成 Sized;cs 的元素是 NOC 码字符串
                if not c.startswith(cs[0]):
                    same_branch = False
            if same_branch:
                official += 1
            else:
                real.append((name, cs))
        if real:
            say(COLLISION_WARN_TPL.format(lang=lang, n=len(real)))
            for name, cs in real[:COLLISION_SHOW_MAX]:
                parts = []
                for c in cs:
                    parts.append(COLLISION_CODE_TPL.format(
                        code=c, title=levels[c][K_EN][:TITLE_SHOW_LEN]))
                say(COLLISION_ROW_TPL.format(name=name, codes=COLLISION_SEP.join(parts)))
        else:
            say(COLLISION_OK_TPL.format(lang=lang, n=official))


def write_structure(levels: dict) -> None:
    """落盘 structure.json(fetched = 今天:本步骤缓存命中时源即缓存轮次,语义沿原脚本)
    并报行数与留空计数。"""
    n_zh = 0
    n_ko = 0
    for v in levels.values():
        if not v[K_ZH]:
            n_zh += 1
        if not v[K_KO]:
            n_ko += 1
    doc = {K_FETCHED: datetime.date.today().isoformat(), K_SOURCE: STRUCTURE_URL,
           K_LEVELS: levels}
    OUT_STRUCT.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding=ENC_UTF8)
    say(STRUCT_DONE_TPL.format(path=OUT_STRUCT, n=len(levels), zh=n_zh, ko=n_ko))


# =========================================================================
# 4. descriptions 步(官方职业名 + 主要职责)
# =========================================================================


def build_descriptions() -> None:
    """官方 Elements CSV → descriptions.json(516 个 NOC 的官方名+职责+要求;入口,门直调)。"""
    reader = csv.DictReader(io.StringIO(fetch_elements_csv()))
    out: dict = {}
    for r in reader:
        row = to_element_row(r)
        if row.level != UNIT_LEVEL or not row.noc:
            continue
        rec = out.get(row.noc)
        if rec is None:
            rec = to_desc_rec(DescSeedIn(noc=row.noc, title=row.title))
            out[row.noc] = rec
        key = WANT_ELEMENTS.get(row.etype)
        if key and row.desc and not row.desc.lower().rstrip(COLON).endswith(DUTIES_LEAD_SUFFIX):
            rec[key].append(row.desc)
    OUT_DESC.parent.mkdir(parents=True, exist_ok=True)
    doc = {K_SOURCE: DESC_SOURCE, K_URL: DESC_URL,
           K_FETCHED: datetime.date.today().isoformat(), K_BY_NOC: out}
    OUT_DESC.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding=ENC_UTF8)
    wd = 0
    for v in out.values():
        if v[K_DUTIES]:
            wd += 1
    say(DESC_DONE_TPL.format(path=OUT_DESC, n=len(out), wd=wd))
    report_desc_probe(out)


def to_element_row(r: dict) -> ElementRow:
    """Elements CSV 一行 → 洗净形(缺格折空串,strip 一次做完;键词汇只住本构造器)。"""
    level = r.get(COL_LEVEL)
    if level is None:
        level = ""
    noc = r.get(COL_CODE_DESC)
    if noc is None:
        noc = ""
    title = r.get(COL_TITLE)
    if title is None:
        title = ""
    etype = r.get(COL_ETYPE)
    if etype is None:
        etype = ""
    desc = r.get(COL_EDESC)
    if desc is None:
        desc = ""
    return ElementRow(level=level.strip(), noc=noc.strip(), title=title.strip(),
                      etype=etype.strip(), desc=desc.strip())


def report_desc_probe(out: dict) -> None:
    """收口探针:三个跨 TEER 的码各报官方名与职责/要求条数。"""
    for noc in PROBE_NOCS:
        v = out.get(noc)
        if v is None:
            v = {}
        title = v.get(K_TITLE)
        if not title:
            title = TITLE_FALLBACK
        duties = v.get(K_DUTIES)
        if duties is None:
            duties = []
        reqs = v.get(K_REQUIREMENTS)
        if reqs is None:
            reqs = []
        say(PROBE_TPL.format(noc=noc, title=title, d=len(duties), r=len(reqs)))


def fetch_elements_csv() -> str:
    """Elements CSV:缓存在就用(可删缓存强制重下),否则下载并落缓存。"""
    IN_DESC_CSV.parent.mkdir(parents=True, exist_ok=True)
    if IN_DESC_CSV.exists():
        say(DESC_CACHE_TPL.format(path=IN_DESC_CSV))
        return IN_DESC_CSV.read_text(encoding=ENC_UTF8_SIG, errors=ERRORS_REPLACE)
    say(DESC_DL_TPL.format(url=DESC_URL))
    r = httpx.get(DESC_URL, timeout=DESC_TIMEOUT_S, follow_redirects=True, headers=DESC_UA)
    r.raise_for_status()
    IN_DESC_CSV.write_bytes(r.content)
    return r.content.decode(ENC_UTF8_SIG, errors=ERRORS_REPLACE)


def to_desc_rec(x: DescSeedIn) -> dict:
    """一个 5 位 NOC 的空条目(职责/要求随行填充)。"""
    return {"noc": x.noc, "title": x.title, "duties": [], "requirements": []}


# =========================================================================
# 5. audit 步(逐职业体检 大类/中类/小类)
# =========================================================================


def audit_noc_classes() -> None:
    """逐职业体检「大类 / 中类 / 小类」(只读,不改数据;入口,门直调)。

    起因(2026-08-03 Frank 实机):选工作页「科技」这一类里蹲着「景观园艺技师」
    「家电维修技师」。所以本步要回答三件事:
    ① 每个大类里到底装了什么 —— 逐职业列出 大类/中类/小类/TEER/在招量;
    ② 三级到底有多少是**真分过**的 —— 中/小类只有本域桶表点名覆盖的是人工确认过的,
    其余走前缀兜底,而兜底出来的小类 == 中类(等于没有小类);
    ③ 哪些看着不对 —— 关键词线索(园艺/维修/司机 出现在「科技」这种)。**是线索不是判决**:
    大类 = NOC 第 1 位,是官方分组,本站只是给它起了个中文简称;所以「不对」多半不是
    分错了,而是**简称起窄了**(第 2 组官方叫「自然与应用科学及相关职业」,本站叫「科技」
    —— 园艺技师、家电维修技师在官方口径里本来就属于它)。

    手动开关(跟在 --only audit 后面):--all 摘要 + 全量逐条打印。
    """
    rows = build_audit_rows()
    say(AUDIT_HEAD_TPL.format(n=len(rows)))
    report_broad_buckets(rows)
    report_class_grade(rows)
    report_smell_hits(rows)
    write_audit_tsv(rows)


def build_audit_rows() -> list[AuditRow]:
    """mart 两张表 → 按在招量降序的体检行(只收 province=all 那批)。"""
    names: dict = {}
    for r in load_mart_rows(IN_DESCR):
        names[r[K_NOC]] = r
    rows: list[AuditRow] = []
    for r in load_mart_rows(IN_STATS):
        if r.get(K_PROVINCE) != PROVINCE_ALL:
            continue
        desc = names.get(r[K_NOC])
        if desc is None:
            desc = {}
        rows.append(to_audit_row(AuditSeedIn(stat=r, desc=desc)))
    return sorted(rows, key=row_open_key)


def load_mart_rows(path: Path) -> list:
    """读一张 mart 表(09 的产出;不连库、不抓网)。"""
    return json.loads(path.read_text(encoding=ENC_UTF8))


def to_audit_row(x: AuditSeedIn) -> AuditRow:
    """一行 stats + 名字行 → 体检行(名字 stats 优先退 descriptions;键词汇只住本构造器)。"""
    noc = x.stat["noc"]
    c = classify(noc)
    return AuditRow(
        noc=noc, teer=c["teer"], broad=c["broad"], mid=c["mid"], fine=c["fine"],
        zh=x.stat.get("titleZh") or x.desc.get("titleZh") or "",
        en=x.stat.get("titleEn") or x.desc.get("title") or "",
        open_jobs=x.stat.get("openJobs") or 0,
        by_hand=bucket_of(noc) is not None,
        official=official_broad_of(noc),
        no_fine=c["fine"] == c["mid"],
    )


def row_open_key(row: AuditRow) -> int:
    """排序键:在招量降序(原 lambda 出户成具名)。"""
    return -row.open_jobs


def report_broad_buckets(rows: list[AuditRow]) -> None:
    """① 每个本站浏览分类里装了什么(括号=它们在官方属于哪一组)。"""
    say(SEC1_HEAD)
    show_all = ARG_ALL in sys.argv
    by_broad: dict = defaultdict(list)
    for row in rows:
        by_broad[row.broad].append(row)
    for label in AUDIT_LABELS:
        lst = sorted(by_broad.get(label, []), key=row_open_key)
        if len(lst) == 0:
            continue
        say(BROAD_HEAD_TPL.format(label=label, n=len(lst), open=open_sum_of(lst),
                                  srcs=official_srcs_of(lst)))
        shown = lst
        if show_all is False:
            shown = lst[:BROAD_SHOW_MAX]
        for row in shown:
            say(AUDIT_ROW_TPL.format(noc=row.noc, teer=row.teer, mid=row.mid,
                                     fine=row.fine[:FINE_SHOW_LEN], zh=row.zh[:ZH_SHOW_LEN],
                                     open=row.open_jobs))
        if show_all is False and len(lst) > BROAD_SHOW_MAX:
            say(BROAD_MORE_TPL.format(n=len(lst) - BROAD_SHOW_MAX, name=OUT_TSV.name))


def open_sum_of(rows: list[AuditRow]) -> int:
    """一组职业的在招量合计。"""
    total = 0
    for row in rows:
        total += row.open_jobs
    return total


def official_srcs_of(rows: list[AuditRow]) -> str:
    """一组职业的官方来源组计数(多到少;本站简称与官方组并排摆)。"""
    counts: Counter = Counter()
    for row in rows:
        counts[row.official] += 1
    parts = []
    for name, n in counts.most_common():
        parts.append(SRC_ITEM_TPL.format(k=name, v=n))
    return SRC_SEP.join(parts)


def report_class_grade(rows: list[AuditRow]) -> None:
    """② 中/小类的成色:桶表覆盖、大类合法性、小类退化计数、最挤的中类。"""
    say(SEC2_HEAD)
    hand = 0
    nofine = 0
    bad = 0
    for row in rows:
        if row.by_hand:
            hand += 1
        if row.no_fine:
            nofine += 1
        if row.broad not in BROADS:
            bad += 1
    if hand == len(rows):
        say(COVER_OK_TPL.format(hand=hand, n=len(rows)))
    else:
        say(COVER_BAD_TPL.format(n=len(rows) - hand))
    for row in rows:
        if row.by_hand is False:
            say(MISS_ROW_TPL.format(noc=row.noc, zh=row.zh[:ZH_WIDE_LEN], open=row.open_jobs))
    if bad == 0:
        say(BROAD_OK_MSG)
    else:
        say(BROAD_BAD_TPL.format(n=bad))
    say(NOFINE_TPL.format(n=nofine, total=len(rows)))
    say(MID_TOP_TPL.format(items=crowded_mids_of(rows)))


def crowded_mids_of(rows: list[AuditRow]) -> str:
    """装的职业数最多的几个中类。"""
    counts: Counter = Counter()
    for row in rows:
        counts[row.mid] += 1
    parts = []
    for mid, n in counts.most_common(MID_TOP_MAX):
        parts.append(MID_ITEM_TPL.format(m=mid, n=n))
    return SRC_SEP.join(parts)


def report_smell_hits(rows: list[AuditRow]) -> None:
    """③ 关键词线索:名字与所在大类对不上的行(命中 ≠ 分错,见本步 docstring)。"""
    say(SEC3_HEAD)
    show_all = ARG_ALL in sys.argv
    hits: list[SmellHit] = []
    for row in rows:
        expect = smell_expect_of(row)
        if expect is not None:
            hits.append(SmellHit(row=row, expect=expect))
    hits.sort(key=hit_open_key)
    say(HIT_HEAD_TPL.format(n=len(hits)))
    shown = hits
    if show_all is False:
        shown = hits[:HIT_SHOW_MAX]
    for hit in shown:
        say(HIT_ROW_TPL.format(noc=hit.row.noc, broad=hit.row.broad, expect=hit.expect,
                               zh=hit.row.zh[:ZH_WIDE_LEN], open=hit.row.open_jobs))
    if show_all is False and len(hits) > HIT_SHOW_MAX:
        say(HIT_MORE_TPL.format(n=len(hits) - HIT_SHOW_MAX))


def smell_expect_of(row: AuditRow) -> str | None:
    """职业名命中关键词、且与所在大类不符时,返回关键词指向的大类;否则 None。"""
    for words, expect in SMELL:
        matched = False
        for w in words:
            if w in row.zh:
                matched = True
        if matched and row.broad != expect:
            return expect
    return None


def hit_open_key(hit: SmellHit) -> int:
    """③ 段排序键:在招量降序。"""
    return -hit.row.open_jobs


def write_audit_tsv(rows: list[AuditRow]) -> None:
    """全量逐条落盘(utf-8-sig,拿去 Excel 里逐行看)并报路径。"""
    OUT_TSV.parent.mkdir(parents=True, exist_ok=True)
    parts = [TSV_HEADER]
    for row in rows:
        parts.append(TSV_ROW_TPL.format(
            noc=row.noc, teer=row.teer, broad=row.broad, mid=row.mid, fine=row.fine,
            zh=row.zh, en=row.en, open=row.open_jobs,
            hand=hand_label_of(row), fine_flag=fine_label_of(row)))
    OUT_TSV.write_text("".join(parts), encoding=ENC_UTF8_SIG, newline="")
    say(TSV_DONE_TPL.format(path=OUT_TSV))


def hand_label_of(row: AuditRow) -> str:
    """TSV「中小类来源」列的说法。"""
    if row.by_hand:
        return HAND_YES
    return HAND_NO


def fine_label_of(row: AuditRow) -> str:
    """TSV「有小类」列的说法。"""
    if row.no_fine:
        return FINE_NO
    return FINE_YES


# =========================================================================
# 6. titles 步(NOC 官方职业名的中/韩译名;#147)
# =========================================================================


def translate_noc_titles() -> None:
    """NOC 官方职业名 → 中/韩译名(幂等续跑;入口,门直调)。

    IN : mart/noc_descriptions.json(descriptions 步的产物,含 noc + title)
    OUT: processed/noc_titles_i18n.json(noc → {zh, ko};已翻的跳过)
    手动开关(跟在 --only titles 后面):--limit N 只翻前 N 条。
    2026-08-31 批H2 归户搬家:自 etl/clean/04f_translate_noc_titles.py 迁进 noc 域 ——
    clean/ 横切层清算的判据是「谁的数据谁管」:它吃 mart/noc_descriptions.json(本域
    descriptions 一步的产物)、只翻 NOC 职业名,不对任何岗位行生效,不是真横切。
    2026-08-31 批I3 溶段:步骤文件整件溶进本文件成段6,逻辑一字未动 —— 只按方言律拆件
    (提示词与阈值提名进 constants、推导式改显式 for、两参 ask 收 ChatIn、裸 print 改 say);
    /api/chat 那套调用与段7 逐字相同,合成 ask_chat 一份(唯一差异 num_predict 收成入参)。
    本件零调度零 import(不在任何定时链/建表链上),是手动件 —— 只进 main.py 的 TOOLS。
    """
    limit = 0
    if ARG_LIMIT in sys.argv:
        limit = int(sys.argv[sys.argv.index(ARG_LIMIT) + 1])
    say(TITLES_IN_TPL.format(path=IN_DESCR))
    say(TITLES_OUT_TPL.format(path=OUT_TITLES_I18N))
    say(TITLES_MODEL_TPL.format(model=ollama_model(), base=ollama_base()))
    OUT_TITLES_I18N.parent.mkdir(parents=True, exist_ok=True)
    rows = json.loads(IN_DESCR.read_text(encoding=ENC_UTF8))
    done = load_titles_i18n()
    fix_existing_terms(done)
    todo = titles_todo(TitlesTodoIn(rows=rows, done=done, limit=limit))
    say(TITLES_TODO_TPL.format(n=len(todo), have=len(done)))
    got = translate_todo(TranslateTodoIn(todo=todo, done=done))
    write_titles_i18n(done)
    full = 0
    for v in done.values():
        if v.get(K_ZH) and v.get(K_KO):
            full += 1
    say(TITLES_DONE_TPL.format(path=OUT_TITLES_I18N, full=full, n=len(rows),
                               ok=got.n_ok, skip=got.n_skip))


def load_titles_i18n() -> dict:
    """产出表当前态(首跑没有文件 = 空表)。"""
    if OUT_TITLES_I18N.exists() is False:
        return {}
    return json.loads(OUT_TITLES_I18N.read_text(encoding=ENC_UTF8))


def write_titles_i18n(done: dict) -> None:
    """产出表落盘(段6/段7 共用同一张表,缩进与原脚本一致)。"""
    paths.write_json(paths.WriteJsonIn(path=OUT_TITLES_I18N, payload=done, indent=1))


def fix_existing_terms(done: dict) -> None:
    """存量也过一遍术语纠正(TERM_FIX 是后加的;已翻的不重跑模型,只做确定性替换)。"""
    fixed = 0
    for v in done.values():
        if v.get(K_ZH):
            got = fix_terms(v[K_ZH])
            if got != v[K_ZH]:
                v[K_ZH] = got
                fixed += 1
    if fixed:
        write_titles_i18n(done)
        say(TITLES_TERM_FIX_TPL.format(n=fixed))


def fix_terms(text: str) -> str:
    """多义词的确定性替换(命中才换,换不了保持原样)。"""
    out = text
    for bad, good in TERM_FIX:
        out = out.replace(bad, good)
    return out


def titles_todo(x: TitlesTodoIn) -> list:
    """待翻清单:有官方名 且 中韩没齐(原列表推导拆成显式 for)。"""
    todo = []
    for row in x.rows:
        if not row.get(K_TITLE):
            continue
        cur = x.done.get(row[K_NOC])
        if not cur:
            cur = {}
        if cur.get(K_ZH) and cur.get(K_KO):
            continue
        todo.append(row)
    if x.limit:
        return todo[:x.limit]
    return todo


def translate_todo(x: TranslateTodoIn) -> AskCountOut:
    """逐条过模型补中韩两格,每 TITLES_SAVE_EVERY 条落一次盘;返回成功/留空计数。"""
    n_ok = 0
    n_skip = 0
    i = 0
    for row in x.todo:
        i += 1
        title = row[K_TITLE]
        cur = x.done.setdefault(row[K_NOC], {})
        for lang in TITLES_LANGS:
            if cur.get(lang):
                continue
            out = ask_title(AskTitleIn(title=title, lang=lang))
            if lang == K_ZH:
                out = fix_terms(out)
            if title_ok(TitleOkIn(text=out, src=title, lang=lang)):
                cur[lang] = out
                n_ok += 1
            else:
                n_skip += 1
        if i % TITLES_SAVE_EVERY == 0 or i == len(x.todo):
            write_titles_i18n(x.done)
            say(TITLES_PROGRESS_TPL.format(i=i, n=len(x.todo), ok=n_ok, skip=n_skip,
                                           title=title, zh=cur.get(K_ZH, TITLES_EMPTY_MARK)))
    return AskCountOut(n_ok=n_ok, n_skip=n_skip)


def ask_title(x: AskTitleIn) -> str:
    """一条职业名 → 一门语言的译名(失败/超时返空,调用方留空不入库)。"""
    return ask_chat(ChatIn(prompt=TITLES_PROMPT_TPL.format(lang=LANGS[x.lang], title=x.title),
                           num_predict=TITLES_NUM_PREDICT))


def title_ok(x: TitleOkIn) -> bool:
    """校验:非空、长度合理、含目标语言字符、不是把英文原样吐回来。"""
    out = x.text.strip()
    if len(out) <= TITLES_MIN_LEN or len(out) > TITLES_MAX_LEN:
        return False
    if out.lower() == x.src.lower():
        return False
    if x.lang == K_ZH:
        return bool(CJK_RE.search(out))
    return bool(HANGUL_RE.search(out))


def ask_chat(x: ChatIn) -> str:
    """一次本地模型 /api/chat 调用;失败留痕返空。

    段6 与段7 原本各抄一份**逐字相同**的实现,唯一差异是 num_predict(60 / 40)——
    2026-08-31 批I3 收拢成一份,差异收进入参(超集 = 参数化)。
    ⚠ 与段3 translate() 的 /api/generate 不是一套(端点、temperature 都不同),不合并。
    原两件的 catch 是静默 `return ''`,溶段时补留痕(永不吞异常令);留空回退行为不变。
    """
    try:
        r = httpx.post(CHAT_URL_TPL.format(base=ollama_base()), timeout=CHAT_TIMEOUT_S,
                       json=to_chat_payload(x))
        r.raise_for_status()
        return to_chat_text(r.json())
    except Exception as e:  # noqa: BLE001
        say(CHAT_FAIL_TPL.format(name=type(e).__name__, detail=e))
        return ""


def to_chat_payload(x: ChatIn) -> dict:
    """Ollama /api/chat 的请求体(两件原值逐字相同,只有 num_predict 由调用方给)。"""
    return {"model": ollama_model(), "think": False, "stream": False,
            "options": {"temperature": CHAT_TEMPERATURE, "num_predict": x.num_predict},
            "messages": [{"role": ROLE_USER, "content": x.prompt}]}


def to_chat_text(doc: dict) -> str:
    """chat 响应 → 去空白的正文(缺格当空串)。"""
    text = doc.get("message", {}).get("content")
    if text is None:
        return ""
    return text.strip()


# =========================================================================
# 7. short 步(NOC 职业名的窄位短名,中/韩/英三语;E8-14 3.3)
# =========================================================================


def shorten_noc_titles() -> None:
    """NOC 职业名 → 中/韩/英窄位短名,补进同一张 i18n 表(幂等续跑;入口,门直调)。

    IN : mart/noc_descriptions.json(官方名)+ processed/noc_titles_i18n.json(段6 的完整译名)
    OUT: 同一个 noc_titles_i18n.json,补 zhShort / koShort / enShort 三列
    手动开关:--lang zh,ko,en 只压某几门;--limit N 每门只压前 N 条;--force 已有也重压。
    2026-08-31 批H2 归户搬家:自 etl/clean/04g_short_noc_titles.py 迁进 noc 域(判据同段6:
    它吃 mart/noc_descriptions.json + 段6 的译名,给同一张表补短名列,只关 NOC 一个参考集)。
    2026-08-31 批I3 溶段:整件溶进本文件成段7,逻辑一字未动 —— 只按方言律拆件(提示词与
    裁决表提名进 constants、内嵌 src_of 出户成 short_src_of、推导式改显式 for、
    三参 ask 收 AskShortIn、函数体按 75 行上限拆成 shorten_lang / short_todo / report_short_dups)。
    """
    limit = 0
    if ARG_LIMIT in sys.argv:
        limit = int(sys.argv[sys.argv.index(ARG_LIMIT) + 1])
    force = ARG_FORCE in sys.argv
    langs = short_langs()
    say(SHORT_IN_TPL.format(path=IN_DESCR))
    say(SHORT_OUT_TPL.format(path=OUT_TITLES_I18N))
    say(SHORT_MODEL_TPL.format(model=ollama_model(), base=ollama_base(),
                               langs=ARG_SEP.join(langs)))
    OUT_TITLES_I18N.parent.mkdir(parents=True, exist_ok=True)
    rows = json.loads(IN_DESCR.read_text(encoding=ENC_UTF8))
    done = load_titles_i18n()
    en_of = to_en_of(rows)
    for lang in langs:
        shorten_lang(ShortLangIn(lang=lang, rows=rows, done=done, en_of=en_of,
                                 limit=limit, force=force))
    apply_short_fixes(done)
    write_titles_i18n(done)
    report_short_dups(DupReportIn(langs=langs, done=done))
    say(SHORT_DONE_TPL.format(path=OUT_TITLES_I18N))


def short_langs() -> list:
    """本轮要压的语言(--lang zh,ko,en 点名;不给就是三语全压)。"""
    if ARG_LANG in sys.argv:
        return sys.argv[sys.argv.index(ARG_LANG) + 1].split(ARG_SEP)
    return list(SPECS)


def shorten_lang(x: ShortLangIn) -> None:
    """压一门语言:够短的直接复用完整名,超长的逐条过模型,每 SHORT_SAVE_EVERY 条落盘。"""
    spec = to_short_spec(x.lang)
    todo = short_todo(x)
    say(SHORT_TODO_TPL.format(lang=x.lang, n=len(todo), cap=spec.max_len))
    n_ok = 0
    n_skip = 0
    i = 0
    for item in todo:
        i += 1
        out = spec.strip.sub("", ask_short(AskShortIn(lang=x.lang, en=item.en, src=item.src)))
        out = out.strip()
        if short_ok(ShortOkIn(lang=x.lang, text=out, src=item.src)):
            x.done.setdefault(item.noc, {})[spec.field] = out
            n_ok += 1
        else:
            n_skip += 1
            say(SHORT_SKIP_TPL.format(noc=item.noc, src=item.src, out=out))
        if i % SHORT_SAVE_EVERY == 0 or i == len(todo):
            write_titles_i18n(x.done)
            say(SHORT_PROGRESS_TPL.format(lang=x.lang, i=i, n=len(todo), ok=n_ok, skip=n_skip))
    say(SHORT_LANG_DONE_TPL.format(lang=x.lang, ok=n_ok, skip=n_skip))


def short_todo(x: ShortLangIn) -> list:
    """待压缩清单;顺手把「本来就够短」的直接写进产出表(不浪费一次调用也不引入新错)。"""
    spec = to_short_spec(x.lang)
    todo = []
    for row in x.rows:
        noc = row.get(K_NOC, "")
        src = short_src_of(ShortSrcIn(lang=x.lang, noc=noc, en_of=x.en_of, done=x.done))
        if not noc or not src:
            continue
        cur = x.done.get(noc)
        if not cur:
            cur = {}
        if cur.get(spec.field) and x.force is False:
            continue
        if len(src) <= spec.max_len:
            x.done.setdefault(noc, {})[spec.field] = src
            continue
        todo.append(ShortTodo(noc=noc, en=x.en_of.get(noc, ""), src=src))
    if x.limit:
        return todo[:x.limit]
    return todo


def short_src_of(x: ShortSrcIn) -> str:
    """压缩原料:zh/ko 用段6 的完整译名,en 用官方英文名(官方名不动,短名另存一列)。"""
    if x.lang == LANG_EN:
        return x.en_of.get(x.noc, "")
    cur = x.done.get(x.noc)
    if not cur:
        return ""
    return cur.get(x.lang, "")


def ask_short(x: AskShortIn) -> str:
    """一条完整名 → 一门语言的短名(失败/超时返空)。"""
    spec = to_short_spec(x.lang)
    src = x.src
    if not src:
        src = SHORT_SRC_FALLBACK
    return ask_chat(ChatIn(prompt=spec.prompt.format(en=x.en, src=src),
                           num_predict=SHORT_NUM_PREDICT))


def short_ok(x: ShortOkIn) -> bool:
    """校验:够短、含该语言的字、不带标点、不比原名还长。

    不过关留空 —— 宁可显示长名也不显示胡编的短名。
    """
    spec = to_short_spec(x.lang)
    out = spec.strip.sub("", x.text).strip()
    if len(out) <= SHORT_MIN_LEN or len(out) > spec.max_len:
        return False
    if spec.charset.search(out) is None:
        return False
    if x.lang == K_ZH and LATIN3_RE.search(out) is not None:
        return False
    if x.lang == K_KO and CJK_RE.search(out) is not None:
        return False
    if x.src and len(out) >= len(x.src):
        return False
    return True


def apply_short_fixes(done: dict) -> None:
    """人工裁决覆盖(始终生效,包括存量与 --force 重跑)。

    模型逐条压缩,看不见「别的职业压出了同一个名字」,所以撞车只能人工裁决。
    """
    for lang, table in SHORT_FIX_BY_LANG.items():
        field = to_short_spec(lang).field
        for noc, fixed_name in table.items():
            if noc in done:
                done[noc][field] = fixed_name


def report_short_dups(x: DupReportIn) -> None:
    """撞车检测:两个职业压出同一个短名 = 列表/图表里出现两个同名条目 → **必须报出来**。

    不能静默上线(中文那次 Cooks 与 Chefs 双双变「厨师」就是这么抓到的;
    新 NOC 进来时这里会再次亮)。
    """
    for lang in x.langs:
        field = to_short_spec(lang).field
        groups: dict = defaultdict(list)
        have = 0
        for noc, v in x.done.items():
            if v.get(field):
                have += 1
                groups[v[field]].append(noc)
        dups = []
        for name, codes in groups.items():
            if len(codes) > 1:
                dups.append((name, codes))
        if len(dups) > 0:
            say(SHORT_DUP_WARN_TPL.format(lang=lang, n=len(dups)))
            for name, codes in dups[:SHORT_DUP_SHOW_MAX]:
                say(SHORT_DUP_ROW_TPL.format(name=name, codes=SHORT_DUP_SEP.join(codes)))
        else:
            say(SHORT_DUP_OK_TPL.format(lang=lang))
        say(SHORT_HAVE_TPL.format(lang=lang, n=have))


def to_short_spec(lang: str) -> ShortSpec:
    """三语规格表的一行 → 属性访问形(字典键只许住 to_* 行构造器体内)。"""
    spec = SPECS[lang]
    return ShortSpec(field=spec["field"], src=spec["src"], max_len=spec["max"],
                     charset=spec["charset"], prompt=spec["prompt"], strip=spec["strip"])


def to_en_of(rows: list) -> dict:
    """官方名清单 → {noc: 官方英文名}(原字典推导拆成显式 for)。"""
    en_of: dict = {}
    for row in rows:
        en_of[row.get("noc", "")] = row.get("title", "")
    return en_of

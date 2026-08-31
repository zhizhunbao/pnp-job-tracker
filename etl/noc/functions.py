"""
noc 域函数 —— 分类库(单一来源,08/09/10/11/employers 消费)+ 两个官方 CSV 步骤
(structure / descriptions)。段横幅与 constants/scheme 同名同序镜像,段内 step-down。

沿革:2026-08-31 Frank 拍板「noc 就叫 noc」—— 原根上 noc.py(分类函数)、
noc_buckets.py(bucket_of)与 noc_facts/ 两个步骤文件全溶进本文件;
行为逐字不变,金标 = 全码域 10 万 classify 探针 byte-identical + 两步产物重跑比对。
"""
import csv
import datetime
import io
import json
import os
import sys
from pathlib import Path

import httpx

from log.functions import say
from noc.constants import (
    ARG_LIMIT, ARG_RETRANSLATE, BUCKETS3, BUCKETS4, BUCKETS5, CACHE_HIT_TPL, CJK_RE,
    COL_CODE_DESC, COL_CODE_PREFIX, COL_EDESC, COL_ETYPE, COL_LEVEL, COL_TITLE, COLLISION_CODE_TPL,
    COLLISION_LANGS, COLLISION_OK_TPL, COLLISION_ROW_TPL, COLLISION_SEP, COLLISION_SHOW_MAX,
    COLLISION_WARN_TPL, COLON, DESC_CACHE_TPL, DESC_DL_TPL, DESC_DONE_TPL, DESC_SOURCE,
    DESC_TIMEOUT_S, DESC_UA, DESC_URL, DOWNLOAD_TPL, DUTIES_LEAD_SUFFIX, EMPTY_MARK, ENC_UTF8,
    ENC_UTF8_SIG, ERRORS_REPLACE, FILL_KEYS, FIX, GEN_URL_TPL, HANGUL_RE, I18N, IN_DESC_CSV,
    IN_LINE_TPL, IN_STRUCT_CSV, K_BROAD, K_BROAD_EN, K_BROAD_KO, K_BY_NOC, K_DUTIES, K_EN,
    K_EN_SHORT, K_EN_UI, K_FETCHED, K_FINE, K_FINE_EN, K_FINE_KO, K_KO, K_KO_UI, K_LEVEL,
    K_LEVELS, K_MID, K_MID_EN, K_MID_KO, K_REQUIREMENTS, K_RESPONSE, K_SOURCE, K_TEER,
    K_TEER_LABEL, K_TITLE, K_URL, K_ZH, K_ZH_UI, LANGS,
    LATIN_RE, LEVEL_COUNT_TPL, MODEL_DEFAULT, MODEL_ENV, NL, OFFICIAL_BROAD, OLLAMA_DEFAULT,
    OLLAMA_ENV, OUT_DESC, OUT_LINE_TPL, OUT_STRUCT, PREFIXES, PROBE_NOCS, PROBE_TPL, PROGRESS_TPL,
    PROMPT_TPL, QUOTE_STRIP, STRUCT_CACHE_MIN_BYTES, STRUCT_DONE_TPL, STRUCT_ENV,
    STRUCT_TIMEOUT_S, STRUCTURE_URL, TEER_TPL, TITLE_FALLBACK, TITLE_SHOW_LEN, TODO_TPL,
    TRANSLATE_FAIL_TPL, TRANSLATE_TIMEOUT_S, UI_BANNED, UI_FIX, UI_KEY_BY_LANG, UI_KEY_DEFAULT,
    UI_MAX_LEN, UI_PROMPT_TPL, UNCLASSIFIED, UNIT_LEVEL, WANT_ELEMENTS, WANT_LEVELS, ZH_MAX_LEN,
)
from noc.scheme import (
    BroadI18nIn, CheckIn, DescSeedIn, ElementRow, FillIn, FineIn, LabelIn, LevelSeedIn, MidIn,
    OllamaIn, ParseIn, TranslateIn,
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
    if is_valid_noc(noc) and noc[1].isdigit():
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
    v = get_structure_levels().get(x.noc[:4])
    if v is None:
        v = {}
    ui_key = UI_KEY_BY_LANG.get(x.lang)
    if ui_key is None:
        ui_key = UI_KEY_DEFAULT
    ui = v.get(ui_key)
    if ui:
        return ui
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
    base = os.environ.get(OLLAMA_ENV)
    if base is None or base == "":
        base = OLLAMA_DEFAULT
    model = os.environ.get(MODEL_ENV)
    if model is None or model == "":
        model = MODEL_DEFAULT
    try:
        r = httpx.post(GEN_URL_TPL.format(base=base), timeout=TRANSLATE_TIMEOUT_S,
                       json=to_ollama_payload(OllamaIn(model=model, prompt=prompt)))
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

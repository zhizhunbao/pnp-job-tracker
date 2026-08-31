"""04g_short_noc_titles — NOC 职业名的**窄位短名**,中/韩/英三语(E8-14 3.3;2026-08-02 扩到三语)。

Frank 2026-08-02「还有中文韩语简称,如果名字太长可以用简称」——查实:全库只有 title_zh_short 一列,
韩文 title_ko 是全称(「등록 간호사 및 등록 정신과 간호사」比中文全称还长)、英文官方名同理。
英文官方 title **一个字都不动**(永远是引用依据),短名是另一个字段,只用于窄位显示。

**为什么必须单独生成、不能靠规则截断**(实测证据,别再试规则):
  · 485 个中文名跑完「切、/及/和」的规则,**仍有 145 个超过 7 字**;
  · 而且规则会切出错名 ——「汽车服务技师卡车和公共汽车机械师及机械维修员」被切成
    「汽车服务技师**卡车**」(原文 Automotive service technicians, truck and bus mechanics…,
    中译漏了「技师」后的逗号,规则无从断)。

**为什么可以放手改**(2026-07-28 Frank 追问「中文也是官方的名吗」查实):
  NOC 2021 官方只有**英文与法文**,中文名本来就是本站用本地模型翻的(见 04f)。
  所以短名不是「篡改官方名」,只是把我们自己的译名写得更适合窄位显示。
  **官方英文 title 一个字都不动**,永远是引用依据;完整译名 zh 也原样保留(弹框讲语义时要用)。

IN : data/mart/noc_descriptions.json      (09 产物,含 noc + title)
     data/processed/noc_titles_i18n.json  (04f 产物,含完整中文译名 zh)
OUT: 同一个 noc_titles_i18n.json,补 zhShort / koShort / enShort 三个字段(幂等续跑,已有的跳过)

Usage:  uv run python etl/noc/main.py --only short [--lang zh,ko,en] [--limit N] [--force]

2026-08-31 批H2 归户搬家:自 etl/clean/04g_short_noc_titles.py 迁进 noc 域改此名。
clean/ 横切层清算的判据是「谁的数据谁管」:它吃 mart/noc_descriptions.json + 上一件的译名,给同一张
noc_titles_i18n.json 补短名列,同样只关 NOC 一个参考集。
本件零调度零 import(不在任何定时链/建表链上),是手动件 —— 故只进
noc/main.py 的 TOOLS,不进 SCHEDULED(noc 本就是手动域,SCHEDULED 为空)。
搬家批 —— 逻辑一字未动,只去 `__main__` 收成 run()(一域一门);旧 CLI 旗子原样能用
(本件自己读 sys.argv,与 noc/functions.py 的 build_structure 同手法)。
样张 etl/ats/scrape_ats_jobs.py(同批同形:去 __main__ + 收 run() + 裸 `import paths`)。

"""
from __future__ import annotations

import json
import os
import re
import sys

import httpx

import paths

IN_NOC = paths.MART / "noc_descriptions.json"
OUT_I18N = paths.PROCESSED / "noc_titles_i18n.json"

OLLAMA = os.environ.get("OLLAMA_URL", "http://192.168.1.150:11434")
MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.6:latest")
MAX_LEN = 7   # 中文:与图表横轴的截断阈值对齐(轴上超过 7 字才加省略号);先试 6 太紧,
              # 「保险房地产和金融经纪业经理」压成「保险金融经纪人」是好名字,却因 7 字被判失败

_RULES = """规则:
- 只输出短名本身,不要解释、不要引号、不要标点。
- 保留最能识别这个职业的核心词,砍掉「及相关职业」「和相关支持工作」这类分类学尾巴。
- 并列的多个职业只保留**第一个、也是最主要的那个**。
- 不许编造原文没有的职业。看不懂就照抄完整名的前几个词。"""

PROMPT_ZH = """把下面这个加拿大职业分类的职业名压缩成**不超过 7 个汉字**的短名。

""" + _RULES + """
- 用求职者口语里的叫法,例:
    Cooks / 厨师 → 厨师
    Food counter attendants, kitchen helpers and related support occupations → 餐饮服务员
    Automotive service technicians, truck and bus mechanics and mechanical repairers → 汽修技师
    Home child care providers → 儿童保育员
    Construction trades helpers and labourers → 建筑小工
    Retail salespersons and visual merchandisers → 零售店员

英文原名:{en}
完整名:{src}"""

PROMPT_KO = """把下面这个加拿大职业分类的职业名压缩成**不超过 12 个字符的韩语**短名(한국어).

""" + _RULES + """
- 用韩国求职者习惯的职业称谓,例:
    Registered nurses and registered psychiatric nurses / 등록 간호사 및 등록 정신과 간호사 → 간호사
    Software developers and programmers → 소프트웨어 개발자
    Construction trades helpers and labourers → 건설 보조원

英文原名:{en}
完整名:{src}"""

PROMPT_EN = """Shorten this Canadian NOC occupation title to at most 32 characters, in English.

Rules:
- Output the short title only. No explanation, no quotes, no trailing punctuation.
- Keep the core identifying words; drop taxonomy tails like "and related occupations".
- If several occupations are listed, keep only the first and main one.
- Never invent an occupation that is not in the original.
- Examples:
    Registered nurses and registered psychiatric nurses -> Registered nurses
    Food counter attendants, kitchen helpers and related support occupations -> Food counter attendants
    Automotive service technicians, truck and bus mechanics and mechanical repairers -> Auto service technicians

Official title: {en}"""

# ── 短名撞车的人工裁决(按 NOC 码,照 04f 的 TERM_FIX 先例)────────────────────────
# 模型逐条压缩,看不见「别的职业压出了同一个名字」,于是 Cooks 和 Chefs 双双变成「厨师」——
# 图表横轴会出现两根都叫「厨师」的柱子。**中文本来分得清**(厨师/主厨),是译名丢了信息,
# 所以修译名,不靠前端挂英文名打补丁。下面每一条都按官方英文名的实际语义定,不是随便改短。
SHORT_FIX = {
    "63200": "厨师",       "62200": "主厨",          # Cooks / Chefs(TEER3 $41.6K vs TEER2 $57.5K)
    "72410": "汽修技师",   "72411": "钣金喷漆工",    # 机械维修 / 车身碰撞与喷漆
    "74203": "汽车服务工",                            # Automotive service attendants(TEER4)
    "13110": "行政助理",   "12100": "高管助理",      # Administrative / Executive assistants
    "11200": "人力资源专员", "12101": "招聘专员",     # HR professionals / recruitment officers
    "21301": "机械工程师", "22301": "机械技术员",    # 工程师 / 技术员(TEER1 vs 2)
    "00013": "高级经理-民生", "00014": "高级经理-贸易", "00015": "高级经理-工程",
    "62101": "零售采购员", "14403": "采购文员",      # buyers / purchasing clerks
    "31111": "验光师",     "32100": "配镜师",        # Optometrists / Opticians
    "51100": "图书管理员", "14300": "图书馆助理",    # Librarians / library assistants
    "94142": "水产加工工", "95107": "水产普工",      # plant workers / labourers(TEER4 vs 5)
    "72405": "机械装配工", "94204": "装配检验工",
    "94131": "纺织工",     "95105": "纺织普工",
    "83110": "伐木机械操作员", "84110": "油锯操作员",
    "42102": "军队专业人员", "44200": "作战人员",
    "40010": "政府经理-民生", "40011": "政府经理-经济",   # Government managers - health/social vs economic analysis
}

# 韩文短名的人工裁决(2026-08-02 首轮实测撞到的,与中文那三组**同源** ——
# 官方英文本来就分得清 Cooks/Chefs、Optometrists/Opticians,是压缩时把区别丢了)。
# 语义照中文 SHORT_FIX 对齐,不是随便改短。
SHORT_FIX_KO = {
    "63200": "요리사",       "62200": "셰프",            # Cooks / Chefs
    "31111": "검안사",       "32100": "안경사",          # Optometrists / Opticians
    "00012": "고급관리자-금융", "00013": "고급관리자-보건",
    "00014": "고급관리자-무역", "00015": "고급관리자-공학",
    # 第二轮实跑撞车(照官方英文名与中文短名的语义分,不是随便改短):
    "22313": "항공전자정비사", "72404": "항공정비사",     # 仪表电气与航电 / 机体与检验
    "41300": "사회복지사",   "42201": "지역사회복지원",  # Social workers / Social and community service workers
    "72300": "배관공",       "72301": "파이프피터",      # Plumbers / Steamfitters·pipefitters
    "72410": "자동차정비사", "74203": "부품설치원",      # 汽修技师 / 零件安装与服务(TEER4)
    "92015": "섬유가죽감독자", "92024": "제조감독자",     # 纺织皮革主管 / 其他制造主管
}
# 英文短名的裁决表:官方名本身区分度高,首轮跑完看撞车报告再补(留空是**有意**的,不是忘了)
SHORT_FIX_EN: dict[str, str] = {}

CJK = re.compile(r"[一-鿿]")
HANGUL = re.compile(r"[가-힯]")
LATIN = re.compile(r"[A-Za-z]")
BAD = re.compile(r"[。,,、;;::!!??\"'`]")          # 标点一律去掉;空格另说(韩/英要留词间空格)
BAD_ZH = re.compile(r"[。,,、;;::!!??\"'`\s]")     # 中文短名连空格都不该有

# 三语规格:字段名 / 取哪个完整名当原料 / 长度上限 / 必须含哪种字符 / 提示词。
# 加一门语言=加一行,不改流程(04f 的 LANGS 同精神)。
SPECS = {
    "zh": {"field": "zhShort", "src": "zh",  "max": 7,  "charset": CJK,    "prompt": PROMPT_ZH, "strip": BAD_ZH},
    "ko": {"field": "koShort", "src": "ko",  "max": 12, "charset": HANGUL, "prompt": PROMPT_KO, "strip": BAD},
    "en": {"field": "enShort", "src": "en",  "max": 32, "charset": LATIN,  "prompt": PROMPT_EN, "strip": BAD},
}


def ask(lang: str, en: str, src: str) -> str:
    spec = SPECS[lang]
    try:
        r = httpx.post(
            f"{OLLAMA}/api/chat", timeout=90,
            json={"model": MODEL, "think": False, "stream": False,
                  "options": {"temperature": 0.1, "num_predict": 40},
                  "messages": [{"role": "user", "content": spec["prompt"].format(en=en, src=src or "(none)")}]},
        )
        r.raise_for_status()
        return (r.json().get("message", {}).get("content") or "").strip()
    except Exception:  # noqa: BLE001
        return ""


def ok(lang: str, out: str, src: str) -> bool:
    """校验:够短、含该语言的字、不带标点、不比原名还长。不过关留空 —— 宁可显示长名也不显示胡编的短名。"""
    spec = SPECS[lang]
    out = spec["strip"].sub("", out).strip()
    if not (1 < len(out) <= spec["max"]):
        return False
    if not spec["charset"].search(out):
        return False
    if lang == "zh" and re.search(r"[A-Za-z]{3,}", out):     # 中文短名吐回英文
        return False
    if lang == "ko" and CJK.search(out):                     # 韩文短名混进汉字
        return False
    return not (src and len(out) >= len(src))  # 没压缩就不算数(原样吐回 → 走「本来就够短」分支)


def main() -> None:
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None
    force = "--force" in sys.argv
    langs = sys.argv[sys.argv.index("--lang") + 1].split(",") if "--lang" in sys.argv else list(SPECS)
    print(f"IN : {IN_NOC}")
    print(f"OUT: {OUT_I18N}")
    print(f"模型: {MODEL} @ {OLLAMA}   语言: {','.join(langs)}")

    rows = json.loads(IN_NOC.read_text(encoding="utf-8"))
    done: dict = json.loads(OUT_I18N.read_text(encoding="utf-8")) if OUT_I18N.exists() else {}
    en_of = {r.get("noc", ""): r.get("title", "") for r in rows}

    for lang in langs:
        spec = SPECS[lang]
        field, cap = spec["field"], spec["max"]
        # 原料:zh/ko 用 04f 的完整译名,en 用官方英文名(官方名不动,短名另存一列)
        def src_of(noc: str) -> str:
            return en_of.get(noc, "") if lang == "en" else (done.get(noc) or {}).get(lang, "")

        todo = []
        for r in rows:
            noc = r.get("noc", "")
            src = src_of(noc)
            if not noc or not src:
                continue
            if (done.get(noc) or {}).get(field) and not force:
                continue
            if len(src) <= cap:
                done.setdefault(noc, {})[field] = src      # 本来就够短 → 短名=完整名(不浪费一次调用也不引入新错)
                continue
            todo.append((noc, en_of.get(noc, ""), src))
        if limit:
            todo = todo[:limit]
        print(f"[{lang}] 待压缩 {len(todo)} 条(≤{cap} 的已直接复用)")

        n_ok = n_skip = 0
        for i, (noc, en, src) in enumerate(todo, 1):
            out = spec["strip"].sub("", ask(lang, en, src)).strip()
            if ok(lang, out, src):
                done.setdefault(noc, {})[field] = out
                n_ok += 1
            else:
                n_skip += 1
                print(f"  ✗ {noc} {src} → {out!r}(不过校验,留空回退长名)")
            if i % 25 == 0 or i == len(todo):
                OUT_I18N.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8")
                print(f"  [{lang}] {i}/{len(todo)} 已写盘(成功 {n_ok} / 留空 {n_skip})")
        print(f"[{lang}] 本轮成功 {n_ok} / 未过校验 {n_skip}")

    # 人工裁决覆盖(始终生效,包括存量与 --force 重跑):模型逐条压缩,看不见「别的职业压出了同一个名字」
    for lang, table in (("zh", SHORT_FIX), ("ko", SHORT_FIX_KO), ("en", SHORT_FIX_EN)):
        field = SPECS[lang]["field"]
        for noc, fixed_name in table.items():
            if noc in done:
                done[noc][field] = fixed_name
    OUT_I18N.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8")

    # 撞车检测:两个职业压出同一个短名 = 列表/图表里出现两个同名条目 → **必须报出来**,不能静默上线
    # (中文那次 Cooks 与 Chefs 双双变「厨师」就是这么抓到的;新 NOC 进来时这里会再次亮)
    from collections import defaultdict as _dd
    for lang in langs:
        field = SPECS[lang]["field"]
        groups = _dd(list)
        for noc, v in done.items():
            if v.get(field):
                groups[v[field]].append(noc)
        dups = {k: v for k, v in groups.items() if len(v) > 1}
        have = sum(1 for v in done.values() if v.get(field))
        if dups:
            print(f"⚠ [{lang}] 短名撞车 {len(dups)} 组(补进裁决表再跑):")
            for k, v in list(dups.items())[:20]:
                print(f"   {k}: {', '.join(v)}")
        else:
            print(f"✓ [{lang}] 短名无撞车")
        print(f"  [{lang}] 累计有短名 {have} 条")
    print(f"✓ {OUT_I18N}")


def run() -> None:
    """本域手动件入口：NOC 职业名 → 中/韩/英窗位短名（幂等续跑）。"""
    main()

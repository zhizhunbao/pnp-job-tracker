"""build_noc_structure — NOC 2021 官方分类层级(StatCan 开放 CSV,httpx 直取)。

**为什么要有这个文件**:中/小分类先前是手搓的(etl/noc.py 里一张 NOC_INFO 表 + 19 条前缀规则)——
覆盖不到的就拿大类名顶上,于是 491 个职业里 381 个「小类 == 中类」= 等于没有小类;
而兜底规则 `^2 → IT` 把 22 开头的各行业技术员全塞进「IT」(景观园艺技师、家电维修…… Frank 实见)。
官方**自己就有**完整层级,没有任何理由自己发明桶:
  Broad Category 10 → Major 45 → Sub-major 89 → Minor 162 → Unit 516
本站取:大类=Broad(第 1 位) · 中类=Sub-major(前 3 位) · 小类=Minor(前 4 位)。

英文名直接用官方 Class title(引用依据,永不改);显示用的短名做**确定性前缀剥离**
(「Technical occupations in X」→「X」,不是改名,是去掉每条都重复的套话)。
中/韩名本地 qwen3.6 翻(同 04f 的口径:术语求准不求文采,逐条校验,不过关留空 —— 宁可留空也不瞎猜)。

IN : https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-classification-structure.csv
OUT: data/raw/noc/structure.json   { levels: {code: {level, en, enShort, zh, ko}}, fetched }

Usage:  uv run python etl/build_noc_structure.py [--limit N] [--retranslate]
"""
from __future__ import annotations

import csv
import datetime
import io
import json
import os
import re
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # 分域后上一级才是 etl/
import _paths  # noqa: E402

URL = "https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-classification-structure.csv"
IN_CSV = _paths.NOC / "noc-structure.csv"       # 下载缓存(可重下)
OUT = _paths.NOC / "structure.json"             # 维护表(noc.py / 09 消费)

OLLAMA = os.environ.get("OLLAMA_URL", "http://192.168.1.150:11434")
MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.6:latest")

# 只剥**纯套话**前缀。
# ⚠️ 2026-08-03 第一版剥过头了:「Professional occupations in natural sciences」(211) 与
# 「Technical occupations **related to** natural sciences」(221) 双双变成「Natural sciences」——
# 那两个词恰恰是这两层的区别(专业 vs 技术),剥掉就是把两个类别合并成同一个名字。
# 教训与 04g 短名那次一样:**压缩是有损的,损掉的往往正是区分点**。所以现在只剥
# 「Occupations in」这种一点信息都不带的开头,其余照官方原样(名字长由控件让,不由名字缩)。
PREFIXES = ["Occupations in ", "Occupations "]

PROMPT = """把下面这个加拿大官方职业分类(NOC 2021)的**类别名**翻译成{lang}。

规则:
- 只输出译名本身,不要解释、不要引号、不要标点结尾。
- 这是**一类职业的名字**(不是某个具体岗位),用求职者看得懂的说法。
- 求准不求文采;**尽量简洁**(中文不超过 16 个字),但不许丢掉限定词。
- **并列项之间要有分隔**:中文用顿号「、」,韩文用「,」—— 不许把几个词粘成一串。
- except X / other than X 译成括号补语:「(不含 X)」。
- 术语注意:trades 指「工种/技工」不是贸易;utilities 指「公用事业」;
  natural sciences=自然科学、applied sciences=应用科学、engineering=工程。

类别名:{title}"""

LANGS = {"zh": "简体中文", "ko": "한국어", "en": "English"}

# 人话名(2026-08-03 Frank 实拍「你现在这个大类 中类 小类 让人看不懂」):
# 官方名是**统计年鉴的话**(「行政服务金融与商业服务及通信专业中层管理职业(不含广播)」),
# 拿它当界面文案 = 让求职者读普查表。官方名留作数据与灰字小注,显示层用这一版。
UI_PROMPT = """下面是加拿大官方职业分类里的一类职业(官方名写得很学术)。
用**招聘网站的分类口吻**给这一类起个名字,翻译成{lang}。

规则:
- 只输出名字本身,不要解释、不要引号。
- **4-10 个字**(韩文相当长度),像招聘网站左侧的分类名。
- 不要「职业」「人员」「相关」「专业」这类套话,不要括号补语,不要「不含 X」。
- 用求职者会说的词:计算机相关就说 IT,护理就说 护理,餐饮就说 餐饮。
- 保留这一类真正的区分点(技术员 vs 专业人员、中层管理 vs 一线)。

官方名:{title}"""

# 十个大类的人话名**手写**(它们是浏览入口,最该是人话;模型不必掺和)。
# 官方名照旧在 en/zh 里,界面把它当灰字小注 —— 人话名主文案 + 官方名小注(CLAUDE.md 展示约定)。
UI_FIX = {
    ("0", "zh"): "管理层", ("0", "en"): "Management", ("0", "ko"): "관리직",
    ("1", "zh"): "商务与行政", ("1", "en"): "Business & admin", ("1", "ko"): "비즈니스·행정",
    ("2", "zh"): "科技与工程", ("2", "en"): "Tech & engineering", ("2", "ko"): "기술·엔지니어링",
    ("3", "zh"): "医疗与健康", ("3", "en"): "Healthcare", ("3", "ko"): "의료·헬스케어",
    ("4", "zh"): "教育与社会服务", ("4", "en"): "Education & social", ("4", "ko"): "교육·사회서비스",
    ("5", "zh"): "文化艺术与体育", ("5", "en"): "Arts & sport", ("5", "ko"): "예술·스포츠",
    ("6", "zh"): "销售与服务", ("6", "en"): "Sales & service", ("6", "ko"): "영업·서비스",
    ("7", "zh"): "技工与运输", ("7", "en"): "Trades & transport", ("7", "ko"): "기능직·운송",
    ("8", "zh"): "农林渔与资源", ("8", "en"): "Resources & farming", ("8", "ko"): "자원·농업",
    ("9", "zh"): "制造与公用事业", ("9", "en"): "Manufacturing", ("9", "ko"): "제조·공공사업",
}

# 人工裁决表(同 04g 的 SHORT_FIX):模型连着几轮都过不了校验的,手写进来 ——
# 写在脚本里而不是改产出文件,重跑才不会丢。留空也行(前端回退英文),但这两条是中类,出现频率高。
FIX = {
    ("100", "ko"): "행정, 금융, 비즈니스 서비스 및 통신 전문 중간관리직(방송 제외)",
    ("700", "zh"): "技工与运输中层管理职业",
}
CJK = re.compile(r"[一-鿿]")
HANGUL = re.compile(r"[가-힯]")
LATIN = re.compile(r"[A-Za-z]{4,}")


def download() -> str:
    IN_CSV.parent.mkdir(parents=True, exist_ok=True)
    if IN_CSV.exists() and IN_CSV.stat().st_size > 10_000:
        print(f"  用缓存 {IN_CSV.name}")
        return IN_CSV.read_text(encoding="utf-8-sig")
    print(f"  下载 {URL}")
    r = httpx.get(URL, timeout=60, follow_redirects=True)
    r.raise_for_status()
    IN_CSV.write_bytes(r.content)
    return r.content.decode("utf-8-sig")


def short_en(title: str) -> str:
    """剥掉每条都重复的套话前缀 —— 去的是套话,不是改名(官方全名仍在 en 字段里)。"""
    s = title
    for p in PREFIXES:
        if s.startswith(p):
            s = s[len(p):]
            break
    return s[:1].upper() + s[1:] if s else title


def translate(title: str, lang: str, ui: bool = False) -> str:
    """一条一译,逐条校验;不过关返回空 —— 空的前端回退,不瞎编。ui=True 出人话名(界面用)。"""
    try:
        r = httpx.post(f"{OLLAMA}/api/generate", timeout=120, json={
            "model": MODEL, "stream": False, "think": False,
            "prompt": (UI_PROMPT if ui else PROMPT).format(lang=LANGS[lang], title=title),
            "options": {"temperature": 0},
        })
        r.raise_for_status()
        out = (r.json().get("response") or "").strip().strip('"“”「」').split("\n")[-1].strip()
    except Exception as e:                                    # 网络/模型抽风:这一条留空,下次续跑
        print(f"    ! {lang} {title[:40]}: {e}")
        return ""
    if not out or len(out) > (16 if ui else 40):
        return ""
    if ui and ("职业" in out or "人员" in out or "(" in out or "(" in out):   # 套话/括号补语一律退回重来
        return ""
    if lang == "zh" and (not CJK.search(out) or LATIN.search(out)):
        return ""
    if lang == "ko" and not HANGUL.search(out):
        return ""
    return out


def main() -> None:
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 0
    retranslate = "--retranslate" in sys.argv
    print(f"IN : {URL}\nOUT: {OUT}")

    rows = list(csv.DictReader(io.StringIO(download())))
    code_col = next(c for c in rows[0] if c.startswith("Code"))
    old = json.loads(OUT.read_text(encoding="utf-8")).get("levels", {}) if OUT.exists() and not retranslate else {}

    levels: dict[str, dict] = {}
    for r in rows:
        lvl, code, title = r["Level"], r[code_col].strip(), r["Class title"].strip()
        if lvl not in ("1", "3", "4") or not code:            # 大类 / 中类 / 小类;major(2) 与 unit(5) 本站不用
            continue
        prev = old.get(code, {})
        levels[code] = {"level": int(lvl), "en": title, "enShort": short_en(title),
                        "zh": prev.get("zh", ""), "ko": prev.get("ko", ""),
                        # 人话名(界面显示用;官方名留作灰字小注与出处)
                        "zhUi": UI_FIX.get((code, "zh"), prev.get("zhUi", "")),
                        "koUi": UI_FIX.get((code, "ko"), prev.get("koUi", "")),
                        "enUi": UI_FIX.get((code, "en"), prev.get("enUi", ""))}
    print(f"  层级:大类 {sum(1 for v in levels.values() if v['level'] == 1)}"
          f" · 中类 {sum(1 for v in levels.values() if v['level'] == 3)}"
          f" · 小类 {sum(1 for v in levels.values() if v['level'] == 4)}")

    todo = [c for c, v in levels.items() if not all(v[k] for k in ("zh", "ko", "zhUi", "koUi", "enUi"))]
    if limit:
        todo = todo[:limit]
    print(f"  待翻 {len(todo)} 条(已翻的跳过;--retranslate 全部重来)")
    for i, code in enumerate(todo, 1):
        v = levels[code]
        for lang in ("zh", "ko"):
            if not v[lang]:
                v[lang] = FIX.get((code, lang)) or translate(v["enShort"], lang)
        for lang, key in (("zh", "zhUi"), ("ko", "koUi"), ("en", "enUi")):
            if not v[key]:
                v[key] = translate(v["enShort"], lang, ui=True) if lang != "en" else short_en(v["en"])
        print(f"  [{i}/{len(todo)}] {code} {v['enShort'][:34]:<36} 人话 zh={v['zhUi'] or '(空)'} ko={v['koUi'] or '(空)'}")

    # 撞车检测(04g 短名那次的教训:逐条翻的模型看不见别的条目,两个类别翻成同一个名字它不会知道;
    # 而分类名撞车 = 筛选下拉里出现两个一模一样的选项,点哪个都对不上)。**只报不改**,人工裁决。
    for lang in ("enShort", "zh", "ko", "zhUi"):
        seen: dict[str, list[str]] = {}
        for code, v in levels.items():
            if v[lang]:
                seen.setdefault(v[lang], []).append(code)
        # 官方自己就有同名:某一层只有一个孩子时,官方把名字原样往下抄一层占位
        # (89 个中类里 48 个只有一个小类,其中 29 个父子同名 —— 那是「这条分支到此为止」,不是撞车)。
        real, official = [], 0
        for k, cs in seen.items():
            if len(cs) < 2:
                continue
            cs = sorted(cs, key=len)
            if all(c.startswith(cs[0]) for c in cs):
                official += 1
            else:
                real.append((k, cs))
        if real:
            print(f"  ⚠ {lang} 撞车 {len(real)} 组(**要人工裁决**,写进 FIX 表):")
            for k, cs in real[:12]:
                print(f"      「{k}」← {' / '.join(f'{c}={levels[c]['en'][:34]}' for c in cs)}")
        else:
            print(f"  ✓ {lang} 无撞车(官方父子同名占位 {official} 组不算)")

    miss = {lang: sum(1 for v in levels.values() if not v[lang]) for lang in ("zh", "ko", "zhUi", "koUi")}
    OUT.write_text(json.dumps({"fetched": datetime.date.today().isoformat(), "source": URL, "levels": levels},
                              ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n写出 {OUT}  共 {len(levels)} 条;留空 zh {miss['zh']} · ko {miss['ko']}")


if __name__ == "__main__":
    main()

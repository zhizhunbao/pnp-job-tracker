"""04f_translate_noc_titles — NOC 官方职业名的中/韩译名(#147,Frank「中韩用户只看英文难理解」)。

**为什么值得翻**:NOC 是**固定参考集**(487 个 5 位码,官方极少改)——翻一次永久复用,
不是每个岗位现翻;与「翻译走线上懒翻不提前批量」的拍板不冲突(那条针对的是**新闻正文**这类持续增量的内容)。

口径(Frank 拍板「英文在前」):英文名仍是主文案,译名只作灰字小注 → 只需**准确**不需文采。
职业名是术语,本地 qwen3.6 足够;逐条校验(非空/不回英文/长度合理),不过关留空——**宁可留空也不瞎猜**。

IN : data/mart/noc_descriptions.json      (09 产物,含 noc + title)
OUT: data/processed/noc_titles_i18n.json  (noc → {zh, ko};幂等续跑,已翻的跳过)

Usage:  uv run python etl/clean/04f_translate_noc_titles.py [--limit N]
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402

IN_NOC = _paths.MART / "noc_descriptions.json"
OUT_I18N = _paths.PROCESSED / "noc_titles_i18n.json"

OLLAMA = os.environ.get("OLLAMA_URL", "http://192.168.1.150:11434")
MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.6:latest")

PROMPT = """把下面这个加拿大官方职业分类(NOC)的职业名称翻译成{lang}。

规则:
- 只输出译名本身,不要解释、不要引号、不要标点结尾。
- 用该语言求职者习惯的职业称谓(如 Physiotherapists → 物理治疗师)。
- 名称含「- 限定语」的保留限定(如 Senior managers - health → 高级经理 - 医疗)。
- 保持简洁,不加「人员」「工作者」等冗余后缀,除非原文确实如此。
- 术语注意:职业名里的 trades 指「工种/技工」不是贸易;developer 指「开发人员」不是开发商。

职业名称:{title}"""

LANGS = {"zh": "简体中文", "ko": "한국어"}
CJK = re.compile(r"[一-鿿]")
HANGUL = re.compile(r"[가-힯]")

# 多义词纠正(首轮 487 条实测出的错,模型重跑还会错 → 修进脚本而非手改数据):
#   trades  职业名里是「工种/技工」,不是贸易(Construction trades helpers ≠ 建筑贸易)
#   developer 是「开发人员」,不是开发商(开发商=厂商/地产商)
# 只做**确定性替换**,不猜:命中才换,换不了保持原样。
TERM_FIX = [
    ("软件开发商", "软件开发员"), ("开发商和程序员", "开发人员和程序员"),
    ("建筑贸易", "建筑技工"), ("电气贸易", "电气技工"), ("管道贸易", "管道技工"),
    ("木工贸易", "木工工种"), ("机械贸易", "机械工种"), ("贸易和电信", "技工和电信"),
    ("建筑 Trades", "建筑技工"), ("Trades", "技工"),
]


def fix_terms(s: str) -> str:
    for a, b in TERM_FIX:
        s = s.replace(a, b)
    return s


def ask(title: str, lang: str) -> str:
    """调一次本地模型;失败/超时返空(调用方留空不入库)。"""
    try:
        r = httpx.post(
            f"{OLLAMA}/api/chat", timeout=90,
            json={"model": MODEL, "think": False, "stream": False,
                  "options": {"temperature": 0.1, "num_predict": 60},
                  "messages": [{"role": "user", "content": PROMPT.format(lang=LANGS[lang], title=title)}]},
        )
        r.raise_for_status()
        return (r.json().get("message", {}).get("content") or "").strip()
    except Exception:  # noqa: BLE001
        return ""


def ok(out: str, src: str, lang: str) -> bool:
    """校验:非空、长度合理、含目标语言字符、不是把英文原样吐回来。"""
    out = out.strip()
    if not (1 < len(out) <= 40):
        return False
    if out.lower() == src.lower():
        return False
    return bool(CJK.search(out) if lang == "zh" else HANGUL.search(out))


def main() -> None:
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    print(f"IN : {IN_NOC}")
    print(f"OUT: {OUT_I18N}")
    print(f"模型: {MODEL} @ {OLLAMA}")

    rows = json.loads(IN_NOC.read_text(encoding="utf-8"))
    done: dict = json.loads(OUT_I18N.read_text(encoding="utf-8")) if OUT_I18N.exists() else {}

    # 存量也过一遍术语纠正(TERM_FIX 是后加的;已翻的不重跑模型,只做确定性替换)
    fixed = 0
    for v in done.values():
        if v.get("zh"):
            nz = fix_terms(v["zh"])
            if nz != v["zh"]:
                v["zh"], fixed = nz, fixed + 1
    if fixed:
        OUT_I18N.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"术语纠正:存量改了 {fixed} 条")

    todo = [r for r in rows if r.get("title") and not (done.get(r["noc"], {}).get("zh") and done.get(r["noc"], {}).get("ko"))]
    if limit:
        todo = todo[:limit]
    print(f"待翻 {len(todo)} 条(已有 {len(done)} 条)")

    n_ok = n_skip = 0
    for i, r in enumerate(todo, 1):
        noc, title = r["noc"], r["title"]
        cur = done.setdefault(noc, {})
        for lang in ("zh", "ko"):
            if cur.get(lang):
                continue
            out = ask(title, lang)
            if lang == "zh":
                out = fix_terms(out)
            if ok(out, title, lang):
                cur[lang] = out
                n_ok += 1
            else:
                n_skip += 1        # 留空:前端回退只显英文(宁可留空也不瞎猜)
        if i % 20 == 0 or i == len(todo):
            OUT_I18N.parent.mkdir(parents=True, exist_ok=True)
            OUT_I18N.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"  {i}/{len(todo)} · 成功 {n_ok} · 留空 {n_skip} · 最新: {title} → {cur.get('zh', '—')}")

    OUT_I18N.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8")
    full = sum(1 for v in done.values() if v.get("zh") and v.get("ko"))
    print(f"✓ {OUT_I18N}  ({full}/{len(rows)} 条中韩齐全;本轮成功 {n_ok} 留空 {n_skip})")


if __name__ == "__main__":
    main()

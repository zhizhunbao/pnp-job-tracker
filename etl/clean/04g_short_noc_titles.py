"""04g_short_noc_titles — NOC 职业名的**中文短名**(E8-14 3.3,Frank「很多职业名字是不是太长了啊」)。

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
OUT: 同一个 noc_titles_i18n.json,补 zhShort 字段(幂等续跑,已有的跳过)

Usage:  uv run python etl/clean/04g_short_noc_titles.py [--limit N] [--force]
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
MAX_LEN = 7   # 与图表横轴的截断阈值对齐(轴上超过 7 字才加省略号);先试 6 太紧,
              # 「保险房地产和金融经纪业经理」压成「保险金融经纪人」是好名字,却因 7 字被判失败

PROMPT = """把下面这个加拿大职业分类的职业名压缩成**不超过 7 个汉字**的短名。

规则:
- 只输出短名本身,不要解释、不要引号、不要标点。
- 保留最能识别这个职业的核心词,砍掉「及相关职业」「和相关支持工作」这类分类学尾巴。
- 并列的多个职业只保留**第一个、也是最主要的那个**。
- 用求职者口语里的叫法,例:
    Cooks / 厨师 → 厨师
    Food counter attendants, kitchen helpers and related support occupations → 餐饮服务员
    Automotive service technicians, truck and bus mechanics and mechanical repairers → 汽修技师
    Home child care providers → 儿童保育员
    Construction trades helpers and labourers → 建筑小工
    Retail salespersons and visual merchandisers → 零售店员
- 不许编造原文没有的职业。看不懂就照抄完整中文名的前几个字。

英文原名:{en}
完整中文名:{zh}"""

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

CJK = re.compile(r"[一-鿿]")
BAD = re.compile(r"[。,,、;;::!!??\"'`\s]")


def ask(en: str, zh: str) -> str:
    try:
        r = httpx.post(
            f"{OLLAMA}/api/chat", timeout=90,
            json={"model": MODEL, "think": False, "stream": False,
                  "options": {"temperature": 0.1, "num_predict": 24},
                  "messages": [{"role": "user", "content": PROMPT.format(en=en, zh=zh or "(无)")}]},
        )
        r.raise_for_status()
        return (r.json().get("message", {}).get("content") or "").strip()
    except Exception:  # noqa: BLE001
        return ""


def ok(out: str, zh: str) -> bool:
    """校验:纯中文、够短、不带标点、不比原名还长。不过关留空 —— 宁可显示长名也不显示胡编的短名。"""
    out = BAD.sub("", out).strip()
    if not (1 < len(out) <= MAX_LEN):
        return False
    if not CJK.search(out):
        return False
    if re.search(r"[A-Za-z]{3,}", out):     # 吐回英文
        return False
    return not (zh and len(out) >= len(zh))  # 没压缩就不算数(原样吐回 → 走下面的「本来就够短」分支)


def main() -> None:
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None
    force = "--force" in sys.argv
    print(f"IN : {IN_NOC}\nOUT: {OUT_I18N}\n模型: {MODEL} @ {OLLAMA}")

    rows = json.loads(IN_NOC.read_text(encoding="utf-8"))
    done: dict = json.loads(OUT_I18N.read_text(encoding="utf-8")) if OUT_I18N.exists() else {}

    def zh_of(noc: str) -> str:
        return (done.get(noc) or {}).get("zh", "")

    # 只处理「完整中文名超过 MAX_LEN」的 —— 本来就短的直接复用,不浪费一次调用也不引入新错
    todo = []
    for r in rows:
        noc = r.get("noc", "")
        zh = zh_of(noc)
        if not noc or not zh:
            continue
        cur = (done.get(noc) or {}).get("zhShort")
        if cur and not force:
            continue
        if len(zh) <= MAX_LEN:
            done.setdefault(noc, {})["zhShort"] = zh      # 已经够短 → 短名=完整名
            continue
        todo.append((noc, r.get("title", ""), zh))
    if limit:
        todo = todo[:limit]
    print(f"待压缩 {len(todo)} 条(≤{MAX_LEN} 字的已直接复用)")

    n_ok = n_skip = 0
    for i, (noc, en, zh) in enumerate(todo, 1):
        out = BAD.sub("", ask(en, zh)).strip()
        if ok(out, zh):
            done.setdefault(noc, {})["zhShort"] = out
            n_ok += 1
        else:
            n_skip += 1
            print(f"  ✗ {noc} {zh} → {out!r}(不过校验,留空回退长名)")
        if i % 25 == 0 or i == len(todo):
            OUT_I18N.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"  {i}/{len(todo)} 已写盘")
    # 人工裁决覆盖(始终生效,包括存量与 --force 重跑)
    for noc, fixed_name in SHORT_FIX.items():
        if noc in done:
            done[noc]["zhShort"] = fixed_name
    OUT_I18N.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8")

    # 撞车检测:两个职业压出同一个短名 = 图表横轴会出现两根同名柱子 → **必须报出来**,
    # 不能静默上线(新 NOC 进来时这里会再次亮,提醒补 SHORT_FIX)
    from collections import defaultdict as _dd
    groups = _dd(list)
    for noc, v in done.items():
        if v.get("zhShort"):
            groups[v["zhShort"]].append(noc)
    dups = {k: v for k, v in groups.items() if len(v) > 1}
    if dups:
        print(f"⚠ 短名撞车 {len(dups)} 组(补进 SHORT_FIX 再跑):")
        for k, v in dups.items():
            print(f"   {k}: {', '.join(v)}")
    else:
        print("✓ 短名无撞车")

    have = sum(1 for v in done.values() if v.get("zhShort"))
    print(f"✓ 本轮成功 {n_ok} / 未过校验 {n_skip};累计有短名 {have} 条 → {OUT_I18N}")


if __name__ == "__main__":
    main()

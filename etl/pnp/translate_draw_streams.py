"""省提名抽选流名中文灰注(#280,Frank 走查:zh 态弹框「最近抽选」卡与 /start 抽选表满屏英文流名)。

范围 = data/raw/pnp/draws.json 全部省块(实测有抽选记录的是 AB/BC/MB/NB/NL/ON,其余省走门槛/
分制表没有逐期抽选流)的 distinct stream 名(2026-08-08 实测 41 个,远低于「预计 <200」的口径线,
一遍能跑完不用分批预算)。
联邦(FED)轮次不在本脚本范围 —— 那边的 label 是数据层已有的封闭枚举(cat_key),
i18n.ts 的 EE_KEY_L10N 已经全量三语映射(eeKeyDisplay),不重复造轮子。

产出 data/processed/draw_stream_zh.json:{ stream(原文): { zh, translatedAt } },
增量落盘可断点续跑 —— 已翻译过的 stream 直接跳过,只翻新出现的。09_build_mart.py
读这份缓存给 pnp_draws.streamZh 列;缓存里没有的 stream(还没跑到 / 翻译失败)该列留空,
前端优雅回退纯英文(不是「缺失时报错」,是「缺失时不出注」,与站规「宁可留空也不瞎猜」一致)。

本地 Ollama qwen3.6(/no_think,零温)意译,手法同 etl/clean/_enrich_shelf_aliases.py 的
qwen_translate:官方专有名保留在主文案(前端仍显示 stream 原文英文),这里只产**中文灰注短语**
——要那种一看就懂的人话短注(「Skilled Worker Stream」→「技术工人通道」),不是逐字直译。
校验:非空、含中文、单行、≤20 字、zhconv 转简体(qwen3 偶发吐繁体)。
校验不过 = 该条不写入缓存,下轮重试,绝不把英文原文或半吊子译文当中文注塞进去。

用法: python -X utf8 etl/pnp/translate_draw_streams.py
"""
import json
import re
import sys
from pathlib import Path

import httpx
from zhconv import convert as zh_convert

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths

IN_DRAWS = _paths.PNP / "draws.json"
OUT = _paths.PROCESSED / "draw_stream_zh.json"
print(f"IN_DRAWS={IN_DRAWS}\nOUT={OUT}", flush=True)

OLLAMA = "http://192.168.1.150:11434/api/generate"
MODEL = "qwen3.6:latest"
CJK = re.compile(r"[一-鿿]")

PROMPT = (
    "/no_think 把这个加拿大省提名(PNP)抽选通道名意译成简体中文短注,给不懂英文的申请人看的人话短语,"
    "不是逐字直译。只输出短注本身,一行,不要拼音、不要解释、不要引号、不超过 12 个汉字。"
    "通道名:" + "{name}"
)


def distinct_streams() -> list[str]:
    data = json.loads(IN_DRAWS.read_text(encoding="utf-8"))
    seen: dict[str, None] = {}  # dict 保序(先出现先翻),比 set 更好读日志
    for prov, v in data.get("provinces", {}).items():
        for dr in v.get("draws", []):
            s = (dr.get("stream") or "").strip()
            if s:
                seen.setdefault(s, None)
    return list(seen.keys())


def qwen_translate(cl: httpx.Client, name: str) -> str | None:
    try:
        r = cl.post(OLLAMA, json={"model": MODEL, "prompt": PROMPT.format(name=name),
                                   "stream": False, "options": {"temperature": 0}}, timeout=60)
        r.raise_for_status()
        out = (r.json().get("response") or "").strip().strip('"「」『』\'')
        out = out.splitlines()[-1].strip() if out else ""
        if not out or len(out) > 20 or not CJK.search(out):
            return None
        return zh_convert(out, "zh-cn")
    except Exception:  # noqa: BLE001 — 单条失败不断轮,留空下轮重试
        return None


def main() -> None:
    streams = distinct_streams()
    prev: dict = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    todo = [s for s in streams if s not in prev]
    print(f"库内 distinct 流名 {len(streams)} 个,待翻 {len(todo)}(已缓存 {len(prev)})", flush=True)
    if not todo:
        return

    def save() -> None:
        OUT.write_text(json.dumps(prev, ensure_ascii=False, indent=1), encoding="utf-8")

    done = 0
    with httpx.Client() as cl:
        for i, name in enumerate(todo):
            zh = qwen_translate(cl, name)
            if zh:
                from datetime import datetime, timezone
                prev[name] = {"zh": zh, "translatedAt": datetime.now(timezone.utc).isoformat()}
                done += 1
            else:
                print(f"  ✗ 校验未过,下轮重试: {name!r}")
            if (i + 1) % 10 == 0:
                save()
                print(f"  {i + 1}/{len(todo)} · 命中 {done}", flush=True)
    save()
    print(f"done → {OUT} · 本轮翻译 {done}/{len(todo)}(累计缓存 {len(prev)})", flush=True)


if __name__ == "__main__":
    main()

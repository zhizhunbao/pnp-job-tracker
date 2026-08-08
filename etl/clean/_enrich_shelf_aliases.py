"""橱窗雇主中文名补全(#281 方案 A,Frank 2026-08-08 拍「这些公司的中文名需要补全」)。

范围=橱窗三表并集(~7k 家,展示驱动的有限圈定;懒查铁律的口子见 [[lazy-first-company-data]] 08-08 段),
不是全库 68k——全库批量仍禁。

两级证据,宁缺勿滥:
① Wikidata 官方跨语言标签(严格名称匹配,同 _enrich_company_facts 手法;取 zh-cn > zh-hans > zh,
   一律 zhconv 转简体修 #279 繁体病;ko 顺手带走)→ src="wikidata";
② Wikidata 未命中且名称是**机构/公共部门**(卫生局/市政/学区/大学…描述性名称,可意译)→
   本地 Ollama qwen3.6 意译(/no_think,零温,输出校验:含中文、≤25 字、单行)→ src="ai";
③ 带 Inc/Ltd/Corp 等公司后缀的私企品牌,Wikidata 没有=无公认中文名 → 不生造,保「—」。

产出 data/processed/shelf_aliases.json(增量落盘可断点续跑);回写由 apply 脚本审样后执行,
alias_zh/alias_ko 在 seed 白名单外,增量对账不动它们。
"""
import json
import re
import sys
import time
from pathlib import Path

import httpx
from zhconv import convert as zh_convert

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402

IN_SHELF = _paths.PROCESSED / "shelf_companies.json"
OUT = _paths.PROCESSED / "shelf_aliases.json"
print(f"IN_SHELF={IN_SHELF}\nOUT={OUT}", flush=True)

WD = "https://www.wikidata.org/w/api.php"
# Wikimedia 机器人政策(2026-08-08 实撞 403「respect our robot policy」):UA 必须带可联系的真实站点
UA = {"User-Agent": "Offer2PR-alias-bot/1.0 (https://offer2pr.com; job board data enrichment) httpx"}
OLLAMA = "http://192.168.1.150:11434/api/generate"

SUFFIX = re.compile(r"\b(incorporated|inc|ltd|limited|llp|llc|corp|corporation|co|company|ltee|ltée|group|holdings?)\b\.?", re.I)
# 公司后缀在名 = 私企品牌,禁 AI 意译(无公认中文名不生造)
CORP_SUFFIX = re.compile(r"\b(inc|ltd|limited|llc|llp|corp|corporation|ltee|ltée|ulc|lp)\b\.?", re.I)
# 机构/公共部门(描述性名称,可意译):医疗/市政/教育/政府/原住民组织/协会
PUB = re.compile(
    r"health|hospital|authority|city of |town of |village of |district of |municipalit|regional municipality"
    r"|school (district|division|board)|board of education|centre for education|university|college|institut"
    r"|government|ministry|department of |agency|first nation|nation |tribal|band council|council|commission"
    r"|library|société|centre de santé|association|society|foundation|red cross|salvation army|ymca|ywca", re.I)

ERR = "__err__"


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", SUFFIX.sub(" ", (s or "").lower()).replace(".", " ").replace(",", " ")).strip()


def wikidata_lookup(cl: httpx.Client, name: str):
    """严格匹配:前 3 条目 en 标签/别名归一后等于公司名才收。返回 {zh, ko} | None | ERR。
    与 _enrich_company_facts 的差异:不再要求有英文维基条目(那是「知名徽标」门槛;
    这里只要官方中文标签,有标签即是公认译名)。"""
    try:
        hits = cl.get(WD, params={"action": "wbsearchentities", "search": name, "language": "en", "type": "item", "limit": 3, "format": "json"}).json().get("search", [])
        ids = [h["id"] for h in hits]
        if not ids:
            return None
        ents = cl.get(WD, params={"action": "wbgetentities", "ids": "|".join(ids), "props": "labels|aliases", "languages": "en|zh|zh-cn|zh-hans|ko", "format": "json"}).json().get("entities", {})
        target = norm(name)
        for eid in ids:
            e = ents.get(eid) or {}
            labels = e.get("labels", {})
            names = [labels.get("en", {}).get("value", "")] + [a.get("value", "") for a in e.get("aliases", {}).get("en", [])]
            if not any(norm(x) == target for x in names if x):
                continue
            zh_raw = (labels.get("zh-cn", {}) or labels.get("zh-hans", {}) or labels.get("zh", {})).get("value", "")
            zh = zh_convert(zh_raw, "zh-cn") if zh_raw else ""
            # 标签=原名照抄(Wikidata 常见:zh 标签就是英文名)→ 等于没有,不收
            if zh and norm(zh) == target:
                zh = ""
            ko = labels.get("ko", {}).get("value", "")
            if ko and norm(ko) == target:
                ko = ""
            return {"zh": zh, "ko": ko} if (zh or ko) else None
        return None
    except Exception:
        return ERR


CJK = re.compile(r"[一-鿿]")


def qwen_translate(cl: httpx.Client, name: str):
    """机构名意译(仅 PUB 命中且无公司后缀的名称)。校验不过=放弃,绝不入库脏值。"""
    prompt = (
        "/no_think 把这个加拿大机构名称翻译成简体中文机构名。只输出译名本身,一行,"
        "不要拼音、不要解释、不要引号。原名:" + name
    )
    try:
        r = cl.post(OLLAMA, json={"model": "qwen3.6:latest", "prompt": prompt, "stream": False, "options": {"temperature": 0}}, timeout=60)
        out = (r.json().get("response") or "").strip().strip('"「」『』\'')
        out = out.splitlines()[-1].strip() if out else ""
        if not out or len(out) > 25 or not CJK.search(out) or norm(out) == norm(name):
            return None
        return out
    except Exception:
        return None


def main() -> None:
    # 两遍制(qwen 单次实测 ~25s,混跑会把 Wikidata 快遍拖死):
    #   python ... wd  → 第一遍:全量 Wikidata(快,~1s/家)
    #   python ... ai  → 第二遍:对第一遍未命中的机构名跑 qwen(慢,只碰 src=none 且 PUB 命中的)
    mode = (sys.argv[1] if len(sys.argv) > 1 else "wd").strip()
    shelf = json.loads(IN_SHELF.read_text(encoding="utf-8"))
    todo = [r for r in shelf if not r.get("alias_zh")]
    prev = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    print(f"mode={mode} 待补 {len(todo)} 家(已查缓存 {len(prev)})", flush=True)

    def save() -> None:
        OUT.write_text(json.dumps(prev, ensure_ascii=False, indent=1), encoding="utf-8")

    n_wd = n_ai = n_none = n_err = 0
    with httpx.Client(headers=UA, timeout=20) as cl:
        if mode == "wd":
            for i, row in enumerate(todo):
                name = row["name"]
                if name in prev:
                    continue
                r = wikidata_lookup(cl, name)
                time.sleep(0.35)
                if r == ERR:
                    n_err += 1
                    continue  # 失败不写缓存,下轮重试
                if r:
                    prev[name] = {"slug": row["slug"], "zh": r["zh"], "ko": r["ko"], "src": "wikidata"}
                    n_wd += 1
                else:
                    prev[name] = {"slug": row["slug"], "zh": "", "ko": "", "src": "none"}
                    n_none += 1
                if (i + 1) % 25 == 0:
                    save()
                    print(f"  {i + 1}/{len(todo)} · wikidata {n_wd} · 无 {n_none} · 失败 {n_err}", flush=True)
        else:  # ai 遍:只碰 Wikidata 未命中的机构名
            cands = [r for r in todo if prev.get(r["name"], {}).get("src") == "none"
                     and PUB.search(r["name"]) and not CORP_SUFFIX.search(r["name"])]
            print(f"ai 候选 {len(cands)} 家(机构名且 Wikidata 未命中)", flush=True)
            for i, row in enumerate(cands):
                name = row["name"]
                zh = qwen_translate(cl, name)
                prev[name] = {"slug": row["slug"], "zh": zh or "", "ko": "", "src": "ai" if zh else "none"}
                n_ai += 1 if zh else 0
                if (i + 1) % 5 == 0:
                    save()
                    print(f"  {i + 1}/{len(cands)} · ai 命中 {n_ai}", flush=True)
    save()
    got = sum(1 for v in prev.values() if v.get("zh"))
    print(f"done({mode})→ {OUT} · 拿到中文名 {got}(本轮 wikidata {n_wd} / ai {n_ai})· 无 {n_none} · 失败 {n_err}", flush=True)


if __name__ == "__main__":
    main()

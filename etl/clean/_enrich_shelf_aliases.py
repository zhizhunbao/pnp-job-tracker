"""橱窗雇主中文名补全(#281 方案 A,Frank 2026-08-08 拍「这些公司的中文名需要补全」)。

范围=橱窗三表并集(~7k 家,展示驱动的有限圈定;懒查铁律的口子见 [[lazy-first-company-data]] 08-08 段),
不是全库 68k——全库批量仍禁。

三级证据:
① Wikidata 官方跨语言标签(严格名称匹配,同 _enrich_company_facts 手法;取 zh-cn > zh-hans > zh,
   一律 zhconv 转简体修 #279 繁体病;ko 顺手带走)→ src="wikidata";
② Wikidata 未命中且名称是**机构/公共部门**(卫生局/市政/学区/大学…描述性名称,可意译)→
   本地 Ollama qwen3.6 意译(/no_think,零温,输出校验:含中文、≤25 字、单行)→ src="ai";
③ brand 遍(2026-08-09 Frank「中文名还是没有啊」+「让大模型查一下,应该都能找到合适的翻译」——
   原「私企不生造」旧闸放开):其余全部 src=none 的雇主走 qwen **音译品牌词+意译行业词**灰注名
   (行业词锚库里 companies.industry:shelf_industries.json;行业未知=只音译加「公司」,禁编行业——
   探针实撞 4Tracks 被编成「物流」),10 家一批(单条 10-35s 全量要 45h,批 10 压到过夜档),
   逐条校验(含中文/≤25 字/≠原名)→ src="ai-brand",失败记 brand_tried 断点续跑不重撞。

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
import paths

IN_SHELF = paths.PROCESSED / "shelf_companies.json"
IN_INDUSTRY = paths.PROCESSED / "shelf_industries.json"   # brand 遍行业锚(可缺,缺=全部只音译)
OUT = paths.PROCESSED / "shelf_aliases.json"
print(f"IN_SHELF={IN_SHELF}\nIN_INDUSTRY={IN_INDUSTRY}\nOUT={OUT}", flush=True)

WD = "https://www.wikidata.org/w/api.php"
# Wikimedia 机器人政策(2026-08-08 实撞 403「respect our robot policy」):UA 必须带可联系的真实站点
UA = {"User-Agent": "Offer2PR-alias-bot/1.0 (https://offer2pr.com; job board data enrichment) httpx"}
OLLAMA = "http://192.168.1.150:11434/api/generate"

SUFFIX = re.compile(r"\b(incorporated|inc|ltd|limited|llp|llc|corp|corporation|co|company|ltee|ltée|group|holdings?)\b\.?", re.I)
# 公司后缀在名 = 私企品牌,禁 AI 意译(无公认中文名不生造)
CORP_SUFFIX = re.compile(r"\b(inc|ltd|limited|llc|llp|corp|corporation|ltee|ltée|ulc|lp)\b\.?", re.I)
# 机构/公共部门(描述性名称,可意译):医疗/市政/教育/政府/原住民组织/协会
PUB = re.compile(
    r"health|\bhospital\b|authority|city of |town of |village of |district of |municipalit|regional municipality"
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


BRAND_BATCH = 10


def brand_batch_translate(cl: httpx.Client, rows: list[dict], industries: dict) -> dict:
    """10 家一批的品牌灰注名。输出=原名→译名(仅校验通过的);解析不齐/校验不过的名字不出现在返回里。"""
    # ⚠️ 首跑 30 家实撞:把库里 industry(本站 17 大类粗桶「商务/服务/科技」)当行业锚喂进去,
    # 反而压过名字自带的行业词——「Cooke Aquaculture」贴成「库克商务」、军队被贴「科技」。
    # 现行规则:**名称自己的语义优先**,库行业只作最后线索且措辞降级为「可能属于」。
    lines = []
    for i, r in enumerate(rows, 1):
        ind = industries.get(r["name"], "")
        lines.append(f"{i}. {r['name']}" + (f"(库内粗分类仅供参考:{ind})" if ind else ""))
    prompt = (
        "/no_think 给下面每家加拿大公司起一个简体中文灰注名,规则按优先级:\n"
        "a) 名称是描述性机构名(政府/军队/卫生局/学校等)→ 整名意译,如 Canadian Armed Forces=加拿大武装部队;\n"
        "b) 名称里自带行业词 → 品牌词音译+行业词意译,如 Cooke Aquaculture=库克水产、Kent Building Supplies=肯特建材、"
        "McCain Foods=麦肯食品;\n"
        "c) 纯品牌名、名称里没有任何行业线索 → 只音译并以「公司」结尾,禁止编行业;括号里的库内粗分类"
        "只是站内粗桶,不可当行业词硬贴。\n"
        "每行输出「序号. 译名」,与输入同序同数,不要拼音、不要解释、不要引号。\n"
        + "\n".join(lines)
    )
    out: dict[str, str] = {}
    try:
        r = cl.post(OLLAMA, json={"model": "qwen3.6:latest", "prompt": prompt, "stream": False, "options": {"temperature": 0}}, timeout=300)
        resp = (r.json().get("response") or "").strip()
    except Exception:
        return out
    for ln in resp.splitlines():
        m = re.match(r"^\s*(\d+)[.、::]\s*(.+?)\s*$", ln)
        if not m:
            continue
        idx = int(m.group(1)) - 1
        if not (0 <= idx < len(rows)):
            continue
        zh = m.group(2).strip().strip('"「」『』\'')
        name = rows[idx]["name"]
        if zh and len(zh) <= 25 and CJK.search(zh) and norm(zh) != norm(name):
            out[name] = zh
    return out


def main() -> None:
    # 三遍制(qwen 单次实测 10-35s,混跑会把 Wikidata 快遍拖死):
    #   python ... wd     → 第一遍:全量 Wikidata(快,~1s/家)
    #   python ... ai     → 第二遍:对第一遍未命中的机构名跑 qwen(只碰 src=none 且 PUB 命中的)
    #   python ... brand  → 第三遍:其余 src=none 全量品牌灰注名(批 10,断点续跑)
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
        elif mode == "ai":  # ai 遍:只碰 Wikidata 未命中的机构名
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
        else:  # brand 遍:其余 src=none 全量(Frank 08-09 放开「私企不生造」旧闸)
            industries = json.loads(IN_INDUSTRY.read_text(encoding="utf-8")) if IN_INDUSTRY.exists() else {}
            cands = [r for r in todo if prev.get(r["name"], {}).get("src") == "none"
                     and not prev.get(r["name"], {}).get("brand_tried")]
            # 在招岗数降序:实测全量 ~37h,先把表首(用户真看见的)雇主跑出来,跑到哪儿都可交付
            cands.sort(key=lambda r: -(r.get("open") or 0))
            print(f"brand 候选 {len(cands)} 家(批 {BRAND_BATCH};行业锚 {len(industries)} 条;按在招岗数降序)", flush=True)
            for i in range(0, len(cands), BRAND_BATCH):
                batch = cands[i:i + BRAND_BATCH]
                got = brand_batch_translate(cl, batch, industries)
                for row in batch:
                    name = row["name"]
                    zh = got.get(name, "")
                    if zh:
                        prev[name] = {"slug": row["slug"], "zh": zh, "ko": "", "src": "ai-brand"}
                        n_ai += 1
                    else:
                        prev[name] = {**prev.get(name, {"slug": row["slug"], "zh": "", "ko": ""}), "src": "none", "brand_tried": True}
                save()
                print(f"  {min(i + BRAND_BATCH, len(cands))}/{len(cands)} · brand 命中 {n_ai}", flush=True)
    save()
    got = sum(1 for v in prev.values() if v.get("zh"))
    print(f"done({mode})→ {OUT} · 拿到中文名 {got}(本轮 wikidata {n_wd} / ai {n_ai})· 无 {n_none} · 失败 {n_err}", flush=True)


if __name__ == "__main__":
    main()

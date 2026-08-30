"""雇主省提名门槛判定 B3(设计 docs/design/雇主省提名门槛判定-20260808.md §2/§3):
榜上 named 集合(在招且岗位命中省清单的雇主,~1,982 家,见 data/processed/named_employers.json)
事实端三路,产出 data/processed/employer_facts.json(slug → 事实,增量可断点续跑):

① registry:Corporations Canada 两 CSV(CBCA + non-CBCA,data/raw/corp-registry/*.csv,
   https://open.canada.ca/data/en/dataset/0032ce54-c5dd-4b66-99a0-320a7b5e99f2 重下)
   + OrgBook BC API(https://orgbook.gov.bc.ca)——**严格名称匹配**(归一后全等),宁缺勿猜。
   命中只写 registry_status/registry_id/registry_src,**不写 founded_year**——见下方 2026-08-09 更正。
② sector:公共部门正则命中(卫生局/市政/学区…,PUB 词表移植自 _enrich_shelf_aliases.py,
   hospital 已修词界)→ sector='public',不进注册库/AI 判定(公共部门不在企业注册库,不硬判雇主侧门槛)。
③ AI:见 _batch_ai_employer_facts.py(独立脚本,懒查批量化,量大/慢,分开跑好断点)。

红线(设计 §1):三态不编数据——查不到就是查不到,不猜。

── 2026-08-09 更正(协调方核实抓现行:englobe-corp 落 founded_year=2026 荒谬值)──────────
两个注册库字段都**不是成立日**,之前当成成立年份用是 bug,本版已改:
  · 联邦 CSV「Anniversary date」= 年检周年日(可等于历次续存/重整日),不等于最初成立日;
  · OrgBook BC `registration_date` 属性 = 该条登记记录的生效日(amalgamation/续存等触发都会更新),
    实测 Englobe Corp 落 2026-02-09(该公司实际成立远早于此,登记原因写的是 "Filing:AMALX" 合并)。
真正的成立日在 Corporations Canada 官方 REST API(activities[].activity="Incorporation" 的 date 字段,
apigateway-passerelledapi.ised-isde.canada.ca/corporations/api/v1/corporations/{id}.json)——
但该端点需要 `user-key` 订阅(注册账号才能拿到,已实测无 key 直连 403 "Authentication parameters
missing"),开账号不在本 agent 权限内(信任边界:创建账号一律转人工),**本轮先不接**,
founded_year 现阶段只有 AI 懒查一条弱证据路(見 _batch_ai_employer_facts.py),registry 路
只提供 registry_status(在册/良好状态)这一件事。等 Frank 拿到 API key 再补硬数据路。

── 断点续跑/负缓存(2026-08-09 加,修「每轮重查未命中的 1150 家」的死循环式浪费)──────────
OrgBook 查询无论命中与否都记 registry_checked=1(否则没匹配到的公司永远不会被跳过,每次重跑都要
再吃一遍 ~1150 次网络请求,慢且脆——协调方两次观察到「进程像死了」,根子就在这)。
每行套 try/except,失败写 data/processed/employer_facts_errors.log(单行异常不带崩全批)。
"""
import csv
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import paths

IN_NAMED = paths.PROCESSED / "named_employers.json"
IN_REGISTRY_DIR = paths.RAW / "corp-registry"
OUT = paths.PROCESSED / "employer_facts.json"
ERR_LOG = paths.PROCESSED / "employer_facts_errors.log"
print(f"IN_NAMED={IN_NAMED}\nIN_REGISTRY_DIR={IN_REGISTRY_DIR}\nOUT={OUT}", flush=True)

# 公共部门识别(移植 etl/clean/_enrich_shelf_aliases.py PUB 正则,2026-08-08 hospital 词界已修版;
# 2026-08-09 #290 补 canadian/armed forces——CFMWS 在 08-08 快照里但漏标,生产渲「待核」误导)
PUB = re.compile(
    r"health (network|authority|region)|\bhospital\b|city of |town of |village of |district of "
    r"|municipalit|regional municipality|school (district|division|board)|board of education"
    r"|centre for education|government|ministry|department of |agency|first nation|nation |tribal"
    r"|band council|\bcouncil\b|commission|public library|regional centre|university|college|institut"
    r"|société|centre de santé|association|society|foundation|red cross|salvation army|ymca|ywca"
    r"|canadian forces|armed forces", re.I)

SUFFIX = re.compile(r"\b(inc|ltd|limited|corp|corporation|co|company|ulc|llp|lp|ltee|ltée)\b\.?", re.I)


def norm(s: str) -> str:
    s = s.upper()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    s = SUFFIX.sub(" ", s.lower()).upper()
    return re.sub(r"\s+", " ", s).strip()


def log_err(where: str, key: str, exc: BaseException) -> None:
    with ERR_LOG.open("a", encoding="utf-8") as f:
        f.write(f"{datetime.now(timezone.utc).isoformat()}\t{where}\t{key}\t{type(exc).__name__}: {exc}\n")


def load_federal_registry() -> dict[str, dict]:
    """联邦在册公司名 → {corp_number, status}(两 CSV 合并,norm 名做键)。不再带 anniversary_date——
    那不是成立日,见文件头 2026-08-09 更正。"""
    csv.field_size_limit(10**7)
    fed: dict[str, dict] = {}
    files = ["corpcan-active-cbca.csv", "corpcan-active-noncbca.csv"]
    for fname in files:
        p = IN_REGISTRY_DIR / fname
        if not p.exists():
            print(f"  跳过(缺失,需重下): {p}")
            continue
        with p.open(encoding="utf-8-sig", errors="replace") as fh:
            n = 0
            for row in csv.DictReader(fh):
                for k in ["Corporate name - form 1", "Corporate name - form 2"]:
                    name = (row.get(k) or "").strip()
                    if name:
                        fed.setdefault(norm(name), {
                            "corp_number": row.get("Corporation number"),
                            "status": row.get("Status"),
                        })
                        n += 1
            print(f"  {fname}: {n} 条名称索引")
    print(f"联邦在册名录合并索引: {len(fed)} 条(norm 键)")
    return fed


def orgbook_lookup(cl: httpx.Client, name: str) -> tuple[str, str] | None:
    """OrgBook BC 严格匹配:前 5 条结果里名称归一后全等才收。返回 (matched_name, source_id) | None。"""
    r = cl.get("https://orgbook.gov.bc.ca/api/v4/search/topic", params={"q": name, "limit": 5})
    r.raise_for_status()
    target = norm(name)
    for t in r.json().get("results", []):
        for cand in t.get("names", []):
            if norm(cand.get("text") or "") == target:
                return (cand.get("text"), t.get("source_id"))
    return None


def purge_bad_founded_year(cache: dict[str, dict]) -> int:
    """清掉旧版 bug 写入的 founded_year(源=registry/CSV anniversary date,全部作废)。
    AI 路径写的会带 founded_src='ai',那些不动;凡是没有 founded_src 标记的一律视为旧 registry 误写,删。"""
    n = 0
    for rec in cache.values():
        if rec.get("founded_year") is not None and rec.get("founded_src") != "ai":
            rec.pop("founded_year", None)
            rec.pop("founded_src", None)
            n += 1
    return n


def main() -> None:
    named = json.loads(IN_NAMED.read_text(encoding="utf-8"))
    print(f"named 集合: {len(named)} 家")

    cache: dict[str, dict] = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    n_purged = purge_bad_founded_year(cache)
    if n_purged:
        print(f"清掉旧 bug 写入的 founded_year(registry 误当成立年): {n_purged} 条")

    # ① 公共部门先分流(不进注册库匹配)
    n_pub = 0
    for row in named:
        sl = row["slug"]
        if PUB.search(row["name"]):
            rec = cache.setdefault(sl, {"name": row["name"]})
            rec["sector"] = "public"
            n_pub += 1
    print(f"公共部门(PUB 正则命中): {n_pub}/{len(named)}")

    # ② 联邦注册库(本地,快)——先跑,私企才进 OrgBook 网络查询
    fed = load_federal_registry()
    n_fed = 0
    for row in named:
        sl = row["slug"]
        rec_sector = cache.get(sl, {}).get("sector")
        if rec_sector == "public":
            continue
        if cache.get(sl, {}).get("registry_status"):  # 已有命中(断点续跑)
            continue
        hit = fed.get(norm(row["name"]))
        if hit:
            rec = cache.setdefault(sl, {"name": row["name"]})
            rec["registry_status"] = (hit["status"] or "").strip() or "active"
            rec["registry_src"] = "federal"
            rec["registry_id"] = hit.get("corp_number")
            rec["registry_checked"] = 1
            n_fed += 1
    print(f"联邦注册库严格命中: {n_fed}")

    # ③ OrgBook BC(网络,慢,~0.25s/家 + 延迟)——只查联邦未命中且没查过的私企,断点续跑
    #    未命中也记 registry_checked=1(负缓存),否则每轮重查同一批必落空的公司,浪费且脆。
    todo = [row for row in named
            if cache.get(row["slug"], {}).get("sector") != "public"
            and not cache.get(row["slug"], {}).get("registry_status")
            and not cache.get(row["slug"], {}).get("registry_checked")]
    print(f"OrgBook BC 待查(联邦未命中且未查过的私企): {len(todo)}")
    n_ob = n_err = 0
    with httpx.Client(timeout=15) as cl:
        for i, row in enumerate(todo):
            sl = row["slug"]
            rec = cache.setdefault(sl, {"name": row["name"]})
            try:
                hit = orgbook_lookup(cl, row["name"])
                rec["registry_checked"] = 1
                if hit:
                    rec["registry_status"] = "active"  # OrgBook 只给在册主体,不带成立年
                    rec["registry_src"] = "orgbook-bc"
                    rec["registry_id"] = hit[1]
                    n_ob += 1
            except Exception as e:  # noqa: BLE001 —— 单行异常不带崩全批;不设 registry_checked,下轮自动重试
                log_err("orgbook_lookup", sl, e)
                n_err += 1
            time.sleep(0.25)
            if (i + 1) % 100 == 0:
                OUT.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
                print(f"  {i + 1}/{len(todo)} · OrgBook 命中 {n_ob} · 失败 {n_err}", flush=True)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    matched = sum(1 for v in cache.values() if v.get("registry_status"))
    private_total = len(named) - n_pub
    print(f"done → {OUT}")
    print(f"公共部门 {n_pub}/{len(named)}({n_pub*100//len(named)}%) · "
          f"私企 {private_total} 家中注册库命中 {matched}"
          f"({matched*100//max(private_total,1)}%,联邦 {n_fed} + OrgBook {n_ob} · 本轮失败 {n_err})")


if __name__ == "__main__":
    main()

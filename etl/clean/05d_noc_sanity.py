"""clean/05d_noc_sanity — 标题↔NOC 失配护栏(#47,2026-07-16 拍板「NOC 置空转未分类」)。

背景:聚合帖的 NOC 是源数据自带,偶发错标——实锤案例:帖 49903220「intern」@ 肉店,
NOC 31102(全科医生)、时薪 $20-22,被评分链如实透传后借「医疗紧缺+SK 清单命中」冲到
weekly-top 榜首 90 分,砸引流榜可信度。

护栏(双条件都命中才动,宁可漏不误杀):
① 标题是「无职业信息的泛词」(intern/worker/helper… 整串精确匹配,防误伤 apprentice mechanic 类);
② NOC 是专业层级(TEER 0/1)且薪资远低于该档:有 ESDC 中位 → 年薪 < 60% 中位;
   无中位兜底 → 年薪 < $60K(TEER 0/1 专业岗不该是这个价)。
命中 → noc 置空:下游 08(评分基准/紧缺)、09(分类/PNP/EE chip)全链自动转「未分类」,零硬塞。

IN/OUT : data/processed/jobbank/postings.json(原地)
IN     : data/raw/wages/wages.json(NOC×省 中位,build_wages 维护)
Usage  : uv run python etl/clean/05d_noc_sanity.py
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402

IN_OUT_POSTINGS = _paths.PROCESSED_JOBBANK / "postings.json"
IN_WAGES = _paths.WAGES / "wages.json"

# 泛词标题:整串精确匹配(小写、去首尾空白/标点后);只收「不含任何职业信息」的词
GENERIC_TITLES = {
    "intern", "interns", "internship", "worker", "workers", "general worker",
    "helper", "helpers", "general helper", "labourer", "laborer", "general labourer",
    "general laborer", "trainee", "student", "staff", "employee", "team member",
}
MEDIAN_RATIO = 0.6      # 有中位:年薪低于中位的 60% 视为失配
ABS_FLOOR = 60_000      # 无中位兜底:TEER 0/1 专业岗年薪下限


def main() -> None:
    print(f"IN/OUT postings : {IN_OUT_POSTINGS}", flush=True)
    print(f"IN wages        : {IN_WAGES}", flush=True)
    if not IN_OUT_POSTINGS.exists():
        print("没有 postings.json,跳过", flush=True)
        return
    jobs = json.loads(IN_OUT_POSTINGS.read_text(encoding="utf-8"))
    wages = json.loads(IN_WAGES.read_text(encoding="utf-8")) if IN_WAGES.exists() else {}

    blanked: list[str] = []
    for j in jobs:
        noc = j.get("noc") or ""
        title = (j.get("title") or "").strip().strip(".,!?:;·-—").lower()
        if len(noc) != 5 or title not in GENERIC_TITLES:
            continue
        if noc[1] not in ("0", "1"):        # TEER 0/1(NOC 第 2 位)才是「泛词标题配专业码」的荒谬组合
            continue
        annual = j.get("salaryAnnual")
        if not annual:
            continue                         # 没薪资不猜(双条件缺一不动)
        med = (wages.get(noc, {}).get(j.get("province") or "") or wages.get(noc, {}).get("CA") or {}).get("annual")
        if (med and annual < med * MEDIAN_RATIO) or (not med and annual < ABS_FLOOR):
            j["noc"] = ""                    # 置空 → 下游全链「未分类」
            j["noc_blanked"] = noc           # 留痕:原错标码(便于回查/若源修正可比对)
            blanked.append(f"  {j.get('posting_id')} | {j.get('title')!r} @ {j.get('employer')} | noc {noc} | ${annual:,}/yr | med {med and f'${med:,.0f}' or '—'}")

    if blanked:
        tmp = IN_OUT_POSTINGS.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(jobs, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, IN_OUT_POSTINGS)
    print(f"NOC 失配护栏:置空 {len(blanked)} 帖(泛词标题 × TEER0/1 × 薪资远低)", flush=True)
    for line in blanked[:10]:
        print(line, flush=True)


if __name__ == "__main__":
    main()

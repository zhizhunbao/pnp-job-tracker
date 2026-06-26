"""
audit_data — 自动化数据质检(替代人工逐行检查)。

跑一套校验规则覆盖全量,把**可疑的少数行**挑出来 → 你只需复查几十行,不必看几千行。
只读,不改数据。报告打到控制台 + 写 data/output/audit-flags.json(分类的可疑行)。

查什么:
  几何一致性  邮编首字母 vs 省份(逮「省/市错配」,如 Richmond Hill 被当 Ottawa)
              city=Ottawa 但邮编非 K1*/K2*;district 有值但省≠ON
  AIP         aip=True 但省份不在大西洋四省
  薪资        salaryAnnual 离群(疑似解析错:时薪当年薪/数字抓串)
  完整性      省份缺失、url 重复、未分类率
  分布        省份/TEER/评分 直方,便于一眼看异常

Usage:  uv run python etl/audit_data.py
"""
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

IN_POSTINGS = _paths.PROCESSED_JOBBANK / "postings.json"
IN_SCORED = _paths.PROCESSED / "all-scored.json"
OUT_FLAGS = _paths.PROCESSED / "audit-flags.json"

# 加拿大邮编首字母 → 省(粗校验地理一致性)
POSTAL_PROV = {
    "A": "NL", "B": "NS", "C": "PE", "E": "NB", "G": "QC", "H": "QC", "J": "QC",
    "K": "ON", "L": "ON", "M": "ON", "N": "ON", "P": "ON",
    "R": "MB", "S": "SK", "T": "AB", "V": "BC", "Y": "YT",
}
ATLANTIC = {"NL", "NB", "NS", "PE"}
OTTAWA_FSA_PREFIX = ("K1", "K2")
PROV_NAMES = {  # 市字段若等于这些(省名) → 错(全省岗只给了省名,没具体城市)
    "newfoundland and labrador", "nova scotia", "new brunswick", "prince edward island",
    "ontario", "quebec", "manitoba", "saskatchewan", "alberta", "british columbia",
}
import re  # noqa: E402

_POSTAL = re.compile(r"\b([A-Za-z]\d[A-Za-z])\s*\d[A-Za-z]\d\b")


def fsa(s: str) -> str:
    m = _POSTAL.search(s or "")
    return m.group(1).upper() if m else ""


def main() -> None:
    posts = json.loads(IN_POSTINGS.read_text(encoding="utf-8"))
    scored = {s["externalId"]: s for s in json.loads(IN_SCORED.read_text(encoding="utf-8"))} if IN_SCORED.exists() else {}
    n = len(posts)
    flags: dict[str, list] = {}

    def flag(cat: str, j: dict, why: str):
        flags.setdefault(cat, []).append({
            "why": why, "employer": j.get("employer"), "title": j.get("title"),
            "province": j.get("province"), "city": j.get("city"),
            "address": (j.get("address") or "")[:50], "salary": j.get("salary"),
            "salaryAnnual": j.get("salaryAnnual"), "url": j.get("url"),
        })

    seen_url: set[str] = set()
    for j in posts:
        prov = (j.get("province") or "").upper()
        f = fsa(f"{j.get('city','')} {j.get('address','')}")
        sa = j.get("salaryAnnual")

        # 1) 邮编 vs 省份
        if f:
            exp = POSTAL_PROV.get(f[0])
            if exp and prov and exp != prov:
                flag("邮编/省份错配", j, f"邮编 {f} 属 {exp},但 province={prov}")
        # 2) city=Ottawa 但邮编非 K1/K2(Ottawa 误判)
        if j.get("city") == "Ottawa" and f and f[:2] not in OTTAWA_FSA_PREFIX:
            flag("Ottawa 误判", j, f"city=Ottawa 但邮编 {f} 非 K1*/K2*")
        # 3) district 有值但省≠ON
        if j.get("district") and prov != "ON":
            flag("区越界", j, f"district={j.get('district')} 但 province={prov}(区应仅 ON/Ottawa)")
        # 4) aip 越界
        if j.get("aip") and prov not in ATLANTIC:
            flag("AIP 越界", j, f"aip=True 但 province={prov} 非大西洋四省")
        # 5) 薪资离群
        if isinstance(sa, (int, float)):
            if sa < 15000:
                flag("薪资过低", j, f"年薪折算 ${sa}(疑似解析错)")
            elif sa > 600000:
                flag("薪资过高", j, f"年薪折算 ${sa}(疑似数字抓串)")
        # 6) 省份缺失
        if not prov:
            flag("省份缺失", j, f"city={j.get('city')} 无省份")
        # 6b) 市字段填了省名(全省岗)
        if (j.get("city") or "").strip().lower() in PROV_NAMES:
            flag("市=省名", j, f"city={j.get('city')} 是省名,非具体城市")
        # 7) url 重复
        u = j.get("url") or ""
        if u and u in seen_url:
            flag("url 重复", j, "posting url 出现多次")
        seen_url.add(u)

    # ── 报告 ──
    print(f"=== 数据质检:{n} 帖 ===\n")
    print("[分布]")
    print("  省份 :", dict(Counter(p.get("province", "?") for p in posts).most_common()))
    cats = Counter(scored.get(p.get("url") or "", {}).get("category", "?") for p in posts)
    print("  TEER :", dict(sorted(cats.items())))
    print(f"  未分类率: {cats.get('未分类', 0) * 100 // n}%\n")

    print("[可疑行]  (写入 audit-flags.json 供复查)")
    total = 0
    for cat, rows in sorted(flags.items(), key=lambda kv: -len(kv[1])):
        total += len(rows)
        print(f"  {cat:14} {len(rows):4} 行   e.g. {rows[0]['why']} — {rows[0]['employer']}")
    print(f"\n  合计可疑 {total} 行 / {n}({total * 100 // n}%) → 只需复查这些")

    _paths.PROCESSED.mkdir(parents=True, exist_ok=True)
    OUT_FLAGS.write_text(json.dumps(flags, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  详情: {OUT_FLAGS}")


if __name__ == "__main__":
    main()

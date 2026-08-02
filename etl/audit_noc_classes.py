"""
audit_noc_classes — 逐职业体检「大类 / 中类 / 小类」(只读,不改数据)。

起因(2026-08-03 Frank 实机):选工作页「科技」这一类里蹲着「景观园艺技师」「家电维修技师」。
所以这个脚本要回答三件事:
  ① 每个大类里到底装了什么 —— 逐职业列出 大类/中类/小类/TEER/在招量;
  ② 三级到底有多少是**真分过**的 —— 中/小类只有 etl/noc.py 的 NOC_INFO 是人工确认过的,
     其余走前缀兜底,而兜底出来的小类 == 中类(等于没有小类);
  ③ 哪些看着不对 —— 关键词线索(园艺/维修/司机 出现在「科技」这种)。**是线索不是判决**:
     大类 = NOC 第 1 位,是官方分组,本站只是给它起了个中文简称;
     所以「不对」多半不是分错了,而是**简称起窄了**(第 2 组官方叫「自然与应用科学及相关职业」,
     本站叫「科技」——园艺技师、家电维修技师在官方口径里本来就属于它)。

用法:
  python etl/audit_noc_classes.py              # 控制台摘要
  python etl/audit_noc_classes.py --all        # 摘要 + 全量逐条打印
数据源是 mart(09 的产出),不连库、不抓网。
"""
import io
import json
import sys
from collections import Counter, defaultdict

from _paths import MART, PROCESSED
from noc import BROAD, MID_PREFIX, NOC_INFO, classify

IN_STATS = MART / "stats_occupation.json"      # 每职业一行(province=all 那批带在招量与中位薪资)
IN_DESCR = MART / "noc_descriptions.json"      # 官方名 + 中文名(职业名的真相来源)
OUT_TSV = PROCESSED / "noc_class_audit.tsv"    # 全量逐条(拿去 Excel 里逐行看)

# NOC 2021 官方大分类名(第 1 位)。本站的中文简称与它并排摆 —— 差在哪一眼就看得见
OFFICIAL_BROAD = {
    "0": "Legislative and senior management occupations",
    "1": "Business, finance and administration occupations",
    "2": "Natural and applied sciences and related occupations",
    "3": "Health occupations",
    "4": "Occupations in education, law and social, community and government services",
    "5": "Occupations in art, culture, recreation and sport",
    "6": "Sales and service occupations",
    "7": "Trades, transport and equipment operators and related occupations",
    "8": "Natural resources, agriculture and related production occupations",
    "9": "Occupations in manufacturing and utilities",
}

# 关键词线索:职业名里出现这些词时,它「通常」属于右边那个大类。
# 命中 ≠ 分错(见文件头);只是把该看的行挑出来,省得 494 条一条条扫。
SMELL = [
    (("园艺", "园林", "农场", "农业", "林业", "渔", "矿", "油气", "钻井"), "资源"),
    (("维修", "修理", "安装", "焊", "管道", "电工", "木工", "机械师", "技师"), "技工"),
    (("司机", "驾驶", "运输", "仓储", "搬运"), "技工"),
    (("护士", "护理", "医生", "药剂", "牙科", "理疗", "影像"), "医疗"),
    (("教师", "幼教", "讲师", "社工"), "教育"),
    (("清洁", "保洁", "服务员", "收银", "导购", "厨"), "服务"),
]


def load(p):
    return json.load(io.open(p, encoding="utf-8"))


def main():
    show_all = "--all" in sys.argv
    stats = [r for r in load(IN_STATS) if r.get("province") == "all"]
    names = {r["noc"]: r for r in load(IN_DESCR)}

    rows = []
    for r in sorted(stats, key=lambda x: -(x.get("openJobs") or 0)):
        noc = r["noc"]
        c = classify(noc)
        d = names.get(noc, {})
        zh = r.get("titleZh") or d.get("titleZh") or ""
        rows.append({
            "noc": noc, "teer": c["teer"], "broad": c["broad"], "mid": c["mid"], "fine": c["fine"],
            "zh": zh, "en": r.get("titleEn") or d.get("title") or "",
            "open": r.get("openJobs") or 0,
            "byHand": noc in NOC_INFO,                       # 中/小类是人工表给的,还是前缀兜底
            "noFine": c["fine"] == c["mid"],                 # 小类 == 中类:等于没分小类
        })

    print(f"职业 {len(rows)} 个(mart/stats_occupation 的 province=all)\n")

    # ① 每个大类装了什么
    print("=== ① 大类:本站简称 vs 官方组名 ===")
    by_broad = defaultdict(list)
    for x in rows:
        by_broad[x["broad"]].append(x)
    for digit, label in BROAD.items():
        lst = sorted(by_broad.get(label, []), key=lambda x: -x["open"])
        print(f"\n[{digit}] {label}  ← 官方:{OFFICIAL_BROAD[digit]}")
        print(f"    职业 {len(lst)} 个 · 在招 {sum(x['open'] for x in lst):,}")
        for x in (lst if show_all else lst[:8]):
            print(f"    {x['noc']}  T{x['teer']}  {x['mid']:<10}/{x['fine']:<14} {x['zh'][:22]:<24} {x['open']:>6,} 在招")
        if not show_all and len(lst) > 8:
            print(f"    …… 其余 {len(lst) - 8} 个(--all 看全量,或读 {OUT_TSV.name})")

    # ② 三级到底分过没有
    print("\n=== ② 中/小类的成色 ===")
    hand = sum(1 for x in rows if x["byHand"])
    nofine = sum(1 for x in rows if x["noFine"])
    print(f"    中/小类人工确认过(在 noc.py 的 NOC_INFO 里): {hand:>4} / {len(rows)}")
    print(f"    走前缀兜底(MID_PREFIX {len(MID_PREFIX)} 条规则)  : {len(rows) - hand:>4} / {len(rows)}")
    print(f"    小类 == 中类(等于没有小类)                  : {nofine:>4} / {len(rows)}")
    mids = Counter(x["mid"] for x in rows)
    print("    最挤的中类(装的职业数):", "、".join(f"{m} {n}" for m, n in mids.most_common(6)))

    # ③ 关键词线索
    print("\n=== ③ 关键词线索(命中 ≠ 分错,见文件头) ===")
    hits = []
    for x in rows:
        for words, expect in SMELL:
            if any(w in x["zh"] for w in words) and x["broad"] != expect:
                hits.append((x, expect))
                break
    hits.sort(key=lambda t: -t[0]["open"])
    print(f"    {len(hits)} 条名字与所在大类对不上:")
    for x, expect in (hits if show_all else hits[:20]):
        print(f"    {x['noc']}  在「{x['broad']}」里,名字像「{expect}」  {x['zh'][:24]:<26} {x['open']:>6,} 在招")
    if not show_all and len(hits) > 20:
        print(f"    …… 其余 {len(hits) - 20} 条(--all)")

    # 全量落盘
    OUT_TSV.parent.mkdir(parents=True, exist_ok=True)
    with io.open(OUT_TSV, "w", encoding="utf-8-sig", newline="") as f:
        f.write("noc\tteer\t大类\t中类\t小类\t中文名\t官方英文名\t在招\t中小类来源\t有小类\n")
        for x in rows:
            f.write(f"{x['noc']}\t{x['teer']}\t{x['broad']}\t{x['mid']}\t{x['fine']}\t{x['zh']}\t{x['en']}\t"
                    f"{x['open']}\t{'人工' if x['byHand'] else '前缀兜底'}\t{'否' if x['noFine'] else '是'}\n")
    print(f"\n全量已写:{OUT_TSV}")


if __name__ == "__main__":
    main()

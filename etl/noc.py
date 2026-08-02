"""
noc — NOC 2021 分类法(单一来源,数据层)。官方层级:TEER(第2位) · 大分类(第1位) · 中/小分类。
08_score 与 09_build_mart 共用;前端只读 job 上算好的字段 + 维度表,不再自己算。

2026-08-03 换血:中/小分类**不再手搓**。原先是一张 60 行的 NOC_INFO + 19 条前缀规则,
覆盖不到的拿大类名顶上 —— 491 个职业里 381 个「小类 == 中类」(等于没有小类),
而 `^2 → IT` 这条兜底把 22 开头的各行业技术员全塞进「IT」(景观园艺技师、家电维修,Frank 实见)。
官方自己就有完整层级,没有理由发明桶:
  大类 = Broad Category(第 1 位) · 中类 = Sub-major Group(前 3 位) · 小类 = Minor Group(前 4 位)
名字来自 data/raw/noc/structure.json(etl/build_noc_structure.py 从 StatCan 开放 CSV 建,含三语)。
"""
import json
import os
from pathlib import Path

from noc_buckets import BUCKETS4, BUCKETS5, I18N, bucket_of

# 官方大分类(NOC 第 1 位)——**不再直接当浏览分类**(2026-08-03 拍板走本站分类树,
# 理由见 noc_buckets 文件头:官方是统计口径,把 IT/工程/生物/园艺编在同一组)。
# 留着它只为体检脚本并排打印「本站分类 vs 官方组」,以及所有映射都查不到时的最后兜底。
OFFICIAL_BROAD = {
    "0": "管理", "1": "商务", "2": "科技", "3": "医疗", "4": "教育",
    "5": "文体", "6": "服务", "7": "技工", "8": "资源", "9": "制造",
}
BROAD = OFFICIAL_BROAD   # 旧名兼容(体检脚本/一次性脚本还在用)

_STRUCT_PATH = Path(os.environ.get("NOC_STRUCTURE", Path(__file__).resolve().parent.parent / "data/raw/noc/structure.json"))
_LEVELS: dict[str, dict] = {}
if _STRUCT_PATH.exists():
    _LEVELS = json.loads(_STRUCT_PATH.read_text(encoding="utf-8")).get("levels", {})


def _label(code, lang="zh"):
    """官方类别名(缺翻译退英文短名;都没有 → None,由调用方决定怎么兜底)。"""
    v = _LEVELS.get(code)
    if not v:
        return None
    return v.get(lang) or v.get("enShort") or v.get("en") or None


def _ok(noc):
    return bool(noc) and len(noc) == 5 and noc[0].isdigit()


def teer_of(noc):
    return int(noc[1]) if _ok(noc) and noc[1].isdigit() else None


def broad_of(noc):
    """大类 = 本站浏览分类(noc_buckets)。映射查不到 → 未分类,不拿官方组名硬顶。"""
    if not _ok(noc):
        return "未分类"
    b = bucket_of(noc)
    return b[0] if b else "未分类"


def broad_i18n(noc, lang):
    """大类的英/韩名(手写表;缺则退中文——前端不该拿中文顶英文,所以体检脚本盯着不许缺)。"""
    b = bucket_of(noc)
    if not b:
        return "未分类"
    i = I18N.get(b[0])
    return (i[0] if lang != "ko" else i[1]) if i else b[0]


def official_broad_of(noc):
    """官方第 1 位的组名(只给体检脚本对照用,不进库)。"""
    return OFFICIAL_BROAD.get(noc[0], "未分类") if _ok(noc) else "未分类"


def mid_of(noc, lang="zh"):
    """中类 = **人话桶**(noc_buckets:官方子大类 3 位 → 本站分类名)。
    Frank 2026-08-03「之前分的是对的,就是类别有错误」——名字回到旧那套人话桶,
    成员判定换成官方码(旧版 `^2 → IT` 把 22 开头的各行业技术员全扫进 IT)。
    英韩暂用官方短名(桶名只有中文一版,三语化随人话名那批一起补)。"""
    if not _ok(noc):
        return "未分类"
    b = bucket_of(noc)
    if not b:
        return "未分类"
    if lang == "zh":
        return b[1]
    i = I18N.get(b[1])
    return (i[0] if lang != "ko" else i[1]) if i else b[1]


def fine_of(noc, lang="zh"):
    """小类 = 官方 Minor Group(前 4 位)的**人话名**。
    但**被单个职业挪过窝的不能用**(BUCKETS5):那时这个职业已经离开了它的官方小组,
    再挂小组名就自相矛盾 —— 实见 22114 景观园艺技师归到「园艺与景观」,小类却写「生命科学技术员」。
    那种情况退回中类(显示层遇到 小类==中类 会留空,官方在这一级对它确实没有更细的划分)。"""
    if not _ok(noc):
        return "未分类"
    if noc in BUCKETS5:
        return mid_of(noc, lang)
    v = _LEVELS.get(noc[:4]) or {}
    ui = v.get({"zh": "zhUi", "ko": "koUi"}.get(lang, "enUi"))
    return ui or _label(noc[:4], lang) or mid_of(noc, lang)


def classify(noc):
    """noc → {teer, broad, mid, fine}(供 mart 写到 job 上 + 建 noc 维度)。
    中/小类同时带 en/ko —— 显示层不必再攒一张翻译表(先前 cat.* 靠人肉往 i18n 里加,
    新分类一进来就漏成中文混进英文界面)。"""
    t = teer_of(noc)
    return {
        "teer": t, "teerLabel": f"TEER {t}" if t is not None else "未分类",
        "broad": broad_of(noc), "broadEn": broad_i18n(noc, "en"), "broadKo": broad_i18n(noc, "ko"),
        "mid": mid_of(noc), "midEn": mid_of(noc, "enShort"), "midKo": mid_of(noc, "ko"),
        "fine": fine_of(noc), "fineEn": fine_of(noc, "enShort"), "fineKo": fine_of(noc, "ko"),
    }

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

# 大分类 = NOC 第 1 位。**这十个值是存进库的键**(jobs.broad / URL 筛选参数),
# 所以保持短码不动;显示名走 i18n 的 broad.*(2026-08-03 已按官方组名改宽)。
BROAD = {
    "0": "管理", "1": "商务", "2": "科技", "3": "医疗", "4": "教育",
    "5": "文体", "6": "服务", "7": "技工", "8": "资源", "9": "制造",
}

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
    return BROAD.get(noc[0], "未分类") if _ok(noc) else "未分类"


def mid_of(noc, lang="zh"):
    """中类 = 官方 Sub-major Group(前 3 位)。官方没有这一级就退到大类,不编。"""
    if not _ok(noc):
        return "未分类"
    return _label(noc[:3], lang) or broad_of(noc)


def fine_of(noc, lang="zh"):
    """小类 = 官方 Minor Group(前 4 位)。"""
    if not _ok(noc):
        return "未分类"
    return _label(noc[:4], lang) or mid_of(noc, lang)


def classify(noc):
    """noc → {teer, broad, mid, fine}(供 mart 写到 job 上 + 建 noc 维度)。
    中/小类同时带 en/ko —— 显示层不必再攒一张翻译表(先前 cat.* 靠人肉往 i18n 里加,
    新分类一进来就漏成中文混进英文界面)。"""
    t = teer_of(noc)
    return {
        "teer": t, "teerLabel": f"TEER {t}" if t is not None else "未分类",
        "broad": broad_of(noc),
        "mid": mid_of(noc), "midEn": mid_of(noc, "enShort"), "midKo": mid_of(noc, "ko"),
        "fine": fine_of(noc), "fineEn": fine_of(noc, "enShort"), "fineKo": fine_of(noc, "ko"),
    }

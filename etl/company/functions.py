"""
company 域共享函数(三件套形制**全站样张**,2026-08-30 Frank「先拿一个做样章」)。

进这个文件的判据:**函数体在本域 ≥2 个文件重复**(行为复制=口径开岔,宪法不许)。
2026-08-30 收拢现场:slugify 两份(folders/enrich,语义同、细节各写各)、is_tech 两份
(kanata/careers,连判据表 TECH_TERMS 都各抄一份且已漂移)。单消费者的函数
(enrich 的 now_iso/days_since 等)留在原文件 —— 不是「都搬来」,是「重复才收」。
依赖只有一条边:本文件 → 本域 constants/types(cms「functions → 别人」同律)。
"""
import re

from constants import TECH_TERMS
from shapes import CompanyRow


def slugify(s: str) -> str:
    """公司名 → 文件夹/键用 slug(小写、非字母数字折 -、截 60,空得兜 company)。

    2026-08-30 收拢:取 enrich 版(防 None 更稳);folders 版先截后 strip 的细节差
    在真实公司名上无行为差(两版对全部现存 slug 重算比对同值)。
    """
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:60] or "company"


def is_tech(c: CompanyRow) -> bool:
    """按行业标签+简介判「算不算科技公司」(粗筛,判据表=constants.TECH_TERMS 唯一来源)。

    2026-08-30 收拢:取 careers 版的 .get 防御形(目录行经手工编辑过可能缺格),
    判据表取超集(漂移经过见 constants.TECH_TERMS 注释)。
    """
    blob = (c.get("sectors", "") + " " + c.get("description", "")).lower()
    return any(t in blob for t in TECH_TERMS)

"""
names 域函数 —— 公司名归一唯一尺子(2026-08-31 Frank 拍板抽叶收拢:原先靠 aip 一份实现 +
lmia/mart 两条 importlib 路径缝维持「同一把」,缝随收拢拆除,三家改正规 import)。

四把尺子取证(56,909 公司名全集,2026-08-31):aip ≡ mart 零差异(纯复制,收进本域);
employers.norm_name_of(雇主池三源对齐面,故意只剥法务后缀防硬合)与
company.norm_company_name(Wikidata facts 缓存键,已落盘改不起)各有设计意图,不收,
两处注释各自挂账。例外表(尺子对不上的同名雇主,离线 AI 提名+人工冻结)是将来证据到了
再开的抽屉,先不建 —— 没抓到例外不建例外表。

@author Frank
@time 2026-08-31 20:52:27
"""
from fetch.constants import SPACE_SEP, WS_RE
from names.constants import (
    ALIAS_SPLIT_RE, APOSTROPHE_RE, KEEP_RE, SECTOR_FEDERAL, SECTOR_FEDERAL_RE, SECTOR_GOVERNMENT, SECTOR_GOV_RE,
    SECTOR_INDIGENOUS, SECTOR_INDIGENOUS_RE, SECTOR_MUNICIPAL, SECTOR_MUNI_RE, SECTOR_PUBLIC, SECTOR_PUBLIC_RE,
    SECTOR_VET_RE, SUFFIX_RE,
)


def norm_name(name: str) -> str:
    """公司名归一:删撇号、去 o/a 别名前缀、去公司后缀、去标点、压空格、小写。

    (函数体自 aip 域逐字迁入;沿革 aip/flag_aip_jobs.py → aip/functions.py 段4 → 本域。
    改这个函数 = 同时改 AIP 打标、LMIA 榜单聚合键、mart companies join 三处口径。)
    """
    n = APOSTROPHE_RE.sub("", (name or "").lower())
    n = ALIAS_SPLIT_RE.split(n)[0]
    n = SUFFIX_RE.sub(SPACE_SEP, n)
    n = KEEP_RE.sub(SPACE_SEP, n)
    return WS_RE.sub(SPACE_SEP, n).strip()


def sector_of(name: str) -> str:
    """雇主类别:名字开头是联邦机关 → federal;命中政府特征 → government(省市);命中公立特征且不是动物医院 →
    public;其余空串(私营,不落列)。

    (2026-09-18 自 mart 域 functions 逐字迁入:雇主池也要用同一把尺子,判定只能住基建叶。)
    2026-09-18 拆档批:government 收窄成省级,前面插两档 —— 市镇 → municipal、原住民政府 → indigenous
    (判序:联邦 → 市镇 → 原住民 → 省级 → 公立;「Sunchild First Nation School」这种带 School 的归原住民政府)。
    """
    if SECTOR_FEDERAL_RE.search(name):
        return SECTOR_FEDERAL
    if SECTOR_MUNI_RE.search(name):
        return SECTOR_MUNICIPAL
    if SECTOR_INDIGENOUS_RE.search(name):
        return SECTOR_INDIGENOUS
    if SECTOR_GOV_RE.search(name):
        return SECTOR_GOVERNMENT
    if SECTOR_PUBLIC_RE.search(name) and not SECTOR_VET_RE.search(name):
        return SECTOR_PUBLIC
    return ""

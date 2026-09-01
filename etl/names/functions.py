"""
names 域函数 —— 公司名归一唯一尺子(2026-08-31 Frank 拍板抽叶收拢:原先靠 aip 一份实现 +
lmia/mart 两条 importlib 路径缝维持「同一把」,缝随收拢拆除,三家改正规 import)。

四把尺子取证(56,909 公司名全集,2026-08-31):aip ≡ mart 零差异(纯复制,收进本域);
employers.norm_name_of(雇主池三源对齐面,故意只剥法务后缀防硬合)与
company.norm_company_name(Wikidata facts 缓存键,已落盘改不起)各有设计意图,不收,
两处注释各自挂账。例外表(尺子对不上的同名雇主,离线 AI 提名+人工冻结)是将来证据到了
再开的抽屉,先不建 —— 没抓到例外不建例外表。

@author Claude Fable 5
@time 2026-08-31
"""
from fetch.constants import SPACE_SEP, WS_RE
from names.constants import ALIAS_SPLIT_RE, KEEP_RE, SUFFIX_RE


def norm_name(name: str) -> str:
    """公司名归一:去 o/a 别名前缀、去公司后缀、去标点、压空格、小写。

    (函数体自 aip 域逐字迁入;沿革 aip/flag_aip_jobs.py → aip/functions.py 段4 → 本域。
    改这个函数 = 同时改 AIP 打标、LMIA 榜单聚合键、mart companies join 三处口径。)
    """
    n = (name or "").lower()
    n = ALIAS_SPLIT_RE.split(n)[0]
    n = SUFFIX_RE.sub(SPACE_SEP, n)
    n = KEEP_RE.sub(SPACE_SEP, n)
    return WS_RE.sub(SPACE_SEP, n).strip()

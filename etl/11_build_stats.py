"""地区统计 v1(E5-04,三问之「去哪」):省 × NOC 大类 × 中类 预聚合,页面零计算只渲染。

行 = 省 × 大类 × 中类(mid='all'=大类汇总;broad='all'=省级汇总;2026-07-19 Frank 拍板加中类层:
「有了统计信息才会给人提供选哪个行业哪个地区的概率指导」——图表下钻 省→大类→中类→职位板):
  openJobs        在招岗数(本站抓取口径)
  new7d           7 天新增(datePosted 近 7 天)
  medianWageAnnual 中位年薪 —— 口径=ESDC:取该桶内各岗「所在 NOC×省 的 ESDC 中位年薪」的中位数(不是帖面薪资)
  medianSalaryAnnual 帖面中位年薪 —— 口径=本站折算:该桶内岗位帖面年薪的中位数(对照用)
  namedJobs / streamLabels  省具名通道命中岗数 + 通道名列表(来自省官网清单)
  aipJobs         AIP 指定雇主岗数(大西洋四省)
  topCities       桶内在招量前 5 的城市(json:[{city,n}])
v1 只做省级(市级后置);RNIP 待 E6 有数据再并入。
输入:mart/jobs.json(跑在 09 之后);输出:mart/stats.json(seed 灌 stats 表)。
"""
from __future__ import annotations

import json
import re
import statistics
import sys
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paths
import noc as NOC  # E13-02:NOC 分类法(单一来源),给 stats_daily 的 closed 归 broad 桶用

# E13-05:全国 occ 行的 pnpProvs 复用 08_score.pnp_eligible(禁复制判定逻辑)。
# 08_score 是数字开头的模块名,不能直接 import;importlib 按路径加载——顶层只有表构建
# (PNP_BY_PROV/EE_BY_NOC 读 json,轻量),重活(collect/main 扫全量岗位)都在 __main__ 守卫内,
# 加载它不会触发那段重活。
import importlib.util as _ilu
_score_spec = _ilu.spec_from_file_location("score08", Path(__file__).resolve().parent / "08_score.py")
_score = _ilu.module_from_spec(_score_spec)
_score_spec.loader.exec_module(_score)
pnp_eligible = _score.pnp_eligible
pnp_direct = _score.pnp_direct     # E13-09:拿 offer 即可(eligible−direct=「先省内工作 6 个月」灰行)
any_pr_path = _score.any_pr_path   # E13-08:跨通道判定(PNP∪EE∪AIP∪保育;口径与锚句见 08_score 顶注)

# E13-07:通道档(Frank 08-06 深夜四档拍板)。省具名紧缺 ∪ 联邦 EE 类别 = 点名(双头/单头);
# 都没点名时 TEER 0-3 还有 EE 泛池,TEER 4-5 只剩雇主担保(最难);TEER 未分类不硬塞档。
NAMED_ANY: set = set().union(*_score.NAMED_STREAM_NOCS_BY_PROV.values()) if _score.NAMED_STREAM_NOCS_BY_PROV else set()
EE_BY_NOC = _score.EE_BY_NOC

# E14-02:担保率分子(单季度 LMIA 获批岗位)按 NOC 从季度源 xlsx 直接聚合(见 §sponsor_of 下方)。
# NOC 正则复用 lmia/build_esdc_lmia_employers.py 的 _NOC_RE(单一来源,不复制口径;分域后按包路径 import)
# (不需要像 08_score 那样走 importlib)。模块顶层无重活(只有函数/常量定义),import 安全。
import lmia.build_esdc_lmia_employers as _lmia_mod


def channel_tier(noc: str, teer) -> str | None:
    prov_named, fed_named = noc in NAMED_ANY, noc in EE_BY_NOC
    if prov_named and fed_named:
        return "both"
    if prov_named:
        return "prov"
    if fed_named:
        return "fed"
    if teer in (0, 1, 2, 3):
        return "ee"
    return "employer" if teer is not None else None


_QUARTER_FILE_RE = re.compile(r"tfwp_(\d{4}q\d)_pos_en\.xlsx$", re.I)


def _comparable_quarter() -> str | None:
    """E14-02:LMIA 季度源文件名集合 ∩ JVWS raw 表 quarters[] 的**最近共同季度**('YYYYQN' 字符串可
    直接比大小排序)。同季对同季;若 LMIA 最新季晚于 JVWS 最新季(或反过来),退到两者都有的最近季。
    任一侧没有交集(如某侧数据完全没跑过)→ None,调用方把 sponsor_* 四列整列写 None,不硬凑。"""
    lmia_qs = {m.group(1).upper() for p in IN_LMIA_XLSX_DIR.glob("tfwp_*_pos_en.xlsx")
               for m in [_QUARTER_FILE_RE.match(p.name)] if m}
    if not lmia_qs or not IN_JVWS_RAW.exists():
        return None
    jvws_qs = set(json.loads(IN_JVWS_RAW.read_text(encoding="utf-8")).get("quarters", []))
    common = lmia_qs & jvws_qs
    return max(common) if common else None


def _lmia_positions_by_noc(quarter: str) -> dict[str, int]:
    """单季度 xlsx(lmia/build_esdc_lmia_employers.py 已缓存的同一份季度源,原地复用不重下)→ {noc: approved positions}
    (全国口径——ESDC 表本没有省份维度上限,但 JVWS 分母本轮只取全国 NAT,省级担保率留后续批次)。
    ESDC LMIA 是穷举的行政记录,不是抽样调查:某 NOC 当季没出现 = 确实 0 件获批,不是官方抑制
    (与 JVWS 分母的 None 抑制语义不同,数字 0 在这里就是真 0,可以直接用)。
    NOC 匹配复用 build_lmia.py 的 _NOC_RE(单一来源);解析逻辑(表头定位/跳过尾注行/列位)照抄
    build_lmia.parse_quarter,但只按 NOC 聚合 positions,不建雇主维护表(那张表把 8 个季度累加到一起,
    丢了单季颗粒度,做不了本表要的「同季对同季」)。"""
    import openpyxl  # 延迟 import,同 build_lmia.py 惯例(镜像 Dockerfile 需装 openpyxl)
    path = IN_LMIA_XLSX_DIR / f"tfwp_{quarter.lower()}_pos_en.xlsx"
    if not path.exists():
        return {}
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.active
    out: dict[str, int] = defaultdict(int)
    header = None
    for row in ws.iter_rows(values_only=True):
        cells = ["" if c is None else str(c).strip() for c in row]
        if header is None:
            if cells and cells[0].startswith("Province"):
                header = cells
            continue
        if len(cells) < 8 or not cells[2]:          # Employer 空 = 尾部注释/空行
            continue
        _prov, _stream, _employer, _addr, occ, _inc, _lmias, positions = cells[:8]
        m = _lmia_mod._NOC_RE.match(occ)
        if not m:
            continue
        try:
            out[m.group(1).zfill(5)] += int(float(positions or 0))
        except ValueError:
            continue
    wb.close()
    return dict(out)

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")

IN_JOBS = paths.MART / "jobs.json"
IN_DIFF = paths.PROCESSED / "difficulty.json"   # E12-07:省难度指数(04e 产出;缺文件=不挂,列留空)
OUT_STATS = paths.MART / "stats.json"
# E8-14 每日快照:只产出**今天这一天**的行,seed 按 (date,province,broad) UPSERT 追加,永不 DELETE。
# 趋势图的唯一数据来源;历史补不回来 —— 落地那天才是第一个点,所以先于主图建起来。
OUT_DAILY = paths.MART / "stats_daily.json"
# E8-14 主图的两个新粒度(现有 stats 是 省×大类×中类,出不了「具体职业」与「城市」两条横轴)
IN_NOC_DESC = paths.MART / "noc_descriptions.json"   # 职业名(官方名,已随 09 产出)
OUT_OCC = paths.MART / "stats_occupation.json"       # 职业 × 省(province='all' 为全国行)
OUT_CITY = paths.MART / "stats_city.json"            # 城市

# E14-02:担保率(sponsor_rate)= LMIA 同季获批岗位数(分子,担保侧)÷ JVWS 同季全国空缺数(分母,全市场)。
# 口径详见 docs/implementation/E14-全市场数据三角/02_担保率.md。只在 stats_occupation 的 province='all'
# 全国行落值(与 pnpProvs/channelTier 同款做法——省级担保率需要省级 LMIA×NOC 拆分,本轮不做,YAGNI)。
IN_LMIA_XLSX_DIR = paths.LMIA                        # tfwp_YYYYqN_pos_en.xlsx 季度源(build_lmia.py 已缓存,原地复用不重下)
IN_JVWS_RAW = paths.JVWS / "jvws-vacancies.json"      # build_jvws.py 产,已按 StatCan 抑制规则把不可发布值设 None

# E13-02(把脉首页,00_总设计与口径.md §3,v2 2026-08-06 晚修订)派生指标输入。ETL 只读写 data/,不碰 DB。
IN_POSTINGS = paths.PROCESSED_JOBBANK / "postings.json"   # 累积当前态,有 date(发布日),推 new30d/new30d_prev/mom30d
IN_EXPIRED = paths.PROCESSED_JOBBANK / "expired_ids.json"  # verify_expired.py 的判死台账(dead: posting_id→判死时刻)——closed30d/stats_daily.closed 的源
IN_CLOSED = paths.MART / "closed_jobs.json"                # 09 写的实测判死名单(externalId+closedAt)——avg_days_open 只认它(不受本次 v2 修订影响)

# pulse_score 复合脉象分权重(设计文档 §3 写死,前端/后续改动不许绕过 ETL 改权重)
# v2:动量分量从 net30d/openJobs 换成 mom30d(环比涨跌);v3:再换成 mom14d(理由见下),权重不变
PULSE_W_MOM, PULSE_W_NAMED, PULSE_W_WAGE = 0.5, 0.3, 0.2

# E13-02 v3(2026-08-06 晚,再修订):mom30d 的分母窗口 (T−60d,T−30d] 撞上本站抓取从局部覆盖扩到
# 全 10 省全职业的爬坡期(实测:2026-06-18~06-25 那周从 94 条跳到 3608 条,此后才稳定在 1.1~1.3 万/周)——
# 60 天窗口只要还咬到爬坡期,mom30d 就是「跟当年数据本来就少的自己比」,不是真实环比(v2 实测中位数 +169%)。
# COVERAGE_COMPLETE = 稳定覆盖起点;分母窗起点 T−60d 早于它,整列 mom30d 写 null(8-31 起 T−60d 滑过
# 07-02,自然解禁,不用改代码)。mom14d 的四个窗口边界(T、T-14d、T-28d)全晚于它,眼下唯一干净的环比。
COVERAGE_COMPLETE = date(2026, 7, 2)

PROVS = ["ON", "BC", "AB", "SK", "MB", "QC", "NS", "NB", "NL", "PE"]
TODAY = date.today().isoformat()
# E13-05:榜 A「可提名省份」列的省序(工作项文档 §3.1 写死);QC 由 pnp_eligible 内部按 NON_PNP_PROV 自然排除,不入序
PNP_PROV_ORDER = ["BC", "AB", "SK", "MB", "ON", "NB", "NS", "PE", "NL"]


def median_or_none(vals: list) -> float | None:
    vals = [v for v in vals if isinstance(v, (int, float))]
    return round(statistics.median(vals)) if vals else None


def _parse_posted(s: str) -> date | None:
    """postings.json 的 date 字段:'August 06, 2026' 或已经是 'YYYY-MM-DD'(与 verify_expired.py 同一套解法)。"""
    s = (s or "").strip()
    for fmt in ("%B %d, %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s[:10] if fmt == "%Y-%m-%d" else s, fmt).date()
        except ValueError:
            continue
    return None


def _parse_iso_date(s: str) -> date | None:
    """last_seen('2026-08-06T17:34:52Z')/closedAt(ISO 带时区)都只取日期部分。"""
    s = (s or "")[:10]
    try:
        return date.fromisoformat(s)
    except ValueError:
        return None


def _zscores(vals: list) -> list:
    """组内 z-score。None(算不出的项)记 0——中性,不拉不拽那一项的分;样本<2 或全同值一并归 0(防除零)。"""
    xs = [v for v in vals if v is not None]
    if len(xs) < 2:
        return [0.0] * len(vals)
    m = statistics.mean(xs)
    sd = statistics.pstdev(xs)
    if not sd:
        return [0.0] * len(vals)
    return [0.0 if v is None else (v - m) / sd for v in vals]


def build_flow_stats() -> tuple[dict, dict, dict]:
    """E13-02 v3(2026-08-06 晚,设计文档 §3 修订):从 postings.json(累积当前态,不是时序)推
    new30d/new30d_prev/mom30d + new14d_prev/mom14d,从 expired_ids.json 的判死台账推 closed30d +
    stats_daily 的 closed,从 closed_jobs.json(实测判死,mart)推 avg_days_open。province 键含 'all'。

    v1→v2 变更(如实记录):v1 拿 postings.last_seen「停更」当下架信号,实测证伪——增量抓取不复核老帖,
    发布 >7 天的帖当天 last_seen 命中率≈0%,把 closed30d 撑高了约六成。v2 换成 verify_expired.py 的
    判死台账(expired_ids.json.dead:posting_id→判死时刻,7-25 起累积,27k 条)。
    ⚠️ closed30d/stats_daily.closed 仍有局限,未上前端(见设计文档 §3「上前端?」列):**判死日≠真实
    下架日**——台账是「哪天被本站的验尸脚本抽中并确认 410」,不是「哪天真的从 Job Bank 下架」,排水期
    (积压历史欠账的那几天)会显得虚高、扎堆(实测:8-03 单天判死 7364 条、8-05 判死 6858 条,对比稳态
    几百条/天)。因此只入库不进 S1-S3 展示,等台账进入稳态(E13-04)再校准启用。

    v2→v3 变更(如实记录):mom30d 的分母窗口 (T−60d,T−30d] 撞上抓取爬坡期,v2 实测中位数 +169%,不是
    真实环比——加 COVERAGE_COMPLETE 闸门,分母窗起点早于它就整列写 null(见模块顶部常量注释)。
    另加 mom14d(窗口边界全晚于爬坡期,眼下唯一干净的环比),pulse_score 动量分量改用它。
    avg_days_open 不受这两轮修订影响,仍只认 closed_jobs.json。
    """
    if not IN_POSTINGS.exists():
        print(f"  ⚠ {IN_POSTINGS} 不存在,new30d/new30d_prev/mom30d/new14d_prev/mom14d/closed30d/"
              f"avg_days_open/stats_daily.closed 留空(0/null)")
        return {}, {}, {}

    postings = json.loads(IN_POSTINGS.read_text(encoding="utf-8"))
    today_d = date.today()
    cut14 = today_d - timedelta(days=14)
    cut28 = today_d - timedelta(days=28)
    cut30 = today_d - timedelta(days=30)
    cut60 = today_d - timedelta(days=60)
    mom30_gated = cut60 < COVERAGE_COMPLETE   # 分母窗起点撞爬坡期 → 整列 mom30d 写 null(如实标注,不瞎补)

    dead: dict[str, date] = {}   # posting_id → 判死日(expired_ids.json 台账)
    if IN_EXPIRED.exists():
        for pid, ts in json.loads(IN_EXPIRED.read_text(encoding="utf-8")).get("dead", {}).items():
            d = _parse_iso_date(ts)
            if d:
                dead[pid] = d

    recs = []  # (noc, province, posted, posting_id)
    for p in postings:
        noc = p.get("noc") or ""
        pid = p.get("posting_id")
        if not pid or NOC.teer_of(noc) is None:
            continue
        recs.append((noc, (p.get("province") or "").upper(), _parse_posted(p.get("date")), pid))

    flow: dict[tuple, dict] = defaultdict(lambda: {"new30d": 0, "new30d_prev": 0, "new14d": 0, "new14d_prev": 0, "closed30d": 0})
    daily_closed: dict[tuple, int] = defaultdict(int)
    for noc, prov, posted, pid in recs:
        keys = [(noc, "all")] + ([(noc, prov)] if prov in PROVS else [])
        is_new30 = posted is not None and posted >= cut30
        is_new30_prev = posted is not None and cut60 < posted <= cut30
        is_new14 = posted is not None and posted >= cut14          # new7d 同源手法,窗口换成 14 天
        is_new14_prev = posted is not None and cut28 < posted <= cut14
        closed_date = dead.get(pid)
        is_closed30 = closed_date is not None and cut30 < closed_date <= today_d
        for k in keys:
            if is_new30:
                flow[k]["new30d"] += 1
            if is_new30_prev:
                flow[k]["new30d_prev"] += 1
            if is_new14:
                flow[k]["new14d"] += 1
            if is_new14_prev:
                flow[k]["new14d_prev"] += 1
            if is_closed30:
                flow[k]["closed30d"] += 1
        # stats_daily「当日下架计数」= 台账判死日恰好是今天(不是推导,是台账写入日,不存在 1 天滞后)
        if closed_date == today_d and prov in PROVS:
            broad = NOC.broad_of(noc)
            daily_closed[(prov, broad)] += 1
            daily_closed[(prov, "all")] += 1

    for d in flow.values():
        d["net30d"] = d["new30d"] - d["closed30d"]
        d["mom30d"] = None if mom30_gated else (
            (d["new30d"] / d["new30d_prev"] - 1) if d["new30d_prev"] >= 5 else None)
        d["mom14d"] = (d["new14d"] / d["new14d_prev"] - 1) if d["new14d_prev"] >= 5 else None

    # avg_days_open:只认 closed_jobs.json(实测判死);postings.json 只用来查回 noc/province/发布日
    pmap = {p["posting_id"]: p for p in postings if p.get("posting_id")}
    days_by_key: dict[tuple, list] = defaultdict(list)
    if IN_CLOSED.exists():
        for c in json.loads(IN_CLOSED.read_text(encoding="utf-8")):
            pid = (c.get("externalId") or "").split(":", 1)[-1]
            pp = pmap.get(pid)
            if not pp:
                continue
            noc = pp.get("noc") or ""
            if NOC.teer_of(noc) is None:
                continue
            posted = _parse_posted(pp.get("date"))
            closed_at = _parse_iso_date(c.get("closedAt"))
            if not posted or not closed_at or closed_at < posted:
                continue
            n = (closed_at - posted).days
            days_by_key[(noc, "all")].append(n)
            prov = (pp.get("province") or "").upper()
            if prov in PROVS:
                days_by_key[(noc, prov)].append(n)

    avg_open = {k: (round(statistics.mean(v), 1) if len(v) >= 5 else None) for k, v in days_by_key.items()}
    return dict(flow), avg_open, dict(daily_closed)


def main() -> None:
    print(f"IN : {IN_JOBS}\nOUT: {OUT_STATS}")
    jobs = [j for j in json.loads(IN_JOBS.read_text(encoding="utf-8")) if j.get("status") != "closed"]
    cut7 = (date.today() - timedelta(days=7)).isoformat()

    print(f"IN : {IN_POSTINGS}\nIN : {IN_EXPIRED}\nIN : {IN_CLOSED}  (E13-02 v3 派生指标)")
    flow, avg_open, daily_closed = build_flow_stats()
    print(f"  flow keys(noc×province,含 all): {len(flow)} · avg_days_open 有效样本(≥5): {len(avg_open)} · "
          f"daily_closed 桶(province×broad): {len(daily_closed)}")

    # ── E14-02:担保率分子/分母(同季对同季)──────────────────────────────────
    sponsor_quarter = _comparable_quarter()
    sponsor_lmia: dict[str, int] = {}
    sponsor_jvws: dict[str, dict] = {}   # noc → {vacancies, quality}(province='NAT' 行)
    if sponsor_quarter:
        print(f"IN : {IN_LMIA_XLSX_DIR / ('tfwp_' + sponsor_quarter.lower() + '_pos_en.xlsx')}\nIN : {IN_JVWS_RAW}  (E14-02 担保率同季 {sponsor_quarter})")
        sponsor_lmia = _lmia_positions_by_noc(sponsor_quarter)
        sponsor_jvws = {r["noc"]: r for r in json.loads(IN_JVWS_RAW.read_text(encoding="utf-8"))["rows"]
                         if r["province"] == "NAT" and r["quarter"] == sponsor_quarter}
        print(f"  sponsor_quarter={sponsor_quarter}: LMIA {len(sponsor_lmia)} 个 NOC 有获批记录 · "
              f"JVWS NAT {len(sponsor_jvws)} 个 NOC 有分母行")
    else:
        print("  ⚠ E14-02: LMIA 与 JVWS 无共同季度,stats_occupation.sponsor_* 四列整列写 None")

    def sponsor_of(noc: str, teer) -> dict:
        """只喂 stats_occupation 的 province='all' 全国行(调用点见 occ_rows.append)。"""
        if not sponsor_quarter:
            return {"sponsorPosQ": None, "sponsorPosSkilledQ": None, "jvwsVacQ": None,
                    "sponsorRate": None, "sponsorEvidence": None}
        pos = sponsor_lmia.get(noc, 0)      # ESDC 穷举行政记录:没出现=当季确实 0 件获批,不是抑制
        v = sponsor_jvws.get(noc)
        vac = v["vacancies"] if v else None  # 🔴 StatCan 抑制/未采集本就是 None,原样传,不折 0(e14-01 红线同款)
        skilled = pos if teer in (0, 1, 2, 3) else 0   # 副指标口径=本 NOC 的 TEER,不是 LMIA 项目股别
        rate = round(pos / vac, 4) if vac else None    # vac 是 None 或 0 → rate=None(分母缺失/为零都不算)
        evidence = json.dumps({
            "quarter": sponsor_quarter,
            "jvwsQuality": v["quality"] if v else None,
            "lmiaSource": "ESDC TFWP positive LMIA positions (open.canada.ca 90fed587)",
            "jvwsSource": "StatCan 14-10-0444-01",
        }, ensure_ascii=False)
        return {"sponsorPosQ": pos, "sponsorPosSkilledQ": skilled, "jvwsVacQ": vac,
                "sponsorRate": rate, "sponsorEvidence": evidence}

    buckets: dict[tuple[str, str, str], list[dict]] = defaultdict(list)
    for j in jobs:
        prov = (j.get("province") or "").upper()
        if prov not in PROVS:
            continue
        broad = j.get("broad") or "未分类"
        mid = j.get("mid") or "未分类"
        buckets[(prov, broad, mid)].append(j)
        buckets[(prov, broad, "all")].append(j)
        buckets[(prov, "all", "all")].append(j)

    diff: dict[str, str] = {}
    if IN_DIFF.exists():
        _d = json.loads(IN_DIFF.read_text(encoding="utf-8"))
        diff = {r["province"]: json.dumps(r | {"generated": _d.get("generated")}, ensure_ascii=False) for r in _d.get("rows", [])}
    rows: list[dict] = []
    for (prov, broad, mid), js in sorted(buckets.items()):
        streams = sorted({j["pnpStream"] for j in js if j.get("pnpStream")})
        cities = Counter(j.get("city") for j in js if j.get("city"))
        rows.append({
            "province": prov, "broad": broad, "mid": mid,
            "openJobs": len(js),
            "new7d": sum(1 for j in js if (j.get("datePosted") or "") >= cut7),
            "medianWageAnnual": median_or_none([j.get("wageMedAnnual") for j in js]),
            "medianSalaryAnnual": median_or_none([j.get("salaryAnnual") for j in js]),
            "namedJobs": sum(1 for j in js if j.get("pnpStream")),
            "streamLabels": "、".join(streams),
            "aipJobs": sum(1 for j in js if j.get("aip")),
            "topCities": json.dumps([{"city": c, "n": n} for c, n in cities.most_common(5)], ensure_ascii=False),
            "fetched": TODAY,
            # E12-07:省级汇总行挂难度指数(jsonb);非省级行留空
            "difficulty": (diff.get(prov) if broad == "all" and mid == "all" else None),
        })

    OUT_STATS.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    # ── E8-14 每日快照 ────────────────────────────────────────────────────────
    # 粒度 = 日 × 省 × 大类(含 all 汇总行),取 stats 的大类层直接投影 —— 不重算,口径与主表天生一致。
    # 一天多跑几轮 ETL 也只会 UPSERT 同一批行(date 是主键的一部分),不会灌出重复点。
    # E13-02:closed = 当日下架计数(见 build_flow_stats 顶部的口径局限说明);同一 province×broad 桶合并。
    daily = [{"date": TODAY, "province": r["province"], "broad": r["broad"],
              "openJobs": r["openJobs"], "new7d": r["new7d"],
              "medianSalaryAnnual": r["medianSalaryAnnual"], "namedJobs": r["namedJobs"],
              "closed": daily_closed.get((r["province"], r["broad"]), 0)}
             for r in rows if r["mid"] == "all"]
    OUT_DAILY.write_text(json.dumps(daily, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"stats_daily: {len(daily)} 行(日期 {TODAY})→ {OUT_DAILY}")

    # ── E8-14 主图数据源:职业粒度 + 城市粒度 ────────────────────────────────
    # 都是「当下状态」的维度表(走 dims 的清空+重灌),与 stats_daily 的追加语义不同。
    # 职业名取 noc_descriptions 的官方名 —— 不在这里造名字,拿不到就留空(宁可留空不瞎猜)。
    noc_name: dict[str, dict] = {}
    if IN_NOC_DESC.exists():
        for d in json.loads(IN_NOC_DESC.read_text(encoding="utf-8")):
            noc_name[d.get("noc", "")] = d

    def agg(js: list) -> dict:
        # 两个口径并存(2026-07-28 Frank 放行:这张表要撑留学/职业规划,不能只有自家算的数):
        #   medianWageAnnual  = **ESDC 官方**中位年薪(每个岗按其 NOC×省 查官方表,再取中位)——权威基线,
        #                       不随我们抓到多少帖子而漂;与省级 stats 表同一口径。
        #   medianSalaryAnnual= 帖面中位(本站折算)——当下行情,样本薄时会失真。
        #   salaryN           = 有帖面薪资的岗位数 = 帖面中位的**样本量**。
        #                       实核:全国 17 个职业、分省 723 行是「1 个岗 + 一个中位」——
        #                       样本量落表,前端才有依据决定报不报,而不是前端瞎定阈值。
        sal = [j.get("salaryAnnual") for j in js if j.get("salaryAnnual")]
        return {"openJobs": len(js),
                "new7d": sum(1 for j in js if (j.get("datePosted") or "") >= cut7),
                "medianWageAnnual": median_or_none([j.get("wageMedAnnual") for j in js]),
                # ESDC 低/高位年薪(2026-07-31 Frank「改成范围」):与中位同口径——每岗按其 NOC×省
                # 查官方表的 low/high,再取中位;不是全省极值,也不发明全国聚合
                "wageLowAnnual": median_or_none([j.get("wageLowAnnual") for j in js]),
                "wageHighAnnual": median_or_none([j.get("wageHighAnnual") for j in js]),
                "medianSalaryAnnual": median_or_none([j.get("salaryAnnual") for j in js]),
                "salaryN": len(sal),
                "namedJobs": sum(1 for j in js if j.get("pnpStream"))}

    occ_rows = []
    by_noc: dict[str, list] = defaultdict(list)
    for j in jobs:
        if j.get("noc"):
            by_noc[j["noc"]].append(j)
    for noc, js in by_noc.items():
        nd = noc_name.get(noc, {})
        # 大/中/小三级都带上(2026-07-28 Frank:「过滤需要加 职业 大类 种类 小类吧」)——
        # 三者对同一个 NOC 是常量(etl/noc.py 单一来源),取任一岗即可,不另算。
        base = {"noc": noc, "teer": js[0].get("teer"), "broad": js[0].get("broad", ""),
                "mid": js[0].get("mid", ""), "fine": js[0].get("fine", ""),
                "titleZh": nd.get("titleZh", ""), "titleZhShort": nd.get("titleZhShort", ""),
                "titleEn": nd.get("title", ""), "fetched": TODAY}

        def flow_of(key: tuple) -> dict:
            # 找不到 = 该 noc×province 在本轮 postings.json 里没有可归属的样本,真实 0(不是没算)
            f = flow.get(key, {"new30d": 0, "new30d_prev": 0, "new14d": 0, "new14d_prev": 0, "closed30d": 0, "net30d": 0, "mom30d": None, "mom14d": None})
            # new14d 入库(契约缝隙修补:S1「近14天新发」主数字要直读它,不能只当 mom14d 中间量)
            return {"new30d": f["new30d"], "new30dPrev": f["new30d_prev"], "new14d": f.get("new14d", 0), "new14dPrev": f["new14d_prev"],
                    "closed30d": f["closed30d"], "net30d": f["net30d"],
                    "mom30d": f.get("mom30d"), "mom14d": f.get("mom14d"), "avgDaysOpen": avg_open.get(key)}

        # E13-05/09:可提名省份拆两档(逐省判,非省具名清单命中);teer=None → 空串(宁可留空)
        #   pnp_provs      = 拿 offer 即可(direct);
        #   pnp_provs_cond = 先省内同雇主 6 个月(eligible−direct:MB/NS/NB/PE 普通通道兜底的 TEER4-5)
        teer = base["teer"]
        pnp_provs = "、".join(p for p in PNP_PROV_ORDER if pnp_direct(noc, teer, p))
        pnp_provs_cond = "、".join(p for p in PNP_PROV_ORDER if pnp_eligible(noc, teer, p) and not pnp_direct(noc, teer, p))
        # E13-08:完全无路可走的省(9 省内 any_pr_path=False 的补集;空串=处处有路)。
        # teer 未分类判不了 → None(强负断言不硬判,前端该行不出死路)。
        dead_provs = None if teer is None else "、".join(p for p in PNP_PROV_ORDER if not any_pr_path(noc, teer, p))
        occ_rows.append({**base, "province": "all", "pnpProvs": pnp_provs, "pnpProvsCond": pnp_provs_cond, "deadProvs": dead_provs,
                         "channelTier": channel_tier(noc, teer),   # E13-07 四档
                         **agg(js), **flow_of((noc, "all")),
                         **sponsor_of(noc, teer)})   # E14-02 担保率(仅全国行,同 pnpProvs 做法)
        by_p: dict[str, list] = defaultdict(list)
        for j in js:
            if j.get("province"):
                by_p[j["province"]].append(j)
        for prov, pjs in by_p.items():
            occ_rows.append({**base, "province": prov, **agg(pjs), **flow_of((noc, prov))})

    # pulse_score(设计文档 §3 v3):province 相同的行分一组做 z-score(全国行 'all' 自成一组,不跟单省混算)——
    # 组内 z 是「这个职业比同组里其他职业强/弱多少个标准差」,跨组比较没意义。样本门槛不在这里裁(§8.2 前端裁)。
    # 动量分量改用 mom14d(mom30d 撞抓取爬坡期,眼下整列 null——见 COVERAGE_COMPLETE 闸门);
    # mom14d=None(new14d_prev<5)的行该分量按组内均值计(_zscores 对 None 记 0)。
    by_prov_rows: dict[str, list] = defaultdict(list)
    for r in occ_rows:
        by_prov_rows[r["province"]].append(r)
    for rs in by_prov_rows.values():
        mom = [r.get("mom14d") for r in rs]
        named_ratio = [(r["namedJobs"] / r["openJobs"]) if r["openJobs"] else None for r in rs]
        wage_dev = [((r["medianSalaryAnnual"] - r["medianWageAnnual"]) / r["medianWageAnnual"])
                    if r.get("medianSalaryAnnual") and r.get("medianWageAnnual") else None for r in rs]
        for r, zm, zj, zw in zip(rs, _zscores(mom), _zscores(named_ratio), _zscores(wage_dev)):
            r["pulseScore"] = round(PULSE_W_MOM * zm + PULSE_W_NAMED * zj + PULSE_W_WAGE * zw, 4)

    OUT_OCC.write_text(json.dumps(occ_rows, ensure_ascii=False, indent=2), encoding="utf-8")

    city_rows = []
    by_city: dict[tuple, list] = defaultdict(list)
    for j in jobs:
        if j.get("city"):
            by_city[(j["city"], j.get("province", ""))].append(j)
    for (city, prov), js in by_city.items():
        city_rows.append({"city": city, "province": prov, "fetched": TODAY, **agg(js)})
    city_rows.sort(key=lambda r: -r["openJobs"])
    OUT_CITY.write_text(json.dumps(city_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"stats_occupation: {len(occ_rows)} 行({len(by_noc)} 个职业)→ {OUT_OCC}")
    print(f"stats_city: {len(city_rows)} 行 → {OUT_CITY}")

    provs = len({r["province"] for r in rows})
    base = sum(1 for r in rows if r["mid"] == "all")
    print(f"stats: {len(rows)} 行({provs} 省;大类层 {base} 行 + 中类层 {len(rows) - base} 行)→ {OUT_STATS}")


if __name__ == "__main__":
    main()

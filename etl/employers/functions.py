"""employers.functions — 雇主池构建(雇主板重构批一,2026-08-30;设计稿即口径真相)。

三源聚合零新抓取:jobs(在招/入门/工资)+ designated_employers(指定资格)+
LMIA 事实(技能类旁证,逐 NOC 判 TEER≤3 归桶)+ postings 全史(规模代理)。
🔴 红线:裸 LMIA 总量永不入星不入排序;公司名归一残差留空不硬合;
口径只有本文件一份 —— 板与顾问工具只读(lib/ruling 先例)。
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import paths
from noc.functions import broad_of, teer_of
from log.functions import say
from employers.constants import (ENTRY_LEVELS, EXP_RANK, GUARD_FEW_TPL, GUARD_MIN_POOL,
                                 IN_COMPANIES, IN_DESIGNATED, IN_JOBS, IN_LMIA, IN_POSTINGS,
                                 K_ACCESSIBILITY, K_APPRENTICE, K_BROAD, K_CITY, K_COMPANY_SLUG,
                                 K_DATE_POSTED, K_EMPLOYER, K_EMPLOYERS_TABLE, K_LAST_QUARTER, K_LOCATION, K_NAME,
                                 K_NOCS, K_POSITIONS_SKILLED, K_PROVINCE, K_REGION, K_SECTORS,
                                 ENC_UTF8, K_SLUG, K_SOURCE, K_STATUS, K_TITLE, K_WAGE_MED, K_WEBSITE,
                                 LEGAL_SUFFIX_RE, NAME_JUNK_RE, NAME_SEP, NORM_KEY_PREFIX,
                                 PRINT_POOL_DONE_TPL, PRINT_SOURCES_TPL, SKILLED_TEER_MAX,
                                 STAR_ENTRY, STAR_LOW, STAR_MID, STAR_TOP, STAR_TRACE,
                                 STATUS_OPEN, TOP_TITLES_N, WAGE_INDEX_BASE, OUT_BUCKETS, OUT_POOL)
from employers.scheme import (BucketIn, BucketRow, DesignatedOut, HistOut, HomeOut,
                              KeyIn, PoolCtx, PoolRow, ScanOut, StarIn)


# =========================================================================
# 1. 共享词汇(名字归一 / 中位数 / 桶别名)
# =========================================================================


def norm_name_of(name: str) -> str:
    """公司名归一键:小写、剥法务后缀、非字母数字折空格(三源同名不同写的对齐面;
    归一撞不上就各自成行 —— 残差留空不硬合)。"""
    low = (name or "").lower()
    low = LEGAL_SUFFIX_RE.sub(NAME_SEP, low)
    low = NAME_JUNK_RE.sub(NAME_SEP, low)
    return NAME_SEP.join(low.split())


def median_of(values: list) -> int | None:
    """整数中位(空清单 = None,不折 0)。"""
    vals = []
    for v in values:
        if v is not None:
            vals.append(v)
    if len(vals) == 0:
        return None
    vals.sort()
    return int(round(vals[len(vals) // 2]))


def skilled_broads_of(lmia_row: dict) -> dict:
    """LMIA 行的逐 NOC 份数 → {大类桶: 技能类份数}(TEER≤3 才算;裸总量不出此门)。"""
    out: dict = {}
    for code, n in (lmia_row.get(K_NOCS) or {}).items():
        teer = teer_of(code)
        if teer is None or teer > SKILLED_TEER_MAX:
            continue
        broad = broad_of(code)
        if not broad:
            continue
        out[broad] = out.get(broad, 0) + int(n)
    return out


# =========================================================================
# 2. 三源装载(建索引一次,聚合段只读)
# =========================================================================


def load_companies(ctx: PoolCtx) -> int:
    """companies 维表 → slug 索引 + 归一名对齐面 + 显示名首选。"""
    companies = json.loads(IN_COMPANIES.read_text(encoding=ENC_UTF8))
    for row in companies:
        slug = row.get(K_SLUG)
        if not slug:
            continue
        ctx.companies_by_slug[slug] = row
        norm = norm_name_of(row.get(K_NAME) or "")
        if norm and norm not in ctx.norm_to_slug:
            ctx.norm_to_slug[norm] = slug
        ctx.names[slug] = row.get(K_NAME) or slug
    return len(companies)


def load_jobs(ctx: PoolCtx) -> int:
    """在招岗 → 雇主×桶索引 + 水位分母语料((broad, province) 全体中位)。"""
    jobs = json.loads(IN_JOBS.read_text(encoding=ENC_UTF8))
    for row in jobs:
        if row.get(K_STATUS) != STATUS_OPEN:
            continue
        key = row.get(K_COMPANY_SLUG)
        if not key:
            continue
        broad = row.get(K_BROAD) or ""
        buckets = ctx.open_by_key.setdefault(key, {})
        buckets.setdefault(broad, []).append(row)
        med = row.get(K_WAGE_MED)
        if med is not None:
            cell = (broad, row.get(K_PROVINCE) or "")
            ctx.wage_cells.setdefault(cell, []).append(med)
    return len(jobs)


def load_designated(ctx: PoolCtx) -> int:
    """指定雇主名单 → 归一挂靠(撞不上 companies 的自成 n: 行,残差不硬合)。"""
    designated = json.loads(IN_DESIGNATED.read_text(encoding=ENC_UTF8))
    for row in designated:
        norm = norm_name_of(row.get(K_NAME) or "")
        if not norm:
            continue
        key = ctx.norm_to_slug.get(norm) or NORM_KEY_PREFIX + norm
        ctx.designated_by_key.setdefault(key, []).append(row)
        if key not in ctx.names:
            ctx.names[key] = row.get(K_NAME) or norm
    return len(designated)


def load_lmia(ctx: PoolCtx) -> int:
    """LMIA 事实(信封里的 employers 表)→ 归一挂靠。"""
    lmia_doc = json.loads(IN_LMIA.read_text(encoding=ENC_UTF8))
    lmia = lmia_doc.get(K_EMPLOYERS_TABLE) or {}
    for row in lmia.values():
        if not isinstance(row, dict):
            continue
        norm = norm_name_of(row.get(K_NAME) or "")
        if not norm:
            continue
        key = ctx.norm_to_slug.get(norm) or NORM_KEY_PREFIX + norm
        ctx.lmia_by_key[key] = row
        if key not in ctx.names:
            ctx.names[key] = row.get(K_NAME) or norm
    return len(lmia)


def load_postings(ctx: PoolCtx) -> int:
    """全史岗贴 → 规模代理语料(省市对清单)。"""
    postings = json.loads(IN_POSTINGS.read_text(encoding=ENC_UTF8))
    for row in postings:
        norm = norm_name_of(row.get(K_EMPLOYER) or "")
        if not norm:
            continue
        key = ctx.norm_to_slug.get(norm) or NORM_KEY_PREFIX + norm
        ctx.hist_by_key.setdefault(key, []).append((row.get(K_PROVINCE) or "",
                                                    row.get(K_CITY) or ""))
    return len(postings)


def load_ctx() -> PoolCtx:
    """读五份输入建全部索引;任何一份缺失/损坏当场炸(域门 err 留痕,不产半份池)。"""
    ctx = PoolCtx()
    n_companies = load_companies(ctx)
    n_jobs = load_jobs(ctx)
    n_designated = load_designated(ctx)
    n_lmia = load_lmia(ctx)
    n_postings = load_postings(ctx)
    say(PRINT_SOURCES_TPL.format(jobs=n_jobs, companies=n_companies, designated=n_designated,
                                 lmia=n_lmia, postings=n_postings))
    return ctx


# =========================================================================
# 3. 星级(口径单一红线:板/顾问只读,不复算)
# =========================================================================


def star_of(x: StarIn) -> int:
    """切面星 1-5(Frank 拍死:指定雇主 >> 在招活跃+入门可及 > 技能类 LMIA 旁证;
    指定+在招=顶档,指定无岗=中档保底;裸 LMIA 总量不进此函数)。"""
    if x.designated and x.open_jobs > 0:
        return STAR_TOP
    if x.designated:
        return STAR_MID
    if x.open_jobs > 0 and x.entry_jobs > 0:
        return STAR_ENTRY
    if x.open_jobs > 0 and x.lmia_skilled > 0:
        return STAR_MID
    if x.open_jobs > 0 or x.lmia_skilled > 0:
        return STAR_LOW
    return STAR_TRACE


# =========================================================================
# 4. 行构建(全局行 + 桶行)
# =========================================================================


def home_of(x: KeyIn) -> HomeOut:
    """主场判定:在招岗最多的省市;无岗雇主按指定行、companies 维表兜底。"""
    ctx = x.ctx
    des_rows = ctx.designated_by_key.get(x.key) or []
    comp = ctx.companies_by_slug.get(x.key) or {}
    prov_count: Counter = Counter()
    city_count: Counter = Counter()
    for rows in (ctx.open_by_key.get(x.key) or {}).values():
        for row in rows:
            if row.get(K_PROVINCE):
                prov_count[row[K_PROVINCE]] += 1
            if row.get(K_CITY):
                city_count[row[K_CITY]] += 1
    province = None
    if prov_count:
        province = prov_count.most_common(1)[0][0]
    elif des_rows:
        province = des_rows[0].get(K_PROVINCE)
    elif comp.get(K_REGION):
        province = comp.get(K_REGION)
    city = None
    if city_count:
        city = city_count.most_common(1)[0][0]
    elif des_rows:
        city = des_rows[0].get(K_LOCATION)
    return HomeOut(province=province or None, city=city or None)


def designated_summary_of(des_rows: list) -> DesignatedOut:
    """指定行清单 → 项目/省两份去重有序清单。"""
    programs = []
    provinces = []
    for row in des_rows:
        src = row.get(K_SOURCE) or ""
        if src and src not in programs:
            programs.append(src)
        prov = row.get(K_PROVINCE) or ""
        if prov and prov not in provinces:
            provinces.append(prov)
    return DesignatedOut(programs=sorted(programs), provinces=sorted(provinces))


def hist_stats_of(hist: list) -> HistOut:
    """全史省市对 → 规模代理三格(进事实不进星级)。"""
    provs = set()
    cities = set()
    for prov, cty in hist:
        if prov:
            provs.add(prov)
        if cty:
            cities.add(cty)
    return HistOut(jobs=len(hist), provinces=len(provs), cities=len(cities))


def pool_row_of(x: KeyIn) -> PoolRow:
    """一雇主的全局行(身份三源择优 + 指定归属 + 规模代理 + LMIA 旁证汇总)。"""
    ctx = x.ctx
    slug = None
    if x.key in ctx.companies_by_slug:
        slug = x.key
    comp = ctx.companies_by_slug.get(x.key) or {}
    des_rows = ctx.designated_by_key.get(x.key) or []
    lmia_row = ctx.lmia_by_key.get(x.key) or {}
    home = home_of(x)
    des = designated_summary_of(des_rows)
    hist = hist_stats_of(ctx.hist_by_key.get(x.key) or [])
    open_total = 0
    for rows in (ctx.open_by_key.get(x.key) or {}).values():
        open_total += len(rows)
    skilled_total = 0
    for n in skilled_broads_of(lmia_row).values():
        skilled_total += n
    return PoolRow(
        key=x.key, slug=slug, name=ctx.names.get(x.key) or x.key,
        industry=comp.get(K_SECTORS) or None,
        province=home.province, city=home.city,
        designated=len(des_rows) > 0, designatedPrograms=des.programs,
        designatedProvinces=des.provinces,
        openJobsTotal=open_total, histJobs=hist.jobs,
        provincesActive=hist.provinces, citiesActive=hist.cities,
        websiteKnown=bool(comp.get(K_WEBSITE)),
        lmiaSkilledTotal=skilled_total,
        lmiaLastQuarter=lmia_row.get(K_LAST_QUARTER) or None,
        fetched=date.today().isoformat())


def bucket_scan_of(rows: list) -> ScanOut:
    """桶内在招岗一次遍历 → 全部派生格(入门/最低档/主要职业/工资语料/最新/主省)。"""
    entry = 0
    exp_best = None
    titles: Counter = Counter()
    wages = []
    latest = None
    prov_count: Counter = Counter()
    for row in rows:
        acc = row.get(K_ACCESSIBILITY)
        if acc in ENTRY_LEVELS or row.get(K_APPRENTICE) is True:
            entry += 1
        rank = EXP_RANK.get(acc)
        if rank is not None and (exp_best is None or rank < EXP_RANK[exp_best]):
            exp_best = acc
        if row.get(K_TITLE):
            titles[row[K_TITLE]] += 1
        if row.get(K_WAGE_MED) is not None:
            wages.append(row[K_WAGE_MED])
        posted = row.get(K_DATE_POSTED)
        if posted and (latest is None or posted > latest):
            latest = posted
        if row.get(K_PROVINCE):
            prov_count[row[K_PROVINCE]] += 1
    top_titles = []
    for title, _n in titles.most_common(TOP_TITLES_N):
        top_titles.append(title)
    prov_top = None
    if prov_count:
        prov_top = prov_count.most_common(1)[0][0]
    return ScanOut(entry=entry, min_exp=exp_best, top_titles=top_titles,
                   wages=wages, latest=latest, prov_top=prov_top)


def bucket_row_of(x: BucketIn) -> BucketRow:
    """一雇主一大类的桶行(切面星住这)。"""
    ctx = x.ctx
    rows = (ctx.open_by_key.get(x.key) or {}).get(x.broad) or []
    des_rows = ctx.designated_by_key.get(x.key) or []
    lmia_row = ctx.lmia_by_key.get(x.key) or {}
    scan = bucket_scan_of(rows)
    share = None
    if len(rows) > 0:
        share = int(round(WAGE_INDEX_BASE * scan.entry / len(rows)))
    wage_med = median_of(scan.wages)
    index = None
    if wage_med is not None and scan.prov_top:
        cell_med = median_of(ctx.wage_cells.get((x.broad, scan.prov_top)) or [])
        if cell_med:
            index = int(round(WAGE_INDEX_BASE * wage_med / cell_med))
    lmia_n = skilled_broads_of(lmia_row).get(x.broad, 0)
    star = star_of(StarIn(designated=len(des_rows) > 0, open_jobs=len(rows),
                          entry_jobs=scan.entry, lmia_skilled=lmia_n))
    quarter = None
    if lmia_n > 0:
        quarter = lmia_row.get(K_LAST_QUARTER) or None
    return BucketRow(
        employerKey=x.key, broad=x.broad, openJobs=len(rows), latestPosted=scan.latest,
        topTitles=scan.top_titles, entryJobs=scan.entry, entryShare=share,
        minExperience=scan.min_exp, lmiaSkilled=lmia_n, lmiaLastQuarter=quarter,
        star=star, wageMedAnnual=wage_med, wageIndexPct=index)


def bucket_rows_of(x: KeyIn) -> list:
    """一雇主的全部桶行(在招桶 ∪ 技能 LMIA 桶 ∪ 指定线索桶;全无线索的指定雇主给通用空桶)。"""
    ctx = x.ctx
    des_rows = ctx.designated_by_key.get(x.key) or []
    broads = set(ctx.open_by_key.get(x.key) or {})
    broads.update(skilled_broads_of(ctx.lmia_by_key.get(x.key) or {}))
    for row in des_rows:
        for code in row.get(K_NOCS) or []:
            b = broad_of(code)
            if b:
                broads.add(b)
    if not broads and des_rows:
        broads.add("")
    out = []
    for broad in sorted(broads):
        out.append(bucket_row_of(BucketIn(ctx=ctx, key=x.key, broad=broad)))
    return out


# =========================================================================
# 5. 编排(准入 → 两表 → 防线 → 写盘)
# =========================================================================


def pool_order_of(row: PoolRow) -> tuple:
    """全局表落盘序:在招多在前,同数按名(展示层自会重排,只求 diff 稳定)。"""
    return (-row.openJobsTotal, row.name)


def build_employer_pool() -> None:
    """役步:池准入 = 在招 ∪ 指定 ∪ 技能类 LMIA>0;两表落 mart(列即 DB 列)。"""
    ctx = load_ctx()
    keys = set(ctx.open_by_key)
    keys.update(ctx.designated_by_key)
    for key, row in ctx.lmia_by_key.items():
        if (row.get(K_POSITIONS_SKILLED) or 0) > 0:
            keys.add(key)

    pool = []
    buckets = []
    for key in sorted(keys):
        pool.append(pool_row_of(KeyIn(ctx=ctx, key=key)))
        for row in bucket_rows_of(KeyIn(ctx=ctx, key=key)):
            buckets.append(row.model_dump())

    if len(pool) < GUARD_MIN_POOL:
        raise RuntimeError(GUARD_FEW_TPL.format(n=len(pool), floor=GUARD_MIN_POOL))

    pool.sort(key=pool_order_of)
    pool_rows = []
    for row in pool:
        pool_rows.append(row.model_dump())
    paths.write_json(paths.WriteJsonIn(path=OUT_POOL, payload=pool_rows, indent=1))
    paths.write_json(paths.WriteJsonIn(path=OUT_BUCKETS, payload=buckets, indent=1))
    say(PRINT_POOL_DONE_TPL.format(pool=len(pool_rows), buckets=len(buckets), out=OUT_POOL))

"""build_mb_stats — MB(MPNP)**官方运营统计**:配额 / 提名 / 拒 / LAA / 收件 / 库存 / 处理天数。

⚠️ 这个脚本是在**推翻一条我们自己写下的假结论**:chatTools 的 OPS_POLICY.MB 曾写着
`published: false`「MB 官方不发处理时长/池子统计(2026-08-03 全站 324 页爬完确认)」——
**是错的**。病根:那轮 mb-mpnp 的爬取种子只圈了 `/mpnp/`,`/resources/data/` 整个目录没进去,
于是「这一轮没爬到」被写成了「官方不公布」。对用户说「官方不公布」而官方其实公布了,
比说「我不知道」坏得多(中介正好钻这个空子)。MB 其实是全国**披露最厚**的省之一:
2018–2026 每年一页月度运营数据,2017–2024 每年一份年报(含逐通道平均处理天数)。

两个官方源(都从 crawl 缓存读,不再自己发请求 —— crawl 役每小时全站爬,见 etl/crawl/cache.py):
  · MPNP Monthly Data <年>   年度配额、逐月提名/增强提名/拒/LAA/收件、在审与待审库存
  · MPNP Annual Report <年>  §9 Processing Times:逐通道 批准/拒/总体 平均**天数** + 服务承诺句

年份不写死:从今年往前探,crawl 缓存里有哪年就取哪年(官方每年新开一页,写死等于明年静默过期)。

口径与红线:
  · 单位照官方发布的原单位存,**不换算**(MB 发 days 就存 days;BC 发 months 就存 months)——
    折算成「周」等于替官方编了个精度。metric 名自带单位后缀,一眼看出官方给的是什么。
  · 月度表是**年初至今累计**(Total 行)+ 逐月;库存(在审/待审)只有最新月有意义,
    只取最后一个有数据的月份,period 写明是哪个月 —— 别把 6 月的库存说成「当前」。
  · 抑制值/不适用一律 value=None + 原文进 valueText,绝不折成 0(本表的立身之本)。

自校是硬闸(照 build_bc_stats):配额没解析到 / 关键表缺失 / 处理时长表行数异常
就**保留旧表不覆盖**并 exit 1 —— 半份数据盖掉好数据比没有更糟。

Usage:  uv run python etl/pnp/build_mb_stats.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))            # etl/ → _paths
sys.path.insert(0, str(_HERE.parent / "crawl"))  # etl/crawl/ → cache
import _paths  # noqa: E402
import cache  # noqa: E402

MONTHLY_URL = "https://immigratemanitoba.com/resources/data/monthly-data-{year}"
ANNUAL_URL = "https://immigratemanitoba.com/resources/data/annual-report-{year}"
OUT = _paths.PNP / "mb-stats.json"

PROVINCE = "MB"
NOTE = ("MPNP 官方运营统计:年度配额与年初至今提名/拒/LAA/收件(月度数据页)、"
        "在审与待审库存(逐月,取最新月)、逐通道平均处理天数与「6 个月」服务承诺(年报 §9)、"
        "EOI 池在册人数(年报 §10,**全省唯一的池子人数**,年度快照口径,与 AB 的实时池不可混用)。"
        "单位照官方原单位(天/月),不换算。"
        "⚠️ 2026-08-04 更正:此前站内写着「MB 官方不发运营统计」是错的 —— "
        "那是爬取种子只圈了 /mpnp/、漏了 /resources/data/ 造成的误判。")

MONTHS = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]
# 「For 2026, Manitoba was allocated 6,239 nominations in total.」(整句捕获 → label 就是官方原文)
RE_ALLOC = re.compile(r"(For \d{4}, Manitoba was allocated ([\d,]+) nominations in total\.)", re.I)
# 「The MPNP's commitment to assesses complete applications is within 6 months.」
# (assesses 是官方原文的语法错,照录不改 —— label 一律官方原句)
# 紧跟的那句免责同样值钱(「不完整/与 EOI 对不上的申请可能超出这个标准」)—— 只说 6 个月
# 不说这句,等于把服务承诺说成了保证。有就一起收,没有也不拦。
RE_COMMIT = re.compile(r"(The MPNP[^.]{0,40}commitment to assess\w* complete applications "
                       r"is within (\d+) months?\.(?:\s*Incomplete applications[^.]*standard\.)?)", re.I)
RE_DAYS = re.compile(r"^([\d,]+)\s*days?$", re.I)
# 年报「10. Expression of Interest Pool」那节是个 <ul>,三条各一个数(2026-08-11 查证接入):
#   N Skilled Worker Expression of Interest (EOI) profiles submitted in YYYY   ← 流量
#   N Letters of Advice to Apply (LAAs) issued in YYYY                          ← 流量
#   N Active EOI profiles at the end of YYYY                                    ← **存量,就是「池子里有多少人」**
# 这是**全省唯一的池子人数**:MPNP 站的通道页、月度数据页统统没有(月度页那节同名,给的是当月抽走的 LAA)。
# 只看站内页会得出「MB 不公布池子」的错结论 —— 和当年处理时长踩的是同一个坑。
RE_ACTIVE = re.compile(r"([\d,]+)\s+[Aa]ctive EOI profiles at the end of (\d{4})")


def cells(tr) -> list:
    return [re.sub(r"\s+", " ", td.get_text(" ", strip=True)) for td in tr.find_all(["td", "th"])]


def num(s: str):
    s = (s or "").replace(",", "").strip()
    return int(s) if re.fullmatch(r"\d+", s) else None


def soup_of(html: str) -> BeautifulSoup:
    s = BeautifulSoup(html, "html.parser")
    for t in s(["script", "style", "nav", "header", "footer"]):
        t.decompose()
    return s


def sectioned_tables(soup) -> list:
    """[(最近一个标题文本, 表格的行矩阵)] —— 表头本身认不出表(「Month|SW|BIS|Total」refusals 与
    applications received 一模一样),只有**上方的官方小标题**能唯一定位。"""
    out, head = [], ""
    for el in soup.find_all(["h1", "h2", "h3", "h4", "table"]):
        if el.name == "table":
            out.append((head, [cells(tr) for tr in el.find_all("tr")]))
        else:
            head = re.sub(r"\s+", " ", el.get_text(" ", strip=True))
    return out


def latest(url_tpl: str, years: range) -> tuple:
    """crawl 缓存里最新的那一年:(year, url, html, fetched);一年都没有 → (None, "", None, "")。"""
    for y in years:
        html, fetched = cache.get(url_tpl.format(year=y))
        if html:
            return y, url_tpl.format(year=y), html, fetched
    return None, "", None, ""


def col(rows: list, header_kw: str) -> int:
    """表头里含该关键词的列号(找不到 -1)。"""
    hdr = [c.lower() for c in (rows[0] if rows else [])]
    for i, c in enumerate(hdr):
        if header_kw.lower() in c:
            return i
    return -1


def month_rows(rows: list) -> list:
    """[(月名, 该行各格)] —— 只留月份行,丢掉 Total 与表尾注。"""
    return [(r[0].strip(), r) for r in rows[1:] if r and r[0].strip().rstrip("*").strip() in MONTHS]


def total_row(rows: list) -> list:
    for r in rows[1:]:
        if r and r[0].strip().lower().startswith("total"):
            return r
    return []


def main() -> None:
    print(f"OUT: {OUT}")
    this_year = date.today().year
    problems: list = []

    m_year, m_url, m_html, m_fetched = latest(MONTHLY_URL, range(this_year, this_year - 3, -1))
    a_year, a_url, a_html, a_fetched = latest(ANNUAL_URL, range(this_year, this_year - 4, -1))
    if not m_html:
        problems.append("crawl 缓存里没有 MPNP Monthly Data 任何一年(先跑 etl/crawl/discover_sources.py)")
    if not a_html:
        problems.append("crawl 缓存里没有 MPNP Annual Report 任何一年")
    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    # ── 月度数据页 ───────────────────────────────────────────────────────────
    msoup = soup_of(m_html)
    mtext = re.sub(r"\s+", " ", msoup.get_text(" ", strip=True))
    tabs = sectioned_tables(msoup)

    def table(head_kw: str) -> list:
        for head, rows in tabs:
            if head_kw.lower() in head.lower():
                return rows
        return []

    alloc, alloc_label = None, ""
    ma = RE_ALLOC.search(mtext)
    if ma:
        alloc, alloc_label = num(ma.group(2)), re.sub(r"\s+", " ", ma.group(1)).strip()
    else:
        problems.append("年度配额那句(Manitoba was allocated N nominations)没解析到")

    monthly: dict = {}
    # 每张表:(输出键, 官方小标题, 该表里要取的列 → scope 名)
    #   scope 用官方通道全名(Skilled Worker / Business Investor Stream),省级汇总 scope=''。
    #   label 存**官方表头原文**(「Total Nominations」/「BIS BCs」),不自己改写 —— 报告要引用。
    plan = [
        ("nominationsYtd", "Nominations and approvals",
         [("total nominations", ""), ("sw nominations", "Skilled Worker"), ("bis nominations", "Business Investor Stream")]),
        ("refusalsYtd", "Refusals",
         [("total", ""), ("sw", "Skilled Worker"), ("bis", "Business Investor Stream")]),
        ("laaYtd", "Expressions of Interest",
         [("sw laas", "Skilled Worker"), ("bis laas", "Business Investor Stream"), ("bis bcs", "Business Investor Stream — Business Concepts")]),
        ("receivedYtd", "Applications received",
         [("total", ""), ("sw", "Skilled Worker"), ("bis", "Business Investor Stream")]),
    ]
    for key, head_kw, cols in plan:
        rows = table(head_kw)
        tot = total_row(rows)
        if not tot:
            problems.append(f"月度页「{head_kw}」表没找到 Total 行")
            continue
        picked = []
        for kw, scope in cols:
            i = col(rows, kw)
            if i < 0 or i >= len(tot):
                problems.append(f"月度页「{head_kw}」表缺列「{kw}」")
                continue
            picked.append({"scope": scope, "label": rows[0][i].strip(), "value": num(tot[i])})
        monthly[key] = {"section": head_kw, "rows": picked}

    # 增强提名(Express Entry 口径)——「Month | Total」两列表,只有 Total 行有意义
    inv_rows = table("Applications in assessment")
    enh_rows = table("Enhanced nominations")
    enh_tot = total_row(enh_rows)
    monthly["enhancedYtd"] = {"section": "Enhanced nominations",
                             "label": "Enhanced nominations (made through Express Entry) — Total",
                             "value": num(enh_tot[1]) if len(enh_tot) > 1 else None}
    if monthly["enhancedYtd"]["value"] is None:
        problems.append("增强提名(Enhanced nominations)Total 没解析到")

    # 库存:只有**最新月**有意义(官方口径是每月首个工作日的快照)
    mr = month_rows(inv_rows)
    if not mr:
        problems.append("库存表(in assessment / pending)一行月份都没解析到")
        monthly["inventory"] = {}
    else:
        last_name, last = mr[-1]
        ia, pend, tot_i = col(inv_rows, "in assessment"), col(inv_rows, "pending"), col(inv_rows, "total")
        monthly["inventory"] = {
            "section": "Applications in assessment and pending assessment",
            "month": f"{m_year}-{MONTHS.index(last_name) + 1:02d}",
            "inAssessment": num(last[ia]) if ia >= 0 else None,
            "pending": num(last[pend]) if pend >= 0 else None,
            "total": num(last[tot_i]) if tot_i >= 0 else None,
        }
        monthly["through"] = f"{m_year}-{MONTHS.index(last_name) + 1:02d}"
        monthly["throughMonth"] = last_name

    # ── 年报 §9 Processing Times ────────────────────────────────────────────
    asoup = soup_of(a_html)
    atext = re.sub(r"\s+", " ", asoup.get_text(" ", strip=True))
    proc: list = []
    for head, rows in sectioned_tables(asoup):
        if col(rows, "approved applications") < 0:
            continue
        ia, ir, io = col(rows, "approved"), col(rows, "refused"), col(rows, "overall")
        for r in rows[1:]:
            if len(r) <= max(ia, ir, io) or not r[0].strip():
                continue
            def days(i):
                m = RE_DAYS.match(r[i].strip())
                return num(m.group(1)) if m else None
            proc.append({"stream": r[0].strip(), "approvedDays": days(ia),
                         "refusedDays": days(ir), "overallDays": days(io)})
        break
    if len(proc) < 3:
        problems.append(f"年报处理时长表只解析到 {len(proc)} 条通道(期望 ≥3)")

    # ── 年报 §10 Expression of Interest Pool ────────────────────────────────
    # ⚠️ **官方文档自相矛盾,不许静默替他改**:2024 年报把这个数标成「at the end of 2023」,
    # 而 2023 年报对同一年份给的是 20,392。几乎肯定是 2024 年报的标签笔误,但我们只做两件事 ——
    # 取**最新一份年报**、把官方那句话原样存进 label。年份取**官方标签里写的那个**,不按报告年推。
    eoi_pool: dict = {}
    ma_act = RE_ACTIVE.search(atext)
    if ma_act:
        eoi_pool = {"value": num(ma_act.group(1)), "labelYear": ma_act.group(2),
                    "label": re.sub(r"\s+", " ", ma_act.group(0)).strip()}
    else:
        problems.append("年报 §10 的「N Active EOI profiles at the end of YYYY」没解析到")

    mc = RE_COMMIT.search(atext)
    commitment = int(mc.group(2)) if mc else None
    commitment_label = re.sub(r"\s+", " ", mc.group(1)).strip() if mc else ""
    if not mc:
        problems.append("年报的服务承诺句(commitment … within N months)没解析到")

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": "PNP",
        "source": f"MPNP Monthly Data {m_year} & MPNP Annual Report {a_year}",
        "url": m_url, "note": NOTE,
        "asOf": "",                      # MB 不印口径日;统计期看每行 period
        "fetched": m_fetched,
        "monthly": {**monthly, "url": m_url, "fetched": m_fetched, "year": m_year,
                    "section": f"MPNP Monthly Data {m_year}",
                    "allocation": {"section": "Enhanced nominations", "label": alloc_label, "value": alloc}},
        "annual": {"url": a_url, "fetched": a_fetched, "year": a_year,
                   "section": f"MPNP Annual Report {a_year} — 9. Processing Times",
                   "commitmentMonths": commitment, "commitmentLabel": commitment_label,
                   "processing": proc, "eoiPool": eoi_pool},
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    inv = monthly.get("inventory", {})
    print(f"✓ {OUT}")
    print(f"    月度 {m_year}(至 {monthly.get('throughMonth', '?')}):配额 {alloc:,} · "
          f"提名 {monthly['nominationsYtd']['rows'][0]['value']:,} · 增强 {monthly['enhancedYtd']['value']:,} · "
          f"库存 {inv.get('total')}(在审 {inv.get('inAssessment')} / 待审 {inv.get('pending')})")
    print(f"    年报 {a_year}:承诺 {commitment} 个月;逐通道平均处理天数 {len(proc)} 条")
    print(f"    年报 {a_year} §10 池子:{eoi_pool.get('value'):,} 人 —— 官方原句「{eoi_pool.get('label')}」")
    for p in proc:
        print(f"      {p['stream']:<32} 批准 {p['approvedDays']} / 拒 {p['refusedDays']} / 总体 {p['overallDays']} 天")


if __name__ == "__main__":
    main()

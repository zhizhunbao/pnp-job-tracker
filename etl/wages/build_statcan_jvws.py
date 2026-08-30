"""
build_jvws — StatCan JVWS(Job Vacancy and Wage Survey)空缺岗位数,按 NOC(2021 五位)× 省 × 季度。
E14-01:全市场数据三角第一块 —— 给「担保率 = 担保侧÷全市场」当分母(实测参考:软件 1.7%/护士 1.1%/农工≈100%)。

源(WDS API 实查确认,2026-08-08;免费,加拿大开放政府许可):
  表 14-10-0444-01「Job vacancies and average offered hourly wage by occupation (unit group),
  quarterly, unadjusted for seasonality」
  官方页:https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410044401
  WDS getCubeMetadata 实查:CURRENT(非 archived),cubeStartDate 2015-01-01,cubeEndDate 2026-01-01,
  releaseTime 2026-06-16。维度:Geography(83 member,Canada/10 省/3 准州/69 经济区)×
  National Occupational Classification(824 member,含五位叶节点 516 个,与本站 etl/noc.py 同版本)×
  Statistics(Job vacancies / Average offered hourly wage)。

  quote-anchored 证据(WDS getCubeMetadata → footnote,2026-08-08 实查):
  · 空缺岗位定义(footnoteId 4):"A job is vacant if it meets the following conditions: it is vacant
    on the reference date (first day of the month) or will become vacant during the month; there are
    tasks to be carried out during the month for the job in question; and the employer is actively
    seeking a worker outside the organization to fill the job."
  · NOC 版本对齐(footnoteId 9):"The occupational data are presented in this table according to the
    National Occupational Classification (NOC) 2021 version 1.0." —— 与本项目 NOC 2021 五位码同版本,
    **无需映射**。
  · 经济区口径(footnoteId 2):JVWS 对 76 个抽样经济区中的 7 个做了合并,只发布 69 个 —— 地理粒度比省更
    细一档;本轮**只取省级**,经济区留 E14 城市级职业榜再接(见下「地理粒度」)。

地理粒度结论:本表最细到经济区(69 个,约等于都会区/大区级,非精确城市),**没有城市/CMA 级**。
  省级覆盖完整;经济区级样本更小、抑制(F/x)比例更高,城市级职业榜若要用,需再评估经济区→本站城市映射
  与抑制率是否可用(不在本轮范围)。

体量:全表 CSV 解压后 1.18GB(44 季度全历史,136,784 个 series × ~43 期 = 588 万数据点)——**不整表落库**。
  流式扫一遍,只保留「省级地理(Canada+10 省+3 准州)× 五位 NOC 叶节点 × Job vacancies 统计量」的行
  (44 季度里约 31 万行),再截取最近 KEEP_QUARTERS 个季度写维护表。STATUS 质量码原样保留(A-F 数据质量
  等级;'..'=当期未采集;'x'=保密抑制;'F'=太不可靠不发布)——**VALUE 缺失时 vacancies 写 null,不折成 0**
  (与 pnp_ops_stats 同一条红线:官方抑制值不能替官方编数字)。

Usage:  python -X utf8 etl/build_jvws.py
        JVWS_QUARTERS=8 python -X utf8 etl/build_jvws.py   # 默认最近 4 个季度
"""
from __future__ import annotations

import csv
import io
import json
import os
import subprocess
import sys
import zipfile
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # 分域后上一级才是 etl/
import _paths  # noqa: E402

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")

# ── 输入/输出全路径(先声明再用)──────────────────────────────────────
PRODUCT_ID = 14100444                                    # 表 14-10-0444-01(WDS 8 位 productId,不含末位校验位)
TABLE_NO = "14-10-0444-01"
CUBE_URL = f"https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410044401"
WDS_META = f"https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata"
WDS_CSV_LINK = f"https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/{PRODUCT_ID}/en"
IN_ZIP = _paths.JVWS / f"{PRODUCT_ID}-eng.zip"            # 全表源缓存(gitignore,~97MB,可重下)
OUT_TABLE = _paths.JVWS / "jvws-vacancies.json"           # 维护表(跟踪;近 N 季度过滤后 ~2-3MB)

KEEP_QUARTERS = int(os.environ.get("JVWS_QUARTERS", "4"))
_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) pnp-job-tracker-etl/1.0"}

DEFINITION_QUOTE = (
    "A job is vacant if it meets the following conditions: it is vacant on the reference date "
    "(first day of the month) or will become vacant during the month; there are tasks to be "
    "carried out during the month for the job in question; and the employer is actively seeking "
    "a worker outside the organization to fill the job."
)
NOC_VERSION_QUOTE = (
    "The occupational data are presented in this table according to the National Occupational "
    "Classification (NOC) 2021 version 1.0."
)

PROV_CODE = {
    "Canada": "NAT", "Newfoundland and Labrador": "NL", "Prince Edward Island": "PE",
    "Nova Scotia": "NS", "New Brunswick": "NB", "Quebec": "QC", "Ontario": "ON",
    "Manitoba": "MB", "Saskatchewan": "SK", "Alberta": "AB", "British Columbia": "BC",
    "Yukon": "YT", "Northwest Territories": "NT", "Nunavut": "NU",
}


def _curl_get(url: str, out_path=None, timeout=300) -> str | None:
    """statcan.gc.ca 用 httpx 直连**实测 100% ConnectError/握手超时**(WinError 10054,重试 5 次仍失败;
    curl 走 schannel + 强制 http/1.1 能稳定连上,同一台机同一网络)——本脚本对该域名统一走 curl 子进程,
    其余抓取脚本仍按 httpx 优先的项目惯例不受影响。"""
    args = ["curl", "-sL", "--max-time", str(timeout), "-A", _HEADERS["User-Agent"]]
    if out_path:
        args += ["-o", str(out_path)]
    args.append(url)
    result = subprocess.run(args, capture_output=(out_path is None), text=(out_path is None))
    if result.returncode != 0:
        raise RuntimeError(f"curl 失败(exit={result.returncode}): {url}")
    return result.stdout if out_path is None else None


def fetch_metadata() -> dict:
    """WDS getCubeMetadata 实查 —— 每次跑都验一遍表还在(CURRENT)、拿最新 releaseTime,不缓存(便宜)。"""
    args = ["curl", "-sL", "--max-time", "60", "-A", _HEADERS["User-Agent"],
            "-X", "POST", WDS_META, "-H", "Content-Type: application/json",
            "--data-raw", json.dumps([{"productId": PRODUCT_ID}])]
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"WDS getCubeMetadata 失败(exit={result.returncode}): {result.stderr}")
    obj = json.loads(result.stdout)[0]["object"]
    assert obj["archiveStatusEn"].startswith("CURRENT"), (
        f"表 {TABLE_NO} 不再是 CURRENT(archiveStatusEn={obj['archiveStatusEn']!r})—— "
        f"StatCan 可能已换表号,禁止继续凭旧号跑,先手动核实新表。")
    return obj


def download_zip() -> None:
    if IN_ZIP.exists():
        print(f"用已缓存的 {IN_ZIP}(删除后重跑可强制刷新)")
        return
    IN_ZIP.parent.mkdir(parents=True, exist_ok=True)
    csv_url = json.loads(_curl_get(WDS_CSV_LINK))["object"]
    print(f"下载 {csv_url}")
    _curl_get(csv_url, out_path=IN_ZIP, timeout=300)
    print(f"  → {IN_ZIP}({IN_ZIP.stat().st_size / 1e6:.1f} MB)")


def extract_rows(meta: dict) -> tuple[list[dict], list[str]]:
    """流式扫全表 CSV,过滤到省级地理 × 五位 NOC 叶节点 × Job vacancies,截取最近 KEEP_QUARTERS 季度。"""
    geo_dim = next(d for d in meta["dimension"] if d["dimensionPositionId"] == 1)
    noc_dim = next(d for d in meta["dimension"] if d["dimensionPositionId"] == 2)
    stat_dim = next(d for d in meta["dimension"] if d["dimensionPositionId"] == 3)
    vacancies_stat_id = str(next(m["memberId"] for m in stat_dim["member"] if m["memberNameEn"] == "Job vacancies"))

    geo_id_to_prov = {str(m["memberId"]): PROV_CODE[m["memberNameEn"]]
                       for m in geo_dim["member"] if m.get("geoLevel") in (0, 2)}
    noc_id_to_code = {str(m["memberId"]): m["classificationCode"]
                       for m in noc_dim["member"] if m.get("classificationCode") and len(m["classificationCode"]) == 5}
    print(f"过滤维度:地理 {len(geo_id_to_prov)} 个(Canada+10省+3准州) × NOC 五位叶节点 {len(noc_id_to_code)} 个")

    z = zipfile.ZipFile(IN_ZIP)
    csv_name = f"{PRODUCT_ID}.csv"
    dates_order: list[str] = []
    buf: list[tuple] = []  # (ref_date, prov, noc, value, status)
    with z.open(csv_name) as f:
        tf = io.TextIOWrapper(f, encoding="utf-8-sig", newline="")
        reader = csv.reader(tf)
        header = next(reader)
        idx = {name: i for i, name in enumerate(header)}
        for row in reader:
            ref_date = row[idx["REF_DATE"]]
            if not dates_order or dates_order[-1] != ref_date:
                dates_order.append(ref_date)
            geo_id, noc_id, stat_id = row[idx["COORDINATE"]].split(".")
            if stat_id != vacancies_stat_id:
                continue
            prov = geo_id_to_prov.get(geo_id)
            noc = noc_id_to_code.get(noc_id)
            if prov is None or noc is None:
                continue
            buf.append((ref_date, prov, noc, row[idx["VALUE"]], row[idx["STATUS"]]))
    z.close()

    keep_dates = set(dates_order[-KEEP_QUARTERS:])
    quarters_map = {d: _to_quarter(d) for d in keep_dates}
    rows = []
    for ref_date, prov, noc, value, status in buf:
        if ref_date not in keep_dates:
            continue
        vacancies = int(value) if value.strip() else None
        rows.append({
            "quarter": quarters_map[ref_date],
            "refDate": ref_date,
            "province": prov,
            "noc": noc,
            "vacancies": vacancies,
            "quality": status or None,   # A-F 数据质量等级;'..'/x/F 且 value 空 → vacancies=None
        })
    return rows, sorted(quarters_map.values())


def _to_quarter(ref_date: str) -> str:
    y, m = ref_date.split("-")
    q = {"01": "Q1", "04": "Q2", "07": "Q3", "10": "Q4"}[m]
    return f"{y}{q}"


def main() -> None:
    print(f"IN:  {IN_ZIP}")
    print(f"OUT: {OUT_TABLE}")
    meta = fetch_metadata()
    print(f"表 {TABLE_NO}:{meta['cubeTitleEn']}")
    print(f"  archiveStatus={meta['archiveStatusEn'][:7]}  releaseTime={meta['releaseTime']}  "
          f"范围={meta['cubeStartDate'][:7]}..{meta['cubeEndDate'][:7]}")
    download_zip()
    rows, quarters = extract_rows(meta)
    published = sum(1 for r in rows if r["vacancies"] is not None)
    OUT_TABLE.parent.mkdir(parents=True, exist_ok=True)
    OUT_TABLE.write_text(json.dumps({
        "source": {
            "table": TABLE_NO,
            "productId": PRODUCT_ID,
            "cubeTitleEn": meta["cubeTitleEn"],
            "url": CUBE_URL,
            "releaseTime": meta["releaseTime"],
            "definitionQuote": DEFINITION_QUOTE,
            "nocVersionQuote": NOC_VERSION_QUOTE,
            "fetched": date.today().isoformat(),
        },
        "quarters": quarters,
        "rows": rows,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    size_mb = OUT_TABLE.stat().st_size / 1e6
    print(f"建表完成:{len(rows)} 行({quarters[0]}..{quarters[-1]},{published} 行有值/"
          f"{len(rows) - published} 行抑制或未采集)→ {OUT_TABLE.name}({size_mb:.1f} MB)")
    # 探针:全国口径几个代表性 NOC 最新季度空缺数
    latest = quarters[-1]
    probes = {"21231": "软件工程师/设计师", "21232": "软件开发/程序员", "31301": "注册护士",
              "85100": "普通农场工人", "63200": "厨师"}
    print(f"探针(NAT,{latest}):")
    for noc, label in probes.items():
        hit = next((r for r in rows if r["quarter"] == latest and r["province"] == "NAT" and r["noc"] == noc), None)
        print(f"  {noc} {label}: {hit['vacancies'] if hit else '—'}(quality={hit['quality'] if hit else None})")


if __name__ == "__main__":
    main()

"""
qs 域函数 —— 全部行为住这(五件套,照样张 etl/dli/functions.py;2026-09-12 开域)。

金源 = topuniversities「QS World University Rankings」页同源的排名端点 JSON
(countries=ca 只取加拿大,~30 所一页收完)。端点的 nid(榜单节点号)每年换 ——
每轮先抓着陆页现探 nid,不写死;探不到整轮失败,别拿旧端点瞎猜。
方言律照 dli:零字符串、显式循环、一参令、日志只走 log.functions.say。
依赖单边:本文件 → constants/scheme + 基础设施叶子(paths/log/fetch.constants)。
"""
import re
import subprocess
from datetime import date

import paths
from log.functions import say
from qs.constants import (
    BAD_RANK_TPL, BROWSER_UA, CURL_CMD, CURL_FAIL_TPL, CURL_FLAG_MAX_TIME, CURL_FLAG_UA, DLI_NAME,
    ENDPOINT_TPL, FETCH_TIMEOUT_S, IN_TPL, ITEMS_PER_PAGE, LANDING,
    MIN_ROWS, NID_RE, NID_TPL, NO_NID_TPL, OUT_FILE, OUT_INDENT, OUT_TPL, TOO_FEW_TPL, WROTE_TPL,
)
from qs.scheme import QsFile, QsFold, QsRow, QsSource, QsSourceRow


# =========================================================================
# 1. QS 加拿大榜(qs_rank 列的料;本域唯一步)
# =========================================================================


def qs_sort_key(row: QsRow) -> int:
    """落盘排序键:名次升序。"""
    return row.rank


def nid_of(html: str) -> str:
    """着陆页 HTML → 当年榜单 nid;探不到抛(整轮失败,不猜旧端点)。"""
    m = re.search(NID_RE, html)
    if m is None:
        raise RuntimeError(NO_NID_TPL)
    return m.group(1)


def curl_get(url: str) -> str:
    """curl 子进程 GET(topuniversities 掐 httpx 的 TLS 指纹,照 wages statcan 先例)。"""
    args = list(CURL_CMD) + [CURL_FLAG_MAX_TIME, str(FETCH_TIMEOUT_S), CURL_FLAG_UA, BROWSER_UA, url]
    result = subprocess.run(args, capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        raise RuntimeError(CURL_FAIL_TPL.format(code=result.returncode, url=url))
    return result.stdout


def fold_qs_rows(rows: list[QsSourceRow]) -> QsFold:
    """源行 → 产出行:rank 折整数(折不动跳过留痕),DLI 校名走人工核定映射(表外原名直传)。"""
    out: list[QsRow] = []
    skipped: list[str] = []
    for row in rows:
        raw = row.rank.strip()
        if raw.isdigit() is False:
            skipped.append(row.title)
            continue
        name = row.title.strip()
        out.append(QsRow(name=name,
                         dli_name=DLI_NAME.get(name, name),
                         rank=int(raw),
                         rank_display=row.rank_display.strip()))
    return QsFold(rows=out, skipped=skipped)


def build_qs_ca() -> None:
    """QS 世界大学排名·加拿大子集 → data/raw/qs/qs.json。

    两跳:① 着陆页探 nid;② 端点拿 score_nodes。行数低于防线整轮失败
    (宁可不更新,别灌半截 —— 照 dli 同款防线)。
    """
    say(IN_TPL.format(url=LANDING))
    say(OUT_TPL.format(path=OUT_FILE))
    nid = nid_of(curl_get(LANDING))
    say(NID_TPL.format(nid=nid))
    source = QsSource.model_validate_json(curl_get(ENDPOINT_TPL.format(nid=nid, n=ITEMS_PER_PAGE)))
    fold = fold_qs_rows(source.score_nodes)
    if len(fold.skipped) > 0:
        say(BAD_RANK_TPL.format(names=fold.skipped))
    rows = sorted(fold.rows, key=qs_sort_key)
    if len(rows) < MIN_ROWS:
        raise RuntimeError(TOO_FEW_TPL.format(n=len(rows)))
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    out = QsFile(url=LANDING, fetched=date.today().isoformat(), rows=rows)
    paths.write_json(paths.WriteJsonIn(path=OUT_FILE, payload=out.model_dump(by_alias=True),
                                       indent=OUT_INDENT))
    say(WROTE_TPL.format(n=len(rows), fetched=out.fetched))

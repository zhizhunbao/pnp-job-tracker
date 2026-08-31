"""report_ruff — etl 写法债报告(对齐 cms lint:report,2026-08-30 Frank 拍板转正)。

  OUT: reports/ruff-<本地时间戳>.md(根下统一 reports/,.gitignore 不进库,报告是耗材)

四段:① 闸视角(带 pyproject 豁免,守门态)② 裸账统计(--isolated 去掉全部豁免)
③ 已溶区余账(应只剩挂账的复杂度拆分债,多一条 = 新债漏网)④ 存量区 top 30 文件
(= 下一批溶解地图)。每批溶解收口跑一次,数字只许降。

Usage:  uv run python etl/ops/main.py --only report_ruff
"""
import subprocess
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from log.functions import say

ROOT = Path(__file__).resolve().parents[2]
"""仓库根(相对本文件定位,不写死绝对路径)。"""

OUT_DIR = ROOT / "reports"
"""报告统一屋(cms lint-report 同惯例,已进 .gitignore)。"""

BARE_RULES = "E4,E7,E9,F,ANN,D1,N,C901,PLR0913,PLR0915,BLE,S110,S112"
"""裸账规则集 = pyproject select 全集(--isolated 跑,连 E402 豁免也不认)。"""

DISSOLVED = ("etl/company/", "etl/crawl/", "etl/dli/", "etl/employers/", "etl/fetch/",
             "etl/lmia/", "etl/load/", "etl/log/", "etl/paths/", "etl/pnp/", "etl/wages/",
             "etl/news/", "etl/ee/", "etl/ircc/", "etl/noc/", "etl/fsa/", "etl/pilot/")
"""已溶区清单(五件形制已落地的文件面;新域溶完在此登记)。
2026-08-31 批C 登记五域:ee/ircc(子工A)、noc(并 noc.py/noc_buckets.py 两库,
「noc 就叫 noc」)、fsa、pilot(extractors 私件群随域,存量待批E 拆三域时就范)。"""

TOP_N = 30
"""存量区榜单长度。"""


def sh(cmd: list[str]) -> str:
    """跑一条命令,合并 stdout/stderr 返回(报告是快照,错误文本也照收)。"""
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return (r.stdout or "") + (r.stderr or "")


def bare(extra: list[str]) -> str:
    """裸账视角跑 ruff(--isolated 去掉 pyproject 全部豁免)。"""
    base = ["uv", "run", "--with", "ruff", "ruff", "check", "etl", "--isolated",
            "--select", BARE_RULES, "--line-length", "120", "--target-version", "py311"]
    return sh(base + extra)


def run() -> int:
    """生成四段报告落 reports/,路径打给调用者(一域一门:由 ops/main.py --only 点名)。"""
    OUT_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d-%H%M")
    out_file = OUT_DIR / f"ruff-{stamp}.md"

    gate = sh(["uv", "run", "--with", "ruff", "ruff", "check", "etl"]).strip()
    stats = bare(["--statistics"]).strip()
    full = bare(["--output-format", "concise"])

    per_file: dict[str, int] = {}
    diss_lines: list[str] = []
    for line in full.splitlines():
        if not line.startswith("etl"):
            continue
        norm = line.replace("\\", "/")
        f = norm.split(":")[0]
        per_file[f] = per_file.get(f, 0) + 1
        for d in DISSOLVED:
            if norm.startswith(d):
                diss_lines.append(norm)
                break

    def count_of(kv: tuple[str, int]) -> int:
        """榜单排序键:违规条数。"""
        return kv[1]

    top = sorted(per_file.items(), key=count_of, reverse=True)

    md = [f"# etl ruff 报告 — {stamp}", "",
          "两个视角:闸视角守门(带 pyproject 豁免),裸账视角(--isolated 去掉全部豁免)看存量债。",
          "豁免清单 = pyproject.toml per-file-ignores,一文件一行只紧不松;形制闸另有自研十规(check_etl_shape)。",
          "", "## ① 闸视角", "```", gate, "```",
          "", "## ② 裸账统计(全 etl)", "```", stats, "```",
          "", f"## ③ 已溶区余账({len(diss_lines)} 条,应只剩挂账的复杂度拆分债)", "```"]
    md.extend(diss_lines)
    md.extend(["```", "", f"## ④ 存量区 top {TOP_N} 文件(下一步溶解地图)", "",
               "| 条数 | 文件 |", "|---:|---|"])
    for f, n in top[:TOP_N]:
        md.append(f"| {n} | {f} |")
    md.append("")
    out_file.write_text("\n".join(md), encoding="utf-8")
    say(str(out_file))
    return 0

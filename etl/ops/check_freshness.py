"""数据新鲜度哨兵(B3-1,2026-08-03)——「役挂着但数据没刷新」的机器检查。

病根:healthchecks 的 ping 只证明脚本跑完,不证明数据是新的(实撞:pnp 役每小时绿着,
MB/NB 的表停在 8 天前;ON 抽选断档三个月没人发现)。本脚本按 etl/source_manifest.json
的契约逐文件核 fetched(或 checkedAt/mtime)与 cadence_days,超期打 ✗ 并以非零码退出。

钉在 pnp 役 steps **末尾**:红了只让本轮记「未完整完成」→ 该役不 ping healthchecks → 转红报警,
不挡前面的真实步骤。glob 默认让新抓取产物自动进哨兵(铁律 2「抓完必须入役」的机器面)。

IN  : etl/source_manifest.json + data/raw/**(只读)
OUT : 无(纯检查;stdout 表格 + 退出码)
Usage:  uv run python etl/check_freshness.py
"""
import glob
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # 分域后上一级才是 etl/
import paths

IN_MANIFEST = Path(__file__).resolve().parent.parent / "source_manifest.json"  # 分域后清单仍在 etl/ 根


def stamp_of(path: Path, key: str) -> str:
    """取该文件的「数据是哪天的」:fetched/checkedAt 顶层键,或 mtime 兜底。取不到返回空。"""
    if key == "mtime":
        return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).date().isoformat()
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001  # 坏 JSON 本身就是要报的病
        return ""
    v = d.get(key) if isinstance(d, dict) else None
    return str(v)[:10] if v else ""


def main() -> None:
    print(f"IN manifest : {IN_MANIFEST}")
    m = json.loads(IN_MANIFEST.read_text(encoding="utf-8"))
    over = {o["file"]: o for o in m.get("overrides", [])}
    rows: dict[str, dict] = {}  # rel path → {cadence_days, key, note}
    for d in m.get("defaults", []):
        for f in glob.glob(str(paths.DATA / d["glob"])):
            rel = Path(f).relative_to(paths.DATA).as_posix()
            rows[rel] = {"cadence_days": d["cadence_days"], "key": "fetched", "note": ""}
    for rel, o in over.items():
        rows[rel] = {"cadence_days": o["cadence_days"], "key": o.get("key", "fetched"), "note": o.get("note", "")}

    today = datetime.now(timezone.utc).date()
    stale: list[str] = []
    for rel in sorted(rows):
        r = rows[rel]
        path = paths.DATA / rel
        if not path.exists():
            stale.append(f"✗ {rel}: 文件不存在(契约里在,盘上没有)")
            continue
        stamp = stamp_of(path, r["key"])
        if not stamp:
            stale.append(f"✗ {rel}: 取不到 {r['key']}(无戳的数据不能拿来下结论,见 B3-3)")
            continue
        try:
            age = (today - datetime.strptime(stamp, "%Y-%m-%d").date()).days
        except ValueError:
            stale.append(f"✗ {rel}: {r['key']}={stamp!r} 不是日期")
            continue
        mark = "✗" if age > r["cadence_days"] else "·"
        line = f"{mark} {rel}: {stamp}({age} 天前,限 {r['cadence_days']} 天)" + (f" —— {r['note']}" if mark == "✗" and r["note"] else "")
        if mark == "✗":
            stale.append(line)
        else:
            print(line)

    if stale:
        print(f"\n✗ {len(stale)}/{len(rows)} 个源超期或无戳:")
        for s in stale:
            print(s)
        raise SystemExit(1)
    print(f"\n✓ {len(rows)} 个源全部在保鲜期内")


if __name__ == "__main__":
    main()

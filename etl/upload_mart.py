"""upload_mart — 把 data/mart/*.json 逐表 gzip POST 到 cms 上传端点(E7-04 交接层)。

Render 上 cms 与 ETL 不共享磁盘 → build 每轮 09 之后跑本步,cms 落 /tmp/mart,
随后同轮触发的 seed 优先读那里(Supabase Storage 已退役)。
SEED_URL 未设 → 直接跳过(本地 dev / compose 同机模式,seed 直接读本地 data/mart)。
任一表上传失败 → 退出码 1(auto_update 记步骤失败、本轮不触发 seed,防 /tmp 半新半旧)。

Usage:  uv run python etl/upload_mart.py
"""
import gzip
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

SEED_URL = os.environ.get("SEED_URL", "")          # 例 https://offer2pr.com/seed → 端点走同源
SEED_TOKEN = os.environ.get("SEED_TOKEN", "")


def main() -> None:
    if not SEED_URL:
        print("SEED_URL 未配置,跳过上传(本地/同机模式,seed 读本地 mart)")
        return
    u = urlsplit(SEED_URL)
    base = f"{u.scheme}://{u.netloc}"
    files = sorted(_paths.MART.glob("*.json"))
    if not files:
        print("data/mart/ 为空,无可上传"); sys.exit(1)
    headers = {"x-seed-token": SEED_TOKEN, "Content-Type": "application/gzip"}
    with httpx.Client(timeout=120) as client:
        for f in files:
            body = f.read_bytes()
            json.loads(body)  # 上传前校验合法 JSON(防半写文件污染 /tmp)
            gz = gzip.compress(body)
            r = client.post(f"{base}/api/mart/{f.stem}", content=gz, headers=headers)
            try:
                ok = r.status_code == 200 and r.json().get("ok") is True  # 502 返回 HTML,json() 炸也归失败
            except Exception:
                ok = False
            if not ok:
                print(f"✗ {f.name}: {r.status_code} {r.text[:200]}"); sys.exit(1)
            print(f"✓ {f.name}  ({len(body) // 1024} KB → gz {len(gz) // 1024} KB)")
    print(f"上传完成:{len(files)} 张表 → {base}/api/mart/")


if __name__ == "__main__":
    main()

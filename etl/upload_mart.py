"""upload_mart — 把 data/mart/*.json 上传 Supabase Storage 私有 bucket `mart`(R3 架构的交接层)。

Render 上 cms 与 ETL worker 不共享磁盘 → build 每轮 09 之后跑本步,seed(双模式)从 Storage 拉。
SUPABASE_URL / SUPABASE_SERVICE_KEY 未设 → 直接跳过(本地 dev / VPS compose 模式,seed 读本地文件)。
任一文件上传失败 → 退出码 1(auto_update 记步骤失败、本轮不触发 seed,避免 Storage 半新半旧)。

Usage:  uv run python etl/upload_mart.py
"""
import json
import os
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

SB_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SB_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
BUCKET = "mart"


def main() -> None:
    if not (SB_URL and SB_KEY):
        print("SUPABASE_* 未配置,跳过上传(本地/VPS 模式,seed 读本地 mart)")
        return
    files = sorted(_paths.MART.glob("*.json"))
    if not files:
        print("data/mart/ 为空,无可上传"); sys.exit(1)
    headers = {"Authorization": f"Bearer {SB_KEY}", "x-upsert": "true",
               "Content-Type": "application/json"}
    with httpx.Client(timeout=120) as client:
        for f in files:
            body = f.read_bytes()
            json.loads(body)  # 上传前校验合法 JSON(防半写文件污染 Storage)
            r = client.post(f"{SB_URL}/storage/v1/object/{BUCKET}/{f.name}",
                            content=body, headers=headers)
            if r.status_code not in (200, 201):
                print(f"✗ {f.name}: {r.status_code} {r.text[:200]}"); sys.exit(1)
            print(f"✓ {f.name}  ({len(body) // 1024} KB)")
    print(f"上传完成:{len(files)} 张表 → {BUCKET}/")


if __name__ == "__main__":
    main()

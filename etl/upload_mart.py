"""过渡壳(2026-08-30 load 域收编,正身 etl/load/functions.py 的 upload_mart)。

容器里 build 役旧进程的 BUILD_STEPS 仍指本路径,重启前必须可执行;役册已改指
etl/load/main.py --only upload,收尾统一重启后删本壳。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _log import err, say
from load.functions import upload_mart
from load.scheme import UploadIn

if __name__ == "__main__":
    try:
        upload_mart(UploadIn(say=say))
    except Exception as e:  # noqa: BLE001
        err("upload_mart", e)
        sys.exit(1)

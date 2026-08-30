"""load.functions — 灌库层行为(seed/alerts 触发 / mart 分片上传 / pg_dump 备份)。

2026-08-30 立域收编三件:auto_update 的 seed+alerts HTTP 段、etl/upload_mart.py、
etl/backup_db.py(原件转过渡壳,收尾统一重启后删)。将来经 Payload 直接操作库的
REST 客户端也住这段位 —— API 的形等第一个真实消费者(雇主池灌库)来定,不预设。

铁律不动:批量数据仍走 raw → mart → seed;本域只管「怎么送进去」,不拼装不清洗。
本文件零日志依赖(不 import _log):auto_update 常驻进程会进程内直调 trigger_*,
_log 模块 import 即重配 loguru sink,会劫持调度器的时间戳前缀 —— 故触发类纯返回
CallOut,步骤类经 say 回调注入,日志面归调用方。
"""
from __future__ import annotations

import gzip
import json
import math
import os
import subprocess
import sys
import time
from datetime import date
from pathlib import Path
from typing import cast

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths
from load.constants import (ALERTS_PATH, ALERTS_TIMEOUT_S, API_SEED_SUFFIX, BACKUPS_DIR,
                            BACKUP_DONE_TPL, BACKUP_FAIL_TPL, BACKUP_OUT_TPL, BACKUP_PRUNE_TPL,
                            BACKUP_SKIP_MSG, CT_GZIP, DAY_S, DEFAULT_SEED_URL, DUMP_CMD,
                            ENV_BACKUP_URI, ENV_DB_URI, ENV_KEEP_DAYS, ENV_SEED_TOKEN, ERR_BODY_TPL,
                            ENV_SEED_URL, HDR_CONTENT_TYPE, HDR_SEED_TOKEN, K_OK, K_PARTS,
                            ERRORS_REPLACE, KEEP_DAYS_DEFAULT, MART_GLOB, MART_PATH_TPL, MART_UPLOAD_TIMEOUT_S,
                            META_LABEL_TPL, META_NAME_TPL, OLD_SEED_SUFFIX, PART_LABEL_TPL,
                            PART_NAME_TPL, SEED_TIMEOUT_S, SHARD_BYTES, SQL_GZ_GLOB,
                            SCHEME_SEP, SQL_GZ_SUFFIX, UPLOAD_DONE_TPL, UPLOAD_EMPTY_MSG, UPLOAD_FAIL_TPL,
                            UPLOAD_OK_TPL, UPLOAD_SKIP_MSG)
from load.scheme import BackupIn, CallOut, HttpPostLike, HttpRespLike, PostTableIn, UploadIn


# =========================================================================
# 1. seed / alerts 触发(auto_update 进程内直调;纯返回,不打日志)
# =========================================================================


def seed_headers() -> dict:
    """鉴权头(token 未设 = 空头,本地 dev 语义)。"""
    token = os.environ.get(ENV_SEED_TOKEN, "")
    if token == "":
        return {}
    return {HDR_SEED_TOKEN: token}


def call_ok_of(r: HttpRespLike) -> bool:
    """端点成功判定:2xx 且响应体 ok:true(502 返回 HTML,json() 炸也归失败 ——
    老版把任何响应都记「✓ seed 502」,还带着失败状态去触发心跳,判定必须真实)。"""
    if not r.is_success:
        return False
    try:
        return r.json().get(K_OK) is True
    except Exception:  # noqa: BLE001 — HTML 响应体,失败语义由返回值承载
        return False


def trigger_seed() -> CallOut:
    """触发灌库(GET seed 端点,600s 放弃线);成败与响应交调用方打日志、判心跳。"""
    url = os.environ.get(ENV_SEED_URL, DEFAULT_SEED_URL)
    try:
        r = httpx.get(url, timeout=SEED_TIMEOUT_S, headers=seed_headers())
    except Exception as e:  # noqa: BLE001 — 网络错转数据,留痕由调用方保证
        return CallOut(ok=False, status=0, body=ERR_BODY_TPL.format(name=type(e).__name__, detail=e))
    return CallOut(ok=call_ok_of(cast(HttpRespLike, r)), status=r.status_code, body=r.text[:200])


def alerts_url_of(seed_url: str) -> str:
    """从 seed 端点反推 alerts 端点(2026-08-29 seed 正门迁 /api/seed,过渡期两种尾巴都认)。"""
    if seed_url.endswith(API_SEED_SUFFIX):
        return seed_url[: -len(API_SEED_SUFFIX)] + ALERTS_PATH
    return seed_url.rsplit(OLD_SEED_SUFFIX, 1)[0] + ALERTS_PATH


def trigger_alerts() -> CallOut:
    """触发邮件提醒(E5-03,seed 成功后调;失败不影响本轮,语义由调用方掌握)。"""
    url = alerts_url_of(os.environ.get(ENV_SEED_URL, DEFAULT_SEED_URL))
    try:
        r = httpx.get(url, timeout=ALERTS_TIMEOUT_S, headers=seed_headers())
    except Exception as e:  # noqa: BLE001 — 网络错转数据
        return CallOut(ok=False, status=0, body=ERR_BODY_TPL.format(name=type(e).__name__, detail=e))
    return CallOut(ok=r.is_success, status=r.status_code, body=r.text[:200])


# =========================================================================
# 2. mart 上传(E7-04 交接层:Render 上 cms 与 ETL 不共享磁盘)
# =========================================================================


def post_table(x: PostTableIn) -> None:
    """单表/单片 gzip POST;任一失败抛错(整步失败,防 /tmp 半新半旧)。"""
    gz = gzip.compress(x.body)
    r = x.client.post(MART_PATH_TPL.format(base=x.base, name=x.name), content=gz, headers=x.headers)
    if not call_ok_of(r):
        raise RuntimeError(UPLOAD_FAIL_TPL.format(label=x.label, status=r.status_code,
                                                  body=r.text[:200]))
    x.say(UPLOAD_OK_TPL.format(label=x.label, kb=len(x.body) // 1024, gz_kb=len(gz) // 1024))


def upload_mart(x: UploadIn) -> None:
    """data/mart/*.json 逐表 gzip POST 到 cms;超限表按行数分片(片集 + meta 提交语义)。
    SEED_URL 未设 = 跳过(本地/同机模式,seed 直接读本地 mart);mart 为空抛错。"""
    seed_url = os.environ.get(ENV_SEED_URL, "")
    if seed_url == "":
        x.say(UPLOAD_SKIP_MSG)
        return
    parts = httpx.URL(seed_url)
    base = parts.scheme + SCHEME_SEP + parts.netloc.decode()
    files = sorted(_paths.MART.glob(MART_GLOB))
    if len(files) == 0:
        raise RuntimeError(UPLOAD_EMPTY_MSG)
    headers = seed_headers()
    headers[HDR_CONTENT_TYPE] = CT_GZIP

    with httpx.Client(timeout=MART_UPLOAD_TIMEOUT_S) as raw_client:
        client = cast(HttpPostLike, raw_client)
        for f in files:
            body = f.read_bytes()
            rows = json.loads(body)
            if len(body) <= SHARD_BYTES or not isinstance(rows, list) or len(rows) < 2:
                post_table(PostTableIn(client=client, base=base, headers=headers,
                                        name=f.stem, body=body, label=f.name, say=x.say))
                continue
            nparts = math.ceil(len(body) / SHARD_BYTES)
            per = math.ceil(len(rows) / nparts)
            shards = []
            for i in range(0, len(rows), per):
                shards.append(rows[i:i + per])
            for k, shard in enumerate(shards):
                post_table(PostTableIn(
                    client=client, base=base, headers=headers,
                    name=PART_NAME_TPL.format(stem=f.stem, k=k),
                    body=json.dumps(shard, ensure_ascii=False).encode(),
                    label=PART_LABEL_TPL.format(name=f.name, k=k + 1, n=len(shards)), say=x.say))
            post_table(PostTableIn(
                client=client, base=base, headers=headers,
                name=META_NAME_TPL.format(stem=f.stem),
                body=json.dumps([{K_PARTS: len(shards)}]).encode(),
                label=META_LABEL_TPL.format(name=f.name, n=len(shards)), say=x.say))
    x.say(UPLOAD_DONE_TPL.format(n=len(files), base=base))


# =========================================================================
# 3. 库备份(E7-01:pg_dump → backups/,保留 N 天;家里构建机 = 运维盒)
# =========================================================================


def backup_db(x: BackupIn) -> None:
    """pg_dump 生产库 → backups/YYYY-MM-DD.sql.gz + 清理超龄旧份;连接串未设 = 跳过。
    恢复演练:gunzip -c backups/<日期>.sql.gz | docker exec -i pnp-postgres-1 psql -U pnp -d <临时库>。"""
    dburi = os.environ.get(ENV_BACKUP_URI) or os.environ.get(ENV_DB_URI, "")
    if dburi == "":
        x.say(BACKUP_SKIP_MSG)
        return
    keep_days = int(os.environ.get(ENV_KEEP_DAYS, KEEP_DAYS_DEFAULT))
    backups = _paths.ROOT / BACKUPS_DIR
    backups.mkdir(exist_ok=True)
    out = backups / (date.today().isoformat() + SQL_GZ_SUFFIX)
    x.say(BACKUP_OUT_TPL.format(out=out))
    proc = subprocess.run(list(DUMP_CMD) + [dburi], capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(BACKUP_FAIL_TPL.format(detail=proc.stderr.decode(errors=ERRORS_REPLACE)[:300]))
    out.write_bytes(gzip.compress(proc.stdout))
    x.say(BACKUP_DONE_TPL.format(name=out.name, kb=out.stat().st_size // 1024))
    cutoff = time.time() - keep_days * DAY_S
    removed = 0
    for f in backups.glob(SQL_GZ_GLOB):
        if f.stat().st_mtime < cutoff:
            f.unlink()
            removed += 1
    x.say(BACKUP_PRUNE_TPL.format(days=keep_days, n=removed))

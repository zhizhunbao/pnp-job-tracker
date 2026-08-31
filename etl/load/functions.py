"""load.functions — 灌库层行为(seed/alerts 触发 / mart 分片上传 / pg_dump 备份)。

2026-08-30 立域收编三件:auto_update 的 seed+alerts HTTP 段、etl/upload_mart.py、
etl/backup_db.py(原件转过渡壳,收尾统一重启后删)。将来经 Payload 直接操作库的
REST 客户端也住这段位 —— API 的形等第一个真实消费者(雇主池灌库)来定,不预设。

铁律不动:批量数据仍走 raw → mart → seed;本域只管「怎么送进去」,不拼装不清洗。
本文件零日志依赖(不 import log.functions):auto_update 常驻进程会进程内直调 trigger_*,
log.functions 模块 import 即重配 loguru sink,会劫持调度器的时间戳前缀 —— 故触发类纯返回
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
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path
from typing import cast

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import paths
from paths import JOBBANK_STORE_LOCK, jobbank_store_lock
from load.constants import (BUILD_CHAIN_CMDS, BUILD_CMD_SEP, BUILD_FAIL_TPL, BUILD_LOCK_DONE,
                            BUILD_LOCK_OK, BUILD_LOCK_WAIT_TPL, BUILD_STEP_TPL)
from load.scheme import BuildChainIn
from load.constants import (ALERTS_PATH, ALERTS_TIMEOUT_S, API_SEED_SUFFIX, ARG_QUIET, BACKUPS_DIR,
                            BACKUP_DONE_TPL, BACKUP_FAIL_TPL, BACKUP_OUT_TPL, BACKUP_PRUNE_TPL,
                            BACKUP_SKIP_MSG, COMMIT_ROW_TPL, CT_GZIP, DAY_S, DEFAULT_SEED_URL,
                            DEPLOY_BEHIND_TPL, DEPLOY_NO_LIVE_TPL, DEPLOY_NO_REMOTE_MSG,
                            DEPLOY_OK_TPL, DEPLOY_PENDING_HEAD_TPL, DEPLOY_PENDING_ROW_LEN,
                            DEPLOY_PENDING_ROW_TPL, DEPLOY_PENDING_SHOW_MAX, DEPLOY_SKIP_ONLY_TPL,
                            DEPLOY_TIMEOUT_S, DEPLOY_VERSION_URL, DUMP_CMD, ENC_UTF8,
                            ENV_BACKUP_URI, ENV_DB_URI, ENV_KEEP_DAYS, ENV_SEED_TOKEN, ERR_BODY_TPL,
                            ENV_SEED_URL, GIT_FETCH_CMD, GIT_LOG_CMD, GIT_RANGE_TPL,
                            HDR_CONTENT_TYPE, HDR_SEED_TOKEN, K_COMMIT, K_OK, K_PARTS,
                            ERRORS_REPLACE, KEEP_DAYS_DEFAULT, LS_REMOTE_CMD, MART_GLOB, MART_PATH_TPL, MART_UPLOAD_TIMEOUT_S,
                            META_LABEL_TPL, META_NAME_TPL, OLD_SEED_SUFFIX, PART_LABEL_TPL,
                            PART_NAME_TPL, SEED_TIMEOUT_S, SHA_SHOW_LEN, SHARD_BYTES, SKIP_MARKERS,
                            SQL_GZ_GLOB,
                            SCHEME_SEP, SQL_GZ_SUFFIX, TAB, UPLOAD_DONE_TPL, UPLOAD_EMPTY_MSG, UPLOAD_FAIL_TPL,
                            UPLOAD_OK_TPL, UPLOAD_SKIP_MSG)
from load.scheme import (BackupIn, CallOut, DeployIn, HttpPostLike, HttpRespLike, PostTableIn,
                         UnshippedIn, UploadIn)


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
    files = sorted(paths.MART.glob(MART_GLOB))
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
    backups = paths.ROOT / BACKUPS_DIR
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


# =========================================================================
# 4. 部署哨兵(「push 成功 ≠ 上线」的解药;2026-08-31 批D 从 ops 拆入)
# =========================================================================


def check_deploy(x: DeployIn) -> None:
    """线上跑的是哪个提交 —— 一次比对:远端 origin/main 的 SHA vs 线上 /api/version 报的 SHA。

    2026-07-21 事故:Render 工作区 500 构建分钟耗尽,且 Build Pipeline 设了 $0 spend limit
    (把 Render 本该自动补买的行为一并掐死),于是 #154-#159 六个提交全部 `Build blocked`,
    生产钉在旧构建**整整一天**。期间 Frank 反复报「列表没更新」「面包屑还是三个商务」,
    每一条都被当成独立的前端 bug 去查 —— 根因只有一个,症状六个。本步把它变成一句人话报警,
    不必再去猜是不是代码写错了。

    零依赖(标准库 urllib),不写库、不改任何状态,只读。
    一致 return(门收 exit 0)/ 不一致 sys.exit(1);--quiet 只在异常时输出(挂 cron 用)。
    """
    quiet = ARG_QUIET in sys.argv
    want = remote_head()
    live = live_commit()
    if want is None:
        x.say(DEPLOY_NO_REMOTE_MSG)
        return
    if live is None:
        x.say(DEPLOY_NO_LIVE_TPL.format(url=DEPLOY_VERSION_URL))
        sys.exit(1)
    if live.startswith(want[:SHA_SHOW_LEN]) or want.startswith(live[:SHA_SHOW_LEN]):
        if quiet is False:
            x.say(DEPLOY_OK_TPL.format(sha=live[:SHA_SHOW_LEN]))
        return
    pending = unshipped(UnshippedIn(live=live, want=want))
    if pending is not None and len(pending) == 0:
        if quiet is False:
            x.say(DEPLOY_SKIP_ONLY_TPL.format(live=live[:SHA_SHOW_LEN], want=want[:SHA_SHOW_LEN]))
        return
    x.say(DEPLOY_BEHIND_TPL.format(want=want[:SHA_SHOW_LEN], live=live[:SHA_SHOW_LEN]))
    if pending is not None and len(pending) > 0:
        x.say(DEPLOY_PENDING_HEAD_TPL.format(n=len(pending)))
        for p in pending[:DEPLOY_PENDING_SHOW_MAX]:
            x.say(DEPLOY_PENDING_ROW_TPL.format(row=p[:DEPLOY_PENDING_ROW_LEN]))
    sys.exit(1)


def remote_head() -> str | None:
    """取 origin/main 的 SHA;取不到 → None(调用方本轮跳过,拿不到基准不算故障)。"""
    try:
        out = subprocess.run(
            list(LS_REMOTE_CMD),
            capture_output=True, text=True, encoding=ENC_UTF8, errors=ERRORS_REPLACE,
            timeout=DEPLOY_TIMEOUT_S, check=True,
        ).stdout.strip()
    except (subprocess.SubprocessError, OSError, IndexError):
        return None
    if out == "":
        return None
    return out.split()[0]


def live_commit() -> str | None:
    """线上 /api/version 报的提交 SHA;无响应/体不合规 → None(调用方按站点异常处理)。"""
    try:
        with urllib.request.urlopen(DEPLOY_VERSION_URL, timeout=DEPLOY_TIMEOUT_S) as r:
            body = json.load(r)
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError, OSError):
        return None
    commit = body.get(K_COMMIT)
    if not commit:
        return None
    sha = commit.strip()
    if sha == "":
        return None
    return sha


def unshipped(x: UnshippedIn) -> list[str] | None:
    """线上..origin/main 之间**该部署却没部署**的提交(带 skip 标记的不算)。

    取不到本地对象(浅克隆/没 fetch)→ None,调用方退回旧的「只比 SHA」口径,宁可误报不漏报。
    ⚠️ 必须显式 utf-8:Windows 上 text=True 走 cp1252,提交消息是中文 → 读取线程里
    UnicodeDecodeError,而异常在 reader thread 里,外面只看到「拿不到」(2026-08-03 实撞)。
    """
    try:
        subprocess.run(list(GIT_FETCH_CMD), capture_output=True, timeout=DEPLOY_TIMEOUT_S)
        out = subprocess.run(
            list(GIT_LOG_CMD) + [GIT_RANGE_TPL.format(live=x.live, want=x.want)],
            capture_output=True, text=True, encoding=ENC_UTF8, errors=ERRORS_REPLACE,
            timeout=DEPLOY_TIMEOUT_S, check=True,
        ).stdout.strip()
    except (subprocess.SubprocessError, OSError):
        return None
    pending: list[str] = []
    if out == "":
        return pending
    for line in out.splitlines():
        if TAB not in line:
            continue
        sha, subject = line.split(TAB, 1)
        if skip_marked_of(subject) is False:
            pending.append(COMMIT_ROW_TPL.format(h=sha, m=subject))
    return pending


def skip_marked_of(subject: str) -> bool:
    """提交标题带不带 skip 标记(纯文档/纯数据提交本来就不该构建)。"""
    lowered = subject.lower()
    for marker in SKIP_MARKERS:
        if marker in lowered:
            return True
    return False


# =========================================================================
# 5. 跨源汇装链(build 役;2026-08-31 批F 自 sources/build/run_locked.py 收编)
# =========================================================================


def run_build_chain(x: BuildChainIn) -> None:
    """跑一轮完整 build:整链持 Job Bank 仓锁(汇装看到一份稳定的 postings.json),
    顺序执行 BUILD_CHAIN_CMDS(argv[0] 的 "python" 换成 sys.executable —— 裸名在 uv 环境
    解析到基础解释器,jobbank 域实撞;容器里两者同义),一步失败 sys.exit(rc) 中止本轮(SystemExit 穿透门,
    锁随进程退出由内核释放);链尾直调 upload_mart(原役册末步子进程自调的收编形)。"""
    x.say(BUILD_LOCK_WAIT_TPL.format(path=JOBBANK_STORE_LOCK))
    with jobbank_store_lock(JOBBANK_STORE_LOCK):
        x.say(BUILD_LOCK_OK)
        for cmd in BUILD_CHAIN_CMDS:
            x.say(BUILD_STEP_TPL.format(cmd=BUILD_CMD_SEP.join(cmd)))
            result = subprocess.run([sys.executable] + list(cmd[1:]), cwd=paths.ROOT)
            if result.returncode:
                x.say(BUILD_FAIL_TPL.format(rc=result.returncode))
                sys.exit(result.returncode)
        upload_mart(UploadIn(say=x.say))
    x.say(BUILD_LOCK_DONE)

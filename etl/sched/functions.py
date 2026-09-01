"""
sched 域函数 —— 调度行为全住这(照 company/jobbank 全溶样张,段横幅三行框 + N. 编号,
与 constants.py / scheme.py 同名同序镜像)。

2026-08-31 批K 溶解两件根上管理层脚本(Frank「我觉得也需要设计成域」):
auto_update.py(常驻守护循环)+ run_now.py(手动一轮)—— 两支本来就共用「按 META/METAS
发现单元」这一段,溶成域后共用一份发现逻辑,差别只剩「谁来跑、跑完做什么」。
沿革(逐字留档):
· 批F 收轨为**域 META 单轨**(Frank「sources build 最后就清掉了」——旧役册 sources/
  全退役:jobbank/ats 立域、build/backup 收编 load 域 METAS):读环境变量 SOURCE(=角色名)
  → 本容器要跑的单元 = 所有声明 role == SOURCE 的域役(etl/<域>/__init__.py 的 META 单役,
  或 METAS 多役 —— load 首例:build+backup 两役同域,入口同门不同 --only)。每个单元各有
  自己的 interval/seed/after,循环里独立计时,互不牵连;任一步报错只记日志、不退出容器;
  一单元失败不影响别的单元。SCRAPE_INTERVAL 随役册退役失效(META 即节奏真相)。
· `import sources` 已亡:役册目录连同它的发现分支在批F 一并清仓,本域只认域 META。
日志:loguru 统一格式「时间 | 级别 | 源 | 消息」;子进程 stdout 逐行截获套同一前缀。
sink 的**重配住门**(main.py:守护档带时间戳走 stderr,手动档纯 message 走 stdout),
本文件只调用不配置 —— 🔴 且**永不 import log.functions**:那个模块 import 即 remove+add
纯 message 档,会当场劫持调度器的时间戳前缀(log/paths/load 三处头注都为此立过判据)。
"""
import glob
import importlib.util
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import cast

import httpx
from loguru import logger

import paths
from load.functions import trigger_alerts, trigger_seed
from sched.constants import (
    ALERTS_FAIL_TPL, ALERTS_OK_TPL, ARG_ONLY, ATTR_META, ATTR_METAS, CMD_SEP, CMS_DIR,
    DEFAULT_INTERVAL_S, DEFAULT_ROLES, DEFAULT_SEED_URL, DEFAULT_SOURCE, DOM_MAIN_TPL,
    DOM_MOD_TPL, DONE_NAME_TPL, ENC_UTF8, ENV_FILE, ENV_IOENCODING, ENV_PING_TPL,
    ENV_SEED_TOKEN, ENV_SEED_URL, ENV_SOURCE, ENV_UNBUFFERED, ERRORS_REPLACE, ERR_PREFIXES,
    ETL_DIR, FAIL_RETRY_S, FRESH_DATE_FMT, FRESH_K_CADENCE, FRESH_K_FILE, FRESH_K_GLOB,
    FRESH_K_KEY, FRESH_K_NOTE, FRESH_KEY_DEFAULT, FRESH_KEY_MTIME, FRESH_P_ALL_OK_TPL,
    FRESH_P_BADDATE_TPL, FRESH_P_MISSING_TPL, FRESH_P_NOSTAMP_TPL, FRESH_P_STALE_NOTE_TPL,
    FRESH_P_STALE_TPL, FRESH_P_SUMMARY_TPL, FRESH_STAMP_LEN,
    INIT_GLOB, K_AFTER, K_FRESH, K_INTERVAL, K_NAME, K_ONLY, K_PING, K_ROLE,
    K_SEED, KV_SEP, LVL_ERROR, LVL_INFO, MANUAL_SEED_URL, META_FAIL_TPL, NAME_JOIN, NEWLINE,
    NOT_DOMAIN, NOW_END_TPL, NOW_FAIL_TPL, NOW_HEAD_TPL, NOW_OK_TPL, NO_UNIT_TPL,
    PING_FAIL_TPL, PING_OK_MSG, PING_TIMEOUT_S, POLL_S, ROUNDS_DIR, ROUND_DONE_TPL,
    ROUND_RETRY_TPL, ROUND_STAMP_TPL, ROUND_START_TPL, SEED_FAIL_TPL, SEED_OK_TPL,
    SOURCE_UNIT_TPL, STEP_FAIL_MSG, STEP_PY, STEP_RUN_TPL, TOKEN_LINE_PREFIX, UNDERSCORE,
    UNKNOWN_ROLE_TPL, U_LINE_TPL, U_MODE_CONSUMER_TPL, U_MODE_EVERY_TPL, U_SEED_SUFFIX_TPL,
    VAL_ONE,
)
from sched.scheme import FreshStampIn, LogLike, MetaHit, RunStepIn, ToUnitIn, Unit


# =========================================================================
# 1. 单元发现(域 META/METAS 扫描)
# =========================================================================


def current_role() -> str:
    """本进程的角色(SOURCE 环境变量;缺省 jobbank)。"""
    return os.environ.get(ENV_SOURCE, DEFAULT_SOURCE)


def seed_url() -> str:
    """灌库端点(只用于开场报行;真正读它的是 load.functions)。"""
    return os.environ.get(ENV_SEED_URL, DEFAULT_SEED_URL)


def domain_metas() -> list[MetaHit]:
    """扫 etl/<域>/__init__.py,收回全部役声明(METAS 多役 / META 单役)。

    域的 META 只做声明(role/method/interval/seed),入口固定 etl/<域>/main.py ——
    「跑哪些步」是域自己的事(main.py 里),调度器不再关心步骤清单。
    METAS(2026-08-31 批F,load 首例)= 一域多役:每条自带 name 与可选 only,
    入口同门不同 --only(build 默认链 / backup 单点)。
    某域 __init__ 坏了只丢该域、留一行痕,不拖垮容器,也不挂掉手动一轮。
    """
    hits: list[MetaHit] = []
    for ini in sorted(ETL_DIR.glob(INIT_GLOB)):
        dom = ini.parent.name
        if dom in NOT_DOMAIN or dom.startswith(UNDERSCORE):
            continue
        spec = importlib.util.spec_from_file_location(DOM_MOD_TPL.format(dom=dom), ini)
        # pyrefly: ignore[bad-argument-type] — spec_from_file_location 只在路径不存在时给 None;此处是仓内固定文件,拿不到就该当场炸
        mod = importlib.util.module_from_spec(spec)
        try:
            # pyrefly: ignore[missing-attribute] — 同上,spec 非 None 时 loader 恒在
            spec.loader.exec_module(mod)
        except Exception as e:  # noqa: BLE001 — 坏域只丢该域,失败语义由「跳过 + 留痕」承载
            logger.error(META_FAIL_TPL.format(dom=dom, name=type(e).__name__, detail=e))
            continue
        metas = getattr(mod, ATTR_METAS, None)
        if metas is None:
            single = getattr(mod, ATTR_META, None)
            metas = []
            if isinstance(single, dict):
                metas = [single]
        for meta in metas:
            if not isinstance(meta, dict):
                continue
            hits.append(MetaHit(dom=dom, meta=meta))
    return hits


def to_unit(x: ToUnitIn) -> Unit:
    """役声明 → 调度单元(契约键只在这一只行构造器里被拆;计时两格出厂为 0)。"""
    step = [STEP_PY, DOM_MAIN_TPL.format(dom=x.dom)]
    only = x.meta.get(K_ONLY)
    if only is not None and only != "":
        step = step + [ARG_ONLY, only]
    return Unit(
        name=x.meta.get(K_NAME, x.dom),
        steps=[step],
        interval_s=int(x.meta.get(K_INTERVAL, DEFAULT_INTERVAL_S)),
        seed=x.meta.get(K_SEED, False),
        after=x.meta.get(K_AFTER),
        ping=bool(x.meta.get(K_PING, False)),
        next_at=0.0,
        consumed_at=0.0,
    )


def load_units() -> list[Unit]:
    """本角色的全部单元:声明 role == SOURCE 的域役(守护循环的清单)。"""
    role = current_role()
    units: list[Unit] = []
    for hit in domain_metas():
        if hit.meta.get(K_ROLE) != role:
            continue
        units.append(to_unit(ToUnitIn(dom=hit.dom, meta=hit.meta)))
    return units


def units_of_name(name: str) -> list[Unit]:
    """手动一轮的点名解析:收角色 == 名字的域役;也可直接给域名(如 dli)。"""
    units: list[Unit] = []
    for hit in domain_metas():
        if hit.meta.get(K_ROLE) == name or hit.dom == name:
            units.append(to_unit(ToUnitIn(dom=hit.dom, meta=hit.meta)))
    return units


# =========================================================================
# 2. 守护循环(常驻调度)
# =========================================================================


def watch() -> None:
    """常驻守护:开场报清单,而后每 POLL_S 秒查一遍谁到点,到点的跑一轮。

    容器一起来先跑一轮(next_at 出厂 0);一轮失败只短重试,不退出容器。"""
    role = current_role()
    units = load_units()
    if len(units) == 0:
        logger.error(NO_UNIT_TPL.format(role=role))
        raise SystemExit(1)
    for unit in units:
        announce(unit)
    while True:
        for unit in units:
            if is_due(unit) is False:
                continue
            logger.info(ROUND_START_TPL.format(name=unit.name))
            ok = run_once(unit)
            mark_done(unit.name)
            wait = unit.interval_s
            if ok is False:
                wait = min(FAIL_RETRY_S, unit.interval_s)
            unit.next_at = time.time() + wait
            if ok is False:
                logger.info(ROUND_RETRY_TPL.format(name=unit.name, wait=wait))
            else:
                logger.info(ROUND_DONE_TPL.format(name=unit.name))
        time.sleep(POLL_S)


def announce(x: Unit) -> None:
    """开场清单一行:本单元的节奏(消费者 / 定时)与灌库去向。"""
    if x.after is not None and len(x.after) > 0:
        mode = U_MODE_CONSUMER_TPL.format(after=x.after, interval=x.interval_s)
    else:
        mode = U_MODE_EVERY_TPL.format(interval=x.interval_s)
    line = U_LINE_TPL.format(name=x.name, mode=mode)
    if x.seed:
        line = line + U_SEED_SUFFIX_TPL.format(url=seed_url())
    logger.info(line)


def is_due(x: Unit) -> bool:
    """本单元这一刻该不该跑;消费者到点时顺手记下已消费的上游 mtime。"""
    now = time.time()
    if x.after is not None and len(x.after) > 0:
        up = newest_upstream(x.after)
        due = up > x.consumed_at or now >= x.next_at
        if due:
            x.consumed_at = up
        return due
    return now >= x.next_at


def newest_upstream(after: list[str]) -> float:
    """上游各单元标记里最新的 mtime(都没有则 0)。"""
    t = 0.0
    for up in after:
        f = ROUNDS_DIR / DONE_NAME_TPL.format(name=up)
        if f.exists():
            t = max(t, f.stat().st_mtime)
    return t


def mark_done(name: str) -> None:
    """单元跑完一轮 → 更新自己的标记(下游靠它的 mtime 判断「有新轮次」,如 build after=jobbank)。"""
    ROUNDS_DIR.mkdir(parents=True, exist_ok=True)
    (ROUNDS_DIR / DONE_NAME_TPL.format(name=name)).write_text(
        ROUND_STAMP_TPL.format(t=time.time()))


# =========================================================================
# 3. 单步执行(子进程 + loguru 前缀截获)
# =========================================================================


def run_once(x: Unit) -> bool:
    """跑一个单元的一轮:顺序执行 steps,一步失败即中止本轮;seed=True 才在成功后灌库。

    日志前缀 = 角色·单元(2026-08-30 批A:多单元混流里每行可归属;单单元角色不变样)。
    """
    ulog = cast(LogLike, logger.bind(source=source_of(x)))
    for step in x.steps:
        if run_step(RunStepIn(step=step, log=ulog)) is False:
            ulog.error(STEP_FAIL_MSG)
            return False
    if x.seed:
        if finish_seed() is False:
            return False
    ping_health(x)
    return True


def source_of(x: Unit) -> str:
    """本单元的日志前缀(单单元角色 = 角色名;多单元 = 角色·单元)。"""
    role = current_role()
    if x.name == role:
        return role
    return SOURCE_UNIT_TPL.format(role=role, name=x.name)


def run_step(x: RunStepIn) -> bool:
    """跑一个 step,逐行截获其 stdout/stderr → 套统一 loguru 前缀打印(前缀=角色·单元)。"""
    x.log.info(STEP_RUN_TPL.format(cmd=CMD_SEP.join(x.step)))
    env = dict(os.environ)
    env[ENV_UNBUFFERED] = VAL_ONE
    env[ENV_IOENCODING] = ENC_UTF8
    proc = subprocess.Popen(x.step, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, encoding=ENC_UTF8, errors=ERRORS_REPLACE,
                            bufsize=1, env=env)
    # pyrefly: ignore[not-iterable] — Popen 带 stdout=PIPE 时 proc.stdout 恒非 None(存根按无 PIPE 的形留了 None 档)
    for raw in proc.stdout:
        line = raw.rstrip(NEWLINE)
        if line.strip() != "":
            x.log.log(level_of(line), line)
    return proc.wait() == 0


def level_of(line: str) -> str:
    """子进程一行的级别:行首 ✗ 或 ! = 告警通道,其余普通。"""
    if line.lstrip().startswith(ERR_PREFIXES):
        return LVL_ERROR
    return LVL_INFO


# =========================================================================
# 4. 轮次收尾(seed / alerts / ping)
# =========================================================================


def finish_seed() -> bool:
    """仅 build 角色:增量 seed(mart 全量累积,不会误关旧岗),成功后再触发邮件提醒。

    HTTP 细节住 load 域(600s 放弃线 / ok:true 真实判定 / 两种尾巴反推 alerts);
    load.functions 纯返回不打日志 —— 日志面与心跳判定留这。alerts 失败不影响本轮。
    """
    out = trigger_seed()
    if out.ok is False:
        logger.error(SEED_FAIL_TPL.format(status=out.status, body=out.body))
        return False
    logger.info(SEED_OK_TPL.format(status=out.status, body=out.body))
    alerts = trigger_alerts()
    if alerts.ok is False:
        logger.error(ALERTS_FAIL_TPL.format(status=alerts.status, body=alerts.body))
        return True
    logger.info(ALERTS_OK_TPL.format(status=alerts.status, body=alerts.body))
    return True


def ping_health(x: Unit) -> None:
    """监控心跳(E7-01):本轮全部成功且本单元持 ping 权 → 过保鲜闸 → ping healthchecks.io
    (env 缺省不 ping;判据与授权范围见 constants.ENV_PING_TPL 的 docstring)。

    2026-08-31 批O:发 ping 前先过 freshness_ok() 全域保鲜闸(原 pnp 链尾哨兵搬进本门口,
    source_manifest 中央花名册随之退役)—— 有陈数据就扣 ping 转红,语义与 B3-1 原样。
    """
    if x.ping is False:
        return
    url = os.environ.get(ENV_PING_TPL.format(role=current_role().upper()), "")
    if url == "":
        return
    if freshness_ok() is False:
        return
    try:
        httpx.get(url, timeout=PING_TIMEOUT_S)
    except Exception as e:  # noqa: BLE001 — 心跳打不通不影响本轮成败,留痕即可
        logger.error(PING_FAIL_TPL.format(name=type(e).__name__))
        return
    logger.info(PING_OK_MSG)


def freshness_ok() -> bool:
    """全域保鲜闸(B3-1 哨兵,2026-08-31 批O 自 pnp 段37 迁入):扫全部域 META 的 fresh
    契约,逐文件核 fetched(或 checkedAt/mtime)与 cadence_days;超期逐行 ERROR + 收口行,
    返回 False → 调用方扣 ping → healthchecks 转红报警。

    住 ping 门口而不是某域链尾:**任一持 ping 的单元都替全舰队盯保鲜** —— 覆盖没配
    healthchecks URL 的役(批N 拆容器后 dli/aip 等无 ping env,报警面 = 现有检查数);
    待各役配齐自己的 URL 后可改回按域分摊。判定逻辑与原 pnp 段37 逐字同源。
    """
    rows = fresh_rows()
    today = datetime.now(timezone.utc).date()
    stale: list = []
    for rel in sorted(rows):
        r = rows[rel]
        path = paths.DATA / rel
        if not path.exists():
            stale.append(FRESH_P_MISSING_TPL.format(rel=rel))
            continue
        stamp = fresh_stamp_of(FreshStampIn(path=path, key=r[FRESH_K_KEY]))
        if not stamp:
            stale.append(FRESH_P_NOSTAMP_TPL.format(rel=rel, key=r[FRESH_K_KEY]))
            continue
        try:
            age = (today - datetime.strptime(stamp, FRESH_DATE_FMT).date()).days
        except ValueError:
            stale.append(FRESH_P_BADDATE_TPL.format(rel=rel, key=r[FRESH_K_KEY], stamp=repr(stamp)))
            continue
        if age > r[FRESH_K_CADENCE]:
            if r[FRESH_K_NOTE]:
                stale.append(FRESH_P_STALE_NOTE_TPL.format(rel=rel, stamp=stamp, age=age,
                                                           cad=r[FRESH_K_CADENCE], note=r[FRESH_K_NOTE]))
            else:
                stale.append(FRESH_P_STALE_TPL.format(rel=rel, stamp=stamp, age=age,
                                                      cad=r[FRESH_K_CADENCE]))
    if len(stale) > 0:
        for s in stale:
            logger.error(s)
        logger.error(FRESH_P_SUMMARY_TPL.format(n=len(stale), total=len(rows)))
        return False
    logger.info(FRESH_P_ALL_OK_TPL.format(n=len(rows)))
    return True


def fresh_rows() -> dict:
    """全域 fresh 契约展开(rel path → 契约行):glob 行铺全量,再被 file 行压过
    (原 source_manifest 的 defaults/overrides 语义原样,只是声明搬进了各域 META)。"""
    rows: dict = {}
    hits = domain_metas()
    for hit in hits:
        for d in hit.meta.get(K_FRESH) or []:
            if FRESH_K_GLOB not in d:
                continue
            for f in glob.glob(str(paths.DATA / d[FRESH_K_GLOB])):
                rel = Path(f).relative_to(paths.DATA).as_posix()
                rows[rel] = {FRESH_K_CADENCE: d[FRESH_K_CADENCE], FRESH_K_KEY: FRESH_KEY_DEFAULT,
                             FRESH_K_NOTE: ""}
    for hit in hits:
        for o in hit.meta.get(K_FRESH) or []:
            if FRESH_K_FILE not in o:
                continue
            note = o.get(FRESH_K_NOTE)
            if note is None:
                note = ""
            key = o.get(FRESH_K_KEY)
            if key is None:
                key = FRESH_KEY_DEFAULT
            rows[o[FRESH_K_FILE]] = {FRESH_K_CADENCE: o[FRESH_K_CADENCE], FRESH_K_KEY: key,
                                     FRESH_K_NOTE: note}
    return rows


def fresh_stamp_of(x: FreshStampIn) -> str:
    """取该文件的「数据是哪天的」:fetched/checkedAt 顶层键,或 mtime 兜底。
    取不到返回空(坏 JSON 本身就是要报的病 —— 空戳会被上游记成「无戳」超期行,留痕在报告里)。"""
    if x.key == FRESH_KEY_MTIME:
        return datetime.fromtimestamp(x.path.stat().st_mtime, tz=timezone.utc).date().isoformat()
    try:
        d = json.loads(x.path.read_text(encoding=ENC_UTF8))
    except Exception:  # noqa: BLE001, S110
        return ""
    v = None
    if isinstance(d, dict):
        v = d.get(x.key)
    if v:
        return str(v)[:FRESH_STAMP_LEN]
    return ""


# =========================================================================
# 5. 手动一轮(run_now:管理台不赚钱先放,给脚本直接执行能看进度)
# =========================================================================


def run_now() -> None:
    """手动跑一轮(#119 简化拍板,Frank:「管理台不赚钱先放,给我脚本直接执行能看进度」)。

    尾参 = 要跑的役/域,按序执行,不跟则走 DEFAULT_ROLES 全链(角色序照 gate_quotes 先例
    从 sys.argv[3:] 取,门是 `--only now`)。步骤与 docker 役同一套(按角色收拢声明
    role==名字 的域役,各役跑 etl/<域>/main.py [--only 役];也可直接给域名如 dli),
    进度实时打印;与后台 docker 轮并行跑也安全(posting_id 去重、同日目录幂等、seed 增量对账)。
    build 的灌库步自动从 cms/.env 借 SEED_TOKEN,默认灌生产(SEED_URL 可用环境变量覆盖)。
    """
    roles = list(sys.argv[3:])
    if len(roles) == 0:
        roles = list(DEFAULT_ROLES)
    load_env()
    t0 = time.time()
    for role in roles:
        run_role(role)
    logger.info(NOW_END_TPL.format(sec=time.time() - t0))


def run_role(role: str) -> None:
    """手动跑一个役:命中的全部单元的步骤按序执行,一步失败中止本役、继续下一役。"""
    units = units_of_name(role)
    if len(units) == 0:
        logger.error(UNKNOWN_ROLE_TPL.format(role=role))
        return
    names: list[str] = []
    steps: list[list[str]] = []
    for unit in units:
        names.append(unit.name)
        for step in unit.steps:
            steps.append(step)
    logger.info(NOW_HEAD_TPL.format(role=role, names=NAME_JOIN.join(names), n=len(steps)))
    for step in steps:
        logger.info(STEP_RUN_TPL.format(cmd=CMD_SEP.join(step)))
        rc = subprocess.run(step, cwd=paths.ROOT).returncode
        if rc != 0:
            logger.error(NOW_FAIL_TPL.format(role=role, rc=rc))
            return
    logger.info(NOW_OK_TPL.format(role=role))


def load_env() -> None:
    """手动一轮的环境兜底:utf-8 输出 + 从 cms/.env 借 SEED_TOKEN + 默认灌生产。"""
    os.environ.setdefault(ENV_IOENCODING, ENC_UTF8)
    envf = paths.ROOT / CMS_DIR / ENV_FILE
    if envf.exists() and ENV_SEED_TOKEN not in os.environ:
        for ln in envf.read_text(encoding=ENC_UTF8).splitlines():
            if ln.startswith(TOKEN_LINE_PREFIX):
                os.environ[ENV_SEED_TOKEN] = ln.split(KV_SEP, 1)[1].strip()
    os.environ.setdefault(ENV_SEED_URL, MANUAL_SEED_URL)

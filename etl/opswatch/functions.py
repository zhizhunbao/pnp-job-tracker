"""
opswatch 域行为:探活局域网 Ollama,把结果报给站点,站点探其余通道并判定报警。

@author Frank
@time 2026-11-08 23:59:00
"""
import os
import time

import httpx

from fetch.functions import cms_config
from log.functions import say
from opswatch.constants import (
    ENV_LLM_BASE,
    ENV_NONE,
    ERR_HTTP,
    ERR_NETWORK,
    ERR_TICK,
    ERR_UNCONFIGURED,
    KEY_FIRED,
    KEY_OLLAMA,
    MS_PER_S,
    PATH_TAGS,
    PATH_TICK,
    PRINT_DONE,
    PRINT_SKIP,
    PROBE_TIMEOUT_S,
    STATUS_OK,
    TICK_TIMEOUT_S,
)
from opswatch.scheme import OllamaProbe


def tick_round() -> None:
    """tick 步入口:探活 Ollama,POST 给站点;没配站点一行提示跳过,站点返回失败即抛(本轮记失败)。"""
    cfg = cms_config()
    if cfg.base == ENV_NONE:
        say(PRINT_SKIP)
        return
    probe = probe_ollama()
    res = httpx.post(cfg.base + PATH_TICK, headers=cfg.headers, json={KEY_OLLAMA: probe.model_dump()}, timeout=TICK_TIMEOUT_S)
    if res.status_code != STATUS_OK:
        raise RuntimeError(ERR_TICK.format(status=res.status_code))
    say(PRINT_DONE.format(ok=probe.ok, fired=res.json()[KEY_FIRED]))


def probe_ollama() -> OllamaProbe:
    """列 Ollama 的模型:不跑模型,只看通不通;没配地址算不可用。"""
    base = os.environ.get(ENV_LLM_BASE, ENV_NONE)
    if base == ENV_NONE:
        return OllamaProbe(ok=False, ms=None, error=ERR_UNCONFIGURED)
    started = time.monotonic()
    try:
        res = httpx.get(base.rstrip("/") + PATH_TAGS, timeout=PROBE_TIMEOUT_S)
    except httpx.HTTPError:
        return OllamaProbe(ok=False, ms=None, error=ERR_NETWORK)
    ms = int((time.monotonic() - started) * MS_PER_S)
    if res.status_code != STATUS_OK:
        return OllamaProbe(ok=False, ms=ms, error=ERR_HTTP + str(res.status_code))
    return OllamaProbe(ok=True, ms=ms, error=None)

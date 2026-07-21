#!/usr/bin/env python3
"""部署哨兵 —— 「push 成功 ≠ 上线」的解药。

2026-07-21 事故:Render 工作区 500 构建分钟耗尽,且 Build Pipeline 设了 $0 spend limit
(把 Render 本该自动补买的行为一并掐死),于是 #154-#159 六个提交全部 `Build blocked`,
生产钉在旧构建**整整一天**。期间 Frank 反复报「列表没更新」「面包屑还是三个商务」,
每一条都被当成独立的前端 bug 去查 —— 根因只有一个,症状六个。

本脚本把「线上跑的是哪个提交」变成一次比对:
    远端 origin/main 的 SHA   vs   线上 /api/version 报的 SHA
不一致 = 没部署上去,直接说人话报警,不必再去猜是不是代码写错了。

零依赖(标准库 urllib),不写库、不改任何状态,只读。
用法:
    python etl/check_deploy.py            # 跑一次,一致 exit 0 / 不一致 exit 1
    python etl/check_deploy.py --quiet    # 只在异常时输出(挂 cron 用)
"""
from __future__ import annotations

import json
import subprocess
import sys
import urllib.error
import urllib.request

# Windows 控制台默认 cp1252,吐中文/符号直接 UnicodeEncodeError(实测踩过)。
# 挂 cron 时报警信息发不出来才是真事故,故强制 UTF-8;老 Python 没有 reconfigure 就退回默认。
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass

SITE = "https://offer2pr.com"
VERSION_URL = f"{SITE}/api/version"
TIMEOUT = 20


def remote_head() -> str | None:
    """取 origin/main 的 SHA。不用本地 HEAD —— 本地可能有没推的提交,那不该算「该上线的版本」。"""
    try:
        out = subprocess.run(
            ["git", "ls-remote", "origin", "refs/heads/main"],
            capture_output=True, text=True, timeout=TIMEOUT, check=True,
        ).stdout.strip()
        return out.split()[0] if out else None
    except (subprocess.SubprocessError, OSError, IndexError):
        return None


def live_commit() -> str | None:
    try:
        with urllib.request.urlopen(VERSION_URL, timeout=TIMEOUT) as r:
            return (json.load(r).get("commit") or "").strip() or None
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError, OSError):
        return None


def main() -> int:
    quiet = "--quiet" in sys.argv
    want, live = remote_head(), live_commit()

    if want is None:
        print("[部署哨兵] 取不到 origin/main(网络或 git remote 问题),本轮跳过")
        return 0  # 拿不到基准不算故障,别误报
    if live is None:
        print(f"[部署哨兵] ⚠ {VERSION_URL} 无响应 —— 站点可能挂了,或该端点尚未部署")
        return 1

    if live.startswith(want[:12]) or want.startswith(live[:12]):
        if not quiet:
            print(f"[部署哨兵] ✓ 线上 == origin/main ({live[:12]})")
        return 0

    print(
        "[部署哨兵] ⚠ 线上不是最新提交 —— **代码推上去了但没上线**\n"
        f"    origin/main : {want[:12]}\n"
        f"    线上正在跑  : {live[:12]}\n"
        "    先查 Render → pnp-cms → Events 有没有 `Build blocked`\n"
        "    (最常见原因:构建分钟耗尽 + spend limit 拦住自动补买)\n"
        "    在此之前,任何「改了怎么没生效」都不必当代码 bug 查。"
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())

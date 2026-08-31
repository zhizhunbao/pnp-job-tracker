"""Targeted tests for the real build/jobbank inter-process lock.

2026-08-31 批F 随 sources 役册退役搬根改造:锁正身在 paths(jobbank_store_lock,
一参令后显式传锁路径),build 链正身在 load(BUILD_CHAIN_CMDS + run_build_chain)。
测试语义一字不变:① 第二进程等锁 ② 崩溃不留死锁 ③ 汇装链形状与顺序
④ 09 在互斥区内执行 ⑤⑥ 两个解析步在同一互斥区内发布。
2026-08-31 批H 只跟路径不动语义:09 那一步在链里的说法变成 `etl/mart/main.py`(门内
08→09→10→11 四步),两个解析件从 clean/ 归户 etl/jobbank/(parse_jobbank_postings /
parse_jobbank_details)。
2026-08-31 批I 同样只跟宿主不动语义:jobbank 域全溶,两个解析件成了
etl/jobbank/functions.py 的两段,入口函数与原脚本同名(parse_jobbank_postings /
parse_jobbank_details),被 patch 的符号(jobbank_store_lock / latest_snapshot_dir /
cutoff_of / fetched_at_of / parse_snapshot / load_postings / write_postings /
detail_html_index / SCRAPED_KEYS / IN_POSTINGS / OUT_DETAILS)逐个原名健在。
Usage:  uv run python etl/test_jobbank_lock.py
"""
from __future__ import annotations

import contextlib
import importlib.util
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

ETL = Path(__file__).resolve().parent
sys.path.insert(0, str(ETL))

import load
from load import functions as load_functions
from load.constants import BUILD_CHAIN_CMDS
from load.scheme import BuildChainIn
from paths import jobbank_store_lock


def quiet_say(line: str) -> None:
    """测试用打点回调(吞掉进度行)。"""


class JobbankStoreLockTest(unittest.TestCase):
    """锁语义 + 汇装链形状 + 「发布/汇装都在互斥区内」的三类断言。"""

    def _child(self, lock_path: Path, marker: Path, *, crash: bool = False) -> subprocess.Popen:
        code = (
            "import os,sys; from pathlib import Path; "
            "sys.path.insert(0, sys.argv[1]); "
            "from paths import jobbank_store_lock; "
            "ctx=jobbank_store_lock(Path(sys.argv[2])); ctx.__enter__(); "
            "Path(sys.argv[3]).write_text('acquired'); "
            + ("os._exit(17)" if crash else "ctx.__exit__(None,None,None)")
        )
        return subprocess.Popen([sys.executable, "-c", code, str(ETL), str(lock_path), str(marker)])

    def test_second_process_waits_until_lock_release(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            lock_path, marker = root / "store.lock", root / "child-acquired"
            with jobbank_store_lock(lock_path):
                child = self._child(lock_path, marker)
                time.sleep(0.25)
                self.assertFalse(marker.exists(), "child entered while parent still held the store lock")
            self.assertEqual(child.wait(timeout=5), 0)
            self.assertTrue(marker.exists())

    def test_crashed_holder_does_not_leave_stale_lock(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            lock_path, marker = root / "store.lock", root / "child-acquired"
            child = self._child(lock_path, marker, crash=True)
            self.assertEqual(child.wait(timeout=5), 17)
            self.assertTrue(marker.exists())
            with jobbank_store_lock(lock_path):
                pass

    def test_actual_build_entry_wraps_the_complete_round(self) -> None:
        build_metas = [m for m in load.METAS if m["role"] == "build"]
        self.assertEqual(len(build_metas), 1)
        self.assertEqual(build_metas[0]["only"], "", "build 役必须走默认链(整链持锁)")
        cmds = [list(c) for c in BUILD_CHAIN_CMDS]
        self.assertIn(["python", "etl/clean/04c_clean_ats_locations.py"], cmds)
        self.assertIn(["python", "etl/aip/main.py", "--only", "flag"], cmds)
        self.assertIn(["python", "etl/clean/05e_flag_apprentice.py"], cmds)
        self.assertIn(["python", "etl/mart/main.py"], cmds)
        self.assertLess(cmds.index(["python", "etl/clean/04c_clean_ats_locations.py"]),
                        cmds.index(["python", "etl/mart/main.py"]))
        self.assertLess(cmds.index(["python", "etl/rcip/main.py", "--only", "communities"]),
                        cmds.index(["python", "etl/clean/05f_flag_pilot.py"]))

    def test_actual_build_runner_executes_09_inside_mutex(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            held = False

            @contextlib.contextmanager
            def real_temp_lock(_lock_path):
                nonlocal held
                with jobbank_store_lock(Path(td) / "store.lock"):
                    held = True
                    try:
                        yield
                    finally:
                        held = False

            def checked_run(step, **_kwargs):
                self.assertTrue(held, f"{step} ran outside the Job Bank mutex")
                return SimpleNamespace(returncode=0)

            def checked_upload(_x):
                self.assertTrue(held, "upload ran outside the Job Bank mutex")

            steps = (("python", "etl/clean/04c_clean_ats_locations.py"),
                     ("python", "etl/mart/main.py"))
            with mock.patch.object(load_functions, "jobbank_store_lock", real_temp_lock), \
                 mock.patch.object(load_functions, "BUILD_CHAIN_CMDS", steps), \
                 mock.patch.object(load_functions, "upload_mart", checked_upload), \
                 mock.patch.object(load_functions.subprocess, "run", side_effect=checked_run):
                load_functions.run_build_chain(BuildChainIn(say=quiet_say))

    def _parser_module(self, name: str):
        spec = importlib.util.spec_from_file_location(f"jobbank_{name}", ETL / "jobbank" / "functions.py")
        # pyrefly: ignore[bad-argument-type] — spec_from_file_location 只在路径不存在时给 None;此处是仓内固定文件,拿不到就该当场炸
        module = importlib.util.module_from_spec(spec)
        # pyrefly: ignore[missing-attribute] — spec_from_file_location 只在路径不存在时给 None;此处是仓内固定文件,拿不到就该当场炸
        assert spec.loader is not None
        # pyrefly: ignore[missing-attribute] — 上一行 assert 已保证 loader 非 None;存根把 loader 标成 Loader|None
        spec.loader.exec_module(module)
        return module

    def test_actual_listing_parser_publishes_inside_same_mutex(self) -> None:
        module = self._parser_module("parse_jobbank_postings")
        with tempfile.TemporaryDirectory() as td:
            held = False
            wrote = False

            @contextlib.contextmanager
            def real_temp_lock(_lock_path):
                nonlocal held
                with jobbank_store_lock(Path(td) / "store.lock"):
                    held = True
                    try:
                        yield
                    finally:
                        held = False

            def checked_write(_rows):
                nonlocal wrote
                self.assertTrue(held, "listing parser published postings outside the mutex")
                wrote = True

            row = {key: "" for key in module.SCRAPED_KEYS}
            row.update({"posting_id": "1", "date": "2026-08-05", "url": "https://example.invalid/jobposting/1"})
            with mock.patch.object(module, "jobbank_store_lock", real_temp_lock), \
                 mock.patch.object(module, "latest_snapshot_dir", return_value=Path(td)), \
                 mock.patch.object(module, "cutoff_of", return_value=module.datetime.min.date()), \
                 mock.patch.object(module, "fetched_at_of", return_value="2026-08-05T00:00:00Z"), \
                 mock.patch.object(module, "parse_snapshot", return_value=[row]), \
                 mock.patch.object(module, "load_postings", return_value={}), \
                 mock.patch.object(module, "write_postings", side_effect=checked_write), \
                 mock.patch.object(sys, "argv", ["parse_jobbank_postings.py"]), \
                 mock.patch("builtins.print"):
                module.parse_jobbank_postings()
            self.assertTrue(wrote)

    def test_actual_detail_parser_publishes_inside_same_mutex(self) -> None:
        module = self._parser_module("parse_jobbank_details")
        with tempfile.TemporaryDirectory() as td:
            held = False
            indexed = False
            in_postings = Path(td) / "postings.json"
            in_postings.write_text("[]", encoding="utf-8")

            @contextlib.contextmanager
            def real_temp_lock(_lock_path):
                nonlocal held
                with jobbank_store_lock(Path(td) / "store.lock"):
                    held = True
                    try:
                        yield
                    finally:
                        held = False

            def checked_index():
                nonlocal indexed
                self.assertTrue(held, "detail parser touched the store outside the mutex")
                indexed = True
                return {}

            with mock.patch.object(module, "jobbank_store_lock", real_temp_lock), \
                 mock.patch.object(module, "IN_POSTINGS", in_postings), \
                 mock.patch.object(module, "OUT_DETAILS", Path(td) / "details"), \
                 mock.patch.object(module, "detail_html_index", side_effect=checked_index), \
                 mock.patch.object(sys, "argv", ["parse_jobbank_details.py"]), \
                 mock.patch("builtins.print"):
                module.parse_jobbank_details()
            self.assertTrue(indexed)


if __name__ == "__main__":
    unittest.main()

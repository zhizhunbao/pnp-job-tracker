"""Targeted tests for the real build/jobbank inter-process lock."""
from __future__ import annotations

import contextlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

ETL = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ETL))

from sources._jobbank_lock import jobbank_store_lock  # noqa: E402
from sources.build import BUILD_STEPS, META  # noqa: E402
from sources.build import run_locked  # noqa: E402


class JobbankStoreLockTest(unittest.TestCase):
    def _child(self, lock_path: Path, marker: Path, *, crash: bool = False) -> subprocess.Popen:
        code = (
            "import os,sys; from pathlib import Path; "
            "sys.path.insert(0, sys.argv[1]); "
            "from sources._jobbank_lock import jobbank_store_lock; "
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
        self.assertEqual(META["steps"], [["python", "etl/sources/build/run_locked.py"]])
        self.assertIn(["python", "etl/clean/04c_clean_ats_locations.py"], BUILD_STEPS)
        self.assertIn(["python", "etl/clean/05c_flag_aip.py"], BUILD_STEPS)
        self.assertIn(["python", "etl/clean/05e_flag_apprentice.py"], BUILD_STEPS)
        self.assertIn(["python", "etl/09_build_mart.py"], BUILD_STEPS)
        self.assertLess(BUILD_STEPS.index(["python", "etl/clean/04c_clean_ats_locations.py"]),
                        BUILD_STEPS.index(["python", "etl/09_build_mart.py"]))

    def test_actual_build_runner_executes_09_inside_mutex(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            held = False

            @contextlib.contextmanager
            def real_temp_lock():
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

            steps = [["python", "etl/clean/04c_clean_ats_locations.py"],
                     ["python", "etl/09_build_mart.py"]]
            with mock.patch.object(run_locked, "jobbank_store_lock", real_temp_lock), \
                 mock.patch.object(run_locked, "BUILD_STEPS", steps), \
                 mock.patch.object(run_locked.subprocess, "run", side_effect=checked_run), \
                 mock.patch("builtins.print"):
                run_locked.main()

    def test_actual_listing_parser_publishes_inside_same_mutex(self) -> None:
        spec = importlib.util.spec_from_file_location("clean_05_parse_jobbank", ETL / "clean" / "05_parse_jobbank.py")
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as td:
            held = False
            wrote = False

            @contextlib.contextmanager
            def real_temp_lock():
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
                 mock.patch.object(sys, "argv", ["05_parse_jobbank.py"]), \
                 mock.patch("builtins.print"):
                module.main()
            self.assertTrue(wrote)

    def test_actual_detail_parser_publishes_inside_same_mutex(self) -> None:
        spec = importlib.util.spec_from_file_location("clean_05b_parse_details", ETL / "clean" / "05b_parse_details.py")
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            postings = root / "postings.json"
            raw_detail = root / "1.html"
            postings.write_text('[{"posting_id":"1","title":"Cook","employer":"Cafe",'
                                '"url":"https://example.invalid/jobposting/1"}]', encoding="utf-8")
            raw_detail.write_text('<span property="datePosted">Posted on 2026-08-05</span>', encoding="utf-8")
            held = False
            replaced = False
            real_replace = module.os.replace

            @contextlib.contextmanager
            def real_temp_lock():
                nonlocal held
                with jobbank_store_lock(root / "store.lock"):
                    held = True
                    try:
                        yield
                    finally:
                        held = False

            def checked_replace(src, dst):
                nonlocal replaced
                self.assertTrue(held, "detail parser published postings outside the mutex")
                replaced = True
                return real_replace(src, dst)

            with mock.patch.object(module, "jobbank_store_lock", real_temp_lock), \
                 mock.patch.object(module, "IN_POSTINGS", postings), \
                 mock.patch.object(module, "OUT_DETAILS", root / "details"), \
                 mock.patch.object(module, "detail_html_index", return_value={"1": raw_detail}), \
                 mock.patch.object(module.os, "replace", side_effect=checked_replace), \
                 mock.patch("builtins.print"):
                module.main()
            self.assertTrue(replaced)
            self.assertTrue(json.loads(postings.read_text(encoding="utf-8"))[0]["detail_fetched"])


if __name__ == "__main__":
    unittest.main()

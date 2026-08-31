"""
gate.scheme — 自查闸的形状(一参令 XxxIn / 扫描结果 Out / 库垫片类)。

库垫片住这的先例 = pnp.scheme 的 GateText(HTMLParser 子类):functions 顶层只许函数,
而 unittest 要求以 TestCase 子类交付用例 —— 「不用 class」的外部库例外,同款处置。
锁自查的用例集 2026-08-31 批K 自 etl/test_jobbank_lock.py 整体搬入,**断言语义一字不动**,
只补了 ruff 全严所需的 docstring 与类型注解(旧文件在 pyproject 里整行豁免,搬进域后
豁免行随文件退役,新件天然全严)。
⚠ 本文件 import 被测域(load / paths / jobbank):测试的对象就是它们的真件,不是替身;
gate 在域层之上,①号规对它放行(判据见 constants.ABOVE)。
"""
from __future__ import annotations

import ast
import contextlib
import importlib.util
import subprocess
import sys
import tempfile
import time
import unittest
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest import mock

import load
from gate.constants import ETL_DIR
from load import functions as load_functions
from load.constants import BUILD_CHAIN_CMDS
from load.scheme import BuildChainIn
from paths import jobbank_store_lock

# =========================================================================
# 1. 形制扫描(十规)
# =========================================================================


@dataclass
class ScanOut:
    """一次扫描的产出:硬红(零容忍)与软违规(走基线,只紧不松)两摞。"""

    hard: list[str]
    """硬红清单:域间 import / 裸 print / functions 方言 / 白名单外野文件。"""

    soft: list[str]
    """基线类清单:缺 IN/OUT 路径常量 + 步骤模块多余 __main__。"""


@dataclass
class FileScanIn:
    """scan_file() 入参。"""

    dom: str
    """文件所属的域名。"""

    path: Path
    """文件绝对路径。"""


@dataclass
class HitsIn:
    """单文件文本级检查的共同入参(裸 print / functions 方言)。"""

    rel: str
    """相对 etl/ 的路径(报违规时的定位)。"""

    text: str
    """文件全文。"""


@dataclass
class CrossIn:
    """cross_imports_of() 入参。"""

    dom: str
    """文件所属的域名(判「别的域」用)。"""

    rel: str
    """相对 etl/ 的路径。"""

    text: str
    """文件全文。"""


@dataclass
class ExemptIn:
    """exempt_ids_of() 入参。"""

    tree: ast.AST
    """已解析的语法树。"""

    in_to: set[int]
    """to_* 行构造器体内全部节点的 id 集合。"""


@dataclass
class KeyIdsIn:
    """行键豁免判定的入参(字典键 / 下标 / get-setdefault-pop 首参)。"""

    node: ast.AST
    """当前节点。"""

    in_to: set[int]
    """to_* 行构造器体内全部节点的 id 集合。"""


@dataclass
class LinenoIn:
    """lineno_of() 入参(正则命中位置 → 行号)。"""

    text: str
    """文件全文。"""

    pos: int
    """命中处的字符偏移。"""


# =========================================================================
# 2. 基线管理(prune:只紧不松)
# =========================================================================


@dataclass
class DiffIn:
    """missing_of() 入参:算「items 里不在 known 里的」——新增违规与已修存量同一形。"""

    items: list[str]
    """本次扫描的一摞。"""

    known: list[str]
    """基线里已记的一摞。"""


# =========================================================================
# 4. 锁自查(build/jobbank 跨进程互斥的真件测试)
# =========================================================================


def quiet_say(line: str) -> None:
    """测试用打点回调(吞掉进度行)。"""


class JobbankStoreLockTest(unittest.TestCase):
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
    2026-08-31 批K 随 gate 立域搬进 scheme(库垫片住 scheme,GateText 先例);
    跑法从 `python etl/test_jobbank_lock.py` 变成 `python etl/gate/main.py --only locktest`。
    2026-08-31 批J(并行批,clean/ 目录退役)只跟链上的说法不动语义:五个清洗步换成
    各自归户后的域门 `--only` 点名(04c → `mart --only locations`、05e →
    `jobbank --only apprentice`、05f → `mart --only pilot_flag`),③号用例的三处
    assertIn 与两处顺序断言随之改名,断言的**性质**(成员在链里、清洗排在汇装前、
    社区名单排在打标前)一字未动;并补第三条顺序断言 **salary 必须早于 noc_sanity**
    —— 那是原链 04d 早于 05d 的铁律(NOC 护栏的「薪资远低」读的是薪资步算出的
    salaryAnnual),以前没有测试守着,归户后链行改写更该钉住。
    """

    def _child(self, lock_path: Path, marker: Path, *, crash: bool = False) -> subprocess.Popen:
        code = (
            "import os,sys; from pathlib import Path; "
            "sys.path.insert(0, sys.argv[1]); "
            "from paths import jobbank_store_lock; "
            "ctx=jobbank_store_lock(Path(sys.argv[2])); ctx.__enter__(); "
            "Path(sys.argv[3]).write_text('acquired'); "
            + ("os._exit(17)" if crash else "ctx.__exit__(None,None,None)")
        )
        return subprocess.Popen([sys.executable, "-c", code, str(ETL_DIR), str(lock_path),
                                 str(marker)])

    def test_second_process_waits_until_lock_release(self) -> None:
        """① 父进程持锁期间,第二个进程进不来;父放手后它才拿到。"""
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
        """② 持锁进程崩了不留死锁(内核随进程退出释放)。"""
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            lock_path, marker = root / "store.lock", root / "child-acquired"
            child = self._child(lock_path, marker, crash=True)
            self.assertEqual(child.wait(timeout=5), 17)
            self.assertTrue(marker.exists())
            with jobbank_store_lock(lock_path):
                pass

    def test_actual_build_entry_wraps_the_complete_round(self) -> None:
        """③ build 役走默认链(整链持锁),汇装链的成员与先后次序照旧。"""
        build_metas = [m for m in load.METAS if m["role"] == "build"]
        self.assertEqual(len(build_metas), 1)
        self.assertEqual(build_metas[0]["only"], "", "build 役必须走默认链(整链持锁)")
        cmds = [list(c) for c in BUILD_CHAIN_CMDS]
        self.assertIn(["python", "etl/mart/main.py", "--only", "locations"], cmds)
        self.assertIn(["python", "etl/aip/main.py", "--only", "flag"], cmds)
        self.assertIn(["python", "etl/jobbank/main.py", "--only", "apprentice"], cmds)
        self.assertIn(["python", "etl/mart/main.py"], cmds)
        self.assertLess(cmds.index(["python", "etl/mart/main.py", "--only", "locations"]),
                        cmds.index(["python", "etl/mart/main.py"]))
        self.assertLess(cmds.index(["python", "etl/rcip/main.py", "--only", "communities"]),
                        cmds.index(["python", "etl/mart/main.py", "--only", "pilot_flag"]))
        self.assertLess(cmds.index(["python", "etl/mart/main.py", "--only", "salary"]),
                        cmds.index(["python", "etl/jobbank/main.py", "--only", "noc_sanity"]))

    def test_actual_build_runner_executes_09_inside_mutex(self) -> None:
        """④ 汇装链的每一步(含 09/mart 与 upload)都在互斥区内执行。"""
        with tempfile.TemporaryDirectory() as td:
            held = False

            @contextlib.contextmanager
            def real_temp_lock(_lock_path: Path) -> Iterator[None]:
                """临时目录里的真锁(替掉仓内锁路径,语义不变)。"""
                nonlocal held
                with jobbank_store_lock(Path(td) / "store.lock"):
                    held = True
                    try:
                        yield
                    finally:
                        held = False

            def checked_run(step: list[str], **_kwargs: object) -> SimpleNamespace:
                """替身 subprocess.run:断言这一步跑在互斥区内。"""
                self.assertTrue(held, f"{step} ran outside the Job Bank mutex")
                return SimpleNamespace(returncode=0)

            def checked_upload(_x: object) -> None:
                """替身 upload_mart:断言链尾上传也在互斥区内。"""
                self.assertTrue(held, "upload ran outside the Job Bank mutex")

            steps = (("python", "etl/mart/main.py", "--only", "locations"),
                     ("python", "etl/mart/main.py"))
            with mock.patch.object(load_functions, "jobbank_store_lock", real_temp_lock), \
                 mock.patch.object(load_functions, "BUILD_CHAIN_CMDS", steps), \
                 mock.patch.object(load_functions, "upload_mart", checked_upload), \
                 mock.patch.object(load_functions.subprocess, "run", side_effect=checked_run):
                load_functions.run_build_chain(BuildChainIn(say=quiet_say))

    def _parser_module(self, name: str) -> ModuleType:
        spec = importlib.util.spec_from_file_location(f"jobbank_{name}",
                                                      ETL_DIR / "jobbank" / "functions.py")
        # pyrefly: ignore[bad-argument-type] — spec_from_file_location 只在路径不存在时给 None;此处是仓内固定文件,拿不到就该当场炸
        module = importlib.util.module_from_spec(spec)
        # pyrefly: ignore[missing-attribute] — spec_from_file_location 只在路径不存在时给 None;此处是仓内固定文件,拿不到就该当场炸
        assert spec.loader is not None
        # pyrefly: ignore[missing-attribute] — 上一行 assert 已保证 loader 非 None;存根把 loader 标成 Loader|None
        spec.loader.exec_module(module)
        return module

    def test_actual_listing_parser_publishes_inside_same_mutex(self) -> None:
        """⑤ 列表解析段发布 postings.json 时持着同一把仓锁。"""
        module = self._parser_module("parse_jobbank_postings")
        with tempfile.TemporaryDirectory() as td:
            held = False
            wrote = False

            @contextlib.contextmanager
            def real_temp_lock(_lock_path: Path) -> Iterator[None]:
                """临时目录里的真锁(替掉仓内锁路径,语义不变)。"""
                nonlocal held
                with jobbank_store_lock(Path(td) / "store.lock"):
                    held = True
                    try:
                        yield
                    finally:
                        held = False

            def checked_write(_rows: list) -> None:
                """替身 write_postings:断言发布发生在互斥区内。"""
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
        """⑥ 详情解析段动 store 时持着同一把仓锁。"""
        module = self._parser_module("parse_jobbank_details")
        with tempfile.TemporaryDirectory() as td:
            held = False
            indexed = False
            in_postings = Path(td) / "postings.json"
            in_postings.write_text("[]", encoding="utf-8")

            @contextlib.contextmanager
            def real_temp_lock(_lock_path: Path) -> Iterator[None]:
                """临时目录里的真锁(替掉仓内锁路径,语义不变)。"""
                nonlocal held
                with jobbank_store_lock(Path(td) / "store.lock"):
                    held = True
                    try:
                        yield
                    finally:
                        held = False

            def checked_index() -> dict:
                """替身 detail_html_index:断言碰 store 发生在互斥区内。"""
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

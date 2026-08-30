"""Cross-process lock for the mutable Job Bank postings store.

The jobbank producer and build consumer run in separate processes (and, under
Compose, separate containers) over the same bind-mounted ``data/`` tree.  A
lock file beside ``postings.json`` therefore gives both roles one stable inode
on which to take an OS advisory lock.  The file may remain on disk; the lock
itself belongs to the open file descriptor and is released by the kernel even
when a process crashes or is killed.
"""
from __future__ import annotations

import os
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import paths


JOBBANK_STORE_LOCK = paths.PROCESSED_JOBBANK / ".postings.lock"


def _lock(file_obj) -> None:
    if os.name == "nt":
        import msvcrt

        file_obj.seek(0)
        while True:
            try:
                msvcrt.locking(file_obj.fileno(), msvcrt.LK_NBLCK, 1)
                return
            except OSError:
                time.sleep(0.05)
    else:
        import fcntl

        fcntl.flock(file_obj.fileno(), fcntl.LOCK_EX)


def _unlock(file_obj) -> None:
    file_obj.seek(0)
    if os.name == "nt":
        import msvcrt

        msvcrt.locking(file_obj.fileno(), msvcrt.LK_UNLCK, 1)
    else:
        import fcntl

        fcntl.flock(file_obj.fileno(), fcntl.LOCK_UN)


@contextmanager
def jobbank_store_lock(lock_path: Path | None = None) -> Iterator[None]:
    """Hold the Job Bank store lock until the guarded transaction finishes."""
    path = lock_path or JOBBANK_STORE_LOCK
    path.parent.mkdir(parents=True, exist_ok=True)
    # The one byte makes msvcrt.locking work on Windows; Unix flock only cares
    # about the inode.  Never replace/unlink this file while processes use it.
    with path.open("a+b") as lock_file:
        if lock_file.tell() == 0:
            lock_file.write(b"\0")
            lock_file.flush()
        _lock(lock_file)
        try:
            yield
        finally:
            _unlock(lock_file)

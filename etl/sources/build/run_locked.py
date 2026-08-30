"""Run one complete build round against a stable Job Bank postings store."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # etl/: sources + _paths
import _paths
from sources._jobbank_lock import JOBBANK_STORE_LOCK, jobbank_store_lock
from sources.build import BUILD_STEPS


def main() -> None:
    print(f"LOCK Job Bank store: {JOBBANK_STORE_LOCK} (waiting if producer is writing)", flush=True)
    with jobbank_store_lock():
        print("LOCK acquired: build round sees one stable postings.json", flush=True)
        for step in BUILD_STEPS:
            print("→ " + " ".join(step), flush=True)
            result = subprocess.run(step, cwd=_paths.ROOT)
            if result.returncode:
                print(f"✗ build step failed ({result.returncode}); lock will be released", flush=True)
                raise SystemExit(result.returncode)
    print("LOCK released: jobbank may publish its next parsed snapshot", flush=True)


if __name__ == "__main__":
    main()

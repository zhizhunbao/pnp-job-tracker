"""
discover_sources — 九省官方移民站的**定时 URL 探索 + 站点地图 diff(政策雷达)**。

2026-08-03 Frank 拍板的架构:bfs 探索定时跑,之后想要什么数据**先查探索出的 manifest**,
不再手搓 httpx 猜路径(当天教训:猜 URL 猜出一排 404,爬虫几分钟翻出三省运营统计页)。

两个产出,一次遍历:
  1. `data/crawl/<slug>/manifest.json`   每省一份站点地图(bfs_crawler 原生产物)——
     以后「找数据」= grep 这些文件,命中了再写抓取脚本
  2. `data/crawl/<slug>/changes.json`    与上一轮的 diff(新增/消失的 URL)——
     **新页面出现 = 政策可能变了**。BC 2026-06-13 新排除清单「完全不知道」的事故,
     该由这一步抓出来。diff 同时打进日志(docker logs 可见,B3-1 告警未建前的告警面)。

种子怎么配(与 bfs_crawler 的限域机制对齐):
  · 层级站(路径天然限域):MB 全站 / NS 全站 / NB gnb 移民区 / NL immigration 区 / SK SINP 区 / BC immigrate 区
  · 扁平站(URL 不分层 → keyword 限域):AB alberta.ca(aaip)/ ON ontario.ca(oinp、ontario-immigrant、workforce-priority)
  · PE:princeedwardisland.ca 在 Radware 后面(TLS 指纹墙,改 header 无用)→ 靠 bfs_crawler 的
    **浏览器兜底**(验证壳→chromium)。前提:crawl 役必须用 docker/etl/crawl/Dockerfile 重镜像
    (compose 已配);本机 .venv 没装 playwright 时,PE 这条在本机会探索失败 —— 单省失败不拖垮全轮。
  · QC:2026-08-03 Frank 改拍 —— **爬**(此前因「自有体系不属 PNP」不爬)。quebec.ca 无墙,
    httpx 直取;先建地图与政策雷达,PNP 决策引擎仍不给 QC 下结论(那是消费层的事)。

跑法:每省一条 bfs_crawler discover 子进程(复用现成 CLI,不改它);跑前把上一份 manifest
存为 manifest-prev.json,跑完 diff。**单省失败不拖垮全轮**(探索是尽力而为,不是硬闸)——
但全轮一个省都没成功时 exit 1(网断了/被全面封了,该让役知道)。

Usage:  uv run python etl/crawl/discover_sources.py            # 全部种子
        uv run python etl/crawl/discover_sources.py mb-root    # 只跑指定 slug(调试)
"""
import json
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))
import _paths  # noqa: E402  (统一路径真相;crawl 产物在 data/crawl/)

CRAWLER = _HERE / "bfs_crawler.py"
OUT_ROOT = _paths.DATA / "crawl"

# 一省一条:slug / 种子 / 深度 / 页数上限 / keyword(仅扁平站)。
# 深度与上限按 2026-08-03 实测定:MB 全站 324 页、BC 区 33 页、SK 区层级深所以 depth 3。
SEEDS: list[dict] = [
    {"slug": "mb-root",      "seed": "https://immigratemanitoba.com/", "depth": 2, "max_pages": 500},
    {"slug": "ns-root",      "seed": "https://liveinnovascotia.com/", "depth": 2, "max_pages": 400},
    # NB 种子带 .html → 子页不共享路径前缀,必须走 keyword 限域(首轮只爬到 1 页的教训)
    {"slug": "nb-imm",       "seed": "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration.html",
     "depth": 3, "max_pages": 400, "keywords": "/promo/immigration"},
    # NL 区含新闻存档,首轮顶到 500 上限(地图可能不全)→ 抬到 800
    {"slug": "nl-imm",       "seed": "https://www.gov.nl.ca/immigration/", "depth": 3, "max_pages": 800},
    {"slug": "sk-sinp",      "seed": "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/"
                                     "live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program",
     "depth": 3, "max_pages": 400},
    {"slug": "bc-immigrate", "seed": "https://www.welcomebc.ca/immigrate-to-b-c", "depth": 3, "max_pages": 400},
    {"slug": "ab-aaip",      "seed": "https://www.alberta.ca/alberta-advantage-immigration-program",
     "depth": 2, "max_pages": 400, "keywords": "aaip"},
    {"slug": "on-oinp",      "seed": "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp",
     "depth": 2, "max_pages": 400, "keywords": "oinp,ontario-immigrant,workforce-priority"},
    # PE 在 Radware 后面 → 依赖浏览器兜底(重镜像内);本机 .venv 无 playwright 时此条会失败,属预期
    # ⚠️ PE 已知盲区(2026-08-03 实测):Radware EUDA 连**有头**自动化浏览器都识别(CDP 探测),
    # 壳指纹(eudaenableagent)已能认出并转浏览器,但浏览器拿回的仍是壳 → 地图停在 1 页。
    # 口径数据不受影响:PE 的门槛/清单一直走官方指南 PDF(文件服务器不设防)。
    # 有墙一律并发 1(Frank 2026-08-03:「有墙的不要并发」)——httpx 层单线程,撞墙逐页转浏览器,
    # 浏览器侧 browser_fetch 自带单标签串行 + network-idle/滚动等待,无需再管
    {"slug": "pe-imm",       "seed": "https://www.princeedwardisland.ca/en/information/office-of-immigration",
     "depth": 3, "max_pages": 300, "keywords": "office-of-immigration,immigration", "concurrency": 1},
    # QC 2026-08-03 Frank 改拍入列:quebec.ca 无墙;英文区路径天然限域
    {"slug": "qc-imm",       "seed": "https://www.quebec.ca/en/immigration", "depth": 3, "max_pages": 600},
    # ── 偏远地区(2026-08-03 Frank:「偏远地区也加上」)────────────────────────────
    # 三地区各有提名计划;联邦 RCIP/FCIP(偏远/法语社区试点)= 雇主驱动、社区推荐的 PR 通道。
    # YT/NU 在 Cloudflare 后面(403)→ 浏览器兜底;无头模式过不了交互式验证框时会单省失败,
    # 不拖全轮 —— 真要解锁得在有头环境点一次验证框(profile 落盘后续免检,见 browser_fetch 头注)。
    {"slug": "nt-imm",       "seed": "https://www.immigratenwt.ca/", "depth": 2, "max_pages": 300},
    {"slug": "yt-imm",       "seed": "https://yukon.ca/en/immigrate-yukon",
     "depth": 2, "max_pages": 300, "keywords": "immigrat,nominee", "concurrency": 1},
    # ⚠️ NU 已知盲区(2026-08-03 实测):gov.nu.ca 的 Cloudflare 质询连**有头**浏览器都不自动清,
    # fetch 返回质询页(且 browser_fetch 的等待逻辑没拦住,疑似标题闪变竞态 —— 待查)。
    # 先留种子每周试(失败不拖全轮);NU 提名计划内容少,真要抓口径走官方 PDF 路线。
    {"slug": "nu-imm",       "seed": "https://www.gov.nu.ca/edt/programs-services/nunavut-nominee-program",
     "depth": 2, "max_pages": 200, "keywords": "nominee,immigrat", "concurrency": 1},
    # canada.ca 扁平路径 → keyword 限域;httpx 直通(memory:canada.ca 多数页容器直取)
    {"slug": "fed-rcip",     "seed": "https://www.canada.ca/en/immigration-refugees-citizenship/services/"
                                     "immigrate-canada/rural-franco-pilots.html",
     "depth": 3, "max_pages": 300, "keywords": "rural-franco,rural-community,francophone-community"},
    # B1-4 PGWP 规则库(2026-08-03,铁律 4「没有数据先补 URL」):时长叠加 / field-of-study 的官方页。
    # canada.ca 扁平路径同 fed-rcip;PGWP 规则全挂在 study-canada/work 区(after-graduation 一族)
    {"slug": "fed-pgwp",     "seed": "https://www.canada.ca/en/immigration-refugees-citizenship/services/"
                                     "study-canada/work/after-graduation.html",
     "depth": 3, "max_pages": 200, "keywords": "after-graduation,post-graduation,study-canada/work"},
    # E13-08(2026-08-07)雷区判定的两条通道锚页,进周更当政策雷达(diff 报了才知道口径常量过期):
    # AIP job offer TEER 0-4 原句在 how-to-immigrate/job-offer.html;保育专项四 NOC 在 child-care-home-support/eligibility.html
    {"slug": "fed-aip",      "seed": "https://www.canada.ca/en/immigration-refugees-citizenship/services/"
                                     "immigrate-canada/atlantic-immigration.html",
     "depth": 2, "max_pages": 60, "keywords": "atlantic-immigration"},
    {"slug": "fed-caregiver", "seed": "https://www.canada.ca/en/immigration-refugees-citizenship/services/"
                                      "immigrate-canada/caregivers.html",
     "depth": 2, "max_pages": 60, "keywords": "caregivers,home-care-worker"},
    # 联邦 Express Entry(2026-08-05,铁律「URL → 数据 → SQL」):CRS 计分表 + CEC/FSW/FST 资格页。
    # 种子不是猜的 —— 用 raw/ee/federal-categories.json 里已举证的官方 URL 起爬,靠 keyword 限域
    # 展开整个 express-entry 区(who-can-apply 一族 = 资格;check-score/criteria = CRS 计分)。
    {"slug": "fed-ee",       "seed": "https://www.canada.ca/en/immigration-refugees-citizenship/services/"
                                     "immigrate-canada/express-entry/rounds-invitations/category-based-selection.html",
     "depth": 4, "max_pages": 300, "keywords": "express-entry"},
]


def urls_of(manifest: Path) -> set[str]:
    if not manifest.exists():
        return set()
    try:
        d = json.loads(manifest.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001 — 上一份坏了就当空,diff 会把全量报成新增(宁多报不漏报)
        return set()
    return {p["url"] if isinstance(p, dict) else p for p in d.get("pages", [])}


def main() -> None:
    only = sys.argv[1] if len(sys.argv) > 1 else None
    ok = 0
    for cfg in SEEDS:
        if only and cfg["slug"] != only:
            continue
        slug_dir = OUT_ROOT / cfg["slug"]
        manifest = slug_dir / "manifest.json"
        prev = slug_dir / "manifest-prev.json"
        if manifest.exists():
            slug_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(manifest, prev)
        before = urls_of(prev)

        cmd = [sys.executable, str(CRAWLER), "discover", cfg["seed"], cfg["slug"],
               "--depth", str(cfg["depth"]), "--max-pages", str(cfg["max_pages"])]
        if cfg.get("keywords"):
            cmd += ["--keywords", cfg["keywords"]]
        if cfg.get("concurrency"):
            cmd += ["--concurrency", str(cfg["concurrency"])]
        print(f"→ {cfg['slug']}  {cfg['seed']}")
        r = subprocess.run(cmd, cwd=str(_HERE), timeout=1800)
        if r.returncode != 0 or not manifest.exists():
            print(f"  ✗ {cfg['slug']} 探索失败(exit {r.returncode}),保留上一份地图")
            continue

        after = urls_of(manifest)
        added, gone = sorted(after - before), sorted(before - after)
        (slug_dir / "changes.json").write_text(json.dumps({
            "slug": cfg["slug"], "date": date.today().isoformat(),
            "total": len(after), "added": added, "gone": gone,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        ok += 1
        if before and (added or gone):
            # 政策雷达:diff 打进日志。首轮(before 为空)不刷屏,只报总数。
            print(f"  ⚠ {cfg['slug']} 站点地图变了:+{len(added)} / -{len(gone)}")
            for u in added[:20]:
                print(f"    + {u}")
            for u in gone[:20]:
                print(f"    - {u}")
        else:
            print(f"  ✓ {cfg['slug']} {len(after)} 页" + ("(首轮建档)" if not before else ",无变化"))

    if ok == 0:
        print("✗ 没有任何一省探索成功 —— 网络或封锁问题,本轮作废")
        sys.exit(1)
    print(f"===== 探索完成:{ok}/{len([c for c in SEEDS if not only or c['slug'] == only])} 省 =====")


if __name__ == "__main__":
    main()

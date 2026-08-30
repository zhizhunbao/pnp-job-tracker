"""通道门槛清单(gate manifest)取证器 —— 设计见 docs/design/通道判定口径根治-20260812.md §3.1。

从 data/crawl/<slug>/html_cache 里捞三类闸的**官方候选原句**,给人工核定用。
只读缓存、只打印,不写任何东西;**不猜 URL**(页面来源全部来自 crawl manifest,铁律 URL→数据→SQL)。

用法:  python etl/scan_gate_quotes.py [pathway-key ...]
"""
from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser

from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 paths 等共享库
from paths import DATA  # 唯一路径真相来源

CRAWL = DATA / 'crawl'

# 13 条通道 → (crawl slug, 页面 URL 必须命中的正则)。URL 形态取自各 manifest 实际抓到的页。
PATHWAYS: dict[str, tuple[str, str]] = {
    'FED-EE':         ('fed-ee',       r'express-entry'),
    'AIP':            ('fed-aip',      r'atlantic-immigration'),
    'RCIP':           ('fed-rcip',     r'rural-community|rural-franco'),
    'ON-workforce':   ('on-oinp',      r'ontario-workforce-priority-stream$'),
    'NB-sw':          ('nb-imm',       r'.'),
    'NS-sw':          ('ns-root',      r'skilled-worker'),
    'SK-offer':       ('sk-sinp',      r'employment-offer|international-skilled-worker'),
    'MB-swm':         ('mb-mpnp',      r'skilled-worker/swm'),
    'AB-opportunity': ('ab-aaip',      r'alberta-opportunity-stream(-eligibility)?$'),
    'BC-sw':          ('bc-immigrate', r'skills-immigration|skilled-worker|eligibility'),
    'BC-build':       ('bc-immigrate', r'skills-immigration|skilled-worker|eligibility'),
    'NL-intl-grad':   ('nl-imm',       r'international-graduate'),
    'PE-sw':          ('pe-imm',       r'.'),
}

# 有些省的资格条文**根本不在 crawl 里**:官方 HTML 页挡在 WAF 后(PE 的 Radware)、或页面只写
# 「完整条件见指南 PDF」(BC)。这类通道的原句要去官方 PDF 里捞 —— 否则取证器扫完 crawl 一无所获,
# 就把「我们没抓」记成了「官方没写」(2026-08-12 实撞:PE-sw 三类闸全标 unknown,而门槛行本来就出自这份 PDF)。
# 🔴 URL **不是猜的**:逐条抄自已在跑的 ETL 脚本里的常量,注明出处,改了那边这里也要跟。
PDF_SOURCES: dict[str, list[str]] = {
    # etl/pnp/build_pe_req.py:GUIDE_URL(HTML 页在 Radware 后面,文件服务器不挡)
    'PE-sw': ['https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf'],
    # etl/pnp/build_bc_req.py:PDF_URL(welcomebc 那页原句把完整条件推给这份指南:
    # 「For complete information about eligibility and requirements, please see the Skills Immigration Program Guide.」)
    'BC-sw': ['https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf'],
    'BC-build': ['https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf'],
}

# 三类闸的判据词。宁可多捞几句让人筛,也不要漏 —— 漏了就等于又一次「没有行=没有闸」。
GATES: dict[str, str] = {
    'offer':            r'\bjob offer\b|\boffer of employment\b|\bemployment offer\b|\bfull-?time.{0,20}offer\b',
    'statusInCanada':   r'\bwork permit\b|\bcurrently (?:working|living|residing)\b|\bvalid (?:status|temporary resident)\b|\bresiding in\b|\blegally (?:authorized|entitled) to work\b',
    'credentialCanada': r'\bgraduat(?:e|ed|ion)\b.{0,60}\b(?:Canad|institution|university|college)|\bpost-?graduation work permit\b|\bPGWP\b|\bcredential from a\b',
}


class Text(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.buf: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'nav', 'footer'):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'nav', 'footer') and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip and data.strip():
            self.buf.append(data.strip())


def plain(html: str) -> str:
    p = Text()
    try:
        p.feed(html)
    except Exception:
        pass
    return re.sub(r'\s+', ' ', ' '.join(p.buf))


def sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r'(?<=[.;:])\s+(?=[A-Z(])', text) if 25 <= len(s.strip()) <= 320]


def scan_pdf(key: str) -> None:
    """官方 PDF 里捞候选句(WAF 挡着 HTML、或页面把条件推给指南 PDF 的通道走这条)。"""
    import fitz          # 与 build_pe_req 同一套解析器,不另立一套
    import httpx
    ua = {'User-Agent': 'Mozilla/5.0 (compatible; offer2pr/1.0; +https://offer2pr.com)'}
    for url in PDF_SOURCES.get(key, []):
        try:
            with fitz.open(stream=httpx.get(url, headers=ua, follow_redirects=True, timeout=60).content,
                           filetype='pdf') as doc:
                text = re.sub(r'\s+', ' ', ' '.join(pg.get_text() for pg in doc))
        except Exception as e:                      # noqa: BLE001
            print(f'   ❌ PDF 取不到({e})—— 落 not-collected,不猜')
            continue
        print(f'  ── PDF {url.rsplit("/", 1)[-1]}  {len(text)} 字')
        for gate, pat in GATES.items():
            hits = [s for s in sentences(text) if re.search(pat, s, re.I)]
            print(f'  ── {gate}: {len(hits)} 句')
            for s in hits[:6]:
                print(f'     · {s[:260]}')


def scan(key: str) -> None:
    slug, url_re = PATHWAYS[key]
    man_path = CRAWL / slug / 'manifest.json'
    if not man_path.exists():
        print(f'\n### {key}  ❌ 无 crawl(slug={slug}) —— 按铁律落 not-collected,不猜')
        return
    man = json.loads(man_path.read_text(encoding='utf-8'))
    pages = [p for p in man['pages'] if p.get('status') == 200 and re.search(url_re, p['url'], re.I)]
    print(f'\n### {key}  slug={slug}  抓于 {man.get("crawled_at", "")[:10]}  命中页 {len(pages)}')
    if not pages:
        print('   ❌ 该 slug 下没有匹配的页 —— 落 not-collected')
        return
    seen: set[str] = set()
    for gate, pat in GATES.items():
        hits: list[tuple[str, str]] = []
        for pg in pages[:6]:
            f = CRAWL / slug / 'html_cache' / pg['html']
            if not f.exists():
                continue
            for s in sentences(plain(f.read_text(encoding='utf-8', errors='ignore'))):
                if re.search(pat, s, re.I) and s not in seen:
                    seen.add(s)
                    hits.append((s, pg['url']))
        print(f'  ── {gate}: {len(hits)} 句')
        for s, u in hits[:3]:
            print(f'     · {s[:230]}')
            print(f'       {u}')


if __name__ == '__main__':
    keys = sys.argv[1:] or list(PATHWAYS)
    for k in keys:
        if k in PATHWAYS or k in PDF_SOURCES:
            if k in PATHWAYS:
                scan(k)
            if k in PDF_SOURCES:
                print(f'\n### {k}  官方 PDF 源 {len(PDF_SOURCES[k])} 份')
                scan_pdf(k)
        else:
            print(f'未知通道 {k}')

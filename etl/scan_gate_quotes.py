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

from _paths import DATA  # 唯一路径真相来源

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
        if k in PATHWAYS:
            scan(k)
        else:
            print(f'未知通道 {k}')

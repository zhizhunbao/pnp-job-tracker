"""scrape_immigration_news — news 源入口:母脚本驱动全部子源 + AI 中文翻译/速读(E12-06)。

  IN : (网络)IRCC Atom + MB RSS + NS/BC/AB/ON 官方页(P0 2026-07-18 逐源实测清单见
       docs/implementation/E12-移民路径引擎/06 §4;SK 无专页/PE Radware 挡/NL 无新闻页,不硬上)
  OUT: raw/news/news.json   (按 URL 累积去重;一子源挂只丢该子源;只增不缩防线)

抓取通用件全在 etl/_scrape_base.py(#55 §2.5 母/子框架,news=首个原生样板);本文件只做
两件事:① 声明子源清单交给母跑;② 对新增条目直调 Anthropic(haiku,与顾问同模型)产出
段对段中文翻译 bodyZh + 速读 summaryZh,随行存 raw = 幂等缓存(只对没翻过的条目调用)。
ANTHROPIC_API_KEY 未设 = 跳过翻译只抓原文(运维项:key 进 docker/.env,Frank 拍板 2026-07-18);
grounding 红线:只喂抓到的官方正文,禁外推,展示层标「AI 翻译·以原文为准」。

Usage:  uv run python etl/news/scrape_immigration_news.py
"""
import json
import os
import re
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 _paths/_scrape_base
import _paths  # noqa: E402
import _scrape_base  # noqa: E402
from scrape_ab_aaip_news import SOURCE as AB  # noqa: E402
from scrape_bc_pnp_news import SOURCE as BC  # noqa: E402
from scrape_ircc_newsroom import SOURCE as IRCC  # noqa: E402
from scrape_mb_mpnp_news import SOURCE as MB  # noqa: E402
from scrape_ns_nsnp_news import SOURCE as NS  # noqa: E402
from scrape_on_oinp_news import SOURCE as ON  # noqa: E402
from scrape_qc_mifi_news import SOURCE as QC  # noqa: E402
from scrape_sk_immigration_news import SOURCE as SK  # noqa: E402

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")

OUT_FILE = _paths.NEWS / "news.json"

SOURCES = [IRCC, BC, AB, MB, NS, ON, SK, QC]

# ---- AI 翻译+重要度(build 轮直调;新增条目才调,公告频率低成本忽略不计)----
LLM_MODEL = "claude-haiku-4-5"      # 与顾问同模型(cms/src/lib/llm.ts 口径)
# 每轮上限(首轮回填分几轮摊平,12h 一轮追平只是时间问题);一次性回填时用 env 临时放大
MAX_TRANSLATE_PER_RUN = int(os.environ.get("NEWS_TRANSLATE_BUDGET", "12"))
BODY_CAP = 10000                    # 喂给 LLM 的原文上限(新闻稿一般 <8k 字符)

# 输出用哨兵行分隔的纯文本(不用 JSON:长译文里的引号/换行会破坏 JSON 转义,实测 4/12 解析失败)
# P1d(Frank 2026-07-18):同一调用顺带产「重要度 1-5」——对找工/移民读者的实际影响打分,
# 展示=列表「重要」徽标,非资格判定;只依据原文,禁编。
PROMPT = """你是移民政策新闻的专业中译者兼编辑。下面是一篇加拿大官方移民新闻的英文原文(标题+正文)。
只依据原文内容,禁止外推、补充背景或编造;专有名词(项目名/流名/NOC 等)首次出现时保留英文原文并附中文说明。

输出三部分,除此之外不要任何多余说明:
1. 第一行,固定格式「重要度: N | 一句中文理由」。N 为 1-5 整数,衡量对正在找工作/办移民的读者的实际影响:
   5=直接影响资格或分数的政策变化/抽选结果(改制、新清单、抽选分数线);4=项目动态与重要数据;
   3=一般性项目新闻;2=人事/活动/拨款类;1=礼节性声明(节日致辞等)。
2. 之后是 2-3 句中文速读,说人话,讲清「发生了什么、对谁有影响」。
3. 单独一行「<<<BODY>>>」之后:段对段的中文全文翻译。原文用空行分段(以「• 」开头的行是列表项),
   译文保持完全相同的分段结构,不合并、不遗漏。

标题:{title}

正文:
{body}"""

IMP_RE = re.compile(r"^重要度[::]\s*([1-5])\s*[|丨]\s*(.+)$")


def translate_missing(out_file: Path) -> None:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not key:
        print("translate: ANTHROPIC_API_KEY 未设,跳过(只抓原文;key 进 docker/.env 后下轮自动补翻)")
        return
    data = json.loads(out_file.read_text(encoding="utf-8"))
    todo = [it for it in data["items"] if it.get("bodyEn") and not it.get("summaryZh")]
    if not todo:
        print("translate: 无待翻条目")
        return
    done = 0
    with httpx.Client(base_url="https://api.anthropic.com", timeout=120,
                      headers={"x-api-key": key, "anthropic-version": "2023-06-01"}) as c:
        for it in todo[:MAX_TRANSLATE_PER_RUN]:
            try:
                r = c.post("/v1/messages", json={
                    "model": LLM_MODEL, "max_tokens": 8000,
                    "messages": [{"role": "user", "content": PROMPT.format(
                        title=it["title"], body=it["bodyEn"][:BODY_CAP])}],
                })
                r.raise_for_status()
                text = "".join(b.get("text", "") for b in r.json()["content"]).strip()
                summary, sep, body = text.partition("<<<BODY>>>")
                if not (sep and summary.strip() and body.strip()):
                    raise ValueError("missing <<<BODY>>> sentinel in LLM output")
                summary = summary.strip()
                # 首行=重要度(P1d);解析不出不硬猜,留空只少个徽标
                first, _, rest = summary.partition("\n")
                m = IMP_RE.match(first.strip())
                if m:
                    it["importance"], it["importanceNote"] = int(m.group(1)), m.group(2).strip()
                    summary = rest.strip()
                it["summaryZh"], it["bodyZh"] = summary, body.strip()
                done += 1
            except Exception as e:  # noqa: BLE001  # 单条失败不断轮,留空下轮重试
                print(f"  ! translate {it['url']}: {type(e).__name__}: {e}")
    if done:
        _scrape_base.atomic_write_json(out_file, data)
    print(f"translate: {done}/{len(todo)} 条完成" +
          (f"(剩 {len(todo) - done} 条下轮续)" if len(todo) > done else ""))


if __name__ == "__main__":
    _scrape_base.run(SOURCES, OUT_FILE)
    translate_missing(OUT_FILE)

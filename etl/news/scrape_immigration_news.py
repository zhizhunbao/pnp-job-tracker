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

# ---- AI 翻译+重要度(build 轮直调;新增条目才调)----
# 双后端(Frank 2026-07-18:「翻译用本地大模型」,API 账单 $3 阈值触发):
#   NEWS_LLM_BASE 设置(如 http://192.168.1.150:11434)→ 走局域网 Ollama(实测 qwen3.6 中/韩 16s/9s 每条,
#   编号全守,零 API 费);未设 → Anthropic haiku(与顾问同模型)。局域网盒不在=该轮翻译跳过,下轮重试。
LLM_BASE = os.environ.get("NEWS_LLM_BASE", "").strip().rstrip("/")
LLM_LOCAL_MODEL = os.environ.get("NEWS_LLM_MODEL", "qwen3.6:latest")
LLM_MODEL = "claude-haiku-4-5"      # Anthropic 兜底(cms/src/lib/llm.ts 口径)
# 每轮上限(首轮回填分几轮摊平,12h 一轮追平只是时间问题);一次性回填时用 env 临时放大
MAX_TRANSLATE_PER_RUN = int(os.environ.get("NEWS_TRANSLATE_BUDGET", "12"))
BODY_CAP = 10000                    # 喂给 LLM 的原文上限(新闻稿一般 <8k 字符)

# 输出用哨兵行分隔的纯文本(不用 JSON:长译文里的引号/换行会破坏 JSON 转义,实测 4/12 解析失败)
# P1d(Frank 2026-07-18):同一调用顺带产「重要度 1-5」——对找工/移民读者的实际影响打分,
# 展示=列表「重要」徽标,非资格判定;只依据原文,禁编。
# 对齐协议 v2(Frank 实测抓到 MB 长稿全线错位):原文逐段编号 [1..N] 喂入,译文逐段带 [k] 回来,
# **按编号对位**;缺号/空段=整条判失败留空重试——bodyZh 存在即必与原文段对段对齐(前端按序配对的前提)。
PROMPT = """你是移民政策新闻的专业中译者兼编辑。下面是一篇加拿大官方移民新闻(标题+逐段编号的正文,共 {n} 段)。
只依据原文内容,禁止外推、补充背景或编造;专有名词(项目名/流名/NOC 等)首次出现时保留英文原文并附中文说明;
纯文本输出,禁用 Markdown 记号(不要 **、# 等)。

输出三部分,除此之外不要任何多余说明:
1. 第一行,固定格式「重要度: N | 一句中文理由」。N 为 1-5 整数,衡量对正在找工作/办移民的读者的实际影响:
   5=直接影响资格或分数的政策变化/抽选结果(改制、新清单、抽选分数线);4=项目动态与重要数据;
   3=一般性项目新闻;2=人事/活动/拨款类;1=礼节性声明(节日致辞等)。
2. 之后是 2-3 句中文速读,说人话,讲清「发生了什么、对谁有影响」。
3. 单独一行「<<<BODY>>>」之后:逐段翻译。每段以「[段号] 」开头,段间空行;
   必须从 [1] 到 [{n}] 每段都有,不合并、不遗漏、不新增段号。

标题:{title}

正文:
{body}"""

# 韩语翻译层(Frank 2026-07-18:「点了韩语就是翻译成韩语」):同编号协议,独立调用;
# 重要度只在中文调用里产(单一来源),韩语调用只出 요약+번역。
PROMPT_KO = """당신은 이민 정책 뉴스 전문 번역가입니다. 아래는 캐나다 공식 이민 뉴스입니다(제목 + 문단 번호가 붙은 본문, 총 {n}개 문단).
원문 내용에만 근거하고 외삽·배경 보충·창작을 금지합니다; 고유명사(프로그램명/스트림명/NOC 등)는 처음 나올 때 영어 원문을 유지하고 한국어 설명을 덧붙입니다;
순수 텍스트로 출력하고 Markdown 기호(**, # 등)를 쓰지 마십시오.

두 부분을 출력하고 그 외 어떤 설명도 붙이지 마십시오:
1. 먼저 2-3문장의 한국어 요약: 무엇이 일어났고 누구에게 영향이 있는지 쉽게 설명.
2. 단독 한 줄 「<<<BODY>>>」 뒤: 문단별 번역. 각 문단은 「[번호] 」로 시작, 문단 사이 빈 줄;
   [1]부터 [{n}]까지 모든 문단 필수, 병합·누락·추가 금지.

제목:{title}

본문:
{body}"""

IMP_RE = re.compile(r"^重要度[::]\s*([1-5])\s*[|丨]\s*(.+)$")
SEG_RE = re.compile(r"\n?\[(\d+)\]\s*")


def _strip_md(s: str) -> str:
    """剥 LLM 溜出来的 Markdown 记号(**粗体**/行首 #);正文是纯文本渲染,记号=噪音。"""
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    return re.sub(r"^#+\s*", "", s, flags=re.M).replace("**", "")


def parse_numbered_body(body_out: str, n: int) -> str:
    """按编号解析译文 → 与原文同序同段数的 bodyZh;缺号/空段=抛错(整条重试,不出错位页面)。"""
    parts = SEG_RE.split(body_out)
    d: dict[int, str] = {}
    for k, txt in zip(parts[1::2], parts[2::2]):
        t = _strip_md(txt).strip()
        if t:
            d[int(k)] = t
    missing = [k for k in range(1, n + 1) if k not in d]
    if missing:
        raise ValueError(f"paragraph alignment: missing {missing[:5]}{'…' if len(missing) > 5 else ''} of {n}")
    return "\n\n".join(d[k] for k in range(1, n + 1))


def translate_missing(out_file: Path) -> None:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not (LLM_BASE or key):
        print("translate: NEWS_LLM_BASE/ANTHROPIC_API_KEY 均未设,跳过(只抓原文)")
        return
    data = json.loads(out_file.read_text(encoding="utf-8"))
    # 待翻队列=(条目, 目标语) 对:zh 缺 summaryZh / ko 缺 summaryKo(各自独立补,预算按调用数计)
    todo = [(it, lang) for it in data["items"] if it.get("bodyEn")
            for lang in ("zh", "ko") if not it.get("summaryZh" if lang == "zh" else "summaryKo")]
    if not todo:
        print("translate: 无待翻条目")
        return
    done = 0
    with httpx.Client(base_url=LLM_BASE or "https://api.anthropic.com", timeout=300,
                      headers={} if LLM_BASE else {"x-api-key": key, "anthropic-version": "2023-06-01"}) as c:
        def call_llm(prompt: str) -> str:
            if LLM_BASE:  # Ollama:/api/generate,think 关(qwen3 系默认思维链输出,剥 <think> 双保险)
                r = c.post("/api/generate", json={"model": LLM_LOCAL_MODEL, "prompt": prompt,
                                                  "stream": False, "think": False,
                                                  "options": {"num_predict": 8000}})
                r.raise_for_status()
                return re.sub(r"<think>.*?</think>", "", r.json()["response"], flags=re.S).strip()
            r = c.post("/v1/messages", json={"model": LLM_MODEL, "max_tokens": 8000,
                                             "messages": [{"role": "user", "content": prompt}]})
            r.raise_for_status()
            return "".join(b.get("text", "") for b in r.json()["content"]).strip()

        for it, lang in todo[:MAX_TRANSLATE_PER_RUN]:
            try:
                # 逐段编号喂入(整段计预算,不在段中间截断——截半段编号就废了)
                paras: list[str] = []
                used = 0
                for p in (s.strip() for s in it["bodyEn"].split("\n\n")):
                    if not p:
                        continue
                    if used + len(p) > BODY_CAP and paras:
                        break  # 超长稿只翻前 N 整段,尾段对照缺=只显英文,不错位
                    paras.append(p)
                    used += len(p)
                numbered = "\n\n".join(f"[{i + 1}] {p}" for i, p in enumerate(paras))
                tpl = PROMPT if lang == "zh" else PROMPT_KO
                text = call_llm(tpl.format(title=it["title"], n=len(paras), body=numbered))
                summary, sep, body = text.partition("<<<BODY>>>")
                if not (sep and summary.strip() and body.strip()):
                    raise ValueError("missing <<<BODY>>> sentinel in LLM output")
                summary = _strip_md(summary.strip())
                if lang == "zh":
                    # 首行=重要度(P1d,只在中文调用产;解析不出不硬猜,留空只少个徽标)
                    first, _, rest = summary.partition("\n")
                    m = IMP_RE.match(first.strip())
                    if m:
                        it["importance"], it["importanceNote"] = int(m.group(1)), m.group(2).strip()
                        summary = rest.strip()
                    it["summaryZh"], it["bodyZh"] = summary, parse_numbered_body(body, len(paras))
                else:
                    it["summaryKo"], it["bodyKo"] = summary, parse_numbered_body(body, len(paras))
                done += 1
            except Exception as e:  # noqa: BLE001  # 单条失败不断轮,留空下轮重试
                print(f"  ! translate[{lang}] {it['url']}: {type(e).__name__}: {e}")
    if done:
        _scrape_base.atomic_write_json(out_file, data)
    print(f"translate: {done}/{len(todo)} 调用完成" +
          (f"(剩 {len(todo) - done} 下轮续)" if len(todo) > done else ""))


if __name__ == "__main__":
    _scrape_base.run(SOURCES, OUT_FILE)
    translate_missing(OUT_FILE)

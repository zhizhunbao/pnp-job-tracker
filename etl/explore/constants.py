"""
explore 域常量 —— 全部字面量住这(零字符串令:functions 体内不写字面量)。
分段镜像 functions:1 入口与接线 → 2 取活 / 交活 → 3 模型 → 4 回答解析与校验 → 5 打印模板。
"""
import re

# =========================================================================
# 1. 入口与接线(站点根 / 钥匙 / 盒子,全走环境变量)
# =========================================================================

ENV_SEED_URL = "SEED_URL"
"""灌库端点的环境变量(与 load 域同一个;本域只用它反推站点根)。"""

ENV_SEED_TOKEN = "SEED_TOKEN"
"""cms 钥匙的环境变量(与上传 mart / 灌库同一把)。"""

HDR_SEED_TOKEN = "x-seed-token"
"""cms 钥匙的请求头名。"""

SCHEME_SEP = "://"
"""URL 协议分隔(从 SEED_URL 反推站点根)。"""

ENV_LLM_BASE = "NEWS_LLM_BASE"
"""局域网 Ollama 基址的环境变量(不另立名字:一台盒子一个变量)。"""

ENV_LLM_MODEL = "NEWS_LLM_MODEL"
"""局域网模型名的环境变量(缺省 LLM_MODEL_DEFAULT)。"""

LLM_MODEL_DEFAULT = "qwen3.6:latest"
"""盒子上的默认模型。"""

URL_TAIL_SLASH = "/"
"""基址末尾要削掉的斜杠。"""

FIELD_NONE = ""
"""「没有」的占位:空串。"""

# =========================================================================
# 2. 取活 / 交活(cms 接口)
# =========================================================================

PATH_TODO = "/api/employers/explore/todo"
"""取活端点(GET,带钥匙)。"""

PATH_DONE = "/api/employers/explore/done"
"""交活端点(POST,带钥匙)。"""

P_LIMIT = "limit"
"""取活的条数参数名。"""

K_TODOS = "todos"
"""取活响应体:待办清单键。"""

K_KEY = "key"
"""待办 / 结果:池主键。"""

K_NAME = "name"
"""待办:雇主名。"""

K_RESULTS = "results"
"""交活请求体:结果清单键。"""

K_STATUS = "status"
"""结果:状态键。"""

K_ALIAS_ZH = "aliasZh"
"""结果:中文译名键。"""

K_ALIAS_KO = "aliasKo"
"""结果:韩文译名键。"""

K_NOTE = "note"
"""结果:备注键。"""

ST_DONE = "done"
"""结果状态:翻好了(译名可能为空 —— 品牌名本来就只有拉丁字母写法,空着比硬翻好)。"""

ST_SKIP = "skip"
"""结果状态:跳过(人名雇主;板上连已有的音译也不显示)。"""

ST_FAIL = "fail"
"""结果状态:这条没翻成(模型回答不成形;不再重取,免得一条坏名字每轮都来一遍)。"""

FLUSH_N = 20
"""每攒多少条交一次活(中途被杀不丢已翻的)。"""

HTTP_TIMEOUT_S = 240
"""HTTP 超时秒(盒子同时给 jdformat / classify / company 用,排队时会慢)。"""

# =========================================================================
# 3. 模型(局域网 Ollama)
# =========================================================================

PATH_OLLAMA_GENERATE = "/api/generate"
"""Ollama 单轮生成端点。"""

P_MODEL = "model"
"""请求体:模型名。"""

P_PROMPT = "prompt"
"""请求体:提示词。"""

P_STREAM = "stream"
"""请求体:流式开关(一律 False)。"""

P_THINK = "think"
"""请求体:思维链开关(qwen3 系一律关)。"""

P_OPTIONS = "options"
"""请求体:采样参数容器。"""

P_NUM_PREDICT = "num_predict"
"""请求体:生成上限。"""

P_TEMPERATURE = "temperature"
"""请求体:温度。"""

P_RESPONSE = "response"
"""响应体:正文键。"""

THINK_RE = re.compile(r"<think>.*?</think>", re.S)
"""剥 think 块(think 关了仍双保险)。"""

STRIP_REPL = ""
"""正则剥除的替身。"""

LLM_TEMPERATURE = 0.1
"""温度:译名要稳,不要每次换一个说法。"""

GEN_TOKENS = 120
"""生成上限 token:三行短答,给足余量。⚠ 不带 num_ctx(jdformat 实撞:换窗口会让 Ollama 重载模型)。"""

NAME_MAX_LEN = 160
"""喂给模型的雇主名最长字符数。"""

PROMPT_HEAD = (
    "You label Canadian employer names for a job board used by Chinese and Korean speakers.\n"
    "Answer with exactly three lines and nothing else:\n"
    "PERSON=yes or no\n"
    "ZH=<name in Simplified Chinese>\n"
    "KO=<name in Korean>\n"
    "Rules:\n"
    "- PERSON=yes only when the whole name is a private individual's personal name (for example a family hiring a "
    "caregiver: 'Maria Theresa Gerongay', 'Angelo and Augusta Uliana'). Companies named after a person with a business "
    "word (Inc, Ltd, Law, Farms, Dental, Construction...) are PERSON=no.\n"
    "- When PERSON=yes leave ZH and KO empty.\n"
    "- Use the established Chinese / Korean brand name when one exists (Subway = 赛百味, not 地铁; "
    "Tim Hortons = 蒂姆霍顿; Scotiabank = 丰业银行).\n"
    "- Never translate a brand word literally by its dictionary meaning.\n"
    "- If the brand has no established translation, keep the brand word in its original Latin letters and translate only "
    "the generic words (Englobe Corp. = Englobe 公司; Town of Hinton = Hinton 镇).\n"
    "- If nothing in the name can be translated, leave ZH and KO empty.\n"
    "Name: "
)
"""提示词(给模型看的,英文;雇主名接在末尾)。三行定式答案,便于逐行解析;「品牌名不许按字面意思直译」是
2026-09-18 板上实拍「Subway → 地铁」的教训。"""

# =========================================================================
# 4. 回答解析与校验
# =========================================================================

PERSON_RE = re.compile(r"^\s*PERSON\s*=\s*(yes|no)\s*$", re.I | re.M)
"""回答里的人名判定行。"""

ZH_RE = re.compile(r"^\s*ZH\s*=(.*)$", re.I | re.M)
"""回答里的中文译名行。"""

KO_RE = re.compile(r"^\s*KO\s*=(.*)$", re.I | re.M)
"""回答里的韩文译名行。"""

PERSON_YES = "yes"
"""人名判定:是。"""

CJK_RE = re.compile(r"[\u4e00-\u9fff]")
"""含汉字(中文译名至少要有一个汉字,否则就是原样抄了一遍拉丁字母,当没有)。"""

HANGUL_RE = re.compile(r"[\uac00-\ud7a3]")
"""含韩文音节(韩文译名同理)。"""

ALIAS_MAX_LEN = 100
"""译名最长字符数(超长多半是模型在解释,当没有)。"""

NOTE_PERSON = "person"
"""备注:人名雇主。"""

NOTE_SHAPE = "shape"
"""备注:回答不成形(没有 PERSON 行)。"""

NOTE_EMPTY = "empty"
"""备注:模型空回答。"""

NOTE_HTTP_TPL = "http {status}"
"""备注 / 异常文案:接口或盒子回了非 2xx。"""

NET_ERRORS = ("ConnectError", "ConnectTimeout", "ReadTimeout", "WriteTimeout", "PoolTimeout", "RemoteProtocolError")
"""盒子连不上 / 超时的异常类名:不是这条名字的错,不记失败、整轮中止(下轮再取)。"""

# =========================================================================
# 5. 打印模板
# =========================================================================

NOTE_NO_LLM = "NEWS_LLM_BASE 未设,explore 步跳过"
"""没配盒子地址。"""

NOTE_NO_SITE = "SEED_URL 或 SEED_TOKEN 未设,explore 步跳过(取活 / 交活都要带钥匙打 cms)"
"""没配站点根或钥匙。"""

PRINT_TAKE_TPL = "取到 {n} 条待办(上限 {limit};模型 {model};站点 {base})"
"""取活之后的一行。"""

PRINT_ROW_TPL = "  {status:<4} {name} → zh「{zh}」 ko「{ko}」 {note}"
"""逐条一行。"""

PRINT_ABORT_TPL = "✗ 盒子连不上 / 超时({note}),本轮中止,剩下的下轮再取"
"""盒子掉线。"""

PRINT_DONE_TPL = "✓ 本轮:翻好 {done} · 人名跳过 {skip} · 没翻成 {fail} · 已交回 {saved}"
"""收尾一行。"""

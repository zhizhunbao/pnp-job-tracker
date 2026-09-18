"""
jdformat 域常量 —— 路径 / 环境键 / 提示词镜像 / 校验尺子 / 文案模板(照 company 三件套样张:
段横幅三行框 + N. 编号,与 scheme.py / functions.py 同名同序镜像;每个常量赋值后裸字符串 docstring)。
判据:常量只装 JSON 装得下的(标量 / 字符串表 / 正则)+ IN/OUT 路径;唯一特批 import = re 与 paths。
🔴 第 4、5 段是 cms `lib/jobs/prompts.ts`(JD_FORMAT_PROMPT_HEAD / JD_FORMAT_RETRY_TAIL)与
`lib/jobs/constants.ts`(JD_* 校验尺子)的逐字镜像:两方言无法共用一份源,改那边必同改这边
(2026-09-15 立域时对齐)。
"""
import re

import paths

# =========================================================================
# 1. 输入输出(IN/OUT 住模块头,运行时打印)
# =========================================================================

IN_MART_JOBS = paths.MART / "jobs.json"
"""汇装好的岗位表(load 域 build 链每小时产):本域只读它 —— 在招 / 正文 / 发布时间三格一处齐,
不再各源 processed 仓各读一遍(externalId 也是它定的,mart 汇装回并就按这把键)。"""

OUT_FORMATTED = paths.PROCESSED_JDFORMAT / "formatted.json"
"""本域产物:externalId → FormatRecord(ok 带整理版;fail 带由头与时刻,冷却期后重试)。
只留当前 mart 在招岗的记录(不在列的岗每轮剪掉:整理版已随上一轮 seed 进库,COALESCE 保着)。"""

TEXT_ENCODING = "utf-8"
"""读写文件的编码。"""

JSON_INDENT = 1
"""产物缩进(大表 1 省体积,同 company_brief.json)。"""

FLUSH_N = 20
"""每整理多少条落一次盘(一轮一小时,中途被杀不丢)。"""

RETRY_FAILED_DAYS = 7
"""失败记录的冷却天数:没过校验多半是这条帖本身(表格 / 全是数字),隔一周再试一次,不每轮重打。"""

# =========================================================================
# 2. mart 行与记录的键
# =========================================================================

K_EXTERNAL_ID = "externalId"
"""mart 岗位行:全站岗位身份键(jb:/ats: 前缀形)。"""

K_STATUS = "status"
"""mart 岗位行:open / campus(closed 不在 jobs.json 里)。"""

K_DESCRIPTION = "description"
"""mart 岗位行:岗位正文(Job Bank 详情回填 / 各板 ld+json;空 = 没抓到,不整理)。"""

K_DATE_POSTED = "datePosted"
"""mart 岗位行:发布日(ISO;本域按它新→旧排队 —— 新帖先有整理版,Google 先抓的也是它们)。"""

OPEN_STATUSES = ("open", "campus")
"""要整理的状态:职位板与校内板都出详情页,都要给爬虫正文。
2026-09-15 校内板页撤销,campus 帖改在主板按渠道看到,口径不变。"""

ST_OK = "ok"
"""记录状态:整理版过了校验。"""

ST_FAIL = "fail"
"""记录状态:没过校验或盒子出错(note 记由头)。"""

# =========================================================================
# 3. 模型接线(局域网 Ollama;与 news / company 同一台盒子同一个变量)
# =========================================================================

ENV_LLM_BASE = "NEWS_LLM_BASE"
"""局域网 Ollama 基址的环境变量(不另立名字:一台盒子一个变量)。"""

ENV_LLM_MODEL = "NEWS_LLM_MODEL"
"""局域网模型名的环境变量(缺省 LLM_MODEL_DEFAULT)。"""

LLM_MODEL_DEFAULT = "qwen3.6:latest"
"""盒子上的默认模型(与 cms 朋友网关的 GATEWAY_MODEL 同名同代,整理版口径一致)。"""

URL_TAIL_SLASH = "/"
"""基址末尾要削掉的斜杠。"""

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

LLM_TIMEOUT_S = 240
"""单次生成的 HTTP 超时(盒子同时给 company brief 用,排队时会慢)。"""

LLM_TEMPERATURE = 0.1
"""温度:整理是搬运不是创作,越低越不改数字。"""

GEN_TOKENS = 2000
"""生成上限 token:五节整理版实测 300~500 token,给足余量。"""

BODY_MAX_LEN = 16000
"""喂给模型的原文最长字符数(cms 走朋友网关是 20000 减提示词;盒子 Ollama 服务端默认窗口 16384 token,
4 字/token 留足余量)。⚠ 不在请求里带 num_ctx(2026-09-15 首轮实撞:显式 8192 与 company brief 的默认
16384 交替,Ollama 每次换窗口都重载模型,一条从 11 秒拖到 50~85 秒)。"""

GEN_TRIES = 2
"""最多打几次:第一次没过(多半是数字被改写)再打一次,第二次提示尾加一句照抄数字(镜像 cms JD_GEN_TRIES)。"""

# =========================================================================
# 4. 提示词(镜像 cms lib/jobs/prompts.ts —— JD_FORMAT_PROMPT_HEAD / JD_FORMAT_RETRY_TAIL)
# =========================================================================

PROMPT_HEAD = """You are reorganizing a job posting into fixed sections. STRICT RULES:
- Only move and lightly condense sentences from the posting. NEVER invent facts, numbers, requirements or benefits not present in it.
- Output plain text with EXACTLY these section markers, each on its own line: [ROLE] [REQS] [PAY] [WORKHOURS] [APPLY]
- Under [ROLE]: 1-2 sentences, what the job does. Under [REQS]: bullet lines starting with "- ", hard requirements only.
- Under [PAY]: bullet lines for pay and benefits. Under [WORKHOURS]: bullet lines for schedule, employment type, location type.
- Under [APPLY]: 1 line how to apply. If the posting says nothing for a section, write exactly: (not stated)
- Keep the posting's original language. No markdown besides "- " bullets. No section other than the five.
- Finally, on two extra lines output: [TERM]=permanent|term|casual|seasonal|unknown and [HRS]=full|part|unknown (from the posting).
Posting follows:
"""
"""整理提示词头(正文接在后面)。"""

RETRY_TAIL = """
(Reminder: copy every number, date and amount exactly as written in the posting, character for character.)"""
"""第二次(重试)时接在正文后面的一句:第一次多半是数字被改写没过校验,点名照抄。"""

# =========================================================================
# 5. 校验尺子(镜像 cms lib/jobs/constants.ts 的 JD_* 一族)
# =========================================================================

SECTION_MARKS = ("ROLE", "REQS", "PAY", "WORKHOURS", "APPLY")
"""必须齐全的五节标记(口径主人是 PROMPT_HEAD)。"""

MARK_HEAD = "["
"""节标记拼写的头(校验时 [MARK] 现拼)。"""

MARK_TAIL = "]"
"""节标记拼写的尾。"""

TERM_VALUES = ("permanent", "term", "casual", "seasonal")
"""就业性质的合法值(只补空不覆盖官方标注;unknown 不采信)。"""

HOURS_VALUES = ("full", "part")
"""工时类型的合法值。"""

TERM_RE = re.compile(r"\[TERM\]=\s*(?P<term>\w+)")
"""输出尾部 [TERM]= 行的抽取(捕获组 term,小写后须落在 TERM_VALUES 里才采信)。"""

HRS_RE = re.compile(r"\[HRS\]=\s*(?P<hrs>\w+)")
"""输出尾部 [HRS]= 行的抽取(捕获组 hrs)。"""

TAIL_STRIP_RE = re.compile(r"\[(TERM|HRS)\]=[^\n]*")
"""把尾部字段行从正文里剥掉。"""

STRIP_REPL = ""
"""剥字用的替换串(把匹配到的整段删掉)。"""

OUT_MIN_LEN = 60
"""整理版最短长度(短于它 = 没整出东西)。"""

OUT_MAX_BASE = 2000
"""整理版长度上限的基础值(与原文 1.5 倍取大)。"""

OUT_MAX_RATIO = 1.5
"""整理版长度上限相对原文的倍数。"""

DIGITS_RE = re.compile(r"\d{2,}")
"""多位数字(防幻觉校验:输出里的必须在原文出现)。"""

MARK_INLINE_RE = re.compile(r"\s*(\[(?:ROLE|REQS|PAY|WORKHOURS|APPLY)\])")
"""节标记前的空白(含挤在同一行的情形):一律换成换行,标记顶到行首(镜像 cms JD_MARK_INLINE_RE)。"""

MARK_LINE_REPL = "\n\\1"
"""MARK_INLINE_RE 的替换:换行 + 原标记。"""

FIELD_NONE = ""
"""模型没吐出这一格(就业性质 / 工时)时的空值:抽不到就留空,不替它填一个「全职」。"""

# =========================================================================
# 6. 报数文案与失败由头
# =========================================================================

NOTE_NO_LLM = "NEWS_LLM_BASE 未设,format 步跳过"
"""没盒子地址时的退出说明。"""

NOTE_NO_MART = "format: mart/jobs.json 不存在或为空,本轮跳过(等 build 链先跑一轮)"
"""mart 还没产出时的退出说明(也是剪枝的保险:空表不剪缓存)。"""

NOTE_MARKS = "marks"
"""失败由头:五节标记不齐。"""

NOTE_LEN = "len"
"""失败由头:长度出界(太短没整出东西 / 太长在编)。"""

NOTE_BLANK = "blank"
"""失败由头:五节标记齐全但每一节都是 (not stated) —— 原文只有公司套话,整理不出任何内容。
2026-09-18 Frank 实拍「这个整理完变成这样了」:Sienna 推给 Jobillico 的正文只有 335 字企业文化,模型老实地五节全答
(not stated),这份空整理版却过了校验入库,详情页拿它盖掉了原文。实测(存量 8,741 条 ok):全空只出现在原文 < 400 字的岗
(436 条里 48 条),≥ 400 字零条;但 < 400 字里近九成整理得出内容,所以不按长度一刀切,按**结果**拦。"""

BLANK_STRIP_RE = re.compile(r"\[(?:ROLE|REQS|PAY|WORKHOURS|APPLY)\]|\(\s*not stated\s*\)|[\s\-•*]", re.I)
"""判「五节全空」时先抹掉的东西:节标记、缺节短语、空白与子弹符;抹完什么都不剩 = 全空
(与 cms lib/jobs 的 JD_EMPTY_STRIP_RE 同一把尺子,域间不互取常量,各抄一份)。"""

NOTE_DIGITS = "digits"
"""失败由头:输出里出现原文没有的多位数字(幻觉)。"""

NOTE_EMPTY = "empty"
"""失败由头:盒子回了空串。"""

NOTE_HTTP_TPL = "http {status}"
"""失败由头:盒子非 2xx。"""

NET_ERRORS = ("ConnectError", "ConnectTimeout", "ReadTimeout", "WriteTimeout", "PoolTimeout", "RemoteProtocolError")
"""盒子连不上 / 超时这几类异常名:不是这条帖的问题,不记失败、不进 RETRY_FAILED_DAYS 冷却,整轮中止等下一轮。
2026-09-15 17:05 实撞:盒子掉线(ping 全丢)后每条秒挂 ConnectError,照旧记 fail 会把整轮 400 条锁一周。"""

PRINT_ABORT_TPL = "✗ format: 盒子连不上({note}),本轮中止;已做成的照常落盘,没做的不记失败,下一轮重试"
"""盒子掉线时的中止报数。"""

PRINT_TARGETS_TPL = "format: 在招有正文 {jobs} 条,已有整理版 {done} 条,剪掉不在列 {pruned} 条,本轮 {todo} 条(上限 {limit},模型 {model})"
"""开工报数。"""

PRINT_ROW_TPL = "  {status} {ext} src={src_len} out={out_len} {note}"
"""逐条报数。"""

PRINT_DONE_TPL = "✓ format: ok {ok} fail {fail},累计 ok {total} / 记录 {n} → {out}"
"""收工报数。"""

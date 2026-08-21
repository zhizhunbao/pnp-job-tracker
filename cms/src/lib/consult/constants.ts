/**
 * 对话域的参数:后端地址与模型、采样、采信白名单、几处截断上限与 prompt 的结构锚点。
 *
 * 🔵 **失败与留痕不在这儿**:造错在 `lib/error`,日志字面量在 `lib/log`(全站各只有一处);
 * 给模型看的字在 `prompts.ts`。这里只放 JSON 装得下的东西 —— 标量、字符串表、正则。
 *
 * @author Frank
 * @time 2026-08-19 21:42:05
 */

import { ALL_PROVS } from '../location'
import type { Lang } from '../i18n'

// =========================================================================
// 1. 后端与模型
// =========================================================================

/**
 * 网关地址。生产(Render)在云上打不到局域网,只能走这条隧道;
 * 本机开发把 `CHAT_LLM_BASE` 指到 `http://192.168.1.150:11434` 就直连那台盒子(同一台机器,少一层包装)。
 */
export const BASE = (process.env.CHAT_LLM_BASE || process.env.TRANSLATE_API_BASE || '').replace(/\/$/, '')

/**
 * 网关的钥匙。直连局域网时没有鉴权,留空即可。
 */
export const KEY = process.env.CHAT_LLM_KEY ?? process.env.TRANSLATE_API_KEY ?? ''

/**
 * 没有钥匙时给 pi 的占位。
 *
 * pi 不管后端认不认都要一个非空 `apiKey`(缺了当场抛 `No API key for provider`),
 * 而直连局域网那台裸 Ollama **根本没有鉴权**。占位只喂给 pi,不会发出去 ——
 * `Authorization` 头只在真有钥匙时才挂(见 `model()` 末尾那行)。
 */
export const NO_KEY_PLACEHOLDER = 'local'

/**
 * 模型名。经包装的那个门与裸 Ollama 那个门的 tag 写法不同(后者带 `:latest`)。
 *
 * 🔴 2026-08-21 从 `qwen3.6` 换成 `glm-4.7-flash`,判据是三语探针实测,不是榜单:
 *
 * | | qwen3.6 | gemma4:31b | glm-4.7-flash |
 * |---|---|---|---|
 * | 韩文两条 | **全报错** —— 一把工具不调,直接编出 `72301`(真码 72310) | 1 干净 1 降级 | 1 干净 1 降级 |
 * | 三语六条总耗时 | (两条挂了) | 223s | **36s** |
 * | 英文完整度 | 泛泛 | 好 | **最全**(语言+经验+收入两档+雇主) |
 *
 * 韩文那两条不是文风问题:模型编的码被数字闸拦住 → 没有事实可回退 → 用户拿到的是错误页。
 * 换模型是目前唯一有实测支撑的修法(提示词迭代三轮、加闸、加 `beforeToolCall` 都治不了它 ——
 * 挂点守的是「调用」,而它根本不调)。
 *
 * ⚠️ **网关的 `/v1/models` 只列 `qwen3.6`,但那是个静态清单,不是能力清单** ——
 * 我据此判过一次「生产用不了 glm」,是错的:真打 `/v1/chat/completions` 传 `glm-4.7-flash`
 * 直接 200 有回答(2026-08-21 实测)。**别拿列表接口当结论,要打真接口。**
 *
 * 经生产网关的三语实测(六条全过、零报错):zh/en/ko 各两条,两条降级成事实清单
 * (ko 목수、en 护士)—— 降级难看但不是假话,而 qwen3.6 在韩文那两条是**直接报错**。
 *
 * ⚠️ 复现(走自家那条门):`CHAT_LLM_BASE=$TRANSLATE_API_BASE CHAT_LLM_KEY=$TRANSLATE_API_KEY`
 * `CHAT_LLM_MODEL=glm-4.7-flash npx vitest run tests/int/triLangProbe.int.spec.ts`
 *
 * 🔴 **生产走的就是这条默认路径** —— `TRANSLATE_API_BASE`,朋友的服务器经 ngrok 暴露出来的 API。
 * 上面那张横评表就是**经它**跑出来的,不是只在局域网里试过:六条全过、零报错。
 * 局域网直连(`CHAT_LLM_BASE=http://192.168.1.150:11434`)只是本机开发少一层包装,
 * 两道门后面是同一台盒子、同一批模型。
 *
 * 🔴🔴 2026-08-21 深夜,记录代理抓包更正上面两段的前提:**网关对「带 tools 的请求」
 * 固定路由到 qwen3.6,并把 `reasoning_effort` 剥掉** —— 请求体里写 glm、响应里回的是
 * `"model":"qwen3.6"` + 思维链照流(裸请求不带 tools 时 model 参数才生效,所以
 * 「传 glm 直接 200 有回答」那次实测没错,只是测的不是工具循环这条路)。
 * 推论:经网关的工具循环**实际一直跑在 qwen3.6 上**,MODEL_ID 与 SAMPLING 里关思考的
 * 开关只在直连局域网时生效;`/no_think` 软开关网关路径下也不认(实测)。
 * 要真跑上 glm,得朋友那头改路由 —— 在那之前,预算(MAX_TOKENS)必须装得下思维链。
 */
export const MODEL_ID = process.env.CHAT_LLM_MODEL || process.env.TRANSLATE_API_MODEL || 'glm-4.7-flash'

/**
 * 模型的上下文窗口。qwen3.6 是 262144;经包装那个门另有字符上限,那是包装层的配置不是模型的。
 */
export const CONTEXT_WINDOW = 262_144

/**
 * 单发输出上限。答复本身还有出口按句截断兜着,这里只防跑飞。
 *
 * 🔴 2026-08-21 深夜从 700 改回 1200 —— 700 那版(凌晨)的前提被记录代理抓包推翻:
 * 当时以为跑的是不思考的 glm,「超出见客上限的那截纯属浪费」;实际上**网关对带 tools 的
 * 请求固定路由到 qwen3.6**(见 MODEL_ID 注释),它的思维链一发就是几百 token 且关不掉,
 * 全都计入这个上限 —— 700 会被思考整口吃掉,`finish_reason=stop` 时 content 是空的,
 * 循环拿到零正文零工具(实撞:英文木匠问句稳定复现 `agent loop returned no text`)。
 * 这个数必须给「思考 + 正文」两份都留够;改小它之前先确认服务端真的不思考。
 */
export const MAX_TOKENS = 1200

/**
 * 一趟循环的总预算。超了就掐断报「系统繁忙」——旧链的看门狗是 15 秒,
 * 但那盯的是单发合成;工具循环是多轮,预算按整趟算。
 *
 * ⚠️ 2026-08-21 实测两条运维事实,改这个数之前先读:
 *   ① **被掐断的请求在盒子上不会立刻死**(`stream:false` 的一路死不掉,流式的也要拖几秒),
 *      单队列的 Ollama 会让后续请求全排在僵尸后面 —— 生产日志里「快慢随机」的 45s 超时
 *      就是自己上一轮的僵尸堵的。**预算越紧、掐得越勤,队列被自己污染得越狠**;
 *      治本是让最坏一趟跑得进预算(补对口工具、压 MAX_TOKENS),不是把这个数改小。
 *   ② 同一条问题局域网直连 4.6s、经隧道约 +1.7s/轮 —— 隧道慢是固定开销,不是抖动。
 *
 * 🔴 2026-08-21 从 45s 提到 120s(Frank 拍板「超时加到 120s,不就没有超时问题了吗」):
 * 评测第四跑(glm 链)实测中位 12.4s,但偶发长跑 40-70s;45s 预算下一次超时的僵尸
 * 会把后面几发连坐成 busy(级联实拍:R09 超时 → R10 排队 40s → R11/R12 连环 busy)。
 * 120s 让长尾「慢但答上」,不再产僵尸 —— 前端等待态有轨迹与秒数陪着。
 */
export const TIMEOUT_MS = Number(process.env.CHAT_PI_TIMEOUT_MS ?? 120_000)

/**
 * 直接塞进请求体的采样参数。
 *
 * 走 `samplingParams` 而不是 pi 自己的 thinkingLevel:pi 在 thinking 判定为 off 时
 * **根本不发** `reasoning_effort` 字段(见 openai-completions.js 的 `clampedReasoning === "off" ? undefined`),
 * 而 qwen 的默认恰恰是**开着思考** —— 不发等于不关,只有把这个键直接塞进 body 才真的关掉。
 * (另两条路实测都不行:`think:false` 是 Ollama 原生 `/api/chat` 专用,`/v1` 不认;
 * `chat_template_kwargs.enable_thinking` 会把正文整个吃空。)
 */
export const SAMPLING = {
  /**
   * 🔴 关掉思维链。实测同一套四工具循环:开思考 11.4 秒、关掉 **4.6 秒**,而且少绕一轮。
   */
  reasoning_effort: 'none',

  /**
   * 🔴 **温度必须是 0,这是正确性问题不是风格问题。**
   *
   * 实测(同一份真实请求体重复 6 次):默认温度下**只有 2/6 真的调了工具**,
   * 另外 4 次它直接编 —— 而且编得像真的:「我查询了数据库,目前没有找到与"木匠"完全匹配的职位代码」、
   * 「安大略省目前有 132 个木匠职位的空缺」(那个数是凭空来的)。温度置 0 之后 **6/6**。
   *
   * 为什么会这样:system prompt 里全是「不许说没查到的东西」这类约束,模型在采样时
   * 有一定概率走上「扮演一个查过的助手」而不是「真去调工具」。这不是 prompt 写坏了 ——
   * 前 13 块逐块加上去都能调,是**采样的随机性**。工具派发不需要创造性,0 才是对的。
   */
  temperature: 0,
}

// =========================================================================
// 2. 采信与截断
// =========================================================================

/**
 * 认得出的省码。
 *
 * 直接用共享叶子的表,不在本域再抄一份 —— 省码的家是 `lib/location`(宪法:共享叶子例外)。
 */
export const PROVS = ALL_PROVS

/**
 * 一次检索最多回几个候选。
 */
export const SEARCH_LIMIT = 8

/**
 * 榜首这个比例以下的候选当噪音丢掉 —— 它们是被官方要求文本连带捞出来的,进了白名单就是给模型递错答案。
 */
export const NOISE_RATIO = 0.1

/**
 * 检索词截断。实测模型爱把整句话塞进来。
 */
export const MAX_QUERY = 60

/**
 * 一趟最多攒多少条事实。再多前端也读不完。
 */
export const MAX_FACTS = 40

/**
 * 抽选记录最多带几轮。近十轮足够看出分数区间与节奏,再多是往上下文里灌水。
 */
export const DRAW_LIMIT = 10

/**
 * 计分表一次最多取几行。CRS 的 summary 全表 20 行;detail 166 行没人读得完,靠 section 筛。
 */
export const POINTS_LIMIT = 40

/**
 * 计分表的「小结行」种类值。CRS 不给 section 时默认只取它 —— detail 166 行会把上下文灌爆;
 * FSW67 库里没有 summary 行(实查 2026-08-21),只能取 detail 靠 LIMIT 兜。
 */
export const KIND_SUMMARY = 'summary'

/**
 * CRS 分表名。`lookupPoints` 按它决定「不给 section 时取不取 summary」。
 */
export const GRID_CRS = 'CRS'

/**
 * 一次最多对几条主张。中介一口气吹十条时,前几条对完模型就有话答了。
 */
export const CLAIMS_CAP = 6

/**
 * `YYYY-MM-DD` 的长度。库里的日期列带时间尾巴,见客与比对都只要这十位。
 */
export const DATE_LEN = 10

/**
 * 留痕里错误信息的截断长度。整段堆栈进日志没人读,头一截足够定位。
 */
export const ERR_CAP = 160

/**
 * 按句截断时,断点至少要落在上限的这个比例之后 —— 再靠前就把答复砍没了,不如硬截。
 */
export const CUT_MIN_RATIO = 0.5

/**
 * 每条主张截多少字。原话要进事实清单当引文,太长会把清单撑爆。
 */
export const CLAIM_TEXT_CAP = 160

/**
 * tier 档位 → offer 之后大约等多久(裁决引擎的档位语义:0=Day0 / 1=3-6月 / 2=12月 / 3=24月)。
 * 数字要出现在 label 里,数字闸才认它们有出处。
 */
export const TIER_TEXT: string[] = ['no extra wait', '3-6 months', 'about 12 months', 'about 24 months']

/**
 * 裁决理由里「官方明说不行」那一类的标记值。挑见客引文时只认它 —— excluded 必带官方原句。
 */
export const REASON_EXCLUDED = 'excluded'

/**
 * 判定引擎认得的身份词(`VerdictProfile.status` 的词表)。
 * 档案槽里**正好是这几个**才透传,其余一律 null —— 喂一个引擎不认识的词,
 * 它会走「不是在读」之类的反向分支,比「没答」更糟。
 */
export const STATUS_WORDS = ['pgwp', 'study', 'worker', 'other']

/**
 * 私人承诺的判据 = **原话**,不是模型给的分类。
 *
 * 🔵 2026-08-21 从 lib/chat/tools.ts 原样搬进来(chat 将删,幸存件先搬 —— 17 号卷宗 §0):
 * 「合作公司 / 内部渠道 / 保 offer / 认识人」这类私人承诺,库里**根本没有对应的官方事实**,
 * 硬查一张不相干的表再把结果当答复,等于替中介的承诺背书(2026-08-04 实录:
 * 「曼省有合作公司」被归到运营统计,答出来是「MPNP 发不发月度报表」)。
 * 只收**承诺私人关系/内部通道/打包票**的词;「两个月就下来」这类能对账的事实主张不许被吃掉。
 */
export const PRIVATE_PROMISE =
  /合作(公司|企业|雇主|单位|关系)|内部(渠道|名额|指标|关系|价)|内推名额|走关系|有关系|认识(人|领导|移民官)|特殊渠道|绿色通道|(?:老板|雇主).{0,12}(?:帮|协助).{0,8}(?:办|申请|提名|手续)|包(过|下来|拿)|包.{0,12}(offer|提名|省提名|pr\b)|保(过|证过|证拿|证能|你拿|你过)|包?保\s*offer|保证.{0,12}(offer|提名|批)|partner(ed|ship)? (compan|employer|firm)|inside (track|channel|connection)|guarantee\w*.{0,40}\b(offer|nomination|pr\b|approval)|(?:employer|boss|restaurant).{0,40}(?:help|handle|support).{0,30}(?:apply|application|nomination|paperwork|process)|보장.{0,20}(오퍼|지명|승인)|(오퍼|지명|승인).{0,30}보장|(고용주|사장).{0,30}(도와|돕|지원|처리).{0,20}(신청|절차|지명)?|특별 (경로|채널)|내부 (경로|채널)|special (channel|access)|connections? (at|with|inside)/i

// =========================================================================
// 3. prompt 的结构锚点
// =========================================================================

/**
 * 语种在 prompt 里的名字。
 */
export const LANG_NAME: Record<Lang, string> = {
  /**
   * 简体中文。写全称不写 `Chinese` —— 后者会让模型在简繁之间摇摆。
   */
  zh: 'Simplified Chinese',

  /**
   * 英文。
   */
  en: 'English',

  /**
   * 韩文。
   */
  ko: 'Korean',
}

/**
 * 历史那一段的段名。大写是结构锚点,出口的 findLeaks 逐个盯着它们别漏进答复。
 */
export const EARLIER_HEAD = 'EARLIER (already read by this person — do not repeat any of it):'

/**
 * 用户这一句的段名。
 */
export const NOW_HEAD = 'NOW: '

/**
 * 换行。写成常量是因为它要拼进模板串,而模板串里直接敲换行会把缩进也带进 prompt。
 */
export const NL = '\n'

/**
 * 历史每轮截多少字。留够看得出「这一轮已经说过什么」,又不至于把上下文撑大。
 */
export const HISTORY_CAP = 320

// =========================================================================
// 4. 出口闸
// =========================================================================

/**
 * 行首的排版记号:项目符号或一两位序号。数字回读要先把它抹掉,否则序号会被当成一个凭空的数。
 */
export const LEAD_MARK = /^\s*[-\d]{1,3}[.)、]?\s*/

/**
 * 从答复里抠数字用的。千分位与小数点都算在一个数里面。
 */
export const NUM_RE = /\d+(?:[.,]\d+)*/g

/**
 * 内部枚举与字段名 —— **一个都不许出现在答复里**。
 * 2026-08-04 事故:兜底把英文内部标签原样吐给了用户。
 */
export const INTERNAL_WORDS = [
  'not-published', 'not-collected', 'not-applicable', 'availability', 'evidence',
  'valueText', 'fetched', 'lookup_', 'search_occupations', 'assess_pathways', 'check_claims',
]

/**
 * 中/韩答复里不许出现的英文单位速记。数据是英文的,话不能是。
 */
export const EN_UNIT_WORDS = [
  'jobs', 'openings', 'postings', 'years', 'months', 'weeks', 'days', 'points',
  'invitations', 'spots', 'cutoff', 'requires', 'nominations',
]

/**
 * 出口闸最多重试几次。撞了改一次还撞,就降级成事实清单 —— 再让模型重写只是多等一轮。
 */
export const GUARD_RETRIES = 1

/**
 * 见客答复的字数上限,按语种。中文信息密度高,同样的意思字更少。
 */
export const LEN_CAP: Record<Lang, number> = {
  /**
   * 中文信息密度高,同样的意思字更少。
   */
  zh: 600,

  /**
   * 韩文比中文松一点。
   */
  ko: 700,

  /**
   * 英文一个词就好几个字符,上限要放到中文的两倍多才等价。
   */
  en: 1400,
}

// =========================================================================
// 5. 字面量(functions.ts 里不许有裸字符串)
// =========================================================================

/**
 * 工具名。**只在这里写一遍** —— 注册工具、给事实打 `tool` 标记、出口闸的内部词黑名单,
 * 三处用的必须是同一个字符串;各写各的,改一处就会剩下两处对不上。
 */
export const TOOL_NAME = {
  /**
   * 查职业候选。
   */
  search: 'search_occupations',

  /**
   * 在招岗位。
   */
  jobs: 'lookup_jobs',

  /**
   * 省提名清单收录。
   */
  coverage: 'lookup_coverage',

  /**
   * 省提名门槛条文。
   */
  thresholds: 'lookup_thresholds',

  /**
   * 抽选记录(省级 EOI 与联邦 Express Entry 轮次共一把,靠 prov 区分,FED = 联邦)。
   */
  draws: 'lookup_draws',

  /**
   * 官方运营统计(处理时长 / 配额 / 池内人数)。
   */
  ops: 'lookup_ops',

  /**
   * 联邦 EE 类别抽选清单。
   */
  ee: 'lookup_ee',

  /**
   * 联邦项目规则(PGWP / CEC / FSW / FST)。
   */
  permit: 'lookup_permit',

  /**
   * 官方计分表(CRS / FSW67)。
   */
  points: 'lookup_points',

  /**
   * 路径裁决(读我们自己存的档案,不收参数)。
   */
  verdict: 'assess_pathways',

  /**
   * 主张对账(中介/朋友的话 vs 官方记录)。
   */
  claims: 'check_claims',
}

/**
 * 轨迹里给人看的工具名。
 */
export const TOOL_LABEL = {
  /**
   * 查职业候选。
   */
  search: '查职业',

  /**
   * 在招岗位。
   */
  jobs: '在招岗位',

  /**
   * 省提名清单收录。
   */
  coverage: '清单收录',

  /**
   * 省提名门槛条文。
   */
  thresholds: '省提名门槛',

  /**
   * 抽选记录。
   */
  draws: '抽选记录',

  /**
   * 官方运营统计。
   */
  ops: '处理时长与配额',

  /**
   * 联邦 EE 类别。
   */
  ee: '联邦类别',

  /**
   * 联邦项目规则。
   */
  permit: '联邦规则',

  /**
   * 官方计分表。
   */
  points: '官方分表',

  /**
   * 路径裁决。
   */
  verdict: '路径判定',

  /**
   * 主张对账。
   */
  claims: '主张对账',
}

/**
 * 四态的字面量。**判定与渲染共用这一份** —— 见 `types.ts` 的 `Availability`。
 */
export const AVAIL = {
  /**
   * 有值。
   */
  ok: 'ok',

  /**
   * 官方不公布。**这是官方的问题** —— 举不出 URL 与原句就不许用它。
   */
  notPublished: 'not-published',

  /**
   * 本站未收录。**这是我们的问题**,是举不出证时唯一能落的那一档。
   */
  notCollected: 'not-collected',

  /**
   * 这一项对它不适用。
   */
  notApplicable: 'not-applicable',
} as const

/**
 * 消息角色与内容块种类。**我们只产 user** —— 见 `firstPrompt` 上面那段。
 */
export const ROLE = {
  /**
   * 用户轮。
   */
  user: 'user',

  /**
   * 助手轮,由 pi 产。
   */
  assistant: 'assistant',

  /**
   * 工具回执轮。
   */
  toolResult: 'toolResult',

  /**
   * 文本内容块。工具回执与答复正文都是它。
   */
  text: 'text',
} as const

/**
 * 事实的单位。`status` 与 `threshold` 是两个特殊值:前者是四态行,后者是门槛行。
 */
export const UNIT = {
  /**
   * 在招岗位数。
   */
  jobs: 'jobs',

  /**
   * 通道条数。
   */
  streams: 'streams',

  /**
   * 四态行,没有数值。
   */
  status: 'status',

  /**
   * 门槛行,官方没给单位时用它兜底。
   */
  threshold: 'threshold',

  /**
   * 分数行(抽选分数线、计分表档位)。
   */
  points: 'points',

  /**
   * 判定行(路径裁决的结论,不是官方数字)。
   */
  verdict: 'verdict',
} as const

/**
 * 拼字符串用的分隔符。**收在一处**,免得同一种分隔在三个函数里写成三个样子。
 */
export const SEP = {
  /**
   * 一条事实里「说明」与「值」之间。
   */
  colon: ': ',

  /**
   * 多个通道名之间。
   */
  semi: '; ',

  /**
   * 见客引文里「省」与「内容」之间。全角间隔号,中英文都不难看。
   */
  dot: ' · ',

  /**
   * 候选清单里「码」与「职业名」之间。
   */
  dash: ' — ',

  /**
   * 项目符号。**前端只认行首这两个字符**,换成别的会原样见客。
   */
  bullet: '- ',

  /**
   * 事实清单里的逗号。
   */
  comma: ', ',

  /**
   * 该有值却没有。
   */
  none: '-',
}

/**
 * 门槛条文里「这条管谁」。
 */
export const SUBJECT = {
  /**
   * 管申请人。
   */
  applicant: 'applicant',

  /**
   * 管雇主。**这两个搞混,句子本身就是假的**(「你要开满一年」vs「雇主要开满一年」)。
   */
  employer: 'employer',
} as const

/**
 * 联邦那一批门槛行的省码。它们不是省,是「联邦」,按省分组时要先剔掉。
 */
export const FED = 'FED'

/**
 * 魁省走自己的体系,不属 PNP —— 门槛与清单都不摆它。
 */
export const QC = 'QC'

/**
 * `LIKE` 检索时要转义的特殊字符。
 */
export const LIKE_SPECIAL = /[%_\\]/g

/**
 * 清单里「明确排除」那一类的标记值。
 */
export const INELIGIBLE = 'ineligible'

/**
 * `LIKE` 检索的转义替换串。反斜杠加原字符 —— 写成常量是因为它在模板串里极容易被转义吃掉。
 */
export const LIKE_ESCAPE = '\$&'

/**
 * `LIKE` 的通配符,前后各一个 = 子串匹配。
 */
export const LIKE_ANY = '%'

// =========================================================================
// 6. 协议与出口闸的字面量
// =========================================================================

/**
 * pi 认的协议名。局域网直连与经隧道两个门说的都是它。
 */
export const API = 'openai-completions'

/**
 * pi 认的提供方名。网关是 OpenAI 兼容的,所以报这个。
 */
export const PROVIDER = 'openai'

/**
 * OpenAI 兼容端点的路径前缀。
 */
export const V1 = '/v1'

/**
 * 鉴权头的前缀,后面接钥匙。
 */
export const BEARER = 'Bearer '

/**
 * 鉴权头的名字。
 */
export const AUTH_HEADER = 'Authorization'

/**
 * pi 事件里我们唯一订阅的那一种:助手消息又长了一截。
 */
export const MESSAGE_UPDATE = 'message_update'

/**
 * 四道出口闸的名字。日志按它具名 —— 「撞的是谁」要看得见。
 */
export const GATE = {
  /**
   * 答复里有溯不到出处的数字。**这一道是「不许编数字」唯一的执行件。**
   */
  ungrounded: 'ungroundedNumber',

  /**
   * 内部枚举或字段名漏进了答复。
   */
  internal: 'internalWord',

  /**
   * 中/韩答复里夹了英文单位速记。
   */
  englishUnit: 'englishUnit',

  /**
   * 用了前端渲染不出来的排版记号。
   */
  markup: 'rawMarkup',

  /**
   * 第一句只是把问题复述了一遍。
   *
   * 🔴 2026-08-20 Frank 实拍:「回答还要说人话」。三轮提示词只治住了公文体
   * (「申请人需」→「你需要」),开头那句治不住 —— 模型照旧写
   * 「BC省提名对木匠(NOC 72310)有具体的硬性要求,你需要满足以下条件才能申请:」。
   * 按项目自己的原则「**能让闸门管的,就别写规则管**」,提示词说一遍,执行交给这道闸。
   */
  opening: 'restatedOpening',
}

/**
 * 前端渲染不出来的排版记号 —— 出现即原样见客。
 */
export const MARKUP = {
  /**
   * 加粗。
   */
  bold: '**',

  /**
   * 星号项目符号。前端只认 `- `。
   */
  star: '* bullet',

  /**
   * 标题。
   */
  heading: '#',

  /**
   * 表格竖线。
   */
  pipe: '|',

  /**
   * 编号列表。它还会撞数字闸的行首白名单。
   */
  numbered: 'numbered list',
}

/**
 * 事实说明里的固定措辞。**给模型看的英文**,不是见客文案。
 */
export const LABEL = {
  /**
   * 在招岗位那条的中段。
   */
  openPostings: ' open postings for ',

  /**
   * 职业码的括号,前半。
   */
  nocOpen: ' (NOC ',

  /**
   * 职业码的括号,后半。
   */
  nocClose: ')',

  /**
   * 见客引文里的职业码。
   */
  nocDot: ' · NOC ',

  /**
   * 清单收录那条。
   */
  provList: ' provincial occupation list for NOC ',

  /**
   * 收录它的通道。
   */
  streamsListing: ' streams listing NOC ',

  /**
   * 排除它的通道。
   */
  streamsExcluding: ' streams that exclude NOC ',

  /**
   * 门槛那条。
   */
  requirements: ' provincial nominee requirements for NOC ',

  /**
   * 门槛判定里「因素」与「官方原文」之间。
   */
  dash: ' — ',

  /**
   * 分档之间的连接号(不是减号,是短横)。
   */
  range: '–',

  /**
   * 抽选那条的中段,前接省码、后接日期。
   */
  drawRound: ' draw ',

  /**
   * 分数线,前接轮次名。
   */
  cutoff: ' cutoff ',

  /**
   * 邀请数的后缀。
   */
  invited: ' invited',

  /**
   * 抽选记录整批的说明尾(statusFact 用)。
   */
  drawsList: ' draw records',

  /**
   * 运营统计那条的中段。
   */
  opsHead: ' official operational stat — ',

  /**
   * 运营统计整批的说明尾(statusFact 用)。
   */
  opsList: ' operational stats',

  /**
   * 统计口径日的前缀。
   */
  asOf: ' as of ',

  /**
   * EE 类别那条的开头,后接类别名。
   */
  eeHead: 'EE category ',

  /**
   * EE 类别那条的中段,后接该类别最近一轮的日期。
   */
  eeLast: ' last category draw ',

  /**
   * 这个职业不在任何 EE 类别里(查过全表,是结论不是缺数)。
   */
  eeNone: ' is not on any Express Entry category-based draw list (full table checked)',

  /**
   * 联邦规则那条的中段。
   */
  permitHead: ' federal rule — ',

  /**
   * 联邦规则整批的说明尾(statusFact 用),前接项目名。
   */
  permitList: ' federal rules',

  /**
   * 计分表那条的中段。
   */
  pointsHead: ' points — ',

  /**
   * 计分表整批的说明尾(statusFact 用),前接分表名。
   */
  pointsList: ' points table rows',

  /**
   * 路径裁决那条的中段,前接「省 通道」、后接结论词。
   */
  verdictHead: ' — pathway verdict: ',

  /**
   * offer 之后大约要等多久,后接 `TIER_TEXT` 的档位话。
   */
  tierHead: ', wait after offer about ',

  /**
   * 卡住这条路的那道闸,后接闸名。
   */
  blockedBy: ', blocked by ',

  /**
   * 判不了时缺哪几个档案槽,后接槽名清单。
   */
  missing: ', missing profile answers: ',

  /**
   * 主张那条的开头,后接用户转述的原话。
   */
  claimHead: 'claim reported by the user — ',

  /**
   * 通用的括号前半(带前导空格)。职业码专用的那对是 `nocOpen`/`nocClose`,
   * 这对给分档、口径、范围这类补注用;后半共用 `nocClose`。
   */
  parenOpen: ' (',

  /**
   * EE 的缩写,见客引文里当前缀用(`EE · NOC 12345`)。
   */
  ee: 'EE',
}

/**
 * 出处链接的两段。指向本站的职位板,不是官方页 —— 在招数是我们自己的统计。
 */
export const JOBS_LINK = {
  /**
   * 前半,后面接职业码。
   */
  head: '/jobs?noc=',

  /**
   * 后半,后面接省码。
   */
  prov: '&prov=',
}

/**
 * 已知档案那一段里各项的措辞。
 */
export const SAID = {
  /**
   * 职业码。
   */
  noc: 'occupation NOC ',

  /**
   * 他自己说的职业名,前半。
   */
  occOpen: 'job title "',

  /**
   * 接上一条收尾。
   */
  occClose: '"',

  /**
   * 省份。
   */
  provs: 'provinces ',

  /**
   * 工作经验。
   */
  exp: ' months of work experience',

  /**
   * 现在的身份。
   */
  status: 'current status ',

  /**
   * 一项说完的句号。
   */
  stop: '.',
}

/**
 * 抛错时的技术留痕措辞。只有 `@test.local` 的探针看得到。
 */
export const FAIL_MSG = {
  /**
   * 整趟循环超时,后面接毫秒数。
   */
  timeout: 'chat loop timed out after ',

  /**
   * 接上一条的单位。
   */
  ms: 'ms',

  /**
   * env 没配。
   */
  noBase: 'consult llm base not configured',

  /**
   * 撞了闸又没有事实可降级,后面接撞了哪几道。
   */
  noFacts: 'no facts to fall back on: ',

  /**
   * 循环跑完了却一个字都没写出来(没超时、也没抛)。
   */
  emptyDraft: 'agent loop returned no text',
}

/**
 * 英文的语种码。出口闸对英文答复不查「夹英文」那一项。
 */
export const EN = 'en'

/**
 * 拼单词边界的正则片段。查英文速记时要整词匹配,免得 `days` 命中 `nowadays`。
 */
export const WORD_EDGE = '\b'

/**
 * 中文句号。按句截断时它和英文句点一样是断点。
 */
export const FULL_STOP = '。'

/**
 * 小数末尾的零。数字回读比对前要抹掉,`31264.0` 与 `31264` 是同一个数。
 */
export const TRAILING_ZEROS = /\.0+$/

/**
 * 加粗记号。
 */
export const BOLD_RE = /\*\*/

/**
 * 星号项目符号(行首)。
 */
export const STAR_RE = /(?:^|\n)\s*\*\s/

/**
 * 标题(行首)。
 */
export const HEADING_RE = /(?:^|\n)\s*#/

/**
 * 表格竖线。
 */
export const TABLE_RE = /\|/

/**
 * 编号列表(行首)。
 */
export const NUMBERED_RE = /(?:^|\n)\s*\d+\.\s/

/**
 * 一个空格。数字回读把行首序号抹成它 —— 抹成空串会把前后两个词粘在一起,粘出新的"数字"。
 */
export const SPACE = ' '

/**
 * 降级清单最多列几条。再多没人读得完,而清单的意义是"能溯源",不是"全都给"。
 */
export const SHEET_CAP = 14

/**
 * 有没有数字。行首记号是序号还是项目符号,靠它分。
 */
export const HAS_DIGIT = /\d/

/**
 * 往 prompt 里带几轮历史。够看出「这一轮已经说过什么」,又不至于把上下文撑大。
 */
export const HISTORY_TURNS = 6

/**
 * 数字串里的千分位逗号 —— 「1,560」这种官方写法要先去掉才 parse 得动。
 */
export const THOUSANDS_COMMA = /,/g

/**
 * 第一句以冒号收尾 —— 那是「下面开始列」,不是回答。中英文两种冒号都认。
 */
export const OPENING_COLON = /[::]\s*$/

/**
 * 「……如下」这类预告句。
 */
export const AS_FOLLOWS = /(如下|以下条件|下列条件|as follows)/

/**
 * 第一句的长度上限 —— 超过这么长还没有句号,就按整行当第一句看。
 */
export const FIRST_LINE_CAP = 120

/**
 * 回喂给模型时,首句那道闸只贴末尾这么多字 —— 让它认出是哪一句,不必整句复读。
 */
export const OPENING_SAMPLE = 24

/**
 * 撞了两次还不过就**降级**成事实清单的那几道闸 —— 它们拦的是**假话**。
 *
 * 🔴 2026-08-20 实拍出来的分界:给「首句复述」也按这个待遇,结果两次改不掉之后
 * 降级成了一行英文事实清单 —— 比原来那句笨拙的中文**更糟**。
 * 判据由此定死:**这一条不改会不会让用户信到假的东西**。
 *   · 会 → 硬闸(编数字、内部码、夹英文单位、见客的排版记号)→ 降级;
 *   · 不会,只是难看 → 软闸 → 重写两次;还不行就**留着模型那一版**,记一笔,别把答案换掉。
 */
export const HARD_GATES = ['ungroundedNumber', 'internalWord', 'englishUnit', 'rawMarkup']

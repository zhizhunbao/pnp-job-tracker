/**
 * 通道域的全部形状:门槛闸的词汇(原 lib/gateManifest,2026-08-22 并回 —— 当年抽早了,
 * 唯一真消费者就是本域)+ 通道策略契约(设计:docs/design/通道策略分文件-20260815.md)。
 *
 * 起因(Frank 2026-08-15「每个通道一个策略文件吧?不要混在一起吧」):同一条通道的规矩此前散在
 * pathVerdict 的 REGISTRY、gateManifest、前端特例、拆省表、i18n 五六处 —— 当天两次踩坑
 * (工签闸误判学签、NL 跨专业默认放行)都不是算法错,是改一处想不起另一处。
 *
 * 🔴 边界一(拆的时候不许越):**门槛的数字仍在库里**。策略文件只写「去哪张表挑门槛行」和
 *    「有哪几类闸」,CLB 6 / 24 个月 / 1,560 小时这些数值照旧来自 pnp_requirements。
 *    抄进代码 = 官方改版时代码与库两套真相,那是 URL→数据→SQL 铁律的反面。
 * 🔴 边界二:**算法不在这里**。这一层是声明,判定流程仍归 ruling 的 pathVerdict()。
 *
 * 为什么要有「闸的清单」这一层:判定核只看门槛行的话,只能发现「它有行的那些门槛里你缺哪一项」,
 * 发现不了「它压根没有行的那类门槛」—— 于是「没有行 ⇒ 没有闸 ⇒ open」,实测五个画像 15 条结论
 * 全是「能走」,含「从没来过加拿大的海外护士 → NLPNP 国际毕业生排进前三」。
 *
 * 取证方式(铁律 URL→数据→SQL):策略文件里的每一句 quote 都来自 `data/crawl/<slug>/html_cache`
 * 的官方页,用 `etl/scan_gate_quotes.py` 捞候选句后人工核定。**不猜 URL、不凭印象、不拿文档记忆当库。**
 *
 * 三态与举证责任:
 *   required     —— 官方明写要(必带 quote)
 *   notRequired  —— ① 官方明写不要(带 quote);或 ② **读过该通道的资格页、页上没有这一类闸**
 *                   (带 url+fetched,basis='absent')。后者是可证伪的断言:我们指名读了哪一页、哪天读的。
 *   unknown      —— 没有资格页可读,**或**该页自己声明「完整条件见别处」而别处没抓到 → 本站未收录。
 *                   与「官方不要求」意思相反(CLAUDE.md 铁律),不许混。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

// =========================================================================
// 1. 闸的词汇(原 gateManifest)
// =========================================================================

/**
 * 闸的五类:offer / 境内身份 / 加拿大学历 / 专业对口 / 法语(FCIP 专属)。
 */
export type GateKey = 'offer' | 'statusInCanada' | 'credentialCanada' | 'fieldMatch' | 'french'

/**
 * statusInCanada 闸「问的是什么」(2026-08-15 拆分)。「境内身份」一个词底下其实是三种官方要求:
 * AB/PE 要**有效工签**、NL 指名 **PGWP**、NB/MB 要**住在/受雇于该省** —— 先前统统拿
 * 「人在不在加拿大」(inCanada)判,于是学签在读被 AB 的工签闸放行、安省居民被 MB 的
 * 「曼省在职」闸放行。required 的 statusInCanada 闸必须标注,引擎按标注去档案里取对应的答案。
 */
export type StatusAsk = 'workPermit' | 'pgwp' | 'provResidence' | 'provEmployment'

/**
 * 一道闸的声明(三态四变体;举证责任见文件头)。
 */
export type GateRule =
  | {
    /**
     * 官方明写要。
     */
    need: 'required'

    /**
     * 官方原句(引用,永不翻译)。
     */
    quote: string

    /**
     * 出处页。
     */
    url: string

    /**
     * 抓取日。
     */
    fetched: string

    /**
     * 判读备注;没有则 null。
     */
    note: string | null

    /**
     * statusInCanada 闸问的是什么;非该类闸或未拆分则 null。
     */
    asks: StatusAsk | null
  }
  | {
    /**
     * 官方明写不要。
     */
    need: 'notRequired'

    /**
     * 官方原句。
     */
    quote: string

    /**
     * 出处页。
     */
    url: string

    /**
     * 抓取日。
     */
    fetched: string

    /**
     * 判读备注;没有则 null。
     */
    note: string | null
  }
  | {
    /**
     * 读过资格页、页上没有这一类闸。
     */
    need: 'notRequired'

    /**
     * 可证伪断言的凭据形态:指名读了哪一页。
     */
    basis: 'absent'

    /**
     * 读的那一页。
     */
    url: string

    /**
     * 哪天读的。
     */
    fetched: string

    /**
     * 判读备注;没有则 null。
     */
    note: string | null
  }
  | {
    /**
     * 本站未收录(与「官方不要求」意思相反,不许混)。
     */
    need: 'unknown'

    /**
     * 没有资格页可读,还是资格页把完整条件推给了没抓到的别处。
     */
    why: 'no-source' | 'criteria-elsewhere'

    /**
     * 读过的页(criteria-elsewhere 时有);没有则 null。
     */
    url: string | null

    /**
     * 抓取日;没有则 null。
     */
    fetched: string | null

    /**
     * 判读备注;没有则 null。
     */
    note: string | null
  }

/**
 * 一条通道的闸清单(五格显式 —— null = 本站未收录,gateOf 兜成 unknown;
 * **不等于**官方不要求,举证责任在我们)。
 */
export type GateBook = {
  /**
   * offer 闸。
   */
  offer: GateRule | null

  /**
   * 境内身份闸(required 必标 asks)。
   */
  statusInCanada: GateRule | null

  /**
   * 加拿大学历闸。
   */
  credentialCanada: GateRule | null

  /**
   * 专业对口闸(NL 国际毕业生)。
   */
  fieldMatch: GateRule | null

  /**
   * 法语闸(FCIP 的定义性条件:NCLC 5,法语的尺子,不许拿 CLB 冒充)。
   */
  french: GateRule | null
}

// =========================================================================
// 2. 策略契约
// =========================================================================

/**
 * 专业对口闸的**例外**(2026-08-15):官方给本省院校毕业生留的口子。
 * NL 原文:Memorial University / College of the North Atlantic 毕业生可以从事与专业不直接相关的岗位,
 * 但岗位要「NOC 需专科以上 + TEER 0/1/2/3(或 TEER 4 紧缺)」。NL 的公立高等院校就这两所,
 * 故以**学习省份**近似;TEER 4/5 那档要对紧缺清单,本站判不了 → 落 needs-info 不放行。
 */
export type FieldMatchExemption = {
  /**
   * 在这个省读的书才够得着例外。
   */
  studyProvince: string

  /**
   * 例外只覆盖这几档 TEER;其余档判不了。
   */
  teers: readonly number[]

  /**
   * 官方原句。
   */
  quote: string

  /**
   * 出处页。
   */
  url: string
}

/**
 * 省外院校毕业生的额外在职门槛(2026-08-15 #317)。
 *
 * 病灶:NL 国际毕业生这条线在库里只有一行 `experience op='none'`(官方确实不设**工作经验**门槛),
 * 于是一个阿省毕业、刚拿 PGWP 的人在这条线上判出 tier=0 —— 读起来像「拿到 PGWP 就能走」。
 * 而官方另有一条**只管非本省来路**的政策:先在本省干满一年才可能被邀。两条是并列条款,
 * 缺了后者不是「官方没有」,是我们只读了一页。
 *
 * 🔴 与文件头边界一(门槛数字仍在库里)的关系:这条**尚未入 pnp_requirements**(欠账:
 *    该由 etl/pnp/build_nl_req.py 抓成一行 `factor=experience, appliesCondition=grad-other-province`)。
 *    在入库之前按策略文件既有形态(gates 的 quote 例外)如实声明,判定层据此判;
 *    行一旦入库,这里删掉即可 —— 判定层挑行的路径不变。
 * 🔴 四态口径:这是「官方有、且我们举得出证」的 ok 态,**不是** not-collected;
 *    quote/url/effective 三样缺一不可,举不出证就别写这个字段。
 */
export type OutOfProvinceGrad = {
  /**
   * 官方要求的本省全职在职月数(官方原句里那个数,不许自己换算)。
   */
  months: number

  /**
   * 官方原句(引用,永不翻译)。
   */
  quote: string

  /**
   * 出处页。
   */
  url: string

  /**
   * 抓取日。
   */
  fetched: string

  /**
   * 官方页自报的生效日;没报则 null。
   */
  effective: string | null
}

/**
 * 制度归属(显示在通道名尾的小括号)。
 */
export type PathwayProgram = 'EE' | 'AIP' | 'RCIP' | 'FCIP' | 'PNP'

/**
 * 「在招」取 occ-competition 的哪一列:AIP=该省指定雇主∩本职业、RCIP/FCIP=试点社区∩本职业,
 * 普通省提名=全省在招。口径不许混(2026-08-15 拆省时立的规矩)。
 */
export type PathwayJobsSource = 'openJobs' | 'aipJobs' | 'rcipJobs' | 'fcipJobs'

/**
 * 展示层要的通道特性(2026-08-15 C 批:把前端那 11 处 `key === 'AIP'` 收成字段)。
 * 🔴 边界:这里只放**这条通道与别人不一样的地方**,颜色/间距/排版仍归前端 ——
 * 前端读字段、不认 key,否则拆完还是散的,只是散得好看一点。
 */
export type PathwayUi = {
  /**
   * 制度归属;null = 缺省 PNP(uiOf 兜)。
   */
  program: PathwayProgram | null

  /**
   * 在招口径;null = 缺省 openJobs(uiOf 兜)。
   */
  jobsSource: PathwayJobsSource | null

  /**
   * province==='FED' 且未拆到具体省时的区域名文案键(AIP=大西洋四省、RCIP=试点社区);没有则 null。
   */
  regionLabelKey: string | null

  /**
   * 「拿到 offer 即可申请」的专属话术键:AIP 要指定雇主、RCIP 要社区雇主、
   * AB 官方还要求「已在阿省全职在岗」→ 各自如实,不共用一句;没有则 null。
   */
  afterOfferOkKey: string | null

  /**
   * 推荐原因里「差 offer」那枚胶囊的专属文案键(AIP/RCIP 要的不是普通 offer);没有则 null。
   */
  offerGapKey: string | null

  /**
   * 「看在招岗」链接的筛选参数(不含 prov);null = 该省 pnp=yes。
   */
  jobsQuery: string | null

  /**
   * 没有岗位数时链接写什么(AIP 走指定雇主筛选、RCIP 走试点筛选,都没有职业级岗数);没有则 null。
   */
  seeJobsKey: string | null
}

/**
 * `uiOf` 的返回:兜完默认值的展示特性(program/jobsSource 必有,其余照声明)。
 */
export type ResolvedUi = {
  /**
   * 制度归属(兜过默认 PNP)。
   */
  program: PathwayProgram

  /**
   * 在招口径(兜过默认 openJobs)。
   */
  jobsSource: PathwayJobsSource

  /**
   * 区域名文案键;没有则 null。
   */
  regionLabelKey: string | null

  /**
   * 「拿到 offer 即可申请」话术键;没有则 null。
   */
  afterOfferOkKey: string | null

  /**
   * 「差 offer」胶囊文案键;没有则 null。
   */
  offerGapKey: string | null

  /**
   * 「看在招岗」筛选参数;null = 该省 pnp=yes。
   */
  jobsQuery: string | null

  /**
   * 无岗位数时的链接文案键;没有则 null。
   */
  seeJobsKey: string | null
}

/**
 * 「不在清单就不合格」的明文声明(PE 的 OID 子通道;其余省的 indemand 清单只是定向信号)。
 */
export type ListRequired = {
  /**
   * 清单归哪个省。
   */
  province: string

  /**
   * 匹配哪条通道的清单。
   */
  streamRe: RegExp
}

/**
 * 通道的 key 全集 —— **加一条通道必须先在这里登记**。
 * 登记之后 `lib/i18n/labels.ts` 的通道名那块会立刻报缺这一条,写完三语名才编得过。
 * (2026-08-17:名字搬进 i18n 时补的护栏 —— 否则漏补名字就是页面上冒个裸键 `jpw.p.XX`。)
 */
export type PathwayKey = 'AB-opportunity' | 'AIP' | 'BC-build' | 'BC-sw' | 'FCIP' | 'FED-EE' | 'MB-swm' | 'NB-sw' | 'NL-intl-grad' | 'NS-sw' | 'ON-workforce' | 'PE-sw' | 'RCIP' | 'SK-offer'

/**
 * 一条通道的完整声明(一条通道一个文件,Frank 2026-08-15 拍板)。
 */
export type PathwayStrategy = {
  /**
   * 通道 key(先在 PathwayKey 登记)。
   */
  key: PathwayKey

  /**
   * 'FED' 或省码(判定结果里的 province)。
   */
  province: string

  /**
   * 官方通道名(英文原名,判定卡与日志用)。
   */
  stream: string

  /**
   * 联邦区域线覆盖哪几个省(AIP/RCIP/FCIP)。判定是联邦一份,但在招岗/指定雇主/试点社区是省的事 →
   * 展示层按 目标省∩这几个省 拆行(不限省=全拆)。非区域线 null。
   */
  regionProvinces: readonly string[] | null

  /**
   * 去哪个省挑门槛行。
   */
  reqProvince: string

  /**
   * 门槛行的 program 白名单;不筛则 null。
   */
  reqPrograms: string[] | null

  /**
   * 门槛行的通道名匹配(**子串**匹配不用字面相等:mart 里的通道名带 em dash,
   * 写死全串等于把编码问题埋进代码);不筛则 null。
   */
  reqStream: RegExp | null

  /**
   * 抽选线取哪条子通道;没有则 null。
   */
  drawStream: string | null

  /**
   * 该省抽选行没有子通道字段时,准不准退回「全省最近一轮有分线的抽选」。
   * 只对 MB 开:MPNP 是单池单分制;BC 是逐通道设线,退回全省线就是拿医疗线量木匠。
   */
  drawFallbackProvinceWide: boolean

  /**
   * 打分制;不打分则 null。
   */
  scorer: 'CRS' | 'MB' | null

  /**
   * 门槛是否认可境外经验(库里没有 workLocation=canada 行的默认认)。
   */
  countsForeign: boolean

  /**
   * 「不在清单就不合格」的明文;没有则 null。
   */
  listRequired: ListRequired | null

  /**
   * 门槛清单五类闸(原 gateManifest.GATE_MANIFEST[key];格 null = 本站未收录)。
   */
  gates: GateBook

  /**
   * 专业对口闸的例外(只有声明了 gates.fieldMatch 的通道才用得上);没有则 null。
   */
  fieldMatchExemption: FieldMatchExemption | null

  /**
   * 省外院校毕业生的**额外在职门槛**(2026-08-15 #317);没有则 null。
   */
  outOfProvinceGrad: OutOfProvinceGrad | null

  /**
   * 展示层特性;null = 「普通省提名通道」那套(uiOf 兜默认)。
   */
  ui: PathwayUi | null

  /**
   * 通道级备注;没有则 null。
   */
  note: string | null
}

// =========================================================================
// 3. 出入参与试点名额
// =========================================================================

/**
 * `gateOf` 的入参。
 */
export type GateOfIn = {
  /**
   * 通道 key。
   */
  key: string

  /**
   * 要哪一类闸。
   */
  gate: GateKey
}

/**
 * 策略或没有(内部按 key 查表的返回;key 全集在 PathwayKey,正常打不到 null)。
 */
export type MaybeStrategy = PathwayStrategy | null

/**
 * 社区级行的复数(数组进签名要有自己的名字)。
 */
export type PilotCommunityRows = PilotQuotaCommunityRow[]

/**
 * 聚合行的复数。
 */
export type PilotQuotaAggs = PilotQuotaAgg[]

/**
 * 例外或没有(`fieldMatchExemptionOf` 的返回)。
 */
export type MaybeExemption = FieldMatchExemption | null

/**
 * 区域省清单或没有(`regionProvincesOf` 的返回;null = 非区域线,调用方据此判断「要不要拆省」)。
 */
export type MaybeRegionProvinces = readonly string[] | null

/**
 * 社区级行(pilot_quota 表 noc 为空的行);每个值锚定官网原句 quote+url。
 */
export type PilotQuotaCommunityRow = {
  /**
   * 社区名。
   */
  community: string

  /**
   * 省码。
   */
  province: string

  /**
   * RCIP | FCIP | RCIP+FCIP(pilot-communities 按社区名关联,同 jobs.pilot 口径)。
   */
  type: string

  /**
   * true = 官网明说先到先得;null = 官网没写(数据里没有 false)。
   */
  firstCome: boolean | null

  /**
   * 先到先得的官网原句。
   */
  firstComeQuote: string

  /**
   * 出处页。
   */
  firstComeUrl: string

  /**
   * 每轮(intake period)最多发几个推荐;null = 官网没写。
   */
  perIntake: number | null

  /**
   * 每轮上限的官网原句。
   */
  perIntakeQuote: string

  /**
   * 出处页。
   */
  perIntakeUrl: string

  /**
   * 官网自报剩余名额;null = 官网没写。
   */
  remaining: number | null

  /**
   * 剩余名额的官网原句。
   */
  remainingQuote: string

  /**
   * 出处页。
   */
  remainingUrl: string

  /**
   * 官网自报的口径日。
   */
  asOf: string
}

/**
 * 省 × 制度 的名额状态聚合。
 * 🔴 空 = 官网没写,不是没有限额:各和只对官网写了数的社区求,一个都没有 = null(禁折 0)。
 */
export type PilotQuotaAgg = {
  /**
   * 省码。
   */
  province: string

  /**
   * RCIP | FCIP(身兼两制的社区计入两组 —— 名额状态出自同一社区官方页)。
   */
  type: string

  /**
   * 官网写了名额状态的社区数(≠该省试点社区总数,没写的社区不在本表)。
   */
  communities: number

  /**
   * 其中官网明说先到先得的社区数。
   */
  firstComeN: number

  /**
   * 有数的社区求和(一社区取 remaining,没有才取 perIntake;两者都没写不计入);一个都没有 = null。
   */
  quotaSum: number | null

  /**
   * 只汇总官网自报「剩余名额」的社区(语义单一,展示层用它;混着每轮上限的 quotaSum 不上屏)。
   */
  remainingSum: number | null

  /**
   * 只汇总官网自报「每轮上限」的社区(同上,语义单一)。
   */
  perIntakeSum: number | null

  /**
   * 各社区 as_of 取最大(ISO 日期字符串比较)。
   */
  asOf: string
}

/**
 * `PILOT_QUOTA_COMMUNITIES` 的原始行(consult 惯例:一条 SQL 一个列形状)。
 */
export type PilotQuotaDbRow = {
  /**
   * 社区名。
   */
  community: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 制度。
   */
  type: string | null

  /**
   * 先到先得;非布尔一律当 null(数据里没有 false)。
   */
  first_come: boolean | null

  /**
   * 原句。
   */
  first_come_quote: string | null

  /**
   * 出处。
   */
  first_come_url: string | null

  /**
   * 每轮上限(pg numeric 可能回字符串)。
   */
  per_intake: number | string | null

  /**
   * 原句。
   */
  per_intake_quote: string | null

  /**
   * 出处。
   */
  per_intake_url: string | null

  /**
   * 剩余名额。
   */
  remaining: number | string | null

  /**
   * 原句。
   */
  remaining_quote: string | null

  /**
   * 出处。
   */
  remaining_url: string | null

  /**
   * 口径日。
   */
  as_of: string | null
}

/**
 * `fetchPilotQuota` 的返回;表没建/查询失败 = [](上游按「没数据」处理,不编)。
 */
export type PilotQuotaOut = Promise<PilotQuotaAgg[]>

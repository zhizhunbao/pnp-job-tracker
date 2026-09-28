/**
 * pnp 域(省提名与联邦 EE 的事实区块)的死值:通道改制登记、EE 休眠门槛、联邦轮次的
 * 类型色与展开档、AIP 公司名归一的正则、判定与清单用到的档位串,外加地址、埋点名与记号。
 * 2026-08-28 换装批自 Pnp.tsx 的散值收拢挂注释(值一个不改)。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */

/**
 * 通道改制登记。Frank 2026-07-26 二拍:「老的历史记录删了吧,改成最新的打分规则」——
 * 上一版是灰化保留改制前的抽选行,实测整块被 8 条已关闭通道的历史占满,新规则反而看不见。
 * 现在:**改制日之前的抽选行直接不渲染**(它们属于已不存在的通道,不是本省现在的行情),改列现行规则。
 * ON 事实源(ontario.ca 实核 2026-07-26):O.Reg 422/17 修订 2026-06-25 生效,原 8 条流全部废止,
 * 只剩 Ontario Workforce Priority 一条(按 job offer 的 TEER 分档,全部 TEER 均有路径,另有自雇医生路径);
 * 新 EOI 系统官方称「今夏晚些时候开放」,旧 EOI 池已关闭不再发邀请 → 现阶段无抽选可列。
 * 规则行是**人工登记的政策事实**(同 on-workforce-priority.json 的性质);再多一两个省就该下沉数据层。
 * 每对是「项的文案键 · 内容的文案键」,渲染时按两列左对齐铺开。
 */
export const STREAM_REFORM: Record<string, {
  /**
   * 改制生效日(`YYYY-MM-DD`):这一天之前的抽选行不再列出。
   */
  since: string

  /**
   * 现行规则的文案键对(项的键 · 内容的键),按两列左对齐铺开。
   */
  rules: [string, string][]
}> = {
  /**
   * 安大略:2026-06 改制,原 8 条流废止。
   * 2026-09-27 九省体检(Frank「问题太多了」「能用多 agent 修么」):since 由 06-01 改为官方生效日 06-25(2026 更新页 June 26 条原句
   * 「These amendments came into force on June 25, 2026.」;06-26 是公告日,旧流归档页的 May 30 是各流停收日)。
   * 06-01 到 06-25 之间没有轮次,显示不变。
   */
  ON: {
    since: '2026-06-25',
    rules: [['pnpdraws.on.k1', 'pnpdraws.on.v1'], ['pnpdraws.on.k2', 'pnpdraws.on.v2'],
      ['pnpdraws.on.k3', 'pnpdraws.on.v3'], ['pnpdraws.on.k4', 'pnpdraws.on.v4']],
  },
}

/**
 * EE 类别「休眠」的月数门槛(Frank 2026-07-26「ee stem 好久没有抽人了吧」——
 * 实核:STEM 上次 2024-04、运输 2024-03、教育 2025-09)。12 个月内有抽选=活跃;超过=休眠。
 */
export const EE_DORMANT_MONTHS = 12

/**
 * 一个月按多少天折算(月数门槛换成毫秒时的平均天数,不做日历精算)。
 */
export const MONTH_DAYS = 30.4

/**
 * 联邦轮次类型 → 显示色(一类一色)。轮次类型是**数据**不是版式,所以留在 tsx 走内联色,
 * 几何全在 pnp.module.css(判定与分工写在 main.css 第 16 段的原注释里)。
 */
export const FED_TYPE_COLOR: Record<string, string> = {
  /**
   * 加拿大经验类(CEC):蓝。
   */
  cec: '#2563eb',

  /**
   * 法语类:紫。
   */
  french: '#7c3aed',

  /**
   * 省提名类:墨绿。
   */
  pnp: '#0f766e',

  /**
   * 通用轮次:灰。
   */
  general: '#4b5563',

  /**
   * 联邦技术移民(FSW):灰。
   */
  fsw: '#4b5563',

  /**
   * 联邦技工(FST):灰。
   */
  fst: '#4b5563',
}

/**
 * 职业类别轮次的桶键(不在 FED_PROGRAM 里的类型都并进这一桶)。
 */
export const FED_CAT_KEY = '__cat'

/**
 * 职业类别桶与未登记轮次类型在**行**上的色(琥珀)。
 */
export const COLOR_CAT = '#b45309'

/**
 * 未登记轮次类型在**口径注**上的兜底色(灰)。
 */
export const COLOR_FED_OTHER = '#4b5563'

/**
 * 公司名里的组织形式后缀(镜像 etl/clean/05c_flag_aip.py 的 norm_name)。
 */
// eslint-disable-next-line @stylistic/max-len -- 一条正则就是一个值:词表断行会变成两个不同的正则,与 etl 那份镜像当场脱节
export const AIP_SUFFIX_RE = /\b(inc|incorporated|ltd|limited|llp|llc|corp|corporation|co|company|enr|ltee|ltée|holdings?|group|services?|enterprises?)\b\.?/gi

/**
 * 「经营名」分隔(o/a、dba、d/b/a):只取分隔前那一段当正名。
 */
export const AIP_ALIAS_RE = /\bo\/a\b|\bdba\b|\bd\/b\/a\b/

/**
 * 归一时要抹掉的字符(只留小写字母、数字、& 与空格)。
 */
export const AIP_DROP_RE = /[^a-z0-9& ]/g

/**
 * 连续空白(归一时压成单个空格)。
 */
export const SPACE_RUN_RE = /\s+/g

/**
 * 单个空格(抹字符与压空白时的替换值)。
 */
export const SPACE = ' '

/**
 * 大西洋四省(AIP 的适用范围;不在其中的省 AIP 一律不适用)。
 */
export const ATLANTIC_PROVS = ['NL', 'NB', 'NS', 'PE']

/**
 * 先同雇主干满 6 个月才走得通的普通通道省(TEER 4-5 的「凭什么」分档之一;
 * 省集合镜像 etl/08_score.UNIVERSAL_*_PROVS)。
 */
export const COND_PROVS = ['MB', 'NS', 'NB', 'PE']

/**
 * 大西洋试点(AIP)的项目名。
 */
export const PROGRAM_AIP = 'AIP'

/**
 * 省提名的项目名(数据层空档在映射时落它)。
 */
export const PROGRAM_PNP = 'PNP'

/**
 * 本省抽选卡里 AIP 那一组的通道名(抽选行 stream 原值;NB 官网把 AIP 选取与省提名邀请发在同一张抽选页)。
 * AIP 轮次的数字是选中进入审理的申请、不是邀请(官网原句「Atlantic Immigration Program figures show applications
 * selected for processing; all other streams show invitations issued」),文案走 pnpdraws.sel(2026-09-23)。
 */
export const DRAW_STREAM_AIP = 'AIP'

/**
 * PNP 格写通用雇主担保通道时(jobs 的 PNP_GENERIC_PROVS),本省抽选卡里对应的那一组(抽选行 stream 原值,
 * etl/pnp 洗出的官方通道名):点进来琥珀高亮、排最前。2026-09-23 Frank「所以这个 NB 技术工人点进去应该哪个高亮」立。
 * 其余省对不上一一对应,不登记 = 不高亮:BC 整卡都是 Skills Immigration 的类别轮,MB / PE 组名与通道不同名,
 * SK / NS 没有抽选,ON 改制卡暂撤。
 * 2026-09-24 九省通道审计改判 PE / NL:两省抽选卡只有一组、该组覆盖本省全部通道(PE「Labour & Express Entry」= Workforce
 * 各流 + PEI EE;NL「NLPNP + AIP (ITA batch)」= NLPNP 各类 + AIP 同一 EOI 池),点进来就高亮那一组;
 * MB 待 etl 把 Skilled Worker in Manitoba 那一层留作组名再登记(现组名是下层的选取方式);NS 官方只发月度总数、不分通道。
 * 同日第三批(Frank「能都改完吗」):etl 已把 MB 那一层留作组名 → 登记 MB;BC 普通岗登记 Innovate: High Economic Impact
 * (BC 现行抽选只剩定向类别轮与这一种不限职业的轮 —— 不在定向清单上的岗只能从这一轮进,门槛是薪资或分数)。
 * 2026-09-27 Frank「NS 这个省 弹框怎么都是汇总数据」「还是横着排的」:NS 抽选卡改成同一种组头行(按月那一组),
 * 照 NL 口径登记 NS —— 官方只按月公布 EOI 池的总选取人数(liveinnovascotia.com/eoi-selection「Nova Scotia selected the following
 * number of candidates from the Expression of Interest (EOI) pool」),NSNP 各流与 AIP 同一个池,这一组覆盖本省全部通道。
 */
export const GEN_DRAW_STREAM: Record<string, string> = {
  /**
   * 新不伦瑞克:NB 技术工人(官网 New Brunswick Skilled Worker stream)。
   */
  NB: 'NB Skilled Worker',

  /**
   * 阿尔伯塔:AB 机会通道(官网 Alberta Opportunity Stream,抽选组同名)。
   */
  AB: 'Alberta Opportunity Stream',

  /**
   * 爱德华王子岛:PE 劳工通道(Workforce 各流与 PEI EE 同一组抽选)。
   */
  PE: 'Labour & Express Entry',

  /**
   * BC 技术工人(不在定向清单上的岗只能从这一轮进)。
   */
  BC: 'Innovate: High Economic Impact',

  /**
   * 曼尼托巴:MB 技术工人(SWM,下面三种选取)。
   */
  MB: 'Skilled Worker in Manitoba',

  /**
   * 纽芬兰与拉布拉多:NL 技术工人(NLPNP 各类与 AIP 同一 EOI 池、同一组批次)。
   */
  NL: 'NLPNP + AIP (ITA batch)',

  /**
   * 新斯科舍:NS 技术工人(NSNP 各流与 AIP 同一个 EOI 池,官方只发月度总数;组名是 etl 给按月行起的名字,2026-09-27)。
   */
  NS: 'Monthly EOI selections',

  /**
   * 安大略:ON 劳动力优先(2026-06 改制后只剩 Ontario Workforce Priority Stream 一条,官方公告原句「portal now open to Ontario
   * Workforce Priority Stream expressions of interest」;抽选卡那一行的组键,显示名走 pnp.gen.ON,同通道卡;
   * 2026-09-27 Frank 勾「安省改一行组头」(看过效果图))。
   */
  ON: 'Ontario Workforce Priority Stream',
}

/**
 * PNP 格写具名清单通道时(jobs 的 pnpStream,数据层中文标签),本省抽选卡里对应的组(抽选行 stream 原值):
 * 点进来琥珀高亮、排最前。2026-09-24 Frank「AB 医疗也走机会通道?」「点进去应该哪个高亮」引出 —— 阿省医护专项清单进库,
 * 同批把与抽选组一一对得上的具名清单登记进来;SK / MB / NS / PE 的具名清单对不上抽选组,不登记 = 不高亮。
 */
export const NAMED_DRAW_STREAMS: Record<string, string[]> = {
  /**
   * 阿省医护专项(Dedicated Health Care Pathway,EE 与非 EE 两版分开抽;另一组 Priority Sectors (Health Care)
   * 是 EE 的医疗行业定向,范围比 9 个受监管职业宽,不算)。
   */
  'AB 医疗': ['Dedicated Health Care Pathway – Express Entry', 'Dedicated Health Care Pathway – non-Express Entry'],

  /**
   * 阿省加速科技通道。
   */
  'AB 科技': ['Alberta Express Entry Stream – Accelerated Tech Pathway'],

  /**
   * BC 医疗定向。
   */
  'BC 医疗': ['Care: Health'],

  /**
   * BC 幼教定向。
   */
  'BC 幼教': ['Care: Childcare'],

  /**
   * BC 兽医定向。
   */
  'BC 兽医': ['Care: Veterinary Care'],

  /**
   * BC 建筑技工定向。
   */
  'BC 建筑技工': ['Build: Construction Trades'],

  /**
   * BC 法语教师定向。
   */
  'BC 法语教师': ['Care: Education'],

  /**
   * PE 在需职业(Occupations in Demand 与 Workforce 各流同一组抽选,2026-09-24 九省通道审计登记)。
   */
  'PE 在需职业': ['Labour & Express Entry'],

  /**
   * 阿省警务专项(2026-09-24 第三批)。
   */
  'AB 警务': ['Alberta Express Entry Stream – Law Enforcement Pathway'],

  /**
   * 阿省旅游酒店通道。
   */
  'AB 旅游酒店': ['Tourism and Hospitality Stream'],

  /**
   * 阿省乡村振兴(按指定社区)。
   */
  'AB 乡村振兴': ['Rural Renewal Stream'],

  /**
   * NS 建筑(2026-09-27 九省体检(Frank「问题太多了」「能用多 agent 修么」):官方 eoi-process 页 2025-11-28 条 NSNP 各流与 AIP 同一个 EOI 池,
   * 建筑是 Skilled Worker 流下的子条件 —— 与通用岗同一组按月选取;原先没登记,点进来那一组不高亮)。
   */
  'NS 建筑': ['Monthly EOI selections'],
}

/**
 * 官方明说不按分数抽选的省(抽选卡标题下出一行灰字注明;2026-09-23 Frank「NB 省不需要分数,在哪标注一下」)。
 * NB 出处 gnb.ca 的 invitation-selection-rounds 页原句「Invitations and selections are based on provincial labour
 * market needs, available allocation and other priorities determined by the Government of New Brunswick.」
 * 只收有官方原句的省:别省只是没公布分数线,不等于不按分数。
 */
export const DRAW_NO_SCORE_PROVS = new Set(['NB'])

/**
 * 官方口径是「从 EOI 池里选取」而不是「发邀请」的省(抽选行的人数写「入选」;2026-09-26 /fe 首页 Frank「止血 + 补完整」)。
 * NS 出处 liveinnovascotia.com/eoi-selection 原句「Nova Scotia selected the following number of candidates from the
 * Expression of Interest (EOI) pool during the months noted below」(crawl ns-root 缓存,Last Updated: August 17, 2026)。
 * 只收有官方原句的省。
 */
export const DRAW_SELECT_PROVS = new Set(['NS'])

/**
 * 抽选行 selection 短码的拆法:种类 + 最多两个参数(数据层写成「种类:参数:参数」,如 wage:52:105000、top:2、path:exp+prio、occ)。
 * 组名 kind / arg / arg2,取值走 `m.groups`。
 * 2026-09-27 Frank「这个数据怎么回事」「这两个还不一样吗」「这他妈弄的乱七八糟的」,看过效果图选「照改,加这一列」:同一组同一天几行各是哪一项,数据层按官方原句判成短码,前端按码翻三语。
 */
export const SEL_CODE_RE = /^(?<kind>[a-z]+)(?::(?<arg>[^:]+))?(?::(?<arg2>[^:]+))?$/

/**
 * selection 短码里多条路径的连接符(NB:path:exp+prio)。
 */
export const SEL_PATH_SEP = '+'

/**
 * 不带参数的几种选取 → 词条键。
 */
export const SEL_KEYS: Record<string, string> = {
  /**
   * 曼省定向职业(Occupation-specific selection)。
   */
  occ: 'pnpsel.occ',

  /**
   * 曼省法语(Francophone selection)。
   */
  franco: 'pnpsel.franco',

  /**
   * 曼省毕业(Completed post-secondary study in Manitoba)。
   */
  grad: 'pnpsel.grad',

  /**
   * 按分数(BC Points / A minimum score of N points)。
   */
  points: 'pnpsel.points',
}

/**
 * 高分者那一种(top:N,N = 官方写的大类 / 主类码,如 2、72)。
 */
export const SEL_TOP = 'top'

/**
 * 工资档那一种(wage:时薪:年薪)。
 */
export const SEL_WAGE = 'wage'

/**
 * 按路径那一种(NB:path:exp+prio)。
 */
export const SEL_PATH = 'path'

/**
 * 按分数那一档:组里有几种选取时,组头的最低分只在组头那一轮是这一档时出(BC 的分数档对整组都成立;
 * 曼省的分数只属于某一大类的高分者,不出)。
 */
export const SEL_POINTS = 'points'

/**
 * 高分者大类名的词条键前缀(pnpsel.cat.2 = 理工)。
 */
export const SEL_CAT_HEAD = 'pnpsel.cat.'

/**
 * 路径名的词条键前缀(pnpsel.path.exp = NB 工作经验)。
 */
export const SEL_PATH_HEAD = 'pnpsel.path.'

/**
 * 只到月的抽选日期长度(`YYYY-MM` = 7;NS 按月公布选取人数,数据层照官方写到月,不补日)。
 * 这种行是一个月的汇总,不是一轮抽选:不进分组、不算「近 90 天几轮」,单走按月那一种卡(见 monthRowsOf)。
 */
export const MONTH_DATE_LEN = 7

/**
 * 按月那一种抽选卡最多列几个月(一年;显示窗口,不是事实)。
 */
export const MONTHLY_ROWS_MAX = 12

/**
 * 本省抽选卡「查看全省 N 组」那个开关在展开集合里的键(组键是官方通道名,不会与它撞;同 FED_CAT_KEY 的写法)。
 */
export const DRAWS_ALL_KEY = '__all'

/**
 * 本省抽选卡的形:按通道分组(带日期的轮次)。
 */
export const DRAWS_FORM_GROUPS = 'groups'

/**
 * 本省抽选卡的形:按月列选取人数(只到月的汇总行,NS)。
 */
export const DRAWS_FORM_MONTHLY = 'monthly'

/**
 * 本省抽选卡的形:改制省的现状(改制后的官方公告 + 改制后发没发过邀请,ON)。
 */
export const DRAWS_FORM_STATUS = 'status'

/**
 * 本省抽选卡的形:不出卡。
 */
export const DRAWS_FORM_NONE = 'none'

/**
 * 人数口径:AIP 那一组(选中进入审理的申请,见 DRAW_STREAM_AIP)。
 */
export const COUNT_AIP = 'aip'

/**
 * 人数口径:从 EOI 池里选取的人(DRAW_SELECT_PROVS)。
 */
export const COUNT_SEL = 'sel'

/**
 * 人数口径:发出的邀请(其余)。
 */
export const COUNT_INV = 'inv'

/**
 * 组头计数的文案键:按轮计(省抽选各组、EE 分数线各组)。
 */
export const ROUNDS_KEYS: Record<'one' | 'many', string> = {
  /**
   * 一轮(英文单数)。
   */
  one: 'eecmp.roundsOne',

  /**
   * 多轮。
   */
  many: 'eecmp.rounds',
}

/**
 * 组头计数的文案键:按月计(2026-09-27 Frank「NS 这个省 弹框怎么都是汇总数据」「还是横着排的」:NS 按月那一组写「N 个月」,不写「N 轮」)。
 */
export const MONTHS_KEYS: Record<'one' | 'many', string> = {
  /**
   * 一个月(英文单数)。
   */
  one: 'pnpdraws.monthsOne',

  /**
   * 多个月。
   */
  many: 'pnpdraws.months',
}

/**
 * 抽选行人数那一格的文案键(按人数口径;2026-09-26 起 NS 的选取人数写「入选」,不再借「份邀请」)。
 */
export const COUNT_ROW_KEY: Record<'aip' | 'sel' | 'inv', string> = {
  /**
   * AIP:{n} 份申请入选。
   */
  aip: 'pnpdraws.sel',

  /**
   * EOI 选取:{n} 人入选。
   */
  sel: 'pnpfacts.selPeople',

  /**
   * 邀请:{n} 份邀请。
   */
  inv: 'pnpdraws.inv',
}

/**
 * 通用通道名词条的键头(`pnp.gen.` + 省码;与职位板 PNP 格 jobs 域的 K_PNP_GEN_HEAD 读同一组词条 ——
 * 域之间不互取常量,各抄一份)。拼出的键查不到词条 = 该省没有通用通道名(领地等),「本岗能走的通道」卡不列。
 */
export const PNP_GEN_HEAD = 'pnp.gen.'

/**
 * 官方链接显示成站名时取主机名的正则(去协议与 www.;取不到就不出链接)。组名 `host` = 站名,取值走 `m.groups.host`。
 */
export const HOST_RE = /^https?:\/\/(?:www\.)?(?<host>[^/?#:]+)/i

/**
 * 数字的显示地区(千分位按加拿大英文习惯,与把脉页 start 域、城市 city 域同值;各域一份)。
 * 2026-09-27 上午随本岗那一组的三格一起删过,2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」:配额卡的数字要千分位,加回来。
 */
export const NUM_LOCALE = 'en-CA'

/**
 * 运营统计里「配额」那一格的指标名(pnp_ops_stats.metric)。
 */
export const OPS_ALLOCATION = 'allocation'

/**
 * 运营统计里「已发提名」那一格可能的指标名:阿省官方写 issued,曼省 / 萨省写年初至今的 nominations_ytd(同一件事,两省各叫各的)。
 */
export const OPS_ISSUED_METRICS = ['issued', 'nominations_ytd']

/**
 * 运营统计里「剩余」那一格的指标名(目前只有阿省官方直接公布)。
 */
export const OPS_REMAINING = 'remaining'

/**
 * 全年已发邀请合计的指标名(汇装按当年抽选行加总,缺一轮不出)。
 */
export const OPS_INV_YTD = 'invitations_ytd'

/**
 * 全年已入选合计的指标名(NS 按月 EOI 选取人数加总;不叫邀请)。
 */
export const OPS_SEL_YTD = 'selections_ytd'

/**
 * 运营统计里通道级那一层的口径名(scope_kind;全省那一层是空串)。
 */
export const OPS_SCOPE_STREAM = 'stream'

/**
 * 「{年} 年配额」卡的列:每列认哪几个指标名 · 列名的词条键(顺序即列序;只列这个省官方有的项,2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」)。
 * 2026-09-27 Frank「已发和总数放到一个卡片里可以吗」「你帮我弄」:抽选卡标题下那行全年合计并进来,排在剩余之后(已发邀请;NS 叫已入选)。
 */
export const QUOTA_COLS: [string[], string][] = [
  [[OPS_ALLOCATION], 'pnpquota.total'],
  [OPS_ISSUED_METRICS, 'pnpquota.issued'],
  [[OPS_REMAINING], 'pnpquota.remaining'],
  [[OPS_INV_YTD], 'pnpquota.inv'],
  [[OPS_SEL_YTD], 'pnpquota.sel'],
]

/**
 * 本岗具名通道 → 配额行的通道键(2026-09-27 九省体检(Frank「问题太多了」「能用多 agent 修么」):阿省医护 / 科技 / 警务三条的抽选组名与
 * 官方配额表的通道名不同字 —— 抽选「Dedicated Health Care Pathway – Express Entry」对配额「Dedicated Health Care Pathways」、
 * 抽选「Alberta Express Entry Stream – Accelerated Tech Pathway」对配额「Accelerated Tech Pathway」,按组名小写逐字相等配不上,
 * 配额卡缺「本岗通道」那一行。官方 aaip-processing-information 页 Table 6 / Table 7 就是这三行。键同 NAMED_DRAW_STREAMS
 * (岗位行 pnpStream 原值),值是配额行的通道键(小写官方通道名)。
 */
export const QUOTA_STREAM_KEYS: Record<string, string> = {
  /**
   * 阿省医护专项(Table 6 Dedicated Health Care Pathways)。
   */
  'AB 医疗': 'dedicated health care pathways',

  /**
   * 阿省加速科技通道(Table 7 Accelerated Tech Pathway)。
   */
  'AB 科技': 'accelerated tech pathway',

  /**
   * 阿省警务专项(Table 7 Law Enforcement Pathway)。
   */
  'AB 警务': 'law enforcement pathway',
}

/**
 * 配额小表左上角那个空格的 React 列表键。
 */
export const QUOTA_KEY_CORNER = 'corner'

/**
 * 配额小表列名格的 React 列表键前缀。
 */
export const QUOTA_KEY_HEAD = 'h'

/**
 * 配额小表行名格的 React 列表键前缀。
 */
export const QUOTA_KEY_LABEL = 'l'

/**
 * 年份在统计期 / 截至日里的长度(`2026 Jan-Aug`、`2026Q2`、`2026-09-23` 的头 4 位)。
 */
export const YEAR_LEN = 4

/**
 * 「本岗通道的门槛」卡:本岗 PNP 格写的具名通道 → 门槛表(pnp_requirements.stream)里对应的官方流(2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」;
 * 先上 AB,没登记的通道不出卡)。键同 NAMED_DRAW_STREAMS(岗位行 pnpStream 原值);流名逐字照门槛表(含长破折号)。
 * 医疗专线有 EE / 非 EE 两版,登非 EE 版(持 offer 在阿省工作、没有 EE 档案也能走的那一版);警务专线是 EE 流的一支,
 * 官方资格页只写了 EE 流的最低要求。
 */
export const NAMED_REQ_STREAMS: Record<string, string[]> = {
  /**
   * 阿省科技加速专线:EE 流最低要求 + 专线两条。
   */
  'AB 科技': ['AAIP Alberta Express Entry Stream', 'AAIP Alberta Express Entry Stream — Accelerated Tech Pathway'],

  /**
   * 阿省医护专项(非 EE 版)。
   */
  'AB 医疗': ['AAIP Dedicated Health Care Pathway — Non-Express Entry'],

  /**
   * 阿省乡村振兴流。
   */
  'AB 乡村振兴': ['AAIP Rural Renewal Stream'],

  /**
   * 阿省旅游酒店流(2026-09-27 同批从官方资格页补抓的五条)。
   */
  'AB 旅游酒店': ['AAIP Tourism and Hospitality Stream'],

  /**
   * 阿省警务专线(EE 流最低要求)。
   */
  'AB 警务': ['AAIP Alberta Express Entry Stream'],
}

/**
 * 同上,本岗 PNP 格没写具名通道、落省默认通道时:省码 → 门槛表里的流(口径同 GEN_DRAW_STREAM)。
 */
export const GEN_REQ_STREAMS: Record<string, string[]> = {
  /**
   * 阿省默认通道 = Alberta Opportunity Stream。
   */
  AB: ['AAIP Alberta Opportunity Stream'],
}

/**
 * 门槛卡读的因素名(门槛表 factor 列原值)。
 */
export const GATE_F = {
  /**
   * offer 形态(全职 / 不收哪几种;汇装从 PROV_OFFER_BLOCKED 出的行)。
   */
  offerForm: 'offerForm',

  /**
   * 语言。
   */
  language: 'language',

  /**
   * 工作经验。
   */
  experience: 'experience',

  /**
   * 联邦 EE 档案。
   */
  eeProfile: 'eeProfile',

  /**
   * 符合 CEC / FSW / FST。
   */
  eeProgram: 'eeProgram',

  /**
   * CRS 分数线。
   */
  crs: 'crs',

  /**
   * 雇主经营年限。
   */
  empYears: 'empYears',

  /**
   * 雇主年收入。
   */
  empRevenue: 'empRevenue',

  /**
   * 雇主全职员工数。
   */
  empStaff: 'empStaff',

  /**
   * 指定社区推荐信。
   */
  endorse: 'communityEndorsement',

  /**
   * 职业执照或注册。
   */
  licensing: 'licensing',
}

/**
 * 门槛卡的行键(React 列表键,也是开合状态的键)。
 */
export const GATE_ROW = {
  /**
   * 雇主 offer。
   */
  offer: 'offer',

  /**
   * 语言。
   */
  lang: 'lang',

  /**
   * 工作经验。
   */
  exp: 'exp',

  /**
   * EE。
   */
  ee: 'ee',

  /**
   * 雇主。
   */
  emp: 'emp',

  /**
   * 其他。
   */
  other: 'other',
}

/**
 * 门槛表里雇主侧的主体值。
 */
export const GATE_SUBJECT_EMPLOYER = 'employer'

/**
 * 门槛表「不低于」算子。
 */
export const GATE_OP_GE = '>='

/**
 * 语言门槛的单位。
 */
export const GATE_UNIT_CLB = 'CLB'

/**
 * 经验门槛的单位。
 */
export const GATE_UNIT_MONTHS = 'months'

/**
 * 阿省境内经验替代行的条件标记(门槛表 appliesCondition 原值)。
 */
export const GATE_COND_LOCAL = 'ab-local-experience'

/**
 * 口径包的分隔符(`k=v;k=v`)。
 */
export const BASIS_SEP = ';'

/**
 * 口径包里键与值之间的等号。
 */
export const BASIS_KV = '='

/**
 * 口径包的窗口期键(近 N 个月内)。
 */
export const BASIS_WINDOW = 'windowMonths'

/**
 * 口径包的「同雇主在职」标记。
 */
export const BASIS_TENURE = 'employerTenure'

/**
 * 口径包的编码值键(offer 形态行:过不了的工时 / 雇佣期取值)。
 */
export const BASIS_VALUE_CODE = 'valueCode'

/**
 * 编码值里取值之间的分隔符。
 */
export const VALUE_CODE_SEP = ','

/**
 * 「不收」清单的显示顺序(照官方原句「part-time, casual or seasonal」的次序,合同工殿后)。
 */
export const GATE_FORM_ORDER = ['part', 'casual', 'seasonal', 'term']

/**
 * 「不收」清单一项的文案键前缀。
 */
export const GATE_FORM_HEAD = 'pnpgate.no.'

/**
 * 魁省省码(走自己的体系,不属 PNP)。
 */
export const PROV_QC = 'QC'

/**
 * 纽芬兰省码(TEER 4-5 有 offer 即可,是「凭什么」的单独一档)。
 */
export const PROV_NL = 'NL'

/**
 * 通告行(如 ON 2026-06 改制):渲染成跨列的一条通告,不是抽选。
 */
export const KIND_NOTICE = 'notice'

/**
 * 联邦行的省码(pnp_draws 里 province=FED 的行就是 EE 轮次,零新表)。
 * 2026-09-23 随联邦抽选近况卡撤编删过一次,同日 EE 分数线对比卡取 CEC 最近一轮又用上。
 */
export const PROV_FED = 'FED'

/**
 * 抽选行。
 */
export const KIND_DRAW = 'draw'

/**
 * 联邦轮次里 CEC 的类别键(build_ee_draws.CAT_MAP 写的 label)。
 */
export const FED_CEC = 'cec'

/**
 * 联邦轮次里法语的类别键(按语言能力抽、与职业无关;分数线卡只作参照组,不出分差)。
 */
export const FED_FRENCH = 'french'

/**
 * 排除清单的类型名(省里逐条点名「这些职业不受理」的那种表)。
 */
export const TYPE_INELIGIBLE = 'ineligible'

/**
 * 技能岗的 TEER 上限(0-3 算技能岗)。
 */
export const TEER_SKILLED_MAX = 3

/**
 * 中文界面的语言码(英文流名的中文灰注只在它下面出)。
 */
export const LANG_ZH = 'zh'

/**
 * 英文的语言码(「本岗能走的通道」主文案一律英文官方名,界面语言译名作灰字;同职位板 PNP 格)。
 */
export const LANG_EN = 'en'

/**
 * 省名文案键的前缀(拼省码取人话省名)。
 */
export const PROV_KEY_HEAD = 'prov.'

/**
 * 匹配档文案键的前缀(拼 high/mid/low/na 取档名)。
 */
export const MATCH_LEVEL_HEAD = 'match.'

/**
 * 「没有」的空文本(不出灰注、不出话术时的值)。各域一份。
 */
export const TEXT_NONE = ''

/**
 * 空值符(数据这一格官方没给)。
 */
export const DASH = '—'

/**
 * 类名之间的分隔。
 */
export const CLS_SEP = ' '

/**
 * 已展开的折叠记号。
 */
export const CARET_OPEN = '▴'

/**
 * 已收起的折叠记号。
 */
export const CARET_CLOSED = '▾'

/**
 * 带 tooltip 的判定后面那枚记号(鼠标悬停才有更多话)。
 */
export const TIP_MARK = ' ⓘ'

/**
 * 「不适用」那一档的图标位:一个点(没有结论可给,也不摆判定图标)。
 */
export const DOT_MARK = '·'

/**
 * 把日期串补成当天零点(判 EE 休眠时要拿它算毫秒差,不补时区解析口径会跟着浏览器跑)。
 */
export const DAY_START_SUFFIX = 'T00:00:00'

/**
 * 灰注与主文案之间的全角空格(#175 Frank「这种还是不要用括号了」:译名不再括号包,改灰注跟在后面)。
 */
export const NOTE_GAP = '　'

/**
 * 职业码前缀(NOC 码当同行行尾灰注,不另起行)。
 */
export const NOC_HEAD = 'NOC '

/**
 * 技能层级前缀。
 */
export const TEER_HEAD = 'TEER '

/**
 * 年薪的货币号。
 */
export const SALARY_HEAD = '$'

/**
 * 年薪的单位(整千显示)。
 */
export const SALARY_TAIL = 'K/yr'

/**
 * 年薪折算成整千的除数。
 */
export const SALARY_DIV = 1000

/**
 * 职位板按公司名搜索的地址头(「看这家公司的岗」)。
 */
export const URL_JOBS_Q_HEAD = '/?q='

/**
 * 动态详情页的地址头。
 */
export const URL_NEWS_HEAD = '/news/'

/**
 * 新开页的 target(站内长页与外站一律新开,rel 由 button 族补)。
 */
export const TARGET_BLANK = '_blank'

/**
 * 新开页的记号(↗ = 新开页惯例,跟在钮文字后面)。
 */
export const LINK_ARROW = ' ↗'

/**
 * 雇主线点击的埋点名。
 */
export const EV_EMPLOYER_CLICK = 'pnp-employer-click'

/**
 * 担保引流卡的来源:省提名弹框(有凭证才出卡的那一路)。
 */
export const SRC_PNP = 'pnp'

/**
 * 高亮行滚进视野的档位:就近滚,尽量不动整个弹框。
 */
export const SCROLL_BLOCK = 'nearest'

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 卡片标题行右端「来源 ↗」那颗钮的档(2026-09-27 Frank「这个来源看着很突兀 按钮」→ 选「描边小钮」):白底蓝字细边,配 sm 小号。
 */
export const SRC_BTN_KIND = 'secondary'

/**
 * 清单兜底:即便一条都没命中,也至少显这么多条。
 */
export const ROWS_FALLBACK = 1

/**
 * 依据链一格里几行起算「多行」:多行的格一行一块,单行的格就地铺开。
 */
export const CELL_MULTI_MIN = 2

/**
 * 细边框盒的留白档:不留(卡里紧贴标题的那层)。
 */
export const BOX_GAP_NONE = 'none'

/**
 * 判定档:能走(绿)。
 */
export const TONE_OK = 'ok'

/**
 * 判定档:提示(琥珀)。
 */
export const TONE_WARN = 'warn'

/**
 * 判定档:排除(红)。
 */
export const TONE_FAIL = 'fail'

/**
 * 判定档:不适用(灰)。
 */
export const TONE_NA = 'na'

/**
 * 依据链判定档:符合(绿)。
 */
export const TONE_PASS = 'pass'

/**
 * AIP 直判:雇主在指定名单上。
 */
export const AIP_ON = 'on'

/**
 * AIP 直判:大西洋省,但雇主不在指定名单上。
 */
export const AIP_MISS = 'miss'

/**
 * AIP 直判:非大西洋省,这条通道不适用。
 */
export const AIP_NA = 'na'

/**
 * 官方这一格没给数时的问号(拼进话术,不折成 0 —— 折 0 = 替官方编数)。
 */
export const UNKNOWN_MARK = '?'

/**
 * 多个命中类别之间的连接号。
 */
export const CAT_JOIN = '/'

/**
 * 拼 React 列表键时的分隔。
 */
export const KEY_SEP = '-'

/**
 * 省提名弹框事实索引里键的分隔(清单键形如 `NS|NS 建筑`、排除键形如 `SK|65201`;2026-09-26 首屏事实索引立,
 * 见 pnpFactsIndexOf)。
 */
export const FACTS_KEY_SEP = '|'

/**
 * 技能层级的窄位前缀(清单行里只给一个字母 + 数字)。
 */
export const TEER_SHORT_HEAD = 'T'

/**
 * 依据链规则:职业码。
 */
export const RULE_NOC = 'noc'

/**
 * 依据链规则:省提名。
 */
export const RULE_PROV = 'prov'

/**
 * 依据链规则:联邦 EE。
 */
export const RULE_EE = 'ee'

/**
 * 依据链规则:技能层级。
 */
export const RULE_TEER = 'teer'

/**
 * 依据链规则:薪资。
 */
export const RULE_WAGE = 'wage'

/**
 * 依据链规则:雇主 LMIA 记录。
 */
export const RULE_LMIA = 'lmia'

/**
 * 依据链键:本岗未匹配 NOC。
 */
export const KEY_NOC_UNCAT = 'match.r.noc.jobUncat'

/**
 * 依据链键:档案里没填职业码。
 */
export const KEY_NOC_NOPROFILE = 'match.r.noc.noProfile'

/**
 * 依据链键:职业码完全一致。
 */
export const KEY_NOC_EXACT = 'match.r.noc.exact'

/**
 * 依据链键:同中类职业码。
 */
export const KEY_NOC_MINOR = 'match.r.noc.minor'

/**
 * 依据链键:本岗不在目标省。
 */
export const KEY_PROV_NOTTARGET = 'match.r.prov.notTarget'

/**
 * 依据链键:魁省不参加 PNP。
 */
export const KEY_PROV_QC = 'match.r.prov.qc'

/**
 * 依据链键:省清单点名了本岗职业。
 */
export const KEY_PROV_NAMED = 'match.r.prov.named'

/**
 * 依据链键:省清单把本岗职业排除在外。
 */
export const KEY_PROV_EXCLUDED = 'match.r.prov.excluded'

/**
 * 依据链键:走通用档(省不设职业清单)。
 */
export const KEY_PROV_GENERIC = 'match.r.prov.generic'

/**
 * 依据链键:本省清单没覆盖到这个职业。
 */
export const KEY_PROV_UNCOVERED = 'match.r.prov.uncovered'

/**
 * 依据链键:本岗不属任何 EE 类别。
 */
export const KEY_EE_NONE = 'match.r.ee.none'

/**
 * 依据链键:所属类别近期没有抽选。
 */
export const KEY_EE_NODRAW = 'match.r.ee.noDraw'

/**
 * 依据链键:档案里没填 CRS。
 */
export const KEY_EE_NOCRS = 'match.r.ee.noCrs'

/**
 * 依据链键:CRS 高于该类别上次抽选线。
 */
export const KEY_EE_ABOVE = 'match.r.ee.above'

/**
 * 依据链键:TEER 达到技能岗档。
 */
export const KEY_TEER_OK = 'match.r.teer.ok'

/**
 * 依据链键:低 TEER 但有专门通道。
 */
export const KEY_TEER_CHANNEL = 'match.r.teer.channel'

/**
 * 依据链键:高于当地中位工资。
 */
export const KEY_WAGE_ABOVE = 'match.r.wage.above'

/**
 * 依据链键:与当地中位工资相当。
 */
export const KEY_WAGE_NEAR = 'match.r.wage.near'

/**
 * 依据链键:低于当地中位工资。
 */
export const KEY_WAGE_BELOW = 'match.r.wage.below'

/**
 * 依据链键:雇主没有 LMIA 记录。
 */
export const KEY_LMIA_NA = 'match.r.lmia.na'

/**
 * 依据链键:雇主只有低薪股 LMIA 记录。
 */
export const KEY_LMIA_LOWONLY = 'match.r.lmia.lowOnly'

/**
 * 通用 tag 桶的变体名(2026-09-13 胶囊统一第二批,Frank「都改成像这种的」:本域 .tagS / .muted / .vPill 四档退役):
 * 「你的职业」标 = ok(绿)。
 */
export const TAG_V_OK = 'ok'

/**
 * 弱化附注标(GTA 限制那种)与判定「不适用」= gray。
 */
export const TAG_V_GRAY = 'gray'

/**
 * 判定「关注」= warn(黄)。
 */
export const TAG_V_WARN = 'warn'

/**
 * 判定「未过」= imp(红)。
 */
export const TAG_V_IMP = 'imp'

/**
 * 省提名几张整表的懒取接口(2026-09-26 /fe 首页 Frank:首页不再内联这两张表,字段弹框打开才取)。
 * 2026-09-28 自 advisor 迁入(Frank「pnp 弹框自己管自己」):取数跟着省提名弹框住本域,advisor 的别的组反过来从本桶取。
 */
export const URL_API_JOBS_PNP = '/api/jobs/pnp'

/**
 * 省提名弹框的尺寸记忆键(2026-09-28 省提名弹框自立:原先它是字段弹框的一组,与字段 / 公司弹框共用这一份记住的宽高,照旧共用 ——
 * 值与 advisor 的 ADV_PREF 相同,各域自抄)。
 */
export const PNP_MODAL_PREF = 'adv_modal_pref'

/**
 * 省提名弹框没有记忆时的宽(px;照字段弹框)。
 */
export const PNP_MODAL_W = 900

/**
 * 省提名弹框没有记忆时的高(px;照字段弹框)。
 */
export const PNP_MODAL_H = 760

/**
 * 省提名弹框打开的埋点事件名(沿用字段弹框那一条:`modal-` + 分组名 pnp —— 弹框自立后事件名不变,漏斗不断档)。
 */
export const TRACK_MODAL_PNP = 'modal-pnp'

/**
 * 弹框打开埋点的参数名:从哪一格点进来的(沿用字段弹框那一条)。
 */
export const TRACK_P_FIELD = 'field'

/**
 * 标题译名的重译代数(省提名弹框没有重新翻译钮,恒为 0)。
 */
export const TITLE_TRANS_GEN = 0

/**
 * 省提名弹框里本省抽选卡带 AIP 轮次的省(etl/pnp 的 DRAWS_NB_LABEL「NBPNP + AIP」、DRAWS_NL_LABEL「NLPNP + AIP」:
 * 两省官网把 AIP 选取与省提名邀请发在同一张抽选页):小标写「{省}提名(PNP)及 AIP」
 * (2026-09-23 Frank「这里面还包含了 AIP 哈 不光是 PNP」)。
 * 2026-09-26 加 NS:数据层今起接入 NS 月度选取人数(etl/pnp 的 DRAWS_NS_LABEL「NSNP + AIP」—— NSNP 各通道与 AIP
 * 走同一个 EOI 池,官方按月只发一个总数),抽选卡标题带 AIP,小标同口径。
 * 2026-09-28 随省提名弹框自 advisor 迁入。
 */
export const AIP_DRAW_PROVS = new Set(['NB', 'NL', 'NS'])

/**
 * 页眉小标词条:「{省}提名(PNP)」。
 */
export const K_KICKER_PROV = 'grp.pnpProv'

/**
 * 页眉小标词条:「{省}提名(PNP)及 AIP」。
 */
export const K_KICKER_PROV_AIP = 'grp.pnpProvAip'

/**
 * 页眉小标词条:没有省 / 魁省(不参加 PNP)照旧写分组名。
 */
export const K_KICKER_GROUP = 'grp.pnp'

/**
 * 整表还在路上时那一行的文案词条(全站统一的加载行)。
 */
export const K_LOADING = 'act.loadingText'

/**
 * 整表没取成时那一句的词条(沿用雇主板同义的 de.loadFailed,不另起词条)。
 */
export const K_LOAD_FAILED = 'de.loadFailed'

/**
 * 整表没取成时那句话的提醒框色:notice 域四色里的红。
 */
export const NOTICE_ERR = 'err'

/**
 * 有「通用雇主担保通道」名的九省(2026-09-23 Frank「改 全改」):PNP 格写这条通道的名字(词条 `pnp.gen.` + 省码),
 * 不再写「{省} 可提名」。出处逐省在 etl 的 PNP 资格表与 mart 常量 UNIVERSAL_*_PROVS:AB Alberta Opportunity Stream、
 * BC Skills Immigration(2026-09-24 九省通道审计改名 BC Skilled Worker:Skills Immigration 是项目名,持 offer 的通道是它下面的
 * Skilled Worker stream)、SK SINP Employment Offer、ON Ontario Workforce Priority、MB Skilled Worker in Manitoba、
 * NS / NB / NL Skilled Worker、PE PEI Workforce。九省之外(领地等)照旧「{省} 可提名」。
 * 2026-09-28 自 jobs 迁入(省提名弹框自立第 4 步):原先职位板格子按这张表判、弹框通道卡按「英文词条查不查得到」判,
 * 两种判法同一个事实 —— 并成这一张,格子、手机胶囊、通道卡都走 pnpChannelKeyOf。
 */
export const GEN_CHANNEL_PROVS = new Set(['AB', 'BC', 'SK', 'ON', 'MB', 'NS', 'NB', 'PE', 'NL'])

/**
 * 省码与 NOC 拼成排除清单键的分隔符(键形如 `ON|72310`;2026-09-28 随排除键自 jobs 迁入,拼键与查键都只在本域)。
 */
export const EXCL_KEY_SEP = '|'

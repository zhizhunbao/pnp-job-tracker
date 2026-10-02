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
 * 公司名里的撇号,归一前先删(同数据层 names 域 norm_name 的 APOSTROPHE_RE)。2026-10-01 AIP 清单卡高亮前补:原先被 AIP_DROP_RE
 * 抹成空格,「Tim Horton's」归一成 tim horton s,对不上数据层的 tim hortons。
 */
export const AIP_APOS_RE = /['’]/g

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
 * 2026-09-29 抽选卡重排(Frank「如果改一个地方,是不是所有省份都得改一遍」):省提名弹框页眉「{省}提名(PNP)及 AIP」与「AIP 抽选」卡也按它出(AIP 的适用范围,
 * 不是按省写死的展示分支);原 AIP_DRAW_PROVS(NB / NL / NS 三省)退役,沿革见 functions 的 pnpKickerOf。
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
 * 抽选行 unit 格:选中进入审理的申请(etl/pnp 落盘门按官方原句逐行判好;人数写「份申请入选」,文案走 pnpdraws.sel)。
 * 2026-09-29 抽选卡重排(Frank「如果改一个地方,是不是所有省份都得改一遍」):原为 DRAW_STREAM_AIP = 'AIP'(按组名认 NB 的 AIP 组),改认数据层的 unit 格。原注:
 * 「本省抽选卡里 AIP 那一组的通道名(抽选行 stream 原值;NB 官网把 AIP 选取与省提名邀请发在同一张抽选页)。
 * AIP 轮次的数字是选中进入审理的申请、不是邀请(官网原句「Atlantic Immigration Program figures show applications
 * selected for processing; all other streams show invitations issued」),文案走 pnpdraws.sel(2026-09-23)。」
 */
export const UNIT_APPLICATION = 'application'

/**
 * 「{n} 份邀请」恰好 1 份时的词条(英文单数「1 invitation」;中韩同形)。2026-09-29 抽选卡重排线上验收:NL 的 AIP 那组最近一轮
 * 1 份,英文写成了「1 invitations」。
 */
export const COUNT_INV_ONE_KEY = 'pnpdraws.invOne'

/**
 * 抽选行 unit 格:从 EOI 池选中的人(人数写「人入选」)。
 * 2026-09-29 抽选卡重排(Frank「如果改一个地方,是不是所有省份都得改一遍」):原为 DRAW_SELECT_PROVS = new Set(['NS'])(按省名认),改认数据层的 unit 格。原注:
 * 「官方口径是「从 EOI 池里选取」而不是「发邀请」的省(抽选行的人数写「入选」;2026-09-26 /fe 首页 Frank「止血 + 补完整」)。
 * NS 出处 liveinnovascotia.com/eoi-selection 原句「Nova Scotia selected the following number of candidates from the
 * Expression of Interest (EOI) pool during the months noted below」(crawl ns-root 缓存,Last Updated: August 17, 2026)。
 * 只收有官方原句的省。」
 */
export const UNIT_SELECTION = 'selection'

/**
 * 抽选行 program 格:省提名与 AIP 同池、官方只发一个合计(NS;本省抽选卡头一行注明「人数含 AIP」,AIP 卡指回本省抽选)。
 * 2026-09-29 抽选卡重排(Frank「如果改一个地方,是不是所有省份都得改一遍」)。
 */
export const PROGRAM_POOL = 'PNP+AIP'

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
 * 走不了省提名的原因码里要显示的那几个(数据层 etl/mart 的 BLOCK_* 同一套码;2026-09-29 Frank「就直接说 兼职」)。
 * 清单排除 list 不在此列:格子「不符合清单」与弹框排除清单卡照旧走 pnpExcludedOf(手机上与 AIP 合并胶囊的写法绑着)。
 * 2026-10-01 Frank「不符合清单 都改成 不符合」:那个格子词(cell.pnpExcl)改成与这几个码同一个「不符合」,路子不变。
 */
export const PNP_BLOCK_CODES = ['part', 'term', 'seasonal', 'casual', 'wage', 'occ']

/**
 * 原因码:落在本省不受理清单(数据层 BLOCK_LIST;NB 叠加式不受理 / 排除式省的排除表)。
 */
export const PNP_BLOCK_LIST = 'list'

/**
 * 原因码:职业不在本省收的职业里(数据层 BLOCK_OCC)。
 */
export const PNP_BLOCK_OCC = 'occ'

/**
 * 弹框「本岗不满足的门槛」卡认的原因码(2026-10-01 Frank「统一一下 ee pnp aip 弹框的顺序 和 格式」,看过效果图「可以,做吧」):
 * 比格子那张(PNP_BLOCK_CODES)多一个清单排除 list —— 线上 NB 不受理清单上的岗点开没有这张卡也没有门槛卡,直接从配额开始。
 * list 在卡上写「职业不收」(与 occ 同一个词);格子照旧走 pnpExcludedOf,不受这里影响。
 */
export const PNP_BLOCK_CARD_CODES = ['part', 'term', 'seasonal', 'casual', 'wage', 'occ', 'list']

/**
 * 原因码词条的键头(拼码取界面词)。
 */
export const PNP_BLOCK_HEAD = 'pnp.block.'

/**
 * 职位板格子与手机胶囊上不写具体原因、统一写「不符合」的原因码(2026-09-30 Frank「兼职 这种都改成不符合 可以吗」,选「五个都改」):
 * 工作性质四个与工资那个 —— 职位板「类型」「期限」「vs 中位」三列已经写着;职业不收(occ)别的列看不出来,照写原因。
 * 弹框「本岗不满足的门槛」卡照旧写具体原因(pnpBlockOf)。
 * 2026-10-01 Frank「职业不收 也改成 不符合」:occ 也进来,六个码格子上都写「不符合」;弹框卡照旧写「职业不收」。
 */
export const PNP_BLOCK_UNFIT_CODES = ['part', 'term', 'seasonal', 'casual', 'wage', 'occ']

/**
 * 那几个码在格子与胶囊上的词条键(「不符合」)。
 */
export const PNP_BLOCK_UNFIT_KEY = 'pnp.block.unfit'

/**
 * 工作性质卡住的原因码(兼职 / 定期合同 / 季节工 / 临时工):通道卡上段不再列其余通道 —— 各省工人类通道都要全职、非季节、
 * 够长的 offer(2026-09-30 通道补全批二)。
 */
export const JOB_NATURE_BLOCKS = ['part', 'term', 'seasonal', 'casual']

/**
 * 通道条件标签的词条键头(拼标签键取界面词;标签键 = etl/pathways 的 TAG_KEYS)。
 */
export const CHAN_TAG_HEAD = 'pnpchan.tag.'

/**
 * 写 warn 色档(黄)的状态类标签(目前没有抽选排期 / 近期没再抽选 / 限时);其余条件类写 gray(灰)。
 */
export const CHAN_TAG_WARN = ['noDraws', 'drawsStopped', 'timeLimited']

/**
 * 本省其余通道列不列在本岗通道卡上,看标签:只带这几种的才列 —— 限指定雇主(看本岗雇主)与三种状态(没有抽选排期 / 近期没再抽选 /
 * 限时,不是条件)。带人的条件的(需先有 EE 档案、需本省毕业、需持 PGWP、需说法语、需持 LMIA 工签 …)不列:能不能走看申请人,
 * 不是这个职位能走的通道(2026-10-01 Frank「所有省,只列这个职位能走的通道」)。新加的标签默认算人的条件(不列),要列得进这张表。
 */
export const CHAN_JOB_TAGS = ['employers', 'noDraws', 'drawsStopped', 'timeLimited']

/**
 * 把所有人一分为二的人的条件:键是其余通道的标签,值是本岗自己那条通道上与它互补的标签。本岗那条带着值、其余某条带着键 ——
 * 每个人必落一边,两条合起来仍是「这个职位能走的通道」,那一条照列(2026-10-01 Frank「同一个工作 有 pgwp 的走一条通道,没有 pgwp
 * 走另一个通道吗」「都做吧」;眼下只有 NL:技术工人明文不收持 PGWP 的人,持 PGWP 的走国际毕业生)。
 */
export const CHAN_TAG_COMPLEMENT: Record<string, string> = {
  /**
   * 需持 PGWP ↔ 不收持 PGWP 的人。
   */
  pgwp: 'noPgwp',
}

/**
 * 只写成标签、不挡列出的人的条件:走这条路的人都得满足的门槛(同技术工人的「学历技能与工作对口」),不决定一个人该走哪条
 * (2026-10-01 Frank「都做吧」:NL 国际毕业生加「工作需与所学专业对口」;按 CHAN_JOB_TAGS 那条规矩它会把整条筛掉,与同日 PGWP 互补照列相冲)。
 */
export const CHAN_NOTE_TAGS = ['fieldOfStudy']

/**
 * 通道卡「你有 PGWP 吗」没选时的值(2026-10-01 Frank「这个是不是改成两个子卡片。能走哪个高亮哪个。」「你都改完」;
 * 选了就是 CHAN_TAG_COMPLEMENT 里那一对标签键之一:pgwp = 有、noPgwp = 没有)。
 */
export const PICK_NONE = ''

/**
 * 「有 PGWP」那一段对应的标签键。
 */
export const PICK_PGWP = 'pgwp'

/**
 * 「没有 PGWP」那一段对应的标签键。
 */
export const PICK_NO_PGWP = 'noPgwp'

/**
 * 分段钮档(通用钮桶 seg 档:挤成一组、当前那段蓝底)。
 */
export const BTN_SEG = 'seg'

/**
 * 通道对照表里 AIP 那一行的编号(通道卡上段在本岗能走 AIP 时列它;2026-09-30 Frank「能走 AIP 就列,不能走就不列」)。
 */
export const AIP_PATHWAY_KEY = 'aip'

/**
 * AIP 收的 TEER(官方:TEER 0–3 的 offer 至少一年,TEER 4 要长期;见 etl/mart AIP_TEERS 的原句)。
 */
export const AIP_CHANNEL_TEERS = [0, 1, 2, 3, 4]

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
 * 全年已发邀请的下限指标名(本年有轮次官方人数只写上限:AB「Less than 10」、BC「<5」,那几轮按 0 计;配额卡写「≥ N」、
 * 抽选卡底写「至少 N 份邀请」)。2026-09-29 抽选卡重排(Frank「如果改一个地方,是不是所有省份都得改一遍」)。
 */
export const OPS_INV_YTD_MIN = 'invitations_ytd_min'

/**
 * 全年选中进入审理的申请合计的指标名(NB 的 AIP 组;出在 AIP 那一份,「AIP 抽选」卡底读)。2026-09-29 抽选卡重排(Frank「如果改一个地方,是不是所有省份都得改一遍」)。
 */
export const OPS_APP_YTD = 'applications_ytd'

/**
 * 运营统计里抽选组那一层的口径名(scope_kind;scope = 抽选行 stream 原值;组头第三行读这一组的本年合计)。2026-09-29 Frank「每一个通道也需要一个总数吧」,选「单独一行靠右」。
 */
export const OPS_SCOPE_DRAW_STREAM = 'drawStream'

/**
 * 运营统计里项目那一层的口径名(scope_kind;全年合计 AIP 那一份,scope = AIP)。2026-09-29 抽选卡重排(Frank「如果改一个地方,是不是所有省份都得改一遍」)。
 */
export const OPS_SCOPE_PROGRAM = 'program'

/**
 * 卡底合计行认的指标名 → 人数口径(COUNT_ROW_KEY 的键;数同一个汇装合计,不在前端加)。2026-09-29 抽选卡重排(Frank「如果改一个地方,是不是所有省份都得改一遍」)。
 */
export const YTD_COUNT_KIND: Record<string, 'aip' | 'sel' | 'inv'> = {
  /**
   * 全年已发邀请。
   */
  'invitations_ytd': 'inv',

  /**
   * 全年已发邀请(下限)。
   */
  'invitations_ytd_min': 'inv',

  /**
   * 全年从 EOI 池选中的人(NS)。
   */
  'selections_ytd': 'sel',

  /**
   * 全年选中进入审理的申请(NB 的 AIP 组)。
   */
  'applications_ytd': 'aip',
}

/**
 * 下限数的前缀(配额卡「已发邀请」一格写「≥ 13,083」)。2026-09-29 抽选卡重排(Frank「如果改一个地方,是不是所有省份都得改一遍」)。
 * 同日线上 375 实测:普通空格让「≥」与数字在窄屏折成两行(英文阿省四列),改不断行空格。
 */
export const QUOTA_MIN_PREFIX = '≥\u00a0'

/**
 * 门槛表里「不经抽选」那类行的因素名(SK 持 offer 直接申请、PE 的 AIP 由指定雇主直接递背书申请;op = none)。
 * 2026-09-29 抽选卡重排(Frank「如果改一个地方,是不是所有省份都得改一遍」)。
 */
export const FACTOR_EOI_DRAW = 'eoiDraw'

/**
 * 「改制前的抽选」卡「查看全省 N 组」开关的键(与本省抽选卡的 DRAWS_ALL_KEY 分开开合)。2026-09-29 抽选卡重排(Frank「如果改一个地方,是不是所有省份都得改一遍」)。
 */
export const DRAWS_REFORM_ALL_KEY = '__allReform'


/**
 * 「{年} 年配额」卡的列:每列认哪几个指标名 · 列名的词条键(顺序即列序;只列这个省官方有的项,2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」)。
 * 2026-09-27 Frank「已发和总数放到一个卡片里可以吗」「你帮我弄」:抽选卡标题下那行全年合计并进来,排在剩余之后(已发邀请;NS 叫已入选)。
 * 2026-09-29 抽选卡重排(Frank「按你建议」):NS「已入选(含 AIP)」一列撤(那个数含 AIP,与只算省提名的总数并排像超发;改由本省抽选卡底写
 * 「7 个月,共 3,242 人入选」);已发邀请一列也认下限指标(AB / BC 有轮次官方只写上限,格里写「≥ N」)。
 */
export const QUOTA_COLS: [string[], string][] = [
  [[OPS_ALLOCATION], 'pnpquota.total'],
  [OPS_ISSUED_METRICS, 'pnpquota.issued'],
  [[OPS_REMAINING], 'pnpquota.remaining'],
  [[OPS_INV_YTD, OPS_INV_YTD_MIN], 'pnpquota.inv'],
]

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
 * 配额小表最右「截至 {日期}」那一列格子的 React 列表键(前缀;2026-09-28 Frank「放到一行吧」:日期挪进「全省」那一行)。
 */
export const QUOTA_KEY_ASOF = 'asof'

/**
 * 年份在统计期 / 截至日里的长度(`2026 Jan-Aug`、`2026Q2`、`2026-09-23` 的头 4 位)。
 */
export const YEAR_LEN = 4

/**
 * 门槛卡读的因素名(门槛表 factor 列原值)。
 */
export const GATE_F = {
  /**
   * 身份(条文行;basis 编码:where=inProvince 须已在本省工作、permits=a+b 认哪几类工签、noImplied 维持身份不算;2026-09-30
   * 通道与门槛批 1,Frank「那不是在国内有工作经验的可以直接申请了吗?」「对啊。门槛要说清楚」)。
   */
  status: 'status',

  /**
   * offer 形态(全职 / 不收哪几种;汇装从 PROV_OFFER_BLOCKED 出的行)。
   */
  offerForm: 'offerForm',

  /**
   * 语言。
   */
  language: 'language',

  /**
   * 语言免考条款(安省:近 N 年在本省毕业;2026-09-29)。
   */
  languageExempt: 'languageExempt',

  /**
   * 工作经验。
   */
  experience: 'experience',

  /**
   * 工作经验的替代路径(安省:同职业累计 N 年、持执照;判定引擎不读,只给门槛卡列「或……」;2026-09-29)。
   */
  experienceAlt: 'experienceAlt',

  /**
   * 工资(安省:本职业在本地区的中位工资;2026-09-29)。
   */
  wage: 'wage',

  /**
   * 本省打分表的最低分(萨省 SINP 60 分这类;2026-09-29 七省接入)。
   */
  pointsMin: 'pointsMin',

  /**
   * 居住时长(NB「have lived in New Brunswick for the past six months」这类;2026-09-29 七省接入)。
   */
  residence: 'residence',

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
   * 身份(申请时人得在哪、认哪几类工签;2026-09-30 通道与门槛批 1,排第一行)。
   */
  status: 'status',

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
   * 工资(2026-09-29 安省门槛卡加的行)。
   */
  wage: 'wage',

  /**
   * 积分(本省打分表最低分;2026-09-29 七省接入加的行)。
   */
  points: 'points',

  /**
   * 居住(2026-09-29 七省接入加的行)。
   */
  residence: 'residence',

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

  /**
   * 学历(2026-10-01 AIP 门槛卡加的行;Frank「格式需要 和 pnp 的保持一致吗」「可以,做吧」:同一套行名,排工作经验后)。
   */
  edu: 'edu',

  /**
   * 资金(同上,排学历后)。
   */
  funds: 'funds',
}

/**
 * AIP 门槛卡读的门槛因素(门槛表 factor 原值;2026-10-01 AIP 门槛卡,行来自 IRCC AIP 官方页,数据层 FED / AIP 那 36 行)。
 */
export const AIP_F = {
  /**
   * 全职(每周最少小时数)。
   */
  fullTime: 'offerFullTime',

  /**
   * 全年不分季节。
   */
  nonSeasonal: 'offerNonSeasonal',

  /**
   * offer 期限(TEER 0–3 有年数;TEER 4 是长期,无值)。
   */
  duration: 'offerDuration',

  /**
   * 须是省指定雇主。
   */
  designated: 'offerDesignatedEmployer',

  /**
   * 不能是本人或配偶控股的公司。
   */
  ownership: 'offerOwnershipExclusion',

  /**
   * 语言(CLB 档,按 TEER 分档)。
   */
  language: 'language',

  /**
   * 工作经验小时数。
   */
  hours: 'workHours',

  /**
   * 工作经验至少跨几年。
   */
  period: 'workPeriodMin',

  /**
   * 经验须同 TEER 或更高。
   */
  teerMatch: 'workTeerMatch',

  /**
   * 经验须带薪。
   */
  paid: 'workPaid',

  /**
   * 大西洋院校毕业免经验。
   */
  exemptGrad: 'workExemptGrad',

  /**
   * 免经验的学历学制最少年数。
   */
  gradYears: 'workExemptGradCredentialYears',

  /**
   * 免经验的学历毕业不满几年。
   */
  gradRecency: 'workExemptGradRecency',

  /**
   * 免经验要在大西洋省住满几个月。
   */
  gradResidency: 'workExemptGradResidencyMonths',

  /**
   * 学历(按 TEER 分档,条文无值)。
   */
  education: 'education',

  /**
   * 海外学历须做 ECA。
   */
  eca: 'educationEcaRequired',

  /**
   * 安家资金(按家庭人数各一行;最小那行就是 1 人)。
   */
  funds: 'fundsMinimum',

  /**
   * 已在加拿大持工签工作的免资金证明。
   */
  fundsWaived: 'fundsWaivedIfWorking',
}

/**
 * 门槛表里 AIP 按 TEER 分档的流名前缀(`teer-0-3`、`teer-4`;'' = 各档都适用)。
 */
export const AIP_TIER_PREFIX = 'teer-'

/**
 * AIP 分档流名里两个 TEER 之间的分隔。
 */
export const AIP_TIER_SEP = '-'

/**
 * AIP 学历行按档写一句的词条前缀(aipgate.edu.teer-0-1 / aipgate.edu.teer-2-4)。
 */
export const AIP_EDU_HEAD = 'aipgate.edu.'

/**
 * 大西洋院校毕业免经验的三个条件:门槛因素 → 灰字词条(2026-10-01 Frank「大西洋四省院校毕业可免 是什么意思」;按键序出)。
 */
export const AIP_GRAD_NOTE = {
  /**
   * 学制至少几年。
   */
  workExemptGradCredentialYears: 'aipgate.gradYears',

  /**
   * 申请 PR 时毕业不满几年。
   */
  workExemptGradRecency: 'aipgate.gradRecency',

  /**
   * 毕业前在大西洋省住满几个月。
   */
  workExemptGradResidencyMonths: 'aipgate.gradResidency',
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
 * 门槛表「不要求」算子(语言行:这几档 TEER 不要求语言考试 —— 卑诗 TEER 0 / 1、纽省与爱德华王子岛 TEER 0–3;
 * 2026-09-30 资讯页「通道与门槛」写成「不要求语言考试」,弹框照旧只挑带分数的档)。
 */
export const GATE_OP_NONE = 'none'

/**
 * 语言门槛的单位。
 */
export const GATE_UNIT_CLB = 'CLB'

/**
 * 经验门槛的单位。
 */
export const GATE_UNIT_MONTHS = 'months'

/**
 * 按年计的门槛单位(安省同职业累计那条替代路径;2026-09-29)。
 */
export const GATE_UNIT_YEARS = 'years'

/**
 * 资讯页「工作经验」行按 TEER 分档时看的因素(经验与它的替代路径同一档里列;2026-09-30 通道与门槛批 2)。
 */
export const GATE_EXP_FACTORS = [GATE_F.experience, GATE_F.experienceAlt]

/**
 * 资讯页「工资」行按 TEER 分档时看的因素(安省应届毕业生的低位工资只管 TEER 0–3)。
 */
export const GATE_WAGE_FACTORS = [GATE_F.wage]

/**
 * 资讯页「语言」行点名职业的那档,灰字里最多列几个职业码(再多不列 —— 曼省 158 个职业逐个定分,那档只写分数区间;2026-09-30)。
 */
export const LANG_NOC_NOTE_MAX = 10

/**
 * 阿省境内经验替代行的条件标记(门槛表 appliesCondition 原值)。
 */
export const GATE_COND_LOCAL = 'ab-local-experience'

/**
 * 安省应届毕业生款的条件标记(门槛表 appliesCondition 原值;2026-09-29 安省门槛卡)。
 */
export const GATE_COND_GRAD = 'recent-on-graduate'

/**
 * 外省毕业生款的条件标记(曼省 SWM:外省读书毕业的须在本省满 12 个月,比通用档严;门槛表 appliesCondition 原值;2026-09-29)。
 */
export const GATE_COND_OTHER_PROV = 'grad-other-province'

/**
 * 分区雇主门槛区名的词条键头(拼门槛表 appliesArea 原值:gta / on-listed-cd / on-other / outside-gta;2026-09-29)。
 */
export const GATE_AREA_HEAD = 'pnpgate.area.'

/**
 * 分区年收入那一行的文案键(带 {n} 与 {area};2026-09-29 安省门槛卡)。
 */
export const GATE_REVENUE_AREA_KEY = 'pnpgate.empRevenueArea'

/**
 * 分区全职员工那一行的文案键(带 {n} 与 {area};2026-09-29 安省门槛卡)。
 */
export const GATE_STAFF_AREA_KEY = 'pnpgate.empStaffArea'

/**
 * 经营年限按年写的文案键(「在本省经营满 {n} 个财年」)。
 */
export const GATE_EMP_YEARS_KEY = 'pnpgate.empYears'

/**
 * 经营年限按财年写的文案键(阿省「2 complete fiscal years」;2026-09-29 其余省改写「年」时拆出)。
 */
export const GATE_EMP_FISCAL_KEY = 'pnpgate.empFiscalYears'

/**
 * 经营年限按月写的文案键(萨省官方按月写;2026-09-29 七省接入前补)。
 */
export const GATE_EMP_MONTHS_KEY = 'pnpgate.empMonths'

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
 * 口径包的窗口期键(近 N 年内;安省同职业累计那条替代路径,2026-09-29)。
 */
export const BASIS_WINDOW_YEARS = 'windowYears'

/**
 * 口径包的「同职业」标记(经验替代路径:同职业累计)。
 * 2026-10-01 Frank「检查一下所有的这个工作经验。如果是 过去十年 24 个月工作经验。为什么还对雇主有要求。」:
 * 也挂在经验主行上 —— 须是这个职业的经验(阿省「in your current occupation」、萨省「in your (intended) occupation」),
 * 门槛卡另起一行「须是这个职业的经验」。
 */
export const BASIS_SAME_NOC = 'sameNoc'

/**
 * 经验行口径包:这段经验在哪几档 TEER 的职业里攒的(值是档位逗号串;卑诗「in any skilled occupation (NOC TEER 0, 1, 2 or 3)」、
 * NB 快速通道「in a TEER category 0, 1, 2 or 3」;2026-10-01)。
 */
export const BASIS_EXP_TEER = 'expTeer'

/**
 * 经验行口径标记:哪个职业都算、不必与 offer 同职业(卑诗原句「any skilled occupation」;与 expTeer 连用写「任何 TEER 0–3 职业的经验都算」)。
 */
export const BASIS_ANY_NOC = 'anyNoc'

/**
 * 经验行口径标记:须在同一个职业连续工作(NB 快速通道「continuous work experience … in one NOC code」)。
 */
export const BASIS_ONE_NOC = 'oneNoc'

/**
 * 经验行口径标记:须与这份工作相关(NS 技术工人「This work must be related to the job you are being offered」)。
 */
export const BASIS_RELATED = 'related'

/**
 * 经验行口径标记:须与所学专业相关(萨省本省毕业生「related to your field of study」)。
 */
export const BASIS_FIELD = 'field'

/**
 * 经验行口径标记:有薪工作、官方没写要全职(萨省本省毕业生「paid employment」;主句写「N 个月有薪工作经验」,不套「全职」)。
 */
export const BASIS_PAID = 'paid'

/**
 * 口径包的「持执照」标记(经验替代路径:持有这份工作要求的执照)。
 */
export const BASIS_LICENCE = 'licence'

/**
 * 口径包的「本职业本地区中位工资」标记(工资行)。
 */
export const BASIS_OCC_MEDIAN = 'occMedian'

/**
 * 口径包的「本职业本地区低位工资」标记(安省应届毕业生 + TEER 0-3 那一行;2026-09-29)。
 */
export const BASIS_OCC_LOW = 'occLow'

/**
 * 口径包的「本省院校毕业」标记(NB Graduates 路径:本省院校毕业替代工作经验;2026-09-29 七省接入)。
 */
export const BASIS_PROV_GRADUATE = 'provGraduate'

/**
 * 口径包的「财年」标记(经营年限官方写 fiscal years 的,只有阿省;其余省写 years / months;2026-09-29)。
 */
export const BASIS_FISCAL = 'fiscal'

/**
 * 口径包的编码值键(offer 形态行:过不了的工时 / 雇佣期取值)。
 */
export const BASIS_VALUE_CODE = 'valueCode'

/**
 * 口径键:在哪(身份行 = 人得在哪;经验行 = 经验在哪攒的算;2026-09-30 通道与门槛批 1)。
 */
export const BASIS_WHERE = 'where'

/**
 * where 的取值:须已在本省工作(身份行)。
 */
export const BASIS_WHERE_IN_PROV = 'inProvince'

/**
 * where 的取值:加拿大境内外都算(经验行;阿省原句「in Canada or abroad」)。
 */
export const BASIS_WHERE_ANYWHERE = 'anywhere'

/**
 * 口径键:认哪几类工签(取值用 BASIS_PERMIT_SEP 连,逐个查 GATE_PERMIT_HEAD 词条)。
 */
export const BASIS_PERMITS = 'permits'

/**
 * 工签种类之间的连接符。
 */
export const BASIS_PERMIT_SEP = '+'

/**
 * 口径标记:申请期间维持身份(implied status)/ 恢复身份的不算。
 */
export const BASIS_NO_IMPLIED = 'noImplied'

/**
 * 口径标记:持 PGWP 的那一档经验(experienceAlt 行;门槛卡写「持 PGWP 的:近 N 个月在本省满 M 个月」)。
 */
export const BASIS_PGWP = 'pgwp'

/**
 * 工签种类的词条键头(拼种类键取界面词:lmia / lmiaExempt / pgwpLocal / openSpecific)。
 */
export const GATE_PERMIT_HEAD = 'pnpgate.permit.'

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
 * 优待清单的类型名(NL 优先处理职位:名单上的职业免招聘测试、优先处理,不是资格条件;2026-10-02 Frank「做吧,按你说的来」)。
 */
export const TYPE_PRIORITY = 'priority'

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
 * 2026-09-28 起那张卡主文案改界面语言直白名、灰字改官方原名,只在非英文界面出灰字(判的就是它)。
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
 * 页眉小标词条:「{省}提名(PNP)」。
 */
export const K_KICKER_PROV = 'grp.pnpProv'

/**
 * 页眉小标词条:没有省 / 魁省(不参加 PNP)照旧写分组名。
 */
export const K_KICKER_GROUP = 'grp.pnp'

/**
 * 门槛卡标题词条(「申请门槛」;2026-10-01 三弹框统一起魁省合并门槛卡也用它)。
 */
export const K_GATE_TITLE = 'pnpgate.title'

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
 * 省码与 NOC 拼成排除清单键的分隔符(键形如 `ON|72310`;2026-09-28 随排除键自 jobs 迁入,拼键与查键都只在本域)。
 */
export const EXCL_KEY_SEP = '|'

/**
 * 魁省一个职业的通道接口(2026-09-30 魁省门槛弹框,Frank 看过效果图第三版「可以」;设计 docs/design/魁省门槛弹框-20260929.md。
 * 弹框打开才按职业码取;后接五位码)。
 */
export const URL_API_JOBS_QC = '/api/jobs/qc?noc='

/**
 * AIP 弹框指定雇主卡的接口(2026-10-02 三弹框统一第 3 步(Frank「这是不是 拆成人能看懂表格比较好」「不需要一次查询 1574 家吧」「可以,做吧」)):弹框打开才按省 +
 * 本岗公司归一名取本岗雇主与同招牌的几家;后接查询串。
 */
export const URL_API_JOBS_AIP = '/api/jobs/aip?'

/**
 * 指定雇主卡接口的省码参数名。
 */
export const P_AIP_PROV = 'prov'

/**
 * 指定雇主卡接口的归一名参数名。
 */
export const P_AIP_KEY = 'key'

/**
 * 指定雇主卡标题词条(「{prov} AIP 指定雇主」)。
 */
export const K_AIP_EMP_TITLE = 'aipemp.title'

/**
 * 指定雇主卡标题旁的本省总家数词条。
 */
export const K_AIP_EMP_COUNT = 'aipemp.count'

/**
 * 指定雇主卡底「同招牌 N 家都是指定雇主」词条(同招牌不止一家才出)。
 */
export const K_AIP_EMP_BRAND = 'aipemp.brand'

/**
 * 指定雇主表的表头词条:招牌 / 门店 / 法人(同序)。
 */
export const K_AIP_EMP_COLS = ['aipemp.colTrade', 'aipemp.colStore', 'aipemp.colLegal']

/**
 * 指定雇主卡展开钮的量词词条(「家」;2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」:钮走 pager 桶 FoldLine)。
 */
export const K_AIP_EMP_UNIT = 'fold.u.employer'

/**
 * 职业清单展开钮的量词词条(「个」;2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」)。
 */
export const K_FOLD_UNIT_ITEM = 'fold.u.item'

/**
 * 门店认不出时表格里那一格写的(长横)。
 */
export const AIP_EMP_DASH = '—'

/**
 * 魁省门槛行的两个项目(门槛表 program;魁省不属省提名)。
 */
export const QC_PROGRAMS = ['PSTQ', 'PEQ']

/**
 * PSTQ 的项目名(一般条件行只挂到 PSTQ 各通道卡上)。
 */
export const QC_PROGRAM_PSTQ = 'PSTQ'

/**
 * PSTQ 一般条件那几行的流名(四个通道都适用:年龄、自给合同)。
 */
export const QC_GENERAL_STREAM = 'PSTQ (all streams)'

/**
 * 魁省门槛行的因素名(etl/pnp/qc 写的,照抄;门槛卡按它点名取行)。
 */
export const QC_F = {
  /**
   * 职业档(TEER)。
   */
  teer: 'occupationPathway',

  /**
   * 法语(申请人 / 配偶按 subject 分)。
   */
  language: 'language',

  /**
   * 工作经验(口径包带 windowYears / windowMonths / inQuebec / asOf)。
   */
  experience: 'experience',

  /**
   * 学历。
   */
  education: 'education',

  /**
   * 年龄。
   */
  age: 'age',

  /**
   * 自给合同。
   */
  funds: 'fundsMinimum',

  /**
   * 受监管职业(执业许可或学历等同认定)。
   */
  licensing: 'licensing',

  /**
   * PEQ 本轮收件期。
   */
  intake: 'intakeWindow',
}

/**
 * 魁省门槛行的主体:随行配偶(魁省对配偶有口语门槛)。
 */
export const QC_SUBJECT_SPOUSE = 'spouse'

/**
 * 魁省门槛卡的行键(React key;顺序即卡里的行序)。
 */
export const QC_ROW = {
  /**
   * 适用(部分受监管 / 要公民身份这类通道才有)。
   */
  scope: 'scope',

  /**
   * 执照。
   */
  licence: 'licence',

  /**
   * 职业档。
   */
  teer: 'teer',

  /**
   * 法语。
   */
  french: 'french',

  /**
   * 工作经验。
   */
  exp: 'exp',

  /**
   * 收件条件(PEQ 截点日前满足)。
   */
  recept: 'recept',

  /**
   * 收件期(PEQ)。
   */
  intake: 'intake',

  /**
   * 学历。
   */
  edu: 'edu',

  /**
   * 年龄。
   */
  age: 'age',

  /**
   * 自给合同。
   */
  funds: 'funds',

  /**
   * 配偶。
   */
  spouse: 'spouse',
}

/**
 * 魁省门槛行口径包的键(etl/pnp/qc 写的,照抄)。
 */
export const QC_BASIS = {
  /**
   * 法语口语。
   */
  oral: 'oral',

  /**
   * 法语书面。
   */
  written: 'written',

  /**
   * TEF 理解那一档下限。
   */
  tefComp: 'tefComp',

  /**
   * TEF 表达那一档下限。
   */
  tefExpr: 'tefExpr',

  /**
   * TCF 理解那一档下限(699 分制)。
   */
  tcfComp: 'tcfComp',

  /**
   * TCF 表达那一档下限(20 分制)。
   */
  tcfExpr: 'tcfExpr',

  /**
   * 近 N 年内。
   */
  windowYears: 'windowYears',

  /**
   * 近 N 个月内。
   */
  windowMonths: 'windowMonths',

  /**
   * 这段经验要在魁省。
   */
  inQuebec: 'inQuebec',

  /**
   * 全职口径(每周至少 N 小时)。
   */
  fullTime: 'fullTimeHoursPerWeek',

  /**
   * 收件条件的截点日。
   */
  asOf: 'asOf',

  /**
   * 收件起日。
   */
  opens: 'opens',

  /**
   * 收件止日。
   */
  closes: 'closes',
}

/**
 * 通道细分类里要出「适用」行的那几类 → 词条(部分受监管的另写官方原文,见 QC_KIND_PARTLY)。
 */
export const QC_KIND_SCOPE: Record<string, string> = {
  /**
   * 要加拿大公民身份才能做(官方不发邀请)。
   */
  citizenOnly: 'qcgate.scope.citizenOnly',

  /**
   * 要永久居民身份才能做(官方不发邀请)。
   */
  residentOnly: 'qcgate.scope.residentOnly',

  /**
   * 整类受监管且要魁省学历。
   */
  regulatedQcDiploma: 'qcgate.scope.qcDiploma',
}

/**
 * 部分受监管的细分类:「适用」行写官方原文(只有其中几种工作受监管)。
 */
export const QC_KIND_PARTLY = 'partlyRegulated'

/**
 * 格子文案词条头(后接通道稳定键:pnp.qc.cell.pstq-1)。
 */
export const QC_CELL_HEAD = 'pnp.qc.cell.'

/**
 * 卡标题下界面语言名的词条头(后接通道稳定键)。
 */
export const QC_NAME_HEAD = 'pnp.qc.name.'

/**
 * 学历行的词条头(后接通道稳定键;学历门槛官方是条文、不是数,按通道各写一句)。
 */
export const QC_EDU_HEAD = 'qcgate.edu.'

/**
 * 魁省弹框页眉小标的词条。
 */
export const K_KICKER_QC = 'pnp.qc.kicker'

/**
 * 格子文案:这个职业不在官方对照表里(照旧写「魁省」,不可点)。
 */
export const K_CELL_QC = 'cell.pnpQc'

/**
 * TEER 档连号时的连接号(「0–2」)。
 */
export const QC_TEER_DASH = '–'

/**
 * 考试名:TEF(法语主写它;TEF / TEFAQ / TEF Canada 在魁省对照表里同一套分数线)。
 */
export const QC_TEST_TEF = 'TEF'

/**
 * 考试名:TCF(灰字注)。
 */
export const QC_TEST_TCF = 'TCF'

/**
 * TEER 档不连号时的分隔(「0, 1, 3」)。
 */
export const QC_TEER_LIST_SEP = ', '

/**
 * 法语分数线一段的词条(口语 / 书面同分写一个数;不同分听说读写分开写)。
 */
export const QC_FR_KEY = {
  /**
   * 口语两项同分(「口语 400」)。
   */
  oral: 'qcgate.fr.oral',

  /**
   * 书面两项同分(「书面 300」)。
   */
  written: 'qcgate.fr.written',

  /**
   * 听(口语理解)。
   */
  listen: 'qcgate.fr.listen',

  /**
   * 说(口语表达)。
   */
  speak: 'qcgate.fr.speak',

  /**
   * 读(书面理解)。
   */
  read: 'qcgate.fr.read',

  /**
   * 写(书面表达)。
   */
  write: 'qcgate.fr.write',
}

/**
 * 站内蓝链的全局类(main.css 的 link;AIP 指定雇主名单里对上雇主池的招牌;2026-10-02)。
 */
export const LINK_CLS = 'link'

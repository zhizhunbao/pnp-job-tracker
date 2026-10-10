/**
 * profile 域(移民档案)的契约:档案六格(分型/职业/CLB/EE 分/工签/目标省)的
 * 表单值、点选项、区间归属与表单件 props。2026-08-27 Frank 拍板自 account 域拆出
 * (判据:这批件答的问题是「移民档案怎么问怎么填」,不是「账户页」;第二个消费者
 * jobs/OnboardingWizard 的同构重复已经存在)。形状本域自己声明,不从别的域取。
 * 2026-09-23 账户页撤移民档案节、档案表单及其子件删文件,只给它们用的表单件 props、
 * 职业搜索兜底与表单整机的形状随之删除;向导还在用的档案值、点选项、区间归属照留。
 * 2026-10-04 访客四题改版:访客向导的形状(由头、步序、草稿、整机面板、各手柄入参、查名响应)整段迁去 gate 桶;
 * 职业步 props 的「访客模式」开关(ObNocsIn.guest)随之撤 —— 访客向导不再借职业步,首访向导恒出简历识别那一块。
 * 同日收口:A1 为两台整机共用而起的几样随之撤回 —— 职业步 props(ObNocsIn,撤开关后与 NocStepIn 同形)、钮组的收窄面板
 * (ObFootPanel / ObFootIn)与「跳过」手柄 onSkip(首访向导里恒等于下一步)、单选行的泛型(只剩区间档)。
 * 2026-10-09「我的档案」批:首访引导向导退役(Frank 拍板只留访客向导,登录用户改在「我的档案」看 / 改答案):档案值、点选项、
 * 区间归属、各手柄入参、简历预填、向导整机面板与各步 props 的形状整批删;剩取词函数、单选手柄入参(gate 借 makeOptPick)与
 * 进度头两份(投递流借 OnboardingHead)。被删形状身上的决策记录摘进桶门 index.ts 文件头。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 宪法 08-25「types 自声明」,
 * 形状本域自己声明,不从别的域取;真参数是 lib/i18n 那个带附加成员的交叉类型,
 * 结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 点选项代表的值的取值范围:区间档是数(null = 「不确定」档)、访客向导的专业码与省码是串
 * (2026-10-03 付费闭环批 A1 审查:单选胶囊行只留 OnboardingBuckets 一个实现,值的类型由表定)。
 * 2026-10-04 访客向导迁 gate 桶换装(选项改走 chip 桶的选择格与大号胶囊),串值那一支眼下没有消费者,形状照留。
 * 同日收口:gate 改借本域的 makeOptPick(删掉自家逐字同义的 makeOptTap,「点了报值」只留一份),串值一支又有了消费者
 * (专业码、省码;目标档是数);只剩 makeOptPick 与它的入参用这个范围 —— Opt 与 OnboardingBuckets 的泛型撤回,那一行只剩区间档。
 */
export type OptValue = number | string | null

/**
 * makeOptPick 的入参(单选行里一枚 chip)。
 */
export type OptPickIn<V extends OptValue> = {
  /**
   * 这枚 chip 代表的值。
   */
  value: V

  /**
   * 点了往哪报。
   */
  onPick: (v: V) => void
}

/**
 * obBarStyleOf 的入参。
 */
export type ObBarIn = {
  /**
   * 走到第几步(从 0 数)。
   */
  step: number

  /**
   * 本次一共几步。
   */
  total: number
}

/**
 * OnboardingHead 的 props(步数行 + 进度条)。
 */
export type ObHeadIn = {
  /**
   * 走到第几步(从 0 数)。
   */
  step: number

  /**
   * 一共几步。
   */
  total: number

  /**
   * 取词函数。
   */
  t: TFn
}

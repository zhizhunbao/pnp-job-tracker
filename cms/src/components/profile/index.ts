/**
 * profile 域(移民档案)的桶 —— 档案表单(ProfileForm 及其子件)与档案六格的
 * 点选项表、区间归属函数。2026-08-27 Frank 拍板自 account 域拆出:这批件答的
 * 问题是「移民档案怎么问怎么填」,不是「账户页」;消费者 = account 页的档案节 +
 * jobs 的 OnboardingWizard(同一套题,wizard 换装时来借排档行)+ quiz/plan/chat
 * 借热门职业表。2026-08-28 拆域批自 components/jobs 迁入 OnboardingWizard.tsx(首访引导
 * 与它的记忆键 OB_SEEN_KEY,原样搬,形制照旧是旧形,归换装批收拾)—— 同一套档案题,
 * 本来就该和档案表单同域。搬进来这一件原先引的是 account 桶,落户后改点兄弟文件
 * (constants / functions / types)—— 引自家桶就是自环,import/no-cycle 当场报错。
 * 对应 lib 侧数据形状:lib/jobs 的 ProfileJson / normalizeProfile。
 * 2026-08-28 换装批把上面那笔账还了:向导按形制重写并拆成十二件(题面各步一件、
 * 状态机器进 hooks、内联样式进 profile.module.css),记忆键落 constants 抽屉;
 * **对外露的两个名字 OnboardingWizard 与 OB_SEEN_KEY 冻结**(职位板、投递流、
 * 问卷三处消费者一个字没改),键的值同样不许动 —— 改了老用户会被重弹一次。
 * 2026-09-23 Frank 撤账户页的移民档案节(截图说「基本上是完全没法用」,原话「只保留一个 我的简历
 * 我的收藏 我的求职 其他的能删都删了」):档案表单 ProfileForm 及其子件 StatusRow / BucketRow /
 * ProvRow / NocPicker / NocTags 删文件,出桶名单去掉 ProfileForm;首访向导不受影响。
 * 2026-10-03 付费闭环批 A1:访客向导 GateWizard 住进来(同一套档案题的访客版,复用首访向导的头、钮组与职业步),
 * 外加无界面的草稿补交件 GateSync(全站骨架挂一次);浏览记录与草稿存取归 lib/guest。
 * 2026-10-04 进站即弹:GateSync 顺带弹进站向导(全站骨架只挂它一处,每页都跑得到)。
 * 同日审查:isPopularNoc 出桶 —— 热门表的主人给判定,plan 删掉自己那份逐字相同的拷贝改从这里取。
 * 2026-10-04 访客四题改版:访客向导 GateWizard 与 GateSync 迁去 gate 桶(注册前的访客门自成一域;本桶只管登录用户的建档向导),
 * 出桶名单去掉这两名;gate 的职业题借本桶的已选标签件 OnboardingTags 与选 / 摘两枚手柄(makeNocPick / makeNocDrop),
 * 注册后与补交时记「首访引导弹过了」借 obMarkSeen(与首访向导走完时同一枚手柄)—— 这四名随之出桶,不在 gate 另抄一份。
 * 同日收口:单选手柄 makeOptPick 同样出桶(gate 的目标卡、专业胶囊、省格子借它,删掉 gate 自家逐字同义的 makeOptTap)。
 * 同日 A2:gate 的职业题改用 quiz 桶选职业控件(大号档),不再借 makeNocPick / makeNocDrop,两名收回桶内;
 * OnboardingTags 改由 quiz 的选职业控件借(大号档的已选标签),照旧出桶。
 * 2026-10-05 访客第 3 题改左右两栏(Frank「也改成左右 两部分吗?」「改啊」):quiz 选职业控件的已选一行改用 tag 桶 TagRow 自己摆,
 * 不再借 OnboardingTags —— 桶外再没有消费者,出桶名单去掉它(首访向导的职业步在桶内照用)。
 * 2026-10-07 站内投递页(components/apply)借用首访向导的步数行 + 进度条,桶门加 OnboardingHead(不复制第二份)。
 * 2026-10-09「我的档案」批:首访引导向导 OnboardingWizard 退役(Frank 拍板:答题原先分两处、两种长相,只留 gate 桶的访客向导;
 * 登录用户改在「我的档案」看 / 改答案)。唯一的挂载点(jobs 的 boardmodals)与职位板自动弹已先撤,只为它活着的整批删:
 * 向导与各步件(分型 / 职业 / 英语 / EE 分 / 目标省 / 工签、底部钮组、已选职业标签、简历预填三件)、整机 hooks.ts、
 * 存档案与简历解析两路手柄、它们的值表与形状、profile.module.css 里进度头三类以外的样式;「首访引导弹过了」的记忆键
 * OB_SEEN_KEY('jobs_onboarding_v1')与写它的三处(本桶 obMarkSeen、gate 的 makeGateDone / runGateSync、quiz 的
 * markOnboardingSeen)一并撤。出桶名单只剩四名:OnboardingHead(apply 投递流借步数行 + 进度条)、makeOptPick(gate 借)、
 * POPULAR_NOCS / isPopularNoc(quiz、plan 借);同批出桶的 CLB_OPTS / CRS_OPTS / PGWP_OPTS、clbActive 族、类型 Opt /
 * ProfileValue 桶外本就无人取,随向导删。OnboardingHead 名里带 onboarding 是历史,不改名不搬家。
 * 被删件身上的决策记录摘存于此(原文在 git):
 * - 定制样式钮一律经 Button 走 ghost 底座,视觉由加倍类定形(2026-08-26 Frank「<button 这种不允许直接使用」;
 *   account 域同名的 PLAIN_BTN_KIND 照挂这条)。
 * - 文案键整键落表、不拼串(2026-08-27 分型表 / 2026-08-28 问句表:拼出来的键在文案闸里没有名字,也 grep 不到)。
 * - EE 分区间档存「区间下界」(<400 存 399),永不把上界当精确分喂给匹配「差 N 分」—— 数据完整性红线;没算过 EE 分就不留分;
 *   用户没填任何一格就不存档,更不许拿空值覆盖已有档案(dd24-#107 保险丝)。
 * - 分型分叉(海外不问工签、留学只问目标省与职业、工签在职问职业 / 目标省 / 工签剩余……)是产品决策,随向导退役。
 * - 简历预填只当建议、不静默入库:前两个候选替用户预选,读不出英语水平就不动已选档;失败分三种说(次数用完 / 扫描件 / 其他),
 *   一律回退手动点选不阻断。
 * - 2026-10-03 付费闭环批 A1:热门职业上面的引导语与末尾「没有?可跳过」两句删(Frank「禁止这种解释性文字」)。
 * - 2026-10-03 A1 拍图:官方职业名很长,已选标签行要能换行(tag 桶一枚不折行是全站口径,只在向导那一行盖掉,不改 tag 桶);
 *   2026-10-04 收口:那一行自己不带外距,与上一块隔多远归摆放它的一方。
 * - 2026-10-04 收口:已选标签 × 挂可访问名「移除 {职业名}」(读屏原先只念「×」);2026-10-05 × 钮与点按区样式已整块搬去 tag 桶。
 * - 投递流里开的向导不许许诺「看匹配」,价值行与终键只说继续投递(dd24-#109)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
export { POPULAR_NOCS } from './constants'
export { isPopularNoc, makeOptPick } from './functions'
export { OnboardingHead } from './onboardinghead'

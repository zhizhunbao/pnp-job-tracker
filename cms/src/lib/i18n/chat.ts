// 文案 · 对话与 AI 顾问的**见客文案**。
// 🔴 红线:**给模型看的提示词不在这里**(system/instructions 归 prompts.ts)——
//    用户永远看不到它们,也不需要翻译。别把「给人看的」和「给模型看的」混进一个抽屉。
import type { Domain, Lang } from './index'
// 🔴 只从对话模块引**类型**(编译期擦除)。引任何一个值都会成环:
//    index → chat → lib/chat → index/chat,实撞过 —— PNP_PROVINCES 初始化时是 undefined。
import type { Availability } from '@/lib/chat'
import type { FollowKey, MetaTopic, OccOption, ProfileSlot, UsageTopic } from '@/lib/chat'

const zh = {
  'advisor.left': '免费今日剩 {n} 次',
  'advisor.unavail': 'AI 判断暂时不可用,请稍后再试——上方事实与官方链接不受影响。',
  'advisor.limit429': '今日免费次数已用完', 'advisor.limitCta': '登录',
  'advisor.tag': 'AI 顾问',
  'advisor.loading': '⏳ 努力思考中…',
  'advisor.failed': '生成失败({code})',
  'advisor.offline': '网络异常,AI 判断暂时不可用——上方事实与官方链接不受影响。',
  'advisor.footAI': '由 AI 生成 · 可能有误,仅供参考', 'advisor.full': '全屏', 'advisor.exitFull': '退出全屏',
  'advisor.chatPlaceholder': '基于上方事实追问这个职位…', 'advisor.chatSend': '发送',
  'advisor.sug.title': '这个职位走「雇主 offer → 省提名」最大的坑是什么?', 'advisor.sug.company': '这家公司有雇外国人的历史吗?对求职者靠谱吗?', 'advisor.sug.generic': '这条信号对我拿省提名意味着什么?',
  'advisor.sug.title2': '这个职位的薪资和要求,在同类岗位里算什么水平?', 'advisor.sug.title3': '面试或接 offer 前,我该跟雇主确认哪几件事?',
  'advisor.sug.company2': '这家公司的规模和稳定性,撑得起漫长的移民流程吗?', 'advisor.sug.company3': '拿到这家的 offer 后,第一步该做什么?',
  'advisor.sug.generic2': '这里面有什么风险或时间窗口需要注意?', 'advisor.sug.generic3': '基于以上,我下一步最该做的一件事是什么?',
  'ai.retry': '重试',
  'advisor.footTpl': '自动生成,不构成移民或法律建议',
  'advisor.applyLink': '投递页', 'advisor.siteLink': '公司官网',
  // 对话即产品(C2):landing 主输入框。错误码一句一说 —— 笼统的「稍后再试」让用户白重试(简历对照实撞)
  // 标题=身份词(2026-08-06 Frank「有冗余」:原「说说你的情况」与输入框占位重复,动作指引留给占位符)
  'chat.title': 'AI 顾问', 'chat.ph': '一句话说说你的情况', 'chat.send': '提问',
  'chat.waiting': '正在查官方数据', 'chat.sources': '官方来源', 'chat.followups': '接着问',
  'chat.steps': '查询过程',        // 工具轨迹的折叠条(答复落地后弱化,见 ChatBox §流式)
  // 轨迹折叠条的一行文案(2026-08-04:等待期就折叠,后面那个秒数是**实测**的,不是编的)
  'chat.stepsRunning': '正在查询', 'chat.stepsDone': '已核查 {n} 项',
  'chat.activity': 'Activity', 'chat.thinking': 'Thinking', 'chat.memory': 'Memory', 'chat.web': 'Web',
  'chat.done': '完成', 'chat.memoryAnon': '登录后会记住你的职业、身份和目标省，用在后续回答里',
  'chat.memoryEmpty': '还没有已保存的档案', 'chat.memoryManage': '管理记忆', 'chat.memorySignIn': '登录并开启记忆',
  'chat.mem.status': '目前情况：{value}', 'chat.mem.occ': '职业：{value}', 'chat.mem.clb': '语言：CLB {value}',
  'chat.mem.crs': 'EE 分数：CRS {value}', 'chat.mem.prov': '目标省：{value}', 'chat.mem.pgwp': '工签：PGWP 还剩 {value} 个月',
  'chat.copy': '复制', 'chat.copied': '已复制',   // 每条答复唯一的操作钮(不做分叉/重生成/继续)
  // 错误文案一律 ≤20 字:375 上错误框可写宽约 265px,超了就折行(文案一行放下站规)
  'chat.err.tooShort': '再多说两句,你做什么工作、在哪个省',
  'chat.err.noOcc': '说说你做的是什么工作,才查得到',
  'chat.err.limit': '今天问得有点多,明天再来',
  'chat.err.llm': '这次没答上来,换个说法再问',
  'chat.err.guard': '这次答复没对上官方出处,不显示',
  'chat.err.busy': '系统繁忙,稍后再试',
  'chat.err.net': '没连上服务,请重试',
  // 空态三条示例(2026-08-04 对话形态重做):照案例库原话形状写成**真人会说的一句话**,
  // 覆盖三类人 —— 刚毕业没工作(C06)、有 offer 不知道够不够(C13)、中介开价该不该信(C01/C14)。
  // 检索式的「查询 XX 省提名要求」不写:那是搜索框的说法,不是人开口的第一句
  'chat.try': '试试这样问',
  'chat.padVerdict': '按我的情况判一判走哪条路最快',
  'chat.thread': '会话 ID', 'chat.threadCopied': '已复制',
  'chat.opt.rec': '推荐', 'chat.opt.self': '自行输入',
  // D4(对话闭环总设计-20260809 §2):匿名三句原样保留 ——
  // tests/int/chatPreset1-3.int.spec.ts 三份端到端回归把这三句原文当 fixture 常量硬编码并做
  // 逐字断言(makeT(lang)('chat.ex1')===preset),字面改一个字就会带崩那三份测试;骨架本就
  // 已经是「#287 形状」(每句都在问「这条路走不走得通」,且各带一个具体职业,不撞编排层 noOcc 闸),
  // 无须改字面。
  'chat.ex1': '安省大专毕业,做软件开发,还没工作,毕业后能留下吗?',
  'chat.ex2': '新斯科舍的餐厅给了我厨师 offer,老板说帮我办,可信吗?',
  'chat.ex3': '中介说能包曼省木匠 offer 和省提名,可信吗?',
  // 注册未建档:边问边建档句(职业+CLB/PGWP/目标省+经验示范值全带),照着改一改发出去就是自己的档案
  'chat.ex.reg1': '我是护理员(NOC 33102),在安省,CLB 6,这条路走得通吗?',
  'chat.ex.reg2': '我是电工,PGWP 还剩 12 个月,该冲刺哪个省?',
  'chat.ex.reg3': '我是卡车司机,目标卑诗省,已经干了两年,能申省提名吗?',
  // 已建档:从档案槽位生成(chatExamples.ts pickExamples),{noc}/{title}/{prov}/{clb}/{m} 由调用方注入
  'chat.ex.pgwp': '我是{title}(NOC {noc}),PGWP 还剩 {m} 个月,现在冲刺还来得及吗?',
  'chat.ex.occProv': 'NOC {noc}({title})在 {prov} 有戏吗?',
  'chat.ex.occCmp': 'NOC {noc}({title})在 {prov} 和 {prov2} 哪条更快?',
  'chat.ex.clbProv': '我是{title}(NOC {noc}),CLB {clb},目标省 {prov},还差哪项?',
  'chat.retry': '重试', 'chat.open': '打开',
  // 答复反馈(2026-08-05)。**点踩是数据缺口报警器,不是训练信号** —— 用户在替我们标注
  // 「这里答不好」,而且按真实频次排好序。所以问句要轻到不烦人、又显眼到有人愿意点。
  'chat.fb.good': '有帮助', 'chat.fb.bad': '没帮助',
  'advisor.disclaimer': 'AI 生成判断,非移民建议(我们非持牌顾问 RCIC),以官方来源为准',
}

const en: Record<keyof typeof zh, string> = {
  'advisor.left': '{n} free uses left today',
  'advisor.unavail': 'The AI read is temporarily unavailable — the facts and official links above are unaffected. Please try again later.',
  'advisor.limit429': 'Free uses for today are used up', 'advisor.limitCta': 'Sign in',
  'advisor.tag': 'AI Advisor',
  'advisor.loading': '⏳ Thinking hard…',
  'advisor.failed': 'Failed ({code})',
  'advisor.offline': 'Network issue — the AI read is temporarily unavailable. The facts and official links above are unaffected.',
  'advisor.footAI': 'AI-generated · may be inaccurate, for reference only', 'advisor.full': 'Fullscreen', 'advisor.exitFull': 'Exit fullscreen',
  'advisor.chatPlaceholder': 'Ask about this job, grounded in the facts above…', 'advisor.chatSend': 'Send',
  'advisor.sug.title': 'What are the biggest pitfalls of this job for the employer-offer → PNP route?', 'advisor.sug.company': 'Has this company hired foreign workers before? How reliable is it for applicants?', 'advisor.sug.generic': 'What does this signal mean for my PNP chances?',
  'advisor.sug.title2': 'How do this job’s pay and requirements compare with similar postings?', 'advisor.sug.title3': 'What should I confirm with the employer before interviewing or accepting?',
  'advisor.sug.company2': 'Is this company big and stable enough to support a long immigration process?', 'advisor.sug.company3': 'If I get an offer here, what should I do first?',
  'advisor.sug.generic2': 'Any risks or time windows I should watch here?', 'advisor.sug.generic3': 'Given all this, what single next step matters most?',
  'ai.retry': 'Retry',
  'advisor.footTpl': 'Auto-generated, not immigration or legal advice',
  'advisor.applyLink': 'Apply', 'advisor.siteLink': 'Website',
  // Chat-first landing (C2). Every error code says its own thing — a generic "try later" makes users retry for nothing
  'chat.title': 'AI advisor', 'chat.ph': 'Your situation in one sentence', 'chat.send': 'Ask',
  'chat.waiting': 'Checking official data', 'chat.sources': 'Source', 'chat.followups': 'Ask next',
  'chat.steps': 'How this was checked',
  'chat.stepsRunning': 'Checking', 'chat.stepsDone': 'Checked {n} items',
  'chat.activity': 'Activity', 'chat.thinking': 'Thinking', 'chat.memory': 'Memory', 'chat.web': 'Web',
  'chat.done': 'Done', 'chat.memoryAnon': 'Sign in to remember your occupation, status and target provinces for future answers',
  'chat.memoryEmpty': 'No saved profile details yet', 'chat.memoryManage': 'Manage memory', 'chat.memorySignIn': 'Sign in to enable memory',
  'chat.mem.status': 'Current situation: {value}', 'chat.mem.occ': 'Occupation: {value}', 'chat.mem.clb': 'Language: CLB {value}',
  'chat.mem.crs': 'EE score: CRS {value}', 'chat.mem.prov': 'Target provinces: {value}', 'chat.mem.pgwp': 'Work permit: {value} months left on PGWP',
  'chat.copy': 'Copy', 'chat.copied': 'Copied',
  // Keep every error under ~38 chars: the error box has ~265px of writable width at 375
  'chat.err.tooShort': 'Add your job and your province',
  'chat.err.noOcc': 'Tell us what work you do',
  'chat.err.limit': "That's a lot for today — try tomorrow",
  'chat.err.llm': 'Could not answer that — try rephrasing',
  'chat.err.guard': 'Failed our source check — not shown',
  'chat.err.busy': 'System is busy — try again shortly',
  'chat.err.net': 'Could not reach the service — retry',
  // 空态三条示例:真人开口的第一句,三类人各一条(刚毕业没工作 / 有 offer / 中介开价)
  'chat.try': 'Try asking',
  'chat.padVerdict': 'Which pathway is fastest for my situation?',
  'chat.thread': 'Conversation ID', 'chat.threadCopied': 'Copied',
  'chat.opt.rec': 'Recommended', 'chat.opt.self': 'Type my own answer',
  'chat.ex1': 'Ontario college grad, software dev, no job yet — can I stay?',
  'chat.ex2': 'A Nova Scotia restaurant gave me a cook offer and says it will help with the nomination. Can I trust that?',
  'chat.ex3': 'An agent says they can guarantee a Manitoba carpenter offer and nomination. Can I trust that?',
  'chat.ex.reg1': 'I am a PSW (NOC 33102) in Ontario with CLB 6 — is this path workable?',
  'chat.ex.reg2': 'I am an electrician with 12 months left on my PGWP — which province should I push for now?',
  'chat.ex.reg3': 'I am a truck driver targeting BC with two years of experience — can I apply for a nomination?',
  'chat.ex.pgwp': 'I am a {title} (NOC {noc}) with {m} months left on my PGWP — is there still time to make this work?',
  'chat.ex.occProv': 'NOC {noc} ({title}) — does this have a shot in {prov}?',
  'chat.ex.occCmp': 'NOC {noc} ({title}) — which is faster, {prov} or {prov2}?',
  'chat.ex.clbProv': 'I am a {title} (NOC {noc}) with CLB {clb} targeting {prov} — what am I still missing?',
  'chat.retry': 'Retry', 'chat.open': 'Open',
  'chat.fb.good': 'Helpful', 'chat.fb.bad': 'Not helpful',
  'advisor.disclaimer': 'AI-generated assessment, not immigration advice (we are not RCIC); verify with official sources',
}

const ko: Record<keyof typeof zh, string> = {
  'advisor.left': '오늘 무료 {n}회 남음',
  'advisor.unavail': 'AI 분석이 일시적으로 사용 불가합니다. 위의 사실 및 공식 링크에는 영향이 없습니다. 잠시 후 다시 시도하세요.',
  'advisor.limit429': '오늘의 무료 횟수 소진', 'advisor.limitCta': '로그인',
  'advisor.tag': 'AI 어드바이저',
  'advisor.loading': '⏳ 고민 중…',
  'advisor.failed': '생성 실패 ({code})',
  'advisor.offline': '네트워크 오류 — AI 분석을 일시적으로 사용할 수 없습니다. 위의 사실과 공식 링크는 정상입니다.',
  'advisor.footAI': 'AI 생성 · 부정확할 수 있음, 참고용', 'advisor.full': '전체 화면', 'advisor.exitFull': '전체 화면 나가기',
  'advisor.chatPlaceholder': '위 정보를 바탕으로 이 채용에 대해 질문하세요…', 'advisor.chatSend': '보내기',
  'advisor.sug.title': '이 공고, 고용주 오퍼 → 주정부 지명(PNP) 경로로 갈 때 가장 큰 함정은?', 'advisor.sug.company': '이 회사는 외국인 고용 이력이 있나요? 지원자 입장에서 믿을 만한가요?', 'advisor.sug.generic': '이 시그널이 제 주정부 지명(PNP) 가능성에 어떤 의미인가요?',
  'advisor.sug.title2': '이 공고의 급여와 요건은 비슷한 포지션 대비 어느 수준인가요?', 'advisor.sug.title3': '면접이나 오퍼 수락 전에 고용주에게 꼭 확인할 것은?',
  'advisor.sug.company2': '이 회사의 규모와 안정성으로 긴 이민 절차를 감당할 수 있을까요?', 'advisor.sug.company3': '여기서 오퍼를 받으면 먼저 무엇을 해야 하나요?',
  'advisor.sug.generic2': '주의해야 할 리스크나 시한이 있나요?', 'advisor.sug.generic3': '지금 상황에서 가장 중요한 다음 한 걸음은 무엇인가요?',
  'ai.retry': '다시 시도',
  'advisor.footTpl': '자동 생성이며 이민·법률 자문이 아닙니다',
  'advisor.applyLink': '지원하기', 'advisor.siteLink': '회사 웹사이트',
  // 대화형 랜딩(C2). 오류 코드마다 다른 안내 — 뭉뚱그린 "잠시 후 다시"는 헛된 재시도만 부름
  'chat.title': 'AI 상담', 'chat.ph': '한 문장으로 상황을 알려 주세요', 'chat.send': '질문',
  'chat.waiting': '공식 데이터 확인 중', 'chat.sources': '공식 출처', 'chat.followups': '이어서 질문',
  'chat.steps': '조회 과정',
  'chat.stepsRunning': '조회 중', 'chat.stepsDone': '{n}개 항목 확인',
  'chat.activity': 'Activity', 'chat.thinking': 'Thinking', 'chat.memory': 'Memory', 'chat.web': 'Web',
  'chat.done': '완료', 'chat.memoryAnon': '로그인하면 직업, 신분, 목표 주를 기억해 다음 답변에 활용합니다',
  'chat.memoryEmpty': '저장된 프로필 정보가 없습니다', 'chat.memoryManage': '기억 관리', 'chat.memorySignIn': '로그인하고 기억 사용',
  'chat.mem.status': '현재 상황: {value}', 'chat.mem.occ': '직업: {value}', 'chat.mem.clb': '언어: CLB {value}',
  'chat.mem.crs': 'EE 점수: CRS {value}', 'chat.mem.prov': '목표 주: {value}', 'chat.mem.pgwp': '취업 허가: PGWP {value}개월 남음',
  'chat.copy': '복사', 'chat.copied': '복사됨',
  // 오류 문구는 20자 이내: 375에서 오류 박스의 가용 폭은 약 265px(넘으면 줄바꿈)
  'chat.err.tooShort': '직업과 주를 알려 주세요',
  'chat.err.noOcc': '어떤 일을 하시는지 알려 주세요',
  'chat.err.limit': '오늘 질문 한도에 도달했습니다',
  'chat.err.llm': '답하지 못했습니다. 다르게 물어보세요',
  'chat.err.guard': '출처 확인을 통과하지 못한 답변입니다',
  'chat.err.busy': '시스템이 혼잡합니다. 잠시 후 다시 시도해 주세요',
  'chat.err.net': '서비스에 연결하지 못했습니다',
  // 빈 화면 예시 3개:실제 사람이 처음 꺼내는 한 문장(졸업 직후 / 오퍼 보유 / 에이전트 견적)
  'chat.try': '이렇게 물어보세요',
  'chat.padVerdict': '제 상황이면 어느 경로로 가야 하나요?',
  'chat.thread': '대화 ID', 'chat.threadCopied': '복사됨',
  'chat.opt.rec': '추천', 'chat.opt.self': '직접 입력',
  'chat.ex1': '온타리오 컬리지 졸업, 소프트웨어 개발자, 아직 무직인데 남을 수 있나요?',
  'chat.ex2': '노바스코샤 식당에서 요리사 오퍼를 받았고 고용주가 주정부 지명을 도와준다고 합니다. 믿어도 될까요?',
  'chat.ex3': '에이전트가 매니토바 목수 오퍼와 주정부 지명을 보장한다고 합니다. 믿어도 될까요?',
  'chat.ex.reg1': '저는 온타리오에서 일하는 PSW(NOC 33102)이고 CLB 6인데, 이 길이 통할까요?',
  'chat.ex.reg2': '저는 전기공이고 PGWP가 12개월 남았는데, 지금 어느 주를 노려야 할까요?',
  'chat.ex.reg3': '저는 트럭 운전기사이고 BC를 목표로 2년 경력이 있는데, 주정부 지명 신청이 가능할까요?',
  'chat.ex.pgwp': '저는 {title}(NOC {noc})이고 PGWP가 {m}개월 남았는데, 지금 시작해도 늦지 않을까요?',
  'chat.ex.occProv': 'NOC {noc}({title}), {prov}에서 가능성이 있을까요?',
  'chat.ex.occCmp': 'NOC {noc}({title}), {prov}와 {prov2} 중 어디가 더 빠를까요?',
  'chat.ex.clbProv': '저는 {title}(NOC {noc})이고 CLB {clb}, 목표 주는 {prov}인데, 아직 뭐가 부족할까요?',
  'chat.retry': '다시 시도', 'chat.open': '열기',
  'chat.fb.good': '도움됨', 'chat.fb.bad': '도움 안 됨',
  'advisor.disclaimer': 'AI 기반 판단이며 이민 자문이 아닙니다(당사는 RCIC가 아님) · 공식 출처를 기준으로 확인하세요.',
}

export const chat: Domain<typeof zh> = { zh, en, ko }

// ── 对话与顾问的见客文案 ────────────────────────────────────────────────────
// 2026-08-17 从对话编排层搬来(那边 08-18 拆成了 lib/chat/)。那边留下的是**编排逻辑**与
// **模型输出的检测器**(HEDGE_WORDS / SCRIPT_RE / COVERAGE_WORD / AVAIL_MARKERS / VERDICT_MARKERS)——
// 那几样按语言分叉但不是文案,是校验规则,搬进来会让这个文件变成什么都能塞的抽屉。
// 提示词(SLOT_SYSTEM 等)同理:给模型看的,归 prompts.ts。

/** 拉丁字母/数字结尾的字段名后面补个空格再接中文(「Java是专业」→「Java 是专业」)*/
const latinTail = (f: string): string => (/[A-Za-z0-9]$/.test(f) ? `${f} ` : f)

type StepDict = {
  read: string
  occ: (occ: string) => string
  jobs: (n: number) => string
  coverage: (n: number) => string
  thresholds: (provs: string) => string
  draws: (prov: string) => string
  ops: (prov: string) => string
  ee: string
  permit: (program: string) => string
  crs: (grid: string) => string
  plan: (provs: string) => string
  verdict: (n: number) => string
  claims: (n: number) => string
  write: string
}

/** 轨迹文案的**单一来源**(三语,和 LBL/AVAIL_SENTENCE 同一层)。前端只渲染,不再自己拼字。 */
export const STEP: Record<Lang, StepDict> = {
  zh: {
    read: '读懂你的问题',
    occ: (o) => `认出职业:${o}`,
    jobs: (n) => `查在招岗位:${n} 条`,
    coverage: (n) => `查职业清单:${n} 个省`,
    thresholds: (p) => `查官方门槛:${p}`,
    draws: (p) => `查抽选记录:${p}`,
    ops: (p) => `查运营统计:${p}`,
    ee: '查联邦 EE 通道',
    permit: (p) => `查联邦规则:${p}`,
    crs: (g) => `查联邦计分表:${g}`,
    plan: (p) => `算时间线:${p}`,
    verdict: (n) => `逐条比对官方门槛:${n} 条通道`,
    claims: (n) => `核对别人跟你说的:${n} 条`,
    write: '正在组织答复',
  },
  en: {
    read: 'Reading your question',
    occ: (o) => `Occupation identified: ${o}`,
    jobs: (n) => `Open postings checked: ${n} rows`,
    coverage: (n) => `Occupation lists checked: ${n} provinces`,
    thresholds: (p) => `Official requirements checked: ${p}`,
    draws: (p) => `Draw history checked: ${p}`,
    ops: (p) => `Operational stats checked: ${p}`,
    ee: 'Federal Express Entry categories checked',
    permit: (p) => `Federal rules checked: ${p}`,
    crs: (g) => `Federal points grid checked: ${g}`,
    plan: (p) => `Timeline worked out: ${p}`,
    verdict: (n) => `Official requirements compared: ${n} streams`,
    claims: (n) => `What you were told: ${n} claims checked`,
    write: 'Writing the reply',
  },
  ko: {
    read: '질문 파악 중',
    occ: (o) => `직업 확인: ${o}`,
    jobs: (n) => `채용 공고 조회: ${n}건`,
    coverage: (n) => `직업 목록 조회: ${n}개 주`,
    thresholds: (p) => `공식 요건 조회: ${p}`,
    draws: (p) => `추첨 기록 조회: ${p}`,
    ops: (p) => `운영 통계 조회: ${p}`,
    ee: '연방 EE 카테고리 조회',
    permit: (p) => `연방 규정 조회: ${p}`,
    crs: (g) => `연방 점수표 조회: ${g}`,
    plan: (p) => `소요 기간 산출: ${p}`,
    verdict: (n) => `공식 요건 대조: ${n}개 통로`,
    claims: (n) => `들으신 내용 대조: ${n}건`,
    write: '답변 작성 중',
  },
}

/**
 * consult 新链(pi 工具循环)的轨迹一行 —— 键 = consult 的工具名(`TOOL_NAME` 的值)。
 *
 * 与上面 `STEP` 并存的原因:STEP 带参(条数/省名),而新链的轨迹在**取数开始前**发
 * (「这一步真的开始打了才发」),那时参数还没有;措辞沿用 STEP 的术语体系。
 * 采信出职业那一拍例外 —— 新链直接复用 `STEP.occ(职业名)`,那一刻职业名已经在手。
 * P5 删老链时这两张表一起收敛。
 */
export const CONSULT_STEP: Record<Lang, Record<string, string>> = {
  zh: {
    search_occupations: '检索职业库',
    lookup_jobs: '查在招岗位',
    lookup_coverage: '查职业清单',
    lookup_thresholds: '查官方门槛',
    lookup_draws: '查抽选记录',
    lookup_ops: '查运营统计',
    lookup_ee: '查联邦 EE 类别',
    lookup_permit: '查联邦规则',
    lookup_points: '查联邦计分表',
    assess_pathways: '逐条比对官方门槛',
    check_claims: '核对别人跟你说的',
  },
  en: {
    search_occupations: 'Searching occupations',
    lookup_jobs: 'Checking open postings',
    lookup_coverage: 'Checking occupation lists',
    lookup_thresholds: 'Checking official requirements',
    lookup_draws: 'Checking draw history',
    lookup_ops: 'Checking operational stats',
    lookup_ee: 'Checking Express Entry categories',
    lookup_permit: 'Checking federal rules',
    lookup_points: 'Checking the federal points grid',
    assess_pathways: 'Comparing official requirements',
    check_claims: 'Checking what you were told',
  },
  ko: {
    search_occupations: '직업 검색',
    lookup_jobs: '채용 공고 조회',
    lookup_coverage: '직업 목록 조회',
    lookup_thresholds: '공식 요건 조회',
    lookup_draws: '추첨 기록 조회',
    lookup_ops: '운영 통계 조회',
    lookup_ee: '연방 EE 카테고리 조회',
    lookup_permit: '연방 규정 조회',
    lookup_points: '연방 점수표 조회',
    assess_pathways: '공식 요건 대조',
    check_claims: '들으신 내용 대조',
  },
}

export const ASK_OCC: Record<Lang, (field: string, opts: string[]) => string> = {
  zh: (f, o) => `${latinTail(f)}是专业,不是能直接查的职业。本站数据里对得上的职业有:${o.join('、')}。你想按哪一个查?`,
  en: (f, o) => `${f} is a field of study, not an occupation we can look up. In our data it points to these occupations: ${o.join(', ')}. Which one should we use?`,
  // 「는/은」的选择跟专业名末字的收音走,而专业名是用户给的 —— 用破折号绕开,省得写出一句韩语病句
  ko: (f, o) => `${f} — 전공이지 바로 조회할 수 있는 직업이 아닙니다. 본 사이트 데이터에서 연결되는 직업은 ${o.join(', ')}입니다. 어느 쪽으로 조회할까요?`,
}

/**
 * 追问 chip:点一下就把职业说清楚。**5 位码写在 chip 里**(站规的「人话名 + 代码小注」)——
 * 下一轮 SLOT_SYSTEM 那条「用户literally 打出了 5 位数字才填 noc」于是成立,职业**一字不差**地落回
 * 我们查出来的那一条。不写码的话下一轮走 pg_trgm 相似度:2026-08-06 实测,给的是
 * Information systems specialists(21222),回来落到了隔壁的 Business systems specialists(21221)——
 * 摆出去的和查回来的不是同一个职业,那是我们自己制造的一次错位。
 */
export const OCC_PICK: Record<Lang, (o: OccOption) => string> = {
  zh: (o) => `按${o.label}(NOC ${o.noc})查`,
  en: (o) => `Look it up for ${o.title} (NOC ${o.noc})`,
  ko: (o) => `${o.label}(NOC ${o.noc}) 기준으로 조회해 주세요`,
}

/** 用法答复的文案(三语,和 ASK_OCC / AVAIL_SENTENCE 同一层:见客的话在数据层写死,不过模型)。
 *  只说这张表**是什么**,不说任何数字 —— 这一轮一个工具都没查,没有 facts 就没有数可说。 */
export const USAGE_WHAT: Record<Lang, Record<UsageTopic, string>> = {
  zh: {
    lmia: 'LMIA 获批雇主指这家雇主为外籍雇员申请过劳动力市场影响评估并获批,也就是它办过这套手续。',
    aip: 'AIP 指定雇主指经省政府指定、可按大西洋移民试点雇用外籍雇员的雇主。',
    employer: '本站的雇主表按职业排:同一个职业下有哪些雇主在招、雇主在哪个省、该省清单收没收这个职业。',
  },
  en: {
    lmia: 'An LMIA-approved employer is one that has applied for and received a Labour Market Impact Assessment for a foreign worker, so it has been through that process before.',
    aip: 'An AIP designated employer is one designated by a provincial government to hire foreign workers under the Atlantic Immigration Program.',
    employer: 'Our employer tables are organised by occupation: which employers are hiring for it, which province they are in, and whether that province lists the occupation.',
  },
  ko: {
    lmia: 'LMIA 승인 고용주는 외국인 근로자를 위해 노동시장영향평가를 신청해 승인받은 고용주, 즉 그 절차를 거쳐 본 고용주입니다.',
    aip: 'AIP 지정 고용주는 대서양 이민 프로그램으로 외국인 근로자를 채용하도록 주정부가 지정한 고용주입니다.',
    employer: '본 사이트의 고용주 표는 직업 기준입니다: 어떤 고용주가 그 직업을 채용 중인지, 어느 주에 있는지, 그 주 목록에 해당 직업이 있는지.',
  },
}

/** 答完用法就把话头递回职业:这一步不做,用户下一句照样撞 noOcc。 */
export const USAGE_ASK: Record<Lang, string> = {
  zh: '告诉我你的职业或 NOC 码,我按这个职业查哪些雇主在招、哪些省的清单收了它。',
  en: 'Tell us your occupation or NOC code, and we will check which employers are hiring for it and which provinces list it.',
  ko: '직업이나 NOC 코드를 알려 주시면 해당 직업을 채용 중인 고용주와 그 직업을 목록에 올린 주를 조회해 드립니다.',
}

/**
 * 三格各一条整句(和 USAGE_WHAT 同一层:见客的话写死在数据层,不过模型)。
 * 每条自带把话头递回职业那半句 —— 不共用 USAGE_ASK,共用了三条里就有两条在同屏复述同一句。
 * 一个工具都没查,所以一个数字都不许出现。
 */
export const META_ANSWER: Record<Lang, Record<MetaTopic, string>> = {
  zh: {
    options: '选项按你说的职业生成,这一轮没认出职业就没有。说出职业名或 NOC 码,选项会跟着出来。',
    capability: '我按职业查在招岗位、省提名清单收录、官方门槛和联邦 EE 分数线。说出职业名或 NOC 码就能开始。',
    howto: '直接说职业名或 NOC 码,再补省份、经验和语言成绩,结果会更贴你的情况。',
  },
  en: {
    options: 'The options come from the occupation you name, so there are none until we have it. Tell us your occupation or NOC code and they will appear.',
    capability: 'We look up job openings, provincial list coverage, official thresholds and federal Express Entry cut-offs for one occupation. Tell us your occupation or NOC code to start.',
    howto: 'Name your occupation or NOC code first, then add your province, experience and language scores for a closer answer.',
  },
  ko: {
    options: '선택지는 말씀하신 직업으로 만들어지므로 직업을 알기 전에는 나오지 않습니다. 직업명이나 NOC 코드를 알려 주시면 함께 나옵니다.',
    capability: '직업 기준으로 채용 중인 일자리, 주 목록 등재 여부, 공식 요건, 연방 Express Entry 커트라인을 조회합니다. 직업명이나 NOC 코드를 알려 주세요.',
    howto: '직업명이나 NOC 코드를 먼저 알려 주시고, 주와 경력, 어학 점수를 더해 주시면 결과가 더 정확해집니다.',
  },
}

/**
 * 🔴 四态 → **用户语言的成句说法**,在数据层就写死(清洗下沉,CLAUDE.md 那条铁律的同一个道理)。
 *
 * 为什么不让模型自己转述:2026-08-04 实测,把英文枚举丢给它翻译,它会把两条**状态不同**的主张
 * 揉成一句 ——「关于中介收 2 万及所谓合作公司的说法,本站未收集此类数据」:
 * 「收 2 万」确实是本站没收录,但「曼省有合作公司」是**官方根本不公布**这类名单。
 * 合并 = 撒谎,而且撒的正是中介最爱钻的那个空子(用户以为「你们没查到」,实际是「谁承诺都没有官方依据」)。
 * 所以句子由我们写好,模型只负责照抄 —— 括号里那半句是防合并的锚点,别删。
 */
export const AVAIL_SENTENCE: Record<Lang, Record<Availability, string>> = {
  zh: {
    ok: 'ok',
    'not-published': '官方不公布这项数据(不是本站没查到)',
    'not-collected': '本站尚未收录这项数据(不是官方没有)',
    'not-applicable': '不适用:该省不走省提名这套制度',
  },
  en: {
    ok: 'ok',
    'not-published': 'the government does not publish this (not that we failed to find it)',
    'not-collected': 'our site has not indexed this yet (not that the government has none)',
    'not-applicable': 'not applicable: this province is outside the provincial nominee system',
  },
  ko: {
    ok: 'ok',
    'not-published': '정부가 공개하지 않는 항목입니다(본 사이트가 못 찾은 것이 아닙니다)',
    'not-collected': '본 사이트가 아직 수집하지 않았습니다(정부에 자료가 없다는 뜻이 아닙니다)',
    'not-applicable': '해당 없음: 이 주는 주정부 이민 제도 밖입니다',
  },
}

/**
 * 主张行 = [前缀, 连接词]:拼出来是**一句能整句照抄的第二人称话**
 * (「有人跟你说「中介说曼省有合作公司」——官方不公布这项数据(不是本站没查到)」)。
 * 第一版把四态只塞进 valueText、label 留英文速记,模型照样把两条揉成一句;
 * 做成成品句之后它才肯一条一句地抄。findMergedStates 靠 unit==='claim' 认行,不靠这两个字。
 */
// ⚠️ 英文那条 2026-08-04 生产实录断在这儿:`You were told "…" our site has not indexed this yet` ——
// 破折号被模型抄丢了,两个分句直接怼一起,读起来是病句。改成**冒号收口**:即使模型只抄了词,
// 「On what you were told ("X"): the government does not publish this」本身就是一句完整的话,不靠标点续命。
export const CLAIM_LEAD: Record<Lang, [string, string, string]> = {   // [开头, 收尾, 接四态的连接]
  // 「有人跟你说「X」」是记录口吻,不是说话口吻;照抄出去就是一句公文。改成「你听到的「X」这句话——…」,
  // 整句抄下来读起来就是 Frank 要的那个调子(「老板口头说帮你办,这句话本身没法核实——…」)。
  // 连接词保持中性:availability='ok' 的主张接的是「这条可以拿下面的官方数字对照」,不能预设「核不了」。
  zh: ['你听到的「', '」这句话', '——'],
  en: ['On what you were told ("', '")', ': '],
  ko: ['「', '」라고 들으신 건', ' — '],
}

/** 私人报价是交易条件,不是一项政府数据。见客时直接回答它能不能证明结果,不套 Availability。 */
export const MONEY_WHY: Record<Lang, string> = {
  zh: '报价本身不能证明对方承诺的结果能办成;真正可核的是下面的官方清单和门槛',
  en: 'A quoted fee does not prove that the promised outcome will happen; check the published lists and requirements below instead',
  ko: '제시된 수수료만으로 약속한 결과가 이루어진다는 뜻은 아닙니다. 아래의 공식 목록과 요건을 확인해야 합니다',
}

/**
 * 私人承诺的解释句 —— **见客文案的单一来源在这一层**,不在工具层。
 *
 * C1 的 `PRIVATE_PROMISE_WHY` 是中文硬编码(它那层的 `checkClaims` 签名里根本没有 lang,
 * 硬塞进去等于把语言关注点下沉到不该管它的层)。工具层给的**稳定标识**是 `topic === 'private-promise'`,
 * 见客的话由这里按用户语言出 —— 和 AVAIL_SENTENCE / LBL 一个道理。88% 是英文流量,这条尤其不能凑合。
 *
 * 私人销售承诺不是一项待查的政府数据。这里直接回答「能不能当保证」,再把读者带回真正可核的门槛。
 */
export const PROMISE_WHY: Record<Lang, string> = {
  zh: '这类私人承诺不能当作官方保证;真正可核的是下面的官方清单和门槛',
  en: 'A private promise is not an official guarantee; check the published lists and requirements below instead',
  ko: '이런 사적인 약속은 공식 보장이 아닙니다. 아래의 공식 목록과 요건을 확인해야 합니다',
}

/**
 * 🔴 fact 的 label 也按用户语言成句(和 AVAIL_SENTENCE 同一个做法)。
 *
 * 为什么必须在**数据层**做:label 有两个下游 —— 喂模型的 FACTS 块,和 guard 失败时的**降级清单**。
 * 降级清单是我们自己写的字,英文 label 直接就是见客事故(2026-08-04 实测红过一次:
 * 用户看到「apprentice-friendly openings for NOC 72310」「index scope note」)。
 * 把英文 label 丢给下游各自想办法 = 每个下游都得自己翻一遍,漏一个就露一次。
 *
 * factor 那几条尤其要连主语一起写死:实测模型把 empYears「雇主经营年限」读成「申请人要 3 年经验」,
 * 一句话把结论说反 —— 主语必须长在标签里。
 *
 * 🔴 2026-08-05 改形状(Frank:「现在这回答不像人话」):门槛类 label 从**字段名**改成**半句话**。
 * 病根不在 RULE 而在喂进去的形状 —— `X 要求申请人要达到的语言等级(CLB) = 5 CLB` 是一行表格,
 * **给它表格它就还你表格**(生产实录整段答复就是逐行念字段名)。现在 label 写成一句话的前半截,
 * 值接上去就是完整的一句(`NS 要求申请人的语言达到` + `5 CLB`),模型抄到的已经是人话。
 * 同一个字典还要撑住**出处表**(前端左列 label、右列数值)—— 半句话在表里读作「名目」,
 * 在 prompt 里读作「句子」,一份文案两处都成立,不必养两套词表(养了必分叉)。
 * 计数类(岗位数/池子/抽选)保持「名目」形态,由 factLine 用冒号接值 —— `=` 一律不进 prompt。
 */
export type LabelDict = {
  apprOpenings: string; apprSub: string; openPostings: string; qcOutside: string; indexNote: string; checked: string
  listIn: string; listEx: string; occList: string; officialReq: string; claimOk: string
  /** 查过了但一条都没命中(availability='ok' 却没有行):不是「不公布」也不是「没收录」 */
  noneFound: string
  pass: string; fail: string; unknown: string; short: string
  drawCut: string; drawInv: string; draws: string; opsStats: string
  eeCat: string; eeAll: string; unsaid: string
  federalRule: string; federalGap: string; crsPoint: string; fswPoint: string
  opsKeys: Record<string, string>
  /** 半句话:`${省码} ${factor}` + 值 = 一句完整的话。主语(申请人 / 雇主)必须长在里面。 */
  factor: Record<string, string>
  /** op='none' = 官方明说这条通道**不设**这项门槛。与 factor 分开:两句话意思相反,共用模板就会说反。 */
  factorNone: Record<string, string>
  /** languageExempt 且 unit=years:值是**毕业年限**不是语言等级(ON 那行 value=3 unit=years)——
   *  套 factor 模板会拼出「豁免语言的等级是 3 years」,年限被读成等级。整句在这儿拼好,值嵌句中。 */
  exemptYears: (n: number) => string
  /**
   * 时间线(lookupPlan)。全是**名目**形态(sayFact 用冒号接值),不是半句话 ——
   * 一条路上可能有两段同类,名目里必须写清是哪一段,不然读者对不上号。
   *  planGap:门槛缺口按因素分(key='' 是认不出因素时的兜底);
   *  planTotal / planLower:**两个不同的东西**,措辞必须让人一眼看出区别 ——
   *    total=全段都有官方数据的合计;lower=还有段算不出,这只是下界(红线:下界不许冒充总数)。
   *  faster:三语语序不同,拼接交给各自的函数(同 STEP 的做法),别拿一个模板硬套。
   */
  planGap: Record<string, string>
  planDraw: string
  /** 🔴 抽选段的 0 有两种意思,见 planStepLabel:这一条是「官方明示不进池」的那种 0 */
  planNoDraw: string
  planProc: string
  planTotal: string
  planLower: string
  planNone: string
  /** 口径注(同 indexNote 的位置):**这条线不算什么** —— 不写清楚,12.5 个月会被读成「12.5 个月拿 PR」 */
  planScope: string
  faster: (fast: string, slow: string, atLeast: boolean) => string
  /**
   * 路径裁决(C5c lookupVerdict)。全是**半句话或名目**,值/官方原句由 sayFact 接上去。
   * 🔴 `vTier` 那四句**一个数字都不许有**:tier 是「gap 落在哪个区间」的分档
   * (0=没有缺口 / ≤6 月 / ≤12 月 / >12 月),写成「还要 12 个月」是给一个区间编了一个精度。
   * 真实的月数在通道自己的 gap 理由里(带官方原句与出处),那才是能报的数。
   */
  vScope: string
  vPaths: string
  vExcluded: string
  vNeedsInfo: string
  vTier: [string, string, string, string]
  vWhy: string
  vScore: string
  vCeiling: string
  vRefLine: string
  vLeverClb: (target: number) => string
  vLeverTeer: string
  /** 缺槽反问(三语;followups 是见客文案,同 FOLLOWUPS 一层)。status 不在 PROFILE_SLOTS 里:
   *  它不参与触发计数,只在裁决已出、身份还不明时点名问(NL 这类通道的前提是有效工签,§4.5)。 */
  vAsk: Record<ProfileSlot | 'status', string>
}

export const LBL: Record<Lang, LabelDict> = {
  zh: {
    apprOpenings: '现在可带学徒的在招岗位', apprSub: '其中雇主写明不要经验的在招岗位', openPostings: '现在的在招岗位', qcOutside: '(魁省不走省提名)',
    indexNote: '索引口径说明:0 表示本站当前索引里没有,不代表该省没有空缺', checked: '查询时间',
    listIn: '的官方职业清单收了', listEx: '的官方职业清单排除了', occList: '的官方职业清单', officialReq: '的官方门槛',
    claimOk: '这条可以拿下面的官方数字对照', noneFound: '本站查过了,这一项没有命中的记录',
    pass: '已达标', fail: '未达标', unknown: '未判定(没拿到你的情况)', short: '还差',
    drawCut: '最近一轮抽选的最低分数线', drawInv: '最近一轮抽选发出的邀请数', draws: '的抽选记录', opsStats: '的运营统计',
    eeCat: '联邦 EE 通道', eeAll: '联邦 EE 通道', unsaid: '官方清单也收了这个职业、但对方没提过的省',
    federalRule: '官方规则', federalGap: '官方原文没有接上的一步', crsPoint: 'CRS 官方计分档', fswPoint: 'FSW 67 分官方计分档',
    opsKeys: { eoi_pool_total: '的 EOI 池子现有人数', eoi_pool: '的 EOI 池内人数', allocation: '今年的提名名额', remaining: '今年剩余的提名名额', nominations_ytd: '今年已经发出的提名数', processing_weeks: '官方公布的处理周期' },
    factor: {
      language: '要求申请人的语言达到', languageExempt: '规定申请人可以豁免语言的等级是',
      experience: '要求申请人的工作经验满', income: '要求申请人家庭的收入达到', wage: '要求这份工作至少给到',
      empYears: '要求雇主(不是申请人)已经营满', empRevenue: '要求雇主(不是申请人)的年营业额至少', empStaff: '要求雇主(不是申请人)至少有员工',
    },
    factorNone: { experience: '这条通道不设工作经验门槛', language: '这条通道不要求先交语言成绩' },
    // 「免」只免这条通道的**入池门槛**(2026-08-09 Frank「OINP 新系统也有语言打分啊」):EOI 排位仍计
    // 语言分(pnp_score_factors ON language CLB6=4…CLB9+=15 在库,判定/规划场景各自出行),措辞不许扩大成「语言无用」
    exemptYears: (n) => `省内认可院校毕业 ${n} 年内免交语言成绩也可入池`,
    planGap: {
      '': '补齐官方门槛要多久', experience: '补齐经验门槛要多久', language: '补齐语言门槛要多久',
      income: '补齐收入门槛要多久', wage: '补齐工资门槛要多久',
    },
    planDraw: '官方开一轮抽选的平均间隔', planNoDraw: '这条通道不用等抽选(官方明示不进池)', planProc: '官方公布的处理时长(折成月)',
    planTotal: '这条路各段合计', planLower: '这条路只把算得出的几段相加(还有段算不出,这是下界不是总数)',
    planNone: '这条路要多久',
    planScope: '时间线口径:只算门槛缺口、官方开一轮的间隔、官方公布的处理时长;签证、体检、找到雇主要多久都不在里面',
    faster: (f, s, at) => `${f} 比 ${s} ${at ? '至少快多少' : '快多少'}`,
    vScope: '路径判定的口径:逐条通道拿官方门槛与你的情况对照,这是粗筛,不是资格认定;各省还有自己的清单与细则',
    vPaths: '路径判定',
    vExcluded: '这条通道现在走不通',
    vNeedsInfo: '这条通道判不了',
    vTier: [
      '拿到 offer 当天就能递,没有还要攒的门槛',
      '拿到 offer 之后还要再攒不到半年',
      '拿到 offer 之后还要再攒不到一年',
      '拿到 offer 之后还要再攒一年以上',
    ],
    vWhy: '判定依据',
    vScore: '你在这条通道的估分',
    vCeiling: '把语言拉到官方最高档之后的上界',
    vRefLine: '最近一轮抽选的最低分',
    vLeverClb: (t) => `语言提到 CLB ${t} 之后,官方分值表上能多拿的分`,
    vLeverTeer: '改接 TEER 5 的岗之后会掉档的通道数',
    // 反问文案是**问句**(和 ASK_OCC 一样:缺了判定必需的东西就当面问,不拿默认值顶上)
    vAsk: {
      age: '你今年多少岁?',
      married: '配偶会不会跟你一起申请?',
      clb: '你的语言考到 CLB 几?',
      edu: '你的最高学历是什么?',
      canadaStudy: '你在加拿大读过书吗?',
      eduYears: '你读的课程是几年制?',
      studyProvince: '你在哪个省读的书?',
      expMonths: '你有多少个月的工作经验?',
      status: '你现在有有效的工签吗(比如 PGWP)?',
    },
  },
  en: {
    apprOpenings: 'apprentice-friendly openings right now', apprSub: 'of those postings, the ones where the employer states no experience is needed', openPostings: 'open postings right now', qcOutside: '(QC is outside PNP)',
    indexNote: 'index note: 0 means nothing in our index right now, not that the province has none', checked: 'checked',
    // ⚠️ 「officially excludes」曾经写作 EXCLUDES —— **我们自己的 label 里用大写做强调,模型照抄进答复**
    // (2026-08-06 实测同一个病:RULE 0 里的 WE 原样进了英文首句)。见客文案里一律不用大写强调。
    listIn: 'officially lists', listEx: 'officially excludes', occList: 'official occupation list', officialReq: 'official requirements',
    claimOk: 'we do have official numbers to check this against, see the figures below',
    noneFound: 'we did check this record — this occupation simply does not appear in it',
    pass: 'met', fail: 'not met', unknown: 'not judged (your situation not given)', short: 'short by',
    drawCut: 'latest draw cutoff', drawInv: 'invitations in the latest draw', draws: 'draw history', opsStats: 'operational stats',
    eeCat: 'federal EE category', eeAll: 'federal EE categories',
    federalRule: 'official rule', federalGap: 'step the official wording does not connect',
    crsPoint: 'official CRS points row', fswPoint: 'official FSW 67-point row',
    // 这句会被整句抄进答复,写成能直接当句子用的形状(旧版「provinces whose … but nobody mentioned」抄出来不成句)
    unsaid: 'other provinces whose official lists also cover this occupation, which nobody mentioned',
    opsKeys: { eoi_pool_total: 'EOI pool size right now', eoi_pool: 'EOI pool size right now', allocation: 'nomination allocation for the year', remaining: 'nomination allocation still left', nominations_ytd: 'nominations issued so far this year', processing_weeks: 'processing time the province publishes' },
    factor: {
      language: 'requires the applicant to reach a language level of', languageExempt: 'lets the applicant skip the language test at a level of',
      experience: 'requires the applicant to have work experience of', income: 'requires the applicant household income of at least',
      wage: 'requires this job to pay at least', empYears: 'requires the employer, not the applicant, to have been in business for',
      empRevenue: 'requires the employer, not the applicant, to have annual revenue of at least', empStaff: 'requires the employer, not the applicant, to have staff of at least',
    },
    factorNone: { experience: 'sets no minimum work-experience requirement', language: 'requires no language test up front' },
    exemptYears: (n) => `accepts registration without a language test if the applicant graduated from an eligible institution in the province within the last ${n} years`,
    planGap: {
      '': 'how long it takes to close the gap to the official requirement', experience: 'how long it takes to close the work experience gap',
      language: 'how long it takes to close the language gap', income: 'how long it takes to close the household income gap',
      wage: 'how long it takes to close the pay gap',
    },
    planDraw: 'average gap between one official draw round and the next',
    planNoDraw: 'no draw to wait for on this stream, the official page says so', planProc: 'processing time the province publishes, put into months',
    planTotal: 'the whole path added up', planLower: 'only the segments that can be worked out, added up (a floor, not a total)',
    planNone: 'how long this path takes',
    planScope: 'what this timeline counts: the gap to the official requirement, how often the province opens a round, and the '
      + 'processing time it publishes — a visa, a medical or the time it takes to find an employer are not in it',
    faster: (f, s, at) => `how much faster ${f} is than ${s}${at ? ', at the very least' : ''}`,
    vScope: 'what this path ruling is: every stream checked line by line against the official requirements on file — '
      + 'a first-pass sort, not an eligibility decision; each province still has its own lists and fine print',
    vPaths: 'path ruling',
    vExcluded: 'is closed on the official requirements',
    vNeedsInfo: 'cannot be ruled on',
    vTier: [
      'can be filed the day a job offer is in hand, with nothing left to build up',
      'still needs under half a year of building up after a job offer',
      'still needs under a year of building up after a job offer',
      'still needs over a year of building up after a job offer',
    ],
    vWhy: 'the official wording behind that ruling',
    vScore: 'the estimated score on this stream',
    vCeiling: 'the ceiling once language is taken to the top official band',
    vRefLine: 'the cutoff in the latest draw',
    vLeverClb: (t) => `points gained on the official grid by taking language to CLB ${t}`,
    vLeverTeer: 'streams that drop out if the job taken is a TEER 5 one',
    vAsk: {
      age: 'How old are you?',
      married: 'Would a spouse or partner come along on the application?',
      clb: 'What CLB level did you reach?',
      edu: 'What is your highest completed education?',
      canadaStudy: 'Did you study in Canada?',
      eduYears: 'How many years does your programme run?',
      studyProvince: 'Which province did you study in?',
      expMonths: 'How many months of work experience do you have?',
      status: 'Do you hold a valid work permit right now (a PGWP, for example)?',
    },
  },
  ko: {
    apprOpenings: '현재 견습 가능 채용 공고', apprSub: '그중 고용주가 경력 무관이라고 밝힌 공고', openPostings: '현재 채용 공고', qcOutside: '(퀘벡은 주정부 이민 대상 아님)',
    indexNote: '색인 안내: 0은 현재 본 사이트 색인에 없다는 뜻이며 해당 주에 공석이 없다는 뜻이 아닙니다', checked: '조회 시각',
    listIn: '공식 직업 목록에 들어 있는 직업', listEx: '공식 직업 목록에서 제외된 직업', occList: '공식 직업 목록', officialReq: '공식 요건',
    claimOk: '이 건은 아래 공식 수치와 대조할 수 있습니다', noneFound: '조회했으나 이 직업에 해당하는 기록이 없습니다',
    pass: '충족', fail: '미충족', unknown: '판정 불가(본인 상황 미제공)', short: '부족분',
    drawCut: '최근 추첨 커트라인', drawInv: '최근 추첨 초청 건수', draws: '추첨 기록', opsStats: '운영 통계',
    eeCat: '연방 EE 카테고리', eeAll: '연방 EE 카테고리', unsaid: '공식 목록에 이 직업이 있으나 상대가 말하지 않은 주',
    federalRule: '공식 규정', federalGap: '공식 문구가 연결하지 않은 단계',
    crsPoint: 'CRS 공식 점수 항목', fswPoint: 'FSW 67점 공식 항목',
    opsKeys: { eoi_pool_total: 'EOI 풀 전체 인원', eoi_pool: 'EOI 풀 인원', allocation: '올해 지명 배정', remaining: '남은 지명 배정', nominations_ytd: '올해 누적 지명', processing_weeks: '주정부가 공개한 처리 기간' },
    factor: {
      language: '요건 — 신청인의 언어 등급은', languageExempt: '요건 — 언어 면제 기준 등급(신청인)은',
      experience: '요건 — 신청인의 경력은', income: '요건 — 신청인 가구 소득은', wage: '요건 — 이 일자리의 최저 임금은',
      empYears: '요건 — 고용주(신청인 아님)의 사업 운영 기간은', empRevenue: '요건 — 고용주(신청인 아님)의 연 매출은', empStaff: '요건 — 고용주(신청인 아님)의 직원 수는',
    },
    factorNone: { experience: '이 통로는 경력 요건이 없습니다', language: '이 통로는 사전 어학 성적을 요구하지 않습니다' },
    exemptYears: (n) => `주 내 인정 교육기관 졸업 후 ${n}년 이내면 어학 성적 없이 등록할 수 있습니다`,
    planGap: {
      '': '공식 요건을 채우는 데 걸리는 기간', experience: '경력 요건을 채우는 데 걸리는 기간', language: '언어 요건을 채우는 데 걸리는 기간',
      income: '소득 요건을 채우는 데 걸리는 기간', wage: '임금 요건을 채우는 데 걸리는 기간',
    },
    planDraw: '공식 추첨 한 회차 사이의 평균 간격', planNoDraw: '이 통로는 추첨 대기가 없음(공식 명시)', planProc: '주정부가 공개한 처리 기간(개월 환산)',
    planTotal: '이 경로 전체 구간 합계', planLower: '산출 가능한 구간만 합한 값(총계가 아니라 하한)',
    planNone: '이 경로에 걸리는 기간',
    planScope: '이 기간에 포함되는 것: 요건까지의 부족분, 주정부가 추첨을 여는 주기, 공개된 처리 기간 — 비자·건강검진·고용주를 찾는 기간은 빠져 있습니다',
    faster: (f, s, at) => `${f}가 ${s}보다 빠른 기간${at ? '(최소치)' : ''}`,
    vScope: '경로 판정 기준: 각 통로를 수집된 공식 요건과 한 줄씩 대조한 결과입니다. 1차 선별일 뿐 자격 판정이 아니며, 주마다 별도의 목록과 세부 규정이 있습니다',
    vPaths: '경로 판정',
    vExcluded: '이 상황에서는 막혀 있습니다',
    vNeedsInfo: '판정할 수 없습니다',
    vTier: [
      '오퍼를 받은 당일에 신청 가능(더 쌓을 요건 없음)',
      '오퍼 이후 반년 미만을 더 쌓아야 함',
      '오퍼 이후 한 해 미만을 더 쌓아야 함',
      '오퍼 이후 한 해 넘게 더 쌓아야 함',
    ],
    vWhy: '판정 근거가 된 공식 문구',
    vScore: '이 통로에서의 예상 점수',
    vCeiling: '언어를 공식 최고 등급까지 올렸을 때의 상한',
    vRefLine: '최근 추첨의 커트라인',
    vLeverClb: (t) => `언어를 CLB ${t}까지 올릴 때 공식 점수표에서 더 받는 점수`,
    vLeverTeer: 'TEER 5 일자리로 바꾸면 빠지는 통로 수',
    vAsk: {
      age: '연세가 어떻게 되시나요?',
      married: '배우자도 함께 신청하나요?',
      clb: '언어 점수는 CLB 몇 등급인가요?',
      edu: '최종 학력은 무엇인가요?',
      canadaStudy: '캐나다에서 공부한 적이 있나요?',
      eduYears: '과정 기간은 몇 년인가요?',
      studyProvince: '어느 주에서 공부하셨나요?',
      expMonths: '경력은 몇 개월인가요?',
      status: '지금 유효한 취업 허가(예: PGWP)가 있나요?',
    },
  },
}

export const FED_FACTOR: Record<Lang, Record<string, string>> = {
  zh: {
    pgwpLength: '工签长度分档', pgwpCombine: '多个课程合并规则', pgwpOnce: '一生可申请次数',
    pgwpWindow: '毕业后申请窗口', pgwpMinProgram: '课程最短长度', pgwpLanguage: '语言门槛',
    workTeer: '合资格工作所属 TEER', workHours: '工作经验时数', workLocation: '工作经验地点',
    workSelfEmployed: '自雇及全日制学生期间工作是否计入', workRecency: '工作经验有效期',
    workNocGroups: '合资格 NOC 组别', passMark: '入池资格分数线', proofOfFunds: '资金证明规则',
    jobOfferOrCertificate: '工作邀请或技工资格证规则', residence: '计划居住地', language: '语言门槛', education: '教育要求',
  },
  en: {
    pgwpLength: 'permit length band', pgwpCombine: 'combining programs', pgwpOnce: 'lifetime application limit',
    pgwpWindow: 'application window after graduation', pgwpMinProgram: 'minimum program length', pgwpLanguage: 'language requirement',
    workTeer: 'eligible work TEER', workHours: 'work-experience hours', workLocation: 'location of work experience',
    workSelfEmployed: 'whether self-employment and full-time-student work count', workRecency: 'work-experience recency',
    workNocGroups: 'eligible NOC groups', passMark: 'eligibility pass mark', proofOfFunds: 'proof-of-funds rule',
    jobOfferOrCertificate: 'job-offer or trade-certificate rule', residence: 'intended residence', language: 'language requirement', education: 'education requirement',
  },
  ko: {
    pgwpLength: '취업 허가 기간 구간', pgwpCombine: '여러 과정 합산 규정', pgwpOnce: '평생 신청 가능 횟수',
    pgwpWindow: '졸업 후 신청 기간', pgwpMinProgram: '최소 과정 기간', pgwpLanguage: '언어 요건',
    workTeer: '인정 경력의 TEER', workHours: '경력 시간', workLocation: '경력 취득 장소',
    workSelfEmployed: '자영업·전일제 학생 경력 인정 여부', workRecency: '경력 인정 기간',
    workNocGroups: '해당 NOC 그룹', passMark: '자격 통과 점수', proofOfFunds: '정착 자금 증빙 규정',
    jobOfferOrCertificate: '잡오퍼 또는 기능 자격증 규정', residence: '거주 예정지', language: '언어 요건', education: '학력 요건',
  },
}

/**
 * 降级清单的开场白。**诚实和可读同时做到**(2026-08-05 Frank 实测:
 * 原话是「模型这次没能守住『只用查到的数字』这条线,所以…」—— 用户不关心我们的 guard 叫什么,
 * 那是在跟他讲我们的内部工程)。改法不是把它藏起来假装成正常答复,而是**只说与他有关的那一半**:
 * 这一次给的是原始事实、不是组织好的答复,而且每条带出处。他据此知道该怎么读下面这张清单,
 * 至于为什么只有事实,那是我们的事。
 */
export const SHEET_HEAD: Record<Lang, string> = {
  zh: '这次我只给你查到的官方事实,每条都带出处:',
  en: 'This time I am giving you only the official facts we looked up, each with its source:',
  ko: '이번에는 조회한 공식 자료만 그대로 드립니다. 각 항목에 출처가 있습니다:',
}

// 🔵 2026-08-09 Frank:「接着问怎么也是固定的?不应该根据对话生成吗」。改法=**确定性个性化**,
//    不是 LLM 现编(自由生成的追问会造出「本站未收录」的死路 chip——递出去的话头必须保证答得上,
//    这条底线不动)。模板织入**用户自己的职业叫法**(slots.occText:护士/PSW,不用英文长官名):
//    有槽=「护士还有哪些省的官方清单收?」,无槽=原通用句。chip 点出去自带职业词,追问轮更接得稳。
export const FOLLOWUPS: Record<Lang, Record<FollowKey, (occ?: string) => string>> = {
  zh: {
    unsaid: (o) => o ? `还有哪些省的官方清单收了${o}?` : '还有哪些省的官方清单收了我这个职业?',
    jobs: (o) => o ? `现在哪个省${o}的在招岗位最多?` : '现在哪个省这个职业的在招岗位最多?',
    thresholds: () => '这些省的官方门槛具体要求什么?',
    coverage: (o) => o ? `${o}被哪些官方清单排除了?` : '我这个职业被哪些官方清单排除了?',
    draws: () => '最近一轮抽选的分数线是多少?',
    ops: () => '这个省今年的提名名额还剩多少?',
    ee: (o) => o ? `联邦 EE 通道收了${o}吗?` : '联邦 EE 通道收了我这个职业吗?',
  },
  en: {
    unsaid: (o) => o ? `Which other provinces list ${o} officially?` : 'Which other provinces list my occupation officially?',
    jobs: (o) => o ? `Which province has the most open postings for ${o}?` : 'Which province has the most open postings for this occupation?',
    thresholds: () => 'What exactly do these provinces require on paper?',
    coverage: (o) => o ? `Which official lists exclude ${o}?` : 'Which official lists exclude my occupation?',
    draws: () => 'What was the cutoff in the latest draw?',
    ops: () => 'How much of this year’s nomination allocation is left?',
    ee: (o) => o ? `Do the federal Express Entry categories cover ${o}?` : 'Do the federal Express Entry categories cover my occupation?',
  },
  ko: {
    unsaid: (o) => o ? `다른 어느 주가 ${o}을(를) 공식 목록에 올려두었나요?` : '다른 어느 주가 제 직업을 공식 목록에 올려두었나요?',
    jobs: (o) => o ? `지금 어느 주에 ${o} 공고가 가장 많나요?` : '지금 어느 주에 이 직업 공고가 가장 많나요?',
    thresholds: () => '이 주들의 공식 요건은 구체적으로 무엇인가요?',
    coverage: (o) => o ? `어느 공식 목록이 ${o}을(를) 제외했나요?` : '어느 공식 목록이 제 직업을 제외했나요?',
    draws: () => '최근 추첨의 커트라인은 얼마였나요?',
    ops: () => '이 주의 올해 지명 배정은 얼마나 남았나요?',
    ee: (o) => o ? `연방 EE 카테고리에 ${o}이(가) 포함되나요?` : '연방 EE 카테고리에 제 직업이 포함되나요?',
  },
}

/** 尾行里那几个字段的人话名(三语;数字/省码原样跟在后面)。 */
export const SAVED_LBL: Record<Lang, { occ: string; clb: string; prov: string; status: Record<string, string> }> = {
  zh: {
    occ: '职业 NOC', clb: 'CLB', prov: '目标省',
    status: { studying: '身份 在读', working: '身份 在职', overseas: '身份 在境外' },
  },
  en: {
    occ: 'occupation NOC', clb: 'CLB', prov: 'target province',
    status: { studying: 'status studying', working: 'status working', overseas: 'status outside Canada' },
  },
  ko: {
    occ: '직업 NOC', clb: 'CLB', prov: '희망 주',
    status: { studying: '신분 재학', working: '신분 재직', overseas: '신분 해외' },
  },
}

/** 尾行:一行、不解释、不口语(文案四闸)。枚举用顿号(全站禁「·」)。 */
export const SAVED_TAIL: Record<Lang, (items: string[]) => string> = {
  zh: (i) => `已存入档案:${i.join('、')}(账户页可改)`,
  en: (i) => `Saved to your profile: ${i.join(', ')} (editable in your account).`,
  ko: (i) => `프로필에 저장했습니다: ${i.join(', ')} (계정 페이지에서 수정 가능)`,
}

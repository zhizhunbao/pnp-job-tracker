// 文案 · 对话与 AI 顾问的**见客文案**(2026-08-22 由 chat.ts 改名:lib/chat 域已死于
// consult 替换,文案文件跟着活着的域名走;`chat.*`/`advisor.*` 是组件调用点的 key 空间,不动)。
// 🔴 红线:**给模型看的提示词不在这里**(system/instructions 归 prompts.ts)——
//    用户永远看不到它们,也不需要翻译。别把「给人看的」和「给模型看的」混进一个抽屉。
import type { Domain, Lang } from './index'

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

export const consult: Domain<typeof zh> = { zh, en, ko }

// ── 对话与顾问的见客文案 ────────────────────────────────────────────────────
// 2026-08-17 从对话编排层搬来(那边 08-18 拆成了 lib/chat/)。那边留下的是**编排逻辑**与
// **模型输出的检测器**(HEDGE_WORDS / SCRIPT_RE / COVERAGE_WORD / AVAIL_MARKERS / VERDICT_MARKERS)——
// 那几样按语言分叉但不是文案,是校验规则,搬进来会让这个文件变成什么都能塞的抽屉。
// 提示词(SLOT_SYSTEM 等)同理:给模型看的,归 prompts.ts。

/**
 * consult 新链(pi 工具循环)的轨迹一行 —— 键 = consult 的工具名(`TOOL_NAME` 的值)。
 *
 * 轨迹在**取数开始前**发(「这一步真的开始打了才发」),那时还没有条数/省名可带,
 * 所以全部无参;采信出职业那一拍例外 —— 用下面的 `CONSULT_STEP_OCC`,那一刻职业名已在手。
 * (旧链的带参 STEP 表 2026-08-21 随 lib/chat 一起删了。)
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

/**
 * 采信出职业那一拍的轨迹一行 —— 唯一带参的:那一刻职业名已经在手,这是全程信息量最大的一条。
 */
export const CONSULT_STEP_OCC: Record<Lang, (occ: string) => string> = {
  zh: (o) => `认出职业:${o}`,
  en: (o) => `Occupation identified: ${o}`,
  ko: (o) => `직업 확인: ${o}`,
}

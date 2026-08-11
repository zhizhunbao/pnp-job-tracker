// 案例库 C01-C16 → 决策页「常见案例」(判定合一批3;来源:docs/design/案例库-问题与结果先行-20260803.md)。
// 每条 = 标题一行(画像 + 他要判的那件事)+ 用户原话问题。
// 红线:这里只有画像与问题,**没有任何结论**;结论永远由判定核算,出口只有做了事实层的处境页。
//
// 2026-08-11 Frank 二拍撤掉 `preset`(一键代入):它把案例主人公的画像写进用户自己的答案,
// 答过题的人一点就丢。要恢复看这次提交的父版本。

export type L3 = { zh: string; en: string; ko: string }
export type CaseEntry = {
  id: string
  /** 列表上那一行。2026-08-11 Frank「隐藏小字有必要吗,不如把标题写清楚」——
      折叠撤掉后 q 不在决策页露面了,标题必须自己把「谁 + 要判什么」说完。 */
  label: L3
  q: L3                           // 完美问题(用户原话;只在处境页与 metadata 用)
  /** 处境页 slug —— 只有做了事实层的才填。**这里是 slug 的唯一来源**:
      服务端 `caseFacts.CASE_PAGES` 按它建白名单,决策页按它决定给不给「完整案例」钮。
      填了但事实层没跟上 = 死链,所以两边共用这一个字段,不各写一份。 */
  page?: string
}

export const CASES: CaseEntry[] = [
  {
    id: 'C01',
    label: { zh: '安省毕业木匠:中介推的曼省通道', en: 'ON carpenter: the MB route pushed', ko: '온타리오 졸업 목수: 중개인이 권한 MB' },
    // 2026-08-11 Frank 更正:中介说的不是收费,是「80% 概率拿 PR + 我给你介绍雇主」——
    // 这是真人原话,记错一个字,整页答的就是另一个问题。
    q: { zh: 'MB/SK/海洋省哪个靠谱?中介说曼省稳,80% 概率拿 PR,雇主他来介绍。', en: 'MB, SK or Atlantic — which is real? The agent says MB is safe, an 80% chance of PR, and that he will line up the employer.', ko: 'MB/SK/대서양 중 어디가 확실한가요? 중개인은 MB가 안전하고 영주권 확률 80%이며 고용주도 소개해 준다고 합니다.' },
    page: 'carpenter-ontario-graduate-manitoba-agent',
  },
  {
    id: 'C02',
    label: { zh: '一年研文 IT 生:再读一年还是找雇主', en: 'IT grad: study again or find a job', ko: 'IT 유학생: 진학이냐 취업이냐' },
    q: { zh: '继续读还是直接找雇主?两个 1 年研文能换 3 年 PGWP 吗?', en: 'Keep studying or go find an employer? Do two 1-year programs get a 3-year PGWP?', ko: '더 공부할까요, 바로 취업할까요? 1년 과정 두 개면 3년 PGWP가 되나요?' },
  },
  {
    id: 'C03',
    label: { zh: '从招聘结果进来:怎么投中这份工作', en: 'Just wants to win this one job', ko: '이 일자리 하나에 붙고 싶다' },
    q: { zh: '这份工作我怎么投中?简历要改哪里?', en: 'How do I win this job? What should change on my resume?', ko: '이 일자리에 붙으려면 이력서를 어떻게 고쳐야 하나요?' },
  },
  {
    id: 'C04',
    label: { zh: '海外护士五年经验:哪条路最快', en: 'Nurse with 5 years abroad: fastest route', ko: '해외 경력 5년 간호사: 가장 빠른 길' },
    q: { zh: '我这职业去加拿大哪条路最快?', en: 'What is the fastest route to Canada for my occupation?', ko: '제 직종으로 캐나다 가는 가장 빠른 길은요?' },
  },
  {
    id: 'C05',
    label: { zh: '海外厨师 CLB 5:厨师好移民是真是假', en: 'Cook at CLB 5: is it really easy', ko: 'CLB 5 요리사: 정말 쉬운가' },
    q: { zh: '听说厨师好移民,真的吗?', en: 'I heard cooks immigrate easily — is that true?', ko: '요리사는 이민이 쉽다던데 사실인가요?' },
  },
  {
    id: 'C06',
    label: { zh: '多伦多大专在读:毕业后能不能留下', en: 'Toronto college: can they stay after', ko: '토론토 전문대: 졸업 후 남을 수 있나' },
    q: { zh: '毕业后我能留下吗?', en: 'Can I stay after graduation?', ko: '졸업 후 남을 수 있나요?' },
  },
  {
    id: 'C07',
    label: { zh: 'PGWP 剩 8 个月的 BC 护士:时间够不够', en: 'BC nurse: 8 months of PGWP left', ko: 'PGWP 8개월 BC 간호사: 시간이 되나' },
    q: { zh: '来得及吗?', en: 'Do I still have time?', ko: '아직 시간이 있을까요?' },
  },
  {
    id: 'C08',
    label: { zh: '工签被裁只剩 6 个月:该去哪个省', en: 'Laid off: which province next', ko: '취업비자 6개월: 어느 주로' },
    q: { zh: '该跑哪个省?', en: 'Which province should I go to?', ko: '어느 주로 가야 하나요?' },
  },
  {
    id: 'C09',
    label: { zh: '46 岁木匠高中学历:年纪是不是硬伤', en: 'Carpenter of 46 with high school: too old', ko: '46세 고졸 목수: 나이가 문제인가' },
    q: { zh: '我这年纪还有戏吗?', en: 'Do I still have a chance at my age?', ko: '이 나이에 가능성이 있을까요?' },
  },
  {
    id: 'C10',
    label: { zh: '一家四口去 BC:食品柜台的收入够不够', en: 'Family of four to BC: is the pay enough', ko: 'BC 4인 가족: 소득이 충분한가' },
    q: { zh: '一家四口过去,钱够不够?', en: 'Is our income enough to bring a family of four?', ko: '4인 가족이 가면 소득이 충분할까요?' },
  },
  {
    id: 'C11',
    label: { zh: '软件工程师法语 B2:魁北克是不是更容易', en: 'Engineer with French B2: is Quebec easier', ko: '프랑스어 B2 엔지니어: 퀘벡이 쉬운가' },
    q: { zh: '魁北克是不是更容易?', en: 'Is Quebec easier for me?', ko: '퀘벡이 더 쉬운가요?' },
  },
  {
    id: 'C12',
    label: { zh: '农工盯着偏远试点:试点是不是真的', en: 'Farm worker: are the rural pilots real', ko: '농업 노동자: 지방 파일럿은 진짜인가' },
    q: { zh: '偏远地区试点靠谱吗?', en: 'Are the rural pilots for real?', ko: '지방 파일럿은 믿을 만한가요?' },
  },
  {
    id: 'C13',
    label: { zh: 'NS 厨师有 offer:雇主口头帮办能不能信', en: 'NS cook: can a verbal promise be trusted', ko: 'NS 요리사: 구두 약속을 믿을까' },
    q: { zh: '雇主说帮我办,我该信吗?', en: 'The employer says they will sponsor me — should I believe it?', ko: '고용주가 스폰서해 준다는데 믿어도 되나요?' },
  },
  {
    id: 'C14',
    label: { zh: '中介开价 3 万包 offer 包提名:值不值', en: 'Agent wants $30k: is it worth it', ko: '중개인 3만 불: 값어치가 있나' },
    q: { zh: '中介说包 offer 包省提名,值吗?', en: 'The agent guarantees an offer and nomination — is it worth it?', ko: '오퍼와 노미니를 보장한다는데 그만한 가치가 있나요?' },
  },
  {
    id: 'C15',
    label: { zh: '软件工程师 CRS 480:这个分稳不稳', en: 'CRS 480: is that score safe', ko: 'CRS 480: 안정권인가' },
    q: { zh: '我 480 稳吗?', en: 'Is 480 safe?', ko: '480점이면 안정권인가요?' },
  },
  {
    id: 'C16',
    label: { zh: '站里查不到自己的工种', en: 'Cannot find my occupation here', ko: '내 직종을 찾을 수 없다' },
    q: { zh: '我的职业你们怎么没有?', en: 'Why is my occupation missing here?', ko: '제 직종은 왜 없나요?' },
  },
]

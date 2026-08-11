// 案例库 C01-C16 → 决策页「对号入座」卡(判定合一批3;来源:docs/design/案例库-问题与结果先行-20260803.md)。
// 每条 = 画像一行 + 用户原话问题 + 答案预填(只填案例明说的字段,没说的不猜 —— 剩下的题用户自己答)。
// 红线:这里只有画像与问题,**没有任何结论**;结论永远由判定核按用户自己的答案算。
import type { Answers } from './answers'

export type L3 = { zh: string; en: string; ko: string }
export type CaseEntry = {
  id: string
  label: L3                       // 画像一行(卡上收起态)
  q: L3                           // 完美问题(用户原话;点开可见,也是问顾问的预填)
  preset?: Partial<Answers>       // 一键代入:写进答题答案(缺省字段留给用户答)
}

export const CASES: CaseEntry[] = [
  {
    id: 'C01',
    label: { zh: '木匠:安省毕业,0 经验,中介推曼省', en: 'Carpenter: graduated in ON, no experience, agent pushes MB', ko: '목수: 온타리오 졸업, 경력 0, 중개인은 MB 추천' },
    // 2026-08-11 Frank 更正:中介说的不是收费,是「80% 概率拿 PR + 我给你介绍雇主」——
    // 这是真人原话,记错一个字,整页答的就是另一个问题。
    q: { zh: 'MB/SK/海洋省哪个靠谱?中介说曼省稳,80% 概率拿 PR,雇主他来介绍。', en: 'MB, SK or Atlantic — which is real? The agent says MB is safe, an 80% chance of PR, and that he will line up the employer.', ko: 'MB/SK/대서양 중 어디가 확실한가요? 중개인은 MB가 안전하고 영주권 확률 80%이며 고용주도 소개해 준다고 합니다.' },
    preset: { status: 'jobhunting', nocs: ['72310'], eduBand: 2, totalExpBand: 1, expBand: 1 },
  },
  {
    id: 'C02',
    label: { zh: 'IT 留学生:1 年研文,纠结再读一年还是找雇主', en: 'IT grad: 1-year certificate, study one more year or find an employer?', ko: 'IT 유학생: 1년 수료 후 진학과 취업 사이 고민' },
    q: { zh: '继续读还是直接找雇主?两个 1 年研文能换 3 年 PGWP 吗?', en: 'Keep studying or go find an employer? Do two 1-year programs get a 3-year PGWP?', ko: '더 공부할까요, 바로 취업할까요? 1년 과정 두 개면 3년 PGWP가 되나요?' },
    preset: { status: 'studying', nocs: ['21231'], eduBand: 3 },
  },
  {
    id: 'C03',
    label: { zh: '刚从招聘结果点进来:就想投中这份工作', en: 'Landed from a job search: just wants to win this job', ko: '채용 검색으로 유입: 이 일자리에 붙고 싶음' },
    q: { zh: '这份工作我怎么投中?简历要改哪里?', en: 'How do I win this job? What should change on my resume?', ko: '이 일자리에 붙으려면 이력서를 어떻게 고쳐야 하나요?' },
  },
  {
    id: 'C04',
    label: { zh: '海外护士:5 年经验,还没考语言', en: 'Overseas nurse: 5 years of experience, no language test yet', ko: '해외 간호사: 경력 5년, 어학시험 미응시' },
    q: { zh: '我这职业去加拿大哪条路最快?', en: 'What is the fastest route to Canada for my occupation?', ko: '제 직종으로 캐나다 가는 가장 빠른 길은요?' },
    preset: { status: 'overseas', nocs: ['31301'], totalExpBand: 5, clbBand: 1 },
  },
  {
    id: 'C05',
    label: { zh: '海外厨师:CLB 5,大专', en: 'Overseas cook: CLB 5, college diploma', ko: '해외 요리사: CLB 5, 전문대' },
    q: { zh: '听说厨师好移民,真的吗?', en: 'I heard cooks immigrate easily — is that true?', ko: '요리사는 이민이 쉽다던데 사실인가요?' },
    preset: { status: 'overseas', nocs: ['63200'], clbBand: 2, eduBand: 2 },
  },
  {
    id: 'C06',
    label: { zh: '学签在读:多伦多大专,IT 方向', en: 'Study permit: Toronto college, IT track', ko: '유학생: 토론토 전문대 IT 전공' },
    q: { zh: '毕业后我能留下吗?', en: 'Can I stay after graduation?', ko: '졸업 후 남을 수 있나요?' },
    preset: { status: 'studying', nocs: ['21232'] },
  },
  {
    id: 'C07',
    label: { zh: 'PGWP 剩 8 个月:BC 护士,加拿大 1 年经验', en: 'PGWP with 8 months left: nurse in BC, 1 year Canadian experience', ko: 'PGWP 8개월 남음: BC 간호사, 캐나다 경력 1년' },
    q: { zh: '来得及吗?', en: 'Do I still have time?', ko: '아직 시간이 있을까요?' },
    preset: { status: 'working', nocs: ['31301'], provs: ['BC'], provBand: 1, expBand: 3 },
  },
  {
    id: 'C08',
    label: { zh: '工签被裁:AB 卡车司机,签证剩 6 个月', en: 'Laid off on a work permit: AB truck driver, 6 months left', ko: '해고된 취업비자: AB 트럭 기사, 6개월 남음' },
    q: { zh: '该跑哪个省?', en: 'Which province should I go to?', ko: '어느 주로 가야 하나요?' },
    preset: { status: 'jobhunting', nocs: ['73300'] },
  },
  {
    id: 'C09',
    label: { zh: '46 岁木匠:高中学历,10 年海外经验', en: 'Carpenter, 46: high school, 10 years overseas experience', ko: '46세 목수: 고졸, 해외 경력 10년' },
    q: { zh: '我这年纪还有戏吗?', en: 'Do I still have a chance at my age?', ko: '이 나이에 가능성이 있을까요?' },
    preset: { status: 'overseas', nocs: ['72310'], ageBand: 5, eduBand: 1, totalExpBand: 5 },
  },
  {
    id: 'C10',
    label: { zh: '拖家带口:食品柜台,一家四口想去 BC', en: 'Family of four: food counter, aiming for BC', ko: '4인 가족: 푸드카운터, BC 희망' },
    q: { zh: '一家四口过去,钱够不够?', en: 'Is our income enough to bring a family of four?', ko: '4인 가족이 가면 소득이 충분할까요?' },
    preset: { status: 'overseas', nocs: ['65201'], provs: ['BC'], provBand: 1 },
  },
  {
    id: 'C11',
    label: { zh: '会法语:软件工程师,法语 B2', en: 'French speaker: software engineer, French B2', ko: '프랑스어 가능: 소프트웨어 엔지니어, B2' },
    q: { zh: '魁北克是不是更容易?', en: 'Is Quebec easier for me?', ko: '퀘벡이 더 쉬운가요?' },
    preset: { nocs: ['21231'] },
  },
  {
    id: 'C12',
    label: { zh: '想去小地方:农工,盯着偏远试点', en: 'Rural-minded: farm worker eyeing the remote pilots', ko: '소도시 희망: 농업 노동자, 지방 파일럿 관심' },
    q: { zh: '偏远地区试点靠谱吗?', en: 'Are the rural pilots for real?', ko: '지방 파일럿은 믿을 만한가요?' },
    preset: { nocs: ['85100'] },
  },
  {
    id: 'C13',
    label: { zh: '有 offer 在手:NS 厨师,雇主口头说帮办', en: 'Offer in hand: cook in NS, employer verbally promises to help', ko: '오퍼 보유: NS 요리사, 고용주가 돕겠다고 구두 약속' },
    q: { zh: '雇主说帮我办,我该信吗?', en: 'The employer says they will sponsor me — should I believe it?', ko: '고용주가 스폰서해 준다는데 믿어도 되나요?' },
    preset: { nocs: ['63200'], provs: ['NS', 'NB', 'PE', 'NL'], provBand: 5, offerBand: 1 },
  },
  {
    id: 'C14',
    label: { zh: '中介开价 3 万:木匠,说包 offer 包提名', en: 'Agent quotes $30k: carpenter, "offer and nomination guaranteed"', ko: '중개인 3만 불 요구: 목수, 오퍼·노미니 보장 주장' },
    q: { zh: '中介说包 offer 包省提名,值吗?', en: 'The agent guarantees an offer and nomination — is it worth it?', ko: '오퍼와 노미니를 보장한다는데 그만한 가치가 있나요?' },
    preset: { nocs: ['72310'] },
  },
  {
    id: 'C15',
    label: { zh: 'EE 高分:软件工程师,CRS 480,STEM', en: 'High CRS: software engineer, 480, STEM', ko: '고득점 EE: 소프트웨어 엔지니어, CRS 480' },
    q: { zh: '我 480 稳吗?', en: 'Is 480 safe?', ko: '480점이면 안정권인가요?' },
    preset: { nocs: ['21231'], crsBand: 4 },
  },
  {
    id: 'C16',
    label: { zh: '职业没分类:站里查不到自己的工种', en: 'Unclassified: cannot find their occupation on the site', ko: '미분류 직종: 사이트에서 직종을 못 찾음' },
    q: { zh: '我的职业你们怎么没有?', en: 'Why is my occupation missing here?', ko: '제 직종은 왜 없나요?' },
  },
]

'use client'
// 隐私政策(E4-02)。文案模板级自拟,不构成法律意见。
import { Legal, type LegalDoc } from '../Legal'
import { IconLock } from '../../Icons'
import type { Lang } from '../../jobs/i18n'

const docs: Record<Lang, LegalDoc> = {
  zh: {
    title: '隐私政策',
    updated: '生效日期:2026-08-05',
    sections: [
      { h: '1. 我们收集什么', body: [
        '账户信息:邮箱地址与密码(密码以加密哈希存储,我们无法看到原文)。',
        '移民档案(可选、全部自报):NOC 码、语言 CLB、CRS 分、目标省、PGWP 剩余月数。仅用于计算「与我的匹配」等个人化功能,只存在你的账户里,可随时修改或清空。',
        'Pro 状态:到期日与 Stripe 客户标识(用于对账)。',
        '简历(默认不存):上传的 PDF、DOCX 原件只在内存里解析,解析完即弃,不落盘也不入库。只有你在简历对照弹框里勾选存档,简历文本才会存进你的账户(上限 20,000 字符),账户页可随时查看与清除。',
        '技术数据:为防滥用,API 按 IP 与账户做进程内当日计数(不落库、每日清零);简历对照的当日次数存在你的账户档案里(只有日期与次数),跨日归零。浏览器 localStorage/Cookie 存语言、列偏好与登录会话。',
        '访问统计:使用 umami(无 Cookie 的匿名统计)记录页面浏览与转化漏斗事件(注册、打开升级/定价弹窗、发起购买),不含个人身份,不跨站追踪。'
        + '同样的漏斗事件我们也在自己的数据库里按天计数(只有「哪天、哪个事件、多少次」,不含 IP、设备信息、账户或会话标识)。',
        '对话记录:为改进问答质量,我们保存 AI 顾问的提问与回答内容(含你在提问里自己写下的信息)、以及本站为这次回答查到的数据与耗时。'
        + '不含 IP、账户标识或邮箱,无法关联到具体的人。',
      ] },
      { h: '2. 支付', body: [
        '支付全程由 Stripe 处理,银行卡号、支付宝/微信账户等支付凭据不经过也不存储在本站服务器。详见 Stripe 的隐私政策(stripe.com/privacy)。',
      ] },
      { h: '3. 我们如何使用', body: [
        '仅用于提供服务本身:登录鉴权、个人化匹配、AI 顾问的档案感知、配额管理与付费权益。我们不出售你的个人数据,不用于广告投放,不与第三方共享;为提供本服务所必需的服务提供方(托管、支付、大模型服务)与法律要求除外。',
      ] },
      { h: '4. AI 处理说明', body: [
        'Pro 用户使用 AI 顾问时,你的自报档案与所查职位的数据会发送给大模型服务商(Anthropic)以生成回答;对方按其商业条款不使用这些数据训练模型。',
        '使用简历对照时,你的简历文本与该职位的描述文本会发送给本站使用的大模型服务做比对,不用于训练模型。服务端日志只记文本长度与耗时,不记内容。',
      ] },
      { h: '5. 存储位置与保留', body: [
        '数据库托管在 Render(美国弗吉尼亚)。账户数据在账户存续期间保留。',
      ] },
      { h: '6. 你的权利与删号', body: [
        '你可随时在账户页修改档案。要删除账户及全部关联数据,发邮件至 {email}(用注册邮箱发送即可),我们会在合理时间内处理并确认。',
      ] },
      { h: '7. 变更', body: [
        '本政策更新时会修改页首生效日期;重大变更会在站内提示。',
      ] },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Effective date: 2026-08-05',
    sections: [
      { h: '1. What we collect', body: [
        'Account: email address and password (stored as a cryptographic hash — we cannot see the original).',
        'Immigration profile (optional, entirely self-reported): NOC codes, language CLB, CRS score, target provinces, PGWP months left. Used only for personalised features such as "Match for me"; stored only on your account; editable or clearable anytime.',
        'Pro status: expiry date and Stripe customer identifier (for reconciliation).',
        'Resume (not stored by default): uploaded PDF and DOCX files are parsed in memory and discarded immediately — never written to disk or to our database. Your resume text is stored on your account (up to 20,000 characters) only if you tick the save box in the resume match dialog; you can view or clear it anytime on the account page.',
        'Technical data: to prevent abuse, APIs keep in-process daily counters per IP and per account (not persisted, reset daily); the resume match daily count is stored on your account profile (date and count only) and resets each day. Browser localStorage/cookies store language, column preferences and the login session.',
        'Analytics: we use umami (cookie-less, anonymous) to record page views and conversion-funnel events (sign-up, opening the upgrade/pricing dialogs, checkout initiation); no personal identity, no cross-site tracking.'
        + ' The same funnel events are also counted per day in our own database — only "which day, which event, how many times", with no IP, device, account or session identifier.',
        'Conversations: to improve answer quality we store the questions and answers from the AI advisor (including whatever you write in your own question), along with the data this site looked up for that answer and how long it took.'
        + ' No IP, account identifier or email address is stored, so it cannot be linked back to a person.',
      ] },
      { h: '2. Payments', body: [
        'Payments are handled entirely by Stripe. Card numbers and Alipay/WeChat credentials never pass through or get stored on our servers. See Stripe’s privacy policy (stripe.com/privacy).',
      ] },
      { h: '3. How we use it', body: [
        'Only to provide the service itself: authentication, personalised matching, profile-aware AI advisor, quota management and paid entitlements. We do not sell your personal data, do not use it for advertising, and do not share it with third parties, apart from the providers needed to run the service (hosting, payments, LLM services) and where required by law.',
      ] },
      { h: '4. AI processing', body: [
        'When a Pro user uses the AI advisor, the self-reported profile and the queried job’s data are sent to our LLM provider (Anthropic) to generate the answer; under their commercial terms this data is not used to train models.',
        'When you run a resume match, your resume text and that job’s description are sent to the LLM service we use for the comparison, and are not used to train models. Server logs record only text length and duration, never the content.',
      ] },
      { h: '5. Storage and retention', body: [
        'The database is hosted on Render (Virginia, USA). Account data is retained for the life of the account.',
      ] },
      { h: '6. Your rights and account deletion', body: [
        'You can edit your profile anytime on the account page. To delete your account and all associated data, email {email} from your registered address; we will process and confirm within a reasonable time.',
      ] },
      { h: '7. Changes', body: [
        'When this policy changes we update the effective date above; material changes will be announced on the site.',
      ] },
    ],
  },
  ko: {
    title: '개인정보 처리방침',
    updated: '시행일: 2026-08-05',
    sections: [
      { h: '1. 수집 항목', body: [
        '계정: 이메일 주소와 비밀번호(암호화 해시로 저장되며 원문은 볼 수 없습니다).',
        '이민 프로필(선택, 전부 자가 보고): NOC 코드, 언어 CLB, CRS 점수, 목표 주, PGWP 잔여 개월. "나와의 매칭" 등 개인화 기능에만 사용되며 내 계정에만 저장, 언제든 수정·삭제 가능합니다.',
        'Pro 상태: 만료일과 Stripe 고객 식별자(대사용).',
        '이력서(기본값은 저장 안 함): 업로드한 PDF·DOCX 원본은 메모리에서만 분석한 뒤 즉시 폐기하며 디스크나 데이터베이스에 저장하지 않습니다. 이력서 대조 창에서 저장 항목을 선택한 경우에만 이력서 텍스트가 계정에 저장되며(최대 20,000자), 계정 페이지에서 언제든 확인·삭제할 수 있습니다.',
        '기술 데이터: 남용 방지를 위해 API는 IP·계정별 당일 카운터를 프로세스 내에서만 유지(저장 안 함, 매일 초기화)하며, 이력서 대조의 당일 횟수는 계정 프로필에 저장합니다(날짜와 횟수만, 매일 초기화). 브라우저 localStorage/쿠키에 언어·열 설정·로그인 세션을 저장합니다.',
        '방문 통계: umami(쿠키 없는 익명 통계)로 페이지 조회와 전환 퍼널 이벤트(가입, 업그레이드/요금제 창 열기, 결제 시작)를 기록합니다. 개인 식별 정보 없음, 사이트 간 추적 없음.'
        + ' 동일한 퍼널 이벤트는 자체 데이터베이스에도 일자별 횟수로만 집계합니다(날짜·이벤트·횟수만, IP·기기·계정·세션 식별자 없음).',
        '대화 기록: 답변 품질 개선을 위해 AI 어드바이저의 질문과 답변 내용(질문에 직접 적으신 정보 포함), 그리고 그 답변을 위해 본 사이트가 조회한 데이터와 처리 시간을 저장합니다.'
        + ' IP·계정 식별자·이메일은 저장하지 않으므로 특정 개인과 연결할 수 없습니다.',
      ] },
      { h: '2. 결제', body: [
        '결제는 전적으로 Stripe가 처리합니다. 카드번호, Alipay/WeChat 자격 증명은 당사 서버를 거치거나 저장되지 않습니다. Stripe 개인정보 처리방침(stripe.com/privacy)을 참조하세요.',
      ] },
      { h: '3. 이용 목적', body: [
        '서비스 제공 자체에만 사용합니다: 로그인 인증, 개인화 매칭, 프로필 인지 AI 어드바이저, 할당량 관리와 유료 권한. 개인정보를 판매하지 않고 광고에 쓰지 않으며 제3자와 공유하지 않습니다. 서비스 제공에 필요한 공급업체(호스팅·결제·LLM 서비스)와 법적 요구는 예외입니다.',
      ] },
      { h: '4. AI 처리', body: [
        'Pro 사용자가 AI 어드바이저를 사용할 때 자가 보고 프로필과 조회한 공고 데이터가 LLM 제공사(Anthropic)로 전송되어 답변을 생성합니다. 상업 약관에 따라 이 데이터는 모델 학습에 사용되지 않습니다.',
        '이력서 대조를 실행하면 이력서 텍스트와 해당 공고의 설명 텍스트가 당사가 사용하는 LLM 서비스로 전송되어 비교되며, 모델 학습에는 사용되지 않습니다. 서버 로그에는 텍스트 길이와 처리 시간만 기록하고 내용은 기록하지 않습니다.',
      ] },
      { h: '5. 저장 위치와 보존', body: [
        '데이터베이스는 Render(미국 버지니아)에 호스팅됩니다. 계정 데이터는 계정 존속 기간 동안 보존됩니다.',
      ] },
      { h: '6. 권리와 계정 삭제', body: [
        '계정 페이지에서 언제든 프로필을 수정할 수 있습니다. 계정과 모든 관련 데이터를 삭제하려면 가입 이메일로 {email}에 메일을 보내주세요. 합리적인 기간 내 처리 후 확인해 드립니다.',
      ] },
      { h: '7. 변경', body: [
        '본 방침이 변경되면 상단 시행일을 갱신하며, 중대한 변경은 사이트 내에 공지합니다.',
      ] },
    ],
  },
}

export default function PrivacyPage() { return <Legal docs={docs} icon={<IconLock />} /> }

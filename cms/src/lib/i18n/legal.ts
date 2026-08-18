// 文案 · 法务四页与页脚 —— 免责/隐私/条款/关于。
// 长文按页组织(`docs`),不摊进主字典的扁平 key 空间:一页正文是一个整体,拆成几十个键
// 只会让「这一段在哪」变成一次全站 grep。
import type { Domain, Lang } from './index'

const zh = {
  'foot.disclaimer': '数据仅供参考,全部来源于官网,不构成移民和法律建议',
  // 免责声明(E4-01)
  'foot.disclaimerLink': '免责声明', 'foot.privacy': '隐私政策', 'foot.terms': '服务条款', 'foot.about': '关于',
  'legal.title': '免责声明',
  'legal.wip': '完整版法律页面(隐私政策 / 使用条款 / 关于)将在正式收费前发布。',
}

const en: Record<keyof typeof zh, string> = {
  'foot.disclaimer': 'Data is for reference only, all from official sources; not immigration or legal advice',
  // 免责声明(E4-01)
  'foot.disclaimerLink': 'Disclaimer', 'foot.privacy': 'Privacy', 'foot.terms': 'Terms', 'foot.about': 'About',
  'legal.title': 'Disclaimer',
  'legal.wip': 'Full legal pages (privacy policy / terms of use / about) will be published before paid plans go live.',
}

const ko: Record<keyof typeof zh, string> = {
  'foot.disclaimer': '데이터는 참고용이며 모두 공식 출처입니다. 이민·법률 자문이 아닙니다',
  // 免责声明(E4-01)
  'foot.disclaimerLink': '면책 조항', 'foot.privacy': '개인정보 처리방침', 'foot.terms': '이용약관', 'foot.about': '소개',
  'legal.title': '면책 조항',
  'legal.wip': '전체 법률 페이지(개인정보 처리방침 / 이용약관 / 소개)는 유료 서비스 시작 전에 게시됩니다.',
}

export const legal: Domain<typeof zh> = { zh, en, ko }

// ── 法务四页正文 ────────────────────────────────────────────────────────────
// 一页正文是一个整体,不摊进上面的扁平 key 空间:拆成几十个键只会让「这一段在哪」
// 变成一次全站 grep。四篇同型,`Record<Lang, LegalDoc>` 保证加一门语言时四篇一起报红。
// 文案为模板级自拟,不构成法律意见(收入后请专业审阅,backlog)。
export type LegalDoc = { title: string; updated: string; sections: { h: string; body: string[] }[] }

export const legalDocs: Record<'privacy' | 'terms' | 'disclaimer' | 'about', Record<Lang, LegalDoc>> = {
  privacy: {
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
    },
  terms: {
    zh: {
      title: '服务条款',
      updated: '生效日期:2026-07-04',
      sections: [
        { h: '1. 服务内容', body: [
          'Offer2PR 提供加拿大公开职位信息的聚合浏览,以及面向注册用户的增值功能(移民档案匹配、AI 顾问、工资对比等,统称 Pro 功能)。使用本站即表示你接受本条款、隐私政策与免责声明。',
        ] },
        { h: '2. 账户', body: [
          '注册需提供有效邮箱。你对账户下的活动负责,请妥善保管密码。我们可对滥用行为(如爬取、共享账户、绕过配额)限制或终止服务。',
        ] },
        { h: '3. 付费:一次性时长包', body: [
          'Pro 以一次性时长包出售:30 天 CA$19、90 天 CA$39(价格可能调整,以购买页显示为准)。购买即时生效;未到期续买时长顺延。到期后自动回到免费版——没有订阅,没有自动扣款。',
          '支付由 Stripe 安全处理;具体可用的支付方式以结账页实际显示为准。',
        ] },
        { h: '4. 退款', body: [
          '购买后 7 天内且未大量使用付费功能(以 AI 顾问等用量显著低于日常上限为准),可用注册邮箱发邮件至 {email} 申请全额退款,我们核实后原路退回,Pro 权益同时终止。',
          '超过 7 天、或存在明显滥用/套利行为的,不适用无理由退款;个案争议可邮件沟通。',
        ] },
        { h: '5. 数据来源与知识产权', body: [
          '职位数据来自 Job Bank 等公开来源的自动聚合;职位描述仅做结构化摘录并显著链接官方原帖,原始内容的权利归雇主或原发布平台所有。本站自建的清洗、评分、匹配逻辑与界面归本站所有。',
          '禁止对本站进行系统性抓取、复制或转售数据。',
        ] },
        { h: '6. 雇主 / 平台异议下架', body: [
          '如你是相关职位的雇主或原发布平台,认为本站对某条信息的聚合展示不妥,请邮件 {email} 并附职位链接与身份说明。我们核实后会在合理时间内下架相应内容并回复确认。',
        ] },
        { h: '7. 免责与责任限制', body: [
          '服务按「现状」提供,数据与 AI 输出的准确性详见免责声明。在法律允许的最大范围内,本站对使用或无法使用本服务导致的任何间接损失不承担责任;直接责任以你实际支付的费用为限。',
        ] },
        { h: '8. 条款变更与适用法', body: [
          '条款更新时修改页首生效日期,重大变更站内提示;继续使用即视为接受。本条款适用加拿大安大略省法律。',
        ] },
      ],
    },
    en: {
      title: 'Terms of Service',
      updated: 'Effective date: 2026-07-04',
      sections: [
        { h: '1. The service', body: [
          'Offer2PR provides aggregated browsing of publicly posted Canadian jobs, plus paid features for registered users (immigration profile matching, AI advisor, wage comparison, etc. — collectively "Pro"). By using the site you accept these terms, the privacy policy and the disclaimer.',
        ] },
        { h: '2. Accounts', body: [
          'Registration requires a valid email. You are responsible for activity under your account; keep your password safe. We may restrict or terminate service for abuse (scraping, account sharing, quota circumvention).',
        ] },
        { h: '3. Payment: one-time passes', body: [
          'Pro is sold as one-time passes: 30 days CA$19, 90 days CA$39 (prices may change; the checkout page governs). Passes take effect immediately; buying again before expiry extends the date. When a pass expires you simply return to the free plan — there is no subscription and no automatic charge.',
          'Payments are processed securely by Stripe; available payment methods are as shown at checkout.',
        ] },
        { h: '4. Refunds', body: [
          'Within 7 days of purchase, if you have not made heavy use of paid features (e.g. AI-advisor usage well below the daily cap), you may request a full refund by emailing {email} from your registered address. After verification we refund to the original method and the Pro entitlement ends.',
          'Requests beyond 7 days, or cases of clear abuse/arbitrage, are not covered by this no-questions refund; individual disputes can be raised by email.',
        ] },
        { h: '5. Data sources and intellectual property', body: [
          'Job data is automatically aggregated from public sources such as Job Bank; job descriptions are shown as structured excerpts with a prominent link to the official posting, and rights in the original content remain with the employer or the original platform. Our own cleaning, scoring and matching logic and the interface belong to this site.',
          'Systematic scraping, copying or resale of the site’s data is prohibited.',
        ] },
        { h: '6. Employer / platform takedown', body: [
          'If you are the employer or the original platform of a listed posting and object to how it is aggregated here, email {email} with the job link and proof of identity. After verification we will remove the content within a reasonable time and confirm.',
        ] },
        { h: '7. Disclaimer and limitation of liability', body: [
          'The service is provided "as is"; see the disclaimer regarding data and AI accuracy. To the maximum extent permitted by law, we are not liable for indirect losses arising from use of or inability to use the service; direct liability is capped at the amount you actually paid.',
        ] },
        { h: '8. Changes and governing law', body: [
          'When these terms change we update the effective date above and announce material changes on the site; continued use constitutes acceptance. These terms are governed by the laws of Ontario, Canada.',
        ] },
      ],
    },
    ko: {
      title: '이용약관',
      updated: '시행일: 2026-07-04',
      sections: [
        { h: '1. 서비스', body: [
          'Offer2PR는 캐나다 공개 채용 정보의 통합 열람과 가입자 대상 유료 기능(이민 프로필 매칭, AI 어드바이저, 임금 비교 등, 통칭 "Pro")을 제공합니다. 본 사이트를 이용하면 본 약관, 개인정보 처리방침, 면책 조항에 동의한 것으로 봅니다.',
        ] },
        { h: '2. 계정', body: [
          '가입에는 유효한 이메일이 필요합니다. 계정 활동에 대한 책임은 본인에게 있으며 비밀번호를 안전하게 관리하세요. 남용(크롤링, 계정 공유, 할당량 우회)에 대해 서비스 제한·종료가 있을 수 있습니다.',
        ] },
        { h: '3. 결제: 일회성 기간권', body: [
          'Pro는 일회성 기간권으로 판매합니다: 30일 CA$19, 90일 CA$39(가격은 변경될 수 있으며 결제 페이지 기준). 구매 즉시 적용되며 만료 전 재구매 시 기간이 연장됩니다. 만료 후에는 무료 플랜으로 돌아갑니다 — 구독도 자동 결제도 없습니다.',
          '결제는 Stripe가 안전하게 처리하며, 사용 가능한 결제 수단은 결제 페이지에 표시된 것을 기준으로 합니다.',
        ] },
        { h: '4. 환불', body: [
          '구매 후 7일 이내이고 유료 기능을 과도하게 사용하지 않은 경우(예: AI 어드바이저 사용량이 일일 한도보다 훨씬 낮음), 가입 이메일로 {email}에 전액 환불을 신청할 수 있습니다. 확인 후 원결제 수단으로 환불되며 Pro 권한은 종료됩니다.',
          '7일 초과 또는 명백한 남용·차익 행위에는 무조건 환불이 적용되지 않으며, 개별 분쟁은 이메일로 논의할 수 있습니다.',
        ] },
        { h: '5. 데이터 출처와 지식재산', body: [
          '채용 데이터는 Job Bank 등 공개 출처에서 자동 수집됩니다. 직무 설명은 구조화 발췌로만 표시하고 공식 공고 링크를 눈에 띄게 제공하며, 원본 콘텐츠의 권리는 고용주 또는 원 플랫폼에 있습니다. 당사의 정제·평가·매칭 로직과 인터페이스는 본 사이트에 귀속됩니다.',
          '본 사이트 데이터의 체계적 크롤링·복제·재판매를 금지합니다.',
        ] },
        { h: '6. 고용주/플랫폼 이의 및 게시 중단', body: [
          '게시된 공고의 고용주 또는 원 플랫폼으로서 본 사이트의 표시 방식에 이의가 있으면 공고 링크와 신원 증빙을 첨부해 {email}로 연락하세요. 확인 후 합리적인 기간 내 해당 콘텐츠를 내리고 회신합니다.',
        ] },
        { h: '7. 면책과 책임 제한', body: [
          '서비스는 "있는 그대로" 제공됩니다. 데이터·AI 정확성은 면책 조항을 참조하세요. 법이 허용하는 최대 범위에서 서비스 이용 또는 이용 불능으로 인한 간접 손해에 책임지지 않으며, 직접 책임은 실제 지불 금액을 한도로 합니다.',
        ] },
        { h: '8. 약관 변경과 준거법', body: [
          '약관 변경 시 상단 시행일을 갱신하고 중대한 변경은 사이트 내 공지합니다. 계속 이용하면 동의한 것으로 봅니다. 본 약관은 캐나다 온타리오주 법률을 따릅니다.',
        ] },
      ],
    },
    },
  disclaimer: {
    zh: {
      title: '免责声明',
      updated: '生效日期:2026-07-04',
      sections: [
        { h: '1. 本站性质', body: [
          'Offer2PR 是一个职位信息聚合工具:数据来自 Job Bank、各省政府官网、IRCC、ESDC、加拿大统计局等公开来源的自动抓取、清洗与评分,每日更新。本站不是招聘中介,不代表任何雇主,也不参与任何招聘或移民申请流程。',
        ] },
        { h: '2. 非移民建议、非法律建议', body: [
          '本站全部内容——包括职位标记(PNP / EE 类别 / AIP)、评分、「与我的匹配」、AI 顾问输出——均不构成移民建议或法律建议。我们不是加拿大持牌移民顾问(RCIC),也不是律师,与 IRCC 及任何政府机构无隶属关系。',
          '任何移民决定请以 IRCC 与各省政府的官方发布为准,必要时咨询持牌专业人士。',
        ] },
        { h: '3. 标记与匹配是机械比对,非资格认定', body: [
          'PNP「可提名」等标记是按职业分类(NOC/TEER)与各省公开清单做的粗筛信号;「与我的匹配」是你自报档案与公开清单、抽选数据的机械比对。它们都不是任何形式的资格认定——各省项目另有语言、工资、学历、雇主资质等要求,且政策随时变化。',
        ] },
        { h: '4. 数据准确性', body: [
          '自动抓取的数据可能有误、缺失或滞后:职位可能已下架、薪资可能变动、清单与抽选线以官方页面实时为准。每条清单类数据我们尽量标注来源链接与抓取日期,便于你核对原始出处。',
        ] },
        { h: '5. AI 生成内容', body: [
          'AI 顾问的判断与对话由大语言模型生成,虽然我们要求它只基于本站核验过的数据回答,它仍可能出错或表述不准。AI 输出仅供参考,不构成任何建议。',
        ] },
        { h: '6. 外部链接', body: [
          '本站链接的官方原帖、政府页面等外部网站由第三方运营,其内容与可用性不在我们控制范围内。',
        ] },
      ],
    },
    en: {
      title: 'Disclaimer',
      updated: 'Effective date: 2026-07-04',
      sections: [
        { h: '1. What this site is', body: [
          'Offer2PR is a job-information aggregator: data is automatically scraped, cleaned and scored from public sources such as Job Bank, provincial government websites, IRCC, ESDC and Statistics Canada, updated daily. We are not a recruitment agency, do not represent any employer, and are not involved in any hiring or immigration application process.',
        ] },
        { h: '2. Not immigration or legal advice', body: [
          'Nothing on this site — including job flags (PNP / EE category / AIP), scores, "Match for me", or AI advisor output — constitutes immigration or legal advice. We are not licensed Canadian immigration consultants (RCIC) or lawyers, and are not affiliated with IRCC or any government body.',
          'For any immigration decision, rely on official IRCC and provincial publications, and consult a licensed professional where needed.',
        ] },
        { h: '3. Flags and matches are mechanical comparisons, not eligibility rulings', body: [
          'PNP flags are rough screens based on occupation classification (NOC/TEER) against published provincial lists; "Match for me" mechanically compares your self-reported profile against published lists and draw data. None of these are eligibility determinations — provincial programs have additional language, wage, education and employer requirements, and policies change frequently.',
        ] },
        { h: '4. Data accuracy', body: [
          'Auto-scraped data may be wrong, incomplete or out of date: postings may have closed, wages may have changed, and lists / draw cutoffs are governed by the live official pages. Where possible we label list-type data with its source link and fetch date so you can verify the original.',
        ] },
        { h: '5. AI-generated content', body: [
          'AI advisor assessments and chat replies are generated by a large language model. Although we require it to answer only from data verified on this site, it can still be wrong or imprecise. AI output is for reference only.',
        ] },
        { h: '6. External links', body: [
          'Official postings, government pages and other external sites we link to are operated by third parties; their content and availability are outside our control.',
        ] },
      ],
    },
    ko: {
      title: '면책 조항',
      updated: '시행일: 2026-07-04',
      sections: [
        { h: '1. 본 사이트의 성격', body: [
          'Offer2PR는 채용 정보 수집 도구입니다. Job Bank, 주정부 웹사이트, IRCC, ESDC, 캐나다 통계청 등 공개 출처에서 자동 수집·정제·평가한 데이터를 매일 갱신합니다. 당사는 채용 중개사가 아니며, 어떤 고용주도 대리하지 않고, 채용·이민 신청 절차에 관여하지 않습니다.',
        ] },
        { h: '2. 이민·법률 자문이 아님', body: [
          '본 사이트의 모든 콘텐츠(PNP / EE 카테고리 / AIP 표시, 점수, "나와의 매칭", AI 어드바이저 출력 포함)는 이민 또는 법률 자문이 아닙니다. 당사는 캐나다 공인 이민 컨설턴트(RCIC)나 변호사가 아니며 IRCC 및 정부 기관과 무관합니다.',
          '이민 관련 결정은 IRCC 및 주정부 공식 발표를 기준으로 하고, 필요 시 공인 전문가와 상담하세요.',
        ] },
        { h: '3. 표시와 매칭은 기계적 비교이며 자격 판정이 아님', body: [
          'PNP 표시는 직업 분류(NOC/TEER)와 주정부 공개 목록의 대략적 비교 신호이며, "나와의 매칭"은 자가 보고 프로필과 공개 목록·추첨 데이터의 기계적 비교입니다. 어느 것도 자격 판정이 아닙니다. 주정부 프로그램에는 언어·임금·학력·고용주 요건이 추가로 있으며 정책은 수시로 변합니다.',
        ] },
        { h: '4. 데이터 정확성', body: [
          '자동 수집 데이터는 오류·누락·지연이 있을 수 있습니다. 공고가 마감되었거나 급여가 변경되었을 수 있으며, 목록과 추첨 커트라인은 공식 페이지 기준입니다. 목록형 데이터에는 가능한 한 출처 링크와 수집일을 표기합니다.',
        ] },
        { h: '5. AI 생성 콘텐츠', body: [
          'AI 어드바이저의 판단과 대화는 대규모 언어 모델이 생성합니다. 본 사이트에서 검증된 데이터만 사용하도록 요구하지만 여전히 오류나 부정확한 표현이 있을 수 있습니다. AI 출력은 참고용입니다.',
        ] },
        { h: '6. 외부 링크', body: [
          '본 사이트가 연결하는 공식 공고·정부 페이지 등 외부 사이트는 제3자가 운영하며 그 내용과 가용성은 당사의 통제 밖에 있습니다.',
        ] },
      ],
    },
    },
  about: {
    zh: {
      title: '🍁 关于 Offer2PR',
      updated: '',
      sections: [
        { h: '这是什么', body: [
          '一个每日更新的全加拿大职位板,带移民价值视角。普通招聘站告诉你「哪里有工作」,我们还告诉你:这份工作对你的移民路径意味着什么——能不能走「雇主 offer → 省提名」、在不在联邦 EE 类别清单、薪资和当地中位差多少、和你的档案匹配度如何。',
        ] },
        { h: '为谁而做', body: [
          '为在加拿大的留学生、PGWP 持有人和考虑技术移民的人:找工作时最该优先投哪些岗,不该只看薪资,还要看它们通向身份的概率。',
        ] },
        { h: '数据从哪来', body: [
          '全部来自公开来源的自动抓取与清洗:Job Bank(全 10 省全职业,每日增量)、各省提名计划官网(OINP/AAIP/SINP/NSNP 等清单,定期实时抓取)、IRCC(EE 类别抽选与分数线)、ESDC(工资中位数)、加拿大统计局(NOC 2021 职业描述)。清单类数据都标注来源链接与抓取日期。',
        ] },
        { h: '谁在做', body: [
          '这是一个独立开发者项目,由 Frank 一个人构建与维护。有问题、建议或数据勘误,欢迎邮件 {email}。',
        ] },
      ],
    },
    en: {
      title: '🍁 About Offer2PR',
      updated: '',
      sections: [
        { h: 'What this is', body: [
          'A daily-updated, Canada-wide job board with an immigration-value lens. Ordinary job sites tell you where the jobs are; we also tell you what a job means for your immigration path — whether it can support the employer-offer → PNP route, whether it sits on a federal EE category list, how the pay compares to the local median, and how it matches your own profile.',
        ] },
        { h: 'Who it is for', body: [
          'International students, PGWP holders and prospective skilled-worker immigrants in Canada: when job-hunting, prioritise not just by salary but by the probability a job leads to status.',
        ] },
        { h: 'Where the data comes from', body: [
          'Everything is auto-scraped and cleaned from public sources: Job Bank (all 10 provinces, all occupations, daily), provincial nominee program websites (OINP/AAIP/SINP/NSNP lists, refreshed on schedule), IRCC (EE category draws and cutoffs), ESDC (median wages) and Statistics Canada (NOC 2021 occupation descriptions). List-type data carries its source link and fetch date.',
        ] },
        { h: 'Who builds it', body: [
          'This is an independent developer project, built and maintained by Frank. Questions, suggestions or data corrections: {email}.',
        ] },
      ],
    },
    ko: {
      title: '🍁 Offer2PR 소개',
      updated: '',
      sections: [
        { h: '무엇인가', body: [
          '매일 갱신되는 캐나다 전역 채용 보드에 이민 가치 관점을 더했습니다. 일반 채용 사이트는 "어디에 일자리가 있는지"를 알려주지만, 우리는 그 일자리가 이민 경로에 무엇을 의미하는지도 알려줍니다 — 고용주 오퍼 → 주정부 지명(PNP) 경로 가능성, 연방 EE 카테고리 목록 포함 여부, 지역 중위 임금 대비 급여, 내 프로필과의 매칭도.',
        ] },
        { h: '누구를 위한 것인가', body: [
          '캐나다의 유학생, PGWP 소지자, 기술이민 준비자: 구직 시 급여만이 아니라 신분으로 이어질 확률로 우선순위를 정하세요.',
        ] },
        { h: '데이터 출처', body: [
          '전부 공개 출처의 자동 수집·정제입니다: Job Bank(10개 주 전 직종, 매일), 주정부 지명 프로그램 웹사이트(OINP/AAIP/SINP/NSNP 목록, 주기적 갱신), IRCC(EE 카테고리 추첨·커트라인), ESDC(중위 임금), 캐나다 통계청(NOC 2021 직업 설명). 목록형 데이터에는 출처 링크와 수집일을 표기합니다.',
        ] },
        { h: '만드는 사람', body: [
          '독립 개발자 프로젝트로 Frank가 혼자 만들고 운영합니다. 질문·제안·데이터 정정: {email}.',
        ] },
      ],
    },
    },
}

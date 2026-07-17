'use client'
// 服务条款(E4-02):含时长包付费与退款口径(D5/用户拍板:7 天内未滥用可退)、数据来源、雇主异议下架机制。
// 文案模板级自拟,不构成法律意见。
import { LegalShell, type LegalDoc } from '../LegalShell'
import { IconClipboard } from '../../Icons'
import type { Lang } from '../../jobs/i18n'

const docs: Record<Lang, LegalDoc> = {
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
}

export default function TermsPage() { return <LegalShell docs={docs} icon={<IconClipboard />} /> }

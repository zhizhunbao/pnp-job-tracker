'use client'
// 关于页(E4-02)。复用法务外壳。
import { LegalShell, type LegalDoc } from '../legal/LegalShell'
import type { Lang } from '../jobs/i18n'

const docs: Record<Lang, LegalDoc> = {
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
}

export default function AboutPage() { return <LegalShell docs={docs} /> }

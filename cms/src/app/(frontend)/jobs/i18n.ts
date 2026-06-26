// 轻量 i18n:中/英/韩。无第三方库 —— 一份按 key 的字典 + 带 {var} 插值的 t()。
// 作用域:/jobs 页 UI 外壳(列名/筛选/按钮/状态/大分类/经验)+ AI 顾问的 UI 壳(advisor.*)。
// AI 顾问正文不在这里:所有字段都由 /api/advisor 大模型按所选语言生成(无三语长文要维护)。
// NOC 中/小分类名(数据派生、海量)暂保持原值。
export type Lang = 'zh' | 'en' | 'ko'
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'zh', label: '中' },
  { code: 'en', label: 'EN' },
  { code: 'ko', label: '한' },
]
export const LANG_KEY = 'jobs.lang'
export const COLS_COOKIE = 'jobsCols'   // 列偏好 cookie 名(放共享非 client 模块,服务端 page.tsx 也能读到真实值)

type Dict = Record<string, string>

const zh: Dict = {
  'subtitle.count': '{n} 个职位',
  'updated': '更新 {t}',
  'tagline': '每日更新 · 全加拿大全职业 · 移民价值视角',
  'foot.disclaimer': '数据自动抓取与评分,仅供参考,不构成移民 / 法律建议。',
  'search.placeholder': '搜索 职位/公司/地点/NOC…',
  'filter.geo': '地理', 'filter.cat': '职业分类', 'filter.src': '来源', 'filter.elig': '移民资格', 'filter.statusexp': '状态/经验', 'filter.status': '状态', 'filter.exp': '经验',
  'all.country': '全部国家', 'all.prov': '全部省', 'all.city': '全部市', 'all.district': '全部区',
  'all.teer': '全部 TEER', 'all.broad': '全部大类', 'all.mid': '全部中类', 'all.fine': '全部小类',
  'all.source': '全部来源', 'all.exp': '全部经验',
  'all.pnp': '全部 PNP', 'all.aip': '全部 AIP', 'all.status': '全部状态', 'all.origin': '全部渠道', 'opt.yes': '是', 'opt.no': '否',
  'filter.num': '薪资/评分', 'filter.salary': '薪资', 'filter.score': '评分', 'filter.more': '更多筛选',
  'all.score': '全部评分', 'sc.high': '高(≥75)', 'sc.mid': '中(50–74)', 'sc.low': '低(<50)',
  'all.sal': '全部年薪', 'sal.ge100': '≥$100K', 'sal.80': '$80–100K', 'sal.60': '$60–80K', 'sal.u60': '<$60K',
  'all.vs': '全部对比中位', 'vs.above': '高于中位', 'vs.above20': '高出 20%+', 'vs.below': '低于中位',
  'directOnly': '仅第一方',
  'directOnly.tip': '只看雇主第一方发布的(公司 ATS / Job Bank 直发),隐藏聚合转贴',
  'clear': '清除筛选',
  'fields': '⚙ 字段 ({n})', 'fields.main': '主要', 'fields.all': '全选', 'fields.invert': '反选', 'fields.resetW': '列宽复位', 'fields.fixed': ' (固定)',
  'th.tip': '点击表头排序', 'resize.tip': '拖动改本列宽 · 双击按内容自适应',
  'empty': '无匹配职位', 'more': '下滑加载更多 · 已显示 {x} / {total}', 'allShown': '已全部显示 {total} 个', 'loadMore': '显示更多({x} / {total})',
  'cell.uncat': '未分类', 'cell.first': '第一方', 'cell.repost': '转贴',
  'cell.pnpYes': '✅ 可省提名', 'cell.pnpSkilled': '技能岗', 'cell.pnpIndemand': '紧缺', 'cell.aipYes': '🏅 指定雇主', 'cell.closed': '已下架', 'cell.open': '在招',
  // 列名
  'col.datePosted': '发布时间', 'col.broad': '大分类', 'col.mid': '中分类', 'col.fine': '小分类', 'col.teer': 'TEER',
  'col.company': '公司', 'col.title': '职位', 'col.noc': 'NOC', 'col.accessibility': '经验级别',
  'col.country': '国家', 'col.province': '省', 'col.city': '市', 'col.district': '区', 'col.address': '地址',
  'col.salary': '薪资', 'col.salaryYr': '年薪(折算)', 'col.wageMedHr': '中位时薪', 'col.wageMedYr': '中位年薪', 'col.vsMedian': 'vs 中位', 'col.source': '来源', 'col.origin': '渠道', 'col.direct': '发布',
  'col.pnp': 'PNP', 'col.aip': 'AIP', 'col.status': '状态', 'col.lastSeen': '更新时间', 'col.closedAt': '下架时间', 'col.score': '评分',
  // 大分类(数据值→显示)
  'broad.管理': '管理', 'broad.商务': '商务', 'broad.科技': '科技', 'broad.医疗': '医疗', 'broad.教育': '教育',
  'broad.文体': '文体', 'broad.服务': '服务', 'broad.技工': '技工', 'broad.资源': '资源', 'broad.制造': '制造',
  // 经验级别
  'acc.co-op': 'co-op', 'acc.junior': '初级', 'acc.intermediate': '中级', 'acc.senior': '高级', 'acc.unknown': '—',
  // 渠道
  'origin.jobbank': 'Job Bank', 'origin.ats': 'ATS', 'origin.directory': '社区名单',
  'advisor.tag': '🧭 AI 顾问', 'advisor.generating': ' · 生成中…',
  'advisor.loading': '⏳ 本地大模型生成中,请稍候…',
  'advisor.failed': '生成失败({code})',
  'advisor.offline': '无法连接本地大模型(Ollama),请确认服务在线。',
  'advisor.footAI': '由本地大模型生成 · 可能有误,仅供参考',
  'advisor.footTpl': '说明由榜单数据自动生成 · 仅供参考,不构成移民/法律建议',
  'advisor.applyLink': '投递页', 'advisor.siteLink': '公司官网',
}

const en: Dict = {
  'subtitle.count': '{n} jobs',
  'updated': 'Updated {t}',
  'tagline': 'Daily updates · all of Canada · immigration-value lens',
  'foot.disclaimer': 'Auto-scraped and scored; for reference only, not immigration / legal advice.',
  'search.placeholder': 'Search title / company / location / NOC…',
  'filter.geo': 'Location', 'filter.cat': 'Occupation', 'filter.src': 'Source', 'filter.elig': 'Eligibility', 'filter.statusexp': 'Status / level', 'filter.status': 'Status', 'filter.exp': 'Level',
  'all.country': 'All countries', 'all.prov': 'All provinces', 'all.city': 'All cities', 'all.district': 'All districts',
  'all.teer': 'All TEER', 'all.broad': 'All major groups', 'all.mid': 'All sub-groups', 'all.fine': 'All occupations',
  'all.source': 'All sources', 'all.exp': 'All levels',
  'all.pnp': 'All PNP', 'all.aip': 'All AIP', 'all.status': 'All status', 'all.origin': 'All channels', 'opt.yes': 'Yes', 'opt.no': 'No',
  'filter.num': 'Pay & score', 'filter.salary': 'Pay', 'filter.score': 'Score', 'filter.more': 'More filters',
  'all.score': 'All scores', 'sc.high': 'High (≥75)', 'sc.mid': 'Mid (50–74)', 'sc.low': 'Low (<50)',
  'all.sal': 'All salaries', 'sal.ge100': '≥$100K', 'sal.80': '$80–100K', 'sal.60': '$60–80K', 'sal.u60': '<$60K',
  'all.vs': 'vs median (all)', 'vs.above': 'Above median', 'vs.above20': '≥ +20%', 'vs.below': 'Below median',
  'directOnly': 'First-party only',
  'directOnly.tip': 'Show only employer-direct postings (company ATS / Job Bank direct); hide aggregated reposts',
  'clear': 'Clear filters',
  'fields': '⚙ Columns ({n})', 'fields.main': 'Main', 'fields.all': 'All', 'fields.invert': 'Invert', 'fields.resetW': 'Reset widths', 'fields.fixed': ' (fixed)',
  'th.tip': 'Click to sort', 'resize.tip': 'Drag to resize · double-click to fit content',
  'empty': 'No matching jobs', 'more': 'Scroll for more · showing {x} / {total}', 'allShown': 'All {total} shown', 'loadMore': 'Load more ({x} / {total})',
  'cell.uncat': 'Uncategorized', 'cell.first': 'Direct', 'cell.repost': 'Repost',
  'cell.pnpYes': '✅ PNP-eligible', 'cell.pnpSkilled': 'Skilled', 'cell.pnpIndemand': 'In-demand', 'cell.aipYes': '🏅 Designated', 'cell.closed': 'Closed', 'cell.open': 'Open',
  'col.datePosted': 'Posted', 'col.broad': 'Major group', 'col.mid': 'Sub-group', 'col.fine': 'Occupation', 'col.teer': 'TEER',
  'col.company': 'Company', 'col.title': 'Title', 'col.noc': 'NOC', 'col.accessibility': 'Level',
  'col.country': 'Country', 'col.province': 'Province', 'col.city': 'City', 'col.district': 'District', 'col.address': 'Address',
  'col.salary': 'Salary', 'col.salaryYr': 'Annual (est.)', 'col.wageMedHr': 'Median $/hr', 'col.wageMedYr': 'Median $/yr', 'col.vsMedian': 'vs median', 'col.source': 'Source', 'col.origin': 'Channel', 'col.direct': 'Posting',
  'col.pnp': 'PNP', 'col.aip': 'AIP', 'col.status': 'Status', 'col.lastSeen': 'Updated', 'col.closedAt': 'Closed', 'col.score': 'Score',
  'broad.管理': 'Management', 'broad.商务': 'Business', 'broad.科技': 'Tech', 'broad.医疗': 'Health', 'broad.教育': 'Education',
  'broad.文体': 'Arts & Sport', 'broad.服务': 'Services', 'broad.技工': 'Trades', 'broad.资源': 'Resources', 'broad.制造': 'Manufacturing',
  'acc.co-op': 'Co-op', 'acc.junior': 'Junior', 'acc.intermediate': 'Intermediate', 'acc.senior': 'Senior', 'acc.unknown': '—',
  'origin.jobbank': 'Job Bank', 'origin.ats': 'ATS', 'origin.directory': 'Directory',
  'advisor.tag': '🧭 AI Advisor', 'advisor.generating': ' · generating…',
  'advisor.loading': '⏳ Generating with local LLM…',
  'advisor.failed': 'Failed ({code})',
  'advisor.offline': 'Cannot reach the local LLM (Ollama). Make sure it is running.',
  'advisor.footAI': 'Generated by a local LLM · may be inaccurate, for reference only',
  'advisor.footTpl': 'Auto-generated from listing data · reference only, not immigration/legal advice',
  'advisor.applyLink': 'Apply', 'advisor.siteLink': 'Website',
}

const ko: Dict = {
  'subtitle.count': '{n}개 공고',
  'updated': '업데이트 {t}',
  'tagline': '매일 갱신 · 캐나다 전역 · 이민 가치 관점',
  'foot.disclaimer': '자동 수집·평가, 참고용이며 이민 / 법률 자문이 아닙니다.',
  'search.placeholder': '직무 / 회사 / 지역 / NOC 검색…',
  'filter.geo': '지역', 'filter.cat': '직업 분류', 'filter.src': '출처', 'filter.elig': '이민 자격', 'filter.statusexp': '상태 / 경력', 'filter.status': '상태', 'filter.exp': '경력',
  'all.country': '전체 국가', 'all.prov': '전체 주', 'all.city': '전체 도시', 'all.district': '전체 지역',
  'all.teer': '전체 TEER', 'all.broad': '전체 대분류', 'all.mid': '전체 중분류', 'all.fine': '전체 소분류',
  'all.source': '전체 출처', 'all.exp': '전체 경력',
  'all.pnp': '전체 PNP', 'all.aip': '전체 AIP', 'all.status': '전체 상태', 'all.origin': '전체 채널', 'opt.yes': '예', 'opt.no': '아니오',
  'filter.num': '급여·점수', 'filter.salary': '급여', 'filter.score': '점수', 'filter.more': '더 보기',
  'all.score': '전체 점수', 'sc.high': '높음(≥75)', 'sc.mid': '중간(50–74)', 'sc.low': '낮음(<50)',
  'all.sal': '전체 연봉', 'sal.ge100': '≥$100K', 'sal.80': '$80–100K', 'sal.60': '$60–80K', 'sal.u60': '<$60K',
  'all.vs': '전체 중위 대비', 'vs.above': '중위 이상', 'vs.above20': '+20% 이상', 'vs.below': '중위 미만',
  'directOnly': '직접 채용만',
  'directOnly.tip': '고용주 직접 게시(회사 ATS / Job Bank 직접)만 표시, 집계 재게시 숨김',
  'clear': '필터 초기화',
  'fields': '⚙ 열 ({n})', 'fields.main': '주요', 'fields.all': '전체', 'fields.invert': '반전', 'fields.resetW': '너비 초기화', 'fields.fixed': ' (고정)',
  'th.tip': '클릭하여 정렬', 'resize.tip': '드래그로 너비 조정 · 더블클릭 시 내용에 맞춤',
  'empty': '일치하는 공고 없음', 'more': '스크롤하여 더 보기 · {x} / {total} 표시', 'allShown': '전체 {total}개 표시', 'loadMore': '더 보기 ({x} / {total})',
  'cell.uncat': '미분류', 'cell.first': '직접', 'cell.repost': '재게시',
  'cell.pnpYes': '✅ PNP 가능', 'cell.pnpSkilled': '기술직', 'cell.pnpIndemand': '부족직종', 'cell.aipYes': '🏅 지정 고용주', 'cell.closed': '마감', 'cell.open': '채용중',
  'col.datePosted': '게시일', 'col.broad': '대분류', 'col.mid': '중분류', 'col.fine': '소분류', 'col.teer': 'TEER',
  'col.company': '회사', 'col.title': '직무', 'col.noc': 'NOC', 'col.accessibility': '경력',
  'col.country': '국가', 'col.province': '주', 'col.city': '도시', 'col.district': '지역', 'col.address': '주소',
  'col.salary': '급여', 'col.salaryYr': '연봉(환산)', 'col.wageMedHr': '중위 시급', 'col.wageMedYr': '중위 연봉', 'col.vsMedian': '중위 대비', 'col.source': '출처', 'col.origin': '채널', 'col.direct': '게시',
  'col.pnp': 'PNP', 'col.aip': 'AIP', 'col.status': '상태', 'col.lastSeen': '갱신일', 'col.closedAt': '마감일', 'col.score': '점수',
  'broad.管理': '관리', 'broad.商务': '비즈니스', 'broad.科技': '기술', 'broad.医疗': '의료', 'broad.教育': '교육',
  'broad.文体': '문화·체육', 'broad.服务': '서비스', 'broad.技工': '기능직', 'broad.资源': '자원', 'broad.制造': '제조',
  'acc.co-op': '인턴십', 'acc.junior': '주니어', 'acc.intermediate': '중급', 'acc.senior': '시니어', 'acc.unknown': '—',
  'origin.jobbank': 'Job Bank', 'origin.ats': 'ATS', 'origin.directory': '커뮤니티 목록',
  'advisor.tag': '🧭 AI 어드바이저', 'advisor.generating': ' · 생성 중…',
  'advisor.loading': '⏳ 로컬 LLM 생성 중…',
  'advisor.failed': '생성 실패 ({code})',
  'advisor.offline': '로컬 LLM(Ollama)에 연결할 수 없습니다. 실행 중인지 확인하세요.',
  'advisor.footAI': '로컬 LLM 생성 · 부정확할 수 있음, 참고용',
  'advisor.footTpl': '목록 데이터 기반 자동 생성 · 참고용, 이민/법률 자문 아님',
  'advisor.applyLink': '지원 페이지', 'advisor.siteLink': '회사 웹사이트',
}

const MESSAGES: Record<Lang, Dict> = { zh, en, ko }

export type TFn = (key: string, vars?: Record<string, string | number>) => string

// 取词:缺失回退 zh,再回退 key 本身;支持 {var} 插值。
export function makeT(lang: Lang): TFn {
  const dict = MESSAGES[lang] || zh
  return (key, vars) => {
    let s = dict[key] ?? zh[key] ?? key
    if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]))
    return s
  }
}

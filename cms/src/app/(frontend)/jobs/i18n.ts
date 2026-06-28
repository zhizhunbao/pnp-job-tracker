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
  'cell.pnpYes': '✅ 可省提名', 'cell.pnpSkilled': '可提名', 'cell.pnpIndemand': '紧缺', 'cell.pnpQc': '魁省', 'cell.aipYes': '🏅 指定雇主', 'cell.closed': '已下架', 'cell.open': '在招',
  'pnplist.title': '省提名职业清单', 'pnplist.source': '来源', 'pnplist.your': '本岗', 'pnplist.gta': '大多区域外', 'pnplist.loading': '加载清单…',
  'pnplist.onList': '✓ 本岗 NOC {noc} 在「{label}」清单内', 'pnplist.generic': '不在具名清单,但 TEER{teer} 技能岗通用粗筛可走',
  'pnplist.excludedHit': '✗ 本岗 NOC {noc} 在排除清单内,该省不可走', 'pnplist.excludedMiss': '不在排除清单 · TEER{teer} 通用可走',
  'pnplist.noList': '该省暂无具名清单 · 仅 TEER0-3 通用粗筛', 'pnplist.qc': '魁省走自己的甄选(CSQ/Arrima),不属省提名', 'pnplist.notEligible': '该职业当前不符合省提名粗筛',
  // 列名
  'col.datePosted': '发布时间', 'col.broad': '大分类', 'col.mid': '中分类', 'col.fine': '小分类', 'col.teer': 'TEER',
  'col.company': '公司', 'col.title': '职位', 'col.noc': 'NOC', 'col.accessibility': '经验级别',
  'col.country': '国家', 'col.province': '省', 'col.city': '市', 'col.district': '区', 'col.address': '地址',
  'col.salary': '薪资', 'col.salaryYr': '年薪(折算)', 'col.wageMedHr': '中位时薪', 'col.wageMedYr': '中位年薪', 'col.vsMedian': 'vs 中位', 'col.source': '来源', 'col.origin': '渠道', 'col.direct': '发布',
  'col.pnp': 'PNP', 'col.ee': 'EE 类别', 'col.aip': 'AIP', 'col.status': '状态', 'col.firstSeen': '首次收录', 'col.lastSeen': '更新时间', 'col.closedAt': '下架时间', 'col.score': '评分',
  'eelist.in': '✓ 本岗 NOC {noc} 在联邦 EE「{cats}」类别清单内', 'eelist.out': '未列入任何联邦 EE 类别抽选清单', 'eelist.source': '来源:Express Entry 类别抽选', 'eelist.your': '本岗', 'eelist.loading': '加载 EE 清单…',
  'col.actions': '操作', 'act.company': '公司信息', 'act.desc': '职位描述', 'act.companyTitle': '公司基本信息', 'act.descTitle': '职位描述', 'act.site': '官网', 'act.addr': '地址', 'act.src': '来源', 'act.jobsHere': '该公司在榜职位', 'act.noText': '未抓到该职位的描述文本', 'act.loadingText': '加载中…',
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
  'advisor.footAI': '由本地大模型生成 · 可能有误,仅供参考', 'advisor.full': '全屏', 'advisor.exitFull': '退出全屏',
  'advisor.chatTitle': '继续追问', 'advisor.chatPlaceholder': '基于上方事实追问这个职位…', 'advisor.chatSend': '发送', 'advisor.chatHint': '仅基于上方事实回答,没抓到的数据会直说',
  'fact.medianSrc': 'ESDC 开放数据 · 同 NOC × 本省', 'fact.vsNote': 'vs 中位 = 本岗年薪 ÷ 当地中位 − 1', 'fact.wageBandHr': '当地时薪(低–中–高)', 'fact.wageBandYr': '当地年薪(低–中–高)',
  'fact.sourceNote': 'Job Bank 聚合 indeed/Talent 等第三方板 → 统一显示为来源;渠道(origin)是发布通道,不代表雇主真假', 'fact.firstParty': '第一方直投', 'fact.repost': '聚合转贴',
  'fact.timeNote': '下架口径:本次抓取未出现 且 发布超 30 天,才标「已下架」',
  'fact.aipNote': 'AIP 仅限大西洋四省(NL/NB/NS/PE);按公司名归一化匹配官方指定雇主名单,无中介', 'fact.aipTech': '科技类',
  'fact.jdExcerpt': '职位描述摘录(抓取正文)',
  'fact.scoreNote': '评分明细与 08_score 一致(满分 100,移民价值视角)', 'score.base': '基准', 'score.indemand': '紧缺大类', 'score.low': '省具名通道', 'score.direct': '第一方雇主', 'score.exp': '经验', 'score.prov': '省份(非 ON)', 'score.total': '合计', 'score.stored': '入库',
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
  'cell.pnpYes': '✅ PNP-eligible', 'cell.pnpSkilled': 'Eligible', 'cell.pnpIndemand': 'In-demand', 'cell.pnpQc': 'Quebec', 'cell.aipYes': '🏅 Designated', 'cell.closed': 'Closed', 'cell.open': 'Open',
  'pnplist.title': 'PNP occupation list', 'pnplist.source': 'Source', 'pnplist.your': 'This job', 'pnplist.gta': 'Outside GTA', 'pnplist.loading': 'Loading list…',
  'pnplist.onList': '✓ This job (NOC {noc}) is on the "{label}" list', 'pnplist.generic': 'Not on a named list, but TEER{teer} skilled — eligible via general screen',
  'pnplist.excludedHit': '✗ This job (NOC {noc}) is on the excluded list — not eligible here', 'pnplist.excludedMiss': 'Not on the excluded list · TEER{teer} eligible',
  'pnplist.noList': 'No named list for this province · TEER0-3 general screen only', 'pnplist.qc': 'Quebec uses its own selection (CSQ/Arrima), not PNP', 'pnplist.notEligible': 'This occupation does not currently pass the PNP screen',
  'col.datePosted': 'Posted', 'col.broad': 'Major group', 'col.mid': 'Sub-group', 'col.fine': 'Occupation', 'col.teer': 'TEER',
  'col.company': 'Company', 'col.title': 'Title', 'col.noc': 'NOC', 'col.accessibility': 'Level',
  'col.country': 'Country', 'col.province': 'Province', 'col.city': 'City', 'col.district': 'District', 'col.address': 'Address',
  'col.salary': 'Salary', 'col.salaryYr': 'Annual (est.)', 'col.wageMedHr': 'Median $/hr', 'col.wageMedYr': 'Median $/yr', 'col.vsMedian': 'vs median', 'col.source': 'Source', 'col.origin': 'Channel', 'col.direct': 'Posting',
  'col.pnp': 'PNP', 'col.ee': 'EE category', 'col.aip': 'AIP', 'col.status': 'Status', 'col.firstSeen': 'First seen', 'col.lastSeen': 'Updated', 'col.closedAt': 'Closed', 'col.score': 'Score',
  'eelist.in': '✓ This job (NOC {noc}) is in the federal EE "{cats}" category', 'eelist.out': 'Not in any federal Express Entry category', 'eelist.source': 'Source: Express Entry category-based selection', 'eelist.your': 'This job', 'eelist.loading': 'Loading EE list…',
  'col.actions': 'Actions', 'act.company': 'Company', 'act.desc': 'Description', 'act.companyTitle': 'Company info', 'act.descTitle': 'Job description', 'act.site': 'Website', 'act.addr': 'Address', 'act.src': 'Source', 'act.jobsHere': 'Listings by this company', 'act.noText': 'No scraped description for this job', 'act.loadingText': 'Loading…',
  'broad.管理': 'Management', 'broad.商务': 'Business', 'broad.科技': 'Tech', 'broad.医疗': 'Health', 'broad.教育': 'Education',
  'broad.文体': 'Arts & Sport', 'broad.服务': 'Services', 'broad.技工': 'Trades', 'broad.资源': 'Resources', 'broad.制造': 'Manufacturing',
  'acc.co-op': 'Co-op', 'acc.junior': 'Junior', 'acc.intermediate': 'Intermediate', 'acc.senior': 'Senior', 'acc.unknown': '—',
  'origin.jobbank': 'Job Bank', 'origin.ats': 'ATS', 'origin.directory': 'Directory',
  'advisor.tag': '🧭 AI Advisor', 'advisor.generating': ' · generating…',
  'advisor.loading': '⏳ Generating with local LLM…',
  'advisor.failed': 'Failed ({code})',
  'advisor.offline': 'Cannot reach the local LLM (Ollama). Make sure it is running.',
  'advisor.footAI': 'Generated by a local LLM · may be inaccurate, for reference only', 'advisor.full': 'Fullscreen', 'advisor.exitFull': 'Exit fullscreen',
  'advisor.chatTitle': 'Ask a follow-up', 'advisor.chatPlaceholder': 'Ask about this job, grounded in the facts above…', 'advisor.chatSend': 'Send', 'advisor.chatHint': 'Answers are grounded only in the facts above; missing data is stated plainly',
  'fact.medianSrc': 'ESDC open data · same NOC × this province', 'fact.vsNote': 'vs median = job annual ÷ local median − 1', 'fact.wageBandHr': 'Local $/hr (low–med–high)', 'fact.wageBandYr': 'Local $/yr (low–med–high)',
  'fact.sourceNote': 'Job Bank aggregates indeed/Talent etc. → shown as one source; channel (origin) is the posting pipe, not employer authenticity', 'fact.firstParty': 'First-party', 'fact.repost': 'Aggregated repost',
  'fact.timeNote': 'Closed only when absent from the latest crawl AND posted >30 days ago',
  'fact.aipNote': 'AIP covers the four Atlantic provinces only (NL/NB/NS/PE); matched by normalized employer name against the official designated list', 'fact.aipTech': 'Tech',
  'fact.jdExcerpt': 'Posting excerpt (scraped)',
  'fact.scoreNote': 'Breakdown matches 08_score (out of 100, immigration-value lens)', 'score.base': 'Baseline', 'score.indemand': 'In-demand group', 'score.low': 'Named PNP stream', 'score.direct': 'First-party employer', 'score.exp': 'Experience', 'score.prov': 'Province (non-ON)', 'score.total': 'Total', 'score.stored': 'stored',
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
  'cell.pnpYes': '✅ PNP 가능', 'cell.pnpSkilled': '지명 가능', 'cell.pnpIndemand': '부족직종', 'cell.pnpQc': '퀘벡', 'cell.aipYes': '🏅 지정 고용주', 'cell.closed': '마감', 'cell.open': '채용중',
  'pnplist.title': 'PNP 직업 목록', 'pnplist.source': '출처', 'pnplist.your': '이 채용', 'pnplist.gta': 'GTA 외', 'pnplist.loading': '목록 불러오는 중…',
  'pnplist.onList': '✓ 이 채용(NOC {noc})이 「{label}」 목록에 있음', 'pnplist.generic': '지정 목록엔 없지만 TEER{teer} 기술직 — 일반 심사로 가능',
  'pnplist.excludedHit': '✗ 이 채용(NOC {noc})이 제외 목록에 있음 — 해당 주 불가', 'pnplist.excludedMiss': '제외 목록에 없음 · TEER{teer} 가능',
  'pnplist.noList': '해당 주 지정 목록 없음 · TEER0-3 일반 심사만', 'pnplist.qc': '퀘벡은 자체 선발(CSQ/Arrima), PNP 아님', 'pnplist.notEligible': '현재 PNP 심사 기준 미충족',
  'col.datePosted': '게시일', 'col.broad': '대분류', 'col.mid': '중분류', 'col.fine': '소분류', 'col.teer': 'TEER',
  'col.company': '회사', 'col.title': '직무', 'col.noc': 'NOC', 'col.accessibility': '경력',
  'col.country': '국가', 'col.province': '주', 'col.city': '도시', 'col.district': '지역', 'col.address': '주소',
  'col.salary': '급여', 'col.salaryYr': '연봉(환산)', 'col.wageMedHr': '중위 시급', 'col.wageMedYr': '중위 연봉', 'col.vsMedian': '중위 대비', 'col.source': '출처', 'col.origin': '채널', 'col.direct': '게시',
  'col.pnp': 'PNP', 'col.ee': 'EE 카테고리', 'col.aip': 'AIP', 'col.status': '상태', 'col.firstSeen': '최초 수집', 'col.lastSeen': '갱신일', 'col.closedAt': '마감일', 'col.score': '점수',
  'eelist.in': '✓ 이 채용(NOC {noc})이 연방 EE 「{cats}」 카테고리에 있음', 'eelist.out': '연방 Express Entry 카테고리에 없음', 'eelist.source': '출처: Express Entry 카테고리 선발', 'eelist.your': '이 채용', 'eelist.loading': 'EE 목록 불러오는 중…',
  'col.actions': '작업', 'act.company': '회사 정보', 'act.desc': '직무 설명', 'act.companyTitle': '회사 기본 정보', 'act.descTitle': '직무 설명', 'act.site': '웹사이트', 'act.addr': '주소', 'act.src': '출처', 'act.jobsHere': '이 회사의 공고', 'act.noText': '수집된 직무 설명이 없습니다', 'act.loadingText': '로딩 중…',
  'broad.管理': '관리', 'broad.商务': '비즈니스', 'broad.科技': '기술', 'broad.医疗': '의료', 'broad.教育': '교육',
  'broad.文体': '문화·체육', 'broad.服务': '서비스', 'broad.技工': '기능직', 'broad.资源': '자원', 'broad.制造': '제조',
  'acc.co-op': '인턴십', 'acc.junior': '주니어', 'acc.intermediate': '중급', 'acc.senior': '시니어', 'acc.unknown': '—',
  'origin.jobbank': 'Job Bank', 'origin.ats': 'ATS', 'origin.directory': '커뮤니티 목록',
  'advisor.tag': '🧭 AI 어드바이저', 'advisor.generating': ' · 생성 중…',
  'advisor.loading': '⏳ 로컬 LLM 생성 중…',
  'advisor.failed': '생성 실패 ({code})',
  'advisor.offline': '로컬 LLM(Ollama)에 연결할 수 없습니다. 실행 중인지 확인하세요.',
  'advisor.footAI': '로컬 LLM 생성 · 부정확할 수 있음, 참고용', 'advisor.full': '전체화면', 'advisor.exitFull': '전체화면 종료',
  'advisor.chatTitle': '추가 질문', 'advisor.chatPlaceholder': '위 사실을 바탕으로 이 채용에 대해 질문…', 'advisor.chatSend': '전송', 'advisor.chatHint': '위 사실에만 근거해 답변하며, 없는 데이터는 그대로 말합니다',
  'fact.medianSrc': 'ESDC 공개 데이터 · 동일 NOC × 해당 주', 'fact.vsNote': '중위 대비 = 직무 연봉 ÷ 현지 중위 − 1', 'fact.wageBandHr': '현지 시급(저–중–고)', 'fact.wageBandYr': '현지 연봉(저–중–고)',
  'fact.sourceNote': 'Job Bank가 indeed/Talent 등 제3자 보드를 집계 → 단일 출처로 표시; 채널(origin)은 게시 경로이며 고용주 진위와 무관', 'fact.firstParty': '직접 게시', 'fact.repost': '집계 재게시',
  'fact.timeNote': '최신 수집에 없고 게시 30일 초과일 때만 「마감」 처리',
  'fact.aipNote': 'AIP는 대서양 4개 주(NL/NB/NS/PE)만 해당; 정규화된 고용주명으로 공식 지정 명단과 매칭', 'fact.aipTech': '기술',
  'fact.jdExcerpt': '공고 발췌(수집 본문)',
  'fact.scoreNote': '08_score와 동일(100점 만점, 이민 가치 관점)', 'score.base': '기준', 'score.indemand': '부족 대분류', 'score.low': '주 지정 채널', 'score.direct': '직접 고용주', 'score.exp': '경력', 'score.prov': '주(ON 외)', 'score.total': '합계', 'score.stored': '저장값',
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

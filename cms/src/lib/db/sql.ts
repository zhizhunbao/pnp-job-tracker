// 全站 SQL 语句。**只有 SQL,没有业务逻辑** —— 想找某条查询到底查了什么,只来这一个文件。
//
// 与 ./database.ts 的分工:
//   · database.ts 管「怎么执行」(拿连接、跑语句、开事务、通用批量插入),不认识任何一张表;
//   · 本文件管「执行什么」,不碰连接、不做映射、不判业务。
//
// 两种形态:
//   · 大写常量 = 固定语句(值一律走 $1/$2 占位符,别用字符串拼值 —— 那是注入)
//   · 小写函数 = 语句模板,拼的只能是**结构**(列清单、WHERE 片段、ORDER BY),值仍走占位符
//
// 列名是 Payload 的 snake_case(老坑 5):改 collection 字段要同步这里。
//
// 分段:1) 片段  2) 职位列表/分页/匹配  3) 职位单条与相关  4) 公司  5) 职业(NOC)
//       6) 站级数字与提醒  7) 答题事实数

/* ══════════════════════════════════════════════════════════════════════════
   1) 片段 —— 多条语句共用的列清单与条件,单独命名以免各处再抄一遍
   ══════════════════════════════════════════════════════════════════════════ */

export const JOB_COLUMNS = `j.id, j.title, c.name AS company_name, c.slug AS company_slug, c.address AS company_address, c.description AS company_description, c.sectors AS company_sectors,
  c.website AS company_website, c.website_source,
  c.lmia_positions, c.lmia_lmias, c.lmia_last_quarter, c.lmia_streams, c.lmia_positions_skilled, c.sponsor_grade,
  j.noc, j.category, j.teer, j.broad, j.mid, j.fine, j.accessibility, j.score, j.grade_channel, j.pnp_eligible, j.pnp_stream, j.ee_category, j.aip, j.pilot, j.pilot_community, j.pilot_employer, j.pilot_occ,
  j.employment_term, j.employment_hours, j.certificates, j.education, j.eligibility_flag, j.eligibility_quote,
  j.country, j.province, j.city, j.district, j.address, j.region,
  j.apply_url, j.official_url, j.salary, j.salary_annual, j.salary_text,
  j.wage_med_hourly, j.wage_med_annual, j.wage_low_hourly, j.wage_low_annual, j.wage_high_hourly, j.wage_high_annual, j.wage_year,
  j.source, j.source_label, j.origin, j.date_posted, j.first_seen, j.last_seen, j.status, j.closed_at`

export const JOB_FROM = `FROM jobs j LEFT JOIN companies c ON c.id = j.company_id`

/** 相似/相关职位用的瘦列清单 */
export const REL_COLS = `j.id, j.title, c.name AS company_name, j.city, j.province, j.salary, j.salary_text`

/** 去重:同一岗多渠道重复发布时只留一条 */
export const DEDUPE_COND = `coalesce(j.is_dup, false) = false`

/* ══════════════════════════════════════════════════════════════════════════
   2) 职位 —— 列表 / 分页 / 匹配
   ══════════════════════════════════════════════════════════════════════════ */

/** 首屏最近 N 行(SSR 秒开用) */
export const JOB_ROWS_LATEST = `SELECT ${JOB_COLUMNS} ${JOB_FROM}
     ORDER BY j.date_posted DESC NULLS LAST, j.first_seen DESC NULLS LAST, j.id DESC LIMIT $1`

/** 分页列表。where/cond/order 都是**结构**片段(buildJobsWhere / orderByClause 产出),值仍在 params 里 */
export const jobsPage = (where: string, dedupe: string, order: string, limitPh: string, offsetPh: string) =>
  `SELECT ${JOB_COLUMNS} ${JOB_FROM} WHERE ${where} AND ${dedupe} ${order} LIMIT ${limitPh} OFFSET ${offsetPh}`

export const jobsPageCount = (where: string, dedupe: string) =>
  `SELECT count(*)::int n ${JOB_FROM} WHERE ${where} AND ${dedupe}`

/** 「与我的匹配」候选池:命中省提名 / EE 类别 / 档案职业码(含 4 位、3 位前缀)的岗 */
export const MATCH_PAGE = `SELECT ${JOB_COLUMNS} ${JOB_FROM}
       WHERE (COALESCE(j.pnp_eligible,false) OR COALESCE(j.ee_category,'') <> '' OR j.noc = ANY($1) OR LEFT(j.noc,4) = ANY($2) OR LEFT(j.noc,3) = ANY($3))
       ORDER BY j.date_posted DESC NULLS LAST, j.first_seen DESC NULLS LAST, j.id DESC LIMIT $4`

/** 排序子句:列与方向都来自白名单(SORT_COLUMNS),不是用户原样字符串 */
export const orderBy = (col: string, dir: string, tiebreak: string) =>
  `ORDER BY ${col} ${dir} NULLS LAST, ${tiebreak}`

/** 关键词命中公司名 → 转成 company_id 子查询(跨表 OR 谓词会让 planner 只能全表扫) */
export const companyIdInByName = (placeholder: string) =>
  `j.company_id IN (SELECT id FROM companies WHERE name ILIKE ${placeholder})`

export const COMPANY_IDS_BY_NAME = `SELECT id FROM companies WHERE name ILIKE $1`

/* ══════════════════════════════════════════════════════════════════════════
   3) 职位 —— 单条与相关职位
   ══════════════════════════════════════════════════════════════════════════ */

export const JOB_BY_ID = `SELECT ${JOB_COLUMNS} ${JOB_FROM} WHERE j.id = $1 LIMIT 1`

export const JOB_ADDRESS_BY_ID = `SELECT address FROM jobs WHERE id = $1 LIMIT 1`

export const RELATED_SAME_COMPANY = `SELECT ${REL_COLS} ${JOB_FROM}
       WHERE c.name = $1 AND j.id <> $2 AND COALESCE(j.status,'open') <> 'closed'
       ORDER BY j.date_posted DESC NULLS LAST, j.first_seen DESC NULLS LAST, j.id DESC LIMIT 3`

export const RELATED_SAME_OCC = `SELECT ${REL_COLS} ${JOB_FROM}
       WHERE j.province = $1 AND LEFT(j.noc, 4) = LEFT($2, 4) AND j.id <> $3
         AND COALESCE(c.name,'') <> $4 AND COALESCE(j.status,'open') <> 'closed'
       ORDER BY j.date_posted DESC NULLS LAST, j.first_seen DESC NULLS LAST, j.id DESC LIMIT 3`

/**
 * 相关职位都落空时的兜底探测:一次问清「本省在 fine/mid/broad 各级还有没有在招岗」,
 * 每级一个 EXISTS 列($1=省,$2 起依次是各级的分类值)。
 * 列名是级别名(白名单 fine|mid|broad),不是用户输入;分类值仍走占位符。
 */
export const levelHasJobs = (levels: readonly string[]) =>
  `SELECT ${levels.map((lv, i) => `EXISTS(SELECT 1 FROM jobs WHERE province = $1 AND ${lv} = $${i + 2} AND COALESCE(status,'open') <> 'closed') AS ${lv}_has`).join(', ')}`

/* ══════════════════════════════════════════════════════════════════════════
   4) 公司
   ══════════════════════════════════════════════════════════════════════════ */

/** cond 二选一:按 slug,或按「这条岗属于哪家公司」的子查询(见 COMPANY_BY_JOB_ID_COND) */
export const companyDetail = (cond: string) =>
  `SELECT c.id, c.name, c.slug, c.website, c.website_source, c.industry, c.sectors, c.alias_zh, c.alias_ko, c.wiki_url,
            c.sponsor_grade, c.score_detail, c.ai_brief, c.ai_website, c.ai_sources, c.ai_fetched, c.description, c.address, c.region,
            c.lmia_positions, c.lmia_lmias, c.lmia_last_quarter, c.lmia_streams, c.lmia_positions_skilled
     FROM companies c WHERE ${cond} LIMIT 1`

export const COMPANY_BY_JOB_ID_COND = `c.id = (SELECT company_id FROM jobs WHERE id = $1 LIMIT 1)`

export const COMPANY_OPEN_JOBS = `SELECT j.id, j.title, j.city, j.province, j.grade_channel, j.noc, j.teer, j.date_posted, j.salary, j.salary_text,
            nd.title AS noc_title, nd.title_zh AS noc_title_zh, nd.title_ko AS noc_title_ko
     FROM jobs j LEFT JOIN noc_descriptions nd ON nd.noc = j.noc
     WHERE j.company_id = $1 AND COALESCE(j.status,'open') <> 'closed'
     ORDER BY j.date_posted DESC NULLS LAST, j.first_seen DESC NULLS LAST, j.id DESC LIMIT 50`

export const COMPANY_OPEN_COUNT = `SELECT count(*)::int n FROM jobs WHERE company_id = $1 AND COALESCE(status,'open') <> 'closed'`

export const COMPANY_LMIA_NOCS = `SELECT lmia_nocs FROM companies WHERE id = $1`

/** 同区同行业、按担保档与在招量排的相似雇主 */
export const SIMILAR_EMPLOYERS = `SELECT c.slug, c.name, c.industry, c.sponsor_grade, count(j.id)::int open_count
     FROM companies c JOIN jobs j ON j.company_id = c.id AND COALESCE(j.status,'open') <> 'closed'
     WHERE c.region = $1 AND c.industry = $2 AND c.slug <> $3 AND c.slug IS NOT NULL AND c.slug <> ''
     GROUP BY c.id, c.slug, c.name, c.industry, c.sponsor_grade
     ORDER BY c.sponsor_grade DESC NULLS LAST, count(j.id) DESC LIMIT 6`

/* ══════════════════════════════════════════════════════════════════════════
   5) 职业(NOC)
   ══════════════════════════════════════════════════════════════════════════ */

export const NOC_TITLES_BY_CODES = `SELECT noc, title, title_zh, title_ko FROM noc_descriptions WHERE noc = ANY($1)`

export const NOC_TITLE_ONE = `SELECT COALESCE(title,'') title, COALESCE(title_zh,'') title_zh, COALESCE(title_zh_short,'') title_zh_short,
              COALESCE(title_ko_short,'') title_ko_short, COALESCE(title_en_short,'') title_en_short
       FROM noc_descriptions WHERE noc = $1 LIMIT 1`

/** 该职业有多少家「能走省提名」的雇主(命中具名通道,或在无清单省且泛可提名) */
export const NOC_EMPLOYER_COUNT = `SELECT count(DISTINCT j.company_id)::int n FROM jobs j
       WHERE COALESCE(j.status,'open') <> 'closed' AND j.noc = $1 AND j.company_id IS NOT NULL
         AND ((j.pnp_stream IS NOT NULL AND j.pnp_stream <> '')
              OR (j.province = ANY($2::text[]) AND COALESCE(j.pnp_eligible, false)))`

export const NOC_OPEN_COUNTS = `SELECT j.noc, count(*)::int n, count(*) FILTER (WHERE j.pnp_eligible)::int eligible
     FROM jobs j WHERE j.status = 'open' AND j.noc = ANY($1) GROUP BY j.noc`

export const BROAD_NOCS = `SELECT noc, title, title_zh, title_zh_short, title_ko_short, title_en_short, broad,
            open::int open, eligible::int eligible, median_salary
       FROM noc_openings ORDER BY open DESC, noc LIMIT $1`

/** medianCol:要中位薪资时传那一列的表达式,不要时传空串(省一次昂贵的 percentile_cont) */
export const searchNocByTitle = (medianCol: string) =>
  `SELECT j.noc, COALESCE(d.title, '') title, COALESCE(d.title_zh, '') title_zh, COALESCE(d.title_zh_short, '') title_zh_short,
            COALESCE(d.title_ko_short, '') title_ko_short, COALESCE(d.title_en_short, '') title_en_short,
            COALESCE(mode() WITHIN GROUP (ORDER BY j.broad), '') broad,
            count(*)::int open, count(*) FILTER (WHERE j.pnp_eligible)::int eligible
            ${medianCol}
     FROM jobs j JOIN noc_descriptions d ON d.noc = j.noc
     WHERE j.status = 'open' AND j.noc <> ''
     GROUP BY j.noc, d.title, d.title_zh, d.title_zh_short, d.title_ko_short, d.title_en_short
     ORDER BY count(*) DESC LIMIT $1`

/** 搜不到时按大类兜底出一批 */
export const NOC_SEARCH_FALLBACK = `SELECT j.noc, COALESCE(d.title, '') title, COALESCE(d.title_zh, '') title_zh, COALESCE(d.title_zh_short, '') title_zh_short,
            COALESCE(d.title_ko_short, '') title_ko_short, COALESCE(d.title_en_short, '') title_en_short,
            $1::text broad, count(*)::int open, count(*) FILTER (WHERE j.pnp_eligible)::int eligible
     FROM jobs j JOIN noc_descriptions d ON d.noc = j.noc
     WHERE j.status = 'open' AND j.noc <> '' AND j.broad = $1
     GROUP BY j.noc, d.title, d.title_zh, d.title_zh_short, d.title_ko_short, d.title_en_short
     ORDER BY count(*) DESC LIMIT $2`

/** 职业名模糊搜(中英同查),短名优先 */
export const NOC_BY_TITLE_LIKE = `SELECT d.noc, COALESCE(d.title,'') title, COALESCE(d.title_zh,'') title_zh, COALESCE(d.title_zh_short,'') title_zh_short,
            COALESCE(d.title_ko_short,'') title_ko_short, COALESCE(d.title_en_short,'') title_en_short
     FROM noc_descriptions d
     WHERE d.title ILIKE $1 OR d.title_zh ILIKE $1
     ORDER BY length(COALESCE(d.title,'')) LIMIT 8`

/* ══════════════════════════════════════════════════════════════════════════
   6) 站级数字 —— 总量 / 证明数 / 新鲜度 / 邮件提醒
   ══════════════════════════════════════════════════════════════════════════ */

/** cond = 统计口径的 WHERE 片段(在架/去重等) */
export const totalAndProof = (cond: string) =>
  `SELECT count(*) FILTER (WHERE ${cond})::int AS n,
    count(*) FILTER (WHERE status = 'open' AND pnp_stream IS NOT NULL AND pnp_stream <> '')::int AS named,
    (SELECT count(*)::int FROM companies WHERE lmia_positions > 0) AS lmia
    FROM jobs j`

/** ETL 心跳:每轮 seed 成功都写一笔,回答「刚核对过官方来源」(≠ 数据变过) */
export const ETL_HEARTBEAT = `SELECT last_seed FROM etl_heartbeat WHERE id = 1`

/** 心跳表没落地时的兜底新鲜度 */
export const JOBS_MAX_LAST_SEEN = `SELECT max(last_seen) AS upd FROM jobs`

/** 邮件提醒命中:上次发信之后新出现的岗 */
export const alertHits = (where: string) =>
  `SELECT j.id, j.title, j.city, j.province, j.salary_text, c.name AS company_name
     ${JOB_FROM}
     WHERE j.status = 'open' AND j.first_seen > $1 AND ${where}
     ORDER BY j.grade_channel DESC NULLS LAST, j.date_posted DESC NULLS LAST LIMIT 20`

/* ══════════════════════════════════════════════════════════════════════════
   7) 答题三问的事实数(某职业:在架量 / 可提名量 / 具名通道 / 中位薪资 / 省分布)
   ══════════════════════════════════════════════════════════════════════════ */

export const QUIZ_FACTS_TOTALS = `SELECT count(*)::int open,
              count(*) FILTER (WHERE j.pnp_eligible)::int eligible,
              count(*) FILTER (WHERE j.pnp_stream IS NOT NULL AND j.pnp_stream <> '')::int named,
              max(j.teer) teer,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY j.salary_annual) med
       FROM jobs j WHERE j.status = 'open' AND j.noc = $1`

export const QUIZ_FACTS_BY_PROV = `SELECT j.province, count(*)::int n, count(*) FILTER (WHERE j.pnp_eligible)::int eligible
       FROM jobs j WHERE j.status = 'open' AND j.noc = $1 AND j.province <> ''
       GROUP BY j.province ORDER BY count(*) DESC`

export const QUIZ_FACTS_STREAMS = `SELECT j.pnp_stream stream, count(*)::int n
       FROM jobs j WHERE j.status = 'open' AND j.noc = $1 AND j.pnp_stream IS NOT NULL AND j.pnp_stream <> ''
       GROUP BY j.pnp_stream ORDER BY count(*) DESC LIMIT 4`

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

/* ══════════════════════════════════════════════════════════════════════════
   8) 统计 / 难度 / 职业报告
   ══════════════════════════════════════════════════════════════════════════ */

// ── reportFacts.ts ──

export const occStatsOne = (a1: string, a2: string) => `SELECT ${a1} ${a2} WHERE s.noc = $1`

export const occStatsKin = (a1: string, a2: string) => `SELECT ${a1}, CASE WHEN left(s.noc,4) = left($1,4) THEN 1 ELSE 2 END AS kin
         ${a2}
         WHERE s.province = 'all' AND s.noc <> $1 AND left(s.noc,3) = left($1,3)
         ORDER BY kin, s.open_jobs DESC NULLS LAST LIMIT 8`

export const OCC_EMPLOYER_COUNTS = `SELECT count(DISTINCT j.company_id)::int n,
                count(DISTINCT j.company_id) FILTER (WHERE COALESCE(co.lmia_positions, 0) > 0)::int lmia_n
         FROM jobs j JOIN companies co ON co.id = j.company_id
         WHERE COALESCE(j.status,'open') <> 'closed' AND j.noc = $1
           AND ((j.pnp_stream IS NOT NULL AND j.pnp_stream <> '')
                OR (j.province = ANY($2::text[]) AND COALESCE(j.pnp_eligible, false)))`

export const occTopEmployers = (a1: string | number) => `SELECT co.name, co.slug, co.is_designated_employer aip, co.lmia_positions, co.lmia_last_quarter,
                count(*) FILTER (WHERE j.pnp_stream IS NOT NULL AND j.pnp_stream <> '')::int named,
                count(*) FILTER (WHERE COALESCE(j.pnp_eligible, false))::int eligible,
                (array_agg(j.province ORDER BY j.date_posted DESC NULLS LAST))[1] province,
                (array_agg(j.city      ORDER BY j.date_posted DESC NULLS LAST))[1] city,
                max(j.date_posted)::text last_posted
         FROM jobs j JOIN companies co ON co.id = j.company_id
         WHERE COALESCE(j.status,'open') <> 'closed' AND j.noc = $1
           AND ((j.pnp_stream IS NOT NULL AND j.pnp_stream <> '')
                OR (j.province = ANY($2::text[]) AND COALESCE(j.pnp_eligible, false)))
         GROUP BY co.id, co.name, co.slug, co.is_designated_employer, co.lmia_positions, co.lmia_last_quarter
         ORDER BY named DESC, eligible DESC,
                  (COALESCE(co.lmia_positions, 0) > 0) DESC,
                  max(j.date_posted) DESC NULLS LAST
         LIMIT ${a1}`

export const PROV_OPEN_BY_PROV = `SELECT province, count(*)::int open,
              count(*) FILTER (WHERE pnp_stream IS NOT NULL AND pnp_stream <> '')::int named,
              count(*) FILTER (WHERE apprentice_friendly)::int apprentice
       FROM jobs WHERE COALESCE(status,'open') <> 'closed' AND noc = $1 AND COALESCE(province,'') <> ''
       GROUP BY province`

export const PNP_DRAWS_SCORED = `SELECT province, draw_date, stream, score, scale, invitations FROM pnp_draws
       WHERE score IS NOT NULL AND COALESCE(draw_date,'') <> '' AND province <> 'FED'
       ORDER BY draw_date DESC LIMIT 120`

export const PNP_SCORE_FACTORS = `SELECT province, system, factor, kind, seq, label, points, xor_prev, rule,
              factor_max, factor_group, group_max, pass_mark, max_total, guide_effective, url, fetched
       FROM pnp_score_factors ORDER BY province, factor, seq`

export const NOC_TITLE_TEER = `SELECT COALESCE(s.title_en, d.title, '') title, s.teer
       FROM noc_descriptions d LEFT JOIN stats_occupation s ON s.noc = d.noc AND s.province = 'all'
       WHERE d.noc = $1 LIMIT 1`

export const PNP_REQUIREMENTS = `SELECT province, program, stream, subject, factor, op, value, value_text, unit,
              applies_teer, applies_noc, excludes_noc, applies_area,
              to_jsonb(q) ->> 'applies_condition' AS applies_condition,
              applies_family_size, basis, label, section, effective, url, page_url, fetched
       FROM pnp_requirements q ORDER BY province, seq`

export const OCC_MEDIAN_BY_PROV = `SELECT province, median_wage_annual FROM stats_occupation WHERE noc = $1 AND province <> 'all'`

export const PROV_DIFFICULTY = `SELECT province, difficulty FROM stats
       WHERE broad = 'all' AND (mid = 'all' OR mid IS NULL) AND difficulty IS NOT NULL`

// ── occCompetition.ts ──

export const OCC_COMPETITION_BY_PROV = `SELECT j.province AS province, COUNT(*)::int AS open_jobs,
              COALESCE(SUM(s.new30d), 0)::int AS new30d,
              ROUND(AVG(s.avg_days_open)::numeric, 1) AS avg_days_open
         FROM jobs j
         LEFT JOIN stats_occupation s ON s.noc = j.noc AND s.province = j.province
        WHERE COALESCE(j.status, 'open') <> 'closed' AND COALESCE(j.is_dup, false) = false AND j.noc = ANY($1) AND COALESCE(j.province, '') <> ''
        GROUP BY j.province
        ORDER BY open_jobs DESC`


export const PROV_OPEN_COUNT = `SELECT province, COUNT(*)::int AS n FROM jobs
        WHERE COALESCE(status, 'open') <> 'closed' AND COALESCE(is_dup, false) = false AND COALESCE(aip, false) = true AND noc = ANY($1) AND province <> ''
        GROUP BY province`

export const PROV_OPEN_COUNT_NOC4 = `SELECT province, COUNT(*)::int AS n FROM jobs
        WHERE COALESCE(status, 'open') <> 'closed' AND COALESCE(is_dup, false) = false AND COALESCE(pilot, '') LIKE '%RCIP%' AND noc = ANY($1) AND province <> ''
        GROUP BY province`

export const PROV_OPEN_COUNT_BROAD = `SELECT province, COUNT(*)::int AS n FROM jobs
        WHERE COALESCE(status, 'open') <> 'closed' AND COALESCE(is_dup, false) = false AND COALESCE(pilot, '') LIKE '%FCIP%' AND noc = ANY($1) AND province <> ''
        GROUP BY province`

// ── scoreTables.ts ──

export const PROV_DIFFICULTY_FETCHED = `SELECT province, difficulty, fetched FROM stats
        WHERE broad = 'all' AND (mid = 'all' OR mid IS NULL) AND difficulty IS NOT NULL`

// ── 补:单引号写的两条 ──
/** 职业统计的 FROM(韩文名的家在 noc_descriptions,故 LEFT JOIN) */
export const OCC_STATS_FROM = `FROM stats_occupation s LEFT JOIN noc_descriptions d ON d.noc = s.noc`

export const PROVINCES_INFO = `SELECT code, info FROM provinces`

/* ══════════════════════════════════════════════════════════════════════════
   9) 雇主 —— 官方名录 / 在招 / 担保
   ══════════════════════════════════════════════════════════════════════════ */

// ── directory.ts ──

export const dirWhere = (a1: string) => `WHERE ${a1}`

export const dirCountDesignated = (a1: string) => `SELECT COUNT(*)::int AS n FROM designated_employers ${a1}`

export const dirPageDesignated = (a1: string, a2: string | number, a3: string | number) => `SELECT name, province, location, is_tech FROM designated_employers ${a1}
     ORDER BY name ASC LIMIT ${a2} OFFSET ${a3}`

export const dirWhereCo = (a1: string) => `WHERE ${a1}`

export const dirCountCompanies = (a1: string) => `SELECT COUNT(*)::int AS n FROM companies ${a1}`

export const dirPageCompanies = (a1: string, a2: string | number, a3: string | number) => `SELECT name, region, website, lmia_positions, lmia_positions_skilled, lmia_streams, lmia_last_quarter, industry, alias_zh, alias_ko, wiki_url, sponsor_grade FROM companies ${a1}
     ORDER BY COALESCE(lmia_positions_skilled, 0) DESC, lmia_positions DESC, name ASC LIMIT ${a2} OFFSET ${a3}`

export const PNP_OCCUPATIONS_ALL = `SELECT province, stream, label, type, noc, name, url, fetched FROM pnp_occupations ORDER BY province ASC, stream ASC, noc ASC`

// ── designatedEmployers.ts ──

export const DESIGNATED_ALL = `SELECT name, province, location, source, nocs, url, fetched
       FROM designated_employers
      ORDER BY location ASC, name ASC`

export const HIRING_EMPLOYERS = `SELECT c.name AS name, j.province AS province,
            MIN(COALESCE(j.city, '')) AS location, COUNT(*)::int AS n
       FROM jobs j JOIN companies c ON c.id = j.company_id
      WHERE j.status = 'open' AND j.province = $1 AND j.noc = $2 AND COALESCE(c.name, '') <> ''
      GROUP BY c.name, j.province
      ORDER BY n DESC, c.name ASC
      LIMIT 300`

export const NOC_TITLES_FOR_EMPLOYERS = `SELECT s.noc AS noc, COALESCE(s.title_en, '') AS en,
            COALESCE(s.title_zh_short, s.title_zh, '') AS zh, COALESCE(d.title_ko, '') AS ko
       FROM stats_occupation s LEFT JOIN noc_descriptions d ON d.noc = s.noc
      WHERE s.province = 'all' AND s.noc = ANY($1)`

// ── sponsorEmployers.ts ──

export const COMPANIES_HAS_COLUMNS = `SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' AND column_name = ANY($1)`

export const PNP_REQ_EMPLOYER = `SELECT province, factor, op, value, unit, applies_area FROM pnp_requirements WHERE subject = 'employer'`

export const sponsorEmployers = (a1: string, a2: string) => `
    SELECT c.name, c.slug, c.industry, c.alias_zh, c.alias_ko, c.sponsor_grade,
      c.lmia_positions, c.lmia_positions_skilled, c.lmia_last_quarter, c.lmia_streams,
      c.lmia_positions_4q, c.lmia_positions_2q, c.lmia_positions_1q${a1},
      COUNT(*)::int AS open_jobs,
      COUNT(*) FILTER (WHERE j.aip)::int AS open_jobs_aip,
      COALESCE(ARRAY_AGG(DISTINCT j.province) FILTER (WHERE j.aip AND COALESCE(j.province, '') <> ''), '{}') AS provs_aip,
      BOOL_OR(j.aip) AS aip,
      BOOL_OR(COALESCE(j.pnp_stream, '') <> '') AS named,
      COALESCE(ARRAY_AGG(DISTINCT j.pnp_stream) FILTER (WHERE COALESCE(j.pnp_stream, '') <> ''), '{}') AS streams,
      COALESCE(ARRAY_AGG(DISTINCT j.noc) FILTER (WHERE COALESCE(j.noc, '') <> ''), '{}') AS nocs,
      COALESCE(ARRAY_AGG(DISTINCT j.province) FILTER (WHERE COALESCE(j.province, '') <> ''), '{}') AS provs,
      COALESCE(ARRAY_AGG(DISTINCT j.city) FILTER (WHERE COALESCE(j.city, '') <> ''), '{}') AS cities,
      COALESCE((ARRAY_AGG(j.city ORDER BY j.id) FILTER (WHERE COALESCE(j.city, '') <> ''))[1], '') AS city
    FROM jobs j JOIN companies c ON c.id = j.company_id
    WHERE COALESCE(j.status, 'open') <> 'closed'
    GROUP BY c.id, c.name, c.slug, c.industry, c.alias_zh, c.alias_ko, c.sponsor_grade,
      c.lmia_positions, c.lmia_positions_skilled, c.lmia_last_quarter, c.lmia_streams,
      c.lmia_positions_4q, c.lmia_positions_2q, c.lmia_positions_1q${a2}
    HAVING BOOL_OR(j.aip) OR BOOL_OR(COALESCE(j.pnp_stream, '') <> '') OR COALESCE(c.lmia_positions, 0) > 0
    ORDER BY open_jobs DESC, c.name ASC`

// ── verdictCache.ts ──

export const DESIGNATED_BY_PROV = `SELECT name, province, location, is_tech, source, nocs, url, fetched
       FROM designated_employers WHERE province = $1`

// ── employerCompare.ts ──

export const COMPANIES_FOR_COMPARE = `SELECT id, name, industry, alias_zh, alias_ko, wiki_url, website, ai_brief, ai_website,
            lmia_positions, lmia_positions_skilled, lmia_last_quarter
       FROM companies WHERE lower(name) = ANY($1)`

export const COMPANY_JOBS_FOR_COMPARE = `SELECT noc, province, pnp_eligible, pnp_stream, ee_category, salary_annual, wage_med_annual, score, aip
         FROM jobs WHERE company_id = $1 AND status != 'closed' LIMIT 400`

export const PROV_DIFFICULTY_ANY = `SELECT province, difficulty FROM stats WHERE broad = 'all' AND (mid = 'all' OR mid IS NULL) AND province = ANY($1) AND difficulty IS NOT NULL`

/* ══════════════════════════════════════════════════════════════════════════
   10) 试点(RCIP/FCIP)名额
   ══════════════════════════════════════════════════════════════════════════ */

// ── pilotQuota.ts ──

export const PILOT_QUOTA_COMMUNITIES = `SELECT community, province, type, first_come, first_come_quote, first_come_url,
            per_intake, per_intake_quote, per_intake_url,
            remaining, remaining_quote, remaining_url, as_of
       FROM pilot_quota
      WHERE COALESCE(noc, '') = ''`

export const pilotQuotaCommunities = (a1: string) => `SELECT community, province, type, first_come, first_come_quote, first_come_url,
              per_intake, per_intake_quote, per_intake_url,
              remaining, remaining_quote, remaining_url, as_of
         FROM pilot_quota WHERE COALESCE(noc, '') = ''${a1} ORDER BY community`

export const pilotQuotaOccupations = (a1: string) => `SELECT community, province, type, noc, status, quote, url, as_of
         FROM pilot_quota WHERE COALESCE(noc, '') <> ''${a1} ORDER BY community, noc`

/* ══════════════════════════════════════════════════════════════════════════
   11) 抽选 / 时间线 / 榜单
   ══════════════════════════════════════════════════════════════════════════ */

// ── timeline.ts ──

export const PNP_DRAWS_ALL = `SELECT province, kind, draw_date, stream, score, scale, invitations, note, label, url FROM pnp_draws`

export const EE_CATEGORIES_LATEST = `SELECT DISTINCT ON (category) category, label, draw_crs, draw_date, draw_size, url FROM ee_categories
                WHERE draw_date IS NOT NULL AND draw_date <> '' ORDER BY category`

export const NEWS_RECENT = `SELECT region, title, date, slug, importance, url FROM news ORDER BY date DESC LIMIT 90`

// ── rankings.ts ──

export const RANKING_SLUGS_ALL = `SELECT DISTINCT slug FROM rankings`

export const RANKING_ROWS = `SELECT slug, rank, kind, external_id, title, company, company_slug, city, province, noc, teer, score,
            salary_text, salary_annual, pnp_stream, ee_category, date_posted, apply_url, official_url,
            open_jobs, named_jobs, avg_score, lmia_positions, lmia_quarter
     FROM rankings WHERE slug = $1 ORDER BY rank ASC`

/* ══════════════════════════════════════════════════════════════════════════
   12) 判定与案例
   ══════════════════════════════════════════════════════════════════════════ */

// ── tripleWire.ts ──

export const TRIPLE_WIRE_JOB = `SELECT j.id, j.title, j.noc, j.teer, j.province, j.city, j.pnp_eligible, j.pnp_stream,
            j.ee_category, j.aip, j.employment_term, j.employment_hours, j.company_id,
            c.name AS company_name, nd.title AS noc_title,
            nd.title_zh AS noc_title_zh, nd.title_ko AS noc_title_ko
       FROM jobs j
       LEFT JOIN companies c ON c.id = j.company_id
       LEFT JOIN noc_descriptions nd ON nd.noc = j.noc
      WHERE j.id = $1 LIMIT 1`

export const COMPANY_REGISTRY_FACTS = `SELECT founded_year, registry_status, staff_est, staff_est_src, sector FROM companies WHERE id = $1`

export const COMPANY_LMIA_NOCS_2 = `SELECT lmia_nocs FROM companies WHERE id = $1`

// ── caseFacts.ts ──

export const CASE_PROV_COUNTS = `SELECT province, count(*)::int n, count(*) FILTER (WHERE apprentice_friendly)::int t
     FROM jobs WHERE noc = $1 AND status <> 'closed'
     GROUP BY province`

export const PNP_OPS_STATS = `SELECT DISTINCT ON (province, metric) province, metric, value, period, as_of, url
     FROM pnp_ops_stats
     WHERE metric IN ('allocation','nominations_ytd','refusals_ytd','laa_ytd','applications_received_ytd','eoi_pool_total')
       AND (scope IS NULL OR scope = '' OR scope = 'Skilled Worker')
     ORDER BY province, metric, COALESCE(as_of, period) DESC`

/* ══════════════════════════════════════════════════════════════════════════
   13) 公司调研 / JD 正文
   ══════════════════════════════════════════════════════════════════════════ */

// ── companyResearch.ts ──

export const COMPANY_INSERT_LAZY = `INSERT INTO companies (name, source, updated_at, created_at) VALUES ($1, 'ai-lazy', now(), now()) RETURNING id`

// ── jobDescription.ts ──



// ── jdLazyFetch.ts ──

// ── 补:单引号写的五条 ──
export const COMPANY_AI_BRIEF = `SELECT id, ai_brief, ai_website, ai_sources, ai_fetched FROM companies WHERE lower(name) = lower($1) LIMIT 1`

/** 别名/维基只在原值为空时补,不覆盖已有(COALESCE 挡住) */
export const COMPANY_UPDATE_ALIASES = `UPDATE companies SET alias_zh = COALESCE(alias_zh, $1), alias_ko = COALESCE(alias_ko, $2), wiki_url = COALESCE(wiki_url, $3) WHERE id = $4`

export const COMPANY_UPDATE_AI_BRIEF = `UPDATE companies SET ai_brief = $1, ai_website = $2, ai_sources = $3, ai_fetched = now() WHERE id = $4`

export const JD_BY_APPLY_URL = `SELECT description FROM jobs WHERE apply_url = $1 AND description IS NOT NULL LIMIT 1`

/** 懒抓到的正文回写:只填空,不覆盖已有(WHERE description IS NULL) */
export const JD_UPDATE_BY_APPLY_URL = `UPDATE jobs SET description = $1 WHERE apply_url = $2 AND description IS NULL`

/* ══════════════════════════════════════════════════════════════════════════
   14) 统计页(/stats)
   ══════════════════════════════════════════════════════════════════════════ */

// ── app/(frontend)/stats/lib.ts ──

export const statsByMid = (a1: string) => `SELECT province, broad, mid, open_jobs, new7d, median_wage_annual, median_salary_annual,
              named_jobs, stream_labels, aip_jobs, top_cities, fetched, difficulty
       FROM stats ${a1} ORDER BY open_jobs DESC NULLS LAST`

export const statsByBroad = (a1: string) => `SELECT province, broad, open_jobs, new7d, median_wage_annual, median_salary_annual,
              named_jobs, stream_labels, aip_jobs, top_cities, fetched
       FROM stats ${a1} ORDER BY open_jobs DESC NULLS LAST`


export const STATS_OCC_HAS_COLUMNS = `SELECT column_name FROM information_schema.columns WHERE table_name = 'stats_occupation' AND column_name = ANY($1)`

export const statsOccupations = (a1: string, a2: string) => `SELECT ${a1}${a2}
       FROM stats_occupation s LEFT JOIN noc_descriptions d ON d.noc = s.noc
       ORDER BY s.open_jobs DESC NULLS LAST`

export const CITY_STATS = `SELECT s.city, s.province, c.name_zh, c.name_ko, s.open_jobs, s.new7d, s.median_wage_annual, s.median_salary_annual, s.salary_n, s.named_jobs
       FROM stats_city s LEFT JOIN cities c ON c.name = s.city AND c.province = s.province
       ORDER BY s.open_jobs DESC NULLS LAST LIMIT $1`

export const PNP_NOCS_DISTINCT = `SELECT DISTINCT noc FROM pnp_occupations WHERE noc <> '' AND COALESCE(program,'PNP') = 'PNP'`

export const EE_NOCS_DISTINCT = `SELECT DISTINCT noc FROM ee_categories WHERE noc <> ''`

/* ══════════════════════════════════════════════════════════════════════════
   15) 城市 / 社区页
   ══════════════════════════════════════════════════════════════════════════ */

// ── app/api/city/route.ts ──

export const cityTotals = (a1: string) => `SELECT COUNT(*)::int AS open_jobs,
              COUNT(*) FILTER (WHERE j.date_posted >= NOW() - INTERVAL '7 day')::int AS new7d,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY j.salary_annual) AS med_salary
       FROM jobs j WHERE j.city = $1 AND j.province = $2 AND ${a1}`

export const cityByBroad = (a1: string) => `SELECT j.broad, COUNT(*)::int AS n FROM jobs j
       WHERE j.city = $1 AND j.province = $2 AND ${a1} AND j.broad IS NOT NULL AND j.broad <> '未分类'
       GROUP BY j.broad ORDER BY n DESC LIMIT 3`

export const CITY_DLI = `SELECT name, is_public FROM dli WHERE city = $1 AND province = $2 ORDER BY is_public DESC NULLS LAST, name LIMIT 4`

export const CITY_DESIGNATED_COUNT = `SELECT COUNT(*)::int AS n FROM designated_employers WHERE province = $2 AND location ILIKE '%' || $1 || '%'`

export const districtTotals = (a1: string) => `SELECT COUNT(*)::int AS open_jobs,
                COUNT(*) FILTER (WHERE j.date_posted >= NOW() - INTERVAL '7 day')::int AS new7d,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY j.salary_annual) AS med_salary
         FROM jobs j WHERE j.district = $3 AND j.city = $1 AND j.province = $2 AND ${a1}`

export const CITY_DLI_COUNT = `SELECT COUNT(*)::int AS n FROM dli WHERE city = $1 AND province = $2`

export const districtByBroad = (a1: string) => `SELECT j.broad, COUNT(*)::int AS n FROM jobs j
         WHERE j.district = $3 AND j.city = $1 AND j.province = $2 AND ${a1} AND j.broad IS NOT NULL AND j.broad <> '未分类'
         GROUP BY j.broad ORDER BY n DESC LIMIT 3`

export const districtEmployers = (a1: string) => `SELECT c.name, c.slug, COUNT(*)::int AS n FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
         WHERE j.district = $3 AND j.city = $1 AND j.province = $2 AND ${a1} AND c.name IS NOT NULL
         GROUP BY c.name, c.slug ORDER BY n DESC, c.name LIMIT 4`

/* ══════════════════════════════════════════════════════════════════════════
   16) 邮件提醒
   ══════════════════════════════════════════════════════════════════════════ */

// ── app/api/alerts/run/route.ts ──

export const ALERT_JOBS = `SELECT j.id, j.title, j.city, j.province, j.salary_text, j.noc, j.teer, j.pnp_eligible, j.pnp_stream,
              j.ee_category, j.salary_annual, j.wage_med_annual, j.score, c.name AS company_name
       FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
       WHERE j.status = 'open' AND j.first_seen > $1 ORDER BY j.score DESC NULLS LAST LIMIT 2000`

export const alertOccStats = (a1: string) => `SELECT count(*)::int n, count(*) FILTER (WHERE j.pnp_eligible)::int elig,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY j.salary_annual) med
         FROM jobs j WHERE j.status = 'open' AND j.date_posted >= $1 AND j.noc = ANY($2)${a1}`

export const alertSampleJobs = (a1: string) => `SELECT j.title, COALESCE(c.name,'') company, COALESCE(j.salary_text,'') sal
         FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
         WHERE j.status = 'open' AND j.date_posted >= $1 AND j.noc = ANY($2)${a1}
         ORDER BY j.salary_annual DESC NULLS LAST LIMIT 3`

export const ALERT_NOC_TITLE = `SELECT COALESCE(title_zh, '') zh, COALESCE(title, '') en FROM noc_descriptions WHERE noc = ANY($1) LIMIT 2`

export const ALERT_JOBS_BY_IDS = `SELECT id, status, province, broad FROM jobs WHERE id = ANY($1::int[])`

export const alertNewCount = (a1: string) => `SELECT count(*)::int AS n FROM jobs WHERE status = 'open' AND date_posted >= $1 AND (${a1})`

/* ══════════════════════════════════════════════════════════════════════════
   17) 职业竞争度(API)
   ══════════════════════════════════════════════════════════════════════════ */

// ── app/api/occ-competition/route.ts ──

export const OCC_COMP_BY_PROV = `SELECT province, open_jobs, new30d, avg_days_open
         FROM stats_occupation
        WHERE noc = $1 AND province <> 'all' AND COALESCE(open_jobs, 0) > 0
        ORDER BY open_jobs DESC`


export const OCC_AIP_BY_PROV = `SELECT province, COUNT(*)::int AS n FROM jobs
        WHERE status = 'open' AND COALESCE(aip, false) = true AND noc = $1 AND province <> ''
        GROUP BY province`

export const OCC_RCIP_BY_PROV = `SELECT province, COUNT(*)::int AS n FROM jobs
        WHERE status = 'open' AND COALESCE(pilot, '') LIKE '%RCIP%' AND noc = $1 AND province <> ''
        GROUP BY province`

export const OCC_FCIP_BY_PROV = `SELECT province, COUNT(*)::int AS n FROM jobs
        WHERE status = 'open' AND COALESCE(pilot, '') LIKE '%FCIP%' AND noc = $1 AND province <> ''
        GROUP BY province`

/* ══════════════════════════════════════════════════════════════════════════
   18) JD 整理回写
   ══════════════════════════════════════════════════════════════════════════ */

// ── app/api/jdformat/route.ts ──
export const JD_SET_FORMATTED = `UPDATE jobs SET jd_formatted = $1, jd_formatted_at = now() WHERE id = $2`

/** 只在原值为空时补雇佣形态,不覆盖已解析出的值 */
export const JD_SET_EMP_TERM = `UPDATE jobs SET employment_term = $1 WHERE id = $2 AND (employment_term IS NULL OR employment_term = '')`

export const JD_SET_EMP_HOURS = `UPDATE jobs SET employment_hours = $1 WHERE id = $2 AND (employment_hours IS NULL OR employment_hours = '')`

export const JD_STATE_BY_URL = `SELECT id, employment_term, employment_hours, jd_formatted FROM jobs WHERE apply_url = $1 LIMIT 1`


// ── app/api/jdformat/route.ts ──

/* ══════════════════════════════════════════════════════════════════════════
   19) 新闻与评论
   ══════════════════════════════════════════════════════════════════════════ */

// ── app/(frontend)/news/page.tsx ──

export const NEWS_LIST = `SELECT region, title, date, slug, og_image AS "ogImage", excerpt,
                   importance, importance_note AS "importanceNote"
            FROM news ORDER BY date DESC, id ASC LIMIT 60`

export const NEWS_LIST_REGION = `SELECT region, title, date, slug, og_image AS "ogImage", excerpt,
                   importance, importance_note AS "importanceNote", summary_zh AS "summaryZh", summary_ko AS "summaryKo"
            FROM news WHERE importance IS NOT NULL ORDER BY importance DESC, date DESC LIMIT 5`

export const NEWS_COMMENT_COUNTS = `SELECT news_slug AS slug, count(*)::int AS n FROM comments WHERE status = 'approved' GROUP BY news_slug`

// ── app/(frontend)/news/[slug]/page.tsx ──

export const newsBySlug = (a1: string) => `SELECT region, title, date, slug, url, og_image AS "ogImage", body_en AS "bodyEn", body_zh AS "bodyZh", body_ko AS "bodyKo",
            summary_zh AS "summaryZh", summary_ko AS "summaryKo", ${a1} AS "summaryEn",
            importance, importance_note AS "importanceNote", citation, fetched, '' AS excerpt
     FROM news WHERE slug = $1 LIMIT 1`

export const NEWS_COMMENTS_THREADED = `SELECT c.id, c.parent_id AS "parentId", COALESCE(c.pinned,false) AS pinned,
                   (u.role = 'admin') AS official, c.author_name AS "authorName", c.body,
                   to_char(c.created_at, 'YYYY-MM-DD') AS date
            FROM comments c LEFT JOIN users u ON u.id = c.user_id
            WHERE c.news_slug = $1 AND c.status = 'approved' ORDER BY c.created_at ASC LIMIT 200`

export const NEWS_COMMENTS_FLAT = `SELECT c.id, NULL AS "parentId", false AS pinned, (u.role = 'admin') AS official,
                     c.author_name AS "authorName", c.body, to_char(c.created_at, 'YYYY-MM-DD') AS date
              FROM comments c LEFT JOIN users u ON u.id = c.user_id
              WHERE c.news_slug = $1 AND c.status = 'approved' ORDER BY c.created_at ASC LIMIT 200`

// ── app/(frontend)/jobs/page.tsx ──

export const NEWS_SLIM_60 = `SELECT region, title, date, slug FROM news ORDER BY date DESC, id ASC LIMIT 60`

/* ══════════════════════════════════════════════════════════════════════════
   20) 站点地图(分片)
   ══════════════════════════════════════════════════════════════════════════ */

// ── app/(frontend)/jobs/sitemap.ts ──

export const jobsSitemapCount = (a1: string) => `SELECT count(*)::int AS n FROM jobs WHERE ${a1}`

export const jobsSitemapPage = (a1: string) => `SELECT id, last_seen FROM jobs WHERE ${a1}
       ORDER BY id ASC LIMIT $1 OFFSET $2`

// ── app/(frontend)/companies/sitemap.ts ──

export const CO_SITEMAP_FROM = `FROM companies c JOIN jobs j ON j.company_id = c.id
   WHERE COALESCE(j.status,'open') <> 'closed' AND c.slug IS NOT NULL AND c.slug <> ''`

export const coSitemapCount = (a1: string) => `SELECT count(DISTINCT c.id)::int AS n ${a1}`

export const coSitemapPage = (a1: string) => `SELECT c.slug, max(j.last_seen) AS last_seen ${a1}
       GROUP BY c.id, c.slug
       ORDER BY c.id ASC LIMIT $1 OFFSET $2`

/* ══════════════════════════════════════════════════════════════════════════
   21) 漏斗看板(/funnel)
   ══════════════════════════════════════════════════════════════════════════ */

// ── app/(frontend)/funnel/page.tsx ──

export const FUNNEL_EVENTS = `SELECT event, prop,
              COALESCE(sum(n) FILTER (WHERE day > CURRENT_DATE - 30), 0)::int d30,
              COALESCE(sum(n) FILTER (WHERE day > CURRENT_DATE - 7),  0)::int d7,
              COALESCE(sum(n) FILTER (WHERE day = CURRENT_DATE - 1),  0)::int d1
       FROM funnel_events GROUP BY event, prop`

export const FUNNEL_USERS = `SELECT count(pro_until)::int pro,
                   count(*) FILTER (WHERE stripe_sessions IS NOT NULL AND stripe_sessions::text NOT IN ('[]','null','""'))::int stripe
            FROM users`

/* ══════════════════════════════════════════════════════════════════════════
   22) 详情页 SSR / OG 图 / 初评表
   ══════════════════════════════════════════════════════════════════════════ */

// ── app/(frontend)/jobs/[id]/page.tsx ──

export const JD_BY_JOB_ID = `SELECT description FROM jobs WHERE id = $1 LIMIT 1`

export const JOB_META_BY_ID = `SELECT j.title, c.name AS company, j.city, j.province, j.salary_text, j.status FROM jobs j
     LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`

// ── app/(frontend)/jobs/[id]/opengraph-image.tsx ──

export const JOB_OG_BY_ID = `SELECT j.title, c.name AS company, j.city, j.province, j.salary_text, j.salary, j.pnp_eligible, j.teer FROM jobs j
       LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`

// ── app/(frontend)/plan/pr/page.tsx ──

export const PR_PLAN_JOBS = `SELECT j.id, j.title, j.noc, j.teer, COALESCE(j.pnp_stream,'') AS pnp_stream,
                COALESCE(c.name,'') AS company, COALESCE(j.city,'') AS city, COALESCE(j.province,'') AS province
         FROM jobs j LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`

// ── app/(frontend)/start/page.tsx ──

export const NOC_ALL_TITLES = `SELECT noc, title, COALESCE(title_zh, '') AS title_zh FROM noc_descriptions ORDER BY title`

export const PNP_DRAWS_RECENT = `SELECT * FROM pnp_draws
      WHERE (score IS NOT NULL OR invitations IS NOT NULL) AND COALESCE(draw_date,'') <> ''
      ORDER BY draw_date DESC LIMIT 400`

export const NEWS_RECENT_80 = `SELECT * FROM news ORDER BY date DESC, id DESC LIMIT 80`

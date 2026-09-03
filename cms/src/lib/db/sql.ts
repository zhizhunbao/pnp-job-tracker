/**
 * 全站 SQL 语句。**只有 SQL,没有业务逻辑** —— 想找某条查询到底查了什么,只来这一个文件。
 *
 * 与本域其余文件的分工:
 *   · types/functions/server 管「怎么执行」(形状、词汇表、取池),不认识任何一张表;
 *   · 本文件管「执行什么」,不碰连接、不做映射、不判业务。
 *
 * 两种形态:
 *   · 大写常量 = 固定语句(值一律走 $1/$2 占位符,别用字符串拼值 —— 那是注入)
 *   · 小写函数 = 语句模板,拼的只能是**结构**(列清单、WHERE 片段、ORDER BY),值仍走占位符
 *
 * 列名是 Payload 的 snake_case(老坑 5):改 collection 字段要同步这里。
 *
 * 分段:1. 片段  2. 职位列表/分页/匹配  3. 职位单条与相关  4. 公司  5. 职业(NOC)
 *       6. 站级数字与提醒  7. 答题事实数  8. 统计/难度/职业报告  9. 雇主
 *
 * @author Frank
 * @time 2026-08-17 19:25:36
 */

import type { SqlCompaniesUpsertIn, SqlInsertRowsIn, SqlJobsUpsertIn, SqlNewsUpsertIn } from './types'

// =========================================================================
// 1. 片段 —— 多条语句共用的列清单与条件,单独命名以免各处再抄一遍
// =========================================================================

/**
 * 职位板的全列清单(含公司 join 出来的列)。列表/详情/匹配共用,加列只改这一处。
 */
export const JOB_COLUMNS = `j.id, j.title, c.name AS company_name, c.slug AS company_slug, c.address AS company_address, c.description AS company_description, c.sectors AS company_sectors,
  c.website AS company_website, c.website_source,
  c.lmia_positions, c.lmia_lmias, c.lmia_last_quarter, c.lmia_streams, c.lmia_positions_skilled, c.sponsor_grade,
  j.noc, j.category, j.teer, j.broad, j.mid, j.fine, j.accessibility, j.score, j.grade_channel, j.pnp_eligible, j.pnp_stream, j.ee_category, j.aip, j.pilot, j.pilot_community, j.pilot_employer, j.pilot_occ,
  j.employment_term, j.employment_hours, j.certificates, j.education, j.eligibility_flag, j.eligibility_quote,
  j.country, j.province, j.city, j.district, j.address, j.region,
  j.apply_url, j.official_url, j.salary, j.salary_annual, j.salary_text,
  j.wage_med_hourly, j.wage_med_annual, j.wage_low_hourly, j.wage_low_annual, j.wage_high_hourly, j.wage_high_annual, j.wage_year,
  j.source, j.source_label, j.origin, j.date_posted, j.first_seen, j.last_seen, j.status, j.closed_at`

/**
 * 职位板的 FROM/JOIN 骨架:jobs 左连 companies。
 */
export const JOB_FROM = `FROM jobs j LEFT JOIN companies c ON c.id = j.company_id`

/**
 * 相似/相关职位用的瘦列清单
 */
const REL_COLS = `j.id, j.title, c.name AS company_name, j.city, j.province, j.salary, j.salary_text`

/**
 * 去重:同一岗多渠道重复发布时只留一条
 */
export const DEDUPE_COND = `coalesce(j.is_dup, false) = false`

// =========================================================================
// 2. 职位 —— 列表 / 分页 / 匹配
// =========================================================================

/**
 * 首屏最近 N 行(SSR 秒开用)
 */
export const JOB_ROWS_LATEST = `SELECT ${JOB_COLUMNS} ${JOB_FROM}
     ORDER BY j.date_posted DESC NULLS LAST, j.first_seen DESC NULLS LAST, j.id DESC LIMIT $1`

/**
 * 分页列表。where/cond/order 都是**结构**片段(buildJobsWhere / orderByClause 产出),值仍在 params 里
 *
 * @param where 筛选条件片段。
 * @param dedupe 去重口径片段(DEDUPE_COND 或恒真)。
 * @param order ORDER BY 子句。
 * @param limitPh LIMIT 的占位符($n)。
 * @param offsetPh OFFSET 的占位符($n)。
 * @returns 分页 SELECT 语句。
 */
export const jobsPage = (where: string, dedupe: string, order: string, limitPh: string, offsetPh: string) =>
  `SELECT ${JOB_COLUMNS} ${JOB_FROM} WHERE ${where} AND ${dedupe} ${order} LIMIT ${limitPh} OFFSET ${offsetPh}`

/**
 * 分页列表的总数,与 jobsPage 同一份 where/dedupe 口径 —— 两处分开改就会「页数对不上行数」。
 *
 * @param where 筛选条件片段(与 jobsPage 同一份)。
 * @param dedupe 去重口径片段(同上)。
 * @returns 计数 SELECT 语句。
 */
export const jobsPageCount = (where: string, dedupe: string) =>
  `SELECT count(*)::int n ${JOB_FROM} WHERE ${where} AND ${dedupe}`

/**
 * 「与我的匹配」候选池:命中省提名 / EE 类别 / 档案职业码(含 4 位、3 位前缀)的岗
 */
export const MATCH_PAGE = `SELECT ${JOB_COLUMNS} ${JOB_FROM}
       WHERE (COALESCE(j.pnp_eligible,false) OR COALESCE(j.ee_category,'') <> '' OR j.noc = ANY($1) OR LEFT(j.noc,4) = ANY($2) OR LEFT(j.noc,3) = ANY($3))
       ORDER BY j.date_posted DESC NULLS LAST, j.first_seen DESC NULLS LAST, j.id DESC LIMIT $4`

/**
 * 排序子句:列与方向都来自白名单(SORT_COLUMNS),不是用户原样字符串
 *
 * @param col 排序列(白名单值)。
 * @param dir 方向 ASC/DESC(白名单值)。
 * @param tiebreak 同值时的决胜列。
 * @returns ORDER BY 子句。
 */
export const orderBy = (col: string, dir: string, tiebreak: string) =>
  `ORDER BY ${col} ${dir} NULLS LAST, ${tiebreak}`

/**
 * 关键词命中公司名 → 转成 company_id 子查询(跨表 OR 谓词会让 planner 只能全表扫)
 *
 * @param placeholder ILIKE 词的占位符($n)。
 * @returns company_id IN 子查询片段。
 */
export const companyIdInByName = (placeholder: string) =>
  `j.company_id IN (SELECT id FROM companies WHERE name ILIKE ${placeholder})`

/**
 * 按公司名模糊拿 id。$1=ILIKE 词。
 */
export const COMPANY_IDS_BY_NAME = `SELECT id FROM companies WHERE name ILIKE $1`

// =========================================================================
// 3. 职位 —— 单条与相关职位
// =========================================================================

/**
 * 职位详情单条。$1=职位 id。
 */
export const JOB_BY_ID = `SELECT ${JOB_COLUMNS} ${JOB_FROM} WHERE j.id = $1 LIMIT 1`

/**
 * 只取地址一列(地图小卡用,别拖全列)。$1=职位 id。
 */
export const JOB_ADDRESS_BY_ID = `SELECT address FROM jobs WHERE id = $1 LIMIT 1`

/**
 * 相关职位·同公司在招 3 条。$1=公司名,$2=排除的当前岗 id。
 */
export const RELATED_SAME_COMPANY = `SELECT ${REL_COLS} ${JOB_FROM}
       WHERE c.name = $1 AND j.id <> $2 AND COALESCE(j.status,'open') <> 'closed'
       ORDER BY j.date_posted DESC NULLS LAST, j.first_seen DESC NULLS LAST, j.id DESC LIMIT 3`

/**
 * 相关职位·同省同 4 位职业前缀 3 条(排除同公司)。$1=省,$2=NOC,$3=当前岗 id,$4=排除公司名。
 */
export const RELATED_SAME_OCC = `SELECT ${REL_COLS} ${JOB_FROM}
       WHERE j.province = $1 AND LEFT(j.noc, 4) = LEFT($2, 4) AND j.id <> $3
         AND COALESCE(c.name,'') <> $4 AND COALESCE(j.status,'open') <> 'closed'
       ORDER BY j.date_posted DESC NULLS LAST, j.first_seen DESC NULLS LAST, j.id DESC LIMIT 3`

/**
 * 相关职位都落空时的兜底探测:一次问清「本省在 fine/mid/broad 各级还有没有在招岗」,
 * 每级一个 EXISTS 列($1=省,$2 起依次是各级的分类值)。
 * 列名是级别名(白名单 fine|mid|broad),不是用户输入;分类值仍走占位符。
 *
 * @param levels 要探测的级别名清单(白名单值,决定列名与占位符个数)。
 * @returns 逐级 EXISTS 的 SELECT 语句。
 */
export const levelHasJobs = (levels: readonly string[]) =>
  `SELECT ${levels.map((lv, i) => `EXISTS(SELECT 1 FROM jobs WHERE province = $1 AND ${lv} = $${i + 2} AND COALESCE(status,'open') <> 'closed') AS ${lv}_has`).join(', ')}`

// =========================================================================
// 4. 公司
// =========================================================================

/**
 * cond 二选一:按 slug,或按「这条岗属于哪家公司」的子查询(见 COMPANY_BY_JOB_ID_COND)
 *
 * @param cond WHERE 条件片段(两种口径二选一)。
 * @returns 公司详情 SELECT 语句。
 */
export const companyDetail = (cond: string) =>
  `SELECT c.id, c.name, c.slug, c.website, c.website_source, c.industry, c.sectors, c.alias_zh, c.alias_ko, c.wiki_url,
            c.sponsor_grade, c.score_detail, c.ai_brief, c.ai_website, c.ai_sources, c.ai_fetched, c.description, c.address, c.region,
            c.lmia_positions, c.lmia_lmias, c.lmia_last_quarter, c.lmia_streams, c.lmia_positions_skilled
     FROM companies c WHERE ${cond} LIMIT 1`

/**
 * companyDetail 的条件片段:由职位 id 反查所属公司。$1=职位 id。
 */
export const COMPANY_BY_JOB_ID_COND = `c.id = (SELECT company_id FROM jobs WHERE id = $1 LIMIT 1)`

/**
 * 公司详情页的在招岗清单(带 NOC 三语名),最多 50 条。$1=公司 id。
 */
export const COMPANY_OPEN_JOBS = `SELECT j.id, j.title, j.city, j.province, j.grade_channel, j.noc, j.teer, j.date_posted, j.salary, j.salary_text,
            nd.title AS noc_title, nd.title_zh AS noc_title_zh, nd.title_ko AS noc_title_ko
     FROM jobs j LEFT JOIN noc_descriptions nd ON nd.noc = j.noc
     WHERE j.company_id = $1 AND COALESCE(j.status,'open') <> 'closed'
     ORDER BY j.date_posted DESC NULLS LAST, j.first_seen DESC NULLS LAST, j.id DESC LIMIT 50`

/**
 * 公司在招岗总数。$1=公司 id。
 */
export const COMPANY_OPEN_COUNT = `SELECT count(*)::int n FROM jobs WHERE company_id = $1 AND COALESCE(status,'open') <> 'closed'`

/**
 * 公司的 LMIA 职业码 json 列(text 取出,消费端自己 parse)。$1=公司 id。
 */
export const COMPANY_LMIA_NOCS = `SELECT lmia_nocs::text FROM companies WHERE id = $1`

/**
 * 同区同行业、按担保档与在招量排的相似雇主
 */
export const SIMILAR_EMPLOYERS = `SELECT c.slug, c.name, c.industry, c.sponsor_grade, count(j.id)::int open_count
     FROM companies c JOIN jobs j ON j.company_id = c.id AND COALESCE(j.status,'open') <> 'closed'
     WHERE c.region = $1 AND c.industry = $2 AND c.slug <> $3 AND c.slug IS NOT NULL AND c.slug <> ''
     GROUP BY c.id, c.slug, c.name, c.industry, c.sponsor_grade
     ORDER BY c.sponsor_grade DESC NULLS LAST, count(j.id) DESC LIMIT 6`

// =========================================================================
// 5. 职业(NOC)
// =========================================================================

/**
 * 一批职业码的三语名。$1=码数组。
 */
export const NOC_TITLES_BY_CODES = `SELECT noc, title, title_zh, title_ko FROM noc_descriptions WHERE noc = ANY($1)`

/**
 * 单个职业码的全套名字(含各语言短名)。$1=NOC。
 */
export const NOC_TITLE_ONE = `SELECT COALESCE(title,'') title, COALESCE(title_zh,'') title_zh, COALESCE(title_zh_short,'') title_zh_short,
              COALESCE(title_ko_short,'') title_ko_short, COALESCE(title_en_short,'') title_en_short
       FROM noc_descriptions WHERE noc = $1 LIMIT 1`

/**
 * 该职业有多少家「能走省提名」的雇主(命中具名通道,或在无清单省且泛可提名)
 */
export const NOC_EMPLOYER_COUNT = `SELECT count(DISTINCT j.company_id)::int n FROM jobs j
       WHERE COALESCE(j.status,'open') <> 'closed' AND j.noc = $1 AND j.company_id IS NOT NULL
         AND ((j.pnp_stream IS NOT NULL AND j.pnp_stream <> '')
              OR (j.province = ANY($2::text[]) AND COALESCE(j.pnp_eligible, false)))`

/**
 * 一批职业码的在架量与可提名量。$1=码数组。
 */
export const NOC_OPEN_COUNTS = `SELECT j.noc, count(*)::int n, count(*) FILTER (WHERE j.pnp_eligible)::int eligible
     FROM jobs j WHERE j.status = 'open' AND j.noc = ANY($1) GROUP BY j.noc`

/**
 * 职业总览页:noc_openings 物化表按在架量取前 N。$1=行数。
 */
export const BROAD_NOCS = `SELECT noc, title, title_zh, title_zh_short, title_ko_short, title_en_short, broad,
            open::int open, eligible::int eligible, median_salary
       FROM noc_openings ORDER BY open DESC, noc LIMIT $1`

/**
 * medianCol:要中位薪资时传那一列的表达式,不要时传空串(省一次昂贵的 percentile_cont)
 *
 * @param medianCol 中位薪资列的表达式;不要时空串。
 * @returns 职业搜索 SELECT 语句。
 */
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

/**
 * 搜不到时按大类兜底出一批
 */
export const NOC_SEARCH_FALLBACK = `SELECT j.noc, COALESCE(d.title, '') title, COALESCE(d.title_zh, '') title_zh, COALESCE(d.title_zh_short, '') title_zh_short,
            COALESCE(d.title_ko_short, '') title_ko_short, COALESCE(d.title_en_short, '') title_en_short,
            $1::text broad, count(*)::int open, count(*) FILTER (WHERE j.pnp_eligible)::int eligible
     FROM jobs j JOIN noc_descriptions d ON d.noc = j.noc
     WHERE j.status = 'open' AND j.noc <> '' AND j.broad = $1
     GROUP BY j.noc, d.title, d.title_zh, d.title_zh_short, d.title_ko_short, d.title_en_short
     ORDER BY count(*) DESC LIMIT $2`

/**
 * 职业名模糊搜(中英同查),短名优先
 */
export const NOC_BY_TITLE_LIKE = `SELECT d.noc, COALESCE(d.title,'') title, COALESCE(d.title_zh,'') title_zh, COALESCE(d.title_zh_short,'') title_zh_short,
            COALESCE(d.title_ko_short,'') title_ko_short, COALESCE(d.title_en_short,'') title_en_short
     FROM noc_descriptions d
     WHERE d.title ILIKE $1 OR d.title_zh ILIKE $1
     ORDER BY length(COALESCE(d.title,'')) LIMIT 8`

// =========================================================================
// 6. 站级数字 —— 总量 / 证明数 / 新鲜度 / 邮件提醒
// =========================================================================

/**
 * cond = 统计口径的 WHERE 片段(在架/去重等)
 *
 * @param cond 统计口径的条件片段。
 * @returns 总量/具名/LMIA 三数 SELECT 语句。
 */
export const totalAndProof = (cond: string) =>
  `SELECT count(*) FILTER (WHERE ${cond})::int AS n,
    count(*) FILTER (WHERE status = 'open' AND pnp_stream IS NOT NULL AND pnp_stream <> '')::int AS named,
    (SELECT count(*)::int FROM companies WHERE lmia_positions > 0) AS lmia
    FROM jobs j`

/**
 * ETL 心跳:每轮 seed 成功都写一笔,回答「刚核对过官方来源」(≠ 数据变过)
 */
export const ETL_HEARTBEAT = `SELECT last_seed FROM etl_heartbeat WHERE id = 1`

/**
 * 心跳表没落地时的兜底新鲜度
 */
export const JOBS_MAX_LAST_SEEN = `SELECT max(last_seen) AS upd FROM jobs`

/**
 * 邮件提醒命中:上次发信之后新出现的岗
 *
 * @param where 订阅条件片段($1=上次发信时刻)。
 * @returns 命中岗 SELECT 语句。
 */
export const alertHits = (where: string) =>
  `SELECT j.id, j.title, j.city, j.province, j.salary_text, c.name AS company_name
     ${JOB_FROM}
     WHERE j.status = 'open' AND j.first_seen > $1 AND ${where}
     ORDER BY j.grade_channel DESC NULLS LAST, j.date_posted DESC NULLS LAST LIMIT 20`

// =========================================================================
// 7. 答题三问的事实数(某职业:在架量 / 可提名量 / 具名通道 / 中位薪资 / 省分布)
// =========================================================================

/**
 * 答题三问·某职业的在架量/可提名量/具名量/TEER/中位薪资一把抓。$1=NOC。
 */
export const QUIZ_FACTS_TOTALS = `SELECT count(*)::int open,
              count(*) FILTER (WHERE j.pnp_eligible)::int eligible,
              count(*) FILTER (WHERE j.pnp_stream IS NOT NULL AND j.pnp_stream <> '')::int named,
              max(j.teer) teer,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY j.salary_annual) med
       FROM jobs j WHERE j.status = 'open' AND j.noc = $1`

/**
 * 答题三问·某职业的省分布。$1=NOC。
 */
export const QUIZ_FACTS_BY_PROV = `SELECT j.province, count(*)::int n, count(*) FILTER (WHERE j.pnp_eligible)::int eligible
       FROM jobs j WHERE j.status = 'open' AND j.noc = $1 AND j.province <> ''
       GROUP BY j.province ORDER BY count(*) DESC`

/**
 * 答题三问·某职业命中的具名通道前 4。$1=NOC。
 */
export const QUIZ_FACTS_STREAMS = `SELECT j.pnp_stream stream, count(*)::int n
       FROM jobs j WHERE j.status = 'open' AND j.noc = $1 AND j.pnp_stream IS NOT NULL AND j.pnp_stream <> ''
       GROUP BY j.pnp_stream ORDER BY count(*) DESC LIMIT 4`

// =========================================================================
// 8. 统计 / 难度 / 职业报告
// =========================================================================

/**
 * 某职业各省在招数(含具名通道数与学徒友好数)。consult 的 lookup_jobs 吃它。$1=NOC。
 */
export const PROV_OPEN_BY_PROV = `SELECT province, count(*)::int open,
              count(*) FILTER (WHERE pnp_stream IS NOT NULL AND pnp_stream <> '')::int named,
              count(*) FILTER (WHERE apprentice_friendly)::int apprentice
       FROM jobs WHERE COALESCE(status,'open') <> 'closed' AND noc = $1 AND COALESCE(province,'') <> ''
       GROUP BY province`

/**
 * 各省打分表全量(ruling 的判定底表之一)。
 */
export const PNP_SCORE_FACTORS = `SELECT province, system, factor, kind, seq, label, points, xor_prev, rule,
              factor_max, factor_group, group_max, pass_mark, max_total, guide_effective, url, fetched
       FROM pnp_score_factors ORDER BY province, factor, seq`

/**
 * 职业名 + TEER 一把抓(stats_occupation 的英文名优先)。consult 采信职业码时用。$1=NOC。
 */
export const NOC_TITLE_TEER = `SELECT COALESCE(s.title_en, d.title, '') title, s.teer
       FROM noc_descriptions d LEFT JOIN stats_occupation s ON s.noc = d.noc AND s.province = 'all'
       WHERE d.noc = $1 LIMIT 1`

/**
 * 各省全职业难度分(stats 表 broad=all 那行)。
 */
export const PROV_DIFFICULTY = `SELECT province, difficulty FROM stats
       WHERE broad = 'all' AND (mid = 'all' OR mid IS NULL) AND difficulty IS NOT NULL`

/**
 * 职业竞争度:各省在架量(实时)/30 天新增/平均在架天数(后两列走快照)。$1=码数组。
 * 🔴 2026-08-22 收拢 /api/jobs/competition 时抓出的口径 bug:原写法把 stats_occupation
 * **逐岗位行**连接再 SUM,快照值被乘上在招岗数(实测 ON 某职业 576 岗 × 670 = 385920)——
 * 快照统计列改成先按省聚合再连,单职业时逐字等于快照原值(老路由的口径)。
 * 全无快照时 new30d/avg_days_open 是 NULL(本站未收录,不折 0)。
 */
export const OCC_COMPETITION_BY_PROV = `SELECT j.province AS province, COUNT(*)::int AS open_jobs,
              s.new30d AS new30d, s.avg_days_open AS avg_days_open
         FROM jobs j
         LEFT JOIN (
           SELECT province, SUM(new30d)::int AS new30d,
                  ROUND(AVG(avg_days_open)::numeric, 1) AS avg_days_open
             FROM stats_occupation
            WHERE noc = ANY($1) AND province <> 'all'
            GROUP BY province
         ) s ON s.province = j.province
        WHERE COALESCE(j.status, 'open') <> 'closed' AND COALESCE(j.is_dup, false) = false AND j.noc = ANY($1) AND COALESCE(j.province, '') <> ''
        GROUP BY j.province, s.new30d, s.avg_days_open
        ORDER BY open_jobs DESC`

/**
 * ⚠️ **名字撒谎:只数 AIP 岗**(aip=true)。各省该职业的 AIP 在招数。$1=码数组。改名欠账,别按名字用。
 */
export const PROV_OPEN_COUNT = `SELECT province, COUNT(*)::int AS n FROM jobs
        WHERE COALESCE(status, 'open') <> 'closed' AND COALESCE(is_dup, false) = false AND COALESCE(aip, false) = true AND noc = ANY($1) AND province <> ''
        GROUP BY province`

/**
 * ⚠️ **名字撒谎:只数 RCIP 岗**(pilot LIKE %RCIP%)。$1=码数组。改名欠账,别按名字用。
 */
export const PROV_OPEN_COUNT_NOC4 = `SELECT province, COUNT(*)::int AS n FROM jobs
        WHERE COALESCE(status, 'open') <> 'closed' AND COALESCE(is_dup, false) = false AND COALESCE(pilot, '') LIKE '%RCIP%' AND noc = ANY($1) AND province <> ''
        GROUP BY province`

/**
 * ⚠️ **名字撒谎:只数 FCIP 岗**(pilot LIKE %FCIP%)。$1=码数组。改名欠账,别按名字用。
 */
export const PROV_OPEN_COUNT_BROAD = `SELECT province, COUNT(*)::int AS n FROM jobs
        WHERE COALESCE(status, 'open') <> 'closed' AND COALESCE(is_dup, false) = false AND COALESCE(pilot, '') LIKE '%FCIP%' AND noc = ANY($1) AND province <> ''
        GROUP BY province`

/**
 * 各省难度分 + 抓取日(报告要标数据新鲜度时用这条,不用 PROV_DIFFICULTY)。
 */
export const PROV_DIFFICULTY_FETCHED = `SELECT province, difficulty, fetched FROM stats
        WHERE broad = 'all' AND (mid = 'all' OR mid IS NULL) AND difficulty IS NOT NULL`

/**
 * 省份维度表的 code 与 info json。
 */
export const PROVINCES_INFO = `SELECT code, info FROM provinces`

// =========================================================================
// 9. 雇主 —— 官方名录 / 在招 / 担保
// =========================================================================

/**
 * 官方清单全量(名录页用,带排序)。
 */
export const PNP_OCCUPATIONS_ALL = `SELECT province, stream, label, type, noc, name, url, fetched FROM pnp_occupations ORDER BY province ASC, stream ASC, noc ASC`

/**
 * AIP 指定雇主名录全量。
 */
export const DESIGNATED_ALL = `SELECT name, province, location, source, nocs, url, fetched
       FROM designated_employers
      ORDER BY location ASC, name ASC`

/**
 * 某省某职业当前在招的雇主榜(按在招数)。$1=省,$2=NOC。
 */
export const HIRING_EMPLOYERS = `SELECT c.name AS name, j.province AS province,
            MIN(COALESCE(j.city, '')) AS location, COUNT(*)::int AS n
       FROM jobs j JOIN companies c ON c.id = j.company_id
      WHERE j.status = 'open' AND j.province = $1 AND j.noc = $2 AND COALESCE(c.name, '') <> ''
      GROUP BY c.name, j.province
      ORDER BY n DESC, c.name ASC
      LIMIT 300`

/**
 * 雇主页要的职业三语名(stats_occupation 英文名优先)。$1=码数组。
 */
export const NOC_TITLES_FOR_EMPLOYERS = `SELECT s.noc AS noc, COALESCE(s.title_en, '') AS en,
            COALESCE(s.title_zh_short, s.title_zh, '') AS zh, COALESCE(d.title_ko, '') AS ko
       FROM stats_occupation s LEFT JOIN noc_descriptions d ON d.noc = s.noc
      WHERE s.province = 'all' AND s.noc = ANY($1)`

/**
 * companies 表列存在性探测(additive 列上生产前后代码都能跑)。$1=列名数组。
 */
export const COMPANIES_HAS_COLUMNS = `SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' AND column_name = ANY($1)`

/**
 * 雇主侧门槛行(subject=employer)。雇主资格粗筛用。
 */
export const PNP_REQ_EMPLOYER = `SELECT province, factor, op, value, unit, applies_area FROM pnp_requirements WHERE subject = 'employer'`

/**
 * 担保雇主榜主查询:LMIA/AIP/具名通道三路并一张表。a1/a2=有无 additive 列时的列清单差。
 *
 * @param a1 SELECT 侧的附加列片段(additive 列在时非空)。
 * @param a2 GROUP BY 侧的对应片段。
 * @returns 担保雇主榜 SELECT 语句。
 */
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

/**
 * 某省的 AIP 指定雇主。$1=省。
 */
export const DESIGNATED_BY_PROV = `SELECT name, province, location, is_tech, source, nocs, url, fetched
       FROM designated_employers WHERE province = $1`

/**
 * 雇主对比:按名字(小写)取一批公司事实列。$1=名字数组。
 */
export const COMPANIES_FOR_COMPARE = `SELECT id, name, industry, alias_zh, alias_ko, wiki_url, website, ai_brief, ai_website,
            lmia_positions, lmia_positions_skilled, lmia_last_quarter
       FROM companies WHERE lower(name) = ANY($1)`

/**
 * 雇主对比:某公司在招岗的信号列(最多 400)。$1=公司 id。
 */
export const COMPANY_JOBS_FOR_COMPARE = `SELECT noc, province, pnp_eligible, pnp_stream, ee_category, salary_annual, wage_med_annual, score, aip
         FROM jobs WHERE company_id = $1 AND status != 'closed' LIMIT 400`

/**
 * 一批省的难度分。$1=省码数组。
 */
export const PROV_DIFFICULTY_ANY = `SELECT province, difficulty FROM stats WHERE broad = 'all' AND (mid = 'all' OR mid IS NULL) AND province = ANY($1) AND difficulty IS NOT NULL`

// =========================================================================
// 10. 试点(RCIP/FCIP)名额
// =========================================================================

/**
 * 试点(RCIP/FCIP)社区级名额三件套(先到先得/每期/剩余,各带 quote 与 url)。
 */
export const PILOT_QUOTA_COMMUNITIES = `SELECT community, province, type, first_come, first_come_quote, first_come_url,
            per_intake, per_intake_quote, per_intake_url,
            remaining, remaining_quote, remaining_url, as_of
       FROM pilot_quota
      WHERE COALESCE(noc, '') = ''`

// =========================================================================
// 11. 抽选 / 时间线 / 榜单
// =========================================================================

/**
 * 抽选记录全量(plan 的时间线按省抽节奏用)。
 */
export const PNP_DRAWS_ALL = `SELECT province, kind, draw_date, stream, score, scale, invitations, note, label, url FROM pnp_draws`

/**
 * 每个 EE 类别最近一轮(DISTINCT ON)。
 */
export const EE_CATEGORIES_LATEST = `SELECT DISTINCT ON (category) category, label, draw_crs, draw_date, draw_size, url FROM ee_categories
                WHERE draw_date IS NOT NULL AND draw_date <> '' ORDER BY category`

/**
 * 最近 90 条新闻(时间线的政策背景注入)。
 */
export const NEWS_RECENT = `SELECT region, title, date, slug, importance, url FROM news ORDER BY date DESC LIMIT 90`

// 🔴 **口径写在 WHERE 里**:省提名匹配只吃 `program='PNP'` 的清单行 —— AIP 背书是另一条路,
//    混进来会让「命中/被排除」判在错的项目上(同 lib/jobs/queries.ts 的 pnpOnly,那条注释 2026 年就写下了)。
//    2026-08-18 前这一路走的是 Payload Local API 且**没有这道滤**,于是 advisor 与 alerts 的匹配
//    比职位板多认了一批 AIP 行(职位板那条路一直有 pnpOnly)。同一件事两条路、两个口径,就是这么来的。

/**
 * 档案匹配吃的省提名清单(只吃 program=PNP,口径红线见上方段注)。
 */
export const MATCH_PNP_OCCUPATIONS = `SELECT province, label, type, noc, url, fetched
     FROM pnp_occupations WHERE COALESCE(program, 'PNP') = 'PNP'`

/**
 * 档案匹配吃的 EE 类别清单。
 */
export const MATCH_EE_CATEGORIES = `SELECT category, label, noc, draw_crs, draw_date, url, fetched FROM ee_categories`

/**
 * 榜单页有哪些 slug。
 */
export const RANKING_SLUGS_ALL = `SELECT DISTINCT slug FROM rankings`

/**
 * 一张榜单的全部行。$1=slug。
 */
export const RANKING_ROWS = `SELECT slug, rank, kind, external_id, title, company, company_slug, city, province, noc, teer, score,
            salary_text, salary_annual, pnp_stream, ee_category, date_posted, apply_url, official_url,
            open_jobs, named_jobs, avg_score, lmia_positions, lmia_quarter
     FROM rankings WHERE slug = $1 ORDER BY rank ASC`

// =========================================================================
// 12. 判定与案例
// =========================================================================

/**
 * 三合一判定的职位事实行(带公司名与 NOC 三语名)。$1=职位 id。
 */
export const TRIPLE_WIRE_JOB = `SELECT j.id, j.title, j.noc, j.teer, j.province, j.city, j.pnp_eligible, j.pnp_stream,
            j.ee_category, j.aip, j.employment_term, j.employment_hours, j.company_id,
            c.name AS company_name, nd.title AS noc_title,
            nd.title_zh AS noc_title_zh, nd.title_ko AS noc_title_ko
       FROM jobs j
       LEFT JOIN companies c ON c.id = j.company_id
       LEFT JOIN noc_descriptions nd ON nd.noc = j.noc
      WHERE j.id = $1 LIMIT 1`

/**
 * 公司注册事实(成立年/状态/雇员估计)。$1=公司 id。
 */
export const COMPANY_REGISTRY_FACTS = `SELECT founded_year, registry_status, staff_est, staff_est_src, sector FROM companies WHERE id = $1`

/**
 * 案例页:某职业各省在架量与学徒友好量。$1=NOC。
 */
export const CASE_PROV_COUNTS = `SELECT province, count(*)::int n, count(*) FILTER (WHERE apprentice_friendly)::int t
     FROM jobs WHERE noc = $1 AND status <> 'closed'
     GROUP BY province`

/**
 * 案例页吃的运营统计精选指标(每省每指标只取最新一行)。
 */
export const PNP_OPS_STATS = `SELECT DISTINCT ON (province, metric) province, metric, value, period, as_of, url
     FROM pnp_ops_stats
     WHERE metric IN ('allocation','nominations_ytd','refusals_ytd','laa_ytd','applications_received_ytd','eoi_pool_total')
       AND (scope IS NULL OR scope = '' OR scope = 'Skilled Worker')
     ORDER BY province, metric, COALESCE(as_of, period) DESC`

// =========================================================================
// 13. 公司调研 / JD 正文
// =========================================================================

/**
 * 懒查询建档:公司不存在时插一行占位(source=ai-lazy)。$1=公司名。
 */
export const COMPANY_INSERT_LAZY = `INSERT INTO companies (name, source, updated_at, created_at) VALUES ($1, 'ai-lazy', now(), now()) RETURNING id`

/**
 * 公司 AI 简报缓存读取。$1=公司名(小写匹配)。
 */
export const COMPANY_AI_BRIEF = `SELECT id, ai_brief, ai_website, ai_sources, ai_fetched FROM companies WHERE lower(name) = lower($1) LIMIT 1`

/**
 * 别名/维基只在原值为空时补,不覆盖已有(COALESCE 挡住)
 */
export const COMPANY_UPDATE_ALIASES = `UPDATE companies SET alias_zh = COALESCE(alias_zh, $1), alias_ko = COALESCE(alias_ko, $2), wiki_url = COALESCE(wiki_url, $3) WHERE id = $4`

/**
 * 公司 AI 简报回写(覆盖式,fetched 顺带记 now)。$1..$3=brief/website/sources,$4=公司 id。
 */
export const COMPANY_UPDATE_AI_BRIEF = `UPDATE companies SET ai_brief = $1, ai_website = $2, ai_sources = $3, ai_fetched = now() WHERE id = $4`

/**
 * 按投递链接取 JD 正文(懒抓前先查缓存)。$1=apply_url。
 */
export const JD_BY_APPLY_URL = `SELECT description FROM jobs WHERE apply_url = $1 AND description IS NOT NULL LIMIT 1`

/**
 * 懒抓到的正文回写:只填空,不覆盖已有(WHERE description IS NULL)
 */
export const JD_UPDATE_BY_APPLY_URL = `UPDATE jobs SET description = $1 WHERE apply_url = $2 AND description IS NULL`

// =========================================================================
// 14. 统计页(/stats)
// =========================================================================

/**
 * 统计页·中类粒度全量行(图表下钻用)。2026-08-22 stats 定型批:原 statsByMid/statsByBroad
 * 两个模板函数的 WHERE 片段全站只用过两种取值,固化成下面三条常量,模板退役。
 */
export const STATS_WITH_MID = `SELECT province, broad, mid, open_jobs, new7d, median_wage_annual, median_salary_annual,
              named_jobs, stream_labels, aip_jobs, top_cities, fetched, difficulty
       FROM stats ORDER BY open_jobs DESC NULLS LAST`

/**
 * 统计页·大类层行(mid='all' 或 NULL;省页/对比/表格口径,不重复计数)。
 */
export const STATS_BROAD_ROWS = `SELECT province, broad, mid, open_jobs, new7d, median_wage_annual, median_salary_annual,
              named_jobs, stream_labels, aip_jobs, top_cities, fetched, difficulty
       FROM stats WHERE (mid = 'all' OR mid IS NULL) ORDER BY open_jobs DESC NULLS LAST`

/**
 * 统计页·mid 列未落地时的降级行(E12-06:无 mid/difficulty 列查询,读取层回填 mid='all')。
 */
export const STATS_FALLBACK_BROAD = `SELECT province, broad, open_jobs, new7d, median_wage_annual, median_salary_annual,
              named_jobs, stream_labels, aip_jobs, top_cities, fetched
       FROM stats ORDER BY open_jobs DESC NULLS LAST`

/**
 * stats_occupation 列存在性探测(additive 列护栏)。$1=列名数组。
 */
export const STATS_OCC_HAS_COLUMNS = `SELECT column_name FROM information_schema.columns WHERE table_name = 'stats_occupation' AND column_name = ANY($1)`

/**
 * 统计页·职业粒度行的固定列。韩文职业名从 noc_descriptions 借(485/489 有值);
 * stats_occupation 不另存一列 —— 名字的家在那张表。英文用 title_en(NOC 官方名,引用依据),
 * 中文用 title_zh_short(本站 04f/04g 译名)。
 */
export const STATS_OCC_BASE = `s.noc, s.province, s.title_zh, s.title_zh_short, s.title_en, d.title_ko, s.teer, s.broad, s.mid, s.fine,
              s.open_jobs, s.new7d, s.median_wage_annual, s.wage_low_annual, s.wage_high_annual, s.median_salary_annual, s.salary_n, s.named_jobs`

/**
 * 统计页·职业粒度行。a1=逐列探测出的附加列(', s.列名' 串;探测理由见 stats 域 OCC_EXTRA_COLUMNS)。
 *
 * @param a1 探测出的附加列片段(', s.列名' 串;没有时空串)。
 * @returns 职业统计 SELECT 语句。
 */
export const statsOccupations = (a1: string) => `SELECT ${STATS_OCC_BASE}${a1}
       FROM stats_occupation s LEFT JOIN noc_descriptions d ON d.noc = s.noc
       ORDER BY s.open_jobs DESC NULLS LAST`

/**
 * 城市统计榜(带中文/韩文城市名)。$1=行数。
 */
export const CITY_STATS = `SELECT s.city, s.province, c.name_zh, c.name_ko, s.open_jobs, s.new7d, s.median_wage_annual, s.median_salary_annual, s.salary_n, s.named_jobs
       FROM stats_city s LEFT JOIN cities c ON c.name = s.city AND c.province = s.province
       ORDER BY s.open_jobs DESC NULLS LAST LIMIT $1`

/**
 * citation 来源三行(field-sources 维度,$1=字段名数组;2026-08-22 stats 定型批自 payload.find 换来)。
 */
export const STAT_FIELD_SOURCES = `SELECT field, publisher, url, fetched FROM field_sources WHERE field = ANY($1) ORDER BY id LIMIT 10`

/**
 * 省提名清单里出现过的职业码(去重,只吃 program=PNP)。
 */
export const PNP_NOCS_DISTINCT = `SELECT DISTINCT noc FROM pnp_occupations WHERE noc <> '' AND COALESCE(program,'PNP') = 'PNP'`

/**
 * EE 类别清单里出现过的职业码(去重)。
 */
export const EE_NOCS_DISTINCT = `SELECT DISTINCT noc FROM ee_categories WHERE noc <> ''`

// =========================================================================
// 15. 城市 / 社区页
// =========================================================================

/**
 * 「岗还在招」的条件片段(市/区聚合几条 SQL 共用的 a1 实参;status 空当 open)。
 */
export const OPEN_COND = `COALESCE(j.status,'open') = 'open'`

/**
 * 城市页三数:在架/7 天新增/中位薪资。$1=城市,$2=省,a1=在架口径片段。
 *
 * @param a1 在架口径片段(OPEN_COND)。
 * @returns 城市三数 SELECT 语句。
 */
export const cityTotals = (a1: string) => `SELECT COUNT(*)::int AS open_jobs,
              COUNT(*) FILTER (WHERE j.date_posted >= NOW() - INTERVAL '7 day')::int AS new7d,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY j.salary_annual) AS med_salary
       FROM jobs j WHERE j.city = $1 AND j.province = $2 AND ${a1}`

/**
 * 城市页大类分布前 3。$1=城市,$2=省。
 *
 * @param a1 在架口径片段(OPEN_COND)。
 * @returns 大类分布 SELECT 语句。
 */
export const cityByBroad = (a1: string) => `SELECT j.broad, COUNT(*)::int AS n FROM jobs j
       WHERE j.city = $1 AND j.province = $2 AND ${a1} AND j.broad IS NOT NULL AND j.broad <> '未分类'
       GROUP BY j.broad ORDER BY n DESC LIMIT 3`

/**
 * 城市的 DLI 院校前 4(公立优先)。$1=城市,$2=省。
 */
export const CITY_DLI = `SELECT name, is_public FROM dli WHERE city = $1 AND province = $2 ORDER BY is_public DESC NULLS LAST, name LIMIT 4`

/**
 * 城市的 AIP 指定雇主数(location 模糊匹配)。$1=城市,$2=省。
 */
export const CITY_DESIGNATED_COUNT = `SELECT COUNT(*)::int AS n FROM designated_employers WHERE province = $2 AND location ILIKE '%' || $1 || '%'`

/**
 * 社区页三数(区级)。$1=城市,$2=省,$3=区。
 *
 * @param a1 在架口径片段(OPEN_COND)。
 * @returns 社区三数 SELECT 语句。
 */
export const districtTotals = (a1: string) => `SELECT COUNT(*)::int AS open_jobs,
                COUNT(*) FILTER (WHERE j.date_posted >= NOW() - INTERVAL '7 day')::int AS new7d,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY j.salary_annual) AS med_salary
         FROM jobs j WHERE j.district = $3 AND j.city = $1 AND j.province = $2 AND ${a1}`

/**
 * 城市 DLI 总数。$1=城市,$2=省。
 */
export const CITY_DLI_COUNT = `SELECT COUNT(*)::int AS n FROM dli WHERE city = $1 AND province = $2`

/**
 * 社区页大类分布前 3。$1=城市,$2=省,$3=区。
 *
 * @param a1 在架口径片段(OPEN_COND)。
 * @returns 大类分布 SELECT 语句。
 */
export const districtByBroad = (a1: string) => `SELECT j.broad, COUNT(*)::int AS n FROM jobs j
         WHERE j.district = $3 AND j.city = $1 AND j.province = $2 AND ${a1} AND j.broad IS NOT NULL AND j.broad <> '未分类'
         GROUP BY j.broad ORDER BY n DESC LIMIT 3`

/**
 * 社区页在招雇主前 4。$1=城市,$2=省,$3=区。
 *
 * @param a1 在架口径片段(OPEN_COND)。
 * @returns 在招雇主 SELECT 语句。
 */
export const districtEmployers = (a1: string) => `SELECT c.name, c.slug, COUNT(*)::int AS n FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
         WHERE j.district = $3 AND j.city = $1 AND j.province = $2 AND ${a1} AND c.name IS NOT NULL
         GROUP BY c.name, c.slug ORDER BY n DESC, c.name LIMIT 4`

// =========================================================================
// 16. 邮件提醒
// =========================================================================

/**
 * 提醒批:上次游标之后的新岗池(按分排,封顶 2000)。$1=上次发信时刻。
 */
export const ALERT_JOBS = `SELECT j.id, j.title, j.city, j.province, j.salary_text, j.noc, j.teer, j.pnp_eligible, j.pnp_stream,
              j.ee_category, j.salary_annual, j.wage_med_annual, j.score, c.name AS company_name
       FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
       WHERE j.status = 'open' AND j.first_seen > $1 ORDER BY j.score DESC NULLS LAST LIMIT 2000`

/**
 * 提醒邮件里的职业事实数(量/可提名/中位)。$1=起始日,$2=码数组,a1=省筛选片段。
 *
 * @param a1 省筛选片段(全国时空串)。
 * @returns 职业事实数 SELECT 语句。
 */
export const alertOccStats = (a1: string) => `SELECT count(*)::int n, count(*) FILTER (WHERE j.pnp_eligible)::int elig,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY j.salary_annual) med
         FROM jobs j WHERE j.status = 'open' AND j.date_posted >= $1 AND j.noc = ANY($2)${a1}`

/**
 * 提醒邮件里的样例岗 3 条(按薪资)。$1=起始日,$2=码数组,a1=省筛选片段。
 *
 * @param a1 省筛选片段(全国时空串)。
 * @returns 样例岗 SELECT 语句。
 */
export const alertSampleJobs = (a1: string) => `SELECT j.title, COALESCE(c.name,'') company, COALESCE(j.salary_text,'') sal
         FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
         WHERE j.status = 'open' AND j.date_posted >= $1 AND j.noc = ANY($2)${a1}
         ORDER BY j.salary_annual DESC NULLS LAST LIMIT 3`

/**
 * 提醒邮件标题用的职业名(中英)。$1=码数组。
 */
export const ALERT_NOC_TITLE = `SELECT COALESCE(title_zh, '') zh, COALESCE(title, '') en FROM noc_descriptions WHERE noc = ANY($1) LIMIT 2`

/**
 * 按 id 批量核对岗的状态与省/大类(提醒去重)。$1=id 数组。
 */
export const ALERT_JOBS_BY_IDS = `SELECT id, status, province, broad FROM jobs WHERE id = ANY($1::int[])`

/**
 * 收藏画像的 (省, 大类) 对在本周的新岗计数。$1=起始日,$2=省码数组,$3=大类数组。
 *
 * 两个数组按**位置**成对:`unnest($2), unnest($3)` 并列在同一个 SELECT 目标列表里,
 * PG 按位置拉链展开(同长必须,调用方是同一次循环推的两个数组),于是第 i 个省配第 i 个大类
 * —— 要的就是这个成对语义,不是两维笛卡尔积。
 *
 * 2026-08-26 换掉原先的条件片段版 `alertNewCount(a1)`:那版在域里按 `(province = $2 AND
 * broad = $3) OR …` 手拼占位符、参数位靠 `i * 2 + 2` 算,参数个数随收藏数浮动。改数组参数后
 * 参数固定三个,序号算术连同拼接一起退役(口径逐字节不变:对已去重、双格非空,IN 对 NULL 列
 * 同样不命中)。
 */
export const ALERT_NEW_COUNT_BY_PAIRS = `SELECT count(*)::int AS n FROM jobs
       WHERE status = 'open' AND date_posted >= $1
         AND (province, broad) IN (SELECT unnest($2::text[]), unnest($3::text[]))`

// =========================================================================
// 17. 职业竞争度(API)
// =========================================================================

// 2026-08-22 段内四条(OCC_COMP/AIP/RCIP/FCIP_BY_PROV 单 noc 版)退役:路由改吃
// jobs/functions.loadOccCompetition 的数组版(§8 那组)—— 单 noc 版还在读
// stats_occupation 日快照,与 2026-08-16「在招是显示多少就查多少」的实时口径岔开。

// =========================================================================
// 18. JD 整理回写
// =========================================================================

/**
 * JD 整理稿回写(带时间戳)。$1=整理稿,$2=职位 id。
 */
export const JD_SET_FORMATTED = `UPDATE jobs SET jd_formatted = $1, jd_formatted_at = now() WHERE id = $2`

/**
 * 只在原值为空时补雇佣形态,不覆盖已解析出的值
 */
export const JD_SET_EMP_TERM = `UPDATE jobs SET employment_term = $1 WHERE id = $2 AND (employment_term IS NULL OR employment_term = '')`

/**
 * 只在原值为空时补工时形态,同上。$1=值,$2=职位 id。
 */
export const JD_SET_EMP_HOURS = `UPDATE jobs SET employment_hours = $1 WHERE id = $2 AND (employment_hours IS NULL OR employment_hours = '')`

/**
 * 按投递链接查 JD 整理状态(整理稿 + 两个雇佣列)。$1=apply_url。
 */
export const JD_STATE_BY_URL = `SELECT id, employment_term, employment_hours, jd_formatted FROM jobs WHERE apply_url = $1 LIMIT 1`

// =========================================================================
// 19. 新闻与评论
// =========================================================================

/**
 * 新闻列表页 60 条。
 */
export const NEWS_LIST = `SELECT region, title, date, slug, og_image AS "ogImage", excerpt,
                   importance, importance_note AS "importanceNote"
            FROM news ORDER BY date DESC, id ASC LIMIT 60`

/**
 * 要闻区:带重要度与三语摘要的前 5。
 */
export const NEWS_LIST_REGION = `SELECT region, title, date, slug, og_image AS "ogImage", excerpt,
                   importance, importance_note AS "importanceNote", summary_zh AS "summaryZh", summary_ko AS "summaryKo"
            FROM news WHERE importance IS NOT NULL ORDER BY importance DESC, date DESC LIMIT 5`

/**
 * 每条新闻的过审评论数。
 */
export const NEWS_COMMENT_COUNTS = `SELECT news_slug AS slug, count(*)::int AS n FROM comments WHERE status = 'approved' GROUP BY news_slug`

/**
 * 新闻详情单条。a1=按界面语言选的摘要列,$1=slug。
 *
 * @param a1 按界面语言选的摘要列名。
 * @returns 新闻详情 SELECT 语句。
 */
export const newsBySlug = (a1: string) => `SELECT region, title, date, slug, url, og_image AS "ogImage", body_en AS "bodyEn", body_zh AS "bodyZh", body_ko AS "bodyKo",
            summary_zh AS "summaryZh", summary_ko AS "summaryKo", ${a1} AS "summaryEn",
            importance, importance_note AS "importanceNote", citation, fetched, '' AS excerpt
     FROM news WHERE slug = $1 LIMIT 1`

/**
 * 新闻评论(树形,带置顶与官方标)。$1=slug。
 */
export const NEWS_COMMENTS_THREADED = `SELECT c.id, c.parent_id AS "parentId", COALESCE(c.pinned,false) AS pinned,
                   (u.role = 'admin') AS official, c.author_name AS "authorName", c.body,
                   to_char(c.created_at, 'YYYY-MM-DD') AS date
            FROM comments c LEFT JOIN users u ON u.id = c.user_id
            WHERE c.news_slug = $1 AND c.status = 'approved' ORDER BY c.created_at ASC LIMIT 200`

/**
 * 新闻评论(降级平铺:树形列还没上生产时的兜底)。$1=slug。
 */
export const NEWS_COMMENTS_FLAT = `SELECT c.id, NULL AS "parentId", false AS pinned, (u.role = 'admin') AS official,
                     c.author_name AS "authorName", c.body, to_char(c.created_at, 'YYYY-MM-DD') AS date
              FROM comments c LEFT JOIN users u ON u.id = c.user_id
              WHERE c.news_slug = $1 AND c.status = 'approved' ORDER BY c.created_at ASC LIMIT 200`

/**
 * 职位板首屏侧栏的新闻瘦列 60 条。
 */
export const NEWS_SLIM_60 = `SELECT region, title, date, slug FROM news ORDER BY date DESC, id ASC LIMIT 60`

// 首屏的八张维度表(2026-08-18 从 Payload Local API 换过来:同一个页面一半走 SQL 一半走 Local API,
// 而 /api/jobs 读同样的表 —— 两条路两套映射,口径迟早分叉,lib/jobs/dims.ts 那次已经分叉过一回)。
//
// 🔴 **numeric 列回来是字符串**(实测:teer / score / invitations / draw_crs / draw_size)。
//    Local API 那边它们是数字,所以调用点原来写的 `typeof x === 'number' ? x : null` 一换路
//    就会把这些值**静默判成 null**(抽选分数线、TEER 档整列消失,还不报错)。数字一律经 num() 归一。
// 🔴 列名 `AS "camelCase"` 对齐 Local API 的字段名 —— 这样 lib/jobs 的 toPnpOcc / toEeCat
//    一套映射同时喂两条路,不用各写一份(那正是分叉的起点)。
// 排序照抄原来 payload.find 的 sort;它没给 sort 的用 `ORDER BY id`(实测这八张表 created_at 全表同值,
// 按创建时间排等于全是并列,id 序才是可复现的那个)。

/**
 * 首屏维度表·省份。
 */
export const DIMS_PROVINCES = `SELECT code, name FROM provinces ORDER BY name LIMIT 100`

/**
 * 首屏维度表·分类树(三级三语)。
 */
export const DIMS_NOC_CATEGORIES = `SELECT broad, mid, fine, teer,
       broad_en AS "broadEn", broad_ko AS "broadKo", mid_en AS "midEn", mid_ko AS "midKo",
       fine_en AS "fineEn", fine_ko AS "fineKo"
     FROM noc_categories ORDER BY id LIMIT 1000`

/**
 * 首屏维度表·来源。
 */
export const DIMS_SOURCES = `SELECT name FROM sources ORDER BY name LIMIT 200`

/**
 * 首屏维度表·经验档。
 */
export const DIMS_EXPERIENCE_LEVELS = `SELECT name FROM experience_levels ORDER BY id LIMIT 50`

/**
 * 首屏维度表·省提名清单(camelCase 别名对齐 Local API 字段,见段注)。
 */
export const DIMS_PNP_OCCUPATIONS = `SELECT province, stream, label, type, program, noc, name,
       gta_restricted AS "gtaRestricted", url, fetched
     FROM pnp_occupations ORDER BY id LIMIT 5000`

/**
 * 首屏维度表·抽选 200 条(numeric 列回来是字符串,见段注红线)。
 */
export const DIMS_PNP_DRAWS = `SELECT province, kind, draw_date AS "drawDate", stream, stream_zh AS "streamZh",
       score, scale, invitations, note, label, url, fetched
     FROM pnp_draws ORDER BY draw_date DESC, id LIMIT 200`

/**
 * 首屏维度表·EE 类别。
 */
export const DIMS_EE_CATEGORIES = `SELECT category, label, noc, teer, title, url, fetched,
       draw_crs AS "drawCrs", draw_date AS "drawDate", draw_size AS "drawSize"
     FROM ee_categories ORDER BY id LIMIT 2000`

/**
 * 首屏维度表·字段出处。
 */
export const DIMS_FIELD_SOURCES = `SELECT field, kind, publisher, url, title, description, status, fetched, note
     FROM field_sources ORDER BY id LIMIT 200`

// =========================================================================
// 20. 站点地图(分片)
// =========================================================================

/**
 * 站点地图的在架口径片段(⚠️ 与 OPEN_COND 不是一个口径:这里无表别名、`<> 'closed'`
 * 把 NULL 与其它状态都算在架 —— sitemap 宁多收不漏收;2026-08-23 自 app 文件搬入,
 * SQL 片段的家在本叶)。
 */
export const SITEMAP_ACTIVE = `COALESCE(status,'open') <> 'closed'`

/**
 * 职位站点地图分片计数。a1=在架口径片段。
 *
 * @param a1 在架口径片段(SITEMAP_ACTIVE)。
 * @returns 计数 SELECT 语句。
 */
export const jobsSitemapCount = (a1: string) => `SELECT count(*)::int AS n FROM jobs WHERE ${a1}`

/**
 * 职位站点地图一片。a1=口径片段,$1=页大小,$2=偏移。
 *
 * @param a1 在架口径片段(SITEMAP_ACTIVE)。
 * @returns 分片 SELECT 语句。
 */
export const jobsSitemapPage = (a1: string) => `SELECT id, last_seen FROM jobs WHERE ${a1}
       ORDER BY id ASC LIMIT $1 OFFSET $2`

/**
 * 公司站点地图的 FROM/WHERE 骨架(有 slug 且有在架岗)。
 */
export const CO_SITEMAP_FROM = `FROM companies c JOIN jobs j ON j.company_id = c.id
   WHERE COALESCE(j.status,'open') <> 'closed' AND c.slug IS NOT NULL AND c.slug <> ''`

/**
 * 公司站点地图计数。a1=FROM 骨架。
 *
 * @param a1 FROM/WHERE 骨架(CO_SITEMAP_FROM)。
 * @returns 计数 SELECT 语句。
 */
export const coSitemapCount = (a1: string) => `SELECT count(DISTINCT c.id)::int AS n ${a1}`

/**
 * 公司站点地图一片。a1=FROM 骨架,$1=页大小,$2=偏移。
 *
 * @param a1 FROM/WHERE 骨架(CO_SITEMAP_FROM)。
 * @returns 分片 SELECT 语句。
 */
export const coSitemapPage = (a1: string) => `SELECT c.slug, max(j.last_seen) AS last_seen ${a1}
       GROUP BY c.id, c.slug
       ORDER BY c.id ASC LIMIT $1 OFFSET $2`

/**
 * 职位站点地图全量(一次拉齐,进程内切片;2026-09-03 GSC 实查:逐片 OFFSET 现查 10–24 秒、
 * 索引两个 count 63 秒,Google 读索引后子表逐个超时 → 「发现 0 页」,新岗一个没进索引)。a1=口径片段。
 *
 * @param a1 在架口径片段(SITEMAP_ACTIVE)。
 * @returns 全量 SELECT 语句。
 */
export const jobsSitemapAll = (a1: string) => `SELECT id, last_seen FROM jobs WHERE ${a1} ORDER BY id ASC`

/**
 * 公司站点地图全量(同上,一次拉齐进程内切片)。a1=FROM 骨架。
 *
 * @param a1 FROM/WHERE 骨架(CO_SITEMAP_FROM)。
 * @returns 全量 SELECT 语句。
 */
export const coSitemapAll = (a1: string) => `SELECT c.slug, max(j.last_seen) AS last_seen ${a1}
       GROUP BY c.id, c.slug
       ORDER BY c.id ASC`

// =========================================================================
// 21. 漏斗看板(/funnel)
// =========================================================================

/**
 * 漏斗看板:各事件 30/7/1 天计数。
 */
export const FUNNEL_EVENTS = `SELECT event, prop,
              COALESCE(sum(n) FILTER (WHERE day > CURRENT_DATE - 30), 0)::int d30,
              COALESCE(sum(n) FILTER (WHERE day > CURRENT_DATE - 7),  0)::int d7,
              COALESCE(sum(n) FILTER (WHERE day = CURRENT_DATE - 1),  0)::int d1
       FROM funnel_events GROUP BY event, prop`

/**
 * 漏斗看板:Pro 数与有 Stripe 会话的用户数。
 */
export const FUNNEL_USERS = `SELECT count(pro_until)::int pro,
                   count(*) FILTER (WHERE stripe_sessions IS NOT NULL AND stripe_sessions::text NOT IN ('[]','null','""'))::int stripe
            FROM users`

// =========================================================================
// 22. 详情页 SSR / OG 图 / 初评表
// =========================================================================

/**
 * 详情页 SSR 的 JD 正文。$1=职位 id。
 */
export const JD_BY_JOB_ID = `SELECT description FROM jobs WHERE id = $1 LIMIT 1`

/**
 * 详情页 metadata 用的瘦行。$1=职位 id。
 */
export const JOB_META_BY_ID = `SELECT j.title, c.name AS company, j.city, j.province, j.salary_text, j.status FROM jobs j
     LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`

/**
 * OG 图用的瘦行。$1=职位 id。
 */
export const JOB_OG_BY_ID = `SELECT j.title, c.name AS company, j.city, j.province, j.salary_text, j.salary, j.pnp_eligible, j.teer FROM jobs j
       LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`

/**
 * /plan/pr 页的职位锚点行。$1=职位 id。
 */
export const PR_PLAN_JOBS = `SELECT j.id, j.title, j.noc, j.teer, COALESCE(j.pnp_stream,'') AS pnp_stream,
                COALESCE(c.name,'') AS company, COALESCE(j.city,'') AS city, COALESCE(j.province,'') AS province
         FROM jobs j LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`

/**
 * 起步页的职业全清单(选职业下拉)。
 */
export const NOC_ALL_TITLES = `SELECT noc, title, COALESCE(title_zh, '') AS title_zh FROM noc_descriptions ORDER BY title`

/**
 * 起步页的近 400 轮抽选(有分或有邀请数的)。
 */
export const PNP_DRAWS_RECENT = `SELECT * FROM pnp_draws
      WHERE (score IS NOT NULL OR invitations IS NOT NULL) AND COALESCE(draw_date,'') <> ''
      ORDER BY draw_date DESC LIMIT 400`

/**
 * 起步页的近 80 条新闻。
 */
export const NEWS_RECENT_80 = `SELECT * FROM news ORDER BY date DESC, id DESC LIMIT 80`

// =========================================================================
// 23. 翻译 / 摘要缓存(按界面语言选列)
// =========================================================================

/**
 * 取英文正文 + 目标语缓存列。a1=缓存列名,$1=slug。
 *
 * @param a1 目标语缓存列名(白名单值)。
 * @returns 取正文 SELECT 语句。
 */
export const newsBodyForTranslate = (a1: string) => `SELECT body_en AS en, ${a1} AS cached FROM news WHERE slug = $1 LIMIT 1`

/**
 * 写回某语言的翻译。a1=列名,$1=译文,$2=slug。
 *
 * @param a1 目标语列名(白名单值)。
 * @returns 写回 UPDATE 语句。
 */
export const newsSetTranslation = (a1: string) => `UPDATE news SET ${a1} = $1 WHERE slug = $2`

/**
 * 取标题、英文正文 + 摘要缓存列。a1=缓存列名,$1=slug。
 *
 * @param a1 摘要缓存列名(白名单值)。
 * @returns 取正文 SELECT 语句。
 */
export const newsForSummary = (a1: string) => `SELECT title, body_en AS en, ${a1} AS cached FROM news WHERE slug = $1 LIMIT 1`

/**
 * 写回某语言的摘要。a1=列名,$1=摘要,$2=slug。
 *
 * @param a1 摘要缓存列名(白名单值)。
 * @returns 写回 UPDATE 语句。
 */
export const newsSetSummary = (a1: string) => `UPDATE news SET ${a1} = $1 WHERE slug = $2`

// =========================================================================
// 24. 埋点与零散查询
// =========================================================================

/**
 * 埋点自增(按天/事件/prop 一行,冲突 +1)。$1=事件,$2=prop。
 */
export const FUNNEL_EVENT_UPSERT = `INSERT INTO funnel_events (day, event, prop, n) VALUES (CURRENT_DATE, $1, $2, 1)
       ON CONFLICT (day, event, prop) DO UPDATE SET n = funnel_events.n + 1`

/**
 * 某省某大类某中类下的细类分布。$1..$3=省/大类/中类,a1=行数。
 *
 * @param a1 LIMIT 行数(代码里的常量,不是用户输入)。
 * @returns 细类分布 SELECT 语句。
 */
export const fineCounts = (a1: string | number) => `SELECT fine, count(*)::int AS n FROM jobs
     WHERE status = 'open' AND province = $1 AND broad = $2 AND mid = $3
       AND fine IS NOT NULL AND fine <> '' AND fine <> '未分类'
     GROUP BY fine ORDER BY n DESC LIMIT ${a1}`

/**
 * 单省难度分。$1=省。
 */
export const PROV_DIFFICULTY_ONE = `SELECT difficulty FROM stats WHERE province = $1 AND broad = 'all' AND (mid = 'all' OR mid IS NULL) AND difficulty IS NOT NULL LIMIT 1`

/**
 * 职业的职责与要求原文(JD 对照用)。$1=NOC。
 */
export const NOC_DUTIES_BY_CODE = `SELECT duties, requirements FROM noc_descriptions WHERE noc = $1 LIMIT 1`

/**
 * 按投递链接取 JD 整理稿缓存。$1=apply_url。
 */
export const JD_FORMATTED_BY_URL = `SELECT jd_formatted FROM jobs WHERE apply_url = $1 LIMIT 1`

/**
 * 按公司名取 AI 简报(有才回)。$1=公司名。
 */
export const COMPANY_BRIEF_BY_NAME = `SELECT ai_brief FROM companies WHERE lower(name) = lower($1) AND ai_brief IS NOT NULL LIMIT 1`

/**
 * 职位的投递链接一列。$1=职位 id。
 */
export const JOB_APPLY_URL_BY_ID = `SELECT apply_url FROM jobs WHERE id = $1 LIMIT 1`

// =========================================================================
// 25. AI 顾问的事实取数(lib/consult 的 11 把工具 + lib/ruling 的判定底表)
// =========================================================================

/**
 * 清单收录扁平行(consult 的 lookup_coverage)。
 */
export const PNP_OCCUPATIONS_FLAT = `SELECT province, stream, label, type, noc, url, fetched FROM pnp_occupations`

/**
 * 某省(或 FED)抽选记录,按日期新到旧(consult 的 lookup_draws)。$1=省码或 FED。
 */
export const PNP_DRAWS_BY_PROV = `SELECT province, draw_date, stream, score, scale, invitations, url, fetched, label
     FROM pnp_draws WHERE province = $1 AND COALESCE(draw_date,'') <> ''
     ORDER BY draw_date DESC`

/**
 * 某省运营统计全指标(consult 的 lookup_ops;stream_key 走 to_jsonb 取:列缺失回 NULL 不炸 42703)。$1=省。
 */
export const PNP_OPS_METRICS = `SELECT metric, scope, scope_kind, to_jsonb(t) ->> 'stream_key' AS stream_key,
            label, value, value_text, unit, as_of, period, url, fetched, section
     FROM pnp_ops_stats t WHERE province = $1 AND COALESCE(url,'') <> ''
     ORDER BY metric, seq, scope`

/**
 * 某职业命中的 EE 类别(consult 的 lookup_ee)。$1=NOC。
 */
export const EE_CATEGORIES_BY_NOC = `SELECT category, label, teer, draw_crs, draw_date, draw_size, url, fetched FROM ee_categories WHERE noc = $1`

/**
 * 某联邦项目的官方条款(province=FED;consult 的 lookup_permit)。$1=项目名。
 */
export const PERMIT_RULES = `SELECT program, stream, factor, op, value, value_text, unit, basis, label, section, url, page_url, fetched, effective
     FROM pnp_requirements WHERE province = 'FED' AND program = $1 ORDER BY seq`

/**
 * 官方计分表按 grid/节/种类/因素/档位筛(consult 的 lookup_points)。$1=grid 恒在最前,$6=行数。
 */
export const EE_POINTS_GRID = `SELECT grid, section, section_label, kind, table_no, heading, factor, criterion,
            column_label, points, points_text, seq, url, fetched
     FROM ee_points_grid
     WHERE grid = $1
       AND ($2 = '' OR section = $2)
       AND ($3 = '' OR kind = $3)
       AND ($4 = '' OR factor ILIKE '%' || $4 || '%')
       AND ($5 = '' OR criterion ILIKE '%' || $5 || '%')
     ORDER BY seq
     LIMIT $6`

/**
 * 门槛条文全量(consult 的 lookup_thresholds 与 ruling 判定底表;applies_condition 走 to_jsonb 防缺列)。
 */
export const PNP_REQUIREMENTS_ALL = `SELECT province, program, stream, subject, factor, op, value, value_text, unit,
                   applies_teer, applies_noc, excludes_noc, applies_area,
                   to_jsonb(q) ->> 'applies_condition' AS applies_condition,
                   applies_family_size, basis, label, section, seq, effective, url, page_url, fetched
            FROM pnp_requirements q ORDER BY province, seq`

/**
 * 清单收录全列(ruling 判定底表)。
 */
export const PNP_OCCUPATIONS_FULL = `SELECT province, stream, label, program, type, applies_to, noc, name, gta_restricted, url, fetched
            FROM pnp_occupations`

/**
 * 抽选记录全列(ruling 判定底表)。
 */
export const PNP_DRAWS_FULL = `SELECT province, label, scale, kind, draw_date, stream, score, invitations, note, url, fetched
            FROM pnp_draws WHERE COALESCE(draw_date,'') <> '' ORDER BY draw_date DESC`

/**
 * 计分表全量(ruling 判定底表;与 EE_POINTS_GRID 分开:那条带筛选参数)。
 */
export const EE_POINTS_GRID_2 = `SELECT grid, section, section_label, kind, table_no, heading, factor, criterion,
                   column_label, points, points_text, seq, url, fetched
            FROM ee_points_grid ORDER BY seq`

/**
 * NL 的 AIP 指定雇主(ruling 只读 NL 段,整表拉回纯浪费带宽)。
 */
export const DESIGNATED_BY_PROV_2 = `SELECT name, province, location, is_tech, source, nocs, url, fetched
            FROM designated_employers WHERE province = 'NL'`

// =========================================================================
// 26. 职业检索(lib/consult 的 search_occupations 与 lib/agent 共用)
// =========================================================================

/**
 * 职业检索:标题/官方要求文本命中且**库里真有 ≥5 个在招岗**的码(0 打头的管理类剔除)。$1=ILIKE 词,$2=行数。
 */
export const NOC_LIST_WITH_TITLES = `SELECT d.noc, COALESCE(d.title, '') title, COALESCE(d.title_zh_short, '') zh,
              COALESCE(d.title_ko_short, '') ko, COALESCE(d.title_en_short, '') en, count(*)::int n
       FROM noc_descriptions d JOIN jobs j ON j.noc = d.noc AND j.status = 'open'
       WHERE d.noc NOT LIKE '0%' AND (d.requirements ILIKE $1 OR d.title ILIKE $1)
       GROUP BY d.noc, d.title, d.title_zh_short, d.title_ko_short, d.title_en_short
       HAVING count(*) >= 5
       ORDER BY count(*) DESC LIMIT $2`

// =========================================================================
// 27. 灌库(seed)—— 固定语句 + 动态拼版
// =========================================================================
// ⚠️ 原判(2026-08-21):按表名/列清单**现拼**的那些留在 seed 路由,「搬过来只会变成
//    一堆看不懂的碎片」。2026-08-26 mart 形制批改判:前提变了 —— seed 芯进了
//    lib/mart/functions,而 functions 禁裸字符串,SQL 文本只剩这一个家;且现拼的
//    不再是碎片,是**整条语句的拼版函数**(列清单从 mart 常量进,SQL 的形在这儿),
//    介质收拢的老判据反而要求它们住这里。通用的批量 INSERT 骨架在 ./database.ts 的 insertMany。

/**
 * seed 前解锁 news 的 Payload 文档锁。
 */
export const NEWS_UNLOCK_ALL = `DELETE FROM payload_locked_documents_rels WHERE news_id IS NOT NULL`

/**
 * 本轮没出现的新闻删掉(增量对账)。$1=本轮 slug 数组。
 */
export const NEWS_DELETE_MISSING = `DELETE FROM news WHERE NOT (slug = ANY($1))`

/**
 * 把 dead_ext 名单里的岗关掉(closed_at 不覆盖已有)。$1=时刻。
 */
export const CLOSE_DEAD_EXT = `UPDATE jobs SET status='closed', closed_at=COALESCE(jobs.closed_at, d.closed_at), updated_at=$1
           FROM dead_ext d WHERE d.external_id = jobs.external_id AND jobs.status='open'`

/**
 * 超龄且本轮没再见到的岗关掉。$1=时刻,$2=最早允许的发布日。
 */
export const CLOSE_STALE = `UPDATE jobs SET status='closed', closed_at=$1, updated_at=$1
         WHERE status='open' AND date_posted < $2
           AND NOT EXISTS (SELECT 1 FROM seen_ext s WHERE s.external_id = jobs.external_id)`

/**
 * 同公司同标题同城的重复岗打 is_dup(保最新一条)。
 */
export const MARK_DUPS = `UPDATE jobs SET is_dup = x.dup FROM (
      SELECT id, (row_number() OVER (PARTITION BY company_id, lower(title), coalesce(city, '')
        ORDER BY date_posted DESC NULLS LAST, id DESC) > 1) AS dup
      FROM jobs WHERE status = 'open') x
      WHERE jobs.id = x.id AND jobs.is_dup IS DISTINCT FROM x.dup`

/**
 * 已关闭的岗撤掉 is_dup 标(别占用去重口径)。
 */
export const CLEAR_DUPS_CLOSED = `UPDATE jobs SET is_dup = false WHERE status <> 'open' AND is_dup`

/**
 * seed 成功心跳 upsert。
 */
export const HEARTBEAT_UPSERT = `INSERT INTO etl_heartbeat (id, last_seed) VALUES (1, now())
      ON CONFLICT (id) DO UPDATE SET last_seed = now()`

/**
 * 各 mart 文件上次灌库的哈希(变了才重灌)。
 */
export const SEED_STATE_ALL = `SELECT name, hash FROM seed_state`

/**
 * 写回某 mart 文件的哈希。$1=名,$2=哈希。
 */
export const SEED_STATE_UPSERT = `INSERT INTO seed_state (name, hash) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET hash=EXCLUDED.hash`

/**
 * 表还没建(DDL 未跑)→ 该表本轮跳过,计 -3
 */
export const TABLE_EXISTS = `SELECT to_regclass($1) AS t`

/**
 * reset=1 全清前解锁 jobs/companies 的文档锁。
 */
export const RESET_UNLOCK_JOBS_COMPANIES = `DELETE FROM payload_locked_documents_rels WHERE jobs_id IS NOT NULL OR companies_id IS NOT NULL`

/**
 * reset=1:清空 jobs。⚠️ 碰生产的破坏性操作,一律停下问 Frank。
 */
export const RESET_DELETE_JOBS = `DELETE FROM jobs`

/**
 * reset=1:清空 companies。⚠️ 同上。
 */
export const RESET_DELETE_COMPANIES = `DELETE FROM companies`

/**
 * 按 slug 批量取公司 id(seed 建关联用)。$1=slug 数组。
 */
export const COMPANIES_IDS_BY_SLUGS = `SELECT id, slug FROM companies WHERE slug = ANY($1)`

/**
 * 本轮见过的 external_id 入临时表(CLOSE_STALE 的对账面)。$1=id 数组。
 */
export const SEEN_EXT_INSERT = `INSERT INTO seen_ext (external_id) SELECT unnest($1::text[])`

/**
 * 实测判死、需立即下架的岗;主键让反连接走索引探测,下架从超时降到秒级
 */
export const TEMP_DEAD_EXT = `CREATE TEMP TABLE dead_ext (external_id text PRIMARY KEY, closed_at timestamptz) ON COMMIT DROP`

/**
 * 本轮抓到的全部 external_id,用于「本次未见」反连接
 */
export const TEMP_SEEN_EXT = `CREATE TEMP TABLE seen_ext (external_id text PRIMARY KEY) ON COMMIT DROP`

/**
 * 开事务(seed 全程单事务:任一步失败整体回滚,不再有半写状态)。
 */
export const TX_BEGIN = `BEGIN`

/**
 * 提交事务。
 */
export const TX_COMMIT = `COMMIT`

/**
 * 回滚事务。
 */
export const TX_ROLLBACK = `ROLLBACK`

/**
 * #118 表级哈希态的建表(幂等;-1/-2/-3 哨兵语义见 lib/mart/constants)。
 */
export const SEED_STATE_CREATE = `CREATE TABLE IF NOT EXISTS seed_state (name text PRIMARY KEY, hash text NOT NULL)`

/**
 * 判死临时表灌完后喂统计(临时表无自动统计,给规划器选反连接计划)。
 */
export const ANALYZE_DEAD_EXT = `ANALYZE dead_ext`

/**
 * 见过临时表灌完后喂统计(同上)。
 */
export const ANALYZE_SEEN_EXT = `ANALYZE seen_ext`

/**
 * 清某维度表在 payload_locked_documents_rels 里的关联(B7 教训:漏了会整事务炸)。
 *
 * @param table 维度表名(对应关联列 `<table>_id`)。
 * @returns DELETE 语句。
 */
export const clearLockedRels = (table: string) => `DELETE FROM payload_locked_documents_rels WHERE ${table}_id IS NOT NULL`

/**
 * 清空一张维度表(dims 的「清空 + 重灌」半边)。
 *
 * @param table 表名。
 * @returns DELETE 语句。
 */
export const deleteAll = (table: string) => `DELETE FROM ${table}`

/**
 * 分批多行 INSERT 的整条语句:占位符按 行数 × 列数 铺开(参数扁平化归调用方)。
 *
 * @param x 表名、列清单、本批行数与 ON CONFLICT 等后缀。
 * @returns INSERT 语句。
 */
export const insertRows = (x: SqlInsertRowsIn) => {
  const groups: string[] = []
  for (let ri = 0; ri < x.rowCount; ri++) {
    const phs: string[] = []
    for (let ci = 0; ci < x.cols.length; ci++) {
      phs.push('$' + String(ri * x.cols.length + ci + 1))
    }
    groups.push('(' + phs.join(',') + ')')
  }
  return `INSERT INTO ${x.table} (${x.cols.join(',')}) VALUES ${groups.join(',')} ${x.suffix}`
}

/**
 * stats_daily 的 UPSERT 后缀:按 (date,province,broad) 更新当天那批,往前的日期一律不动。
 */
export const STATS_DAILY_UPSERT = `ON CONFLICT (date, province, broad) DO UPDATE SET open_jobs=EXCLUDED.open_jobs, new7d=EXCLUDED.new7d,
         median_salary_annual=EXCLUDED.median_salary_annual, named_jobs=EXCLUDED.named_jobs, closed=EXCLUDED.closed, updated_at=EXCLUDED.updated_at`

/**
 * news 的 UPSERT 后缀:缓存列先按「body_en 真变了才清」处理(防错位陈译),
 * 其余业务列(除 slug/created_at)按 EXCLUDED 直写。
 *
 * @param x 全列清单与缓存列清单。
 * @returns ON CONFLICT 子句。
 */
export const newsUpsertSuffix = (x: SqlNewsUpsertIn) => {
  const stale: string[] = []
  for (const c of x.cache) {
    stale.push(`${c}=CASE WHEN news.body_en IS DISTINCT FROM EXCLUDED.body_en THEN NULL ELSE news.${c} END`)
  }
  const sets: string[] = []
  for (const c of x.cols) {
    if (c === 'slug' || c === 'created_at') {
      continue
    }
    sets.push(`${c}=EXCLUDED.${c}`)
  }
  return `ON CONFLICT (slug) DO UPDATE SET ${stale.join(',')}, ${sets.join(',')}`
}

/**
 * companies 的 UPSERT 后缀(2026-07-25 跳过未变行):普通列按 EXCLUDED 直写并参与
 * IS DISTINCT FROM 比较;COALESCE 列保旧值并按 COALESCE 后的终值比较(与 SET 一一对应);
 * updated_at 直写但不参与比较 —— 数据没变就不该跳。
 *
 * @param x 普通列与 COALESCE 列清单。
 * @returns ON CONFLICT 子句(含 WHERE「任一业务列真变了才写」)。
 */
export const companiesUpsertSuffix = (x: SqlCompaniesUpsertIn) => {
  const sets: string[] = []
  for (const c of x.plain) {
    sets.push(`${c}=EXCLUDED.${c}`)
  }
  sets.push(`updated_at=EXCLUDED.updated_at`)
  for (const c of x.coalesce) {
    sets.push(`${c}=COALESCE(EXCLUDED.${c}, companies.${c})`)
  }
  const changed: string[] = []
  for (const c of x.plain) {
    changed.push(`companies.${c} IS DISTINCT FROM EXCLUDED.${c}`)
  }
  for (const c of x.coalesce) {
    changed.push(`companies.${c} IS DISTINCT FROM COALESCE(EXCLUDED.${c}, companies.${c})`)
  }
  return `ON CONFLICT (slug) DO UPDATE SET ${sets.join(',')} WHERE ${changed.join(' OR ')}`
}

/**
 * jobs 的 UPSERT 后缀:更新分支不碰身份/首见列,last_seen 与 COALESCE 列保旧值;
 * 「真变了才写」的比较面同 companies(last_seen 归 COALESCE 组 —— 增量抓取只重抓
 * 最近几天的帖,老帖 lastSeen 原样透传比不出差异 → 大多数行整行免写)。
 *
 * @param x 全列清单、不碰的列与 COALESCE 列。
 * @returns ON CONFLICT 子句(含 WHERE)。
 */
export const jobsUpsertSuffix = (x: SqlJobsUpsertIn) => {
  const sets: string[] = []
  for (const c of x.cols) {
    if (x.fixed.includes(c) || x.coalesce.includes(c)) {
      continue
    }
    sets.push(`${c}=EXCLUDED.${c}`)
  }
  for (const c of x.coalesce) {
    sets.push(`${c}=COALESCE(EXCLUDED.${c}, jobs.${c})`)
  }
  sets.push(`last_seen=COALESCE(EXCLUDED.last_seen, jobs.last_seen)`)
  const changed: string[] = []
  for (const c of x.cols) {
    if (x.fixed.includes(c) || c === 'updated_at' || x.coalesce.includes(c)) {
      continue
    }
    changed.push(`jobs.${c} IS DISTINCT FROM EXCLUDED.${c}`)
  }
  for (const c of [...x.coalesce, 'last_seen']) {
    changed.push(`jobs.${c} IS DISTINCT FROM COALESCE(EXCLUDED.${c}, jobs.${c})`)
  }
  return `ON CONFLICT (external_id) DO UPDATE SET ${sets.join(',')} WHERE ${changed.join(' OR ')}`
}

/**
 * 单省的 info 列(/api/jobs/province 地点弹框;info 是 mart 挂的 IRCC 体量数 jsonb)。
 */
export const PROVINCE_INFO_ONE = `SELECT info FROM provinces WHERE code = $1 LIMIT 1`

/**
 * 筛选下拉的城市维度(/api/jobs/dims;上限同原 payload.find 的 5000)。
 */
export const DIMS_CITIES = `SELECT name, province FROM cities ORDER BY name LIMIT 5000`

/**
 * 筛选下拉的区维度。
 */
export const DIMS_DISTRICTS = `SELECT name, city, province FROM districts ORDER BY name LIMIT 5000`

/**
 * 筛选下拉的 AIP 指定雇主维度。
 */
export const DIMS_DESIGNATED = `SELECT name, province, location, is_tech FROM designated_employers LIMIT 5000`

/**
 * 筛选下拉/弹窗的 NOC 描述维度(上限同原 payload.find 的 2000)。
 */
export const DIMS_NOC_DESCRIPTIONS = `SELECT noc, title, title_zh, title_ko, duties, requirements, fetched FROM noc_descriptions LIMIT 2000`

/**
 * 职名 → NOC 候选：在库职位标题 pg_trgm 相似度（真实在招岗位的 title→noc 映射，
 * 比官方类名更贴简历用语；简历上传 E11-07）。$1=英文职名。
 */
export const NOC_BY_TITLE_SIM = `SELECT j.noc, max(similarity(j.title, $1)) AS sim, count(*) AS n
   FROM jobs j WHERE j.noc IS NOT NULL AND j.noc <> '' AND similarity(j.title, $1) > 0.3
   GROUP BY j.noc ORDER BY sim DESC, n DESC LIMIT 3`

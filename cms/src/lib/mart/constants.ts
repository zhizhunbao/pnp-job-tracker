/**
 * 交接域的常量:mart 文件布局(目录、分片形制)、门禁头名、seed 批量参数,
 * 以及**每张表的列白名单**(2026-08-26 形制批自 routes.ts 的装载规格表迁入 ——
 * 列名是数据不是代码,住这儿正好;⚠️ 运维警告随列表挂在各自的 JSDoc 上)。
 * 这里是 `__meta` 分片口径的**单一来源** —— 此前 upload 与 seed 各镜像一份
 * (2026-08-23 Frank 拍板收拢:同一个口径两份文本,正是该收的那种)。
 *
 * 🔴 列名耦合 Payload snake_case(v2 批量化时认账的代价,同「/jobs 读走原始 SQL」老坑 5):
 * **改 collection 字段必须同步这里的列白名单**;白名单 ↔ 行映射器的逐字对齐由
 * tests/int/martSpec 锁着(对不上不会报错,只会静默写 NULL / 静默丢字段)。
 *
 * @author Frank
 * @time 2026-08-23 14:20:00
 */

// =========================================================================
// 1. 文件布局与门禁
// =========================================================================

/**
 * tmpdir 下的落盘子目录名(upload 写、seed 读,同一处)。
 */
export const MART_DIR_NAME = 'mart'

/**
 * 本地回退目录(相对 cms 工作目录;本地 dev / compose 直读 ETL 产物)。
 */
export const LOCAL_MART_REL = '../data/mart'

/**
 * 分片声明文件的后缀:`<表>__meta.json` 声明片数,meta 最后传 = 提交语义。
 */
export const META_SUFFIX = '__meta'

/**
 * 分片文件的中缀:`<表>__part<k>.json`(k = 0..parts-1)。
 */
export const PART_INFIX = '__part'

/**
 * mart 文件扩展名。
 */
export const JSON_EXT = '.json'

/**
 * 表名的合法形状(upload 防路径穿越;seed 侧同一口径)。
 */
export const TABLE_NAME_RE = /^[a-z0-9_]{1,64}$/

/**
 * 门禁头名(与 /seed 同一把 SEED_TOKEN)。
 */
export const HDR_SEED_TOKEN = 'x-seed-token'

/**
 * /seed 额外认的查询参数名(curl 手敲方便;upload 只认头)。
 */
export const P_TOKEN = 'token'

/**
 * /seed 的全清重建开关参数名(?reset=1;⚠️ 清生产,慎)。
 */
export const P_RESET = 'reset'

/**
 * gzip 魔数第一字节(不依赖 Content-Encoding —— 中间代理可能改写/吞掉)。
 */
export const GZIP_MAGIC_0 = 0x1f

/**
 * gzip 魔数第二字节。
 */
export const GZIP_MAGIC_1 = 0x8b

/**
 * gzip 魔数长度(载荷至少要比它长才值得试着解)。
 */
export const GZIP_HEAD_LEN = 2

/**
 * 原子写的临时名前缀(先临时名再 rename,防并发 seed 读到半写文件)。
 */
export const TMP_PREFIX = '.'

/**
 * 原子写的临时名后缀。
 */
export const TMP_SUFFIX = '.tmp'

/**
 * 错误体:表名非法。
 */
export const E_BAD_NAME = 'bad table name'

/**
 * 错误体:gzip 解不开(前缀,后接原因)。
 */
export const E_BAD_GZIP = 'bad gzip: '

/**
 * 错误体:载荷不是 JSON 数组(完整性由 gzip CRC 保证,这里只查首尾括号 ——
 * 全量 parse 在 512MB 实例上内存翻几倍,上线首日 502 实撞)。
 */
export const E_NOT_ARRAY = 'payload is not a JSON array'

/**
 * 未授权响应体。
 */
export const T_UNAUTHORIZED = 'unauthorized'

/**
 * HTTP 401(未授权)。
 */
export const S_UNAUTHORIZED = 401

/**
 * HTTP 400(载荷/表名非法)。
 */
export const S_BAD_REQUEST = 400

/**
 * JSON 数组首字节(`[`;掐头尾空白后比对)。
 */
export const BYTE_LBRACKET = 0x5b

/**
 * JSON 数组尾字节(`]`)。
 */
export const BYTE_RBRACKET = 0x5d

/**
 * ASCII 空白上界(≤ 0x20 一律当空白掐掉)。
 */
export const BYTE_WS_MAX = 0x20

/**
 * 分片家族的命名分隔（`__meta`/`__part` 共用的双下划线；含它的非 meta 名 = 分片自身，
 * 不清对方 —— 与原 upload 口径逐字一致）。
 */
export const SHARD_SEP = '__'

/**
 * 读 mart 文件的编码。
 */
export const UTF8 = 'utf8'

/**
 * textOf 的缺席缺省:展示型文本列缺席折空串。
 */
export const TEXT_EMPTY = ''

/**
 * insertBatch 的「无 ON CONFLICT 后缀」。
 */
export const SUFFIX_NONE = ''

/**
 * 表级内容哈希的算法(#118;拼速度不拼强度,防的是「内容没变白重灌」)。
 */
export const MD5 = 'md5'

/**
 * 哈希输出编码。
 */
export const HEX = 'hex'

// =========================================================================
// 2. seed 参数与哨兵
// =========================================================================

/**
 * 批量 INSERT 每语句行数:jobs 56 列 × 300 行 ≈ 1.7 万参数(PG 上限 65535),
 * JD 正文大也控住单语句体积。
 */
export const BATCH_ROWS = 300

/**
 * 「本次未见」下架的保护期(天):只下架发布已超此天数的岗 ——
 * 增量抓取只含最近几天,直接对账会误杀仍在招的旧岗(实测 805,见 docs/source-framework.md)。
 */
export const EXPIRE_DAYS = 30

/**
 * 计数哨兵:本轮无该表上传,跳过保留现有行(E12-03 防线:mart 文件缺失 ≠ 空表;
 * 要真清空一张维度表 = 上传内容为 [] 的文件,显式意图)。
 */
export const COUNT_NO_UPLOAD = -1

/**
 * 计数哨兵:内容与上轮一致,整表免重灌(#118 表级哈希)。
 */
export const COUNT_UNCHANGED = -2

/**
 * 计数哨兵:表还没建(DDL 与部署有先后)。seed 整个跑在一个事务里,撞 42P01 会让
 * **这一轮全部回滚** —— 一张新表的 SQL 还没在生产跑,就能把每小时一次的灌库整个停掉。
 * to_regclass 查不到只返回 null,不抛错、也不污染事务(2026-08-12 随 noc_openings 新表一并加)。
 */
export const COUNT_NO_TABLE = -3

/**
 * pg 错误码:表不存在(42P01)。心跳表未落地时按它忽略,别让心跳把整轮灌库回滚。
 */
export const PG_UNDEFINED_TABLE = '42P01'

/**
 * jobs 插入分支的初始状态。
 */
export const STATUS_OPEN = 'open'

/**
 * pnp_occupations.program 的缺席默认(老数据没这一列,一律按 PNP 计)。
 */
export const PROGRAM_PNP = 'PNP'

/**
 * stats.mid 的缺席默认(broad 汇总行没有 mid,按 all 记)。
 */
export const MID_ALL = 'all'

// =========================================================================
// 3. 表名(= mart 文件名 = 响应计数键)
// =========================================================================

/**
 * 省维度表。
 */
export const TBL_PROVINCES = 'provinces'

/**
 * 城市维度表。
 */
export const TBL_CITIES = 'cities'

/**
 * 区维度表。
 */
export const TBL_DISTRICTS = 'districts'

/**
 * AIP 指定雇主表。
 */
export const TBL_DESIGNATED_EMPLOYERS = 'designated_employers'

/**
 * RCIP/FCIP 试点社区表(E6-11)。
 */
export const TBL_PILOT_COMMUNITIES = 'pilot_communities'

/**
 * 社区 × 职业清单表(E6-11 批B)。
 */
export const TBL_PILOT_OCCUPATIONS = 'pilot_occupations'

/**
 * 社区名额状态表(旧账立项 2026-08-15)。
 */
export const TBL_PILOT_QUOTA = 'pilot_quota'

/**
 * 职业在招量聚合表(2026-08-12)。
 */
export const TBL_NOC_OPENINGS = 'noc_openings'

/**
 * NOC 分类维度表。
 */
export const TBL_NOC_CATEGORIES = 'noc_categories'

/**
 * 来源维度表。
 */
export const TBL_SOURCES = 'sources'

/**
 * 经验档维度表。
 */
export const TBL_EXPERIENCE_LEVELS = 'experience_levels'

/**
 * 省提名职业清单表。
 */
export const TBL_PNP_OCCUPATIONS = 'pnp_occupations'

/**
 * 省提名抽选表。
 */
export const TBL_PNP_DRAWS = 'pnp_draws'

/**
 * 省提名计分因素表。
 */
export const TBL_PNP_SCORE_FACTORS = 'pnp_score_factors'

/**
 * 省提名官方门槛表(E13-01 规则引擎)。
 */
export const TBL_PNP_REQUIREMENTS = 'pnp_requirements'

/**
 * 三省运营统计表(G5,对话即产品 §三 lookupOps)。
 */
export const TBL_PNP_OPS_STATS = 'pnp_ops_stats'

/**
 * 联邦 EE 类别表。
 */
export const TBL_EE_CATEGORIES = 'ee_categories'

/**
 * 联邦官方计分表(G9;决策引擎事实表,不是 /jobs 筛选维度)。
 */
export const TBL_EE_POINTS_GRID = 'ee_points_grid'

/**
 * NOC 职责描述表。
 */
export const TBL_NOC_DESCRIPTIONS = 'noc_descriptions'

/**
 * PGWP 可申 DLI 子集表(E12-03,院校级,IRCC 官方名单)。
 */
export const TBL_DLI = 'dli'

/**
 * PTE Core 题型维度表(2026-09-03 pte 域升产品域)。
 */
export const TBL_PTE_TYPES = 'pte_types'

/**
 * PTE Core 机经题表(2026-09-03;一题一行按源,四格信号随行)。
 */
export const TBL_PTE_QUESTIONS = 'pte_questions'

/**
 * PTE 题目音频表(2026-09-03 批三;piper 合成的 mp3 按 base64 进库,/api/pte/audio 吐出 —— 生产镜像装不下仓库文件)。
 */
export const TBL_PTE_AUDIO = 'pte_audio'

/**
 * 题库词典表(2026-09-04;pte-dict 步出,word / phonetic / translation / lemma)。
 */
export const TBL_PTE_DICT = 'pte_dict'

/**
 * 字段级来源表(E4-04)。
 */
export const TBL_FIELD_SOURCES = 'field_sources'

/**
 * 榜单表(E5-02)。
 */
export const TBL_RANKINGS = 'rankings'

/**
 * 职业统计表(E8-14 主图粒度之一)。
 */
export const TBL_STATS_OCCUPATION = 'stats_occupation'

/**
 * 城市统计表(E8-14 主图粒度之一)。
 */
export const TBL_STATS_CITY = 'stats_city'

/**
 * 省 × 大类统计表(E5-04 地区统计)。
 */
export const TBL_STATS = 'stats'

/**
 * 逐日统计表(趋势图唯一数据来源;只追加,永不清空)。
 */
export const TBL_STATS_DAILY = 'stats_daily'

/**
 * 新闻表(E12-06;按 slug upsert,不走 dims 清空重灌)。
 */
export const TBL_NEWS = 'news'

/**
 * 公司事实表。
 */
export const TBL_COMPANIES = 'companies'

/**
 * 职位事实表。
 */
export const TBL_JOBS = 'jobs'

/**
 * 实测判死名单的事务内临时表(建表语句在 SQL.TEMP_DEAD_EXT)。
 */
export const TBL_DEAD_EXT = 'dead_ext'

/**
 * mart 文件:本轮源数据里真实见到、未判死的全部 posting id(2026-08-04 数据销毁修:
 * 展示去重与下架对账解耦,09 另出这张名单)。
 */
export const MART_SEEN_IDS = 'seen_ids'

/**
 * mart 文件:verify_expired 逐帖 GET 实测判死的岗(2026-08-03,立即下架不等 30 天)。
 */
export const MART_CLOSED_JOBS = 'closed_jobs'

// =========================================================================
// 4. 列白名单(snake_case,与库列逐字对齐;⚠️ 新列的 DDL 警告挂在各自 JSDoc)
// =========================================================================

/**
 * 灌库时统一补在每行末尾的两列时间戳(维度表与 dead_ext 的列白名单不含它们)。
 */
export const COLS_ROW_TS = ['created_at', 'updated_at']

/**
 * provinces 列。
 */
export const COLS_PROVINCES = ['code', 'name', 'info']

/**
 * cities 列。
 */
export const COLS_CITIES = ['name', 'province', 'name_zh', 'name_ko']

/**
 * districts 列。
 */
export const COLS_DISTRICTS = ['name', 'city', 'province']

/**
 * designated_employers 列。
 */
export const COLS_DESIGNATED_EMPLOYERS = ['name', 'province', 'location', 'is_tech', 'source', 'nocs', 'url', 'fetched']

/**
 * pilot_communities 列。⚠️ **先在生产跑 docs/sql/e6-11-pilot.sql**(建表 + 锁表补列)。
 */
export const COLS_PILOT_COMMUNITIES = ['name', 'province', 'type', 'cities', 'url', 'fetched']

/**
 * pilot_occupations 列。⚠️ **先跑 docs/sql/e6-11-pilot-b.sql**。
 */
export const COLS_PILOT_OCCUPATIONS = ['community', 'province', 'type', 'noc', 'title', 'sector_only', 'url', 'fetched']

/**
 * pilot_quota 列。⚠️ **先在生产跑 docs/sql/pilot-quota.sql**(建表 + 锁表补列)。
 * ⚠️ first_come/per_intake/remaining 保持可空 —— 空 = 官网没写,不是 0/false,
 * 映射器里禁折默认值(cellOf 保 null)。
 */
export const COLS_PILOT_QUOTA = ['community', 'province', 'type', 'noc', 'status', 'first_come', 'first_come_quote', 'first_come_url', 'per_intake', 'per_intake_quote', 'per_intake_url', 'remaining', 'remaining_quote', 'remaining_url', 'quote', 'url', 'as_of']

/**
 * noc_openings 列。⚠️ **先在生产跑 docs/sql/noc-openings.sql**(建表 + 补
 * payload_locked_documents_rels 的列),否则这段 INSERT 撞 42P01/42703 → 整个 seed 事务回滚。
 */
export const COLS_NOC_OPENINGS = ['noc', 'open', 'eligible', 'median_salary', 'broad', 'title', 'title_zh', 'title_zh_short', 'title_ko_short', 'title_en_short']

/**
 * noc_categories 列。
 */
export const COLS_NOC_CATEGORIES = ['broad', 'mid', 'fine', 'teer', 'broad_en', 'broad_ko', 'mid_en', 'mid_ko', 'fine_en', 'fine_ko']

/**
 * sources 列。
 */
export const COLS_SOURCES = ['name']

/**
 * experience_levels 列。
 */
export const COLS_EXPERIENCE_LEVELS = ['name']

/**
 * pnp_occupations 列。
 */
export const COLS_PNP_OCCUPATIONS = ['province', 'stream', 'label', 'type', 'program', 'noc', 'name', 'gta_restricted', 'applies_to', 'url', 'fetched']

/**
 * pnp_draws 列。⚠️ stream_zh 是 #280 新列:必须先在生产跑 docs/sql/pnp-draws-stream-zh.sql,
 * 否则这一段撞 42703 → 整个 seed 事务回滚(表现为 /seed 500、无 body)。
 */
export const COLS_PNP_DRAWS = ['province', 'kind', 'draw_date', 'stream', 'stream_zh', 'score', 'scale', 'invitations', 'note', 'label', 'url', 'fetched']

/**
 * pnp_score_factors 列。
 */
export const COLS_PNP_SCORE_FACTORS = ['province', 'system', 'factor', 'kind', 'seq', 'label', 'points', 'xor_prev', 'rule', 'factor_max', 'factor_group', 'group_max', 'pass_mark', 'max_total', 'guide_effective', 'url', 'fetched']

/**
 * pnp_requirements 列(一行一条,subject 区分申请人/雇主,applies_* 是适用条件)。
 * ⚠️ applies_condition 是 G6 新列:**必须先在生产跑 docs/sql/g6-pnp-requirements-condition.sql**,
 * 否则这条 INSERT 撞 42703 → 整个 seed 事务回滚(表现为 /seed 500、无 body)。
 */
export const COLS_PNP_REQUIREMENTS = ['province', 'program', 'stream', 'subject', 'factor', 'op', 'value', 'value_text', 'unit', 'applies_teer', 'applies_noc', 'excludes_noc', 'applies_area', 'applies_condition', 'applies_family_size', 'basis', 'label', 'section', 'seq', 'effective', 'url', 'page_url', 'fetched']

/**
 * pnp_ops_stats 列(配额/已用/待处理/积压游标/EOI 池/处理周数/SIRS 分数段)。
 * ⚠️ value 保持可空 —— 官方隐私抑制值(AB「Less than 10」、BC「&lt;5」)与不适用一律
 * null + value_text 存原文,映射器里禁折 0。
 */
export const COLS_PNP_OPS_STATS = ['province', 'program', 'metric', 'scope', 'scope_kind', 'stream_key', 'label', 'value', 'value_text', 'unit', 'as_of', 'period', 'url', 'fetched', 'section', 'seq']

/**
 * ee_categories 列。
 */
export const COLS_EE_CATEGORIES = ['category', 'label', 'noc', 'teer', 'title', 'url', 'fetched', 'draw_crs', 'draw_date', 'draw_size']

/**
 * ee_points_grid 列(CRS 排名分 + FSW 67 分选择因素同表,grid 列分)。
 * ⚠️ 建表必须先在生产跑 docs/sql/g9-ee-points-grid.sql(含
 * payload_locked_documents_rels.ee_points_grid_id),否则撞 42703 → 整个 seed 事务回滚。
 * ⚠️ points 保持可空 —— 官方「n/a」「Not eligible to apply」一律 null + points_text 存原文,禁折 0。
 * ⚠️ 列名 table_no / column_label:官方那两个字段叫 table / column,两个都是 SQL 保留字。
 */
export const COLS_EE_POINTS_GRID = ['grid', 'section', 'section_label', 'kind', 'table_no', 'heading', 'factor', 'criterion', 'column_label', 'points', 'points_text', 'seq', 'url', 'fetched']

/**
 * noc_descriptions 列。
 */
export const COLS_NOC_DESCRIPTIONS = ['noc', 'title', 'title_zh', 'title_zh_short', 'title_ko', 'title_ko_short', 'title_en_short', 'duties', 'requirements', 'fetched']

/**
 * dli 列。
 */
export const COLS_DLI = ['province', 'name', 'dli_number', 'city', 'campuses', 'is_public', 'grad_program', 'url', 'fetched']

/**
 * pte_types 列。⚠️ **先在生产跑 docs/sql/pte-tables.sql**(建两表 + 锁表各补一列)。
 */
export const COLS_PTE_TYPES = ['code', 'section', 'seq', 'name_zh', 'name_en', 'name_ko', 'audio', 'weight']

/**
 * pte_questions 列(同上一份 SQL)。⚠️ votes / freq / seen / answer / audio_* 可空 = 该源没有,
 * 不是 0/空串 —— 映射器一律 cellOf 保 null,禁折默认值。
 */
export const COLS_PTE_QUESTIONS = ['qid', 'source', 'type', 'num', 'title', 'text', 'answer', 'audio_url', 'audio_file', 'image_url', 'predicted', 'seen', 'seen_n', 'votes', 'freq', 'fetched']

/**
 * pte_audio 列(mart 键 qid / mime / b64 / voice 同名)。
 */
export const COLS_PTE_AUDIO = ['qid', 'mime', 'b64', 'voice']

/**
 * pte_dict 列(mart 键同名)。
 */
export const COLS_PTE_DICT = ['word', 'phonetic', 'translation', 'lemma', 'phonetic_uk', 'phonetic_us', 'tag', 'collins', 'frq', 'definition', 'forms']

/**
 * field_sources 列(坑 2:白名单必须显式列全字段)。
 */
export const COLS_FIELD_SOURCES = ['field', 'kind', 'publisher', 'url', 'title', 'description', 'status', 'fetched', 'note']

/**
 * rankings 列。
 */
export const COLS_RANKINGS = ['slug', 'rank', 'kind', 'external_id', 'title', 'company', 'company_slug', 'city', 'province', 'noc', 'teer', 'score', 'salary_text', 'salary_annual', 'pnp_stream', 'ee_category', 'date_posted', 'apply_url', 'official_url', 'open_jobs', 'named_jobs', 'avg_score', 'lmia_positions', 'lmia_quarter']

/**
 * stats_occupation 列(E8-14 主图当下状态粒度;历史那张 stats_daily 单独 UPSERT)。
 * 列变更史(⚠️ 每次改列都要清 seed_state('stats_occupation'),否则表级哈希让新列静默跳过):
 * · wage_low/high_annual(2026-07-31 范围拍板);
 * · E13-02 v3(把脉首页):new30d/new30d_prev/mom30d/new14d_prev/mom14d/closed30d/net30d/avg_days_open/pulse_score;
 * · E13-05:pnp_provs(真口径可提名省份,只在 province='all' 行有值);
 * · E13-07:channel_tier(通道档 both/prov/fed/ee/employer,全国行有值);
 * · E13-08:dead_provs(完全无路可走的省,全国行;空串=处处有路,NULL=TEER 未分类不判);
 * · E13-09:pnp_provs 收紧为「拿 offer 即可」;pnp_provs_cond=「先省内工作 6 个月」;
 * · E14-02:担保率四列(sponsor_pos_q/sponsor_pos_skilled_q=担保侧分子,
 *   jvws_vac_q=JVWS 官方空缺分母,sponsor_rate=分子/分母 0-1 小数)。
 */
export const COLS_STATS_OCCUPATION = ['noc', 'province', 'title_zh', 'title_zh_short', 'title_en', 'teer', 'broad', 'mid', 'fine', 'open_jobs', 'new7d', 'median_wage_annual', 'wage_low_annual', 'wage_high_annual', 'median_salary_annual', 'salary_n', 'named_jobs', 'fetched', 'new30d', 'new30d_prev', 'mom30d', 'new14d', 'new14d_prev', 'mom14d', 'closed30d', 'net30d', 'avg_days_open', 'pulse_score', 'pnp_provs', 'channel_tier', 'dead_provs', 'pnp_provs_cond', 'sponsor_pos_q', 'sponsor_pos_skilled_q', 'jvws_vac_q', 'sponsor_rate', 'sponsor_evidence']

/**
 * stats_city 列。
 */
export const COLS_STATS_CITY = ['city', 'province', 'open_jobs', 'new7d', 'median_wage_annual', 'median_salary_annual', 'salary_n', 'named_jobs', 'fetched']

/**
 * stats 列(E5-04 地区统计)。
 */
export const COLS_STATS = ['province', 'broad', 'mid', 'open_jobs', 'new7d', 'median_wage_annual', 'median_salary_annual', 'named_jobs', 'stream_labels', 'aip_jobs', 'top_cities', 'fetched', 'difficulty']

/**
 * stats_daily 列(含时间戳;按 (date,province,broad) UPSERT,一天多跑几轮只更新今天这批)。
 */
export const COLS_STATS_DAILY = ['date', 'province', 'broad', 'open_jobs', 'new7d', 'median_salary_annual', 'named_jobs', 'closed', 'created_at', 'updated_at']

/**
 * news 列(含时间戳;按 slug upsert)。
 */
export const COLS_NEWS = ['region', 'title', 'title_zh', 'date', 'slug', 'url', 'og_image', 'excerpt', 'importance', 'importance_note', 'body_en', 'citation', 'fetched', 'created_at', 'updated_at']

/**
 * news 的懒翻译/速读缓存列:由 /api/news/translate、/api/news/summarize 线上写入,
 * seed 不许碰 —— 除非该条 body_en 变了(重抽正文)才连带清缓存(防错位陈译;E12-06 P1f)。
 */
export const COLS_NEWS_CACHE = ['body_zh', 'body_ko', 'summary_zh', 'summary_ko', 'summary_en']

/**
 * companies 列(含时间戳;按 slug upsert)。
 */
export const COLS_COMPANIES = ['slug', 'name', 'website', 'website_source', 'email', 'region', 'sectors', 'address', 'description', 'source', 'lmia_positions', 'lmia_lmias', 'lmia_last_quarter', 'lmia_streams', 'lmia_positions_skilled', 'lmia_positions_4q', 'lmia_positions_2q', 'lmia_positions_1q', 'lmia_nocs', 'sponsor_grade', 'score_detail', 'created_at', 'updated_at']

/**
 * companies 更新分支按 EXCLUDED 直写、且参与「真变了才写」比较的列
 * (2026-07-25 跳过未变行:全量重写把整轮从秒级抬到 100s+ 必撞代理上限;
 * updated_at 不参与比较,数据没变就不该跳)。
 */
export const COLS_COMPANIES_PLAIN = ['name', 'website', 'website_source', 'email', 'region', 'sectors', 'address', 'description', 'source', 'lmia_positions', 'lmia_lmias', 'lmia_last_quarter', 'lmia_streams', 'lmia_positions_skilled', 'lmia_positions_4q', 'lmia_positions_2q', 'lmia_positions_1q', 'lmia_nocs']

/**
 * companies 走 COALESCE 保旧值的列(E12-08 担保档 + 四维档明细:盒过渡期缺键
 * 保留旧值不清空,GAP1 惯例)。
 */
export const COLS_COMPANIES_COALESCE = ['sponsor_grade', 'score_detail']

/**
 * jobs 列(含状态与时间戳;按 external_id upsert)。
 */
export const COLS_JOBS = ['external_id', 'company_id', 'title', 'noc', 'category', 'teer', 'broad', 'mid', 'fine', 'description', 'country', 'province', 'city', 'district', 'address', 'apply_url', 'official_url', 'salary', 'salary_annual', 'salary_text', 'wage_med_hourly', 'wage_med_annual', 'wage_low_hourly', 'wage_low_annual', 'wage_high_hourly', 'wage_high_annual', 'wage_year', 'date_posted', 'source', 'source_label', 'origin', 'accessibility', 'score', 'grade_channel', 'score_detail', 'pnp_eligible', 'pnp_stream', 'ee_category', 'aip', 'pilot', 'pilot_community', 'pilot_employer', 'pilot_occ', 'apprentice_friendly', 'employment_term', 'employment_hours', 'certificates', 'education', 'eligibility_flag', 'eligibility_quote', 'status', 'closed_at', 'first_seen', 'last_seen', 'created_at', 'updated_at']

/**
 * jobs 更新分支不碰的列:身份键与「首见/末见/建档」时刻
 * (last_seen 单独走 COALESCE —— mart 透传抓取时间,没给则保留旧值)。
 */
export const COLS_JOBS_FIXED = ['external_id', 'first_seen', 'last_seen', 'created_at']

/**
 * jobs 走 COALESCE 保旧值的列(GAP1③:预筛两列缺值的过渡期保留旧值;
 * #123:description 也 COALESCE —— mart 为空(05b 没抓到=聚合帖)时保留懒抓写回的正文,
 * 不冲缓存;E12-08 两档列同款)。
 */
export const COLS_JOBS_COALESCE = ['description', 'eligibility_flag', 'eligibility_quote', 'grade_channel', 'score_detail']

/**
 * dead_ext 临时表列(实测判死名单)。
 */
export const COLS_DEAD_EXT = ['external_id', 'closed_at']

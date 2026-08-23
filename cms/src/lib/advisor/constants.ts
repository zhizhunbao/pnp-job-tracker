/**
 * advisor 域常量:场景分组、截断上限、生成长度档、缓存键与限额键。
 * 2026-08-23 自 api/advisor/route.ts 搬入(数值口径逐字保形,出处注释随行保留)。
 *
 * @author Frank
 * @time 2026-08-23 16:00:00
 */

/**
 * 输出语言名(喂给 system 的 `{lang}` 槽;键 = 前端 lang 参数)。
 */
export const LANG_NAMES: Record<string, string> = {
  /**
   * 中文(简体令另有 ZH_ONLY 段)。
   */
  zh: '简体中文',

  /**
   * 英文。
   */
  en: 'English',

  /**
   * 韩文。
   */
  ko: '한국어',
}

/**
 * 一句话即可的简单字段(不分段、不过度解读;其余移民价值相关走多段分析)。
 */
export const SIMPLE_FIELDS = ['datePosted', 'lastSeen', 'closedAt', 'status', 'country', 'city', 'district', 'address', 'source', 'origin', 'direct', 'wageMedHr', 'wageMedYr']

/**
 * 薪资类字段(中位缺失时要追加 NO_MEDIAN_RULE —— 踩过:模型编出 $72K-$78K)。
 */
export const WAGE_FIELDS = ['salary', 'salaryYr', 'wageMedHr', 'wageMedYr', 'vsMedian']

/**
 * 紧缺职业的 NOC 前两位集(E12-08 档位制;与 etl/grades.py grade_channel 同源信号)。
 */
export const INDEMAND_NOC2 = ['21', '22', '31', '32', '72', '73', '42']

/**
 * 海洋四省省码(#161:AIP 雇主驱动通道优先于 EE 标尺)。
 */
export const ATLANTIC_PROVS = ['NL', 'PE', 'NS', 'NB']

/**
 * JD 原文截断上限(控制 prompt 长度;老链 loadJD 同数)。
 */
export const JD_LEN_MAX = 2200

/**
 * 公司简介(库内富化)截断:初判场景。
 */
export const CO_DESC_LEN_MAX = 1200

/**
 * 公司行业串截断:初判场景。
 */
export const CO_SECTORS_LEN_MAX = 200

/**
 * 公司简介截断:事实行与速读场景(jobFacts/coRead 同数)。
 */
export const CO_ABOUT_LEN_MAX = 600

/**
 * 联网调查简报截断(#107 K 调查缓存)。
 */
export const CO_WEB_LEN_MAX = 800

/**
 * 联网调查来源 URL 上限(只带前几条)。
 */
export const CO_SOURCES_MAX = 4

/**
 * 公司名长度上限(超长不当公司名查,防滥用)。
 */
export const CO_NAME_LEN_MAX = 200

/**
 * occRead 官方职责:行数上限。
 */
export const OCC_DUTY_LINES_MAX = 30

/**
 * occRead 官方职责:字符上限。
 */
export const OCC_DUTY_LEN_MAX = 2000

/**
 * occRead 任职要求:行数上限。
 */
export const OCC_REQ_LINES_MAX = 20

/**
 * occRead 任职要求:字符上限。
 */
export const OCC_REQ_LEN_MAX = 1400

/**
 * provRead/cityRead 地点事实块截断。
 */
export const LOC_FACTS_LEN_MAX = 2400

/**
 * 生成长度档:多轮追问(第 15 轮 #36 各档 +40 容纳结尾 ❓ 建议行)。
 */
export const PREDICT_CHAT = 540

/**
 * 生成长度档:简单字段一句话。
 */
export const PREDICT_SIMPLE = 160

/**
 * 生成长度档:公司初判(480→640 实测 web_fetch 后素材变厚截断第四段,E6-03;再 +40)。
 */
export const PREDICT_COMPANY = 680

/**
 * 生成长度档:其余多段场景。
 */
export const PREDICT_DEFAULT = 460

/**
 * 前导话闸缓冲上限(E8-05:吞掉首个【之前的文本;超限原样放行,防误吞无标题的降级回答)。
 */
export const GATE_BUF_MAX = 300

/**
 * 初判缓存键版本(v3=#133 档名口径;v4=2026-08-23 契约换 id 制,旧键天然失效)。
 */
export const CACHE_VER = 'v4'

/**
 * 全局日上限的限额键(成本兜底,真调 LLM 才计)。
 */
export const QUOTA_KEY_GLOBAL = 'adv:__global__'

/**
 * Pro 个人日限的限额键前缀(后接用户 id)。
 */
export const QUOTA_KEY_PRO_PREFIX = 'adv:pro:'

/**
 * 全局日上限的缺省值(环境变量 ADVISOR_DAILY_CAP 可覆盖)。
 */
export const GLOBAL_DAILY_CAP_DEFAULT = 1000

/**
 * 全局日上限的环境变量名。
 */
export const ENV_DAILY_CAP = 'ADVISOR_DAILY_CAP'

/**
 * 场景名:公司初判。
 */
export const F_COMPANY = 'company'

/**
 * 场景名:职业速读。
 */
export const F_OCC_READ = 'occRead'

/**
 * 场景名:省速读。
 */
export const F_PROV_READ = 'provRead'

/**
 * 场景名:市/区速读。
 */
export const F_CITY_READ = 'cityRead'

/**
 * 场景名:职位帖速读。
 */
export const F_JD_READ = 'jdRead'

/**
 * 场景名:公司速读。
 */
export const F_CO_READ = 'coRead'

/**
 * 场景名:初判(旧调用方的名字,兼容保留)。
 */
export const F_TITLE = 'title'

/**
 * 场景名:初判(E8-10 收组后的名字)。
 */
export const F_IMMIGRATION = 'immigration'

/**
 * 场景名:通道档解读(要附 scoreFacts 明细)。
 */
export const F_SCORE = 'score'

/**
 * 语言码:中文(简体令的判据)。
 */
export const LANG_ZH = 'zh'

/**
 * 可抓官网的 URL 形状(company 场景 web_fetch 的门槛)。
 */
export const HTTP_RE = /^https?:\/\//

/**
 * NOC 码的 TEER 位:长度 5 且第二位是数字(与老链 noc[1] 判据同义)。
 */
export const NOC_TEER_RE = /^.(?<teer>\d).{3}$/

/**
 * NOC 紧缺判定取前几位(INDEMAND_NOC2 的键长)。
 */
export const NOC_GROUP_LEN = 2

/**
 * ISO 日期串取前几位(YYYY-MM-DD)。
 */
export const ISO_DATE_LEN = 10

/**
 * 年薪千位换算除数。
 */
export const K_DIV = 1000

/**
 * 换行(functions 不许裸字面量,粘接词收这儿)。
 */
export const NL = '\n'

/**
 * 空行。
 */
export const NL2 = '\n\n'

/**
 * 逗号粘接(地点、雇佣形态)。
 */
export const COMMA_SEP = ', '

/**
 * 分号粘接(证书表、驱动因子)。
 */
export const SEMI_SEP = '; '

/**
 * 斜杠粘接(档案的 NOC/省列表)。
 */
export const SLASH_SEP = '/'

/**
 * 空格粘接(调查来源 URL、句间)。
 */
export const SPACE_SEP = ' '

/**
 * 档案匹配依据行的行首。
 */
export const REASON_PREFIX = '- '

/**
 * 档名引号(scoreFacts 里档名带双引号喂模型,老链口径)。
 */
export const QUOTE = '"'

/**
 * 缓存键的段分隔。
 */
export const KEY_SEP = ':'

/**
 * 缓存键的按人隔离段前缀(后接用户 id)。
 */
export const KEY_PRO_PREFIX = 'p'

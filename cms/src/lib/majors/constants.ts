/**
 * 专业域的死值:查询参数名、缓存寿命、搜索条数与命中档。
 *
 * @author Frank
 * @time 2026-10-04 02:14:05
 */

/**
 * /api/majors 的热门参数名(?top=1 → 热门清单,按名次)。
 */
export const P_TOP = 'top'

/**
 * /api/majors 的检索参数名(?q=会计 → 英 / 中 / 韩名包含匹配,前 20)。
 */
export const P_Q = 'q'

/**
 * /api/majors 的码参数名(?code=52.0203 → 一条)。
 */
export const P_CODE = 'code'

/**
 * /api/majors 的大类参数名(?cat=fin → 那个大类的树:折叠专业类 + 单列专业;2026-10-05 专业题照掌上高考做)。
 */
export const P_CAT = 'cat'

/**
 * /api/majors 的大类清单参数名(?cats=1 → 选择器左栏的大类,catOrder 序;2026-10-05)。
 */
export const P_CATS = 'cats'

/**
 * 大类键的形:2 到 8 个小写字母(fin / eng / health …)。不合形的键不进库、回空树;不截断 —— 截断会把乱写的键截成真键。
 */
export const CAT_KEY_RE = /^[a-z]{2,8}$/

/**
 * 挂点排序数(catOrder / groupOrder / order)最小几(1 起)。
 */
export const PLACE_ORDER_MIN = 1

/**
 * 挂点排序数最大几(一个大类最多三十来个专业类、一类最多几十个专业;超出 = 数据层写坏了,整格当不成样子)。
 * 逐格摆放按序号走格,这个上限顺带管住走格的步数。
 */
export const PLACE_ORDER_MAX = 999

/**
 * 查询参数没带时的初值:空串 = 「没给」。`?q=` 与干脆不写 `q` 在用户那里是同一件事,必须落成同一个值。
 */
export const PARAM_NONE = ''

/**
 * 检索词长度上限(专业名最长约 100 字符,超出 = 乱砸)。
 */
export const Q_LEN_MAX = 60

/**
 * class 码长度上限('52.0203' 七个字符,留点余量)。
 */
export const CODE_LEN_MAX = 10

/**
 * 搜索最多回几条。
 */
export const SEARCH_LIMIT = 20

/**
 * 检索词与专业名比对前要删掉的空白(全部,不只首尾;顺带就把首尾空白去了)。
 * 韩文复合名词分写随意:「컴퓨터 과학」要搜到「컴퓨터과학」,「기계공학」要搜到「기계 공학」(2026-10-04)。
 */
export const SEARCH_SPACE_RE = /\s+/g

/**
 * 删空白时的替身:一个字都不留(「컴퓨터 과학」→「컴퓨터과학」,不是换成别的分隔符)。
 */
export const SEARCH_SPACE_DROP = ''

/**
 * 整表缓存寿命(10 分钟;表一天变不了一次,10 分钟是「seed 灌了新表多久能看到」的上限)。
 */
export const MAJORS_TTL_MS = 10 * 60_000

/**
 * 命中档:没命中。
 */
export const MATCH_NONE = 0

/**
 * 命中档:英文名的缩写以检索词开头(「HR」→ Human resources management…),最低一档(2026-10-04 八档立)。
 */
export const MATCH_ACRONYM_HEAD = 1

/**
 * 命中档:名字中间含检索词。
 * 2026-10-04 八档改判:英文只在检索词够长(INSIDE_MIN 个字母起)时才算 —— 两个字母到处都含(「ai」在 chain / training / aide 里);
 * 中韩文的「中间含」改归整词档(MATCH_WORD),中韩文没有词界。
 */
export const MATCH_INSIDE = 2

/**
 * 命中档:检索词去掉常见词尾后是某个词的开头(「accountant」→ Accounting、「electrician」→ Electrical;2026-10-04 八档立)。
 */
export const MATCH_STEM = 3

/**
 * 命中档:检索词的每个词都是名字里某个词的开头(「supply chain」→ Logistics, materials, and supply chain management);
 * 中韩文是名字中间含(没有词界)。英文两个字母以下不算这一档(2026-10-04 八档立)。
 */
export const MATCH_WORD = 4

/**
 * 命中档:名字以检索词开头(排在前面)。
 */
export const MATCH_PREFIX = 5

/**
 * 命中桶:热门专业的整词命中(开头 / 某个词开头 / 去词尾后开头)—— 不是名字本身的档,是命中之后看行上的名次升上来的一桶;
 * 英文检索词两个字母以下不升(两个字母多是缩写,升了会把「aide」这类词首碰巧对上的热门顶上来)。
 * 2026-10-04 八档改判:原先热门行「中间含」也升,搜「AI」把供应链(chain)、烹饪(training)、护理助理(aide)顶到最前(Frank 截图)。
 */
export const MATCH_HOT = 6

/**
 * 命中档:英文名的缩写(各词首字母,跳过 ACRONYM_STOP)与检索词相等(「AI」→ Artificial intelligence、「CS」→ Computer science;
 * 2026-10-04 八档立)。
 */
export const MATCH_ACRONYM = 7

/**
 * 命中档:三语名里有一个(去空白、转小写后)与检索词完全相等 —— 用户打的就是这个专业,排最前(2026-10-04)。
 * 档值越大越靠前,一个专业取三语里最高的那一档;热门不是命中档,是命中之后按行上的名次另装一桶。
 * 同日八档改判:档值 3 → 8(其余几档插在下面);英文按词比(标点当词界),中韩文照旧删空白比。
 */
export const MATCH_EXACT = 8

/**
 * 出结果时逐档的先后(档值大的在前)。
 */
export const MATCH_ORDER = [
  MATCH_EXACT, MATCH_ACRONYM, MATCH_HOT, MATCH_PREFIX, MATCH_WORD, MATCH_STEM, MATCH_INSIDE, MATCH_ACRONYM_HEAD,
]

/**
 * 热门行命中这几档时升进热门桶(都是整词命中;完全相等与缩写相等本来就在热门桶之上,中间含与缩写开头不升)。
 */
export const HOT_TIERS = [MATCH_PREFIX, MATCH_WORD, MATCH_STEM]

/**
 * 英文按词比时的词界:字母与数字以外都算(空格、斜杠、逗号、括号、连字符)。
 */
export const WORD_SPLIT_RE = /[^\p{L}\p{N}]+/u

/**
 * 检索词里有中文 / 韩文就按中韩文比(删空白后比开头与中间含);不带 g(test 不留 lastIndex)。
 */
export const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff\u3130-\u318f\uac00-\ud7af]/

/**
 * 拼词的分隔:词与词之间一个空格(整名 / 整句比对用)。
 */
export const WORD_SEP = ' '

/**
 * 拼词不加分隔(缩写、去空格比对用;「computerscience」也认 Computer science)。
 */
export const WORD_GLUE = ''

/**
 * 算缩写时跳过的虚词与套话(CIP 名常带 and / of / general / other / related / studies;
 * 不跳的话「CS」要撞一串「C… studies」,「HR」先出「Holocaust and related studies」)。
 * teaching 也跳:「ECE」= Early childhood education(加拿大说 ECE 就是幼教,CIP 名尾巴是 and teaching)。
 */
export const ACRONYM_STOP = [
  'a', 'an', 'and', 'for', 'general', 'in', 'of', 'on', 'other', 'related', 'studies', 'teaching', 'the', 'to', 'with',
]

/**
 * 按缩写比的检索词最短几个字母。
 */
export const ACRONYM_MIN = 2

/**
 * 按缩写比的检索词最长几个字母(再长就不像缩写了)。
 */
export const ACRONYM_MAX = 6

/**
 * 英文检索词不超过这么多字母时只认完全相等 / 缩写 / 名字开头(不认某个词开头,也不升热门桶)。
 */
export const SHORT_Q_MAX = 2

/**
 * 英文「中间含」最少几个字母(两三个字母到处都含)。
 */
export const INSIDE_MIN = 4

/**
 * 去词尾时认的常见词尾(职业名 → 专业名:accountant / electrician / pharmacist / designer / programmer)。按顺序试,先对上的先去。
 */
export const STEM_SUFFIXES = ['ant', 'ent', 'ist', 'ian', 'ing', 'ion', 'er', 'or', 's']

/**
 * 去词尾后至少留几个字母(「cooks」留 cook,「nurse」不动)。
 */
export const STEM_MIN = 4

/**
 * 每档里沉到最后的系:32–37 是不计学分的兴趣 / 技能课(Aircraft pilot (private) (not for credit)),60 / 61 是住院医师培训 ——
 * 留学生、移民简历上几乎不会写,搜「AI」「nurse」时排在真专业前面是噪音(2026-10-04 八档立;不删,只沉)。
 */
export const SINK_SERIES = ['32', '33', '34', '35', '36', '37', '60', '61']

/**
 * 错误体:三个参数都没带。
 * 2026-10-05 加 cat / cats 两支后改成五个参数都没带。
 */
export const E_PARAM = 'top, q, code, cat or cats required'

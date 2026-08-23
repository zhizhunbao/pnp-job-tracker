/**
 * 交接域的常量:mart 文件布局(目录、分片形制)与门禁头名。
 * 这里是 `__meta` 分片口径的**单一来源** —— 此前 upload 与 seed 各镜像一份
 * (2026-08-23 Frank 拍板收拢:同一个口径两份文本,正是该收的那种)。
 *
 * @author Frank
 * @time 2026-08-23 14:20:00
 */

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
 * gzip 魔数第一字节(不依赖 Content-Encoding —— 中间代理可能改写/吞掉)。
 */
export const GZIP_MAGIC_0 = 0x1f

/**
 * gzip 魔数第二字节。
 */
export const GZIP_MAGIC_1 = 0x8b

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

/**
 * me 桶子桶 base 的死值(「基础简历」卡:档案页右栏那一份上传的简历)。2026-11-12 自子桶 resume 裁出重写,
 * 为档案与简历并页(2026-11-11 Frank「只留一份上传的吧。因为之后都可以按岗位改写」「左边我的档案,右面我的简历」):
 * 接口、大小上限、报错码照旧,只留一份用得着的。子桶不取父桶,与别的子桶同值的几条各自抄。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */

/**
 * 空串(判空、「没有错」与清空用)。
 */
export const TEXT_NONE = ''

/**
 * 类名之间的空格。
 */
export const CLS_SEP = ' '

/**
 * fetch 带 cookie。
 */
export const CRED_INCLUDE = 'include'

/**
 * 取简历清单的接口(2026-11-11 起一人只留一份上传的,至多交回一条;不带原件)。
 */
export const URL_RESUME_FILES = '/api/resume/files'

/**
 * 简历原件接口:GET 取原件、PUT 新加或替换、DELETE 删;哪一份由 `?id=` 指明(PUT 不带 = 新加)。
 */
export const URL_RESUME_FILE = '/api/resume/file'

/**
 * 指明哪一份简历的查询参数头(拼在原件接口后)。
 */
export const Q_ID_HEAD = '?id='

/**
 * 下载参数(拼在 id 之后,服务端按附件给)。
 */
export const Q_DL_TAIL = '&dl=1'

/**
 * 预览取原件时拼的版本参数头:替换了文件地址就变,浏览器与 pdf.js 都不会拿到上一份。
 */
export const Q_VER_MID = '&v='

/**
 * 上传用的请求方法(替换 = 覆盖,天然幂等,所以是 PUT 不是 POST)。
 */
export const METHOD_PUT = 'PUT'

/**
 * 删除的请求方法。
 */
export const METHOD_DELETE = 'DELETE'

/**
 * 上传表单里文件那一格的字段名(与 lib/resume 的 FIELD_FILE 是同一份线格式,各域各抄一份)。
 */
export const FIELD_FILE = 'file'

/**
 * 隐藏文件框的 type。
 */
export const RESUME_INPUT_TYPE = 'file'

/**
 * 文件框只让选 PDF 与 .docx(扩展名加 MIME 两种写法都给:手机文件选择器有的只认 MIME)。
 */
export const RESUME_ACCEPT = '.pdf,.docx,application/pdf,'
  + 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * 上传前在浏览器里先挡一道的大小上限(5 MB;服务端还会再判一次,这道只为不白传)。
 */
export const RESUME_MAX_BYTES = 5 * 1024 * 1024

/**
 * PDF 的 MIME(只有 PDF 能在卡里画出来)。
 */
export const MIME_PDF = 'application/pdf'

/**
 * 下载钮的 target:本页。带了 target 才走裸 <a>(LinkButton 的规矩)—— 不带就走 next/link,
 * 它会预取这条原件地址、点下去还先试客户端切页,白白多拉一次原件。
 */
export const TARGET_SELF = '_self'

/**
 * 一 KB 的字节数。
 */
export const BYTES_KB = 1024

/**
 * 一 MB 的字节数。
 */
export const BYTES_MB = 1024 * 1024

/**
 * 大小的单位字样:KB(带前导空格,接在数字后)。
 */
export const UNIT_KB = ' KB'

/**
 * 大小的单位字样:MB。
 */
export const UNIT_MB = ' MB'

/**
 * MB 保留的小数位。
 */
export const MB_DIGITS = 1

/**
 * 服务端错误码 → 报错文案键;表里没有的(网络断、500)一律落「没成功,稍后再试」。
 * 子桶 resume 的「份数满了」一条不抄:只留一份之后上传即替换,不会满。
 */
export const RF_ERR_KEY: Record<string, string> = {
  /**
   * 不是 PDF / .docx(服务端按文件头判)。
   */
  type: 'rf.err.type',

  /**
   * 超过 5 MB。
   */
  size: 'rf.err.size',

  /**
   * 今天上传次数用完。
   */
  limit: 'rf.err.limit',
}

/**
 * 表里查不到的报错落点。
 */
export const RF_ERR_FALLBACK = 'rf.err.net'

/**
 * 浏览器端先挡的错(不发请求,直接给对应文案):文件太大。
 */
export const RF_ERR_SIZE = 'size'

/**
 * 主按钮档(卡头「上传简历」、空态「选择文件」)。
 */
export const PRIMARY_KIND = 'primary'

/**
 * 次按钮档(「生成简历」、下载、替换文件)。
 */
export const SECONDARY_KIND = 'secondary'

/**
 * 删除钮档(删了不可逆,红色)。
 */
export const DANGER_KIND = 'danger'

/**
 * 全站分区卡的全局类(main.css 的 .cardMd)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 分区卡卡头标题的全局类(main.css 的 .mcardHead)。
 */
export const CARD_HEAD_CLS = 'mcardHead'

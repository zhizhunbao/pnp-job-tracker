/**
 * me 桶子桶 resume 的死值(「我的简历」一页:简历清单、上传、求职信清单;2026-11-07 自 account 桶在新域重写,
 * 接口、上限、报错码照旧)。子桶不取父桶,与父桶 / 别的子桶同值的几条各自抄。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
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
 * 「我的简历」取清单的接口(2026-10-06 一人多份;id、是否默认、文件名、类型、大小、上传时刻,不带原件)。
 */
export const URL_RESUME_FILES = '/api/resume/files'

/**
 * 「我的简历」原件接口:GET 取原件、PUT 新加或替换、DELETE 删、PATCH 设默认;哪一份由 `?id=` 指明(PUT 不带 = 新加)。
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
 * 每人最多几份简历(与 lib/resume 的 RESUME_FILES_MAX 是同一个数,各域各抄一份;Frank 10-06 选 5 份)。
 * 2026-10-07 Frank「我觉得可能超过 5 个简历」(投递按岗选简历):提到 20 份,两处同改。
 */
export const RESUME_FILES_MAX = 20

/**
 * 份数「2 / 20」的分隔。
 */
export const COUNT_SEP = ' / '

/**
 * 窄屏清单里「上传日期, 大小」的分隔。
 */
export const META_SEP = ', '

/**
 * 上传用的请求方法(替换 = 覆盖,天然幂等,所以是 PUT 不是 POST)。
 */
export const METHOD_PUT = 'PUT'

/**
 * 设默认的请求方法。
 */
export const METHOD_PATCH = 'PATCH'

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
 * 文件框只让选 PDF 与 .docx(扩展名加 MIME 两种写法都给,审查 #14:手机文件选择器有的只认 MIME)。
 */
export const RESUME_ACCEPT = '.pdf,.docx,application/pdf,'
  + 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * 上传前在浏览器里先挡一道的大小上限(5 MB;服务端还会再判一次,这道只为不白传)。
 */
export const RESUME_MAX_BYTES = 5 * 1024 * 1024

/**
 * PDF 的 MIME(只有 PDF 能在预览框里画出来)。
 */
export const MIME_PDF = 'application/pdf'

/**
 * 下载钮的 target:本页。带了 target 才走裸 <a>(LinkButton 的规矩)—— 不带就走 next/link,
 * 它会预取这条原件地址、点下去还先试客户端切页,白白多拉一次原件。
 */
export const TARGET_SELF = '_self'

/**
 * 求职信 PDF 新标签页打开。
 */
export const TARGET_BLANK = '_blank'

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

  /**
   * 份数满了(2026-10-06 一人多份)。
   */
  full: 'rf.err.full',
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
 * 求职信清单接口(「求职信」页签;2026-10-08 照 AIApply 的 My Cover Letters;数据 = 投递表里有信的行,不另建表)。
 */
export const URL_LETTERS = '/api/apply/letters'

/**
 * 草稿「继续」的去处头(后接职位 id):就在「我的简历」节原地弹投递框(`?apply=` 是全站骨架上投递框宿主认的参数;
 * 本桶不从 apply 桶取开框函数 —— apply 桶取本桶的简历预览,反过来取就成环)。
 */
export const URL_APPLY_HEAD = '/account?sec=resume&apply='

/**
 * 发出去的那封信的 PDF 地址头(后接投递行 id;同「我的求职」的求职信格)。
 */
export const URL_LETTER_FILE_HEAD = '/api/apply/file?id='

/**
 * 求职信 PDF 地址的种类尾。
 */
export const LETTER_FILE_TAIL = '&kind=cover'

/**
 * 草稿的投递状态值(与 lib/apply 的 ST_DRAFT 同字,各域各抄一份)。
 */
export const ST_DRAFT = 'draft'

/**
 * 页签:简历。
 */
export const TAB_RESUME = 'resume'

/**
 * 页签:求职信。
 */
export const TAB_LETTER = 'letter'

/**
 * 页签条 aria id 的前缀(同页只有这一组)。
 */
export const TAB_ID_PREFIX = 'meresume'

/**
 * 简历表的列:名称。
 */
export const COL_NAME = 'name'

/**
 * 简历表的列:上传日期。
 */
export const COL_DATE = 'date'

/**
 * 简历表的列:大小。
 */
export const COL_SIZE = 'size'

/**
 * 求职信表的列:职位。
 */
export const COL_TITLE = 'title'

/**
 * 求职信表的列:公司。
 */
export const COL_COMPANY = 'company'

/**
 * 求职信表的列:状态。
 */
export const COL_STATUS = 'status'

/**
 * 求职信表的列:写于。
 */
export const COL_WROTE = 'wrote'

/**
 * 「默认」胶囊的档(tag 桶 ok 档:绿底)。
 */
export const DEFAULT_TAG = 'ok'

/**
 * 求职信「草稿」胶囊的档(tag 桶 gray)。
 */
export const LETTER_DRAFT_TAG = 'gray'

/**
 * 求职信「已投递」胶囊的档(tag 桶 ok:绿)。
 */
export const LETTER_SENT_TAG = 'ok'

/**
 * 主按钮档(页标题右边「上传简历」、空态「选择文件」)。
 */
export const PRIMARY_KIND = 'primary'

/**
 * 次按钮档(「生成简历」、预览框里的下载 / 设为默认 / 替换文件)。
 */
export const SECONDARY_KIND = 'secondary'

/**
 * 删除钮档(删了不可逆,红色)。
 */
export const DANGER_KIND = 'danger'

/**
 * 定制样式钮的统一底座:ghost 底最素,视觉全由本桶的加倍类定形(文件名、职位名那种蓝字链接)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 全站分区卡的全局类(main.css 的 .cardMd)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 预览弹框记尺寸的键(新键:窗口形是 2026-11-07 起的新形,不接原普通弹框的尺寸)。
 */
export const PV_MODAL_PREF = 'resume_pv_pref'

/**
 * 预览弹框默认宽(原普通弹框 lg 档 760)。
 */
export const PV_MODAL_W = 760

/**
 * 预览弹框默认高(装得下一页 Letter + 操作排 + 翻页条)。
 */
export const PV_MODAL_H = 900

/**
 * 求职信清单拉失败的留痕标签(2026-11-07:catch 必留痕)。
 */
export const LETTERS_LOG_TAG = 'me.letters'

/**
 * 求职信清单拉失败的留痕前缀(后接状态码或异常)。
 */
export const LETTERS_FAIL_TEXT = 'letters load failed: '

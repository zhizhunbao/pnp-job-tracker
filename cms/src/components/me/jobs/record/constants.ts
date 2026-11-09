/**
 * 导出求职记录的死值。
 *
 * @author Frank
 * @time 2026-11-09 01:00:00
 */

/**
 * 文件头的字节序标记(Excel 靠它认 UTF-8,没有它中文公司名是乱码)。
 */
export const CSV_BOM = '\uFEFF'

/**
 * 列分隔。
 */
export const CSV_SEP = ','

/**
 * 行分隔。
 */
export const CSV_EOL = '\r\n'

/**
 * 引号。
 */
export const CSV_QUOTE = '"'

/**
 * 引号转义后的样子。
 */
export const CSV_QUOTE_ESC = '""'

/**
 * 全部引号(转义用)。
 */
export const CSV_QUOTE_RE = /"/g

/**
 * 表格软件会当公式执行的开头(职位名和公司名来自抓取,不可信)。
 */
export const CSV_FORMULA_RE = /^[=+\-@\t\r]/

/**
 * 公式开头前加的字符:让表格软件当文字。
 */
export const CSV_TEXT_MARK = "'"

/**
 * 文件类型。
 */
export const CSV_MIME = 'text/csv;charset=utf-8'

/**
 * 文件名开头。
 */
export const FILE_HEAD = 'job-search-record-'

/**
 * 文件名结尾。
 */
export const FILE_TAIL = '.csv'

/**
 * 造下载链接用的元素名。
 */
export const TAG_ANCHOR = 'a'

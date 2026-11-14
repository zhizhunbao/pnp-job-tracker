/**
 * gate 桶子桶 cv 的常量:修改面板末段「生成简历」的接口地址、模板取值、提示的词条键与预览框的规格。
 * 2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,最后用 sonnet 生成简历,可以选择模板。这部分功能是收费的」。
 * 子桶不取父桶,同名的几枚各自抄。
 *
 * @author Frank
 * @time 2026-11-12 18:00:00
 */

/**
 * 没有 / 没填的空文本。
 */
export const TEXT_NONE = ''

/**
 * 生成接口(lib/tailor 的 tailorProfileRoute)。
 */
export const URL_CV_GEN = '/api/tailor/profile'

/**
 * 额度查询接口(lib/apply 的 applyCreditRoute)。
 */
export const URL_CREDIT = '/api/apply/credit'

/**
 * 上传简历接口(不带 id:本人已有基础简历的是替换它)。
 */
export const URL_RESUME_FILE = '/api/resume/file'

/**
 * 请求方法:POST。
 */
export const METHOD_POST = 'POST'

/**
 * 请求方法:PUT。
 */
export const METHOD_PUT = 'PUT'

/**
 * 带登录态。
 */
export const CRED_INCLUDE = 'include'

/**
 * 请求头名:内容类型。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 的内容类型。
 */
export const MIME_JSON = 'application/json'

/**
 * PDF 的内容类型。
 */
export const MIME_PDF = 'application/pdf'

/**
 * 上传表单里文件那一格的名字。
 */
export const FIELD_FILE = 'file'

/**
 * 状态码:额度用完。
 */
export const STATUS_PAY = 402

/**
 * 模板:传统单栏。
 */
export const TPL_CLASSIC = 'classic'

/**
 * 模板:带色条的现代款。
 */
export const TPL_MODERN = 'modern'

/**
 * 额度还没取到时的值(钮旁不出「剩几个」)。
 */
export const LEFT_NONE = -1

/**
 * 简历换了的页面事件名(「基础简历」卡听它重拉清单)。
 */
export const EV_RESUME = 'o2p-resume-changed'

/**
 * 提示:成功的颜色。
 * 2026-11-13 成功不再摆绿条,改右上角提示,这是那一条的档(toast 桶 ok)。
 */
export const MSG_OK = 'ok'

/**
 * 提示:普通的颜色。
 */
export const MSG_INFO = 'info'

/**
 * 提示:失败的颜色。
 */
export const MSG_ERR = 'err'

/**
 * 词条键:生成失败的默认提示。
 */
export const K_CV_FAIL = 'pf.cv.fail'

/**
 * 词条键:已设为我的简历。
 */
export const K_CV_SET_OK = 'pf.cv.setOk'

/**
 * 词条键:没存上。
 */
export const K_CV_SET_FAIL = 'pf.cv.setFail'

/**
 * 接口错误码 → 提示的词条键(没列的用默认那句)。
 */
export const CV_ERR_KEYS: Record<string, string> = {
  /**
   * 档案不够生成。
   */
  need: 'pf.cv.need',

  /**
   * 今天生成次数到上限。
   */
  limit: 'pf.cv.limit',

  /**
   * 写出来的内容排不成简历。
   */
  resumeBad: 'pf.cv.bad',
}

/**
 * 模板示例 PDF 的接口(lib/tailor 的 tailorSampleRoute),后面接模板名(2026-11-13)。
 */
export const URL_CV_SAMPLE = '/api/tailor/sample?tpl='

/**
 * 生成简历弹框尺寸记忆的本地存储键(2026-11-13)。
 */
export const CV_BOX_PREF = 'o2p.cvgen.box'

/**
 * 生成简历弹框没有记忆时的宽(px)。
 */
export const CV_BOX_W = 1080

/**
 * 生成简历弹框没有记忆时的高(px)。
 */
export const CV_BOX_H = 860

/**
 * 预览框尺寸记忆的本地存储键。
 */
export const CV_PV_PREF = 'o2p.cvgen.preview'

/**
 * 预览框没有记忆时的宽(px)。
 */
export const CV_PV_W = 860

/**
 * 预览框没有记忆时的高(px)。
 */
export const CV_PV_H = 900

/**
 * 下载用的临时链接元素名。
 */
export const TAG_A = 'a'

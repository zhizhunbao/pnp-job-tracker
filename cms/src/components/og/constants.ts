/**
 * og 域的死值:两张分享图(站点通用卡 / 职位卡)的版面尺寸,按卡分段。
 * 2026-08-29 Frank 拍板「需要单独创建一个域」:此前 35 枚散在 start/jobs 两个业务桶
 * 寄人篱下,收拢归位;同名不同值的(品牌字号/胶囊参数/域名字号)按卡前缀分开,
 * 共用画布四枚(宽高/粗体/胶囊圆角)保原名。各键 JSDoc 自原桶随迁。
 *
 * @author Frank
 * @time 2026-08-29 16:30:00
 */

/**
 * 站级分享图的画布宽(px)。1200×630 是各家分享卡的通用比例,改了会被自己裁一刀。
 */
export const OG_W = 1200

/**
 * 站级分享图的画布高(px),同上。
 */
export const OG_H = 630

/**
 * 站级分享图里加粗那行的字重。
 */
export const OG_BOLD = 700

/**
 * 信号胶囊的圆角(px):取一个远大于半高的数 = 药丸形。
 */
export const OG_CHIP_RADIUS = 999

/**
 * 品牌字(🍁 Offer2PR)的字号(px):站级图只有品牌,所以给到最大一档。
 */
export const OG_SITE_BRAND_SIZE = 84

/**
 * 品牌字底下那句英文说明的字号(px)。
 */
export const OG_SITE_TAGLINE_SIZE = 36

/**
 * 英文说明距品牌字的上边距(px)。
 */
export const OG_SITE_TAGLINE_TOP = 24

/**
 * 四枚信号胶囊之间的间距(px)。
 */
export const OG_SITE_CHIP_GAP = 16

/**
 * 胶囊那一行距英文说明的上边距(px)。
 */
export const OG_SITE_CHIP_TOP = 34

/**
 * 信号胶囊的字号(px)。
 */
export const OG_SITE_CHIP_SIZE = 26

/**
 * 底部域名的字号(px)。
 */
export const OG_SITE_DOMAIN_SIZE = 28

/**
 * 底部域名距胶囊行的上边距(px)。
 */
export const OG_SITE_DOMAIN_TOP = 40

/**
 * 分享图画布四周的内衬(px)。
 */
export const OG_JOB_PAD = 64

/**
 * 职位名进图前截到这么多字符:再长标题区就撑到三行,把公司与地点挤出画布。
 */
export const OG_JOB_TITLE_LEN = 90

/**
 * 公司名进图前截到这么多字符。
 */
export const OG_JOB_COMPANY_LEN = 60

/**
 * 薪资原文进图前截到这么多字符。
 */
export const OG_JOB_SALARY_LEN = 40

/**
 * 顶栏品牌字(🍁 Offer2PR)的字号(px)。
 */
export const OG_JOB_BRAND_SIZE = 34

/**
 * 顶栏域名小注的字号(px)。
 */
export const OG_JOB_DOMAIN_SIZE = 22

/**
 * 顶栏品牌字与域名小注之间的间距(px)。
 */
export const OG_JOB_BRAND_GAP = 12

/**
 * 职位名的字号(px)。
 */
export const OG_JOB_TITLE_SIZE = 58

/**
 * 职位名的行高倍数(职位名常占两行,行距按字号的这个倍数)。
 */
export const OG_JOB_TITLE_LH = 1.2

/**
 * 公司名的字号(px)。
 */
export const OG_JOB_COMPANY_SIZE = 34

/**
 * 公司名距职位名的上边距(px)。
 */
export const OG_JOB_COMPANY_TOP = 18

/**
 * 地点与薪资两块之间的间距(px)。
 */
export const OG_JOB_META_GAP = 24

/**
 * 地点薪资那一行距公司名的上边距(px)。
 */
export const OG_JOB_META_TOP = 14

/**
 * 地点与薪资的字号(px)。
 */
export const OG_JOB_META_SIZE = 28

/**
 * 信号胶囊(PNP-eligible / TEER n)之间的间距(px)。
 */
export const OG_JOB_CHIP_GAP = 12

/**
 * 信号胶囊那一行距地点薪资行的上边距(px)。
 */
export const OG_JOB_CHIP_TOP = 22

/**
 * 信号胶囊的字号(px)。
 */
export const OG_JOB_CHIP_SIZE = 24

/**
 * 页脚距上方分隔线的内衬(px)。
 */
export const OG_JOB_FOOT_TOP = 22

/**
 * 页脚两行小字的字号(px)。
 */
export const OG_JOB_FOOT_SIZE = 24

/**
 * 元数据图的画布尺寸对象(壳里 `export const size = OG_SIZE` 一行转发 ——
 * 导出名是 Next 定的,值住域;实核过 next-metadata-image-loader 是真 import 再读,
 * 引用安全)。
 */
export const OG_SIZE = {
  /**
   * 画布宽(px)。
   */
  width: OG_W,

  /**
   * 画布高(px)。
   */
  height: OG_H,
}

/**
 * 元数据图的 MIME(壳里 contentType 转发)。
 */
export const OG_TYPE = 'image/png'

/**
 * 站点通用卡的替代文本(壳里 alt 转发;读屏与图挂时的兜底文案)。
 */
export const OG_SITE_ALT = 'Offer2PR — Canadian jobs with immigration signals'

/**
 * 职位卡的替代文本。
 */
export const OG_JOB_ALT = 'Job posting on Offer2PR'

/**
 * 万图壳的分发件名:站点通用卡(2026-08-30 og 归目录批,Frank「这个也能抽成目录吗/
 * 全修了」:两个 opengraph-image.tsx 约定件退役,分享图与 sitemap 同款 —— 对外
 * /og/ 一个前缀、app/og/[file]/route.ts 一个壳;og:image 标签改由 metadata 显式指图,
 * 微信/Google 每次分享现抓页面读 meta,换址零损失)。
 */
export const OG_FILE_SITE = 'site.png'

/**
 * 职位卡件名形(具名捕获组 n = 岗位号)。
 */
export const OG_JOB_FILE_RE = /^job-(?<n>\d+)\.png$/

/**
 * URL 路径段分隔符(壳取末段件名用;与 seo 域同名同义,各家一份)。
 */
export const OG_PATH_SEP = '/'

/**
 * 件名不合形的收场码(HTTP 404)。
 */
export const OG_NOT_FOUND = 404

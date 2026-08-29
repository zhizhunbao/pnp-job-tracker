/**
 * shell 域的死值。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 拼 className 时各类之间的分隔符。HTML 的 class 属性按**空白**切词,一个空格就是
 * 一次分隔 —— 基座类与上/下内衬档的修饰类靠它连起来,写错不会报错,只会让正文轨
 * 掉回没有内衬的裸样式。
 */
export const CLS_SEP = ' '

/**
 * #135 品牌词 SEO:WebSite/Organization JSON-LD 帮 Google 建品牌实体,
 * alternateName 收「offer to pr」分词形态。整站骨架(app/(frontend)/layout.tsx)
 * 把它塞进 `<head>` 的 ld+json 脚本;2026-08-29 形制批自那份门里下沉到本桶。
 */
export const SITE_JSON_LD = [
  {
    /**
     * schema.org 词表(所有 JSON-LD 节点都得声明,漏了 Google 不解析)。
     */
    '@context': 'https://schema.org',

    /**
     * 节点类型:站点本身。
     */
    '@type': 'WebSite',

    /**
     * 品牌正名。
     */
    name: 'Offer2PR',

    /**
     * 品牌词的分词形态:用户搜「offer to pr」也要收得住。
     */
    alternateName: ['offer to pr', 'offer 2 pr', 'Offer to PR'],

    /**
     * 站点首页(正式域,见 metadataBase 那条:容器内的 HOST 不能信)。
     */
    url: 'https://offer2pr.com',
  },
  {
    /**
     * schema.org 词表(同上)。
     */
    '@context': 'https://schema.org',

    /**
     * 节点类型:运营这个站的组织。
     */
    '@type': 'Organization',

    /**
     * 组织名,与站点同名。
     */
    name: 'Offer2PR',

    /**
     * 组织主页。
     */
    url: 'https://offer2pr.com',
  },
]

/**
 * timeline 域(政策时间线页)的死值:版式档、二级导航与站内地址、事件的三种类型、
 * 筛选的三个未选态、节奏卡与事件行上的记号。
 * 2026-08-28 换装批自 Timeline.tsx 的散值收拢挂注释(值一个不改)。
 * 2026-10-03 资讯页签四分(页签改叫「抽选」):政策公告撤出时间线、类型筛撤,事件类型只剩省通告要认(KIND_NOTICE);
 * 抽选 / 政策两种类型、站内动态地址头、重要徽标两格随之撤,圆点不再分两档(拼类名的分隔符撤)。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */

/**
 * 正文轨的上内衬档(px;列表页统一 16 —— 与 /news 同一档,两页互为切换,
 * 上距对不齐会在切页时看见页面跳一下)。
 */
export const SHELL_TOP = 16

/**
 * 页头 banner 的模块档:时间线与 /news 同属「移民动态」模块,共用它的配色与图组
 * (2026-07-31 banner 统一批定的档,不为二级页发明新模块)。
 */
export const BANNER_MODULE = 'news'

/**
 * 二级 tab 条的模块色档(teal 青 = 移民动态模块)。
 */
export const TABS_TONE = 'teal'

/**
 * 二级 tab 条里「最新公告」的去处(2026-07-19 Frank 批提案:统一二级 tab 条,
 * 与 /news 互为切换)。
 */
export const URL_NEWS = '/news'

/**
 * 二级 tab 条里「时间线」的去处(= 当前页,渲成不可点的当前页签;2026-10-03 页签改叫「抽选」)。
 */
export const URL_TIMELINE = '/timeline'

/**
 * 二级 tab 条里「通道与门槛」的去处(2026-09-30 通道与门槛批 2:资讯第三个页签;2026-10-03 页签改叫「通道」)。
 */
export const URL_STREAMS = '/streams'

/**
 * 二级 tab 条里「申请步骤」的去处(2026-10-03 资讯页签四分:申请步骤从「通道」页拆出,资讯第四个页签)。
 */
export const URL_STEPS = '/steps'

/**
 * 事件流那一段的锚点 id:节奏卡点一下要把页面滚到这里,取元素时用的是同一个词
 * (id 与取元素的字符串对不上是**静默失效** —— 点了卡片页面纹丝不动,不报错)。
 */
export const EVENTS_ANCHOR_ID = 'tl-events'

/**
 * 滚到事件流那一段的滚法:平滑滚 —— 用户看得见页面在动,才知道点卡片是把下面那段
 * 筛过了,而不是瞬移到一个陌生位置。
 */
export const SCROLL_SMOOTH = 'smooth'

/**
 * 「全部 / 没有」的空文本:三个筛选的未选态都是它,联邦事件的省码也是它
 * (事件的省码为空 = 联邦发的,不是「省份没记」)。
 */
export const TEXT_NONE = ''

/**
 * 省筛选里的联邦档。它不是省码 —— 联邦事件的省码是空串,而空串在筛选里已经占着
 * 「全部」,所以联邦这一档要有自己的词。
 */
export const PROV_FED = 'FED'

/**
 * 事件类型:省通告(标题一律走 i18n 的固定说法,真正的内容在 note 里)。
 */
export const KIND_NOTICE = 'notice'

/**
 * 联邦 EE 的分制名。两处用它:EE 节奏卡的分制小注;抽选行的分数后面**只在分制不是
 * CRS 时**才标注分制(诚实红线:省分数不是 CRS,不标会被当成 CRS 分读)。
 */
export const SCALE_CRS = 'CRS'

/**
 * 抽选行 unit 格:从 EOI 池选中的人(etl/pnp 落盘门按官方原句逐行判好;这种行的人数写「入选」)。
 * 2026-09-30 Frank「把脉页那几处 NS 也改成读数据吧」:原为 DRAW_SELECT_PROVS = new Set(['NS'])(按省名认),改认数据层的 unit 格,与省提名弹框
 *(components/pnp 的 UNIT_SELECTION,2026-09-29)同一个判法。
 * 原注:「官方口径是「从 EOI 池里选取」而不是「发邀请」的省:这些省的抽选人数写「入选」(2026-09-26 lead 定)。
 * NS 出处 liveinnovascotia.com/eoi-selection 原句「Nova Scotia selected the following number of candidates from the
 * Expression of Interest (EOI) pool during the months noted below」。与 components/pnp 的 DRAW_SELECT_PROVS 同值(各域一份)。」
 */
export const UNIT_SELECTION = 'selection'

/**
 * EE 节奏卡的联邦标文字(类别名本身已经是人话名,标上只留项目缩写)。
 */
export const TAG_EE = 'EE'

/**
 * 分制小注的开头(分数后面空一格再起括号 —— 那一格空格是分数与小注的间距,
 * 由这个词带着,不靠样式挤)。
 */
export const SCALE_NOTE_OPEN = ' ('

/**
 * 分制小注的收尾。
 */
export const SCALE_NOTE_CLOSE = ')'

/**
 * 省/地区标的变体档(标签说「这是哪个省」,不可点)。
 */
export const TAG_REGION = 'region'

/**
 * 联邦标的变体档。
 */
export const TAG_FEDERAL = 'federal'

/**
 * 节奏卡的钮底座(2026-08-26 Frank「<button 这种不允许直接使用」—— 整卡可点的东西
 * 一律经 button 族):ghost 底最素,卡的长相全由本域的加倍类定形;换成真按钮后
 * 原先手搓的 role/tabIndex/回车空格键盘手柄一并退役,键盘可达由标签自己保证。
 */
export const CARD_BTN_KIND = 'ghost'

/**
 * 省筛药丸的文案键头(拼上省码取省全名)。全站的 i18n 键只有这一处要拼,
 * 所以它得有个名字 —— 拼错是取不到词,不是报错。
 */
export const PROV_KEY_HEAD = 'pr.'

/**
 * 节奏卡上两截统计(最近一期 / 距今多少天)之间的记号。全站禁「·」杂糅多信息那条
 * 说的是**多条并列信息**,这里两截是同一件事的两个读法,换行反而读不成一句;
 * 2026-08-28 换装批原样保留,值一个不改。
 */
export const META_SEP = ' · '

/**
 * 流筛药丸上的撤销记号(点它取消节奏卡带入的流过滤,回到该省该类型的全部事件)。
 */
export const CHIP_CLEAR = ' ✕'

/**
 * 这页的 SEO 头(时间线是全站唯一一处把省抽选、联邦 EE 抽选与官方政策公告排在一条轴上的页面,
 * 描述里把这三路与「历史统计、不预测」的口径一并说清)。
 * 住这里而不是页面门里:门里不留死值常量,页面门只 `export const metadata = TIMELINE_META`
 * 一行转发(2026-08-29 Frank「框架导出的内容也一律来自桶」,形照 start 的 START_META;
 * 原先那个 generateMetadata 无参、返回死值,改成常量形)。
 * 2026-10-03 资讯页签四分:政策公告撤出本页,标题与摘要里「policy updates / 官方政策公告」那一路随之删,只说两路抽选。
 */
export const TIMELINE_META = {
  /**
   * 浏览器标签与搜索结果标题。
   */
  title: 'Canada PNP and Express Entry draw timeline | Offer2PR',

  /**
   * 搜索结果摘要(英文优先 —— 88% 流量来自 Google;中文一句压在后面)。
   * 「Historical facts with sources, no predictions」是本页的口径承诺:只排历史事实,
   * 不预测下一次抽选 —— 删了这半句就等于默许读者拿它当预测看。
   */
  description:
    'One timeline of provincial nominee draws (BC/AB/MB, with provincial scales) and federal Express Entry'
    + ' category draws across Canada — with draw cadence stats'
    + ' (days since last draw, average interval). Historical facts with sources, no predictions.'
    + ' 加拿大移民抽选时间线:省抽选+联邦 EE 抽选,含抽选节奏统计。',
}

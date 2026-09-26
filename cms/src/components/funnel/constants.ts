/**
 * funnel 域(/funnel 转化漏斗内部看板)的死值:步骤显示名表、表头文案、尾行与三条注的话,
 * 以及返回钮的落点与变体档。文案只有中文 —— 这页只给 Frank 看,不是产品页面,翻三语是浪费
 * (所以不走 lib/i18n)。
 * 2026-08-27 换装批自 Funnel.tsx 与 funnel/page.tsx 的散值收拢挂注释,值一个不改。
 * 2026-09-03 返回钮那三格(上面这句里说的「返回钮的落点与变体档」)撤编,理由压在
 * SUBTITLE_TEXT 的 JSDoc 里。
 * 2026-09-26 /fe Frank 撤两条死链:锁区按入口那行的引子与 ② 的脚注随步骤退役,理由压在 STEP_LABEL 的 JSDoc 里。
 *
 * @author Frank
 * @time 2026-08-27 03:00:00
 */

/**
 * 漏斗步骤名 → 看板上的显示名。键与 lib/funnel 的 FUNNEL_STEPS 同一套。
 * 前五个带圈码的是旧形态那条链(详情页 → 报告 → 锁区曝光 → 定价 → 付费);
 * 对话形态与雇主线是并行链,不接在上面五步后面;
 * PR 评估形态是 2026-08-11 补的埋点 —— 先前这页一条数都没有。
 * 表里查不到的步骤名照原样显示(不掩盖新埋点没起名这件事)。
 * 2026-09-26 /fe Frank:② 出报告(报告态真渲染,点击不算)、③ 锁区被看到(付费墙曝光)与对话三步
 * (打开挂件 —— 当时全站唯一对话入口 / 拿到带出处的答复 / 赞踩,点踩 = 数据缺口报警器)随白名单撤出:
 * 触发点早没了(报告与锁区入口 08-04 摘净,挂件 09-23 摘下),30 天零计数白占五行;库里历史行一条未删。
 * 剩下的圈码不重排(① ④ ⑤ ⑥ 与历史截图、STATUS 里的读数对得上)。尾部新增转化四计数,只计数不成链。
 * 同批退役的死值(理由留档):STEP_REPORT_OPEN(② 不给「比上一步」的特判,判据原文仍在 functions 的 rateOf)、
 * STEP_LOCK_SEEN 与 ENTRY_HEAD_TEXT(锁区曝光按入口那一行:详情页 jd 与报告页 rpt 是两条路,M3 分叉时
 * 得知道该改哪一条 —— 两条路都已不在)、RATE_NOTE_TEXT(② 那一格为什么空着的脚注,与 STEP_REPORT_OPEN
 * 是同一件事的两面)。
 */
export const STEP_LABEL: Record<string, string> = {
  /**
   * 第一步:打开职位详情页。
   */
  'jd-open': '① 打开职位详情',

  /**
   * 第四步:打开定价页。
   */
  'pricing-open': '④ 打开定价',

  /**
   * 第五步:点了付费钮(点击不是钱,真付费看尾行的 proUntil)。
   */
  'pay-click': '⑤ 点了付费',

  /**
   * 雇主线分母:PNP 弹框打开。
   */
  'modal-pnp': '雇主 · PNP 弹框',

  /**
   * 雇主线分子:点了「该公司在招职位」。
   */
  'pnp-employer-click': '雇主 · 点在招职位',

  /**
   * 把脉页橱窗点雇主名(只作参照,来源不同,不进雇主线转化率)。
   */
  'se-view-jobs': '把脉 · 点雇主名',

  /**
   * PR 评估链第一步:打开评估页。
   */
  'dp-open': 'PR · 打开评估页',

  /**
   * PR 评估链第二步:答完 6 项基础卷。
   */
  'dp-quiz-done': 'PR · 答完 6 项',

  /**
   * PR 评估链第三步:进入估分。
   */
  'dp-score-start': 'PR · 进入估分',

  /**
   * PR 评估链第四步:估分答完。
   */
  'dp-score-done': 'PR · 估分答完',

  /**
   * 雇主板搜索框落词(2026-09-04 补的四个计数;不是链,不算相邻转化率)。
   */
  'emp-search': '雇主板 · 搜索',

  /**
   * 雇主板换了一格筛选(分组值是哪一格,不是选了什么值)。
   */
  'emp-filter': '雇主板 · 换筛选',

  /**
   * 雇主板点雇主名去看在招岗。
   */
  'emp-row': '雇主板 · 点雇主名',

  /**
   * 雇主板翻页。
   */
  'emp-page': '雇主板 · 翻页',

  /**
   * 把脉页滚到了某一段(2026-09-10 /fe 省份批收口补的三个计数;不是链,不算相邻转化率;
   * kind = 段锚点 id,如 pl-prov / pl-pr)。
   */
  'pulse-sec': '把脉 · 滚到段',

  /**
   * 把脉页点了二级导航子项胶囊(kind = 目标锚点 id)。
   */
  'pulse-subnav': '把脉 · 点子导航',

  /**
   * 把脉页切了序列表的视图或年窗(kind = table / chart / recent / more / all)。
   */
  'pulse-series': '把脉 · 切表图年窗',

  /**
   * 从城市段落去职位板(2026-09-11 城市段重设计批;kind = main / industry / pilot / dli / search,
   * 只计数不成链,城市名永不进 kind)。
   */
  'city-open': '把脉 · 城市落板',

  /**
   * 投递(2026-09-26 /fe 转化四计数;kind = 投递方式 email / web)。
   */
  'apply': '转化 · 投递',

  /**
   * 邮箱注册成功(不分组)。
   */
  'signup': '转化 · 注册成功',

  /**
   * 发起 Stripe Checkout(kind = 档位;点击不是钱,真付费看尾行)。
   */
  'checkout': '转化 · 发起付款',

  /**
   * 账户页周报开关(kind = true 订阅 / false 退订)。
   */
  'weekly-optin': '转化 · 周报开关',
}

/**
 * 打开定价那一步的步骤名(按来路分组那一行读它)。
 */
export const STEP_PRICING_OPEN = 'pricing-open'

/**
 * 步骤名列的列身份。
 */
export const COL_STEP_KEY = 'label'

/**
 * 步骤名列的列名。
 */
export const COL_STEP_TEXT = '步骤'

/**
 * 近 30 天计数列的列身份(= SQL 的列名,也是事实行上那一格的键与时间窗档)。
 */
export const COL_D30_KEY = 'd30'

/**
 * 近 30 天计数列的列名。
 */
export const COL_D30_TEXT = '30 天'

/**
 * 近 7 天计数列的列身份(= SQL 的列名,也是事实行上那一格的键与时间窗档)。
 */
export const COL_D7_KEY = 'd7'

/**
 * 近 7 天计数列的列名。
 */
export const COL_D7_TEXT = '7 天'

/**
 * 昨天计数列的列身份(= SQL 的列名,也是事实行上那一格的键与时间窗档)。
 */
export const COL_D1_KEY = 'd1'

/**
 * 昨天计数列的列名。
 */
export const COL_D1_TEXT = '昨天'

/**
 * 相邻转化率列的列身份。
 */
export const COL_RATE_KEY = 'rate'

/**
 * 相邻转化率列的列名。
 */
export const COL_RATE_TEXT = '比上一步'

/**
 * 数字列的对齐档(表格域的两档之一)。
 */
export const ALIGN_RIGHT = 'right'

/**
 * 转化率没有分母时那一格的字(不许出 0% 或 NaN —— 那是把「没数据」说成「转化率为零」)。
 */
export const RATE_NONE = '—'

/**
 * 转化率数值后面的百分号。
 */
export const RATE_SUFFIX = '%'

/**
 * 尾行第一格的字(⑥ 接在表里五步之后,但它不是埋点事件,所以走 foot 槽不进列模型)。
 */
export const PAY_LABEL_TEXT = '⑥ 真实付费'

/**
 * 尾行第三格说明的前半段(补在 Stripe 人数前面)。
 */
export const PAY_NOTE_HEAD = 'proUntil 有值;其中走过 Checkout 的 '

/**
 * 尾行第三格说明的后半段(补在 Stripe 人数后面)。
 */
export const PAY_NOTE_TAIL = ' 人'

/**
 * 尾行第三格横跨的列数(步骤/30 天两格之后,剩下 7 天/昨天/比上一步 三列并成一格)。
 */
export const PAY_NOTE_SPAN = 3

/**
 * 打开定价分组行的引子(报告锁区 CTA 带 `?from=rpt-<卡>`,其余算直达 ——
 * 报告到底卖不卖得动就看这一行)。
 */
export const PRICING_HEAD_TEXT = '打开定价按来路(30 天):'

/**
 * 分组行里「来路名」与「次数」之间的间隔(全站禁「·」杂糅,这里是一条信息的两截)。
 */
export const PROP_GAP = ' '

/**
 * 拼两个类名时它们之间的那个空格(className 是空格分隔的串)。
 */
export const CLS_SEP = ' '

/**
 * 「没有」的空文本:维度串缺席时的值,分组行据它把没有维度的行排除在外。
 * 与 companies/cases 域同名同义,各家一份。
 */
export const TEXT_NONE = ''

/**
 * 真实付费查不到行时的那一格(表还没建 → 空页面照常渲染,不 500)。
 * 🔴 这里折 0 是正当的:两个数都是**计数**,「一个都没有」本身就是答案,不是替谁编数。
 */
export const PAY_NONE = {
  /**
   * proUntil 有值的用户数。
   */
  pro: 0,

  /**
   * 其中真走过 Checkout 的用户数。
   */
  stripe: 0,
}

/**
 * 一条计数都没有时的提示(表刚建好,或事件还没打到生产 —— 两种都不是错误,所以不报错)。
 */
export const EMPTY_TEXT = '还没有任何计数 —— 表刚建好,或事件还没打到生产。'

/**
 * 整页标题。
 */
export const TITLE_TEXT = '漏斗五个数'

/**
 * 标题下的小注(第一方计数,不受广告拦截器影响;转化率按 30 天合计)。
 * 旁边原有右上返回钮的三格死值(BACK_TEXT '返回'、URL_HOME '/' = 无历史可回时的落点、
 * PLAIN_BTN_KIND 'ghost' = 定制样式钮的统一底座,2026-08-26 Frank「<button 这种不允许
 * 直接使用」的产物),2026-09-03 撤编:Frank「所有主页面都不应该有返回按钮」;
 * 那条「裸 <button> 一律改经 button 族」的规矩仍然有效,只是这页已经没有钮了。
 */
export const SUBTITLE_TEXT = '第一方计数,不受广告拦截器影响;转化率按 30 天合计'

/**
 * 看得见这一页的角色码(users.role 里的值)。🔴 只有 admin 看得见,其余一律 notFound()
 * —— 不是隐藏,是**不存在**(转化数据不该对外)。所以这一格是**门禁**不是显示值:
 * 拼错一个字母不会报错,只会把整页对所有人关上(或者更糟,对所有人打开)。
 * lib/quota 里没有同义常量(那域只管 Pro 与配额,不认角色),本域自己声明一份。
 */
export const ROLE_ADMIN = 'admin'

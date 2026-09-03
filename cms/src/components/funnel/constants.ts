/**
 * funnel 域(/funnel 转化漏斗内部看板)的死值:步骤显示名表、表头文案、尾行与三条注的话,
 * 以及返回钮的落点与变体档。文案只有中文 —— 这页只给 Frank 看,不是产品页面,翻三语是浪费
 * (所以不走 lib/i18n)。
 * 2026-08-27 换装批自 Funnel.tsx 与 funnel/page.tsx 的散值收拢挂注释,值一个不改。
 * 2026-09-03 返回钮那三格(上面这句里说的「返回钮的落点与变体档」)撤编,理由压在
 * SUBTITLE_TEXT 的 JSDoc 里。
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
 */
export const STEP_LABEL: Record<string, string> = {
  /**
   * 第一步:打开职位详情页。
   */
  'jd-open': '① 打开职位详情',

  /**
   * 第二步:报告态真渲染(点击不算,见 lib/funnel 的 ALIAS 注释)。
   */
  'report-open': '② 出报告',

  /**
   * 第三步:锁区(付费墙)被看到。
   */
  'lock-seen': '③ 锁区被看到',

  /**
   * 第四步:打开定价页。
   */
  'pricing-open': '④ 打开定价',

  /**
   * 第五步:点了付费钮(点击不是钱,真付费看尾行的 proUntil)。
   */
  'pay-click': '⑤ 点了付费',

  /**
   * 对话链第一步:打开对话挂件(全站唯一对话入口)。
   */
  'chat-open': '对话 · 打开挂件',

  /**
   * 对话链第二步:拿到带出处的答复。
   */
  'chat-answer': '对话 · 拿到答复',

  /**
   * 对话链第三步:赞踩反馈(点踩 = 数据缺口报警器)。
   */
  'chat-feedback': '对话 · 赞踩',

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
}

/**
 * 「② 不给比上一步」那一条判定要认的步骤名(2026-08-03 第一次读这张表就撞到:
 * ① 8 次、② 16 次 = 200%)。职位详情页**不是**报告的唯一来路 —— 首页 CTA 直接进
 * /plan/pr 的占了绝大多数(实测 16 里 12 条是 pr 卡),拿 ① 当 ② 的分母算出来的百分比
 * 没有意义。③④⑤ 是真父子关系,照旧给。
 */
export const STEP_REPORT_OPEN = 'report-open'

/**
 * 锁区曝光那一步的步骤名(按入口分组那一行读它)。
 */
export const STEP_LOCK_SEEN = 'lock-seen'

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
 * 锁区曝光分组行的引子(要能按入口分开看:详情页 jd 与报告页 rpt 是两条路,
 * M3 分叉时得知道该改哪一条)。
 */
export const ENTRY_HEAD_TEXT = '锁区曝光按入口(30 天):'

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
 * 「② 那一格为什么空着」的脚注(与上面 STEP_REPORT_OPEN 的判定是同一件事的两面:
 * 一面是代码不算,一面是当面告诉读表的人为什么不算)。
 */
export const RATE_NOTE_TEXT = '② 不给「比上一步」:详情页不是报告的唯一来路(首页 CTA 直接进 /plan/pr),① 不是它的分母。'

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

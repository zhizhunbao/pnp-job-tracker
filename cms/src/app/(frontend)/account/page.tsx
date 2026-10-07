'use client'
/**
 * 账户状态页(E3-02):仅已登录态(Pro 到期/档案/购买/登出;Stripe 回跳落点)。
 * 登录入口全站只有一个 = /jobs 顶栏弹框(用户定):未登录访问本页 → 跳回 /jobs?login=1 自动弹框。
 * E3-03:时长包购买入口(30/90 天)—— 前端只拿 Checkout URL 跳转,回跳 ?ok=1 提示(到期日由 webhook 拨)。
 *
 * 2026-08-26:页面改造成「纯拼装门」(闸 local/page-compose-only)—— 排版全部下沉进
 * components/account/;同日 Frank 实拍「还是有一堆函数啊」再收一刀(闸 local/page-no-logic):
 * state/effect/handler 也全部收进 components/account/hooks.ts 的 useAccountPage,
 * 门里只剩一行 hook + 大写组件的拼装;注释一并收 JSDoc 形(闸 local/jsdoc-comments-only)。
 *
 * 2026-08-28:骨架收编进全站标准形 —— 外框 Frame + 正文轨 Shell(2026-07-18 Frank
 * 「每个页面的宽度应该是一样的」),本页专属的 860 读宽 AccountColumns 作为窄读列
 * 住进壳内(2026-07-31「窄读列放壳内」)。原 AccountShell 退役,渐变底先暂存
 * AccountTint 候选层;2026-08-28 Frank 拍板全站灰(渐变与灰亮度差不足 2%,
 * 留渐变只多一个特例),该件同日删除,底色归 Frame 的 var(--bg) 一处。
 * 上下留白由 Shell 的 top/bottom 档接手(各 40px = 原 AccountColumns 的 2.5rem),
 * 左右安全边由正文轨的 1.25rem 接手。
 *
 * 节槽注记(原散在 JSX 里的决策记录,收拢于此):
 * · 顶栏/页脚:全站共享(2026-07-16 用户拍板统一 header/footer);账户在本页为当前态不再链自己。
 * · 答题条件条(AnswersRow)2026-08-04 摘除:整条蓝条的存在意义就是把人送去 /plan/job
 *   (看结果 / 去答题),而答题卡功能已摘入口、只保留路由。档案节现在直接是 ProfileForm + 简历存档。
 * · profile 节:移民档案(E5-00)= 匹配层输入,key 按 id 防换号残留;
 *   简历存档(E11-08)能看能删是能存的前提,与「存」同批上线。
 * · favs / sjobs 节:已保存筛选(E5-03)= 邮件提醒管理;我的收藏(#62A)是同一收藏数据的
 *   纯列表视图,独立成节。
 * · buy 节:时长包购买(E3-03),Pro 也可续买,到期日顺延。
 * · 未登录:回首页弹登录框(不渲染独立登录页)。
 *
 * 2026-09-23 Frank:「只保留一个 我的简历 我的收藏 我的求职 其他的能删都删了」(起因:他截图说
 * 移民档案节「基本上是完全没法用」)。撤掉四节:概览 overview、移民档案 profile、
 * 已保存的筛选 saved、升级 Pro buy —— 上面节槽注记里 profile 节与 buy 节两条、favs 条里的
 * 已保存筛选半句,自此只是历史。侧栏只剩 我的简历 resume(默认落点)、我的收藏 favs、
 * 我的求职 sjobs 三节;简历存档 ResumeArchive 原样挪进「我的简历」节;Stripe 回跳 `?ok=1`
 * 的成功提示原住概览节顶上,抽成 PayOkNotice 挂在右列内容最上面(三节都出)。
 * 旧深链 `?sec=overview|profile|saved|buy` 不在节表里,落回默认节。
 * 2026-10-04 Frank「升级 Pro 这个删了,放到 我的 模块里,加一个我的订阅」:末尾加回一节「我的订阅」(sub),
 * 账户下拉的「升级 Pro」挪进来 —— 当前套餐 + 升级 / 续买,钮打开全站同一个定价框。
 * 2026-10-05 Frank「先做我的简历吧」:「我的简历」节的简历文字存档 ResumeArchive 退役,换成原件卡片 ResumeFile
 * (上传 / 预览 / 替换 / 下载 / 删除 + PDF 首页缩略图;自己拉元信息,不再吃 me.profile 的两格)。
 * 2026-10-06 Frank「先做我的求职」「也重新改一下」:「我的求职」「我的收藏」两节换成 myjobs 桶的两张表
 * (AppliedList / SavedList,通用 Table、手机职位卡);周报开关 WeeklyOptin 随定稿拼在收藏表下面,原 SavedJobsList 撤。
 *
 * @author Frank
 * @time 2026-07-02 00:00:00
 */
import { AppliedList, SavedList } from '@/components/myjobs'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import {
  AccountBanner,
  AccountColumns,
  AccountNav,
  AccountRedirect,
  PayOkNotice,
  ResumeFile,
  Subscription,
  SEC_FAVS,
  SEC_RESUME,
  SEC_SJOBS,
  SEC_SUB,
  SHELL_BOTTOM,
  SHELL_TOP,
  useAccountPage,
  WeeklyOptin,
} from '@/components/account'
import { Frame, Shell } from '@/components/shell'

/**
 * 账户页的门:一行状态机器 + 大写组件的拼装,没有别的。
 *
 * @returns 整页。
 */
export default function AccountPage() {
  const a = useAccountPage()
  return (
    <Frame>
      <Header />

      <Shell top={SHELL_TOP} bottom={SHELL_BOTTOM}>
        <AccountBanner t={a.t} />
        {a.checked && a.me != null && (
          <AccountColumns
            nav={<AccountNav sec={a.sec} t={a.t} onPick={a.onPick} />}>
            {a.payOk && <PayOkNotice t={a.t} />}
            {a.sec === SEC_RESUME && <ResumeFile t={a.t} />}
            {a.sec === SEC_FAVS && <SavedList t={a.t} plan={a.plan} />}
            {a.sec === SEC_FAVS && <WeeklyOptin t={a.t} userId={a.me.id} weeklyOptOut={!!(a.me as { weeklyOptOut?: boolean }).weeklyOptOut} />}
            {a.sec === SEC_SJOBS && <AppliedList t={a.t} plan={a.plan} />}
            {a.sec === SEC_SUB && <Subscription t={a.t} until={a.me.proUntil} />}
          </AccountColumns>
        )}
        {a.checked && a.me == null && <AccountRedirect />}
      </Shell>

      <Footer />
    </Frame>
  )
}

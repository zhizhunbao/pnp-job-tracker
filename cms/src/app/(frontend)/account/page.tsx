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
 * @author Frank
 * @time 2026-07-02 00:00:00
 */
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import {
  AccountBuyPanel,
  AccountColumns,
  AccountNav,
  AccountOverview,
  AccountRedirect,
  ResumeArchive,
  SavedJobsList,
  SavedSearchList,
  SHELL_BOTTOM,
  SHELL_TOP,
  useAccountPage,
} from '@/components/account'
import { ProfileForm } from '@/components/profile'
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
      <Header active="account" />

      <Shell top={SHELL_TOP} bottom={SHELL_BOTTOM}>
        {a.checked && a.me != null && (
          <AccountColumns narrow={a.narrow}
            nav={<AccountNav sec={a.sec} narrow={a.narrow} t={a.t} onPick={a.onPick} onLogout={a.onLogout} />}>
            {a.sec === 'overview' && (
              <AccountOverview me={a.me}
                pro={a.pro}
                payOk={a.payOk}
                nick={a.nick}
                nickBusy={a.nickBusy}
                t={a.t}
                onNickEdit={a.onNickEdit}
                onNickChange={a.onNickChange}
                onNickSave={a.onNickSave}
                onNickKey={a.onNickKey} />
            )}
            {a.sec === 'profile' && (<>
              <ProfileForm key={String(a.me.id)} t={a.t} userId={a.me.id} initial={a.me.profile ?? null} />
              <ResumeArchive key={'ra' + String(a.me.id)} t={a.t} userId={a.me.id} text={a.me.profile?.resumeText} savedAt={a.me.profile?.resumeSavedAt} />
            </>)}
            {a.sec === 'favs' && <SavedJobsList t={a.t} variant="favs" />}
            {a.sec === 'sjobs' && <SavedJobsList t={a.t} userId={a.me.id} weeklyOptOut={!!(a.me as { weeklyOptOut?: boolean }).weeklyOptOut} />}
            {a.sec === 'saved' && <SavedSearchList t={a.t} />}
            {a.sec === 'buy' && <AccountBuyPanel t={a.t} buying={a.buying} buyErr={a.buyErr} onBuy={a.onBuy} />}
          </AccountColumns>
        )}
        {a.checked && a.me == null && <AccountRedirect />}
      </Shell>

      <Footer />
    </Frame>
  )
}

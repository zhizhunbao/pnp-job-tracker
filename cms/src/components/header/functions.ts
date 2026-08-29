/**
 * header 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */
import {
  ACCT_IN, ACCT_OUT, AUTH_CLOSED, AUTH_LOGIN, AUTH_REGISTER, EMAIL_UNKNOWN, PATH_ACTIVE, PATH_SEP,
} from './constants'
import type {
  ActiveKey,
  AccountLiteHandlesIn, AccountLiteHandlesOut, AcctState, AcctUser, ClickFn, DrawerHandlesIn, DrawerHandlesOut,
  GroupClickIn, GroupToggleFn, GroupToggleIn, LangPickIn, MeJson, WithOnIn,
  SsrSeed,
} from './types'
import css from './header.module.css'

/**
 * 类名 + 当前态:亮就叠 .on 修饰类。样式在 css,tsx 里只剩「这一项亮不亮」的布尔,
 * 不再逐属性写三元(前身是 ui/cx —— 单消费者收回,再形制化成单参)。
 *
 * @param x 基类与开关。
 * @returns 拼好的 className。
 */
export function withOn(x: WithOnIn): string {
  if (x.on) {
    return `${x.base} ${css.on}`
  }
  return x.base
}

/**
 * 当前路径该亮哪盏导航灯(2026-08-29 Frank 拍板:高亮由 Header 按 pathname 自判,
 * 每页手填 active 的旧形退役)。按 PATH_ACTIVE 的顺序做前缀匹配,首条命中生效;
 * 不在表里的路径不亮灯。
 *
 * @param x 当前 pathname(usePathname 给的)。
 * @returns 高亮键;没灯给 null。
 */
export function activeOf(x: {
  /**
   * 当前路径(如 '/plan/pr')。
   */
  path: string
}): ActiveKey | null {
  for (const [head, key] of PATH_ACTIVE) {
    if (head === PATH_SEP) {
      if (x.path === PATH_SEP) {
        return key
      }
      continue
    }
    if (x.path === head || x.path.startsWith(head + PATH_SEP)) {
      return key
    }
  }
  return null
}

/**
 * 空身份壳(loading/out 态的 u)。
 *
 * @returns 四格全空的身份。
 */
export function emptyUser(): AcctUser {
  return { email: EMAIL_UNKNOWN, displayName: null, avatar: null, pro: false }
}

/**
 * 首帧种子 → 账户身份(SSR 直接有字母,头像不再等接口;pro 由到期日当场折)。
 *
 * @param s 首帧会话种子。
 * @returns 账户身份四格。
 */
export function seedUser(s: SsrSeed): AcctUser {
  return { email: s.email, displayName: s.displayName, avatar: s.avatar, pro: proOf(s.proUntil) }
}

/**
 * Pro 判定:到期日在此刻之后。
 *
 * @param proUntil 到期日(ISO 串);null/空 = 免费号。
 * @returns 是否 Pro。
 */
export function proOf(proUntil: string | null): boolean {
  if (proUntil == null || proUntil === '') {
    return false
  }
  return new Date(proUntil) > new Date()
}

/**
 * /api/users/me 响应 → 账户状态(有 email = 登录态并洗出四格;否则未登录)。
 *
 * @param d 接口响应。
 * @returns 账户状态。
 */
export function meToAcct(d: MeJson): AcctState {
  const u = d.user
  if (u == null || u.email == null || u.email === '') {
    return { state: ACCT_OUT, u: emptyUser() }
  }
  let displayName: string | null = null
  if (u.displayName != null) {
    displayName = u.displayName
  }
  let avatar: string | null = null
  if (u.avatar != null) {
    avatar = u.avatar
  }
  let proUntil: string | null = null
  if (u.proUntil != null) {
    proUntil = u.proUntil
  }
  return { state: ACCT_IN, u: { email: u.email, displayName, avatar, pro: proOf(proUntil) } }
}

/**
 * 登录弹框按需载(点开才下载那份 JS,手法同 ChatLauncher;header 常驻包不背它)。
 *
 * @returns AuthModal 组件模块。
 */
export function loadAuthModal() {
  return import('@/components/auth').then(pickAuthModal)
}

/**
 * 从 auth 桶里挑出 AuthModal(dynamic 的取件回调)。
 *
 * @param m auth 桶模块。
 * @returns AuthModal。
 */
// eslint-disable-next-line local/no-bare-strings -- 同上:`typeof import()` 的说明符是类型位,TS 只收字面量
function pickAuthModal(m: typeof import('@/components/auth')) {
  return m.AuthModal
}

/**
 * 造二级页账户区的六枚手柄(2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,
 * 自 AccountLite 体内迁出)。登录框与定价框两台开合机同属账户区这一处状态,
 * 一个工厂发齐 —— 拆成六个工厂只会把「谁在写哪一格」摊到六处。
 *
 * @param x 写认证框态与定价框开合的两枚 setter。
 * @returns 开登录 / 开注册 / 关认证 / 刷新 / 开定价 / 关定价 六枚具名手柄。
 */
export function makeAccountLiteHandles(x: AccountLiteHandlesIn): AccountLiteHandlesOut {
  function openLogin() {
    x.setAuth(AUTH_LOGIN)
  }

  function openRegister() {
    x.setAuth(AUTH_REGISTER)
  }

  function closeAuth() {
    x.setAuth(AUTH_CLOSED)
  }

  function reload() {
    window.location.reload()
  }

  function openPricing() {
    x.setPricing(true)
  }

  function closePricing() {
    x.setPricing(false)
  }

  return { openLogin, openRegister, closeAuth, reload, openPricing, closePricing }
}

/**
 * 造顶栏抽屉的开合两枚手柄(2026-08-26 同批,自 Header 体内迁出)。
 *
 * @param x 写抽屉开合的 setter。
 * @returns 开 / 关两枚具名手柄。
 */
export function makeDrawerHandles(x: DrawerHandlesIn): DrawerHandlesOut {
  function openDrawer() {
    x.setOpen(true)
  }

  function closeDrawer() {
    x.setOpen(false)
  }

  return { openDrawer, closeDrawer }
}

/**
 * 造抽屉分组的单开切换手柄(2026-08-26 同批,自 MobileDrawer 体内迁出)。
 * 再点已展开的那一组 = 收回「都收着」档。
 *
 * @param x 当前展开组键、收着档的键与写它的 setter。
 * @returns 挂到各组标题上的切换手柄(参数是被点的组键)。
 */
export function makeGroupToggle(x: GroupToggleIn): GroupToggleFn {
  function toggleGrp(key: string) {
    if (x.openKey === key) {
      x.setOpenKey(x.noneKey)
      return
    }
    x.setOpenKey(key)
  }

  return toggleGrp
}

/**
 * 造一个抽屉分组标题的点击手柄(2026-08-26 同批,自 DrawerGroup 体内迁出)。
 * 逐组手柄要闭包住自己那一格组键,走工厂形态。
 *
 * @param x 切换回调与这一组的身份键。
 * @returns 挂到组标题钮上的 onClick。
 */
export function makeGroupClick(x: GroupClickIn): ClickFn {
  function click() {
    x.onToggle(x.groupKey)
  }

  return click
}

/**
 * 造一枚语言钮的点击手柄(2026-08-26 同批,自 LangSwitch 的循环体内迁出)。
 * 逐枚手柄要闭包住自己那一格语言码,走工厂形态。
 *
 * @param x 换语言回调与这一枚钮的语言码。
 * @returns 挂到这枚钮上的 onClick。
 */
export function makeLangPick(x: LangPickIn): ClickFn {
  function pick() {
    x.setLang(x.code)
  }

  return pick
}

/**
 * 吃掉冒泡(抽屉面板自身的点击不该落到遮罩上关掉整个抽屉)。
 * 2026-08-26 同批,自 MobileDrawer 体内的 stop 迁出 —— 零闭包,不必造工厂。
 * 签名由 React 的事件手柄定死。
 *
 * @param e 点击事件。
 * @returns 无。
 */
export function stopClick(e: React.MouseEvent) {
  e.stopPropagation()
}

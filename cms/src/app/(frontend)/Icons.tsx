// 共享内联图标(全站唯一图标出口,替代 UI emoji;品牌枫叶除外)。
// lucide-react 线条风:stroke=currentColor 跟随文字颜色;这里统一 size="1em" 跟随字号 + 基线微下沉。
// 加图标 = 从 lucide-react 挑一个再包一行,调用点永远只 import 本文件。
import {
  ArrowUp, Check, ChartColumn, ChevronDown, CircleCheck, ClipboardList, Compass, Lock, Mail, Map as LMap, MapPin,
  Maximize, Medal, MessageCircle, Minimize, Minus, Newspaper, Paperclip, Rocket, RotateCcw, Save, Scale, Search, Settings, Square, Star, Target,
  ThumbsDown, ThumbsUp, TriangleAlert, User, Users, X,
  type LucideProps,
} from 'lucide-react'

const style = { verticalAlign: '-0.125em' } as const
const wrap = (C: React.ComponentType<LucideProps>) => {
  const Icon = (p: LucideProps) => <C size="1em" style={style} aria-hidden {...p} />
  return Icon
}

export const IconCheck = wrap(Check)          // 原 check
export const IconArrowUp = wrap(ArrowUp)      // 对话发送
export const IconCheckCircle = wrap(CircleCheck) // 原 check-circle
export const IconChart = wrap(ChartColumn)    // 原 chart
export const IconChat = wrap(MessageCircle)   // 右下角对话挂件的气泡钮(ChatLauncher)
export const IconChevronDown = wrap(ChevronDown) // 收起(挂件面板头)
export const IconClipboard = wrap(ClipboardList) // 原 clipboard
export const IconCompass = wrap(Compass)      // 原 compass
export const IconLock = wrap(Lock)            // 原 lock
export const IconMail = wrap(Mail)            // 原 mail
export const IconMap = wrap(LMap)             // 原 map
export const IconMapPin = wrap(MapPin)        // 原 map-pin
export const IconMaximize = wrap(Maximize)    // 原 maximize
export const IconMedal = wrap(Medal)          // 原 medal
export const IconMinimize = wrap(Minimize)    // 原 minimize
export const IconMinus = wrap(Minus)          // 窗口最小化
export const IconRefresh = wrap(RotateCcw)    // 对话重置(挂件头部,2026-08-06 Frank「重置两个字别扭」→ 图标化)
export const IconNews = wrap(Newspaper)       // 移民动态(E12-06)
export const IconPaperclip = wrap(Paperclip)  // 原 paperclip
export const IconRocket = wrap(Rocket)        // 开始规划(L1-01 landing 顶栏入口)
export const IconSave = wrap(Save)            // 原 save
export const IconScale = wrap(Scale)          // 原 scale
export const IconSearch = wrap(Search)        // 搜索
export const IconSettings = wrap(Settings)    // 原 settings
export const IconSquare = wrap(Square)        // 窗口全屏
export const IconStar = wrap(Star)            // 原 star
export const IconTarget = wrap(Target)        // 原 target
export const IconThumbUp = wrap(ThumbsUp)     // 答复反馈「有帮助」(ChatAnswer)
export const IconThumbDown = wrap(ThumbsDown) // 答复反馈「没帮助」—— 点踩=数据缺口报警器,不是装饰
export const IconUser = wrap(User)            // 原 user
export const IconUsers = wrap(Users)          // 雇主名录(B4-01)
export const IconWarn = wrap(TriangleAlert)   // 原 warn
export const IconX = wrap(X)                  // 原 x

// 共享内联图标(全站唯一图标出口,替代 UI emoji;品牌枫叶除外)。
// lucide-react 线条风:stroke=currentColor 跟随文字颜色;这里统一 size="1em" 跟随字号 + 基线微下沉。
// 加图标 = 从 lucide-react 挑一个再包一行,调用点永远只 import 本文件。
import {
  Check, ChartColumn, CircleCheck, ClipboardList, Compass, Lock, Mail, Map as LMap, MapPin,
  Maximize, Medal, Minimize, Newspaper, Paperclip, Save, Scale, Settings, Star, Target, TriangleAlert, User, X,
  type LucideProps,
} from 'lucide-react'

const style = { verticalAlign: '-0.125em' } as const
const wrap = (C: React.ComponentType<LucideProps>) => {
  const Icon = (p: LucideProps) => <C size="1em" style={style} aria-hidden {...p} />
  return Icon
}

export const IconCheck = wrap(Check)          // 原 check
export const IconCheckCircle = wrap(CircleCheck) // 原 check-circle
export const IconChart = wrap(ChartColumn)    // 原 chart
export const IconClipboard = wrap(ClipboardList) // 原 clipboard
export const IconCompass = wrap(Compass)      // 原 compass
export const IconLock = wrap(Lock)            // 原 lock
export const IconMail = wrap(Mail)            // 原 mail
export const IconMap = wrap(LMap)             // 原 map
export const IconMapPin = wrap(MapPin)        // 原 map-pin
export const IconMaximize = wrap(Maximize)    // 原 maximize
export const IconMedal = wrap(Medal)          // 原 medal
export const IconMinimize = wrap(Minimize)    // 原 minimize
export const IconNews = wrap(Newspaper)       // 移民动态(E12-06)
export const IconPaperclip = wrap(Paperclip)  // 原 paperclip
export const IconSave = wrap(Save)            // 原 save
export const IconScale = wrap(Scale)          // 原 scale
export const IconSettings = wrap(Settings)    // 原 settings
export const IconStar = wrap(Star)            // 原 star
export const IconTarget = wrap(Target)        // 原 target
export const IconUser = wrap(User)            // 原 user
export const IconWarn = wrap(TriangleAlert)   // 原 warn
export const IconX = wrap(X)                  // 原 x

// 根路径 → /jobs(产品主页)。原 Payload 模板欢迎页已删——公网访客不该看到脚手架页。
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/jobs')
}

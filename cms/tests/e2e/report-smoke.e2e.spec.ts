// 报告走查(2026-08-02 加):**真的从头答一遍,再把报告每一行读出来**。
//
// 为什么要有它:今天 Frank 一口气抓出三条,全是「只有走一遍才看得见」的 ——
//   ① 语言选「流利」,报告写「你报的 CLB 9」(档位→CLB 的映射是本站编的);
//   ② 总经验改成「没有」,报告写「你填的 30 个月」(与另一题矛盾时默默取大值);
//   ③ 职业 chip 先闪 5 位码再变成职业名。
// 而我改完只验了测试绿与 /api/report 的 JSON —— 这三条一条都逮不到。
//
// 它不做业务断言(那是 int 测试的活),只做**读得出来的错**:裸码、未翻译的 i18n 键、
// undefined/NaN、没被替换掉的 {占位符}。三语各走一遍。
import { test, expect, type Page } from '@playwright/test'

const CARDS = ['pr', 'job', 'career', 'province'] as const
const LANGS = ['zh', 'en', 'ko'] as const

// 报告正文里读得出来的错(一条都不该出现)
const SMELLS: { name: string; re: RegExp }[] = [
  { name: '未翻译的 i18n 键', re: /\b(rpt|plan|quiz|ps)\.[a-z][\w.]+/i },
  { name: 'undefined / NaN / null', re: /\b(undefined|NaN|null)\b/ },
  { name: '没替换的占位符', re: /\{\w+\}/ },
  // 裸 NOC 码:「NOC 31301」「31301 个」这类有上下文的放过,孤零零一个 5 位数不放过
  { name: '裸 5 位码', re: /(^|[\s(（])\d{5}([\s)）,，。;；]|$)/ },
]

async function answerAll(page: Page) {
  // 第 1 页=选职业:挑热门第一个
  const firstOcc = page.locator('button', { hasText: /在招|open/ }).first()
  if (await firstOcc.isVisible().catch(() => false)) await firstOcc.click()
  for (let i = 0; i < 12; i++) {
    const opt = page.locator('.plSurvey .sd-item').first()
    if (await opt.isVisible().catch(() => false)) { await opt.click(); await page.waitForTimeout(120) }
    const next = page.getByRole('button', { name: /下一题|Next|다음/ }).first()
    const done = page.getByRole('button', { name: /出报告|See my report|보고서 보기/ }).first()
    if (await done.isVisible().catch(() => false)) { await done.click(); return }
    if (await next.isVisible().catch(() => false)) { await next.click(); await page.waitForTimeout(250); continue }
    return
  }
}

for (const lang of LANGS) {
  for (const card of CARDS) {
    test(`${card} 卡 / ${lang}:答完一遍,报告里没有读得出来的错`, async ({ page }) => {
      await page.goto('/start')
      await page.evaluate((l) => { localStorage.setItem('jobs.lang', l); localStorage.removeItem('o2p_answers_v1') }, lang)
      await page.goto(`/plan/${card}`)
      await answerAll(page)
      await page.waitForTimeout(2500)

      const body = await page.evaluate(() => document.body.innerText)
      expect(body.length, '报告是空的').toBeGreaterThan(200)
      for (const s of SMELLS) {
        const hit = body.split('\n').find((line) => s.re.test(line))
        expect(hit ?? '', `${s.name}:${hit}`).toBe('')
      }
      // 横滚(手机优先铁律)
      const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      expect(over, '页面横滚').toBe(false)
    })
  }
}

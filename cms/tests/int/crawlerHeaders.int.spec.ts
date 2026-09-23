// 公司卡「点开」上报的爬虫判定(lib/employers isCrawlerHeaders;2026-09-23 Frank「两个都做吧」)。
// 来由:09-21 职位页挂上公司卡后,会跑 JS 的爬虫刷职位页,页面自己一滚就带着真人标记报「点开」,等待调查被灌到第 58 位。
// 性质:① 真浏览器(带接受语言 + 普通标识)一律放行;② 自报家门的爬虫一律拦;③ 没带接受语言 / 没有标识的当爬虫。
import { describe, expect, it } from 'vitest'

// 测试例外:纯函数直接点文件(桶只走门的规矩不管测试)
import { isCrawlerHeaders } from '@/lib/employers/functions'

const LANG = 'en-CA,en;q=0.9'

const BROWSERS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/145.0.0.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0',
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
]

const CRAWLERS = [
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/145.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 (compatible; Google-InspectionTool/1.0;)',
  'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)',
  'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
]

describe('公司卡「点开」上报的爬虫判定', () => {
  it('真浏览器:带接受语言、标识是普通浏览器 → 放行', () => {
    for (const ua of BROWSERS) {
      expect(isCrawlerHeaders(new Headers({ 'user-agent': ua, 'accept-language': LANG })), ua).toBe(false)
    }
  })

  it('自报家门的爬虫:哪怕带了接受语言也拦', () => {
    for (const ua of CRAWLERS) {
      expect(isCrawlerHeaders(new Headers({ 'user-agent': ua, 'accept-language': LANG })), ua).toBe(true)
    }
  })

  it('没带接受语言 / 接受语言是空白 → 当爬虫(真浏览器每个请求都带)', () => {
    for (const ua of BROWSERS) {
      expect(isCrawlerHeaders(new Headers({ 'user-agent': ua })), ua).toBe(true)
      expect(isCrawlerHeaders(new Headers({ 'user-agent': ua, 'accept-language': '  ' })), ua).toBe(true)
    }
  })

  it('没有浏览器标识 / 标识是空白 → 当爬虫', () => {
    expect(isCrawlerHeaders(new Headers({ 'accept-language': LANG }))).toBe(true)
    expect(isCrawlerHeaders(new Headers({ 'accept-language': LANG, 'user-agent': ' ' }))).toBe(true)
  })
})

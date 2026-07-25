# 厨师类第 1 期:海报拆 3 页轮播卡(3:4 1242x1656)→ p1/p2/p3.png,供 make_video.py 串片
import os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))

STYLE = """
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1242px; height: 1656px; }
body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; background: #f7f1e3; padding: 46px; }
.frame { height: 100%; border: 6px solid #1c1917; border-radius: 26px; background: #faf6ea;
  padding: 60px 64px 44px; display: flex; flex-direction: column; }
.brand { font-size: 30px; font-weight: 800; letter-spacing: 2px; color: #1c1917; }
.brand .dot { color: #f59e0b; }
.kicker { margin-top: 46px; font-size: 34px; font-weight: 600; color: #57534e; }
h1 { margin-top: 14px; font-size: 88px; line-height: 1.3; font-weight: 900; color: #1c1917; letter-spacing: 2px; }
.hl { background: linear-gradient(transparent 55%, #fde047 55%); padding: 0 6px; }
.stats { margin-top: 70px; display: flex; flex-direction: column; gap: 28px; }
.stat { background: #fff; border: 4px solid #1c1917; border-radius: 20px; padding: 44px 30px 40px; text-align: center; }
.stat .num { font-size: 110px; font-weight: 900; color: #1c1917; line-height: 1; }
.stat .num em { font-style: normal; font-size: 52px; }
.stat .cap { margin-top: 16px; font-size: 34px; color: #57534e; font-weight: 600; line-height: 1.4; }
.case { margin-top: 60px; background: #1c1917; color: #faf6ea; border-radius: 20px; padding: 52px 48px; }
.case .tag { display: inline-block; background: #fde047; color: #1c1917; font-size: 30px; font-weight: 800; border-radius: 999px; padding: 8px 24px; }
.case .line { margin-top: 30px; font-size: 50px; font-weight: 700; line-height: 1.5; }
.case .line b { color: #fbbf24; font-size: 72px; }
.case .sub { margin-top: 20px; font-size: 32px; color: #d6d3d1; line-height: 1.6; }
.checks { margin-top: 56px; display: flex; flex-direction: column; gap: 26px; }
.check { font-size: 44px; font-weight: 700; color: #1c1917; }
.check .tick { color: #15803d; margin-right: 12px; }
.spacer { flex: 1; }
.next { text-align: center; font-size: 32px; color: #a8a29e; font-weight: 600; }
.cta-big { text-align: center; font-size: 64px; font-weight: 900; color: #1c1917; line-height: 1.6; }
.cta-big .site { display: inline-block; background: linear-gradient(transparent 45%, #fde047 45%); padding: 0 14px; font-size: 76px; }
.foot { margin-top: 20px; text-align: center; font-size: 22px; color: #a8a29e; }
.mid { display: flex; flex-direction: column; justify-content: center; flex: 1; }
"""

P1 = """
<div class="frame">
  <div class="brand"><span class="dot">●</span> OFFER2PR</div>
  <div class="kicker">够得着的岗 👨‍🍳 第 1 期</div>
  <h1>在加拿大当厨师,<br>工资<span class="hl">比你想的高</span></h1>
  <div class="stats">
    <div class="stat"><div class="num">1,945</div><div class="cap">全国在招厨师岗(Job Bank 官方数据)</div></div>
    <div class="stat"><div class="num">528<em>个</em></div><div class="cap">工资高出所在省中位 20% 以上</div></div>
  </div>
  <div class="spacer"></div>
  <div class="next">往后看,有今天刚发布的实例 →</div>
</div>
"""

P2 = """
<div class="frame">
  <div class="brand"><span class="dot">●</span> OFFER2PR</div>
  <div class="mid">
    <div class="case">
      <span class="tag">今天刚发布</span>
      <div class="line">Calgary 中餐厨师<br>时薪 <b>$38</b></div>
      <div class="sub">阿省厨师中位 $17.5/时,这岗是中位的 2.2 倍。Job Bank 编号 49957500,可自行核对。</div>
    </div>
    <div class="checks">
      <div class="check"><span class="tick">✓</span>不要学历要手艺,TEER 3</div>
      <div class="check"><span class="tick">✓</span>多省省提名紧缺清单常客</div>
    </div>
  </div>
</div>
"""

P3 = """
<div class="frame">
  <div class="brand"><span class="dot">●</span> OFFER2PR</div>
  <div class="mid">
    <div class="cta-big">这 528 个高薪厨师岗<br>站内一键筛<br><span class="site">offer2pr.com</span></div>
  </div>
  <div class="foot">数据来源:Job Bank 公开职位与官方工资统计;省提名为粗筛信号,不构成移民建议</div>
</div>
"""

pages = [('p1', P1), ('p2', P2), ('p3', P3)]
for name, body in pages:
    with open(os.path.join(HERE, name + '.html'), 'w', encoding='utf-8') as f:
        f.write('<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><style>' + STYLE + '</style></head><body>' + body + '</body></html>')

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 1242, 'height': 1656})
    for name, _ in pages:
        pg.goto('file:///' + os.path.join(HERE, name + '.html').replace('\\', '/'))
        pg.wait_for_timeout(400)
        h = pg.evaluate('document.body.scrollHeight')
        pg.screenshot(path=os.path.join(HERE, name + '.png'))
        print(name, 'height', h)
    b.close()
print('done')

# 动效引擎逐帧捕获:animate.html 的 seek(ms) 逐帧驱动 → frames/*.png → ffmpeg 30fps 合成
# 用法: python capture_anim.py [--music bgm.mp3]
import argparse, os, shutil, subprocess
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
DUR = 27.5  # 秒(每屏信息出全后停 3-4 秒)

ap = argparse.ArgumentParser()
ap.add_argument('--music')
a = ap.parse_args()

frames = os.path.join(HERE, 'frames')
shutil.rmtree(frames, ignore_errors=True)
os.makedirs(frames)

n = int(DUR * FPS)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 1080, 'height': 1920})
    pg.goto('file:///' + os.path.join(HERE, 'animate.html').replace('\\', '/'))
    pg.wait_for_timeout(400)
    for i in range(n):
        pg.evaluate(f'seek({i * 1000 / FPS:.2f})')
        pg.screenshot(path=os.path.join(frames, f'{i:04d}.png'))
        if i % 90 == 0:
            print(f'frame {i}/{n}')
    b.close()

out = os.path.join(HERE, '成片.mp4')
cmd = ['ffmpeg', '-y', '-framerate', str(FPS), '-i', os.path.join(frames, '%04d.png')]
if a.music:
    cmd += ['-stream_loop', '-1', '-i', a.music]
cmd += ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', str(FPS)]
if a.music:
    cmd += ['-map', '0:v', '-map', '1:a', '-af', f'afade=t=out:st={DUR-2:.1f}:d=2', '-c:a', 'aac', '-b:a', '128k']
cmd += ['-t', str(DUR), '-movflags', '+faststart', out]
subprocess.run(cmd, check=True)
print('->', out)

# 把一个文件夹里按名字排序的 PNG 组成竖版轮播视频(小红书 3:4),可选配乐。
# 用法:
#   python make_video.py <图片文件夹> [--music bgm.mp3] [--per 3.5] [--out 输出.mp4]
# 依赖:系统 ffmpeg(winget Gyan.FFmpeg 已装)。
import argparse, subprocess, sys
from pathlib import Path

FADE = 0.5  # 交叉淡入时长(秒)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--music", help="可选 bgm 文件,循环铺满并尾部淡出")
    ap.add_argument("--per", type=float, default=3.5, help="每张停留秒数(默认 3.5)")
    ap.add_argument("--out", help="输出路径,默认 <folder>/视频.mp4")
    a = ap.parse_args()

    folder = Path(a.folder)
    imgs = sorted(folder.glob("*.png"))
    if len(imgs) < 2:
        sys.exit(f"文件夹里 PNG 不足 2 张: {folder}")
    out = Path(a.out) if a.out else folder / "视频.mp4"

    n = len(imgs)
    total = n * a.per - (n - 1) * FADE

    cmd = ["ffmpeg", "-y"]
    for p in imgs:
        cmd += ["-loop", "1", "-t", str(a.per + FADE), "-i", str(p)]
    if a.music:
        cmd += ["-stream_loop", "-1", "-i", a.music]

    # 每张图归一到偶数尺寸,再 xfade 串链
    parts = [f"[{i}:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1[v{i}];" for i in range(n)]
    prev = "v0"
    for i in range(1, n):
        offset = i * a.per - i * FADE + FADE  # 第 i 次转场的起点
        label = f"x{i}" if i < n - 1 else "vout"
        parts.append(f"[{prev}][v{i}]xfade=transition=fade:duration={FADE}:offset={offset:.3f}[{label}];")
        prev = label
    fc = "".join(parts).rstrip(";")

    cmd += ["-filter_complex", fc, "-map", "[vout]"]
    if a.music:
        cmd += ["-map", f"{n}:a", "-af", f"afade=t=out:st={total-2:.2f}:d=2", "-c:a", "aac", "-b:a", "128k"]
    cmd += ["-t", f"{total:.2f}", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)]

    print("total", f"{total:.1f}s ->", out)
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    main()

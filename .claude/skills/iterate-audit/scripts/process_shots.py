# PNG → JPG 压缩入库 docs/assets/profit-shots/ ——iterate-audit 第 2 步收尾
# 文件名跨轮稳定(覆盖写),md 里的图链接不用动。附带从 LMIA 弹框裁 citation 来源行特写。
import sys, io, argparse
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--src", required=True, help="capture 脚本的 --out 目录(含 mobile/ 子目录)")
SRC = Path(ap.parse_args().src)
DST = Path(__file__).resolve().parents[4] / "docs" / "assets" / "profit-shots"  # scripts→iterate-audit→skills→.claude→项目根
DST.mkdir(parents=True, exist_ok=True)
(DST / "mobile").mkdir(exist_ok=True)


def save(png: Path, out: Path, width: int, quality: int):
    im = Image.open(png).convert("RGB")
    w, h = im.size
    if w > width:
        im = im.resize((width, int(h * width / w)), Image.LANCZOS)
    im.save(out, "JPEG", quality=quality, optimize=True)
    print(out.name, im.size, f"{out.stat().st_size // 1024}KB")


for png in sorted(SRC.glob("*.png")):
    save(png, DST / (png.stem + ".jpg"), 1600, 82)          # 电脑端
for png in sorted((SRC / "mobile").glob("*.png")):
    save(png, DST / "mobile" / (png.stem + ".jpg"), 800, 78)  # 手机端

# citation 来源行特写:LMIA 弹框(2160x1350)裁「口径注+来源链接」条(坐标经第 1 轮验证)
lmia = SRC / "lmia-modal.png"
if lmia.exists():
    im = Image.open(lmia).convert("RGB")
    if im.size == (2160, 1350):
        im.crop((550, 420, 1630, 620)).save(DST / "citation-line.jpg", "JPEG", quality=85, optimize=True)
        print("citation-line.jpg (crop)")
    else:
        print(f"! lmia-modal 尺寸 {im.size} != (2160,1350),citation 裁剪坐标需人工核对,跳过")

total = sum(f.stat().st_size for f in DST.rglob("*.jpg")) // 1024
print("TOTAL:", total, "KB")

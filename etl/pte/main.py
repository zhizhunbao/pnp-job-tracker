"""
pte 域唯一入口(一域一门,门直调 functions;company/crawl 全溶门形)。

手动研究域(无 META,不进调度):
    python etl/pte/main.py                 # 默认链(ynwac 对照库抽取)
    python etl/pte/main.py --only ynwac    # 同上(单步点名)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from pte.functions import (run, run_assets, run_dk_comments, run_dk_entries, run_dk_lists, run_duoink, run_index,
                           run_media, run_pb_audio, run_pb_images, run_pte_mart, run_pte_dict, run_pte_tts, run_pte_zh, run_ptebank, run_ptexj,
                           run_recent, run_timeline, run_votes, run_words, run_xj_exam, run_xj_lists, run_yn_audio)

SCHEDULED = [
    ("ynwac", run),
    ("assets", run_assets),
    ("votes", run_votes),
    ("yn-audio", run_yn_audio),
    ("ptebank", run_ptebank),
    ("pb-audio", run_pb_audio),
    ("pb-images", run_pb_images),
    ("dk-lists", run_dk_lists),
    ("dk-entries", run_dk_entries),
    ("duoink", run_duoink),
    ("xj-lists", run_xj_lists),
    ("xj-exam", run_xj_exam),
    ("ptexj", run_ptexj),
    ("index", run_index),
    ("timeline", run_timeline),
    ("words", run_words),
    ("recent", run_recent),
    ("media", run_media),
    ("pte-mart", run_pte_mart),
]
"""默认链:整库抽取 → DI 图片 → 考过投票+评论 → ptebank 第二源 → ptebank 音频(私有研究,不灌库不上线)。
votes 步:配了 YNWAC_TOKEN 才抓(空则跳过不报错),你部署的容器自动跑;ynwac 听力 mp3 付费墙后不抓
(2026-09-02 推翻:浏览器实测播放器 currentSrc = 主站公开静态 /sst/{id}.mp3,匿名可下 ——
yn-audio 步无鉴权直抓,api.ynwac.com 的 401 是死路不是付费墙)。
ptebank 步(2026-09-01):WP REST 整库,音频重补 ynwac 文本重;raw 快照先落 data/raw/pte/ptebank/。
pb-audio 步:ptebank 公开 mp3 落盘(幂等;链接会腐,趁开放抓)。
pb-images/media 步(2026-09-01「继续」):Core 筛图下载 + 题目↔媒体映射(media 殿后,收全链落盘现状)。
dk-lists/dk-entries/duoink 步(2026-09-02「接一下 duoink」):登录态浏览器读渲染态 —— Vuex 列表元数据 →
题页正文/题图(幂等断续)→ 装库雷达;无 playwright 的机器跳过,登录态住 crawl 统一 profile。
dk-comments 步(2026-09-04 Frank「评论里可能有有价值的信息,我对谁评论不感兴趣」):四型逐题直开 /comment 路由,
渲染态进 crawl 层、页内抽 正文/类别/尾行 落 comments/<id>.json(不取作者);只在 TOOLS 手动跑,不进默认链。
xj-lists/ptexj 步(2026-09-03「照 duoink 的形开一步」):猩际第四源 —— 登录态页内 fetch 明文 API,
沿 next_num 链收 19 型 Core 预测清单 + 考过票数(题干密文/canvas 不碰)→ 装库雷达 → 索引 frequent 旗 + recent votes。
xj-exam 步(同日「补 seen」):全站「确认考过」流增量拉取(首轮 180 天,此后追到上次 id 即停)→ 装库并入
exam_dates → recent seen/seen_n;预测清单 ∪ 近期考过 = 猩际在索引里的全部行。
pte-mart 步(2026-09-03 05:00 Frank「上」:pte 研究域升产品域,推翻立域时「不建 mart 不灌库不上线」):
四型题面(ynwac/duoink)+ 四格信号 → data/mart/pte_types.json / pte_questions.json,seed 照 mart 惯例灌库。"""

TOOLS = {
    "ynwac": run,
    "assets": run_assets,
    "votes": run_votes,
    "yn-audio": run_yn_audio,
    "ptebank": run_ptebank,
    "pb-audio": run_pb_audio,
    "pb-images": run_pb_images,
    "dk-lists": run_dk_lists,
    "dk-entries": run_dk_entries,
    "dk-comments": run_dk_comments,
    "duoink": run_duoink,
    "xj-lists": run_xj_lists,
    "xj-exam": run_xj_exam,
    "ptexj": run_ptexj,
    "index": run_index,
    "timeline": run_timeline,
    "words": run_words,
    "recent": run_recent,
    "media": run_media,
    "pte-mart": run_pte_mart,
    "pte-tts": run_pte_tts,
    "pte-dict": run_pte_dict,
    "pte-zh": run_pte_zh,
}
"""全部可 --only 点名的步。"""


def main() -> int:
    """跑默认链或 --only 点名的单步;返回进程退出码。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        picked = []
        for k, f in TOOLS.items():
            if args[1] in k:
                picked.append((k, f))
        if len(picked) == 0:
            say(f"✗ --only {args[1]} 没命中(可选:{'/'.join(TOOLS)})")
            return 1
        todo = picked
    else:
        todo = SCHEDULED
    for name, fn in todo:
        say(f"→ {name}")
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            err(name, e)
            return 1
    say(f"✓ 本域 {len(todo)} 步全过")
    return 0


if __name__ == "__main__":
    sys.exit(main())

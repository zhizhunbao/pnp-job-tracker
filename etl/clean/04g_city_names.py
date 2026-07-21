"""04g_city_names — 城市名的中/韩通行译名(#151)。**人工核定清单,不用模型。**

为什么不用模型:首版让本地模型判断「有无通行译名」,实测 94 个城市里 93 个都给了中文名——
小镇根本没有通行译名,模型在硬音译(Rivière-du-Loup→「洛普河」错成河名;Port Coquitlam→「波特科奎特兰」,
而华人社区通行叫「高贵林」)。这类「看着像那么回事其实是编的」正是本项目红线(宁可留空也不瞎猜),
且用户搜不到、用不上 = 纯噪音。

于是改成**有限的人工核定表**:只收华人/韩人社区确实通行的城市名(大多是移民实际聚居地),
表外一律留空 → 前端只显英文。加新城市=直接往表里加一行,不需要跑模型。

IN : (无外部输入,表就在本文件里)
OUT: data/processed/city_names_i18n.json   (name|prov → {zh, ko})

Usage:  uv run python etl/clean/04g_city_names.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402

OUT_I18N = _paths.PROCESSED / "city_names_i18n.json"

# 城市 → (中文, 韩文)。收录门槛=该译名在中文/韩文媒体或移民社区确实通行,不是音译练习。
CITIES: dict[str, tuple[str, str]] = {
    # 安大略
    "Toronto|ON": ("多伦多", "토론토"),
    "Mississauga|ON": ("密西沙加", "미시소가"),
    "Brampton|ON": ("布兰普顿", "브램턴"),
    "Markham|ON": ("万锦", "마컴"),
    "Richmond Hill|ON": ("列治文山", "리치먼드힐"),
    "Vaughan|ON": ("旺市", "본"),
    "Scarborough|ON": ("士嘉堡", "스카버러"),
    "North York|ON": ("北约克", "노스요크"),
    "Etobicoke|ON": ("怡陶碧谷", "이토비코"),
    "Ottawa|ON": ("渥太华", "오타와"),
    "Hamilton|ON": ("汉密尔顿", "해밀턴"),
    "London|ON": ("伦敦", "런던"),
    "Windsor|ON": ("温莎", "윈저"),
    "Waterloo|ON": ("滑铁卢", "워털루"),
    "Kitchener|ON": ("基奇纳", "키치너"),
    "Oakville|ON": ("奥克维尔", "오크빌"),
    "Burlington|ON": ("伯灵顿", "벌링턴"),
    "Kingston|ON": ("金斯顿", "킹스턴"),
    "Guelph|ON": ("圭尔夫", "겔프"),
    "Oshawa|ON": ("奥沙瓦", "오샤와"),
    "Niagara Falls|ON": ("尼亚加拉瀑布城", "나이아가라폴스"),
    # 卑诗
    "Vancouver|BC": ("温哥华", "밴쿠버"),
    "Surrey|BC": ("素里", "서리"),
    "Burnaby|BC": ("本拿比", "버나비"),
    "Richmond|BC": ("列治文", "리치먼드"),
    "Coquitlam|BC": ("高贵林", "코퀴틀람"),
    "Port Coquitlam|BC": ("高贵林港", "포트코퀴틀람"),
    "Victoria|BC": ("维多利亚", "빅토리아"),
    "Abbotsford|BC": ("阿伯茨福德", "애보츠퍼드"),
    "Kelowna|BC": ("基洛纳", "켈로나"),
    "Nanaimo|BC": ("纳奈莫", "나나이모"),
    # 阿尔伯塔
    "Calgary|AB": ("卡尔加里", "캘거리"),
    "Edmonton|AB": ("埃德蒙顿", "에드먼턴"),
    "Red Deer|AB": ("红鹿市", "레드디어"),
    "Lethbridge|AB": ("莱斯布里奇", "레스브리지"),
    # 魁北克
    "Montréal|QC": ("蒙特利尔", "몬트리올"),
    "Montreal|QC": ("蒙特利尔", "몬트리올"),
    "Québec|QC": ("魁北克市", "퀘벡시티"),
    "Laval|QC": ("拉瓦尔", "라발"),
    "Gatineau|QC": ("加蒂诺", "가티노"),
    "Sherbrooke|QC": ("舍布鲁克", "셔브룩"),
    # 草原三省与大西洋
    "Winnipeg|MB": ("温尼伯", "위니펙"),
    "Saskatoon|SK": ("萨斯卡通", "사스카툰"),
    "Regina|SK": ("里贾纳", "리자이나"),
    "Halifax|NS": ("哈利法克斯", "핼리팩스"),
    "Moncton|NB": ("蒙克顿", "몽턴"),
    "Fredericton|NB": ("弗雷德里克顿", "프레더릭턴"),
    "Charlottetown|PE": ("夏洛特敦", "샬럿타운"),
    "St. John's|NL": ("圣约翰斯", "세인트존스"),
}


def main() -> None:
    print(f"OUT: {OUT_I18N}")
    out = {k: {"zh": zh, "ko": ko} for k, (zh, ko) in CITIES.items()}
    OUT_I18N.parent.mkdir(parents=True, exist_ok=True)
    OUT_I18N.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ {len(out)} 个城市(人工核定;表外城市留空,前端只显英文)")


if __name__ == "__main__":
    main()

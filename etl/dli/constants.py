"""
dli 域常量 —— 域词汇表(五件全溶,照样张 etl/company/;2026-08-30 批D)。

判据照 company 样张:常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径;
唯一特批 import = `paths`(件套以 dli.constants 包名被引,门先把 etl/ 摆上路径)。
注释方言:每个常量用赋值后的裸字符串 docstring,行内 # 退役。
原 build_ircc_dli_pgwp.py 的 IN_URL / LANDING / OUT_FILE / UA / PROV_CODE 原样搬来,
函数体字面量(文案 f-string、"Yes"/"Public" 判词、防线阈值、超时)同批提名。
"""
import re

import paths

IN_URL = "https://www.canada.ca/content/dam/ircc/documents/json/dli/dli-full-list.json"
"""输入:IRCC「Designated learning institutions list」页 DataTables 的 ajaxSource
(官方机器可读 JSON,httpx 直取)。"""

LANDING = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/"
           "study-permit/prepare/designated-learning-institutions-list.html")
"""出处用「人能读的着陆页」(E4-04 惯例),不是数据文件 URL。"""

OUT_FILE = paths.DLI / "dli.json"
"""输出:PGWP 子集(院校级;跟踪,09 直通进 mart/dli.json)。"""

PROV_CODE = {
    "Alberta": "AB", "British Columbia": "BC", "Manitoba": "MB", "New Brunswick": "NB",
    "Newfoundland and Labrador": "NL", "Northwest Territories": "NT", "Nova Scotia": "NS",
    "Nunavut": "NU", "Ontario": "ON", "Prince Edward Island": "PE", "Quebec": "QC",
    "Saskatchewan": "SK", "Yukon": "YT",
}
"""省全名 → 省码;未知省**跳过**(宁可留空不瞎猜)。"""

CITY_SEP = ","
"""源 City 格的多校区分隔符(一行可带 "Kelowna, Vancouver" 这类逗号串;
2026-09-12 Frank「dli 院校没有大学吗」实撞:UBC 整串没拆对不上任何城市桶,
U of T / McGill 各取首行落在 Mississauga / Sainte-Anne-de-Bellevue —— 拆开一城一行)。"""

NAME_ZH = {
    "Alberta University of the Arts": "阿尔伯塔艺术大学",
    "Athabasca University": "阿萨巴斯卡大学",
    "Bow Valley College": "弓谷学院",
    "Burman University": "伯曼大学",
    "Concordia University of Edmonton": "埃德蒙顿康考迪亚大学",
    "Lethbridge Polytechnic": "莱斯布里奇理工学院",
    "MacEwan University": "麦科文大学",
    "Medicine Hat College": "梅迪辛哈特学院",
    "Mount Royal University": "皇家山大学",
    "NAIT (Northern Alberta Institute of Technology)": "北阿尔伯塔理工学院",
    "NorQuest College": "诺奎斯特学院",
    "Red Deer Polytechnic": "红鹿理工学院",
    "Southern Alberta Institute of Technology (SAIT Polytechnic)": "南阿尔伯塔理工学院",
    "St. Mary’s University": "圣玛丽大学",
    "University of Alberta": "阿尔伯塔大学",
    "University of Calgary": "卡尔加里大学",
    "University of Lethbridge": "莱斯布里奇大学",
    "British Columbia Institute of Technology": "英属哥伦比亚理工学院",
    "Camosun College": "卡莫森学院",
    "Capilano University": "卡皮拉诺大学",
    "College of New Caledonia": "新喀里多尼亚学院",
    "College of the Rockies": "落基山学院",
    "Douglas College": "道格拉斯学院",
    "Emily Carr University of Art and Design": "艾米丽卡尔艺术与设计大学",
    "Kwantlen Polytechnic University": "昆特兰理工大学",
    "Langara College": "兰加拉学院",
    "North Island College": "北岛学院",
    "Northern Lights College": "北极光学院",
    "Okanagan College": "欧肯纳根学院",
    "Royal Roads University": "皇家路大学",
    "Selkirk College": "塞尔柯克学院",
    "Simon Fraser University (SFU)": "西蒙菲莎大学",
    "Thompson Rivers University": "汤普森河大学",
    "University of British Columbia (UBC)": "英属哥伦比亚大学",
    "University of Northern British Columbia": "北英属哥伦比亚大学",
    "University of Victoria": "维多利亚大学",
    "University of the Fraser Valley": "菲莎河谷大学",
    "Vancouver Community College": "温哥华社区学院",
    "Vancouver Island University": "温哥华岛大学",
    "Assiniboine Community College": "阿西尼博因社区学院",
    "Brandon University": "布兰登大学",
    "Red River College Polytechnic": "红河理工学院",
    "University of Manitoba": "曼尼托巴大学",
    "University of Winnipeg": "温尼伯大学",
    "Université de Saint-Boniface": "圣博尼法斯大学",
    "Mount Allison University": "蒙特爱立森大学",
    "New Brunswick Community College (NBCC)": "新不伦瑞克社区学院",
    "St. Thomas University": "圣托马斯大学",
    "University of New Brunswick": "新不伦瑞克大学",
    "Université de Moncton": "蒙克顿大学",
    "College of the North Atlantic": "北大西洋学院",
    "Memorial University of Newfoundland": "纽芬兰纪念大学",
    "Acadia University": "阿卡迪亚大学",
    "Cape Breton University": "卡普顿大学",
    "Dalhousie University": "达尔豪斯大学",
    "Mount Saint Vincent University": "圣文森特山大学",
    "NSCAD University (Nova Scotia College of Art and Design)": "新斯科舍艺术与设计大学",
    "Nova Scotia Community College": "新斯科舍社区学院",
    "Saint Mary’s University": "圣玛丽大学",
    "St. Francis Xavier University": "圣弗朗西斯泽维尔大学",
    "University of King’s College": "国王学院大学",
    "Université Sainte-Anne": "圣安妮大学",
    "Algoma University": "阿尔戈马大学",
    "Algonquin College": "亚岗昆学院",
    "Brock University": "布鲁克大学",
    "Carleton University": "卡尔顿大学",
    "Centennial College": "百年理工学院",
    "Conestoga College": "康尼斯托加学院",
    "Confederation College": "联邦学院",
    "Durham College": "杜伦学院",
    "Fanshawe College": "范莎学院",
    "Fleming College": "弗莱明学院",
    "George Brown College": "乔治布朗学院",
    "Georgian College": "乔治亚学院",
    "Humber College": "汉博学院",
    "Lakehead University": "湖首大学",
    "Lambton College": "兰布顿学院",
    "Laurentian University": "劳伦森大学",
    "McMaster University": "麦克马斯特大学",
    "Mohawk College": "莫霍克学院",
    "Niagara College Canada": "尼亚加拉学院",
    "Niagara University": "尼亚加拉大学",
    "Nipissing University": "尼皮辛大学",
    "OCAD University": "安大略艺术设计大学",
    "Ontario Tech University": "安大略理工大学",
    "Queen’s University": "女王大学",
    "Royal Military College of Canada": "加拿大皇家军事学院",
    "Seneca College": "圣力嘉学院",
    "Sheridan College": "谢尔丹学院",
    "St. Clair College": "圣克莱尔学院",
    "St. Lawrence College": "圣劳伦斯学院",
    "Toronto Metropolitan University (TMU)": "多伦多都会大学",
    "Trent University": "特伦特大学",
    "University of Guelph": "圭尔夫大学",
    "University of Toronto": "多伦多大学",
    "University of Waterloo": "滑铁卢大学",
    "University of Windsor": "温莎大学",
    "Université Saint-Paul/St. Paul University": "圣保罗大学",
    "Université d’Ottawa/University of Ottawa": "渥太华大学",
    "Université de l'Ontario français": "安大略法语大学",
    "Western University": "西安大略大学",
    "Wilfrid Laurier University": "劳里埃大学",
    "York University": "约克大学",
    "Holland College": "荷兰学院",
    "University of Prince Edward Island": "爱德华王子岛大学",
    "Bishop's University": "主教大学",
    "Collège Dawson": "道森学院",
    "Concordia University": "康考迪亚大学",
    "McGill University": "麦吉尔大学",
    "Royal Military College Saint-Jean": "圣让皇家军事学院",
    "Télé-université": "魁北克远程大学",
    "Université Laval": "拉瓦尔大学",
    "Université de Montréal": "蒙特利尔大学",
    "Université de Sherbrooke": "舍布鲁克大学",
    "Université du Québec": "魁北克大学",
    "Université du Québec à Chicoutimi": "魁北克大学希库蒂米分校",
    "Université du Québec à Montréal": "魁北克大学蒙特利尔分校",
    "Université du Québec à Rimouski": "魁北克大学里穆斯基分校",
    "Université du Québec à Trois-Rivières": "魁北克大学三河分校",
    "École Polytechnique de Montréal": "蒙特利尔工学院",
    "École de technologie supérieure": "高等技术学院",
    "École des Hautes Études Commerciales de Montréal (HEC Montréal)": "蒙特利尔高等商学院",
    "Institut national de la recherche scientifique": "国立科学研究院",
    "Saskatchewan Polytechnic": "萨斯喀彻温理工学院",
    "University of Regina, including Campion College, First Nations University of Canada and Luther College": "里贾纳大学",
    "University of Saskatchewan, including St. Thomas More College": "萨斯喀彻温大学",
    "Yukon University": "育空大学",
}
"""校名 → 通行中文译名(2026-09-12 Frank「大学名 最好也加上中文翻译吧」;人工核定表,
照城市译名惯例**禁跑模型批量翻译**:只收有通行译名的大学与主流公立学院,
神学院/飞行学校/私立小校/CFP 职训中心查不到通行名的**留空不瞎猜**,前端回退英文原名。
键 = 官方名单原文(含弯引号 ’ 与括号缩写),源改名即失配落空 —— 宁失配别模糊匹配。"""

YES = "Yes"
"""源里布尔格的真值写法(PGWP / Grad Program 两格共用)。"""

PUBLIC_TOKEN = "Public"
"""Public/Private 格里判「公立」的子串(源里有 "Public"/"Private"/组合写法)。"""

KIND_UNIVERSITY = "university"
"""院校种类:大学(2026-09-12 Frank「这个应该加一个 大学 和 学院的 筛选吧」;官方名单没有种类格,
按校名判 —— 数据层派生一次,前端只读)。"""

KIND_COLLEGE = "college"
"""院校种类:学院(College / Collège / collégial / Cégep)。"""

KIND_OTHER = "other"
"""院校种类:其它(职训中心 CFP、Institut、神学院、飞行学校等;筛选只出大学与学院两档,其它归「全部」)。"""

UNIVERSITY_RE = re.compile(r"universit", re.IGNORECASE)
"""大学判词(英法同根:University / Université)。"""

COLLEGE_RE = re.compile(r"coll[eè]ge|coll[eé]gial|c[eé]gep", re.IGNORECASE)
"""学院判词(College / Collège / La Cité collégiale / Cégep)。大学判词先于它:
"University College" 类名算大学。"""

FETCH_TIMEOUT_S = 60
"""源 JSON 抓取超时(约 430KB,一次拿完)。"""

TEXT_ENCODING = "utf-8"
"""源默认 charset 声明不可靠,法语校名(Collège)防 mojibake —— 强制按 utf-8 解码。"""

OUT_INDENT = 1
"""落盘缩进(沿用原值,~300 行的表 1 格够读又省体积)。"""

MIN_ROWS = 100
"""防线:官方源结构变了宁可整轮失败,别灌半截(实测约 295 所)。"""

IN_TPL = "IN : {url}"
"""输入路径报行(运行时打印,宪法既有)。"""

OUT_TPL = "OUT: {path}"
"""输出路径报行。"""

SOURCE_ROWS_TPL = "source rows: {n}"
"""源行数报行(过滤前)。"""

SKIPPED_TPL = "skipped unknown provinces: {provs}"
"""未知省名报行(跳过不猜,留痕好追源改版)。"""

TOO_FEW_TPL = "suspiciously few PGWP institutions ({n}) — source schema changed?"
"""行数防线失败行(整轮失败,不写半截表)。"""

WROTE_TPL = "wrote {n} institutions (public {pub}, Atlantic public {atl}) fetched={fetched}"
"""收口报行(总数 + 公立数 + 大西洋四省公立数)。"""

ATLANTIC = ("NS", "NB", "PE", "NL")
"""大西洋四省省码(收口探针:AIP 相关的公立校数)。"""

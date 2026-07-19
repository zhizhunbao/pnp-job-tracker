# 身份限制预筛(GAP1③,痛点 C14/C15:「no sponsorship / 须 PR」藏 JD 深处,投完才发现)。
# 一个清洗关注点:JD 正文 → (eligibility_flag, eligibility_quote)。被 09 在 JD 正文下沉的同一循环调用
# (不另起脚本重扫 43k 文件——「拆成每字段一个脚本=重复解析同一原料」反模式)。
# 原则:精确优先宁可漏(误伤=帮雇主赶走本可投的人);「legally eligible to work in Canada」是
# 任何有效工签都满足的样板句,不是排斥信号,明确不匹配。输出带 quote=命中原句(citation 惯例,可核验)。
import re

IN_DESC = "job.description(09 传入,不落盘)"   # 输入=内存字段;OUT 同(顶部声明惯例,本模块无文件 IO)

# 明确不担保(雇主自述不提供 visa/work permit sponsorship)
_NO_SPONSOR = [
    re.compile(r"\bno (?:visa |work(?: permit)? |employment |immigration )?sponsorships?\b", re.I),
    re.compile(r"\bsponsorships? (?:is |are )?not (?:available|offered|provided|possible)\b", re.I),
    re.compile(r"\b(?:unable|not able|not in a position) to (?:provide|offer|support)(?: a| any)? (?:visa |work(?: permit)? |immigration )?sponsorships?\b", re.I),
    re.compile(r"\b(?:cannot|can ?not|will not|won'?t|do(?:es)? not|don'?t) (?:provide|offer|support|assist with)(?: a| any)? (?:visa |work(?: permit)? |immigration )?sponsorships?\b", re.I),
    re.compile(r"\bnot (?:currently )?sponsor(?:ing)?\b.{0,40}\b(?:visa|work permit|candidate|applicant)", re.I),
    re.compile(r"\bwithout (?:the )?need (?:for|of) sponsorships?\b", re.I),
]
# 须 PR/公民(把持有工签者排除在外的硬条件)
_PR_ONLY = [
    re.compile(r"\bmust be (?:a |an )?(?:canadian )?(?:citizens?|permanent residents?)\b", re.I),
    re.compile(r"\b(?:canadian )?citizens?(?: (?:and|or) permanent residents?)? only\b", re.I),
    re.compile(r"\bpermanent residents?(?: (?:and|or) (?:canadian )?citizens?)? only\b", re.I),
    re.compile(r"\bonly (?:open to )?(?:canadian )?citizens?(?: (?:and|or) permanent residents?)?\b", re.I),
    re.compile(r"\bmust (?:hold|have|possess) (?:canadian )?(?:citizenship|permanent residen(?:ce|t status))\b", re.I),
    re.compile(r"\b(?:canadian citizenship|permanent residen(?:ce|t status)) (?:is )?(?:required|mandatory)\b", re.I),
    re.compile(r"\brestricted to (?:canadian )?citizens?(?: (?:and|or) permanent residents?)?\b", re.I),
]
# 样板句护栏:出现也不算排斥(任何有效工签都满足)
_SAFE = re.compile(r"legally (?:eligible|entitled|able|authorized) to work|authoriz(?:ed|ation) to work in canada|eligible to work in canada", re.I)
# PR 规则的 or 逃逸护栏(全量实测抓到的假阳性):「citizen, PR, **or** hold a valid work permit /
# proper documentation / working holiday」= 不排斥工签,不标
_PR_ESCAPE = re.compile(r"\b(?:or|and)\b.{0,70}?(?:work(?:ing)? (?:permit|holiday)|proper documentation|documentation that allows|valid work|open work|authoriz)", re.I | re.S)
# 福利条款护栏:「benefits … Canadians and Permanent Residents only」说的是福利资格不是岗位资格
_BENEFIT = re.compile(r"benefit|insurance|dental|medical|pension", re.I)


def _quote(text: str, start: int, end: int) -> str:
    """命中处所在句(粗切),两端各扩 ~80 字,压平空白,≤180 字。"""
    a = max(0, start - 80)
    b = min(len(text), end + 80)
    return re.sub(r"\s+", " ", text[a:b]).strip()[:180]


def detect(text: str) -> tuple[str, str] | tuple[None, None]:
    """JD 正文 → ('no_sponsorship'|'pr_required', 命中原句) 或 (None, None)。"""
    if not text:
        return None, None
    for pats, flag in ((_NO_SPONSOR, "no_sponsorship"), (_PR_ONLY, "pr_required")):
        for p in pats:
            m = p.search(text)
            if not m:
                continue
            if _SAFE.search(m.group(0)):
                continue   # 命中片段本身是「合法可工作」样板句
            if flag == "pr_required":
                if _PR_ESCAPE.search(text[m.end():m.end() + 110]):
                    continue   # 后随 or 逃逸句(工签也行)
                if _BENEFIT.search(text[max(0, m.start() - 70):m.start()]):
                    continue   # 福利条款,不是岗位资格
            return flag, _quote(text, m.start(), m.end())
    return None, None

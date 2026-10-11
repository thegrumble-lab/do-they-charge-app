"""Prospect check: confirm outreach emails and angle articles on the open web.

Claude sessions sit behind a network allowlist, so checking each prospect's
page from a session means approving every site by hand. GitHub's runners have
normal internet access, so the weekly prospect research hands its candidate
pages to this script (via .github/workflows/prospect-check.yml) instead.

Input:  <dir>/candidates.json, a list of
  {
    "id":       any unique string,
    "pages":    [urls where the email should be published],   # optional
    "email":    "expected@address" or "",                       # optional
    "article":  "url of the angle article/post" or "",          # optional
    "follow":   true to also scan same-site contact/about/team/terms links
  }

Output: <dir>/results.json, keyed by id:
  {
    "emails_found": {address: [urls it appeared on]},
    "context": {address: visible text around its first appearance},
    "email_confirmed": true/false/None (None when no email was expected),
    "email_seen_on": [urls],
    "pages": {url: {"status": int, "rendered": bool}},
    "article": {"url", "status", "title", "published", "final_url"} or None
  }

Emails are read from plain text, mailto: links, Cloudflare's email
protection (data-cfemail / /cdn-cgi/l/email-protection#...) and simple
"name [at] domain [dot] com" obfuscation. Pages that come back almost empty
(JavaScript sites such as Wix) are re-read in headless Chromium when
Playwright is installed.

Usage: python3 scripts/check_prospects.py <dir>
"""

import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (compatible; DiscretionaryProspectCheck/1.0; +https://discretionary.uk/about)"
TIMEOUT = 25
DELAY = 0.4
MAX_FOLLOW = 6

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}")
AT_RE = re.compile(
    r"([A-Za-z0-9._%+-]+)\s*[\[\(\{]\s*at\s*[\]\)\}]\s*([A-Za-z0-9-]+(?:\s*(?:[\[\(\{]\s*dot\s*[\]\)\}]|\.)\s*[A-Za-z0-9-]+)+)",
    re.I,
)
CF_ATTR_RE = re.compile(r'data-cfemail="([0-9a-fA-F]+)"')
CF_HREF_RE = re.compile(r"/cdn-cgi/l/email-protection#([0-9a-fA-F]+)")
HREF_RE = re.compile(r'href\s*=\s*["\']([^"\']+)["\']', re.I)
FOLLOW_RE = re.compile(r"contact|about|team|staff|people|write|pitch|press|media|terms|privacy|book|reserv|advertis|submit", re.I)
JUNK_EMAIL = re.compile(r"(\.(png|jpe?g|gif|webp|svg|css|js)$)|(@(example|domain|email|sentry|wixpress|sentry-next)\.)|(^u00)", re.I)

_browser = None


def cf_decode(hexstr: str) -> str:
    try:
        key = int(hexstr[:2], 16)
        return "".join(chr(int(hexstr[i:i + 2], 16) ^ key) for i in range(2, len(hexstr), 2))
    except ValueError:
        return ""


def page_words(body: str) -> str:
    """Visible-ish text with tags turned into spaces, so adjacent elements never run together."""
    body = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", body)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", body)))


def extract_emails(body: str) -> dict:
    """Return {email: short snippet of the visible text around it}."""
    found = set()
    raw = html.unescape(urllib.parse.unquote(body))
    words = page_words(body)
    for src in (raw, words):
        found.update(EMAIL_RE.findall(src))
    for h in CF_ATTR_RE.findall(body) + CF_HREF_RE.findall(body):
        d = cf_decode(h)
        if EMAIL_RE.fullmatch(d):
            found.add(d)
    for user, dom in AT_RE.findall(words):
        dom = re.sub(r"\s*[\[\(\{]\s*dot\s*[\]\)\}]\s*|\s*\.\s*", ".", dom, flags=re.I)
        cand = f"{user}@{dom}"
        if EMAIL_RE.fullmatch(cand):
            found.add(cand)
    clean = {e.strip(".'\"").lower() for e in found if not JUNK_EMAIL.search(e)}
    # Script data sometimes runs an address into the next word ("hello@x.comadvertising"):
    # drop any address that is a shorter one plus extra letters.
    clean = {e for e in clean if not any(o != e and e.startswith(o) and e[len(o)].isalpha() for o in clean)}
    low = words.lower()
    out = {}
    for e in sorted(clean):
        i = low.find(e.split("@")[0] + "@")
        out[e] = words[max(0, i - 80): i + len(e) + 60].strip() if i >= 0 else ""
    return out


def visible_len(body: str) -> int:
    body = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", body)
    return len(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body)).strip())


def http_get(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/pdf,*/*;q=0.5", "Accept-Language": "en-GB,en;q=0.8"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            raw = r.read(5_000_000)
            ctype = r.headers.get_content_type()
            if ctype == "application/pdf":
                # Crude but dependency-free: addresses in PDFs are usually stored as plain text or mailto URIs.
                return r.status, raw.decode("latin-1", errors="replace"), r.geturl()
            return r.status, raw.decode(r.headers.get_content_charset() or "utf-8", errors="replace"), r.geturl()
    except urllib.error.HTTPError as e:
        try:
            return e.code, e.read(2_000_000).decode("utf-8", errors="replace"), url
        except Exception:
            return e.code, "", url
    except Exception:
        return 0, "", url


def rendered_get(url: str):
    global _browser
    try:
        if _browser is None:
            from playwright.sync_api import sync_playwright
            _browser = sync_playwright().start().chromium.launch()
        page = _browser.new_page(user_agent=UA)
        try:
            resp = page.goto(url, timeout=30000, wait_until="networkidle")
            return (resp.status if resp else 0), page.content(), page.url
        finally:
            page.close()
    except Exception as e:
        print(f"  render failed for {url}: {e}", flush=True)
        return 0, "", url


def get(url: str, cache: dict):
    if url in cache:
        return cache[url]
    status, body, final = http_get(url)
    rendered = False
    if (status in (0, 403) or visible_len(body) < 400) and not url.lower().endswith(".pdf"):
        s2, b2, f2 = rendered_get(url)
        if s2 and visible_len(b2) > visible_len(body):
            status, body, final, rendered = s2, b2, f2, True
    cache[url] = (status, body, final, rendered)
    time.sleep(DELAY)
    return cache[url]


def follow_links(base: str, body: str) -> list:
    host = urllib.parse.urlparse(base).netloc.lower().removeprefix("www.")
    out = []
    for href in HREF_RE.findall(body):
        u = urllib.parse.urljoin(base, html.unescape(href)).split("#")[0]
        p = urllib.parse.urlparse(u)
        if p.scheme not in ("http", "https") or p.netloc.lower().removeprefix("www.") != host:
            continue
        if re.search(r"\.(css|js|json|xml|png|jpe?g|gif|svg|webp|ico|woff2?)$|/feed/?$|/wp-json/", p.path, re.I):
            continue
        if FOLLOW_RE.search(p.path) and u not in out and u.rstrip("/") != base.rstrip("/"):
            out.append(u)
    return out[:MAX_FOLLOW]


META = {
    "title": [r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)', r"<title[^>]*>(.*?)</title>"],
    "published": [
        r'<meta[^>]+property=["\']article:published_time["\'][^>]+content=["\']([^"\']+)',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']article:published_time',
        r'"datePublished"\s*:\s*"([^"]+)"',
        r'<time[^>]+datetime=["\']([^"\']+)',
        r'<meta[^>]+name=["\'](?:date|pubdate|publish-date|parsely-pub-date)["\'][^>]+content=["\']([^"\']+)',
    ],
}


def meta(body: str, key: str):
    for pat in META[key]:
        m = re.search(pat, body, re.I | re.S)
        if m:
            return html.unescape(re.sub(r"\s+", " ", m.group(1))).strip()[:300]
    return None


def check(c: dict, cache: dict) -> dict:
    expected = (c.get("email") or "").strip().lower()
    pages = [p for p in c.get("pages", []) if p and p.startswith("http")]
    res = {"emails_found": {}, "context": {}, "email_confirmed": None, "email_seen_on": [], "pages": {}, "article": None}
    queue = list(pages)
    if c.get("follow"):
        for p in pages:
            status, body, final, _ = get(p, cache)
            queue += [u for u in follow_links(final, body) if u not in queue]
    for url in queue:
        status, body, final, rendered = get(url, cache)
        res["pages"][url] = {"status": status, "rendered": rendered}
        for e, ctx in extract_emails(body).items():
            res["emails_found"].setdefault(e, []).append(url)
            if ctx and e not in res["context"]:
                res["context"][e] = ctx
    if expected:
        res["email_seen_on"] = res["emails_found"].get(expected, [])
        res["email_confirmed"] = bool(res["email_seen_on"])
    art = (c.get("article") or "").strip()
    if art.startswith("http"):
        status, body, final, rendered = get(art, cache)
        res["article"] = {"url": art, "status": status, "final_url": final, "title": meta(body, "title"), "published": meta(body, "published")}
    return res


def main():
    d = sys.argv[1] if len(sys.argv) > 1 else "prospect-check"
    cands = json.load(open(os.path.join(d, "candidates.json")))
    cache, results = {}, {}
    for i, c in enumerate(cands):
        print(f"{i + 1}/{len(cands)} {c.get('id')}", flush=True)
        try:
            results[c["id"]] = check(c, cache)
        except Exception as e:
            results[c["id"]] = {"error": str(e)}
    json.dump(results, open(os.path.join(d, "results.json"), "w"), indent=1, sort_keys=True)
    conf = sum(1 for r in results.values() if r.get("email_confirmed"))
    exp = sum(1 for c in cands if c.get("email"))
    line = f"Prospect check: {len(cands)} candidates, {conf}/{exp} expected emails confirmed, {len(cache)} pages fetched"
    print(line)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        open(os.environ["GITHUB_STEP_SUMMARY"], "a").write(line + "\n")
    global _browser
    if _browser is not None:
        _browser.close()


if __name__ == "__main__":
    main()

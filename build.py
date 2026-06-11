#!/usr/bin/env python3
"""
build.py — converts content/projects/*.md → data/projects.json + projects/*.html
Run after editing any markdown file: python build.py
Dependencies: pip install markdown
"""

import os, json, re, html
import urllib.request
import markdown


# ── tech-stack logo fetcher (simpleicons.org) ──────────────
TECH_SLUG_ALIASES = {
    "node":      "nodedotjs",
    "node.js":   "nodedotjs",
    "nodejs":    "nodedotjs",
    "next.js":   "nextdotjs",
    "nuxt.js":   "nuxtdotjs",
    "vue":       "vuedotjs",
    "vue.js":    "vuedotjs",
    "go":        "go",
    "golang":    "go",
    "postgres":  "postgresql",
    "ios-sdk":   "ios",
    "ios sdk":   "ios",
    "wasm":      "webassembly",
    "ts":        "typescript",
    "js":        "javascript",
}

TECH_DIR = "images/tech"


def slugify_tech(tag):
    """Lowercase, strip punctuation, apply alias map."""
    s = tag.strip().lower()
    if s in TECH_SLUG_ALIASES:
        return TECH_SLUG_ALIASES[s]
    return re.sub(r"[^a-z0-9]", "", s)


def fetch_tech_logo(tag):
    """Downloads simpleicon SVG to images/tech/<slug>.svg. Returns relative path or None."""
    slug = slugify_tech(tag)
    if not slug:
        return None

    target = os.path.join(TECH_DIR, f"{slug}.svg")
    if os.path.exists(target):
        return target.replace(os.sep, "/")

    url = f"https://cdn.simpleicons.org/{slug}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (build)"})
        with urllib.request.urlopen(req, timeout=6) as response:
            content = response.read()
        if not content.lstrip().startswith(b"<svg"):
            return None
        os.makedirs(TECH_DIR, exist_ok=True)
        with open(target, "wb") as f:
            f.write(content)
        print(f"  ↳ fetched logo for '{tag}' → {target}")
        return target.replace(os.sep, "/")
    except Exception as e:
        print(f"  [!] no logo for '{tag}' (slug={slug}): {e}")
        return None


# ── fetcher helper ─────────────────────────────────────────
def fetch_github_readme_html(repo_url):
    """Fetches the ALREADY RENDERED HTML README from GitHub."""
    match = re.search(r"github\.com/([^/]+)/([^/]+)", repo_url)
    if not match:
        return ""
    owner, repo = match.groups()
    repo = repo.replace(".git", "")
    api_url = f"https://api.github.com/repos/{owner}/{repo}/readme"
    try:
        # By requesting .html instead of .raw, GitHub parses the markdown for us perfectly!
        req = urllib.request.Request(
            api_url, headers={"Accept": "application/vnd.github.v3.html"}
        )
        with urllib.request.urlopen(req) as response:
            return response.read().decode("utf-8")
    except Exception as e:
        print(f"  [!] Could not fetch README for {owner}/{repo}: {e}")
        return ""


# ── frontmatter parser ─────────────────────────────────────
def parse_frontmatter(text):
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text

    meta = {}
    for line in parts[1].splitlines():
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key, val = key.strip(), val.strip()
        if val.startswith("[") and val.endswith("]"):
            meta[key] = [
                v.strip().strip("'\"") for v in val[1:-1].split(",") if v.strip()
            ]
        elif re.fullmatch(r"\d+", val):
            meta[key] = int(val)
        else:
            meta[key] = val

    # rewrite GitHub blob URLs (HTML pages) to raw URLs for image fields
    if "logo" in meta and isinstance(meta["logo"], str):
        meta["logo"] = github_blob_to_raw(meta["logo"])

    return meta, parts[2].strip()


def github_blob_to_raw(url):
    """github.com/USER/REPO/blob/BRANCH/PATH → raw.githubusercontent.com/USER/REPO/BRANCH/PATH"""
    m = re.match(r"https?://github\.com/([^/]+)/([^/]+)/blob/(.+)", url)
    if m:
        owner, repo, rest = m.groups()
        return f"https://raw.githubusercontent.com/{owner}/{repo}/{rest}"
    return url


# ── page template ──────────────────────────────────────────
PAGE_TMPL = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{title} — matti fischbach</title>
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/styleindex.css">
    <link rel="stylesheet" href="../css/detail.css">
    <script>
        (function(){{var t=localStorage.getItem('theme');if(t==='dark'){{document.documentElement.setAttribute('data-theme','dark');}}else if(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches){{document.documentElement.setAttribute('data-theme','dark');}}else if(t==='light'){{document.documentElement.setAttribute('data-theme','light');}}}})();
    </script>
</head>
<body>
<div class="page-scroll">
    <nav class="nav">
        <a href="../index.html" class="nav-logo-link" aria-label="home">
            <img class="nav-logo" src="../images/logo.svg" alt="">
        </a>
        <ul class="nav-list">
            <li><a class="nav-item" href="../index.html#projects">projects</a></li>
            <li><a class="nav-item" href="../index.html#about">about</a></li>
            <li><a class="nav-item" href="mailto:matti.fischbach@web.de">contact</a></li>
        </ul>
        <button class="theme-toggle" id="theme-toggle" aria-label="toggle theme">
            <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
    </nav>

    <main class="detail">
        <a class="detail-back" href="../index.html#{back_anchor}">back</a>
        <header class="detail-header">
            {logo_html}
            <div class="detail-header-text">
                <h1 class="detail-title">{title}</h1>
                {tags_html}
            </div>
        </header>
        <article class="detail-body">
            {body_html}
            {readme_html}
        </article>
    </main>
</div>
    {extra}
    <script src="../javascript/detail.js" defer></script>
    <script src="../javascript/theme.js" defer></script>
</body>
</html>
"""


def render_project_page(item):
    tags_html = ""
    if item.get("tags"):
        def render_tag(t):
            if isinstance(t, dict):
                name = html.escape(t.get("name", ""))
                logo = (
                    f'<img class="box-tag-logo" src="../{html.escape(t["logo"])}" alt="">'
                    if t.get("logo") else ""
                )
                return f'<span class="box-tag">{logo}{name}</span>'
            return f'<span class="box-tag">{html.escape(t)}</span>'

        tags_html = (
            '<div class="detail-tags">'
            + "".join(render_tag(t) for t in item["tags"])
            + "</div>"
        )

    if item.get("logo"):
        logo_html = f'<div class="detail-logo"><img src="{html.escape(item["logo"])}" alt=""></div>'
    else:
        initial = (item.get("title", "?").strip() or "?")[0].upper()
        logo_html = f'<div class="detail-logo detail-logo--fallback">{html.escape(initial)}</div>'

    extra = ""
    if item.get("repo-url"):
        extra = (
            '<div class="detail-repo-btn">'
            '<span class="hero-link-wrap">'
            f'<a class="hero-link" href="{html.escape(item["repo-url"])}" target="_blank" rel="noopener">'
            '<svg class="icon-github" aria-hidden="true"><use href="../images/icons/github.svg#github"/></svg>'
            'github'
            '</a>'
            '</span>'
            '</div>'
        )

    # 1. Parse local markdown with standard Python markdown
    body_html = markdown.markdown(
        item.get("body", ""), extensions=["fenced_code", "tables"]
    )

    # 2. Inject the GitHub pre-parsed HTML directly into our container!
    readme_html = ""
    if item.get("readme_content"):
        readme_html = f"""
        <div class="readme-container">
            <div class="readme-badge">readme</div>
            <div class="readme-content">
                {item["readme_content"]}
            </div>
        </div>
        """

    return PAGE_TMPL.format(
        title=html.escape(item["title"]),
        logo_html=logo_html,
        tags_html=tags_html,
        body_html=body_html,
        readme_html=readme_html,
        back_anchor="projects",
        extra=extra,
    )


# ── build pipeline ─────────────────────────────────────────
def build(folder, out_json, pages_dir, page_renderer):
    items = []
    if not os.path.isdir(folder):
        print(f"  skipping {folder} (not found)")
        return

    os.makedirs(pages_dir, exist_ok=True)

    for fname in sorted(os.listdir(folder)):
        if not fname.endswith(".md"):
            continue
        path = os.path.join(folder, fname)
        with open(path, encoding="utf-8") as f:
            meta, body = parse_frontmatter(f.read())

        meta.setdefault("slug", fname.removesuffix(".md"))
        meta["body"] = body

        # tags: turn into [{name, logo}] objects, fetching logos from simpleicons
        if isinstance(meta.get("tags"), list):
            meta["tags"] = [{"name": t, "logo": fetch_tech_logo(t)} for t in meta["tags"]]

        # Fetch Pre-Rendered HTML if repo-url exists
        repo_url = meta.get("repo-url")
        if repo_url and "github.com" in repo_url:
            print(f"  Fetching HTML README for {repo_url}...")
            meta["readme_content"] = fetch_github_readme_html(repo_url)

        items.append(meta)

        page_path = os.path.join(pages_dir, meta["slug"] + ".html")
        with open(page_path, "w", encoding="utf-8") as f:
            f.write(page_renderer(meta))
        print(f'  {fname} → {meta["slug"]}.html')

    listing = [
        {k: v for k, v in m.items() if k not in ["body", "readme_content"]}
        for m in items
    ]
    os.makedirs(os.path.dirname(out_json), exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(listing, f, indent=2, ensure_ascii=False)
    print(f"  wrote {out_json} ({len(items)} items)\n")


def build_about(src="content/about.md", out="data/about.json"):
    """Parses content/about.md into [{question, answers: [...]}] JSON."""
    if not os.path.isfile(src):
        print(f"  skipping {src} (not found)")
        return

    with open(src, encoding="utf-8") as f:
        text = f.read()

    items = []
    current = None
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line.startswith("## "):
            if current:
                items.append(current)
            current = {"question": line[3:].strip(), "answers": []}
        elif line.startswith("- ") and current is not None:
            current["answers"].append(line[2:].strip())
    if current:
        items.append(current)

    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    print(f"  wrote {out} ({len(items)} q&a groups)\n")


if __name__ == "__main__":
    print("building projects...")
    build("content/projects", "data/projects.json", "projects", render_project_page)

    print("building about...")
    build_about()

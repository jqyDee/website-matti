#!/usr/bin/env python3
"""
build.py — converts content/projects/*.md → data/projects.json + projects/*.html
Run after editing any markdown file: python build.py
Dependencies: pip install markdown
"""

import os, json, re, html
import urllib.request
import markdown


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

    return meta, parts[2].strip()


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
</head>
<body>
    <nav class="nav">
        <a href="../index.html" class="nav-logo-link" aria-label="home">
            <svg class="nav-logo" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                    <linearGradient id="logo-sq" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#1595b6"/>
                        <stop offset="100%" stop-color="#0b2545"/>
                    </linearGradient>
                    <linearGradient id="logo-ci" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#50e3c2" stop-opacity="0.9"/>
                        <stop offset="100%" stop-color="#1595b6"/>
                    </linearGradient>
                </defs>
                <rect x="6" y="6" width="22" height="22" rx="2" fill="url(#logo-sq)" transform="rotate(-15 17 17)"/>
                <circle cx="31" cy="32" r="12" fill="url(#logo-ci)"/>
            </svg>
        </a>
        <ul class="nav-list">
            <li><a class="nav-item" href="../index.html#projects">projects</a></li>
            <li><a class="nav-item" href="../index.html#about">about</a></li>
            <li><a class="nav-item" href="mailto:matti.fischbach@web.de">contact</a></li>
        </ul>
    </nav>

    <main class="detail">
        <a class="detail-back" href="../index.html#{back_anchor}">back</a>
        <header class="detail-header">
            <h1 class="detail-title">{title}</h1>
            {tags_html}
        </header>
        <article class="detail-body">
            {body_html}
            {readme_html}
        </article>
        {extra}
    </main>
</body>
</html>
"""


def render_project_page(item):
    tags_html = ""
    if item.get("tags"):
        tags_html = (
            '<div class="detail-tags">'
            + "".join(
                f'<span class="box-tag">{html.escape(t)}</span>' for t in item["tags"]
            )
            + "</div>"
        )

    extra = ""
    if item.get("repo-url"):
        extra = f'<a class="detail-link" href="{html.escape(item["repo-url"])}" target="_blank" rel="noopener">view repository</a>'

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


if __name__ == "__main__":
    print("building projects...")
    build("content/projects", "data/projects.json", "projects", render_project_page)

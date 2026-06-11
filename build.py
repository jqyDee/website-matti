#!/usr/bin/env python3
"""
build.py — converts content/projects/*.md → data/projects.json + projects/*.html
Run after editing any markdown file: python build.py
No dependencies beyond Python stdlib.
"""

import os, json, re, html


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


# ── tiny markdown → html ───────────────────────────────────
def md_to_html(text):
    """Minimal markdown: paragraphs, **bold**, _italic_ / *italic*, `code`, # headings."""
    out = []
    for block in text.split("\n\n"):
        block = block.strip()
        if not block:
            continue
        # heading
        m = re.match(r"^(#{1,6})\s+(.*)", block)
        if m:
            level = len(m.group(1))
            out.append(f"<h{level}>{inline(m.group(2))}</h{level}>")
            continue
        # paragraph
        out.append(f"<p>{inline(block)}</p>")
    return "\n".join(out)


def inline(text):
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"__(.+?)__", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    text = re.sub(r"_(.+?)_", r"<em>\1</em>", text)
    text = re.sub(r"`(.+?)`", r"<code>\1</code>", text)
    return text


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

    return PAGE_TMPL.format(
        title=html.escape(item["title"]),
        tags_html=tags_html,
        body_html=md_to_html(item["body"]),
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
        items.append(meta)

        page_path = os.path.join(pages_dir, meta["slug"] + ".html")
        with open(page_path, "w", encoding="utf-8") as f:
            f.write(page_renderer(meta))
        print(f'  {fname} → {meta["slug"]}.html')

    # strip body from json — only metadata for the listing
    listing = [{k: v for k, v in m.items() if k != "body"} for m in items]
    os.makedirs(os.path.dirname(out_json), exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(listing, f, indent=2, ensure_ascii=False)
    print(f"  wrote {out_json} ({len(items)} items)\n")


print("building projects...")
build("content/projects", "data/projects.json", "projects", render_project_page)

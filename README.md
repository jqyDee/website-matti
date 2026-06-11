# Matti Fischbach - Personal Website

Welcome to the repository for my personal portfolio website. This project is built using HTML, CSS, JavaScript, and a custom, lightweight Python-based Static Site Generator (SSG).

## 🚀 Features

* **Custom Static Site Generator**: Uses a dependency-free Python script (`build.py`) to convert Markdown files into HTML project pages.
* **Responsive Design**: Custom CSS structured across multiple files for maintainability.
* **Automated Deployment**: Automatically builds and deploys to GitHub Pages using GitHub Actions whenever changes are pushed to the `main` branch.

## 📂 Project Structure

```text
.
├── CSS/                  # Stylesheets (base, layout, components)
├── content/              # Markdown source files for projects
│   └── projects/         # Add your .md project files here
├── data/                 # Auto-generated JSON files (e.g., projects.json)
├── images/               # Image assets and icons
├── javascript/           # Client-side JavaScript
├── projects/             # Auto-generated HTML project pages
├── .github/workflows/    # GitHub Actions CI/CD pipelines
├── build.py              # The Python SSG build script
├── index.html            # Main landing page
└── Makefile              # Quick commands for building and local development
```

## 🛠️ Local Development

To run this project locally, you only need Python 3 installed. For the best development experience, a local live-reloading server like `live-server` is recommended.

### Prerequisites
* [Python 3.x](https://www.python.org/downloads/)
* Node.js & npm (optional, if you want to use `live-server`)
  * Install `live-server` globally: `npm install -g live-server`

### Commands

You can use the included `Makefile` to quickly run common commands:

**1. Build the project:**
Converts all markdown files in `content/projects/` into HTML pages and generates `data/projects.json`.
```bash
make build
```
*(Alternatively, run `python3 build.py` directly).*

**2. Run a local development server:**
Starts a local server with live reloading.
```bash
make dev
```

## 📝 Adding New Projects

To add a new project to the portfolio, simply create a new Markdown (`.md`) file inside the `content/projects/` directory. 

The build script parses custom frontmatter at the top of each file. Here is the required template:

```markdown
---
title: My Awesome Project
tags: [Python, Web, Automation]
repo-url: [https://github.com/yourusername/repo](https://github.com/yourusername/repo)
---

# Project Details
Write your project description here. The build script supports **bold**, *italics*, `code`, and headings!
```

After creating or modifying a markdown file, run `make build` to generate the corresponding HTML file.

## 🌐 Deployment

This website is automatically deployed to GitHub Pages. The pipeline is configured in `.github/workflows/pages.yml`. 

Whenever a push is made to the `main` branch, the workflow:
1. Sets up Python.
2. Runs `build.py` to generate the project files.
3. Bundles the necessary static assets into a clean `public/` directory.
4. Deploys the `public/` directory securely to GitHub Pages.

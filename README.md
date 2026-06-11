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

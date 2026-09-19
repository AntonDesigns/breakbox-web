# BreakBox Web (breakbox-web)

This is the **frontend** of BreakBox, my Sem6 reverse-engineering lab: the React launcher I use to
pick a level and download a target to crack. It also holds my **living design sheet**, the single
blueprint that documents the whole project.

BreakBox is split across three repositories, one owner per concern:

- **breakbox-web** this repo: the React launcher (front end) and the design sheet.
- **breakbox-api** the API, the Roslyn target generator, the shared Core library, and the database.
- **breakbox-security** my own tooling (Peek to look inside a program, Flip to patch one), the
  security scans, the threat model, the crack write-ups, and the monitoring.

## What's here

    src/                 the React + TypeScript launcher (Vite)
    public/              static assets
    design/              the source of my living design sheet:
                           index.html + css/ + js/, bundled by build.py
    docs/                the built, self-contained design sheet (breakboxDesign.html)
    Dockerfile           builds the launcher image
    .github/             the frontend CI

## Run the launcher

    npm install
    npm run dev          # Vite dev server

The launcher calls the API from **breakbox-api** (`docker compose up` there brings it up on
`http://localhost:5080`).

## The design sheet

`design/` is a hand-authored, single-page "blueprint" that explains BreakBox end to end: the
application, the architecture, the security model, the research behind each decision, the diagrams,
and the per-sprint roadmap. It is one HTML file with its own CSS and JS, and `build.py` inlines them
into one shareable file:

    python design/build.py     # writes docs/breakboxDesign.html

I keep it as source so it stays diffable and reviewable; the bundled `docs/breakboxDesign.html` is the
version I open and share.

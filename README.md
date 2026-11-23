# vivechak-web

Official website, interactive documentation portal, and client-side playground for **[Vivechak (`vck`)](https://github.com/bhaskarjha-dev/vivechak)** — live at **[vivechak.bhaskarjha.dev](https://vivechak.bhaskarjha.dev)**.

Built with React 19, TypeScript, Vite 7, Three.js (with automatic 60fps Canvas 2D fallback), Framer Motion, and native CSS dual-material theming (**Obsidian Dark** & **Archival Paper Light**). Ships as a zero-dependency static bundle with 14 pre-rendered SEO routes and an AI-readable `llms-full.txt` corpus deployed on Cloudflare Workers Static Assets.

## Features

- **Interactive 3D / 2D Epistemic Sieve Monument (`HeroSection`)** — Orbit in 3D, press-and-hold to distill truth (`0% → 100%`), pull the elastic Saffron Drop, switch `Sift / Raw Chat / Sealed` modes, and bridge directly to any MCP editor preset.
- **01 · The Epistemic Shift (`ShiftShowcase`)** — Live resizable side-by-side comparator contrasting raw AI chat recall against evidence-graded Git artifacts across all 3 Vivechak scopes (`C-NNN`, `D-NNN`, `FAD`) and `X=3` compliance overrides.
- **02 · Reversibility-Calibrated Rigor (`CalibrationLab`)** — Live prompt scope classifier synced with R/N/B/X risk dials, interactive 3D Reversibility Door, and a `±20%` Weighted Evaluation Protocol (WEP) sensitivity race.
- **03 · Mechanical Phase 0 Gate (`GateChamber`)** — Real browser `crypto.subtle` SHA-256 simulation of rules G1–G12, interactive 3D Crypto Interlock vault, live tamper-diff detection, and `/dev/tty` attestation flow.
- **04 · Architecture in Motion (`ArchitectureStage`)** — Interactive Katha topological DAG with animated `Simulate Swarm`, Git workspace file browser (including Vivechak's real dogfood ADR), and 9-tool MCP envelope inspector.
- **05 · Setup & Prompt Workbench (`SetupSection`)** — 10 verified MCP host presets (`vck setup <host>`), zero-install Prompt Builder, `AGENTS.md` snippet, GitHub Actions CI gate, 7-step confinement ladder, and FAQ.
- **Live Playground (`/playground`)** — 100% client-side Markdown ADR & Session Gate Auditor (G5–G12 + `Q-*` coaching) with drag-and-drop local `.md` support, editable WEP `±20%` Matrix Builder, and shareable Prompt Studio.
- **Documentation Portal (`/docs/*`)** — 11 release guides, full-text `⌘K` Command Palette, `?` Slide-Over Quick Reference Drawer, and one-click `Copy as Markdown` for AI agents.

## Local Development

```sh
pnpm install
pnpm dev
```

## Build, Lint & Preview

```sh
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm preview
```

`pnpm build` compiles the client bundle, builds the SSR bundle, pre-renders all 14 static HTML routes (`/` + `/playground` + `/docs` + 11 `/docs/<slug>` guides), and compiles `dist/llms-full.txt`.

## Deployment

Deployed to **[vivechak.bhaskarjha.dev](https://vivechak.bhaskarjha.dev)** via **Cloudflare Workers Static Assets**. Auto-deploys on push to `main` via Cloudflare Workers Builds.

**Manual CLI deploy:**
```sh
pnpm build
pnpm exec wrangler deploy
```

`wrangler.jsonc` attaches the custom domain `vivechak.bhaskarjha.dev` to the Cloudflare zone and serves `./dist` from the edge with immutable asset caching (`public/_headers`).

## License

[MIT](LICENSE) — © 2026 Bhaskar Jha.

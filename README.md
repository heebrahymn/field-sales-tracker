# Carbon Field Sales Tracker — Antigravity Guide Package

This package is designed to be copied into the **root of your Antigravity project** (`carbonSalesTracker`).

## Files

- `AGENTS.md` — always-on Antigravity workspace rule; automatically references the project guide.
- `docs/ANTIGRAVITY_MASTER_PROMPT.md` — complete architecture, UI/brand, MVP scope, roles, verification, offline, security, delivery and acceptance guide.

## Install

1. Copy `AGENTS.md` and the `docs/` folder to the root of your Antigravity workspace; preserve paths.
2. Put the latest PRD at `docs/Carbon_Field_Sales_Tracker_PRD_v1.2_MVP_Updated.pdf`.
3. Put the official logo at `public/brand/carbon-car-care-logo.png` (create the directory if needed).
4. Open the **project root** in Antigravity. Workspace rules are auto-discovered from `AGENTS.md`.
5. In a fresh Antigravity chat, say: `Read the project workspace rules and begin Stage 0 and Stage 1 only. Show the plan first.`
6. Approve each stage before allowing subsequent implementation.

## Important

Antigravity's root-level `AGENTS.md` is persistently loaded for its directory scope, and its `@[label](path)` include syntax inlines the referenced file. Avoid deleting or moving either Markdown file. The full guide is below the 24 KB per-rule-file limit when combined with `AGENTS.md`.

Documentation: https://www.antigravity.google/docs/rules/
